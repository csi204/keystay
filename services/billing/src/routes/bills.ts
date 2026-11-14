import { Hono } from 'hono';
import { type Env, mapBill, mapBillItem, mapPayment, mapRefund, mapInvoice } from '../types';
import {
  createBillSchema,
  updateBillSchema,
  addBillItemSchema,
  payBillSchema,
  applyBillDiscountSchema,
  refundBillSchema,
} from '../validators/billing.validator';
import { publishToQStash } from '../events/publisher';
import { BillPaidEvent } from '@keystay/events';

const bills = new Hono<{ Bindings: Env }>();

const migratedBillingSchemaDbs = new WeakSet<D1Database>();

/**
 * Idempotent defensive migration for local Wrangler/Miniflare D1 SQLite databases
 * created before `bill_items.is_paid` and `bills.service_charge_rate` were added to schema.sql.
 */
export async function ensureBillItemsIsPaidColumn(db: D1Database): Promise<void> {
  if (migratedBillingSchemaDbs.has(db)) return;
  const statements = [
    'ALTER TABLE bill_items ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE bills ADD COLUMN service_charge_rate REAL NOT NULL DEFAULT 0.10',
  ];
  for (const sql of statements) {
    try {
      await db.prepare(sql).run();
    } catch (err: any) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
        throw err;
      }
    }
  }

  // Upgrade legacy `bills` table CHECK(status IN ...) if it was created before 'unpaid' was added
  try {
    const tableRow: any = await db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bills'")
      .first();
    const ddl = String(tableRow?.sql || '');
    if (ddl && !ddl.includes("'unpaid'")) {
      await db.batch([
        db.prepare('PRAGMA defer_foreign_keys = ON'),
        db.prepare(`CREATE TABLE bills_migrated (
          id TEXT PRIMARY KEY,
          bill_number TEXT UNIQUE NOT NULL,
          reservation_id TEXT NOT NULL,
          guest_name TEXT NOT NULL,
          room_number TEXT NOT NULL,
          subtotal REAL NOT NULL DEFAULT 0,
          discount_amount REAL NOT NULL DEFAULT 0,
          tax_rate REAL NOT NULL DEFAULT 0.07,
          tax_amount REAL NOT NULL DEFAULT 0,
          service_charge_rate REAL NOT NULL DEFAULT 0.10,
          service_charge REAL NOT NULL DEFAULT 0.10,
          total_amount REAL NOT NULL DEFAULT 0,
          deposit_deducted REAL NOT NULL DEFAULT 0,
          amount_paid REAL NOT NULL DEFAULT 0,
          amount_due REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'partially_paid', 'paid', 'unpaid', 'refunded', 'void')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`),
        db.prepare(`INSERT INTO bills_migrated (
          id, bill_number, reservation_id, guest_name, room_number,
          subtotal, discount_amount, tax_rate, tax_amount, service_charge_rate, service_charge,
          total_amount, deposit_deducted, amount_paid, amount_due, status, created_at, updated_at
        ) SELECT
          id, bill_number, reservation_id, guest_name, room_number,
          subtotal, discount_amount, tax_rate, tax_amount, COALESCE(service_charge_rate, 0.10), service_charge,
          total_amount, deposit_deducted, amount_paid, amount_due, status, created_at, updated_at
        FROM bills`),
        db.prepare('DROP TABLE bills'),
        db.prepare('ALTER TABLE bills_migrated RENAME TO bills'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_bills_reservation ON bills(reservation_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_bills_room ON bills(room_number)'),
        db.prepare('PRAGMA defer_foreign_keys = OFF'),
      ]);
    }
  } catch {
    // Ignore if sqlite_master inspection is unsupported in a mock DB
  }

  migratedBillingSchemaDbs.add(db);
}

bills.use('*', async (c, next) => {
  await ensureBillItemsIsPaidColumn(c.env.DB);
  await next();
});

/**
 * Resolves a payment method from raw alias/code/name or ID into a valid `payment_methods` row
 * so D1 foreign keys never fail on `'cash'`, `'transfer'`, or `'upfront_checkin'`.
 */
export async function resolvePaymentMethod(
  db: D1Database,
  rawMethod?: string,
  rawMethodId?: string
): Promise<{ id: string; name: string }> {
  const rawInput = (rawMethodId || rawMethod || '').trim();
  const normalizedMethod = rawInput.toLowerCase().replace(/[-_]/g, '');
  let mappedCodeOrId: string | null = null;
  if (normalizedMethod.includes('cash')) {
    mappedCodeOrId = 'pm-cash';
  } else if (normalizedMethod.includes('card') || normalizedMethod.includes('credit')) {
    mappedCodeOrId = 'pm-card';
  } else if (normalizedMethod.includes('qr') || normalizedMethod.includes('promptpay')) {
    mappedCodeOrId = 'pm-qr';
  } else if (normalizedMethod.includes('transfer') || normalizedMethod.includes('bank')) {
    mappedCodeOrId = 'pm-transfer';
  }

  let paymentMethodRecord: any = null;
  if (rawMethodId) {
    paymentMethodRecord = await db
      .prepare('SELECT * FROM payment_methods WHERE LOWER(id) = LOWER(?) OR id = ?')
      .bind(rawMethodId, rawMethodId)
      .first();
  }

  if (!paymentMethodRecord && (rawMethod || mappedCodeOrId)) {
    const searchTarget = mappedCodeOrId || rawMethod;
    paymentMethodRecord = await db
      .prepare(
        'SELECT * FROM payment_methods WHERE LOWER(id) = LOWER(?) OR LOWER(code) = LOWER(?) OR LOWER(name) LIKE LOWER(?)'
      )
      .bind(searchTarget, searchTarget, `%${searchTarget}%`)
      .first();
  }

  if (!paymentMethodRecord && mappedCodeOrId) {
    paymentMethodRecord = await db
      .prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(mappedCodeOrId)
      .first();
  }

  if (!paymentMethodRecord) {
    paymentMethodRecord = await db
      .prepare('SELECT * FROM payment_methods WHERE is_active = 1 LIMIT 1')
      .first();
  }

  return {
    id: paymentMethodRecord?.id || mappedCodeOrId || 'pm-card',
    name: paymentMethodRecord?.name || 'Credit / Debit Card',
  };
}

/**
 * Helper to recalculate a bill's financial totals based on items, payments, and discounts.
 */
export async function recalculateBill(db: D1Database, billId: string) {
  await ensureBillItemsIsPaidColumn(db);
  const bill: any = await db.prepare('SELECT * FROM bills WHERE id = ?').bind(billId).first();
  if (!bill) return null;

  // 1. Sum up paid vs unpaid bill_items
  const itemsAgg: any = await db
    .prepare(
      `SELECT
         COUNT(*) as total_count,
         COALESCE(SUM(total_price), 0) as sum_all,
         COALESCE(SUM(CASE WHEN COALESCE(is_paid, 0) = 1 THEN total_price ELSE 0 END), 0) as sum_paid_items,
         COALESCE(SUM(CASE WHEN COALESCE(is_paid, 0) = 0 THEN total_price ELSE 0 END), 0) as sum_unpaid_items,
         COALESCE(SUM(CASE WHEN COALESCE(is_paid, 0) = 1 THEN 1 ELSE 0 END), 0) as paid_count,
         COALESCE(SUM(CASE WHEN COALESCE(is_paid, 0) = 0 THEN 1 ELSE 0 END), 0) as unpaid_count
       FROM bill_items
       WHERE bill_id = ?`
    )
    .bind(billId)
    .first();

  const totalCount = Number(itemsAgg?.total_count || 0);
  const hasItems = totalCount > 0;
  const paidItemsSum = Number(itemsAgg?.sum_paid_items || 0);
  const unpaidItemsSum = Number(itemsAgg?.sum_unpaid_items || 0);
  const paidCount = Number(itemsAgg?.paid_count || 0);
  const unpaidCount = Number(itemsAgg?.unpaid_count || 0);

  const subtotal = hasItems ? Number(itemsAgg.sum_all) : Number(bill.subtotal || 0);

  const discountAmount = Number(bill.discount_amount || 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(bill.tax_rate ?? 0.07);
  const taxAmount = Number((taxable * taxRate).toFixed(2));

  // Read persisted service_charge_rate cleanly (0 stays 0, 0.10 stays 0.10 even when initial subtotal was 0)
  const serviceChargeRate =
    bill.service_charge_rate !== null && bill.service_charge_rate !== undefined
      ? Number(bill.service_charge_rate)
      : 0.10;
  const serviceChargeAmount = Number((subtotal * serviceChargeRate).toFixed(2));

  const totalAmount = Number((taxable + taxAmount + serviceChargeAmount).toFixed(2));
  const depositDeducted = Number(bill.deposit_deducted || 0);

  // Sum completed payments
  const paymentsSum: any = await db
    .prepare("SELECT SUM(amount) as sum_paid FROM payments WHERE bill_id = ? AND status = 'completed'")
    .bind(billId)
    .first();
  const recordedPayments = paymentsSum?.sum_paid !== null && paymentsSum?.sum_paid !== undefined ? Number(paymentsSum.sum_paid) : 0;
  const amountPaid = Math.max(recordedPayments, Number(bill.amount_paid || 0));

  let amountDue = 0;
  if (paidCount > 0) {
    const unpaidTaxable = Math.max(0, taxable - paidItemsSum);
    const unpaidTax = Number((unpaidTaxable * taxRate).toFixed(2));
    const unpaidServiceCharge = Number((unpaidItemsSum * serviceChargeRate).toFixed(2));
    const unpaidTotalWithVat = Number((unpaidTaxable + unpaidTax + unpaidServiceCharge).toFixed(2));
    const paidTotalWithVat = Number((totalAmount - unpaidTotalWithVat).toFixed(2));
    const extraPaidBeyondPrepaid = Math.max(0, Number((amountPaid - paidTotalWithVat).toFixed(2)));
    amountDue = Math.max(0, Number((unpaidTotalWithVat - depositDeducted - extraPaidBeyondPrepaid).toFixed(2)));
  } else {
    amountDue = Math.max(0, Number((totalAmount - depositDeducted - amountPaid).toFixed(2)));
  }

  let status = bill.status;
  if (status !== 'void' && status !== 'refunded') {
    if (paidCount > 0) {
      if (unpaidItemsSum === 0 && unpaidCount === 0 && (amountPaid > 0 || amountDue === 0)) {
        status = 'paid';
      } else {
        status = 'unpaid';
      }
    } else if (amountDue === 0 && (amountPaid > 0 || (depositDeducted > 0 && depositDeducted >= totalAmount))) {
      status = 'paid';
    } else {
      status = 'unpaid';
    }
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE bills 
       SET subtotal = ?, tax_amount = ?, service_charge = ?, total_amount = ?, 
           amount_paid = ?, amount_due = ?, status = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(subtotal, taxAmount, serviceChargeAmount, totalAmount, amountPaid, amountDue, status, now, billId)
    .run();

  return await db.prepare('SELECT * FROM bills WHERE id = ?').bind(billId).first();
}

// ==========================================
// 71. GET /bills — รายการบิลทั้งหมด (filter by status, reservation_id)
// ==========================================
bills.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const reservationId = c.req.query('reservation_id') || c.req.query('reservationId');
    const search = c.req.query('search');
    const limit = Math.min(Number(c.req.query('limit') || 50), 100);
    const offset = Number(c.req.query('offset') || 0);

    let sql = 'SELECT * FROM bills WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (reservationId) {
      sql += ' AND reservation_id = ?';
      params.push(reservationId);
    }
    if (search) {
      sql += ' AND (bill_number LIKE ? OR guest_name LIKE ? OR room_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    const rows = result.results || [];

    const countQuery = 'SELECT COUNT(*) as total FROM bills WHERE 1=1' + 
      (status ? ' AND status = ?' : '') + 
      (reservationId ? ' AND reservation_id = ?' : '') +
      (search ? ' AND (bill_number LIKE ? OR guest_name LIKE ? OR room_number LIKE ?)' : '');
    const countParams: any[] = [];
    if (status) countParams.push(status);
    if (reservationId) countParams.push(reservationId);
    if (search) countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    
    const countResult: any = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = countResult?.total || rows.length;

    return c.json({
      success: true,
      data: rows.map(mapBill),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + rows.length < total,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to list bills' } }, 500);
  }
});

// ==========================================
// 79. GET /bills/by-reservation/:reservationId — ค้นหาบิลจากการจอง
// ==========================================
bills.get('/by-reservation/:reservationId', async (c) => {
  try {
    const reservationId = c.req.param('reservationId');
    const bill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE reservation_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(reservationId)
      .first();

    if (!bill) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: `No bill found for reservation ${reservationId}` } }, 404);
    }

    // Fetch items
    const itemsResult = await c.env.DB.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY created_at ASC')
      .bind(bill.id)
      .all();

    // Fetch payments
    const paymentsResult = await c.env.DB.prepare(
      `SELECT p.*, pm.name as payment_method_name, pm.code as payment_method_code
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       WHERE p.bill_id = ?
       ORDER BY p.paid_at ASC`
    )
      .bind(bill.id)
      .all();

    return c.json({
      success: true,
      data: {
        ...mapBill(bill),
        items: (itemsResult.results || []).map(mapBillItem),
        payments: (paymentsResult.results || []).map(mapPayment),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch bill by reservation' } }, 500);
  }
});

// ==========================================
// 72. GET /bills/:id — ข้อมูลบิลรายใบพร้อม Items, ภาษี, ยอดมัดจำ
// ==========================================
bills.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const bill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!bill) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    // Fetch items
    const itemsResult = await c.env.DB.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY created_at ASC')
      .bind(bill.id)
      .all();

    // Fetch payments
    const paymentsResult = await c.env.DB.prepare(
      `SELECT p.*, pm.name as payment_method_name, pm.code as payment_method_code
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       WHERE p.bill_id = ?
       ORDER BY p.paid_at ASC`
    )
      .bind(bill.id)
      .all();

    // Fetch refunds
    const refundsResult = await c.env.DB.prepare('SELECT * FROM refunds WHERE bill_id = ? ORDER BY created_at ASC')
      .bind(bill.id)
      .all();

    // Fetch invoice if any
    const invoice: any = await c.env.DB.prepare('SELECT * FROM invoices WHERE bill_id = ? LIMIT 1')
      .bind(bill.id)
      .first();

    return c.json({
      success: true,
      data: {
        ...mapBill(bill),
        items: (itemsResult.results || []).map(mapBillItem),
        payments: (paymentsResult.results || []).map(mapPayment),
        refunds: (refundsResult.results || []).map(mapRefund),
        invoice: mapInvoice(invoice),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch bill' } }, 500);
  }
});

// ==========================================
// 73. POST /bills — สร้างบิลใหม่
// ==========================================
bills.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createBillSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const billId = `bill-${crypto.randomUUID()}`;
    const billSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const billNumber = `BILL-${new Date().getFullYear()}-${billSuffix}`;

    const items = data.items || [];
    let itemsSubtotal = 0;
    let paidItemsSubtotal = 0;
    let unpaidItemsSubtotal = 0;
    const billItemStmts: any[] = [];

    for (const item of items) {
      const itemId = `bi-${crypto.randomUUID()}`;
      const qty = item.quantity || 1;
      const unit = item.unitPrice;
      const total = Number((qty * unit).toFixed(2));
      itemsSubtotal += total;

      const itemIsPaid = item.isPaid ?? (data.status === 'paid');
      if (itemIsPaid) {
        paidItemsSubtotal += total;
      } else {
        unpaidItemsSubtotal += total;
      }

      const rawType = item.itemType || item.category;
      let itemType = 'other';
      if (rawType === 'service' || rawType === 'room_service') itemType = 'room_service';
      else if (rawType === 'room' || rawType === 'room_charge') itemType = 'room_charge';
      else if (['minibar', 'laundry', 'damage', 'other'].includes(String(rawType))) itemType = String(rawType);

      billItemStmts.push(
        c.env.DB.prepare(
          `INSERT INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price, item_date, is_paid, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(itemId, billId, itemType, item.description, qty, unit, total, item.itemDate || now.slice(0, 10), itemIsPaid ? 1 : 0, now)
      );
    }

    const subtotal = items.length > 0 ? itemsSubtotal : Number(data.subtotal || 0);
    const taxRate = data.taxRate ?? 0.07;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const serviceChargeRate = data.serviceChargeRate ?? 0.10;
    const serviceChargeAmount = Number((subtotal * serviceChargeRate).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount + serviceChargeAmount).toFixed(2));
    const depositDeducted = Number(data.depositDeducted || 0);

    let amountPaid = Number((data as any).amountPaid ?? (data.status === 'paid' && unpaidItemsSubtotal === 0 ? totalAmount : 0));
    let amountDue = Math.max(0, Number((totalAmount - depositDeducted - amountPaid).toFixed(2)));
    let status: string;

    if (paidItemsSubtotal > 0 && unpaidItemsSubtotal > 0) {
      const paidTax = Number((paidItemsSubtotal * taxRate).toFixed(2));
      const paidService = Number((paidItemsSubtotal * serviceChargeRate).toFixed(2));
      const paidTotal = Number((paidItemsSubtotal + paidTax + paidService).toFixed(2));
      amountPaid = Number((data as any).amountPaid ?? paidTotal);
      const unpaidTotal = Number((totalAmount - paidTotal).toFixed(2));
      amountDue = Math.max(0, Number((unpaidTotal - depositDeducted).toFixed(2)));
      status = 'unpaid';
    } else {
      status = data.status === 'paid'
        ? 'paid'
        : items.length > 0 && totalAmount > 0 && depositDeducted >= totalAmount ? 'paid' : 'pending';
    }

    const insertBillStmt = c.env.DB.prepare(
      `INSERT INTO bills (id, bill_number, reservation_id, guest_name, room_number, subtotal, discount_amount, tax_rate, tax_amount, service_charge_rate, service_charge, total_amount, deposit_deducted, amount_paid, amount_due, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      billId,
      billNumber,
      data.reservationId,
      data.guestName,
      data.roomNumber,
      subtotal,
      taxRate,
      taxAmount,
      serviceChargeRate,
      serviceChargeAmount,
      totalAmount,
      depositDeducted,
      amountPaid,
      amountDue,
      status,
      now,
      now
    );

    // Also auto-generate Draft Invoice
    const invoiceId = `inv-${crypto.randomUUID()}`;
    const invSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${invSuffix}`;
    const insertInvoiceStmt = c.env.DB.prepare(
      `INSERT INTO invoices (id, invoice_number, bill_id, issued_to_name, total_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`
    ).bind(invoiceId, invoiceNumber, billId, data.guestName, totalAmount, now);

    const extraStmts: any[] = [];
    if (status === 'paid' || data.status === 'paid' || amountPaid > 0) {
      const paymentId = `pay-${crypto.randomUUID()}`;
      const resolvedMethod = await resolvePaymentMethod(
        c.env.DB,
        (data as any).paymentMethod,
        (data as any).paymentMethodId || (data as any).payment_method_id
      );
      const refNumber = (data as any).referenceNumber || (data as any).reference_number || 'REF-UPFRONT';
      extraStmts.push(
        c.env.DB.prepare(
          `INSERT INTO payments (id, bill_id, payment_method_id, amount, reference_number, status, paid_at, created_at)
           VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`
        ).bind(paymentId, billId, resolvedMethod.id, amountPaid, refNumber, now, now)
      );
    }

    await c.env.DB.batch([insertBillStmt, ...billItemStmts, insertInvoiceStmt, ...extraStmts]);

    const created: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(billId).first();
    const createdItems = await c.env.DB.prepare('SELECT * FROM bill_items WHERE bill_id = ?').bind(billId).all();

    return c.json(
      {
        success: true,
        message: 'Bill created successfully',
        data: {
          ...mapBill(created),
          items: (createdItems.results || []).map(mapBillItem),
        },
      },
      201
    );
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to create bill' } }, 500);
  }
});

// ==========================================
// 74. PUT /bills/:id — แก้ไขข้อมูลบิล
// ==========================================
bills.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateBillSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const existing: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    const now = new Date().toISOString();
    const guestName = data.guestName || existing.guest_name;
    const roomNumber = data.roomNumber || existing.room_number;
    const status = data.status || existing.status;
    const depositDeducted = data.depositDeducted !== undefined ? Number(data.depositDeducted) : Number(existing.deposit_deducted);

    await c.env.DB.prepare(
      `UPDATE bills
       SET guest_name = ?, room_number = ?, status = ?, deposit_deducted = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(guestName, roomNumber, status, depositDeducted, now, existing.id)
      .run();

    const updated = await recalculateBill(c.env.DB, existing.id);

    return c.json({
      success: true,
      message: 'Bill updated successfully',
      data: mapBill(updated),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to update bill' } }, 500);
  }
});

// ==========================================
// 75. POST /bills/:id/items — เพิ่มรายการค่าใช้จ่ายเสริม (มินิบาร์, ซักรีด)
// ==========================================
bills.post('/:id/items', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = addBillItemSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const existing: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    if (existing.status === 'void' || existing.status === 'refunded') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_BILL_STATUS',
            message: `Cannot add items to bill with status '${existing.status}'`,
          },
        },
        400
      );
    }

    const now = new Date().toISOString();
    const itemId = `bi-${crypto.randomUUID()}`;
    const qty = data.quantity || 1;
    const unit = data.unitPrice;
    const totalPrice = Number((qty * unit).toFixed(2));
    const itemDate = data.itemDate || now.slice(0, 10);

    const rawType = parsed.data.itemType || parsed.data.category;
    let itemType = 'other';
    if (rawType === 'service' || rawType === 'room_service') itemType = 'room_service';
    else if (rawType === 'room' || rawType === 'room_charge') itemType = 'room_charge';
    else if (['minibar', 'laundry', 'damage', 'other'].includes(String(rawType))) itemType = String(rawType);

    const itemIsPaid = data.isPaid ?? false;

    // Backfill legacy pre-paid bills so previously settled items keep is_paid = 1
    // when a new unpaid extension or extra charge is added.
    if (!itemIsPaid && Number(existing.amount_paid || 0) > 0 && Number(existing.amount_due || 0) === 0) {
      await c.env.DB.prepare('UPDATE bill_items SET is_paid = 1 WHERE bill_id = ? AND COALESCE(is_paid, 0) = 0')
        .bind(existing.id)
        .run();
    }

    await c.env.DB.prepare(
      `INSERT INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price, item_date, is_paid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(itemId, existing.id, itemType, data.description, qty, unit, totalPrice, itemDate, itemIsPaid ? 1 : 0, now)
      .run();

    // Adding unpaid extra charge switches folio status to unpaid
    if (!itemIsPaid) {
      await c.env.DB.prepare("UPDATE bills SET status = 'unpaid', updated_at = ? WHERE id = ?")
        .bind(now, existing.id)
        .run();
    }

    const updatedBill = await recalculateBill(c.env.DB, existing.id);
    const item: any = await c.env.DB.prepare('SELECT * FROM bill_items WHERE id = ?').bind(itemId).first();

    return c.json(
      {
        success: true,
        message: 'Item added to bill successfully',
        data: {
          item: mapBillItem(item),
          bill: mapBill(updatedBill),
        },
      },
      201
    );
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to add bill item' } }, 500);
  }
});

// ==========================================
// 76. DELETE /bills/:id/items/:itemId — ลบรายการค่าใช้จ่ายเสริม
// ==========================================
bills.delete('/:id/items/:itemId', async (c) => {
  try {
    const id = c.req.param('id');
    const itemId = c.req.param('itemId');

    const existing: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    if (existing.status === 'void' || existing.status === 'refunded') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_BILL_STATUS',
            message: `Cannot remove items from bill with status '${existing.status}'`,
          },
        },
        400
      );
    }

    const item: any = await c.env.DB.prepare('SELECT * FROM bill_items WHERE id = ? AND bill_id = ?')
      .bind(itemId, existing.id)
      .first();

    if (!item) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill item not found' } }, 404);
    }

    if (Number(item.is_paid ?? 0) === 1) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ITEM_ALREADY_PAID',
            message: 'Cannot remove an already paid bill item',
          },
        },
        400
      );
    }

    await c.env.DB.prepare('DELETE FROM bill_items WHERE id = ?').bind(itemId).run();
    const updatedBill = await recalculateBill(c.env.DB, existing.id);

    return c.json({
      success: true,
      message: 'Item removed from bill successfully',
      data: mapBill(updatedBill),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to delete bill item' } }, 500);
  }
});

// ==========================================
// 77. POST /bills/:id/pay — บันทึกการชำระเงิน, หักเงินมัดจำ, ปิดยอดบิล, ยิง Event BillPaid
// ==========================================
bills.post('/:id/pay', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = payBillSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const bill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!bill) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    if (bill.status === 'paid') {
      return c.json({
        success: true,
        message: 'Bill is already paid in full',
        data: {
          bill: mapBill(bill),
          receiptNumber: `REC-${bill.bill_number.replace('BILL-', '')}`,
        },
      });
    }
    if (bill.status === 'void' || bill.status === 'refunded') {
      return c.json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot pay bill in status '${bill.status}'` } }, 400);
    }

    // 1. Resolve Payment Method (case-insensitive & alias-aware)
    const { id: paymentMethodId, name: paymentMethodName } = await resolvePaymentMethod(
      c.env.DB,
      data.paymentMethod,
      data.paymentMethodId
    );

    // 2. Determine Payment Amount & Deductions
    const currentDeposit = Number(bill.deposit_deducted || 0);
    const newDeposit = data.depositDeducted !== undefined ? Number(data.depositDeducted) : currentDeposit;
    const currentPaid = Number(bill.amount_paid || 0);

    const netPayable = Math.max(0, Number((bill.total_amount - newDeposit - currentPaid).toFixed(2)));
    const paymentAmount = data.amount !== undefined ? Number(data.amount) : netPayable;

    // If netPayable is 0 (e.g. deposit covered all or total is 0) or settleInFull is true, settle bill as paid without error
    if (!data.settleInFull && paymentAmount <= 0 && netPayable > 0) {
      return c.json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than 0' } }, 400);
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';
    const paymentId = `pay-${crypto.randomUUID()}`;
    const referenceNumber = data.referenceNumber || `REF-${Date.now().toString().slice(-6)}`;

    const effectivePaymentAmount = Math.max(0, paymentAmount);
    const vatOnlyTotal = Number(
      (Math.max(0, Number(bill.subtotal || 0) - Number(bill.discount_amount || 0)) + Number(bill.tax_amount || 0)).toFixed(2)
    );
    const vatOnlyNetPayable = Math.max(0, Number((vatOnlyTotal - newDeposit - currentPaid).toFixed(2)));
    const rawAmountPaid = Number((currentPaid + effectivePaymentAmount).toFixed(2));
    const rawAmountDue = Math.max(0, Number((bill.total_amount - newDeposit - rawAmountPaid).toFixed(2)));

    const coversVatOnlyTotal =
      effectivePaymentAmount > 0 && vatOnlyNetPayable > 0 && effectivePaymentAmount >= vatOnlyNetPayable;
    const isFullSettlement =
      Boolean(data.settleInFull) || rawAmountDue === 0 || netPayable === 0 || coversVatOnlyTotal;

    const shouldStripLegacyServiceCharge =
      isFullSettlement && Number(bill.service_charge || 0) > 0 && rawAmountDue > 0;
    const finalTotalAmount = shouldStripLegacyServiceCharge ? vatOnlyTotal : Number(bill.total_amount);
    const finalServiceChargeRate = shouldStripLegacyServiceCharge ? 0 : Number(bill.service_charge_rate ?? 0.10);
    const finalServiceCharge = shouldStripLegacyServiceCharge ? 0 : Number(bill.service_charge || 0);

    const newAmountPaid =
      isFullSettlement && rawAmountPaid < Number((finalTotalAmount - newDeposit).toFixed(2))
        ? Math.max(rawAmountPaid, Number((finalTotalAmount - newDeposit).toFixed(2)))
        : rawAmountPaid;
    const newAmountDue = isFullSettlement
      ? 0
      : Math.max(0, Number((finalTotalAmount - newDeposit - newAmountPaid).toFixed(2)));
    const newStatus = isFullSettlement ? 'paid' : 'partially_paid';

    // 3. Prepare Batch Statements
    const stmts: any[] = [];

    // Insert payment (even for 0 THB zero-due checkout settlement to maintain audit trail)
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO payments (id, bill_id, payment_method_id, amount, reference_number, status, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`
      ).bind(paymentId, bill.id, paymentMethodId, effectivePaymentAmount, referenceNumber, now, now)
    );

    // Update bill
    stmts.push(
      c.env.DB.prepare(
        `UPDATE bills
         SET service_charge_rate = ?, service_charge = ?, total_amount = ?,
             deposit_deducted = ?, amount_paid = ?, amount_due = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).bind(
        finalServiceChargeRate,
        finalServiceCharge,
        finalTotalAmount,
        newDeposit,
        newAmountPaid,
        newAmountDue,
        newStatus,
        now,
        bill.id
      )
    );

    if (newStatus === 'paid') {
      stmts.push(
        c.env.DB.prepare('UPDATE bill_items SET is_paid = 1 WHERE bill_id = ?').bind(bill.id)
      );
    }

    // Update Invoice status to 'issued'
    stmts.push(
      c.env.DB.prepare(
        `UPDATE invoices
         SET status = 'issued', total_amount = ?
         WHERE bill_id = ?`
      ).bind(bill.total_amount, bill.id)
    );

    // 4. Outbox Event: BillPaid
    const outboxId = `evt-${crypto.randomUUID()}`;
    const billPaidEvent: BillPaidEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'BillPaid',
      timestamp: now,
      billId: bill.id,
      billNumber: bill.bill_number,
      reservationId: bill.reservation_id,
      guestName: bill.guest_name,
      roomNumber: bill.room_number,
      subtotal: Number(bill.subtotal),
      taxAmount: Number(bill.tax_amount),
      serviceCharge: Number(bill.service_charge),
      discountAmount: Number(bill.discount_amount),
      totalAmount: Number(bill.total_amount),
      depositDeducted: newDeposit,
      amountPaid: paymentAmount,
      paymentMethod: paymentMethodName,
      referenceNumber,
      performedBy: callerId,
    };

    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
         VALUES (?, 'BillPaid', ?, 'Bill', ?, 'pending', ?)`
      ).bind(outboxId, bill.id, JSON.stringify(billPaidEvent), now)
    );

    await c.env.DB.batch(stmts);

    // 5. Fire Event to QStash Topic hotel.billing.paid
    await publishToQStash(c.env, 'hotel.billing.paid', billPaidEvent, outboxId);

    const updatedBill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(bill.id).first();
    const createdPayment: any = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first();

    return c.json({
      success: true,
      message: 'Payment processed successfully and bill updated',
      data: {
        bill: mapBill(updatedBill),
        payment: mapPayment({ ...createdPayment, payment_method_name: paymentMethodName }),
        receiptNumber: `REC-${bill.bill_number.replace('BILL-', '')}`,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to process payment' } }, 500);
  }
});

// ==========================================
// 78. GET /bills/:id/receipt — ดึงข้อมูลพิมพ์ใบเสร็จรับเงิน
// ==========================================
bills.get('/:id/receipt', async (c) => {
  try {
    const id = c.req.param('id');
    const bill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!bill) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    const itemsResult = await c.env.DB.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY created_at ASC')
      .bind(bill.id)
      .all();

    const paymentsResult = await c.env.DB.prepare(
      `SELECT p.*, pm.name as payment_method_name
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       WHERE p.bill_id = ? AND p.status = 'completed'
       ORDER BY p.paid_at ASC`
    )
      .bind(bill.id)
      .all();

    const receiptNumber = `REC-${bill.bill_number.replace('BILL-', '')}`;

    return c.json({
      success: true,
      data: {
        receiptNumber,
        hotel: {
          name: 'KEYSTAY Luxury Hotel & Suites',
          address: '888 Sukhumvit Road, Khlong Toei, Bangkok 10110',
          taxId: '0105559876543',
          phone: '+66 2 123 4567',
        },
        billInfo: {
          billId: bill.id,
          billNumber: bill.bill_number,
          reservationId: bill.reservation_id,
          status: bill.status,
          date: bill.created_at,
          paidDate: bill.updated_at,
        },
        guest: {
          guestName: bill.guest_name,
          roomNumber: bill.room_number,
        },
        items: (itemsResult.results || []).map(mapBillItem),
        financialSummary: {
          subtotal: Number(bill.subtotal || 0).toFixed(2),
          discountAmount: Number(bill.discount_amount || 0).toFixed(2),
          taxRate: '7%',
          taxAmount: Number(bill.tax_amount || 0).toFixed(2),
          serviceChargeRate: '10%',
          serviceCharge: Number(bill.service_charge || 0).toFixed(2),
          totalAmount: Number(bill.total_amount || 0).toFixed(2),
          depositDeducted: Number(bill.deposit_deducted || 0).toFixed(2),
          amountPaid: Number(bill.amount_paid || 0).toFixed(2),
          amountDue: Number(bill.amount_due || 0).toFixed(2),
        },
        payments: (paymentsResult.results || []).map((p: any) => ({
          paymentId: p.id,
          amount: Number(p.amount).toFixed(2),
          method: p.payment_method_name || 'Card/Cash',
          referenceNumber: p.reference_number || null,
          paidAt: p.paid_at,
        })),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch receipt' } }, 500);
  }
});

// ==========================================
// 80. POST /bills/:id/refund — ดำเนินการคืนเงิน
// ==========================================
bills.post('/:id/refund', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = refundBillSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const { amount, reason, paymentId } = parsed.data;
    const bill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!bill) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    const currentPaid = Number(bill.amount_paid || 0);
    if (amount > currentPaid) {
      return c.json(
        {
          success: false,
          error: {
            code: 'REFUND_EXCEEDS_PAID',
            message: `Refund amount (${amount}) exceeds total paid amount (${currentPaid})`,
          },
        },
        400
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';
    const refundId = `ref-${crypto.randomUUID()}`;

    const newAmountPaid = Number((currentPaid - amount).toFixed(2));
    const newAmountDue = Math.max(0, Number((bill.total_amount - Number(bill.deposit_deducted || 0) - newAmountPaid).toFixed(2)));

    let newStatus = bill.status;
    if (newAmountPaid === 0 && Number(bill.deposit_deducted || 0) === 0) {
      newStatus = 'refunded';
    } else if (newAmountDue > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'paid';
    }

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO refunds (id, bill_id, payment_id, amount, reason, status, refunded_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`
      ).bind(refundId, bill.id, paymentId || null, amount, reason, callerId, now),

      c.env.DB.prepare(
        `UPDATE bills
         SET amount_paid = ?, amount_due = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).bind(newAmountPaid, newAmountDue, newStatus, now, bill.id),
    ]);

    const updatedBill = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(bill.id).first();
    const refundRecord = await c.env.DB.prepare('SELECT * FROM refunds WHERE id = ?').bind(refundId).first();

    return c.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund: mapRefund(refundRecord),
        bill: mapBill(updatedBill),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to process refund' } }, 500);
  }
});

// ==========================================
// 81. POST /bills/:id/discount — เพิ่มส่วนลดท้ายบิล
// ==========================================
bills.post('/:id/discount', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = applyBillDiscountSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const { discountAmount, discountPercent, discountReason, reason, discountCode } = parsed.data;
    const finalReason = discountReason || reason || discountCode || 'Bill Discount';

    const bill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ? OR bill_number = ?')
      .bind(id, id)
      .first();

    if (!bill) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } }, 404);
    }

    if (bill.status === 'paid' || bill.status === 'void' || bill.status === 'refunded') {
      return c.json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot apply discount to bill in status '${bill.status}'` } }, 400);
    }

    const subtotal = Number(bill.subtotal || 0);
    if (discountAmount !== undefined && Number(discountAmount) > subtotal) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DISCOUNT_EXCEEDS_SUBTOTAL',
            message: `Discount amount (${discountAmount}) cannot exceed subtotal (${subtotal})`,
          },
        },
        400
      );
    }

    let calculatedDiscount = 0;
    if (discountPercent !== undefined) {
      calculatedDiscount = Number(((subtotal * discountPercent) / 100).toFixed(2));
    } else if (discountAmount !== undefined) {
      calculatedDiscount = Number(discountAmount);
    }

    calculatedDiscount = Math.min(subtotal, Math.max(0, calculatedDiscount));

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `UPDATE bills
       SET discount_amount = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(calculatedDiscount, now, bill.id)
      .run();

    const updated = await recalculateBill(c.env.DB, bill.id);

    return c.json({
      success: true,
      message: 'Discount applied to bill successfully',
      data: {
        bill: mapBill(updated),
        appliedDiscount: calculatedDiscount.toFixed(2),
        reason: finalReason,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to apply discount' } }, 500);
  }
});

export default bills;

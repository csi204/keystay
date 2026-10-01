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

/**
 * Helper to recalculate a bill's financial totals based on items, payments, and discounts.
 */
export async function recalculateBill(db: D1Database, billId: string) {
  const bill: any = await db.prepare('SELECT * FROM bills WHERE id = ?').bind(billId).first();
  if (!bill) return null;

  // 1. Sum up bill_items
  const itemsSum: any = await db
    .prepare('SELECT SUM(total_price) as sum_items FROM bill_items WHERE bill_id = ?')
    .bind(billId)
    .first();
  
  const hasItems = itemsSum?.sum_items !== null && itemsSum?.sum_items !== undefined;
  const subtotal = hasItems ? Number(itemsSum.sum_items) : Number(bill.subtotal || 0);

  const discountAmount = Number(bill.discount_amount || 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(bill.tax_rate ?? 0.07);
  const taxAmount = Number((taxable * taxRate).toFixed(2));
  
  // Service charge 10%
  const serviceChargeRate = Number(bill.service_charge ? (bill.service_charge > 1 ? 0.10 : bill.service_charge) : 0.10);
  const serviceChargeAmount = Number((subtotal * serviceChargeRate).toFixed(2));

  const totalAmount = Number((taxable + taxAmount + serviceChargeAmount).toFixed(2));
  const depositDeducted = Number(bill.deposit_deducted || 0);

  // Sum completed payments
  const paymentsSum: any = await db
    .prepare("SELECT SUM(amount) as sum_paid FROM payments WHERE bill_id = ? AND status = 'completed'")
    .bind(billId)
    .first();
  const amountPaid = Number(paymentsSum?.sum_paid || 0);

  const amountDue = Math.max(0, Number((totalAmount - depositDeducted - amountPaid).toFixed(2)));

  let status = bill.status;
  if (status !== 'void' && status !== 'refunded') {
    if (amountDue === 0 && (amountPaid > 0 || depositDeducted >= totalAmount)) {
      status = 'paid';
    } else if (amountPaid > 0) {
      status = 'partially_paid';
    } else {
      status = 'pending';
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
    const billNumber = `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const items = data.items || [];
    let itemsSubtotal = 0;
    const billItemStmts: any[] = [];

    for (const item of items) {
      const itemId = `bi-${crypto.randomUUID()}`;
      const qty = item.quantity || 1;
      const unit = item.unitPrice;
      const total = Number((qty * unit).toFixed(2));
      itemsSubtotal += total;

      billItemStmts.push(
        c.env.DB.prepare(
          `INSERT INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price, item_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(itemId, billId, item.itemType, item.description, qty, unit, total, item.itemDate || now.slice(0, 10), now)
      );
    }

    const subtotal = items.length > 0 ? itemsSubtotal : Number(data.subtotal || 0);
    const taxRate = data.taxRate ?? 0.07;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const serviceChargeRate = data.serviceChargeRate ?? 0.10;
    const serviceChargeAmount = Number((subtotal * serviceChargeRate).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount + serviceChargeAmount).toFixed(2));
    const depositDeducted = Number(data.depositDeducted || 0);
    const amountPaid = 0;
    const amountDue = Math.max(0, Number((totalAmount - depositDeducted).toFixed(2)));
    const status = amountDue === 0 && depositDeducted >= totalAmount ? 'paid' : 'pending';

    const insertBillStmt = c.env.DB.prepare(
      `INSERT INTO bills (id, bill_number, reservation_id, guest_name, room_number, subtotal, discount_amount, tax_rate, tax_amount, service_charge, total_amount, deposit_deducted, amount_paid, amount_due, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      billId,
      billNumber,
      data.reservationId,
      data.guestName,
      data.roomNumber,
      subtotal,
      taxRate,
      taxAmount,
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
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const insertInvoiceStmt = c.env.DB.prepare(
      `INSERT INTO invoices (id, invoice_number, bill_id, issued_to_name, total_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`
    ).bind(invoiceId, invoiceNumber, billId, data.guestName, totalAmount, now);

    await c.env.DB.batch([insertBillStmt, ...billItemStmts, insertInvoiceStmt]);

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

    if (existing.status === 'paid' || existing.status === 'void' || existing.status === 'refunded') {
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

    await c.env.DB.prepare(
      `INSERT INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price, item_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(itemId, existing.id, data.itemType, data.description, qty, unit, totalPrice, itemDate, now)
      .run();

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

    if (existing.status === 'paid' || existing.status === 'void' || existing.status === 'refunded') {
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
      return c.json({ success: false, error: { code: 'ALREADY_PAID', message: 'Bill is already paid in full' } }, 400);
    }
    if (bill.status === 'void' || bill.status === 'refunded') {
      return c.json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot pay bill in status '${bill.status}'` } }, 400);
    }

    // 1. Resolve Payment Method
    let paymentMethodRecord: any = null;
    if (data.paymentMethodId) {
      paymentMethodRecord = await c.env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
        .bind(data.paymentMethodId)
        .first();
    } else if (data.paymentMethod) {
      paymentMethodRecord = await c.env.DB.prepare('SELECT * FROM payment_methods WHERE code = ? OR name LIKE ? OR id = ?')
        .bind(data.paymentMethod.toUpperCase(), `%${data.paymentMethod}%`, data.paymentMethod)
        .first();
    }

    if (!paymentMethodRecord) {
      paymentMethodRecord = await c.env.DB.prepare('SELECT * FROM payment_methods WHERE is_active = 1 LIMIT 1').first();
    }

    const paymentMethodId = paymentMethodRecord?.id || 'pm-card';
    const paymentMethodName = paymentMethodRecord?.name || 'Credit / Debit Card';

    // 2. Determine Payment Amount & Deductions
    const currentDeposit = Number(bill.deposit_deducted || 0);
    const newDeposit = data.depositDeducted !== undefined ? Number(data.depositDeducted) : currentDeposit;
    const currentPaid = Number(bill.amount_paid || 0);

    const netPayable = Math.max(0, Number((bill.total_amount - newDeposit - currentPaid).toFixed(2)));
    const paymentAmount = data.amount !== undefined ? Number(data.amount) : netPayable;

    if (paymentAmount <= 0) {
      return c.json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than 0' } }, 400);
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';
    const paymentId = `pay-${crypto.randomUUID()}`;
    const referenceNumber = data.referenceNumber || `REF-${Date.now().toString().slice(-6)}`;

    const newAmountPaid = Number((currentPaid + paymentAmount).toFixed(2));
    const newAmountDue = Math.max(0, Number((bill.total_amount - newDeposit - newAmountPaid).toFixed(2)));
    const newStatus = newAmountDue === 0 ? 'paid' : 'partially_paid';

    // 3. Prepare Batch Statements
    const stmts: any[] = [];

    // Insert payment
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO payments (id, bill_id, payment_method_id, amount, reference_number, status, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`
      ).bind(paymentId, bill.id, paymentMethodId, paymentAmount, referenceNumber, now, now)
    );

    // Update bill
    stmts.push(
      c.env.DB.prepare(
        `UPDATE bills
         SET deposit_deducted = ?, amount_paid = ?, amount_due = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).bind(newDeposit, newAmountPaid, newAmountDue, newStatus, now, bill.id)
    );

    // Update Invoice status to 'issued'
    stmts.push(
      c.env.DB.prepare(
        `UPDATE invoices
         SET status = 'issued', total_amount = ?
         WHERE bill_id = ?`
      ).bind(bill.total_amount, bill.id)
    );

    // 4. Outbox Event: BillPaid
    let reservationUuid = bill.reservation_id;
    if (!reservationUuid.includes('-') || reservationUuid.length !== 36) {
      reservationUuid = crypto.randomUUID();
    }

    const outboxId = `evt-${crypto.randomUUID()}`;
    const billPaidEvent: BillPaidEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'BillPaid',
      timestamp: now,
      billId: bill.id.includes('-') && bill.id.length === 36 ? bill.id : crypto.randomUUID(),
      billNumber: bill.bill_number,
      reservationId: reservationUuid,
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
      performedBy: callerId.includes('-') && callerId.length === 36 ? callerId : crypto.randomUUID(),
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
    const newStatus = newAmountPaid === 0 ? 'refunded' : bill.status;

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

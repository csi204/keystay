import { Hono } from 'hono';
import { type Env, mapBill, mapBillItem } from '../types';

const webhooks = new Hono<{ Bindings: Env }>();

// ==========================================
// 2. POST /webhooks/checkout — รับ Event ReservationCheckedOut จาก QStash
// สร้าง Bill ฉบับร่าง (Draft/Pending) รอรวมยอดมินิบาร์และหักมัดจำ
// ==========================================
webhooks.post('/checkout', async (c) => {
  try {
    const rawBody = await c.req.json();
    console.log('[Webhook:Checkout] Received checkout event:', JSON.stringify(rawBody));

    // Handle both direct event payload or QStash wrapped payload
    const event = rawBody.body ? (typeof rawBody.body === 'string' ? JSON.parse(rawBody.body) : rawBody.body) : rawBody;

    const reservationId = event.reservationId;
    if (!reservationId) {
      return c.json({ success: false, error: { message: 'Missing reservationId in checkout event' } }, 400);
    }

    // 1. Idempotency Check: Don't duplicate bill if already created
    const existingBill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE reservation_id = ?')
      .bind(reservationId)
      .first();

    if (existingBill) {
      console.log(`[Webhook:Checkout] Bill already exists for reservation ${reservationId} (${existingBill.bill_number})`);
      const existingItems = await c.env.DB.prepare('SELECT * FROM bill_items WHERE bill_id = ?').bind(existingBill.id).all();
      return c.json({
        success: true,
        message: 'Bill already exists for this reservation (Idempotent)',
        data: {
          ...mapBill(existingBill),
          items: (existingItems.results || []).map(mapBillItem),
        },
      });
    }

    const now = new Date().toISOString();
    const billId = `bill-${crypto.randomUUID()}`;
    const billNumber = `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const guestName = event.guestName || 'Guest';
    const roomNumber = event.roomNumber || 'N/A';
    const roomTypeName = event.roomTypeName || 'Room';
    const totalNights = Number(event.totalNights || 1);
    const nightlyRate = Number(event.nightlyRate || 0);
    const roomCharge = Number(event.roomTotalAmount || (nightlyRate * totalNights)) || 0;

    const subtotal = roomCharge;
    const taxRate = Number(event.taxRate || 0.07);
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const serviceChargeRate = 0.10;
    const serviceCharge = Number((subtotal * serviceChargeRate).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount + serviceCharge).toFixed(2));
    const depositDeducted = Number(event.depositAmount || 0);
    const amountDue = Math.max(0, Number((totalAmount - depositDeducted).toFixed(2)));
    const status = amountDue === 0 && depositDeducted >= totalAmount ? 'paid' : 'pending';

    const itemId = `bi-${crypto.randomUUID()}`;
    const itemDate = event.checkInDate || now.slice(0, 10);

    const invoiceId = `inv-${crypto.randomUUID()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Prepare atomic statements
    const stmts = [
      // Insert Bill
      c.env.DB.prepare(
        `INSERT INTO bills (id, bill_number, reservation_id, guest_name, room_number, subtotal, discount_amount, tax_rate, tax_amount, service_charge, total_amount, deposit_deducted, amount_paid, amount_due, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
      ).bind(
        billId,
        billNumber,
        reservationId,
        guestName,
        roomNumber,
        subtotal,
        taxRate,
        taxAmount,
        serviceCharge,
        totalAmount,
        depositDeducted,
        amountDue,
        status,
        now,
        now
      ),

      // Insert Initial Room Charge Item
      c.env.DB.prepare(
        `INSERT INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price, item_date, created_at)
         VALUES (?, ?, 'room_charge', ?, ?, ?, ?, ?, ?)`
      ).bind(
        itemId,
        billId,
        `Room Charge (${roomTypeName} x ${totalNights} nights)`,
        totalNights,
        nightlyRate,
        subtotal,
        itemDate,
        now
      ),

      // Insert Initial Draft Invoice
      c.env.DB.prepare(
        `INSERT INTO invoices (id, invoice_number, bill_id, issued_to_name, issued_to_email, total_amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`
      ).bind(
        invoiceId,
        invoiceNumber,
        billId,
        guestName,
        event.guestEmail || null,
        totalAmount,
        now
      ),
    ];

    await c.env.DB.batch(stmts);
    console.log(`[Webhook:Checkout] Created draft bill ${billNumber} for reservation ${reservationId}`);

    const createdBill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(billId).first();
    const createdItems = await c.env.DB.prepare('SELECT * FROM bill_items WHERE bill_id = ?').bind(billId).all();

    return c.json(
      {
        success: true,
        message: 'Draft bill created successfully from checkout event',
        data: {
          ...mapBill(createdBill),
          items: (createdItems.results || []).map(mapBillItem),
        },
      },
      201
    );
  } catch (error: any) {
    console.error('[Webhook:Checkout] Error processing event:', error);
    return c.json({ success: false, error: { message: error.message || 'Failed to process checkout webhook' } }, 500);
  }
});

export default webhooks;

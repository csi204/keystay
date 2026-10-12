import { Hono } from 'hono';
import { type Env, mapInvoice, mapBill, mapBillItem } from '../types';
import { sendInvoiceEmailSchema } from '../validators/billing.validator';

const invoices = new Hono<{ Bindings: Env }>();

// ==========================================
// 84. GET /invoices — รายการใบแจ้งหนี้ทั้งหมด
// ==========================================
invoices.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const billId = c.req.query('bill_id') || c.req.query('billId');
    const limit = Math.min(Number(c.req.query('limit') || 50), 100);
    const offset = Number(c.req.query('offset') || 0);

    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (billId) {
      sql += ' AND bill_id = ?';
      params.push(billId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(sql).bind(...params).all();
    const rows = result.results || [];

    return c.json({
      success: true,
      data: rows.map(mapInvoice),
      pagination: {
        limit,
        offset,
        count: rows.length,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to list invoices' } }, 500);
  }
});

// ==========================================
// 85. GET /invoices/:id — ดูใบแจ้งหนี้รายใบ
// ==========================================
invoices.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const invoice: any = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?')
      .bind(id, id)
      .first();

    if (!invoice) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } }, 404);
    }

    // Fetch related bill
    const bill: any = await c.env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(invoice.bill_id).first();
    let items: any[] = [];
    if (bill) {
      const itemsResult = await c.env.DB.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY created_at ASC')
        .bind(bill.id)
        .all();
      items = (itemsResult.results || []).map(mapBillItem);
    }

    return c.json({
      success: true,
      data: {
        ...mapInvoice(invoice),
        bill: mapBill(bill),
        items,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch invoice' } }, 500);
  }
});

// ==========================================
// 86. POST /invoices/:id/send-email — ส่งใบแจ้งหนี้ให้แขกทางอีเมล
// ==========================================
invoices.post('/:id/send-email', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = sendInvoiceEmailSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const invoice: any = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?')
      .bind(id, id)
      .first();

    if (!invoice) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } }, 404);
    }

    const recipientEmail = parsed.data?.email || invoice.issued_to_email || 'guest@keystay-hotel.com';
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `UPDATE invoices
       SET status = 'sent', issued_to_email = ?, sent_at = ?
       WHERE id = ?`
    )
      .bind(recipientEmail, now, invoice.id)
      .run();

    const updated: any = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(invoice.id).first();

    return c.json({
      success: true,
      message: `Invoice ${invoice.invoice_number} sent successfully to ${recipientEmail}`,
      data: {
        invoice: mapInvoice(updated),
        recipientEmail,
        sentAt: now,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to send invoice email' } }, 500);
  }
});

export default invoices;

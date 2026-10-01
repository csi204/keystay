import { Hono } from 'hono';
import { type Env, mapPaymentMethod } from '../types';
import { createPaymentMethodSchema } from '../validators/billing.validator';

const paymentMethods = new Hono<{ Bindings: Env }>();

// ==========================================
// 82. GET /payment-methods — รายการช่องทางการชำระเงินที่เปิดรับ
// ==========================================
paymentMethods.get('/', async (c) => {
  try {
    const activeOnly = c.req.query('active') === 'true';

    let sql = 'SELECT * FROM payment_methods';
    if (activeOnly) {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY created_at ASC';

    const result = await c.env.DB.prepare(sql).all();
    const rows = result.results || [];

    return c.json({
      success: true,
      data: rows.map(mapPaymentMethod),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to list payment methods' } }, 500);
  }
});

// ==========================================
// 83. POST /payment-methods — เพิ่มช่องทางการชำระเงิน
// ==========================================
paymentMethods.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createPaymentMethodSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const { name, code, isActive } = parsed.data;

    // Check unique
    const existing = await c.env.DB.prepare('SELECT id FROM payment_methods WHERE code = ? OR name = ?')
      .bind(code, name)
      .first();

    if (existing) {
      return c.json({ success: false, error: { code: 'DUPLICATE_CODE', message: `Payment method with code '${code}' or name '${name}' already exists` } }, 409);
    }

    const id = `pm-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO payment_methods (id, name, code, is_active, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(id, name, code, isActive ? 1 : 0, now)
      .run();

    const created: any = await c.env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?').bind(id).first();

    return c.json(
      {
        success: true,
        message: 'Payment method created successfully',
        data: mapPaymentMethod(created),
      },
      201
    );
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to create payment method' } }, 500);
  }
});

export default paymentMethods;

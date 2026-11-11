import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { outsourceContacts } from '../db/schema';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
}

export interface OutsourceContactDTO {
  id: string;
  name: string;
  category: 'air_conditioning' | 'plumbing' | 'electrical' | 'locksmith' | 'gardening' | 'general_maintenance' | 'pest_control';
  serviceType: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  lineId?: string | null;
  isEmergency: boolean;
  availableHours: string;
  priceRateNote?: string | null;
  rating?: number;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
}

/**
 * Maps raw database row (snake_case from D1 or camelCase from Drizzle) to OutsourceContactDTO
 */
export function mapOutsourceContact(row: any): OutsourceContactDTO {
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category,
    serviceType: String(row.serviceType ?? row.service_type ?? ''),
    phonePrimary: String(row.phonePrimary ?? row.phone_primary ?? ''),
    phoneSecondary: row.phoneSecondary ?? row.phone_secondary ?? null,
    lineId: row.lineId ?? row.line_id ?? null,
    isEmergency:
      row.is_emergency !== undefined
        ? Boolean(row.is_emergency)
        : row.isEmergency !== undefined
          ? Boolean(row.isEmergency)
          : false,
    availableHours: String(row.availableHours ?? row.available_hours ?? '24 ชั่วโมง'),
    priceRateNote: row.priceRateNote ?? row.price_rate_note ?? null,
    rating: row.rating !== undefined && row.rating !== null ? Number(row.rating) : undefined,
    address: row.address ?? null,
    notes: row.notes ?? null,
    isActive:
      row.is_active !== undefined
        ? Boolean(row.is_active)
        : row.isActive !== undefined
          ? Boolean(row.isActive)
          : true,
  };
}

export const outsourceContactsRoute = new Hono<{ Bindings: Env }>();

// ==========================================
// API #101: GET /housekeeping/outsource-contacts - รายชื่อคู่ค้า/ช่างภายนอก พร้อมระบบกรองเหตุฉุกเฉิน 24 ชม.
// ==========================================
outsourceContactsRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const category = c.req.query('category');
  const isEmergency = c.req.query('is_emergency') ?? c.req.query('isEmergency');
  const isActive = c.req.query('is_active') ?? c.req.query('isActive');

  const conditions = [];

  if (category) {
    conditions.push(eq(outsourceContacts.category, category as any));
  }

  if (isEmergency !== undefined && isEmergency !== '') {
    const isEmergVal = isEmergency === '1' || isEmergency.toLowerCase() === 'true' ? 1 : 0;
    conditions.push(eq(outsourceContacts.isEmergency, isEmergVal));
  }

  if (isActive !== undefined && isActive !== '') {
    const isActiveVal = isActive === '1' || isActive.toLowerCase() === 'true' ? 1 : 0;
    conditions.push(eq(outsourceContacts.isActive, isActiveVal));
  }

  const rows = conditions.length > 0
    ? await db.select().from(outsourceContacts).where(and(...conditions)).orderBy(desc(outsourceContacts.rating)).all()
    : await db.select().from(outsourceContacts).orderBy(desc(outsourceContacts.rating)).all();

  const data = rows.map(mapOutsourceContact);

  return c.json({
    success: true,
    total: data.length,
    data,
  });
});

// GET /:id - รายละเอียดคู่ค้าตาม ID
outsourceContactsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const rows = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .all();

  if (!rows || rows.length === 0) {
    return c.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: `Outsource contact with id ${id} not found`,
      },
      404
    );
  }

  return c.json({
    success: true,
    data: mapOutsourceContact(rows[0]),
  });
});

// ==========================================
// API #103: POST /housekeeping/outsource-contacts - เพิ่มข้อมูลคู่ค้า/ช่าง Outsource ใหม่
// ==========================================
outsourceContactsRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = body.name?.trim();
  const category = body.category?.trim();
  const serviceType = (body.serviceType ?? body.service_type)?.trim();
  const phonePrimary = (body.phonePrimary ?? body.phone_primary)?.trim();

  if (!name || !category || !serviceType || !phonePrimary) {
    return c.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'name, category, serviceType, and phonePrimary are required',
      },
      400
    );
  }

  const db = getDb(c.env.DB);
  const now = new Date().toISOString();
  const id = body.id || `out-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const isEmergencyVal =
    body.is_emergency !== undefined
      ? (body.is_emergency ? 1 : 0)
      : body.isEmergency !== undefined
        ? (body.isEmergency ? 1 : 0)
        : 1;

  const isActiveVal =
    body.is_active !== undefined
      ? (body.is_active ? 1 : 0)
      : body.isActive !== undefined
        ? (body.isActive ? 1 : 0)
        : 1;

  const newRecord = {
    id,
    name,
    category: category as any,
    serviceType,
    phonePrimary,
    phoneSecondary: (body.phoneSecondary ?? body.phone_secondary) || null,
    lineId: (body.lineId ?? body.line_id) || null,
    isEmergency: isEmergencyVal,
    availableHours: (body.availableHours ?? body.available_hours) || '24 ชั่วโมง',
    priceRateNote: (body.priceRateNote ?? body.price_rate_note) || null,
    rating: body.rating !== undefined ? Number(body.rating) : 5.0,
    address: body.address || null,
    notes: body.notes || null,
    isActive: isActiveVal,
    createdBy: body.createdBy || 'system',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(outsourceContacts).values(newRecord).run();

  return c.json(
    {
      success: true,
      data: mapOutsourceContact(newRecord),
    },
    201
  );
});

// ==========================================
// API #104: PUT /housekeeping/outsource-contacts/:id - แก้ไขข้อมูลช่างและเงื่อนไขการติดต่อ
// ==========================================
outsourceContactsRoute.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .all();

  if (!existing || existing.length === 0) {
    return c.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: `Outsource contact with id ${id} not found`,
      },
      404
    );
  }

  const now = new Date().toISOString();
  const updateData: any = {
    updatedAt: now,
  };

  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.category !== undefined) updateData.category = body.category.trim();
  if (body.serviceType !== undefined || body.service_type !== undefined) {
    updateData.serviceType = (body.serviceType ?? body.service_type).trim();
  }
  if (body.phonePrimary !== undefined || body.phone_primary !== undefined) {
    updateData.phonePrimary = (body.phonePrimary ?? body.phone_primary).trim();
  }
  if (body.phoneSecondary !== undefined || body.phone_secondary !== undefined) {
    updateData.phoneSecondary = (body.phoneSecondary ?? body.phone_secondary) || null;
  }
  if (body.lineId !== undefined || body.line_id !== undefined) {
    updateData.lineId = (body.lineId ?? body.line_id) || null;
  }
  if (body.isEmergency !== undefined || body.is_emergency !== undefined) {
    updateData.isEmergency = (body.isEmergency ?? body.is_emergency) ? 1 : 0;
  }
  if (body.availableHours !== undefined || body.available_hours !== undefined) {
    updateData.availableHours = (body.availableHours ?? body.available_hours) || '24 ชั่วโมง';
  }
  if (body.priceRateNote !== undefined || body.price_rate_note !== undefined) {
    updateData.priceRateNote = (body.priceRateNote ?? body.price_rate_note) || null;
  }
  if (body.rating !== undefined) updateData.rating = Number(body.rating);
  if (body.address !== undefined) updateData.address = body.address || null;
  if (body.notes !== undefined) updateData.notes = body.notes || null;
  if (body.isActive !== undefined || body.is_active !== undefined) {
    updateData.isActive = (body.isActive ?? body.is_active) ? 1 : 0;
  }

  await db.update(outsourceContacts).set(updateData).where(eq(outsourceContacts.id, id)).run();

  const updatedRows = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .all();

  return c.json({
    success: true,
    data: mapOutsourceContact(updatedRows[0]),
  });
});

// ==========================================
// API #105: DELETE /housekeeping/outsource-contacts/:id - ระงับการใช้งานช่าง/คู่ค้า (Soft Delete)
// ==========================================
outsourceContactsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .all();

  if (!existing || existing.length === 0) {
    return c.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: `Outsource contact with id ${id} not found`,
      },
      404
    );
  }

  const now = new Date().toISOString();
  await db
    .update(outsourceContacts)
    .set({
      isActive: 0,
      updatedAt: now,
    })
    .where(eq(outsourceContacts.id, id))
    .run();

  return c.json({
    success: true,
    message: 'Outsource contact deactivated successfully',
  });
});

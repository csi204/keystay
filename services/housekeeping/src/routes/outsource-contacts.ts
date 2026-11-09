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

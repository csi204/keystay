import { Hono } from 'hono';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { outsourceContacts, type OutsourceContact } from '../db/schema';
import {
  CreateOutsourceContactSchema,
  UpdateOutsourceContactSchema,
  OutsourceCategoryEnum,
} from '../validators/outsource.validator';
import { verifyJwt } from '@keystay/utils';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
}

export const outsourceRoute = new Hono<{ Bindings: Env }>();

// Helper to determine caller role from x-user-role header or Authorization Bearer token
async function getCallerRole(c: any): Promise<{ role?: string; userId?: string; error?: string }> {
  const roleHeader = c.req.header('x-user-role');
  const userIdHeader = c.req.header('x-user-id');
  if (roleHeader) {
    return { role: roleHeader, userId: userIdHeader || 'admin' };
  }

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = c.env.JWT_SECRET || 'keystay-super-secret-test-jwt-key-2026-minimum-32-chars';
    const { valid, payload } = await verifyJwt(token, secret);
    if (valid && payload) {
      return { role: (payload as any).role, userId: (payload as any).sub };
    }
    return { error: 'INVALID_TOKEN' };
  }

  return { error: 'UNAUTHORIZED' };
}

// Middleware to guard Admin-only write operations (POST, PUT, DELETE)
async function requireAdminGuard(c: any, next: any) {
  const { role, error } = await getCallerRole(c);

  if (error === 'UNAUTHORIZED' || error === 'INVALID_TOKEN') {
    return c.json(
      {
        success: false,
        error: error,
        message: 'Missing or invalid authentication token. Admin role required.',
      },
      401
    );
  }

  if (role !== 'admin') {
    return c.json(
      {
        success: false,
        error: 'ADMIN_ROLE_REQUIRED',
        message: 'Access denied: Only administrator can create, edit, or deactivate outsource contacts',
      },
      403
    );
  }

  await next();
}

// ==========================================
// API #101: GET /housekeeping/outsource-contacts
// ดึงรายชื่อช่าง/คู่ค้าภายนอกทั้งหมด (รองรับ filter: category, is_emergency, is_active)
// สิทธิ์: ทุก Role (Housekeeping, Front Desk, Manager, Admin) เข้าถึงได้แบบ Read Only
// ==========================================
outsourceRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const category = c.req.query('category');
  const isEmergencyQuery = c.req.query('is_emergency') ?? c.req.query('isEmergency');
  const isActiveQuery = c.req.query('is_active') ?? c.req.query('isActive');

  const conditions = [];

  if (category) {
    const parsedCategory = OutsourceCategoryEnum.safeParse(category);
    if (parsedCategory.success) {
      conditions.push(eq(outsourceContacts.category, parsedCategory.data));
    }
  }

  if (isEmergencyQuery !== undefined && isEmergencyQuery !== '') {
    const isEmer = isEmergencyQuery === '1' || isEmergencyQuery === 'true' ? 1 : 0;
    conditions.push(eq(outsourceContacts.isEmergency, isEmer));
  }

  if (isActiveQuery !== undefined && isActiveQuery !== '') {
    const isAct = isActiveQuery === '1' || isActiveQuery === 'true' ? 1 : 0;
    conditions.push(eq(outsourceContacts.isActive, isAct));
  }

  const query = db.select().from(outsourceContacts);

  const results = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(
        desc(outsourceContacts.isEmergency),
        desc(outsourceContacts.rating),
        asc(outsourceContacts.name)
      ).all()
    : await query.orderBy(
        desc(outsourceContacts.isEmergency),
        desc(outsourceContacts.rating),
        asc(outsourceContacts.name)
      ).all();

  return c.json({
    success: true,
    count: results.length,
    data: results,
  });
});

// ==========================================
// API #102: GET /housekeeping/outsource-contacts/:id
// ดึงข้อมูลคู่ค้า/ช่าง Outsource รายคน/บริษัท
// ==========================================
outsourceRoute.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const contact = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .get();

  if (!contact) {
    return c.json(
      {
        success: false,
        error: 'OUTSOURCE_CONTACT_NOT_FOUND',
        message: `Outsource contact with ID '${id}' was not found`,
      },
      404
    );
  }

  return c.json({
    success: true,
    data: contact,
  });
});

// ==========================================
// API #103: POST /housekeeping/outsource-contacts
// เพิ่มข้อมูลคู่ค้า/ช่าง Outsource ใหม่ (เฉพาะ Admin)
// ==========================================
outsourceRoute.post('/', requireAdminGuard, async (c) => {
  const db = getDb(c.env.DB);
  const { userId } = await getCallerRole(c);

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: 'INVALID_JSON',
        message: 'Malformed request JSON body',
      },
      400
    );
  }

  const parsed = CreateOutsourceContactSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid outsource contact payload',
        details: parsed.error.issues,
      },
      400
    );
  }

  const now = new Date().toISOString();
  const id = body.id || `out-${crypto.randomUUID().slice(0, 8)}`;

  const newContact = {
    id,
    name: parsed.data.name,
    category: parsed.data.category,
    serviceType: parsed.data.serviceType,
    phonePrimary: parsed.data.phonePrimary,
    phoneSecondary: parsed.data.phoneSecondary ?? null,
    lineId: parsed.data.lineId ?? null,
    isEmergency: parsed.data.isEmergency,
    availableHours: parsed.data.availableHours ?? '24 ชั่วโมง',
    priceRateNote: parsed.data.priceRateNote ?? null,
    rating: parsed.data.rating,
    address: parsed.data.address ?? null,
    notes: parsed.data.notes ?? null,
    isActive: parsed.data.isActive,
    createdBy: userId || 'usr-admin-001',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(outsourceContacts).values(newContact).run();

  return c.json(
    {
      success: true,
      message: 'Outsource contact created successfully',
      data: newContact,
    },
    201
  );
});

// ==========================================
// API #104: PUT /housekeeping/outsource-contacts/:id
// แก้ไขข้อมูลคู่ค้า/ช่าง Outsource (เฉพาะ Admin)
// ==========================================
outsourceRoute.put('/:id', requireAdminGuard, async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .get();

  if (!existing) {
    return c.json(
      {
        success: false,
        error: 'OUTSOURCE_CONTACT_NOT_FOUND',
        message: `Outsource contact with ID '${id}' was not found`,
      },
      404
    );
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: 'INVALID_JSON',
        message: 'Malformed request JSON body',
      },
      400
    );
  }

  const parsed = UpdateOutsourceContactSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid outsource contact update payload',
        details: parsed.error.issues,
      },
      400
    );
  }

  const now = new Date().toISOString();
  const updateData: Partial<OutsourceContact> = {
    ...parsed.data,
    updatedAt: now,
  };

  await db
    .update(outsourceContacts)
    .set(updateData)
    .where(eq(outsourceContacts.id, id))
    .run();

  const updated = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .get();

  return c.json({
    success: true,
    message: 'Outsource contact updated successfully',
    data: updated,
  });
});

// ==========================================
// API #105: DELETE /housekeeping/outsource-contacts/:id
// ระงับการใช้งานช่าง/คู่ค้า (Soft Delete: is_active = 0, เฉพาะ Admin)
// ==========================================
outsourceRoute.delete('/:id', requireAdminGuard, async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .get();

  if (!existing) {
    return c.json(
      {
        success: false,
        error: 'OUTSOURCE_CONTACT_NOT_FOUND',
        message: `Outsource contact with ID '${id}' was not found`,
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
    data: {
      id,
      isActive: 0,
      updatedAt: now,
    },
  });
});


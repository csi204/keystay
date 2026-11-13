import { Hono } from 'hono';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
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

// Safe column migration for local SQLite/D1 instances that were created before the new columns
let hasEnsuredColumns = false;
async function ensureColumns(db: any) {
  if (hasEnsuredColumns) return;
  try {
    await db.run(sql`ALTER TABLE outsource_contacts ADD COLUMN categories TEXT`);
  } catch {}
  try {
    await db.run(sql`ALTER TABLE outsource_contacts ADD COLUMN open_time TEXT`);
  } catch {}
  try {
    await db.run(sql`ALTER TABLE outsource_contacts ADD COLUMN close_time TEXT`);
  } catch {}
  hasEnsuredColumns = true;
}

// ==========================================
// API #101: GET /housekeeping/outsource-contacts
// ดึงรายชื่อช่าง/คู่ค้าภายนอกทั้งหมด (รองรับ filter: category, is_emergency, is_active)
// สิทธิ์: ทุก Role (Housekeeping, Front Desk, Manager, Admin) เข้าถึงได้แบบ Read Only
// ==========================================
outsourceRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  await ensureColumns(db);
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

  const formatted = results.map((row: any) => {
    let categories: string[] = [];
    if (row.categories) {
      try {
        categories = typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories;
      } catch {
        categories = [row.category];
      }
    } else if (row.category) {
      categories = [row.category];
    }
    return {
      ...row,
      categories,
      openTime: row.openTime ?? row.open_time ?? null,
      closeTime: row.closeTime ?? row.close_time ?? null,
    };
  });

  return c.json({
    success: true,
    count: formatted.length,
    data: formatted,
  });
});

// ==========================================
// API #102: GET /housekeeping/outsource-contacts/:id
// ดึงข้อมูลคู่ค้า/ช่าง Outsource รายคน/บริษัท
// ==========================================
outsourceRoute.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  await ensureColumns(db);
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

  let categories: string[] = [];
  const rawContact: any = contact;
  if (rawContact.categories) {
    try {
      categories = typeof rawContact.categories === 'string' ? JSON.parse(rawContact.categories) : rawContact.categories;
    } catch {
      categories = [rawContact.category];
    }
  } else if (rawContact.category) {
    categories = [rawContact.category];
  }

  return c.json({
    success: true,
    data: {
      ...rawContact,
      categories,
      openTime: rawContact.openTime ?? rawContact.open_time ?? null,
      closeTime: rawContact.closeTime ?? rawContact.close_time ?? null,
    },
  });
});

// ==========================================
// API #103: POST /housekeeping/outsource-contacts
// เพิ่มข้อมูลคู่ค้า/ช่าง Outsource ใหม่ (เฉพาะ Admin)
// ==========================================
outsourceRoute.post('/', requireAdminGuard, async (c) => {
  const db = getDb(c.env.DB);
  await ensureColumns(db);
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

  const primaryCategory = parsed.data.category || (parsed.data.categories && parsed.data.categories[0]) || 'general_maintenance';
  const categoriesList = parsed.data.categories && parsed.data.categories.length > 0
    ? parsed.data.categories
    : [primaryCategory];

  const newContact = {
    id,
    name: parsed.data.name,
    category: primaryCategory,
    categories: JSON.stringify(categoriesList),
    serviceType: parsed.data.serviceType,
    phonePrimary: parsed.data.phonePrimary,
    phoneSecondary: parsed.data.phoneSecondary ?? null,
    lineId: parsed.data.lineId ?? null,
    isEmergency: parsed.data.isEmergency,
    availableHours: parsed.data.availableHours ?? '24 ชั่วโมง',
    openTime: parsed.data.openTime ?? null,
    closeTime: parsed.data.closeTime ?? null,
    priceRateNote: parsed.data.priceRateNote ?? null,
    rating: parsed.data.rating ?? 5.0,
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
      data: {
        ...newContact,
        categories: categoriesList,
      },
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
  await ensureColumns(db);
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
  const updateData: any = {
    ...parsed.data,
    updatedAt: now,
  };

  if (parsed.data.categories && parsed.data.categories.length > 0) {
    updateData.categories = JSON.stringify(parsed.data.categories);
    if (!parsed.data.category) {
      updateData.category = parsed.data.categories[0];
    }
  }

  await db
    .update(outsourceContacts)
    .set(updateData)
    .where(eq(outsourceContacts.id, id))
    .run();

  const updated: any = await db
    .select()
    .from(outsourceContacts)
    .where(eq(outsourceContacts.id, id))
    .get();

  let categories: string[] = [];
  if (updated?.categories) {
    try {
      categories = typeof updated.categories === 'string' ? JSON.parse(updated.categories) : updated.categories;
    } catch {
      categories = [updated.category];
    }
  } else if (updated?.category) {
    categories = [updated.category];
  }

  return c.json({
    success: true,
    message: 'Outsource contact updated successfully',
    data: {
      ...updated,
      categories,
      openTime: updated?.openTime ?? updated?.open_time ?? null,
      closeTime: updated?.closeTime ?? updated?.close_time ?? null,
    },
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


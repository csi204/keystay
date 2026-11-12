import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { minibarItems, type MinibarItem } from '../db/schema';
import {
  CreateMinibarItemSchema,
  UpdateMinibarItemSchema,
  MinibarQuerySchema,
} from '../validators/minibar.validator';
import { verifyJwt } from '@keystay/utils';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

export const minibarRoute = new Hono<{ Bindings: Env }>();

// Initial 6 Standard Seed Items for Small & Boutique Hotel
export const SEED_MINIBAR_ITEMS: Array<Omit<MinibarItem, 'createdAt' | 'updatedAt'>> = [
  { id: 'mb-001', name: 'น้ำดื่ม 600ml', category: 'เครื่องดื่ม', pricePerUnit: 20, unit: 'ขวด', isActive: 1 },
  { id: 'mb-002', name: 'โค้ก 330ml', category: 'เครื่องดื่ม', pricePerUnit: 35, unit: 'กระป๋อง', isActive: 1 },
  { id: 'mb-003', name: 'เบียร์ Chang 330ml', category: 'แอลกอฮอล์', pricePerUnit: 80, unit: 'กระป๋อง', isActive: 1 },
  { id: 'mb-004', name: 'มันฝรั่งทอด', category: 'ขนม', pricePerUnit: 45, unit: 'ถุง', isActive: 1 },
  { id: 'mb-005', name: 'ช็อกโกแลต KitKat', category: 'ขนม', pricePerUnit: 35, unit: 'แท่ง', isActive: 1 },
  { id: 'mb-006', name: 'กาแฟสำเร็จรูป', category: 'เครื่องดื่ม', pricePerUnit: 25, unit: 'ซอง', isActive: 0 },
];

async function ensureSeeded(db: any) {
  const existing = await db.select().from(minibarItems).limit(1).all();
  if (existing.length === 0) {
    const now = new Date().toISOString();
    for (const item of SEED_MINIBAR_ITEMS) {
      await db.insert(minibarItems).values({
        ...item,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
  }
}

// Helper: Extract caller role from x-user-role header or Authorization Bearer token
async function getCallerRole(c: any): Promise<{ role?: string; userId?: string; error?: string }> {
  const roleHeader = c.req.header('x-user-role');
  const userIdHeader = c.req.header('x-user-id');
  if (roleHeader) {
    return { role: roleHeader, userId: userIdHeader || 'admin' };
  }

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = c.env?.JWT_SECRET || 'keystay-super-secret-test-jwt-key-2026-minimum-32-chars';
    const { valid, payload } = await verifyJwt(token, secret);
    if (valid && payload) {
      return { role: (payload as any).role, userId: (payload as any).sub };
    }
    return { error: 'INVALID_TOKEN' };
  }

  return { role: undefined };
}

// Guard: Only Owner, Admin, Manager, and Front Desk can perform Write operations (POST, PUT, DELETE)
async function requireWritePermission(c: any, next: any) {
  const { role, error } = await getCallerRole(c);

  if (error === 'INVALID_TOKEN') {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Token ไม่ถูกต้องหรือหมดอายุ' }, 401);
  }

  // If role is present, check permission
  if (role) {
    const allowedRoles = ['owner', 'admin', 'manager', 'front_desk'];
    if (!allowedRoles.includes(role)) {
      return c.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Owner และ Front Desk เท่านั้นที่สามารถจัดการสินค้าในมินิบาร์ได้',
        },
        403,
      );
    }
  }

  await next();
}

// 1. GET /minibar-items - ดึงรายการสินค้าในมินิบาร์ทั้งหมด
minibarRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const query = c.req.query();
  const parsedQuery = MinibarQuerySchema.safeParse(query);
  const { category, isActive, search } = parsedQuery.success ? parsedQuery.data : query;

  const items = await db.select().from(minibarItems).all();

  let filtered = items;

  if (category && category !== 'ทั้งหมด') {
    filtered = filtered.filter((i) => i.category === category);
  }

  if (isActive !== undefined && isActive !== '') {
    const boolActive = isActive === 'true' || isActive === '1';
    filtered = filtered.filter((i) => (i.isActive === 1) === boolActive);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q),
    );
  }

  // Map to frontend-friendly camelCase and standard shapes
  const formatted = filtered.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    pricePerUnit: item.pricePerUnit,
    unit: item.unit,
    isActive: Boolean(item.isActive),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return c.json({
    success: true,
    data: formatted,
    total: formatted.length,
  });
});

// 2. GET /minibar-items/:id - ดึงสินค้ามินิบาร์ตาม ID
minibarRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const item = await db.select().from(minibarItems).where(eq(minibarItems.id, id)).get();
  if (!item) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้ามินิบาร์รายการนี้' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: item.id,
      name: item.name,
      category: item.category,
      pricePerUnit: item.pricePerUnit,
      unit: item.unit,
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
  });
});

// 3. POST /minibar-items - เพิ่มสินค้ามินิบาร์ใหม่ (Front Desk + Owner)
minibarRoute.post('/', requireWritePermission, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateMinibarItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const now = new Date().toISOString();
  const id = `mb-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

  const newItem = {
    id,
    name: parsed.data.name,
    category: parsed.data.category,
    pricePerUnit: parsed.data.pricePerUnit,
    unit: parsed.data.unit,
    isActive: parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(minibarItems).values(newItem).run();

  return c.json(
    {
      success: true,
      message: 'เพิ่มสินค้าในมินิบาร์เรียบร้อยแล้ว',
      data: {
        ...newItem,
        isActive: Boolean(newItem.isActive),
      },
    },
    201,
  );
});

// 4. PUT /minibar-items/:id - แก้ไขสินค้ามินิบาร์ (Front Desk + Owner)
minibarRoute.put('/:id', requireWritePermission, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdateMinibarItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(minibarItems).where(eq(minibarItems.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้ามินิบาร์รายการนี้' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Partial<MinibarItem> = {
    updatedAt: now,
  };

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.pricePerUnit !== undefined) updateData.pricePerUnit = parsed.data.pricePerUnit;
  if (parsed.data.unit !== undefined) updateData.unit = parsed.data.unit;
  if (parsed.data.isActive !== undefined) {
    updateData.isActive = parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1;
  }

  await db.update(minibarItems).set(updateData).where(eq(minibarItems.id, id)).run();

  const updated = await db.select().from(minibarItems).where(eq(minibarItems.id, id)).get();

  return c.json({
    success: true,
    message: 'อัปเดตข้อมูลสินค้าในมินิบาร์เรียบร้อยแล้ว',
    data: {
      id: updated!.id,
      name: updated!.name,
      category: updated!.category,
      pricePerUnit: updated!.pricePerUnit,
      unit: updated!.unit,
      isActive: Boolean(updated!.isActive),
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    },
  });
});

// 5. DELETE /minibar-items/:id - ปิดการขาย/ลบสินค้าในมินิบาร์ (Front Desk + Owner)
minibarRoute.delete('/:id', requireWritePermission, async (c) => {
  const id = c.req.param('id');
  const hard = c.req.query('hard') === 'true';
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(minibarItems).where(eq(minibarItems.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบสินค้ามินิบาร์รายการนี้' }, 404);
  }

  if (hard) {
    await db.delete(minibarItems).where(eq(minibarItems.id, id)).run();
    return c.json({ success: true, message: 'ลบสินค้ามินิบาร์ออกจากระบบถาวรเรียบร้อยแล้ว' });
  }

  // Soft Delete: sets isActive = 0
  const now = new Date().toISOString();
  await db.update(minibarItems).set({ isActive: 0, updatedAt: now }).where(eq(minibarItems.id, id)).run();

  return c.json({
    success: true,
    message: 'ระงับการขายสินค้าในมินิบาร์เรียบร้อยแล้ว (Soft Delete)',
    data: {
      id: existing.id,
      isActive: false,
    },
  });
});

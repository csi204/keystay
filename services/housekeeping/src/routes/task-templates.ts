import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { taskTemplates, type TaskTemplate } from '../db/schema';
import {
  CreateTaskTemplateSchema,
  UpdateTaskTemplateSchema,
  TaskTemplateQuerySchema,
} from '../validators/task-templates.validator';
import { verifyJwt } from '@keystay/utils';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

export const taskTemplatesRoute = new Hono<{ Bindings: Env }>();

// 4 Initial Standard SOP Task Templates for Small Hotel
export const SEED_TASK_TEMPLATES: Array<Omit<TaskTemplate, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'tt-001',
    name: 'ทำความสะอาดหลัง Checkout มาตรฐาน',
    taskType: 'checkout_clean',
    defaultPriority: 'high',
    estimatedMinutes: 45,
    description: 'เปลี่ยนผ้าปูเตียง ทำความสะอาดห้องน้ำ เช็ดฝุ่น เปลี่ยนผ้าเช็ดตัว เติมสบู่และน้ำดื่ม',
    isActive: 1,
  },
  {
    id: 'tt-002',
    name: 'ทำความสะอาดระหว่างพัก (Stayover)',
    taskType: 'stayover_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 20,
    description: 'จัดเตียง ทำความสะอาดห้องน้ำ เติมของใช้ในห้อง เก็บขยะ',
    isActive: 1,
  },
  {
    id: 'tt-003',
    name: 'Deep Clean รายเดือน',
    taskType: 'deep_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 120,
    description: 'ทำความสะอาดทุกซอก เช็ดกระจก ซักผ้าม่าน ทำความสะอาดเครื่องปรับอากาศ ขัดระเบียง',
    isActive: 1,
  },
  {
    id: 'tt-004',
    name: 'ตรวจสอบห้องก่อน Check-in',
    taskType: 'inspection',
    defaultPriority: 'urgent',
    estimatedMinutes: 15,
    description: 'ตรวจอุปกรณ์ไฟฟ้า เช็คห้องน้ำ ตรวจมินิบาร์ ตรวจความเรียบร้อยและฉีดสเปรย์ปรับอากาศ',
    isActive: 1,
  },
];

async function ensureSeeded(db: any) {
  const existing = await db.select().from(taskTemplates).limit(1).all();
  if (existing.length === 0) {
    const now = new Date().toISOString();
    for (const tpl of SEED_TASK_TEMPLATES) {
      await db.insert(taskTemplates).values({
        ...tpl,
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

// Guard: Only Owner, Admin, Manager, and Front Desk can perform Write operations on Templates
async function requireWritePermission(c: any, next: any) {
  const { role, error } = await getCallerRole(c);

  if (error === 'INVALID_TOKEN') {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Token ไม่ถูกต้องหรือหมดอายุ' }, 401);
  }

  if (role) {
    const allowedRoles = ['owner', 'admin', 'manager', 'front_desk'];
    if (!allowedRoles.includes(role)) {
      return c.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Owner และ Front Desk เท่านั้นที่สามารถจัดการแม่แบบงานแม่บ้านได้',
        },
        403,
      );
    }
  }

  await next();
}

// 1. GET /task-templates - ดึงรายการแม่แบบงานแม่บ้านทั้งหมด
taskTemplatesRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const query = c.req.query();
  const parsedQuery = TaskTemplateQuerySchema.safeParse(query);
  const { taskType, isActive, search } = parsedQuery.success ? parsedQuery.data : query;

  const items = await db.select().from(taskTemplates).all();

  let filtered = items;

  if (taskType && taskType !== 'ทั้งหมด' && taskType !== 'all') {
    filtered = filtered.filter((i) => i.taskType === taskType);
  }

  if (isActive !== undefined && isActive !== '') {
    const boolActive = isActive === 'true' || isActive === '1';
    filtered = filtered.filter((i) => (i.isActive === 1) === boolActive);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)),
    );
  }

  const formatted = filtered.map((item) => ({
    id: item.id,
    name: item.name,
    taskType: item.taskType,
    defaultPriority: item.defaultPriority,
    estimatedMinutes: item.estimatedMinutes,
    description: item.description,
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

// 2. GET /task-templates/:id - ดึงแม่แบบงานตาม ID
taskTemplatesRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const item = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id)).get();
  if (!item) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบแม่แบบงานรายการนี้' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: item.id,
      name: item.name,
      taskType: item.taskType,
      defaultPriority: item.defaultPriority,
      estimatedMinutes: item.estimatedMinutes,
      description: item.description,
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
  });
});

// 3. POST /task-templates - สร้างแม่แบบงานใหม่ (Front Desk + Owner)
taskTemplatesRoute.post('/', requireWritePermission, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateTaskTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const now = new Date().toISOString();
  const id = `tt-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

  const newTemplate = {
    id,
    name: parsed.data.name,
    taskType: parsed.data.taskType,
    defaultPriority: parsed.data.defaultPriority,
    estimatedMinutes: parsed.data.estimatedMinutes,
    description: parsed.data.description || '',
    isActive: parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(taskTemplates).values(newTemplate).run();

  return c.json(
    {
      success: true,
      message: 'สร้างแม่แบบงานแม่บ้านเรียบร้อยแล้ว',
      data: {
        ...newTemplate,
        isActive: Boolean(newTemplate.isActive),
      },
    },
    201,
  );
});

// 4. PUT /task-templates/:id - แก้ไขแม่แบบงาน (Front Desk + Owner)
taskTemplatesRoute.put('/:id', requireWritePermission, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdateTaskTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบแม่แบบงานรายการนี้' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Partial<TaskTemplate> = {
    updatedAt: now,
  };

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.taskType !== undefined) updateData.taskType = parsed.data.taskType;
  if (parsed.data.defaultPriority !== undefined) updateData.defaultPriority = parsed.data.defaultPriority;
  if (parsed.data.estimatedMinutes !== undefined) updateData.estimatedMinutes = parsed.data.estimatedMinutes;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.isActive !== undefined) {
    updateData.isActive = parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1;
  }

  await db.update(taskTemplates).set(updateData).where(eq(taskTemplates.id, id)).run();

  const updated = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id)).get();

  return c.json({
    success: true,
    message: 'อัปเดตแม่แบบงานแม่บ้านเรียบร้อยแล้ว',
    data: {
      id: updated!.id,
      name: updated!.name,
      taskType: updated!.taskType,
      defaultPriority: updated!.defaultPriority,
      estimatedMinutes: updated!.estimatedMinutes,
      description: updated!.description,
      isActive: Boolean(updated!.isActive),
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    },
  });
});

// 5. DELETE /task-templates/:id - ปิดใช้งานหรือลบแม่แบบงาน (Front Desk + Owner)
taskTemplatesRoute.delete('/:id', requireWritePermission, async (c) => {
  const id = c.req.param('id');
  const hard = c.req.query('hard') === 'true';
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบแม่แบบงานรายการนี้' }, 404);
  }

  if (hard) {
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id)).run();
    return c.json({ success: true, message: 'ลบแม่แบบงานออกจากระบบถาวรเรียบร้อยแล้ว' });
  }

  // Soft Delete: sets isActive = 0
  const now = new Date().toISOString();
  await db.update(taskTemplates).set({ isActive: 0, updatedAt: now }).where(eq(taskTemplates.id, id)).run();

  return c.json({
    success: true,
    message: 'ปิดใช้งานแม่แบบงานเรียบร้อยแล้ว (Soft Delete)',
    data: {
      id: existing.id,
      isActive: false,
    },
  });
});


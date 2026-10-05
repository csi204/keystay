import { Hono } from 'hono';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { housekeepingStaff, housekeepingTasks } from '../db/schema';
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  UpdateStaffZoneSchema,
} from '../validators/housekeeping.validator';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
}

export const staffRoute = new Hono<{ Bindings: Env }>();
export const staffAssignmentsRoute = new Hono<{ Bindings: Env }>();

// ==========================================
// API #63: GET /staff-assignments - สรุปภาระงานที่แม่บ้านแต่ละคนถือครอง (Workload Summary)
// ==========================================
const getAssignmentsHandler = async (c: any) => {
  const db = getDb(c.env.DB);
  const shift = c.req.query('shift');
  const zone = c.req.query('zone');

  const conditions = [];
  if (shift) conditions.push(eq(housekeepingStaff.shift, shift as any));
  if (zone) conditions.push(eq(housekeepingStaff.zone, zone));

  const allStaff = conditions.length > 0
    ? await db.select().from(housekeepingStaff).where(and(...conditions)).all()
    : await db.select().from(housekeepingStaff).all();

  // Fetch all tasks for aggregation
  const allTasks = await db.select().from(housekeepingTasks).all();

  // Helper to format ISO date to Asia/Bangkok YYYY-MM-DD
  const getBangkokDateStr = (dateInput?: string | Date | null): string => {
    try {
      const d = dateInput ? new Date(dateInput) : new Date();
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
    } catch {
      return '';
    }
  };

  const todayStr = getBangkokDateStr();

  const assignments = allStaff.map((staff) => {
    const staffTasks = allTasks.filter((t) => t.assignedTo === staff.id);
    const activeTasks = staffTasks.filter((t) => t.status === 'assigned' || t.status === 'in_progress');
    const pendingTasks = staffTasks.filter((t) => t.status === 'assigned');
    const inProgressTasks = staffTasks.filter((t) => t.status === 'in_progress');
    const completedTodayTasks = staffTasks.filter((t) => {
      if (t.status !== 'completed') return false;
      const completedDate = getBangkokDateStr(t.completedAt ?? t.updatedAt);
      return completedDate === todayStr;
    });

    const activeCount = activeTasks.length;
    const utilizationRate = staff.maxTasksPerDay > 0
      ? Math.min(100, Math.round((activeCount / staff.maxTasksPerDay) * 100))
      : 0;

    return {
      staffId: staff.id,
      userId: staff.userId,
      name: `${staff.firstName} ${staff.lastName}`,
      phone: staff.phone,
      zone: staff.zone,
      shift: staff.shift,
      isActive: staff.isActive === 1,
      maxTasksPerDay: staff.maxTasksPerDay,
      metrics: {
        activeTasksCount: activeCount,
        pendingCount: pendingTasks.length,
        inProgressCount: inProgressTasks.length,
        completedTodayCount: completedTodayTasks.length,
        utilizationRate,
        isOverloaded: activeCount >= staff.maxTasksPerDay,
        isAvailableForDispatch: staff.isActive === 1 && activeCount < staff.maxTasksPerDay,
      },
      currentTasks: activeTasks.map((t) => ({
        id: t.id,
        roomId: t.roomId,
        roomNumber: t.roomNumber,
        taskType: t.taskType,
        priority: t.priority,
        status: t.status,
        scheduledDate: t.scheduledDate,
        startedAt: t.startedAt,
      })),
    };
  });

  // Calculate department totals
  const totalStaff = allStaff.length;
  const activeStaff = allStaff.filter((s) => s.isActive === 1).length;
  const totalActiveTasks = assignments.reduce((acc, curr) => acc + curr.metrics.activeTasksCount, 0);

  return c.json({
    success: true,
    summary: {
      totalStaff,
      activeStaff,
      totalActiveTasks,
    },
    data: assignments,
  });
};

staffAssignmentsRoute.get('/', getAssignmentsHandler);
staffRoute.get('/assignments', getAssignmentsHandler);

// ==========================================
// API #64: GET /staff - รายชื่อพนักงานแม่บ้านทั้งหมด
// ==========================================
staffRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const shift = c.req.query('shift');
  const zone = c.req.query('zone');
  const isActive = c.req.query('isActive') ?? c.req.query('is_active');

  const conditions = [];

  if (shift) conditions.push(eq(housekeepingStaff.shift, shift as any));
  if (zone) conditions.push(eq(housekeepingStaff.zone, zone));
  if (isActive !== undefined) {
    const activeVal = isActive === 'true' || isActive === '1' ? 1 : 0;
    conditions.push(eq(housekeepingStaff.isActive, activeVal));
  }

  const staffList = conditions.length > 0
    ? await db.select().from(housekeepingStaff).where(and(...conditions)).all()
    : await db.select().from(housekeepingStaff).all();

  return c.json({
    success: true,
    total: staffList.length,
    data: staffList.map((s) => ({
      id: s.id,
      userId: s.userId,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      phone: s.phone,
      zone: s.zone,
      shift: s.shift,
      isActive: s.isActive === 1,
      maxTasksPerDay: s.maxTasksPerDay,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
});

// ==========================================
// API #65: POST /staff - เพิ่มพนักงานแม่บ้านเข้าระบบ
// ==========================================
staffRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const now = new Date().toISOString();
  const id = `hk-staff-${crypto.randomUUID().slice(0, 8)}`;

  const newStaff = {
    id,
    userId: parsed.data.userId,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone ?? null,
    zone: parsed.data.zone,
    shift: parsed.data.shift,
    isActive: parsed.data.isActive,
    maxTasksPerDay: parsed.data.maxTasksPerDay,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(housekeepingStaff).values(newStaff);

  return c.json({ success: true, data: newStaff }, 201);
});

// ==========================================
// API #66: PUT /staff/:id - แก้ไขข้อมูลพนักงานแม่บ้าน
// ==========================================
staffRoute.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const existing = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Staff member not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: any = {
    ...parsed.data,
    updatedAt: now,
  };

  await db.update(housekeepingStaff).set(updateData).where(eq(housekeepingStaff.id, id));

  const updated = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, id))
    .get();

  return c.json({ success: true, data: updated });
});

// ==========================================
// API #67: GET /staff/:id/tasks - รายการงานของแม่บ้านรายคน (สำหรับหน้าจอมือถือแม่บ้าน)
// ==========================================
staffRoute.get('/:id/tasks', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const staff = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, id))
    .get();

  if (!staff) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Staff member not found' }, 404);
  }

  const status = c.req.query('status');
  const date = c.req.query('date') || c.req.query('scheduledDate');
  const priority = c.req.query('priority');

  const conditions = [eq(housekeepingTasks.assignedTo, id)];

  if (status) {
    conditions.push(eq(housekeepingTasks.status, status as any));
  }
  if (date) {
    conditions.push(eq(housekeepingTasks.scheduledDate, date));
  }
  if (priority) {
    conditions.push(eq(housekeepingTasks.priority, priority as any));
  }

  const tasks = await db
    .select()
    .from(housekeepingTasks)
    .where(and(...conditions))
    .orderBy(desc(housekeepingTasks.createdAt))
    .all();

  // Priority order for sorting: urgent > high > normal > low
  const priorityWeight: Record<string, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4,
  };

  tasks.sort((a, b) => {
    const weightA = priorityWeight[a.priority] ?? 5;
    const weightB = priorityWeight[b.priority] ?? 5;
    if (weightA !== weightB) return weightA - weightB;
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });

  return c.json({
    success: true,
    staff: {
      id: staff.id,
      name: `${staff.firstName} ${staff.lastName}`,
      zone: staff.zone,
      shift: staff.shift,
      isActive: staff.isActive === 1,
    },
    totalTasks: tasks.length,
    data: tasks,
  });
});

// ==========================================
// API #68: PUT /staff/:id/zone - กำหนดโซนหรือชั้นที่รับผิดชอบ
// ==========================================
staffRoute.put('/:id/zone', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateStaffZoneSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const staff = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, id))
    .get();

  if (!staff) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Staff member not found' }, 404);
  }

  const now = new Date().toISOString();
  await db
    .update(housekeepingStaff)
    .set({
      zone: parsed.data.zone,
      updatedAt: now,
    })
    .where(eq(housekeepingStaff.id, id));

  const updated = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, id))
    .get();

  return c.json({
    success: true,
    message: `Zone for ${staff.firstName} ${staff.lastName} updated to '${parsed.data.zone}'`,
    data: updated,
  });
});

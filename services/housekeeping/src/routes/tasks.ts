import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  housekeepingTasks,
  housekeepingStaff,
  roomIssues,
  outboxEvents,
} from '../db/schema';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  AssignTaskSchema,
  CompleteTaskSchema,
} from '../validators/housekeeping.validator';
import { reportIssueHandler } from './issues';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
}

export const tasksRoute = new Hono<{ Bindings: Env }>();

// ==========================================
// API #55: GET /tasks - รายการงานทำความสะอาดทั้งหมด
// ==========================================
tasksRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const status = c.req.query('status');
  const staffId = c.req.query('staffId') || c.req.query('staff_id') || c.req.query('assignedTo') || c.req.query('assigned_to');
  const priority = c.req.query('priority');
  const scheduledDate = c.req.query('scheduledDate') || c.req.query('scheduled_date') || c.req.query('date');
  const roomId = c.req.query('roomId') || c.req.query('room_id');
  const roomNumber = c.req.query('roomNumber') || c.req.query('room_number');
  const taskType = c.req.query('taskType') || c.req.query('task_type');

  const conditions = [];

  if (status) conditions.push(eq(housekeepingTasks.status, status as any));
  if (staffId) conditions.push(eq(housekeepingTasks.assignedTo, staffId));
  if (priority) conditions.push(eq(housekeepingTasks.priority, priority as any));
  if (scheduledDate) conditions.push(eq(housekeepingTasks.scheduledDate, scheduledDate));
  if (roomId) conditions.push(eq(housekeepingTasks.roomId, roomId));
  if (roomNumber) conditions.push(eq(housekeepingTasks.roomNumber, roomNumber));
  if (taskType) conditions.push(eq(housekeepingTasks.taskType, taskType as any));

  const query = db
    .select({
      id: housekeepingTasks.id,
      roomId: housekeepingTasks.roomId,
      roomNumber: housekeepingTasks.roomNumber,
      assignedTo: housekeepingTasks.assignedTo,
      taskType: housekeepingTasks.taskType,
      priority: housekeepingTasks.priority,
      status: housekeepingTasks.status,
      notes: housekeepingTasks.notes,
      scheduledDate: housekeepingTasks.scheduledDate,
      startedAt: housekeepingTasks.startedAt,
      completedAt: housekeepingTasks.completedAt,
      eventSource: housekeepingTasks.eventSource,
      createdAt: housekeepingTasks.createdAt,
      updatedAt: housekeepingTasks.updatedAt,
      staffFirstName: housekeepingStaff.firstName,
      staffLastName: housekeepingStaff.lastName,
      staffZone: housekeepingStaff.zone,
    })
    .from(housekeepingTasks)
    .leftJoin(housekeepingStaff, eq(housekeepingTasks.assignedTo, housekeepingStaff.id));

  const allTasks = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(housekeepingTasks.createdAt)).all()
    : await query.orderBy(desc(housekeepingTasks.createdAt)).all();

  return c.json({
    success: true,
    total: allTasks.length,
    data: allTasks.map((t) => ({
      id: t.id,
      roomId: t.roomId,
      roomNumber: t.roomNumber,
      assignedTo: t.assignedTo,
      assignedStaff: t.assignedTo
        ? {
            id: t.assignedTo,
            name: `${t.staffFirstName ?? ''} ${t.staffLastName ?? ''}`.trim(),
            zone: t.staffZone ?? null,
          }
        : null,
      taskType: t.taskType,
      priority: t.priority,
      status: t.status,
      notes: t.notes,
      scheduledDate: t.scheduledDate,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      eventSource: t.eventSource,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  });
});

// ==========================================
// API #56: GET /tasks/:id - ข้อมูลงานทำความสะอาดรายรายการ
// ==========================================
tasksRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const task = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, id))
    .get();

  if (!task) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Housekeeping task not found' }, 404);
  }

  const [staff, issues] = await Promise.all([
    task.assignedTo
      ? db.select().from(housekeepingStaff).where(eq(housekeepingStaff.id, task.assignedTo)).get()
      : Promise.resolve(null),
    db.select().from(roomIssues).where(eq(roomIssues.taskId, id)).all(),
  ]);

  return c.json({
    success: true,
    data: {
      ...task,
      assignedStaff: staff ?? null,
      issues,
    },
  });
});

// ==========================================
// API #57: POST /tasks - สร้างงานทำความสะอาดด้วยมือ (Manual Task)
// ==========================================
tasksRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);

  // If assignedTo is provided, verify staff exists and is active
  if (parsed.data.assignedTo) {
    const staff = await db
      .select()
      .from(housekeepingStaff)
      .where(eq(housekeepingStaff.id, parsed.data.assignedTo))
      .get();
    if (!staff) {
      return c.json({ success: false, error: 'NOT_FOUND', message: 'Assigned staff not found' }, 404);
    }
    if (staff.isActive === 0) {
      return c.json({ success: false, error: 'BAD_REQUEST', message: 'Assigned staff is currently inactive' }, 400);
    }
  }

  const now = new Date().toISOString();
  const id = `hkt-${crypto.randomUUID().slice(0, 8)}`;
  const initialStatus = parsed.data.assignedTo ? 'assigned' : 'pending';

  const newTask = {
    id,
    roomId: parsed.data.roomId,
    roomNumber: parsed.data.roomNumber,
    assignedTo: parsed.data.assignedTo ?? null,
    taskType: parsed.data.taskType,
    priority: parsed.data.priority,
    status: initialStatus as any,
    notes: parsed.data.notes ?? null,
    scheduledDate: parsed.data.scheduledDate,
    startedAt: null,
    completedAt: null,
    eventSource: parsed.data.eventSource,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(housekeepingTasks).values(newTask);
  return c.json({ success: true, data: newTask }, 201);
});

// ==========================================
// API #58: PUT /tasks/:id - แก้ไขรายละเอียดงาน
// ==========================================
tasksRoute.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const existing = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Housekeeping task not found' }, 404);
  }

  // If assignedTo changed, verify staff exists
  if (parsed.data.assignedTo) {
    const staff = await db
      .select()
      .from(housekeepingStaff)
      .where(eq(housekeepingStaff.id, parsed.data.assignedTo))
      .get();
    if (!staff) {
      return c.json({ success: false, error: 'NOT_FOUND', message: 'Staff not found' }, 404);
    }
  }

  const now = new Date().toISOString();
  const updateData: any = {
    ...parsed.data,
    updatedAt: now,
  };

  // If status transitions to in_progress and startedAt is missing, set startedAt
  if (parsed.data.status === 'in_progress' && !existing.startedAt && !parsed.data.startedAt) {
    updateData.startedAt = now;
  }

  await db.update(housekeepingTasks).set(updateData).where(eq(housekeepingTasks.id, id));
  const updated = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, id))
    .get();

  return c.json({ success: true, data: updated });
});

// ==========================================
// API #59: DELETE /tasks/:id - ลบงานทำความสะอาด
// ==========================================
tasksRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Housekeeping task not found' }, 404);
  }

  // Guard: Cannot delete a task that is in_progress or already completed
  if (existing.status === 'in_progress' || existing.status === 'completed') {
    return c.json(
      {
        success: false,
        error: 'BAD_REQUEST',
        message: `Cannot delete task in '${existing.status}' status. Only pending, assigned, or cancelled tasks can be deleted.`,
      },
      400,
    );
  }

  await db.delete(housekeepingTasks).where(eq(housekeepingTasks.id, id));
  return c.json({ success: true, message: 'Housekeeping task deleted successfully' });
});

// ==========================================
// API #60: PUT /tasks/:id/assign - มอบหมายงานให้พนักงานแม่บ้าน
// ==========================================
tasksRoute.put('/:id/assign', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = AssignTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const task = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, id))
    .get();

  if (!task) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Housekeeping task not found' }, 404);
  }

  // Guard: Cannot assign a completed or cancelled task
  if (task.status === 'completed' || task.status === 'cancelled') {
    return c.json(
      {
        success: false,
        error: 'BAD_REQUEST',
        message: `Cannot assign task in '${task.status}' status`,
      },
      400,
    );
  }

  const staff = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, parsed.data.staffId))
    .get();

  if (!staff) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Housekeeping staff not found' }, 404);
  }

  if (staff.isActive === 0) {
    return c.json(
      { success: false, error: 'BAD_REQUEST', message: 'Staff member is currently inactive' },
      400,
    );
  }

  const now = new Date().toISOString();
  const updateData: any = {
    assignedTo: staff.id,
    status: task.status === 'pending' ? 'assigned' : task.status,
    updatedAt: now,
  };

  if (parsed.data.scheduledDate) {
    updateData.scheduledDate = parsed.data.scheduledDate;
  }
  if (parsed.data.priority) {
    updateData.priority = parsed.data.priority;
  }

  await db.update(housekeepingTasks).set(updateData).where(eq(housekeepingTasks.id, id));

  const updated = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, id))
    .get();

  return c.json({
    success: true,
    data: {
      ...updated,
      assignedStaff: {
        id: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        zone: staff.zone,
        shift: staff.shift,
      },
    },
  });
});

// ==========================================
// API #61: PUT /tasks/:id/complete - บันทึกงานเสร็จสมบูรณ์ (Atomic Outbox Pattern)
// ==========================================
tasksRoute.put('/:id/complete', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = CompleteTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const task = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.id, id))
    .get();

  if (!task) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Housekeeping task not found' }, 404);
  }

  if (task.status === 'completed') {
    return c.json(
      { success: false, error: 'CONFLICT', message: 'Task has already been completed' },
      409,
    );
  }

  if (task.status === 'cancelled') {
    return c.json(
      { success: false, error: 'BAD_REQUEST', message: 'Cannot complete a cancelled task' },
      400,
    );
  }

  const staff = task.assignedTo
    ? await db.select().from(housekeepingStaff).where(eq(housekeepingStaff.id, task.assignedTo)).get()
    : null;

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();
  const outboxId = crypto.randomUUID();

  // Outbox Payload matching HousekeepingTaskCompletedEventSchema in packages/events
  const eventPayload = JSON.stringify({
    eventId,
    eventType: 'HousekeepingTaskCompleted',
    timestamp: now,
    taskId: id,
    roomId: task.roomId,
    roomNumber: task.roomNumber,
    staffId: staff ? staff.id : 'unassigned',
    staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Unassigned',
    completedAt: now,
    inspectionStatus: parsed.data.inspectionStatus ?? 'passed',
    nextRoomStatus: 'available',
    notes: parsed.data.notes ?? task.notes,
  });

  // Rule 2: Atomic db.batch() on Cloudflare D1
  await db.batch([
    db
      .update(housekeepingTasks)
      .set({
        status: 'completed',
        completedAt: now,
        notes: parsed.data.notes ? `${task.notes ? task.notes + ' | ' : ''}${parsed.data.notes}` : task.notes,
        updatedAt: now,
      })
      .where(eq(housekeepingTasks.id, id)),
    db.insert(outboxEvents).values({
      id: outboxId,
      eventType: 'HousekeepingTaskCompleted',
      aggregateId: id,
      aggregateType: 'HousekeepingTask',
      payload: eventPayload,
      status: 'pending',
      createdAt: now,
    }),
  ]);

  return c.json({
    success: true,
    data: {
      id: task.id,
      roomId: task.roomId,
      roomNumber: task.roomNumber,
      status: 'completed',
      completedAt: now,
      inspectionStatus: parsed.data.inspectionStatus ?? 'passed',
      eventPublished: {
        eventType: 'HousekeepingTaskCompleted',
        topic: 'hotel.housekeeping.completed',
        outboxId,
      },
    },
  });
});

// ==========================================
// API #69: POST /tasks/:id/report-issue - แจ้งปัญหา/สิ่งของชำรุดในห้องพัก
// ==========================================
tasksRoute.post('/:id/report-issue', reportIssueHandler);


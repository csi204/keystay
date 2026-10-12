import { Hono } from 'hono';
import { eq, inArray, and, desc, sql, asc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { housekeepingTasks, housekeepingStaff } from '../db/schema';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
}

export const roomsToCleanRoute = new Hono<{ Bindings: Env }>();

// ==========================================
// API #62: GET /rooms-to-clean - รายชื่อห้องที่ต้องทำความสะอาดทั้งหมด
// ==========================================
roomsToCleanRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const priority = c.req.query('priority');
  const taskType = c.req.query('taskType') || c.req.query('task_type');
  const status = c.req.query('status');
  const floor = c.req.query('floor');
  const staffId = c.req.query('staffId') || c.req.query('staff_id');

  // By default, active rooms to clean have status: pending, assigned, in_progress
  const activeStatuses = ['pending', 'assigned', 'in_progress'] as const;

  const conditions = [];

  if (status) {
    conditions.push(eq(housekeepingTasks.status, status as any));
  } else {
    conditions.push(inArray(housekeepingTasks.status, [...activeStatuses]));
  }

  if (priority) {
    conditions.push(eq(housekeepingTasks.priority, priority as any));
  }

  if (taskType) {
    conditions.push(eq(housekeepingTasks.taskType, taskType as any));
  }

  if (staffId) {
    conditions.push(eq(housekeepingTasks.assignedTo, staffId));
  }

  const query = db
    .select({
      taskId: housekeepingTasks.id,
      roomId: housekeepingTasks.roomId,
      roomNumber: housekeepingTasks.roomNumber,
      taskType: housekeepingTasks.taskType,
      priority: housekeepingTasks.priority,
      status: housekeepingTasks.status,
      notes: housekeepingTasks.notes,
      scheduledDate: housekeepingTasks.scheduledDate,
      startedAt: housekeepingTasks.startedAt,
      eventSource: housekeepingTasks.eventSource,
      createdAt: housekeepingTasks.createdAt,
      updatedAt: housekeepingTasks.updatedAt,
      staffId: housekeepingStaff.id,
      staffFirstName: housekeepingStaff.firstName,
      staffLastName: housekeepingStaff.lastName,
      staffZone: housekeepingStaff.zone,
      staffPhone: housekeepingStaff.phone,
    })
    .from(housekeepingTasks)
    .leftJoin(housekeepingStaff, eq(housekeepingTasks.assignedTo, housekeepingStaff.id))
    .where(and(...conditions));

  let results = await query.all();

  // If floor filter provided, match roomNumber prefix (e.g. floor '2' matches room '203' or '2xx')
  if (floor) {
    results = results.filter((item) => {
      const roomNum = item.roomNumber.trim();
      return roomNum.startsWith(floor);
    });
  }

  // Priority sorting: urgent > high > normal > low
  const priorityWeight: Record<string, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4,
  };

  results.sort((a, b) => {
    const weightA = priorityWeight[a.priority] ?? 5;
    const weightB = priorityWeight[b.priority] ?? 5;
    if (weightA !== weightB) return weightA - weightB;
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });

  // Calculate summary metrics
  const urgentCount = results.filter((r) => r.priority === 'urgent').length;
  const highCount = results.filter((r) => r.priority === 'high').length;
  const pendingCount = results.filter((r) => r.status === 'pending').length;
  const inProgressCount = results.filter((r) => r.status === 'in_progress').length;
  const assignedCount = results.filter((r) => r.status === 'assigned').length;

  return c.json({
    success: true,
    total: results.length,
    summary: {
      urgent: urgentCount,
      high: highCount,
      pending: pendingCount,
      assigned: assignedCount,
      inProgress: inProgressCount,
    },
    data: results.map((item) => ({
      taskId: item.taskId,
      roomId: item.roomId,
      roomNumber: item.roomNumber,
      taskType: item.taskType,
      priority: item.priority,
      status: item.status,
      notes: item.notes,
      scheduledDate: item.scheduledDate,
      startedAt: item.startedAt,
      eventSource: item.eventSource,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      assignedStaff: item.staffId
        ? {
            id: item.staffId,
            name: `${item.staffFirstName ?? ''} ${item.staffLastName ?? ''}`.trim(),
            zone: item.staffZone ?? null,
            phone: item.staffPhone ?? null,
          }
        : null,
    })),
  });
});

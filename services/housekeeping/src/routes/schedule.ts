import { Hono } from 'hono';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { housekeepingSchedule, housekeepingStaff } from '../db/schema';
import { CreateScheduleSchema } from '../validators/housekeeping.validator';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
}

export const scheduleRoute = new Hono<{ Bindings: Env }>();

// ==========================================
// API #70: GET /schedule - ตารางกะการทำงานของแม่บ้าน (Shift Schedules)
// ==========================================
scheduleRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const staffId = c.req.query('staffId') || c.req.query('staff_id');
  const scheduleDate = c.req.query('date') || c.req.query('scheduleDate') || c.req.query('schedule_date');
  const startDate = c.req.query('startDate') || c.req.query('start_date');
  const endDate = c.req.query('endDate') || c.req.query('end_date');
  const shift = c.req.query('shift');
  const zone = c.req.query('zone');

  const conditions = [];

  if (staffId) conditions.push(eq(housekeepingSchedule.staffId, staffId));
  if (scheduleDate) conditions.push(eq(housekeepingSchedule.scheduleDate, scheduleDate));
  if (startDate) conditions.push(gte(housekeepingSchedule.scheduleDate, startDate));
  if (endDate) conditions.push(lte(housekeepingSchedule.scheduleDate, endDate));
  if (shift) conditions.push(eq(housekeepingSchedule.shift, shift));
  if (zone) conditions.push(eq(housekeepingSchedule.zoneAssigned, zone));

  const query = db
    .select({
      id: housekeepingSchedule.id,
      staffId: housekeepingSchedule.staffId,
      scheduleDate: housekeepingSchedule.scheduleDate,
      shift: housekeepingSchedule.shift,
      zoneAssigned: housekeepingSchedule.zoneAssigned,
      isDayOff: housekeepingSchedule.isDayOff,
      createdAt: housekeepingSchedule.createdAt,
      staffFirstName: housekeepingStaff.firstName,
      staffLastName: housekeepingStaff.lastName,
      staffPhone: housekeepingStaff.phone,
      staffShiftPreference: housekeepingStaff.shift,
    })
    .from(housekeepingSchedule)
    .leftJoin(housekeepingStaff, eq(housekeepingSchedule.staffId, housekeepingStaff.id));

  const schedules = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(asc(housekeepingSchedule.scheduleDate)).all()
    : await query.orderBy(asc(housekeepingSchedule.scheduleDate)).all();

  return c.json({
    success: true,
    total: schedules.length,
    data: schedules.map((s) => ({
      id: s.id,
      staffId: s.staffId,
      staffName: `${s.staffFirstName ?? ''} ${s.staffLastName ?? ''}`.trim(),
      staffPhone: s.staffPhone ?? null,
      scheduleDate: s.scheduleDate,
      shift: s.shift,
      zoneAssigned: s.zoneAssigned,
      isDayOff: s.isDayOff === 1,
      createdAt: s.createdAt,
    })),
  });
});

// ==========================================
// API #70 (Create): POST /schedule - บันทึกตารางกะการทำงาน
// ==========================================
scheduleRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);

  // Verify staff exists
  const staff = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, parsed.data.staffId))
    .get();

  if (!staff) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Staff member not found' }, 404);
  }

  const id = `sch-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const newSchedule = {
    id,
    staffId: parsed.data.staffId,
    scheduleDate: parsed.data.scheduleDate,
    shift: parsed.data.shift,
    zoneAssigned: parsed.data.zoneAssigned,
    isDayOff: parsed.data.isDayOff,
    createdAt: now,
  };

  await db.insert(housekeepingSchedule).values(newSchedule);

  return c.json(
    {
      success: true,
      data: {
        ...newSchedule,
        staffName: `${staff.firstName} ${staff.lastName}`,
        isDayOff: newSchedule.isDayOff === 1,
      },
    },
    201,
  );
});

// ==========================================
// DELETE /schedule/:id - ลบตารางกะการทำงาน
// ==========================================
scheduleRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(housekeepingSchedule)
    .where(eq(housekeepingSchedule.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Schedule entry not found' }, 404);
  }

  await db.delete(housekeepingSchedule).where(eq(housekeepingSchedule.id, id));
  return c.json({ success: true, message: 'Schedule entry deleted successfully' });
});

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  rooms,
  roomTypes,
  floors,
  roomAmenities,
  roomStatusHistory,
  outboxEvents,
} from '../db/schema';
import {
  CreateRoomSchema,
  UpdateRoomSchema,
  UpdateRoomStatusSchema,
  UpdateRoomMaintenanceSchema,
} from '../validators/room.validator';

export interface Env {
  DB: D1Database;
}

export const roomsRoute = new Hono<{ Bindings: Env }>();

// API #13: GET /rooms - รายการห้องพักทั้งหมด (รองรับ filter: floor_id, room_type_id, status, is_active)
roomsRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const floorId = c.req.query('floorId') || c.req.query('floor_id');
  const roomTypeId = c.req.query('roomTypeId') || c.req.query('room_type_id');
  const status = c.req.query('status');
  const isActive = c.req.query('isActive') ?? c.req.query('is_active');

  const conditions = [];

  if (floorId) conditions.push(eq(rooms.floorId, floorId));
  if (roomTypeId) conditions.push(eq(rooms.roomTypeId, roomTypeId));
  if (status) conditions.push(eq(rooms.status, status as any));
  if (isActive !== undefined) conditions.push(eq(rooms.isActive, Number(isActive)));

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(rooms)
          .where(and(...conditions))
      : db.select().from(rooms);

  const allRooms = await query.all();
  return c.json({ success: true, data: allRooms });
});

// API #14: GET /rooms/:id - ข้อมูลห้องพักรายห้อง พร้อม amenities และ room_type
roomsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const room = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  const roomType = await db.select().from(roomTypes).where(eq(roomTypes.id, room.roomTypeId)).get();
  const floor = await db.select().from(floors).where(eq(floors.id, room.floorId)).get();
  const amenities = await db.select().from(roomAmenities).where(eq(roomAmenities.roomId, id)).all();

  return c.json({
    success: true,
    data: {
      ...room,
      roomType: roomType ?? null,
      floor: floor ?? null,
      amenities,
    },
  });
});

// API #15: POST /rooms - เพิ่มห้องพักใหม่
roomsRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);

  // Check unique room_number
  const existingNumber = await db
    .select()
    .from(rooms)
    .where(eq(rooms.roomNumber, parsed.data.roomNumber))
    .get();
  if (existingNumber) {
    return c.json(
      {
        success: false,
        error: 'CONFLICT',
        message: `Room number '${parsed.data.roomNumber}' already exists`,
      },
      409,
    );
  }

  // Check valid room_type_id
  const typeExists = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, parsed.data.roomTypeId))
    .get();
  if (!typeExists) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room type not found' }, 404);
  }

  // Check valid floor_id
  const floorExists = await db
    .select()
    .from(floors)
    .where(eq(floors.id, parsed.data.floorId))
    .get();
  if (!floorExists) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Floor not found' }, 404);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const newRoom = {
    id,
    roomNumber: parsed.data.roomNumber,
    roomTypeId: parsed.data.roomTypeId,
    floorId: parsed.data.floorId,
    status: 'available' as const,
    isActive: 1,
    notes: parsed.data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(rooms).values(newRoom);
  return c.json({ success: true, data: newRoom }, 201);
});

// API #16: PUT /rooms/:id - แก้ไขรายละเอียดห้องพัก
roomsRoute.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const existing = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  // If room number changed, check collision
  if (parsed.data.roomNumber && parsed.data.roomNumber !== existing.roomNumber) {
    const conflict = await db
      .select()
      .from(rooms)
      .where(eq(rooms.roomNumber, parsed.data.roomNumber))
      .get();
    if (conflict) {
      return c.json(
        {
          success: false,
          error: 'CONFLICT',
          message: `Room number '${parsed.data.roomNumber}' already in use`,
        },
        409,
      );
    }
  }

  const now = new Date().toISOString();
  const updateData = {
    ...parsed.data,
    updatedAt: now,
  };

  await db.update(rooms).set(updateData).where(eq(rooms.id, id));
  const updated = await db.select().from(rooms).where(eq(rooms.id, id)).get();

  return c.json({ success: true, data: updated });
});

// API #17: DELETE /rooms/:id - ปิดการใช้งานห้องพัก (Soft delete)
roomsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  const now = new Date().toISOString();
  await db.update(rooms).set({ isActive: 0, updatedAt: now }).where(eq(rooms.id, id));

  return c.json({ success: true, message: 'Room deactivated successfully' });
});

// API #18: GET /rooms/:id/status - ดึงสถานะปัจจุบันของห้อง
roomsRoute.get('/:id/status', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const room = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: room.id,
      roomNumber: room.roomNumber,
      status: room.status,
      isActive: room.isActive,
    },
  });
});

// API #19: PUT /rooms/:id/status - ปรับปรุงสถานะห้องพักตาม State Machine พร้อมบันทึกประวัติ (Atomic db.batch)
roomsRoute.put('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateRoomStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const room = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  const previousStatus = room.status;
  const newStatus = parsed.data.status;
  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();
  const outboxId = crypto.randomUUID();

  const outboxPayload = JSON.stringify({
    roomId: id,
    roomNumber: room.roomNumber,
    previousStatus,
    newStatus,
    changedBy: parsed.data.changedBy ?? 'system',
    timestamp: now,
  });

  // Atomic db.batch() according to Rule 2 in skill.md
  await db.batch([
    db.update(rooms).set({ status: newStatus, updatedAt: now }).where(eq(rooms.id, id)),
    db.insert(roomStatusHistory).values({
      id: historyId,
      roomId: id,
      previousStatus,
      newStatus,
      changedBy: parsed.data.changedBy ?? null,
      changeReason: parsed.data.changeReason ?? 'Manual status update',
      eventSource: 'manual',
      createdAt: now,
    }),
    db.insert(outboxEvents).values({
      id: outboxId,
      eventType: 'RoomStatusChanged',
      aggregateId: id,
      aggregateType: 'Room',
      payload: outboxPayload,
      status: 'pending',
      createdAt: now,
    }),
  ]);

  return c.json({
    success: true,
    data: {
      id: room.id,
      roomNumber: room.roomNumber,
      previousStatus,
      newStatus,
      updatedAt: now,
    },
  });
});

// API #27: PUT /rooms/:id/maintenance - ปรับห้องเข้าโหมดซ่อมบำรุง หรือปลดจากการซ่อมบำรุงกลับมาใช้งาน
roomsRoute.put('/:id/maintenance', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateRoomMaintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const room = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  const previousStatus = room.status;
  const newStatus = parsed.data.inMaintenance ? 'maintenance' : 'available';
  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();
  const outboxId = crypto.randomUUID();

  const outboxPayload = JSON.stringify({
    roomId: id,
    roomNumber: room.roomNumber,
    previousStatus,
    newStatus,
    inMaintenance: parsed.data.inMaintenance,
    reason:
      parsed.data.reason ??
      (parsed.data.inMaintenance ? 'Entered maintenance' : 'Released from maintenance'),
    changedBy: parsed.data.changedBy ?? 'system',
    timestamp: now,
  });

  await db.batch([
    db.update(rooms).set({ status: newStatus, updatedAt: now }).where(eq(rooms.id, id)),
    db.insert(roomStatusHistory).values({
      id: historyId,
      roomId: id,
      previousStatus,
      newStatus,
      changedBy: parsed.data.changedBy ?? null,
      changeReason:
        parsed.data.reason ??
        (parsed.data.inMaintenance ? 'Maintenance mode enabled' : 'Maintenance mode disabled'),
      eventSource: 'maintenance_api',
      createdAt: now,
    }),
    db.insert(outboxEvents).values({
      id: outboxId,
      eventType: 'RoomStatusChanged',
      aggregateId: id,
      aggregateType: 'Room',
      payload: outboxPayload,
      status: 'pending',
      createdAt: now,
    }),
  ]);

  return c.json({
    success: true,
    data: {
      id: room.id,
      roomNumber: room.roomNumber,
      previousStatus,
      newStatus,
      inMaintenance: parsed.data.inMaintenance,
      updatedAt: now,
    },
  });
});

// API #28: GET /rooms/:id/history - ดูประวัติการเปลี่ยนสถานะห้อง
roomsRoute.get('/:id/history', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const room = await db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  const history = await db
    .select()
    .from(roomStatusHistory)
    .where(eq(roomStatusHistory.roomId, id))
    .orderBy(desc(roomStatusHistory.createdAt))
    .all();

  return c.json({ success: true, data: history });
});

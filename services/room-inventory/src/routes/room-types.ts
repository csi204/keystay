import { Hono } from 'hono';
import { eq, and, ne } from 'drizzle-orm';
import { getDb } from '../db/client';
import { roomTypes, rooms } from '../db/schema';
import { CreateRoomTypeSchema, UpdateRoomTypeSchema } from '../validators/room.validator';

export interface Env {
  DB: D1Database;
}

export const roomTypesRoute = new Hono<{ Bindings: Env }>();

// API #20: GET /room-types - ดึงรายการประเภทห้องพักทั้งหมด
roomTypesRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const types = await db.select().from(roomTypes).all();
  return c.json({ success: true, data: types });
});

// API #21: POST /room-types - เพิ่มประเภทห้องพักใหม่
roomTypesRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateRoomTypeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);

  // Check if name already exists
  const existing = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.name, parsed.data.name))
    .get();
  if (existing) {
    return c.json(
      {
        success: false,
        error: 'CONFLICT',
        message: `Room type '${parsed.data.name}' already exists`,
      },
      409,
    );
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const newType = {
    id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    basePrice: parsed.data.basePrice,
    maxOccupancy: parsed.data.maxOccupancy,
    bedType: parsed.data.bedType,
    sizeSqm: parsed.data.sizeSqm,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(roomTypes).values(newType);
  return c.json({ success: true, data: newType }, 201);
});

// API #22: PUT /room-types/:id - แก้ไขประเภทห้องพักและราคา
roomTypesRoute.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateRoomTypeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const existing = await db.select().from(roomTypes).where(eq(roomTypes.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room type not found' }, 404);
  }

  // If name changed, check collision with other room types
  if (parsed.data.name && parsed.data.name !== existing.name) {
    const conflict = await db
      .select()
      .from(roomTypes)
      .where(and(eq(roomTypes.name, parsed.data.name), ne(roomTypes.id, id)))
      .get();
    if (conflict) {
      return c.json(
        {
          success: false,
          error: 'CONFLICT',
          message: `Room type name '${parsed.data.name}' already in use`,
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

  await db.update(roomTypes).set(updateData).where(eq(roomTypes.id, id));
  const updated = await db.select().from(roomTypes).where(eq(roomTypes.id, id)).get();

  return c.json({ success: true, data: updated });
});

// API #23: DELETE /room-types/:id - ลบประเภทห้องพัก
roomTypesRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const existing = await db.select().from(roomTypes).where(eq(roomTypes.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room type not found' }, 404);
  }

  // Check if any rooms are assigned to this room type
  const linkedRooms = await db.select().from(rooms).where(eq(rooms.roomTypeId, id)).all();
  if (linkedRooms.length > 0) {
    return c.json(
      {
        success: false,
        error: 'CONFLICT',
        message: `Cannot delete room type because ${linkedRooms.length} room(s) are assigned to it`,
      },
      409,
    );
  }

  await db.delete(roomTypes).where(eq(roomTypes.id, id));
  return c.json({ success: true, message: 'Room type deleted successfully' });
});

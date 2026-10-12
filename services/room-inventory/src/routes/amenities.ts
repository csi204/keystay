import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/client';
import { rooms, roomAmenities } from '../db/schema';
import { CreateAmenitySchema } from '../validators/room.validator';

export interface Env {
  DB: D1Database;
}

export const amenitiesRoute = new Hono<{ Bindings: Env }>();

// API #29: POST /rooms/:id/amenities - เพิ่มสิ่งอำนวยความสะดวกในห้อง
amenitiesRoute.post('/:id/amenities', async (c) => {
  const roomId = c.req.param('id');
  const body = await c.req.json();
  const parsed = CreateAmenitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
  if (!room) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newAmenity = {
    id,
    roomId,
    amenityName: parsed.data.amenityName,
    description: parsed.data.description ?? null,
    createdAt: now,
  };

  await db.insert(roomAmenities).values(newAmenity);
  return c.json({ success: true, data: newAmenity }, 201);
});

// API #30: DELETE /rooms/:id/amenities/:amenityId - ลบสิ่งอำนวยความสะดวกออกจากห้อง
amenitiesRoute.delete('/:id/amenities/:amenityId', async (c) => {
  const roomId = c.req.param('id');
  const amenityId = c.req.param('amenityId');
  const db = getDb(c.env.DB);

  const existing = await db
    .select()
    .from(roomAmenities)
    .where(and(eq(roomAmenities.id, amenityId), eq(roomAmenities.roomId, roomId)))
    .get();

  if (!existing) {
    return c.json(
      { success: false, error: 'NOT_FOUND', message: 'Amenity not found in this room' },
      404,
    );
  }

  await db.delete(roomAmenities).where(eq(roomAmenities.id, amenityId));
  return c.json({ success: true, message: 'Amenity removed successfully' });
});

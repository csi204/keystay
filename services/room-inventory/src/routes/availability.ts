import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/client';
import { rooms, roomTypes, floors } from '../db/schema';

export interface Env {
  DB: D1Database;
}

export const availabilityRoute = new Hono<{ Bindings: Env }>();

// API #24: GET /rooms/available - ค้นหาห้องว่างพร้อมใช้งาน
availabilityRoute.get('/available', async (c) => {
  const db = getDb(c.env.DB);
  const roomTypeId = c.req.query('roomTypeId') || c.req.query('room_type_id');
  const floorId = c.req.query('floorId') || c.req.query('floor_id');

  const conditions = [eq(rooms.status, 'available'), eq(rooms.isActive, 1)];

  if (roomTypeId) conditions.push(eq(rooms.roomTypeId, roomTypeId));
  if (floorId) conditions.push(eq(rooms.floorId, floorId));

  const availableRooms = await db
    .select()
    .from(rooms)
    .where(and(...conditions))
    .all();

  return c.json({
    success: true,
    total: availableRooms.length,
    data: availableRooms,
  });
});

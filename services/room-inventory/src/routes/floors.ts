import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { floors, rooms } from '../db/schema';

export interface Env {
  DB: D1Database;
}

export const floorsRoute = new Hono<{ Bindings: Env }>();

// API #25: GET /floors - รายชื่อชั้นทั้งหมดในโรงแรม
floorsRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const allFloors = await db.select().from(floors).all();
  return c.json({ success: true, data: allFloors });
});

// API #26: GET /floors/:id/rooms - รายการห้องพักประจำชั้นที่ระบุ
floorsRoute.get('/:id/rooms', async (c) => {
  const floorId = c.req.param('id');
  const db = getDb(c.env.DB);

  const floor = await db.select().from(floors).where(eq(floors.id, floorId)).get();
  if (!floor) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Floor not found' }, 404);
  }

  const floorRooms = await db.select().from(rooms).where(eq(rooms.floorId, floorId)).all();
  return c.json({
    success: true,
    data: {
      floor,
      rooms: floorRooms,
    },
  });
});

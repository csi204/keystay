import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../db/client';
import { amenityRequests, housekeepingStaff } from '../db/schema';
import { z } from 'zod';

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

export const amenityRequestsRoute = new Hono<{ Bindings: Env }>();

// Zod Schema for Creating Amenity Request (From Front Desk)
const CreateAmenityRequestSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  reservationId: z.string().optional().nullable(),
  amenityId: z.string().min(1, 'Amenity ID is required'),
  amenityName: z.string().min(1, 'Amenity Name is required'),
  category: z.string().optional().default('other'),
  quantity: z.number().int().positive().default(1),
  isChargeable: z.union([z.boolean(), z.number()]).transform((val) => (val ? 1 : 0)).default(0),
  unitPrice: z.number().nonnegative().default(0.0),
  requestedBy: z.string().optional().default('Front Desk'),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Zod Schema for Updating Status
const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'delivered', 'cancelled']),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// 1. GET /amenity-requests - รายการคำขอของใช้ทั้งหมด
amenityRequestsRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const roomNumber = c.req.query('room_number') || c.req.query('roomNumber');
  const status = c.req.query('status');

  try {
    let query = db.select().from(amenityRequests);

    const conditions = [];
    if (roomNumber) {
      conditions.push(eq(amenityRequests.roomNumber, roomNumber));
    }
    if (status) {
      conditions.push(eq(amenityRequests.status, status as any));
    }

    const requests = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(amenityRequests.createdAt))
      : await query.orderBy(desc(amenityRequests.createdAt));

    return c.json({
      success: true,
      data: requests,
      total: requests.length,
    });
  } catch (error: any) {
    return c.json(
      { success: false, error: 'DATABASE_ERROR', message: error.message },
      500
    );
  }
});

// 2. GET /amenity-requests/:id - ดูรายละเอียดคำขอเดี่ยว
amenityRequestsRoute.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  try {
    const item = await db
      .select()
      .from(amenityRequests)
      .where(eq(amenityRequests.id, id))
      .get();

    if (!item) {
      return c.json(
        { success: false, error: 'NOT_FOUND', message: 'Amenity request not found' },
        404
      );
    }

    return c.json({ success: true, data: item });
  } catch (error: any) {
    return c.json(
      { success: false, error: 'DATABASE_ERROR', message: error.message },
      500
    );
  }
});

// 3. POST /amenity-requests - Front Desk ส่งคำขอของใช้เข้ามาให้แม่บ้าน
amenityRequestsRoute.post('/', async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json().catch(() => ({}));

  const parsed = CreateAmenityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400
    );
  }

  const {
    roomNumber,
    reservationId,
    amenityId,
    amenityName,
    category,
    quantity,
    isChargeable,
    unitPrice,
    requestedBy,
    assignedTo,
    notes,
  } = parsed.data;

  const totalPrice = quantity * unitPrice;
  const now = new Date().toISOString();
  const id = `amr-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const newRequest = {
      id,
      roomNumber,
      reservationId: reservationId || null,
      amenityId,
      amenityName,
      category,
      quantity,
      isChargeable,
      unitPrice,
      totalPrice,
      status: 'pending' as const,
      requestedBy: requestedBy || 'Front Desk',
      assignedTo: assignedTo || null,
      notes: notes || null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(amenityRequests).values(newRequest);

    return c.json(
      {
        success: true,
        message: `Amenity request for Room ${roomNumber} created successfully`,
        data: newRequest,
      },
      201
    );
  } catch (error: any) {
    return c.json(
      { success: false, error: 'DATABASE_ERROR', message: error.message },
      500
    );
  }
});

// 4. PATCH /amenity-requests/:id/status - แม่บ้านอัปเดตสถานะ (pending -> preparing -> delivered / cancelled)
amenityRequestsRoute.patch('/:id/status', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400
    );
  }

  const { status, assignedTo, notes } = parsed.data;
  const now = new Date().toISOString();

  try {
    const existing = await db
      .select()
      .from(amenityRequests)
      .where(eq(amenityRequests.id, id))
      .get();

    if (!existing) {
      return c.json(
        { success: false, error: 'NOT_FOUND', message: 'Amenity request not found' },
        404
      );
    }

    const updatePayload: any = {
      status,
      updatedAt: now,
    };

    if (assignedTo !== undefined) {
      updatePayload.assignedTo = assignedTo;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }
    if (status === 'delivered') {
      updatePayload.deliveredAt = now;
    }

    await db
      .update(amenityRequests)
      .set(updatePayload)
      .where(eq(amenityRequests.id, id));

    const updated = await db
      .select()
      .from(amenityRequests)
      .where(eq(amenityRequests.id, id))
      .get();

    return c.json({
      success: true,
      message: `Status updated to ${status}`,
      data: updated,
    });
  } catch (error: any) {
    return c.json(
      { success: false, error: 'DATABASE_ERROR', message: error.message },
      500
    );
  }
});


import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { rooms, roomStatusHistory, outboxEvents } from '../db/schema';
import {
  ReservationCheckedOutEventSchema,
  HousekeepingTaskCompletedEventSchema,
  ReservationCheckedInEventSchema,
} from '@keystay/events';
import { Receiver } from '@upstash/qstash';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
}

export const webhooksRoute = new Hono<{ Bindings: Env }>();

/**
 * Helper to optionally verify QStash signature when signing keys are configured
 */
async function verifyQStashSignature(c: any): Promise<boolean> {
  const currentKey = c.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = c.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = c.req.header('upstash-signature');

  // If signature header is provided, cryptographically verify it
  if (signature && currentKey) {
    try {
      const receiver = new Receiver({
        currentSigningKey: currentKey,
        nextSigningKey: nextKey ?? currentKey,
      });
      const bodyText = await c.req.raw.clone().text();
      return await receiver.verify({
        signature,
        body: bodyText,
        url: c.req.url,
      });
    } catch (err) {
      console.error('[QStash Signature Verification Failed]:', err);
      return false;
    }
  }

  // Enforce signature strictly in production
  if (c.env.ENVIRONMENT === 'production') {
    return false;
  }

  // Allow in development/test environments
  return true;
}

// ==========================================
// 1. POST /webhooks/checkout
// Event: ReservationCheckedOut (Fan-out Subscriber)
// Updates room status to 'checked_out'
// ==========================================
webhooksRoute.post('/checkout', async (c) => {
  const isValidSignature = await verifyQStashSignature(c);
  if (!isValidSignature) {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid QStash signature' }, 401);
  }

  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = ReservationCheckedOutEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'EVENT_VALIDATION_ERROR',
        message: 'Invalid ReservationCheckedOut payload',
        details: parsed.error.format(),
      },
      400,
    );
  }

  const event = parsed.data;
  const db = getDb(c.env.DB);

  // Find room by roomId or roomNumber
  let room = await db.select().from(rooms).where(eq(rooms.id, event.roomId)).get();
  if (!room) {
    room = await db.select().from(rooms).where(eq(rooms.roomNumber, event.roomNumber)).get();
  }

  if (!room) {
    return c.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: `Room not found for roomId: '${event.roomId}' / roomNumber: '${event.roomNumber}'`,
      },
      404,
    );
  }

  // Idempotency Guard: if room is already checked_out or cleaning, skip duplicate processing
  if (room.status === 'checked_out' || room.status === 'cleaning') {
    return c.json({
      success: true,
      message: `Room '${room.roomNumber}' is already in '${room.status}' status; skipped duplicate checkout event`,
      data: room,
    });
  }

  const previousStatus = room.status;
  const newStatus = 'checked_out';
  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();
  const outboxId = crypto.randomUUID();

  const outboxPayload = JSON.stringify({
    roomId: room.id,
    roomNumber: room.roomNumber,
    previousStatus,
    newStatus,
    reason: `Guest checkout: ${event.bookingNumber} (${event.guestName})`,
    eventSource: 'hotel.reservation.checkout',
    timestamp: now,
  });

  // Atomic state transition using db.batch()
  await db.batch([
    db
      .update(rooms)
      .set({
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(rooms.id, room.id)),
    db.insert(roomStatusHistory).values({
      id: historyId,
      roomId: room.id,
      previousStatus,
      newStatus,
      changedBy: event.performedBy || 'reservation_service',
      changeReason: `Checkout webhook: Booking ${event.bookingNumber} (${event.guestName})`,
      eventSource: 'event_bus',
      createdAt: now,
    }),
    db.insert(outboxEvents).values({
      id: outboxId,
      eventType: 'RoomStatusChanged',
      aggregateId: room.id,
      aggregateType: 'Room',
      payload: outboxPayload,
      status: 'pending',
      createdAt: now,
    }),
  ]);

  return c.json({
    success: true,
    message: `Room '${room.roomNumber}' status updated from '${previousStatus}' to '${newStatus}'`,
    data: {
      roomId: room.id,
      roomNumber: room.roomNumber,
      previousStatus,
      newStatus,
      updatedAt: now,
      eventReceived: event.eventType,
    },
  });
});

// ==========================================
// 2. POST /webhooks/housekeeping-completed
// Event: HousekeepingTaskCompleted
// Updates room status back to 'available'
// ==========================================
webhooksRoute.post('/housekeeping-completed', async (c) => {
  const isValidSignature = await verifyQStashSignature(c);
  if (!isValidSignature) {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid QStash signature' }, 401);
  }

  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = HousekeepingTaskCompletedEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'EVENT_VALIDATION_ERROR',
        message: 'Invalid HousekeepingTaskCompleted payload',
        details: parsed.error.format(),
      },
      400,
    );
  }

  const event = parsed.data;
  const db = getDb(c.env.DB);

  // Find room by roomId or roomNumber
  let room = await db.select().from(rooms).where(eq(rooms.id, event.roomId)).get();
  if (!room) {
    room = await db.select().from(rooms).where(eq(rooms.roomNumber, event.roomNumber)).get();
  }

  if (!room) {
    return c.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: `Room not found for roomId: '${event.roomId}' / roomNumber: '${event.roomNumber}'`,
      },
      404,
    );
  }

  // Idempotency Guard: if room is already available, skip duplicate processing
  if (room.status === 'available') {
    return c.json({
      success: true,
      message: `Room '${room.roomNumber}' is already 'available'; skipped duplicate housekeeping completed event`,
      data: room,
    });
  }

  const previousStatus = room.status;
  const newStatus = 'available';
  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();
  const outboxId = crypto.randomUUID();

  const outboxPayload = JSON.stringify({
    roomId: room.id,
    roomNumber: room.roomNumber,
    previousStatus,
    newStatus,
    reason: `Cleaning completed: Staff ${event.staffName} (inspection: ${event.inspectionStatus})`,
    eventSource: 'hotel.housekeeping.completed',
    timestamp: now,
  });

  // Atomic state transition using db.batch()
  await db.batch([
    db
      .update(rooms)
      .set({
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(rooms.id, room.id)),
    db.insert(roomStatusHistory).values({
      id: historyId,
      roomId: room.id,
      previousStatus,
      newStatus,
      changedBy: `${event.staffName} (${event.staffId})`,
      changeReason: `Housekeeping completed task ${event.taskId} (inspection: ${event.inspectionStatus})`,
      eventSource: 'event_bus',
      createdAt: now,
    }),
    db.insert(outboxEvents).values({
      id: outboxId,
      eventType: 'RoomStatusChanged',
      aggregateId: room.id,
      aggregateType: 'Room',
      payload: outboxPayload,
      status: 'pending',
      createdAt: now,
    }),
  ]);

  return c.json({
    success: true,
    message: `Room '${room.roomNumber}' cleaned and released back to 'available'`,
    data: {
      roomId: room.id,
      roomNumber: room.roomNumber,
      previousStatus,
      newStatus,
      updatedAt: now,
      eventReceived: event.eventType,
    },
  });
});

// ==========================================
// 3. POST /webhooks/checkin (Bonus Subscriber)
// Event: ReservationCheckedIn
// Updates room status to 'occupied'
// ==========================================
webhooksRoute.post('/checkin', async (c) => {
  const isValidSignature = await verifyQStashSignature(c);
  if (!isValidSignature) {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid QStash signature' }, 401);
  }

  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = ReservationCheckedInEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'EVENT_VALIDATION_ERROR',
        message: 'Invalid ReservationCheckedIn payload',
        details: parsed.error.format(),
      },
      400,
    );
  }

  const event = parsed.data;
  const db = getDb(c.env.DB);

  let room = await db.select().from(rooms).where(eq(rooms.id, event.roomId)).get();
  if (!room) {
    room = await db.select().from(rooms).where(eq(rooms.roomNumber, event.roomNumber)).get();
  }

  if (!room) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room not found' }, 404);
  }

  // Idempotency: if already occupied
  if (room.status === 'occupied') {
    return c.json({
      success: true,
      message: `Room '${room.roomNumber}' is already occupied; skipped duplicate check-in event`,
      data: room,
    });
  }

  const previousStatus = room.status;
  const newStatus = 'occupied';
  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();

  await db.batch([
    db
      .update(rooms)
      .set({
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(rooms.id, room.id)),
    db.insert(roomStatusHistory).values({
      id: historyId,
      roomId: room.id,
      previousStatus,
      newStatus,
      changedBy: event.performedBy || 'front_desk',
      changeReason: `Guest checked in: ${event.guestName}`,
      eventSource: 'event_bus',
      createdAt: now,
    }),
  ]);

  return c.json({
    success: true,
    message: `Room '${room.roomNumber}' status updated to 'occupied'`,
    data: {
      roomId: room.id,
      roomNumber: room.roomNumber,
      previousStatus,
      newStatus,
      updatedAt: now,
    },
  });
});

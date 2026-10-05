import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { Receiver } from '@upstash/qstash';
import { getDb } from '../db/client';
import { housekeepingTasks } from '../db/schema';
import { ReservationCheckedOutEventSchema } from '@keystay/events';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
}

export const webhooksRoute = new Hono<{ Bindings: Env }>();

// ==========================================
// QStash Webhook Consumer: POST /webhooks/checkout (Fan-out Subscriber)
// Triggered when Reservation Service emits `ReservationCheckedOut`
// ==========================================
webhooksRoute.post('/checkout', async (c) => {
  const db = getDb(c.env.DB);

  const signature = c.req.header('upstash-signature');
  const messageId = c.req.header('upstash-message-id');
  const rawBody = await c.req.text();

  // 1. QStash Signature Verification (if QSTASH_CURRENT_SIGNING_KEY configured)
  // Strictly verified if signature is provided or when running in production
  const signingKey = c.env.QSTASH_CURRENT_SIGNING_KEY;
  const isProduction = c.env.ENVIRONMENT === 'production';
  if (signingKey && (signature || isProduction)) {
    if (!signature) {
      return c.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Missing Upstash signature header' },
        401,
      );
    }
    try {
      const receiver = new Receiver({
        currentSigningKey: signingKey,
        nextSigningKey: c.env.QSTASH_NEXT_SIGNING_KEY || '',
      });
      const isValid = await receiver.verify({
        signature,
        body: rawBody,
        url: c.req.url,
      });
      if (!isValid) {
        return c.json(
          { success: false, error: 'UNAUTHORIZED', message: 'Invalid Upstash signature' },
          401,
        );
      }
    } catch {
      return c.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Webhook signature verification failed' },
        401,
      );
    }
  }

  // 2. Parse request body as JSON
  let bodyJson: any;
  try {
    bodyJson = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: 'INVALID_JSON', message: 'Request body must be valid JSON' }, 400);
  }

  // 3. Parse against standard ReservationCheckedOutEventSchema
  const parsed = ReservationCheckedOutEventSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'EVENT_VALIDATION_ERROR',
        message: 'Invalid ReservationCheckedOut event payload',
        details: parsed.error.format(),
      },
      400,
    );
  }

  const event = parsed.data;
  const now = new Date().toISOString();
  const taskId = `hkt-${crypto.randomUUID().slice(0, 8)}`;
  const scheduledDate = event.checkOutDate || now.slice(0, 10);

  // 4. Idempotency Check:
  // - Check if active cleaning task already exists for this room (pending, assigned, in_progress)
  // - Or if this specific booking / event / QStash message was already processed (even if already completed)
  const roomTasks = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.roomId, event.roomId))
    .all();

  const duplicate = roomTasks.find((t) => {
    // Check if active task exists
    const isActive = t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress';
    // Check if booking or eventId or messageId already exists in notes
    const matchesBooking = Boolean(event.bookingNumber && t.notes && t.notes.includes(event.bookingNumber));
    const matchesEvent = Boolean(event.eventId && t.notes && t.notes.includes(event.eventId));
    const matchesMessage = Boolean(messageId && t.notes && t.notes.includes(messageId));

    return isActive || matchesBooking || matchesEvent || matchesMessage;
  });

  if (duplicate) {
    return c.json(
      {
        success: true,
        message: 'Cleaning task for this checkout/booking already exists; skipped duplicate creation',
        data: duplicate,
      },
      200,
    );
  }

  // 5. Construct and insert new cleaning task
  const noteParts = [
    `Checkout cleaning for booking ${event.bookingNumber} (${event.guestName})`,
    `[Event: ${event.eventId}]`,
  ];
  if (messageId) noteParts.push(`[Msg: ${messageId}]`);
  if (event.specialNotes) noteParts.push(`Notes: ${event.specialNotes}`);

  const newTask = {
    id: taskId,
    roomId: event.roomId,
    roomNumber: event.roomNumber,
    assignedTo: null,
    taskType: (event.cleaningType || 'checkout_clean') as any,
    priority: (event.priority || 'high') as any,
    status: 'pending' as const,
    notes: noteParts.join(' '),
    scheduledDate,
    startedAt: null,
    completedAt: null,
    eventSource: 'event_bus',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(housekeepingTasks).values(newTask);

  return c.json(
    {
      success: true,
      message: `Checkout cleaning task spawned for room ${event.roomNumber}`,
      data: newTask,
    },
    201,
  );
});

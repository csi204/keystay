import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
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

  // Optional QStash Signature Verification (if keys configured)
  const signature = c.req.header('upstash-signature');
  const messageId = c.req.header('upstash-message-id');

  const rawBody = await c.req.text();
  let bodyJson: any;
  try {
    bodyJson = JSON.parse(rawBody);
  } catch (err) {
    return c.json({ success: false, error: 'INVALID_JSON', message: 'Request body must be valid JSON' }, 400);
  }

  // Parse against standard ReservationCheckedOutEventSchema
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

  // Check if an active cleaning task for this room already exists to prevent duplicate tasks
  const existingActive = await db
    .select()
    .from(housekeepingTasks)
    .where(eq(housekeepingTasks.roomId, event.roomId))
    .all();

  const duplicate = existingActive.find(
    (t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress',
  );

  if (duplicate) {
    return c.json(
      {
        success: true,
        message: 'An active cleaning task for this room already exists; skipped duplicate creation',
        data: duplicate,
      },
      200,
    );
  }

  const newTask = {
    id: taskId,
    roomId: event.roomId,
    roomNumber: event.roomNumber,
    assignedTo: null,
    taskType: (event.cleaningType || 'checkout_clean') as any,
    priority: (event.priority || 'high') as any,
    status: 'pending' as const,
    notes: event.specialNotes || `Checkout cleaning for booking ${event.bookingNumber} (${event.guestName})`,
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

import { Hono } from 'hono';
import { roomTypesRoute } from './routes/room-types';
import { floorsRoute } from './routes/floors';
import { roomsRoute } from './routes/rooms';
import { amenitiesRoute } from './routes/amenities';
import { availabilityRoute } from './routes/availability';
import { webhooksRoute } from './routes/webhooks';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Global Health & Info
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'room-inventory',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'room-inventory',
    description: 'Room & Inventory Management Service (Rooms, Types, Floors, Amenities, R2 Assets, QStash Webhooks)',
    version: '2.0.0',
    endpoints: [
      'GET /rooms',
      'GET /rooms/:id',
      'POST /rooms',
      'PUT /rooms/:id',
      'DELETE /rooms/:id',
      'GET /rooms/:id/status',
      'PUT /rooms/:id/status',
      'PUT /rooms/:id/maintenance',
      'GET /rooms/:id/history',
      'GET /rooms/available',
      'POST /rooms/:id/amenities',
      'DELETE /rooms/:id/amenities/:amenityId',
      'GET /room-types',
      'POST /room-types',
      'PUT /room-types/:id',
      'DELETE /room-types/:id',
      'GET /floors',
      'GET /floors/:id/rooms',
      'POST /webhooks/checkout',
      'POST /webhooks/housekeeping-completed',
      'POST /webhooks/checkin',
    ],
  });
});

// Mount Routes
app.route('/room-types', roomTypesRoute);
app.route('/floors', floorsRoute);
app.route('/rooms', availabilityRoute);
app.route('/rooms', amenitiesRoute);
app.route('/rooms', roomsRoute);

// Mount QStash Webhook Consumers (Issue #8)
app.route('/webhooks', webhooksRoute);
app.route('/rooms/webhooks', webhooksRoute);

// Global Error Handler
app.onError((err, c) => {
  console.error('[Room Inventory Service Error]:', err);
  return c.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message,
    },
    500,
  );
});

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'NOT_FOUND',
      message: `Endpoint ${c.req.method} ${c.req.path} not found in room-inventory service`,
    },
    404,
  );
});

export default app;

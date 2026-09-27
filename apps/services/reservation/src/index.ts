import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type Env } from './types';
import guests from './routes/guests';
import reservations from './routes/reservations';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'reservation',
    phase: 'Phase 1 Core CRUD Ready',
    timestamp: new Date().toISOString(),
  });
});

// Service metadata root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'reservation',
    version: '1.0.0',
    owner: 'เดียร์ (allmusgus) — SA Lead',
    description: 'Reservation & Guest Management Service (Phase 1: Guests & Reservations Core CRUD)',
    endpoints: [
      'GET /health',
      'GET /guests',
      'POST /guests',
      'GET /guests/:id',
      'PUT /guests/:id',
      'DELETE /guests/:id',
      'GET /reservations',
      'POST /reservations',
      'GET /reservations/today-checkins',
      'GET /reservations/today-checkouts',
      'GET /reservations/calendar',
      'GET /reservations/by-guest/:guestId',
      'GET /reservations/by-room/:roomId',
      'GET /reservations/:id',
      'PUT /reservations/:id',
      'DELETE /reservations/:id',
    ],
  });
});

// Mount sub-routers
app.route('/guests', guests);
app.route('/reservations', reservations);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${c.req.method} ${c.req.path}`,
      },
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Reservation Service Error:', err);
  return c.json(
    {
      success: false,
      error: {
        message: err.message || 'Internal server error',
      },
    },
    500
  );
});

export default app;

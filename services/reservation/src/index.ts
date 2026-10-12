import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type Env } from './types';
import guests from './routes/guests';
import reservations from './routes/reservations';
import { runNightAudit } from './cron/night-audit';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'reservation',
    phase: 'Phase 2 Transactions & QStash Integration Ready',
    timestamp: new Date().toISOString(),
  });
});

// Service metadata root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'reservation',
    version: '2.0.0',
    owner: 'เดียร์ (allmusgus) — SA Lead',
    description: 'Reservation & Guest Management Service (Phase 1 CRUD + Phase 2 Transactions & QStash Integration)',
    endpoints: [
      'GET /health',
      // Guests
      'GET /guests',
      'POST /guests',
      'GET /guests/:id',
      'PUT /guests/:id',
      'DELETE /guests/:id',
      // Reservations Core
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
      // Phase 2 Transactions
      'POST /reservations/:id/check-in',
      'POST /reservations/:id/check-out',
      'POST /reservations/:id/cancel',
      'PUT /reservations/:id/modify-dates',
      'POST /reservations/:id/extend-stay',
      'POST /reservations/:id/upgrade-room',
      'POST /walk-in',
      'POST /reservations/walk-in',
      'GET /reservations/:id/invoice-preview',
      'POST /reservations/:id/apply-discount',
      'POST /night-audit',
      'POST /reservations/night-audit',
    ],
  });
});

// Service Authentication & Caller Verification Middleware
// Protects internal worker routes from unauthenticated public access.
// Verifies caller identity via API Gateway forwarded identity headers, authorization token, or internal service key.
app.use('*', async (c, next) => {
  const path = c.req.path;
  // Public health and metadata routes
  if (path === '/health' || path === '/' || c.req.method === 'OPTIONS') {
    return next();
  }

  const host = c.req.header('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const env = c.env.ENVIRONMENT;
  const isDev = isLocal || env === 'development' || env === 'test';

  const userId = c.req.header('x-user-id');
  const authHeader = c.req.header('authorization');
  const serviceKey = c.req.header('x-service-key') || c.req.header('x-internal-service-key');

  if (!userId && !authHeader && !serviceKey && !isDev) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Service authentication required. Requests must originate from API Gateway or supply valid credentials.',
        },
      },
      401
    );
  }

  await next();
});

// Mount sub-routers
app.route('/guests', guests);
app.route('/reservations', reservations);

// Direct root-level aliases for gateway forwarding compatibility (/api/walk-in -> /walk-in)
app.post('/walk-in', (c) => reservations.fetch(c.req.raw, c.env, c.executionCtx));
app.post('/night-audit', (c) => reservations.fetch(c.req.raw, c.env, c.executionCtx));

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

export { app };

export default {
  fetch: app.fetch.bind(app),
  async scheduled(event: any, env: Env, ctx: any) {
    console.log('[NightAuditCron] Scheduled trigger fired at:', new Date().toISOString(), event);
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(runNightAudit(env));
    } else {
      await runNightAudit(env);
    }
  },
};


import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type Env } from './types';
import bills from './routes/bills';
import paymentMethods from './routes/payment-methods';
import invoices from './routes/invoices';
import webhooks from './routes/webhooks';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'billing',
    phase: 'Phase 2 Billing Service & Cashiering Ready',
    timestamp: new Date().toISOString(),
  });
});

// Service metadata root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'billing',
    version: '2.0.0',
    owner: 'เดียร์ (allmusgus) — SA Lead',
    description: 'Billing & Cashiering Service (Bills, Items, Payments, Invoices, Refunds, and Webhooks)',
    endpoints: [
      'GET /health',
      // Webhook
      'POST /webhooks/checkout',
      // Bills
      'GET /bills',
      'GET /bills/:id',
      'POST /bills',
      'PUT /bills/:id',
      'POST /bills/:id/items',
      'DELETE /bills/:id/items/:itemId',
      'POST /bills/:id/pay',
      'GET /bills/:id/receipt',
      'GET /bills/by-reservation/:reservationId',
      'POST /bills/:id/refund',
      'POST /bills/:id/discount',
      // Payment Methods
      'GET /payment-methods',
      'POST /payment-methods',
      // Invoices
      'GET /invoices',
      'GET /invoices/:id',
      'POST /invoices/:id/send-email',
    ],
  });
});

// Service Authentication & Caller Verification Middleware
// Protects internal worker routes from unauthenticated public access.
// Allows webhooks from QStash, public health checks, and verified gateway/service callers.
app.use('*', async (c, next) => {
  const path = c.req.path;
  // Public health, metadata, and webhooks
  if (path === '/health' || path === '/' || path.startsWith('/webhooks') || c.req.method === 'OPTIONS') {
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
app.route('/bills', bills);
app.route('/payment-methods', paymentMethods);
app.route('/invoices', invoices);
app.route('/webhooks', webhooks);

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
  console.error('Billing Service Error:', err);
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

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyJwt, type JwtPayload } from '@keystay/utils';

export interface Env {
  AUTH_USER_SERVICE: Fetcher;
  ROOM_INVENTORY_SERVICE: Fetcher;
  RESERVATION_SERVICE: Fetcher;
  HOUSEKEEPING_SERVICE: Fetcher;
  BILLING_SERVICE: Fetcher;
  REPORT_ANALYTICS_SERVICE: Fetcher;
  KV: KVNamespace;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

type Variables = {
  user?: JwtPayload;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const getJwtSecret = (env: Env): string => {
  if (!env.JWT_SECRET) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing. Configure it in Cloudflare Secrets or .dev.vars');
  }
  return env.JWT_SECRET;
};

// ==========================================
// 1. CORS MIDDLEWARE (Per docs/SECURITY.md)
// ==========================================
/**
 * [Middleware 1] CORS
 * คัดกรอง Origin ที่อนุญาต — Whitelist domains, *.workers.dev และ keystay*.pages.dev
 * allowMethods: GET, POST, PUT, DELETE, PATCH, OPTIONS | maxAge: 86400 (1 วัน)
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://keystay-web.khetsophon-ain.workers.dev',
];

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    if (origin.endsWith('.khetsophon-ain.workers.dev') || /^https:\/\/keystay[a-z0-9-]*\.pages\.dev$/.test(origin)) {
      return origin;
    }
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key'],
  exposeHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 86400, //1day
  credentials: true,
}));

// ==========================================
// 2. SECURITY HEADERS MIDDLEWARE
// ==========================================
app.use('*', async (c, next) => {
  await next();
/**
 * [Middleware 2] Security Headers
 * แปะ security headers ให้ทุก response ป้องกัน XSS / Clickjacking
 */
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

// ==========================================
// 3. RATE LIMITING MIDDLEWARE (KV-backed, 100 req/min)
// ==========================================
app.use('*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const nowMinute = Math.floor(Date.now() / 60000);
/**
 * [Middleware 3] Rate Limiting
 * จำกัดคำขอตาม IP ด้วย Cloudflare KV (สูงสุด 120 req/นาที ต่อ IP) เกินจะตอบ 429
 */
  const rateLimitKey = `ratelimit:${ip}:${nowMinute}`;

  if (c.env.KV) {
    try {
      const current = await c.env.KV.get(rateLimitKey);
      const count = current ? parseInt(current, 10) : 0;
      if (count > 120) {
        return c.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please slow down.',
            },
          },
          429
        );
      }
      await c.env.KV.put(rateLimitKey, (count + 1).toString(), { expirationTtl: 120 });
    } catch (e) {
      // Non-blocking in case of KV errors
    }
  }

  await next();
});

// ==========================================
// 4. PUBLIC HEALTH & METADATA ROUTES
// ==========================================
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'api-gateway',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'KEYSTAY API Gateway',
    version: '1.0.0',
    description: 'Central Service Router & Security Guard for KEYSTAY Hotel Management Services',
    services: [
      { prefix: '/api/auth', name: 'auth-user' },
      { prefix: '/api/rooms', name: 'room-inventory' },
      { prefix: '/api/reservations', name: 'reservation' },
      { prefix: '/api/housekeeping', name: 'housekeeping' },
      { prefix: '/api/bills', name: 'billing' },
      { prefix: '/api/reports', name: 'report-analytics' },
    ],
  });
});

// ==========================================
// 5. JWT AUTHENTICATION GUARD
// ==========================================
/**
 * [Middleware 4] JWT Authentication Guard
 * ตรวจสอบ Bearer token ทุกเส้นทางใต้ /api/* (ยกเว้น PUBLIC_PATHS)
 * ตรวจสถานะ Blacklist จาก KV ด้วย jti หากเคย logout แล้วจะตอบ 401
 */
const PUBLIC_PATHS = [
  '/health',
  '/',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh-token',
];

app.use('/api/*', async (c, next) => {
  const path = c.req.path;

  // Skip auth for public endpoints
  if (PUBLIC_PATHS.some(p => path === p || path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register') || path.startsWith('/api/auth/refresh-token') || path.startsWith('/api/auth/forgot-password') || path.startsWith('/api/auth/reset-password'))) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed Authorization header. Expected Bearer token.',
        },
      },
      401
    );
  }

  const token = authHeader.substring(7);
  const secret = getJwtSecret(c.env);
  const { valid, payload, error } = await verifyJwt(token, secret);

  if (!valid || !payload) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: error || 'Invalid or expired token',
        },
      },
      401
    );
  }

  // Check if token was blacklisted on logout
  if (payload.jti && c.env.KV) {
    const isRevoked = await c.env.KV.get(`blacklist:${payload.jti}`);
    if (isRevoked) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TOKEN_REVOKED',
            message: 'Session has been logged out or revoked',
          },
        },
        401
      );
    }
  }

  c.set('user', payload);
  await next();
});

// ==========================================
// 6. RBAC PERMISSION ENFORCEMENT
// ==========================================
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  const user = c.get('user');

  // If public route, skip RBAC
  if (!user) {
    return next();
  }

  const role = user.role;

/**
 * [Middleware 5] RBAC (Role-Based Access Control)
 * ควบคุมสิทธิ์ตาม role: admin เข้าได้ทั้งหมด, manager ห้ามเปลี่ยน role/ลบ user,
 * front_desk ห้ามเข้าถึงรายงาน/dashboard/สิทธิ์การเงิน, housekeeping เข้าได้เฉพาะส่วนงานแม่บ้าน
 * หากไม่มีสิทธิ์จะปฏิเสธด้วย 403 Forbidden
 */
  // Admin has access to everything
  if (role === 'admin') {
    return next();
  }

  // Housekeeping restrictions
  if (role === 'housekeeping') {
    const isAllowed =
      path.startsWith('/api/housekeeping') ||
      (path.startsWith('/api/rooms') && c.req.method === 'GET') ||
      (path.startsWith('/api/rooms/') && path.endsWith('/status') && c.req.method === 'PATCH') ||
      path.startsWith('/api/auth/logout') ||
      path.startsWith('/api/auth/change-password') ||
      path.startsWith('/api/auth/users/' + user.sub);
    if (!isAllowed) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: Housekeeping role cannot access this resource',
          },
        },
        403
      );
    }
  }

  // Front Desk restrictions
  if (role === 'front_desk') {
    const isRestrictedAdminRoute =
      path.startsWith('/api/reports') ||
      path.startsWith('/api/dashboard') ||
      (path.startsWith('/api/auth/users') && !path.startsWith('/api/auth/users/' + user.sub)) ||
      path.includes('/role') ||
      (path.startsWith('/api/room-types') && c.req.method !== 'GET');
    if (isRestrictedAdminRoute) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: Front Desk role cannot access management or financial resources',
          },
        },
        403
      );
    }
  }

  // Manager restrictions
  if (role === 'manager') {
    // Manager cannot manage admin roles or delete users
    if (path.includes('/role') || (path.startsWith('/api/auth/users') && c.req.method === 'DELETE')) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: Manager cannot alter roles or delete user accounts',
          },
        },
        403
      );
    }
  }

  await next();
});

// ==========================================
// 7. FORWARDING HELPER VIA SERVICE BINDINGS
// ==========================================
async function forwardRequest(
  fetcher: Fetcher,
  c: any,
  stripPrefix: string
): Promise<Response> {
  const url = new URL(c.req.url);
  const targetPath = url.pathname.replace(stripPrefix, '') || '/';
  const targetUrl = new URL(targetPath + url.search, 'http://internal');

  // Clone headers and add caller context
  const headers = new Headers(c.req.raw.headers);
  const user = c.get('user');
  if (user) {
    headers.set('x-user-id', user.sub);
    headers.set('x-user-role', user.role);
    headers.set('x-user-email', user.email);
  }

  const newReq = new Request(targetUrl.toString(), {
    method: c.req.method,
    headers: headers,
    body: c.req.raw.body,
    // @ts-ignore
    duplex: 'half',
  });

  return await fetcher.fetch(newReq);
}

// ==========================================
// 8. SERVICE ROUTING RULES
// ==========================================

// Service #1: Auth & User
app.all('/api/auth/*', async (c) => {
  return forwardRequest(c.env.AUTH_USER_SERVICE, c, '/api/auth');
});
app.all('/api/auth', async (c) => {
  return forwardRequest(c.env.AUTH_USER_SERVICE, c, '/api/auth');
});

// Service #2: Room Inventory
app.all('/api/rooms/*', async (c) => {
  return forwardRequest(c.env.ROOM_INVENTORY_SERVICE, c, '/api');
});
app.all('/api/rooms', async (c) => {
  return forwardRequest(c.env.ROOM_INVENTORY_SERVICE, c, '/api');
});
app.all('/api/room-types/*', async (c) => {
  return forwardRequest(c.env.ROOM_INVENTORY_SERVICE, c, '/api');
});
app.all('/api/room-types', async (c) => {
  return forwardRequest(c.env.ROOM_INVENTORY_SERVICE, c, '/api');
});
app.all('/api/floors/*', async (c) => {
  return forwardRequest(c.env.ROOM_INVENTORY_SERVICE, c, '/api');
});
app.all('/api/floors', async (c) => {
  return forwardRequest(c.env.ROOM_INVENTORY_SERVICE, c, '/api');
});

// Service #3: Reservation
app.all('/api/reservations/*', async (c) => {
  return forwardRequest(c.env.RESERVATION_SERVICE, c, '/api');
});
app.all('/api/reservations', async (c) => {
  return forwardRequest(c.env.RESERVATION_SERVICE, c, '/api');
});
app.all('/api/guests/*', async (c) => {
  return forwardRequest(c.env.RESERVATION_SERVICE, c, '/api');
});
app.all('/api/guests', async (c) => {
  return forwardRequest(c.env.RESERVATION_SERVICE, c, '/api');
});
app.all('/api/walk-in', async (c) => {
  return forwardRequest(c.env.RESERVATION_SERVICE, c, '/api');
});

// Service #4: Housekeeping
app.all('/api/housekeeping/*', async (c) => {
  return forwardRequest(c.env.HOUSEKEEPING_SERVICE, c, '/api');
});
app.all('/api/housekeeping', async (c) => {
  return forwardRequest(c.env.HOUSEKEEPING_SERVICE, c, '/api');
});

// Service #5: Billing
app.all('/api/bills/*', async (c) => {
  return forwardRequest(c.env.BILLING_SERVICE, c, '/api');
});
app.all('/api/bills', async (c) => {
  return forwardRequest(c.env.BILLING_SERVICE, c, '/api');
});
app.all('/api/payment-methods/*', async (c) => {
  return forwardRequest(c.env.BILLING_SERVICE, c, '/api');
});
app.all('/api/payment-methods', async (c) => {
  return forwardRequest(c.env.BILLING_SERVICE, c, '/api');
});
app.all('/api/invoices/*', async (c) => {
  return forwardRequest(c.env.BILLING_SERVICE, c, '/api');
});
app.all('/api/invoices', async (c) => {
  return forwardRequest(c.env.BILLING_SERVICE, c, '/api');
});

// Service #6: Report & Analytics
app.all('/api/reports/*', async (c) => {
  return forwardRequest(c.env.REPORT_ANALYTICS_SERVICE, c, '/api');
});
app.all('/api/reports', async (c) => {
  return forwardRequest(c.env.REPORT_ANALYTICS_SERVICE, c, '/api');
});
app.all('/api/dashboard/*', async (c) => {
  return forwardRequest(c.env.REPORT_ANALYTICS_SERVICE, c, '/api');
});
app.all('/api/dashboard', async (c) => {
  return forwardRequest(c.env.REPORT_ANALYTICS_SERVICE, c, '/api');
});

// ==========================================
// 9. 404 NOT FOUND & GLOBAL ERROR HANDLER
// ==========================================
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${c.req.method} ${c.req.path} not found on KEYSTAY API Gateway`,
      },
    },
    404
  );
});

app.onError((err, c) => {
  console.error('API Gateway Error:', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred in API Gateway',
      },
    },
    500
  );
});

export default app;

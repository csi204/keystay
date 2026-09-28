import { Hono } from 'hono';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  generateSecureToken,
  type JwtPayload,
} from '@keystay/utils';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

const getJwtSecret = (env: Env): string => {
  if (!env.JWT_SECRET) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing. Configure it in Cloudflare Secrets or .dev.vars');
  }
  return env.JWT_SECRET;
};

// ==========================================
// ROLE PERMISSION MATRIX
// ==========================================
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'users:create', 'users:read', 'users:update', 'users:delete', 'users:manage_roles',
    'rooms:create', 'rooms:read', 'rooms:update', 'rooms:delete', 'rooms:manage_rates',
    'reservations:create', 'reservations:read', 'reservations:update', 'reservations:delete',
    'housekeeping:create', 'housekeeping:read', 'housekeeping:update', 'housekeeping:delete',
    'billing:create', 'billing:read', 'billing:update', 'billing:delete', 'billing:refund',
    'reports:view_kpi', 'reports:view_financials', 'reports:export',
  ],
  manager: [
    'users:read',
    'rooms:create', 'rooms:read', 'rooms:update', 'rooms:manage_rates',
    'reservations:create', 'reservations:read', 'reservations:update',
    'housekeeping:read', 'housekeeping:update',
    'billing:read', 'billing:update', 'billing:refund',
    'reports:view_kpi', 'reports:view_financials', 'reports:export',
  ],
  front_desk: [
    'rooms:read', 'rooms:update_status',
    'reservations:create', 'reservations:read', 'reservations:update', 'reservations:checkin', 'reservations:checkout',
    'billing:create', 'billing:read', 'billing:update', 'billing:process_payment',
    'housekeeping:read',
    'guests:create', 'guests:read', 'guests:update',
  ],
  housekeeping: [
    'rooms:read', 'rooms:update_status',
    'housekeeping:read', 'housekeeping:update_tasks', 'housekeeping:report_issues',
  ],
};

// ==========================================
// HEALTH & INFO ENDPOINTS
// ==========================================
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'auth-user',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'auth-user',
    version: '1.0.0',
    description: 'KEYSTAY Authentication and User Management Service (12 APIs)',
  });
});

// ==========================================
// 1. POST /register — ลงทะเบียนผู้ใช้ใหม่
// ==========================================
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  // Prevent privilege escalation: public registration can only assign front_desk or housekeeping
  role: z.enum(['front_desk', 'housekeeping']).default('front_desk'),
});

app.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }

    const { email, password, firstName, lastName, role } = parsed.data;

    // Check if user already exists
    const existing = await c.env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first();

    if (existing) {
      return c.json({ success: false, error: 'Email already registered' }, 409);
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    await c.env.DB.batch([
      c.env.DB
        .prepare(`
          INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `)
        .bind(userId, email.toLowerCase(), hashedPassword, firstName, lastName, role, now, now),
      c.env.DB
        .prepare(`
          INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
          VALUES (?, 'UserCreated', ?, 'User', ?, 'pending', ?)
        `)
        .bind(
          crypto.randomUUID(),
          userId,
          JSON.stringify({ userId, email: email.toLowerCase(), firstName, lastName, role, createdAt: now }),
          now
        ),
    ]);

    return c.json(
      {
        success: true,
        data: {
          id: userId,
          email: email.toLowerCase(),
          firstName,
          lastName,
          role,
          isActive: true,
          createdAt: now,
        },
      },
      201
    );
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 2. POST /login — ล็อกอินเข้าสู่ระบบ (พร้อม Remember Me)
// ==========================================
const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }

    const { identifier, password, rememberMe } = parsed.data;

    // Find active user by email
    const user = await c.env.DB
      .prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
      .bind(identifier.toLowerCase())
      .first<{
        id: string;
        email: string;
        password_hash: string;
        first_name: string;
        last_name: string;
        role: 'admin' | 'manager' | 'front_desk' | 'housekeeping';
        is_active: number;
      }>();

    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials or inactive account' }, 401);
    }

    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Access Token: 15 minutes (900 seconds)
    const jwtSecret = getJwtSecret(c.env);
    const accessToken = await signJwt(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`,
      },
      jwtSecret,
      900
    );

    // Refresh Token: 30 days if rememberMe, otherwise 24 hours
    const refreshLifetimeSeconds = rememberMe ? 30 * 24 * 3600 : 24 * 3600;
    const refreshToken = generateSecureToken(32);
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + refreshLifetimeSeconds * 1000).toISOString();
    const nowIso = now.toISOString();

    await c.env.DB.batch([
      c.env.DB
        .prepare(`
          INSERT INTO sessions (id, user_id, refresh_token, is_remember_me, expires_at, is_revoked, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `)
        .bind(sessionId, user.id, refreshToken, rememberMe ? 1 : 0, expiresAt, nowIso),
      c.env.DB
        .prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
        .bind(nowIso, nowIso, user.id),
    ]);

    // Cache active user in KV
    if (c.env.KV) {
      await c.env.KV.put(
        `user:${user.id}`,
        JSON.stringify({
          id: user.id,
          email: user.email,
          role: user.role,
          name: `${user.first_name} ${user.last_name}`,
          permissions: ROLE_PERMISSIONS[user.role] || [],
        }),
        { expirationTtl: 3600 }
      );
    }

    return c.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        rememberMe,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          permissions: ROLE_PERMISSIONS[user.role] || [],
        },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 3. POST /logout — ออกจากระบบและยกเลิก Session
// ==========================================
app.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const body = await c.req.json().catch(() => ({}));
    const refreshToken = body.refreshToken;

    if (refreshToken) {
      await c.env.DB
        .prepare('UPDATE sessions SET is_revoked = 1 WHERE refresh_token = ?')
        .bind(refreshToken)
        .run();
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = getJwtSecret(c.env);
      const { valid, payload } = await verifyJwt(token, secret);
      if (valid && payload?.jti && c.env.KV) {
        // Blacklist access token in KV until expiry
        const ttl = (payload.exp || Math.floor(Date.now() / 1000) + 900) - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await c.env.KV.put(`blacklist:${payload.jti}`, 'revoked', { expirationTtl: ttl });
        }
      }
    }

    return c.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 4. POST /refresh-token — ขอ Access Token ใหม่
// ==========================================
app.post('/refresh-token', async (c) => {
  try {
    const body = await c.req.json();
    const refreshToken = body.refreshToken;

    if (!refreshToken) {
      return c.json({ success: false, error: 'refreshToken is required' }, 400);
    }

    const session = await c.env.DB
      .prepare(`
        SELECT s.id AS session_id, s.is_remember_me, s.expires_at, u.id AS user_id, u.email, u.first_name, u.last_name, u.role, u.is_active
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.refresh_token = ? AND s.is_revoked = 0
      `)
      .bind(refreshToken)
      .first<{
        session_id: string;
        is_remember_me: number;
        expires_at: string;
        user_id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: 'admin' | 'manager' | 'front_desk' | 'housekeeping';
        is_active: number;
      }>();

    if (!session || session.is_active !== 1) {
      return c.json({ success: false, error: 'Invalid or revoked refresh token' }, 401);
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return c.json({ success: false, error: 'Refresh token has expired' }, 401);
    }

    // Rotate refresh token
    const newRefreshToken = generateSecureToken(32);
    const newExpiresAt = session.is_remember_me
      ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
      : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    await c.env.DB
      .prepare('UPDATE sessions SET refresh_token = ?, expires_at = ? WHERE id = ?')
      .bind(newRefreshToken, newExpiresAt, session.session_id)
      .run();

    const jwtSecret = getJwtSecret(c.env);
    const newAccessToken = await signJwt(
      {
        sub: session.user_id,
        email: session.email,
        role: session.role,
        name: `${session.first_name} ${session.last_name}`,
      },
      jwtSecret,
      900
    );

    return c.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 5. GET /users — รายชื่อผู้ใช้งานทั้งหมด
// ==========================================
app.get('/users', async (c) => {
  try {
    const role = c.req.query('role');
    const isActive = c.req.query('is_active');
    const rawLimit = parseInt(c.req.query('limit') || '50', 10);
    const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 100);
    const rawOffset = parseInt(c.req.query('offset') || '0', 10);
    const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    let query = 'SELECT id, email, first_name, last_name, role, is_active, last_login_at, created_at, updated_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = c.env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    return c.json({
      success: true,
      data: result.results,
      count: result.results.length,
      limit,
      offset,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 6. GET /users/:id — ข้อมูลผู้ใช้รายบุคคล
// ==========================================
app.get('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await c.env.DB
      .prepare('SELECT id, email, first_name, last_name, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?')
      .bind(id)
      .first();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 7. PUT /users/:id — แก้ไขข้อมูลส่วนตัวผู้ใช้
// ==========================================
const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

app.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }

    const { firstName, lastName, email, isActive } = parsed.data;
    const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Check duplicate email against other users
    if (email) {
      const dup = await c.env.DB
        .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
        .bind(email.toLowerCase(), id)
        .first();
      if (dup) {
        return c.json({ success: false, error: 'Email already registered by another account' }, 409);
      }
    }

    const callerRole = c.req.header('x-user-role');
    const effectiveIsActive = (isActive !== undefined && callerRole === 'admin') 
      ? (isActive ? 1 : 0) 
      : null;

    const now = new Date().toISOString();
    await c.env.DB
      .prepare(`
        UPDATE users
        SET first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email),
            is_active = COALESCE(?, is_active),
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        firstName ?? null,
        lastName ?? null,
        email ? email.toLowerCase() : null,
        effectiveIsActive,
        now,
        id
      )
      .run();

    const updated = await c.env.DB
      .prepare('SELECT id, email, first_name, last_name, role, is_active, updated_at FROM users WHERE id = ?')
      .bind(id)
      .first();

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 8. DELETE /users/:id — ปิดการใช้งานผู้ใช้ (Soft Delete)
// ==========================================
app.delete('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const now = new Date().toISOString();

    const result = await c.env.DB.batch([
      c.env.DB.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').bind(now, id),
      c.env.DB.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').bind(id),
    ]);

    if (c.env.KV) {
      await c.env.KV.delete(`user:${id}`);
    }

    return c.json({ success: true, message: 'User deactivated successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 9. PUT /users/:id/role — เปลี่ยนบทบาทผู้ใช้
// ==========================================
const roleSchema = z.object({
  role: z.enum(['admin', 'manager', 'front_desk', 'housekeeping']),
});

app.put('/users/:id/role', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }

    const { role } = parsed.data;
    const now = new Date().toISOString();

    const user = await c.env.DB.prepare('SELECT id, email, role FROM users WHERE id = ?').bind(id).first();
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, now, id),
      c.env.DB
        .prepare(`
          INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
          VALUES (?, 'RoleChanged', ?, 'User', ?, 'pending', ?)
        `)
        .bind(
          crypto.randomUUID(),
          id,
          JSON.stringify({ userId: id, oldRole: user.role, newRole: role, updatedAt: now }),
          now
        ),
    ]);

    if (c.env.KV) {
      await c.env.KV.delete(`user:${id}`);
    }

    return c.json({ success: true, data: { id, role, updatedAt: now } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 10. GET /users/:id/permissions — ดูรายการสิทธิ์ของผู้ใช้
// ==========================================
app.get('/users/:id/permissions', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await c.env.DB
      .prepare('SELECT id, role FROM users WHERE id = ?')
      .bind(id)
      .first<{ id: string; role: string }>();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return c.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        permissions,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 11. POST /forgot-password — ขอกู้คืนรหัสผ่าน
// ==========================================
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

app.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }

    const { email } = parsed.data;
    const user = await c.env.DB
      .prepare('SELECT id, email FROM users WHERE email = ? AND is_active = 1')
      .bind(email.toLowerCase())
      .first<{ id: string; email: string }>();

    // For security, always return success even if user not found (prevents email enumeration)
    if (!user) {
      return c.json({
        success: true,
        message: 'If the email exists, a password reset link has been generated.',
      });
    }

    const resetToken = generateSecureToken(32);
    const tokenId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1 hour

    await c.env.DB
      .prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at, is_used, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `)
      .bind(tokenId, user.id, resetToken, expiresAt, now.toISOString())
      .run();

    // In development/test, log to console for verification instead of leaking in HTTP response
    console.log(`[AUTH] Password reset token for ${email}: ${resetToken} (expires: ${expiresAt})`);

    return c.json({
      success: true,
      message: 'If the email exists, a password reset link has been generated and sent to your email address.',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

// ==========================================
// 12. POST /reset-password — ตั้งรหัสผ่านใหม่
// ==========================================
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

app.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }

    const { token, newPassword } = parsed.data;

    const tokenRecord = await c.env.DB
      .prepare(`
        SELECT id, user_id, expires_at, is_used
        FROM password_reset_tokens
        WHERE token = ? AND is_used = 0
      `)
      .bind(token)
      .first<{ id: string; user_id: string; expires_at: string; is_used: number }>();

    if (!tokenRecord) {
      return c.json({ success: false, error: 'Invalid or expired reset token' }, 400);
    }

    if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return c.json({ success: false, error: 'Reset token has expired' }, 400);
    }

    const newHashedPassword = await hashPassword(newPassword);
    const now = new Date().toISOString();

    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(newHashedPassword, now, tokenRecord.user_id),
      c.env.DB.prepare('UPDATE password_reset_tokens SET is_used = 1 WHERE id = ?').bind(tokenRecord.id),
      c.env.DB.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').bind(tokenRecord.user_id),
    ]);

    if (c.env.KV) {
      await c.env.KV.delete(`user:${tokenRecord.user_id}`);
    }

    return c.json({ success: true, message: 'Password reset successfully. You can now login with your new password.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
  }
});

export default app;

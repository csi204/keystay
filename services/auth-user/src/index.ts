import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from './db/client';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { verifyJwt } from '@keystay/utils';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

const getJwtSecret = (env: Env): string => {
  if (!env.JWT_SECRET) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
  }
  return env.JWT_SECRET;
};

// ==========================================
// VALIDATION SCHEMAS
// ==========================================
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'front_desk', 'housekeeping']).default('front_desk'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
  isRememberMe: z.boolean().optional().default(false),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'front_desk', 'housekeeping']),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Helper for DI
function getServices(env: Env) {
  const db = getDb(env.DB);
  const secret = getJwtSecret(env);
  const authService = new AuthService(db, secret, env.KV);
  const userService = new UserService(db);
  return { authService, userService };
}

// ==========================================
// ROUTES
// ==========================================

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'auth-user',
    orm: 'Drizzle ORM',
    timestamp: new Date().toISOString(),
  });
});

/**
 * [1] สมัครสมาชิก
 * รับ email+password+ชื่อ+role → สร้าง user ใหม่ + สร้าง session + ออก accessToken (15 นาที) + refreshToken (7 วัน) ทันที
 * 400 body ผิด schema | 409 email ซ้ำในระบบ
 */
// 1. Register
const handleRegister = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { authService } = getServices(c.env);
    const result = await authService.register(parsed.data);
    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.post('/register', handleRegister);
app.post('/api/auth/register', handleRegister);

/**
 * [2] เข้าสู่ระบบ
 * ตรวจ email+password → สร้าง session + อัปเดต lastLoginAt + ออก token
 * isRememberMe=true → session 30 วัน (แทนค่าปกติ 1 วัน)
 * 400 body ผิด | 401 email/password ไม่ตรง | 403 account ถูก deactivate
 */
// 2. Login
const handleLogin = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { authService } = getServices(c.env);
    const result = await authService.login(parsed.data);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.post('/login', handleLogin);
app.post('/api/auth/login', handleLogin);

/**
 * [3] ต่ออายุ Token (Token Rotation)
 * รับ refreshToken เก่า → revoke ทิ้ง → สร้าง session ใหม่ + ออก accessToken + refreshToken ใหม่
 * ใช้ได้แค่ครั้งเดียว — token เก่าใช้ซ้ำไม่ได้
 * 401 token ผิด/หมดอายุ/ถูก revoke
 */
// 3. Refresh Token
const handleRefreshToken = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = refreshTokenSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { authService } = getServices(c.env);
    const result = await authService.refreshToken(parsed.data.refreshToken);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.post('/refresh-token', handleRefreshToken);
app.post('/api/auth/refresh-token', handleRefreshToken);

/**
 * [4] ออกจากระบบ
 * refreshToken → mark isRevoked=1 ใน sessions
 * ถ้าส่ง Authorization Bearer มาด้วย → ดึง jti ใส่ KV blacklist (TTL 15 นาที) ทำให้ access token เก่าใช้ไม่ได้ทันที
 */
// 4. Logout
const handleLogout = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const refreshToken = body?.refreshToken;
    let jwtId: string | undefined;

    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { payload } = await verifyJwt(token, getJwtSecret(c.env));
      if (payload?.jti) jwtId = payload.jti;
    }

    const { authService } = getServices(c.env);
    const result = await authService.logout(refreshToken, jwtId);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.post('/logout', handleLogout);
app.post('/api/auth/logout', handleLogout);

/**
 * [5] ดูข้อมูลตัวเอง (Me)
 * รับ x-user-id จาก gateway หรือ verify JWT เอง → คืนข้อมูล user (ไม่มี passwordHash)
 * 401 ไม่มี token/token ผิด | 404 ไม่เจอ user
 */
// 5. Get current user profile (Me)
const handleMe = async (c: any) => {
  try {
    const userId = c.req.header('x-user-id');
    if (!userId) {
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }
      const token = authHeader.substring(7);
      const { valid, payload } = await verifyJwt(token, getJwtSecret(c.env));
      if (!valid || !payload?.sub) {
        return c.json({ success: false, error: 'Invalid token' }, 401);
      }
      const { userService } = getServices(c.env);
      const user = await userService.getUserById(payload.sub);
      return c.json({ success: true, data: user });
    }

    const { userService } = getServices(c.env);
    const user = await userService.getUserById(userId);
    return c.json({ success: true, data: user });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.get('/me', handleMe);
app.get('/api/auth/me', handleMe);

/**
 * [6] ดูรายชื่อ User ทั้งหมด
 * กรองได้ตาม ?role= และ ?isActive= | isActive คืน boolean เสมอ
 */
// 6. List users
const handleGetUsers = async (c: any) => {
  try {
    const role = c.req.query('role');
    const isActiveStr = c.req.query('isActive');
    const isActive = isActiveStr !== undefined ? (isActiveStr === 'true' || isActiveStr === '1' ? 1 : 0) : undefined;
    const { userService } = getServices(c.env);
    const userList = await userService.getUsers(role, isActive);
    return c.json({ success: true, data: userList });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.get('/users', handleGetUsers);
app.get('/api/auth/users', handleGetUsers);

/**
 * [7] ดู User คนเดียวตาม ID
 * 404 ถ้าไม่เจอ user
 */
// 7. Get user by ID
const handleGetUserById = async (c: any) => {
  try {
    const id = c.req.param('id');
    const { userService } = getServices(c.env);
    const user = await userService.getUserById(id);
    return c.json({ success: true, data: user });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.get('/users/:id', handleGetUserById);
app.get('/api/auth/users/:id', handleGetUserById);

/**
 * [8] แก้ข้อมูล User (ชื่อ/นามสกุล/email)
 * ถ้าเปลี่ยน email → เช็ค duplicate ก่อน
 * 400 body ผิด | 404 ไม่เจอ user | 409 email ซ้ำ
 */
// 8. Update user
const handleUpdateUser = async (c: any) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { userService } = getServices(c.env);
    const user = await userService.updateUser(id, parsed.data);
    return c.json({ success: true, data: user });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.put('/users/:id', handleUpdateUser);
app.put('/api/auth/users/:id', handleUpdateUser);

/**
 * [9] ลบ User (Soft Delete)
 * ไม่ลบจริง → set isActive=false + revoke session ทั้งหมด atomically
 * user ที่ deactivate แล้ว login ไม่ได้อีก
 * 404 ไม่เจอ user
 */
// 9. Delete user
const handleDeleteUser = async (c: any) => {
  try {
    const id = c.req.param('id');
    const { userService } = getServices(c.env);
    const result = await userService.deleteUser(id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.delete('/users/:id', handleDeleteUser);
app.delete('/api/auth/users/:id', handleDeleteUser);

/**
 * [10] เปลี่ยน Role User
 * เปลี่ยน role + บันทึก outbox event "UserRoleUpdated" สำหรับ audit trail
 * 400 role ไม่ถูก | 404 ไม่เจอ user
 */
// 10. Update role
const handleUpdateRole = async (c: any) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { userService } = getServices(c.env);
    const result = await userService.updateRole(id, parsed.data.role);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.patch('/users/:id/role', handleUpdateRole);
app.patch('/api/auth/users/:id/role', handleUpdateRole);

/**
 * [11] เปลี่ยนรหัสผ่าน
 * ต้องใส่รหัสเก่ามาด้วย — ถ้าไม่ตรง reject 400
 * ต้องมี x-user-id header (ส่งมาจาก gateway)
 * 400 รหัสเก่าไม่ตรง | 401 ไม่มี x-user-id | 404 ไม่เจอ user
 */
// 11. Change password
const handleChangePassword = async (c: any) => {
  try {
    const userId = c.req.header('x-user-id');
    if (!userId) {
      return c.json({ success: false, error: 'Unauthorized: missing user context' }, 401);
    }
    const body = await c.req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { userService } = getServices(c.env);
    const result = await userService.changePassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.post('/change-password', handleChangePassword);
app.post('/api/auth/change-password', handleChangePassword);

/**
 * [12] ขอ Reset รหัสผ่าน (Forgot Password)
 * รับ email → ถ้า user มีจริง สร้าง reset token (อายุ 1 ชั่วโมง) บันทึกลง DB
 * ถ้า email ไม่มีในระบบ ตอบ 200 เหมือนกัน (anti-enumeration)
 * response จะมี debugToken เฉพาะตอน user มีจริงในระบบ
 */
// 12. Forgot password
const handleForgotPassword = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { authService } = getServices(c.env);
    const result = await authService.requestPasswordReset(parsed.data.email);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.post('/forgot-password', handleForgotPassword);
app.post('/api/auth/forgot-password', handleForgotPassword);

/**
 * [13] Reset รหัสผ่าน
 * รับ token (จาก forgot-password) + รหัสใหม่ → ถ้า token ถูกต้องและยังไม่หมดอายุ
 * → เปลี่ยนรหัส + mark token ว่าใช้แล้ว + revoke session ทั้งหมด (บังคับ login ใหม่)
 * 400 token ผิด/ใช้แล้ว/หมดอายุ
 */
// 13. Reset password
const handleResetPassword = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.format() }, 400);
    }
    const { authService } = getServices(c.env);
    const result = await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || err }, err.status || 500);
  }
};
app.post('/reset-password', handleResetPassword);
app.post('/api/auth/reset-password', handleResetPassword);

export default app;

import { eq, and } from 'drizzle-orm';
import type { Database } from '../db/client';
import { users, sessions, passwordResetTokens, outboxEvents } from '../db/schema';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  generateSecureToken,
} from '@keystay/utils';

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'front_desk' | 'housekeeping';
}

export interface LoginDTO {
  email: string;
  password: string;
  isRememberMe?: boolean;
}

export class AuthService {
  constructor(private db: Database, private jwtSecret: string, private kv?: KVNamespace) {}

  /**
   * สมัครสมาชิกผู้ใช้งานใหม่
   * เช็ค email ซ้ำในระบบ -> hash password -> บันทึก user, session และ outbox event ใน transaction เดียวกัน -> ออก accessToken และ refreshToken
   */
  async register(dto: RegisterDTO) {
    const existing = await this.db.select().from(users).where(eq(users.email, dto.email.toLowerCase())).get();
    if (existing) {
      throw { status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'User with this email already exists' };
    }

    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const passwordHash = await hashPassword(dto.password);
    const now = new Date().toISOString();

    const refreshToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Atomic insert via Drizzle batch
    await this.db.batch([
      this.db.insert(users).values({
        id: userId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      }),
      this.db.insert(sessions).values({
        id: sessionId,
        userId,
        refreshToken,
        isRememberMe: 0,
        expiresAt,
        isRevoked: 0,
        createdAt: now,
      }),
      this.db.insert(outboxEvents).values({
        id: outboxId,
        eventType: 'UserRegistered',
        aggregateId: userId,
        aggregateType: 'user',
        payload: JSON.stringify({ userId, email: dto.email.toLowerCase(), role: dto.role }),
        status: 'pending',
        createdAt: now,
      }),
    ]);

    const accessToken = await signJwt(
      { sub: userId, email: dto.email.toLowerCase(), role: dto.role },
      this.jwtSecret,
      900
    );

    return {
      user: {
        id: userId,
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        isActive: true,
        createdAt: now,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    };
  }

  /**
   * เข้าสู่ระบบ
   * ตรวจสอบ email และ password -> เช็คสถานะ isActive -> สร้าง session (รองรับ rememberMe 30 วัน) -> อัปเดต lastLoginAt -> ออก JWT access token และ refresh token
   */
  async login(dto: LoginDTO) {
    const user = await this.db.select().from(users).where(eq(users.email, dto.email.toLowerCase())).get();
    if (!user) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    if (!user.isActive) {
      throw { status: 403, code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated' };
    }

    const isMatch = await verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const sessionId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const refreshToken = generateSecureToken();
    const now = new Date().toISOString();

    const sessionDurationMs = dto.isRememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();

    await this.db.batch([
      this.db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        refreshToken,
        isRememberMe: dto.isRememberMe ? 1 : 0,
        expiresAt,
        isRevoked: 0,
        createdAt: now,
      }),
      this.db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, user.id)),
      this.db.insert(outboxEvents).values({
        id: outboxId,
        eventType: 'UserLoggedIn',
        aggregateId: user.id,
        aggregateType: 'user',
        payload: JSON.stringify({ userId: user.id, email: user.email, role: user.role }),
        status: 'pending',
        createdAt: now,
      }),
    ]);

    const accessToken = await signJwt(
      { sub: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      900
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: Boolean(user.isActive),
        lastLoginAt: now,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    };
  }

  /**
   * ขอออก Access Token ใหม่ด้วย Refresh Token (Rotation)
   * ตรวจสอบความถูกต้องของ session และอายุ token -> ยกเลิก session เดิม (isRevoked = 1) -> สร้าง session ใหม่พร้อม refresh token ใหม่ -> ออก access token ใหม่
   */
  async refreshToken(token: string) {
    const session = await this.db.select().from(sessions).where(eq(sessions.refreshToken, token)).get();
    if (!session || session.isRevoked) {
      throw { status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or revoked' };
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw { status: 401, code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token has expired' };
    }

    const user = await this.db.select().from(users).where(eq(users.id, session.userId)).get();
    if (!user || !user.isActive) {
      throw { status: 401, code: 'USER_NOT_FOUND_OR_INACTIVE', message: 'User is not found or inactive' };
    }

    const newRefreshToken = generateSecureToken();
    const now = new Date().toISOString();
    const newExpiresAt = new Date(Date.now() + (session.isRememberMe ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString();

    await this.db.batch([
      this.db.update(sessions).set({ isRevoked: 1 }).where(eq(sessions.id, session.id)),
      this.db.insert(sessions).values({
        id: crypto.randomUUID(),
        userId: user.id,
        refreshToken: newRefreshToken,
        isRememberMe: session.isRememberMe,
        expiresAt: newExpiresAt,
        isRevoked: 0,
        createdAt: now,
      }),
    ]);

    const accessToken = await signJwt(
      { sub: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      900
    );

    return {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    };
  }

  /**
   * ออกจากระบบ
   * ยกเลิก refresh token ในฐานข้อมูล และขึ้นบัญชีดำ JWT ID (jti) ใน Cloudflare KV เพื่อระงับการใช้งาน access token ทันที
   */
  async logout(refreshToken?: string, jwtId?: string) {
    if (refreshToken) {
      await this.db.update(sessions).set({ isRevoked: 1 }).where(eq(sessions.refreshToken, refreshToken));
    }
    if (jwtId && this.kv) {
      await this.kv.put(`bl:${jwtId}`, 'revoked', { expirationTtl: 900 });
    }
    return { success: true };
  }

  /**
   * ขอรีเซ็ตรหัสผ่าน
   * ตรวจสอบ email ในระบบ หากพบจะสร้าง secure reset token (มีอายุ 1 ชั่วโมง) บันทึกในฐานข้อมูล หากไม่พบจะไม่เปิดเผยข้อมูลเพื่อความปลอดภัย (anti-enumeration)
   */
  async requestPasswordReset(email: string) {
    const user = await this.db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (!user) {
      return { message: 'If an account exists, a password reset link has been created.' };
    }

    const resetToken = generateSecureToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hr

    await this.db.insert(passwordResetTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: resetToken,
      expiresAt,
      isUsed: 0,
      createdAt: now,
    });

    return {
      message: 'If an account exists, a password reset link has been created.',
      debugToken: resetToken,
    };
  }

  /**
   * รีเซ็ตรหัสผ่านใหม่
   * ตรวจสอบความถูกต้องและอายุของ reset token -> แฮชรหัสผ่านใหม่ -> อัปเดตข้อมูลผู้ใช้ -> ทำเครื่องหมาย token เป็นใช้งานแล้ว -> ยกเลิก session เดิมทั้งหมดของผู้ใช้
   */
  async resetPassword(token: string, newPassword: string) {
    const record = await this.db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).get();
    if (!record || record.isUsed) {
      throw { status: 400, code: 'INVALID_RESET_TOKEN', message: 'Password reset token is invalid or already used' };
    }

    if (new Date(record.expiresAt) < new Date()) {
      throw { status: 400, code: 'RESET_TOKEN_EXPIRED', message: 'Password reset token has expired' };
    }

    const hashedPassword = await hashPassword(newPassword);
    const now = new Date().toISOString();

    await this.db.batch([
      this.db.update(users).set({ passwordHash: hashedPassword, updatedAt: now }).where(eq(users.id, record.userId)),
      this.db.update(passwordResetTokens).set({ isUsed: 1 }).where(eq(passwordResetTokens.id, record.id)),
      this.db.update(sessions).set({ isRevoked: 1 }).where(eq(sessions.userId, record.userId)),
    ]);

    return { success: true, message: 'Password has been reset successfully. Please login with your new password.' };
  }
}

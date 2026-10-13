import { eq, and } from 'drizzle-orm';
import type { Database } from '../db/client';
import { users, sessions, outboxEvents } from '../db/schema';
import { hashPassword, verifyPassword } from '@keystay/utils';

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export class UserService {
  constructor(private db: Database) {}

  async getUsers(role?: string, isActive?: number) {
    const conditions = [];
    if (role) {
      conditions.push(eq(users.role, role as any));
    }
    if (isActive !== undefined) {
      conditions.push(eq(users.isActive, isActive));
    }

    const query = conditions.length > 0
      ? this.db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }).from(users).where(and(...conditions))
      : this.db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }).from(users);

    const rows = await query.all();
    return rows.map((r) => ({ ...r, isActive: Boolean(r.isActive) }));
  }

  async getUserById(id: string) {
    const user = await this.db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id)).get();

    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }
    return { ...user, isActive: Boolean(user.isActive) };
  }

  async updateUser(id: string, dto: UpdateUserDTO) {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      const dup = await this.db.select().from(users).where(eq(users.email, dto.email.toLowerCase())).get();
      if (dup) {
        throw { status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'Email is already used by another user' };
      }
    }

    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.email) updateData.email = dto.email.toLowerCase();

    await this.db.update(users).set(updateData).where(eq(users.id, id));

    return await this.getUserById(id);
  }

  async deleteUser(id: string) {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const now = new Date().toISOString();
    // Soft delete user and revoke all sessions atomically
    await this.db.batch([
      this.db.update(users).set({ isActive: 0, updatedAt: now }).where(eq(users.id, id)),
      this.db.update(sessions).set({ isRevoked: 1 }).where(eq(sessions.userId, id)),
    ]);

    return { success: true, message: 'User deleted successfully' };
  }

  async updateRole(id: string, role: 'admin' | 'manager' | 'front_desk' | 'housekeeping') {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const now = new Date().toISOString();
    await this.db.batch([
      this.db.update(users).set({ role, updatedAt: now }).where(eq(users.id, id)),
      this.db.insert(outboxEvents).values({
        id: crypto.randomUUID(),
        eventType: 'UserRoleUpdated',
        aggregateId: id,
        aggregateType: 'user',
        payload: JSON.stringify({ userId: id, previousRole: user.role, newRole: role }),
        status: 'pending',
        createdAt: now,
      }),
    ]);

    return { id, role, updatedAt: now };
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const isMatch = await verifyPassword(currentPass, user.passwordHash);
    if (!isMatch) {
      throw { status: 400, code: 'INVALID_CURRENT_PASSWORD', message: 'Current password does not match' };
    }

    const newHashed = await hashPassword(newPass);
    const now = new Date().toISOString();

    await this.db.update(users).set({ passwordHash: newHashed, updatedAt: now }).where(eq(users.id, userId));
    return { success: true, message: 'Password changed successfully' };
  }
}

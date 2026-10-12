import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 1. Users Table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'front_desk', 'housekeeping'] }).notNull(),
  isActive: integer('is_active').notNull().default(1),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 2. Sessions Table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  isRememberMe: integer('is_remember_me').notNull().default(0),
  expiresAt: text('expires_at').notNull(),
  isRevoked: integer('is_revoked').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

// 3. Permissions Table
export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  role: text('role').notNull(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  createdAt: text('created_at').notNull(),
});

// 4. Password Reset Tokens Table
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  isUsed: integer('is_used').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

// 5. Outbox Events Table
export const outboxEvents = sqliteTable('outbox_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('pending'),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import { createMockKV } from '../helpers/mock-kv';
import { TEST_JWT_SECRET } from '../helpers/auth';
import app, { type Env } from '../../services/auth-user/src/index';

describe('Auth & User Service (Khet - @hazeco)', () => {
  let mockDb: D1Database;
  let mockKv: KVNamespace;
  let env: Env;
  let sqliteDb: DatabaseSync;

  beforeEach(() => {
    sqliteDb = new DatabaseSync(':memory:');
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/auth-user/schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);

    mockDb = createMockD1(sqliteDb);
    mockKv = createMockKV();
    env = {
      DB: mockDb,
      KV: mockKv,
      JWT_SECRET: TEST_JWT_SECRET,
      ENVIRONMENT: 'test',
    };
  });

  describe('Health Check', () => {
    it('SUCCESS: returns 200 with service status', async () => {
      const res = await app.request('/health', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body.status).to.equal('ok');
      expect(body.service).to.equal('auth-user');
    });
  });

  describe('API #1: POST /register', () => {
    it('SUCCESS: registers a new user with valid details and returns 201', async () => {
      const payload = {
        email: 'admin@keystay.local',
        password: 'Password123!',
        firstName: 'Khetsophon',
        lastName: 'Ainautoon',
        role: 'admin',
      };

      const res = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.user.email).to.equal('admin@keystay.local');
      expect(json.data.user.role).to.equal('admin');
      expect(json.data.tokens.accessToken).to.be.a('string');
      expect(json.data.tokens.refreshToken).to.be.a('string');
    });

    it('BAD: returns 409 conflict when registering with already existing email', async () => {
      const payload = {
        email: 'duplicate@keystay.local',
        password: 'Password123!',
        firstName: 'First',
        lastName: 'User',
        role: 'front_desk',
      };

      // First registration
      const res1 = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );
      expect(res1.status).to.equal(201);

      // Second registration with duplicate email
      const res2 = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );
      expect(res2.status).to.equal(409);
      const json = await res2.json();
      expect(json.success).to.be.false;
      expect(json.error).to.include('already exists');
    });

    it('BAD: returns 400 validation error when password is less than 8 characters', async () => {
      const payload = {
        email: 'shortpass@keystay.local',
        password: '123',
        firstName: 'Short',
        lastName: 'Pass',
      };

      const res = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(400);
      const json = await res.json();
      expect(json.success).to.be.false;
    });

    it('BAD: returns 400 validation error when email format is invalid', async () => {
      const payload = {
        email: 'not-an-email',
        password: 'ValidPassword123!',
        firstName: 'Invalid',
        lastName: 'Email',
      };

      const res = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(400);
      const json = await res.json();
      expect(json.success).to.be.false;
    });
  });

  describe('API #2: POST /login', () => {
    beforeEach(async () => {
      // Seed a test user
      await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'testlogin@keystay.local',
            password: 'CorrectPassword123!',
            firstName: 'Login',
            lastName: 'Test',
            role: 'manager',
          }),
        },
        env
      );
    });

    it('SUCCESS: logs in successfully with valid credentials', async () => {
      const res = await app.request(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'testlogin@keystay.local',
            password: 'CorrectPassword123!',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.user.email).to.equal('testlogin@keystay.local');
      expect(json.data.tokens.accessToken).to.be.a('string');
      expect(json.data.tokens.refreshToken).to.be.a('string');
    });

    it('BAD: returns 401 when password is wrong', async () => {
      const res = await app.request(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'testlogin@keystay.local',
            password: 'WrongPassword!',
          }),
        },
        env
      );

      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
    });

    it('BAD: returns 401 when user does not exist', async () => {
      const res = await app.request(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'nonexistent@keystay.local',
            password: 'Password123!',
          }),
        },
        env
      );

      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
    });

    it('BAD: returns 400 when missing required password field', async () => {
      const res = await app.request(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'testlogin@keystay.local',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
      const json = await res.json();
      expect(json.success).to.be.false;
    });
  });

  describe('API #3: POST /refresh-token', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      const res = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'refreshtest@keystay.local',
            password: 'Password123!',
            firstName: 'Refresh',
            lastName: 'Token',
            role: 'front_desk',
          }),
        },
        env
      );
      const json = await res.json();
      validRefreshToken = json.data.tokens.refreshToken;
    });

    it('SUCCESS: returns new accessToken when valid refreshToken is supplied', async () => {
      const res = await app.request(
        '/refresh-token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: validRefreshToken }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.tokens.accessToken).to.be.a('string');
    });

    it('BAD: returns 401 when given an invalid or fake refresh token', async () => {
      const res = await app.request(
        '/refresh-token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'totally-fake-token-xyz' }),
        },
        env
      );

      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
    });

    it('BAD: returns 400 when refreshToken body is missing', async () => {
      const res = await app.request(
        '/refresh-token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #4: POST /logout', () => {
    it('SUCCESS: logs out and invalidates session token', async () => {
      const reg = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'logoutuser@keystay.local',
            password: 'Password123!',
            firstName: 'Log',
            lastName: 'Out',
            role: 'front_desk',
          }),
        },
        env
      );
      const { data } = await reg.json();

      const res = await app.request(
        '/logout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.tokens.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: data.tokens.refreshToken }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;

      // Ensure refresh token is now revoked
      const refRes = await app.request(
        '/refresh-token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: data.tokens.refreshToken }),
        },
        env
      );
      expect(refRes.status).to.equal(401);
    });
  });

  describe('API #5: GET /me', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      const reg = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'meuser@keystay.local',
            password: 'Password123!',
            firstName: 'Me',
            lastName: 'User',
            role: 'housekeeping',
          }),
        },
        env
      );
      const json = await reg.json();
      token = json.data.tokens.accessToken;
      userId = json.data.user.id;
    });

    it('SUCCESS: returns user profile with valid Bearer token', async () => {
      const res = await app.request(
        '/me',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.email).to.equal('meuser@keystay.local');
      expect(json.data.role).to.equal('housekeeping');
    });

    it('SUCCESS: returns user profile with x-user-id header', async () => {
      const res = await app.request(
        '/me',
        {
          method: 'GET',
          headers: { 'x-user-id': userId },
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.data.id).to.equal(userId);
    });

    it('BAD: returns 401 when no auth header is provided', async () => {
      const res = await app.request('/me', { method: 'GET' }, env);
      expect(res.status).to.equal(401);
    });

    it('BAD: returns 401 when invalid Bearer token is provided', async () => {
      const res = await app.request(
        '/me',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer totally.invalid.jwt' },
        },
        env
      );
      expect(res.status).to.equal(401);
    });
  });

  describe('API #6: GET /users & Filtering', () => {
    beforeEach(async () => {
      await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user1@keystay.local',
            password: 'Password123!',
            firstName: 'User',
            lastName: 'One',
            role: 'admin',
          }),
        },
        env
      );
      await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user2@keystay.local',
            password: 'Password123!',
            firstName: 'User',
            lastName: 'Two',
            role: 'housekeeping',
          }),
        },
        env
      );
    });

    it('SUCCESS: lists all registered users', async () => {
      const res = await app.request('/users', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.length).to.be.at.least(2);
    });

    it('SUCCESS: filters users by role', async () => {
      const res = await app.request('/users?role=housekeeping', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.data.every((u: any) => u.role === 'housekeeping')).to.be.true;
    });
  });

  describe('API #7: GET /users/:id', () => {
    let createdUserId: string;

    beforeEach(async () => {
      const reg = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'findme@keystay.local',
            password: 'Password123!',
            firstName: 'Find',
            lastName: 'Me',
            role: 'front_desk',
          }),
        },
        env
      );
      const json = await reg.json();
      createdUserId = json.data.user.id;
    });

    it('SUCCESS: returns user by ID', async () => {
      const res = await app.request(`/users/${createdUserId}`, { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.data.id).to.equal(createdUserId);
      expect(json.data.email).to.equal('findme@keystay.local');
    });

    it('BAD: returns 404 when user ID does not exist', async () => {
      const res = await app.request('/users/nonexistent-uuid-999', { method: 'GET' }, env);
      expect(res.status).to.equal(404);
      const json = await res.json();
      expect(json.success).to.be.false;
    });
  });

  describe('API #8: PUT /users/:id', () => {
    let createdUserId: string;

    beforeEach(async () => {
      const reg = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'update@keystay.local',
            password: 'Password123!',
            firstName: 'Original',
            lastName: 'Name',
            role: 'front_desk',
          }),
        },
        env
      );
      const json = await reg.json();
      createdUserId = json.data.user.id;
    });

    it('SUCCESS: updates user first and last name', async () => {
      const res = await app.request(
        `/users/${createdUserId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName: 'UpdatedFirst', lastName: 'UpdatedLast' }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.data.firstName).to.equal('UpdatedFirst');
      expect(json.data.lastName).to.equal('UpdatedLast');
    });

    it('BAD: returns 404 when updating non-existent user ID', async () => {
      const res = await app.request(
        '/users/fake-id-12345',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName: 'Nobody' }),
        },
        env
      );

      expect(res.status).to.equal(404);
    });

    it('BAD: returns 400 when invalid email format is passed', async () => {
      const res = await app.request(
        `/users/${createdUserId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'invalid-email-address' }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #9: DELETE /users/:id (Soft Delete)', () => {
    let createdUserId: string;

    beforeEach(async () => {
      const reg = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'delete@keystay.local',
            password: 'Password123!',
            firstName: 'To',
            lastName: 'Delete',
            role: 'front_desk',
          }),
        },
        env
      );
      const json = await reg.json();
      createdUserId = json.data.user.id;
    });

    it('SUCCESS: deactivates user (is_active = 0)', async () => {
      const res = await app.request(`/users/${createdUserId}`, { method: 'DELETE' }, env);
      expect(res.status).to.equal(200);

      // Verify user is deactivated
      const check = await app.request(`/users/${createdUserId}`, { method: 'GET' }, env);
      const json = await check.json();
      expect(json.data.isActive).to.be.false;
    });

    it('BAD: returns 404 when deleting a non-existent user', async () => {
      const res = await app.request('/users/nonexistent-id-000', { method: 'DELETE' }, env);
      expect(res.status).to.equal(404);
    });
  });

  describe('API #10: PATCH /users/:id/role', () => {
    let createdUserId: string;

    beforeEach(async () => {
      const reg = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'rolechange@keystay.local',
            password: 'Password123!',
            firstName: 'Role',
            lastName: 'Tester',
            role: 'front_desk',
          }),
        },
        env
      );
      const json = await reg.json();
      createdUserId = json.data.user.id;
    });

    it('SUCCESS: updates user role to manager', async () => {
      const res = await app.request(
        `/users/${createdUserId}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'manager' }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.data.role).to.equal('manager');
    });

    it('BAD: returns 400 when invalid role string is supplied', async () => {
      const res = await app.request(
        `/users/${createdUserId}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'super_god_hacker' }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });

    it('BAD: returns 404 when updating role for non-existent user', async () => {
      const res = await app.request(
        '/users/fake-id-999/role',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'admin' }),
        },
        env
      );

      expect(res.status).to.equal(404);
    });
  });

  describe('API #11: POST /change-password', () => {
    let userId: string;

    beforeEach(async () => {
      const reg = await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'changepass@keystay.local',
            password: 'OldPassword123!',
            firstName: 'Pass',
            lastName: 'Change',
            role: 'manager',
          }),
        },
        env
      );
      const json = await reg.json();
      userId = json.data.user.id;
    });

    it('SUCCESS: changes password when current password matches', async () => {
      const res = await app.request(
        '/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            currentPassword: 'OldPassword123!',
            newPassword: 'BrandNewPassword2026!',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;

      // Verify login works with new password
      const loginRes = await app.request(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'changepass@keystay.local',
            password: 'BrandNewPassword2026!',
          }),
        },
        env
      );
      expect(loginRes.status).to.equal(200);
    });

    it('BAD: returns 400 when current password is wrong', async () => {
      const res = await app.request(
        '/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            currentPassword: 'WrongCurrentPassword',
            newPassword: 'BrandNewPassword2026!',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
      const json = await res.json();
      expect(json.error).to.include('Current password does not match');
    });

    it('BAD: returns 401 when x-user-id header is missing', async () => {
      const res = await app.request(
        '/change-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: 'OldPassword123!',
            newPassword: 'BrandNewPassword2026!',
          }),
        },
        env
      );

      expect(res.status).to.equal(401);
    });

    it('BAD: returns 400 when new password is too short (< 8 chars)', async () => {
      const res = await app.request(
        '/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            currentPassword: 'OldPassword123!',
            newPassword: 'short',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #12 & #13: Forgot & Reset Password Flow', () => {
    beforeEach(async () => {
      await app.request(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'forgotme@keystay.local',
            password: 'OldPassword123!',
            firstName: 'Forgot',
            lastName: 'Me',
            role: 'front_desk',
          }),
        },
        env
      );
    });

    it('SUCCESS: creates a password reset token and completes password reset', async () => {
      // 1. Request reset
      const forgotRes = await app.request(
        '/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'forgotme@keystay.local' }),
        },
        env
      );
      expect(forgotRes.status).to.equal(200);
      const forgotJson = await forgotRes.json();
      const token = forgotJson.data.debugToken;
      expect(token).to.be.a('string');

      // 2. Perform reset
      const resetRes = await app.request(
        '/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            newPassword: 'ResetPasswordSuccess2026!',
          }),
        },
        env
      );
      expect(resetRes.status).to.equal(200);

      // 3. Login with new password
      const loginRes = await app.request(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'forgotme@keystay.local',
            password: 'ResetPasswordSuccess2026!',
          }),
        },
        env
      );
      expect(loginRes.status).to.equal(200);
    });

    it('BAD: does not return debugToken when forgot-password requested for non-existent email (anti-enumeration)', async () => {
      const res = await app.request(
        '/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'unknown@keystay.local' }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.data.debugToken).to.be.undefined;
    });

    it('BAD: returns 400 when reset-password is used with an invalid/forged token', async () => {
      const res = await app.request(
        '/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'fake-invalid-token',
            newPassword: 'NewPassword123!',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });
});

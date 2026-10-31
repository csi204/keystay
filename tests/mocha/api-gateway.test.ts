import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { createMockKV } from '../helpers/mock-kv';
import { TEST_JWT_SECRET, createTestToken } from '../helpers/auth';
import app, { type Env } from '../../services/api-gateway/src/index';

describe('API Gateway Service (Khet - @hazeco)', () => {
  let mockKv: KVNamespace;
  let env: Env;

  // Mock service fetchers
  const createMockFetcher = (responseBody: any, status = 200): Fetcher => ({
    fetch: async () => new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  } as any);

  beforeEach(() => {
    mockKv = createMockKV();
    env = {
      AUTH_USER_SERVICE: createMockFetcher({ service: 'auth-user', ok: true }),
      ROOM_INVENTORY_SERVICE: createMockFetcher({ service: 'room-inventory', ok: true }),
      RESERVATION_SERVICE: createMockFetcher({ service: 'reservation', ok: true }),
      HOUSEKEEPING_SERVICE: createMockFetcher({ service: 'housekeeping', ok: true }),
      BILLING_SERVICE: createMockFetcher({ service: 'billing', ok: true }),
      REPORT_ANALYTICS_SERVICE: createMockFetcher({ service: 'report-analytics', ok: true }),
      KV: mockKv,
      JWT_SECRET: TEST_JWT_SECRET,
      ENVIRONMENT: 'test',
    };
  });

  describe('Health Check & Gateway Info', () => {
    it('SUCCESS: returns 200 with gateway status', async () => {
      const res = await app.request('/health', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.status).to.equal('ok');
      expect(json.service).to.equal('api-gateway');
    });

    it('SUCCESS: returns root gateway service index', async () => {
      const res = await app.request('/', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.name).to.equal('KEYSTAY API Gateway');
      expect(json.services).to.be.an('array');
    });
  });

  describe('Security Headers Middleware', () => {
    it('SUCCESS: includes standard enterprise security headers on all responses', async () => {
      const res = await app.request('/health', { method: 'GET' }, env);
      expect(res.headers.get('x-content-type-options')).to.equal('nosniff');
      expect(res.headers.get('x-frame-options')).to.equal('DENY');
      expect(res.headers.get('referrer-policy')).to.equal('strict-origin-when-cross-origin');
    });
  });

  describe('CORS Enforcement Middleware', () => {
    it('SUCCESS: allows authorized localhost development origin', async () => {
      const res = await app.request(
        '/health',
        {
          method: 'GET',
          headers: { Origin: 'http://localhost:5173' },
        },
        env
      );
      expect(res.headers.get('access-control-allow-origin')).to.equal('http://localhost:5173');
    });

    it('BAD: rejects unauthorized/malicious external origin', async () => {
      const res = await app.request(
        '/health',
        {
          method: 'GET',
          headers: { Origin: 'http://malicious-phishing-site.xyz' },
        },
        env
      );
      expect(res.headers.get('access-control-allow-origin')).to.be.null;
    });
  });

  describe('Rate Limiting (120 req/min limit)', () => {
    it('BAD: returns 429 RATE_LIMIT_EXCEEDED when IP quota is exceeded', async () => {
      const ip = '192.168.1.100';
      const nowMinute = Math.floor(Date.now() / 60000);
      const rateLimitKey = `ratelimit:${ip}:${nowMinute}`;

      // Simulate rate limit already exceeded in KV
      await mockKv.put(rateLimitKey, '125');

      const res = await app.request(
        '/health',
        {
          method: 'GET',
          headers: { 'cf-connecting-ip': ip },
        },
        env
      );

      expect(res.status).to.equal(429);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error.code).to.equal('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('JWT Authentication Guard', () => {
    it('SUCCESS: allows public routes without Authorization header', async () => {
      const res = await app.request(
        '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@keystay.local', password: 'Password123!' }),
        },
        env
      );
      // Passes through to mock service
      expect(res.status).to.equal(200);
    });

    it('BAD: returns 401 UNAUTHORIZED when Authorization header is missing on protected route', async () => {
      const res = await app.request('/api/rooms', { method: 'GET' }, env);
      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error.code).to.equal('UNAUTHORIZED');
    });

    it('BAD: returns 401 INVALID_TOKEN when Bearer token is malformed/fake', async () => {
      const res = await app.request(
        '/api/rooms',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer fake.invalid.jwt.token' },
        },
        env
      );
      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.error.code).to.equal('INVALID_TOKEN');
    });

    it('BAD: returns 401 TOKEN_REVOKED when token JTI is blacklisted in KV (Logged Out)', async () => {
      const jti = 'blacklisted-jti-session-123';
      await mockKv.put(`blacklist:${jti}`, 'revoked');

      const revokedToken = await createTestToken({
        sub: 'user-1',
        email: 'user1@keystay.local',
        role: 'admin',
        jti,
      });

      const res = await app.request(
        '/api/rooms',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${revokedToken}` },
        },
        env
      );

      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.error.code).to.equal('TOKEN_REVOKED');
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('SUCCESS: ADMIN has unrestricted access across all routes and services', async () => {
      const adminToken = await createTestToken({
        sub: 'admin-1',
        email: 'admin@keystay.local',
        role: 'admin',
      });

      const resReports = await app.request(
        '/api/reports/kpis',
        { method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } },
        env
      );
      expect(resReports.status).to.equal(200);

      const resBills = await app.request(
        '/api/bills',
        { method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } },
        env
      );
      expect(resBills.status).to.equal(200);
    });

    it('SUCCESS: HOUSEKEEPING can access housekeeping tasks and rooms', async () => {
      const hkToken = await createTestToken({
        sub: 'hk-1',
        email: 'housekeeper@keystay.local',
        role: 'housekeeping',
      });

      const res = await app.request(
        '/api/housekeeping/tasks',
        { method: 'GET', headers: { Authorization: `Bearer ${hkToken}` } },
        env
      );
      expect(res.status).to.equal(200);
    });

    it('BAD: HOUSEKEEPING is denied access (403 FORBIDDEN) to reports and analytics', async () => {
      const hkToken = await createTestToken({
        sub: 'hk-1',
        email: 'housekeeper@keystay.local',
        role: 'housekeeping',
      });

      const res = await app.request(
        '/api/reports/kpis',
        { method: 'GET', headers: { Authorization: `Bearer ${hkToken}` } },
        env
      );
      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.error.code).to.equal('FORBIDDEN');
    });

    it('SUCCESS: FRONT_DESK can access reservations and billing', async () => {
      const fdToken = await createTestToken({
        sub: 'fd-1',
        email: 'frontdesk@keystay.local',
        role: 'front_desk',
      });

      const res = await app.request(
        '/api/reservations',
        { method: 'GET', headers: { Authorization: `Bearer ${fdToken}` } },
        env
      );
      expect(res.status).to.equal(200);
    });

    it('BAD: FRONT_DESK is denied access (403 FORBIDDEN) to executive reports', async () => {
      const fdToken = await createTestToken({
        sub: 'fd-1',
        email: 'frontdesk@keystay.local',
        role: 'front_desk',
      });

      const res = await app.request(
        '/api/reports/revenue-daily',
        { method: 'GET', headers: { Authorization: `Bearer ${fdToken}` } },
        env
      );
      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.error.code).to.equal('FORBIDDEN');
    });

    it('BAD: FRONT_DESK is denied access (403 FORBIDDEN) to modify user roles', async () => {
      const fdToken = await createTestToken({
        sub: 'fd-1',
        email: 'frontdesk@keystay.local',
        role: 'front_desk',
      });

      const res = await app.request(
        '/api/auth/users/user-123/role',
        { method: 'PATCH', headers: { Authorization: `Bearer ${fdToken}` } },
        env
      );
      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.error.code).to.equal('FORBIDDEN');
    });

    it('SUCCESS: MANAGER can access reports and reservations', async () => {
      const mgrToken = await createTestToken({
        sub: 'mgr-1',
        email: 'manager@keystay.local',
        role: 'manager',
      });

      const res = await app.request(
        '/api/reports/kpis',
        { method: 'GET', headers: { Authorization: `Bearer ${mgrToken}` } },
        env
      );
      expect(res.status).to.equal(200);
    });

    it('BAD: MANAGER is denied access (403 FORBIDDEN) to alter user roles', async () => {
      const mgrToken = await createTestToken({
        sub: 'mgr-1',
        email: 'manager@keystay.local',
        role: 'manager',
      });

      const res = await app.request(
        '/api/auth/users/user-123/role',
        { method: 'PATCH', headers: { Authorization: `Bearer ${mgrToken}` } },
        env
      );
      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.error.code).to.equal('FORBIDDEN');
    });

    it('BAD: MANAGER is denied access (403 FORBIDDEN) to delete user accounts', async () => {
      const mgrToken = await createTestToken({
        sub: 'mgr-1',
        email: 'manager@keystay.local',
        role: 'manager',
      });

      const res = await app.request(
        '/api/auth/users/user-123',
        { method: 'DELETE', headers: { Authorization: `Bearer ${mgrToken}` } },
        env
      );
      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.error.code).to.equal('FORBIDDEN');
    });
  });
});


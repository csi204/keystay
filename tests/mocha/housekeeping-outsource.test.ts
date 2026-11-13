import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import { TEST_JWT_SECRET, createTestToken } from '../helpers/auth';
import app, { type Env } from '../../services/housekeeping/src/index';

describe('Housekeeping & Outsource Service (Boon - @Legxcy77)', () => {
  let mockDb: ReturnType<typeof createMockD1>;
  let env: Env;
  let sqliteDb: DatabaseSync;

  // Test JWT tokens for different roles
  let adminToken: string;
  let housekeepingToken: string;
  let frontDeskToken: string;
  let managerToken: string;

  beforeEach(async () => {
    sqliteDb = new DatabaseSync(':memory:');

    // 1. Load D1 Schema
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/housekeeping/schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);

    // 2. Load Seed Data (includes 5 outsource contacts from PR #24)
    const seedSql = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/seeds/04_housekeeping.sql'),
      'utf8'
    );
    sqliteDb.exec(seedSql);

    mockDb = createMockD1(sqliteDb);
    env = {
      DB: mockDb,
      ENVIRONMENT: 'test',
      JWT_SECRET: TEST_JWT_SECRET,
    };

    // Create test JWT tokens
    adminToken = await createTestToken({
      sub: 'usr-admin-001',
      email: 'admin@keystay.local',
      role: 'admin',
    });

    housekeepingToken = await createTestToken({
      sub: 'usr-hk-001',
      email: 'housekeeping@keystay.local',
      role: 'housekeeping',
    });

    frontDeskToken = await createTestToken({
      sub: 'usr-fd-001',
      email: 'frontdesk@keystay.local',
      role: 'front_desk',
    });

    managerToken = await createTestToken({
      sub: 'usr-mgr-001',
      email: 'manager@keystay.local',
      role: 'manager',
    });
  });

  // ==========================================
  // Health & Metadata
  // ==========================================
  describe('Health Check & Service Info', () => {
    it('SUCCESS: returns 200 with service status', async () => {
      const res = await app.request('/health', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.status).to.equal('ok');
      expect(json.service).to.equal('housekeeping');
    });

    it('SUCCESS: returns index including Outsource APIs #101-#105', async () => {
      const res = await app.request('/', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.endpoints).to.be.an('array');
      expect(json.endpoints.some((e: string) => e.includes('101. GET /housekeeping/outsource-contacts'))).to.be.true;
      expect(json.endpoints.some((e: string) => e.includes('105. DELETE /housekeeping/outsource-contacts/:id'))).to.be.true;
    });
  });

  // ==========================================
  // API #101: GET /housekeeping/outsource-contacts
  // ==========================================
  describe('API #101: GET /housekeeping/outsource-contacts', () => {
    it('SUCCESS: returns list of seeded outsource contacts', async () => {
      const res = await app.request('/housekeeping/outsource-contacts', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.count).to.be.greaterThanOrEqual(5);
      expect(json.data).to.be.an('array');
    });

    it('SUCCESS: filters by category (air_conditioning)', async () => {
      const res = await app.request('/housekeeping/outsource-contacts?category=air_conditioning', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.every((c: any) => c.category === 'air_conditioning')).to.be.true;
    });

    it('SUCCESS: filters by emergency status (is_emergency=1)', async () => {
      const res = await app.request('/housekeeping/outsource-contacts?is_emergency=1', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.every((c: any) => c.isEmergency === 1)).to.be.true;
    });

    it('SUCCESS: Read-Only access granted to Housekeeping role', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${housekeepingToken}` },
        },
        env
      );
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
    });

    it('SUCCESS: Read-Only access granted to Front Desk role', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts?is_emergency=1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${frontDeskToken}` },
        },
        env
      );
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
    });
  });

  // ==========================================
  // API #102: GET /housekeeping/outsource-contacts/:id
  // ==========================================
  describe('API #102: GET /housekeeping/outsource-contacts/:id', () => {
    it('SUCCESS: returns contact details for existing ID (out-001)', async () => {
      const res = await app.request('/housekeeping/outsource-contacts/out-001', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.id).to.equal('out-001');
      expect(json.data.name).to.equal('บจก. สยามแอร์เซอร์วิส');
    });

    it('BAD: returns 404 NOT_FOUND for non-existent contact ID', async () => {
      const res = await app.request('/housekeeping/outsource-contacts/out-non-existent-999', { method: 'GET' }, env);
      expect(res.status).to.equal(404);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error).to.equal('OUTSOURCE_CONTACT_NOT_FOUND');
    });
  });

  // ==========================================
  // API #103: POST /housekeeping/outsource-contacts
  // ==========================================
  describe('API #103: POST /housekeeping/outsource-contacts (Admin Master Data CRUD)', () => {
    const validPayload = {
      name: 'เอเชีย ลิฟต์ & บันไดเลื่อน เซอร์วิส',
      category: 'general_maintenance',
      serviceType: 'ตรวจเช็ค ซ่อมบำรุงลิฟต์โดยสาร 24 ชม.',
      phonePrimary: '082-999-1122',
      phoneSecondary: '02-999-0000',
      lineId: '@asialift24',
      isEmergency: '1',
      availableHours: '24 ชั่วโมง',
      priceRateNote: 'สัญญารายปี รวมอะไหล่แท้',
      rating: '4.9',
      address: '99/1 ถ.วิภาวดีรังสิต กทม.',
      notes: 'ติดต่อวิศวกรเวรประจำตึก',
      isActive: '1',
    };

    it('SUCCESS: creates a new outsource contact when caller is ADMIN', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(validPayload),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.name).to.equal(validPayload.name);
      expect(json.data.isEmergency).to.equal(1);
      expect(json.data.isActive).to.equal(1);
    });

    it('BAD: returns 403 FORBIDDEN when HOUSEKEEPING tries to create outsource contact', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${housekeepingToken}`,
          },
          body: JSON.stringify(validPayload),
        },
        env
      );

      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error).to.equal('ADMIN_ROLE_REQUIRED');
    });

    it('BAD: returns 403 FORBIDDEN when FRONT_DESK tries to create outsource contact', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${frontDeskToken}`,
          },
          body: JSON.stringify(validPayload),
        },
        env
      );

      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error).to.equal('ADMIN_ROLE_REQUIRED');
    });

    it('BAD: returns 403 FORBIDDEN when MANAGER tries to create outsource contact', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${managerToken}`,
          },
          body: JSON.stringify(validPayload),
        },
        env
      );

      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error).to.equal('ADMIN_ROLE_REQUIRED');
    });

    it('BAD: returns 401 UNAUTHORIZED when no authorization credentials are provided', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPayload),
        },
        env
      );

      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
    });

    it('BAD: returns 400 VALIDATION_ERROR when missing required fields (name / phonePrimary)', async () => {
      const invalidPayload = {
        category: 'air_conditioning',
        serviceType: 'ซ่อมแอร์',
      };

      const res = await app.request(
        '/housekeeping/outsource-contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(invalidPayload),
        },
        env
      );

      expect(res.status).to.equal(400);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error).to.equal('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // API #104: PUT /housekeeping/outsource-contacts/:id
  // ==========================================
  describe('API #104: PUT /housekeeping/outsource-contacts/:id', () => {
    it('SUCCESS: Admin updates contact phone and notes', async () => {
      const updatePayload = {
        phonePrimary: '089-999-7777',
        notes: 'อัปเดตเบอร์ตรงหัวหน้าช่างคุณสมศักดิ์',
      };

      const res = await app.request(
        '/housekeeping/outsource-contacts/out-001',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(updatePayload),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.phonePrimary).to.equal('089-999-7777');
      expect(json.data.notes).to.equal('อัปเดตเบอร์ตรงหัวหน้าช่างคุณสมศักดิ์');
    });

    it('BAD: returns 403 FORBIDDEN when non-admin attempts to update contact', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts/out-001',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${housekeepingToken}`,
          },
          body: JSON.stringify({ phonePrimary: '000-000-0000' }),
        },
        env
      );

      expect(res.status).to.equal(403);
    });

    it('BAD: returns 404 NOT_FOUND when updating non-existent contact ID', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts/out-not-found',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ phonePrimary: '089-111-2222' }),
        },
        env
      );

      expect(res.status).to.equal(404);
    });
  });

  // ==========================================
  // API #105: DELETE /housekeeping/outsource-contacts/:id
  // ==========================================
  describe('API #105: DELETE /housekeeping/outsource-contacts/:id (Soft Delete)', () => {
    it('SUCCESS: Admin deactivates contact (sets is_active = 0)', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts/out-005',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.isActive).to.equal(0);

      // Verify in DB that is_active is now 0
      const checkRes = await app.request('/housekeeping/outsource-contacts/out-005', { method: 'GET' }, env);
      const checkJson = await checkRes.json();
      expect(checkJson.data.isActive).to.equal(0);
    });

    it('BAD: returns 403 FORBIDDEN when non-admin attempts to delete/deactivate contact', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts/out-001',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${frontDeskToken}` },
        },
        env
      );

      expect(res.status).to.equal(403);
    });

    it('BAD: returns 404 NOT_FOUND when deactivating non-existent contact ID', async () => {
      const res = await app.request(
        '/housekeeping/outsource-contacts/out-ghost-id',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        },
        env
      );

      expect(res.status).to.equal(404);
    });
  });
});


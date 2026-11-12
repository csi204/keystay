import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import { TEST_JWT_SECRET, createTestToken } from '../helpers/auth';
import roomInventoryApp from '../../services/room-inventory/src/index';
import housekeepingApp from '../../services/housekeeping/src/index';

describe('Minibar Catalog & Housekeeping Task Templates & Lost & Found (@Legxcy77)', () => {
  let roomDb: ReturnType<typeof createMockD1>;
  let houseDb: ReturnType<typeof createMockD1>;
  let roomSqlite: DatabaseSync;
  let houseSqlite: DatabaseSync;

  // JWT Tokens for RBAC testing
  let ownerToken: string;
  let frontDeskToken: string;
  let housekeepingToken: string;

  beforeEach(async () => {
    // 1. Initialize Room Inventory in-memory SQLite
    roomSqlite = new DatabaseSync(':memory:');
    const roomSchemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/room-inventory/schema.sql'),
      'utf8'
    );
    roomSqlite.exec(roomSchemaSql);
    const roomSeedSql = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/seeds/02_room.sql'),
      'utf8'
    );
    roomSqlite.exec(roomSeedSql);
    roomDb = createMockD1(roomSqlite);

    // 2. Initialize Housekeeping in-memory SQLite
    houseSqlite = new DatabaseSync(':memory:');
    const houseSchemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/housekeeping/schema.sql'),
      'utf8'
    );
    houseSqlite.exec(houseSchemaSql);
    const houseSeedSql = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/seeds/04_housekeeping.sql'),
      'utf8'
    );
    houseSqlite.exec(houseSeedSql);
    houseDb = createMockD1(houseSqlite);

    // 3. Create test tokens
    ownerToken = await createTestToken({
      sub: 'usr-owner-001',
      email: 'owner@keystay.local',
      role: 'owner',
    });

    frontDeskToken = await createTestToken({
      sub: 'usr-fd-001',
      email: 'frontdesk@keystay.local',
      role: 'front_desk',
    });

    housekeepingToken = await createTestToken({
      sub: 'usr-hk-001',
      email: 'housekeeping@keystay.local',
      role: 'housekeeping',
    });
  });

  // ==========================================================================
  // SECTION 1: MINIBAR CATALOG CRUD (services/room-inventory)
  // ==========================================================================
  describe('1. Minibar Catalog CRUD (/room-inventory/minibar-items)', () => {
    it('1.1 should auto-seed 6 standard minibar items on initial GET', async () => {
      const res = await roomInventoryApp.request('/room-inventory/minibar-items', {
        method: 'GET',
        headers: { Authorization: `Bearer ${frontDeskToken}` },
      }, { DB: roomDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(200);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data).to.be.an('array');
      expect(body.data.length).to.be.at.least(6);

      const coke = body.data.find((item: any) => item.name.includes('โค้ก'));
      expect(coke).to.exist;
      expect(coke.pricePerUnit).to.equal(35);
      expect(coke.unit).to.equal('กระป๋อง');
      expect(coke.isActive).to.be.true;
    });

    it('1.2 should filter minibar items by category and active status', async () => {
      const res = await roomInventoryApp.request('/room-inventory/minibar-items?category=เครื่องดื่ม&isActive=true', {
        method: 'GET',
        headers: { Authorization: `Bearer ${housekeepingToken}` },
      }, { DB: roomDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(200);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      body.data.forEach((item: any) => {
        expect(item.category).to.equal('เครื่องดื่ม');
        expect(item.isActive).to.be.true;
      });
    });

    it('1.3 should allow Front Desk to create a new minibar item (POST)', async () => {
      const payload = {
        name: 'มาม่าคัพ ต้มยำกุ้ง',
        category: 'ขนม',
        pricePerUnit: 25,
        unit: 'ถ้วย',
        isActive: true,
      };

      const res = await roomInventoryApp.request('/room-inventory/minibar-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${frontDeskToken}`,
        },
        body: JSON.stringify(payload),
      }, { DB: roomDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(201);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data.name).to.equal(payload.name);
      expect(body.data.pricePerUnit).to.equal(25);
      expect(body.data.id).to.include('mb-');
    });

    it('1.4 should allow Owner to update minibar item price and details (PUT)', async () => {
      const updatePayload = {
        pricePerUnit: 40,
        unit: 'กระป๋องใหญ่',
      };

      const res = await roomInventoryApp.request('/room-inventory/minibar-items/mb-002', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify(updatePayload),
      }, { DB: roomDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(200);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data.pricePerUnit).to.equal(40);
      expect(body.data.unit).to.equal('กระป๋องใหญ่');
    });

    it('1.5 should soft delete minibar item (isActive = 0) upon DELETE request', async () => {
      const res = await roomInventoryApp.request('/room-inventory/minibar-items/mb-001', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      }, { DB: roomDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(200);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data.isActive).to.be.false;

      // Verify item still exists in DB but is inactive
      const checkRes = await roomInventoryApp.request('/room-inventory/minibar-items/mb-001', {
        method: 'GET',
        headers: { Authorization: `Bearer ${frontDeskToken}` },
      }, { DB: roomDb, JWT_SECRET: TEST_JWT_SECRET });

      const checkBody = await checkRes.json() as any;
      expect(checkBody.data.isActive).to.be.false;
    });

    it('1.6 should reject Housekeeping from creating or modifying minibar items (403 Forbidden)', async () => {
      const res = await roomInventoryApp.request('/room-inventory/minibar-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${housekeepingToken}`,
        },
        body: JSON.stringify({
          name: 'แอบเพิ่มสินค้า',
          category: 'อื่นๆ',
          pricePerUnit: 100,
          unit: 'ชิ้น',
        }),
      }, { DB: roomDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(403);
      const body = await res.json() as any;
      expect(body.success).to.be.false;
      expect(body.error).to.equal('FORBIDDEN');
    });
  });

  // ==========================================================================
  // SECTION 2: HOUSEKEEPING TASK TEMPLATES (services/housekeeping)
  // ==========================================================================
  describe('2. Housekeeping Task Templates CRUD (/housekeeping/task-templates)', () => {
    it('2.1 should auto-seed 4 SOP task templates on initial GET', async () => {
      const res = await housekeepingApp.request('/housekeeping/task-templates', {
        method: 'GET',
        headers: { Authorization: `Bearer ${frontDeskToken}` },
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(200);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data).to.be.an('array');
      expect(body.data.length).to.be.at.least(4);

      const checkoutTemplate = body.data.find((t: any) => t.taskType === 'checkout_clean');
      expect(checkoutTemplate).to.exist;
      expect(checkoutTemplate.estimatedMinutes).to.equal(45);
      expect(checkoutTemplate.defaultPriority).to.equal('high');
    });

    it('2.2 should allow Front Desk to create a new task template (POST)', async () => {
      const payload = {
        name: 'ทำความสะอาดด่วนช่วงไฮซีซั่น',
        taskType: 'checkout_clean',
        defaultPriority: 'urgent',
        estimatedMinutes: 25,
        description: 'เน้นเปลี่ยนผ้าปูและขัดห้องน้ำอย่างรวดเร็วเพื่อปล่อยห้องทันที',
        isActive: true,
      };

      const res = await housekeepingApp.request('/housekeeping/task-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${frontDeskToken}`,
        },
        body: JSON.stringify(payload),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(201);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data.name).to.equal(payload.name);
      expect(body.data.estimatedMinutes).to.equal(25);
    });

    it('2.3 should allow Owner to update task template (PUT)', async () => {
      const updatePayload = {
        estimatedMinutes: 35,
        description: 'อัปเดตเวลามาตรฐานเป็น 35 นาทีเพื่อความละเอียดรอบคอบ',
      };

      const res = await housekeepingApp.request('/housekeeping/task-templates/tt-001', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify(updatePayload),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(200);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data.estimatedMinutes).to.equal(35);
    });

    it('2.4 should soft delete task template (isActive = 0) upon DELETE request', async () => {
      const res = await housekeepingApp.request('/housekeeping/task-templates/tt-002', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${frontDeskToken}` },
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(200);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data.isActive).to.be.false;
    });

    it('2.5 should reject Housekeeping from creating task templates (403 Forbidden)', async () => {
      const res = await housekeepingApp.request('/housekeeping/task-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${housekeepingToken}`,
        },
        body: JSON.stringify({
          name: 'แม่บ้านแก้กฎเอง',
          taskType: 'stayover_clean',
          defaultPriority: 'low',
          estimatedMinutes: 10,
        }),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(403);
    });
  });

  // ==========================================================================
  // SECTION 3: LOST & FOUND IN ROOM ISSUES (services/housekeeping)
  // ==========================================================================
  describe('3. Lost & Found in Room Issues (/housekeeping/issues)', () => {
    it('3.1 should successfully report a guest forgotten item with storageLocation and retentionDays', async () => {
      const payload = {
        roomId: '101',
        reportedBy: 'hk-staff-001',
        issueType: 'lost_and_found',
        description: 'ลูกค้าลืมหูฟัง AirPods สีขาวพร้อมเคสซิลิโคนสีฟ้าไว้บนโต๊ะหัวเตียง',
        severity: 'medium',
        storageLocation: 'เคาน์เตอร์ Front Desk ล็อบบี้',
        retentionDays: 7,
      };

      const res = await housekeepingApp.request('/housekeeping/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${housekeepingToken}`,
        },
        body: JSON.stringify(payload),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(res.status).to.equal(201);
      const body = await res.json() as any;
      expect(body.success).to.be.true;
      expect(body.data.issueType).to.equal('lost_and_found');
      expect(body.data.storageLocation).to.equal('เคาน์เตอร์ Front Desk ล็อบบี้');
      expect(body.data.retentionDays).to.equal(7);
      expect(body.data.status).to.equal('open');
    });

    it('3.2 should allow Front Desk to resolve Lost & Found and record receiver name (Anti-Theft)', async () => {
      // Create lost & found item first
      const createRes = await housekeepingApp.request('/housekeeping/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${housekeepingToken}`,
        },
        body: JSON.stringify({
          roomId: '102',
          reportedBy: 'hk-staff-001',
          issueType: 'lost_and_found',
          description: 'กระเป๋าสตางค์หนังสีดำ',
          severity: 'high',
          storageLocation: 'ตู้เซฟผู้จัดการ',
          retentionDays: 30,
        }),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      const createBody = await createRes.json() as any;
      const issueId = createBody.data.id;

      // Front Desk updates status to resolved with receiver name
      const updateRes = await housekeepingApp.request(`/housekeeping/issues/${issueId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${frontDeskToken}`,
        },
        body: JSON.stringify({
          status: 'resolved',
          receivedByName: 'คุณสมชาย ใจดี (ตรวจบัตร ปชช. เรียบร้อย)',
        }),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(updateRes.status).to.equal(200);
      const updateBody = await updateRes.json() as any;
      expect(updateBody.success).to.be.true;
      expect(updateBody.data.status).to.equal('resolved');
      expect(updateBody.data.receivedByName).to.equal('คุณสมชาย ใจดี (ตรวจบัตร ปชช. เรียบร้อย)');
      expect(updateBody.data.resolvedAt).to.exist;
    });

    it('3.3 should allow status to be marked as expired_claimed when 7-day retention period lapses', async () => {
      // Create lost item
      const createRes = await housekeepingApp.request('/housekeeping/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${housekeepingToken}`,
        },
        body: JSON.stringify({
          roomId: '103',
          reportedBy: 'hk-staff-001',
          issueType: 'lost_and_found',
          description: 'เสื้อแจ็คเก็ตสีดำค้างเกิน 7 วัน',
          severity: 'low',
        }),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      const createBody = await createRes.json() as any;
      const issueId = createBody.data.id;

      const updateRes = await housekeepingApp.request(`/housekeeping/issues/${issueId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          status: 'expired_claimed',
        }),
      }, { DB: houseDb, JWT_SECRET: TEST_JWT_SECRET });

      expect(updateRes.status).to.equal(200);
      const updateBody = await updateRes.json() as any;
      expect(updateBody.success).to.be.true;
      expect(updateBody.data.status).to.equal('expired_claimed');
    });
  });
});

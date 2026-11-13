import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import housekeepingApp from '../../services/housekeeping/src/index';

describe('Housekeeping Amenity Requests Service Tests (@Legxcy77)', () => {
  let hkDb: ReturnType<typeof createMockD1>;
  let hkSqlite: DatabaseSync;
  let mockEnv: { DB: any };

  beforeEach(async () => {
    hkSqlite = new DatabaseSync(':memory:');
    const hkSchemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/housekeeping/schema.sql'),
      'utf8'
    );
    hkSqlite.exec(hkSchemaSql);
    const hkSeedSql = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/seeds/04_housekeeping.sql'),
      'utf8'
    );
    hkSqlite.exec(hkSeedSql);
    hkDb = createMockD1(hkSqlite);
    mockEnv = { DB: hkDb as any };
  });

  describe('POST /housekeeping/amenity-requests - Front Desk ส่งคำขอมาให้แม่บ้าน', () => {
    it('should create a paid amenity request (Extra Bed) successfully', async () => {
      const payload = {
        roomNumber: '203',
        reservationId: 'res-test-01',
        amenityId: 'am-extra-bed',
        amenityName: 'เตียงเสริม (Extra Bed)',
        category: 'bedding',
        quantity: 1,
        isChargeable: 1,
        unitPrice: 300.0,
        requestedBy: 'Front Desk',
        notes: 'ขอเตียงเสริมเข้าห้องก่อนบ่าย 2',
      };

      const res = await housekeepingApp.request('/housekeeping/amenity-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, mockEnv);

      expect(res.status).to.equal(201);
      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data.roomNumber).to.equal('203');
      expect(json.data.amenityName).to.equal('เตียงเสริม (Extra Bed)');
      expect(json.data.totalPrice).to.equal(300.0);
      expect(json.data.status).to.equal('pending');
    });

    it('should create a free amenity request (Extra Pillows) successfully', async () => {
      const payload = {
        roomNumber: '104',
        amenityId: 'am-pillow',
        amenityName: 'หมอนหนุนเสริม',
        category: 'bedding',
        quantity: 2,
        isChargeable: 0,
        unitPrice: 0.0,
        notes: 'ขอหมอนนุ่ม 2 ใบ',
      };

      const res = await housekeepingApp.request('/housekeeping/amenity-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, mockEnv);

      expect(res.status).to.equal(201);
      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data.quantity).to.equal(2);
      expect(json.data.totalPrice).to.equal(0.0);
      expect(json.data.isChargeable).to.equal(0);
    });

    it('should reject when roomNumber is missing with 400 validation error', async () => {
      const payload = {
        amenityId: 'am-pillow',
        amenityName: 'หมอนหนุนเสริม',
      };

      const res = await housekeepingApp.request('/housekeeping/amenity-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, mockEnv);

      expect(res.status).to.equal(400);
      const json = await res.json<any>();
      expect(json.success).to.be.false;
      expect(json.error).to.equal('VALIDATION_ERROR');
    });
  });

  describe('GET /housekeeping/amenity-requests - แม่บ้านดึงรายการคำขอ', () => {
    it('should fetch all amenity requests and filter by roomNumber', async () => {
      // 1. Create two requests
      await housekeepingApp.request('/housekeeping/amenity-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: '201',
          amenityId: 'am-extra-bed',
          amenityName: 'เตียงเสริม (Extra Bed)',
          quantity: 1,
          unitPrice: 300,
        }),
      }, mockEnv);

      await housekeepingApp.request('/housekeeping/amenity-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: '305',
          amenityId: 'am-towel',
          amenityName: 'ผ้าขนหนูเพิ่ม',
          quantity: 2,
          unitPrice: 0,
        }),
      }, mockEnv);

      // 2. Fetch all
      const resAll = await housekeepingApp.request('/housekeeping/amenity-requests', { method: 'GET' }, mockEnv);
      expect(resAll.status).to.equal(200);
      const jsonAll = await resAll.json<any>();
      expect(jsonAll.data.length).to.be.at.least(2);

      // 3. Filter by room_number 201
      const resFilter = await housekeepingApp.request('/housekeeping/amenity-requests?room_number=201', { method: 'GET' }, mockEnv);
      const jsonFilter = await resFilter.json<any>();
      expect(jsonFilter.data).to.be.an('array');
      expect(jsonFilter.data.every((r: any) => r.roomNumber === '201')).to.be.true;
    });
  });

  describe('PATCH /housekeeping/amenity-requests/:id/status - แม่บ้านเปลี่ยนสถานะ', () => {
    it('should update status to preparing and then delivered with deliveredAt recorded', async () => {
      // 1. Create request
      const createRes = await housekeepingApp.request('/housekeeping/amenity-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: '402',
          amenityId: 'am-iron',
          amenityName: 'เตารีดผ้า',
          quantity: 1,
        }),
      }, mockEnv);

      const created = (await createRes.json<any>()).data;

      // 2. Update to preparing
      const prepRes = await housekeepingApp.request(`/housekeeping/amenity-requests/${created.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'preparing' }),
      }, mockEnv);

      expect(prepRes.status).to.equal(200);
      const prepJson = await prepRes.json<any>();
      expect(prepJson.data.status).to.equal('preparing');

      // 3. Update to delivered
      const delivRes = await housekeepingApp.request(`/housekeeping/amenity-requests/${created.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      }, mockEnv);

      expect(delivRes.status).to.equal(200);
      const delivJson = await delivRes.json<any>();
      expect(delivJson.data.status).to.equal('delivered');
      expect(delivJson.data.deliveredAt).to.be.a('string');
    });

    it('should return 404 when updating non-existent request', async () => {
      const res = await housekeepingApp.request('/housekeeping/amenity-requests/amr-fake-999/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      }, mockEnv);

      expect(res.status).to.equal(404);
      const json = await res.json<any>();
      expect(json.success).to.be.false;
      expect(json.error).to.equal('NOT_FOUND');
    });
  });
});


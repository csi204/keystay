import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import roomInventoryApp from '../../services/room-inventory/src/index';

describe('SPEC-2026-004: Seasonal Pricing & Amenities Catalog Tests (@Legxcy77)', () => {
  let roomDb: ReturnType<typeof createMockD1>;
  let roomSqlite: DatabaseSync;
  let mockEnv: { DB: any };

  beforeEach(async () => {
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
    mockEnv = { DB: roomDb as any };
  });

  describe('1. Seasonal Pricing Rules (/v1/pricing/rules)', () => {
    it('1.1 should auto-seed default seasonal rules on initial GET', async () => {
      const res = await roomInventoryApp.request('/v1/pricing/rules', { method: 'GET' }, mockEnv);
      expect(res.status).to.equal(200);

      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array').with.lengthOf(2);
      expect(json.data[0].tier).to.equal('Special Holiday'); // higher priority 25 first
      expect(json.data[1].tier).to.equal('High Season'); // priority 10
    });

    it('1.2 should create a new seasonal pricing rule (POST)', async () => {
      const payload = {
        name: 'เทศกาลสงกรานต์',
        tier: 'Special Holiday',
        startDate: '2027-04-12',
        endDate: '2027-04-16',
        adjustmentType: 'fixed_amount',
        adjustmentValue: 500,
        priority: 30,
        isActive: true,
      };

      const res = await roomInventoryApp.request('/v1/pricing/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, mockEnv);

      expect(res.status).to.equal(201);
      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data.name).to.equal('เทศกาลสงกรานต์');
      expect(json.data.adjustmentValue).to.equal(500);
    });

    it('1.3 should update an existing rule (PUT)', async () => {
      // First ensure seeded
      await roomInventoryApp.request('/v1/pricing/rules', { method: 'GET' }, mockEnv);

      const res = await roomInventoryApp.request('/v1/pricing/rules/rule-countdown', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustmentValue: 400 }),
      }, mockEnv);

      expect(res.status).to.equal(200);
      const json = await res.json<any>();
      expect(json.data.adjustmentValue).to.equal(400);
    });

    it('1.4 should soft delete a rule (isActive = false)', async () => {
      await roomInventoryApp.request('/v1/pricing/rules', { method: 'GET' }, mockEnv);

      const res = await roomInventoryApp.request('/v1/pricing/rules/rule-countdown', {
        method: 'DELETE',
      }, mockEnv);

      expect(res.status).to.equal(200);
      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data.isActive).to.be.false;
    });

    it('1.5 should calculate dynamic room rate accurately (/v1/pricing/calculate-rate)', async () => {
      await roomInventoryApp.request('/v1/pricing/rules', { method: 'GET' }, mockEnv);

      // 3 nights: 2026-12-30 (High Season +5% = 1575), 2026-12-31 (Countdown +300 = 1800), 2027-01-01 (Countdown +300 = 1800)
      const res = await roomInventoryApp.request('/v1/pricing/calculate-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_type_id: 'rt_deluxe_double',
          check_in_date: '2026-12-30',
          check_out_date: '2027-01-02',
        }),
      }, mockEnv);

      expect(res.status).to.equal(200);
      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.basePrice).to.equal(1500.0);
      expect(json.totalNights).to.equal(3);
      expect(json.totalRoomCharge).to.equal(5175.0);
      expect(json.averageNightlyRate).to.equal(1725.0);
      expect(json.dailyBreakdown).to.have.lengthOf(3);
      expect(json.dailyBreakdown[0].rate).to.equal(1575.0);
      expect(json.dailyBreakdown[1].rate).to.equal(1800.0);
    });
  });

  describe('2. Amenities Catalog (/v1/amenities)', () => {
    it('2.1 should auto-seed standard amenities on initial GET', async () => {
      const res = await roomInventoryApp.request('/v1/amenities', { method: 'GET' }, mockEnv);
      expect(res.status).to.equal(200);

      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array').with.lengthOf(4);
    });

    it('2.2 should filter amenities by is_chargeable=1', async () => {
      const res = await roomInventoryApp.request('/v1/amenities?is_chargeable=1', { method: 'GET' }, mockEnv);
      expect(res.status).to.equal(200);

      const json = await res.json<any>();
      expect(json.data).to.be.an('array');
      json.data.forEach((item: any) => {
        expect(item.isChargeable).to.be.true;
        expect(item.unitPrice).to.be.greaterThan(0);
      });
    });

    it('2.3 should create a new amenity item (POST)', async () => {
      const payload = {
        nameTh: 'ชุดคลุมอาบน้ำผ้าไหม',
        nameEn: 'Silk Bathrobe',
        category: 'bath',
        isChargeable: true,
        unitPrice: 150.0,
        unitNameTh: 'ชุด',
        unitNameEn: 'set',
        stockQuantity: 20,
        isActive: true,
      };

      const res = await roomInventoryApp.request('/v1/amenities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, mockEnv);

      expect(res.status).to.equal(201);
      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data.nameTh).to.equal('ชุดคลุมอาบน้ำผ้าไหม');
      expect(json.data.unitPrice).to.equal(150.0);
    });

    it('2.4 should update amenity stock and price (PUT)', async () => {
      await roomInventoryApp.request('/v1/amenities', { method: 'GET' }, mockEnv);

      const res = await roomInventoryApp.request('/v1/amenities/am-extra-bed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitPrice: 350.0, stockQuantity: 8 }),
      }, mockEnv);

      expect(res.status).to.equal(200);
      const json = await res.json<any>();
      expect(json.data.unitPrice).to.equal(350.0);
      expect(json.data.stockQuantity).to.equal(8);
    });

    it('2.5 should soft delete an amenity item (DELETE)', async () => {
      await roomInventoryApp.request('/v1/amenities', { method: 'GET' }, mockEnv);

      const res = await roomInventoryApp.request('/v1/amenities/am-hair-dryer', {
        method: 'DELETE',
      }, mockEnv);

      expect(res.status).to.equal(200);
      const json = await res.json<any>();
      expect(json.success).to.be.true;
      expect(json.data.isActive).to.be.false;
    });
  });
});

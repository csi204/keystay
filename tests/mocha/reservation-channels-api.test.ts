import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import { app } from '../../services/reservation/src/index';
import { type Env } from '../../services/reservation/src/types';

describe('Reservation API: Booking Channels, Slips & Amenity Requests', () => {
  let sqliteDb: DatabaseSync;
  let mockDb: D1Database;
  let env: Env;

  const HEADERS = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-admin-test-001',
    'x-internal-service-key': 'test-internal-key',
  };

  beforeEach(() => {
    sqliteDb = new DatabaseSync(':memory:');

    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/reservation/schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);

    const seedSql = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/seeds/03_reservation.sql'),
      'utf8'
    );
    sqliteDb.exec(seedSql);

    mockDb = createMockD1(sqliteDb);
    env = {
      DB: mockDb,
      ENVIRONMENT: 'test',
    };
  });

  describe('Booking Channels Recording & Retrieval', () => {
    it('SUCCESS: creates reservation with channel phone and unpaid status', async () => {
      const payload = {
        guestName: 'Anan Phone Guest',
        phone: '0891234567',
        roomId: 'rm-301',
        roomNumber: '301',
        roomTypeName: 'Standard Room',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-22',
        bookingSource: 'phone',
        paymentStatus: 'unpaid',
      };

      const res = await app.request('/reservations/walk-in', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(payload),
      }, env);

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.bookingSource).to.equal('phone');
      expect(json.data.paymentStatus).to.equal('unpaid');
    });

    it('SUCCESS: creates reservation with channel facebook and attached slip info', async () => {
      const payload = {
        guestName: 'Facebook Page Guest',
        phone: '0819998888',
        roomId: 'rm-302',
        roomNumber: '302',
        roomTypeName: 'Standard Room',
        checkInDate: '2026-11-25',
        checkOutDate: '2026-11-27',
        bookingSource: 'facebook',
        paymentStatus: 'paid',
        paymentSlipRef: 'BBL-20261125-123456',
        paymentSlipUrl: 'data:image/png;base64,mockSlipData',
      };

      const res = await app.request('/reservations/walk-in', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(payload),
      }, env);

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.bookingSource).to.equal('facebook');
      expect(json.data.paymentStatus).to.equal('paid');
      expect(json.data.paymentSlipRef).to.equal('BBL-20261125-123456');
    });
  });

  describe('Payment Slip Verification (PATCH /reservations/:id/payment)', () => {
    it('SUCCESS: updates payment status to paid with slip reference and timestamp', async () => {
      const payload = {
        paymentStatus: 'paid',
        paymentSlipRef: 'SCB-20261111-998877',
        paymentSlipUrl: 'https://storage.keystay.io/slips/res-001.jpg',
      };

      const res = await app.request('/reservations/res-001/payment', {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(payload),
      }, env);

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.paymentStatus).to.equal('paid');
      expect(json.data.paymentSlipRef).to.equal('SCB-20261111-998877');
      expect(json.data.paymentSlipUrl).to.equal('https://storage.keystay.io/slips/res-001.jpg');
      expect(json.data.paymentVerifiedAt).to.be.a('string');
    });
  });

  describe('Amenity Requests (POST & GET /reservations/:id/amenities)', () => {
    it('SUCCESS: records free amenity request with 0 THB and billed_to_folio = 0', async () => {
      const payload = {
        amenityId: 'amenity-pillow',
        amenityName: 'หมอนหนุนเสริม (Extra Pillow)',
        quantity: 2,
        unitPrice: 0,
        isChargeable: 0,
        notes: 'ขอนุ่มพิเศษ 2 ใบ',
      };

      const res = await app.request('/reservations/res-001/amenities', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(payload),
      }, env);

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.amenityId).to.equal('amenity-pillow');
      expect(json.data.totalPrice).to.equal(0);
      expect(json.data.isChargeable).to.equal(0);
      expect(json.data.billedToFolio).to.equal(0);
    });

    it('SUCCESS: records paid amenity request (Extra Bed 300 THB) and marks chargeable for folio', async () => {
      const payload = {
        amenityId: 'amenity-extrabed',
        amenityName: 'เตียงเสริม (Extra Bed)',
        quantity: 1,
        unitPrice: 300,
        isChargeable: 1,
      };

      const res = await app.request('/reservations/res-001/amenities', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(payload),
      }, env);

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.amenityId).to.equal('amenity-extrabed');
      expect(json.data.totalPrice).to.equal(300);
      expect(json.data.isChargeable).to.equal(1);
    });

    it('SUCCESS: lists all amenity requests for reservation', async () => {
      // First insert one
      await app.request('/reservations/res-001/amenities', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          amenityId: 'amenity-towel',
          amenityName: 'ผ้าเช็ดตัวเพิ่ม',
          quantity: 1,
          unitPrice: 0,
          isChargeable: 0,
        }),
      }, env);

      const res = await app.request('/reservations/res-001/amenities', {
        method: 'GET',
        headers: HEADERS,
      }, env);

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
      expect(json.data.length).to.be.greaterThan(0);
      expect(json.data[0].amenityId).to.equal('amenity-towel');
    });
  });
});

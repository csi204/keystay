import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../../../tests/helpers/mock-d1';
import { app } from '../src/index';
import { type Env } from '../src/types';

describe('Reservation Guest Name Preservation & Extend Stay Metadata', () => {
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

    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../schema.sql'), 'utf8');
    sqliteDb.exec(schemaSql);

    const seedSql = fs.readFileSync(
      path.resolve(__dirname, '../../../scripts/seeds/03_reservation.sql'),
      'utf8'
    );
    sqliteDb.exec(seedSql);

    mockDb = createMockD1(sqliteDb);
    env = {
      DB: mockDb,
      ENVIRONMENT: 'test',
    };
  });

  describe('Guest Name Preservation in POST /reservations/walk-in', () => {
    it('creates a new guest with the typed name instead of reusing Natthapong Techasorn when phone/ID match a different name', async () => {
      const res = await app.request(
        '/reservations/walk-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            guestName: 'สมชาย ใจดี',
            guestPhone: '081-234-5678',
            guestEmail: 'natthapong.t@example.com',
            idCardNumber: '1100400123456',
            roomId: 'rm-walkin-201',
            roomNumber: '201',
            roomTypeName: 'Deluxe Room',
            checkInDate: '2026-11-13',
            checkOutDate: '2026-11-15',
            numGuests: 1,
            nightlyRate: 2500,
            depositAmount: 500,
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestId).to.not.equal('gst-001');
      expect(json.data.guestName).to.equal('สมชาย ใจดี');
      expect(json.data.guest.firstName).to.equal('สมชาย');
      expect(json.data.guest.lastName).to.equal('ใจดี');
      expect(json.data.guest.idCardNumber).to.equal('1100400123456');

      const originalGuest = sqliteDb
        .prepare('SELECT first_name, last_name FROM guests WHERE id = ?')
        .get('gst-001') as any;
      expect(originalGuest.first_name).to.equal('Natthapong');
      expect(originalGuest.last_name).to.equal('Techasorn');
    });

    it('reuses existing guest when normalized typed name matches existing guest on same phone', async () => {
      const res = await app.request(
        '/reservations/walk-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            guestName: '  natthapong   techasorn ',
            guestPhone: '081-234-5678',
            roomId: 'rm-walkin-202',
            roomNumber: '202',
            roomTypeName: 'Standard Room',
            checkInDate: '2026-11-20',
            checkOutDate: '2026-11-21',
            nightlyRate: 1800,
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestId).to.equal('gst-001');
      expect(json.data.guestName).to.equal('Natthapong Techasorn');
    });

    it('drops legacy unique guest phone/id_card indexes during auto-migration so different-name walk-ins succeed', async () => {
      // Simulate a pre-existing DB that still has the legacy unique indexes
      sqliteDb.exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_phone_unique ON guests(phone) WHERE phone IS NOT NULL;'
      );
      sqliteDb.exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_id_card_unique ON guests(id_card_number) WHERE id_card_number IS NOT NULL;'
      );

      const res = await app.request(
        '/reservations/walk-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            guestName: 'กานดา รักดี',
            guestPhone: '081-234-5678',
            idCardNumber: '1100400123456',
            roomId: 'rm-walkin-203',
            roomNumber: '203',
            checkInDate: '2026-11-22',
            checkOutDate: '2026-11-23',
            nightlyRate: 2000,
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestId).to.not.equal('gst-001');
      expect(json.data.guestName).to.equal('กานดา รักดี');
    });
  });

  describe('Guest Name Preservation in POST /reservations', () => {
    it('creates a new guest with typed name and id_card_number when phone matches seeded guest with different name', async () => {
      const res = await app.request(
        '/reservations',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            guestName: 'วิภาดา สุขสันต์',
            guestPhone: '081-234-5678',
            guestEmail: 'wipada@example.com',
            nationalIdOrPassport: '1100400123456',
            roomId: 'rm-book-301',
            roomNumber: '301',
            roomTypeName: 'Deluxe Room',
            checkInDate: '2026-12-01',
            checkOutDate: '2026-12-04',
            nightlyRate: 2200,
            bookingType: 'advance',
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestId).to.not.equal('gst-001');
      expect(json.data.guestName).to.equal('วิภาดา สุขสันต์');
      expect(json.data.guest.idCardNumber).to.equal('1100400123456');

      const row = sqliteDb
        .prepare('SELECT first_name, last_name, phone, id_card_number FROM guests WHERE id = ?')
        .get(json.data.guestId) as any;
      expect(row.first_name).to.equal('วิภาดา');
      expect(row.last_name).to.equal('สุขสันต์');
      expect(row.phone).to.equal('081-234-5678');
      expect(row.id_card_number).to.equal('1100400123456');
    });

    it('reuses explicit guestId directly when guestId is provided', async () => {
      const res = await app.request(
        '/reservations',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            guestId: 'gst-001',
            guestName: 'Override Ignored',
            roomId: 'rm-book-302',
            roomNumber: '302',
            roomTypeName: 'Standard Room',
            checkInDate: '2026-12-05',
            checkOutDate: '2026-12-07',
            nightlyRate: 2000,
            bookingType: 'advance',
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestId).to.equal('gst-001');
      expect(json.data.guestName).to.equal('Natthapong Techasorn');
    });
  });

  describe('Extend Stay Metadata in handleExtendStay', () => {
    it('returns previousCheckOutDate, extraNights, extensionSubtotal, and nightlyRate', async () => {
      // Seed res-001: check_in_date = 2026-11-10, check_out_date = 2026-11-14, nightly_rate = 3500.00
      const res = await app.request(
        '/reservations/res-001/extend-stay',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            newCheckOutDate: '2026-11-17',
            additionalDeposit: 0,
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.previousCheckOutDate).to.equal('2026-11-14');
      expect(json.data.checkOutDate).to.equal('2026-11-17');
      expect(json.data.extraNights).to.equal(3);
      expect(json.data.nightlyRate).to.equal(3500);
      expect(json.data.extensionSubtotal).to.equal(10500);
      expect(Number(json.data.totalNights)).to.equal(7);
      expect(Number(json.data.subtotal)).to.equal(24500);
    });
  });
});

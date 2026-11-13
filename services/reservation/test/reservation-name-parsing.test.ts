import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../../../tests/helpers/mock-d1';
import { app } from '../src/index';
import { type Env } from '../src/types';

describe('Reservation Guest Name Parsing & Customer Suffix Elimination', () => {
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

    // 1. Initialize schema
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);

    // 2. Load seed data
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

  describe('POST /reservations (Advance Reservation Name Parsing)', () => {
    it('resolves single name "อัศวิน" without "Customer" suffix and stores empty lastName', async () => {
      const payload = {
        guestName: 'อัศวิน',
        guestPhone: '0812349999',
        roomId: 'rm-parse-101',
        roomNumber: '101',
        roomTypeName: 'Standard Room',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-22',
        nightlyRate: 1500,
        bookingType: 'advance',
      };

      const res = await app.request(
        '/reservations',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      // Must resolve strictly to "อัศวิน", NOT "อัศวิน Customer" or "อัศวิน Guest"
      expect(json.data.guestName).to.equal('อัศวิน');
      expect(json.data.guestName).to.not.include('Customer');
      expect(json.data.guestName).to.not.include('Guest');

      // Verify DB storage
      const guestId = json.data.guestId;
      const row = sqliteDb.prepare('SELECT first_name, last_name FROM guests WHERE id = ?').get(guestId) as any;
      expect(row).to.not.be.undefined;
      expect(row.first_name).to.equal('อัศวิน');
      expect(row.last_name).to.equal('');
    });

    it('resolves two-part name "Somchai Jaidee" correctly into firstName and lastName', async () => {
      const payload = {
        guestName: 'Somchai Jaidee',
        guestPhone: '0898887777',
        roomId: 'rm-parse-102',
        roomNumber: '102',
        roomTypeName: 'Deluxe Room',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-23',
        nightlyRate: 2000,
        bookingType: 'advance',
      };

      const res = await app.request(
        '/reservations',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestName).to.equal('Somchai Jaidee');

      // Verify DB storage
      const guestId = json.data.guestId;
      const row = sqliteDb.prepare('SELECT first_name, last_name FROM guests WHERE id = ?').get(guestId) as any;
      expect(row).to.not.be.undefined;
      expect(row.first_name).to.equal('Somchai');
      expect(row.last_name).to.equal('Jaidee');
    });

    it('handles multiple spaces "Somchai   Jaidee" and multi-word surnames', async () => {
      const payload = {
        guestName: 'Somchai   Jaidee   Mak',
        guestPhone: '0855554444',
        roomId: 'rm-parse-103',
        roomNumber: '103',
        roomTypeName: 'Suite',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-24',
        nightlyRate: 3500,
        bookingType: 'advance',
      };

      const res = await app.request(
        '/reservations',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestName).to.equal('Somchai Jaidee Mak');

      const guestId = json.data.guestId;
      const row = sqliteDb.prepare('SELECT first_name, last_name FROM guests WHERE id = ?').get(guestId) as any;
      expect(row.first_name).to.equal('Somchai');
      expect(row.last_name).to.equal('Jaidee Mak');
    });
  });

  describe('POST /walk-in (Walk-in Immediate Check-in Name Parsing)', () => {
    it('resolves single name "อัศวิน" without "Customer" or "Guest" suffix', async () => {
      const payload = {
        guestName: 'อัศวิน',
        guestPhone: '0822221111',
        roomId: 'rm-parse-walkin-1',
        roomNumber: '104',
        roomTypeName: 'Standard Room',
        checkInDate: '2026-11-12',
        checkOutDate: '2026-11-13',
        nightlyRate: '1200.00',
      };

      const res = await app.request(
        '/walk-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestName).to.equal('อัศวิน');
      expect(json.data.guestName).to.not.include('Customer');
      expect(json.data.guestName).to.not.include('Guest');

      const guestId = json.data.guestId;
      const row = sqliteDb.prepare('SELECT first_name, last_name FROM guests WHERE id = ?').get(guestId) as any;
      expect(row.first_name).to.equal('อัศวิน');
      expect(row.last_name).to.equal('');
    });

    it('resolves two-part name "Somchai Jaidee" for walk-in', async () => {
      const payload = {
        guestName: 'Somchai Jaidee',
        guestPhone: '0833332222',
        roomId: 'rm-parse-walkin-2',
        roomNumber: '105',
        roomTypeName: 'Deluxe Room',
        checkInDate: '2026-11-12',
        checkOutDate: '2026-11-14',
        nightlyRate: '1800.00',
      };

      const res = await app.request(
        '/walk-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestName).to.equal('Somchai Jaidee');

      const guestId = json.data.guestId;
      const row = sqliteDb.prepare('SELECT first_name, last_name FROM guests WHERE id = ?').get(guestId) as any;
      expect(row.first_name).to.equal('Somchai');
      expect(row.last_name).to.equal('Jaidee');
    });
  });
});

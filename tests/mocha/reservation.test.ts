import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import { app } from '../../services/reservation/src/index';
import { type Env } from '../../services/reservation/src/types';

describe('Reservation Service (Dear - @allmusgus)', () => {
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
      path.resolve(__dirname, '../../services/reservation/schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);

    // 2. Load seed data
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

  describe('Health Check & Metadata', () => {
    it('SUCCESS: returns 200 with service operational status', async () => {
      const res = await app.request('/health', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.status).to.equal('ok');
      expect(json.service).to.equal('reservation');
      expect(json.phase).to.include('Phase 2');
    });

    it('SUCCESS: returns root endpoint info with endpoint list and SA ownership', async () => {
      const res = await app.request('/', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.version).to.equal('2.0.0');
      expect(json.owner).to.include('allmusgus');
      expect(json.endpoints).to.be.an('array');
      expect(json.endpoints).to.include('POST /reservations/:id/check-in');
      expect(json.endpoints).to.include('POST /reservations/:id/check-out');
    });
  });

  describe('API #52: Walk-In Booking (POST /walk-in & /reservations/walk-in)', () => {
    it('SUCCESS: creates immediate checked_in reservation for walk-in guest', async () => {
      const payload = {
        guestName: 'Somchai Walkin Test',
        guestPhone: '0899991234',
        guestEmail: 'somchai.walkin@test.com',
        roomId: 'rm-walkin-999',
        roomNumber: '901',
        roomTypeName: 'Executive Suite',
        checkInDate: '2026-10-10',
        checkOutDate: '2026-10-13',
        numGuests: 2,
        nightlyRate: '2000.00',
        depositAmount: '1000.00',
        specialRequests: 'High floor preferred',
      };

      const res = await app.request(
        '/reservations/walk-in',
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
      expect(json.data.status).to.equal('checked_in');
      expect(json.data.bookingType).to.equal('walk_in');
      expect(String(json.data.totalNights)).to.equal('3');
      expect(String(json.data.subtotal)).to.equal('6000.00');
      expect(String(json.data.depositAmount)).to.equal('1000.00');
      expect(json.data.actualCheckIn).to.not.be.null;
    });

    it('BAD: rejects overlapping booking on same room and dates with 409 Conflict', async () => {
      const payload = {
        guestName: 'Overlap Guest 1',
        guestPhone: '0891112222',
        roomId: 'rm-conflict-101',
        roomNumber: '101',
        roomTypeName: 'Deluxe Room',
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-05',
        numGuests: 1,
        nightlyRate: '1500.00',
      };

      // First booking
      const res1 = await app.request(
        '/reservations/walk-in',
        { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) },
        env
      );
      expect(res1.status).to.equal(201);

      // Overlapping booking
      const res2 = await app.request(
        '/reservations/walk-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            ...payload,
            guestName: 'Overlap Guest 2',
            checkInDate: '2026-11-02',
            checkOutDate: '2026-11-04',
          }),
        },
        env
      );

      expect(res2.status).to.equal(409);
      const json = await res2.json();
      expect(json.success).to.be.false;
      expect(json.error.code).to.be.oneOf(['ROOM_OVERBOOKING_CONFLICT', 'ROOM_NOT_AVAILABLE']);
    });
  });

  describe('API #36: Check-In (POST /reservations/:id/check-in)', () => {
    it('SUCCESS: checks in confirmed reservation and records key deposit', async () => {
      // res-004 is 'confirmed' in seed data
      const res = await app.request(
        '/reservations/res-004/check-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            depositAmount: '500.00',
            paymentMethod: 'credit_card',
            notes: 'Deposit paid via Visa 1234',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.status).to.equal('checked_in');
      expect(String(json.data.depositAmount)).to.equal('500.00');
      expect(json.data.actualCheckIn).to.not.be.null;
    });

    it('BAD: returns 400 when attempting double check-in on already checked-in room', async () => {
      // res-001 is already 'checked_in' in seed data
      const res = await app.request(
        '/reservations/res-001/check-in',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ depositAmount: '200.00' }),
        },
        env
      );

      expect(res.status).to.equal(400);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error.code).to.be.oneOf(['ALREADY_CHECKED_IN', 'INVALID_STATE_TRANSITION']);
    });
  });

  describe('API #49: Extend Stay (POST /reservations/:id/extend-stay)', () => {
    it('SUCCESS: extends check-out date and recalculates subtotal and nights', async () => {
      // res-001 check-out is '2026-09-28', nightly_rate is 3500.00
      const res = await app.request(
        '/reservations/res-001/extend-stay',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            newCheckOutDate: '2026-09-30',
            additionalDeposit: '500.00',
            reason: 'Guest loves the sea view',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.status).to.equal('extended');
      expect(json.data.checkOutDate).to.equal('2026-09-30');
      expect(Number(json.data.totalNights)).to.equal(6);
      expect(Number(json.data.subtotal)).to.equal(21000.00);
    });

    it('BAD: returns 400 when newCheckOutDate is earlier or same as current checkout', async () => {
      const res = await app.request(
        '/reservations/res-001/extend-stay',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            newCheckOutDate: '2026-09-27',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #54: Apply Discount (POST /reservations/:id/apply-discount)', () => {
    it('SUCCESS: applies discount amount and recalculates 7% VAT', async () => {
      const res = await app.request(
        '/reservations/res-001/apply-discount',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            discountAmount: '1000.00',
            discountCode: 'VIP10',
            reason: 'Loyalty guest discount',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(Number(json.data.discountAmount)).to.equal(1000.00);
      // Subtotal 14000 - 1000 = 13000 net. 7% VAT = 910.00. Total = 13910.00
      expect(Number(json.data.taxAmount)).to.equal(910.00);
      expect(Number(json.data.totalAmount)).to.equal(13910.00);
    });

    it('BAD: returns 400 when discount exceeds subtotal', async () => {
      const res = await app.request(
        '/reservations/res-001/apply-discount',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            discountAmount: '999999.00',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #53: Invoice Preview (GET /reservations/:id/invoice-preview)', () => {
    it('SUCCESS: calculates financial preview with room charges, tax, and balance due', async () => {
      const res = await app.request(
        '/reservations/res-001/invoice-preview',
        {
          method: 'GET',
          headers: HEADERS,
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(Number(json.data.roomCharges)).to.equal(14000.00);
      expect(Number(json.data.depositDeducted)).to.equal(3000.00);
      expect(json.data.balanceDue).to.not.be.undefined;
    });
  });

  describe('API #37: Check-Out (POST /reservations/:id/check-out)', () => {
    it('SUCCESS: transitions status to checked_out and records actual check-out time', async () => {
      const res = await app.request(
        '/reservations/res-001/check-out',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            notes: 'Smooth checkout, key deposit returned',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.status).to.equal('checked_out');
      expect(json.data.actualCheckOut).to.not.be.null;
    });

    it('BAD: returns 400 on double check-out', async () => {
      // res-005 is already 'checked_out' in seed data
      const res = await app.request(
        '/reservations/res-005/check-out',
        {
          method: 'POST',
          headers: HEADERS,
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #38: Cancel Reservation (POST /reservations/:id/cancel)', () => {
    it('SUCCESS: cancels confirmed reservation and releases dates', async () => {
      const res = await app.request(
        '/reservations/res-004/cancel',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reason: 'Guest requested cancellation due to flight change',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.status).to.equal('cancelled');
    });

    it('BAD: returns 400 when attempting to cancel an already occupied room', async () => {
      const res = await app.request(
        '/reservations/res-002/cancel',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ reason: 'Cannot cancel occupied stay' }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #39: Modify Dates (PUT /reservations/:id/modify-dates)', () => {
    it('SUCCESS: modifies booking dates for confirmed reservation', async () => {
      // res-004 is 'confirmed' (2026-09-27 to 2026-09-29)
      const res = await app.request(
        '/reservations/res-004/modify-dates',
        {
          method: 'PUT',
          headers: HEADERS,
          body: JSON.stringify({
            checkInDate: '2026-09-28',
            checkOutDate: '2026-10-01',
            reason: 'Guest rescheduled trip by one day',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.checkInDate).to.equal('2026-09-28');
      expect(json.data.checkOutDate).to.equal('2026-10-01');
      expect(Number(json.data.totalNights)).to.equal(3);
    });

    it('BAD: returns 400 when checkInDate is greater than or equal to checkOutDate', async () => {
      const res = await app.request(
        '/reservations/res-004/modify-dates',
        {
          method: 'PUT',
          headers: HEADERS,
          body: JSON.stringify({
            checkInDate: '2026-10-05',
            checkOutDate: '2026-10-02',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #50: Upgrade Room (POST /reservations/:id/upgrade-room)', () => {
    it('SUCCESS: upgrades room and recalculates nightly rate and subtotal', async () => {
      // res-001 in Room 202 Deluxe (3500 THB/night, 4 nights) -> Upgrade to Penthouse (15000 THB)
      const res = await app.request(
        '/reservations/res-001/upgrade-room',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            newRoomId: 'rm-901',
            newRoomNumber: '901',
            newRoomTypeName: 'Penthouse Suite',
            newNightlyRate: 15000.0,
            reason: 'VIP honeymoon complimentary upgrade',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.roomNumber).to.equal('901');
      expect(json.data.roomTypeName).to.equal('Penthouse Suite');
      expect(Number(json.data.nightlyRate)).to.equal(15000.0);
    });

    it('BAD: returns 400 when missing required upgrade fields', async () => {
      const res = await app.request(
        '/reservations/res-001/upgrade-room',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            newRoomId: 'rm-501',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('Night Audit Worker (POST /reservations/night-audit)', () => {
    it('SUCCESS: runs night audit cycle and returns execution summary', async () => {
      const res = await app.request(
        '/reservations/night-audit',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ auditDate: '2026-09-28' }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.not.be.undefined;
    });
  });

  describe('Reservation Query APIs (GET /reservations/:id, /by-guest/:id, /by-room/:id)', () => {
    it('SUCCESS: fetches single reservation by ID', async () => {
      const res = await app.request('/reservations/res-001', { method: 'GET', headers: HEADERS }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.id).to.equal('res-001');
      expect(json.data.roomNumber).to.equal('202');
    });

    it('BAD: returns 404 for non-existent reservation ID', async () => {
      const res = await app.request('/reservations/res-non-existent', { method: 'GET', headers: HEADERS }, env);
      expect(res.status).to.equal(404);
    });

    it('SUCCESS: fetches reservations by guestId', async () => {
      const res = await app.request('/reservations/by-guest/gst-002', { method: 'GET', headers: HEADERS }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
      expect(json.data.length).to.be.at.least(1);
    });

    it('SUCCESS: fetches reservations by roomId', async () => {
      const res = await app.request('/reservations/by-room/rm-202', { method: 'GET', headers: HEADERS }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
    });
  });

  describe('Reservation Maintenance (PUT & DELETE /reservations/:id)', () => {
    it('SUCCESS: updates reservation special requests and guest count', async () => {
      const res = await app.request(
        '/reservations/res-004',
        {
          method: 'PUT',
          headers: HEADERS,
          body: JSON.stringify({
            specialRequests: 'Late arrival at 9 PM, quiet floor',
            numGuests: 2,
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.specialRequests).to.include('Late arrival');
    });

    it('SUCCESS: cancels confirmed reservation via DELETE and returns 400 on repeat', async () => {
      // res-006 is 'confirmed' in seed data
      const res = await app.request(
        '/reservations/res-006',
        { method: 'DELETE', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;

      // Repeat delete should return 400 ALREADY_CANCELLED
      const repeatRes = await app.request(
        '/reservations/res-006',
        { method: 'DELETE', headers: HEADERS },
        env
      );
      expect(repeatRes.status).to.equal(400);
    });
  });

  describe('Operational Queries (Today Check-ins, Check-outs, Calendar)', () => {
    it('SUCCESS: lists today check-ins by date', async () => {
      const res = await app.request(
        '/reservations/today-checkins?date=2026-09-27',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
    });

    it('SUCCESS: lists today check-outs by date', async () => {
      const res = await app.request(
        '/reservations/today-checkouts?date=2026-09-26',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
    });

    it('SUCCESS: fetches calendar matrix for date range', async () => {
      const res = await app.request(
        '/reservations/calendar?startDate=2026-09-01&endDate=2026-09-30',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
    });
  });

  describe('Guest Management APIs (GET /guests, POST /guests)', () => {
    it('SUCCESS: fetches guest list', async () => {
      const res = await app.request('/guests', { method: 'GET', headers: HEADERS }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.length).to.be.at.least(5);
    });

    it('SUCCESS: creates a new guest record', async () => {
      const res = await app.request(
        '/guests',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            firstName: 'Waraporn',
            lastName: 'Siriwong',
            email: 'waraporn@test.com',
            phone: '0851239876',
            nationality: 'Thai',
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.firstName).to.equal('Waraporn');
    });
  });
});

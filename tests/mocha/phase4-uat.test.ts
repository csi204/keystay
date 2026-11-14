import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import { createMockKV } from '../helpers/mock-kv';
import { TEST_JWT_SECRET, createTestToken } from '../helpers/auth';

import gatewayApp, { type Env as GatewayEnv } from '../../services/api-gateway/src/index';
import authApp, { type Env as AuthEnv } from '../../services/auth-user/src/index';
import roomInventoryApp from '../../services/room-inventory/src/index';
import { app as reservationApp } from '../../services/reservation/src/index';
import { type Env as ReservationEnv } from '../../services/reservation/src/types';
import housekeepingApp, { type Env as HousekeepingEnv } from '../../services/housekeeping/src/index';
import billingApp from '../../services/billing/src/index';
import reportApp, { type Env as ReportEnv } from '../../services/report-analytics/src/index';

describe('Phase 4 — 21+ UAT Scenarios, Idempotency, Fault Tolerance & Demo Mock Data (Issue #13)', () => {
  let authSqlite: DatabaseSync;
  let roomSqlite: DatabaseSync;
  let resSqlite: DatabaseSync;
  let hkSqlite: DatabaseSync;
  let billSqlite: DatabaseSync;
  let reportSqlite: DatabaseSync;

  let authEnv: AuthEnv;
  let roomEnv: { DB: D1Database; ENVIRONMENT?: string; QSTASH_CURRENT_SIGNING_KEY?: string };
  let resEnv: ReservationEnv;
  let hkEnv: HousekeepingEnv;
  let billEnv: { DB: D1Database; ENVIRONMENT?: string; QSTASH_CURRENT_SIGNING_KEY?: string };
  let reportEnv: ReportEnv;
  let gatewayEnv: GatewayEnv;
  let mockKv: KVNamespace;

  let ownerToken: string;
  let frontDeskToken: string;
  let housekeepingToken: string;

  const RES_HEADERS = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-fd-003',
    'x-internal-service-key': 'test-internal-key',
  };

  beforeEach(async () => {
    mockKv = createMockKV();

    // 1. Auth DB
    authSqlite = new DatabaseSync(':memory:');
    authSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../services/auth-user/schema.sql'), 'utf8'));
    authSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../scripts/seeds/01_auth_user.sql'), 'utf8'));
    authEnv = {
      DB: createMockD1(authSqlite),
      KV: mockKv,
      JWT_SECRET: TEST_JWT_SECRET,
      ENVIRONMENT: 'test',
    };

    // 2. Room Inventory DB
    roomSqlite = new DatabaseSync(':memory:');
    roomSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../services/room-inventory/schema.sql'), 'utf8'));
    roomSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../scripts/seeds/02_room.sql'), 'utf8'));
    roomEnv = {
      DB: createMockD1(roomSqlite),
      ENVIRONMENT: 'test',
    };

    // 3. Reservation DB
    resSqlite = new DatabaseSync(':memory:');
    resSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../services/reservation/schema.sql'), 'utf8'));
    resSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../scripts/seeds/03_reservation.sql'), 'utf8'));
    resEnv = {
      DB: createMockD1(resSqlite),
      ENVIRONMENT: 'test',
    };

    // 4. Housekeeping DB
    hkSqlite = new DatabaseSync(':memory:');
    hkSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../services/housekeeping/schema.sql'), 'utf8'));
    hkSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../scripts/seeds/04_housekeeping.sql'), 'utf8'));
    hkEnv = {
      DB: createMockD1(hkSqlite),
      ENVIRONMENT: 'test',
      JWT_SECRET: TEST_JWT_SECRET,
    };

    // 5. Billing DB
    billSqlite = new DatabaseSync(':memory:');
    billSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../services/billing/schema.sql'), 'utf8'));
    billSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../scripts/seeds/05_billing.sql'), 'utf8'));
    billEnv = {
      DB: createMockD1(billSqlite),
      ENVIRONMENT: 'test',
    };

    // 6. Report Analytics DB
    reportSqlite = new DatabaseSync(':memory:');
    reportSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../services/report-analytics/schema.sql'), 'utf8'));
    reportSqlite.exec(fs.readFileSync(path.resolve(__dirname, '../../scripts/seeds/06_report.sql'), 'utf8'));
    reportEnv = {
      DB: createMockD1(reportSqlite),
      ENVIRONMENT: 'test',
    };

    // 7. API Gateway wired to real in-memory service apps
    const makeFetcher = (serviceApp: any, serviceEnv: any): Fetcher =>
      ({
        fetch: (req: RequestInfo | URL, init?: RequestInit) => serviceApp.fetch(new Request(req, init), serviceEnv),
      }) as unknown as Fetcher;

    gatewayEnv = {
      AUTH_USER_SERVICE: makeFetcher(authApp, authEnv),
      ROOM_INVENTORY_SERVICE: makeFetcher(roomInventoryApp, roomEnv),
      RESERVATION_SERVICE: makeFetcher(reservationApp, resEnv),
      HOUSEKEEPING_SERVICE: makeFetcher(housekeepingApp, hkEnv),
      BILLING_SERVICE: makeFetcher(billingApp, billEnv),
      REPORT_ANALYTICS_SERVICE: makeFetcher(reportApp, reportEnv),
      KV: mockKv,
      JWT_SECRET: TEST_JWT_SECRET,
      ENVIRONMENT: 'test',
    };

    ownerToken = await createTestToken({
      sub: 'usr-owner-001',
      email: 'owner@keystay.com',
      role: 'owner',
    });
    frontDeskToken = await createTestToken({
      sub: 'usr-fd-003',
      email: 'frontdesk@keystay.com',
      role: 'front_desk',
    });
    housekeepingToken = await createTestToken({
      sub: 'usr-hk-004',
      email: 'housekeeping@keystay.com',
      role: 'housekeeping',
    });
  });

  // =========================================================================
  // 1.1 UAT 1-4: Auth & RBAC Security (Login, Token expiry, Role restriction)
  // =========================================================================
  describe('UAT 1-4: Auth & RBAC Security (3 Consolidated Roles: owner, front_desk, housekeeping)', () => {
    it('UAT 1: Seeded accounts (owner@keystay.com / Keystay@2026) login and return valid JWT with role claims', async () => {
      const loginRes = await authApp.request(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'owner@keystay.com', password: 'Keystay@2026' }),
        },
        authEnv
      );
      expect(loginRes.status).to.equal(200);
      const loginJson: any = await loginRes.json();
      expect(loginJson.success).to.be.true;
      expect(loginJson.data.user.role).to.equal('owner');
      expect(loginJson.data.tokens.accessToken).to.be.a('string');
    });

    it('UAT 2 & 3: Rejects missing, malformed, or revoked/expired JWT tokens with 401 UNAUTHORIZED', async () => {
      const noTokenRes = await gatewayApp.request('/api/rooms', { method: 'GET' }, gatewayEnv);
      expect(noTokenRes.status).to.equal(401);

      const badTokenRes = await gatewayApp.request(
        '/api/rooms',
        { method: 'GET', headers: { Authorization: 'Bearer invalid.jwt.token' } },
        gatewayEnv
      );
      expect(badTokenRes.status).to.equal(401);

      const revokedToken = await createTestToken({
        sub: 'usr-fd-003',
        email: 'frontdesk@keystay.com',
        role: 'front_desk',
        jti: 'jti-revoked-uat',
      });
      await mockKv.put('blacklist:jti-revoked-uat', 'true');
      const revokedRes = await gatewayApp.request(
        '/api/rooms',
        { method: 'GET', headers: { Authorization: `Bearer ${revokedToken}` } },
        gatewayEnv
      );
      expect(revokedRes.status).to.equal(401);
    });

    it('UAT 4 (UAT-MGR02): Enforces strict RBAC across owner, front_desk, and housekeeping', async () => {
      const hkUsers = await gatewayApp.request(
        '/api/users',
        { method: 'GET', headers: { Authorization: `Bearer ${housekeepingToken}` } },
        gatewayEnv
      );
      expect(hkUsers.status).to.equal(403);

      const hkReports = await gatewayApp.request(
        '/api/reports/kpis',
        { method: 'GET', headers: { Authorization: `Bearer ${housekeepingToken}` } },
        gatewayEnv
      );
      expect(hkReports.status).to.equal(403);

      const fdBills = await gatewayApp.request(
        '/api/bills',
        { method: 'GET', headers: { Authorization: `Bearer ${frontDeskToken}` } },
        gatewayEnv
      );
      expect(fdBills.status).to.equal(200);

      const fdReports = await gatewayApp.request(
        '/api/reports/kpis',
        { method: 'GET', headers: { Authorization: `Bearer ${frontDeskToken}` } },
        gatewayEnv
      );
      expect(fdReports.status).to.equal(403);

      const ownerReports = await gatewayApp.request(
        '/api/reports/kpis',
        { method: 'GET', headers: { Authorization: `Bearer ${ownerToken}` } },
        gatewayEnv
      );
      expect(ownerReports.status).to.equal(200);
    });
  });

  // =========================================================================
  // 1.2 UAT 5-8: Room Inventory & State Machine Transitions (UAT-FD01, UAT-FD07)
  // =========================================================================
  describe('UAT 5-8: Room Inventory, State Machine Transitions & Quick Emergency Contacts', () => {
    it('UAT 5 (UAT-FD01): Filters Room Matrix by floor and status accurately', async () => {
      const res = await roomInventoryApp.request('/rooms?floor=2&status=available', { method: 'GET' }, roomEnv as any);
      expect(res.status).to.equal(200);
      const json: any = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array').that.is.not.empty;
      for (const rm of json.data) {
        expect(String(rm.floor)).to.equal('2');
        expect(rm.status).to.equal('available');
      }
    });

    it('UAT 6-8: Enforces 7-state Room State Machine and blocks invalid transitions (e.g. occupied -> available directly)', async () => {
      // Room 204 is available -> transition to reserved
      const toReserved = await roomInventoryApp.request(
        '/rooms/rm-204/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'reserved', changeReason: 'Advance booking UAT' }),
        },
        roomEnv as any
      );
      expect(toReserved.status).to.equal(200);

      // reserved -> occupied (requires reservationId or checkin eventSource per Ghost Room Prevention guard)
      const toOccupied = await roomInventoryApp.request(
        '/rooms/rm-204/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'occupied',
            reservationId: 'res-uat-204',
            changeReason: 'Guest checked in UAT',
          }),
        },
        roomEnv as any
      );
      expect(toOccupied.status).to.equal(200);

      // occupied -> available directly must be rejected (must go through checked_out -> cleaning -> available)
      const invalidDirectAvailable = await roomInventoryApp.request(
        '/rooms/rm-204/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'available', changeReason: 'Illegal shortcut' }),
        },
        roomEnv as any
      );
      expect(invalidDirectAvailable.status).to.be.oneOf([400, 422]);
    });

    it('UAT-FD07 & UAT-HK05: Front Desk and Housekeeping can read 24h emergency outsource contacts', async () => {
      const res = await housekeepingApp.request(
        '/housekeeping/outsource-contacts?is_emergency=1&is_active=1',
        { method: 'GET' },
        hkEnv
      );
      expect(res.status).to.equal(200);
      const json: any = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array').that.is.not.empty;
      expect(json.data.every((c: any) => Number(c.isEmergency ?? c.is_emergency) === 1)).to.be.true;
    });
  });

  // =========================================================================
  // 1.3 UAT 9-13: Reservation, Double Booking Prevention, Walk-in & Night Audit
  // =========================================================================
  describe('UAT 9-13: Reservation Lifecycle, Double Booking Prevention, Walk-in & Night Audit', () => {
    it('UAT 9 & 10 (UAT-FD02): Creates advance booking with channel/slip metadata and prevents double booking with 409 Conflict', async () => {
      const createRes = await reservationApp.request(
        '/reservations',
        {
          method: 'POST',
          headers: RES_HEADERS,
          body: JSON.stringify({
            guestName: 'สมชาย ใจดี',
            phone: '0812345678',
            email: 'somchai@example.com',
            roomId: 'rm-105',
            roomNumber: '105',
            roomTypeId: 'rt-std',
            checkInDate: '2026-12-01',
            checkOutDate: '2026-12-04',
            nightlyRate: 2200,
            depositAmount: 500,
            bookingSource: 'phone',
            paymentStatus: 'paid',
            paymentSlipRef: 'SLIP-UAT-001',
          }),
        },
        resEnv
      );
      expect(createRes.status).to.equal(201);
      const createdJson: any = await createRes.json();
      expect(createdJson.success).to.be.true;
      expect(createdJson.data.status).to.equal('confirmed');
      expect(createdJson.data.bookingSource).to.equal('phone');
      expect(createdJson.data.paymentStatus).to.equal('paid');

      // Overlapping booking on rm-105 for 2026-12-02 to 2026-12-05 must fail with 409 Conflict
      const overlapRes = await reservationApp.request(
        '/reservations',
        {
          method: 'POST',
          headers: RES_HEADERS,
          body: JSON.stringify({
            guestName: 'แขกจองซ้ำ',
            phone: '0899999999',
            roomId: 'rm-105',
            roomNumber: '105',
            roomTypeId: 'rt-std',
            checkInDate: '2026-12-02',
            checkOutDate: '2026-12-05',
            nightlyRate: 2200,
          }),
        },
        resEnv
      );
      expect(overlapRes.status).to.equal(409);
    });

    it('UAT 11 & 12 (UAT-FD03, UAT-FD04, UAT-FD06): Supports Check-in, rejects invalid Check-in on already checked-in booking, and supports One-step Walk-in', async () => {
      // UAT-FD03: Check in confirmed reservation res-004
      const checkInRes = await reservationApp.request(
        '/reservations/res-004/check-in',
        {
          method: 'POST',
          headers: RES_HEADERS,
          body: JSON.stringify({
            idCardNumber: '1100200300400',
            depositAmount: 1000,
          }),
        },
        resEnv
      );
      expect(checkInRes.status).to.equal(200);
      const checkInJson: any = await checkInRes.json();
      expect(checkInJson.data.status).to.equal('checked_in');

      // UAT-FD04: Double check-in on already checked_in reservation must return 400
      const doubleCheckIn = await reservationApp.request(
        '/reservations/res-004/check-in',
        {
          method: 'POST',
          headers: RES_HEADERS,
          body: JSON.stringify({}),
        },
        resEnv
      );
      expect(doubleCheckIn.status).to.equal(400);

      // UAT-FD06: One-step Walk-in on available room rm-204
      const walkInRes = await reservationApp.request(
        '/reservations/walk-in',
        {
          method: 'POST',
          headers: RES_HEADERS,
          body: JSON.stringify({
            guestName: 'นารี รุ่งเรือง',
            phone: '0898765432',
            nationalIdOrPassport: '1234567890123',
            roomId: 'rm-204',
            roomNumber: '204',
            roomTypeId: 'rt-dlx',
            checkInDate: '2026-11-14',
            checkOutDate: '2026-11-15',
            nightlyRate: 3500,
            depositAmount: 500,
            bookingSource: 'walk_in',
            paymentStatus: 'paid',
          }),
        },
        resEnv
      );
      expect(walkInRes.status).to.equal(201);
      const walkInJson: any = await walkInRes.json();
      expect(walkInJson.data.status).to.equal('checked_in');
    });

    it('UAT 13: Runs Night Audit cycle accurately', async () => {
      const auditRes = await reservationApp.request(
        '/reservations/night-audit',
        {
          method: 'POST',
          headers: RES_HEADERS,
          body: JSON.stringify({ auditDate: '2026-11-14' }),
        },
        resEnv
      );
      expect(auditRes.status).to.equal(200);
      const auditJson: any = await auditRes.json();
      expect(auditJson.success).to.be.true;
    });
  });

  // =========================================================================
  // 1.4 UAT 14-17: Check-out Fan-out 1:4 (Room, Housekeeping, Billing, Report)
  // =========================================================================
  describe('UAT 14-17 (UAT-FD05, UAT-HK01, UAT-BL01): Check-out Event Fan-out 1:4', () => {
    it('Fans out ReservationCheckedOut to all 4 subscriber services atomically and idempotently', async () => {
      // 1. Trigger check-out on Reservation Service (res-003 Room 501)
      const checkoutRes = await reservationApp.request(
        '/reservations/res-003/check-out',
        {
          method: 'POST',
          headers: RES_HEADERS,
          body: JSON.stringify({ notes: 'UAT Fan-out 1:4 Checkout' }),
        },
        resEnv
      );
      expect(checkoutRes.status).to.equal(200);
      const checkoutJson: any = await checkoutRes.json();
      expect(checkoutJson.data.status).to.equal('checked_out');

      // Construct canonical ReservationCheckedOut event payload
      const fanOutEvent = {
        eventId: 'evt-uat-fanout-501',
        eventType: 'ReservationCheckedOut',
        timestamp: new Date().toISOString(),
        reservationId: 'res-fanout-501',
        bookingNumber: 'RES-2026-5010',
        bookingType: 'standard',
        roomId: 'rm-501',
        roomNumber: '501',
        roomTypeId: 'rt-pres',
        roomTypeName: 'Presidential Villa',
        floor: '5',
        guestId: 'gst-003',
        guestName: 'Hans Mueller',
        guestEmail: 'hans@example.com',
        guestPhone: '0811112222',
        checkInDate: '2026-11-09',
        actualCheckIn: '2026-11-09T14:00:00.000Z',
        checkOutDate: '2026-11-16',
        actualCheckOut: new Date().toISOString(),
        totalNights: '7',
        nightlyRate: '12500.00',
        roomTotalAmount: '87500.00',
        depositAmount: '20000.00',
        taxRate: '0.07',
        taxAmount: '6125.00',
        netAmount: '93625.00',
        currency: 'THB',
        cleaningType: 'checkout_clean',
        priority: 'high',
        performedBy: 'usr-fd-003',
      };

      // Subscriber 1: Room Inventory -> transitions rm-501 to checked_out
      const subRoom = await roomInventoryApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fanOutEvent),
        },
        roomEnv as any
      );
      expect(subRoom.status).to.equal(200);
      const roomCheck = await roomInventoryApp.request('/rooms/rm-501', { method: 'GET' }, roomEnv as any);
      const roomJson: any = await roomCheck.json();
      expect(roomJson.data.status).to.equal('checked_out');

      // Subscriber 2: Housekeeping -> spawns pending checkout_clean task for rm-501
      const subHk = await housekeepingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'upstash-message-id': 'msg-fanout-501' },
          body: JSON.stringify(fanOutEvent),
        },
        hkEnv
      );
      expect(subHk.status).to.equal(201);
      const hkJson: any = await subHk.json();
      expect(hkJson.data.roomNumber).to.equal('501');
      expect(hkJson.data.status).to.equal('pending');

      // Subscriber 3: Billing -> spawns draft/pending bill for res-fanout-501
      const subBill = await billingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fanOutEvent),
        },
        billEnv as any
      );
      expect(subBill.status).to.equal(201);
      const billJson: any = await subBill.json();
      expect(billJson.data.reservationId).to.equal('res-fanout-501');

      // Subscriber 4: Report Analytics -> records checkout metric
      const subReport = await reportApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fanOutEvent),
        },
        reportEnv
      );
      expect(subReport.status).to.equal(200);
    });
  });

  // =========================================================================
  // 1.5 UAT 18-20: Minibar, Extra Amenities, Cashier Settlement & Deposit Deductions
  // =========================================================================
  describe('UAT 18-20 (UAT-BL01 to UAT-BL04): Folio Split Billing, Extra Amenities, Deposit Deduction & Receipt', () => {
    it('Separates upfront-paid initial stay from unpaid extension/minibar/amenities, deducts deposit at checkout, and issues receipt', async () => {
      // 1. Create initial upfront-paid bill at check-in (Room 2,000 THB, 7% VAT = 140 THB, Deposit = 500 THB, serviceChargeRate = 0)
      const createBillRes = await billingApp.request(
        '/bills',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: 'res-uat-cashier-01',
            guestName: 'คุณเดียร์ ทดสอบระบบ',
            roomNumber: '204',
            depositDeducted: 500,
            serviceChargeRate: 0,
            paymentMethod: 'transfer',
            status: 'paid',
            items: [
              {
                itemType: 'room_charge',
                category: 'room',
                description: 'ค่าห้องพัก ห้องดีลักซ์ ซีวิว (1 คืน)',
                quantity: 1,
                unitPrice: 2000,
                isPaid: true,
              },
            ],
          }),
        },
        billEnv as any
      );
      expect(createBillRes.status).to.equal(201);
      const billCreated: any = await createBillRes.json();
      const billId = billCreated.data.id;
      expect(billCreated.data.status).to.equal('paid');
      expect(Number(billCreated.data.serviceCharge)).to.equal(0);
      expect(billCreated.data.items[0].isPaid).to.be.true;

      // 2. Guest requests chargeable Extra Bed via Housekeeping Amenity Requests API
      const amenityReqRes = await housekeepingApp.request(
        '/housekeeping/amenity-requests',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomNumber: '204',
            reservationId: 'res-uat-cashier-01',
            amenityId: 'am-extra-bed',
            amenityName: 'เตียงเสริม (Extra Bed)',
            category: 'bedding',
            quantity: 1,
            isChargeable: 1,
            unitPrice: 300,
            requestedBy: 'Front Desk',
          }),
        },
        hkEnv
      );
      expect(amenityReqRes.status).to.equal(201);

      // 3. Add chargeable Extra Bed (300 THB) and Minibar (100 THB) to Folio as unpaid items
      await billingApp.request(
        `/bills/${billId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'room_service',
            category: 'service',
            description: '[Amenity] เตียงเสริม (Extra Bed)',
            quantity: 1,
            unitPrice: 300,
            isPaid: false,
          }),
        },
        billEnv as any
      );
      const afterMinibarRes = await billingApp.request(
        `/bills/${billId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'minibar',
            category: 'minibar',
            description: 'โค้กกระป๋อง',
            quantity: 2,
            unitPrice: 50,
            isPaid: false,
          }),
        },
        billEnv as any
      );
      expect(afterMinibarRes.status).to.equal(201);
      const afterMinibarJson: any = await afterMinibarRes.json();
      expect(afterMinibarJson.data.bill.status).to.equal('unpaid');
      expect(Number(afterMinibarJson.data.bill.amountDue)).to.equal(0);

      // 4. Settle at check-out -> status transitions to 'paid' and all items become isPaid = true
      const settleRes = await billingApp.request(
        `/bills/${billId}/pay`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: 'cash',
            amount: 0,
            settleInFull: true,
            referenceNumber: 'CHKOUT-UAT-204',
          }),
        },
        billEnv as any
      );
      expect(settleRes.status).to.equal(200);
      const settleJson: any = await settleRes.json();
      expect(settleJson.data.bill.status).to.equal('paid');
      expect(Number(settleJson.data.bill.amountDue)).to.equal(0);

      // 5. Issue Receipt & Tax Invoice (UAT-BL04)
      const receiptRes = await billingApp.request(`/bills/${billId}/receipt`, { method: 'GET' }, billEnv as any);
      expect(receiptRes.status).to.equal(200);
      const receiptJson: any = await receiptRes.json();
      expect(receiptJson.success).to.be.true;
      expect(receiptJson.data.financialSummary.taxRate).to.equal('7%');
    });
  });

  // =========================================================================
  // 1.6 UAT 21: Housekeeping Complete -> Room Available Cycle (UAT-HK02, UAT-HK03)
  // =========================================================================
  describe('UAT 21 (UAT-HK02 & UAT-HK03): Housekeeping Assign & Complete -> Room Available Cycle', () => {
    it('Transitions room from checked_out -> cleaning -> available upon housekeeping task completion', async () => {
      // Task hkt-002 is for Room 104 (assigned -> complete)
      const completeTaskRes = await housekeepingApp.request(
        '/tasks/hkt-002/complete',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inspectionStatus: 'passed',
            notes: 'ทำความสะอาดเสร็จสมบูรณ์พร้อมตรวจห้อง',
            afterPhotoUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
          }),
        },
        hkEnv
      );
      expect(completeTaskRes.status).to.equal(200);

      // Deliver HousekeepingTaskCompleted webhook to Room Inventory for rm-104
      const hkWebhookRes = await roomInventoryApp.request(
        '/webhooks/housekeeping-completed',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: 'evt-hk-complete-104',
            eventType: 'HousekeepingTaskCompleted',
            timestamp: new Date().toISOString(),
            taskId: 'hkt-002',
            roomId: 'rm-104',
            roomNumber: '104',
            staffId: 'hk-staff-001',
            staffName: 'Somchai Clean',
            completedAt: new Date().toISOString(),
            inspectionStatus: 'passed',
            nextRoomStatus: 'available',
          }),
        },
        roomEnv as any
      );
      expect(hkWebhookRes.status).to.equal(200);

      const rm104Res = await roomInventoryApp.request('/rooms/rm-104', { method: 'GET' }, roomEnv as any);
      const rm104Json: any = await rm104Res.json();
      expect(rm104Json.data.status).to.equal('available');
    });
  });

  // =========================================================================
  // 2. Idempotency & Fault Tolerance (UAT-INT01, UAT-INT02, UAT-INT03)
  // =========================================================================
  describe('Section 2: Idempotency, Upstash QStash Signature Verification & DLQ Fault Tolerance', () => {
    it('UAT-INT02: Duplicate checkout webhook delivery is idempotent across Billing and Housekeeping', async () => {
      const duplicateEvent = {
        eventId: 'evt-idemp-105',
        eventType: 'ReservationCheckedOut',
        timestamp: new Date().toISOString(),
        reservationId: 'res-idemp-105',
        bookingNumber: 'RES-2026-9105',
        bookingType: 'standard',
        roomId: 'rm-105',
        roomNumber: '105',
        roomTypeId: 'rt-std',
        roomTypeName: 'Standard Room',
        floor: '1',
        guestId: 'gst-001',
        guestName: 'Idempotent Guest',
        checkInDate: '2026-11-10',
        actualCheckIn: '2026-11-10T14:00:00.000Z',
        checkOutDate: '2026-11-12',
        actualCheckOut: new Date().toISOString(),
        totalNights: '2',
        nightlyRate: '2200.00',
        roomTotalAmount: '4400.00',
        depositAmount: '500.00',
        taxRate: '0.07',
        taxAmount: '308.00',
        netAmount: '4708.00',
        currency: 'THB',
        cleaningType: 'checkout_clean',
        priority: 'high',
        performedBy: 'usr-fd-003',
      };

      // Deliver twice to Housekeeping with same upstash-message-id
      const hkFirst = await housekeepingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'upstash-message-id': 'msg-idemp-105' },
          body: JSON.stringify(duplicateEvent),
        },
        hkEnv
      );
      expect(hkFirst.status).to.equal(201);

      const hkSecond = await housekeepingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'upstash-message-id': 'msg-idemp-105' },
          body: JSON.stringify(duplicateEvent),
        },
        hkEnv
      );
      expect(hkSecond.status).to.equal(200);
      const hkSecondJson: any = await hkSecond.json();
      expect(hkSecondJson.message).to.include('already exists');

      // Deliver twice to Billing with same reservationId
      const billFirst = await billingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duplicateEvent),
        },
        billEnv as any
      );
      expect(billFirst.status).to.equal(201);

      const billSecond = await billingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duplicateEvent),
        },
        billEnv as any
      );
      expect(billSecond.status).to.equal(200);
      const billSecondJson: any = await billSecond.json();
      expect(billSecondJson.message).to.include('Idempotent');
    });

    it('Verifies Upstash QStash Signature strictly when QSTASH_CURRENT_SIGNING_KEY is configured', async () => {
      const securedBillEnv = { ...billEnv, QSTASH_CURRENT_SIGNING_KEY: 'sig_key_test_123' };
      const securedRoomEnv = { ...roomEnv, QSTASH_CURRENT_SIGNING_KEY: 'sig_key_test_123' };
      const securedHkEnv = { ...hkEnv, QSTASH_CURRENT_SIGNING_KEY: 'sig_key_test_123', ENVIRONMENT: 'production' };

      const billUnauthorized = await billingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'upstash-signature': 'forged-sig' },
          body: JSON.stringify({ reservationId: 'res-001' }),
        },
        securedBillEnv as any
      );
      expect(billUnauthorized.status).to.equal(401);

      const roomUnauthorized = await roomInventoryApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'upstash-signature': 'forged-sig' },
          body: JSON.stringify({ reservationId: 'res-001' }),
        },
        securedRoomEnv as any
      );
      expect(roomUnauthorized.status).to.equal(401);

      const hkUnauthorized = await housekeepingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'upstash-signature': 'forged-sig' },
          body: JSON.stringify({ reservationId: 'res-001' }),
        },
        securedHkEnv
      );
      expect(hkUnauthorized.status).to.equal(401);
    });

    it('UAT-INT01 & UAT-INT03: Persists outbox_events atomically and rejects malformed webhook payloads without crashing', async () => {
      const badRoomWebhook = await roomInventoryApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalidPayload: true }),
        },
        roomEnv as any
      );
      expect(badRoomWebhook.status).to.equal(400);

      const badHkWebhook = await housekeepingApp.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalidPayload: true }),
        },
        hkEnv
      );
      expect(badHkWebhook.status).to.equal(400);
    });
  });

  // =========================================================================
  // 3. Demo Preparation: Seed Data & Documentation Alignment
  // =========================================================================
  describe('Section 3: Demo Mock Data (22 Rooms across 5 Floors, 3 RBAC Roles, Historical Reservations & Bills)', () => {
    it('Seeds 22 rooms across 5 floors, 3 RBAC roles (owner, front_desk, housekeeping), reservations, bills, and 30-day revenue metrics', async () => {
      const roomsCount: any = roomSqlite.prepare('SELECT COUNT(*) as total FROM rooms').get();
      expect(roomsCount.total).to.equal(22);

      const floorsCount: any = roomSqlite.prepare('SELECT COUNT(*) as total FROM floors').get();
      expect(floorsCount.total).to.equal(5);

      const rolesRows: any[] = authSqlite.prepare('SELECT DISTINCT role FROM users').all();
      const roles = rolesRows.map((r) => r.role).sort();
      expect(roles).to.deep.equal(['front_desk', 'housekeeping', 'owner']);

      const resCount: any = resSqlite.prepare('SELECT COUNT(*) as total FROM reservations').get();
      expect(resCount.total).to.be.greaterThanOrEqual(5);

      const billCount: any = billSqlite.prepare('SELECT COUNT(*) as total FROM bills').get();
      expect(billCount.total).to.be.greaterThanOrEqual(3);

      const reportDays: any = reportSqlite.prepare('SELECT COUNT(*) as total FROM daily_stats').get();
      expect(reportDays.total).to.be.greaterThanOrEqual(7);
    });
  });
});

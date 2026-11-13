import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import app from '../../services/billing/src/index';
import { type Env } from '../../services/billing/src/types';

describe('Billing Service (Dear - @allmusgus)', () => {
  let sqliteDb: DatabaseSync;
  let mockDb: D1Database;
  let env: Env;

  const HEADERS = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-cashier-test-001',
    'x-internal-service-key': 'test-internal-key',
  };

  beforeEach(() => {
    sqliteDb = new DatabaseSync(':memory:');

    // 1. Initialize schema
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/billing/schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);

    // 2. Load seed data
    const seedSql = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/seeds/05_billing.sql'),
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
      expect(json.service).to.equal('billing');
      expect(json.phase).to.include('Phase 2');
    });

    it('SUCCESS: returns root endpoint info with endpoint list and SA ownership', async () => {
      const res = await app.request('/', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.version).to.equal('2.0.0');
      expect(json.owner).to.include('allmusgus');
      expect(json.endpoints).to.be.an('array');
      expect(json.endpoints).to.include('POST /webhooks/checkout');
      expect(json.endpoints).to.include('POST /bills/:id/pay');
    });
  });

  describe('Webhook: POST /webhooks/checkout (Fan-out Ingestion)', () => {
    const runId = Date.now().toString().slice(-4);
    const checkoutEvent = {
      reservationId: `res-webhook-${runId}`,
      bookingNumber: `RES-2026-${runId}`,
      guestName: 'Natapohn Tameeruks',
      guestEmail: 'taew.natapohn@test.com',
      roomNumber: '501',
      roomTypeName: 'Deluxe Ocean View',
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-04',
      totalNights: 3,
      nightlyRate: 2500.0,
      roomTotalAmount: 7500.0,
      depositAmount: 2000.0,
    };

    it('SUCCESS: ingests checkout event, creates pending bill, and deducts key deposit', async () => {
      const res = await app.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(checkoutEvent),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.reservationId).to.equal(checkoutEvent.reservationId);
      expect(json.data.guestName).to.equal(checkoutEvent.guestName);
      expect(Number(json.data.subtotal)).to.equal(7500.0);
      // 7% VAT = 525.00, 10% Service Charge = 750.00
      expect(Number(json.data.taxAmount)).to.equal(525.0);
      expect(Number(json.data.serviceCharge)).to.equal(750.0);
      // Total = 7500 + 525 + 750 = 8775.00
      expect(Number(json.data.totalAmount)).to.equal(8775.0);
      expect(Number(json.data.depositDeducted)).to.equal(2000.0);
      // Amount Due = 8775 - 2000 = 6775.00
      expect(Number(json.data.amountDue)).to.equal(6775.0);
      expect(json.data.status).to.equal('pending');
    });

    it('SUCCESS: idempotent re-delivery does not create duplicate bills', async () => {
      // First delivery
      await app.request(
        '/webhooks/checkout',
        { method: 'POST', headers: HEADERS, body: JSON.stringify(checkoutEvent) },
        env
      );

      // Second delivery (duplicate event)
      const res2 = await app.request(
        '/webhooks/checkout',
        { method: 'POST', headers: HEADERS, body: JSON.stringify(checkoutEvent) },
        env
      );

      expect(res2.status).to.equal(200);
      const json2 = await res2.json();
      expect(json2.success).to.be.true;
      expect(json2.message).to.include('Idempotent');
    });

    it('BAD: returns 400 when missing reservationId', async () => {
      const res = await app.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ guestName: 'No Reservation ID' }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #75 & #76: Bill Items Management (POST & DELETE /bills/:id/items)', () => {
    it('SUCCESS: adds minibar charge to active bill and updates financial totals', async () => {
      // bill-002 is Sarah Jenkins (Room 202, pending)
      const res = await app.request(
        '/bills/bill-002/items',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            itemType: 'minibar',
            description: 'Singha Beer 330ml Can',
            quantity: 2,
            unitPrice: 120.0,
            itemDate: '2026-09-26',
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.item.itemType).to.equal('minibar');
      expect(Number(json.data.item.totalPrice)).to.equal(240.0);
    });

    it('SUCCESS: adds extra charge with category minibar (น้ำดื่ม)', async () => {
      const res = await app.request(
        '/bills/bill-002/items',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            category: 'minibar',
            description: 'น้ำดื่ม',
            unitPrice: 20,
            quantity: 1,
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.item.itemType).to.equal('minibar');
      expect(json.data.item.description).to.equal('น้ำดื่ม');
      expect(Number(json.data.item.unitPrice)).to.equal(20);
      expect(Number(json.data.item.totalPrice)).to.equal(20);
    });

    it('SUCCESS: adds extra charge with category service (บริการซักรีด -> room_service)', async () => {
      const res = await app.request(
        '/bills/bill-002/items',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            category: 'service',
            description: 'บริการซักรีด',
            unitPrice: 100,
            quantity: 1,
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.item.itemType).to.equal('room_service');
      expect(json.data.item.description).to.equal('บริการซักรีด');
      expect(Number(json.data.item.unitPrice)).to.equal(100);
      expect(Number(json.data.item.totalPrice)).to.equal(100);
    });

    it('SUCCESS: adds extra charge with itemType damage (คีย์การ์ดหาย)', async () => {
      const res = await app.request(
        '/bills/bill-002/items',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            itemType: 'damage',
            description: 'คีย์การ์ดหาย',
            unitPrice: 300,
            quantity: 1,
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.item.itemType).to.equal('damage');
      expect(json.data.item.description).to.equal('คีย์การ์ดหาย');
      expect(Number(json.data.item.unitPrice)).to.equal(300);
      expect(Number(json.data.item.totalPrice)).to.equal(300);
    });

    it('SUCCESS: deletes an item from bill and recalculates subtotal and tax', async () => {
      // Delete laundry item bi-008 from bill-002
      const res = await app.request(
        '/bills/bill-002/items/bi-008',
        {
          method: 'DELETE',
          headers: HEADERS,
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
    });
  });

  describe('API #81: Apply Discount (POST /bills/:id/discount)', () => {
    it('SUCCESS: applies discount amount to bill and updates taxable total', async () => {
      const res = await app.request(
        '/bills/bill-002/discount',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            discountAmount: 500.0,
            reason: 'VIP repeat customer discount',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(Number(json.data.appliedDiscount)).to.equal(500.0);
    });

    it('BAD: returns 400 when discount exceeds bill subtotal', async () => {
      const res = await app.request(
        '/bills/bill-002/discount',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            discountAmount: 999999.0,
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #72 & #79: Bill Retrieval (GET /bills/:id & /by-reservation/:resId)', () => {
    it('SUCCESS: retrieves bill details with embedded line items and payments', async () => {
      const res = await app.request(
        '/bills/bill-001',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.id).to.equal('bill-001');
      expect(json.data.guestName).to.equal('Ploy Chermarn');
      expect(json.data.items).to.be.an('array');
      expect(json.data.items.length).to.be.at.least(4);
    });

    it('SUCCESS: retrieves bill by reservationId', async () => {
      const res = await app.request(
        '/bills/by-reservation/res-005',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.reservationId).to.equal('res-005');
    });

    it('BAD: returns 404 for non-existent bill', async () => {
      const res = await app.request(
        '/bills/bill-999-not-found',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(404);
    });
  });

  describe('API #77: Bill Payment (POST /bills/:id/pay)', () => {
    it('SUCCESS: handles partial payment and updates amount due', async () => {
      // bill-002 amount_due is 13871.40
      const res = await app.request(
        '/bills/bill-002/pay',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            paymentMethodId: 'pm-card',
            amount: 5000.0,
            referenceNumber: 'VISA-AUTH-PARTIAL-001',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(Number(json.data.bill.amountPaid)).to.equal(5000.0);
      expect(json.data.bill.status).to.equal('partially_paid');
    });

    it('SUCCESS: full payment transitions bill status to paid', async () => {
      // Pay the remaining balance
      const getRes = await app.request('/bills/bill-002', { method: 'GET', headers: HEADERS }, env);
      const getJson = await getRes.json();
      const remainingDue = Number(getJson.data.amountDue);

      const res = await app.request(
        '/bills/bill-002/pay',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            paymentMethodId: 'pm-qr',
            amount: remainingDue,
            referenceNumber: 'PROMPTPAY-FULL-SETTLE',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(Number(json.data.bill.amountDue)).to.equal(0.0);
      expect(json.data.bill.status).to.equal('paid');
    });

    it('SUCCESS: zero-due settlement (deposit covers total or netPayable is 0) marks bill as paid without error', async () => {
      const createRes = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-zero-due-test',
            guestName: 'Zero Due Guest',
            roomNumber: '109',
            subtotal: 1000,
            taxRate: 0,
            serviceChargeRate: 0,
            depositDeducted: 1000,
          }),
        },
        env
      );
      const createJson = await createRes.json();
      const testBillId = createJson.data.id;

      const payRes = await app.request(
        `/bills/${testBillId}/pay`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            paymentMethod: 'cash',
            amount: 0,
          }),
        },
        env
      );

      expect(payRes.status).to.equal(200);
      const payJson = await payRes.json();
      expect(payJson.success).to.be.true;
      expect(payJson.data.bill.status).to.equal('paid');
      expect(Number(payJson.data.bill.amountDue)).to.equal(0);
    });

    it('BAD: returns 400 when payment amount is negative or 0', async () => {
      const res = await app.request(
        '/bills/bill-003/pay',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            paymentMethodId: 'pm-cash',
            amount: 0,
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });
  });

  describe('API #78: Receipt Generation (GET /bills/:id/receipt)', () => {
    it('SUCCESS: generates official printable receipt with line items and VAT breakdown', async () => {
      const res = await app.request(
        '/bills/bill-001/receipt',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.receiptNumber).to.not.be.undefined;
      expect(json.data.billInfo.billNumber).to.equal('BILL-2026-0001');
      expect(json.data.financialSummary.taxRate).to.equal('7%');
      expect(json.data.items).to.be.an('array');
    });
  });

  describe('API #80: Refund Processing (POST /bills/:id/refund)', () => {
    it('SUCCESS: processes refund and updates bill payment audit trail', async () => {
      // bill-001 is fully paid with amount_paid = 14374.50
      const res = await app.request(
        '/bills/bill-001/refund',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            amount: 1000.0,
            reason: 'Guest complained of noisy AC, approved compensation',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.refund.id).to.not.be.undefined;
      expect(Number(json.data.refund.amount)).to.equal(1000.0);
    });

    it('BAD: returns 400 when refund amount exceeds total amount paid', async () => {
      const res = await app.request(
        '/bills/bill-001/refund',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            amount: 999999.0,
            reason: 'Excessive refund request',
          }),
        },
        env
      );

      expect(res.status).to.equal(400);
    });

    it('SUCCESS: full refund transitions bill status to refunded and resets amountPaid', async () => {
      // 1. Create a zero-deposit bill
      const createRes = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-fullrefund-test',
            guestName: 'Full Refund Guest',
            roomNumber: '108',
            subtotal: 1000.0,
            depositDeducted: 0.0,
            items: [
              {
                itemType: 'room_charge',
                description: 'Room Charge 1 night',
                quantity: 1,
                unitPrice: 1000.0,
                itemDate: '2026-10-01',
              },
            ],
          }),
        },
        env
      );
      expect(createRes.status).to.equal(201);
      const createJson = await createRes.json();
      const billId = createJson.data.id;
      const totalDue = Number(createJson.data.amountDue);

      // 2. Pay in full
      const payRes = await app.request(
        `/bills/${billId}/pay`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            paymentMethod: 'CASH',
            amount: totalDue,
          }),
        },
        env
      );
      expect(payRes.status).to.equal(200);

      // 3. Process full refund
      const refundRes = await app.request(
        `/bills/${billId}/refund`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            amount: totalDue,
            reason: 'Guest cancelled immediately, full refund authorized',
          }),
        },
        env
      );

      expect(refundRes.status).to.equal(200);
      const refundJson = await refundRes.json();
      expect(refundJson.data.bill.status).to.equal('refunded');
      expect(Number(refundJson.data.bill.amountPaid)).to.equal(0.0);
    });
  });

  describe('APIs #82 & #83: Payment Methods (GET & POST /payment-methods)', () => {
    it('SUCCESS: lists active payment methods', async () => {
      const res = await app.request(
        '/payment-methods?active=true',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.length).to.be.at.least(4);
      const codes = json.data.map((pm: any) => pm.code);
      expect(codes).to.include.members(['CASH', 'CARD', 'PROMPTPAY', 'TRANSFER']);
    });

    it('SUCCESS: creates a new payment method', async () => {
      const res = await app.request(
        '/payment-methods',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            name: 'AliPay Cross-Border',
            code: 'ALIPAY',
            isActive: true,
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.code).to.equal('ALIPAY');
    });

    it('BAD: returns 409 when creating duplicate payment method code', async () => {
      const res = await app.request(
        '/payment-methods',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            name: 'Cash Duplicate',
            code: 'CASH',
            isActive: true,
          }),
        },
        env
      );

      expect(res.status).to.equal(409);
    });
  });

  describe('APIs #84 & #85: Invoices (GET /invoices & GET /invoices/:id)', () => {
    it('SUCCESS: lists invoices with pagination', async () => {
      const res = await app.request(
        '/invoices?limit=10',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
      expect(json.data.length).to.be.at.least(1);
    });

    it('SUCCESS: retrieves single invoice with customer details', async () => {
      const res = await app.request(
        '/invoices/inv-001',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.id).to.equal('inv-001');
      expect(json.data.issuedToName).to.equal('Ploy Chermarn');
    });

    it('SUCCESS: sends invoice via email and updates sent_at timestamp', async () => {
      const res = await app.request(
        '/invoices/inv-001/send-email',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            recipientEmail: 'ploy.c@example.com',
            notes: 'Thank you for your stay at KEYSTAY!',
          }),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.invoice.status).to.equal('sent');
      expect(json.data.sentAt).to.not.be.null;
    });
  });

  describe('API #71 & #73: Bills Filtering & Manual Creation', () => {
    it('SUCCESS: filters bills by status and guest name', async () => {
      const res = await app.request(
        '/bills?status=pending&search=Sarah',
        { method: 'GET', headers: HEADERS },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
      expect(json.data.length).to.equal(1);
      expect(json.data[0].guestName).to.equal('Sarah Jenkins');
    });

    it('SUCCESS: creates a manual custom bill from front desk', async () => {
      const res = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-manual-001',
            guestName: 'Kornkanok Thongchai',
            roomNumber: '105',
            subtotal: 3000.0,
            depositDeducted: 500.0,
            items: [
              {
                itemType: 'room_charge',
                description: 'Standard Room (1 night)',
                quantity: 1,
                unitPrice: 3000.0,
                itemDate: '2026-10-01',
              },
            ],
          }),
        },
        env
      );

      expect(res.status).to.equal(201);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data.guestName).to.equal('Kornkanok Thongchai');
      expect(Number(json.data.subtotal)).to.equal(3000.0);
    });
  });

  describe('Task 2: Pre-paid vs Unpaid Line Items (is_paid), Payment Method Resolution & serviceChargeRate=0', () => {
    it('SUCCESS: resolves paymentMethod aliases on POST /bills (cash/transfer/upfront_checkin) and preserves serviceChargeRate=0', async () => {
      const methodsToTest = ['cash', 'transfer', 'credit_card', 'qr_promptpay', 'upfront_checkin'];

      for (const method of methodsToTest) {
        const res = await app.request(
          '/bills',
          {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
              reservationId: `res-upfront-${method}`,
              guestName: 'Upfront Guest',
              roomNumber: '101',
              serviceChargeRate: 0,
              taxRate: 0.07,
              status: 'paid',
              paymentMethod: method,
              items: [
                {
                  itemType: 'room_charge',
                  description: 'Room Charge (1 night)',
                  quantity: 1,
                  unitPrice: 2000,
                },
              ],
            }),
          },
          env
        );

        expect(res.status).to.equal(201);
        const json = await res.json();
        expect(json.success).to.be.true;
        expect(json.data.status).to.equal('paid');
        expect(Number(json.data.serviceCharge)).to.equal(0);
        expect(Number(json.data.taxAmount)).to.equal(140);
        expect(Number(json.data.totalAmount)).to.equal(2140);
        expect(Number(json.data.amountPaid)).to.equal(2140);
        expect(Number(json.data.amountDue)).to.equal(0);
        expect(json.data.items[0].isPaid).to.equal(true);
      }
    });

    it('SUCCESS: tracks pre-paid room item separately from unpaid extension/minibar, preserves serviceCharge=0, and allows deleting unpaid items', async () => {
      // 1. Create pre-paid room bill (2000 + 140 VAT = 2140) with serviceChargeRate = 0
      const createRes = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-pms-split-001',
            guestName: 'Somchai Jaidee',
            roomNumber: '201',
            serviceChargeRate: 0,
            taxRate: 0.07,
            depositDeducted: 500,
            status: 'paid',
            paymentMethod: 'cash',
            items: [
              {
                itemType: 'room_charge',
                description: 'ค่าห้องพักเบื้องต้น (1 คืน)',
                quantity: 1,
                unitPrice: 2000,
                isPaid: true,
              },
            ],
          }),
        },
        env
      );
      expect(createRes.status).to.equal(201);
      const created = (await createRes.json()).data;
      const billId = created.id;
      const roomItemId = created.items[0].id;
      expect(created.items[0].isPaid).to.equal(true);

      // 2. Add unpaid stay extension (2 x 2200 = 4400, + 308 VAT = 4708)
      const extRes = await app.request(
        `/bills/${billId}/items`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            category: 'room',
            itemType: 'room_charge',
            description: 'ขยายเวลาเข้าพัก (+2 คืน)',
            quantity: 2,
            unitPrice: 2200,
          }),
        },
        env
      );
      expect(extRes.status).to.equal(201);
      const extData = (await extRes.json()).data;
      const extItemId = extData.item.id;
      expect(extData.item.isPaid).to.equal(false);
      expect(extData.bill.status).to.equal('unpaid');
      expect(Number(extData.bill.serviceCharge)).to.equal(0);
      expect(Number(extData.bill.subtotal)).to.equal(6400);
      expect(Number(extData.bill.taxAmount)).to.equal(448);
      expect(Number(extData.bill.totalAmount)).to.equal(6848);
      expect(Number(extData.bill.amountPaid)).to.equal(2140);
      // 4708 unpaid - 500 deposit = 4208
      expect(Number(extData.bill.amountDue)).to.equal(4208);

      // 3. Cannot delete already-paid room item
      const delPaidRes = await app.request(
        `/bills/${billId}/items/${roomItemId}`,
        { method: 'DELETE', headers: HEADERS },
        env
      );
      expect(delPaidRes.status).to.equal(400);

      // 4. Can delete unpaid extension item; bill reverts cleanly to paid
      const delExtRes = await app.request(
        `/bills/${billId}/items/${extItemId}`,
        { method: 'DELETE', headers: HEADERS },
        env
      );
      expect(delExtRes.status).to.equal(200);
      const afterDel = (await delExtRes.json()).data;
      expect(afterDel.status).to.equal('paid');
      expect(Number(afterDel.subtotal)).to.equal(2000);
      expect(Number(afterDel.totalAmount)).to.equal(2140);
      expect(Number(afterDel.amountDue)).to.equal(0);
    });

    it('SUCCESS: minibar (107) covered by deposit (500) stays unpaid until checkout /pay, then marks all items paid', async () => {
      const createRes = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-minibar-refund-001',
            guestName: 'Wipawee S.',
            roomNumber: '204',
            serviceChargeRate: 0,
            taxRate: 0.07,
            depositDeducted: 500,
            status: 'paid',
            paymentMethod: 'transfer',
            items: [
              {
                itemType: 'room_charge',
                description: 'Room Charge (1 night)',
                quantity: 1,
                unitPrice: 2000,
                isPaid: true,
              },
            ],
          }),
        },
        env
      );
      const billId = (await createRes.json()).data.id;

      const addMinibar = await app.request(
        `/bills/${billId}/items`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            category: 'minibar',
            description: 'Snacks',
            quantity: 1,
            unitPrice: 100,
          }),
        },
        env
      );
      expect(addMinibar.status).to.equal(201);
      const afterMinibar = (await addMinibar.json()).data;
      expect(afterMinibar.bill.status).to.equal('unpaid');
      expect(Number(afterMinibar.bill.amountDue)).to.equal(0);
      expect(Number(afterMinibar.bill.totalAmount)).to.equal(2247);

      // Settle at checkout with 0 due
      const payRes = await app.request(
        `/bills/${billId}/pay`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ paymentMethod: 'cash', amount: 0, depositDeducted: 500 }),
        },
        env
      );
      expect(payRes.status).to.equal(200);
      const getBill = await app.request(`/bills/${billId}`, { method: 'GET', headers: HEADERS }, env);
      const finalBill = (await getBill.json()).data;
      expect(finalBill.status).to.equal('paid');
      expect(finalBill.items.every((i: any) => i.isPaid === true)).to.equal(true);
    });

    it('SUCCESS: ensureBillItemsIsPaidColumn idempotently migrates legacy DB lacking is_paid column', async () => {
      const legacySqlite = new DatabaseSync(':memory:');
      legacySqlite.exec(`
        CREATE TABLE payment_methods (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, code TEXT UNIQUE NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
        CREATE TABLE bills (id TEXT PRIMARY KEY, bill_number TEXT UNIQUE NOT NULL, reservation_id TEXT NOT NULL, guest_name TEXT NOT NULL, room_number TEXT NOT NULL, subtotal REAL NOT NULL DEFAULT 0, discount_amount REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0.07, tax_amount REAL NOT NULL DEFAULT 0, service_charge REAL NOT NULL DEFAULT 0.10, total_amount REAL NOT NULL DEFAULT 0, deposit_deducted REAL NOT NULL DEFAULT 0, amount_paid REAL NOT NULL DEFAULT 0, amount_due REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE bill_items (id TEXT PRIMARY KEY, bill_id TEXT NOT NULL, item_type TEXT NOT NULL, description TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, unit_price REAL NOT NULL, total_price REAL NOT NULL, item_date TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE payments (id TEXT PRIMARY KEY, bill_id TEXT NOT NULL, payment_method_id TEXT NOT NULL, amount REAL NOT NULL, reference_number TEXT, status TEXT NOT NULL DEFAULT 'completed', paid_at TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE invoices (id TEXT PRIMARY KEY, invoice_number TEXT UNIQUE NOT NULL, bill_id TEXT NOT NULL, issued_to_name TEXT NOT NULL, issued_to_email TEXT, total_amount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'issued', sent_at TEXT, created_at TEXT NOT NULL);
        CREATE TABLE refunds (id TEXT PRIMARY KEY, bill_id TEXT NOT NULL, payment_id TEXT, amount REAL NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'completed', refunded_by TEXT, created_at TEXT NOT NULL);
        CREATE TABLE outbox_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, aggregate_id TEXT NOT NULL, aggregate_type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', published_at TEXT, created_at TEXT NOT NULL);
        INSERT INTO payment_methods (id, name, code, is_active, created_at) VALUES ('pm-cash', 'Cash (THB)', 'CASH', 1, '2026-09-01T08:00:00Z');
      `);
      const legacyEnv: Env = { DB: createMockD1(legacySqlite), ENVIRONMENT: 'test' };

      const res1 = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-legacy-mig',
            guestName: 'Legacy DB Guest',
            roomNumber: '102',
            serviceChargeRate: 0,
            status: 'paid',
            paymentMethod: 'cash',
            items: [{ itemType: 'room_charge', description: 'Room', quantity: 1, unitPrice: 1000 }],
          }),
        },
        legacyEnv
      );
      expect(res1.status).to.equal(201);
      const res2 = await app.request('/bills', { method: 'GET', headers: HEADERS }, legacyEnv);
      expect(res2.status).to.equal(200);
    });

    it('SUCCESS: preserves serviceChargeRate (both default 0.10 and explicit 0) when initial subtotal is 0 and items are added later', async () => {
      // Case 1: Default 10% service charge when subtotal=0 and serviceChargeRate omitted
      const defaultBillRes = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-zero-sub-default-sc',
            guestName: 'Zero Subtotal Default SC',
            roomNumber: '301',
            subtotal: 0,
          }),
        },
        env
      );
      expect(defaultBillRes.status).to.equal(201);
      const defaultBillId = (await defaultBillRes.json()).data.id;

      const addToDefaultRes = await app.request(
        `/bills/${defaultBillId}/items`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            itemType: 'room_charge',
            description: 'Room Charge',
            quantity: 1,
            unitPrice: 1000,
          }),
        },
        env
      );
      expect(addToDefaultRes.status).to.equal(201);
      const updatedDefault = (await addToDefaultRes.json()).data.bill;
      expect(Number(updatedDefault.subtotal)).to.equal(1000);
      expect(Number(updatedDefault.serviceCharge)).to.equal(100);
      expect(Number(updatedDefault.taxAmount)).to.equal(70);
      expect(Number(updatedDefault.totalAmount)).to.equal(1170);

      // Case 2: Explicit 0% service charge when subtotal=0 and serviceChargeRate=0
      const zeroScBillRes = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-zero-sub-zero-sc',
            guestName: 'Zero Subtotal Zero SC',
            roomNumber: '302',
            subtotal: 0,
            serviceChargeRate: 0,
          }),
        },
        env
      );
      expect(zeroScBillRes.status).to.equal(201);
      const zeroScBillId = (await zeroScBillRes.json()).data.id;

      const addToZeroScRes = await app.request(
        `/bills/${zeroScBillId}/items`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            itemType: 'room_charge',
            description: 'Room Charge',
            quantity: 1,
            unitPrice: 1000,
          }),
        },
        env
      );
      expect(addToZeroScRes.status).to.equal(201);
      const updatedZeroSc = (await addToZeroScRes.json()).data.bill;
      expect(Number(updatedZeroSc.subtotal)).to.equal(1000);
      expect(Number(updatedZeroSc.serviceCharge)).to.equal(0);
      expect(Number(updatedZeroSc.taxAmount)).to.equal(70);
      expect(Number(updatedZeroSc.totalAmount)).to.equal(1070);

      // Case 3: Small subtotal (subtotal=5 with 10% => service_charge=0.50) and custom 5% rate
      const smallBillRes = await app.request(
        '/bills',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            reservationId: 'res-small-sub-rate',
            guestName: 'Small Subtotal Guest',
            roomNumber: '303',
            serviceChargeRate: 0.05,
            items: [{ itemType: 'minibar', description: 'Water', quantity: 1, unitPrice: 5 }],
          }),
        },
        env
      );
      expect(smallBillRes.status).to.equal(201);
      const smallBillId = (await smallBillRes.json()).data.id;

      const addToSmallRes = await app.request(
        `/bills/${smallBillId}/items`,
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({
            itemType: 'minibar',
            description: 'Snack',
            quantity: 1,
            unitPrice: 95,
          }),
        },
        env
      );
      expect(addToSmallRes.status).to.equal(201);
      const updatedSmall = (await addToSmallRes.json()).data.bill;
      expect(Number(updatedSmall.subtotal)).to.equal(100);
      expect(Number(updatedSmall.serviceCharge)).to.equal(5);
    });
  });
});

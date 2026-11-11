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
});

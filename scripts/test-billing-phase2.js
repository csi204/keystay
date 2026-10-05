const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Load dev vars if present
let QSTASH_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
try {
  const devVarsPath = path.join(__dirname, '../apps/services/billing/.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const lines = fs.readFileSync(devVarsPath, 'utf8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = line.match(/^QSTASH_CURRENT_SIGNING_KEY=(.*)$/);
      if (match) QSTASH_KEY = match[1].trim();
    }
  }
} catch (_) {}

function createUpstashSignature(url, body) {
  if (!QSTASH_KEY) return null;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const bodyHash = crypto.createHash('sha256').update(body).digest('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = Buffer.from(JSON.stringify({
    iss: 'Upstash',
    sub: url,
    exp: now + 300,
    nbf: now - 300,
    body: bodyHash,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', QSTASH_KEY).update(header + '.' + claims).digest('base64url');
  return header + '.' + claims + '.' + signature;
}

const BASE_URL = 'http://127.0.0.1:8792';
const HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'usr-cashier-test-001',
  'x-internal-service-key': 'test-internal-key',
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== STARTING BILLING SERVICE PHASE 2 COMPREHENSIVE TESTS ===\n');
  const runId = Date.now().toString().slice(-4);

  // Test 1: Health & Metadata
  console.log('[Test Suite 1: Health & Metadata]');
  {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'GET /health returns 200 OK');
    assert(data.phase.includes('Phase 2'), 'Health indicates Phase 2 readiness');

    const metaRes = await fetch(`${BASE_URL}/`);
    const meta = await metaRes.json();
    assert(meta.version === '2.0.0', 'Metadata version is 2.0.0');
    assert(meta.endpoints.includes('POST /webhooks/checkout'), 'Metadata lists checkout webhook');
    assert(meta.endpoints.includes('POST /bills/:id/pay'), 'Metadata lists bill payment');
  }

  // Test 2: Webhook POST /webhooks/checkout
  console.log('\n[Test Suite 2: Webhook POST /webhooks/checkout]');
  const webhookResId = `res-checkout-${runId}`;
  let webhookBillId = null;
  {
    const checkoutEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'ReservationCheckedOut',
      timestamp: new Date().toISOString(),
      reservationId: webhookResId,
      bookingNumber: `RES-2026-${runId}`,
      bookingType: 'standard',
      roomId: crypto.randomUUID(),
      roomNumber: `5${runId.slice(0, 2)}`,
      roomTypeId: crypto.randomUUID(),
      roomTypeName: 'Deluxe Ocean View',
      floor: '5',
      guestId: crypto.randomUUID(),
      guestName: 'Natapohn Tameeruks',
      guestEmail: 'taew.natapohn@test.com',
      guestPhone: '0812345678',
      checkInDate: '2026-10-01',
      actualCheckIn: '2026-10-01T14:00:00Z',
      checkOutDate: '2026-10-04',
      actualCheckOut: '2026-10-04T11:30:00Z',
      totalNights: '3',
      nightlyRate: '2500.00',
      roomTotalAmount: '7500.00',
      depositAmount: '2000.00',
      taxRate: '0.07',
      taxAmount: '525.00',
      netAmount: '8025.00',
      currency: 'THB',
      cleaningType: 'checkout_clean',
      priority: 'normal',
      performedBy: crypto.randomUUID(),
    };

    const checkoutUrl = `${BASE_URL}/webhooks/checkout`;
    const bodyStr = JSON.stringify(checkoutEvent);

    // Security Verification: Test missing and invalid Upstash signatures
    if (QSTASH_KEY) {
      const noSigRes = await fetch(checkoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
      assert(noSigRes.status === 401, 'Missing Upstash signature returns 401 Unauthorized');

      const invalidSigRes = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'upstash-signature': 'invalid.signature.token',
        },
        body: bodyStr,
      });
      assert(invalidSigRes.status === 401, 'Invalid Upstash signature returns 401 Unauthorized');
    }

    const validSig = createUpstashSignature(checkoutUrl, bodyStr);
    const webhookHeaders = {
      'Content-Type': 'application/json',
      ...(validSig ? { 'upstash-signature': validSig } : {}),
    };

    const res = await fetch(checkoutUrl, {
      method: 'POST',
      headers: webhookHeaders,
      body: bodyStr,
    });
    const json = await res.json();
    assert(res.status === 201, `POST /webhooks/checkout returns 201 Created (got ${res.status})`);
    assert(json.success === true, 'Webhook processed successfully');
    assert(json.data.reservationId === webhookResId, 'Bill linked to reservation ID');
    assert(json.data.subtotal === '7500.00', 'Room charges subtotal is 7500.00');
    assert(json.data.depositDeducted === '2000.00', 'Deposit deducted recorded as 2000.00');
    assert(json.data.status === 'pending', 'Draft bill status is pending');
    assert(json.data.items.length === 1, 'Initial room charge item created');
    assert(/^BILL-\d{4}-[A-Z0-9]{8}$/.test(json.data.billNumber), `Bill number format has 8-char hex suffix: ${json.data.billNumber}`);
    webhookBillId = json.data.id;

    // Idempotency: Second call with same event must return 200 OK without duplicating
    const dupSig = createUpstashSignature(checkoutUrl, bodyStr);
    const dupRes = await fetch(checkoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(dupSig ? { 'upstash-signature': dupSig } : {}),
      },
      body: bodyStr,
    });
    const dupJson = await dupRes.json();
    assert(dupRes.status === 200, `Duplicate webhook returns 200 OK (got ${dupRes.status})`);
    assert(dupJson.data.id === webhookBillId, 'Returns existing bill ID idempotently');
  }

  // Test 3: API #75 POST /bills/:id/items (Add Minibar & Laundry)
  console.log('\n[Test Suite 3: #75 POST /bills/:id/items]');
  let minibarItemId = null;
  {
    // Add Minibar: 2 beers @ 150.00 = 300.00
    const minibarRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/items`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        itemType: 'minibar',
        description: 'Singha Beer (2 cans)',
        quantity: '2',
        unitPrice: '150.00',
      }),
    });
    const minibarJson = await minibarRes.json();
    assert(minibarRes.status === 201, `Add minibar returns 201 Created (got ${minibarRes.status})`);
    assert(minibarJson.data.item.itemType === 'minibar', 'Item type is minibar');
    assert(minibarJson.data.item.totalPrice === '300.00', 'Item total is 300.00');
    // New subtotal: 7500 + 300 = 7800.00
    assert(minibarJson.data.bill.subtotal === '7800.00', 'Subtotal updated to 7800.00');
    minibarItemId = minibarJson.data.item.id;

    // Add Laundry: 4 shirts @ 100.00 = 400.00
    const laundryRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/items`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        itemType: 'laundry',
        description: 'Shirt Express Laundry (4 pcs)',
        quantity: 4,
        unitPrice: 100,
      }),
    });
    const laundryJson = await laundryRes.json();
    assert(laundryRes.status === 201, `Add laundry returns 201 Created (got ${laundryRes.status})`);
    // Subtotal: 7800 + 400 = 8200.00
    assert(laundryJson.data.bill.subtotal === '8200.00', 'Subtotal updated to 8200.00');
  }

  // Test 4: API #76 DELETE /bills/:id/items/:itemId
  console.log('\n[Test Suite 4: #76 DELETE /bills/:id/items/:itemId]');
  {
    const delRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/items/${minibarItemId}`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    const delJson = await delRes.json();
    assert(delRes.status === 200, `Delete item returns 200 OK (got ${delRes.status})`);
    // Subtotal reduced from 8200 back to 7900 (7500 room + 400 laundry)
    assert(delJson.data.subtotal === '7900.00', 'Subtotal recalculated to 7900.00 after deletion');
  }

  // Test 5: API #81 POST /bills/:id/discount
  console.log('\n[Test Suite 5: #81 POST /bills/:id/discount]');
  {
    // Apply 500.00 discount
    const discRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/discount`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        discountAmount: '500.00',
        reason: 'Manager special courtesy discount',
      }),
    });
    const discJson = await discRes.json();
    assert(discRes.status === 200, `Apply discount returns 200 OK (got ${discRes.status})`);
    assert(discJson.data.appliedDiscount === '500.00', 'Discount applied as 500.00');
    assert(discJson.data.bill.discountAmount === '500.00', 'Bill discountAmount is 500.00');

    // Edge Case: Discount exceeding subtotal must return 400 Bad Request
    const excessiveDiscRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/discount`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ discountAmount: '99999.00' }),
    });
    assert(excessiveDiscRes.status === 400, `Excessive discount returns 400 (got ${excessiveDiscRes.status})`);
  }

  // Test 6: API #72 GET /bills/:id & #79 GET /bills/by-reservation/:resId
  console.log('\n[Test Suite 6: #72 GET /bills/:id & #79 GET /bills/by-reservation/:reservationId]');
  {
    const getRes = await fetch(`${BASE_URL}/bills/${webhookBillId}`, { headers: HEADERS });
    const getJson = await getRes.json();
    assert(getRes.status === 200, `GET /bills/:id returns 200 OK`);
    assert(getJson.data.id === webhookBillId, 'Returns correct bill data');
    assert(Array.isArray(getJson.data.items), 'Contains items array');
    assert(Array.isArray(getJson.data.payments), 'Contains payments array');

    const byResRes = await fetch(`${BASE_URL}/bills/by-reservation/${webhookResId}`, { headers: HEADERS });
    const byResJson = await byResRes.json();
    assert(byResRes.status === 200, `GET /bills/by-reservation returns 200 OK`);
    assert(byResJson.data.id === webhookBillId, 'Finds bill by reservation ID');
  }

  // Test 7: API #77 POST /bills/:id/pay (Payment & QStash event)
  console.log('\n[Test Suite 7: #77 POST /bills/:id/pay]');
  {
    // Check remaining amount due
    const billBefore = await (await fetch(`${BASE_URL}/bills/${webhookBillId}`, { headers: HEADERS })).json();
    const amountDue = billBefore.data.amountDue;

    const payRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/pay`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        paymentMethod: 'CARD',
        referenceNumber: 'TXN-VISA-998811',
      }),
    });
    const payJson = await payRes.json();
    assert(payRes.status === 200, `Pay bill returns 200 OK (got ${payRes.status})`);
    assert(payJson.data.bill.status === 'paid', 'Status transitioned to paid');
    assert(payJson.data.bill.amountDue === '0.00', 'Amount due is now 0.00');
    assert(payJson.data.bill.amountPaid === amountDue, `Amount paid matches amount due (${amountDue})`);
    assert(payJson.data.payment.status === 'completed', 'Payment status is completed');
    assert(payJson.data.receiptNumber.startsWith('REC-'), 'Receipt number returned');

    // Edge Case: Double payment on already paid bill must return 400
    const doublePayRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/pay`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ paymentMethod: 'CASH', amount: '100.00' }),
    });
    assert(doublePayRes.status === 400, `Double payment returns 400 Bad Request (got ${doublePayRes.status})`);
  }

  // Test 8: API #78 GET /bills/:id/receipt
  console.log('\n[Test Suite 8: #78 GET /bills/:id/receipt]');
  {
    const receiptRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/receipt`, { headers: HEADERS });
    const receiptJson = await receiptRes.json();
    assert(receiptRes.status === 200, `GET /bills/:id/receipt returns 200 OK`);
    assert(receiptJson.data.hotel.name.includes('KEYSTAY'), 'Contains hotel information');
    assert(receiptJson.data.guest.guestName === 'Natapohn Tameeruks', 'Contains guest info');
    assert(receiptJson.data.payments.length >= 1, 'Contains completed payments');
    assert(receiptJson.data.financialSummary.totalAmount !== '0.00', 'Contains financial breakdown');
  }

  // Test 9: API #80 POST /bills/:id/refund
  console.log('\n[Test Suite 9: #80 POST /bills/:id/refund]');
  {
    const refundRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/refund`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        amount: '200.00',
        reason: 'Unused laundry service voucher refunded',
      }),
    });
    const refundJson = await refundRes.json();
    assert(refundRes.status === 200, `Refund returns 200 OK (got ${refundRes.status})`);
    assert(refundJson.data.refund.amount === '200.00', 'Refund recorded as 200.00');
    assert(refundJson.data.refund.status === 'completed', 'Refund status is completed');
    assert(refundJson.data.bill.status === 'partially_paid', `Bill status transitions to partially_paid after partial refund (got ${refundJson.data.bill.status})`);
    assert(Number(refundJson.data.bill.amountDue) > 0, `Amount due is > 0 after partial refund (${refundJson.data.bill.amountDue})`);

    // Edge Case: Refund exceeding total paid must return 400
    const excessiveRefundRes = await fetch(`${BASE_URL}/bills/${webhookBillId}/refund`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        amount: '99999.00',
        reason: 'Excessive refund attempt',
      }),
    });
    assert(excessiveRefundRes.status === 400, `Excessive refund returns 400 (got ${excessiveRefundRes.status})`);
  }

  // Test 10: APIs #82 & #83 Payment Methods
  console.log('\n[Test Suite 10: APIs #82 & #83 Payment Methods]');
  {
    // List payment methods
    const listRes = await fetch(`${BASE_URL}/payment-methods`, { headers: HEADERS });
    const listJson = await listRes.json();
    assert(listRes.status === 200, `GET /payment-methods returns 200 OK`);
    assert(Array.isArray(listJson.data) && listJson.data.length >= 4, 'Lists at least 4 payment methods');

    // Add new payment method
    const createPmRes = await fetch(`${BASE_URL}/payment-methods`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        name: `Alipay QR Pay ${runId}`,
        code: `ALIPAY_${runId}`,
        isActive: true,
      }),
    });
    const createPmJson = await createPmRes.json();
    assert(createPmRes.status === 201, `POST /payment-methods returns 201 Created (got ${createPmRes.status})`);
    assert(createPmJson.data.code === `ALIPAY_${runId}`, 'Payment method code matches');

    // Edge Case: Duplicate code returns 409 Conflict
    const dupPmRes = await fetch(`${BASE_URL}/payment-methods`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        name: `Duplicate Alipay ${runId}`,
        code: `ALIPAY_${runId}`,
      }),
    });
    assert(dupPmRes.status === 409, `Duplicate code returns 409 Conflict (got ${dupPmRes.status})`);
  }

  // Test 11: APIs #84, #85, #86 Invoices
  console.log('\n[Test Suite 11: APIs #84, #85, #86 Invoices]');
  {
    // List invoices
    const listInvRes = await fetch(`${BASE_URL}/invoices`, { headers: HEADERS });
    const listInvJson = await listInvRes.json();
    assert(listInvRes.status === 200, `GET /invoices returns 200 OK`);
    assert(Array.isArray(listInvJson.data), 'Returns array of invoices');

    const sampleInvoice = listInvJson.data[0];
    assert(sampleInvoice !== undefined, 'At least one invoice exists');

    // Get single invoice
    const getInvRes = await fetch(`${BASE_URL}/invoices/${sampleInvoice.id}`, { headers: HEADERS });
    const getInvJson = await getInvRes.json();
    assert(getInvRes.status === 200, `GET /invoices/:id returns 200 OK`);
    assert(getInvJson.data.id === sampleInvoice.id, 'Returns matching invoice');

    // Send invoice email
    const sendEmailRes = await fetch(`${BASE_URL}/invoices/${sampleInvoice.id}/send-email`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ email: 'billing-guest@keystay.test' }),
    });
    const sendEmailJson = await sendEmailRes.json();
    assert(sendEmailRes.status === 200, `POST /invoices/:id/send-email returns 200 OK`);
    assert(sendEmailJson.data.invoice.status === 'sent', 'Invoice status updated to sent');
    assert(sendEmailJson.data.recipientEmail === 'billing-guest@keystay.test', 'Recipient email recorded');
  }

  // Test 12: API #71 GET /bills with Filtering
  console.log('\n[Test Suite 12: #71 GET /bills with Filtering]');
  {
    const filterPaidRes = await fetch(`${BASE_URL}/bills?status=paid`, { headers: HEADERS });
    const filterPaidJson = await filterPaidRes.json();
    assert(filterPaidRes.status === 200, 'GET /bills?status=paid returns 200');
    assert(filterPaidJson.data.every((b) => b.status === 'paid'), 'All returned bills have status=paid');

    const searchRes = await fetch(`${BASE_URL}/bills?search=Natapohn`, { headers: HEADERS });
    const searchJson = await searchRes.json();
    assert(searchRes.status === 200, 'GET /bills?search=Natapohn returns 200');
    assert(searchJson.data.length >= 1, 'Search finds matching guest bill');
  }

  // Test 13: API #73 POST /bills manual creation
  console.log('\n[Test Suite 13: #73 POST /bills Manual Creation]');
  {
    const manualBillRes = await fetch(`${BASE_URL}/bills`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        reservationId: `res-manual-${runId}`,
        guestName: 'Manual Guest Test',
        roomNumber: '808',
        subtotal: 5000,
        depositDeducted: 1000,
        items: [
          {
            itemType: 'room_charge',
            description: 'Room Charge 2 nights',
            quantity: 2,
            unitPrice: 2500,
          },
        ],
      }),
    });
    const manualBillJson = await manualBillRes.json();
    assert(manualBillRes.status === 201, `Manual bill created with 201 (got ${manualBillRes.status})`);
    assert(manualBillJson.data.subtotal === '5000.00', 'Subtotal is 5000.00');
    assert(manualBillJson.data.depositDeducted === '1000.00', 'Deposit deducted is 1000.00');
    assert(manualBillJson.data.items.length === 1, 'Item saved in bill_items');
    assert(/^BILL-\d{4}-[A-Z0-9]{8}$/.test(manualBillJson.data.billNumber), `Manual bill number has 8-char hex suffix: ${manualBillJson.data.billNumber}`);
  }

  // Test 14: Full Refund Transitions Status to 'refunded'
  console.log('\n[Test Suite 14: Full Refund Transitions to "refunded"]');
  {
    // Create a simple zero-deposit bill, pay it fully, then refund full amount
    const quickBillRes = await fetch(`${BASE_URL}/bills`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        reservationId: `res-fullrefund-${runId}`,
        guestName: 'Refund Test Guest',
        roomNumber: '101',
        subtotal: 1000,
        depositDeducted: 0,
      }),
    });
    const quickBillJson = await quickBillRes.json();
    const qBillId = quickBillJson.data.id;
    const qDue = quickBillJson.data.amountDue;

    // Pay full
    await fetch(`${BASE_URL}/bills/${qBillId}/pay`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        paymentMethod: 'CASH',
        amount: qDue,
      }),
    });

    // Refund full
    const fullRefundRes = await fetch(`${BASE_URL}/bills/${qBillId}/refund`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        amount: qDue,
        reason: 'Guest cancelled immediately, full refund',
      }),
    });
    const fullRefundJson = await fullRefundRes.json();
    assert(fullRefundRes.status === 200, 'Full refund returns 200 OK');
    assert(fullRefundJson.data.bill.status === 'refunded', `Bill status transitions to refunded upon full refund (got ${fullRefundJson.data.bill.status})`);
    assert(fullRefundJson.data.bill.amountPaid === '0.00', 'Amount paid is 0.00 after full refund');
  }

  console.log(`\n========================================`);
  console.log(`BILLING TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Billing Test Runner Error:', err);
  process.exit(1);
});

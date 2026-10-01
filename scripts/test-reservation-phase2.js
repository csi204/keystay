// scripts/test-reservation-phase2.js
// Multi-scenario integration test for Reservation Phase 2 APIs & Edge Cases

const BASE_URL = 'http://127.0.0.1:8790';
const HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'usr-admin-test-001',
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
  console.log('=== STARTING RESERVATION PHASE 2 COMPREHENSIVE TESTS ===\n');
  const runId = Date.now().toString().slice(-4);

  // Test 1: Health & Metadata
  console.log('[Test Suite 1: Health & Metadata]');
  {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'GET /health returns 200 OK');
    assert(data.phase.includes('Phase 2'), 'Health reflects Phase 2 readiness');

    const metaRes = await fetch(`${BASE_URL}/`);
    const meta = await metaRes.json();
    assert(meta.version === '2.0.0', 'Metadata version is 2.0.0');
    assert(meta.endpoints.includes('POST /reservations/:id/check-in'), 'Metadata lists Phase 2 check-in');
    assert(meta.endpoints.includes('POST /reservations/:id/check-out'), 'Metadata lists Phase 2 check-out');
  }

  // Test 2: Endpoint #52 Walk-in Booking
  console.log('\n[Test Suite 2: #52 POST /walk-in & /reservations/walk-in]');
  let walkInResId = null;
  {
    const payload = {
      guestName: 'Somchai Walkin Test',
      guestPhone: `089999${runId}`,
      guestEmail: `somchai.walkin${runId}@test.com`,
      roomId: `rm-walkin-${runId}`,
      roomNumber: `9${runId.slice(0, 2)}`,
      roomTypeName: 'Executive Suite',
      checkInDate: '2026-10-10',
      checkOutDate: '2026-10-13',
      numGuests: 2,
      nightlyRate: '2000.00',
      depositAmount: '1000.00',
      specialRequests: 'High floor preferred',
    };

    // Test POST /walk-in (gateway alias)
    const res = await fetch(`${BASE_URL}/walk-in`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    assert(res.status === 201, `POST /walk-in returns 201 Created (got ${res.status})`);
    assert(json.success === true, 'Response indicates success');
    assert(json.data.status === 'checked_in', 'Walk-in reservation immediately checked_in');
    assert(json.data.bookingType === 'walk_in', 'Booking type is walk_in');
    assert(json.data.totalNights === '3', 'Total nights calculated as 3');
    assert(json.data.subtotal === '6000.00', 'Subtotal is 6000.00');
    assert(json.data.depositAmount === '1000.00', 'Deposit amount is 1000.00');
    assert(json.data.actualCheckIn !== null, 'actualCheckIn timestamp is populated');
    walkInResId = json.data.id;

    // Edge Case: Overlap walk-in on same room & dates must fail with 409 Conflict
    const overlapRes = await fetch(`${BASE_URL}/walk-in`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        ...payload,
        checkInDate: '2026-10-11',
        checkOutDate: '2026-10-12',
      }),
    });
    const overlapJson = await overlapRes.json();
    assert(overlapRes.status === 409, `Overlapping walk-in returns 409 Conflict (got ${overlapRes.status})`);
    assert(overlapJson.error.code === 'ROOM_OVERBOOKING_CONFLICT' || overlapJson.error.code === 'ROOM_NOT_AVAILABLE', 'Error code indicates room unavailable/conflict');
  }

  // Test 3: Endpoint #36 POST /reservations/:id/check-in
  console.log('\n[Test Suite 3: #36 POST /reservations/:id/check-in]');
  let advanceResId = null;
  {
    // First create a confirmed advance reservation
    const createRes = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        guestId: 'gst-001',
        roomId: `rm-checkin-${runId}`,
        roomNumber: `8${runId.slice(0, 2)}`,
        roomTypeName: 'Deluxe Twin',
        checkInDate: '2026-10-15',
        checkOutDate: '2026-10-18',
        numGuests: 1,
        nightlyRate: '1200.00',
        depositAmount: '0.00',
      }),
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201, `Created advance confirmed reservation ${createJson?.data?.id}`);
    advanceResId = createJson.data.id;
    assert(createJson.data.status === 'confirmed', 'Initial status is confirmed');

    // Perform Check-in with deposit
    const checkInRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/check-in`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        depositAmount: '500.00',
        paymentMethod: 'credit_card',
        notes: 'Deposit paid via Visa 1234',
      }),
    });
    const checkInJson = await checkInRes.json();
    assert(checkInRes.status === 200, `Check-in returns 200 OK (got ${checkInRes.status})`);
    assert(checkInJson.data.status === 'checked_in', 'Status transitioned to checked_in');
    assert(checkInJson.data.depositAmount === '500.00', 'Deposit amount updated to 500.00');
    assert(checkInJson.data.actualCheckIn !== null, 'actualCheckIn timestamp recorded');

    // Edge Case: Double Check-in must return 400 Bad Request
    const doubleCheckInRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/check-in`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ depositAmount: '100.00' }),
    });
    const doubleJson = await doubleCheckInRes.json();
    assert(doubleCheckInRes.status === 400, `Double check-in returns 400 Bad Request (got ${doubleCheckInRes.status})`);
    assert(doubleJson.error.code === 'ALREADY_CHECKED_IN' || doubleJson.error.code === 'INVALID_STATE_TRANSITION', 'Returns ALREADY_CHECKED_IN error code');
  }

  // Test 4: Endpoint #49 POST /reservations/:id/extend-stay
  console.log('\n[Test Suite 4: #49 POST /reservations/:id/extend-stay]');
  {
    // Extend stay for advanceResId (currently checked_in, check-out: 2026-10-18)
    const extendRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/extend-stay`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        newCheckOutDate: '2026-10-20', // extend by 2 days
        additionalDeposit: '200.00',
        reason: 'Guest loves the room',
      }),
    });
    const extendJson = await extendRes.json();
    assert(extendRes.status === 200, `Extend stay returns 200 OK (got ${extendRes.status})`);
    assert(extendJson.data.status === 'extended', 'Status transitioned to extended');
    assert(extendJson.data.checkOutDate === '2026-10-20', 'CheckOutDate updated to 2026-10-20');
    assert(extendJson.data.totalNights === '5', 'Total nights increased to 5');
    assert(extendJson.data.subtotal === '6000.00', 'Subtotal recalculated for 5 nights @ 1200');
    assert(extendJson.data.depositAmount === '700.00', 'Deposit accumulated (500 + 200 = 700.00)');

    // Edge Case: Extend with checkOut <= current checkOut must fail with 400
    const invalidExtendRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/extend-stay`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ newCheckOutDate: '2026-10-19' }),
    });
    assert(invalidExtendRes.status === 400, `Extend with earlier or same date returns 400 (got ${invalidExtendRes.status})`);
  }

  // Test 5: Endpoint #54 POST /reservations/:id/apply-discount
  console.log('\n[Test Suite 5: #54 POST /reservations/:id/apply-discount]');
  {
    const discountRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/apply-discount`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        discountAmount: '500.00',
        discountCode: 'VIP10',
        reason: 'Long stay loyalty discount',
      }),
    });
    const discountJson = await discountRes.json();
    assert(discountRes.status === 200, `Apply discount returns 200 OK (got ${discountRes.status})`);
    assert(discountJson.data.discountAmount === '500.00', 'Discount amount recorded as 500.00');
    // Subtotal 6000 - 500 = 5500 taxable. 7% VAT = 385.00. Total = 5885.00
    assert(discountJson.data.taxAmount === '385.00', 'Tax amount recalculated at 7% on net subtotal (385.00)');
    assert(discountJson.data.totalAmount === '5885.00', 'Total amount is 5885.00');

    // Edge Case: Discount higher than subtotal must fail with 400
    const hugeDiscountRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/apply-discount`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ discountAmount: '99999.00' }),
    });
    assert(hugeDiscountRes.status === 400, `Excessive discount returns 400 Bad Request (got ${hugeDiscountRes.status})`);
  }

  // Test 6: Endpoint #53 GET /reservations/:id/invoice-preview
  console.log('\n[Test Suite 6: #53 GET /reservations/:id/invoice-preview]');
  {
    const previewRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/invoice-preview`, {
      headers: HEADERS,
    });
    const previewJson = await previewRes.json();
    assert(previewRes.status === 200, `Invoice preview returns 200 OK (got ${previewRes.status})`);
    assert(previewJson.data.roomCharges === '6000.00', 'Room charges match 6000.00');
    assert(previewJson.data.discountAmount === '500.00', 'Discount matches 500.00');
    assert(previewJson.data.netRoomCharges === '5500.00', 'Net room charges match 5500.00');
    assert(previewJson.data.taxAmount === '385.00', 'Tax matches 385.00');
    assert(previewJson.data.totalAmount === '5885.00', 'Total amount matches 5885.00');
    assert(previewJson.data.depositDeducted === '700.00', 'Deposit deducted is 700.00');
    // Balance due = 5885 - 700 = 5185.00
    assert(previewJson.data.balanceDue === '5185.00', 'Balance due correctly calculated as 5185.00');
  }

  // Test 7: Endpoint #37 POST /reservations/:id/check-out
  console.log('\n[Test Suite 7: #37 POST /reservations/:id/check-out (Fan-out 1:4)]');
  {
    const checkOutRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/check-out`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        notes: 'Seamless check-out, minibar charges pending at billing',
      }),
    });
    const checkOutJson = await checkOutRes.json();
    assert(checkOutRes.status === 200, `Check-out returns 200 OK (got ${checkOutRes.status})`);
    assert(checkOutJson.data.status === 'checked_out', 'Status transitioned to checked_out');
    assert(checkOutJson.data.actualCheckOut !== null, 'actualCheckOut timestamp recorded');

    // Edge Case: Double Check-out must fail with 400 Bad Request
    const doubleCheckOutRes = await fetch(`${BASE_URL}/reservations/${advanceResId}/check-out`, {
      method: 'POST',
      headers: HEADERS,
    });
    assert(doubleCheckOutRes.status === 400, `Double check-out returns 400 Bad Request (got ${doubleCheckOutRes.status})`);

    // Edge Case: Cannot check-out a confirmed reservation
    // Create new confirmed reservation
    const confRes = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        guestId: 'gst-001',
        roomId: `rm-conf-${runId}`,
        roomNumber: `7${runId.slice(0, 2)}`,
        roomTypeName: 'Deluxe Suite',
        checkInDate: '2026-10-25',
        checkOutDate: '2026-10-28',
        numGuests: 2,
        nightlyRate: '2500.00',
      }),
    });
    const confJson = await confRes.json();
    const confId = confJson.data.id;

    const invalidCheckOut = await fetch(`${BASE_URL}/reservations/${confId}/check-out`, {
      method: 'POST',
      headers: HEADERS,
    });
    assert(invalidCheckOut.status === 400, `Check-out on confirmed reservation returns 400 (got ${invalidCheckOut.status})`);
  }

  // Test 8: Endpoint #38 POST /reservations/:id/cancel
  console.log('\n[Test Suite 8: #38 POST /reservations/:id/cancel]');
  {
    // Create confirmed reservation to cancel
    const resToCancel = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        guestId: 'gst-002',
        roomId: `rm-cancel-${runId}`,
        roomNumber: `6${runId.slice(0, 2)}`,
        roomTypeName: 'Standard Room',
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-04',
        numGuests: 1,
        nightlyRate: '1000.00',
      }),
    });
    const jsonToCancel = await resToCancel.json();
    const cancelId = jsonToCancel.data.id;

    // Cancel reservation
    const cancelRes = await fetch(`${BASE_URL}/reservations/${cancelId}/cancel`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ reason: 'Trip rescheduled by guest' }),
    });
    const cancelJson = await cancelRes.json();
    assert(cancelRes.status === 200, `Cancel returns 200 OK (got ${cancelRes.status})`);
    assert(cancelJson.data.status === 'cancelled', 'Status transitioned to cancelled');

    // Edge Case: Double Cancel must fail with 400
    const doubleCancelRes = await fetch(`${BASE_URL}/reservations/${cancelId}/cancel`, {
      method: 'POST',
      headers: HEADERS,
    });
    assert(doubleCancelRes.status === 400, `Double cancel returns 400 Bad Request (got ${doubleCancelRes.status})`);

    // Edge Case: Cannot check-in a cancelled reservation
    const checkInCancelled = await fetch(`${BASE_URL}/reservations/${cancelId}/check-in`, {
      method: 'POST',
      headers: HEADERS,
    });
    assert(checkInCancelled.status === 400, `Check-in on cancelled reservation returns 400 (got ${checkInCancelled.status})`);

    // Edge Case: Cannot cancel a checked_out reservation
    const cancelCheckedOut = await fetch(`${BASE_URL}/reservations/${advanceResId}/cancel`, {
      method: 'POST',
      headers: HEADERS,
    });
    assert(cancelCheckedOut.status === 400, `Cancel on checked_out reservation returns 400 (got ${cancelCheckedOut.status})`);
  }

  // Test 9: Endpoint #39 PUT /reservations/:id/modify-dates
  console.log('\n[Test Suite 9: #39 PUT /reservations/:id/modify-dates]');
  {
    // Create reservation to modify
    const modRes = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        guestId: 'gst-003',
        roomId: `rm-mod-${runId}`,
        roomNumber: `5${runId.slice(0, 2)}`,
        roomTypeName: 'Superior Room',
        checkInDate: '2026-11-10',
        checkOutDate: '2026-11-13',
        numGuests: 1,
        nightlyRate: '1500.00',
      }),
    });
    const modJson = await modRes.json();
    const modId = modJson.data.id;

    // Modify dates to 2026-11-12 -> 2026-11-16 (4 nights)
    const updateDatesRes = await fetch(`${BASE_URL}/reservations/${modId}/modify-dates`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({
        checkInDate: '2026-11-12',
        checkOutDate: '2026-11-16',
        reason: 'Guest shifted flights',
      }),
    });
    const updateJson = await updateDatesRes.json();
    assert(updateDatesRes.status === 200, `Modify dates returns 200 OK (got ${updateDatesRes.status})`);
    assert(updateJson.data.checkInDate === '2026-11-12', 'checkInDate updated to 2026-11-12');
    assert(updateJson.data.checkOutDate === '2026-11-16', 'checkOutDate updated to 2026-11-16');
    assert(updateJson.data.totalNights === '4', 'totalNights recalculated to 4');
    assert(updateJson.data.subtotal === '6000.00', 'subtotal recalculated to 6000.00');

    // Edge Case: Invalid date range (checkOut <= checkIn)
    const invalidDatesRes = await fetch(`${BASE_URL}/reservations/${modId}/modify-dates`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-19',
      }),
    });
    assert(invalidDatesRes.status === 400, `Invalid date range returns 400 (got ${invalidDatesRes.status})`);
  }

  // Test 10: Endpoint #50 POST /reservations/:id/upgrade-room
  console.log('\n[Test Suite 10: #50 POST /reservations/:id/upgrade-room]');
  {
    // Create reservation on room 906
    const upgRes = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        guestId: 'gst-001',
        roomId: `rm-upg-orig-${runId}`,
        roomNumber: `4${runId.slice(0, 2)}`,
        roomTypeName: 'Standard Room',
        checkInDate: '2026-12-01',
        checkOutDate: '2026-12-03',
        numGuests: 2,
        nightlyRate: '1000.00',
      }),
    });
    const upgJson = await upgRes.json();
    const upgId = upgJson.data.id;

    // Upgrade to room 907 (Penthouse @ 3000)
    const upgradeRes = await fetch(`${BASE_URL}/reservations/${upgId}/upgrade-room`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        newRoomId: `rm-upg-tgt-${runId}`,
        newRoomNumber: `3${runId.slice(0, 2)}`,
        newRoomTypeName: 'Penthouse Suite',
        newNightlyRate: '3000.00',
        reason: 'Honeymoon complimentary upgrade',
      }),
    });
    const upgradeResult = await upgradeRes.json();
    assert(upgradeRes.status === 200, `Upgrade room returns 200 OK (got ${upgradeRes.status})`);
    assert(upgradeResult.data.roomId === `rm-upg-tgt-${runId}`, 'Room ID updated to target room');
    assert(upgradeResult.data.roomNumber === `3${runId.slice(0, 2)}`, 'Room number updated');
    assert(upgradeResult.data.roomTypeName === 'Penthouse Suite', 'Room type updated to Penthouse Suite');
    assert(upgradeResult.data.nightlyRate === '3000.00', 'Nightly rate updated to 3000.00');
    assert(upgradeResult.data.subtotal === '6000.00', 'Subtotal updated to 6000.00 (2 nights @ 3000)');
  }

  // Test 11: Night Audit Cron Worker & Daily Matrix
  console.log('\n[Test Suite 11: Night Audit Cron Worker & Daily Matrix]');
  {
    // Trigger night audit
    const auditRes = await fetch(`${BASE_URL}/reservations/night-audit`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        auditDate: '2026-09-30',
      }),
    });
    const auditJson = await auditRes.json();
    assert(auditRes.status === 200, `POST /reservations/night-audit returns 200 OK (got ${auditRes.status})`);
    assert(auditJson.success === true, 'Night audit executed successfully');
    assert(typeof auditJson.data.noShowCount === 'number', 'Reports noShowCount');
    assert(typeof auditJson.data.expectedArrivalsToday === 'number', 'Reports expectedArrivalsToday');
    assert(typeof auditJson.data.expectedDeparturesToday === 'number', 'Reports expectedDeparturesToday');

    // Test #42 GET /reservations/today-checkins
    const checkinsRes = await fetch(`${BASE_URL}/reservations/today-checkins`, { headers: HEADERS });
    const checkinsJson = await checkinsRes.json();
    assert(checkinsRes.status === 200, `GET /reservations/today-checkins returns 200 (got ${checkinsRes.status})`);
    assert(Array.isArray(checkinsJson.data), 'Returns array of today checkins');

    // Test #43 GET /reservations/today-checkouts
    const checkoutsRes = await fetch(`${BASE_URL}/reservations/today-checkouts`, { headers: HEADERS });
    const checkoutsJson = await checkoutsRes.json();
    assert(checkoutsRes.status === 200, `GET /reservations/today-checkouts returns 200 (got ${checkoutsRes.status})`);
    assert(Array.isArray(checkoutsJson.data), 'Returns array of today checkouts');
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { DetailedBill } from '../hooks/useBilling';
import type { ExtendedReservation } from '../hooks/useReservations';
import {
  syncBillWithReservation,
  reconcileBillsWithReservations,
} from '../lib/folioReconciliation';

describe('Task 3: Live Folio Auto-Sync & Dummy Bill Cleanup', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const cashierFolioPagePath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/CashierFolioPage.tsx'
  );
  const roomMatrixPagePath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'
  );
  const useBillingPath = path.resolve(
    rootDir,
    'apps/web/src/hooks/useBilling.ts'
  );

  it('Requirement 2: CashierFolioPage imports useReservations and cross-references active reservations', () => {
    assert.ok(fs.existsSync(cashierFolioPagePath), 'CashierFolioPage.tsx must exist');
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    // Must import useReservations
    assert.match(
      code,
      /import\s*\{[^}]*useReservations[^}]*\}\s*from\s*['"]@\/hooks\/useReservations['"]/,
      'CashierFolioPage must import useReservations'
    );

    // Cross-references with reservations using matching condition
    assert.match(
      code,
      /matchingRes\s*=\s*reservations\.find\(\s*\(r\)\s*=>\s*\(r\.id\s*===\s*bill\.reservationId\s*\|\|\s*r\.roomNumber\s*===\s*bill\.roomNumber\)\s*&&\s*\(r\.status\s*===\s*['"]checked_in['"]\s*\|\|\s*r\.status\s*===\s*['"]extended['"]\)/,
      'CashierFolioPage must cross-reference bill with active checked_in/extended reservation'
    );

    // Overrides guestName with real guest name
    assert.match(
      code,
      /matchingRes\.guestName\s*\|\|\s*matchingRes\.guest\?\.fullName/,
      'CashierFolioPage must prioritize matchingRes.guestName or matchingRes.guest.fullName'
    );

    // Heals status to pending when unpaid with 0 items / empty total
    assert.match(
      code,
      /resPaymentStatus\s*!==\s*['"]paid['"]\s*&&\s*total\s*===\s*0\s*&&\s*hasZeroItems/,
      'CashierFolioPage must check paymentStatus !== "paid" and 0 total/items'
    );
    assert.match(
      code,
      /status:\s*shouldBePending\s*\?\s*(?:\('pending'\s*as\s*const\)|'pending')\s*:\s*bill\.status/,
      'CashierFolioPage must set status to pending if shouldBePending is true'
    );
  });

  it('Requirement 2: CashierFolioPage auto-creates folio with real guest name and calculated nightly rate', () => {
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    // Looks up matchingRes in auto-create effect
    assert.match(
      code,
      /const\s+matchingRes\s*=\s*reservations\.find/,
      'Auto-create effect must look up matching active reservation'
    );

    // Uses real guest name or navState guest name
    assert.match(
      code,
      /matchingRes\?\.guestName\s*\|\|\s*matchingRes\?\.guest\?\.fullName\s*\|\|\s*\(navState\s*as\s*any\)\?\.guestName/,
      'Auto-create effect must derive guestName from matching reservation'
    );

    // Calculates nightly rate items and pending status
    assert.match(
      code,
      /itemType:\s*['"]room_charge['"]/,
      'Auto-create effect must include room_charge itemType'
    );
    assert.match(
      code,
      /status:\s*['"]pending['"]/,
      'Auto-create effect must specify status pending'
    );
  });

  it('Requirement 3: RoomMatrixPage handleRoomAction passes real guestName and reservationId', () => {
    assert.ok(fs.existsSync(roomMatrixPagePath), 'RoomMatrixPage.tsx must exist');
    const code = fs.readFileSync(roomMatrixPagePath, 'utf-8');

    // RoomRes lookup checks both roomId and roomNumber, including checked_in and extended
    assert.match(
      code,
      /\(r\.roomId\s*===\s*room\.id\s*\|\|\s*\(room\.roomNumber\s*&&\s*r\.roomNumber\s*===\s*room\.roomNumber\)\)\s*&&\s*\(r\.status\s*===\s*['"]checked_in['"]\s*\|\|\s*\(r\.status\s*as\s*string\)\s*===\s*['"]extended['"]\)/,
      'RoomMatrixPage must look up active reservation matching roomId or roomNumber with checked_in or extended'
    );

    // Passes guestName and reservationId
    assert.match(
      code,
      /guestName:\s*roomRes\?\.guestName\s*\|\|\s*roomRes\?\.guest\?\.fullName\s*\|\|\s*roomGuests\[room\.id\]\s*\|\|\s*['"]['"]/,
      'RoomMatrixPage must pass guestName matching roomRes?.guestName || roomRes?.guest?.fullName || roomGuests[room.id] || ""'
    );
    assert.match(
      code,
      /reservationId:\s*roomRes\?\.id/,
      'RoomMatrixPage must pass reservationId: roomRes?.id'
    );
  });

  it('Requirement 4: When Room 101 has an active in-house reservation for "อัศวิน", folio synchronizes name and pending status', () => {
    const activeReservations: ExtendedReservation[] = [
      {
        id: 'res-101-active',
        bookingNumber: 'BK-101',
        guestId: 'guest-asawin',
        guestName: 'อัศวิน',
        roomNumber: '101',
        roomId: 'room-101',
        checkInDate: '2026-11-12T00:00:00Z',
        checkOutDate: '2026-11-14T00:00:00Z',
        totalNights: '2',
        totalAmount: '2400',
        depositAmount: '500',
        nightlyRate: 1200,
        status: 'checked_in',
        paymentStatus: 'unpaid',
        createdAt: '2026-11-12T00:00:00Z',
        updatedAt: '2026-11-12T00:00:00Z',
      },
    ];

    // Bill that initially has dummy fallback name and phantom "paid" status with 0 items / 0 amount
    const dummyBill: DetailedBill = {
      id: 'bill-101',
      billNumber: 'INV-202611-101',
      reservationId: 'res-101-active',
      guestId: 'guest-asawin',
      guestName: 'Guest (Room 101)',
      roomNumber: '101',
      subtotal: '0.00',
      taxAmount: '0.00',
      netAmount: '0.00',
      paidAmount: '0.00',
      totalAmount: '0.00',
      status: 'paid', // phantom paid from legacy dummy state
      items: [],
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    };

    const synced = syncBillWithReservation(dummyBill, activeReservations);

    // Verified: guestName becomes "อัศวิน"
    assert.strictEqual(
      synced.guestName,
      'อัศวิน',
      'synced bill guestName should reflect real guest name from in-house reservation'
    );

    // Verified: status healed to "pending" ("รอชำระ")
    assert.strictEqual(
      synced.status,
      'pending',
      'synced bill status should be healed to pending ("รอชำระ")'
    );
  });

  it('Requirement 4: Stale dummy bills with 0 amount without active reservation are excluded; active ones are healed', () => {
    const activeReservations: ExtendedReservation[] = [
      {
        id: 'res-101-active',
        bookingNumber: 'BK-101',
        guestId: 'guest-asawin',
        guestName: 'อัศวิน',
        roomNumber: '101',
        roomId: 'room-101',
        checkInDate: '2026-11-12T00:00:00Z',
        checkOutDate: '2026-11-14T00:00:00Z',
        totalNights: '2',
        totalAmount: '2400',
        depositAmount: '500',
        nightlyRate: 1200,
        status: 'checked_in',
        paymentStatus: 'unpaid',
        createdAt: '2026-11-12T00:00:00Z',
        updatedAt: '2026-11-12T00:00:00Z',
      },
    ];

    const bills: DetailedBill[] = [
      // 1. Stale dummy bill for Room 999 with 0 amount and paid status (no active reservation) -> should be excluded
      {
        id: 'bill-stale-999',
        billNumber: 'INV-202611-999',
        reservationId: 'res-old-999',
        guestId: 'guest-old-999',
        guestName: 'Guest (Room 999)',
        roomNumber: '999',
        subtotal: '0.00',
        taxAmount: '0.00',
        netAmount: '0.00',
        paidAmount: '0.00',
        totalAmount: '0.00',
        status: 'paid',
        items: [],
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      // 2. Dummy bill for Room 101 with 0 amount and paid status -> should be healed to "อัศวิน" and "pending"
      {
        id: 'bill-101',
        billNumber: 'INV-202611-101',
        reservationId: 'res-101-active',
        guestId: 'guest-asawin',
        guestName: 'Guest (Room 101)',
        roomNumber: '101',
        subtotal: '0.00',
        taxAmount: '0.00',
        netAmount: '0.00',
        paidAmount: '0.00',
        totalAmount: '0.00',
        status: 'paid',
        items: [],
        createdAt: '2026-11-12T00:00:00Z',
        updatedAt: '2026-11-12T00:00:00Z',
      },
      // 3. Legitimate paid bill with items and amount -> preserved
      {
        id: 'bill-legit-paid',
        billNumber: 'INV-202611-002',
        reservationId: 'res-checkedout',
        guestId: 'guest-somchai',
        guestName: 'Somchai Prasert',
        roomNumber: '202',
        subtotal: '1500.00',
        taxAmount: '105.00',
        netAmount: '1605.00',
        paidAmount: '1605.00',
        totalAmount: '1605.00',
        status: 'paid',
        items: [
          {
            id: 'item-1',
            billId: 'bill-legit-paid',
            description: 'Room Charge',
            category: 'room',
            quantity: 1,
            unitPrice: '1500.00',
            totalAmount: '1500.00',
            createdAt: '2026-11-10T00:00:00Z',
          },
        ],
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
    ];

    const reconciled = reconcileBillsWithReservations(bills, activeReservations);

    // Stale dummy bill 999 must be excluded
    assert.strictEqual(
      reconciled.some((b) => b.id === 'bill-stale-999'),
      false,
      'Orphaned stale dummy bill with 0 amount and paid status must be excluded'
    );

    // Healed bill 101 must be present, with real guest name and pending status
    const bill101 = reconciled.find((b) => b.id === 'bill-101');
    assert.ok(bill101, 'Bill 101 must be present in reconciled list');
    assert.strictEqual(bill101.guestName, 'อัศวิน');
    assert.strictEqual(bill101.status, 'pending');

    // Legitimate paid bill must remain paid
    const legit = reconciled.find((b) => b.id === 'bill-legit-paid');
    assert.ok(legit, 'Legitimate paid bill must be present');
    assert.strictEqual(legit.status, 'paid');
    assert.strictEqual(legit.guestName, 'Somchai Prasert');
  });
});

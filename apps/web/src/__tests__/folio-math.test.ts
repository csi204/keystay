import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFolioSummary } from '../components/front-desk/FolioSplitScreen';
import {
  syncBillWithReservation,
  reconcileBillsWithReservations,
} from '../lib/folioReconciliation';
import type { DetailedBill } from '../hooks/useBilling';
import type { ExtendedReservation } from '../hooks/useReservations';

describe('Task 2: Shared Folio Math (Pre-paid vs Unpaid Items & Deposit Refund)', () => {
  it('Scenario 1: Pre-paid room (isPaid: true) + deposit 500 + NO unpaid items -> unpaidSubtotal=0, netDue=0, refundAmount=500', () => {
    const summary = calculateFolioSummary(
      [
        {
          id: 'bi-room-1',
          category: 'room',
          description: 'ค่าห้องพักเบื้องต้น (1 คืน)',
          quantity: 1,
          unitPrice: 2000,
          isPaid: true,
        },
      ],
      500
    );

    assert.strictEqual(summary.unpaidSubtotal, 0);
    assert.strictEqual(summary.unpaidVat, 0);
    assert.strictEqual(summary.unpaidTotalWithVat, 0);
    assert.strictEqual(summary.paidTotalWithVat, 2140);
    assert.strictEqual(summary.totalWithVat, 2140);
    assert.strictEqual(summary.depositDeduction, 500);
    assert.strictEqual(summary.netDue, 0);
    assert.strictEqual(summary.refundAmount, 500);
    assert.strictEqual(summary.hasUnpaidCharges, false);
  });

  it('Scenario 2: Pre-paid room (isPaid: true) + unpaid extension (2 x 2200 = 4400) + VAT 7% (308) - deposit 500 -> netDue=4208, refundAmount=0', () => {
    const summary = calculateFolioSummary(
      [
        {
          id: 'bi-room-1',
          category: 'room',
          description: 'ค่าห้องพักเบื้องต้น (1 คืน)',
          quantity: 1,
          unitPrice: 2000,
          isPaid: true,
        },
        {
          id: 'bi-ext-1',
          category: 'room',
          description: 'ขยายเวลาเข้าพัก (+2 คืน)',
          quantity: 2,
          unitPrice: 2200,
          isPaid: false,
        },
      ],
      500
    );

    assert.strictEqual(summary.unpaidSubtotal, 4400);
    assert.strictEqual(summary.unpaidVat, 308);
    assert.strictEqual(summary.unpaidTotalWithVat, 4708);
    assert.strictEqual(summary.paidTotalWithVat, 2140);
    assert.strictEqual(summary.subtotal, 6400);
    assert.strictEqual(summary.totalWithVat, 6848);
    assert.strictEqual(summary.depositDeduction, 500);
    assert.strictEqual(summary.netDue, 4208);
    assert.strictEqual(summary.refundAmount, 0);
    assert.strictEqual(summary.hasUnpaidCharges, true);
  });

  it('Scenario 3: Pre-paid room (isPaid: true) + unpaid minibar (100 + 7 VAT = 107) - deposit 500 -> netDue=0, refundAmount=393', () => {
    const summary = calculateFolioSummary(
      [
        {
          id: 'bi-room-1',
          category: 'room',
          description: 'ค่าห้องพักเบื้องต้น (1 คืน)',
          quantity: 1,
          unitPrice: 2000,
          isPaid: true,
        },
        {
          id: 'bi-mini-1',
          category: 'minibar',
          description: 'น้ำดื่ม / ขนม',
          quantity: 1,
          unitPrice: 100,
          isPaid: false,
        },
      ],
      500
    );

    assert.strictEqual(summary.unpaidSubtotal, 100);
    assert.strictEqual(summary.unpaidVat, 7);
    assert.strictEqual(summary.unpaidTotalWithVat, 107);
    assert.strictEqual(summary.paidTotalWithVat, 2140);
    assert.strictEqual(summary.totalWithVat, 2247);
    assert.strictEqual(summary.depositDeduction, 500);
    assert.strictEqual(summary.netDue, 0);
    assert.strictEqual(summary.refundAmount, 393);
    assert.strictEqual(summary.hasUnpaidCharges, true);
  });

  it('Legacy fallback: when item.isPaid is undefined and reservationPaymentStatus is paid, initial room is paid while extension & minibar remain unpaid', () => {
    const summary = calculateFolioSummary(
      [
        {
          id: 'bi-room-legacy',
          category: 'room',
          description: 'ค่าห้องพัก (1 คืน)',
          quantity: 1,
          unitPrice: 2000,
        },
        {
          id: 'bi-ext-legacy',
          category: 'room',
          description: 'ขยายเวลาเข้าพัก (+2 คืน)',
          quantity: 2,
          unitPrice: 2200,
        },
      ],
      500,
      0,
      { reservationPaymentStatus: 'paid' }
    );

    assert.strictEqual(summary.paidTotalWithVat, 2140);
    assert.strictEqual(summary.unpaidSubtotal, 4400);
    assert.strictEqual(summary.unpaidVat, 308);
    assert.strictEqual(summary.unpaidTotalWithVat, 4708);
    assert.strictEqual(summary.netDue, 4208);
    assert.strictEqual(summary.refundAmount, 0);
  });

  it('folioReconciliation preserves separate initial room nights and extension nights without overwriting descriptions with totalNights', () => {
    const reservations: ExtendedReservation[] = [
      {
        id: 'res-ext-1',
        bookingNumber: 'BK-201',
        guestId: 'g-1',
        guestName: 'สมชาย ใจดี',
        roomNumber: '201',
        roomId: 'rm-201',
        checkInDate: '2026-11-12',
        checkOutDate: '2026-11-15',
        totalNights: '3',
        totalAmount: '6600',
        depositAmount: '500',
        status: 'extended',
        paymentStatus: 'paid',
        createdAt: '2026-11-12T08:00:00Z',
        updatedAt: '2026-11-12T08:00:00Z',
      },
    ];

    const bill: DetailedBill = {
      id: 'bill-ext-1',
      billNumber: 'BILL-2026-EXT1',
      reservationId: 'res-ext-1',
      guestId: 'g-1',
      guestName: 'Guest (Room 201)',
      roomNumber: '201',
      subtotal: '6400.00',
      taxAmount: '448.00',
      netAmount: '6848.00',
      paidAmount: '2140.00',
      totalAmount: '6848.00',
      status: 'unpaid' as any,
      items: [
        {
          id: 'bi-1',
          billId: 'bill-ext-1',
          description: 'ค่าห้องพักเบื้องต้น (1 คืน)',
          category: 'room',
          quantity: 1,
          unitPrice: '2000.00',
          totalAmount: '2000.00',
          isPaid: true,
          createdAt: '2026-11-12T08:00:00Z',
        },
        {
          id: 'bi-2',
          billId: 'bill-ext-1',
          description: 'ขยายเวลาเข้าพัก (+2 คืน)',
          category: 'room',
          quantity: 2,
          unitPrice: '2200.00',
          totalAmount: '4400.00',
          isPaid: false,
          createdAt: '2026-11-13T08:00:00Z',
        },
      ],
      createdAt: '2026-11-12T08:00:00Z',
      updatedAt: '2026-11-13T08:00:00Z',
    };

    const synced = syncBillWithReservation(bill, reservations);
    assert.strictEqual(synced.guestName, 'สมชาย ใจดี');
    assert.strictEqual(synced.items?.[0].description, 'ค่าห้องพักเบื้องต้น (1 คืน)');
    assert.strictEqual(synced.items?.[0].isPaid, true);
    assert.strictEqual(synced.items?.[1].description, 'ขยายเวลาเข้าพัก (+2 คืน)');
    assert.strictEqual(synced.items?.[1].isPaid, false);

    const reconciled = reconcileBillsWithReservations([bill], reservations);
    assert.strictEqual(reconciled[0].items?.[0].description, 'ค่าห้องพักเบื้องต้น (1 คืน)');
    assert.strictEqual(reconciled[0].items?.[1].description, 'ขยายเวลาเข้าพัก (+2 คืน)');
  });
});

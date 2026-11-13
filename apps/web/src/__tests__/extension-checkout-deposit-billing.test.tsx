import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoomDetailsModal } from '../components/front-desk/RoomDetailsModal';
import { CheckOutModal } from '../components/front-desk/CheckOutModal';
import { FolioSplitScreen } from '../components/front-desk/FolioSplitScreen';
import { ExtendStayModal, syncExtensionChargeToBill } from '../components/front-desk/ExtendStayModal';
import { reconcileLiveFolios } from '../pages/front-desk/CashierFolioPage';
import { computeBillingHistoryNetTotal } from '../pages/front-desk/DailyOperationsPage';
import { ToastProvider } from '../context/ToastContext';
import { I18nProvider } from '../lib/i18n';
import type { Room, RoomType } from '@keystay/types';
import { resolveReservationNightlyRate, type ExtendedReservation } from '../hooks/useReservations';
import type { BillItem, DetailedBill } from '../hooks/useBilling';

function renderWithProviders(element: React.ReactElement): string {
  return renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(ToastProvider, null, element)
    )
  );
}

describe('Task 5: Duplicate Cancel Removal, Separate Extension Item, Checkout Deposit Flow & Billing Net Total', () => {
  it('1. RoomDetailsModal renders ONLY 1 "ยกเลิกการจอง" button for a reserved room', () => {
    const reservedRoom: Room = {
      id: 'rm-102',
      roomNumber: '102',
      roomTypeId: 'rt-std',
      status: 'reserved',
      floor: '1',
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
    };
    const roomType: RoomType = {
      id: 'rt-std',
      name: 'Standard Room',
      basePrice: '1200',
      capacity: 2,
      amenities: [],
    };
    const reservedRes: ExtendedReservation = {
      id: 'res-rsv-102',
      bookingNumber: 'BK-2026-102',
      guestId: 'g-102',
      guestName: 'กานดา รักดี',
      roomId: 'rm-102',
      roomNumber: '102',
      checkInDate: '2026-11-13',
      checkOutDate: '2026-11-14',
      totalNights: '1',
      totalAmount: '1700',
      depositAmount: '500',
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingSource: 'phone',
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
    };

    const html = renderWithProviders(
      React.createElement(RoomDetailsModal, {
        isOpen: true,
        initialTab: 'stay',
        room: reservedRoom,
        roomType,
        currentReservation: reservedRes,
        onClose: () => {},
      })
    );

    const cancelMatches = html.match(/ยกเลิกการจอง/g) || [];
    assert.strictEqual(
      cancelMatches.length,
      1,
      `Expected exactly 1 "ยกเลิกการจอง" button in RoomDetailsModal for reserved room, got ${cancelMatches.length}`
    );
    assert.ok(html.includes('เช็คอิน'), 'Footer should retain the Check-In button beside Cancel');
  });

  it('2. CheckOutModal with paid initial stay + deposit + NO unpaid extras hides payment method buttons and displays deposit refund', () => {
    const paidRes: ExtendedReservation = {
      id: 'res-paid-201',
      bookingNumber: 'BK-2026-201',
      guestId: 'g-201',
      guestName: 'สมชาย ใจดี',
      roomId: 'rm-201',
      roomNumber: '201',
      checkInDate: '2026-11-12',
      checkOutDate: '2026-11-13',
      totalNights: '1',
      totalAmount: '2500',
      depositAmount: '500',
      status: 'checked_in',
      paymentStatus: 'paid',
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    };

    const paidRoomItem: BillItem = {
      id: 'bi-room-paid',
      billId: 'bill-201',
      description: 'ค่าห้องพักเบื้องต้น (1 คืน)',
      category: 'room',
      itemType: 'room_charge',
      quantity: 1,
      unitPrice: '2000',
      totalAmount: '2000',
      isPaid: true,
      createdAt: '2026-11-12T00:00:00Z',
    };

    const html = renderWithProviders(
      React.createElement(CheckOutModal, {
        isOpen: true,
        reservation: paidRes,
        initialFolioItems: [paidRoomItem],
        onClose: () => {},
      })
    );

    // Displays deposit refund banner and paid badge
    assert.ok(html.includes('คืนเงินมัดจำเต็มจำนวน'), 'Should show full deposit refund banner');
    assert.ok(html.includes('500'), 'Should display 500 deposit refund amount');
    assert.ok(html.includes('ชำระแล้ว'), 'Initial room item should show ชำระแล้ว badge');

    // Hides all payment method selector buttons (เงินสด / โอน / บัตรเครดิต / QR)
    assert.strictEqual(html.includes('เงินสด'), false, 'Should hide Cash button when netDue === 0');
    assert.strictEqual(html.includes('บัตรเครดิต'), false, 'Should hide Credit Card button when netDue === 0');
    assert.strictEqual(html.includes('พร้อมเพย์'), false, 'Should hide QR PromptPay button when netDue === 0');
    assert.strictEqual(html.includes('โอนเงิน'), false, 'Should hide Bank Transfer button when netDue === 0');
  });

  it('3. CheckOutModal & FolioSplitScreen with paid initial stay + unpaid extension/minibar exceeding deposit shows 7% VAT ONLY on unpaid items, deducts deposit, and shows payment methods', () => {
    const extendedRes: ExtendedReservation = {
      id: 'res-ext-301',
      bookingNumber: 'BK-2026-301',
      guestId: 'g-301',
      guestName: 'วิชัย สายลม',
      roomId: 'rm-301',
      roomNumber: '301',
      checkInDate: '2026-11-11',
      checkOutDate: '2026-11-14',
      totalNights: '3',
      totalAmount: '6500',
      depositAmount: '500',
      status: 'extended',
      paymentStatus: 'paid',
      createdAt: '2026-11-11T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    };

    const items: BillItem[] = [
      {
        id: 'bi-room-1',
        billId: 'bill-301',
        description: 'ค่าห้องพักเบื้องต้น (1 คืน)',
        category: 'room',
        itemType: 'room_charge',
        quantity: 1,
        unitPrice: '2000',
        totalAmount: '2000',
        isPaid: true,
        createdAt: '2026-11-11T00:00:00Z',
      },
      {
        id: 'bi-ext-1',
        billId: 'bill-301',
        description: 'ขยายเวลาเข้าพัก (+2 คืน)',
        category: 'room',
        itemType: 'room_charge',
        quantity: 2,
        unitPrice: '2000',
        totalAmount: '4000',
        isPaid: false,
        createdAt: '2026-11-12T00:00:00Z',
      },
      {
        id: 'bi-mini-1',
        billId: 'bill-301',
        description: 'Drinking Water',
        category: 'minibar',
        itemType: 'minibar',
        quantity: 1,
        unitPrice: '100',
        totalAmount: '100',
        isPaid: false,
        createdAt: '2026-11-12T00:00:00Z',
      },
    ];

    // Unpaid subtotal = 4100; Unpaid VAT 7% = 287; Unpaid total with VAT = 4387; Deposit = 500 -> Net Due = 3887
    const html = renderWithProviders(
      React.createElement(CheckOutModal, {
        isOpen: true,
        reservation: extendedRes,
        initialFolioItems: items,
        onClose: () => {},
      })
    );

    assert.ok(html.includes('ชำระแล้ว'), 'Initial paid room should show ชำระแล้ว pill');
    assert.ok(html.includes('ค้างชำระ'), 'Unpaid extension/minibar should show ค้างชำระ pill');
    assert.ok(html.includes('4,100'), 'Should display unpaid pre-VAT subtotal 4,100');
    assert.ok(html.includes('287'), 'Should display 7% VAT ONLY on unpaid items (287, not 427)');
    assert.ok(html.includes('4,387'), 'Should display total new charges with VAT 4,387');
    assert.ok(html.includes('3,887'), 'Should display net due after 500 deposit deduction (3,887)');

    // Shows payment method selector buttons when netDue > 0
    assert.ok(html.includes('เงินสด'), 'Should show Cash payment method button when netDue > 0');
    assert.ok(html.includes('บัตรเครดิต'), 'Should show Credit Card payment method button when netDue > 0');

    // Also verify FolioSplitScreen in settlement mode with zero unpaid items hides payment buttons
    const settledSplitHtml = renderWithProviders(
      React.createElement(FolioSplitScreen, {
        bill: {
          id: 'bill-paid-only',
          reservationId: 'res-paid-201',
          guestId: 'g-201',
          roomNumber: '201',
          guestName: 'สมชาย ใจดี',
          status: 'unpaid' as any,
          subtotal: '2000',
          taxAmount: '140',
          netAmount: '2140',
          paidAmount: '2140',
          items: [items[0]],
          createdAt: '2026-11-12T00:00:00Z',
          updatedAt: '2026-11-12T00:00:00Z',
        },
        depositAmount: '500',
        reservationPaymentStatus: 'paid',
        showSettlement: true,
        onAddCharge: () => {},
        onDeleteItem: () => {},
        onViewInvoice: () => {},
      })
    );
    assert.ok(settledSplitHtml.includes('คืนเงินมัดจำเต็มจำนวน'), 'FolioSplitScreen should show full deposit refund when netDue === 0');
    assert.strictEqual(settledSplitHtml.includes('เงินสด'), false, 'FolioSplitScreen should hide payment buttons when netDue === 0');
  });

  it('4. DailyOperationsPage Billing History computes VAT-inclusive Net Total instead of pre-VAT subtotal', () => {
    // When bill.totalAmount is present (> 0), uses VAT-inclusive totalAmount
    const billWithTotalAmount: DetailedBill = {
      id: 'bill-vat-1',
      reservationId: 'res-1',
      guestId: 'g-1',
      status: 'paid',
      subtotal: '2000.00',
      taxAmount: '140.00',
      netAmount: '2000.00', // Even if netAmount was pre-VAT or missing
      totalAmount: '2140.00',
      paidAmount: '2140.00',
      items: [],
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
    };
    assert.strictEqual(computeBillingHistoryNetTotal(billWithTotalAmount), 2140);

    // When bill.totalAmount is 0/missing, calculates VAT-inclusive totalWithVat from items or subtotal
    const billMissingTotalAmount: DetailedBill = {
      id: 'bill-vat-2',
      reservationId: 'res-2',
      guestId: 'g-2',
      status: 'paid',
      subtotal: '2000.00',
      taxAmount: '140.00',
      netAmount: '2000.00',
      paidAmount: '2140.00',
      items: [
        {
          id: 'bi-1',
          billId: 'bill-vat-2',
          description: 'Room Charge (1 night)',
          category: 'room',
          quantity: 1,
          unitPrice: '2000.00',
          totalAmount: '2000.00',
          createdAt: '2026-11-13T00:00:00Z',
        },
        {
          id: 'bi-2',
          billId: 'bill-vat-2',
          description: 'Minibar',
          category: 'minibar',
          quantity: 1,
          unitPrice: '100.00',
          totalAmount: '100.00',
          createdAt: '2026-11-13T00:00:00Z',
        },
      ],
      createdAt: '2026-11-13T00:00:00Z',
      updatedAt: '2026-11-13T00:00:00Z',
    };
    assert.strictEqual(computeBillingHistoryNetTotal(billMissingTotalAmount), 2247);
  });

  it('5. ExtendStayModal creates a separate unpaid extension line item (isPaid: false) and reconcileLiveFolios preserves separate descriptions', async () => {
    const origFetch = globalThis.fetch;
    const calls: Array<{ url: string; method: string; body?: any }> = [];

    const mockRes: ExtendedReservation = {
      id: 'res-ext-500',
      bookingNumber: 'BK-500',
      guestId: 'g-500',
      guestName: 'นภา ใจงาม',
      roomId: 'rm-501',
      roomNumber: '501',
      checkInDate: '2026-11-12',
      checkOutDate: '2026-11-13',
      totalNights: '1',
      totalAmount: '1500',
      depositAmount: '500',
      status: 'checked_in',
      paymentStatus: 'paid',
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    };

    try {
      // Case A: Bill does not exist yet -> creates initial paid bill then appends unpaid extension item
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = String(input);
        const method = init?.method || 'GET';
        const body = init?.body ? JSON.parse(init.body) : undefined;
        calls.push({ url, method, body });

        if (url.endsWith('/api/bills/by-reservation/res-ext-500') && method === 'GET') {
          return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.endsWith('/api/bills') && method === 'POST') {
          return new Response(JSON.stringify({ success: true, data: { id: 'bill-created-500' } }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.endsWith('/api/bills/bill-created-500/items') && method === 'POST') {
          return new Response(JSON.stringify({ success: true, data: { item: { id: 'bi-ext-500' } } }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
      }) as any;

      await syncExtensionChargeToBill({
        reservation: mockRes,
        extraNights: 2,
        nightlyRate: 1500,
        prevNights: 1,
        guestDisplayName: 'นภา ใจงาม',
        roomDisplayNumber: '501',
        roomTypeName: 'ห้องสแตนดาร์ด',
        locale: 'th',
      });

      const createBillCall = calls.find((c) => c.url.endsWith('/api/bills') && c.method === 'POST');
      assert.ok(createBillCall, 'Should create initial bill when none exists yet');
      assert.strictEqual(createBillCall.body.serviceChargeRate, 0);
      assert.strictEqual(createBillCall.body.status, 'paid');
      assert.strictEqual(createBillCall.body.depositDeducted, 500);
      assert.strictEqual(createBillCall.body.items[0].quantity, 1);
      assert.strictEqual(createBillCall.body.items[0].isPaid, true);

      const addItemCall = calls.find((c) => c.url.endsWith('/api/bills/bill-created-500/items') && c.method === 'POST');
      assert.ok(addItemCall, 'Should POST separate extension item to bill');
      assert.strictEqual(addItemCall.body.itemType, 'room_charge');
      assert.strictEqual(addItemCall.body.category, 'room');
      assert.strictEqual(addItemCall.body.description, 'ขยายเวลาเข้าพัก (+2 คืน)');
      assert.strictEqual(addItemCall.body.quantity, 2);
      assert.strictEqual(addItemCall.body.unitPrice, 1500);
      assert.strictEqual(addItemCall.body.isPaid, false);

      // Verify reconcileLiveFolios preserves both initial paid item and separate unpaid extension item
      const reconciled = reconcileLiveFolios(
        [
          {
            id: 'bill-created-500',
            reservationId: 'res-ext-500',
            guestId: 'g-500',
            guestName: 'นภา ใจงาม',
            roomNumber: '501',
            status: 'unpaid' as any,
            subtotal: '4500',
            taxAmount: '315',
            netAmount: '4815',
            paidAmount: '1605',
            items: [
              {
                id: 'bi-init',
                billId: 'bill-created-500',
                description: 'ค่าห้องพัก ห้องสแตนดาร์ด (1 คืน)',
                category: 'room',
                itemType: 'room_charge',
                quantity: 1,
                unitPrice: '1500',
                totalAmount: '1500',
                isPaid: true,
                createdAt: '2026-11-12T00:00:00Z',
              },
              {
                id: 'bi-ext-500',
                billId: 'bill-created-500',
                description: 'ขยายเวลาเข้าพัก (+2 คืน)',
                category: 'room',
                itemType: 'room_charge',
                quantity: 2,
                unitPrice: '1500',
                totalAmount: '3000',
                isPaid: false,
                createdAt: '2026-11-13T00:00:00Z',
              },
            ],
            createdAt: '2026-11-12T00:00:00Z',
            updatedAt: '2026-11-13T00:00:00Z',
          },
        ],
        [{ ...mockRes, totalNights: '3', status: 'extended' }],
        [],
        'th'
      );

      assert.strictEqual(
        reconciled[0].items?.[0].description,
        'ค่าห้องพัก ห้องสแตนดาร์ด (1 คืน)',
        'reconcileLiveFolios must NOT overwrite initial stay description with totalNights'
      );
      assert.strictEqual(
        reconciled[0].items?.[1].description,
        'ขยายเวลาเข้าพัก (+2 คืน)',
        'reconcileLiveFolios must preserve separate extension item description'
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('6. ExtendStayModal uses reservation.nightlyRate when roomType is absent, avoiding VAT-inflated or diluted rate on consecutive extensions', () => {
    const firstExtRes: ExtendedReservation = {
      id: 'res-rate-601',
      bookingNumber: 'BK-601',
      guestId: 'g-601',
      guestName: 'สมศรี มีสุข',
      roomId: 'rm-601',
      roomNumber: '601',
      checkInDate: '2026-11-12',
      checkOutDate: '2026-11-13',
      totalNights: '1',
      nightlyRate: '2000',
      subtotal: '2000',
      totalAmount: '2140', // includes 7% VAT
      depositAmount: '500',
      status: 'checked_in',
      paymentStatus: 'paid',
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    };

    const htmlFirst = renderWithProviders(
      React.createElement(ExtendStayModal, {
        isOpen: true,
        reservation: firstExtRes,
        roomType: null,
        onClose: () => {},
      })
    );

    assert.ok(
      htmlFirst.includes('฿2,000.00'),
      'ExtendStayModal should render pre-VAT reservation.nightlyRate (฿2,000.00) when roomType is absent'
    );
    assert.strictEqual(
      htmlFirst.includes('฿2,140.00'),
      false,
      'ExtendStayModal must NOT bake 7% VAT from totalAmount into nightlyRate'
    );

    // Consecutive extension: even if totalNights grew to 2 while totalAmount remained stale (2140),
    // nightlyRate must remain 2000 (not diluted to 1070)
    const consecutiveExtRes: ExtendedReservation = {
      ...firstExtRes,
      checkOutDate: '2026-11-14',
      totalNights: '2',
      nightlyRate: '2000',
      totalAmount: '2140',
      status: 'extended',
    };

    const htmlSecond = renderWithProviders(
      React.createElement(ExtendStayModal, {
        isOpen: true,
        reservation: consecutiveExtRes,
        roomType: undefined,
        onClose: () => {},
      })
    );

    assert.ok(
      htmlSecond.includes('฿2,000.00'),
      'Consecutive ExtendStayModal render must keep nightlyRate at ฿2,000.00 when roomType is absent'
    );
    assert.strictEqual(
      htmlSecond.includes('฿1,070.00'),
      false,
      'Consecutive ExtendStayModal render must NOT dilute rate to ฿1,070.00'
    );

    // Verify precedence order in resolveReservationNightlyRate (shared with CheckOutModal)
    assert.strictEqual(
      resolveReservationNightlyRate(firstExtRes, { basePrice: '2500' }),
      2500,
      'roomType.basePrice should take priority when > 0'
    );
    assert.strictEqual(
      resolveReservationNightlyRate({ ...firstExtRes, nightlyRate: undefined, nightly_rate: '1800' }, null),
      1800,
      'snake_case nightly_rate should be used before subtotal/totalAmount'
    );
    assert.strictEqual(
      resolveReservationNightlyRate(
        { totalNights: '2', subtotal: '4000', totalAmount: '4280' },
        null
      ),
      2000,
      'subtotal / totalNights should be used before VAT-inclusive totalAmount / totalNights'
    );
  });
});

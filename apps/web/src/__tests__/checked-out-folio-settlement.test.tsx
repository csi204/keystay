import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  syncBillWithReservation,
  reconcileBillsWithReservations,
} from '../lib/folioReconciliation';
import { reconcileLiveFolios } from '../pages/front-desk/CashierFolioPage';
import {
  FolioSplitScreen,
  isFolioItemPaid,
  calculateFolioSummary,
} from '../components/front-desk/FolioSplitScreen';
import { I18nProvider } from '../lib/i18n';
import { ToastProvider } from '../context/ToastContext';
import type { DetailedBill } from '../hooks/useBilling';
import type { ExtendedReservation } from '../hooks/useReservations';

function renderWithProviders(element: React.ReactElement): string {
  return renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(ToastProvider, null, element)
    )
  );
}

describe('Checked-Out Guest Folio Settlement & Guards (Kenji Sato & Sarah Jenkins Regression)', () => {
  const checkedOutReservations: ExtendedReservation[] = [
    {
      id: 'res-001',
      bookingNumber: 'RES-2026-1001',
      guestId: 'gst-002',
      guestName: 'Sarah Jenkins',
      roomId: 'rm-202',
      roomNumber: '202',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-14',
      totalNights: '4',
      totalAmount: '14980',
      depositAmount: '3000',
      status: 'checked_out',
      paymentStatus: 'paid',
      createdAt: '2026-11-01T09:00:00Z',
      updatedAt: '2026-11-14T12:46:54Z',
    },
    {
      id: 'res-002',
      bookingNumber: 'RES-2026-1002',
      guestId: 'gst-003',
      guestName: 'Kenji Sato',
      roomId: 'rm-302',
      roomNumber: '302',
      checkInDate: '2026-11-11',
      checkOutDate: '2026-11-15',
      totalNights: '4',
      totalAmount: '23754',
      depositAmount: '5000',
      status: 'checked_out',
      paymentStatus: 'paid',
      createdAt: '2026-11-02T11:30:00Z',
      updatedAt: '2026-11-14T12:46:47Z',
    },
  ];

  const stalePartiallyPaidBills: DetailedBill[] = [
    {
      id: 'bill-002',
      billNumber: 'BILL-2026-0002',
      reservationId: 'res-001',
      guestId: 'gst-002',
      guestName: 'Sarah Jenkins',
      roomNumber: '202',
      subtotal: '14420.00',
      taxAmount: '1009.40',
      netAmount: '16871.40',
      paidAmount: '12429.40',
      totalAmount: '16871.40',
      depositDeducted: '3000.00',
      amountDue: '1442.00',
      status: 'partially_paid' as any,
      items: [
        {
          id: 'bi-005',
          billId: 'bill-002',
          description: 'Deluxe Sea View (4 nights @ 3,500 THB)',
          category: 'room',
          itemType: 'room_charge',
          quantity: 4,
          unitPrice: '3500.00',
          totalAmount: '14000.00',
          isPaid: false,
          createdAt: '2026-09-24T14:20:00Z',
        },
        {
          id: 'bi-006',
          billId: 'bill-002',
          description: 'Toblerone Chocolate 100g',
          category: 'minibar',
          itemType: 'minibar',
          quantity: 2,
          unitPrice: '110.00',
          totalAmount: '220.00',
          isPaid: false,
          createdAt: '2026-09-25T18:00:00Z',
        },
      ],
      createdAt: '2026-09-24T14:20:00Z',
      updatedAt: '2026-11-14T12:46:55Z',
    },
    {
      id: 'bill-003',
      billNumber: 'BILL-2026-0003',
      reservationId: 'res-002',
      guestId: 'gst-003',
      guestName: 'Kenji Sato',
      roomNumber: '302',
      subtotal: '23550.00',
      taxAmount: '1578.50',
      netAmount: '26383.50',
      paidAmount: '20198.50',
      totalAmount: '26383.50',
      depositDeducted: '5000.00',
      amountDue: '1185.00',
      status: 'partially_paid' as any,
      items: [
        {
          id: 'bi-009',
          billId: 'bill-003',
          description: 'Executive Suite (4 nights @ 5,800 THB)',
          category: 'room',
          itemType: 'room_charge',
          quantity: 4,
          unitPrice: '5800.00',
          totalAmount: '23200.00',
          isPaid: false,
          createdAt: '2026-09-25T15:05:00Z',
        },
        {
          id: 'bi-010',
          billId: 'bill-003',
          description: 'Imported Red Wine 375ml',
          category: 'minibar',
          itemType: 'minibar',
          quantity: 1,
          unitPrice: '350.00',
          totalAmount: '350.00',
          isPaid: false,
          createdAt: '2026-09-25T21:00:00Z',
        },
      ],
      createdAt: '2026-09-25T15:05:00Z',
      updatedAt: '2026-11-14T12:46:47Z',
    },
  ];

  it('1. syncBillWithReservation, reconcileBillsWithReservations, and reconcileLiveFolios reconcile checked_out reservation bills to status="paid" with all items isPaid=true', () => {
    const syncedKenji = syncBillWithReservation(stalePartiallyPaidBills[1], checkedOutReservations);
    assert.strictEqual(syncedKenji.status, 'paid', 'Checked-out guest bill must be reconciled to status="paid"');
    assert.strictEqual(Number(syncedKenji.amountDue || 0), 0, 'Checked-out guest bill must have 0 amountDue');
    assert.ok(
      syncedKenji.items?.every((it) => it.isPaid === true),
      'All items on a checked-out guest bill must be marked isPaid=true'
    );

    const reconciledAll = reconcileBillsWithReservations(stalePartiallyPaidBills, checkedOutReservations);
    assert.strictEqual(reconciledAll.length, 2);
    assert.strictEqual(reconciledAll[0].status, 'paid');
    assert.strictEqual(reconciledAll[1].status, 'paid');

    const liveFolios = reconcileLiveFolios(stalePartiallyPaidBills, checkedOutReservations, [], 'th');
    assert.strictEqual(liveFolios[0].status, 'paid');
    assert.strictEqual(liveFolios[1].status, 'paid');
    assert.ok(liveFolios[1].items?.every((it) => it.isPaid === true));
  });

  it('2. isFolioItemPaid treats DB-mapped initial room charge (isPaid: false from is_paid=0) as paid when reservationPaymentStatus="paid", while keeping extension and minibar unpaid', () => {
    const dbMappedInitialRoom = {
      id: 'bi-009',
      category: 'room',
      itemType: 'room_charge',
      description: 'Executive Suite (4 nights @ 5,800 THB)',
      quantity: 4,
      unitPrice: '5800.00',
      totalAmount: '23200.00',
      isPaid: false,
    };
    const dbMappedExtensionRoom = {
      id: 'bi-ext',
      category: 'room',
      itemType: 'room_charge',
      description: 'ขยายเวลาเข้าพัก (+1 คืน)',
      quantity: 1,
      unitPrice: '5800.00',
      totalAmount: '5800.00',
      isPaid: false,
    };
    const dbMappedMinibar = {
      id: 'bi-010',
      category: 'minibar',
      itemType: 'minibar',
      description: 'Imported Red Wine 375ml',
      quantity: 1,
      unitPrice: '350.00',
      totalAmount: '350.00',
      isPaid: false,
    };

    assert.strictEqual(
      isFolioItemPaid(dbMappedInitialRoom, { reservationPaymentStatus: 'paid' }),
      true,
      'Initial room charge must be treated as paid when reservationPaymentStatus is paid'
    );
    assert.strictEqual(
      isFolioItemPaid(dbMappedExtensionRoom, { reservationPaymentStatus: 'paid' }),
      false,
      'Extension room charge with isPaid: false must remain unpaid'
    );
    assert.strictEqual(
      isFolioItemPaid(dbMappedMinibar, { reservationPaymentStatus: 'paid' }),
      false,
      'Minibar charge with isPaid: false must remain unpaid'
    );

    const summary = calculateFolioSummary(
      [dbMappedInitialRoom, dbMappedMinibar],
      5000,
      0,
      { reservationPaymentStatus: 'paid' }
    );
    assert.strictEqual(summary.unpaidSubtotal, 350);
    assert.strictEqual(summary.unpaidTotalWithVat, 374.5);
    assert.strictEqual(summary.netDue, 0);
    assert.strictEqual(summary.refundAmount, 4625.5);
  });

  it('3. FolioSplitScreen hides "ขอของใช้เสริม", "เพิ่มค่าใช้จ่าย / มินิบาร์", and item deletion when guest is checked out or bill is paid', () => {
    const html = renderWithProviders(
      React.createElement(FolioSplitScreen, {
        bill: stalePartiallyPaidBills[1],
        depositAmount: '5000',
        reservationPaymentStatus: 'paid',
        isCheckedOut: true,
        onAddCharge: () => {},
        onRequestAmenities: () => {},
        onDeleteItem: () => {},
        onViewInvoice: () => {},
      })
    );

    assert.ok(html.includes('ชำระแล้ว'), 'Should show ชำระแล้ว badge for checked-out guest');
    assert.strictEqual(html.includes('รอชำระ'), false, 'Must NOT show รอชำระ badge for checked-out guest');
    assert.strictEqual(html.includes('>ค้างชำระ<'), false, 'Must NOT show ค้างชำระ badge on any item for checked-out guest');
    assert.strictEqual(html.includes('ขอของใช้เสริม'), false, 'Must NOT render ขอของใช้เสริม button for checked-out guest');
    assert.strictEqual(
      html.includes('เพิ่มค่าใช้จ่าย / มินิบาร์'),
      false,
      'Must NOT render เพิ่มค่าใช้จ่าย / มินิบาร์ button for checked-out guest'
    );
  });

  it('4. DailyOperationsPage passes reservations to useBilling(reservations) and CheckOutModal sends settleInFull: true', () => {
    const cwd = process.cwd();
    const rootDir =
      cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
        ? path.resolve(cwd, '../..')
        : cwd;

    const dailyOpsCode = fs.readFileSync(
      path.resolve(rootDir, 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'),
      'utf-8'
    );
    assert.match(
      dailyOpsCode,
      /useBilling\(reservations\)/,
      'DailyOperationsPage must pass reservations into useBilling(reservations) to reconcile checked-out bills'
    );

    const checkOutModalCode = fs.readFileSync(
      path.resolve(rootDir, 'apps/web/src/components/front-desk/CheckOutModal.tsx'),
      'utf-8'
    );
    assert.match(
      checkOutModalCode,
      /settleInFull:\s*true/,
      'CheckOutModal must pass settleInFull: true when calling /api/bills/:id/pay'
    );
  });
});

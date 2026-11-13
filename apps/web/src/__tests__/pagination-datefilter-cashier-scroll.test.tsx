import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TableDateFilter,
  EMPTY_DATE_FILTER,
  matchesDateFilter,
} from '../components/common/TableDateFilter';
import { PaginationBar, paginateItems } from '../components/common/PaginationBar';
import { FolioSplitScreen } from '../components/front-desk/FolioSplitScreen';
import { I18nProvider } from '../lib/i18n';
import { ToastProvider } from '../context/ToastContext';
import type { DetailedBill, BillItem } from '../hooks/useBilling';

function resolveWebFile(relativeFromSrc: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'src', relativeFromSrc),
    path.resolve(process.cwd(), 'apps/web/src', relativeFromSrc),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function renderThai(element: React.ReactElement): string {
  return renderToStaticMarkup(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(ToastProvider, null, element)
    )
  );
}

describe('Task 6: Cashier Bounded Scroll, TableDateFilter (วัน/เดือน/ปี) & PaginationBar (10/page)', () => {
  it('1. matchesDateFilter handles YYYY-MM-DD, ISO UTC timestamps (local calendar), and partial filters', () => {
    // Empty filter matches everything
    assert.equal(matchesDateFilter('2026-11-13', EMPTY_DATE_FILTER), true);
    assert.equal(matchesDateFilter(undefined, EMPTY_DATE_FILTER), true);

    // Pure YYYY-MM-DD matching
    assert.equal(
      matchesDateFilter('2026-11-13', { day: '13', month: '11', year: '2026' }),
      true
    );
    assert.equal(
      matchesDateFilter('2026-11-13', { day: '14', month: '11', year: '2026' }),
      false
    );

    // Partial filters (day-only, month-only, year-only, month+year)
    assert.equal(matchesDateFilter('2026-11-05', { day: '5', month: '', year: '' }), true);
    assert.equal(matchesDateFilter('2026-11-05', { day: '', month: '11', year: '' }), true);
    assert.equal(matchesDateFilter('2026-11-05', { day: '', month: '', year: '2026' }), true);
    assert.equal(matchesDateFilter('2026-11-05', { day: '', month: '10', year: '2026' }), false);

    // Full ISO UTC string -> local calendar year/month/day
    const isoSample = '2026-11-13T10:00:00.000Z';
    const localDate = new Date(isoSample);
    assert.equal(
      matchesDateFilter(isoSample, {
        day: String(localDate.getDate()),
        month: String(localDate.getMonth() + 1),
        year: String(localDate.getFullYear()),
      }),
      true
    );

    // Single-date calendar filter (`startDate` only)
    assert.equal(
      matchesDateFilter('2026-11-12', { ...EMPTY_DATE_FILTER, startDate: '2026-11-12', endDate: '' }),
      true
    );
    assert.equal(
      matchesDateFilter('2026-11-13', { ...EMPTY_DATE_FILTER, startDate: '2026-11-12', endDate: '' }),
      false
    );

    // Date-range calendar filter (`startDate` and `endDate`)
    assert.equal(
      matchesDateFilter('2026-11-12', { ...EMPTY_DATE_FILTER, startDate: '2026-11-11', endDate: '2026-11-14' }),
      true
    );
    assert.equal(
      matchesDateFilter('2026-11-15', { ...EMPTY_DATE_FILTER, startDate: '2026-11-11', endDate: '2026-11-14' }),
      false
    );
    assert.equal(
      matchesDateFilter(
        '2026-11-12',
        { ...EMPTY_DATE_FILTER, startDate: '2026-11-12', endDate: '2026-11-14' },
        '2026-11-14'
      ),
      true
    );
    assert.equal(
      matchesDateFilter(
        '2026-11-12',
        { ...EMPTY_DATE_FILTER, startDate: '2026-11-12', endDate: '2026-11-13' },
        '2026-11-14'
      ),
      false
    );

    // Missing/invalid dates return false when a filter is active
    assert.equal(matchesDateFilter('', { day: '13', month: '', year: '' }), false);
    assert.equal(matchesDateFilter('not-a-date', { day: '', month: '11', year: '' }), false);
  });

  it('2. TableDateFilter renders unified Calendar Range Picker trigger (single date & range display in BE) and Clear button when active', () => {
    const htmlInactive = renderThai(
      React.createElement(TableDateFilter, {
        value: EMPTY_DATE_FILTER,
        onChange: () => {},
        dates: ['2024-03-10', '2026-11-13T10:00:00.000Z'],
      })
    );

    assert.ok(htmlInactive.includes('กรองวันที่:'), 'Should render Thai label');
    assert.ok(htmlInactive.includes('เลือกวันที่ / ช่วงวันที่'), 'Should render unified calendar placeholder');
    assert.equal(htmlInactive.includes('ล้างตัวกรอง'), false, 'Clear button hidden when filter empty');

    const htmlSingleActive = renderThai(
      React.createElement(TableDateFilter, {
        value: { ...EMPTY_DATE_FILTER, startDate: '2026-11-13', endDate: '' },
        onChange: () => {},
      })
    );
    assert.ok(htmlSingleActive.includes('13/11/2569'), 'Should display single BE date 13/11/2569');
    assert.ok(htmlSingleActive.includes('ล้างตัวกรอง'), 'Clear button visible when single date active');

    const htmlRangeActive = renderThai(
      React.createElement(TableDateFilter, {
        value: { ...EMPTY_DATE_FILTER, startDate: '2026-11-12', endDate: '2026-11-15' },
        onChange: () => {},
      })
    );
    assert.ok(
      htmlRangeActive.includes('12/11/2569 - 15/11/2569'),
      'Should display BE date range 12/11/2569 - 15/11/2569'
    );
    assert.ok(htmlRangeActive.includes('ล้างตัวกรอง'), 'Clear button visible when range active');
  });

  it('3. paginateItems slices 10 items per page and clamps out-of-range page numbers after filtering', () => {
    const items = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

    const page1 = paginateItems(items, 1, 10);
    assert.equal(page1.totalItems, 25);
    assert.equal(page1.totalPages, 3);
    assert.equal(page1.currentPage, 1);
    assert.equal(page1.startIndex, 1);
    assert.equal(page1.endIndex, 10);
    assert.deepEqual(page1.pageItems, items.slice(0, 10));

    const page3 = paginateItems(items, 3, 10);
    assert.equal(page3.currentPage, 3);
    assert.equal(page3.startIndex, 21);
    assert.equal(page3.endIndex, 25);
    assert.deepEqual(page3.pageItems, items.slice(20, 25));

    // Out-of-range page (e.g. user was on page 4, then filtered down to 5 items)
    const clamped = paginateItems(items.slice(0, 5), 4, 10);
    assert.equal(clamped.totalPages, 1);
    assert.equal(clamped.currentPage, 1);
    assert.equal(clamped.startIndex, 1);
    assert.equal(clamped.endIndex, 5);
    assert.equal(clamped.pageItems.length, 5);

    // Empty dataset
    const empty = paginateItems([], 2, 10);
    assert.equal(empty.totalItems, 0);
    assert.equal(empty.totalPages, 1);
    assert.equal(empty.currentPage, 1);
    assert.equal(empty.startIndex, 0);
    assert.equal(empty.endIndex, 0);
    assert.deepEqual(empty.pageItems, []);
  });

  it('4. PaginationBar renders Thai range summary, ellipsis for >7 pages, and Light Mode active/inactive styling', () => {
    const html = renderThai(
      React.createElement(PaginationBar, {
        currentPage: 5,
        totalPages: 12,
        totalItems: 115,
        startIndex: 41,
        endIndex: 50,
        onPageChange: () => {},
      })
    );

    assert.ok(html.includes('แสดง'), 'Should render Thai summary prefix');
    assert.ok(html.includes('41–50'), 'Should render 41–50 range');
    assert.ok(html.includes('115'), 'Should render total 115');
    assert.ok(html.includes('รายการ'), 'Should render Thai summary suffix');
    assert.ok(html.includes('ก่อนหน้า') && html.includes('ถัดไป'), 'Should render Prev/Next labels');
    assert.ok(html.includes('…'), 'Should render ellipsis when totalPages > 7');
    assert.ok(html.includes('bg-slate-900 text-white'), 'Active page button should use bg-slate-900 text-white');
    assert.ok(html.includes('bg-white text-slate-800 border-slate-300'), 'Inactive buttons should use Light Mode classes');
  });

  it('5. FolioSplitScreen & CashierFolioPage enforce bounded internal vertical scroll without breaking folio math', () => {
    const items: BillItem[] = Array.from({ length: 18 }, (_, i) => ({
      id: `item-${i}`,
      billId: 'bill-scroll-1',
      description: i === 0 ? 'ค่าห้องพักเบื้องต้น (1 คืน)' : `มินิบาร์ #${i}`,
      category: i === 0 ? 'room' : 'minibar',
      itemType: i === 0 ? 'room_charge' : 'minibar',
      quantity: 1,
      unitPrice: i === 0 ? '1500' : '50',
      totalAmount: i === 0 ? '1500' : '50',
      isPaid: i === 0,
      createdAt: '2026-11-13T10:00:00.000Z',
    }));

    const bill: DetailedBill = {
      id: 'bill-scroll-1',
      billNumber: 'INV-SCROLL-01',
      reservationId: 'res-scroll-1',
      guestId: 'guest-scroll-1',
      guestName: 'สมศรี มีสุข',
      roomNumber: '204',
      subtotal: '2350',
      taxAmount: '164.50',
      netAmount: '2514.50',
      totalAmount: '2514.50',
      paidAmount: '1605.00',
      depositDeducted: '500',
      status: 'pending',
      createdAt: '2026-11-13T10:00:00.000Z',
      updatedAt: '2026-11-13T10:00:00.000Z',
      items,
    };

    const html = renderThai(
      React.createElement(FolioSplitScreen, {
        bill,
        depositAmount: '500',
        reservationPaymentStatus: 'paid',
        onAddCharge: () => {},
        onDeleteItem: () => {},
        onViewInvoice: () => {},
      })
    );

    assert.ok(html.includes('overflow-y-auto'), 'FolioSplitScreen items container must include overflow-y-auto');
    assert.ok(/max-h-\[340px\]|max-h-/.test(html), 'FolioSplitScreen items container must include max-h-');
    assert.ok(html.includes('sticky top-0'), 'FolioSplitScreen table header must be sticky inside scroll container');
    assert.ok(html.includes('ชำระแล้ว') && html.includes('ค้างชำระ'), 'Paid/Unpaid breakdown badges must remain intact');

    const cashierCode = fs.readFileSync(
      resolveWebFile('pages/front-desk/CashierFolioPage.tsx'),
      'utf-8'
    );
    assert.match(
      cashierCode,
      /max-h-\[calc\(100vh-260px\)\]\s+overflow-y-auto/,
      'CashierFolioPage left bill list must use bounded max-h-[calc(100vh-260px)] overflow-y-auto'
    );
  });

  it('6. RoomMatrixPage and DailyOperationsPage wire TableDateFilter & PaginationBar (10/page) cleanly', () => {
    const roomMatrixCode = fs.readFileSync(
      resolveWebFile('pages/front-desk/RoomMatrixPage.tsx'),
      'utf-8'
    );
    assert.match(roomMatrixCode, /import[\s\S]*TableDateFilter[\s\S]*matchesDateFilter/);
    assert.match(roomMatrixCode, /import[\s\S]*PaginationBar[\s\S]*paginateItems/);
    assert.match(roomMatrixCode, /<TableDateFilter[\s\S]*onChange=\{setDateFilter\}/);
    assert.match(roomMatrixCode, /paginateItems\(filteredReservations,\s*reservationPage,\s*10\)/);
    assert.match(roomMatrixCode, /paginatedReservations\.pageItems\.map/);
    assert.match(roomMatrixCode, /<PaginationBar[\s\S]*onPageChange=\{setReservationPage\}/);
    assert.match(roomMatrixCode, /setReservationPage\(1\)[\s\S]*\[searchQuery,\s*filterStatus,\s*dateFilter\]/);

    const dailyOpsCode = fs.readFileSync(
      resolveWebFile('pages/front-desk/DailyOperationsPage.tsx'),
      'utf-8'
    );
    assert.match(dailyOpsCode, /import[\s\S]*TableDateFilter[\s\S]*matchesDateFilter/);
    assert.match(dailyOpsCode, /import[\s\S]*PaginationBar[\s\S]*paginateItems/);
    assert.match(dailyOpsCode, /<TableDateFilter[\s\S]*onChange=\{setBillingDateFilter\}/);
    assert.match(dailyOpsCode, /paginateItems\(filteredBills,\s*billingPage,\s*10\)/);
    assert.match(dailyOpsCode, /paginatedBills\.pageItems\.map/);
    assert.match(dailyOpsCode, /<PaginationBar[\s\S]*onPageChange=\{setBillingPage\}/);
    assert.match(dailyOpsCode, /setBillingPage\(1\)[\s\S]*\[billingSearchQuery,\s*billingDateFilter\]/);
    assert.match(dailyOpsCode, /computeBillingHistoryNetTotal\(b\)/, 'Billing History VAT-inclusive Net Total helper must remain intact');
  });
});

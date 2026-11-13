import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 5: Integrated Cashier Hub (Master-Detail, Pending Active Folio & Sidebar Navigation)', () => {
  const frontDeskLayoutPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx');
  const cashierFolioPagePath = path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/CashierFolioPage.tsx');
  const billingRoutePath = path.resolve(process.cwd(), 'services/billing/src/routes/bills.ts');
  const roomMatrixPagePath = path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/RoomMatrixPage.tsx');
  const dailyOpsPagePath = path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx');

  it('Requirement 1: FrontDeskLayout adds Cashier & Folios as a primary sidebar navigation item', () => {
    assert.ok(fs.existsSync(frontDeskLayoutPath), 'FrontDeskLayout.tsx should exist');
    const code = fs.readFileSync(frontDeskLayoutPath, 'utf-8');

    // Must import CreditCard (or ReceiptText)
    assert.match(code, /CreditCard|ReceiptText/, 'FrontDeskLayout should import navigation icon');

    // Must have navigation entry for cashier/billing
    assert.match(code, /\/front-desk\/cashier/, 'FrontDeskLayout should have route /front-desk/cashier in navTabs');
    assert.match(code, /key:\s*['"]cashier['"]/, 'FrontDeskLayout should include cashier nav tab');
    assert.match(code, /icon:\s*(?:CreditCard|ReceiptText)/, 'FrontDeskLayout should use CreditCard icon for cashier');

    // Active state highlighting for cashier & billing mapping
    assert.match(code, /activeTab === ['"](?:cashier|billing)['"]/, 'FrontDeskLayout should activate cashier when activeTab is cashier or billing');
    assert.match(code, /location\.pathname === ['"]\/front-desk\/cashier['"]/, 'FrontDeskLayout should activate cashier on /front-desk/cashier path');
    assert.match(code, /location\.pathname === ['"]\/front-desk\/billing['"]/, 'FrontDeskLayout should map /front-desk/billing path to cashier for active styling');
  });

  it('Requirement 2: services/billing/src/routes/bills.ts POST /bills never marks newly created in-house bill as paid even if totalAmount is 0', () => {
    assert.ok(fs.existsSync(billingRoutePath), 'services/billing/src/routes/bills.ts should exist');
    const code = fs.readFileSync(billingRoutePath, 'utf-8');

    // Ensure status is pending when newly created with 0 items or totalAmount is 0
    // Must NOT mark newly created bill as paid when totalAmount is 0
    assert.match(
      code,
      /items\.length\s*>\s*0\s*&&\s*totalAmount\s*>\s*0\s*&&\s*depositDeducted\s*>=\s*totalAmount\s*\?\s*['"]paid['"]\s*:\s*['"]pending['"]/,
      'POST /bills must set status to pending if totalAmount is 0 or items is empty'
    );
  });

  it('Requirement 3: RoomMatrixPage passes real guest name when navigating to /front-desk/billing', () => {
    assert.ok(fs.existsSync(roomMatrixPagePath), 'RoomMatrixPage.tsx should exist');
    const code = fs.readFileSync(roomMatrixPagePath, 'utf-8');

    // Must pass guestName in state when navigating to /front-desk/billing
    assert.match(
      code,
      /guestName:\s*(?:roomRes\?\.guestName|activeReservation\?\.guestName|roomGuests\[room\.id\])/,
      'RoomMatrixPage must pass real guestName to /front-desk/billing'
    );
  });

  it('Requirement 4: CashierFolioPage implements Swiss Master-Detail layout with Left Master Panel and Right Detail Panel', () => {
    assert.ok(fs.existsSync(cashierFolioPagePath), 'CashierFolioPage.tsx should exist');
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    // Top Header: Auto-refresh pulse badge
    assert.match(code, /animate-pulse/, 'CashierFolioPage must have animated pulse dot');
    assert.match(code, /อัปเดตอัตโนมัติ|Auto-refresh/, 'CashierFolioPage header must display auto-refresh badge');

    // Left Master Panel: Search input (room number, guest name, bill number)
    assert.match(code, /searchQuery/i, 'CashierFolioPage must support search input');

    // Left Master Panel: Filter tabs (All, Pending, Paid)
    assert.match(code, /['"]all['"]/, 'CashierFolioPage must support all filter tab');
    assert.match(code, /['"]pending['"]/, 'CashierFolioPage must support pending filter tab');
    assert.match(code, /['"]paid['"]/, 'CashierFolioPage must support paid filter tab');

    // Bill cards rendering: room badge, guest name, bill number, total amount, status pill
    assert.match(code, /billNumber|bill_number/, 'Bill cards must show bill number');
    assert.match(code, /totalAmount|total_amount/, 'Bill cards must show total amount');
    assert.match(code, /bg-emerald-/, 'Bill cards must have emerald badge for paid');
    assert.match(code, /bg-amber-/, 'Bill cards must have amber badge for pending');

    // Right Detail Panel: Folio details or empty state
    assert.match(code, /FolioSplitScreen/, 'CashierFolioPage must embed FolioSplitScreen in detail panel');
    assert.match(code, /กรุณาเลือกบิลเพื่อดูรายละเอียด|Select a bill/, 'CashierFolioPage must show empty state when no bill selected');
  });

  it('Requirement 5: DailyOperationsPage departures table streamlines row actions down to extend stay and checkout & settle without duplicate buttons', () => {
    assert.ok(fs.existsSync(dailyOpsPagePath), 'DailyOperationsPage.tsx should exist');
    const code = fs.readFileSync(dailyOpsPagePath, 'utf-8');

    // Omits duplicate "เปิด Folio / บิล" action button
    assert.doesNotMatch(
      code,
      /ops\.openFolio|เปิด Folio \/ บิล/,
      'DailyOperationsPage departures table should omit duplicate "เปิด Folio / บิล" button'
    );
    // Preserves Extend Stay and Check-Out & Settle
    assert.match(
      code,
      /CalendarPlus/,
      'DailyOperationsPage departures table preserves Extend Stay button'
    );
    assert.match(
      code,
      /LogOut/,
      'DailyOperationsPage departures table preserves Check-Out & Settle button'
    );
  });
});

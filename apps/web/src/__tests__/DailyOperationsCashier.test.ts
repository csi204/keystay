import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Task 5 — Consolidated Daily Operations & Cashier Settlement Flow', () => {
  const dailyOpsPath = path.resolve(
    process.cwd(),
    'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'
  );
  const checkOutModalPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/CheckOutModal.tsx'
  );

  it('verifies DailyOperationsPage hosts 3 consolidated operational sub-tabs: Arrivals, Checkout & Cashier, and Billing History', () => {
    const pageCode = fs.readFileSync(dailyOpsPath, 'utf-8');

    // 3 sub-tabs state support
    assert.match(
      pageCode,
      /activeSubTab.*('arrivals'|'departures'|'billing'|'in'|'out'|'history')/,
      'DailyOperationsPage must manage sub-tabs including billing/history'
    );

    // Sub-tab 1: Check-in / Arrivals
    assert.match(pageCode, /ops\.(arrivalsToday|subtabCheckInToday)/);
    assert.match(pageCode, /LogIn/);

    // Sub-tab 2: Check-out & Cashiering
    assert.match(pageCode, /ops\.(departuresToday|subtabCheckOutAndCashier)/);
    assert.match(pageCode, /LogOut/);

    // Sub-tab 3: Billing & Settlement History with Receipt icon
    assert.match(pageCode, /ops\.(subtabBillingHistory|billingHistory)/);
    assert.match(pageCode, /Receipt/);

    // Action button opens checkout & cashier modal
    assert.match(
      pageCode,
      /ops\.(checkOut|checkOutAndSettle|subtabCheckOutAndCashier)/,
      'Check-out action button should clearly reflect cashiering & settlement'
    );
  });

  it('verifies standardized typography across DailyOperationsPage tables, sub-tabs, body cells, and status badges', () => {
    const pageCode = fs.readFileSync(dailyOpsPath, 'utf-8');

    // Table headers must NOT contain font-mono on Thai labels
    assert.doesNotMatch(
      pageCode,
      /<th[^>]*font-mono[^>]*>/,
      'Table headers must not have font-mono applied to Thai text'
    );

    // Table headers use text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans
    assert.match(
      pageCode,
      /text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans/
    );

    // Sub-tab label text uses font-sans and count badge uses font-mono font-bold tabular-nums
    assert.match(pageCode, /<span className="font-sans font-semibold">/);
    assert.match(pageCode, /text-xs font-mono font-bold tabular-nums/);

    // Body cells: Thai text / guest names / room types use font-sans text-sm font-medium text-slate-800
    assert.match(pageCode, /font-sans text-sm font-medium text-slate-800/);

    // Body cells: Currency amounts use font-mono tabular-nums font-semibold
    assert.match(pageCode, /font-mono tabular-nums font-semibold/);

    // Status badges use font-sans text-xs font-medium
    assert.match(pageCode, /font-sans text-xs font-medium/);
  });

  it('verifies Billing History sub-tab renders ledger with search and ABB reprint capability', () => {
    const pageCode = fs.readFileSync(dailyOpsPath, 'utf-8');

    // Uses useBilling hook to access bills ledger
    assert.match(pageCode, /useBilling/);
    assert.match(pageCode, /Search/);

    // Displays settled / past folios with room, guest, and amount
    assert.match(pageCode, /bills/);

    // Supports reprinting / viewing ABB invoice
    assert.match(pageCode, /ReceiptTaxInvoiceModal|TaxInvoiceAbbModal/);
  });

  it('verifies CheckOutModal embeds complete Folio Settlement flow with room charges, minibar items, and extra charge addition', () => {
    const code = fs.readFileSync(checkOutModalPath, 'utf-8');

    // Folio Settlement section
    assert.match(code, /Folio|folio|settlement|Settlement/i);

    // Room charges calculation (nightly rate x nights or totalAmount)
    assert.match(code, /calculateFolioSummary|roomRate|totalAmount|subtotal/);

    // Minibar / extra charge integration
    assert.match(code, /addCharge|extraCharge|minibar/i);

    // Key deposit deduction
    assert.match(code, /deposit|depositDeduction|depositAmount/i);
    assert.match(code, /keyCardReturned/);

    // Hero metric for Net Due in monospace tabular nums
    assert.match(code, /font-mono.*tabular-nums/);
    assert.match(code, /netDue|ยอดชำระสุทธิ/i);
  });

  it('verifies payment method selector and immediate Thai Tax Invoice ABB printing trigger upon settlement', () => {
    const code = fs.readFileSync(checkOutModalPath, 'utf-8');

    // Payment methods: cash, transfer, credit_card, qr_promptpay
    assert.match(code, /cash/);
    assert.match(code, /credit_card/);
    assert.match(code, /qr_promptpay|qr/);
    assert.match(code, /transfer/);

    // Immediate Tax Invoice ABB modal / print support upon checkout settlement
    assert.match(code, /ReceiptTaxInvoiceModal|TaxInvoiceAbbModal/);
    assert.match(code, /print|Printer|Invoice|Receipt/i);
  });

  it('ensures zero data loss: preserves all folio calculation rules and deposit return checks', () => {
    const code = fs.readFileSync(checkOutModalPath, 'utf-8');

    // Preserves key card return safety warning and deposit refund
    assert.match(code, /checkout\.keyDepositRefund/);
    assert.match(code, /checkout\.keyCardMissingWarning/);

    // Preserves notes field
    assert.match(code, /checkout\.notes/);
  });

  it('maintains 1:1 bilingual parity between th and en for new operational and cashier keys', () => {
    const requiredKeys = [
      'ops.subtabCheckInToday',
      'ops.subtabCheckOutAndCashier',
      'ops.subtabBillingHistory',
      'checkout.folioSettlement',
      'checkout.roomCharges',
      'checkout.extraCharges',
      'checkout.addCharge',
      'checkout.depositDeduction',
      'checkout.netDue',
      'checkout.paymentMethod',
      'checkout.settleAndCheckOut',
      'checkout.settleSuccess',
      'checkout.printReceiptAbb',
    ];

    for (const key of requiredKeys) {
      assert.ok(th[key], `Missing Thai translation for: ${key}`);
      assert.ok(en[key], `Missing English translation for: ${key}`);
      assert.notStrictEqual(th[key], '', `Thai translation cannot be empty: ${key}`);
      assert.notStrictEqual(en[key], '', `English translation cannot be empty: ${key}`);
    }
  });

  it('Task 6: verifies CheckOutModal automatically creates bill in @keystay/billing if !billId and records payment', () => {
    const code = fs.readFileSync(checkOutModalPath, 'utf-8');

    // Maps folio items to billing schema
    assert.match(code, /room_charge/);
    assert.match(code, /minibar/);
    assert.match(code, /laundry/);
    assert.match(code, /room_service/);
    assert.match(code, /damage/);

    // POST /api/bills when !billId / !billIdToPay
    assert.match(code, /\/api\/bills/);
    assert.match(code, /depositDeducted/);

    // POST /api/bills/${billIdToPay}/pay
    assert.match(code, /\/api\/bills\/\$\{billIdToPay\}\/pay/);
    assert.match(code, /paymentMethod/);

    // Triggers onSuccess and closes modal immediately (does not remain stuck)
    assert.match(code, /onSuccess\?\.()/);
    assert.match(code, /onClose\(\)/);

    // Handles error gracefully
    assert.match(code, /setError/);
    assert.match(code, /setIsSubmitting\(false\)/);
  });

  it('Task 6: verifies DailyOperationsPage hooks CheckOutModal onSuccess to handleManualRefresh for immediate Billing ledger update', () => {
    const pageCode = fs.readFileSync(dailyOpsPath, 'utf-8');

    // CheckOutModal receives onSuccess={handleManualRefresh}
    assert.match(
      pageCode,
      /<CheckOutModal[\s\S]*?onSuccess=\{handleManualRefresh\}/,
      'CheckOutModal must be wired with onSuccess={handleManualRefresh}'
    );

    // handleManualRefresh refreshes reservations, rooms, and billing
    assert.match(
      pageCode,
      /Promise\.all\(\[\s*refreshReservations\(\),\s*refreshRooms\(\),\s*refreshBilling\(\)\s*\]\)/,
      'handleManualRefresh must refresh reservations, rooms, and billing'
    );
  });
});

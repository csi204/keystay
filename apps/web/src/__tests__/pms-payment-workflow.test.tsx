import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4: Hotel PMS Payment Architecture Overhaul (Upfront Room+Deposit & Folio Sync)', () => {
  const rootDir = process.cwd();

  const resolvePath = (relPath: string) => {
    const p1 = path.resolve(rootDir, relPath);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.resolve(rootDir, relPath.replace(/^apps\/web\//, ''));
    if (fs.existsSync(p2)) return p2;
    const p3 = path.resolve(rootDir, 'apps/web', relPath);
    if (fs.existsSync(p3)) return p3;
    return p1;
  };

  const reservationsRoutePath = resolvePath('services/reservation/src/routes/reservations.ts');
  const useReservationsPath = resolvePath('apps/web/src/hooks/useReservations.ts');
  const useBillingPath = resolvePath('apps/web/src/hooks/useBilling.ts');
  const cashierFolioPagePath = resolvePath('apps/web/src/pages/front-desk/CashierFolioPage.tsx');
  const dailyOpsPagePath = resolvePath('apps/web/src/pages/front-desk/DailyOperationsPage.tsx');
  const folioReconciliationPath = resolvePath('apps/web/src/lib/folioReconciliation.ts');
  const billingRoutePath = resolvePath('services/billing/src/routes/bills.ts');

  it('1. Walk-in check-in creates reservation with status: checked_in, paymentStatus: paid, and total = roomRate * nights + deposit', () => {
    assert.ok(fs.existsSync(reservationsRoutePath), 'reservations.ts should exist');
    assert.ok(fs.existsSync(useReservationsPath), 'useReservations.ts should exist');

    const routeCode = fs.readFileSync(reservationsRoutePath, 'utf-8');
    const hookCode = fs.readFileSync(useReservationsPath, 'utf-8');

    // In reservations.ts: Walk-in calculates total amount as (nightlyRate * totalNights + depositAmount)
    assert.match(
      routeCode,
      /totalAmount\s*=\s*(Number\()?[^;]*(nightlyRate\s*\*\s*totalNights|subtotal)\s*\+\s*depositAmount/,
      'reservations.ts walk-in route must calculate totalAmount including room rate * nights + deposit'
    );

    // In reservations.ts: Walk-in inserts reservation with status 'checked_in' and payment_status 'paid'
    assert.match(
      routeCode,
      /paymentStatus\s*=\s*['"]paid['"]|payment_status.*?'paid'/,
      'reservations.ts walk-in route must set paymentStatus to paid'
    );

    // In useReservations.ts: walkInCheckIn ensures paymentStatus is 'paid'
    assert.match(
      hookCode,
      /paymentStatus:\s*(data\.paymentStatus\s*\|\|\s*)?['"]paid['"]/,
      'useReservations.ts walkInCheckIn must enforce paymentStatus paid'
    );
  });

  it('2. Initial folio bill created with room fee and deposit has status: paid', () => {
    assert.ok(fs.existsSync(billingRoutePath), 'bills.ts should exist');
    assert.ok(fs.existsSync(useReservationsPath), 'useReservations.ts should exist');

    const billingCode = fs.readFileSync(billingRoutePath, 'utf-8');
    const hookCode = fs.readFileSync(useReservationsPath, 'utf-8');

    // In useReservations.ts: walkInCheckIn auto-creates initial folio bill with status: 'paid'
    assert.match(
      hookCode,
      /\/api\/bills/,
      'useReservations.ts walkInCheckIn must create initial folio bill'
    );
    assert.match(
      hookCode,
      /status:\s*['"]paid['"]/,
      'useReservations.ts initial folio bill must be created with status paid'
    );

    // In bills.ts: allows creating bill with status 'paid' or recognizes deposit + room upfront payment
    assert.match(
      billingCode,
      /data\.status\s*===?\s*['"]paid['"]|status:\s*['"]paid['"]/,
      'services/billing/src/routes/bills.ts must support upfront paid status for initial folio'
    );

    // In bills.ts: when created with status 'paid', inserts record into payments table
    assert.match(
      billingCode,
      /INSERT INTO payments[^;]*'completed'/,
      'services/billing/src/routes/bills.ts must record completed payment row when bill created with status paid'
    );

    // In bills.ts recalculateBill: preserves existing amount_paid
    assert.match(
      billingCode,
      /amountPaid\s*=\s*Math\.max\([^)]*bill\.amount_paid/,
      'recalculateBill must preserve existing bill.amount_paid to prevent zeroing upfront payments'
    );

    // In useReservations.ts: uses clean roomNumber fallback
    assert.match(
      hookCode,
      /data\.roomId\.replace\(\/\^rm-\/,\s*['"]['"]\)/,
      'useReservations.ts must use clean roomNumber fallback without rm- prefix'
    );
  });

  it('3. Adding a minibar/extra charge updates folio bill status to unpaid (รอชำระ)', () => {
    assert.ok(fs.existsSync(useBillingPath), 'useBilling.ts should exist');
    assert.ok(fs.existsSync(billingRoutePath), 'bills.ts should exist');

    const hookCode = fs.readFileSync(useBillingPath, 'utf-8');
    const billingCode = fs.readFileSync(billingRoutePath, 'utf-8');

    // In useBilling.ts: addExtraCharge updates bill status to 'unpaid'
    assert.match(
      hookCode,
      /status:\s*['"]unpaid['"]/,
      'useBilling.ts addExtraCharge must update bill status to unpaid'
    );

    // In bills.ts: POST /bills/:id/items must NOT block bills with status 'paid', and flips status to 'unpaid'
    const postItemsSection = billingCode.slice(
      billingCode.indexOf("bills.post('/:id/items'"),
      billingCode.indexOf("bills.delete('/:id/items/:itemId'")
    );
    assert.doesNotMatch(
      postItemsSection,
      /existing\.status\s*===?\s*['"]paid['"]/,
      'bills.ts POST /:id/items must allow adding items to active upfront-paid bills'
    );
    assert.match(
      postItemsSection,
      /status\s*=\s*['"]unpaid['"]/,
      'bills.ts must set status to unpaid when extra charges are added'
    );
  });

  it('4. Daily Operations departures badge reflects all active in-house departures (dueToday + earlyOrExtended)', () => {
    assert.ok(fs.existsSync(dailyOpsPagePath), 'DailyOperationsPage.tsx should exist');

    const pageCode = fs.readFileSync(dailyOpsPagePath, 'utf-8');

    // Defines departuresCount summing dueTodayDepartures and earlyOrExtendedDepartures
    assert.match(
      pageCode,
      /departuresCount\s*=\s*dueTodayDepartures\.length\s*\+\s*earlyOrExtendedDepartures\.length/,
      'DailyOperationsPage.tsx must compute departuresCount as dueTodayDepartures.length + earlyOrExtendedDepartures.length'
    );

    // Renders ({departuresCount}) in departures tab badge
    assert.match(
      pageCode,
      /\(\{\s*departuresCount\s*\}\)/,
      'DailyOperationsPage.tsx must display ({departuresCount}) in departures tab badge'
    );
  });

  it('5. Billing History table displays ยอดสุทธิ (Net Total) in the amount column', () => {
    assert.ok(fs.existsSync(dailyOpsPagePath), 'DailyOperationsPage.tsx should exist');

    const pageCode = fs.readFileSync(dailyOpsPagePath, 'utf-8');

    // Amount column header displays ยอดสุทธิ
    assert.match(
      pageCode,
      /ยอดสุทธิ/,
      'DailyOperationsPage.tsx billing history table must display ยอดสุทธิ in the amount column header'
    );

    // Amount column uses font-mono tabular-nums for monetary values
    assert.match(
      pageCode,
      /<td[^>]*font-mono[^>]*tabular-nums[^>]*>\s*\{formatCurrency\(billTotal\)\}/,
      'DailyOperationsPage.tsx billing history amount cell must format currency with font-mono tabular-nums'
    );
  });

  it('6. Strict Thai orthography: zero instances of "เช็คเอาท์" in all modified files', () => {
    const filesToCheck = [
      reservationsRoutePath,
      useReservationsPath,
      useBillingPath,
      cashierFolioPagePath,
      dailyOpsPagePath,
    ];

    for (const filePath of filesToCheck) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const count = (content.match(/เช็คเอาท์/g) || []).length;
        assert.strictEqual(
          count,
          0,
          `File ${path.basename(filePath)} contains ${count} instance(s) of "เช็คเอาท์", must strictly use "เช็คเอาต์"`
        );
      }
    }
  });
});

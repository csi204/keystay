import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 5: One-Click Auto-Settle Checkout & Cashier Active Folio Auto-Creation', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const checkOutModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/CheckOutModal.tsx'
  );
  const dailyOpsPath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'
  );
  const cashierFolioPagePath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/CashierFolioPage.tsx'
  );
  const billingRoutePath = path.resolve(
    rootDir,
    'services/billing/src/routes/bills.ts'
  );

  it('verifies all target files exist', () => {
    assert.ok(fs.existsSync(checkOutModalPath), 'CheckOutModal.tsx should exist');
    assert.ok(fs.existsSync(dailyOpsPath), 'DailyOperationsPage.tsx should exist');
    assert.ok(fs.existsSync(cashierFolioPagePath), 'CashierFolioPage.tsx should exist');
    assert.ok(fs.existsSync(billingRoutePath), 'bills.ts should exist');
  });

  it('CheckOutModal implements Decision A1: one-click auto-settle with useToast, close, and onSuccess', () => {
    const code = fs.readFileSync(checkOutModalPath, 'utf-8');

    // 1. Imports and uses useToast
    assert.match(code, /import\s*\{[^}]*useToast[^}]*\}\s*from\s*['"]@\/context\/ToastContext['"]/);
    assert.match(code, /const\s+toast\s*=\s*useToast\(\)/);

    // 2. Shows success toast on checkout settlement
    assert.match(code, /toast\.showSuccess\(/);

    // 3. Checkout confirmation calls check-out, bill creation if none, and /pay
    assert.match(code, /api\/reservations\/\$\{[^}]+\}\/check-out/);
    assert.match(code, /api\/bills\/\$\{[^}]+\}\/pay/);

    // 4. Closes modal immediately and calls onSuccess
    assert.match(code, /onSuccess\?\.?\(\)/);
    assert.match(code, /onClose\(\)/);
  });

  it('services/billing /bills/:id/pay handles zero-due paid transition and case-insensitive payment methods', () => {
    const code = fs.readFileSync(billingRoutePath, 'utf-8');

    // Handles netPayable === 0 or paymentAmount <= 0 without returning 400 error
    assert.match(code, /netPayable\s*===?\s*0/);
    assert.match(code, /status\s*=\s*['"]paid['"]/);

    // Case-insensitive paymentMethod resolution supporting aliases
    assert.match(code, /pm-cash|pm-card|pm-qr|pm-transfer/);
    assert.match(code, /toLowerCase/);
  });

  it('CashierFolioPage implements Decision A1: auto-creates active folio on the fly when no bill exists', () => {
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    // Auto-create bill when navigated with action=add-charge / charge / minibar or room/reservation without bill
    assert.match(code, /apiFetch[^;]*['"]\/api\/bills['"][^;]*POST/);
    assert.match(code, /setIsAddChargeOpen\(true\)/);
  });

  it('DailyOperationsPage refreshes reservations, rooms, and billing on checkout success with emerald badge and 80mm slip button', () => {
    const code = fs.readFileSync(dailyOpsPath, 'utf-8');

    // onSuccess refreshes all operational stores
    assert.match(code, /onSuccess=\{handleManualRefresh\}/);
    assert.match(code, /refreshReservations\(\)/);
    assert.match(code, /refreshRooms\(\)/);
    assert.match(code, /refreshBilling\(\)/);

    // Displays emerald badge for paid bills
    assert.match(code, /bg-emerald-50 text-emerald-800 border-emerald-200/);
    assert.match(code, /folio\.paid/);

    // 80mm slip reprint button
    assert.match(code, /handleOpenReprintInvoice/);
    assert.match(code, /80mm/);
  });
});

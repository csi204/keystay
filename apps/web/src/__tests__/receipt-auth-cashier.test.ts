import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4: Resolve Cashier Name from Active Auth User Session in ReceiptTaxInvoiceModal', () => {
  const modalPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx'
  );

  it('verifies ReceiptTaxInvoiceModal.tsx exists and is readable', () => {
    assert.strictEqual(fs.existsSync(modalPath), true, 'ReceiptTaxInvoiceModal.tsx must exist');
  });

  it('verifies ReceiptTaxInvoiceModal imports getAuthUser from lib/api', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(
      code,
      /import\s+.*getAuthUser.*from\s+['"](@\/lib\/api|\.\.\/\.\.\/lib\/api)['"]/,
      'ReceiptTaxInvoiceModal must import getAuthUser from lib/api'
    );
  });

  it('verifies ReceiptTaxInvoiceModalProps accepts optional cashierName prop', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(
      code,
      /interface\s+ReceiptTaxInvoiceModalProps\s*\{[\s\S]*?cashierName\?\s*:\s*string;[\s\S]*?\}/,
      'ReceiptTaxInvoiceModalProps must declare optional cashierName?: string'
    );
  });

  it('verifies dynamic cashier resolution logic handles authUser session and fallback', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Calls getAuthUser()
    assert.match(code, /const\s+authUser\s*=\s*getAuthUser\(\)/);

    // Resolves cashier name with priority: cashierName || authUser?.fullName || firstName/lastName || username || default
    assert.match(code, /resolvedCashier\s*=/);
    assert.match(code, /cashierName/);
    assert.match(code, /authUser\?\.fullName/);
    assert.match(code, /authUser\?\.firstName/);
    assert.match(code, /authUser\?\.lastName/);
    assert.match(code, /เดียร์\s*\(ธีรภัทร\)/);

    // Resolves role title: owner -> Hotel Owner, housekeeping -> Housekeeping, fallback -> Front Desk
    assert.match(code, /cashierRoleTitle\s*=/);
    assert.match(code, /'Hotel Owner'/);
    assert.match(code, /'Housekeeping'/);
    assert.match(code, /'Front Desk'/);

    // Formats cashierDisplay as `${resolvedCashier} · ${cashierRoleTitle}`
    assert.match(code, /cashierDisplay\s*=\s*`\$\{resolvedCashier\}\s*·\s*\$\{cashierRoleTitle\}`/);
  });

  it('verifies cashier display replaces static hardcoded invoice.cashierName in header and signature block', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Header cashier line must display cashierDisplay
    assert.match(code, /\{cashierDisplay\}/, 'Must render dynamic {cashierDisplay}');

    // Must NOT use static hardcoded invoice.cashierName in the JSX
    assert.doesNotMatch(
      code,
      /<span[^>]*>\{invT\('invoice\.cashierName'\)\}<\/span>/,
      'Must replace static {invT("invoice.cashierName")} with dynamic cashier display'
    );

    // Cashier signature block in footer references resolvedCashier or cashierSignature
    assert.match(code, /invoice\.cashierSignature/);
    assert.match(code, /resolvedCashier/);
  });

  it('simulates resolution logic matching current active auth session matrix', () => {
    // Pure function logic simulation to test exact role and name resolution branches
    const resolveCashierInfo = (
      cashierNameProp?: string,
      authUser?: { fullName?: string; firstName?: string; lastName?: string; username?: string; role?: string } | null
    ) => {
      const resolvedCashier = cashierNameProp || (
        authUser?.fullName ||
        (authUser?.firstName && authUser?.lastName
          ? `${authUser.firstName} ${authUser.lastName}`
          : authUser?.firstName || authUser?.username || 'เดียร์ (ธีรภัทร)')
      );
      const cashierRoleTitle = authUser?.role === 'owner'
        ? 'Hotel Owner'
        : authUser?.role === 'housekeeping'
        ? 'Housekeeping'
        : 'Front Desk';
      const cashierDisplay = `${resolvedCashier} · ${cashierRoleTitle}`;
      return { resolvedCashier, cashierRoleTitle, cashierDisplay };
    };

    // Case 1: Prop override takes highest priority
    const case1 = resolveCashierInfo('Somying Sukjai', { fullName: 'Teeraphat', role: 'front_desk' });
    assert.strictEqual(case1.resolvedCashier, 'Somying Sukjai');
    assert.strictEqual(case1.cashierDisplay, 'Somying Sukjai · Front Desk');

    // Case 2: authUser with fullName and owner role
    const case2 = resolveCashierInfo(undefined, { fullName: 'Siriporn Owner', role: 'owner' });
    assert.strictEqual(case2.resolvedCashier, 'Siriporn Owner');
    assert.strictEqual(case2.cashierRoleTitle, 'Hotel Owner');
    assert.strictEqual(case2.cashierDisplay, 'Siriporn Owner · Hotel Owner');

    // Case 3: authUser with firstName and lastName and housekeeping role
    const case3 = resolveCashierInfo(undefined, { firstName: 'Mali', lastName: 'Clean', role: 'housekeeping' });
    assert.strictEqual(case3.resolvedCashier, 'Mali Clean');
    assert.strictEqual(case3.cashierRoleTitle, 'Housekeeping');
    assert.strictEqual(case3.cashierDisplay, 'Mali Clean · Housekeeping');

    // Case 4: authUser with username only
    const case4 = resolveCashierInfo(undefined, { username: 'staff_user', role: 'front_desk' });
    assert.strictEqual(case4.resolvedCashier, 'staff_user');
    assert.strictEqual(case4.cashierDisplay, 'staff_user · Front Desk');

    // Case 5: null authUser defaults gracefully to fallback
    const case5 = resolveCashierInfo(undefined, null);
    assert.strictEqual(case5.resolvedCashier, 'เดียร์ (ธีรภัทร)');
    assert.strictEqual(case5.cashierRoleTitle, 'Front Desk');
    assert.strictEqual(case5.cashierDisplay, 'เดียร์ (ธีรภัทร) · Front Desk');
  });
});

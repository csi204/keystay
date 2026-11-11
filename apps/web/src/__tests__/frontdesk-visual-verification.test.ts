import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 6: Front Desk Touchpoints Elevation & Visual Verification Suite', () => {
  const checkInPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/CheckInModal.tsx'
  );
  const roomCardPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/RoomCard.tsx'
  );
  const dailyOpsPath = path.resolve(
    process.cwd(),
    'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'
  );
  const verifyScriptPath = path.resolve(
    process.cwd(),
    'scripts/verify-frontdesk-visuals.mjs'
  );

  it('verifies CheckInModal elevated touchpoint layout and controls', () => {
    assert.strictEqual(fs.existsSync(checkInPath), true, 'CheckInModal.tsx must exist');
    const code = fs.readFileSync(checkInPath, 'utf-8');

    // Header with LogIn icon
    assert.match(code, /ยืนยันการเช็คอิน \(Check-In Confirmation\)/);
    assert.match(code, /<LogIn[\s\S]*?w-5\s+h-5\s+text-slate-900[\s\S]*?strokeWidth=\{1\.75\}/);

    // Room & Guest summary card with ROOM_STATUS_CONFIG badge and spec chips
    assert.match(code, /ROOM_STATUS_CONFIG/);
    assert.match(code, /BedDouble/);
    assert.match(code, /Users/);
    assert.match(code, /formatDateRange/);
    assert.match(code, /tabular-nums/);

    // National ID / Passport input with ShieldCheck icon
    assert.match(code, /<ShieldCheck[\s\S]*?w-4\s+h-4[\s\S]*?text-slate-400[\s\S]*?strokeWidth=\{1\.75\}/);

    // Active scale and touch target min-h-[44px] on buttons
    assert.match(code, /min-h-\[44px\]/);
    assert.match(code, /active:scale-\[0\.98\]/);
  });

  it('verifies RoomCard refined optical alignment and strokeWidth={1.75}', () => {
    assert.strictEqual(fs.existsSync(roomCardPath), true, 'RoomCard.tsx must exist');
    const code = fs.readFileSync(roomCardPath, 'utf-8');

    // Micro-chips use strokeWidth={1.75}
    assert.match(code, /<BedDouble[\s\S]*?strokeWidth=\{1\.75\}/);
    assert.match(code, /<Users[\s\S]*?strokeWidth=\{1\.75\}/);
    assert.match(code, /<Bath[\s\S]*?strokeWidth=\{1\.75\}/);
    assert.match(code, /<User[\s\S]*?strokeWidth=\{1\.75\}/);
    assert.match(code, /<Calendar[\s\S]*?strokeWidth=\{1\.75\}/);
    assert.match(code, /<Wrench[\s\S]*?strokeWidth=\{1\.75\}/);
    assert.match(code, /<Zap[\s\S]*?strokeWidth=\{1\.75\}/);
  });

  it('verifies DailyOperationsPage billing history print button indicates 80mm slip', () => {
    assert.strictEqual(fs.existsSync(dailyOpsPath), true, 'DailyOperationsPage.tsx must exist');
    const code = fs.readFileSync(dailyOpsPath, 'utf-8');

    // Print button with Printer icon and 80mm slip indication
    assert.match(code, /<Printer[\s\S]*?w-3\.5\s+h-3\.5\s+mr-1[\s\S]*?strokeWidth=\{1\.75\}/);
    assert.match(code, /พิมพ์สลิป \(80mm\)/);
    assert.match(code, /ReceiptTaxInvoiceModal/);
  });

  it('verifies Playwright visual verification script covers Room Matrix, Walk-In, Check-In, and 80mm Receipt', () => {
    assert.strictEqual(fs.existsSync(verifyScriptPath), true, 'scripts/verify-frontdesk-visuals.mjs must exist');
    const code = fs.readFileSync(verifyScriptPath, 'utf-8');

    assert.match(code, /chromium/);
    assert.match(code, /อัปเดตอัตโนมัติ/);
    assert.match(code, /Walk-In/);
    assert.match(code, /Check-In Confirmation/);
    assert.match(code, /receipt-80mm-paper/);
    assert.match(code, /border-dashed/);
  });
});

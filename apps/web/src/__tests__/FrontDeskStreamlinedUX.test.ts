import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4: Streamline Front Desk Navigation & Information Architecture', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const layoutPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/FrontDeskLayout.tsx'
  );
  const dailyOpsPath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'
  );
  const cashierFolioPath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/CashierFolioPage.tsx'
  );

  it('verifies FrontDeskLayout.tsx has 3 distinct sidebar menu titles: ผังห้องพัก, เช็คอิน & เช็คเอาต์, and แคชเชียร์ & บิล', () => {
    assert.ok(fs.existsSync(layoutPath), 'FrontDeskLayout.tsx must exist');
    const code = fs.readFileSync(layoutPath, 'utf-8');

    // Sidebar navigation items cleanly separate roles:
    // Item 1: Room Matrix
    assert.match(code, /\/front-desk\/room-matrix/);
    assert.match(code, /ผังห้องพัก/);
    assert.match(code, /Room Matrix/);
    assert.match(code, /icon:\s*LayoutGrid/);

    // Item 2: Daily Operations (Check-In & Check-Out)
    assert.match(code, /\/front-desk\/daily-operations/);
    assert.match(code, /เช็คอิน & เช็คเอาต์/);
    assert.match(code, /Check-In & Out/);
    assert.match(code, /icon:\s*UserCheck/);

    // Item 3: Cashier Hub & Folios
    assert.match(code, /\/front-desk\/cashier/);
    assert.match(code, /แคชเชียร์ & บิล/);
    assert.match(code, /Cashier & Folios/);
    assert.match(code, /icon:\s*CreditCard/);

    // Maps /front-desk/billing to /front-desk/cashier active styling
    assert.match(code, /location\.pathname === ['"]\/front-desk\/billing['"]/);
    assert.match(code, /location\.pathname === ['"]\/front-desk\/cashier['"]/);
  });

  it('verifies DailyOperationsPage.tsx departures table omits duplicate "เปิด Folio / บิล" button but preserves "ขยายเวลาเข้าพัก" and "เช็คเอาต์ & คิดเงิน"', () => {
    assert.ok(fs.existsSync(dailyOpsPath), 'DailyOperationsPage.tsx must exist');
    const code = fs.readFileSync(dailyOpsPath, 'utf-8');

    // Departures table must NOT contain duplicate "เปิด Folio / บิล" action button
    assert.doesNotMatch(
      code,
      /เปิด Folio \/ บิล/,
      'DailyOperationsPage departures table must omit duplicate "เปิด Folio / บิล" button'
    );
    assert.doesNotMatch(
      code,
      /ops\.openFolio/,
      'DailyOperationsPage departures table must not invoke ops.openFolio action'
    );

    // Preserves Extend Stay button
    assert.match(code, /ขยายเวลาเข้าพัก/);
    assert.match(code, /CalendarPlus/);

    // Preserves Check-Out & Settle primary button
    assert.match(code, /เช็คเอาต์ & คิดเงิน/);
    assert.match(code, /LogOut/);
  });

  it('verifies page headers reflect clear non-overlapping responsibilities across Front Desk portals', () => {
    assert.ok(fs.existsSync(dailyOpsPath), 'DailyOperationsPage.tsx must exist');
    assert.ok(fs.existsSync(cashierFolioPath), 'CashierFolioPage.tsx must exist');

    const dailyOpsCode = fs.readFileSync(dailyOpsPath, 'utf-8');
    const cashierCode = fs.readFileSync(cashierFolioPath, 'utf-8');

    // DailyOperationsPage header: Check-In & Check-Out Desk
    assert.match(
      dailyOpsCode,
      /เคาน์เตอร์เช็คอิน & เช็คเอาต์/,
      'DailyOperationsPage title must be Check-In & Check-Out Desk in Thai'
    );
    assert.match(
      dailyOpsCode,
      /Check-In & Check-Out Desk/,
      'DailyOperationsPage title must be Check-In & Check-Out Desk in English'
    );
    assert.match(
      dailyOpsCode,
      /การจัดการงานบริการหน้าเคาน์เตอร์ประจำวัน/,
      'DailyOperationsPage subtitle must describe daily arrivals & departures in Thai'
    );
    assert.match(
      dailyOpsCode,
      /Daily front desk arrivals & departures operations/,
      'DailyOperationsPage subtitle must describe daily arrivals & departures in English'
    );

    // CashierFolioPage header: Cashier & Folios
    assert.match(
      cashierCode,
      /แคชเชียร์และบิล/,
      'CashierFolioPage title must be Cashier & Folios in Thai'
    );
    assert.match(
      cashierCode,
      /Cashier Hub & Folios/,
      'CashierFolioPage title must be Cashier Hub & Folios in English'
    );
    assert.match(
      cashierCode,
      /ศูนย์กลางจัดการโฟลิโอค่าใช้จ่าย.*ออกใบเสร็จ\/ใบกำกับภาษี/,
      'CashierFolioPage subtitle must describe centralized folio billing and invoicing in Thai'
    );
    assert.match(
      cashierCode,
      /Centralized Folio Billing & Invoicing/,
      'CashierFolioPage subtitle must describe centralized folio billing and invoicing in English'
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('FrontDeskLayout — Collapsible Left Sidebar & 2-Menu Navigation', () => {
  const layoutPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx');
  const code = fs.readFileSync(layoutPath, 'utf-8');

  it('uses fixed viewport container preventing window stretching', () => {
    assert.match(code, /h-screen\s+w-screen\s+overflow-hidden/);
    assert.match(code, /bg-\[#F8FAFC\]/);
  });

  it('implements collapsible sidebar with w-60 and w-16 classes and localStorage persistence', () => {
    // LocalStorage key keystay_fd_sidebar_collapsed
    assert.match(code, /keystay_fd_sidebar_collapsed/);
    // Width transitions: w-60 (expanded) and w-16 (collapsed)
    assert.match(code, /w-60/);
    assert.match(code, /w-16/);
    // Panel collapse toggle icon
    assert.match(code, /PanelLeftClose|PanelLeft/);
  });

  it('consolidates navigation down to 2 primary operational menus', () => {
    // 2 Primary workflows:
    // 1. Matrix & Reservations (/front-desk/room-matrix)
    assert.match(code, /nav\.matrixAndReservations/);
    assert.match(code, /\/front-desk\/room-matrix/);
    assert.match(code, /LayoutGrid/);

    // 2. Operations & Cashier (/front-desk/daily-operations)
    assert.match(code, /nav\.operationsAndCashier/);
    assert.match(code, /\/front-desk\/daily-operations/);
    assert.match(code, /UserCheck/);

    // Primary nav list should NOT contain separate tabs for /front-desk/reservations or /front-desk/billing
    // Check that nav items array only has 2 items
    const navItemsMatch = code.match(/const\s+navTabs\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(navItemsMatch, 'navTabs should be defined');
    const navTabsContent = navItemsMatch[1];
    const pathMatches = navTabsContent.match(/path:\s*['"][^'"]+['"]/g) || [];
    assert.strictEqual(pathMatches.length, 2, 'Primary navTabs should only contain 2 items');
  });

  it('contains Emergency Outsource button with ShieldCheck, Live Clock with tabular numbers, Language switch, and Logout', () => {
    // Emergency Outsource trigger with ShieldCheck icon
    assert.match(code, /ShieldCheck/);
    assert.match(code, /QuickEmergencyDrawer/);
    assert.match(code, /isEmergencyOpen/);

    // Live clock with tabular numbers
    assert.match(code, /Clock/);
    assert.match(code, /tabular-nums/);

    // Language switcher and Logout
    assert.match(code, /setLocale/);
    assert.match(code, /LogOut/);
    assert.match(code, /handleLogout/);
  });

  it('provides mobile hamburger drawer for responsive screens < 768px', () => {
    // Mobile hamburger toggle button with Menu / X
    assert.match(code, /Menu/);
    assert.match(code, /md:hidden/);
  });

  it('has 2-menu localization keys in th and en dictionaries', () => {
    assert.strictEqual(th['nav.matrixAndReservations'], 'ผังห้องพัก & รายการจอง');
    assert.strictEqual(th['nav.operationsAndCashier'], 'เช็คอิน/เอาต์ & แคชเชียร์');

    assert.strictEqual(en['nav.matrixAndReservations'], 'Room Matrix & Reservations');
    assert.strictEqual(en['nav.operationsAndCashier'], 'Operations & Cashier');
  });
});

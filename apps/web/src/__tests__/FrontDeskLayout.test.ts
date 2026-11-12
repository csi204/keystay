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

  it('consolidates navigation down to primary operational menus including Cashier Hub', () => {
    // Primary workflows:
    // 1. Matrix (/front-desk/room-matrix)
    assert.match(code, /\/front-desk\/room-matrix/);
    assert.match(code, /LayoutGrid/);
    assert.match(code, /ผังห้องพัก/);

    // 2. Check-In & Check-Out (/front-desk/daily-operations)
    assert.match(code, /\/front-desk\/daily-operations/);
    assert.match(code, /UserCheck/);
    assert.match(code, /เช็คอิน & เช็คเอาต์/);

    // 3. Cashier & Folios (/front-desk/cashier)
    assert.match(code, /\/front-desk\/cashier/);
    assert.match(code, /CreditCard/);
    assert.match(code, /แคชเชียร์ & บิล/);

    // Active state highlighting maps /front-desk/billing to cashier
    assert.match(code, /\/front-desk\/billing/);

    // Check that nav items array contains 3 primary items
    const navItemsMatch = code.match(/const\s+navTabs\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(navItemsMatch, 'navTabs should be defined');
    const navTabsContent = navItemsMatch[1];
    const pathMatches = navTabsContent.match(/path:\s*['"][^'"]+['"]/g) || [];
    assert.strictEqual(pathMatches.length, 3, 'Primary navTabs should contain 3 items');
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

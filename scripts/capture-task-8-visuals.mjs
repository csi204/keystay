/**
 * scripts/capture-all-task-8.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const REPO_PREVIEW_DIR = path.resolve(ROOT_DIR, 'preview-responsive');
const PARENT_BRAIN_DIR = 'C:\\Users\\Miller-Wise\\.gemini\\antigravity\\brain\\ce602030-c088-44a0-bc3d-eb1e96aba320\\preview-responsive';
const SUBAGENT_BRAIN_DIR = 'C:\\Users\\Miller-Wise\\.gemini\\antigravity\\brain\\72c32ee3-407f-46d5-b140-db594a634a54\\preview-responsive';

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];

const MOCK_ROOM_TYPES = [
  { id: 'rt-std', name: 'Standard Room', basePrice: '1200.00', capacity: 2, bedType: 'King Bed' },
  { id: 'rt-dlx', name: 'Deluxe Room', basePrice: '1800.00', capacity: 2, bedType: 'Twin Bed' },
  { id: 'rt-ste', name: 'Executive Suite', basePrice: '3500.00', capacity: 4, bedType: 'King Bed' },
];

const MOCK_ROOMS = [
  { id: 'rm-101', roomNumber: '101', floor: '1', status: 'reserved', roomTypeId: 'rt-std', guestName: 'คุณณัฐพล ใจดี', checkInDate: today, checkOutDate: tomorrow },
  { id: 'rm-102', roomNumber: '102', floor: '1', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-103', roomNumber: '103', floor: '1', status: 'checked_out', roomTypeId: 'rt-dlx' },
  { id: 'rm-104', roomNumber: '104', floor: '1', status: 'maintenance', roomTypeId: 'rt-dlx', notes: 'แอร์มีน้ำหยด รอช่างซ่อมบ่ายนี้' },
  { id: 'rm-201', roomNumber: '201', floor: '2', status: 'available', roomTypeId: 'rt-ste' },
  { id: 'rm-202', roomNumber: '202', floor: '2', status: 'occupied', roomTypeId: 'rt-ste', guestName: 'Jessica Alba', checkOutDate: tomorrow },
  { id: 'rm-203', roomNumber: '203', floor: '2', status: 'available', roomTypeId: 'rt-dlx' },
  { id: 'rm-204', roomNumber: '204', floor: '2', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-301', roomNumber: '301', floor: '3', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-302', roomNumber: '302', floor: '3', status: 'available', roomTypeId: 'rt-dlx' },
  { id: 'rm-303', roomNumber: '303', floor: '3', status: 'occupied', roomTypeId: 'rt-ste', guestName: 'เดียร์ ธีรภัทร', checkOutDate: nextWeek },
  { id: 'rm-401', roomNumber: '401', floor: '4', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-402', roomNumber: '402', floor: '4', status: 'available', roomTypeId: 'rt-ste' },
  { id: 'rm-403', roomNumber: '403', floor: '4', status: 'available', roomTypeId: 'rt-dlx' },
];

const MOCK_RESERVATIONS = [
  {
    id: 'res-101',
    bookingNumber: 'BK-20261113-101',
    roomId: 'rm-101',
    roomNumber: '101',
    guestName: 'คุณณัฐพล ใจดี',
    guest: { fullName: 'คุณณัฐพล ใจดี', phone: '089-111-2233', email: 'natthapol@test.com' },
    checkInDate: today,
    checkOutDate: tomorrow,
    totalNights: 1,
    status: 'confirmed',
    totalAmount: '1200.00',
    depositAmount: '500.00',
  },
  {
    id: 'res-202',
    bookingNumber: 'BK-20261113-202',
    roomId: 'rm-202',
    roomNumber: '202',
    guestName: 'Jessica Alba',
    guest: { fullName: 'Jessica Alba', phone: '082-999-0011', email: 'jessica@test.com' },
    checkInDate: today,
    checkOutDate: tomorrow,
    totalNights: 1,
    status: 'checked_in',
    totalAmount: '3800.00',
    depositAmount: '1000.00',
  },
  {
    id: 'res-303',
    bookingNumber: 'BK-20261113-303',
    roomId: 'rm-303',
    roomNumber: '303',
    guestName: 'เดียร์ ธีรภัทร',
    guest: { fullName: 'เดียร์ ธีรภัทร', phone: '081-555-8888', email: 'dear@test.com' },
    checkInDate: today,
    checkOutDate: nextWeek,
    totalNights: 5,
    status: 'checked_in',
    totalAmount: '17500.00',
    depositAmount: '1000.00',
  },
];

const MOCK_BILLS = [
  {
    id: 'bill-202',
    billNumber: 'FOL-20261113-202',
    reservationId: 'res-202',
    guestName: 'Jessica Alba',
    roomNumber: '202',
    status: 'pending',
    subtotal: '3800.00',
    taxAmount: '248.60',
    netAmount: '3800.00',
    paidAmount: '0.00',
    depositDeducted: '1000.00',
    items: [
      {
        id: 'bi-1',
        billId: 'bill-202',
        description: 'Room Charge (1 night) - Executive Suite #202',
        category: 'room',
        quantity: 1,
        unitPrice: '3500.00',
        totalAmount: '3500.00',
        createdAt: today,
      },
    ],
    payments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureDirs() {
  for (const dir of [REPO_PREVIEW_DIR, PARENT_BRAIN_DIR, SUBAGENT_BRAIN_DIR]) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn(`Could not create dir ${dir}:`, e.message);
    }
  }
}

async function saveScreenshot(page, filename) {
  const repoPath = path.join(REPO_PREVIEW_DIR, filename);
  await page.screenshot({ path: repoPath, fullPage: false });
  console.log(`  [SAVED] ${repoPath}`);

  for (const brainDir of [PARENT_BRAIN_DIR, SUBAGENT_BRAIN_DIR]) {
    try {
      if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });
      const brainPath = path.join(brainDir, filename);
      fs.copyFileSync(repoPath, brainPath);
      console.log(`  [COPIED] ${brainPath}`);
    } catch (e) {
      console.warn(`  [WARN] Failed to copy to ${brainDir}:`, e.message);
    }
  }
  return repoPath;
}

async function main() {
  await ensureDirs();
  const baseUrl = 'http://localhost:3000';
  let browser = null;

  try {
    console.log('Launching Playwright Chromium browser...');
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await context.addInitScript(() => {
      const user = { firstName: 'เดียร์', lastName: 'ธีรภัทร', role: 'front_desk' };
      sessionStorage.setItem('keystay_token', 'mock_token_front_desk');
      sessionStorage.setItem('keystay_role', 'front_desk');
      sessionStorage.setItem('keystay_user', JSON.stringify(user));
      sessionStorage.setItem('keystay_locale', 'th');
      sessionStorage.setItem('keystay_splash_shown', 'true');

      localStorage.setItem('keystay_token', 'mock_token_front_desk');
      localStorage.setItem('keystay_role', 'front_desk');
      localStorage.setItem('keystay_user', JSON.stringify(user));
      localStorage.setItem('keystay_locale', 'th');
      localStorage.setItem('keystay_splash_shown', 'true');
      localStorage.setItem('keystay_theme', 'light');
    });

    const page = await context.newPage();

    // Mock API routes
    await page.route('**/api/rooms**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOMS) });
    });
    await page.route('**/api/room-types**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOM_TYPES) });
    });
    await page.route('**/api/reservations**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESERVATIONS) });
    });
    await page.route('**/api/bills/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[0]) });
    });
    await page.route('**/api/housekeeping/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // =========================================================================
    // Screenshot 14: 14-room-card-contrast-and-quick-actions.png
    // =========================================================================
    console.log('\n[14] Capturing Room Card Contrast and Quick Actions...');
    await page.goto(`${baseUrl}/front-desk/room-matrix`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=101');
    await page.waitForTimeout(500);

    // Locate Room 101 card (reserved with amber badge) and open 3-dots Quick Actions
    const room101Card = page.locator('div').filter({ hasText: /^101/ }).first();
    const quickActionsBtn = room101Card.locator('button[aria-label="Quick Actions"]').first();
    await quickActionsBtn.click();
    await page.waitForTimeout(300);

    await saveScreenshot(page, '14-room-card-contrast-and-quick-actions.png');

    // Close menu
    await page.mouse.click(10, 10);
    await page.waitForTimeout(200);

    // =========================================================================
    // Screenshot 15: 15-room-details-modal-2-tabs.png
    // =========================================================================
    console.log('\n[15] Capturing Room Details Modal with 2-Tab Switcher...');
    const room202Card = page.locator('div').filter({ hasText: /^202/ }).first();
    await room202Card.click();
    await page.waitForSelector('button:has-text("ข้อมูลการเข้าพัก")');
    await page.waitForTimeout(500);

    await saveScreenshot(page, '15-room-details-modal-2-tabs.png');

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // =========================================================================
    // Screenshot 16: 16-global-command-palette.png
    // =========================================================================
    console.log('\n[16] Capturing Global Command Palette (Ctrl+K)...');
    await page.keyboard.press('Control+k');
    const omnibarInput = page.locator('input[placeholder*="Esc"]').first();
    await omnibarInput.waitFor({ state: 'visible' });
    await omnibarInput.fill('101');
    await page.waitForTimeout(400);

    await saveScreenshot(page, '16-global-command-palette.png');

    // Close palette
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // =========================================================================
    // Screenshot 17: 17-inline-instant-validation.png
    // =========================================================================
    console.log('\n[17] Capturing Inline Instant Validation in Booking Modal...');
    // Click table sub-tab to see 'สร้างการจองใหม่'
    const tableTab = page.locator('button:has-text("รายการจองทั้งหมด")').first();
    await tableTab.click();
    await page.waitForTimeout(400);

    const newResBtn = page.locator('button:has-text("สร้างการจองใหม่")').first();
    await newResBtn.click();
    await page.waitForSelector('input[type="tel"]');
    await page.waitForTimeout(300);

    // Fill partial phone and blur to trigger instant validation error
    const modalForm = page.locator('form').first();
    const phoneInput = modalForm.locator('input[type="tel"]').first();
    await phoneInput.fill('08123');
    await phoneInput.blur();

    // Fill partial Thai ID and blur to trigger instant validation error
    const idInput = modalForm.locator('input[placeholder*="1-2345"]').first();
    if (await idInput.isVisible()) {
      await idInput.fill('12345');
      await idInput.blur();
    }
    await page.waitForTimeout(400);

    await saveScreenshot(page, '17-inline-instant-validation.png');

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // =========================================================================
    // Screenshot 18: 18-night-audit-dark-mode.png
    // =========================================================================
    console.log('\n[18] Capturing Night Audit Dark Mode...');
    // Go back to grid subtab
    const gridTab = page.locator('button:has-text("ผังห้องพัก")').first();
    await gridTab.click();
    await page.waitForTimeout(300);

    // Clear search filter so full matrix across all floors is visible
    const searchInp = page.locator('input[placeholder*="ค้นหาเลขห้อง"], input[placeholder*="ค้นหา"]').first();
    await searchInp.fill('');
    await page.waitForTimeout(300);

    // Toggle dark mode via Night Audit button in the sidebar and emulate dark colorScheme
    await page.emulateMedia({ colorScheme: 'dark' });
    const nightAuditBtn = page.locator('button[aria-label*="โหมดกะดึก"]').first();
    await nightAuditBtn.click();
    await page.waitForTimeout(600);

    await saveScreenshot(page, '18-night-audit-dark-mode.png');

    console.log('\n===============================================================');
    console.log('✅ ALL 5 TASK 8 VISUAL PROOFS CAPTURED SUCCESSFULLY!');
    console.log('===============================================================\n');

  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});

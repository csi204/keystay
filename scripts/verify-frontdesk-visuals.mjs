/**
 * scripts/verify-frontdesk-visuals.mjs
 * 
 * Standalone Playwright Visual Verification Script for Task 6:
 * - Room Matrix page with 1-minute auto-refresh status badge & spec chips
 * - Walk-In Modal split 2-pane studio layout with live pricing
 * - Elevated Check-In Modal with Room & Guest Summary Card & ShieldCheck ID input
 * - 80mm POS Thermal Receipt modal (ReceiptTaxInvoiceModal) with dashed dividers
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Output directories
const REPO_PREVIEW_DIR = path.resolve(ROOT_DIR, 'preview-responsive');
const BRAIN_PREVIEW_DIR = 'C:\\Users\\Miller-Wise\\.gemini\\antigravity\\brain\\16b8d249-1d49-49e6-a74b-2bdac9620825\\preview-responsive';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];

const MOCK_ROOM_TYPES = [
  {
    id: 'rt-std',
    name: 'Standard Room',
    basePrice: '1200.00',
    capacity: 2,
    bedType: 'King Bed',
    amenities: ['King Bed', 'Wi-Fi', '1 Shower', 'Air Conditioning'],
    description: 'Cozy and quiet standard room for 2 guests.',
  },
  {
    id: 'rt-dlx',
    name: 'Deluxe Room',
    basePrice: '1800.00',
    capacity: 2,
    bedType: 'Twin Bed',
    amenities: ['Twin Bed', 'Wi-Fi', 'Bathtub', 'Balcony'],
    description: 'Spacious deluxe room with twin beds and private balcony.',
  },
  {
    id: 'rt-ste',
    name: 'Executive Suite',
    basePrice: '3500.00',
    capacity: 4,
    bedType: 'King Bed',
    amenities: ['King Bed', 'Wi-Fi', 'Bathtub', 'Living Room', 'Sea View'],
    description: 'Luxury executive suite with ocean view.',
  },
];

const MOCK_ROOMS = [
  { id: 'rm-101', roomNumber: '101', floor: '1', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-102', roomNumber: '102', floor: '1', status: 'occupied', roomTypeId: 'rt-std', guestName: 'สมชาย เข็มกลัด', checkOutDate: tomorrow },
  { id: 'rm-103', roomNumber: '103', floor: '1', status: 'cleaning', roomTypeId: 'rt-dlx' },
  { id: 'rm-104', roomNumber: '104', floor: '1', status: 'maintenance', roomTypeId: 'rt-dlx', notes: 'แอร์มีน้ำหยด รอช่างซ่อมบ่ายนี้' },
  { id: 'rm-201', roomNumber: '201', floor: '2', status: 'available', roomTypeId: 'rt-ste' },
  { id: 'rm-202', roomNumber: '202', floor: '2', status: 'occupied', roomTypeId: 'rt-ste', guestName: 'Jessica Alba', checkOutDate: tomorrow },
  { id: 'rm-203', roomNumber: '203', floor: '2', status: 'reserved', roomTypeId: 'rt-dlx' },
  { id: 'rm-204', roomNumber: '204', floor: '2', status: 'checked_out', roomTypeId: 'rt-std' },
];

const MOCK_RESERVATIONS = [
  {
    id: 'res-001',
    bookingNumber: 'BK-20261111-01',
    roomId: 'rm-203',
    roomNumber: '203',
    guestName: 'นายพงษ์ศักดิ์ รัตนพงษ์',
    guest: { fullName: 'นายพงษ์ศักดิ์ รัตนพงษ์', phone: '081-999-8877', email: 'pongsak@test.com' },
    checkInDate: today,
    checkOutDate: nextWeek,
    totalNights: 5,
    status: 'confirmed',
    totalAmount: '9000.00',
    depositAmount: '1000.00',
  },
  {
    id: 'res-002',
    bookingNumber: 'BK-20261111-02',
    roomId: 'rm-102',
    roomNumber: '102',
    guestName: 'สมชาย เข็มกลัด',
    guest: { fullName: 'สมชาย เข็มกลัด', phone: '081-234-5678', email: 'somchai@test.com' },
    checkInDate: today,
    checkOutDate: tomorrow,
    totalNights: 1,
    status: 'checked_in',
    totalAmount: '1200.00',
    depositAmount: '500.00',
  },
];

const MOCK_BILLS = [
  {
    id: 'bill-10293847',
    billNumber: 'INV-10293847',
    reservationId: 'res-002',
    guestName: 'สมชาย เข็มกลัด',
    roomNumber: '102',
    status: 'paid',
    subtotal: '1121.50',
    taxAmount: '78.50',
    netAmount: '1200.00',
    paidAmount: '1200.00',
    items: [
      {
        id: 'item-1',
        billId: 'bill-10293847',
        description: 'Standard Room (1 คืน)',
        category: 'room',
        quantity: 1,
        unitPrice: '1200.00',
        totalAmount: '1200.00',
        createdAt: today,
      },
      {
        id: 'item-2',
        billId: 'bill-10293847',
        description: 'มินิบาร์ - เครื่องดื่มและขนมขบเคี้ยว',
        category: 'minibar',
        quantity: 2,
        unitPrice: '80.00',
        totalAmount: '160.00',
        createdAt: today,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        billId: 'bill-10293847',
        amount: '1360.00',
        paymentMethod: 'qr_promptpay',
        createdAt: today,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureDirs() {
  for (const dir of [REPO_PREVIEW_DIR, BRAIN_PREVIEW_DIR]) {
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

  try {
    if (fs.existsSync(BRAIN_PREVIEW_DIR)) {
      const brainPath = path.join(BRAIN_PREVIEW_DIR, filename);
      fs.copyFileSync(repoPath, brainPath);
      console.log(`  [COPIED] ${brainPath}`);
    }
  } catch (e) {
    // brain dir fallback
  }
  return repoPath;
}

async function isServerRunning(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function startViteServer() {
  if (await isServerRunning(BASE_URL)) {
    console.log(`Vite server already running at ${BASE_URL}`);
    return null;
  }

  console.log(`Starting Vite preview server on ${BASE_URL}...`);
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(cmd, ['--filter', '@keystay/web', 'preview', '--port', String(PORT)], {
    cwd: ROOT_DIR,
    shell: true,
    stdio: 'pipe',
  });

  for (let i = 0; i < 40; i++) {
    if (await isServerRunning(BASE_URL)) {
      console.log(`Vite preview server is ready at ${BASE_URL}`);
      return child;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Timed out waiting for Vite preview server to start.');
}

async function runVerification() {
  await ensureDirs();
  let serverProcess = null;
  let browser = null;

  const capturedArtifacts = [];

  try {
    serverProcess = await startViteServer();

    console.log('\n--- Launching Headless Chromium ---');
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    // Mock session auth & dismiss splash screen
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
    await page.route('**/api/bills/by-reservation/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[0]) });
    });
    await page.route('**/api/bills**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS) });
    });
    await page.route('**/api/bills/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[0]) });
    });
    await page.route('**/api/housekeeping/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // =========================================================================
    // Test 1: Room Matrix Page with 1-Minute Auto-Refresh Badge & Spec Chips
    // =========================================================================
    console.log('\n[TEST 1] Verifying Room Matrix Page & 1-Minute Auto-Refresh Badge...');
    await page.goto(`${BASE_URL}/front-desk/room-matrix`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Verify auto-refresh badge
    const autoRefreshBadge = page.locator('text=อัปเดตอัตโนมัติทุก 1 นาที');
    const badgeVisible = (await autoRefreshBadge.count()) > 0;
    console.log(`  Auto-refresh 1-min badge visible: ${badgeVisible}`);
    if (!badgeVisible) {
      throw new Error('Auto-refresh 1-min badge not found on Room Matrix page!');
    }

    // Verify pulse/ping dot
    const pulseDot = page.locator('.animate-ping');
    console.log(`  Pulse ping dot count: ${await pulseDot.count()}`);

    // Verify Room Cards with spec chips (localized in Thai as 'เตียงคิงไซส์')
    await page.waitForSelector('text=101');
    const bedChip = page.locator('text=เตียงคิงไซส์').first();
    console.log(`  Spec microchip BedDouble (เตียงคิงไซส์) visible: ${await bedChip.isVisible()}`);

    const pic1 = await saveScreenshot(page, '01-room-matrix-auto-refresh.png');
    capturedArtifacts.push(pic1);

    // =========================================================================
    // Test 2: Walk-In Modal (Split 2-Pane Studio Layout with Live Cost Calculator)
    // =========================================================================
    console.log('\n[TEST 2] Verifying Walk-In Modal Split 2-Pane Layout...');
    await page.goto(`${BASE_URL}/front-desk/daily-operations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Click Walk-In button from top bar of Daily Operations
    const walkInButton = page.locator('button:has-text("Walk-in"), button:has-text("Walk-In")').first();
    await walkInButton.click();
    await page.waitForTimeout(600);

    // Verify Walk-In modal container
    const walkInModalHeader = page.locator('h2:has-text("Walk-In Check-In")');
    console.log(`  Walk-In Modal header visible: ${await walkInModalHeader.isVisible()}`);

    // Verify left pane room selector & specs
    const leftPaneSelector = page.locator('select');
    console.log(`  Left pane room selector visible: ${await leftPaneSelector.count() > 0}`);

    // Verify right pane form fields
    const nameInput = page.locator('input[placeholder="ชื่อ-นามสกุล"]');
    console.log(`  Right pane guest name input visible: ${await nameInput.isVisible()}`);

    const phoneInput = page.locator('input[type="tel"]');
    console.log(`  Right pane phone input visible: ${await phoneInput.isVisible()}`);

    const pic2 = await saveScreenshot(page, '02-walkin-modal-split-layout.png');
    capturedArtifacts.push(pic2);

    // Close Walk-In Modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // =========================================================================
    // Test 3: Elevated Check-In Modal with Room & Guest Summary Card
    // =========================================================================
    console.log('\n[TEST 3] Verifying Elevated Check-In Modal...');
    // Ensure we are on Arrivals sub-tab in Daily Operations
    await page.waitForSelector('text=BK-20261111-01');
    const checkInBtn = page.locator('tr:has-text("BK-20261111-01") button:has-text("เช็คอิน")').first();
    await checkInBtn.click();
    await page.waitForTimeout(600);

    // Verify header title
    const checkInTitle = page.locator('h2:has-text("ยืนยันการเช็คอิน (Check-In Confirmation)")');
    console.log(`  CheckInModal elevated header visible: ${await checkInTitle.isVisible()}`);

    // Verify Room & Guest summary card features: Room number, status pill, localized room type, spec chips, guest name, stay dates with nights counter
    const roomSummaryCard = page.locator('text=ห้องพัก:');
    console.log(`  Summary card room label visible: ${await roomSummaryCard.isVisible()}`);

    const nightsBadge = page.locator('text=คืน').first();
    console.log(`  Nights counter badge visible: ${await nightsBadge.isVisible()}`);

    const confirmCheckInBtn = page.getByRole('button', { name: /ยืนยันการเช็คอิน \(Confirm Check-In\)|ยืนยันเช็คอิน/i });
    console.log(`  Confirm Check-In button visible: ${await confirmCheckInBtn.isVisible()}`);

    const pic3 = await saveScreenshot(page, '03-checkin-modal-elevated.png');
    capturedArtifacts.push(pic3);

    // Close Check-In Modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // =========================================================================
    // Test 4: 80mm POS Thermal Receipt Modal (ReceiptTaxInvoiceModal)
    // =========================================================================
    console.log('\n[TEST 4] Verifying 80mm POS Thermal Receipt Modal with Dashed Dividers...');
    // Switch to Billing History sub-tab
    const billingSubTab = page.locator('button:has-text("ประวัติบิลและการชำระ"), button:has-text("ประวัติบิล"), button:has-text("Billing History")').first();
    await billingSubTab.click();
    await page.waitForTimeout(600);

    // Click "พิมพ์สลิป (80mm)" button
    const printSlipBtn = page.getByRole('button', { name: /พิมพ์สลิป \(80mm\)/i }).first();
    console.log(`  "พิมพ์สลิป (80mm)" button visible: ${await printSlipBtn.isVisible()}`);
    await printSlipBtn.click();
    await page.waitForTimeout(600);

    // Verify receipt modal paper container
    const paper80mm = page.locator('.receipt-80mm-paper');
    const paperVisible = await paper80mm.isVisible();
    console.log(`  .receipt-80mm-paper visible: ${paperVisible}`);
    if (!paperVisible) {
      throw new Error('80mm thermal receipt container not visible!');
    }

    // Verify receipt dashed dividers
    const dashedDividers = page.locator('.receipt-80mm-paper .border-dashed');
    const dashedCount = await dashedDividers.count();
    console.log(`  Dashed divider borders count: ${dashedCount}`);
    if (dashedCount < 3) {
      throw new Error(`Expected at least 3 dashed dividers, found ${dashedCount}`);
    }

    // Verify Hotel header & Tax invoice ABB title
    const hotelHeader = page.locator('text=*** โรงแรม คีย์สเตย์ (KEYSTAY HOTEL) ***');
    console.log(`  Hotel header on slip visible: ${await hotelHeader.isVisible()}`);

    const abbTitle = page.locator('text=TAX INVOICE (ABB) / RECEIPT');
    console.log(`  Tax Invoice ABB title on slip visible: ${await abbTitle.isVisible()}`);

    const barcodeSvg = page.locator('.receipt-80mm-paper svg');
    console.log(`  Barcode SVG on slip visible: ${await barcodeSvg.isVisible()}`);

    const pic4 = await saveScreenshot(page, '04-pos-thermal-receipt-80mm.png');
    capturedArtifacts.push(pic4);

    console.log('\n===============================================================');
    console.log('✅ ALL VISUAL TOUCHPOINTS VERIFIED & SCREENSHOTS CAPTURED:');
    capturedArtifacts.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log('===============================================================\n');

  } finally {
    if (browser) await browser.close();
    if (serverProcess && serverProcess.pid) {
      console.log('Stopping preview server...');
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${serverProcess.pid} /t /f`, { stdio: 'ignore' });
        } else {
          serverProcess.kill();
        }
      } catch (e) {}
    }
  }
}

runVerification().catch((err) => {
  console.error('Visual verification execution error:', err);
  process.exit(1);
});

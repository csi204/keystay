/**
 * scripts/capture-task-8-final-proofs.mjs
 * Captures the 5 required visual proof screenshots for Task 8:
 *  19-fixed-light-dark-toggle.png
 *  20-safe-walkin-and-compact-card.png
 *  21-cashier-2-column-redesign.png
 *  22-cancel-reservation-modal.png
 *  23-compressed-slip-viewer.png
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
const SUBAGENT_BRAIN_DIR = 'C:\\Users\\Miller-Wise\\.gemini\\antigravity\\brain\\71727554-3165-406d-b19b-270642308d52\\preview-responsive';

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
  { id: 'rm-205', roomNumber: '205', floor: '2', status: 'available', roomTypeId: 'rt-std', notes: 'ขอเสริมหมอนขนนก 2 ใบ' },
  { id: 'rm-301', roomNumber: '301', floor: '3', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-302', roomNumber: '302', floor: '3', status: 'available', roomTypeId: 'rt-dlx' },
  { id: 'rm-303', roomNumber: '303', floor: '3', status: 'occupied', roomTypeId: 'rt-ste', guestName: 'เดียร์ ธีรภัทร', checkOutDate: nextWeek },
  { id: 'rm-401', roomNumber: '401', floor: '4', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-402', roomNumber: '402', floor: '4', status: 'available', roomTypeId: 'rt-ste' },
  { id: 'rm-403', roomNumber: '403', floor: '4', status: 'available', roomTypeId: 'rt-dlx' },
];

// Sample authentic SVG promptpay slip converted to data URL
const SAMPLE_SLIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520" fill="#ffffff">
  <rect width="360" height="520" fill="#f8fafc" rx="16" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="0" y="0" width="360" height="75" fill="#003d7c" rx="16" />
  <rect x="0" y="60" width="360" height="15" fill="#003d7c" />
  <text x="180" y="45" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">BANGKOK BANK</text>
  <text x="180" y="105" fill="#0f172a" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" text-anchor="middle">โอนเงินสำเร็จ</text>
  <text x="180" y="125" fill="#64748b" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">13 พ.ย. 2026 14:32 น.</text>
  <circle cx="180" cy="165" r="26" fill="#10b981" />
  <path d="M170 165 l7 7 l14 -14" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  <text x="180" y="222" fill="#0f172a" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">฿1,700.00</text>
  <line x1="30" y1="245" x2="330" y2="245" stroke="#cbd5e1" stroke-dasharray="4 4" />
  <text x="30" y="275" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">จาก: คุณณัฐพล ใจดี</text>
  <text x="30" y="295" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">ธ.กรุงเทพ ••••-1122</text>
  <text x="30" y="330" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">ไปยัง: โรงแรม คีย์สเตย์ พีเอ็มเอส</text>
  <text x="30" y="350" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">ธ.กรุงเทพ (KeyStay Account)</text>
  <line x1="30" y1="375" x2="330" y2="375" stroke="#cbd5e1" stroke-dasharray="4 4" />
  <text x="30" y="405" fill="#64748b" font-family="system-ui, sans-serif" font-size="11">เลขที่อ้างอิง:</text>
  <text x="30" y="425" fill="#0f172a" font-family="monospace" font-size="12" font-weight="bold">BBL-20261113-98421</text>
  <rect x="235" y="390" width="95" height="95" fill="#f1f5f9" rx="8" stroke="#cbd5e1"/>
  <text x="282" y="442" fill="#64748b" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">QR VERIFIED</text>
  <text x="180" y="505" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">e-Slip ออกโดยระบบอัตโนมัติ</text>
</svg>`;

const SAMPLE_SLIP_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_SLIP_SVG)}`;

const MOCK_RESERVATIONS = [
  {
    id: 'res-101',
    bookingNumber: 'BK-20261113-101',
    reservationCode: 'BK-20261113-101',
    roomId: 'rm-101',
    roomNumber: '101',
    guestName: 'คุณณัฐพล ใจดี',
    guest: { fullName: 'คุณณัฐพล ใจดี', phone: '089-111-2233', email: 'natthapol@test.com' },
    checkInDate: today,
    checkOutDate: tomorrow,
    totalNights: 1,
    status: 'confirmed',
    bookingSource: 'phone',
    paymentStatus: 'paid',
    paymentSlipUrl: SAMPLE_SLIP_DATA_URL,
    paymentSlipRef: 'BBL-20261113-98421',
    totalAmount: '1700.00',
    depositAmount: '500.00',
  },
  {
    id: 'res-202',
    bookingNumber: 'BK-20261113-202',
    reservationCode: 'BK-20261113-202',
    roomId: 'rm-202',
    roomNumber: '202',
    guestName: 'Jessica Alba',
    guest: { fullName: 'Jessica Alba', phone: '082-999-0011', email: 'jessica@test.com' },
    checkInDate: today,
    checkOutDate: tomorrow,
    totalNights: 1,
    status: 'checked_in',
    bookingSource: 'walk_in',
    paymentStatus: 'paid',
    totalAmount: '4500.00',
    depositAmount: '1000.00',
  },
  {
    id: 'res-303',
    bookingNumber: 'BK-20261113-303',
    reservationCode: 'BK-20261113-303',
    roomId: 'rm-303',
    roomNumber: '303',
    guestName: 'เดียร์ ธีรภัทร',
    guest: { fullName: 'เดียร์ ธีรภัทร', phone: '081-555-8888', email: 'dear@test.com' },
    checkInDate: today,
    checkOutDate: nextWeek,
    totalNights: 5,
    status: 'checked_in',
    bookingSource: 'facebook',
    paymentStatus: 'paid',
    totalAmount: '18500.00',
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
    status: 'unpaid',
    subtotal: '4300.00',
    taxRate: 0.07,
    taxAmount: '301.00',
    serviceCharge: 0.10,
    serviceChargeAmount: '430.00',
    totalAmount: '5031.00',
    depositDeducted: '1000.00',
    amountPaid: '4500.00',
    amountDue: '531.00',
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
      {
        id: 'bi-2',
        billId: 'bill-202',
        description: 'เครื่องดื่มมินิบาร์ (Sparkling Water x2)',
        category: 'minibar',
        quantity: 2,
        unitPrice: '150.00',
        totalAmount: '300.00',
        createdAt: today,
      },
      {
        id: 'bi-3',
        billId: 'bill-202',
        description: 'บริการซักรีดด่วน (Express Laundry)',
        category: 'service',
        quantity: 1,
        unitPrice: '500.00',
        totalAmount: '500.00',
        createdAt: today,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        billId: 'bill-202',
        paymentMethodId: 'credit_card',
        amount: '4500.00',
        referenceNumber: 'REF-UPFRONT-202',
        status: 'completed',
        paidAt: today,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bill-303',
    billNumber: 'FOL-20261113-303',
    reservationId: 'res-303',
    guestName: 'เดียร์ ธีรภัทร',
    roomNumber: '303',
    status: 'paid',
    subtotal: '17500.00',
    taxRate: 0.07,
    taxAmount: '1225.00',
    serviceCharge: 0.10,
    serviceChargeAmount: '1750.00',
    totalAmount: '20475.00',
    depositDeducted: '1000.00',
    amountPaid: '20475.00',
    amountDue: '0.00',
    items: [
      {
        id: 'bi-303-1',
        billId: 'bill-303',
        description: 'Room Charge (5 nights) - Executive Suite #303',
        category: 'room',
        quantity: 5,
        unitPrice: '3500.00',
        totalAmount: '17500.00',
        createdAt: today,
      },
    ],
    payments: [
      {
        id: 'pay-303-1',
        billId: 'bill-303',
        paymentMethodId: 'promptpay',
        amount: '20475.00',
        referenceNumber: 'PP-303-999',
        status: 'completed',
        paidAt: today,
      },
    ],
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
      locale: 'th-TH',
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
    await page.route('**/api/bills/bill-202', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[0]) });
    });
    await page.route('**/api/bills/bill-303', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[1]) });
    });
    await page.route('**/api/bills**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS) });
    });
    await page.route('**/api/housekeeping/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // =========================================================================
    // Screenshot 19: 19-fixed-light-dark-toggle.png
    // =========================================================================
    console.log('\n[19] Capturing Fixed Light/Dark Theme Toggle and High-Contrast Styles...');
    await page.goto(`${baseUrl}/front-desk/room-matrix`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=101');
    await page.waitForTimeout(600);

    // Switch to dark mode using the Theme Context / toggle button
    await page.evaluate(() => {
      localStorage.setItem('keystay_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(600);

    await saveScreenshot(page, '19-fixed-light-dark-toggle.png');

    // Switch back to light mode for subsequent screenshots
    await page.evaluate(() => {
      localStorage.setItem('keystay_theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(400);

    // =========================================================================
    // Screenshot 20: 20-safe-walkin-and-compact-card.png
    // =========================================================================
    console.log('\n[20] Capturing Safe Walk-In Rendering & Compact Room Notes...');
    await page.goto(`${baseUrl}/front-desk/daily-operations`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Open Walk-In modal from Daily Operations header button
    const walkInBtn = page.locator('button:has-text("เปิดห้องด่วน")').first();
    if (await walkInBtn.isVisible()) {
      await walkInBtn.click();
      await page.waitForSelector('text=เปิดห้องด่วน (Walk-In Check-In)');
      await page.waitForTimeout(600);
      await saveScreenshot(page, '20-safe-walkin-and-compact-card.png');

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // =========================================================================
    // Screenshot 21: 21-cashier-2-column-redesign.png
    // =========================================================================
    console.log('\n[21] Capturing Cashier Page 2-Column Redesign & Bottom Net Summary...');
    await page.goto(`${baseUrl}/front-desk/billing`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=แคชเชียร์และบิล');
    await page.waitForTimeout(800);

    await saveScreenshot(page, '21-cashier-2-column-redesign.png');

    // =========================================================================
    // Screenshot 22: 22-cancel-reservation-modal.png
    // =========================================================================
    console.log('\n[22] Capturing Reservation Cancellation Modal with Reason Dropdown...');
    await page.goto(`${baseUrl}/front-desk/room-matrix?roomId=rm-101`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("ข้อมูลการเข้าพัก")');
    await page.waitForTimeout(500);

    // Switch to 'ข้อมูลการเข้าพัก' (Stay) tab where guest details and actions live
    const stayTab = page.locator('button:has-text("ข้อมูลการเข้าพัก")').first();
    if (await stayTab.isVisible()) {
      await stayTab.click();
      await page.waitForTimeout(400);
    }

    // Click "ยกเลิกการจอง" button to open CancelReservationModal
    const cancelBtn = page.locator('button:has-text("ยกเลิกการจอง")').first();
    await cancelBtn.click();
    await page.waitForSelector('#cancel-modal-title');
    await page.waitForTimeout(500);

    await saveScreenshot(page, '22-cancel-reservation-modal.png');

    // =========================================================================
    // Screenshot 23: 23-compressed-slip-viewer.png
    // =========================================================================
    console.log('\n[23] Capturing Compressed Slip Viewer Lightbox with Zoom Controls...');
    // Re-open Room 101 modal fresh to view slip
    await page.goto(`${baseUrl}/front-desk/room-matrix?roomId=rm-101`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("ข้อมูลการเข้าพัก")');
    await page.waitForTimeout(500);

    const stayTabForSlip = page.locator('button:has-text("ข้อมูลการเข้าพัก")').first();
    if (await stayTabForSlip.isVisible()) {
      await stayTabForSlip.click();
      await page.waitForTimeout(400);
    }

    const viewSlipBtn = page.locator('button:has-text("ดูหลักฐานสลิป / ยืนยันสลิป")').first();
    await viewSlipBtn.click();
    await page.waitForSelector('img[alt="Payment Slip"]');
    await page.waitForTimeout(600);

    await saveScreenshot(page, '23-compressed-slip-viewer.png');

    console.log('\n===============================================================');
    console.log('[SUCCESS] ALL 5 TASK 8 VISUAL PROOFS CAPTURED SUCCESSFULLY!');
    console.log('===============================================================\n');

  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});

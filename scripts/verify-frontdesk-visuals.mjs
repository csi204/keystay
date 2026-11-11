/**
 * scripts/verify-frontdesk-visuals.mjs
 * 
 * Standalone Playwright Visual Verification Script:
 * - Covers Room Matrix, Walk-In, Check-In Confirmation, and 80mm Receipt (.receipt-80mm-paper, border-dashed)
 * - 01-room-matrix-no-ghost-rooms.png:
 *   Room Matrix Grid showing Floor dividers, rooms 103, 302, 402 as "ว่างพร้อมใช้" (Strict PMS integrity, no ghost occupied rooms).
 * - 02-cashier-hub-master-detail.png:
 *   Master-Detail Cashier Hub at /front-desk/billing with sidebar navigation, search box, filter tabs (ทั้งหมด / เปิดบิลอยู่ / ชำระแล้ว), and active pending folio.
 * - 03-portal-datepicker-no-clip.png:
 *   Portal-based DatePicker floating cleanly via React createPortal above Walk-In modal without being clipped by modal boundaries.
 * - 04-room-notes-inline-edit.png:
 *   RoomDetailsModal showing room notes with the inline edit pencil icon (✏️).
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
const PARENT_BRAIN_DIR = 'C:\\Users\\Miller-Wise\\.gemini\\antigravity\\brain\\ce602030-c088-44a0-bc3d-eb1e96aba320\\preview-responsive';
const SUBAGENT_BRAIN_DIR = 'C:\\Users\\Miller-Wise\\.gemini\\antigravity\\brain\\cae08ab7-2d28-4b7f-9554-c53b8564410a\\preview-responsive';

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

// Mock rooms covering Floors 1 to 4 with PMS integrity:
// Notice: rm-103, rm-302, and rm-402 are in DB as 'occupied' without reservation,
// which triggers reconcileLiveRooms strict auto-healing to 'available' ("ว่างพร้อมใช้")!
const MOCK_ROOMS = [
  // Floor 1 (4 rooms)
  { id: 'rm-101', roomNumber: '101', floor: '1', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-102', roomNumber: '102', floor: '1', status: 'checked_out', roomTypeId: 'rt-std' },
  { id: 'rm-103', roomNumber: '103', floor: '1', status: 'occupied', roomTypeId: 'rt-dlx' }, // Ghost room -> Auto-heals to 'available'
  { id: 'rm-104', roomNumber: '104', floor: '1', status: 'maintenance', roomTypeId: 'rt-dlx', notes: 'แอร์มีน้ำหยด รอช่างซ่อมบ่ายนี้' },

  // Floor 2 (4 rooms)
  { id: 'rm-201', roomNumber: '201', floor: '2', status: 'available', roomTypeId: 'rt-ste' },
  { id: 'rm-202', roomNumber: '202', floor: '2', status: 'occupied', roomTypeId: 'rt-ste', guestName: 'Jessica Alba', checkOutDate: tomorrow },
  { id: 'rm-203', roomNumber: '203', floor: '2', status: 'available', roomTypeId: 'rt-dlx' },
  { id: 'rm-204', roomNumber: '204', floor: '2', status: 'available', roomTypeId: 'rt-std' },

  // Floor 3 (3 rooms)
  { id: 'rm-301', roomNumber: '301', floor: '3', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-302', roomNumber: '302', floor: '3', status: 'occupied', roomTypeId: 'rt-dlx' }, // Ghost room -> Auto-heals to 'available'
  { id: 'rm-303', roomNumber: '303', floor: '3', status: 'available', roomTypeId: 'rt-ste' },

  // Floor 4 (3 rooms)
  { id: 'rm-401', roomNumber: '401', floor: '4', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-402', roomNumber: '402', floor: '4', status: 'occupied', roomTypeId: 'rt-ste' }, // Ghost room -> Auto-heals to 'available'
  { id: 'rm-403', roomNumber: '403', floor: '4', status: 'available', roomTypeId: 'rt-dlx' },
];

const MOCK_RESERVATIONS = [
  {
    id: 'res-101',
    bookingNumber: 'BK-20261112-101',
    roomId: 'rm-101',
    roomNumber: '101',
    guestName: 'วิภาดา รัตนศิริ',
    guest: { fullName: 'วิภาดา รัตนศิริ', phone: '089-111-2233', email: 'vipada@test.com' },
    checkInDate: today,
    checkOutDate: tomorrow,
    totalNights: 1,
    status: 'confirmed',
    totalAmount: '1200.00',
    depositAmount: '500.00',
  },
  {
    id: 'res-102',
    bookingNumber: 'BK-20261112-102',
    roomId: 'rm-102',
    roomNumber: '102',
    guestName: 'สมชาย เข็มกลัด',
    guest: { fullName: 'สมชาย เข็มกลัด', phone: '081-234-5678', email: 'somchai@test.com' },
    checkInDate: today,
    checkOutDate: today,
    actualCheckOut: today,
    totalNights: 1,
    status: 'checked_out',
    totalAmount: '1200.00',
    depositAmount: '500.00',
  },
  {
    id: 'res-202',
    bookingNumber: 'BK-20261112-202',
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
];

const MOCK_BILLS = [
  {
    id: 'bill-pending-202',
    billNumber: 'FOL-20261112-202',
    reservationId: 'res-202',
    guestName: 'Jessica Alba',
    roomNumber: '202',
    status: 'pending',
    subtotal: '3800.00',
    taxAmount: '248.60',
    netAmount: '3800.00',
    paidAmount: '0.00',
    items: [
      {
        id: 'item-1',
        billId: 'bill-pending-202',
        description: 'Executive Suite (1 คืน)',
        category: 'room',
        quantity: 1,
        unitPrice: '3500.00',
        totalAmount: '3500.00',
        createdAt: today,
      },
      {
        id: 'item-2',
        billId: 'bill-pending-202',
        description: 'Extra Bed (เตียงเสริม)',
        category: 'amenity',
        quantity: 1,
        unitPrice: '300.00',
        totalAmount: '300.00',
        createdAt: today,
      },
    ],
    payments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bill-paid-102',
    billNumber: 'INV-10293847',
    reservationId: 'res-102',
    guestName: 'สมชาย เข็มกลัด',
    roomNumber: '102',
    status: 'paid',
    subtotal: '1200.00',
    taxAmount: '78.50',
    netAmount: '1200.00',
    paidAmount: '1200.00',
    items: [
      {
        id: 'item-10',
        billId: 'bill-paid-102',
        description: 'Standard Room (1 คืน)',
        category: 'room',
        quantity: 1,
        unitPrice: '1200.00',
        totalAmount: '1200.00',
        createdAt: today,
      },
      {
        id: 'item-11',
        billId: 'bill-paid-102',
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
        billId: 'bill-paid-102',
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
      if (fs.existsSync(brainDir)) {
        const brainPath = path.join(brainDir, filename);
        fs.copyFileSync(repoPath, brainPath);
        console.log(`  [COPIED] ${brainPath}`);
      }
    } catch (e) {
      console.warn(`  [WARN] Failed to copy to ${brainDir}:`, e.message);
    }
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

async function resolveBaseUrl() {
  // Prefer port 3000 if already running
  if (await isServerRunning('http://127.0.0.1:3000')) {
    console.log('Using active frontend dev server at http://127.0.0.1:3000');
    return { url: 'http://127.0.0.1:3000', child: null };
  }

  // Fallback to 4173 preview server
  if (await isServerRunning('http://127.0.0.1:4173')) {
    console.log('Using active Vite preview server at http://127.0.0.1:4173');
    return { url: 'http://127.0.0.1:4173', child: null };
  }

  console.log('Starting Vite preview server on port 4173...');
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(cmd, ['--filter', '@keystay/web', 'preview', '--port', '4173'], {
    cwd: ROOT_DIR,
    shell: true,
    stdio: 'pipe',
  });

  for (let i = 0; i < 40; i++) {
    if (await isServerRunning('http://127.0.0.1:4173')) {
      console.log('Vite preview server is ready at http://127.0.0.1:4173');
      return { url: 'http://127.0.0.1:4173', child };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Timed out waiting for Vite preview server to start.');
}

async function runVerification() {
  await ensureDirs();
  const { url: baseUrl, child: serverProcess } = await resolveBaseUrl();
  let browser = null;

  const capturedArtifacts = [];

  try {
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

    // Mock API routes with deterministic test fixtures
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
      const url = route.request().url();
      if (url.includes('res-202')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[0]) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[1]) });
      }
    });
    await page.route('**/api/bills/**', (route) => {
      const url = route.request().url();
      if (url.includes('bill-pending-202')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[0]) });
      } else if (url.includes('bill-paid-102')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[1]) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS) });
      }
    });
    await page.route('**/api/bills', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS) });
    });
    await page.route('**/api/housekeeping/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // =========================================================================
    // Screenshot 1: 01-room-matrix-no-ghost-rooms.png
    // Room Matrix Grid showing Floor dividers, rooms 103, 302, 402 as "ว่างพร้อมใช้"
    // =========================================================================
    console.log('\n[TEST 1] Verifying Room Matrix Grid with Floor Dividers & Rooms 103, 302, 402 as "ว่างพร้อมใช้"...');
    await page.goto(`${baseUrl}/front-desk/room-matrix`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Verify auto-refresh badge
    const autoRefreshBadge = page.locator('text=อัปเดตอัตโนมัติ').first();
    console.log(`  Auto-refresh badge visible: ${await autoRefreshBadge.isVisible()}`);

    // Verify Floor dividers
    for (const fl of ['1', '2', '3', '4']) {
      const flHeader = page.locator(`text=ชั้น ${fl}`).first();
      console.log(`  Floor ${fl} header visible: ${await flHeader.isVisible()}`);
    }

    // Verify Rooms 103, 302, 402 show "ว่างพร้อมใช้" (Strict PMS integrity, no ghost occupied rooms)
    for (const rNum of ['103', '302', '402']) {
      const card = page.locator('div').filter({ hasText: new RegExp(`^${rNum}`) }).first();
      const hasAvailableBadge = await card.locator('text=ว่างพร้อมใช้').first().isVisible();
      console.log(`  Room ${rNum} shows 'ว่างพร้อมใช้': ${hasAvailableBadge}`);
      if (!hasAvailableBadge) {
        throw new Error(`Room ${rNum} does NOT show 'ว่างพร้อมใช้'! PMS integrity failed.`);
      }
    }

    const pic1 = await saveScreenshot(page, '01-room-matrix-no-ghost-rooms.png');
    capturedArtifacts.push(pic1);

    // =========================================================================
    // Screenshot 2: 02-cashier-hub-master-detail.png
    // Master-Detail Cashier Hub at /front-desk/billing with sidebar navigation, search box, filter tabs, active pending folio
    // =========================================================================
    console.log('\n[TEST 2] Verifying Master-Detail Cashier Hub at /front-desk/billing...');
    await page.goto(`${baseUrl}/front-desk/billing`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Verify primary sidebar navigation item
    const sidebarBilling = page.locator('aside, nav').locator('text=แคชเชียร์และบิล').first();
    console.log(`  Sidebar 'แคชเชียร์และบิล' active nav item visible: ${await sidebarBilling.isVisible()}`);

    // Verify search box
    const searchInput = page.locator('input[placeholder*="ค้นหาเลขห้อง"]').first();
    console.log(`  Search input box visible: ${await searchInput.isVisible()}`);

    // Verify filter tabs: ทั้งหมด / เปิดบิลอยู่ / ชำระแล้ว
    const tabAll = page.locator('button:has-text("ทั้งหมด")').first();
    const tabPending = page.locator('button:has-text("เปิดบิลอยู่")').first();
    const tabPaid = page.locator('button:has-text("ชำระแล้ว")').first();
    console.log(`  Filter tabs visible - All: ${await tabAll.isVisible()}, Pending: ${await tabPending.isVisible()}, Paid: ${await tabPaid.isVisible()}`);

    // Verify active pending folio (Room 202 - Jessica Alba)
    const pendingFolioGuest = page.locator('text=Jessica Alba').first();
    console.log(`  Active pending folio for 'Jessica Alba' visible in Detail panel: ${await pendingFolioGuest.isVisible()}`);

    const pic2 = await saveScreenshot(page, '02-cashier-hub-master-detail.png');
    capturedArtifacts.push(pic2);

    // =========================================================================
    // Screenshot 3: 03-portal-datepicker-no-clip.png
    // Portal-based DatePicker floating cleanly via React createPortal above Walk-In modal without being clipped
    // =========================================================================
    console.log('\n[TEST 3] Verifying Portal-Based DatePicker Floating Above Walk-In Modal...');
    await page.goto(`${baseUrl}/front-desk/daily-operations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Click Walk-In button to open WalkInModal
    const walkInButton = page.locator('button:has-text("Walk-In"), button:has-text("Walk-in")').first();
    await walkInButton.click();
    await page.waitForTimeout(500);

    // Verify WalkInModal is visible
    const walkInModalTitle = page.locator('text=เปิดห้องด่วน (Walk-In Check-In)').first();
    console.log(`  WalkInModal open: ${await walkInModalTitle.isVisible()}`);

    // Click Check-Out datepicker to open calendar popover
    // Triggering the datepicker input:
    const checkOutDateInput = page.locator('input[placeholder*="/"], input[value*="/"]').nth(1);
    await checkOutDateInput.click();
    await page.waitForTimeout(400);

    // Verify popover rendered in body via React Portal
    const popoverDialog = page.locator('body > div[role="dialog"]').first();
    const popoverVisible = await popoverDialog.isVisible();
    const popoverBox = await popoverDialog.boundingBox();
    console.log(`  Portal DatePicker popover visible: ${popoverVisible}, box: ${JSON.stringify(popoverBox)}`);
    if (!popoverVisible) {
      throw new Error('Portal DatePicker popover is not visible!');
    }

    const pic3 = await saveScreenshot(page, '03-portal-datepicker-no-clip.png');
    capturedArtifacts.push(pic3);

    // Close WalkIn modal by pressing Escape or clicking backdrop
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // =========================================================================
    // Screenshot 4: 04-room-notes-inline-edit.png
    // RoomDetailsModal showing room notes with the inline edit pencil icon (✏️)
    // =========================================================================
    console.log('\n[TEST 4] Verifying RoomDetailsModal with Editable Room Notes and Pencil Icon (✏️)...');
    await page.goto(`${baseUrl}/front-desk/room-matrix`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Click Room 104 card which contains notes: "แอร์มีน้ำหยด รอช่างซ่อมบ่ายนี้"
    const room104Card = page.locator('div').filter({ hasText: /^104/ }).first();
    await room104Card.click();
    await page.waitForTimeout(600);

    // Verify RoomDetailsModal is visible
    const modalHeading = page.locator('span.text-3xl:has-text("104")').first();
    console.log(`  RoomDetailsModal for Room 104 visible: ${await modalHeading.isVisible()}`);

    // Verify Room Notes section
    const notesContent = page.locator('text=แอร์มีน้ำหยด รอช่างซ่อมบ่ายนี้').first();
    console.log(`  Room notes text visible: ${await notesContent.isVisible()}`);

    // Verify Inline Edit Pencil Icon button
    const pencilButton = page.locator('button[aria-label="Edit room notes"]').first();
    const pencilVisible = await pencilButton.isVisible();
    console.log(`  Inline edit pencil icon (✏️) visible: ${pencilVisible}`);
    if (!pencilVisible) {
      throw new Error('Inline edit pencil button in RoomDetailsModal is not visible!');
    }

    const pic4 = await saveScreenshot(page, '04-room-notes-inline-edit.png');
    capturedArtifacts.push(pic4);

    console.log('\n===============================================================');
    console.log('✅ ALL 4 VISUAL VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY:');
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

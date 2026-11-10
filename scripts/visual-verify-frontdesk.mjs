import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const OUTPUT_DIR = 'C:\\Users\\Miller-Wise\\.gemini\\antigravity\\brain\\ce602030-c088-44a0-bc3d-eb1e96aba320\\preview-responsive';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, label: '375x812 (iPhone)' },
  { name: 'tablet', width: 768, height: 1024, label: '768x1024 (iPad)' },
  { name: 'desktop', width: 1280, height: 800, label: '1280x800 (Standard PC)' },
  { name: 'desktop-wide', width: 1600, height: 1000, label: '1600x1000 (Wide Desktop)' },
];

const MOCK_ROOM_TYPES = [
  {
    id: 'rt-std',
    name: 'Standard King Room',
    basePrice: '1200.00',
    capacity: 2,
    bedType: 'King Bed',
    amenities: ['King Bed', 'Wi-Fi', '1 Shower', 'Air Conditioning'],
    description: 'Cozy and quiet standard room for 2 guests.',
  },
  {
    id: 'rt-dlx',
    name: 'Deluxe Twin Room',
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
  { id: 'rm-102', roomNumber: '102', floor: '1', status: 'occupied', roomTypeId: 'rt-std', guestName: 'สมชาย เข็มกลัด' },
  { id: 'rm-103', roomNumber: '103', floor: '1', status: 'cleaning', roomTypeId: 'rt-dlx' },
  { id: 'rm-104', roomNumber: '104', floor: '1', status: 'maintenance', roomTypeId: 'rt-dlx', notes: 'แอร์มีน้ำหยด รอช่างซ่อมบ่ายนี้' },
  { id: 'rm-201', roomNumber: '201', floor: '2', status: 'available', roomTypeId: 'rt-ste' },
  { id: 'rm-202', roomNumber: '202', floor: '2', status: 'occupied', roomTypeId: 'rt-ste', guestName: 'Jessica Alba' },
  { id: 'rm-203', roomNumber: '203', floor: '2', status: 'reserved', roomTypeId: 'rt-dlx' },
  { id: 'rm-204', roomNumber: '204', floor: '2', status: 'checked_out', roomTypeId: 'rt-std' },
];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

const MOCK_RESERVATIONS = [
  {
    id: 'res-001',
    bookingNumber: 'BK-20261105-01',
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
  {
    id: 'res-002',
    bookingNumber: 'BK-20261105-02',
    roomId: 'rm-202',
    roomNumber: '202',
    guestName: 'Jessica Alba',
    guest: { fullName: 'Jessica Alba', phone: '089-987-6543', email: 'jessica@hollywood.com' },
    checkInDate: today,
    checkOutDate: tomorrow,
    totalNights: 2,
    status: 'checked_in',
    totalAmount: '7000.00',
    depositAmount: '1000.00',
  },
  {
    id: 'res-003',
    bookingNumber: 'BK-20261105-03',
    roomId: 'rm-203',
    roomNumber: '203',
    guestName: 'David Miller',
    guest: { fullName: 'David Miller', phone: '082-111-2233' },
    checkInDate: today,
    checkOutDate: nextWeek,
    totalNights: 3,
    status: 'confirmed',
    totalAmount: '5400.00',
    depositAmount: '500.00',
  },
];

const MOCK_BILLS = [
  {
    id: 'bill-001',
    billNumber: 'INV-20261105-001',
    reservationId: 'res-001',
    guestName: 'สมชาย เข็มกลัด',
    roomNumber: '102',
    status: 'settled',
    subtotal: '1121.50',
    vat: '78.50',
    totalWithVat: '1200.00',
    paidAmount: '1200.00',
    netDue: '0.00',
    items: [
      { id: 'bi-1', billId: 'bill-001', description: 'ค่าห้องพัก (Standard King)', category: 'room', quantity: 1, unitPrice: '1200.00', totalAmount: '1200.00' }
    ],
    payments: [
      { id: 'pm-1', billId: 'bill-001', amount: '1200.00', paymentMethod: 'qr_promptpay', createdAt: today }
    ],
    createdAt: today,
  },
];

async function startServer() {
  console.log('Starting Vite preview server on port 4173...');
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(cmd, ['--filter', '@keystay/web', 'preview', '--port', '4173'], {
    cwd: ROOT_DIR,
    shell: true,
    stdio: 'pipe',
  });

  child.stdout.on('data', (d) => {
    // console.log(`[Vite stdout]: ${d}`);
  });
  child.stderr.on('data', (d) => {
    // console.error(`[Vite stderr]: ${d}`);
  });

  // Wait for server to respond
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:4173');
      if (res.ok) {
        console.log('Vite preview server ready at http://127.0.0.1:4173');
        return child;
      }
    } catch (e) {
      // wait 250ms
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Timed out waiting for Vite preview server');
}

async function runVisualVerification() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let server;
  let browser;

  try {
    server = await startServer();

    console.log('Launching Playwright Chromium...');
    browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`Verifying Viewport: ${vp.label} (${vp.name})`);
      console.log(`======================================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2, // retina-grade sharpness
      });

      // Inject auth session and dismiss splash screen to bypass guards
      await context.addInitScript(() => {
        const user = { firstName: 'เดียร์', lastName: 'ธีรภัทร' };
        sessionStorage.setItem('keystay_token', 'mock_jwt_token_front_desk');
        sessionStorage.setItem('keystay_role', 'front_desk');
        sessionStorage.setItem('keystay_user', JSON.stringify(user));
        sessionStorage.setItem('keystay_locale', 'th');
        sessionStorage.setItem('keystay_splash_shown', 'true');

        localStorage.setItem('keystay_token', 'mock_jwt_token_front_desk');
        localStorage.setItem('keystay_role', 'front_desk');
        localStorage.setItem('keystay_user', JSON.stringify(user));
        localStorage.setItem('keystay_locale', 'th');
        localStorage.setItem('keystay_splash_shown', 'true');
      });

      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.log(`  [BROWSER ERROR]: ${msg.text()}`);
      });
      page.on('pageerror', (err) => {
        console.error(`  [PAGE CRASH]: ${err.message}\n${err.stack}`);
      });
      page.on('response', (res) => {
        if (res.status() >= 400) {
          console.log(`  [HTTP ${res.status()}]: ${res.url()}`);
        }
      });

      // Intercept and mock API routes
      await page.route('**/api/rooms**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOMS) });
      });
      await page.route('**/api/room-types**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOM_TYPES) });
      });
      await page.route('**/api/reservations**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RESERVATIONS) });
      });
      await page.route('**/api/bills**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS) });
      });
      await page.route('**/api/housekeeping/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });

      // 1. Capture Room Matrix Grid
      console.log(`  Navigating to /front-desk/room-matrix ...`);
      await page.goto('http://127.0.0.1:4173/front-desk/room-matrix', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Verify no horizontal document overflow
      const overflowMatrix = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        return { docW, scrollW, hasOverflow: scrollW > docW };
      });
      console.log(`  Horizontal overflow check: clientWidth=${overflowMatrix.docW}, scrollWidth=${overflowMatrix.scrollW}, hasOverflow=${overflowMatrix.hasOverflow}`);
      if (overflowMatrix.hasOverflow) {
        console.warn(`  [WARNING] Horizontal overflow detected on matrix view for ${vp.name}!`);
      }

      const matrixPath = path.join(OUTPUT_DIR, `01-room-matrix-${vp.name}.png`);
      await page.screenshot({ path: matrixPath, fullPage: false });
      console.log(`  Captured: ${matrixPath}`);

      // 2. Open Room Details Modal (Single-pane) by clicking Room 101
      console.log(`  Clicking Room 101 to open Room Details Modal...`);
      await page.waitForSelector('text=101');
      const roomCard101 = page.getByText('101', { exact: true }).first();
      await roomCard101.click();
      await page.waitForTimeout(500);

      const modalPath = path.join(OUTPUT_DIR, `02-room-modal-${vp.name}.png`);
      await page.screenshot({ path: modalPath, fullPage: false });
      console.log(`  Captured: ${modalPath}`);

      // 3. Switch to Fast Booking / Walk-In Mode (Split-pane)
      console.log(`  Clicking Walk-In button inside modal to open Split-Pane Fast Booking...`);
      const walkInBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Walk-In")').first();
      if (await walkInBtn.count() > 0) {
        await walkInBtn.click();
        await page.waitForTimeout(600);
        const bookingModalPath = path.join(OUTPUT_DIR, `03-booking-split-modal-${vp.name}.png`);
        await page.screenshot({ path: bookingModalPath, fullPage: false });
        console.log(`  Captured: ${bookingModalPath}`);
      }

      // Close modal
      const closeBtn = page.locator('.fixed.inset-0.z-50 button[title="ปิด"], .fixed.inset-0.z-50 button[title="Close"]').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(400);
      }

      // 4. Capture Daily Operations Page
      console.log(`  Navigating to /front-desk/daily-operations ...`);
      await page.goto('http://127.0.0.1:4173/front-desk/daily-operations', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const overflowOps = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        return { docW, scrollW, hasOverflow: scrollW > docW };
      });
      console.log(`  Horizontal overflow check (Ops): clientWidth=${overflowOps.docW}, scrollWidth=${overflowOps.scrollW}, hasOverflow=${overflowOps.hasOverflow}`);

      const opsPath = path.join(OUTPUT_DIR, `04-daily-operations-${vp.name}.png`);
      await page.screenshot({ path: opsPath, fullPage: false });
      console.log(`  Captured: ${opsPath}`);

      await context.close();
    }

    console.log(`\n======================================================`);
    console.log(`All responsive viewports verified and captured successfully!`);
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
    console.log(`======================================================\n`);

  } finally {
    if (browser) await browser.close();
    if (server) {
      console.log('Stopping Vite preview server...');
      if (server.pid) {
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${server.pid} /t /f`, { stdio: 'ignore' });
          } else {
            server.kill();
          }
        } catch (e) {}
      }
    }
  }
}

runVisualVerification().catch((err) => {
  console.error('Visual verification failed:', err);
  process.exit(1);
});

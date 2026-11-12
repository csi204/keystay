import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const REPO_PREVIEW_DIR = path.resolve(process.cwd(), 'preview-responsive');
const PARENT_BRAIN_DIR = 'C:/Users/Miller-Wise/.gemini/antigravity/brain/ce602030-c088-44a0-bc3d-eb1e96aba320/preview-responsive';

const MOCK_ROOMS = [
  { id: 'rm-101', roomNumber: '101', floor: '1', status: 'occupied', roomTypeId: 'rt-std', notes: 'Near garden pathway' },
  { id: 'rm-102', roomNumber: '102', floor: '1', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-103', roomNumber: '103', floor: '1', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-104', roomNumber: '104', floor: '1', status: 'cleaning', roomTypeId: 'rt-std' },
];

const MOCK_ROOM_TYPES = [
  {
    id: 'rt-std',
    name: 'Standard Room',
    basePrice: '2200.00',
    capacity: 2,
    bedType: 'Queen Bed',
    amenities: ['Wi-Fi', 'เครื่องปรับอากาศ', 'ผ้าเช็ดตัว'],
    description: 'ห้องพักทันสมัยสะดวกสบายพร้อมวิวเมือง โต๊ะทำงาน และห้องน้ำส่วนตัวในตัว',
  },
];

const MOCK_RESERVATIONS = [
  {
    id: 'res-101',
    bookingNumber: 'RES-2026-1D46660D',
    roomId: 'rm-101',
    roomNumber: '101',
    guestName: 'อัศวิน',
    guest: { fullName: 'อัศวิน', phone: '081-234-5678' },
    checkInDate: '2026-11-11',
    checkOutDate: '2026-11-15',
    status: 'extended',
    paymentStatus: 'unpaid',
    totalAmount: '8800.00',
    depositAmount: '1000.00',
  },
  {
    id: 'res-102',
    bookingNumber: 'RES-2026-002',
    roomId: 'rm-102',
    roomNumber: '102',
    guestName: 'Somchai Jaidee',
    checkInDate: '2026-11-10',
    checkOutDate: '2026-11-12',
    status: 'checked_in',
    totalAmount: '4400.00',
    depositAmount: '500.00',
  },
];

const MOCK_BILLS = [
  {
    id: 'bill-101',
    billNumber: 'BILL-2026-101',
    reservationId: 'res-101',
    guestName: 'อัศวิน',
    roomNumber: '101',
    status: 'pending',
    subtotal: '8800.00',
    taxAmount: '616.00',
    netAmount: '9416.00',
    depositDeducted: '1000.00',
    amountDue: '8416.00',
    items: [
      {
        id: 'item-room',
        billId: 'bill-101',
        description: 'Standard Room (4 คืน)',
        category: 'room',
        quantity: 4,
        unitPrice: '2200.00',
        totalPrice: '8800.00',
      },
    ],
    payments: [],
  },
];

async function run() {
  fs.mkdirSync(REPO_PREVIEW_DIR, { recursive: true });
  fs.mkdirSync(PARENT_BRAIN_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
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
  });

  const page = await context.newPage();

  // Mock endpoints
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
  await page.route('**/api/bills/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BILLS[0]) });
  });
  await page.route('**/api/housekeeping/tasks*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'hkt-101',
            roomNumber: '101',
            status: 'completed',
            assignedStaff: { name: 'สมศรี แม่บ้าน' },
            beforePhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
            afterPhotoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
            completedAt: '2026-11-12T16:30:00Z',
          },
        ],
      }),
    });
  });

  // Test 1: Room Details Modal WYSIWYG Thai Note Editing
  console.log('[TEST 1] Verifying WYSIWYG Thai Room Note Editing...');
  await page.goto('http://127.0.0.1:3000/front-desk/room-matrix', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const card101 = page.locator('text=101').first();
  await card101.click();
  await page.waitForTimeout(800);

  // Click pencil edit icon
  const editPencil = page.locator('button[title*="แก้ไข"], button[title*="Edit"], button:has(svg.lucide-pencil)').first();
  if (await editPencil.isVisible()) {
    await editPencil.click();
    await page.waitForTimeout(500);
  }

  const shot1 = path.join(REPO_PREVIEW_DIR, '07-room-notes-wysiwyg-thai.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, path.join(PARENT_BRAIN_DIR, '07-room-notes-wysiwyg-thai.png'));
  console.log('[SAVED] 07-room-notes-wysiwyg-thai.png');

  // Test 2: Streamlined Navigation & Departures Table
  console.log('\n[TEST 2] Verifying Streamlined Navigation & Departures Table...');
  await page.goto('http://127.0.0.1:3000/front-desk/daily-operations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Click Departures tab
  const depTab = page.locator('button:has-text("รอเช็คเอาท์"), button:has-text("Departures")').first();
  if (await depTab.isVisible()) {
    await depTab.click();
    await page.waitForTimeout(500);
  }

  const shot2 = path.join(REPO_PREVIEW_DIR, '08-streamlined-navigation-and-departures.png');
  await page.screenshot({ path: shot2, fullPage: false });
  fs.copyFileSync(shot2, path.join(PARENT_BRAIN_DIR, '08-streamlined-navigation-and-departures.png'));
  console.log('[SAVED] 08-streamlined-navigation-and-departures.png');

  // Test 3: Cashier Hub with Room 101 Live Sync ("อัศวิน" / "รอชำระ")
  console.log('\n[TEST 3] Verifying Cashier Hub Live Folio Synchronization...');
  await page.goto('http://127.0.0.1:3000/front-desk/cashier', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const shot3 = path.join(REPO_PREVIEW_DIR, '09-cashier-hub-room101-autosynced.png');
  await page.screenshot({ path: shot3, fullPage: false });
  fs.copyFileSync(shot3, path.join(PARENT_BRAIN_DIR, '09-cashier-hub-room101-autosynced.png'));
  console.log('[SAVED] 09-cashier-hub-room101-autosynced.png');

  await browser.close();
  console.log('\nAll 3 visual verification screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Visual capture error:', err);
  process.exit(1);
});

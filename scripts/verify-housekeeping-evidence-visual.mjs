import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const REPO_PREVIEW_DIR = path.resolve(process.cwd(), 'preview-responsive');
const PARENT_BRAIN_DIR = 'C:/Users/Miller-Wise/.gemini/antigravity/brain/ce602030-c088-44a0-bc3d-eb1e96aba320/preview-responsive';

const MOCK_ROOMS = [
  { id: 'rm-101', roomNumber: '101', floor: '1', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-102', roomNumber: '102', floor: '1', status: 'checked_out', roomTypeId: 'rt-std' },
  { id: 'rm-103', roomNumber: '103', floor: '1', status: 'available', roomTypeId: 'rt-std' },
  { id: 'rm-104', roomNumber: '104', floor: '1', status: 'cleaning', roomTypeId: 'rt-std' },
];

const MOCK_ROOM_TYPES = [
  {
    id: 'rt-std',
    name: 'ห้องสแตนดาร์ด (Standard Room)',
    basePrice: '1200.00',
    capacity: 2,
    bedType: 'Queen Bed',
    amenities: ['Wi-Fi', 'เครื่องปรับอากาศ', 'ผ้าเช็ดตัว'],
    description: 'ห้องพักขนาดกะทัดรัด สะดวกสบาย สำหรับผู้เข้าพัก 1-2 ท่าน',
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

  await page.route('**/api/rooms**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOMS) });
  });
  await page.route('**/api/room-types**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOM_TYPES) });
  });
  await page.route('**/api/reservations**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/housekeeping/tasks*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        total: 1,
        data: [
          {
            id: 'hkt-101',
            roomNumber: '101',
            roomId: 'rm-101',
            taskType: 'checkout_clean',
            priority: 'normal',
            status: 'completed',
            assignedStaff: { id: 'stf-001', name: 'สมศรี แม่บ้านประจำชั้น', zone: 'Floor 1' },
            beforePhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
            afterPhotoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
            completedAt: '2026-11-12T16:45:00Z',
            notes: 'เปลี่ยนผ้าปูที่นอนและผ้าเช็ดตัวใหม่ เติมน้ำดื่มมินิบาร์ครบถ้วน ห้องสะอาดพร้อมขาย',
          },
        ],
      }),
    });
  });

  console.log('Navigating directly to /front-desk/room-matrix...');
  await page.goto('http://127.0.0.1:3000/front-desk/room-matrix', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Click room 101 card
  console.log('Clicking room 101...');
  const card101 = page.locator('text=101').first();
  await card101.click();
  await page.waitForTimeout(800);

  // Save screenshot of RoomDetailsModal with Housekeeping Evidence
  const shot1 = path.join(REPO_PREVIEW_DIR, '05-housekeeping-proof-of-cleanliness.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, path.join(PARENT_BRAIN_DIR, '05-housekeeping-proof-of-cleanliness.png'));
  console.log(`[SAVED] 05-housekeeping-proof-of-cleanliness.png`);

  // Click on the After photo to open the Lightbox
  console.log('Clicking photo to trigger Fullscreen Lightbox...');
  const afterImg = page.locator('img[alt*="หลังตรวจรับเสร็จสมบูรณ์"], img[alt*="After Cleaning"]').first();
  if (await afterImg.isVisible()) {
    await afterImg.click();
    await page.waitForTimeout(600);

    const shot2 = path.join(REPO_PREVIEW_DIR, '06-housekeeping-photo-fullscreen-lightbox.png');
    await page.screenshot({ path: shot2, fullPage: false });
    fs.copyFileSync(shot2, path.join(PARENT_BRAIN_DIR, '06-housekeeping-photo-fullscreen-lightbox.png'));
    console.log(`[SAVED] 06-housekeeping-photo-fullscreen-lightbox.png`);

    // Press Escape to verify hierarchy
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  await browser.close();
  console.log('Visual capture completed successfully!');
}

run().catch((err) => {
  console.error('Visual capture error:', err);
  process.exit(1);
});

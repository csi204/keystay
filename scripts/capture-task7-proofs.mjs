import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.resolve('preview-responsive');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'th-TH',
  });

  // Inject session auth for frontdesk user
  await context.addInitScript(() => {
    localStorage.setItem('keystay_token', 'mock-frontdesk-token');
    localStorage.setItem('keystay_role', 'front_desk');
    localStorage.setItem('keystay_user', JSON.stringify({
      id: 'usr-fd-003',
      firstName: 'Supaporn',
      lastName: 'Frontdesk',
      email: 'frontdesk@keystay.com',
      role: 'front_desk'
    }));
    sessionStorage.setItem('keystay_token', 'mock-frontdesk-token');
    sessionStorage.setItem('keystay_role', 'front_desk');
    sessionStorage.setItem('keystay_user', JSON.stringify({
      id: 'usr-fd-003',
      firstName: 'Supaporn',
      lastName: 'Frontdesk',
      email: 'frontdesk@keystay.com',
      role: 'front_desk'
    }));
    localStorage.setItem('keystay_splash_shown', 'true');
    sessionStorage.setItem('keystay_splash_shown', 'true');
  });

  const page = await context.newPage();

  // 1. Capture Daily Operations with Early Checkout & Extended sub-tabs
  console.log('Navigating to Daily Operations...');
  await page.goto('http://localhost:3000/front-desk/daily-operations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click on Departures tab
  const departuresTab = page.locator('button:has-text("รอเช็คเอาต์")').first();
  if (await departuresTab.isVisible()) {
    await departuresTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '10-daily-operations-early-checkout-subtabs.png'), fullPage: false });
  console.log('Saved 10-daily-operations-early-checkout-subtabs.png');

  // 2. Open Walk-In Modal to show Masked Inputs (Phone & Thai ID)
  const walkInBtn = page.locator('button:has-text("เปิดห้องด่วน")').first();
  if (await walkInBtn.isVisible()) {
    await walkInBtn.click();
    await page.waitForTimeout(1000);
    // Fill phone and Thai ID to showcase auto-masking
    const phoneInput = page.locator('input[placeholder*="081-234-5678"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('0891234567');
    }
    const idInput = page.locator('input[placeholder*="1-2345-67890-12-3"]');
    if (await idInput.isVisible()) {
      await idInput.fill('1100400123456');
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, '11-masked-inputs-walkin-modal.png'), fullPage: false });
    console.log('Saved 11-masked-inputs-walkin-modal.png');

    // Close modal
    const closeBtn = page.locator('button[title*="ปิด"], button:has-text("ยกเลิก")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 3. Navigate to Cashier Hub to capture locked room charges, net total due, dynamic deposit
  console.log('Navigating to Cashier Hub...');
  await page.goto('http://localhost:3000/front-desk/billing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '12-cashier-hub-locked-room-charge-and-net-due.png'), fullPage: false });
  console.log('Saved 12-cashier-hub-locked-room-charge-and-net-due.png');

  // 4. Navigate to Room Matrix
  console.log('Navigating to Room Matrix...');
  await page.goto('http://localhost:3000/front-desk/matrix', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '13-room-matrix-overview.png'), fullPage: false });
  console.log('Saved 13-room-matrix-overview.png');

  await browser.close();
  console.log('All Task 7 visual proofs captured successfully.');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});


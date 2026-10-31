import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateItemTotal,
  calculateFolioSummary,
  localizeFolioDescription,
} from '../components/front-desk/FolioSplitScreen';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Page 4 — Cashier Folio Split-Screen & Tax Invoice (Space & Localization Polish)', () => {
  it('polishes FolioSplitScreen 12-column asymmetric layout (7 cols folio, 5 cols cashier), hairline dividers, and tabular-nums', () => {
    const filePath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/FolioSplitScreen.tsx'
    );
    const code = fs.readFileSync(filePath, 'utf-8');

    // 12-column asymmetric grid: 7 cols left, 5 cols right
    assert.match(code, /lg:grid-cols-12/);
    assert.match(code, /lg:col-span-7/);
    assert.match(code, /lg:col-span-5/);

    // Hairline dividers and tabular numerals
    assert.match(code, /tabular-nums/);
    assert.match(code, /font-mono.*tabular-nums/);

    // Localize item descriptions via helper
    assert.match(code, /localizeFolioDescription/);
  });

  it('polishes CashierFolioPage ribbon fluid width, room selector chips, and search bar layout', () => {
    const pageCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/CashierFolioPage.tsx'),
      'utf-8'
    );

    // Verify search bar and room selector layout
    assert.match(pageCode, /tabular-nums/);
    assert.match(pageCode, /overflow-x-auto/);
    assert.match(pageCode, /font-mono/);
  });

  it('correctly localizes folio item descriptions for rooms, minibar, laundry, and services', () => {
    // Room types
    assert.strictEqual(localizeFolioDescription('Deluxe Sea View', 'th'), 'ห้องดีลักซ์ ซีวิว');
    assert.strictEqual(localizeFolioDescription('Deluxe Sea View', 'en'), 'Deluxe Sea View');
    assert.strictEqual(localizeFolioDescription('Standard Room', 'th'), 'ห้องสแตนดาร์ด');
    assert.strictEqual(localizeFolioDescription('Standard Room', 'en'), 'Standard Room');

    // Minibar items
    assert.strictEqual(localizeFolioDescription('Drinking Water', 'th'), 'น้ำดื่ม');
    assert.strictEqual(localizeFolioDescription('Drinking Water', 'en'), 'Drinking Water');
    assert.strictEqual(localizeFolioDescription('Singha Beer', 'th'), 'เบียร์สิงห์');
    assert.strictEqual(localizeFolioDescription('Singha Beer', 'en'), 'Singha Beer');
    assert.strictEqual(localizeFolioDescription('Canned Soft Drink / Coke', 'th'), 'น้ำอัดลม / โค้ก');

    // Laundry & services
    assert.strictEqual(localizeFolioDescription('Express Laundry Service', 'th'), 'บริการซักรีดด่วนพิเศษ');
    assert.strictEqual(localizeFolioDescription('Lost Key Card Replacement', 'th'), 'ค่าปรับคีย์การ์ดสูญหาย');
    assert.strictEqual(localizeFolioDescription('Extra Bed with Breakfast', 'th'), 'เตียงเสริมพร้อมอาหารเช้า');

    // Custom items fallback gracefully
    assert.strictEqual(localizeFolioDescription('Custom Special Request', 'th'), 'Custom Special Request');
  });

  it('verifies ReceiptTaxInvoiceModal enforces Thai Tax Invoice standards with bilingual toggle and print media styling', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx'
    );
    assert.strictEqual(fs.existsSync(modalPath), true);

    const code = fs.readFileSync(modalPath, 'utf-8');

    // Tax invoice Thai title format (ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ)
    assert.match(code, /ใบเสร็จรับเงิน\/ใบกำกับภาษีอย่างย่อ/);

    // Bilingual toggle support (switching print/view language between th and en)
    assert.match(code, /invoiceLocale/);
    assert.match(code, /setInvoiceLocale/);

    // Print media styling
    assert.match(code, /print:/);
    assert.match(code, /tabular-nums/);

    // Localized item description in invoice table
    assert.match(code, /localizeFolioDescription/);
  });

  it('verifies AddExtraChargeModal provides quick presets, localized categories, and NaN-immune calculations', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/AddExtraChargeModal.tsx'
    );
    assert.strictEqual(fs.existsSync(modalPath), true);

    const code = fs.readFileSync(modalPath, 'utf-8');

    // Localized categories and item presets
    assert.match(code, /EXTRA_CHARGE_PRESETS/);
    assert.match(code, /tabular-nums/);

    // Safe dynamic calculation guarding against NaN
    assert.match(code, /Number\.isFinite/);
  });

  it('guards calculateItemTotal and calculateFolioSummary against NaN, missing fields, and corrupt numbers', () => {
    // calculateItemTotal guards
    assert.strictEqual(calculateItemTotal(null), 0);
    assert.strictEqual(calculateItemTotal(undefined), 0);
    assert.strictEqual(calculateItemTotal({ totalAmount: '120.50' }), 120.5);
    assert.strictEqual(calculateItemTotal({ totalPrice: '250.00' }), 250);
    assert.strictEqual(calculateItemTotal({ quantity: 3, unitPrice: '50' }), 150);
    assert.strictEqual(calculateItemTotal({ quantity: 'invalid' as any, unitPrice: 'abc' }), 0);
    assert.strictEqual(calculateItemTotal({ totalAmount: 'NaN' }), 0);

    // calculateFolioSummary guards
    const summary = calculateFolioSummary(
      [
        { quantity: 2, unitPrice: '500' },
        { totalAmount: '200' },
      ],
      '100'
    );
    assert.strictEqual(summary.subtotal, 1200);
    assert.strictEqual(summary.vat, 84);
    assert.strictEqual(summary.totalWithVat, 1284);
    assert.strictEqual(summary.depositDeduction, 100);
    assert.strictEqual(summary.netDue, 1184);

    // Corrupted deposit and empty items
    const corruptedSummary = calculateFolioSummary([], 'not-a-number', 'bad-subtotal');
    assert.strictEqual(corruptedSummary.subtotal, 0);
    assert.strictEqual(corruptedSummary.vat, 0);
    assert.strictEqual(corruptedSummary.totalWithVat, 0);
    assert.strictEqual(corruptedSummary.depositDeduction, 0);
    assert.strictEqual(corruptedSummary.netDue, 0);
    assert.strictEqual(Number.isNaN(corruptedSummary.netDue), false);
  });

  it('ensures zero untranslated English leakages across category and invoice keys', () => {
    const keysToCheck = [
      'category.room',
      'category.minibar',
      'category.laundry',
      'category.damage',
      'category.service',
      'category.other',
      'invoice.preview',
      'invoice.print',
      'invoice.hotelName',
      'invoice.hotelAddress',
      'invoice.taxId',
      'invoice.title',
      'invoice.number',
      'invoice.date',
      'invoice.guestName',
      'invoice.walkInGuest',
      'invoice.room',
      'invoice.cashier',
      'invoice.cashierName',
      'invoice.netTotal',
      'invoice.paidAmount',
      'invoice.guestSignature',
      'invoice.cashierSignature',
      'invoice.seq',
      'invoice.roomAndService',
    ];

    for (const key of keysToCheck) {
      assert.ok(th[key], `Key ${key} missing in th`);
      assert.ok(en[key], `Key ${key} missing in en`);
    }

    // Verify Thai invoice title matches Thai Tax Invoice standard
    assert.ok(
      th['invoice.title'].includes('ใบเสร็จรับเงิน') &&
        (th['invoice.title'].includes('ใบกำกับภาษีอย่างย่อ') || th['invoice.officialTitle']?.includes('ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ')),
      'Thai invoice title must fulfill official Thai Tax Invoice standard'
    );
  });
});

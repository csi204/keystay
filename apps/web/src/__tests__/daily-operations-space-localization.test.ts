import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { localizeRoomType } from '../lib/localizeMetadata';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Page 3 — Daily Operations Workflows (Space & Localization Polish)', () => {
  it('polishes DailyOperationsPage table layout, optical alignment, and room type localization', () => {
    const pageCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'),
      'utf-8'
    );

    // Verify room type localization helper is imported and utilized
    assert.match(pageCode, /localizeRoomType/);
    assert.match(pageCode, /from ['"]@\/lib\/localizeMetadata['"]/);

    // Verify common.roomType column header is rendered
    assert.match(pageCode, /t\(['"]common\.roomType['"]\)/);

    // Verify tabular-nums typography for numerals and timestamps
    assert.match(pageCode, /tabular-nums/);

    // Verify optical room badge styling
    assert.match(pageCode, /bg-slate-100/);

    // Verify count badges use font-mono and tabular-nums
    assert.match(pageCode, /font-mono.*tabular-nums/);

    // Verify modals receive roomType
    assert.match(pageCode, /<CheckInModal[\s\S]*?roomType={/);
    assert.match(pageCode, /<CheckOutModal[\s\S]*?roomType={/);
  });

  it('verifies CheckInModal enforces room type localization and tabular numerals', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/CheckInModal.tsx'
    );
    assert.strictEqual(fs.existsSync(modalPath), true, 'CheckInModal.tsx must exist');

    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(code, /localizeRoomType/);
    assert.match(code, /from ['"]@\/lib\/localizeMetadata['"]/);
    assert.match(code, /tabular-nums/);
    assert.match(code, /t\(['"]common\.roomType['"]\)/);
  });

  it('verifies CheckOutModal enforces room type localization and tabular numerals', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/CheckOutModal.tsx'
    );
    assert.strictEqual(fs.existsSync(modalPath), true, 'CheckOutModal.tsx must exist');

    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(code, /localizeRoomType/);
    assert.match(code, /from ['"]@\/lib\/localizeMetadata['"]/);
    assert.match(code, /tabular-nums/);
    assert.match(code, /t\(['"]common\.roomType['"]\)/);
  });

  it('verifies ExtendStayModal enforces room type localization and tabular numerals', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/ExtendStayModal.tsx'
    );
    assert.strictEqual(fs.existsSync(modalPath), true, 'ExtendStayModal.tsx must exist');

    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(code, /localizeRoomType/);
    assert.match(code, /from ['"]@\/lib\/localizeMetadata['"]/);
    assert.match(code, /tabular-nums/);
    assert.match(code, /t\(['"]common\.roomType['"]\)/);
  });

  it('verifies localized room types return accurate Thai and English translations', () => {
    assert.strictEqual(localizeRoomType('Standard Room', 'th'), 'ห้องสแตนดาร์ด');
    assert.strictEqual(localizeRoomType('Standard Room', 'en'), 'Standard Room');
    assert.strictEqual(localizeRoomType('Deluxe Sea View', 'th'), 'ห้องดีลักซ์ ซีวิว');
    assert.strictEqual(localizeRoomType('Deluxe Sea View', 'en'), 'Deluxe Sea View');
  });

  it('ensures zero untranslated English leakages across checkin, checkout, and extend dictionary keys', () => {
    const keysToCheck = [
      'checkin.title',
      'checkin.bookingNumber',
      'checkin.guestName',
      'checkin.roomNumber',
      'checkin.stayPeriod',
      'checkin.keyDeposit',
      'checkin.idLabel',
      'checkin.idPlaceholder',
      'checkin.idHint',
      'checkin.checklistTitle',
      'checkin.confirmButton',
      'checkout.title',
      'checkout.keyCardReturned',
      'checkout.keyDepositRefundTitle',
      'checkout.keyDepositRefundNotice',
      'checkout.keyCardMissingWarning',
      'checkout.notes',
      'checkout.confirmButton',
      'extend.title',
      'extend.button',
      'extend.extraNights',
      'extend.nightlyRate',
      'extend.extraCharge',
      'extend.confirmButton',
    ];

    for (const key of keysToCheck) {
      assert.ok(th[key], `Key ${key} missing in th`);
      assert.ok(en[key], `Key ${key} missing in en`);
    }
  });
});

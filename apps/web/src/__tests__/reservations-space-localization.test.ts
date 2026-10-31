import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { localizeRoomType } from '../lib/localizeMetadata';

describe('Page 2 — Reservations Management & Booking Modals (Space & Localization Polish)', () => {
  it('polishes ReservationsPage table density, column layout, and tabular-nums typography', () => {
    const pageCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/ReservationsPage.tsx'),
      'utf-8'
    );

    // Verify balanced data-density padding
    assert.match(pageCode, /py-3 px-4/);

    // Verify tabular-nums typography for numerals and dates
    assert.match(pageCode, /tabular-nums/);

    // Verify room type localization helper is imported and utilized
    assert.match(pageCode, /localizeRoomType/);
    assert.match(pageCode, /from ['"]@\/lib\/localizeMetadata['"]/);

    // Verify reservation status badge utilizes translation
    assert.match(pageCode, /t\(`status\.\${res\.status}`\)/);

    // Verify search toolbar and empty state
    assert.match(pageCode, /res\.searchPlaceholder/);
    assert.match(pageCode, /res\.noReservationsFound/);
  });

  it('correctly localizes standard and luxury room types across Thai and English locales', () => {
    assert.strictEqual(localizeRoomType('Standard Room', 'th'), 'ห้องสแตนดาร์ด');
    assert.strictEqual(localizeRoomType('Standard Room', 'en'), 'Standard Room');
    assert.strictEqual(localizeRoomType('Deluxe Sea View', 'th'), 'ห้องดีลักซ์ ซีวิว');
    assert.strictEqual(localizeRoomType('Deluxe Sea View', 'en'), 'Deluxe Sea View');
    assert.strictEqual(localizeRoomType('Executive Suite', 'th'), 'ห้องเอ็กเซ็กคิวทีฟ สวีท');
    assert.strictEqual(localizeRoomType('Executive Suite', 'en'), 'Executive Suite');
    assert.strictEqual(localizeRoomType('Presidential Villa', 'th'), 'ห้องเพรสซิเดนเชียล วิลล่า');
    assert.strictEqual(localizeRoomType('Presidential Villa', 'en'), 'Presidential Villa');
  });

  it('verifies NewBookingModal enforces full localization, room type translation, and payment methods', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/NewBookingModal.tsx'
    );
    assert.strictEqual(fs.existsSync(modalPath), true, 'NewBookingModal.tsx must exist');

    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(code, /useI18n/);
    assert.match(code, /localizeRoomType/);
    assert.match(code, /from ['"]@\/lib\/localizeMetadata['"]/);
    assert.match(code, /res\.newReservation/);
    assert.match(code, /res\.errorGuestName/);
    assert.match(code, /res\.errorPhone/);
    assert.match(code, /res\.errorRoom/);
    assert.match(code, /payment\.method/);
    assert.match(code, /formatCurrency/);
  });

  it('verifies WalkInModal enforces full localization, room type translation, and payment methods', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/WalkInModal.tsx'
    );
    assert.strictEqual(fs.existsSync(modalPath), true, 'WalkInModal.tsx must exist');

    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(code, /useI18n/);
    assert.match(code, /localizeRoomType/);
    assert.match(code, /from ['"]@\/lib\/localizeMetadata['"]/);
    assert.match(code, /res\.rapidWalkIn/);
    assert.match(code, /res\.errorNoRoomWalkIn/);
    assert.match(code, /res\.errorGuestName/);
    assert.match(code, /res\.errorPhone/);
    assert.match(code, /res\.errorId/);
    assert.match(code, /payment\.method/);
    assert.match(code, /formatCurrency/);
  });
});

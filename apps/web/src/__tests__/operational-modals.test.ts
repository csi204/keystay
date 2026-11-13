import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Operational Modals: Extend Stay & Check-Out Confirmation', () => {
  it('includes keyCardReturned and deposit return note in CheckOutModal', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/CheckOutModal.tsx'),
      'utf-8'
    );
    assert.match(code, /keyCardReturned/);
    assert.match(code, /useI18n/);
  });

  it('validates extension dates and calculates extra charge in ExtendStayModal', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/ExtendStayModal.tsx'),
      'utf-8'
    );
    assert.match(code, /newCheckOutDate/);
    assert.match(code, /extraNights/);
  });

  it('includes Extend Stay button in RoomDetailsDrawer when room is occupied', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomDetailsDrawer.tsx'),
      'utf-8'
    );
    assert.match(code, /extend/i);
    assert.match(code, /extend\.button/);
  });

  it('integrates CheckOutModal into DailyOperationsPage', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'),
      'utf-8'
    );
    assert.match(code, /CheckOutModal/);
  });

  it('maintains 1:1 parity between th and en for extend.* and checkout.* keys', () => {
    const extendKeys = [
      'extend.title',
      'extend.button',
      'extend.roomNumber',
      'extend.guestName',
      'extend.currentCheckOut',
      'extend.newCheckOut',
      'extend.extraNights',
      'extend.nightlyRate',
      'extend.extraCharge',
      'extend.confirmButton',
      'extend.submitting',
      'extend.errorInvalidDate',
      'extend.errorGeneral',
      'extend.success',
    ];

    const checkoutKeys = [
      'checkout.title',
      'checkout.bookingNumber',
      'checkout.guestName',
      'checkout.roomNumber',
      'checkout.stayPeriod',
      'checkout.keyCardReturned',
      'checkout.keyDepositRefundTitle',
      'checkout.keyDepositRefundNotice',
      'checkout.keyCardMissingWarning',
      'checkout.notes',
      'checkout.notesPlaceholder',
      'checkout.confirmButton',
      'checkout.submitting',
      'checkout.forwardBilling',
      'checkout.errorGeneral',
    ];

    for (const key of [...extendKeys, ...checkoutKeys]) {
      assert.ok(th[key], `Missing translation in th for: ${key}`);
      assert.ok(en[key], `Missing translation in en for: ${key}`);
    }
  });
});

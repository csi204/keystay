import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 3: Front Desk Booking Channels & Slip Attachment in Reservation Modals', () => {
  const newBookingModalPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/NewBookingModal.tsx');
  const roomDetailsModalPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomDetailsModal.tsx');

  it('NewBookingModal implements bookingSource state supporting walk_in, phone, facebook', () => {
    assert.ok(fs.existsSync(newBookingModalPath), 'NewBookingModal.tsx should exist');
    const code = fs.readFileSync(newBookingModalPath, 'utf-8');

    // Booking source state
    assert.match(code, /bookingSource.*setBookingSource/);
    assert.match(code, /'walk_in'\s*\|\s*'phone'\s*\|\s*'facebook'/);

    // Channel selection controls
    assert.match(code, /walk_in/);
    assert.match(code, /phone/);
    assert.match(code, /facebook/);
  });

  it('NewBookingModal displays amber single verification point notice when phone or facebook is selected', () => {
    const code = fs.readFileSync(newBookingModalPath, 'utf-8');

    // Rule banner mentioning Facebook page single verification
    assert.match(code, /เพจ Facebook|Facebook Page/);
    assert.match(code, /ส่งสลิปยืนยัน|สลิปโอนเงิน/);
  });

  it('NewBookingModal includes slip attachment with file picker, instant preview, and bank ref input', () => {
    const code = fs.readFileSync(newBookingModalPath, 'utf-8');

    // File input and preview
    assert.match(code, /type=["']file["']/);
    assert.match(code, /paymentSlipUrl|slipPreview/);
    assert.match(code, /paymentSlipRef/);
  });

  it('RoomDetailsModal (Fast Booking mode) also implements bookingSource, FB notice, and slip controls', () => {
    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
    const code = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    assert.match(code, /bookingSource.*setBookingSource/);
    assert.match(code, /เพจ Facebook|Facebook Page/);
    assert.match(code, /paymentSlipRef/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const getFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  return p1;
};

describe('RoomDetailsModal — Centered Dialog & Split-Pane Fast Booking Modal', () => {
  const modalPath = getFilePath('apps/web/src/components/front-desk/RoomDetailsModal.tsx');
  const pagePath = getFilePath('apps/web/src/pages/front-desk/RoomMatrixPage.tsx');

  it('modal component exists and uses centered dialog with backdrop blur', () => {
    assert.ok(fs.existsSync(modalPath), 'RoomDetailsModal.tsx should exist');
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Backdrop blur and centered alignment
    assert.match(modalCode, /fixed\s+inset-0/);
    assert.match(modalCode, /backdrop-blur/);
    assert.match(modalCode, /flex\s+items-center\s+justify-center/);

    // Centered dialog card container
    assert.match(modalCode, /rounded-2xl|rounded-xl/);
    assert.match(modalCode, /shadow-2xl/);
    // Does NOT use right-aligned slide-over drawer container
    assert.doesNotMatch(modalCode, /fixed\s+inset-y-0\s+right-0/);
  });

  it('displays comprehensive room specifications, amenities, notes, and action buttons', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Specifications with Lucide icons
    assert.match(modalCode, /BedDouble/);
    assert.match(modalCode, /Layers/);
    assert.match(modalCode, /Users/);
    assert.match(modalCode, /roomNumber/);

    // Localized metadata helpers
    assert.match(modalCode, /localizeRoomType/);
    assert.match(modalCode, /localizeAmenity/);
    assert.match(modalCode, /localizeRoomNote/);

    // Action buttons for various room statuses
    assert.match(modalCode, /onAction/);
    assert.match(modalCode, /ExtendStayModal/);
  });

  it('expands into a 2-pane split modal (5 cols summary, 7 cols fast booking form) in booking mode', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Mode state for details vs booking
    assert.match(modalCode, /['"]details['"]\s*\|\s*['"]booking['"]|mode/);

    // Expanded max-w-4xl container with 12-column responsive grid
    assert.match(modalCode, /max-w-4xl/);
    assert.match(modalCode, /grid-cols-1\s+md:grid-cols-12/);

    // Left pane: 5 columns
    assert.match(modalCode, /md:col-span-5/);

    // Right pane: 7 columns
    assert.match(modalCode, /md:col-span-7/);

    // Back button to return from booking mode to details view
    assert.match(modalCode, /setMode\(['"]details['"]\)|กลับ/);
  });

  it('implements fast booking form with real-time inline validation banner', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Form fields
    assert.match(modalCode, /guestName/);
    assert.match(modalCode, /phone/);
    assert.match(modalCode, /checkInDate/);
    assert.match(modalCode, /checkOutDate/);
    assert.match(modalCode, /depositAmount/);
    assert.match(modalCode, /paymentMethod/);

    // 4 Payment methods supported
    assert.match(modalCode, /cash/);
    assert.match(modalCode, /transfer/);
    assert.match(modalCode, /credit_card/);
    assert.match(modalCode, /qr_promptpay/);

    // Real-time client validation checks: name, phone, dates, deposit
    assert.match(modalCode, /validationErrors|formErrors|validation/);
    assert.match(modalCode, /checkOutDate\s*<=\s*checkInDate|checkInDate\s*>=\s*checkOutDate/);

    // Prominent inline warning / error banner
    assert.match(modalCode, /bg-rose-50|bg-amber-50/);
    assert.match(modalCode, /text-rose-700|text-rose-800|text-amber-800/);
    assert.match(modalCode, /AlertCircle|AlertTriangle/);
  });

  it('supports initialMode prop and integrates directly with RoomMatrixPage quick walk-in', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');
    const pageCode = fs.readFileSync(pagePath, 'utf-8');

    // Supports initialMode prop
    assert.match(modalCode, /initialMode/);

    // RoomMatrixPage imports RoomDetailsModal
    assert.match(pageCode, /import\s+.*RoomDetailsModal.*from/);

    // RoomMatrixPage renders RoomDetailsModal
    assert.match(pageCode, /<RoomDetailsModal/);

    // Hover quick walk-in triggers modal in booking mode
    assert.match(pageCode, /onQuickBook/);
    assert.match(pageCode, /setModalMode\(['"]booking['"]\)|mode=['"]booking['"]|initialMode/);
  });

  it('RoomMatrixPage passes currentReservation to RoomDetailsModal and navigates to billing with full state', () => {
    const pageCode = fs.readFileSync(pagePath, 'utf-8');
    // Computes activeReservation from confirmed, checked_in, or extended
    assert.match(pageCode, /activeReservation/);
    assert.match(pageCode, /selectedRoom\.id/);
    assert.match(pageCode, /checked_in/);

    // Passes currentReservation to RoomDetailsModal
    assert.match(pageCode, /currentReservation=\{activeReservation \|\| null\}/);

    // Navigates to billing with complete state
    assert.match(pageCode, /\/front-desk\/billing/);
    assert.match(pageCode, /roomId:\s*room\.id/);
    assert.match(pageCode, /roomNumber:\s*room\.roomNumber/);
    assert.match(pageCode, /reservationId:/);
    assert.match(pageCode, /billId:/);
  });

  it('RoomDetailsModal reliably renders RequestAmenitiesModal when currentReservation exists OR room is occupied', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');
    assert.match(modalCode, /currentReservation\s*\|\|\s*room\?\.status\s*===\s*['"]occupied['"]/);
    assert.match(modalCode, /reservationId=\{currentReservation\?\.id\s*\|\|\s*['"]res-in-house-['"]\s*\+\s*room\?\.id\}/);
    assert.match(modalCode, /billId=\{\(currentReservation as any\)\?\.billId\}/);
    assert.match(modalCode, /roomId=\{room\?\.id\s*\|\|\s*['"]['"]\}/);
    assert.match(modalCode, /roomNumber=\{room\?\.roomNumber\s*\|\|\s*['"]['"]\}/);
  });
});

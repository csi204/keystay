import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { reconcileLiveRooms } from '../lib/roomStatusReconciliation';
import type { Room, Reservation } from '@keystay/types';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

describe('Task 5: Reservation Cancellation with Reason & Audit Log Modal', () => {
  const modalFilePath = resolveFilePath('apps/web/src/components/front-desk/CancelReservationModal.tsx');
  const reservationsRoutePath = resolveFilePath('services/reservation/src/routes/reservations.ts');
  const useReservationsPath = resolveFilePath('apps/web/src/hooks/useReservations.ts');
  const roomDetailsModalPath = resolveFilePath('apps/web/src/components/front-desk/RoomDetailsModal.tsx');
  const roomMatrixPagePath = resolveFilePath('apps/web/src/pages/front-desk/RoomMatrixPage.tsx');

  const mockReservation: any = {
    id: 'res-cancel-001',
    reservationCode: 'BK-2026-999',
    bookingNumber: 'BK-2026-999',
    roomId: 'room-105',
    roomNumber: '105',
    guestName: 'Somchai Prasert',
    guest: { fullName: 'Somchai Prasert', phone: '0812345678' },
    checkInDate: '2026-11-15',
    checkOutDate: '2026-11-17',
    totalNights: 2,
    nightlyRate: 1500,
    depositAmount: 500,
    totalAmount: 3500,
    status: 'confirmed',
  };

  it('1. CancelReservationModal renders reason dropdown, note textarea, and required actions', async () => {
    assert.ok(fs.existsSync(modalFilePath), 'CancelReservationModal.tsx should exist');

    // Dynamically import the component once it exists
    const { CancelReservationModal, CANCELLATION_REASONS } = await import(
      '../components/front-desk/CancelReservationModal'
    );

    assert.ok(Array.isArray(CANCELLATION_REASONS), 'CANCELLATION_REASONS array must be exported');
    assert.ok(
      CANCELLATION_REASONS.includes('ลูกค้าแจ้งขอยกเลิก (Guest Request)'),
      'Must contain reason: ลูกค้าแจ้งขอยกเลิก (Guest Request)'
    );
    assert.ok(
      CANCELLATION_REASONS.includes('ไม่มาแสดงตัว (No-Show)'),
      'Must contain reason: ไม่มาแสดงตัว (No-Show)'
    );
    assert.ok(
      CANCELLATION_REASONS.includes('เหตุฉุกเฉิน / สภาพอากาศ (Emergency)'),
      'Must contain reason: เหตุฉุกเฉิน / สภาพอากาศ (Emergency)'
    );
    assert.ok(
      CANCELLATION_REASONS.includes('อื่นๆ (Other)'),
      'Must contain reason: อื่นๆ (Other)'
    );

    const html = renderToStaticMarkup(
      React.createElement(CancelReservationModal, {
        isOpen: true,
        reservation: mockReservation,
        onClose: () => {},
        onConfirm: async () => ({ success: true }),
      })
    );

    // Renders reservation context
    assert.ok(html.includes('BK-2026-999'), 'Modal must render booking/reservation code');
    assert.ok(html.includes('105'), 'Modal must render room number');
    assert.ok(html.includes('Somchai Prasert'), 'Modal must render guest name');

    // Renders dropdown and options
    assert.ok(html.includes('<select'), 'Modal must contain select dropdown for cancellation reason');
    assert.ok(html.includes('ลูกค้าแจ้งขอยกเลิก (Guest Request)'), 'Dropdown must include guest request option');
    assert.ok(html.includes('ไม่มาแสดงตัว (No-Show)'), 'Dropdown must include no-show option');
    assert.ok(html.includes('เหตุฉุกเฉิน / สภาพอากาศ (Emergency)'), 'Dropdown must include emergency option');
    assert.ok(html.includes('อื่นๆ (Other)'), 'Dropdown must include other option');

    // Renders notes input
    assert.ok(html.includes('<textarea'), 'Modal must contain textarea for cancellation notes');

    // Danger button & secondary action
    assert.ok(html.includes('ยืนยันยกเลิกการจอง'), 'Modal must contain danger confirmation button "ยืนยันยกเลิกการจอง"');
    assert.ok(html.includes('ยกเลิก'), 'Modal must contain cancel/close button "ยกเลิก"');

    // Accessible touch target
    assert.ok(html.includes('min-h-[44px]'), 'Action buttons must have min-h-[44px] touch target');

    // Zero raw emoji constraint
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.strictEqual(emojiRegex.test(html), false, 'CancelReservationModal must not contain raw Unicode emojis');

    // Lucide strokeWidth standard: strictly 1.75 on AlertTriangle
    assert.ok(
      html.includes('stroke-width="1.75"'),
      'AlertTriangle icons in CancelReservationModal must use strokeWidth={1.75}'
    );

    // Thai orthography check: no "เช็คเอาท์"
    assert.strictEqual(html.includes('เช็คเอาท์'), false, 'Strictly zero instances of "เช็คเอาท์"');
  });

  it('2. Submitting cancellation calls cancelReservation hook and API with reason and notes', () => {
    assert.ok(fs.existsSync(useReservationsPath), 'useReservations.ts should exist');
    const hookCode = fs.readFileSync(useReservationsPath, 'utf-8');

    // Hook exports cancelReservation
    assert.match(
      hookCode,
      /cancelReservation\s*[:=]/,
      'useReservations must export cancelReservation function'
    );
    assert.match(
      hookCode,
      /\/api\/reservations\/\$\{[^}]+\}\/cancel/,
      'cancelReservation in useReservations must call /api/reservations/:id/cancel'
    );
    assert.match(
      hookCode,
      /method:\s*['"]POST['"]/,
      'cancelReservation must use POST method'
    );

    // reservations.ts route verifies reason & notes audit logging
    assert.ok(fs.existsSync(reservationsRoutePath), 'reservations.ts should exist');
    const routeCode = fs.readFileSync(reservationsRoutePath, 'utf-8');

    assert.match(
      routeCode,
      /reservations\.post\(.*?\/cancel/,
      'reservations.ts must have POST cancel route'
    );
    assert.match(
      routeCode,
      /status\s*=\s*['"]cancelled['"]/,
      'reservations.ts cancel route must update status to cancelled'
    );
    assert.match(
      routeCode,
      /DELETE FROM room_booked_dates WHERE reservation_id/,
      'reservations.ts cancel route must release room_booked_dates'
    );
    assert.match(
      routeCode,
      /INSERT INTO reservation_history[^;]*'cancelled'/,
      'reservations.ts cancel route must insert audit log into reservation_history'
    );
  });

  it('3. Target reservation status becomes cancelled and room status immediately reverts to available', () => {
    const mockRoom: Room = {
      id: 'room-105',
      roomNumber: '105',
      roomTypeId: 'type-std',
      status: 'reserved',
      floor: '1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    // When reservation is confirmed, room reconciles to 'reserved'
    const beforeCancellation = reconcileLiveRooms([mockRoom], [mockReservation]);
    assert.strictEqual(beforeCancellation[0].status, 'reserved', 'Room should be reserved before cancellation');

    // When reservation is cancelled, room immediately reverts to 'available'
    const cancelledReservation: any = {
      ...mockReservation,
      status: 'cancelled',
    };
    const afterCancellation = reconcileLiveRooms([mockRoom], [cancelledReservation]);
    assert.strictEqual(
      afterCancellation[0].status,
      'available',
      'Room should immediately revert to available after reservation status is cancelled'
    );
  });

  it('4. RoomDetailsModal and RoomMatrixPage integrate CancelReservationModal and cancellation workflow', () => {
    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
    const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    assert.match(
      modalCode,
      /CancelReservationModal/,
      'RoomDetailsModal.tsx must import and render CancelReservationModal'
    );
    assert.match(
      modalCode,
      /ยกเลิกการจอง|cancelReservation/i,
      'RoomDetailsModal.tsx must provide a cancel reservation action button'
    );
    assert.match(
      modalCode,
      /onCancelReservation[\s\S]*?onClose\(\)/,
      'RoomDetailsModal.tsx must invoke onClose() upon successful cancellation to prevent zombie modal state'
    );

    assert.ok(fs.existsSync(roomMatrixPagePath), 'RoomMatrixPage.tsx should exist');
    const pageCode = fs.readFileSync(roomMatrixPagePath, 'utf-8');

    assert.match(
      pageCode,
      /CancelReservationModal/,
      'RoomMatrixPage.tsx must import and render CancelReservationModal'
    );
    assert.match(
      pageCode,
      /cancelReservation/,
      'RoomMatrixPage.tsx must use cancelReservation from useReservations'
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import type { Room } from '@keystay/types';
import type { ExtendedReservation } from '../hooks/useReservations';
import { reconcileLiveRooms, getRoomGuestMapping } from '../lib/roomStatusReconciliation';

describe('Task 1: Room Matrix Live Status Reconciliation & Webhook Resilience', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const roomMatrixPath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'
  );
  const webhooksPath = path.resolve(
    rootDir,
    'services/room-inventory/src/routes/webhooks.ts'
  );

  const mockRooms: Room[] = [
    {
      id: 'room-101',
      roomNumber: '101',
      roomTypeId: 'deluxe',
      floor: '1',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'room-102',
      roomNumber: '102',
      roomTypeId: 'deluxe',
      floor: '1',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'room-103',
      roomNumber: '103',
      roomTypeId: 'suite',
      floor: '1',
      status: 'reserved',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'room-104',
      roomNumber: '104',
      roomTypeId: 'standard',
      floor: '1',
      status: 'occupied',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'room-105',
      roomNumber: '105',
      roomTypeId: 'standard',
      floor: '1',
      status: 'reserved',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'room-106',
      roomNumber: '106',
      roomTypeId: 'standard',
      floor: '1',
      status: 'reserved',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'room-107',
      roomNumber: '107',
      roomTypeId: 'standard',
      floor: '1',
      status: 'maintenance',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  it('maps room with confirmed reservation to reserved (ติดจอง) with reserved guest name', () => {
    const today = '2026-11-12';
    const reservations: ExtendedReservation[] = [
      {
        id: 'res-conf-1',
        bookingNumber: 'BK-101',
        guestId: 'g-101',
        roomId: 'room-101',
        guestName: 'Somchai Prasert',
        checkInDate: today,
        checkOutDate: '2026-11-14',
        totalNights: '2',
        totalAmount: '3000',
        depositAmount: '500',
        status: 'confirmed',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
    ];

    const live = reconcileLiveRooms(mockRooms, reservations, today);
    const room101 = live.find((r) => r.id === 'room-101');
    assert.ok(room101, 'room 101 should exist');
    assert.strictEqual(room101.status, 'reserved', 'confirmed reservation must map room to reserved');

    const { roomGuests } = getRoomGuestMapping(reservations);
    assert.strictEqual(roomGuests['room-101'], 'Somchai Prasert', 'roomGuests must contain confirmed guest name');
  });

  it('maps room with checked_in or extended reservation to occupied (มีแขกพัก) with guest name', () => {
    const today = '2026-11-12';
    const reservations: ExtendedReservation[] = [
      {
        id: 'res-in-1',
        bookingNumber: 'BK-102',
        guestId: 'g-102',
        roomId: 'room-102',
        guestName: 'Alice Walker',
        checkInDate: today,
        checkOutDate: '2026-11-15',
        totalNights: '3',
        totalAmount: '4500',
        depositAmount: '500',
        status: 'checked_in',
        createdAt: '2026-11-12T00:00:00Z',
        updatedAt: '2026-11-12T00:00:00Z',
      },
      {
        id: 'res-ext-1',
        bookingNumber: 'BK-103',
        guestId: 'g-103',
        roomId: 'room-103',
        guestName: 'Bob Extended',
        checkInDate: '2026-11-09',
        checkOutDate: '2026-11-14',
        totalNights: '5',
        totalAmount: '7500',
        depositAmount: '500',
        status: 'extended' as any,
        createdAt: '2026-11-09T00:00:00Z',
        updatedAt: '2026-11-12T00:00:00Z',
      },
    ];

    const live = reconcileLiveRooms(mockRooms, reservations, today);
    const room102 = live.find((r) => r.id === 'room-102');
    const room103 = live.find((r) => r.id === 'room-103');

    assert.ok(room102);
    assert.strictEqual(room102.status, 'occupied', 'checked_in reservation must map room to occupied');

    assert.ok(room103);
    assert.strictEqual(room103.status, 'occupied', 'extended reservation must map room to occupied');

    const { roomGuests } = getRoomGuestMapping(reservations);
    assert.strictEqual(roomGuests['room-102'], 'Alice Walker');
    assert.strictEqual(roomGuests['room-103'], 'Bob Extended');
  });

  it("transitions room with today's checked_out reservation from reserved/occupied to cleaning (รอทำความสะอาด)", () => {
    const today = '2026-11-12';
    const reservations: ExtendedReservation[] = [
      {
        id: 'res-out-1',
        bookingNumber: 'BK-104',
        guestId: 'g-104',
        roomId: 'room-104',
        guestName: 'Departed Guest 1',
        checkInDate: '2026-11-10',
        checkOutDate: today,
        actualCheckOut: `${today}T11:00:00Z`,
        totalNights: '2',
        totalAmount: '3000',
        depositAmount: '500',
        status: 'checked_out',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: `${today}T11:00:00Z`,
      },
      {
        id: 'res-out-2',
        bookingNumber: 'BK-105',
        guestId: 'g-105',
        roomId: 'room-105',
        guestName: 'Departed Guest 2',
        checkInDate: '2026-11-11',
        checkOutDate: today,
        totalNights: '1',
        totalAmount: '1500',
        depositAmount: '500',
        status: 'checked_out',
        createdAt: '2026-11-11T00:00:00Z',
        updatedAt: `${today}T10:30:00Z`,
      },
    ];

    const live = reconcileLiveRooms(mockRooms, reservations, today);
    const room104 = live.find((r) => r.id === 'room-104');
    const room105 = live.find((r) => r.id === 'room-105');

    assert.ok(room104);
    assert.strictEqual(
      room104.status,
      'cleaning',
      'occupied room checked out today must transition to cleaning'
    );

    assert.ok(room105);
    assert.strictEqual(
      room105.status,
      'cleaning',
      'reserved room checked out today must transition to cleaning'
    );
  });

  it('clears stale reserved status from DB to available (ว่างพร้อมใช้) when no active reservations exist', () => {
    const today = '2026-11-12';
    // No active reservations for room-106 (DB status is 'reserved')
    const reservations: ExtendedReservation[] = [
      {
        id: 'res-canc-1',
        bookingNumber: 'BK-CANCELLED',
        guestId: 'g-canc',
        roomId: 'room-106',
        guestName: 'Cancelled Booker',
        checkInDate: today,
        checkOutDate: '2026-11-15',
        totalNights: '3',
        totalAmount: '4500',
        depositAmount: '500',
        status: 'cancelled',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-11T00:00:00Z',
      },
    ];

    const live = reconcileLiveRooms(mockRooms, reservations, today);
    const room106 = live.find((r) => r.id === 'room-106');
    assert.ok(room106);
    assert.strictEqual(
      room106.status,
      'available',
      'stale reserved status without active confirmed booking must clear to available'
    );

    const room107 = live.find((r) => r.id === 'room-107');
    assert.ok(room107);
    assert.strictEqual(
      room107.status,
      'maintenance',
      'maintenance room must remain maintenance'
    );
  });

  it('verifies RoomMatrixPage.tsx source code invokes reconciliation and updates liveRooms and roomGuests', () => {
    const code = fs.readFileSync(roomMatrixPath, 'utf-8');

    // Confirms liveRooms computation reconciles statuses
    assert.match(code, /reconcileLiveRooms/);
    assert.match(code, /const liveRooms\s*=\s*useMemo/);
    assert.match(code, /rooms=\{liveRooms\}/);

    // Confirms roomGuests mapping includes confirmed and checked_in
    assert.match(code, /getRoomGuestMapping/);
  });

  it('verifies room-inventory checkout webhook guard permits occupied, reserved, and checked_out', () => {
    const code = fs.readFileSync(webhooksPath, 'utf-8');

    // Webhook checkout guard must permit transitions from occupied, reserved, or checked_out
    assert.match(
      code,
      /(\['occupied',\s*'reserved',\s*'checked_out'\]|status !== 'occupied' && room\.status !== 'reserved' && room\.status !== 'checked_out')/
    );
    assert.doesNotMatch(
      code,
      /if \(room\.status !== 'occupied'\)\s*\{\s*return c\.json\(\{\s*success:\s*true,\s*message:\s*`Room '\$\{room\.roomNumber\}' is currently in '\$\{room\.status\}' \(not 'occupied'\)/
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import type { Room } from '@keystay/types';
import type { ExtendedReservation } from '../hooks/useReservations';
import { reconcileLiveRooms } from '../lib/roomStatusReconciliation';

describe('Ghost Room Elimination & PMS State Integrity', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const roomInventoryRoutePath = path.resolve(
    rootDir,
    'services/room-inventory/src/routes/rooms.ts'
  );
  const roomValidatorPath = path.resolve(
    rootDir,
    'services/room-inventory/src/validators/room.validator.ts'
  );
  const seedsRoomPath = path.resolve(rootDir, 'scripts/seeds/02_room.sql');

  it('reconciles orphan occupied rooms without active reservations to available (Auto-Healing Invariant)', () => {
    const today = '2026-11-12';
    const mockRooms: Room[] = [
      {
        id: 'rm-orphan-1',
        roomNumber: '999',
        roomTypeId: 'rt-std',
        floor: '9',
        status: 'occupied',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    // No reservations
    const reservations: ExtendedReservation[] = [];

    const live = reconcileLiveRooms(mockRooms, reservations, today);
    assert.strictEqual(
      live[0].status,
      'available',
      'Orphan occupied room must auto-heal to available'
    );
  });

  it('reconciles ghost rooms 103, 302, 402 without reservations to available (ว่างพร้อมใช้)', () => {
    const today = '2026-11-12';
    const mockRooms: Room[] = [
      {
        id: 'rm-103',
        roomNumber: '103',
        roomTypeId: 'rt-std',
        floor: '1',
        status: 'occupied',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'rm-302',
        roomNumber: '302',
        roomTypeId: 'rt-ste',
        floor: '3',
        status: 'occupied',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'rm-402',
        roomNumber: '402',
        roomTypeId: 'rt-ste',
        floor: '4',
        status: 'occupied',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    // Room 302 has only past checked_out reservation (from yesterday), 103 and 402 have none
    const reservations: ExtendedReservation[] = [
      {
        id: 'res-old-302',
        bookingNumber: 'BK-302',
        guestId: 'gst-003',
        roomId: 'rm-302',
        guestName: 'Kenji Sato',
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-05',
        actualCheckOut: '2026-11-05T10:00:00Z',
        totalNights: '4',
        totalAmount: '23200',
        depositAmount: '5000',
        status: 'checked_out',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-05T10:00:00Z',
      },
    ];

    const live = reconcileLiveRooms(mockRooms, reservations, today);
    const r103 = live.find((r) => r.id === 'rm-103');
    const r302 = live.find((r) => r.id === 'rm-302');
    const r402 = live.find((r) => r.id === 'rm-402');

    assert.strictEqual(r103?.status, 'available', 'Room 103 must be displayed as available');
    assert.strictEqual(r302?.status, 'available', 'Room 302 must be displayed as available');
    assert.strictEqual(r402?.status, 'available', 'Room 402 must be displayed as available');
  });

  it('keeps rooms with active checked_in or extended reservations as occupied', () => {
    const today = '2026-11-12';
    const mockRooms: Room[] = [
      {
        id: 'rm-202',
        roomNumber: '202',
        roomTypeId: 'rt-dlx',
        floor: '2',
        status: 'occupied',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'rm-501',
        roomNumber: '501',
        roomTypeId: 'rt-prs',
        floor: '5',
        status: 'available', // DB status might even be available, but active stay makes it occupied
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const reservations: ExtendedReservation[] = [
      {
        id: 'res-202',
        bookingNumber: 'BK-202',
        guestId: 'gst-002',
        roomId: 'rm-202',
        guestName: 'Sarah Jenkins',
        checkInDate: '2026-11-10',
        checkOutDate: '2026-11-15',
        totalNights: '5',
        totalAmount: '17500',
        depositAmount: '3000',
        status: 'checked_in',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
      {
        id: 'res-501',
        bookingNumber: 'BK-501',
        guestId: 'gst-004',
        roomId: 'rm-501',
        guestName: 'Hans Mueller',
        checkInDate: '2026-11-08',
        checkOutDate: '2026-11-16',
        totalNights: '8',
        totalAmount: '100000',
        depositAmount: '20000',
        status: 'extended' as any,
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-11T00:00:00Z',
      },
    ];

    const live = reconcileLiveRooms(mockRooms, reservations, today);
    const r202 = live.find((r) => r.id === 'rm-202');
    const r501 = live.find((r) => r.id === 'rm-501');

    assert.strictEqual(r202?.status, 'occupied', 'Room 202 with checked_in guest must be occupied');
    assert.strictEqual(r501?.status, 'occupied', 'Room 501 with extended guest must be occupied');
  });

  it('prevention invariant: services/room-inventory enforces reservation context for occupied status', () => {
    const routeCode = fs.readFileSync(roomInventoryRoutePath, 'utf-8');
    const validatorCode = fs.readFileSync(roomValidatorPath, 'utf-8');

    // UpdateRoomStatusSchema supports reservationId and eventSource
    assert.match(
      validatorCode,
      /reservationId:\s*z\.string\(\)\.optional\(\)/,
      'UpdateRoomStatusSchema must accept reservationId'
    );
    assert.match(
      validatorCode,
      /eventSource:\s*z\.string\(\)\.optional\(\)/,
      'UpdateRoomStatusSchema must accept eventSource'
    );

    // roomsRoute PUT /:id/status verifies reservationId or eventSource === 'hotel.reservation.checkin'
    assert.match(
      routeCode,
      /INVALID_ORPHAN_STATUS/,
      'rooms route must guard against orphan occupied transitions with INVALID_ORPHAN_STATUS'
    );
    assert.match(
      routeCode,
      /Cannot mark room as occupied without an active reservation/,
      'rooms route must return helpful message when reservation context is missing'
    );
  });

  it('verifies seeds 02_room.sql sets rm-103, rm-302, rm-402 to available with no ghost notes', () => {
    const seedsCode = fs.readFileSync(seedsRoomPath, 'utf-8');

    assert.match(
      seedsCode,
      /\('rm-103',\s*'103',\s*'rt-std',\s*'fl-1',\s*'available'/,
      'rm-103 must be seeded as available'
    );
    assert.match(
      seedsCode,
      /\('rm-302',\s*'302',\s*'rt-ste',\s*'fl-3',\s*'available'/,
      'rm-302 must be seeded as available'
    );
    assert.match(
      seedsCode,
      /\('rm-402',\s*'402',\s*'rt-ste',\s*'fl-4',\s*'available'/,
      'rm-402 must be seeded as available'
    );

    assert.doesNotMatch(seedsCode, /'Family with infant'/, 'rm-103 ghost note must be removed');
    assert.doesNotMatch(seedsCode, /'Guest Kenji Sato'/, 'rm-302 ghost note must be removed');
    assert.doesNotMatch(seedsCode, /'Long stay corporate'/, 'rm-402 ghost note must be removed');
  });
});

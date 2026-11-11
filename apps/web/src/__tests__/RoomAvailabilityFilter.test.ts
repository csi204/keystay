import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import type { Room, Reservation } from '@keystay/types';

describe('Task 4: Smart Date-Range Room Availability Filtering & Overbooking Guard', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const roomAvailabilityLibPath = path.resolve(
    rootDir,
    'apps/web/src/lib/roomAvailability.ts'
  );
  const walkInModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/WalkInModal.tsx'
  );
  const newBookingModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/NewBookingModal.tsx'
  );
  const dailyOperationsPagePath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'
  );

  const mockRooms: Room[] = [
    {
      id: 'rm-101',
      roomNumber: '101',
      roomTypeId: 'rt-std',
      floor: '1',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-102',
      roomNumber: '102',
      roomTypeId: 'rt-std',
      floor: '1',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-103',
      roomNumber: '103',
      roomTypeId: 'rt-deluxe',
      floor: '1',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-104',
      roomNumber: '104',
      roomTypeId: 'rt-deluxe',
      floor: '1',
      status: 'maintenance',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-105',
      roomNumber: '105',
      roomTypeId: 'rt-suite',
      floor: '1',
      status: 'out_of_order',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-106',
      roomNumber: '106',
      roomTypeId: 'rt-suite',
      floor: '1',
      status: 'cleaning',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  describe('lib/roomAvailability.ts logic', () => {
    it('verifies roomAvailability.ts module exists and exports getAvailableRoomsForDates and isRoomAvailable', async () => {
      assert.ok(fs.existsSync(roomAvailabilityLibPath), 'roomAvailability.ts should exist');
      const mod = await import('../lib/roomAvailability');
      assert.strictEqual(typeof mod.getAvailableRoomsForDates, 'function');
      assert.strictEqual(typeof mod.isRoomAvailable, 'function');
    });

    it('filters out rooms with overlapping reservations (confirmed, checked_in, extended)', async () => {
      const { getAvailableRoomsForDates } = await import('../lib/roomAvailability');
      const reservations: Reservation[] = [
        {
          id: 'res-1',
          bookingNumber: 'BK-101',
          guestId: 'gst-1',
          roomId: 'rm-101',
          checkInDate: '2026-11-12',
          checkOutDate: '2026-11-15',
          totalNights: '3',
          totalAmount: '3600',
          depositAmount: '500',
          status: 'confirmed',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
        {
          id: 'res-2',
          bookingNumber: 'BK-102',
          guestId: 'gst-2',
          roomId: 'rm-102',
          checkInDate: '2026-11-10',
          checkOutDate: '2026-11-14',
          totalNights: '4',
          totalAmount: '4800',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
        {
          id: 'res-3',
          bookingNumber: 'BK-103',
          guestId: 'gst-3',
          roomId: 'rm-103',
          checkInDate: '2026-11-11',
          checkOutDate: '2026-11-14',
          totalNights: '3',
          totalAmount: '4500',
          depositAmount: '500',
          status: 'extended',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ];

      // For target window 2026-11-13 to 2026-11-14:
      // rm-101 has confirmed res (2026-11-12..15) -> blocked
      // rm-102 has checked_in res (2026-11-10..14) -> blocked
      // rm-103 has extended res (2026-11-11..14) -> blocked
      // rm-104 is maintenance -> blocked
      // rm-105 is out_of_order -> blocked
      // rm-106 is cleaning (not same-day walk-in) -> available
      const available = getAvailableRoomsForDates(
        mockRooms,
        reservations,
        '2026-11-13',
        '2026-11-14'
      );

      const availableRoomIds = available.map((r) => r.id);
      assert.ok(!availableRoomIds.includes('rm-101'), 'rm-101 should be blocked by confirmed reservation');
      assert.ok(!availableRoomIds.includes('rm-102'), 'rm-102 should be blocked by checked_in reservation');
      assert.ok(!availableRoomIds.includes('rm-103'), 'rm-103 should be blocked by extended reservation');
      assert.ok(availableRoomIds.includes('rm-106'), 'rm-106 should be available for future dates');
    });

    it('allows same-day departure and arrival turnover (r.checkOutDate === targetCheckIn or r.checkInDate === targetCheckOut)', async () => {
      const { getAvailableRoomsForDates } = await import('../lib/roomAvailability');
      const reservations: Reservation[] = [
        {
          id: 'res-turnover-1',
          bookingNumber: 'BK-TO1',
          guestId: 'gst-1',
          roomId: 'rm-101',
          checkInDate: '2026-11-10',
          checkOutDate: '2026-11-12', // Departs 2026-11-12
          totalNights: '2',
          totalAmount: '2400',
          depositAmount: '500',
          status: 'confirmed',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
        {
          id: 'res-turnover-2',
          bookingNumber: 'BK-TO2',
          guestId: 'gst-2',
          roomId: 'rm-102',
          checkInDate: '2026-11-14', // Arrives 2026-11-14
          checkOutDate: '2026-11-16',
          totalNights: '2',
          totalAmount: '2400',
          depositAmount: '500',
          status: 'confirmed',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ];

      // Target stay: 2026-11-12 to 2026-11-14
      // rm-101 guest departs on 2026-11-12 morning -> can turnover for check-in on 2026-11-12 afternoon
      // rm-102 guest arrives on 2026-11-14 afternoon -> target guest departs 2026-11-14 morning
      const available = getAvailableRoomsForDates(
        mockRooms,
        reservations,
        '2026-11-12',
        '2026-11-14'
      );

      const availableRoomIds = available.map((r) => r.id);
      assert.ok(
        availableRoomIds.includes('rm-101'),
        'rm-101 should be available due to same-day departure turnover'
      );
      assert.ok(
        availableRoomIds.includes('rm-102'),
        'rm-102 should be available due to same-day arrival turnover'
      );
    });

    it('excludes rooms in maintenance and out_of_order regardless of reservations', async () => {
      const { getAvailableRoomsForDates } = await import('../lib/roomAvailability');
      // No reservations at all
      const available = getAvailableRoomsForDates(
        mockRooms,
        [],
        '2026-12-01',
        '2026-12-03'
      );

      const availableRoomIds = available.map((r) => r.id);
      assert.ok(!availableRoomIds.includes('rm-104'), 'Maintenance room 104 must be excluded');
      assert.ok(!availableRoomIds.includes('rm-105'), 'Out of order room 105 must be excluded');
      assert.ok(availableRoomIds.includes('rm-101'), 'Available room 101 must be included');
      assert.ok(availableRoomIds.includes('rm-102'), 'Available room 102 must be included');
    });

    it('excludes cleaning rooms when isWalkInToday is true, but allows them for future dates', async () => {
      const { getAvailableRoomsForDates } = await import('../lib/roomAvailability');
      // Same-day walk-in
      const walkInAvailable = getAvailableRoomsForDates(
        mockRooms,
        [],
        '2026-11-12',
        '2026-11-13',
        { isWalkInToday: true }
      );
      const walkInIds = walkInAvailable.map((r) => r.id);
      assert.ok(!walkInIds.includes('rm-106'), 'Cleaning room 106 must be excluded for same-day walk-in');

      // Future booking
      const futureAvailable = getAvailableRoomsForDates(
        mockRooms,
        [],
        '2026-11-15',
        '2026-11-16',
        { isWalkInToday: false }
      );
      const futureIds = futureAvailable.map((r) => r.id);
      assert.ok(futureIds.includes('rm-106'), 'Cleaning room 106 should be available for future booking');
    });

    it('supports excludeReservationId when modifying an existing reservation', async () => {
      const { getAvailableRoomsForDates } = await import('../lib/roomAvailability');
      const reservations: Reservation[] = [
        {
          id: 'res-editing-1',
          bookingNumber: 'BK-EDIT',
          guestId: 'gst-1',
          roomId: 'rm-101',
          checkInDate: '2026-11-12',
          checkOutDate: '2026-11-15',
          totalNights: '3',
          totalAmount: '3600',
          depositAmount: '500',
          status: 'confirmed',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ];

      // Without exclusion: rm-101 is blocked
      const blocked = getAvailableRoomsForDates(
        mockRooms,
        reservations,
        '2026-11-12',
        '2026-11-15'
      );
      assert.ok(!blocked.some((r) => r.id === 'rm-101'));

      // With excludeReservationId: rm-101 is available
      const unblocked = getAvailableRoomsForDates(
        mockRooms,
        reservations,
        '2026-11-12',
        '2026-11-15',
        { excludeReservationId: 'res-editing-1' }
      );
      assert.ok(unblocked.some((r) => r.id === 'rm-101'));
    });
  });

  describe('UI Modals Integration & Overbooking Guard', () => {
    it('verifies WalkInModal uses getAvailableRoomsForDates and guards against empty availability', () => {
      assert.ok(fs.existsSync(walkInModalPath), 'WalkInModal.tsx should exist');
      const code = fs.readFileSync(walkInModalPath, 'utf-8');

      // Import getAvailableRoomsForDates
      assert.match(
        code,
        /getAvailableRoomsForDates/,
        'WalkInModal should import or use getAvailableRoomsForDates'
      );

      // Warning when 0 rooms available
      assert.match(
        code,
        /ไม่มีห้องว่างในช่วงวันที่เลือก/,
        'WalkInModal should display amber notice "ไม่มีห้องว่างในช่วงวันที่เลือก" when no rooms are available'
      );

      // Submit button disabled when 0 rooms available
      assert.match(
        code,
        /disabled=\{.*(availableRooms|availableRoomsForDates)\.length === 0/s,
        'WalkInModal should disable submit button when 0 rooms available'
      );
    });

    it('verifies NewBookingModal uses getAvailableRoomsForDates and dynamic room dropdown', () => {
      assert.ok(fs.existsSync(newBookingModalPath), 'NewBookingModal.tsx should exist');
      const code = fs.readFileSync(newBookingModalPath, 'utf-8');

      // Import getAvailableRoomsForDates
      assert.match(
        code,
        /getAvailableRoomsForDates/,
        'NewBookingModal should import getAvailableRoomsForDates'
      );

      // Maps over availableRoomsForDates
      assert.match(
        code,
        /availableRoomsForDates\.map/,
        'NewBookingModal should map over availableRoomsForDates instead of raw rooms'
      );

      // Notice when no rooms available
      assert.match(
        code,
        /ไม่มีห้องว่างในช่วงวันที่เลือก/,
        'NewBookingModal should show warning when no rooms available for dates'
      );

      // Submit disabled when no available rooms
      assert.match(
        code,
        /disabled=\{.*(availableRoomsForDates\.length === 0|!roomId)/s,
        'NewBookingModal should disable submit button when 0 rooms available'
      );
    });

    it('verifies DailyOperationsPage passes filtered available rooms to RapidWalkInModal', () => {
      assert.ok(fs.existsSync(dailyOperationsPagePath), 'DailyOperationsPage.tsx should exist');
      const code = fs.readFileSync(dailyOperationsPagePath, 'utf-8');

      assert.match(
        code,
        /getAvailableRoomsForDates/,
        'DailyOperationsPage should use getAvailableRoomsForDates to compute availableRooms'
      );
    });
  });
});

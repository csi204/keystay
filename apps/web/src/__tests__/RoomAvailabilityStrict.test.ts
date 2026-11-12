import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Room, Reservation } from '@keystay/types';
import {
  isRoomAvailable,
  getAvailableRoomsForDates,
  BLOCKING_RESERVATION_STATUSES,
  hasDateOverlap,
} from '../lib/roomAvailability';

describe('Task 2: Robust Room Availability Filtering & Active Occupancy Protection', () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const nextWeekEnd = new Date();
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 9);
  const nextWeekEndStr = nextWeekEnd.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const sampleRooms: Room[] = [
    {
      id: 'rm-101',
      roomNumber: '101',
      roomTypeId: 'rt-standard',
      floor: '1',
      status: 'occupied',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-102',
      roomNumber: '102',
      roomTypeId: 'rt-standard',
      floor: '1',
      status: 'reserved',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-103',
      roomNumber: '103',
      roomTypeId: 'rt-deluxe',
      floor: '1',
      status: 'cleaning',
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
      status: 'checked_out',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-201',
      roomNumber: '201',
      roomTypeId: 'rt-standard',
      floor: '2',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-202',
      roomNumber: '202',
      roomTypeId: 'rt-standard',
      floor: '2',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rm-203',
      roomNumber: '203',
      roomTypeId: 'rt-deluxe',
      floor: '2',
      status: 'available',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  describe('Requirement 1a: Physical Status Exclusion for Same-Day Arrival', () => {
    it('strictly marks rooms with status occupied, reserved, cleaning, maintenance, or out_of_order as UNAVAILABLE for today', () => {
      const occupiedRoom = sampleRooms.find((r) => r.id === 'rm-101')!;
      const reservedRoom = sampleRooms.find((r) => r.id === 'rm-102')!;
      const cleaningRoom = sampleRooms.find((r) => r.id === 'rm-103')!;
      const maintenanceRoom = sampleRooms.find((r) => r.id === 'rm-104')!;
      const outOfOrderRoom = sampleRooms.find((r) => r.id === 'rm-105')!;
      const checkedOutRoom = sampleRooms.find((r) => r.id === 'rm-106')!;
      const availableRoom = sampleRooms.find((r) => r.id === 'rm-201')!;

      // Without any reservations in the system, physical status alone must protect today's inventory
      assert.strictEqual(
        isRoomAvailable(occupiedRoom, [], todayStr, tomorrowStr),
        false,
        'Occupied room 101 must be UNAVAILABLE for today arrival'
      );
      assert.strictEqual(
        isRoomAvailable(reservedRoom, [], todayStr, tomorrowStr),
        false,
        'Reserved room 102 must be UNAVAILABLE for today arrival'
      );
      assert.strictEqual(
        isRoomAvailable(cleaningRoom, [], todayStr, tomorrowStr),
        false,
        'Cleaning room 103 must be UNAVAILABLE for today arrival'
      );
      assert.strictEqual(
        isRoomAvailable(maintenanceRoom, [], todayStr, tomorrowStr),
        false,
        'Maintenance room 104 must be UNAVAILABLE for today arrival'
      );
      assert.strictEqual(
        isRoomAvailable(outOfOrderRoom, [], todayStr, tomorrowStr),
        false,
        'Out of order room 105 must be UNAVAILABLE for today arrival'
      );
      assert.strictEqual(
        isRoomAvailable(checkedOutRoom, [], todayStr, tomorrowStr),
        false,
        'Checked out (not yet cleaned/available) room 106 must be UNAVAILABLE for today arrival'
      );
      assert.strictEqual(
        isRoomAvailable(availableRoom, [], todayStr, tomorrowStr),
        true,
        'Available room 201 with no reservations must be AVAILABLE for today arrival'
      );
    });

    it('enforces physical status protection when isWalkInToday is true', () => {
      const occupiedRoom = sampleRooms.find((r) => r.id === 'rm-101')!;
      const reservedRoom = sampleRooms.find((r) => r.id === 'rm-102')!;
      const cleaningRoom = sampleRooms.find((r) => r.id === 'rm-103')!;
      const availableRoom = sampleRooms.find((r) => r.id === 'rm-201')!;

      assert.strictEqual(
        isRoomAvailable(occupiedRoom, [], todayStr, tomorrowStr, { isWalkInToday: true }),
        false,
        'Walk-in today must reject occupied room'
      );
      assert.strictEqual(
        isRoomAvailable(reservedRoom, [], todayStr, tomorrowStr, { isWalkInToday: true }),
        false,
        'Walk-in today must reject reserved room'
      );
      assert.strictEqual(
        isRoomAvailable(cleaningRoom, [], todayStr, tomorrowStr, { isWalkInToday: true }),
        false,
        'Walk-in today must reject cleaning room'
      );
      assert.strictEqual(
        isRoomAvailable(availableRoom, [], todayStr, tomorrowStr, { isWalkInToday: true }),
        true,
        'Walk-in today must accept clean available room'
      );
    });
  });

  describe('Requirement 1b: Active Occupancy Protection (checked_in & extended)', () => {
    it('blocks room for arrival today when a reservation has status checked_in, even if checkOutDate is today', () => {
      const room201 = sampleRooms.find((r) => r.id === 'rm-201')!; // status: available
      const activeReservations: Reservation[] = [
        {
          id: 'res-act-1',
          bookingNumber: 'BK-ACT1',
          guestId: 'gst-1',
          roomId: 'rm-201',
          checkInDate: yesterdayStr,
          checkOutDate: todayStr, // Guest departs today, but has NOT checked out yet (status still checked_in)
          totalNights: '1',
          totalAmount: '1200',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // Under pure date-overlap rules [yesterday, today) does not overlap [today, tomorrow).
      // BUT because the guest is STILL checked_in, the room is actively occupied and cannot be sold!
      const available = isRoomAvailable(room201, activeReservations, todayStr, tomorrowStr);
      assert.strictEqual(
        available,
        false,
        'Room 201 must be UNAVAILABLE today because guest is actively checked_in (same-day turnover not yet completed)'
      );
    });

    it('blocks room for arrival today when a reservation has status extended', () => {
      const room202 = sampleRooms.find((r) => r.id === 'rm-202')!; // status: available
      const activeReservations: Reservation[] = [
        {
          id: 'res-ext-1',
          bookingNumber: 'BK-EXT1',
          guestId: 'gst-2',
          roomId: 'rm-202',
          checkInDate: yesterdayStr,
          checkOutDate: todayStr,
          totalNights: '1',
          totalAmount: '1200',
          depositAmount: '500',
          status: 'extended',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const available = isRoomAvailable(room202, activeReservations, todayStr, tomorrowStr);
      assert.strictEqual(
        available,
        false,
        'Room 202 must be UNAVAILABLE today because guest reservation is extended'
      );
    });

    it('blocks room for arrival today if an active reservation has an overdue departure date in the past', () => {
      const room201 = sampleRooms.find((r) => r.id === 'rm-201')!;
      const overdueReservations: Reservation[] = [
        {
          id: 'res-overdue-1',
          bookingNumber: 'BK-OD1',
          guestId: 'gst-3',
          roomId: 'rm-201',
          checkInDate: '2026-11-01',
          checkOutDate: yesterdayStr, // scheduled departure was yesterday, but guest never checked out!
          totalNights: '1',
          totalAmount: '1200',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const available = isRoomAvailable(room201, overdueReservations, todayStr, tomorrowStr);
      assert.strictEqual(
        available,
        false,
        'Room 201 must be UNAVAILABLE today when in-house guest has overdue checkout'
      );
    });

    it('blocks room for arrival today when reservation matches room by roomNumber even if roomId is null', () => {
      const room201 = sampleRooms.find((r) => r.id === 'rm-201')!; // roomNumber: '201'
      const reservationByNumber: any = {
        id: 'res-by-num-1',
        bookingNumber: 'BK-NUM1',
        guestId: 'gst-num',
        roomId: null,
        roomNumber: '201',
        checkInDate: yesterdayStr,
        checkOutDate: todayStr,
        status: 'checked_in',
      };

      const available = isRoomAvailable(room201, [reservationByNumber], todayStr, tomorrowStr);
      assert.strictEqual(
        available,
        false,
        'Room 201 must be blocked when active guest matches by roomNumber'
      );
    });

    it('supports options.excludeReservationId when extending or modifying an active reservation', () => {
      const room201 = sampleRooms.find((r) => r.id === 'rm-201')!;
      const activeReservations: Reservation[] = [
        {
          id: 'res-self-1',
          bookingNumber: 'BK-SELF1',
          guestId: 'gst-1',
          roomId: 'rm-201',
          checkInDate: todayStr,
          checkOutDate: tomorrowStr,
          totalNights: '1',
          totalAmount: '1200',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // When excludeReservationId is NOT provided, it is blocked
      assert.strictEqual(
        isRoomAvailable(room201, activeReservations, todayStr, tomorrowStr),
        false
      );

      // When excludeReservationId matches res-self-1, the reservation does not self-block
      assert.strictEqual(
        isRoomAvailable(room201, activeReservations, todayStr, tomorrowStr, {
          excludeReservationId: 'res-self-1',
        }),
        true,
        'Active reservation must not block itself when excludeReservationId is specified'
      );
    });
  });

  describe('Requirement 1c: Future Dates Availability Rules', () => {
    it('allows cleaning or currently occupied rooms to be booked for future dates when there is no future overlap', () => {
      const cleaningRoom = sampleRooms.find((r) => r.id === 'rm-103')!; // cleaning today
      const occupiedRoom = sampleRooms.find((r) => r.id === 'rm-101')!; // occupied today

      // Active reservation ending before next week
      const currentReservations: Reservation[] = [
        {
          id: 'res-cur-1',
          bookingNumber: 'BK-CUR1',
          guestId: 'gst-1',
          roomId: 'rm-101',
          checkInDate: yesterdayStr,
          checkOutDate: tomorrowStr,
          totalNights: '2',
          totalAmount: '2400',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // Next week check-in: cleaning room 103 should be available in the future
      assert.strictEqual(
        isRoomAvailable(cleaningRoom, [], nextWeekStr, nextWeekEndStr),
        true,
        'Cleaning room 103 should be available for future bookings'
      );

      // Next week check-in: currently occupied room 101 should be available next week
      assert.strictEqual(
        isRoomAvailable(occupiedRoom, currentReservations, nextWeekStr, nextWeekEndStr),
        true,
        'Room 101 currently occupied today should be bookable for next week once current stay completes'
      );
    });

    it('blocks future bookings that overlap with confirmed, checked_in, or extended reservations', () => {
      const availableRoom = sampleRooms.find((r) => r.id === 'rm-201')!;
      const futureReservations: Reservation[] = [
        {
          id: 'res-fut-1',
          bookingNumber: 'BK-FUT1',
          guestId: 'gst-4',
          roomId: 'rm-201',
          checkInDate: nextWeekStr,
          checkOutDate: nextWeekEndStr,
          totalNights: '2',
          totalAmount: '2400',
          depositAmount: '500',
          status: 'confirmed',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      assert.strictEqual(
        isRoomAvailable(availableRoom, futureReservations, nextWeekStr, nextWeekEndStr),
        false,
        'Confirmed reservation next week must block overlapping booking'
      );
    });

    it('strictly keeps maintenance and out_of_order rooms blocked even for future dates', () => {
      const maintenanceRoom = sampleRooms.find((r) => r.id === 'rm-104')!;
      const outOfOrderRoom = sampleRooms.find((r) => r.id === 'rm-105')!;

      assert.strictEqual(
        isRoomAvailable(maintenanceRoom, [], nextWeekStr, nextWeekEndStr),
        false,
        'Maintenance room 104 must be unavailable for future dates'
      );
      assert.strictEqual(
        isRoomAvailable(outOfOrderRoom, [], nextWeekStr, nextWeekEndStr),
        false,
        'Out of order room 105 must be unavailable for future dates'
      );
    });

    it('ignores cancelled and checked_out reservations for future dates', () => {
      const availableRoom = sampleRooms.find((r) => r.id === 'rm-203')!;
      const inactiveReservations: Reservation[] = [
        {
          id: 'res-cx-1',
          bookingNumber: 'BK-CX1',
          guestId: 'gst-5',
          roomId: 'rm-203',
          checkInDate: nextWeekStr,
          checkOutDate: nextWeekEndStr,
          totalNights: '2',
          totalAmount: '2400',
          depositAmount: '500',
          status: 'cancelled',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'res-co-1',
          bookingNumber: 'BK-CO1',
          guestId: 'gst-6',
          roomId: 'rm-203',
          checkInDate: nextWeekStr,
          checkOutDate: nextWeekEndStr,
          totalNights: '2',
          totalAmount: '2400',
          depositAmount: '500',
          status: 'checked_out',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      assert.strictEqual(
        isRoomAvailable(availableRoom, inactiveReservations, nextWeekStr, nextWeekEndStr),
        true,
        'Cancelled and checked_out reservations must not block room inventory'
      );
    });
  });

  describe('Requirement 1d: getAvailableRoomsForDates Filters Out In-House & Physically Unavailable Rooms Today', () => {
    it('filters out occupied, reserved, cleaning, maintenance, out_of_order and active guest rooms from available dropdown list', () => {
      // Room 202 is physically marked available, but has an active in-house guest checking out today
      const reservations: Reservation[] = [
        {
          id: 'res-inhouse-202',
          bookingNumber: 'BK-202',
          guestId: 'gst-10',
          roomId: 'rm-202',
          checkInDate: yesterdayStr,
          checkOutDate: todayStr,
          totalNights: '1',
          totalAmount: '1200',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const availableForToday = getAvailableRoomsForDates(
        sampleRooms,
        reservations,
        todayStr,
        tomorrowStr
      );

      const availableRoomNumbers = availableForToday.map((r) => r.roomNumber);

      // Verify that physically unavailable rooms are filtered out:
      assert.ok(!availableRoomNumbers.includes('101'), 'Room 101 (occupied) must be filtered out');
      assert.ok(!availableRoomNumbers.includes('102'), 'Room 102 (reserved) must be filtered out');
      assert.ok(!availableRoomNumbers.includes('103'), 'Room 103 (cleaning) must be filtered out');
      assert.ok(!availableRoomNumbers.includes('104'), 'Room 104 (maintenance) must be filtered out');
      assert.ok(!availableRoomNumbers.includes('105'), 'Room 105 (out_of_order) must be filtered out');
      assert.ok(!availableRoomNumbers.includes('106'), 'Room 106 (checked_out) must be filtered out');

      // Verify that active in-house guest room 202 is filtered out:
      assert.ok(!availableRoomNumbers.includes('202'), 'Room 202 (active checked_in guest) must be filtered out');

      // Verify genuine available rooms are present:
      assert.ok(availableRoomNumbers.includes('201'), 'Room 201 (clean available) must be included');
      assert.ok(availableRoomNumbers.includes('203'), 'Room 203 (clean available) must be included');
      assert.strictEqual(availableForToday.length, 2, 'Exactly 2 clean available rooms should be returned');
    });

    it('works identically when isWalkInToday is passed', () => {
      const reservations: Reservation[] = [
        {
          id: 'res-inhouse-202',
          bookingNumber: 'BK-202',
          guestId: 'gst-10',
          roomId: 'rm-202',
          checkInDate: yesterdayStr,
          checkOutDate: todayStr,
          totalNights: '1',
          totalAmount: '1200',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const walkInRooms = getAvailableRoomsForDates(
        sampleRooms,
        reservations,
        todayStr,
        tomorrowStr,
        { isWalkInToday: true }
      );

      const roomNumbers = walkInRooms.map((r) => r.roomNumber);
      assert.deepStrictEqual(roomNumbers.sort(), ['201', '203']);
    });

    it('respects todayIsoString option override for deterministic date testing', () => {
      const mockToday = '2026-06-15';
      const mockTomorrow = '2026-06-16';

      const reservations: Reservation[] = [
        {
          id: 'res-mock-1',
          bookingNumber: 'BK-MOCK',
          guestId: 'gst-mock',
          roomId: 'rm-201',
          checkInDate: '2026-06-10',
          checkOutDate: '2026-06-15',
          totalNights: '5',
          totalAmount: '6000',
          depositAmount: '500',
          status: 'checked_in',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const result = getAvailableRoomsForDates(
        sampleRooms,
        reservations,
        mockToday,
        mockTomorrow,
        { todayIsoString: mockToday }
      );

      const ids = result.map((r) => r.id);
      // rm-201 has checked_in guest on mockToday -> excluded
      assert.ok(!ids.includes('rm-201'), 'rm-201 must be excluded when active guest exists on custom todayIsoString');
      // rm-202 and rm-203 are available -> included
      assert.ok(ids.includes('rm-202'));
      assert.ok(ids.includes('rm-203'));
    });
  });
});

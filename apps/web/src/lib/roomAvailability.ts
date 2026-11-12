import type { Room, Reservation } from '@keystay/types';
import type { ExtendedReservation } from '../hooks/useReservations';

export interface RoomAvailabilityOptions {
  isWalkInToday?: boolean;
  excludeReservationId?: string;
  todayIsoString?: string;
}

export type ReservationLike =
  | Reservation
  | ExtendedReservation
  | {
      id: string;
      roomId?: string | null;
      roomNumber?: string;
      checkInDate: string;
      checkOutDate: string;
      status: string;
    };

/**
 * Reservations with these statuses actively lock or occupy room inventory.
 * Cancelled, checked-out, and no-show reservations release inventory.
 */
export const BLOCKING_RESERVATION_STATUSES = new Set<string>([
  'confirmed',
  'checked_in',
  'extended',
]);

/**
 * Checks whether two date ranges [startA, endA) and [startB, endB) overlap.
 * Uses half-open intervals: departure on date D allows new arrival on date D.
 */
export function hasDateOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  const aIn = startA.split('T')[0];
  const aOut = endA.split('T')[0];
  const bIn = startB.split('T')[0];
  const bOut = endB.split('T')[0];

  return aIn < bOut && aOut > bIn;
}

/**
 * Evaluates whether a single room is available for the given date range.
 *
 * Rules:
 * 1. Physical Room Status:
 *    - 'maintenance' and 'out_of_order' rooms are strictly unavailable regardless of date.
 * 2. Explicit Same-Day Walk-In:
 *    - If isWalkInToday is true, room.status must strictly be 'available'.
 * 3. Same-Day or Past Arrival Guard (targetIn <= todayIsoString):
 *    - If checkInDate is today or earlier, room.status must strictly be 'available'
 *      ('occupied', 'reserved', 'cleaning', 'maintenance', 'out_of_order' are excluded).
 *    - Active Occupancy Protection: If ANY reservation for this room is currently 'checked_in'
 *      or 'extended' (excluding options.excludeReservationId), the room is strictly unavailable
 *      for arrival today, even if turnover has not completed or scheduled dates elapsed.
 * 4. General Date-Range Reservation Overlaps:
 *    - Any reservation for this room with status 'confirmed', 'checked_in', or 'extended'
 *      that overlaps with [checkInDate, checkOutDate) makes the room unavailable.
 *    - Same-day departure/arrival turnover is allowed for non-active bookings:
 *      if Res A departs on 2026-11-12 and Res B arrives on 2026-11-12, they do not conflict.
 *    - Excludes the reservation specified by options.excludeReservationId.
 */
export function isRoomAvailable(
  room: Room,
  reservations: ReservationLike[],
  checkInDate: string,
  checkOutDate: string,
  options?: RoomAvailabilityOptions | boolean
): boolean {
  if (!room || !checkInDate || !checkOutDate) return false;

  const isWalkInToday =
    typeof options === 'boolean' ? options : Boolean(options?.isWalkInToday);
  const excludeReservationId =
    typeof options === 'object' && options !== null ? options.excludeReservationId : undefined;
  const todayIsoString =
    (typeof options === 'object' && options !== null && options.todayIsoString) ||
    new Date().toISOString().split('T')[0];

  // 1. Maintenance and out-of-order rooms are strictly unavailable at all times
  if (room.status === 'maintenance' || room.status === 'out_of_order') {
    return false;
  }

  // 2. Walk-in today requires room to be physically available
  if (isWalkInToday && room.status !== 'available') {
    return false;
  }

  const targetIn = checkInDate.split('T')[0];
  const targetOut = checkOutDate.split('T')[0];

  // 3. Same-day or past check-in strict guard (targetIn <= todayIsoString)
  if (targetIn <= todayIsoString) {
    // Physical room status must be strictly 'available'
    // (i.e. 'occupied', 'reserved', 'cleaning', 'maintenance', 'out_of_order' are rejected)
    if (room.status !== 'available') {
      return false;
    }

    // Active occupancy protection:
    // If ANY reservation for this room currently has status 'checked_in' or 'extended',
    // a guest is actively occupying the room and it cannot be assigned for arrival today.
    const hasActiveGuest = reservations.some((r) => {
      const matchesRoom =
        (r.roomId && r.roomId === room.id) ||
        (room.roomNumber && (r as any).roomNumber === room.roomNumber);
      if (!matchesRoom) return false;
      if (excludeReservationId && r.id === excludeReservationId) return false;
      return r.status === 'checked_in' || r.status === 'extended';
    });

    if (hasActiveGuest) {
      return false;
    }
  }

  // 4. Check date-range reservation conflicts for [checkInDate, checkOutDate)
  for (const r of reservations) {
    const matchesRoom =
      (r.roomId && r.roomId === room.id) ||
      (room.roomNumber && (r as any).roomNumber === room.roomNumber);
    if (!matchesRoom) continue;
    if (excludeReservationId && r.id === excludeReservationId) continue;
    if (!BLOCKING_RESERVATION_STATUSES.has(r.status)) continue;

    if (hasDateOverlap(r.checkInDate, r.checkOutDate, targetIn, targetOut)) {
      return false;
    }
  }

  return true;
}

/**
 * Filters an array of rooms down to those genuinely available for the specified date range.
 */
export function getAvailableRoomsForDates(
  rooms: Room[],
  reservations: ReservationLike[],
  checkInDate: string,
  checkOutDate: string,
  options?: RoomAvailabilityOptions | boolean
): Room[] {
  if (!Array.isArray(rooms)) return [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  return rooms.filter((room) =>
    isRoomAvailable(room, safeReservations, checkInDate, checkOutDate, options)
  );
}

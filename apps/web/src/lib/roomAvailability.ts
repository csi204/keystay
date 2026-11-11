import type { Room, Reservation } from '@keystay/types';
import type { ExtendedReservation } from '../hooks/useReservations';

export interface RoomAvailabilityOptions {
  isWalkInToday?: boolean;
  excludeReservationId?: string;
}

export type ReservationLike =
  | Reservation
  | ExtendedReservation
  | {
      id: string;
      roomId?: string | null;
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
 *    - 'maintenance' and 'out_of_order' rooms are strictly unavailable.
 *    - For same-day walk-in (isWalkInToday: true), 'cleaning' and 'occupied' rooms are unavailable.
 * 2. Reservation Overlaps:
 *    - Any reservation for this room with status 'confirmed', 'checked_in', or 'extended'
 *      that overlaps with [checkInDate, checkOutDate) makes the room unavailable.
 *    - Same-day departure/arrival turnover is allowed: if Res A departs on 2026-11-12
 *      and Res B arrives on 2026-11-12, they do not conflict.
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
    typeof options === 'object' ? options?.excludeReservationId : undefined;

  // 1. Check physical room status
  if (room.status === 'maintenance' || room.status === 'out_of_order') {
    return false;
  }

  if (isWalkInToday && (room.status === 'cleaning' || room.status === 'occupied')) {
    return false;
  }

  // 2. Check reservation conflicts
  const targetIn = checkInDate.split('T')[0];
  const targetOut = checkOutDate.split('T')[0];

  for (const r of reservations) {
    if (!r.roomId || r.roomId !== room.id) continue;
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

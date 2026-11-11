import type { Room } from '@keystay/types';
import type { ExtendedReservation } from '../hooks/useReservations';
import { resolveGuestName } from '../hooks/useReservations';

/**
 * Builds room guest name and checkout mappings from active and confirmed reservations.
 * Prioritizes active in-house guests (checked_in, extended), followed by confirmed guests.
 */
export function getRoomGuestMapping(reservations: ExtendedReservation[]): {
  roomGuests: Record<string, string>;
  roomCheckouts: Record<string, string>;
} {
  const guests: Record<string, string> = {};
  const checkouts: Record<string, string> = {};

  // First pass: confirmed reservations
  reservations.forEach((r) => {
    if (!r.roomId) return;
    if (r.status === 'confirmed') {
      const name = r.guestName || resolveGuestName(r);
      if (name && name !== '—') {
        guests[r.roomId] = name;
      }
      if (r.checkOutDate) {
        checkouts[r.roomId] = r.checkOutDate;
      }
    }
  });

  // Second pass: checked_in or extended reservations (higher priority for live display)
  reservations.forEach((r) => {
    if (!r.roomId) return;
    if (r.status === 'checked_in' || (r.status as string) === 'extended') {
      const name = r.guestName || resolveGuestName(r);
      if (name && name !== '—') {
        guests[r.roomId] = name;
      }
      if (r.checkOutDate) {
        checkouts[r.roomId] = r.checkOutDate;
      }
    }
  });

  return { roomGuests: guests, roomCheckouts: checkouts };
}

/**
 * Reconciles room statuses deterministically against active reservations:
 * 1. checked_in | extended -> occupied
 * 2. confirmed -> reserved
 * 3. checked_out (today) -> cleaning
 * 4. DB status 'reserved' with no confirmed reservation -> available
 */
export function reconcileLiveRooms(
  rooms: Room[],
  reservations: ExtendedReservation[],
  todayStr: string = new Date().toISOString().split('T')[0]
): Room[] {
  const checkedInByRoomId = new Map<string, ExtendedReservation>();
  const confirmedByRoomId = new Map<string, ExtendedReservation>();
  const checkedOutTodayByRoomId = new Map<string, ExtendedReservation>();

  for (const r of reservations) {
    if (!r.roomId) continue;

    if (r.status === 'checked_in' || (r.status as string) === 'extended') {
      checkedInByRoomId.set(r.roomId, r);
    } else if (r.status === 'confirmed') {
      confirmedByRoomId.set(r.roomId, r);
    } else if (r.status === 'checked_out') {
      const outDate = r.actualCheckOut || r.checkOutDate || r.updatedAt;
      if (!outDate || outDate.startsWith(todayStr)) {
        checkedOutTodayByRoomId.set(r.roomId, r);
      }
    }
  }

  return rooms.map((room) => {
    // 1. checked_in or extended -> occupied
    if (checkedInByRoomId.has(room.id)) {
      if (room.status !== 'occupied') {
        return { ...room, status: 'occupied' as const };
      }
      return room;
    }

    // 2. confirmed -> reserved
    if (confirmedByRoomId.has(room.id)) {
      if (room.status !== 'reserved') {
        return { ...room, status: 'reserved' as const };
      }
      return room;
    }

    // 3. checked_out (today) -> cleaning
    if (checkedOutTodayByRoomId.has(room.id)) {
      if (room.status !== 'cleaning') {
        return { ...room, status: 'cleaning' as const };
      }
      return room;
    }

    // 4. Stale reserved check: if DB status is 'reserved' but no confirmed reservation exists
    if (room.status === 'reserved' && !confirmedByRoomId.has(room.id)) {
      return { ...room, status: 'available' as const };
    }

    return room;
  });
}

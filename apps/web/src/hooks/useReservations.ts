import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import type { Reservation } from '@keystay/types';

export interface ExtendedReservation extends Omit<Reservation, 'status'> {
  status: Reservation['status'] | 'extended';
  guestName?: string;
  roomNumber?: string;
  reservationCode?: string;
  nightlyRate?: number | string;
  guest?: {
    id?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    nationalId?: string;
  } | null;
  bookingSource?: 'walk_in' | 'phone' | 'facebook';
  paymentStatus?: 'unpaid' | 'paid';
  paymentSlipUrl?: string;
  paymentSlipRef?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
}

/**
 * Resolves the guest display name from reservation data.
 * Checks nested res.guest.fullName first, falls back to top-level res.guestName,
 * or returns '—' as placeholder.
 */
export function resolveGuestName(res?: {
  guest?: { fullName?: string | null } | null;
  guestName?: string | null;
} | null): string {
  if (!res) return '—';
  if (res.guest && typeof res.guest.fullName === 'string' && res.guest.fullName.trim()) {
    return res.guest.fullName.trim();
  }
  if (typeof res.guestName === 'string' && res.guestName.trim()) {
    return res.guestName.trim();
  }
  return '—';
}

export function useReservations() {
  const [reservations, setReservations] = useState<ExtendedReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiFetch<ExtendedReservation[]>('/api/reservations');

    if (res.isOffline) {
      setIsOffline(true);
    } else {
      setIsOffline(false);
    }

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      // Map guestName using resolveGuestName so res.guest.fullName is reliably surfaced
      const mapped = res.data.map((r) => ({
        ...r,
        guestName: resolveGuestName(r),
      }));
      // Sort newest first
      const sorted = [...mapped].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReservations(sorted);
    }

    setLastRefreshed(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const createReservation = async (data: {
    guestName: string;
    phone: string;
    email?: string;
    idCardNumber?: string;
    nationalIdOrPassport?: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
    nightlyRate?: number;
    numGuests?: number;
    guestsCount?: number;
    bookingSource?: 'walk_in' | 'phone' | 'facebook';
    paymentStatus?: 'unpaid' | 'paid';
    paymentSlipUrl?: string;
    paymentSlipRef?: string;
  }) => {
    const res = await apiFetch<Reservation>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        nightlyRate: data.nightlyRate ?? 1000,
        numGuests: data.numGuests ?? 1,
      }),
    });
    if (res.data) {
      await fetchReservations();
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to create reservation' };
  };

  const checkInReservation = async (id: string, nationalIdOrPassport: string) => {
    const res = await apiFetch(`/api/reservations/${id}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ nationalIdOrPassport, idCardNumber: nationalIdOrPassport }),
    });
    if (!res.error) {
      await fetchReservations();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const walkInCheckIn = async (data: {
    roomId: string;
    guestName: string;
    phone: string;
    nationalIdOrPassport: string;
    idCardNumber?: string;
    email?: string;
    guestsCount?: number;
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
    paymentMethod?: string;
  }) => {
    const res = await apiFetch('/api/reservations/walk-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.error) {
      await fetchReservations();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  return {
    reservations,
    loading,
    error,
    isOffline,
    lastRefreshed,
    refresh: fetchReservations,
    createReservation,
    checkInReservation,
    walkInCheckIn,
  };
}


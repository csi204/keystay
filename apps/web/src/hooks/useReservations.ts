import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Reservation } from '@keystay/types';

export interface ExtendedReservation extends Reservation {
  guestName?: string;
  roomNumber?: string;
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
      // Sort newest first
      const sorted = [...res.data].sort(
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
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
  }) => {
    const res = await apiFetch<Reservation>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.data) {
      await fetchReservations();
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to create reservation' };
  };

  const checkInReservation = async (id: string, nationalIdOrPassport: string) => {
    const res = await apiFetch(`/api/reservations/${id}/check-in`, {
      method: 'PUT',
      body: JSON.stringify({ nationalIdOrPassport }),
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
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
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

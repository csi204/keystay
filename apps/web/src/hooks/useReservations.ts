import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';
import type { Reservation, RoomType } from '@keystay/types';

export interface ExtendedReservation extends Omit<Reservation, 'status'> {
  status: Reservation['status'] | 'extended';
  guestName?: string;
  roomNumber?: string;
  roomTypeName?: string;
  reservationCode?: string;
  nightlyRate?: number | string;
  subtotal?: number | string;
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

/**
 * Resolves the pre-VAT nightly room rate for a reservation.
 * Priority: roomType.basePrice -> reservation.nightlyRate -> reservation.nightly_rate
 * -> reservation.subtotal / totalNights -> reservation.totalAmount / totalNights -> fallbackRate.
 */
export function resolveReservationNightlyRate(
  reservation?: (Partial<ExtendedReservation> & {
    nightly_rate?: number | string | null;
    subtotal?: number | string | null;
  }) | null,
  roomType?: Pick<RoomType, 'basePrice'> | null,
  fallbackRate = 1000
): number {
  const basePrice = Number(roomType?.basePrice);
  if (Number.isFinite(basePrice) && basePrice > 0) {
    return basePrice;
  }

  const explicitRate = Number(reservation?.nightlyRate);
  if (Number.isFinite(explicitRate) && explicitRate > 0) {
    return explicitRate;
  }

  const snakeRate = Number(reservation?.nightly_rate);
  if (Number.isFinite(snakeRate) && snakeRate > 0) {
    return snakeRate;
  }

  const nights = Number(reservation?.totalNights);
  if (Number.isFinite(nights) && nights > 0) {
    const subtotal = Number(reservation?.subtotal);
    if (Number.isFinite(subtotal) && subtotal > 0) {
      return Math.round(subtotal / nights);
    }
    const totalAmount = Number(reservation?.totalAmount);
    if (Number.isFinite(totalAmount) && totalAmount > 0) {
      return Math.round(totalAmount / nights);
    }
  }

  return fallbackRate;
}

async function createInitialPaidBill(params: {
  reservationId: string;
  guestName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  nightlyRate?: number | string;
  depositAmount?: string | number;
  paymentMethod?: string;
  createdRes?: any;
}) {
  const checkInDate = new Date(params.checkInDate);
  const checkOutDate = new Date(params.checkOutDate);
  const diffDays = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
  const nights = Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 1;
  const nightlyRate =
    Number(params.nightlyRate) ||
    (params.createdRes?.nightlyRate ? Number(params.createdRes.nightlyRate) : 0) ||
    Number(params.createdRes?.roomPrice || params.createdRes?.roomRate || params.createdRes?.nightly_rate) ||
    1000;
  const depositDeducted = Number(params.depositAmount || 0);

  await apiFetch('/api/bills', {
    method: 'POST',
    body: JSON.stringify({
      reservationId: params.reservationId,
      guestName: params.guestName,
      roomNumber: params.roomNumber,
      depositDeducted,
      serviceChargeRate: 0,
      paymentMethod: params.paymentMethod,
      status: 'paid',
      items: [
        {
          category: 'room',
          itemType: 'room_charge',
          description: `Room Charge (${nights} nights)`,
          quantity: nights,
          unitPrice: nightlyRate,
          isPaid: true,
        },
      ],
    }),
  }).catch((e) => console.warn('Failed to auto-create initial bill:', e));
}

export function useReservations() {
  const [reservations, setReservations] = useState<ExtendedReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const hasLoadedOnceRef = useRef<boolean>(false);

  const fetchReservations = useCallback(async (options?: boolean | { forceLoading?: boolean }) => {
    const forceLoading =
      options === true || (typeof options === 'object' && options !== null && options.forceLoading === true);
    if (!hasLoadedOnceRef.current || forceLoading) {
      setLoading(true);
    }
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

    hasLoadedOnceRef.current = true;
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
    paymentMethod?: string;
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
        numGuests: data.numGuests ?? data.guestsCount ?? 1,
      }),
    });
    if (res.data) {
      const createdRes = res.data as any;
      const reservationId = createdRes?.id || createdRes?.reservationId;
      if (data.paymentStatus === 'paid' && reservationId) {
        await createInitialPaidBill({
          reservationId,
          guestName: data.guestName,
          roomNumber: createdRes?.roomNumber || createdRes?.room_number || data.roomId.replace(/^rm-/, ''),
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          nightlyRate: data.nightlyRate,
          depositAmount: data.depositAmount,
          paymentMethod: data.paymentMethod,
          createdRes,
        });
      }
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
    numGuests?: number;
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
    nightlyRate?: number | string;
    paymentMethod?: string;
    bookingSource?: 'walk_in' | 'phone' | 'facebook';
    paymentStatus?: 'unpaid' | 'paid';
    paymentSlipUrl?: string;
    paymentSlipRef?: string;
  }) => {
    const payload = {
      ...data,
      numGuests: data.numGuests || data.guestsCount || 1,
      bookingSource: data.bookingSource || 'walk_in',
      paymentStatus: data.paymentStatus || 'paid',
      paymentSlipUrl: data.paymentSlipUrl,
      paymentSlipRef: data.paymentSlipRef,
    };
    const res = await apiFetch<any>('/api/reservations/walk-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.error) {
      const createdRes = res.data;
      const reservationId = createdRes?.id || (createdRes as any)?.reservationId;
      if (reservationId) {
        const effectiveRate =
          Number(data.nightlyRate) ||
          (createdRes?.nightlyRate ? Number(createdRes.nightlyRate) : 0) ||
          Number((data as any).roomPrice || (data as any).roomRate || (createdRes as any)?.nightly_rate) ||
          1000;
        await createInitialPaidBill({
          reservationId,
          guestName: data.guestName,
          roomNumber: createdRes?.roomNumber || (createdRes as any)?.room_number || data.roomId.replace(/^rm-/, ''),
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          nightlyRate: effectiveRate,
          depositAmount: data.depositAmount,
          paymentMethod: data.paymentMethod,
          createdRes,
        });
      }
      await fetchReservations();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const verifyPaymentSlip = async (
    id: string,
    data: { paymentSlipRef?: string; paymentSlipUrl?: string }
  ) => {
    const res = await apiFetch<ExtendedReservation>(`/api/reservations/${id}/slip`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.error && res.data) {
      await fetchReservations();
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to verify payment slip' };
  };

  const cancelReservation = async (id: string, reason?: string, note?: string) => {
    const res = await apiFetch(`/api/reservations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, note, notes: note }),
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
    verifyPaymentSlip,
    cancelReservation,
  };
}


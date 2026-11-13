import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ExtendedReservation, resolveGuestName, resolveReservationNightlyRate } from '@/hooks/useReservations';
import { Room, RoomType } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/context/ToastContext';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { apiFetch } from '@/lib/api';
import { CustomDatePicker } from '../common/CustomDatePicker';
import {
  X,
  CalendarPlus,
  Calendar,
  DollarSign,
  AlertCircle,
  Moon,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export interface ExtendStayModalProps {
  reservation: ExtendedReservation | null;
  room?: Room | null;
  roomType?: RoomType | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedReservation?: ExtendedReservation) => void;
  onConfirm?: (
    reservationId: string,
    newCheckOutDate: string,
    extraNights: number,
    extraCharge: number
  ) => Promise<{ success: boolean; error?: string; data?: ExtendedReservation }>;
}

export async function syncExtensionChargeToBill(params: {
  reservation: ExtendedReservation;
  extraNights: number;
  nightlyRate: number;
  prevNights: number;
  guestDisplayName: string;
  roomDisplayNumber: string;
  roomTypeName?: string;
  locale: string;
}): Promise<void> {
  const {
    reservation,
    extraNights,
    nightlyRate,
    prevNights,
    guestDisplayName,
    roomDisplayNumber,
    roomTypeName,
    locale,
  } = params;

  if (extraNights <= 0) return;

  let targetBillId: string | undefined;
  const existingBillRes = await apiFetch<{ id?: string }>(
    `/api/bills/by-reservation/${reservation.id}`
  );
  targetBillId = existingBillRes?.data?.id;

  if (!targetBillId) {
    const isInitialPaid = reservation.paymentStatus === 'paid';
    const initialDesc = roomTypeName
      ? locale === 'th'
        ? `ค่าห้องพัก ${roomTypeName} (${prevNights} คืน)`
        : `${roomTypeName} (${prevNights} nights)`
      : locale === 'th'
        ? `ค่าห้องพักเบื้องต้น (${prevNights} คืน)`
        : `Room Charge (${prevNights} nights)`;

    const createRes = await apiFetch<{ id?: string }>('/api/bills', {
      method: 'POST',
      body: JSON.stringify({
        reservationId: reservation.id,
        guestName: guestDisplayName,
        roomNumber: roomDisplayNumber,
        serviceChargeRate: 0,
        depositDeducted: Number(reservation.depositAmount || 0),
        status: isInitialPaid ? 'paid' : 'pending',
        items: [
          {
            category: 'room',
            itemType: 'room_charge',
            description: initialDesc,
            quantity: prevNights,
            unitPrice: nightlyRate,
            isPaid: isInitialPaid,
          },
        ],
      }),
    });
    targetBillId = createRes?.data?.id;
  }

  if (targetBillId) {
    await apiFetch(`/api/bills/${targetBillId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        itemType: 'room_charge',
        category: 'room',
        description:
          locale === 'th'
            ? `ขยายเวลาเข้าพัก (+${extraNights} คืน)`
            : `Extended Stay (+${extraNights} nights)`,
        quantity: extraNights,
        unitPrice: nightlyRate,
        isPaid: false,
      }),
    });
  }
}

export const ExtendStayModal: React.FC<ExtendStayModalProps> = ({
  reservation,
  room,
  roomType,
  isOpen,
  onClose,
  onSuccess,
  onConfirm,
}) => {
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const toast = useToast();

  const [newCheckOutDate, setNewCheckOutDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Compute minimum selectable date (current checkOutDate + 1 day)
  const minDateStr = useMemo(() => {
    if (!reservation?.checkOutDate) return '';
    const cur = new Date(reservation.checkOutDate);
    cur.setDate(cur.getDate() + 1);
    return cur.toISOString().split('T')[0];
  }, [reservation?.checkOutDate]);

  const prevOpenRef = useRef<boolean>(false);
  const prevReservationIdRef = useRef<string | undefined>(undefined);

  // Reset state ONLY when opened (false -> true) or reservation.id changes
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    const prevResId = prevReservationIdRef.current;
    prevOpenRef.current = isOpen;
    prevReservationIdRef.current = reservation?.id;

    if (!isOpen || !reservation?.checkOutDate) return;

    const justOpened = !wasOpen && isOpen;
    const switchedReservation = reservation.id !== prevResId;
    if (justOpened || switchedReservation) {
      const cur = new Date(reservation.checkOutDate);
      cur.setDate(cur.getDate() + 1);
      const nextDayStr = cur.toISOString().split('T')[0];
      setNewCheckOutDate(nextDayStr);
      setError(null);
    }
  }, [isOpen, reservation?.id, reservation?.checkOutDate]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine nightly rate
  const nightlyRate = useMemo(
    () => resolveReservationNightlyRate(reservation, roomType, 1000),
    [
      roomType?.basePrice,
      reservation?.nightlyRate,
      (reservation as any)?.nightly_rate,
      reservation?.subtotal,
      reservation?.totalAmount,
      reservation?.totalNights,
    ]
  );

  // Calculate extra nights
  const extraNights = useMemo(() => {
    if (!reservation?.checkOutDate || !newCheckOutDate) return 0;
    const curDate = new Date(reservation.checkOutDate);
    const targetDate = new Date(newCheckOutDate);
    const diffTime = targetDate.getTime() - curDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [reservation?.checkOutDate, newCheckOutDate]);

  // Calculate extra charge
  const extraCharge = useMemo(() => {
    return extraNights * nightlyRate;
  }, [extraNights, nightlyRate]);

  if (!isOpen || !reservation) return null;

  const guestDisplayName =
    resolveGuestName(reservation) ||
    reservation.guestName ||
    reservation.guest?.fullName ||
    '—';

  const roomDisplayNumber =
    room?.roomNumber || reservation.roomNumber || '—';

  const roomTypeName = localizeRoomType(
    roomType?.name || (reservation as any)?.roomType || (reservation as any)?.roomTypeName || (reservation as any)?.room?.roomType?.name,
    locale
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCheckOutDate || extraNights <= 0 || newCheckOutDate <= reservation.checkOutDate) {
      setError(t('extend.errorInvalidDate'));
      return;
    }

    const prevNights = Math.max(1, Number(reservation.totalNights) || 1);
    setError(null);
    setIsSubmitting(true);

    try {
      const res: { success: boolean; error?: string; data?: ExtendedReservation | null } = onConfirm
        ? await onConfirm(reservation.id, newCheckOutDate, extraNights, extraCharge)
        : await apiFetch<ExtendedReservation>(`/api/reservations/${reservation.id}/extend-stay`, {
            method: 'POST',
            body: JSON.stringify({
              newCheckOutDate,
              additionalDeposit: 0,
            }),
          }).then((r) => ({
            success: !r.error,
            error: r.error || undefined,
            data: r.data,
          }));

      if (res.success) {
        try {
          await syncExtensionChargeToBill({
            reservation,
            extraNights,
            nightlyRate,
            prevNights,
            guestDisplayName,
            roomDisplayNumber,
            roomTypeName,
            locale,
          });
        } catch (billErr) {
          console.warn('Failed to append extension item to bill:', billErr);
        }

        toast.showSuccess(
          t('extend.successTitle') || (locale === 'th' ? 'ขยายเวลาเข้าพักสำเร็จ' : 'Stay Extended'),
          t('extend.successDesc') || (locale === 'th' ? `ขยายเวลาเข้าพักถึง ${newCheckOutDate} แล้ว` : `Extended stay until ${newCheckOutDate}`)
        );
        const nextTotalNights = (res.data as any)?.totalNights ?? String(prevNights + extraNights);
        const nextNightlyRate = (res.data as any)?.nightlyRate ?? String(nightlyRate);
        const nextTotalAmount = res.data?.totalAmount
          ? String(res.data.totalAmount)
          : String(
              (Number(reservation.totalAmount) > 0
                ? Number(reservation.totalAmount)
                : prevNights * nightlyRate) + extraCharge
            );
        const updatedRes: ExtendedReservation = {
          ...reservation,
          ...((res.data as ExtendedReservation) || {}),
          guest: (res.data as any)?.guest || reservation.guest,
          guestName: (res.data as any)?.guestName || reservation.guestName,
          roomNumber: (res.data as any)?.roomNumber || reservation.roomNumber,
          checkOutDate: newCheckOutDate,
          totalNights: String(nextTotalNights),
          nightlyRate: nextNightlyRate,
          totalAmount: nextTotalAmount,
          status: 'extended',
        };
        onSuccess?.(updatedRes);
        onClose();
      } else {
        setError(res.error || t('extend.errorGeneral'));
      }
    } catch (err: any) {
      setError(err?.message || t('extend.errorGeneral'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-slate-900" />
            <h2 className="text-xl font-bold text-slate-900">{t('extend.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Reservation Details Card */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">{t('extend.roomNumber')}</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {roomDisplayNumber}
              </span>
            </div>
            {roomTypeName && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">{t('common.roomType')}</span>
                <span className="text-sm font-semibold text-slate-900">{roomTypeName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">{t('extend.guestName')}</span>
              <span className="text-sm font-semibold text-slate-900">{guestDisplayName}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-600">{t('extend.currentCheckOut')}</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                {formatDate(reservation.checkOutDate, 'short')}
              </span>
            </div>
            <div className="flex justify-between items-center font-mono tabular-nums text-sm">
              <span className="text-sm font-medium text-slate-600 font-sans">{t('extend.nightlyRate')}</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(nightlyRate)}
              </span>
            </div>
          </div>

          {/* New Check-out Date Input */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {t('extend.newCheckOut')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
            </label>
            <CustomDatePicker
              required
              min={minDateStr}
              placement="top"
              value={newCheckOutDate}
              onChange={(date) => {
                setNewCheckOutDate(date);
                setError(null);
              }}
              className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums"
            />
            {newCheckOutDate && newCheckOutDate <= reservation.checkOutDate && (
              <p className="text-xs text-red-600 mt-1">
                {t('extend.errorInvalidDate')}
              </p>
            )}
          </div>

          {/* Extension Summary Card */}
          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200 text-sm text-emerald-950 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-800 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-emerald-600" />
                {t('extend.extraNights')}
              </span>
              <span className="font-mono font-bold tabular-nums text-base text-emerald-900">
                +{extraNights} {t('common.nights')}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200/80">
              <span className="text-sm font-medium text-emerald-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                {t('extend.extraCharge')}
              </span>
              <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(extraCharge)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || extraNights <= 0 || newCheckOutDate <= reservation.checkOutDate}
              className="px-4 text-sm font-semibold py-2.5 text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? t('extend.submitting') : t('extend.confirmButton')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

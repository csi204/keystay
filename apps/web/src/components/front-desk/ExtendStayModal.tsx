import React, { useState, useEffect, useMemo } from 'react';
import { ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { Room, RoomType } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
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
  onSuccess?: () => void;
  onConfirm?: (
    reservationId: string,
    newCheckOutDate: string,
    extraNights: number,
    extraCharge: number
  ) => Promise<{ success: boolean; error?: string }>;
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

  // Reset state when opened or reservation changes
  useEffect(() => {
    if (isOpen && reservation?.checkOutDate) {
      const cur = new Date(reservation.checkOutDate);
      cur.setDate(cur.getDate() + 1);
      const nextDayStr = cur.toISOString().split('T')[0];
      setNewCheckOutDate(nextDayStr);
      setError(null);
    }
  }, [isOpen, reservation?.checkOutDate]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine nightly rate
  const nightlyRate = useMemo(() => {
    if (roomType?.basePrice) {
      return Number(roomType.basePrice);
    }
    if (reservation?.totalAmount && reservation?.totalNights && Number(reservation.totalNights) > 0) {
      return Math.round(Number(reservation.totalAmount) / Number(reservation.totalNights));
    }
    return 1000;
  }, [roomType?.basePrice, reservation?.totalAmount, reservation?.totalNights]);

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

    setError(null);
    setIsSubmitting(true);

    try {
      if (onConfirm) {
        const res = await onConfirm(
          reservation.id,
          newCheckOutDate,
          extraNights,
          extraCharge
        );
        if (res.success) {
          onSuccess?.();
          onClose();
        } else {
          setError(res.error || t('extend.errorGeneral'));
        }
      } else {
        const res = await apiFetch(`/api/reservations/${reservation.id}/extend`, {
          method: 'PUT',
          body: JSON.stringify({
            newCheckOutDate,
            extraNights,
            extraCharge,
          }),
        });

        if (!res.error) {
          onSuccess?.();
          onClose();
        } else {
          setError(res.error || t('extend.errorGeneral'));
        }
      }
    } catch (err: any) {
      setError(err?.message || t('extend.errorGeneral'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              {t('extend.newCheckOut')}
            </label>
            <CustomDatePicker
              required
              min={minDateStr}
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

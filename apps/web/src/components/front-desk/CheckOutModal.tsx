import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { RoomType } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { apiFetch } from '@/lib/api';
import {
  X,
  LogOut,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export interface CheckOutModalProps {
  reservation: ExtendedReservation | null;
  roomType?: RoomType | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onConfirm?: (
    reservationId: string,
    data: {
      keyCardReturned: boolean;
      note?: string;
      actualCheckOut: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  reservation,
  roomType,
  isOpen,
  onClose,
  onSuccess,
  onConfirm,
}) => {
  const navigate = useNavigate();
  const { t, locale, formatCurrency, formatDateRange } = useI18n();

  const [keyCardReturned, setKeyCardReturned] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setKeyCardReturned(true);
      setNote('');
      setError(null);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !reservation) return null;

  const guestDisplayName =
    resolveGuestName(reservation) ||
    reservation.guestName ||
    reservation.guest?.fullName ||
    '—';

  const roomTypeName = localizeRoomType(
    roomType?.name || (reservation as any)?.roomType || (reservation as any)?.roomTypeName || (reservation as any)?.room?.roomType?.name,
    locale
  );

  const depositAmountNum = Number(reservation.depositAmount || 1000);
  const depositFormatted = formatCurrency(depositAmountNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const actualCheckOut = new Date().toISOString();
    const payload = {
      actualCheckOut,
      keyCardReturned,
      note: note.trim() || undefined,
    };

    try {
      let isSuccess = false;
      let errMsg: string | undefined;

      if (onConfirm) {
        const res = await onConfirm(reservation.id, payload);
        isSuccess = res.success;
        errMsg = res.error;
      } else {
        const res = await apiFetch(`/api/reservations/${reservation.id}/check-out`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        isSuccess = !res.error;
        errMsg = res.error || undefined;
      }

      if (isSuccess) {
        onSuccess?.();
        onClose();

        // If pending balance remains or not fully paid, forward to Cashier Folio
        if ((reservation as any).paymentStatus !== 'paid') {
          navigate('/front-desk/billing', {
            state: {
              reservationId: reservation.id,
              roomId: reservation.roomId,
              guestId: reservation.guestId,
            },
          });
        }
      } else {
        setError(errMsg || t('checkout.errorGeneral'));
      }
    } catch (err: any) {
      setError(err?.message || t('checkout.errorGeneral'));
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
            <LogOut className="w-4 h-4 text-slate-900" />
            <h2 className="text-sm font-bold text-slate-900">{t('checkout.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Stay Summary Card */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{t('checkout.bookingNumber')}</span>
              <span className="font-mono font-bold tabular-nums text-slate-900">
                {reservation.bookingNumber || reservation.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{t('checkout.guestName')}</span>
              <span className="font-medium text-slate-900">{guestDisplayName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{t('checkout.roomNumber')}</span>
              <span className="font-mono font-bold tabular-nums text-slate-900">
                {reservation.roomNumber || '—'}
              </span>
            </div>
            {roomTypeName && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t('common.roomType')}</span>
                <span className="font-medium text-slate-900">{roomTypeName}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-mono tabular-nums text-[11px] pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-sans">{t('checkout.stayPeriod')}</span>
              <span className="text-slate-700">
                {formatDateRange(
                  reservation.checkInDate,
                  reservation.checkOutDate,
                  reservation.totalNights
                )}
              </span>
            </div>
            <div className="flex justify-between items-center font-mono tabular-nums text-[11px]">
              <span className="text-slate-500 font-sans">{t('common.total')}</span>
              <span className="text-slate-900 font-bold">
                {formatCurrency(reservation.totalAmount || 0)}
              </span>
            </div>
          </div>

          {/* Key Card Return Checkbox */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 shadow-sm">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keyCardReturned}
                onChange={(e) => setKeyCardReturned(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                  {t('checkout.keyCardReturned')}
                </span>
              </div>
            </label>

            {/* Key Deposit Refund Card / Notification */}
            {keyCardReturned ? (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('checkout.keyDepositRefundTitle')}</span>
                </div>
                <p className="text-[11px] text-emerald-700 tabular-nums">
                  {t('checkout.keyDepositRefundNotice', { amount: depositFormatted })}
                </p>
              </div>
            ) : (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  {t('checkout.keyCardMissingWarning')}
                </span>
              </div>
            )}
          </div>

          {/* Notes field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('checkout.notes')}</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('checkout.notesPlaceholder')}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/front-desk/billing', {
                  state: {
                    reservationId: reservation.id,
                    roomId: reservation.roomId,
                    guestId: reservation.guestId,
                  },
                });
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{t('checkout.forwardBilling')}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isSubmitting ? t('checkout.submitting') : t('checkout.confirmButton')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

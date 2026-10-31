import React, { useState, useEffect } from 'react';
import { ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { useI18n } from '@/lib/i18n';
import { X, LogIn, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface CheckInModalProps {
  reservation: ExtendedReservation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reservationId: string, nationalIdOrPassport: string) => Promise<{ success: boolean; error?: string }>;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t, formatCurrency, formatDateRange } = useI18n();
  const [nationalIdOrPassport, setNationalIdOrPassport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNationalIdOrPassport('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !reservation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalIdOrPassport.trim()) {
      setError(t('checkin.errorRequired'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await onConfirm(reservation.id, nationalIdOrPassport.trim());
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || t('checkin.errorGeneral'));
    }
  };

  const guestDisplayName =
    resolveGuestName(reservation) ||
    reservation.guestName ||
    reservation.guest?.fullName ||
    '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">{t('checkin.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Reservation Summary */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('checkin.bookingNumber')}</span>
              <span className="font-mono font-bold text-slate-900">
                {reservation.bookingNumber || reservation.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('checkin.guestName')}</span>
              <span className="font-medium text-slate-900">{guestDisplayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('checkin.roomNumber')}</span>
              <span className="font-mono font-semibold text-slate-900">
                {reservation.roomNumber ? t('checkin.roomLabel', { room: reservation.roomNumber }) : '—'}
              </span>
            </div>
            <div className="flex justify-between font-mono text-[11px] pt-1 border-t border-slate-200">
              <span className="text-slate-500">{t('checkin.stayPeriod')}</span>
              <span className="text-slate-700">
                {formatDateRange(reservation.checkInDate, reservation.checkOutDate, reservation.totalNights)}
              </span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-500">{t('checkin.keyDeposit')}</span>
              <span className="text-emerald-700 font-semibold">
                {formatCurrency(reservation.depositAmount || 0)}
              </span>
            </div>
          </div>

          {/* National ID / Passport */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t('checkin.idLabel')}
            </label>
            <div className="relative">
              <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder={t('checkin.idPlaceholder')}
                value={nationalIdOrPassport}
                onChange={(e) => setNationalIdOrPassport(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {t('checkin.idHint')}
            </p>
          </div>

          {/* Checklist reminder */}
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('checkin.checklistTitle')}</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-emerald-800 space-y-0.5">
              <li>{t('checkin.checklist1')}</li>
              <li>{t('checkin.checklist2')}</li>
              <li>{t('checkin.checklist3')}</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
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
              <LogIn className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t('checkin.submitting') : t('checkin.confirmButton')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

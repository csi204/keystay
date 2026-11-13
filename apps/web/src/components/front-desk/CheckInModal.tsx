import React, { useState, useEffect } from 'react';
import { ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { RoomType } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType, localizeAmenity } from '@/lib/localizeMetadata';
import { ROOM_STATUS_CONFIG } from './RoomCard';
import { ActionConfirmModal } from '../common/ActionConfirmModal';
import {
  X,
  LogIn,
  ShieldCheck,
  BedDouble,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface CheckInModalProps {
  reservation: ExtendedReservation | null;
  roomType?: RoomType | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reservationId: string, nationalIdOrPassport: string) => Promise<{ success: boolean; error?: string }>;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  reservation,
  roomType,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t, locale, formatCurrency, formatDateRange } = useI18n();
  const [nationalIdOrPassport, setNationalIdOrPassport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNationalIdOrPassport('');
      setError(null);
      setIsConfirmOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isConfirmOpen && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirmOpen, isSubmitting, onClose]);

  if (!isOpen || !reservation) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalIdOrPassport.trim()) {
      setError(t('checkin.errorRequired'));
      return;
    }

    setError(null);
    setIsConfirmOpen(true);
  };

  const handleExecuteCheckIn = async () => {
    setIsConfirmOpen(false);
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

  const roomTypeName = localizeRoomType(
    roomType?.name || (reservation as any)?.roomType || (reservation as any)?.roomTypeName || (reservation as any)?.room?.roomType?.name,
    locale
  );

  const isAvailable = (reservation as any)?.room?.status === 'available';
  const roomStatusCfg = isAvailable ? ROOM_STATUS_CONFIG.available : ROOM_STATUS_CONFIG.reserved;
  const roomStatusLabel = isAvailable ? t('status.available') : t('status.reserved');

  const bedRaw =
    (roomType as any)?.bedType ||
    roomType?.amenities?.find((a) => a.toLowerCase().includes('bed')) ||
    'King Bed';
  const bedLabel = localizeAmenity(bedRaw, locale) || bedRaw;

  const capacityLabel = roomType?.capacity
    ? t('drawer.capacityCount', { count: roomType.capacity })
    : (locale === 'th' ? '2 ท่าน' : '2 Guests');

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-slate-900" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {locale === 'th' ? 'ยืนยันการเช็คอิน (Check-In Confirmation)' : 'Check-In Confirmation'}
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {t('checkin.bookingNumber')}: {reservation.bookingNumber || reservation.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" strokeWidth={1.75} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Room & Guest Summary Card */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3">
            {/* Top row: Room Number + Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('checkin.roomNumber')}</span>
                <span className="text-xl font-bold font-mono text-slate-950 tracking-tight tabular-nums">
                  {reservation.roomNumber ? t('checkin.roomLabel', { room: reservation.roomNumber }) : '—'}
                </span>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full text-xs px-2.5 py-0.5 font-semibold border shadow-2xs ${roomStatusCfg.bg} ${roomStatusCfg.text} ${roomStatusCfg.border}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${roomStatusCfg.dot}`} />
                <span>{roomStatusLabel}</span>
              </span>
            </div>

            {/* Room type and Spec microchips */}
            <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs font-medium text-slate-500">{t('common.roomType')}</span>
                <span className="font-semibold text-slate-900">{roomTypeName || '—'}</span>
              </div>

              {/* Spec microchips: BedDouble and Users */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1.5 shadow-2xs">
                  <BedDouble className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{bedLabel}</span>
                </span>
                <span className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1.5 shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{capacityLabel}</span>
                </span>
              </div>
            </div>

            {/* Guest Name & Stay Dates with Nights Counter */}
            <div className="space-y-2 pt-2 border-t border-slate-200/70 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t('checkin.guestName')}</span>
                <span className="font-semibold text-slate-900 truncate max-w-[220px]">{guestDisplayName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{t('checkin.stayPeriod')}</span>
                <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs">
                  <span className="text-slate-700">{formatDateRange(reservation.checkInDate, reservation.checkOutDate, reservation.totalNights)}</span>
                  <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-800 rounded font-semibold text-[11px]">
                    {reservation.totalNights || 1} {locale === 'th' ? 'คืน' : 'Nights'}
                  </span>
                </div>
              </div>

              {/* Key Deposit */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono tabular-nums">
                <span className="text-xs font-medium text-slate-500 font-sans">{t('checkin.keyDeposit')}</span>
                <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                  {formatCurrency(reservation.depositAmount || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* National ID / Passport */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              {t('checkin.idLabel')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} aria-hidden="true" />
              <input
                type="text"
                required
                placeholder={t('checkin.idPlaceholder')}
                value={nationalIdOrPassport}
                onChange={(e) => {
                  setNationalIdOrPassport(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full text-sm py-2.5 px-3 pl-9 bg-white text-slate-900 placeholder:text-slate-400 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono tabular-nums transition-all ${
                  error ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'
                }`}
              />
            </div>
            {error ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{error}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                {t('checkin.idHint')}
              </p>
            )}
          </div>

          {/* Checklist reminder */}
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-sm text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} aria-hidden="true" />
              <span>{t('checkin.checklistTitle')}</span>
            </div>
            <ul className="list-disc list-inside text-xs text-emerald-800 space-y-1">
              <li>{t('checkin.checklist1')}</li>
              <li>{t('checkin.checklist2')}</li>
              <li>{t('checkin.checklist3')}</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors active:scale-[0.98]"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 min-h-[44px] text-sm font-semibold py-2.5 text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              <span>
                {isSubmitting
                  ? t('checkin.submitting')
                  : (locale === 'th' ? 'ยืนยันการเช็คอิน (Confirm Check-In)' : t('checkin.confirmButton'))}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal before finalizing Check-In */}
      <ActionConfirmModal
        isOpen={isConfirmOpen}
        title={locale === 'th' ? 'ยืนยันดำเนินการเช็คอิน' : 'Confirm Check-In'}
        description={
          locale === 'th'
            ? 'กรุณาตรวจสอบข้อมูลแขก ห้องพัก และยอดมัดจำก่อนดำเนินการเข้าสู่ระบบ'
            : 'Please verify guest details, assigned room, and deposit before confirming check-in.'
        }
        confirmText={locale === 'th' ? 'ยืนยันเช็คอินทันที' : 'Confirm Check-In'}
        cancelText={t('common.cancel')}
        variant="primary"
        icon="check"
        isSubmitting={isSubmitting}
        onConfirm={handleExecuteCheckIn}
        onClose={() => setIsConfirmOpen(false)}
        summaryDetails={[
          {
            label: locale === 'th' ? 'ห้องพัก' : 'Room',
            value: reservation.roomNumber ? t('checkin.roomLabel', { room: reservation.roomNumber }) : '—',
          },
          {
            label: locale === 'th' ? 'ชื่อผู้เข้าพัก' : 'Guest Name',
            value: guestDisplayName,
          },
          {
            label: locale === 'th' ? 'วันที่เข้าพัก' : 'Stay Dates',
            value: `${formatDateRange(reservation.checkInDate, reservation.checkOutDate, reservation.totalNights)} (${reservation.totalNights || 1} ${locale === 'th' ? 'คืน' : 'Nights'})`,
          },
          {
            label: locale === 'th' ? 'บัตรประชาชน/พาสปอร์ต' : 'ID / Passport',
            value: nationalIdOrPassport.trim(),
          },
          {
            label: locale === 'th' ? 'เงินมัดจำคีย์การ์ด' : 'Key Card Deposit',
            value: (
              <span className="font-mono font-bold text-emerald-700">
                {formatCurrency(reservation.depositAmount || 0)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
};

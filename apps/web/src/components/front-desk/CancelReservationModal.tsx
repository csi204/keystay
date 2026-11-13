import React, { useState, useEffect } from 'react';
import type { Reservation } from '@keystay/types';
import type { ExtendedReservation } from '@/hooks/useReservations';
import { useI18n } from '@/lib/i18n';
import {
  X,
  AlertTriangle,
  User,
  Calendar,
  AlertCircle,
  FileText,
  DoorOpen,
} from 'lucide-react';

export const CANCELLATION_REASONS = [
  'ลูกค้าแจ้งขอยกเลิก (Guest Request)',
  'ไม่มาแสดงตัว (No-Show)',
  'เหตุฉุกเฉิน / สภาพอากาศ (Emergency)',
  'อื่นๆ (Other)',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export interface CancelReservationModalProps {
  reservation: ExtendedReservation | Reservation | any | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (reservationId: string, reason: string, note?: string) => Promise<{ success: boolean; error?: string }>;
  onCancelReservation?: (reservationId: string, reason: string, note?: string) => Promise<{ success: boolean; error?: string }>;
}

export const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onConfirm,
  onCancelReservation,
}) => {
  const { locale, formatCurrency, formatDateRange } = useI18n();

  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [cancellationNotes, setCancellationNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(CANCELLATION_REASONS[0]);
      setCancellationNotes('');
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [isOpen, reservation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !reservation) return null;

  const reservationId = reservation.id || '';
  const reservationCode = reservation.reservationCode || reservation.bookingNumber || reservation.id?.slice(0, 8) || '—';
  const guestName =
    reservation.guestName ||
    reservation.guest?.fullName ||
    (reservation as any)?.guest_name ||
    '—';
  const roomNumber = reservation.roomNumber || (reservation as any)?.room_number || '—';
  const totalAmount = reservation.totalAmount ?? reservation.total_amount ?? 0;
  const depositAmount = reservation.depositAmount ?? reservation.deposit_amount ?? 0;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const submitFn = onConfirm || onCancelReservation;
    if (!submitFn) {
      setIsSubmitting(false);
      onClose();
      return;
    }

    try {
      const result = await submitFn(reservationId, selectedReason, cancellationNotes.trim() || undefined);
      if (result.success) {
        onClose();
      } else {
        setErrorMessage(result.error || (locale === 'th' ? 'เกิดข้อผิดพลาดในการยกเลิกการจอง' : 'Failed to cancel reservation'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || (locale === 'th' ? 'เกิดข้อผิดพลาดในการยกเลิกการจอง' : 'Failed to cancel reservation'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <h3 id="cancel-modal-title" className="text-base font-bold text-slate-900">
                {locale === 'th' ? 'ยกเลิกการจองห้องพัก' : 'Cancel Reservation'}
              </h3>
              <p className="text-xs text-rose-700">
                {locale === 'th'
                  ? 'ห้องจะถูกปล่อยว่างกลับสู่ระบบทันที พร้อมบันทึกประวัติการยกเลิก'
                  : 'Room will be immediately released back to available and audit log recorded'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label={locale === 'th' ? 'ปิด' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Reservation Summary Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                {locale === 'th' ? 'รหัสการจอง' : 'Booking Code'}
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums bg-white px-2 py-0.5 rounded border border-slate-200">
                {reservationCode}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{locale === 'th' ? 'ผู้เข้าพัก' : 'Guest'}</span>
              </span>
              <span className="font-semibold text-slate-900">{guestName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5" />
                <span>{locale === 'th' ? 'หมายเลขห้อง' : 'Room Number'}</span>
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {roomNumber}
              </span>
            </div>

            {reservation.checkInDate && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{locale === 'th' ? 'กำหนดเข้าพัก' : 'Stay Dates'}</span>
                </span>
                <span className="font-mono text-slate-700 tabular-nums">
                  {formatDateRange(reservation.checkInDate, reservation.checkOutDate, reservation.totalNights)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-500">
                {locale === 'th' ? 'ยอดรวมห้องพัก' : 'Total Amount'}
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            {Number(depositAmount) > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <span>{locale === 'th' ? 'เงินมัดจำ' : 'Deposit'}</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-600">
                  {formatCurrency(depositAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Cancellation Reason Select */}
          <div className="space-y-1.5">
            <label
              htmlFor="cancellation-reason"
              className="block text-xs font-semibold text-slate-700"
            >
              {locale === 'th' ? 'เหตุผลการยกเลิก' : 'Cancellation Reason'} <span className="text-rose-500">*</span>
            </label>
            <select
              id="cancellation-reason"
              name="cancellationReason"
              aria-label={locale === 'th' ? 'เหตุผลการยกเลิก' : 'Cancellation Reason'}
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-xs font-medium px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50"
            >
              {CANCELLATION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Cancellation Notes Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="cancellation-notes"
              className="block text-xs font-semibold text-slate-700"
            >
              {locale === 'th' ? 'บันทึกเพิ่มเติม (ไม่บังคับ)' : 'Notes / Remarks (Optional)'}
            </label>
            <div className="relative">
              <textarea
                id="cancellation-notes"
                name="cancellationNotes"
                aria-label={locale === 'th' ? 'บันทึกเพิ่มเติม' : 'Cancellation notes'}
                rows={3}
                maxLength={500}
                value={cancellationNotes}
                onChange={(e) => setCancellationNotes(e.target.value)}
                placeholder={
                  locale === 'th'
                    ? 'ระบุรายละเอียดหรือข้อความเพิ่มเติมสำหรับการบันทึกประวัติ (Audit Log)...'
                    : 'Enter additional details or remarks for audit trail...'
                }
                disabled={isSubmitting}
                className="w-full text-xs font-normal p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50 resize-none"
              />
              <FileText className="w-3.5 h-3.5 text-slate-400 absolute right-3 bottom-3 pointer-events-none" />
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 space-y-1">
            <p className="font-semibold">
              {locale === 'th' ? 'ข้อควรระวังก่อนการยกเลิก:' : 'Important Notice:'}
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              <li>
                {locale === 'th'
                  ? 'สถานะการจองจะเปลี่ยนเป็น "ยกเลิก" (Cancelled) ทันที'
                  : 'Reservation status will transition immediately to Cancelled'}
              </li>
              <li>
                {locale === 'th'
                  ? 'การล็อกห้องพักจะถูกยกเลิก และห้องจะกลับมาว่างสำหรับการจองใหม่'
                  : 'Room lock will be released and inventory returned to available'}
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 min-h-[44px] text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              <span>
                {isSubmitting
                  ? (locale === 'th' ? 'กำลังยกเลิกการจอง...' : 'Cancelling...')
                  : (locale === 'th' ? 'ยืนยันยกเลิกการจอง' : 'Confirm Cancellation')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

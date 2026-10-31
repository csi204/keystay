import React, { useState, useEffect } from 'react';
import { ExtendedReservation } from '@/hooks/useReservations';
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
      setError('กรุณาระบุเลขบัตรประชาชน หรือเลขพาสปอร์ตของแขก');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await onConfirm(reservation.id, nationalIdOrPassport.trim());
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'เกิดข้อผิดพลาดในการเช็คอิน');
    }
  };

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
            <h2 className="text-sm font-bold text-slate-900">บันทึกเช็คอิน (Check-in)</h2>
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
              <span className="text-slate-500">รหัสการจอง:</span>
              <span className="font-mono font-bold text-slate-900">
                {reservation.bookingNumber || reservation.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ผู้เข้าพัก:</span>
              <span className="font-medium text-slate-900">{reservation.guestName || 'แขกผู้เข้าพัก'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ห้องพัก:</span>
              <span className="font-mono font-semibold text-slate-900">ห้อง {reservation.roomNumber || '—'}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px] pt-1 border-t border-slate-200">
              <span className="text-slate-500">ช่วงวันที่พัก:</span>
              <span className="text-slate-700">
                {reservation.checkInDate} ถึง {reservation.checkOutDate} ({reservation.totalNights} คืน)
              </span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-500">เงินมัดจำกุญแจ:</span>
              <span className="text-emerald-700 font-semibold">฿{reservation.depositAmount || '0'}</span>
            </div>
          </div>

          {/* National ID / Passport */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              เลขประจำตัวประชาชน หรือเลขพาสปอร์ต *
            </label>
            <div className="relative">
              <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="ระบุเลขบัตรประชาชน 13 หลัก หรือเลขพาสปอร์ต"
                value={nationalIdOrPassport}
                onChange={(e) => setNationalIdOrPassport(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * ข้อมูลนี้ใช้สำหรับบันทึกประวัติผู้เข้าพักตามข้อกำหนดกฎหมายโรงแรม
            </p>
          </div>

          {/* Checklist reminder */}
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>เช็คลิสต์ก่อนส่งมอบกุญแจ:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-emerald-800 space-y-0.5">
              <li>ตรวจสอบบัตรประชาชน/พาสปอร์ตตัวจริง</li>
              <li>รับเงินมัดจำกุญแจห้องพักครบถ้วน</li>
              <li>แจ้งกฎการเข้าพักและเวลารับประทานอาหารเช้า</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันเช็คอินและมอบกุญแจ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


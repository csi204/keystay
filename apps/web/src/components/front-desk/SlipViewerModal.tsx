import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  X,
  CheckCircle2,
  Clock,
  UploadCloud,
  FileText,
  UserCheck,
  Phone,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

export interface SlipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  reservationCode: string;
  guestName: string;
  bookingSource?: 'walk_in' | 'phone' | 'facebook';
  paymentStatus?: 'unpaid' | 'paid';
  paymentSlipUrl?: string | null;
  paymentSlipRef?: string | null;
  paymentVerifiedAt?: string | null;
  onVerify?: (data: {
    paymentSlipRef?: string;
    paymentSlipUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const SlipViewerModal: React.FC<SlipViewerModalProps> = ({
  isOpen,
  onClose,
  reservationId,
  reservationCode,
  guestName,
  bookingSource = 'walk_in',
  paymentStatus = 'unpaid',
  paymentSlipUrl,
  paymentSlipRef: initialSlipRef,
  paymentVerifiedAt,
  onVerify,
}) => {
  const { t, locale } = useI18n();

  const [slipRef, setSlipRef] = useState(initialSlipRef || '');
  const [currentSlipUrl, setCurrentSlipUrl] = useState<string | null>(paymentSlipUrl || null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSlipRef(initialSlipRef || '');
      setCurrentSlipUrl(paymentSlipUrl || null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialSlipRef, paymentSlipUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(locale === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WEBP)' : 'Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCurrentSlipUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!onVerify) return;
    setError(null);
    setIsVerifying(true);

    const result = await onVerify({
      paymentSlipRef: slipRef.trim() || undefined,
      paymentSlipUrl: currentSlipUrl || undefined,
    });
    setIsVerifying(false);

    if (result.success) {
      setSuccessMsg(locale === 'th' ? 'ยืนยันการชำระเงินเรียบร้อยแล้ว' : 'Payment verified successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError(result.error || (locale === 'th' ? 'เกิดข้อผิดพลาดในการยืนยัน' : 'Verification failed'));
    }
  };

  const isPaid = paymentStatus === 'paid' || Boolean(successMsg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop with frosted blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden w-full max-w-2xl z-10 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-800">
              <FileText className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {locale === 'th' ? 'หลักฐานการโอนเงิน (Payment Slip)' : 'Payment Slip Verification'}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {isPaid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{locale === 'th' ? 'ชำระเงินแล้ว (Paid)' : 'Paid'}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{locale === 'th' ? 'รอชำระเงิน (Unpaid)' : 'Unpaid'}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {reservationCode} · {guestName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Meta Info Pill Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">{locale === 'th' ? 'ช่องทางการจอง:' : 'Channel:'}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-medium border border-slate-200">
              {bookingSource === 'phone' ? (
                <>
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>{locale === 'th' ? 'โทรศัพท์เข้ามาจอง' : 'Phone'}</span>
                </>
              ) : bookingSource === 'facebook' ? (
                <>
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>{locale === 'th' ? 'เพจ Facebook' : 'Facebook Page'}</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>{locale === 'th' ? 'Walk-in เคาน์เตอร์' : 'Walk-in'}</span>
                </>
              )}
            </span>

            {paymentVerifiedAt && (
              <span className="text-[11px] text-slate-500 font-mono ml-auto">
                {locale === 'th' ? 'ยืนยันเมื่อ:' : 'Verified:'} {new Date(paymentVerifiedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Image Lightbox Viewer Box */}
          <div className="bg-slate-900/5 rounded-xl border border-slate-200 p-3 flex flex-col items-center justify-center min-h-[220px] max-h-[360px] overflow-hidden relative">
            {currentSlipUrl ? (
              <div className="relative group max-h-[340px] flex items-center justify-center">
                <img
                  src={currentSlipUrl}
                  alt="Payment Slip"
                  className="max-h-[320px] w-auto object-contain rounded-lg shadow-sm"
                />
                {!isPaid && (
                  <button
                    type="button"
                    onClick={() => setCurrentSlipUrl(null)}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition-colors opacity-90 group-hover:opacity-100"
                    title="Remove slip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center p-6 space-y-2">
                <UploadCloud className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-600">
                  {locale === 'th' ? 'ยังไม่ได้แนบรูปภาพสลิป' : 'No slip image attached yet'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {locale === 'th'
                    ? 'สามารถบันทึกรูปจากแชทเพจ Facebook แล้วอัปโหลดแนบที่นี่ได้'
                    : 'Download slip from Facebook Page chat and upload here.'}
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer transition-colors shadow-2xs mt-2">
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>{locale === 'th' ? 'อัปโหลดรูปภาพสลิป' : 'Upload Slip Image'}</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Bank Ref Field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              {locale === 'th' ? 'เลขที่อ้างอิงธุรกรรมธนาคาร (Bank Transaction Reference)' : 'Bank Reference No.'}
            </label>
            <input
              type="text"
              placeholder="e.g. 202611119876543210 หรือ BBL-987654"
              value={slipRef}
              onChange={(e) => setSlipRef(e.target.value)}
              disabled={isPaid}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono disabled:opacity-75"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            {t('common.close')}
          </button>

          {!isPaid && onVerify && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-5 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{locale === 'th' ? 'กำลังบันทึก...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{locale === 'th' ? 'ยืนยันการชำระเงิน (Verify Payment)' : 'Verify Payment'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlipViewerModal;

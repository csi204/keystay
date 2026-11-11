import React, { useState, useEffect, useMemo } from 'react';
import { Room, RoomType } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { CustomDatePicker } from '../common/CustomDatePicker';
import {
  X,
  Calendar,
  User,
  Phone,
  Mail,
  DollarSign,
  CreditCard,
  AlertCircle,
  UserCheck,
  MessageSquare,
  UploadCloud,
  Check,
  FileCheck2,
  Trash2,
} from 'lucide-react';

export interface NewBookingModalProps {
  isOpen: boolean;
  rooms: Room[];
  roomTypes: RoomType[];
  preselectedRoomId?: string;
  onClose: () => void;
  onSubmit: (data: {
    guestName: string;
    phone: string;
    email?: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
    paymentMethod?: string;
    bookingSource?: 'walk_in' | 'phone' | 'facebook';
    paymentStatus?: 'unpaid' | 'paid';
    paymentSlipUrl?: string;
    paymentSlipRef?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export type NewReservationModalProps = NewBookingModalProps;

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  rooms,
  roomTypes,
  preselectedRoomId,
  onClose,
  onSubmit,
}) => {
  const { t, locale, formatCurrency } = useI18n();

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [bookingSource, setBookingSource] = useState<'walk_in' | 'phone' | 'facebook'>('walk_in');
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roomId, setRoomId] = useState(preselectedRoomId || '');
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [depositAmount, setDepositAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentSlipRef, setPaymentSlipRef] = useState('');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedRoomId) {
      setRoomId(preselectedRoomId);
    } else if (rooms.length > 0 && !roomId) {
      setRoomId(rooms[0].id);
    }
  }, [preselectedRoomId, rooms, roomId]);

  useEffect(() => {
    if (isOpen) {
      setBookingSource('walk_in');
      setPaymentSlipRef('');
      setPaymentSlipUrl('');
      setSlipPreview(null);
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

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);
  const selectedRoomType = useMemo(() => {
    if (!selectedRoom) return undefined;
    return roomTypes.find((t) => t.id === selectedRoom.roomTypeId);
  }, [roomTypes, selectedRoom]);

  // Total nights calculation
  const totalNights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 1;
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkInDate, checkOutDate]);

  // Total estimated amount
  const totalAmount = useMemo(() => {
    const base = parseFloat(selectedRoomType?.basePrice || '1200');
    return (base * totalNights).toFixed(2);
  }, [selectedRoomType, totalNights]);

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(locale === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WEBP)' : 'Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSlipPreview(result);
      setPaymentSlipUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const removeSlip = () => {
    setSlipPreview(null);
    setPaymentSlipUrl('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setError(t('res.errorGuestName'));
      return;
    }
    if (!phone.trim()) {
      setError(t('res.errorPhone'));
      return;
    }
    if (!roomId) {
      setError(t('res.errorRoom'));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const isPaid = bookingSource === 'walk_in' || Boolean(slipPreview || paymentSlipRef.trim());
    const paymentStatus: 'unpaid' | 'paid' = isPaid ? 'paid' : 'unpaid';

    const result = await onSubmit({
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      roomId,
      checkInDate,
      checkOutDate,
      depositAmount: depositAmount.trim() || '0',
      paymentMethod,
      bookingSource,
      paymentStatus,
      paymentSlipUrl: paymentSlipUrl || undefined,
      paymentSlipRef: paymentSlipRef.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || t('common.error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">{t('res.newReservation')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Booking Channel Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {locale === 'th' ? 'ช่องทางการจอง (Booking Source)' : 'Booking Source'} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'walk_in', label: locale === 'th' ? 'Walk-in เคาน์เตอร์' : 'Walk-in', icon: UserCheck },
                { id: 'phone', label: locale === 'th' ? 'โทรศัพท์เข้ามาจอง' : 'Phone Call', icon: Phone },
                { id: 'facebook', label: locale === 'th' ? 'เพจ Facebook' : 'Facebook Page', icon: MessageSquare },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = bookingSource === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBookingSource(c.id as any)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all min-h-[38px] ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Single Verification Point Rule Notice */}
          {(bookingSource === 'phone' || bookingSource === 'facebook') && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">
                  {locale === 'th' ? 'นโยบายการยืนยันหลักฐานการชำระเงิน' : 'Single Verification Point Policy'}
                </span>
                <span>
                  {locale === 'th'
                    ? 'ลูกค้าต้องส่งสลิปยืนยันเข้าเพจ Facebook ของโรงแรม พนักงานสามารถตรวจสอบแชทเพจและแนบสลิปด้านล่างได้ทันที'
                    : 'Guests must submit payment slip via official Facebook Page inbox. Staff can attach slip below.'}
                </span>
              </div>
            </div>
          )}

          {/* Guest Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('drawer.guestInfo')}
            </h3>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {t('common.guestName')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={t('res.guestName')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full text-sm py-2 px-3 pl-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {t('res.phoneNumber')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="0812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm py-2 px-3 pl-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {t('res.emailOptional')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm py-2 px-3 pl-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Room & Stay Dates */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('res.roomAndDates')}
            </h3>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {t('res.selectRoom')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
              >
                {rooms.map((r) => {
                  const type = roomTypes.find((t) => t.id === r.roomTypeId);
                  const localizedTypeName = localizeRoomType(type?.name, locale) || type?.name || 'Standard';
                  return (
                    <option key={r.id} value={r.id}>
                      {t('common.room')} {r.roomNumber} ({localizedTypeName} · {formatCurrency(type?.basePrice || '1200')}{t('common.pricePerNight')})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {t('res.checkInDate')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                </label>
                <CustomDatePicker
                  required
                  min={todayStr}
                  value={checkInDate}
                  onChange={(date) => {
                    setCheckInDate(date);
                    if (checkOutDate && date > checkOutDate) {
                      setCheckOutDate(date);
                    }
                  }}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {t('res.checkOutDate')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                </label>
                <CustomDatePicker
                  required
                  min={checkInDate}
                  placement="top"
                  value={checkOutDate}
                  onChange={setCheckOutDate}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {t('res.depositBaht')}
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full text-sm py-2 px-3 pl-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {t('payment.method')}
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-sm py-2 px-3 pl-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
                  >
                    <option value="cash">{t('payment.cash')}</option>
                    <option value="credit_card">{t('payment.creditCard')}</option>
                    <option value="qr_promptpay">{t('payment.qrPromptpay')}</option>
                    <option value="transfer">{t('payment.transfer')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Slip Attachment (For phone, facebook or transfer) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{locale === 'th' ? 'หลักฐานการโอนเงิน (Payment Slip)' : 'Payment Slip Details'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {locale === 'th' ? 'เลขอ้างอิงธุรกรรมธนาคาร' : 'Bank Reference No.'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. BBL-20261111-987654"
                  value={paymentSlipRef}
                  onChange={(e) => setPaymentSlipRef(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {locale === 'th' ? 'แนบรูปภาพสลิป' : 'Upload Slip Image'}
                </label>
                <label className="flex items-center justify-center gap-2 w-full text-xs py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-md cursor-pointer transition-colors text-slate-600">
                  <UploadCloud className="w-4 h-4 text-slate-500" />
                  <span className="truncate">{slipPreview ? (locale === 'th' ? 'เปลี่ยนรูปสลิป' : 'Change Image') : (locale === 'th' ? 'เลือกรูปสลิป' : 'Choose Slip')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Slip Thumbnail Preview */}
            {slipPreview && (
              <div className="relative inline-block mt-2 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-1">
                <img src={slipPreview} alt="Slip preview" className="h-20 w-auto object-cover rounded" />
                <button
                  type="button"
                  onClick={removeSlip}
                  className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-xs"
                  title="Remove slip"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Pricing Summary Box */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-sm font-mono">
            <div>
              <span className="text-slate-500 block text-xs">{t('common.nights')}</span>
              <span className="font-bold text-slate-800 tabular-nums">{t('common.nightsCount', { count: totalNights })}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-xs">{t('res.estimatedTotal')}</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Modal Actions */}
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
              disabled={isSubmitting}
              className="px-4 text-sm font-semibold py-2.5 text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? t('res.submitting') : t('res.confirmReservation')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { NewBookingModal as NewReservationModal };
export default NewBookingModal;

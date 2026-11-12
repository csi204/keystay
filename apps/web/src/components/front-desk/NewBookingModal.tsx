import React, { useState, useEffect, useMemo } from 'react';
import { Room, RoomType, Reservation } from '@keystay/types';
import type { ExtendedReservation } from '@/hooks/useReservations';
import { getAvailableRoomsForDates } from '@/lib/roomAvailability';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { CustomDatePicker } from '../common/CustomDatePicker';
import {
  PhoneInput,
  NationalIdOrPassportInput,
  isValidPhone,
  isValidThaiId,
  isValidPassport,
} from '../common/MaskedInputs';
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
  ChevronDown,
  Users,
} from 'lucide-react';

export interface NewBookingModalProps {
  isOpen: boolean;
  rooms: Room[];
  reservations?: (Reservation | ExtendedReservation)[];
  roomTypes: RoomType[];
  preselectedRoomId?: string;
  onClose: () => void;
  onSubmit: (data: {
    guestName: string;
    phone: string;
    nationalIdOrPassport: string;
    idCardNumber?: string;
    email?: string;
    guestsCount?: number;
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
  reservations = [],
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
  const [idCardNumber, setIdCardNumber] = useState('');
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

  const availableRoomsForDates = useMemo(() => {
    return getAvailableRoomsForDates(
      rooms,
      reservations,
      checkInDate,
      checkOutDate,
      { isWalkInToday: checkInDate === todayStr }
    );
  }, [rooms, reservations, checkInDate, checkOutDate, todayStr]);

  useEffect(() => {
    if (preselectedRoomId && availableRoomsForDates.some((r) => r.id === preselectedRoomId)) {
      setRoomId(preselectedRoomId);
    } else if (
      availableRoomsForDates.length > 0 &&
      (!roomId || !availableRoomsForDates.some((r) => r.id === roomId))
    ) {
      setRoomId(availableRoomsForDates[0].id);
    } else if (availableRoomsForDates.length === 0) {
      setRoomId('');
    }
  }, [preselectedRoomId, availableRoomsForDates, roomId]);

  const selectedRoom = useMemo(
    () => availableRoomsForDates.find((r) => r.id === roomId) || rooms.find((r) => r.id === roomId),
    [availableRoomsForDates, rooms, roomId]
  );
  const selectedRoomType = useMemo(() => {
    if (!selectedRoom) return undefined;
    return roomTypes.find((t) => t.id === selectedRoom.roomTypeId);
  }, [roomTypes, selectedRoom]);

  const maxCapacity = selectedRoomType?.capacity || 2;
  const [guestsCount, setGuestsCount] = useState<number>(2);

  useEffect(() => {
    const maxCap = selectedRoomType?.capacity || 2;
    setGuestsCount((prev) => Math.min(Math.max(1, prev || 1), maxCap));
  }, [selectedRoomType]);

  useEffect(() => {
    if (isOpen) {
      setBookingSource('walk_in');
      setGuestName('');
      setPhone('');
      setIdCardNumber('');
      setEmail('');
      setGuestsCount(selectedRoomType?.capacity || 2);
      setPaymentSlipRef('');
      setPaymentSlipUrl('');
      setSlipPreview(null);
      setError(null);
    }
  }, [isOpen, selectedRoomType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const isDateRangeInvalid = Boolean(checkInDate && checkOutDate && checkOutDate <= checkInDate);

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
    if (!phone.trim() || !isValidPhone(phone)) {
      setError(t('res.errorPhone'));
      return;
    }
    if (!idCardNumber.trim() || (!isValidThaiId(idCardNumber) && !isValidPassport(idCardNumber))) {
      setError(t('res.errorId'));
      return;
    }
    if (checkOutDate <= checkInDate) {
      setError(locale === 'th' ? 'วันเช็คเอาต์ต้องหลังจากวันเช็คอินอย่างน้อย 1 คืน' : 'Check-out date must be after check-in date');
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
      nationalIdOrPassport: idCardNumber.trim(),
      idCardNumber: idCardNumber.trim(),
      email: email.trim() || undefined,
      guestsCount: Math.min(guestsCount, maxCapacity),
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

            {/* Phone */}
            <PhoneInput
              value={phone}
              onChange={setPhone}
              required
              label={t('res.phoneNumber')}
              placeholder="081-234-5678"
            />

            {/* National ID / Passport */}
            <NationalIdOrPassportInput
              value={idCardNumber}
              onChange={setIdCardNumber}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full min-h-[44px] text-sm py-2 px-3 pl-9 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  {locale === 'th' ? 'จำนวนผู้เข้าพัก' : 'Number of Guests'}
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    ({locale === 'th' ? `สูงสุด ${maxCapacity} ท่าน` : `Max ${maxCapacity}`})
                  </span>
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Math.min(parseInt(e.target.value) || 1, maxCapacity))}
                    className="w-full min-h-[44px] text-sm py-2 px-3 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans appearance-none"
                  >
                    {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {locale === 'th' ? 'ท่าน' : (num > 1 ? 'guests' : 'guest')} {num === maxCapacity ? `(${locale === 'th' ? 'เต็มจำนวน' : 'Max'})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
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
              {availableRoomsForDates.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-0.5">
                  <p className="font-semibold">ไม่มีห้องว่างในช่วงวันที่เลือก</p>
                  <p className="text-amber-700">
                    {locale === 'th'
                      ? 'ไม่มีห้องว่างที่พร้อมให้บริการสำหรับช่วงวันที่เลือก กรุณาเปลี่ยนวันที่หรือเลือกช่วงเวลาอื่น'
                      : 'No rooms available for the selected dates.'}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full text-sm py-2 px-3 pr-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans appearance-none"
                  >
                    {availableRoomsForDates.map((r) => {
                      const type = roomTypes.find((t) => t.id === r.roomTypeId);
                      const localizedTypeName = localizeRoomType(type?.name, locale) || type?.name || 'Standard';
                      return (
                        <option key={r.id} value={r.id}>
                          {t('common.room')} {r.roomNumber} ({localizedTypeName} · {formatCurrency(type?.basePrice || '1200')}{t('common.pricePerNight')})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
                </div>
              )}
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
                  className={`w-full text-sm py-2 px-3 bg-slate-50 border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums ${
                    isDateRangeInvalid ? 'border-rose-400 dark:border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200'
                  }`}
                />
                {isDateRangeInvalid && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>วันเช็คเอาต์ต้องหลังจากวันเช็คอินอย่างน้อย 1 คืน</span>
                  </p>
                )}
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
                    className="w-full text-sm py-2 px-3 pl-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-full text-sm py-2 px-3 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans appearance-none"
                  >
                    <option value="cash">{t('payment.cash')}</option>
                    <option value="credit_card">{t('payment.creditCard')}</option>
                    <option value="qr_promptpay">{t('payment.qrPromptpay')}</option>
                    <option value="transfer">{t('payment.transfer')}</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
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
              disabled={isSubmitting || availableRoomsForDates.length === 0 || !roomId}
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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Room, RoomType, Reservation } from '@keystay/types';
import type { ExtendedReservation } from '@/hooks/useReservations';
import { getAvailableRoomsForDates } from '@/lib/roomAvailability';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType, localizeAmenity } from '@/lib/localizeMetadata';
import { compressImageToBase64 } from '@/lib/imageCompression';
import { CustomDatePicker, formatDisplayDate } from '../common/CustomDatePicker';
import { ROOM_STATUS_CONFIG } from './RoomCard';
import {
  PhoneInput,
  NationalIdOrPassportInput,
  isValidPhone,
  isValidThaiId,
  isValidPassport,
} from '../common/MaskedInputs';
import {
  X,
  UserCheck,
  User,
  Phone,
  Mail,
  CreditCard,
  BedDouble,
  Users,
  Bath,
  ShieldCheck,
  Banknote,
  QrCode,
  Building2,
  LogIn,
  AlertCircle,
  Loader2,
  ChevronDown,
  UploadCloud,
  Trash2,
  FileCheck2,
} from 'lucide-react';

export interface FastBookingFormData {
  guestName: string;
  phone: string;
  idCardNumber?: string;
  nationalIdOrPassport?: string;
  email?: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  guestsCount?: number;
  depositAmount: string;
  paymentMethod?: 'cash' | 'transfer' | 'credit_card' | 'qr_promptpay' | string;
  bookingSource?: 'walk_in' | 'phone' | 'facebook';
  paymentStatus?: 'unpaid' | 'paid';
  paymentSlipUrl?: string;
  paymentSlipRef?: string;
}

export interface WalkInModalProps {
  isOpen: boolean;
  availableRooms?: Room[];
  rooms?: Room[];
  allRooms?: Room[];
  reservations?: (Reservation | ExtendedReservation)[];
  roomTypes?: RoomType[];
  preselectedRoomId?: string;
  onClose: () => void;
  onSubmit: (data: {
    roomId: string;
    guestName: string;
    phone: string;
    nationalIdOrPassport: string;
    idCardNumber?: string;
    email?: string;
    guestsCount?: number;
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
    nightlyRate?: number;
    paymentMethod?: string;
    bookingSource?: 'walk_in' | 'phone' | 'facebook';
    paymentSlipUrl?: string;
    paymentSlipRef?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export type RapidWalkInModalProps = WalkInModalProps;

export const WalkInModal: React.FC<WalkInModalProps> = ({
  isOpen,
  availableRooms = [],
  rooms,
  allRooms,
  reservations = [],
  roomTypes = [],
  preselectedRoomId,
  onClose,
  onSubmit,
}) => {
  const { t, locale, formatCurrency } = useI18n();

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [roomId, setRoomId] = useState(preselectedRoomId || '');
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [email, setEmail] = useState('');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [depositAmount, setDepositAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [paymentSlipRef, setPaymentSlipRef] = useState('');
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isCompressingSlip, setIsCompressingSlip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevOpenRef = useRef<boolean>(false);
  const prevPreselectedRoomIdRef = useRef<string | undefined>(preselectedRoomId);

  const poolOfRooms =
    (Array.isArray(allRooms) && allRooms.length > 0 ? allRooms : null) ||
    (Array.isArray(rooms) && rooms.length > 0 ? rooms : null) ||
    (Array.isArray(availableRooms) ? availableRooms : []);

  const safeReservations = Array.isArray(reservations) ? reservations : [];

  const availableRoomsForDates = useMemo(() => {
    return getAvailableRoomsForDates(
      poolOfRooms,
      safeReservations,
      checkInDate,
      checkOutDate,
      { isWalkInToday: checkInDate === todayStr }
    );
  }, [poolOfRooms, safeReservations, checkInDate, checkOutDate, todayStr]);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isOpen;

    if (!wasOpen && isOpen) {
      setGuestName('');
      setPhone('');
      setIdCardNumber('');
      setEmail('');
      setGuestsCount(2);
      setCheckInDate(todayStr);
      setCheckOutDate(tomorrowStr);
      setDepositAmount('500');
      setPaymentMethod('cash');
      setPaymentSlipRef('');
      setPaymentSlipUrl('');
      setSlipPreview(null);
      setIsCompressingSlip(false);
      setError(null);
      if (preselectedRoomId) {
        setRoomId(preselectedRoomId);
      }
    }
  }, [isOpen, preselectedRoomId, todayStr, tomorrowStr]);

  const handleSlipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(locale === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WEBP)' : 'Please select an image file');
      return;
    }
    try {
      setIsCompressingSlip(true);
      setError(null);
      const compressed = await compressImageToBase64(file);
      setSlipPreview(compressed);
      setPaymentSlipUrl(compressed);
    } catch (err) {
      console.error('Error compressing slip image:', err);
      setError(locale === 'th' ? 'ไม่สามารถบีบอัดรูปภาพสลิปได้' : 'Failed to compress slip image');
    } finally {
      setIsCompressingSlip(false);
    }
  };

  const removeSlip = () => {
    setSlipPreview(null);
    setPaymentSlipUrl('');
  };

  const handleCheckInDateChange = (date: string) => {
    setCheckInDate(date);
    if (checkOutDate && date > checkOutDate) {
      setCheckOutDate(date);
    }
  };

  useEffect(() => {
    const preselectedChanged = prevPreselectedRoomIdRef.current !== preselectedRoomId;
    prevPreselectedRoomIdRef.current = preselectedRoomId;

    if (
      preselectedChanged &&
      preselectedRoomId &&
      availableRoomsForDates.some((r) => r.id === preselectedRoomId)
    ) {
      setRoomId(preselectedRoomId);
    } else if (
      availableRoomsForDates.length > 0 &&
      (!roomId || !availableRoomsForDates.some((r) => r.id === roomId))
    ) {
      setRoomId(
        preselectedRoomId && availableRoomsForDates.some((r) => r.id === preselectedRoomId)
          ? preselectedRoomId
          : availableRoomsForDates[0].id
      );
    } else if (availableRoomsForDates.length === 0) {
      setRoomId('');
    }
  }, [preselectedRoomId, availableRoomsForDates, roomId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Selected room details
  const selectedRoom = availableRoomsForDates.find((r) => r.id === roomId) || availableRoomsForDates[0];
  const selectedRoomType = (roomTypes || []).find((t) => t.id === selectedRoom?.roomTypeId);
  const maxCapacity = selectedRoomType?.capacity || (selectedRoom as any)?.capacity || 2;

  useEffect(() => {
    const maxCap = selectedRoomType?.capacity || (selectedRoom as any)?.capacity || 2;
    setGuestsCount((prev) => Math.min(Math.max(1, prev || 1), maxCap));
  }, [selectedRoomType?.capacity, selectedRoom]);

  if (!isOpen) return null;

  // Dynamic night calculation
  const calculateNights = (inDate: string, outDate: string): number => {
    if (!inDate || !outDate) return 1;
    const start = new Date(inDate);
    const end = new Date(outDate);
    const diffTime = end.getTime() - start.getTime();
    if (!Number.isFinite(diffTime)) return 1;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateNights(checkInDate, checkOutDate);
  const isDateRangeInvalid = Boolean(checkInDate && checkOutDate && checkOutDate <= checkInDate);
  const parsedRate = selectedRoomType ? parseFloat(String(selectedRoomType.basePrice ?? '1200')) : 1200;
  const nightlyRate = Number.isFinite(parsedRate) ? parsedRate : 1200;
  const parsedDeposit = parseFloat(depositAmount) || 0;
  const roomSubtotal = nights * nightlyRate;
  const totalDue = roomSubtotal + parsedDeposit;

  // Room specification chips
  const amenitiesList = Array.isArray(selectedRoomType?.amenities)
    ? selectedRoomType.amenities.filter((a): a is string => typeof a === 'string')
    : [];
  const bedRaw =
    (selectedRoomType as any)?.bedType ||
    amenitiesList.find((a) => a.toLowerCase().includes('bed')) ||
    'King Bed';
  const bedLabel = localizeAmenity(bedRaw, locale) || bedRaw;

  const capacityLabel = selectedRoomType?.capacity
    ? t('drawer.capacityCount', { count: selectedRoomType.capacity })
    : (locale === 'th' ? '2 ท่าน' : '2 Guests');

  const hasBathtub = amenitiesList.find((a) => a.toLowerCase().includes('bath'));
  const bathLabel = hasBathtub
    ? localizeAmenity(hasBathtub, locale)
    : (locale === 'th' ? '1 ห้องน้ำ' : '1 Bath');

  const localizedTypeName = localizeRoomType(selectedRoomType?.name, locale) || selectedRoomType?.name || 'Standard';

  const statusConfig = ROOM_STATUS_CONFIG.available || {
    label: 'ว่างพร้อมใช้',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  };

  const paymentOptions = [
    { id: 'cash', label: t('payment.cash'), icon: Banknote },
    { id: 'qr_promptpay', label: t('payment.qrPromptpay'), icon: QrCode },
    { id: 'credit_card', label: t('payment.creditCard'), icon: CreditCard },
    { id: 'transfer', label: t('payment.transfer'), icon: Building2 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      setError(t('res.errorNoRoomWalkIn'));
      return;
    }
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

    setError(null);
    setIsSubmitting(true);
    const result = await onSubmit({
      roomId,
      guestName: guestName.trim(),
      phone: phone.trim(),
      nationalIdOrPassport: idCardNumber.trim(),
      idCardNumber: idCardNumber.trim(),
      email: email.trim() || undefined,
      guestsCount: Math.min(guestsCount, maxCapacity),
      checkInDate: checkInDate || todayStr,
      checkOutDate,
      depositAmount: depositAmount.trim() || '0',
      nightlyRate,
      paymentMethod,
      bookingSource: 'walk_in',
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
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Split-Pane Studio Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-4xl w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl border border-slate-200/70">
              <UserCheck className="w-5 h-5 text-slate-900" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>เปิดห้องด่วน (Walk-In Check-In)</span>
              </h2>
              <p className="text-xs text-slate-500">
                {t('res.rapidWalkIn')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center"
            aria-label={t('common.cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {poolOfRooms.length === 0 ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-center space-y-1">
              <p className="font-semibold">{t('res.noAvailableRooms')}</p>
              <p className="text-xs text-amber-700">ไม่มีห้องว่างพร้อมให้บริการในขณะนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Pane: Room Showcase & Financial Calculator */}
              <div className="md:col-span-5 space-y-4">
                {/* Room Selector if multiple available rooms */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    {t('res.selectAvailableRoom')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                  </label>
                  {availableRoomsForDates.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-0.5">
                      <p className="font-semibold">ไม่มีห้องว่างในช่วงวันที่เลือก</p>
                      <p className="text-amber-700">
                        {locale === 'th'
                          ? 'ไม่มีห้องว่างที่พร้อมให้บริการสำหรับช่วงวันที่เลือก กรุณาเปลี่ยนวันที่หรือเลือกห้องอื่น'
                          : 'No rooms available for the selected dates.'}
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full text-sm py-2 px-3 pr-9 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-sans shadow-2xs appearance-none"
                      >
                        {availableRoomsForDates.map((r) => {
                          const type = (roomTypes || []).find((t) => t.id === r.roomTypeId);
                          const typeName = localizeRoomType(type?.name, locale) || type?.name || 'Standard';
                          return (
                            <option key={r.id} value={r.id} className="text-slate-900 bg-white">
                              {t('common.room')} {r.roomNumber} ({typeName} · {formatCurrency(type?.basePrice || '1200')}{t('common.pricePerNight')})
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
                    </div>
                  )}
                </div>

                {/* Selected Room Highlight Card */}
                {selectedRoom && (
                  <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block">
                          {locale === 'th' ? 'ห้องที่เลือก' : 'Selected Room'}
                        </span>
                        <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                          {t('common.room')} {selectedRoom.roomNumber}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full text-xs px-2.5 py-1 font-semibold ${statusConfig.text} ${statusConfig.bg} border ${statusConfig.border}`}>
                        <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                        <span>{locale === 'th' ? statusConfig.label : 'Available'}</span>
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-800">
                      <span>{localizedTypeName}</span>
                      {selectedRoom.floor && (
                        <span className="text-xs font-normal text-slate-500 ml-1.5">
                          · {t('common.floor', { floor: selectedRoom.floor })}
                        </span>
                      )}
                    </div>

                    {/* Room spec microchips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 shadow-2xs">
                        <BedDouble className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{bedLabel}</span>
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 shadow-2xs">
                        <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{capacityLabel}</span>
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 shadow-2xs">
                        <Bath className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{bathLabel}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Financial Breakdown Box */}
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{locale === 'th' ? 'ราคาต่อคืน' : 'Nightly rate'}</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(nightlyRate) + '/คืน'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{locale === 'th' ? 'ระยะเวลาพัก' : 'Stay duration'}</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatDisplayDate(checkInDate, locale)} &rarr; {formatDisplayDate(checkOutDate, locale)} ({nights} {locale === 'th' ? 'คืน' : (nights > 1 ? 'nights' : 'night')})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{locale === 'th' ? 'ค่าห้องพักรวม' : 'Room subtotal'} ({nights} &times; {formatCurrency(nightlyRate)})</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(roomSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{t('res.keycardDeposit')} ({locale === 'th' ? 'มัดจำคีย์การ์ด' : 'Deposit'})</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(parsedDeposit)}
                    </span>
                  </div>
                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 block">
                        {locale === 'th' ? 'ยอดรวมสุทธิที่ต้องชำระ' : 'Estimated Total Due'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {locale === 'th' ? '(ค่าห้อง + มัดจำ)' : '(Room charge + deposit)'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 text-base sm:text-lg tabular-nums">
                      {formatCurrency(totalDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Pane: Guest Info & Payment Selection */}
              <div className="md:col-span-7 space-y-4">
                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    {t('common.guestName')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder={t('res.guestName')}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full text-sm py-2 px-3 pl-9 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-sans shadow-2xs"
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

                {/* Optional Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    {locale === 'th' ? 'อีเมล (ไม่บังคับ)' : 'Email (Optional)'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="guest@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[44px] text-sm py-2 px-3 pl-9 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-sans shadow-2xs"
                    />
                  </div>
                </div>

                {/* Guest Capacity Selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    {locale === 'th' ? 'จำนวนผู้เข้าพัก' : 'Number of Guests'}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      ({locale === 'th' ? `สูงสุด ${maxCapacity} ท่าน` : `Max ${maxCapacity} guests`})
                    </span>
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Math.min(parseInt(e.target.value) || 1, maxCapacity))}
                      className="w-full min-h-[44px] text-sm py-2 px-3 pl-9 pr-9 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-sans shadow-2xs appearance-none"
                    >
                      {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num} className="text-slate-900 bg-white">
                          {num} {locale === 'th' ? 'ท่าน' : (num > 1 ? 'guests' : 'guest')} {num === maxCapacity ? `(${locale === 'th' ? 'เต็มจำนวน' : 'Max'})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
                  </div>
                </div>

                {/* Stay Dates: Check-In & Check-Out */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">
                      {t('res.checkInDate')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                    </label>
                    <CustomDatePicker
                      required
                      min={todayStr}
                      value={checkInDate}
                      onChange={handleCheckInDateChange}
                      className="w-full text-sm py-2 px-3 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono tabular-nums shadow-2xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-semibold text-slate-800">
                        {t('res.checkOutDate')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                      </label>
                      <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        {nights} {locale === 'th' ? 'คืน' : (nights > 1 ? 'nights' : 'night')}
                      </span>
                    </div>
                    <CustomDatePicker
                      required
                      min={checkInDate}
                      placement="top"
                      value={checkOutDate}
                      onChange={setCheckOutDate}
                      className={`w-full text-sm py-2 px-3 bg-white text-slate-900 placeholder:text-slate-400 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono tabular-nums shadow-2xs ${
                        isDateRangeInvalid ? 'border-rose-400 ring-1 ring-rose-500/20' : 'border-slate-300'
                      }`}
                    />
                    {isDateRangeInvalid && (
                      <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>วันเช็คเอาต์ต้องหลังจากวันเช็คอินอย่างน้อย 1 คืน</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Keycard Deposit */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    {t('res.keycardDeposit')}
                  </label>
                  <div className="relative">
                    <Banknote className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="500"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full text-sm py-2 px-3 pl-9 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono tabular-nums shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Payment Method Selector Grid */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {t('payment.method')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {paymentOptions.map((opt) => {
                      const isSelected = paymentMethod === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPaymentMethod(opt.id)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                              : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                          <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Slip Attachment */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
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
                        className="w-full min-h-[38px] px-3 text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {locale === 'th' ? 'แนบรูปภาพสลิป' : 'Upload Slip Image'}
                      </label>
                      <label className="flex items-center justify-center gap-2 w-full min-h-[38px] px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-lg cursor-pointer transition-colors text-slate-600 text-xs">
                        <UploadCloud className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {isCompressingSlip
                            ? (locale === 'th' ? 'กำลังบีบอัดรูปภาพ...' : 'Compressing image...')
                            : slipPreview
                            ? (locale === 'th' ? 'เปลี่ยนรูปสลิป' : 'Change Image')
                            : (locale === 'th' ? 'เลือกรูปสลิป' : 'Choose Slip')}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSlipFileChange}
                          disabled={isCompressingSlip}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Slip Thumbnail Preview */}
                  {slipPreview && (
                    <div className="relative inline-block mt-1.5 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-1">
                      <img src={slipPreview} alt="Slip preview" className="h-16 w-auto object-cover rounded" />
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

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || availableRoomsForDates.length === 0 || !roomId}
                    className="inline-flex items-center justify-center px-5 text-sm font-semibold py-2.5 text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>{t('res.submitting')}</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        <span>{locale === 'th' ? 'ยืนยันเปิดห้องพัก Walk-In ทันที' : t('res.confirmWalkIn')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export { WalkInModal as RapidWalkInModal };
export default WalkInModal;

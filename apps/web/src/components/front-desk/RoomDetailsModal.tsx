import React, { useEffect, useState, useMemo } from 'react';
import { Room, RoomType } from '@keystay/types';
import { ROOM_STATUS_CONFIG } from './RoomCard';
import { useI18n } from '@/lib/i18n';
import {
  localizeRoomType,
  localizeRoomNote,
  localizeRoomDescription,
  localizeAmenity,
} from '@/lib/localizeMetadata';
import { ExtendedReservation } from '@/hooks/useReservations';
import { ExtendStayModal } from './ExtendStayModal';
import { SlipViewerModal } from './SlipViewerModal';
import { RequestAmenitiesModal } from './RequestAmenitiesModal';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { apiFetch, apiUrl, getAuthToken } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import {
  X,
  BedDouble,
  DollarSign,
  LogIn,
  LogOut,
  PlusCircle,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  CalendarPlus,
  Users,
  ArrowLeft,
  AlertCircle,
  Banknote,
  Building,
  CreditCard,
  QrCode,
  Zap,
  Phone,
  User,
  Check,
  UserCheck,
  MessageSquare,
  UploadCloud,
  FileCheck2,
  Trash2,
  Pencil,
  Loader2,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Maximize2,
  Eye,
} from 'lucide-react';

export type RoomModalAction =
  | 'checkin'
  | 'checkout'
  | 'charge'
  | 'walkin'
  | 'clean'
  | 'extend'
  | 'refresh';

export type RoomDrawerAction = RoomModalAction;

export interface HousekeepingEvidenceTask {
  id: string;
  roomNumber: string;
  taskType: string;
  status: string;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  completedAt?: string | null;
  assignedStaff?: { name: string } | null;
  notes?: string | null;
}

export interface FastBookingFormData {
  guestName: string;
  phone: string;
  idCardNumber?: string;
  nationalIdOrPassport?: string;
  email?: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  depositAmount: string;
  paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'qr_promptpay';
  bookingSource?: 'walk_in' | 'phone' | 'facebook';
  paymentStatus?: 'unpaid' | 'paid';
  paymentSlipUrl?: string;
  paymentSlipRef?: string;
}

export interface RoomDetailsModalProps {
  room: Room | null;
  roomType?: RoomType;
  isOpen: boolean;
  onClose: () => void;
  onAction?:
    | ((action: RoomModalAction, room: Room) => void)
    | ((action: 'checkin' | 'checkout' | 'charge' | 'walkin' | 'clean' | 'extend' | 'refresh', room: Room) => void);
  currentReservation?: ExtendedReservation | null;
  initialMode?: 'details' | 'booking';
  onSubmitBooking?: (data: FastBookingFormData) => Promise<{ success: boolean; error?: string }>;
  onVerifySlip?: (
    reservationId: string,
    data: { paymentSlipRef?: string; paymentSlipUrl?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onRequestAmenity?: (data: {
    amenityId: string;
    amenityName: string;
    quantity: number;
    unitPrice: number;
    isChargeable: boolean;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onAddFolioCharge?: (
    billId: string,
    data: {
      description: string;
      category: 'room' | 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
      quantity: number;
      unitPrice: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  room,
  roomType,
  isOpen,
  onClose,
  onAction,
  currentReservation: initialReservation,
  initialMode = 'details',
  onSubmitBooking,
  onVerifySlip,
  onRequestAmenity,
  onAddFolioCharge,
}) => {
  const { t, formatCurrency, locale } = useI18n();
  const toast = useToast();

  const [currentReservation, setCurrentReservation] = useState<ExtendedReservation | null | undefined>(
    initialReservation
  );

  useEffect(() => {
    setCurrentReservation(initialReservation);
  }, [initialReservation]);

  // Editable Room Notes State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(room?.notes ? localizeRoomNote(room.notes, locale) : '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [currentNotes, setCurrentNotes] = useState<string | null>(room?.notes ?? null);

  useEffect(() => {
    const raw = room?.notes ?? null;
    setCurrentNotes(raw);
    setEditedNotes(raw ? localizeRoomNote(raw, locale) : '');
    setIsEditingNotes(false);
  }, [room?.id, room?.notes, isOpen, locale]);

  const handleStartEditNotes = () => {
    const initialText = currentNotes ? localizeRoomNote(currentNotes, locale) : '';
    setEditedNotes(initialText);
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!room) return;
    setIsSavingNotes(true);
    try {
      const trimmedNotes = editedNotes.trim() || null;
      const res = await apiFetch<{ success: boolean; data: any }>(`/api/rooms/${room.id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: trimmedNotes }),
      });

      if (res.error) {
        toast.showError(t('common.error') || 'เกิดข้อผิดพลาด', res.error);
        return;
      }

      setCurrentNotes(trimmedNotes);
      setEditedNotes(trimmedNotes ? localizeRoomNote(trimmedNotes, locale) : '');
      setIsEditingNotes(false);
      toast.showSuccess(
        t('notes.savedTitle') || 'บันทึกสำเร็จ',
        t('notes.savedDesc') || 'อัปเดตบันทึกห้องพักเรียบร้อยแล้ว'
      );
      onAction?.('refresh', {
        ...room,
        notes: trimmedNotes,
      });
    } catch (err: any) {
      toast.showError(t('common.error') || 'เกิดข้อผิดพลาด', err?.message || 'Failed to update notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCancelEditNotes = () => {
    setEditedNotes(currentNotes ? localizeRoomNote(currentNotes, locale) : '');
    setIsEditingNotes(false);
  };

  // Mode: 'details' (single pane max-w-lg) or 'booking' (split pane max-w-4xl)
  const [mode, setMode] = useState<'details' | 'booking'>(initialMode);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isSlipViewerOpen, setIsSlipViewerOpen] = useState(false);
  const [isAmenitiesModalOpen, setIsAmenitiesModalOpen] = useState(false);

  // Housekeeping Evidence State
  const [housekeepingTask, setHousekeepingTask] = useState<HousekeepingEvidenceTask | null>(null);
  const [loadingHousekeeping, setLoadingHousekeeping] = useState<boolean>(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string } | null>(null);

  // Fetch Housekeeping Inspection Task
  useEffect(() => {
    if (!isOpen || !room?.roomNumber) {
      setHousekeepingTask(null);
      setLoadingHousekeeping(false);
      return;
    }

    let isMounted = true;
    setLoadingHousekeeping(true);

    const fetchHousekeeping = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(
          apiUrl(`/api/housekeeping/tasks?roomNumber=${room.roomNumber}`),
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (!isMounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setHousekeepingTask(json.data[0]);
          } else {
            setHousekeepingTask(null);
          }
        } else {
          setHousekeepingTask(null);
        }
      } catch {
        if (isMounted) {
          setHousekeepingTask(null);
        }
      } finally {
        if (isMounted) {
          setLoadingHousekeeping(false);
        }
      }
    };

    fetchHousekeeping();

    return () => {
      isMounted = false;
    };
  }, [isOpen, room?.id, room?.roomNumber]);

  const formattedHousekeepingCompletedAt = useMemo(() => {
    if (!housekeepingTask?.completedAt) return null;
    try {
      const d = new Date(housekeepingTask.completedAt);
      if (isNaN(d.getTime())) return null;
      return (
        d.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + (locale === 'th' ? ' น.' : '')
      );
    } catch {
      return null;
    }
  }, [housekeepingTask?.completedAt, locale]);

  // Fast Booking Form State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [guestsCount, setGuestsCount] = useState<number>(roomType?.capacity || 2);
  const [depositAmount, setDepositAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'transfer' | 'credit_card' | 'qr_promptpay'
  >('cash');
  const [bookingSource, setBookingSource] = useState<'walk_in' | 'phone' | 'facebook'>('walk_in');
  const [paymentSlipRef, setPaymentSlipRef] = useState('');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Nights calculation
  const nightsCount = useMemo(() => {
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkInDate, checkOutDate]);

  // Sync mode and form fields when opened or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setGuestName('');
      setPhone('');
      setCheckInDate(todayStr);
      setCheckOutDate(tomorrowStr);
      setGuestsCount(roomType?.capacity || 2);
      setDepositAmount('500');
      setPaymentMethod('cash');
      setBookingSource('walk_in');
      setPaymentSlipRef('');
      setPaymentSlipUrl('');
      setSlipPreview(null);
      setValidationErrors([]);
      setSubmitError(null);
    }
  }, [isOpen, initialMode, todayStr, tomorrowStr, roomType]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxPhoto) {
          setLightboxPhoto(null);
          return;
        }
        if (isOpen && !isExtendOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExtendOpen, lightboxPhoto, onClose]);

  if (!isOpen || !room) return null;

  const statusCfg = ROOM_STATUS_CONFIG[room.status] || {
    label: room.status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const localizedStatus = t(`status.${room.status}`);
  const formattedPrice = roomType?.basePrice ? formatCurrency(roomType.basePrice) : null;

  // Estimated Pricing
  const nightlyRate = Number(roomType?.basePrice) || 0;
  const roomCharges = nightsCount * nightlyRate;
  const depositNum = Number(depositAmount) || 0;
  const estimatedTotal = roomCharges + depositNum;

  // Real-time client validation logic
  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!guestName.trim()) {
      errors.push(locale === 'th' ? 'กรุณาระบุชื่อ-นามสกุล ผู้เข้าพัก' : 'Guest name is required');
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!phone.trim() || cleanPhone.length < 9) {
      errors.push(
        locale === 'th'
          ? 'กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 9-10 หลัก)'
          : 'Valid phone number is required (9-10 digits)'
      );
    }

    if (checkOutDate <= checkInDate) {
      errors.push(
        locale === 'th'
          ? 'วันเช็คเอาท์ต้องมาหลังวันเช็คอินอย่างน้อย 1 คืน'
          : 'Check-out date must be after check-in date (at least 1 night)'
      );
    }

    if (isNaN(Number(depositAmount)) || Number(depositAmount) < 0) {
      errors.push(
        locale === 'th'
          ? 'เงินมัดจำต้องไม่ติดลบ (ระบุ 0 ได้)'
          : 'Deposit amount cannot be negative'
      );
    }

    return errors;
  };

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError(locale === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WEBP)' : 'Please select an image file');
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const isPaid = bookingSource === 'walk_in' || Boolean(slipPreview || paymentSlipRef.trim());
      const paymentStatus: 'unpaid' | 'paid' = isPaid ? 'paid' : 'unpaid';

      if (onSubmitBooking) {
        const result = await onSubmitBooking({
          guestName: guestName.trim(),
          phone: phone.trim(),
          roomId: room.id,
          checkInDate,
          checkOutDate,
          guestsCount,
          depositAmount,
          paymentMethod,
          bookingSource,
          paymentStatus,
          paymentSlipUrl: paymentSlipUrl || undefined,
          paymentSlipRef: paymentSlipRef.trim() || undefined,
        });

        if (!result.success) {
          setSubmitError(result.error || (locale === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกการจอง' : 'Failed to create booking'));
          return;
        }
      } else if (onAction) {
        (onAction as any)('walkin', room);
      }
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || (locale === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop with frosted blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Dialog Card */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden w-full transition-all duration-300 ease-out z-10 my-auto ${
          mode === 'booking'
            ? 'max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-0 max-h-[92vh] overflow-y-auto md:overflow-hidden'
            : 'max-w-lg'
        }`}
      >
        {/* ========================================================================= */}
        {/* SINGLE PANE: ROOM DETAILS MODE                                            */}
        {/* ========================================================================= */}
        {mode === 'details' && (
          <div className="flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                  {room.roomNumber}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                  <span>{localizedStatus}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Room Specifications Card */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('drawer.roomDetails')}
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">
                      {t('common.roomType')}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{localizeRoomType(roomType?.name, locale)}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">
                      {t('common.floor', { floor: '' }).replace('{floor}', '').trim() ||
                        (locale === 'th' ? 'ชั้น' : 'Floor')}
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{t('common.floor', { floor: room.floor || '1' })}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">
                      {t('drawer.price')}
                    </span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{formattedPrice ? `${formattedPrice}${t('common.pricePerNight')}` : '—'}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">
                      {t('drawer.capacity')}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{t('drawer.capacityCount', { count: roomType?.capacity || 2 })}</span>
                    </span>
                  </div>
                </div>

                {roomType?.description && (
                  <div className="pt-2 border-t border-slate-200/70 text-xs leading-relaxed text-slate-600">
                    {localizeRoomDescription(roomType.description, locale)}
                  </div>
                )}
              </div>

              {/* Amenities */}
              {roomType?.amenities && roomType.amenities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t('drawer.amenities')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {roomType.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                      >
                        {localizeAmenity(amenity, locale)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Housekeeping Proof of Cleanliness Card */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {locale === 'th'
                          ? 'หลักฐานการตรวจรับห้องพัก'
                          : 'Housekeeping Inspection Evidence'}
                      </span>
                    </h3>
                    {(housekeepingTask?.assignedStaff?.name || formattedHousekeepingCompletedAt) && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {housekeepingTask?.assignedStaff?.name
                          ? (locale === 'th' ? 'ผู้ตรวจรับ: ' : 'Inspected by: ') +
                            housekeepingTask.assignedStaff.name
                          : ''}
                        {housekeepingTask?.assignedStaff?.name && formattedHousekeepingCompletedAt
                          ? ' • '
                          : ''}
                        {formattedHousekeepingCompletedAt ? (
                          <span className="font-mono tabular-nums">
                            {formattedHousekeepingCompletedAt}
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                  {loadingHousekeeping && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Side-by-side Photo Comparison */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Before Photo Card */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                        <span>{locale === 'th' ? 'ก่อนทำความสะอาด' : 'Before Cleaning'}</span>
                      </span>
                      {housekeepingTask?.beforePhotoUrl && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span className="hidden sm:inline">
                            {locale === 'th' ? 'ดูภาพขยาย' : 'Zoom'}
                          </span>
                        </span>
                      )}
                    </div>

                    {housekeepingTask?.beforePhotoUrl ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setLightboxPhoto({
                            url: housekeepingTask.beforePhotoUrl!,
                            title:
                              (locale === 'th'
                                ? 'ภาพก่อนทำความสะอาด — ห้อง '
                                : 'Before Cleaning — Room ') + room.roomNumber,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setLightboxPhoto({
                              url: housekeepingTask.beforePhotoUrl!,
                              title:
                                (locale === 'th'
                                  ? 'ภาพก่อนทำความสะอาด — ห้อง '
                                  : 'Before Cleaning — Room ') + room.roomNumber,
                            });
                          }
                        }}
                        className="group relative aspect-4/3 w-full rounded-lg overflow-hidden border border-slate-200/90 bg-slate-900 cursor-pointer shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                      >
                        <img
                          src={housekeepingTask.beforePhotoUrl}
                          alt={locale === 'th' ? 'ภาพก่อนทำความสะอาด' : 'Before cleaning photo'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs p-2 rounded-full text-slate-800 shadow-sm flex items-center justify-center">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-4/3 w-full rounded-lg border border-dashed border-slate-300/80 bg-white/60 flex flex-col items-center justify-center p-3 text-center">
                        <ImageIcon className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[11px] text-slate-400 font-medium">
                          {locale === 'th' ? 'ไม่มีภาพก่อนทำ' : 'No before photo'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* After Photo Card */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {locale === 'th'
                            ? 'หลังตรวจรับเสร็จสมบูรณ์'
                            : 'After Cleaning (Verified)'}
                        </span>
                      </span>
                      {housekeepingTask?.afterPhotoUrl && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-600" />
                          {locale === 'th' ? 'ผ่าน' : 'Done'}
                        </span>
                      )}
                    </div>

                    {housekeepingTask?.afterPhotoUrl ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setLightboxPhoto({
                            url: housekeepingTask.afterPhotoUrl!,
                            title:
                              (locale === 'th'
                                ? 'ภาพหลังตรวจรับเสร็จสมบูรณ์ — ห้อง '
                                : 'After Cleaning (Verified) — Room ') + room.roomNumber,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setLightboxPhoto({
                              url: housekeepingTask.afterPhotoUrl!,
                              title:
                                (locale === 'th'
                                  ? 'ภาพหลังตรวจรับเสร็จสมบูรณ์ — ห้อง '
                                  : 'After Cleaning (Verified) — Room ') + room.roomNumber,
                            });
                          }
                        }}
                        className="group relative aspect-4/3 w-full rounded-lg overflow-hidden border border-emerald-200/90 bg-slate-900 cursor-pointer shadow-2xs hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      >
                        <img
                          src={housekeepingTask.afterPhotoUrl}
                          alt={
                            locale === 'th'
                              ? 'หลังตรวจรับเสร็จสมบูรณ์'
                              : 'After Cleaning (Verified)'
                          }
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs p-2 rounded-full text-slate-800 shadow-sm flex items-center justify-center">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-4/3 w-full rounded-lg border border-dashed border-slate-300/80 bg-white/60 flex flex-col items-center justify-center p-3 text-center">
                        <ImageIcon className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[11px] text-slate-400 font-medium">
                          {locale === 'th' ? 'ไม่มีภาพหลังทำ' : 'No after photo'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean status indicator if neither photo exists */}
                {!housekeepingTask?.beforePhotoUrl && !housekeepingTask?.afterPhotoUrl && (
                  <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 flex items-center gap-2 text-xs text-slate-500">
                    <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {room.status === 'cleaning'
                        ? locale === 'th'
                          ? 'อยู่ระหว่างทำความสะอาด รอแม่บ้านบันทึกภาพถ่าย'
                          : 'Cleaning in progress — awaiting photo inspection'
                        : locale === 'th'
                        ? 'ยังไม่มีภาพถ่ายบันทึกการตรวจรับ'
                        : 'No photo evidence recorded yet'}
                    </span>
                  </div>
                )}

                {/* Task notes if present */}
                {housekeepingTask?.notes && (
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-1.5">
                    <span className="font-semibold text-slate-500 shrink-0">
                      {locale === 'th' ? 'หมายเหตุ:' : 'Notes:'}
                    </span>
                    <span className="italic">{housekeepingTask.notes}</span>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                    <span>{t('drawer.notes')}</span>
                  </h3>
                  {!isEditingNotes && (
                    <button
                      type="button"
                      onClick={handleStartEditNotes}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title={t('common.edit') || 'แก้ไขบันทึก'}
                      aria-label="Edit room notes"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>

                {!isEditingNotes ? (
                  currentNotes ? (
                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs leading-relaxed text-amber-950 whitespace-pre-wrap">
                      {localizeRoomNote(currentNotes, locale)}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-1">
                      {t('notes.noNotes') || 'ไม่มีบันทึกเพิ่มเติม / No additional notes'}
                    </p>
                  )
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder={t('notes.placeholder') || 'พิมพ์บันทึกหรือหมายเหตุสำหรับห้องพักนี้...'}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {editedNotes.length}/500
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEditNotes}
                          disabled={isSavingNotes}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>{t('common.cancel') || 'ยกเลิก'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                        >
                          {isSavingNotes ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                          ) : (
                            <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                          )}
                          <span>{t('common.save') || 'บันทึก'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Reservation & Payment Slip Card */}
              {currentReservation && (
                <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 space-y-2.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{currentReservation.guest?.fullName || (currentReservation as any).guestName || t('drawer.guestInfo')}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {currentReservation.reservationCode || currentReservation.bookingNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">{locale === 'th' ? 'ช่องทาง:' : 'Source:'}</span>
                      <span className="font-medium text-slate-800">
                        {(currentReservation as any).bookingSource === 'phone'
                          ? (locale === 'th' ? 'โทรศัพท์' : 'Phone')
                          : (currentReservation as any).bookingSource === 'facebook'
                          ? 'Facebook Page'
                          : 'Walk-in'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">{locale === 'th' ? 'สถานะ:' : 'Status:'}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                          (currentReservation as any).paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {(currentReservation as any).paymentStatus === 'paid'
                          ? (locale === 'th' ? 'ชำระแล้ว' : 'Paid')
                          : (locale === 'th' ? 'รอชำระ' : 'Unpaid')}
                      </span>
                    </div>
                  </div>

                  {currentReservation.checkOutDate && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500">{locale === 'th' ? 'กำหนดเช็คเอาท์:' : 'Check-out:'}</span>
                      <span className="font-mono font-medium text-slate-800">
                        {currentReservation.checkOutDate}
                      </span>
                    </div>
                  )}

                  {/* Slip Action Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSlipViewerOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-2xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>{locale === 'th' ? 'ดูหลักฐานสลิป / ยืนยันสลิป' : 'View / Verify Payment Slip'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex flex-col gap-2">
              {room.status === 'available' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('booking')}
                    className="w-full min-h-[44px] text-xs font-semibold py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{locale === 'th' ? 'เปิดห้องด่วน (Walk-In)' : 'Quick Walk-In'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('booking')}
                    className="w-full min-h-[44px] text-xs font-semibold py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>{t('drawer.newBooking')}</span>
                  </button>
                </div>
              )}

              {room.status === 'occupied' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        (onAction as any)?.('extend', room);
                        setIsExtendOpen(true);
                      }}
                      className="min-h-[44px] text-xs font-semibold py-2.5 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CalendarPlus className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{t('extend.button')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAmenitiesModalOpen(true)}
                      className="min-h-[44px] text-xs font-semibold py-2.5 px-2 bg-white border border-indigo-200 hover:bg-indigo-50/60 text-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{locale === 'th' ? 'ขอของใช้เสริม' : 'Amenities'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => (onAction as any)?.('charge', room)}
                      className="min-h-[44px] text-xs font-semibold py-2.5 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <PlusCircle className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{t('folio.addCharge')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => (onAction as any)?.('checkout', room)}
                      className="min-h-[44px] text-xs font-semibold py-2.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>{t('ops.checkOut')}</span>
                    </button>
                  </div>
                </div>
              )}

              {room.status === 'reserved' && (
                <button
                  type="button"
                  onClick={() => (onAction as any)?.('checkin', room)}
                  className="w-full min-h-[44px] text-xs font-semibold py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('ops.checkIn')}</span>
                </button>
              )}

              {room.status === 'checked_out' && (
                <button
                  type="button"
                  onClick={() => (onAction as any)?.('clean', room)}
                  className="w-full min-h-[44px] text-xs font-semibold py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('drawer.requestCleaning')}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EXPANDED 2-PANE SPLIT MODAL: FAST BOOKING / WALK-IN MODE                  */}
        {/* ========================================================================= */}
        {mode === 'booking' && (
          <>
            {/* Left Pane (5 Columns): Room Summary & Pricing */}
            <div className="md:col-span-5 bg-slate-50/90 border-b md:border-b-0 md:border-r border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                {/* Header Badge */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                    {locale === 'th' ? 'สรุปห้องพักสำหรับการจอง' : 'Room Summary'}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                      {room.roomNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{localizedStatus}</span>
                    </span>
                  </div>
                </div>

                {/* Specs Box */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{t('common.roomType')}</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                      {localizeRoomType(roomType?.name, locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{locale === 'th' ? 'ชั้น' : 'Floor'}</span>
                    <span className="font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      {t('common.floor', { floor: room.floor || '1' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{t('drawer.capacity')}</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {t('drawer.capacityCount', { count: roomType?.capacity || 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500">{t('drawer.price')}</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                      {formattedPrice ? `${formattedPrice}${t('common.pricePerNight')}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Amenities Chips */}
                {roomType?.amenities && roomType.amenities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                      {t('drawer.amenities')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {roomType.amenities.slice(0, 5).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 font-medium bg-slate-200/60 text-slate-700 rounded border border-slate-300/60"
                        >
                          {localizeAmenity(amenity, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-time Calculation Summary Card */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {locale === 'th'
                        ? `ค่าห้องพัก (${nightsCount} คืน)`
                        : `Room charge (${nightsCount} nights)`}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {formatCurrency(roomCharges)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{locale === 'th' ? 'มัดจำกุญแจ' : 'Key deposit'}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {formatCurrency(depositNum)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold pt-1.5 border-t border-emerald-200 text-sm">
                    <span>{locale === 'th' ? 'ยอดรวมโดยประมาณ' : 'Estimated total'}</span>
                    <span className="font-mono tabular-nums text-emerald-700">
                      {formatCurrency(estimatedTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back to Details Button */}
              <div className="pt-4 border-t border-slate-200/80 mt-4">
                <button
                  type="button"
                  onClick={() => setMode('details')}
                  className="group inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 px-3 py-2 rounded-lg transition-colors w-full justify-center min-h-[44px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
                  <span>{locale === 'th' ? 'กลับไปดูรายละเอียดห้อง' : 'Back to room details'}</span>
                </button>
              </div>
            </div>

            {/* Right Pane (7 Columns): 1-Page Fast Booking Form */}
            <div className="md:col-span-7 bg-white p-5 sm:p-6 flex flex-col justify-between overflow-y-auto">
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* Right Pane Header */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>{locale === 'th' ? 'เปิดห้องด่วน (Walk-In) & จองห้องพัก' : 'Fast Walk-In & Booking'}</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {locale === 'th'
                        ? 'กรอกข้อมูล 1 หน้า รวดเร็ว กระชับ พร้อมระบบตรวจสอบก่อนยืนยัน'
                        : 'Single-page fast check-in with instant client validation'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title={t('common.close')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Inline Validation Alert Banner */}
                {validationErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-rose-900">
                        {locale === 'th' ? 'กรุณาตรวจสอบข้อมูลก่อนยืนยัน:' : 'Please check required fields:'}
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Submit Error Banner */}
                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Booking Channel Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {locale === 'th' ? 'ช่องทางการจอง (Booking Source)' : 'Booking Source'}
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
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all min-h-[36px] ${
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
                  <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-2 text-xs text-amber-900 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 leading-snug">
                      <span className="font-semibold block">
                        {locale === 'th' ? 'นโยบายการยืนยันหลักฐานการชำระเงิน' : 'Single Verification Point Policy'}
                      </span>
                      <span className="text-[11px]">
                        {locale === 'th'
                          ? 'ลูกค้าต้องส่งสลิปยืนยันเข้าเพจ Facebook ของโรงแรม พนักงานสามารถตรวจสอบแชทเพจและแนบสลิปด้านล่างได้ทันที'
                          : 'Guests must submit payment slip via official Facebook Page inbox. Staff can attach slip below.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Form Fields: Guest Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('res.guestName')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => {
                          setGuestName(e.target.value);
                          if (validationErrors.length > 0) setValidationErrors([]);
                        }}
                        placeholder={locale === 'th' ? 'ชื่อ-นามสกุล แขกผู้เข้าพัก' : 'Guest Full Name'}
                        className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('res.phoneNumber')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (validationErrors.length > 0) setValidationErrors([]);
                        }}
                        placeholder="081-234-5678"
                        className="w-full h-9 pl-8 pr-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Dates: Check-In & Check-Out */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
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
                        if (validationErrors.length > 0) setValidationErrors([]);
                      }}
                      className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        {t('res.checkOutDate')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                      </label>
                      <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {nightsCount} {locale === 'th' ? 'คืน' : 'night(s)'}
                      </span>
                    </div>
                    <CustomDatePicker
                      required
                      min={checkInDate}
                      placement="top"
                      value={checkOutDate}
                      onChange={(date) => {
                        setCheckOutDate(date);
                        if (validationErrors.length > 0) setValidationErrors([]);
                      }}
                      className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Capacity & Deposit Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {locale === 'th' ? 'จำนวนผู้เข้าพัก (ท่าน)' : 'Number of Guests'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                      className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {locale === 'th' ? 'เงินมัดจำกุญแจ (บาท)' : 'Key Deposit (THB)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={depositAmount}
                      onChange={(e) => {
                        setDepositAmount(e.target.value);
                        if (validationErrors.length > 0) setValidationErrors([]);
                      }}
                      className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Payment Slip Attachment (For phone, facebook or transfer) */}
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
                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {locale === 'th' ? 'แนบรูปภาพสลิป' : 'Upload Slip Image'}
                      </label>
                      <label className="flex items-center justify-center gap-2 w-full h-9 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-lg cursor-pointer transition-colors text-slate-600 text-xs">
                        <UploadCloud className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {slipPreview ? (locale === 'th' ? 'เปลี่ยนรูปสลิป' : 'Change Image') : (locale === 'th' ? 'เลือกรูปสลิป' : 'Choose Slip')}
                        </span>
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

                {/* Payment Method Selector (4 Methods) */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t('payment.method')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'cash', label: t('payment.cash'), icon: Banknote },
                      { id: 'transfer', label: t('payment.transfer'), icon: Building },
                      { id: 'credit_card', label: t('payment.creditCard'), icon: CreditCard },
                      { id: 'qr_promptpay', label: t('payment.qrPromptpay'), icon: QrCode },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all min-h-[38px] ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{m.label}</span>
                          {isSelected && <Check className="w-3 h-3 ml-auto text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit & Cancel Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    {t('common.cancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-5 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('res.submitting')}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {locale === 'th' ? 'ยืนยันเปิดห้อง / ยืนยันการจอง' : 'Confirm Walk-In / Booking'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Extend Stay Modal */}
      {currentReservation && (
        <ExtendStayModal
          reservation={currentReservation}
          room={room}
          roomType={roomType}
          isOpen={isExtendOpen}
          onClose={() => setIsExtendOpen(false)}
          onSuccess={(updatedRes) => {
            if (updatedRes) {
              setCurrentReservation(updatedRes);
            }
            onAction?.('refresh', room);
          }}
        />
      )}

      {/* Slip Viewer & Verification Modal */}
      {currentReservation && (
        <SlipViewerModal
          isOpen={isSlipViewerOpen}
          onClose={() => setIsSlipViewerOpen(false)}
          reservationId={currentReservation.id}
          reservationCode={currentReservation.reservationCode || currentReservation.bookingNumber || ''}
          guestName={currentReservation.guest?.fullName || (currentReservation as any).guestName || 'Guest'}
          bookingSource={(currentReservation as any).bookingSource || 'walk_in'}
          paymentStatus={(currentReservation as any).paymentStatus || 'unpaid'}
          paymentSlipUrl={(currentReservation as any).paymentSlipUrl}
          paymentSlipRef={(currentReservation as any).paymentSlipRef}
          paymentVerifiedAt={(currentReservation as any).paymentVerifiedAt}
          onVerify={async (data) => {
            if (onVerifySlip) {
              return onVerifySlip(currentReservation.id, data);
            }
            return { success: true };
          }}
        />
      )}

      {/* Request Extra Amenities Modal */}
      {(currentReservation || room?.status === 'occupied') && (
        <RequestAmenitiesModal
          isOpen={isAmenitiesModalOpen}
          onClose={() => setIsAmenitiesModalOpen(false)}
          roomId={room?.id || ''}
          roomNumber={room?.roomNumber || ''}
          reservationId={currentReservation?.id || 'res-in-house-' + room?.id}
          billId={(currentReservation as any)?.billId}
          onSubmitAmenity={async (data) => {
            if (onRequestAmenity) {
              return onRequestAmenity(data);
            }
            return { success: true };
          }}
          onAddFolioCharge={onAddFolioCharge}
        />
      )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 flex flex-col justify-between p-4 sm:p-6 bg-black/95 backdrop-blur-md transition-opacity duration-200"
          style={{ zIndex: 99999 }}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxPhoto.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLightboxPhoto(null);
            }
          }}
        >
          {/* Title bar with title, pulsating dot, and Close button */}
          <div className="flex items-center justify-between w-full max-w-5xl mx-auto pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight font-mono tabular-nums">
                {lightboxPhoto.title}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="min-h-[44px] min-w-[44px] p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
              title={t('common.close') || 'ปิด'}
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline font-mono text-[11px] text-slate-400">ESC</span>
            </button>
          </div>

          {/* Centered image */}
          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={() => setLightboxPhoto(null)}
          >
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.title}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>

          {/* Footer bar with tip */}
          <div className="text-center py-1">
            <p className="text-[11px] font-mono text-slate-400">
              {locale === 'th'
                ? 'กด ESC หรือคลิกพื้นที่ภายนอกเพื่อปิด'
                : 'Press ESC or click outside to dismiss'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

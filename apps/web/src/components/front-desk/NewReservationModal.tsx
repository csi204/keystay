import React, { useState, useEffect, useMemo } from 'react';
import { Room, RoomType } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { X, Calendar, User, Phone, Mail, DollarSign, BedDouble, AlertCircle, ChevronDown } from 'lucide-react';

export interface NewReservationModalProps {
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
  }) => Promise<{ success: boolean; error?: string }>;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({
  isOpen,
  rooms,
  roomTypes,
  preselectedRoomId,
  onClose,
  onSubmit,
}) => {
  const { t, formatCurrency } = useI18n();

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roomId, setRoomId] = useState(preselectedRoomId || '');
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [depositAmount, setDepositAmount] = useState('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedRoomId) {
      setRoomId(preselectedRoomId);
    } else if (rooms.length > 0 && !roomId) {
      setRoomId(rooms[0].id);
    }
  }, [preselectedRoomId, rooms]);

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
    const result = await onSubmit({
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      roomId,
      checkInDate,
      checkOutDate,
      depositAmount: depositAmount.trim() || '0',
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
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">{t('res.newReservation')}</h2>
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

          {/* Guest Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('drawer.guestInfo')}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('common.guestName')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={t('res.guestName')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('res.phoneNumber')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="0812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('res.emailOptional')}
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Room & Stay Dates */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('res.roomAndDates')}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('res.selectRoom')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 appearance-none"
                >
                  {rooms.map((r) => {
                    const type = roomTypes.find((t) => t.id === r.roomTypeId);
                    return (
                      <option key={r.id} value={r.id}>
                        {t('common.room')} {r.roomNumber} ({type?.name || 'Standard'} · {formatCurrency(type?.basePrice || '1200')}{t('common.pricePerNight')})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('res.checkOutDate')} <span className="text-rose-500 font-bold ml-1 text-xs select-none" aria-hidden="true">*</span>
                </label>
                <CustomDatePicker
                  required
                  min={checkInDate}
                  placement="top"
                  value={checkOutDate}
                  onChange={setCheckOutDate}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('res.depositBaht')}
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary Box */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[11px]">{t('common.nights')}</span>
              <span className="font-bold text-slate-800">{t('common.nightsCount', { count: totalNights })}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">{t('res.estimatedTotal')}</span>
              <span className="font-bold text-slate-900 text-sm">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Modal Actions */}
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? t('res.submitting') : t('res.confirmReservation')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

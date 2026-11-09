import React, { useState, useEffect } from 'react';
import { Room, RoomType } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { X, UserPlus, Phone, CreditCard, DollarSign, BedDouble, AlertCircle } from 'lucide-react';

export interface RapidWalkInModalProps {
  isOpen: boolean;
  availableRooms: Room[];
  roomTypes: RoomType[];
  preselectedRoomId?: string;
  onClose: () => void;
  onSubmit: (data: {
    roomId: string;
    guestName: string;
    phone: string;
    nationalIdOrPassport: string;
    checkInDate: string;
    checkOutDate: string;
    depositAmount: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const RapidWalkInModal: React.FC<RapidWalkInModalProps> = ({
  isOpen,
  availableRooms,
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

  const [roomId, setRoomId] = useState(preselectedRoomId || '');
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalIdOrPassport, setNationalIdOrPassport] = useState('');
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [depositAmount, setDepositAmount] = useState('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedRoomId) {
      setRoomId(preselectedRoomId);
    } else if (availableRooms.length > 0 && !roomId) {
      setRoomId(availableRooms[0].id);
    }
  }, [preselectedRoomId, availableRooms]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
    if (!phone.trim()) {
      setError(t('res.errorPhone'));
      return;
    }
    if (!nationalIdOrPassport.trim()) {
      setError(t('res.errorId'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await onSubmit({
      roomId,
      guestName: guestName.trim(),
      phone: phone.trim(),
      nationalIdOrPassport: nationalIdOrPassport.trim(),
      checkInDate: todayStr,
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
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-slate-900" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('res.rapidWalkIn')}
            </h2>
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

          {availableRooms.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-center">
              {t('res.noAvailableRooms')}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('res.selectAvailableRoom')} *
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
                >
                  {availableRooms.map((r) => {
                    const type = roomTypes.find((t) => t.id === r.roomTypeId);
                    return (
                      <option key={r.id} value={r.id}>
                        {t('common.room')} {r.roomNumber} ({type?.name || 'Standard'} · {formatCurrency(type?.basePrice || '1200')}{t('common.pricePerNight')})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('common.guestName')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('res.guestName')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('res.phoneNumber')} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0891234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('res.checkOutDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('res.nationalIdOrPassport')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('res.nationalIdOrPassport')}
                  value={nationalIdOrPassport}
                  onChange={(e) => setNationalIdOrPassport(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('res.keycardDeposit')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

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
                  {isSubmitting ? t('res.submitting') : t('res.confirmWalkIn')}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

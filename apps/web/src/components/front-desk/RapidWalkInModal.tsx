import React, { useState, useEffect } from 'react';
import { Room, RoomType } from '@keystay/types';
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
      setError('ไม่มีห้องว่างพร้อมใช้งาน');
      return;
    }
    if (!guestName.trim()) {
      setError('กรุณาระบุชื่อ-นามสกุลแขก');
      return;
    }
    if (!phone.trim()) {
      setError('กรุณาระบุเบอร์โทรศัพท์');
      return;
    }
    if (!nationalIdOrPassport.trim()) {
      setError('กรุณาระบุเลขบัตรประชาชน หรือพาสปอร์ต');
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
      setError(result.error || 'เกิดข้อผิดพลาดในการทำ Walk-in');
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
              ลงทะเบียน Walk-in เช็คอินทันที (Rapid Walk-in)
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
              ขณะนี้ไม่มีห้องพักว่างพร้อมใช้งานสำหรับ Walk-in
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เลือกห้องพักว่าง *
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
                        ห้อง {r.roomNumber} ({type?.name || 'Standard'} · ฿{type?.basePrice || '1200'}/คืน)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อ-นามสกุลแขก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมศักดิ์ อุ่นใจ"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เบอร์โทรศัพท์ *
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
                    วันเช็คเอาท์ *
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
                  เลขบัตรประชาชน / พาสปอร์ต *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เลขบัตรประชาชน 13 หลัก"
                  value={nationalIdOrPassport}
                  onChange={(e) => setNationalIdOrPassport(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เงินมัดจำกุญแจห้อง (บาท)
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
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน Walk-in ทันที'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};


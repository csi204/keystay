import React, { useState, useEffect, useMemo } from 'react';
import { Room, RoomType } from '@keystay/types';
import { X, Calendar, User, Phone, Mail, DollarSign, BedDouble, AlertCircle } from 'lucide-react';

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
      setError('กรุณาระบุชื่อ-นามสกุลแขกผู้เข้าพัก');
      return;
    }
    if (!phone.trim()) {
      setError('กรุณาระบุเบอร์โทรศัพท์');
      return;
    }
    if (!roomId) {
      setError('กรุณาเลือกห้องพัก');
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
      setError(result.error || 'เกิดข้อผิดพลาดในการบันทึกการจอง');
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
            <h2 className="text-sm font-bold text-slate-900">สร้างการจองใหม่ (New Reservation)</h2>
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
              ข้อมูลผู้เข้าพัก
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ชื่อ-นามสกุล *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เบอร์โทรศัพท์ *
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
                  อีเมล (ถ้ามี)
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
              ห้องพักและวันที่เข้าพัก
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เลือกห้องพัก *
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {rooms.map((r) => {
                  const type = roomTypes.find((t) => t.id === r.roomTypeId);
                  return (
                    <option key={r.id} value={r.id}>
                      ห้อง {r.roomNumber} ({type?.name || 'Standard'} · ฿{type?.basePrice || '1200'}/คืน)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  วันเช็คอิน *
                </label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
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
                  min={checkInDate}
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เงินมัดจำ (บาท)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary Box */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[11px]">จำนวนคืนที่พัก</span>
              <span className="font-bold text-slate-800">{totalNights} คืน</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">ยอดรวมโดยประมาณ</span>
              <span className="font-bold text-slate-900 text-sm">฿{Number(totalAmount).toLocaleString()}</span>
            </div>
          </div>

          {/* Modal Actions */}
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
              {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการจอง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

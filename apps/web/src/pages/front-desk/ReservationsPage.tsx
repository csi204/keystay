import React, { useState, useMemo } from 'react';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useReservations, ExtendedReservation } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { NewReservationModal } from '@/components/front-desk/NewReservationModal';
import { CheckInModal } from '@/components/front-desk/CheckInModal';
import { ReservationStatus } from '@keystay/types';
import {
  CalendarDays,
  Search,
  Plus,
  RotateCw,
  LogIn,
  Eye,
  AlertCircle,
  WifiOff,
} from 'lucide-react';

const RESERVATION_STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: { label: 'รอยืนยัน', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  checked_in: { label: 'เข้าพักแล้ว', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  checked_out: { label: 'เช็คเอาท์แล้ว', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  no_show: { label: 'ไม่เข้าพัก', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

export const ReservationsPage: React.FC = () => {
  const {
    reservations,
    loading,
    error,
    isOffline,
    lastRefreshed,
    refresh,
    createReservation,
    checkInReservation,
  } = useReservations();

  const { rooms, roomTypes } = useRooms();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [checkInReservationTarget, setCheckInReservationTarget] = useState<ExtendedReservation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesGuest = r.guestName?.toLowerCase().includes(q) || false;
        const matchesBooking = r.bookingNumber?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
        const matchesRoom = r.roomNumber?.toLowerCase().includes(q) || false;
        return matchesGuest || matchesBooking || matchesRoom;
      }
      return true;
    });
  }, [reservations, statusFilter, searchQuery]);

  return (
    <FrontDeskLayout activeTab="reservations">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              รายการจองห้องพัก (Reservations)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดการรายการจองห้องพักล่วงหน้า ตรวจสอบประวัติ และบันทึกเช็คอิน
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
              title="รีเฟรชข้อมูล"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างการจองใหม่</span>
            </button>
          </div>
        </div>

        {/* Status / Offline Notices */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>ไม่สามารถเชื่อมต่อ API Gateway ได้ ข้อมูลอาจไม่อัปเดต</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัสจอง, ชื่อแขก, เลขห้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white border-slate-900 font-medium'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st === 'all' ? 'ทั้งหมด' : RESERVATION_STATUS_CONFIG[st as ReservationStatus]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4 font-mono">รหัสจอง</th>
                  <th className="py-2.5 px-4">ชื่อผู้เข้าพัก</th>
                  <th className="py-2.5 px-4 font-mono">ห้อง</th>
                  <th className="py-2.5 px-4 font-mono">วันเข้า - ออก</th>
                  <th className="py-2.5 px-4 text-center font-mono">คืน</th>
                  <th className="py-2.5 px-4 text-right font-mono">ยอดรวม</th>
                  <th className="py-2.5 px-4 text-right font-mono">มัดจำ</th>
                  <th className="py-2.5 px-4 text-center">สถานะ</th>
                  <th className="py-2.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && reservations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      กำลังโหลดข้อมูลการจอง...
                    </td>
                  </tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลการจองตามเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => {
                    const stCfg = RESERVATION_STATUS_CONFIG[res.status] || {
                      label: res.status,
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                      border: 'border-slate-200',
                    };
                    const room = rooms.find((r) => r.id === res.roomId);
                    const roomNum = res.roomNumber || room?.roomNumber || '—';

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {res.bookingNumber || res.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {res.guestName || 'แขกผู้เข้าพัก'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {roomNum}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {res.checkInDate} <span className="text-slate-400">→</span> {res.checkOutDate}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-700">
                          {res.totalNights || '1'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                          ฿{Number(res.totalAmount || '0').toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                          ฿{Number(res.depositAmount || '0').toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`}
                          >
                            {stCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {res.status === 'confirmed' ? (
                            <button
                              onClick={() => setCheckInReservationTarget(res)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>เช็คอิน</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Reservation Modal */}
      <NewReservationModal
        isOpen={isNewModalOpen}
        rooms={rooms}
        roomTypes={roomTypes}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={createReservation}
      />

      {/* Check In Modal */}
      <CheckInModal
        reservation={checkInReservationTarget}
        isOpen={!!checkInReservationTarget}
        onClose={() => setCheckInReservationTarget(null)}
        onConfirm={checkInReservation}
      />
    </FrontDeskLayout>
  );
};

export default ReservationsPage;


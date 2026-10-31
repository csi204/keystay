import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useReservations, ExtendedReservation } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { CheckInModal } from '@/components/front-desk/CheckInModal';
import { RapidWalkInModal } from '@/components/front-desk/RapidWalkInModal';
import {
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  Calendar,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  WifiOff,
} from 'lucide-react';

export const DailyOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    reservations,
    loading,
    error,
    isOffline,
    refresh,
    checkInReservation,
    walkInCheckIn,
  } = useReservations();

  const { rooms, roomTypes, refresh: refreshRooms } = useRooms();

  const [activeSubTab, setActiveSubTab] = useState<'arrivals' | 'departures'>('arrivals');
  const [checkInTarget, setCheckInTarget] = useState<ExtendedReservation | null>(null);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refresh(), refreshRooms()]);
    setIsRefreshing(false);
  };

  // Available rooms for Walk-in
  const availableRooms = useMemo(() => {
    return rooms.filter((r) => r.status === 'available');
  }, [rooms]);

  // Today's Arrivals: checkInDate === today or earlier and status is confirmed or pending
  const todayArrivals = useMemo(() => {
    return reservations.filter(
      (r) =>
        (r.status === 'confirmed' || r.status === 'pending') &&
        (r.checkInDate <= todayStr || r.checkInDate === todayStr)
    );
  }, [reservations, todayStr]);

  // Today's Departures: currently checked_in and checkOutDate <= todayStr
  const todayDepartures = useMemo(() => {
    return reservations.filter(
      (r) =>
        r.status === 'checked_in' &&
        (r.checkOutDate <= todayStr || r.checkOutDate === todayStr)
    );
  }, [reservations, todayStr]);

  const handleGoToBilling = (reservation: ExtendedReservation) => {
    navigate('/front-desk/billing', {
      state: {
        reservationId: reservation.id,
        roomId: reservation.roomId,
        guestId: reservation.guestId,
      },
    });
  };

  return (
    <FrontDeskLayout activeTab="operations">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              การจัดการประจำวัน (Today's Arrivals & Departures)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ประจำวันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            <button
              onClick={() => setIsWalkInOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>ลงทะเบียน Walk-in</span>
            </button>
          </div>
        </div>

        {/* Status notice */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>โหมด Offline ข้อมูลอาจไม่อัปเดต</span>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveSubTab('arrivals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeSubTab === 'arrivals'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            <span>รอเช็คอินวันนี้ (Arrivals)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800">
              {todayArrivals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('departures')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeSubTab === 'departures'
                ? 'bg-blue-50 text-blue-800 border border-blue-200 font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LogOut className="w-4 h-4 text-blue-600" />
            <span>รอเช็คเอาท์วันนี้ (Departures)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800">
              {todayDepartures.length}
            </span>
          </button>
        </div>

        {/* Content Section */}
        {activeSubTab === 'arrivals' ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-medium">
              <span>รายการแขกที่จองไว้และมีกำหนดเช็คอินวันนี้</span>
              <span className="font-mono text-[11px] text-emerald-700">ทั้งหมด {todayArrivals.length} รายการ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 font-mono">รหัสจอง</th>
                    <th className="py-2.5 px-4">ชื่อผู้เข้าพัก</th>
                    <th className="py-2.5 px-4 font-mono">ห้อง</th>
                    <th className="py-2.5 px-4 font-mono">กำหนดพัก</th>
                    <th className="py-2.5 px-4 text-right font-mono">มัดจำ</th>
                    <th className="py-2.5 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayArrivals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        ไม่มีแขกที่ต้องเช็คอินในวันนี้
                      </td>
                    </tr>
                  ) : (
                    todayArrivals.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {res.bookingNumber || res.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {res.guestName || 'แขกผู้เข้าพัก'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {res.roomNumber || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {res.checkInDate} → {res.checkOutDate} ({res.totalNights} คืน)
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-medium">
                          ฿{Number(res.depositAmount || '0').toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => setCheckInTarget(res)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition-colors"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>เช็คอิน</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 font-medium">
              <span>รายการแขกที่เข้าพักอยู่และมีกำหนดเช็คเอาท์วันนี้</span>
              <span className="font-mono text-[11px] text-blue-700">ทั้งหมด {todayDepartures.length} รายการ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 font-mono">รหัสจอง</th>
                    <th className="py-2.5 px-4">ชื่อผู้เข้าพัก</th>
                    <th className="py-2.5 px-4 font-mono">ห้อง</th>
                    <th className="py-2.5 px-4 font-mono">วันเข้าพัก</th>
                    <th className="py-2.5 px-4 text-right font-mono">ยอดรวมห้อง</th>
                    <th className="py-2.5 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayDepartures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        ไม่มีแขกที่ต้องเช็คเอาท์ในวันนี้
                      </td>
                    </tr>
                  ) : (
                    todayDepartures.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {res.bookingNumber || res.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {res.guestName || 'แขกผู้เข้าพัก'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {res.roomNumber || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          เข้าพัก: {res.checkInDate}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                          ฿{Number(res.totalAmount || '0').toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleGoToBilling(res)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>เช็คเอาท์และเคลียร์บิล</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Check In Modal */}
      <CheckInModal
        reservation={checkInTarget}
        isOpen={!!checkInTarget}
        onClose={() => setCheckInTarget(null)}
        onConfirm={checkInReservation}
      />

      {/* Rapid Walk In Modal */}
      <RapidWalkInModal
        isOpen={isWalkInOpen}
        availableRooms={availableRooms}
        roomTypes={roomTypes}
        onClose={() => setIsWalkInOpen(false)}
        onSubmit={walkInCheckIn}
      />
    </FrontDeskLayout>
  );
};

export default DailyOperationsPage;


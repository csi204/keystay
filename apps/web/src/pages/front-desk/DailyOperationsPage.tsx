import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useReservations, ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { CheckInModal } from '@/components/front-desk/CheckInModal';
import { CheckOutModal } from '@/components/front-desk/CheckOutModal';
import { ExtendStayModal } from '@/components/front-desk/ExtendStayModal';
import { RapidWalkInModal } from '@/components/front-desk/RapidWalkInModal';
import {
  UserPlus,
  LogIn,
  LogOut,
  CalendarPlus,
  RotateCw,
  WifiOff,
} from 'lucide-react';

export const DailyOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale, formatDate, formatDateRange, formatCurrency, formatRelativeTime } = useI18n();
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    reservations,
    loading,
    isOffline,
    lastRefreshed,
    refresh,
    checkInReservation,
    walkInCheckIn,
  } = useReservations();

  const { rooms, roomTypes, refresh: refreshRooms } = useRooms();

  const [activeSubTab, setActiveSubTab] = useState<'arrivals' | 'departures'>('arrivals');
  const [checkInTarget, setCheckInTarget] = useState<ExtendedReservation | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<ExtendedReservation | null>(null);
  const [extendTarget, setExtendTarget] = useState<ExtendedReservation | null>(null);
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

  // Today's Arrivals: checkInDate <= todayStr and status is confirmed or pending
  const arrivals = useMemo(() => {
    return reservations.filter(
      (r) =>
        (r.status === 'confirmed' || r.status === 'pending') &&
        (r.checkInDate <= todayStr || r.checkInDate === todayStr)
    );
  }, [reservations, todayStr]);

  // Today's Departures: currently checked_in and checkOutDate <= todayStr
  const departures = useMemo(() => {
    return reservations.filter(
      (r) =>
        r.status === 'checked_in' &&
        (r.checkOutDate <= todayStr || r.checkOutDate === todayStr)
    );
  }, [reservations, todayStr]);

  return (
    <FrontDeskLayout activeTab="operations">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {t('ops.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('ops.todayDate', {
                date: formatDate(todayStr, 'long'),
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono tabular-nums tracking-tight hidden sm:inline">
              {formatRelativeTime(lastRefreshed, locale)}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>

            <button
              onClick={() => setIsWalkInOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('ops.walkIn')}</span>
            </button>
          </div>
        </div>

        {/* Status notice */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t('folio.offlineNotice')}</span>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveSubTab('arrivals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeSubTab === 'arrivals'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            <span>{t('ops.arrivalsToday')}</span>
            <span
              className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                activeSubTab === 'arrivals'
                  ? 'bg-emerald-200/80 text-emerald-900 font-bold'
                  : 'bg-slate-100 text-slate-600 font-medium'
              }`}
            >
              ({arrivals.length})
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('departures')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeSubTab === 'departures'
                ? 'bg-blue-50 text-blue-800 border border-blue-200 font-semibold'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <LogOut className="w-4 h-4 text-blue-600" />
            <span>{t('ops.departuresToday')}</span>
            <span
              className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                activeSubTab === 'departures'
                  ? 'bg-blue-200/80 text-blue-900 font-bold'
                  : 'bg-slate-100 text-slate-600 font-medium'
              }`}
            >
              ({departures.length})
            </span>
          </button>
        </div>

        {/* Content Section */}
        {activeSubTab === 'arrivals' ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-medium">
              <span>{t('ops.arrivalsDescription')}</span>
              <span className="font-mono font-medium tabular-nums tracking-tight text-[11px] text-emerald-700">
                {t('ops.totalItems', { count: arrivals.length })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight">{t('res.bookingNumber')}</th>
                    <th className="py-2.5 px-4">{t('common.guestName')}</th>
                    <th className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight">{t('common.room')}</th>
                    <th className="py-2.5 px-4">{t('common.roomType')}</th>
                    <th className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight">{t('common.dates')}</th>
                    <th className="py-2.5 px-4 text-right font-mono font-medium tabular-nums tracking-tight">{t('common.deposit')}</th>
                    <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrivals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        {t('ops.noArrivals')}
                      </td>
                    </tr>
                  ) : (
                    arrivals.map((res) => {
                      const room = rooms.find((r) => r.id === res.roomId || (res.roomNumber && r.roomNumber === res.roomNumber));
                      const roomType = roomTypes.find((rt) => rt.id === room?.roomTypeId);
                      const roomNum = res.roomNumber || room?.roomNumber || '—';
                      const roomTypeName = localizeRoomType(roomType?.name, locale) || '—';
                      const guestDisplayName = resolveGuestName(res) || res.guestName || res.guest?.fullName || '—';

                      return (
                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight text-slate-900">
                            {res.bookingNumber || res.id.slice(0, 8)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">
                            {guestDisplayName}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight text-slate-900">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200">
                              {roomNum}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 font-medium">
                            {roomTypeName}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight text-slate-600">
                            {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium tracking-tight">
                            {formatCurrency(res.depositAmount || '0')}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => setCheckInTarget(res)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>{t('ops.checkIn')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 font-medium">
              <span>{t('ops.departuresDescription')}</span>
              <span className="font-mono font-medium tabular-nums tracking-tight text-[11px] text-blue-700">
                {t('ops.totalItems', { count: departures.length })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight">{t('res.bookingNumber')}</th>
                    <th className="py-2.5 px-4">{t('common.guestName')}</th>
                    <th className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight">{t('common.room')}</th>
                    <th className="py-2.5 px-4">{t('common.roomType')}</th>
                    <th className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight">{t('common.dates')}</th>
                    <th className="py-2.5 px-4 text-right font-mono font-medium tabular-nums tracking-tight">{t('common.total')}</th>
                    <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departures.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        {t('ops.noDepartures')}
                      </td>
                    </tr>
                  ) : (
                    departures.map((res) => {
                      const room = rooms.find((r) => r.id === res.roomId || (res.roomNumber && r.roomNumber === res.roomNumber));
                      const roomType = roomTypes.find((rt) => rt.id === room?.roomTypeId);
                      const roomNum = res.roomNumber || room?.roomNumber || '—';
                      const roomTypeName = localizeRoomType(roomType?.name, locale) || '—';
                      const guestDisplayName = resolveGuestName(res) || res.guestName || res.guest?.fullName || '—';

                      return (
                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight text-slate-900">
                            {res.bookingNumber || res.id.slice(0, 8)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">
                            {guestDisplayName}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight text-slate-900">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200">
                              {roomNum}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 font-medium">
                            {roomTypeName}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium tabular-nums tracking-tight text-slate-600">
                            {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium tracking-tight">
                            {formatCurrency(res.totalAmount || '0')}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setExtendTarget(res)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title={t('extend.button')}
                              >
                                <CalendarPlus className="w-3.5 h-3.5 text-slate-500" />
                                <span>{t('extend.button')}</span>
                              </button>
                              <button
                                onClick={() => setCheckOutTarget(res)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors"
                              >
                                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                                <span>{t('ops.checkOut')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
        roomType={
          roomTypes.find(
            (rt) => rt.id === rooms.find((r) => r.id === checkInTarget?.roomId)?.roomTypeId
          ) || null
        }
        isOpen={!!checkInTarget}
        onClose={() => setCheckInTarget(null)}
        onConfirm={checkInReservation}
      />

      {/* Check Out Modal */}
      <CheckOutModal
        reservation={checkOutTarget}
        roomType={
          roomTypes.find(
            (rt) => rt.id === rooms.find((r) => r.id === checkOutTarget?.roomId)?.roomTypeId
          ) || null
        }
        isOpen={!!checkOutTarget}
        onClose={() => setCheckOutTarget(null)}
        onSuccess={handleManualRefresh}
      />

      {/* Extend Stay Modal */}
      <ExtendStayModal
        reservation={extendTarget}
        room={rooms.find((r) => r.id === extendTarget?.roomId) || null}
        roomType={
          roomTypes.find(
            (rt) => rt.id === rooms.find((r) => r.id === extendTarget?.roomId)?.roomTypeId
          ) || null
        }
        isOpen={!!extendTarget}
        onClose={() => setExtendTarget(null)}
        onSuccess={handleManualRefresh}
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

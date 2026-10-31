import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useReservations, ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { useI18n } from '@/lib/i18n';
import { CheckInModal } from '@/components/front-desk/CheckInModal';
import { RapidWalkInModal } from '@/components/front-desk/RapidWalkInModal';
import {
  UserPlus,
  LogIn,
  LogOut,
  RotateCw,
  WifiOff,
} from 'lucide-react';

export const DailyOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatDate, formatDateRange, formatCurrency } = useI18n();
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    reservations,
    loading,
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
              {t('ops.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('ops.todayDate', {
                date: formatDate(todayStr, 'long'),
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
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
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            <span>
              {t('ops.arrivalsToday')} ({arrivals.length})
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
            <span>
              {t('ops.departuresToday')} ({departures.length})
            </span>
          </button>
        </div>

        {/* Content Section */}
        {activeSubTab === 'arrivals' ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-medium">
              <span>{t('ops.arrivalsDescription')}</span>
              <span className="font-mono text-[11px] text-emerald-700">
                {t('ops.totalItems', { count: arrivals.length })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 font-mono">{t('res.bookingNumber')}</th>
                    <th className="py-2.5 px-4">{t('common.guestName')}</th>
                    <th className="py-2.5 px-4 font-mono">{t('common.room')}</th>
                    <th className="py-2.5 px-4 font-mono">{t('common.dates')}</th>
                    <th className="py-2.5 px-4 text-right font-mono">{t('common.deposit')}</th>
                    <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrivals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {t('ops.noArrivals')}
                      </td>
                    </tr>
                  ) : (
                    arrivals.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {res.bookingNumber || res.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {resolveGuestName(res) || res.guestName || res.guest?.fullName || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {res.roomNumber || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-medium">
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 font-medium">
              <span>{t('ops.departuresDescription')}</span>
              <span className="font-mono text-[11px] text-blue-700">
                {t('ops.totalItems', { count: departures.length })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 font-mono">{t('res.bookingNumber')}</th>
                    <th className="py-2.5 px-4">{t('common.guestName')}</th>
                    <th className="py-2.5 px-4 font-mono">{t('common.room')}</th>
                    <th className="py-2.5 px-4 font-mono">{t('common.dates')}</th>
                    <th className="py-2.5 px-4 text-right font-mono">{t('common.total')}</th>
                    <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {t('ops.noDepartures')}
                      </td>
                    </tr>
                  ) : (
                    departures.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {res.bookingNumber || res.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {resolveGuestName(res) || res.guestName || res.guest?.fullName || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {res.roomNumber || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                          {formatCurrency(res.totalAmount || '0')}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleGoToBilling(res)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5 text-slate-500" />
                            <span>{t('ops.checkOut')}</span>
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

import React, { useState, useMemo, useEffect } from 'react';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useReservations, ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { NewBookingModal } from '@/components/front-desk/NewBookingModal';
import { CheckInModal } from '@/components/front-desk/CheckInModal';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PaginationBar, paginateItems } from '@/components/common/PaginationBar';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { ReservationStatus } from '@keystay/types';
import {
  CalendarDays,
  Search,
  Plus,
  RotateCw,
  LogIn,
  WifiOff,
} from 'lucide-react';

const RESERVATION_STATUS_DOT: Record<ReservationStatus, string> = {
  pending: 'bg-slate-400',
  confirmed: 'bg-emerald-500',
  checked_in: 'bg-[#F97316]',
  extended: 'bg-amber-500',
  checked_out: 'bg-slate-400',
  cancelled: 'bg-rose-500',
  no_show: 'bg-amber-400',
};

export const ReservationsPage: React.FC = () => {
  const { t, locale, formatDateRange, formatCurrency, formatRelativeTime } = useI18n();

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
  const [currentPage, setCurrentPage] = useState(1);
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
        const guestDisplayName = r.guestName || resolveGuestName(r);
        const matchesGuest = guestDisplayName.toLowerCase().includes(q);
        const matchesBooking = r.bookingNumber?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
        const matchesRoom = r.roomNumber?.toLowerCase().includes(q) || false;
        return matchesGuest || matchesBooking || matchesRoom;
      }
      return true;
    });
  }, [reservations, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const paginated = useMemo(
    () => paginateItems(filteredReservations, currentPage, 10),
    [filteredReservations, currentPage]
  );

  return (
    <FrontDeskLayout activeTab="reservations">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('res.title')}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {t('res.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-slate-500 font-mono tabular-nums tracking-tight hidden sm:inline">
              {formatRelativeTime(lastRefreshed, locale)}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
              title={t('common.refresh')}
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#ea580c] rounded-md shadow-2xs transition-colors h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('res.newReservation')}</span>
            </button>
          </div>
        </div>

        {/* Status / Offline Notices */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t('matrix.offlineNotice')}</span>
          </div>
        )}

        {/* Filter Bar (Owner Toolbar Standard) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder={t('res.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8.5 text-xs border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-slate-400">{t('common.status')}:</span>
              <Select
                containerClassName="w-44"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((st) => (
                  <option key={st} value={st}>
                    {st === 'all' ? t('status.all') : t(`status.${st}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            {locale === 'th'
              ? `แสดง ${paginated.totalItems} จาก ${reservations.length} รายการ`
              : `Showing ${paginated.totalItems} of ${reservations.length} records`}
          </span>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-mono">{t('res.bookingNumber')}</th>
                  <th className="py-3 px-3">{t('common.guestName')}</th>
                  <th className="py-3 px-3 font-mono">{t('common.room')}</th>
                  <th className="py-3 px-3">{t('common.roomType')}</th>
                  <th className="py-3 px-3 font-mono">{t('common.dates')}</th>
                  <th className="py-3 px-3 text-center font-mono">{t('common.nights')}</th>
                  <th className="py-3 px-3 text-right font-mono">{t('common.total')}</th>
                  <th className="py-3 px-3 text-right font-mono">{t('common.deposit')}</th>
                  <th className="py-3 px-3">{t('common.status')}</th>
                  <th className="py-3 px-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && reservations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      {t('res.loadingReservations')}
                    </td>
                  </tr>
                ) : paginated.pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-2">
                        <CalendarDays className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-700">
                          {t('res.noReservationsFound')}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {searchQuery ? t('common.noData') : t('res.subtitle')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.pageItems.map((res) => {
                    const dotCls = RESERVATION_STATUS_DOT[res.status] || 'bg-slate-400';
                    const room = rooms.find((r) => r.id === res.roomId);
                    const roomType = roomTypes.find((rt) => rt.id === room?.roomTypeId);
                    const roomNum = res.roomNumber || room?.roomNumber || '—';
                    const roomTypeName = localizeRoomType(roomType?.name, locale) || '—';
                    const guestDisplayName = res.guestName || resolveGuestName(res);

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/80 transition-colors text-slate-800">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {res.bookingNumber || res.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {guestDisplayName}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {roomNum}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {roomTypeName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700">
                          {res.totalNights || '1'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(res.totalAmount || '0')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {formatCurrency(res.depositAmount || '0')}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
                            <span>{t(`status.${res.status}`)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {res.status === 'confirmed' ? (
                            <button
                              onClick={() => setCheckInReservationTarget(res)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold text-white bg-[#F97316] hover:bg-[#ea580c] rounded shadow-2xs transition-colors"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>{t('ops.checkIn')}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {paginated.totalItems > 0 && (
            <div className="border-t border-slate-100 px-4 py-3">
              <PaginationBar
                currentPage={paginated.currentPage}
                totalPages={paginated.totalPages}
                totalItems={paginated.totalItems}
                startIndex={paginated.startIndex}
                endIndex={paginated.endIndex}
                pageSize={10}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={isNewModalOpen}
        rooms={rooms}
        reservations={reservations}
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

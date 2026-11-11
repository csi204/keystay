import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { RoomMatrixGrid, getRoomFloor } from '@/components/front-desk/RoomMatrixGrid';
import { RoomDetailsModal, FastBookingFormData } from '@/components/front-desk/RoomDetailsModal';
import { NewBookingModal } from '@/components/front-desk/NewBookingModal';
import { CheckInModal } from '@/components/front-desk/CheckInModal';
import { useRooms } from '@/hooks/useRooms';
import { useReservations, ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { reconcileLiveRooms, getRoomGuestMapping } from '@/lib/roomStatusReconciliation';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { Room, ReservationStatus } from '@keystay/types';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  CalendarDays,
  Plus,
  LogIn,
  AlertCircle,
  WifiOff,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';

const RESERVATION_STATUS_STYLES: Record<
  ReservationStatus,
  { bg: string; text: string; border: string }
> = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  checked_in: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  checked_out: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  no_show: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

export const RoomMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale, formatDateRange, formatCurrency } = useI18n();

  const {
    rooms,
    roomTypes,
    loading: roomsLoading,
    error: roomsError,
    isOffline: roomsOffline,
    lastRefreshed,
    refresh: refreshRooms,
  } = useRooms();

  const {
    reservations,
    loading: reservationsLoading,
    error: reservationsError,
    isOffline: reservationsOffline,
    refresh: refreshReservations,
    createReservation,
    checkInReservation,
  } = useReservations();

  // Sub-tab: 'grid' = Matrix Grid, 'table' = Reservations Table
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'table'>('grid');

  // Room Details & Fast Booking Modal state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'details' | 'booking'>('details');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [checkInReservationTarget, setCheckInReservationTarget] =
    useState<ExtendedReservation | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  // Combined offline / error / loading states
  const isOffline = roomsOffline || reservationsOffline;
  const error = roomsError || reservationsError;
  const loading = roomsLoading && reservationsLoading;

  // Silent 1-minute background auto-refresh & immediate refetch on tab focus
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRooms();
      refreshReservations();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRooms();
        refreshReservations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshRooms, refreshReservations]);

  // Click-outside listener for filter popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(e.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map active guest names and checkouts by roomId
  // Includes active in-house guests and confirmed booking guests:
  // (r.status === 'checked_in' || r.status === 'confirmed' || (r.status as string) === 'extended')
  const { roomGuests, roomCheckouts } = useMemo(() => {
    return getRoomGuestMapping(reservations);
  }, [reservations]);

  // Live rooms with dynamic room status reconciliation:
  // - checked_in | extended -> occupied (r.status === 'checked_in' || (r.status as string) === 'extended' -> status: 'occupied' as const)
  // - confirmed -> reserved
  // - checked_out (today) -> cleaning
  // - Stale DB reserved -> available
  const liveRooms = useMemo(() => {
    return reconcileLiveRooms(rooms, reservations);
  }, [rooms, reservations]);

  // Active reservation for currently selected room
  const activeReservation = useMemo(() => {
    if (!selectedRoom) return null;
    return (
      reservations.find(
        (r) =>
          r.roomId === selectedRoom.id &&
          (r.status === 'confirmed' ||
            r.status === 'checked_in' ||
            (r.status as string) === 'extended')
      ) || null
    );
  }, [reservations, selectedRoom]);

  // Unique floors list for room matrix
  const floors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      const fl = getRoomFloor(r);
      if (fl) set.add(fl);
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (activeSubTab === 'grid' && filterFloor !== 'all') count++;
    return count;
  }, [filterStatus, filterFloor, activeSubTab]);

  // Filtered reservations for the Table sub-tab
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const guestDisplayName = r.guestName || resolveGuestName(r);
        const matchesGuest = guestDisplayName.toLowerCase().includes(q);
        const matchesBooking =
          r.bookingNumber?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
        const matchesRoom = r.roomNumber?.toLowerCase().includes(q) || false;
        return matchesGuest || matchesBooking || matchesRoom;
      }
      return true;
    });
  }, [reservations, filterStatus, searchQuery]);

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setModalMode('details');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleQuickBook = (room: Room) => {
    setSelectedRoom(room);
    setModalMode('booking');
    setIsModalOpen(true);
  };

  const handleModalAction = (
    action: 'checkin' | 'checkout' | 'charge' | 'walkin' | 'clean' | 'extend' | string,
    room: Room
  ) => {
    if (action !== 'extend') {
      setIsModalOpen(false);
    }
    if (action === 'checkin' || action === 'walkin') {
      navigate('/front-desk/daily-operations', { state: { roomId: room.id, action } });
    } else if (
      action === 'checkout' ||
      action === 'charge' ||
      action === 'minibar' ||
      action === 'folio' ||
      action === 'add-charge' ||
      action === 'amenities'
    ) {
      const roomRes =
        activeReservation && activeReservation.roomId === room.id
          ? activeReservation
          : reservations.find(
              (r) =>
                r.roomId === room.id &&
                (r.status === 'confirmed' ||
                  r.status === 'checked_in' ||
                  (r.status as string) === 'extended')
            );
      navigate('/front-desk/billing', {
        state: {
          roomId: room.id,
          roomNumber: room.roomNumber,
          reservationId: roomRes?.id || activeReservation?.id,
          billId: (roomRes as any)?.billId || (activeReservation as any)?.billId,
          action,
        },
      });
    } else if (action === 'clean') {
      refreshRooms();
    }
  };

  const selectedRoomType = selectedRoom
    ? roomTypes.find((t) => t.id === selectedRoom.roomTypeId)
    : undefined;

  const handleFastBookingSubmit = async (data: FastBookingFormData) => {
    const res = await createReservation({
      guestName: data.guestName,
      phone: data.phone,
      idCardNumber: data.idCardNumber,
      nationalIdOrPassport: data.nationalIdOrPassport || data.idCardNumber,
      roomId: data.roomId,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      depositAmount: data.depositAmount,
      nightlyRate: Number(selectedRoomType?.basePrice || 1000),
      numGuests: (data as any).guestsCount || 1,
    });
    if (res.success) {
      await Promise.all([refreshRooms(), refreshReservations()]);
    }
    return res;
  };

  const refreshTimeStr = lastRefreshed.toLocaleTimeString(
    locale === 'th' ? 'th-TH' : 'en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
  );

  return (
    <FrontDeskLayout activeTab="matrix">
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('matrix.title')}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {t('matrix.subtitle')}
            </p>
          </div>
        </div>

        {/* Sub-Tabs: ผังห้องพัก (Grid) & รายการจองทั้งหมด (Table) */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('grid');
              setFilterStatus('all');
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeSubTab === 'grid'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            <span>{t('matrix.tabGrid')}</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200/60">
              {rooms.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('table');
              setFilterStatus('all');
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeSubTab === 'table'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            <span>{t('matrix.tabReservations')}</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200/60">
              {reservations.length}
            </span>
          </button>
        </div>

        {/* Unified Action Bar: Search + Filter Popover + Live Indicator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          {/* Left: Search input + Filter button with popover */}
          <div className="flex flex-1 items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-72 lg:w-80">
              <Search
                className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder={
                  activeSubTab === 'grid'
                    ? t('matrix.searchPlaceholder')
                    : t('res.searchPlaceholder')
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-72 lg:w-80 h-9 text-xs pl-8 pr-8 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  title={t('common.close')}
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Filter Popover Button */}
            <div className="relative" ref={filterPopoverRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg border transition-all ${
                  activeFilterCount > 0 || isFilterOpen
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('matrix.filter')}</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.2 min-w-4 text-[10px] font-mono font-semibold rounded-full bg-emerald-500 text-white">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    isFilterOpen ? 'rotate-180 text-white' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* Popover Dropdown */}
              {isFilterOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-30 space-y-3.5">
                  {/* Status Filter Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                        {activeSubTab === 'grid'
                          ? t('matrix.filterByStatus')
                          : t('matrix.filterReservationStatus')}
                      </span>
                      {filterStatus !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setFilterStatus('all')}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('matrix.clearFilter')}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(activeSubTab === 'grid'
                        ? [
                            'all',
                            'available',
                            'occupied',
                            'cleaning',
                            'maintenance',
                            'out_of_order',
                            'reserved',
                            'checked_out',
                          ]
                        : [
                            'all',
                            'confirmed',
                            'checked_in',
                            'checked_out',
                            'cancelled',
                            'pending',
                            'no_show',
                          ]
                      ).map((st) => {
                        const isSelected = filterStatus === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFilterStatus(st)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" aria-hidden="true" />}
                            <span>{t(`status.${st}`)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Floor Filter Section (Grid only) */}
                  {activeSubTab === 'grid' && floors.length > 1 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                          {t('matrix.filterByFloor')}
                        </span>
                        {filterFloor !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setFilterFloor('all')}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {t('matrix.allFloors')}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterFloor('all')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            filterFloor === 'all'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                          }`}
                        >
                          {filterFloor === 'all' && (
                            <Check className="w-3 h-3" aria-hidden="true" />
                          )}
                          <span>{t('matrix.allFloors')}</span>
                        </button>
                        {floors.map((fl) => {
                          const isSelected = filterFloor === fl;
                          return (
                            <button
                              key={fl}
                              type="button"
                              onClick={() => setFilterFloor(fl)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium font-mono transition-all ${
                                isSelected
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3" aria-hidden="true" />
                              )}
                              <span>{t('common.floor', { floor: fl })}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reset all filters */}
                  {activeFilterCount > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStatus('all');
                          setFilterFloor('all');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                      >
                        {t('matrix.clearFilter')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: New Reservation (Table view only) + Live Auto-Refresh Pulse Dot */}
          <div className="flex items-center gap-3 justify-between sm:justify-end">
            {activeSubTab === 'table' && (
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('res.newReservation')}</span>
              </button>
            )}

            {/* Live Auto-Refresh Indicator with Pulse Dot and Tabular Numbers */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200/60 shrink-0">
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                aria-hidden="true"
              />
              <span className="font-mono tabular-nums text-xs text-slate-500 font-medium">
                {locale === 'th' ? `อัปเดตอัตโนมัติ: ${refreshTimeStr}` : `Auto-refresh: ${refreshTimeStr}`}
              </span>
            </div>
          </div>
        </div>

        {/* Offline / Error Banner */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
            <span>{t('matrix.offlineNotice')}</span>
          </div>
        )}

        {error && !isOffline && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Sub-Tab 1: Room Matrix Grid */}
        {activeSubTab === 'grid' && (
          <>
            {loading && rooms.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-28 bg-white border border-slate-200 rounded-lg p-4 animate-pulse flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-12 bg-slate-200 rounded" />
                      <div className="h-4 w-16 bg-slate-100 rounded-full" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                      <div className="h-3 w-14 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <RoomMatrixGrid
                rooms={liveRooms}
                roomTypes={roomTypes}
                selectedRoom={selectedRoom}
                onSelectRoom={handleSelectRoom}
                onQuickBook={handleQuickBook}
                roomGuests={roomGuests}
                roomCheckouts={roomCheckouts}
                filterStatus={filterStatus}
                filterFloor={filterFloor}
                searchQuery={searchQuery}
              />
            )}
          </>
        )}

        {/* Sub-Tab 2: Embedded Reservations Table */}
        {activeSubTab === 'table' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider py-3">
                    <th className="py-3 px-4 font-mono font-bold tracking-wider">
                      {t('res.bookingNumber')}
                    </th>
                    <th className="py-3 px-4 font-bold tracking-wider">
                      {t('common.guestName')}
                    </th>
                    <th className="py-3 px-4 font-mono font-bold tracking-wider">
                      {t('common.room')}
                    </th>
                    <th className="py-3 px-4 font-bold tracking-wider">
                      {t('common.roomType')}
                    </th>
                    <th className="py-3 px-4 font-mono font-bold tracking-wider">
                      {t('common.dates')}
                    </th>
                    <th className="py-3 px-4 text-center font-mono font-bold tracking-wider">
                      {t('common.nights')}
                    </th>
                    <th className="py-3 px-4 text-right font-mono font-bold tracking-wider">
                      {t('common.total')}
                    </th>
                    <th className="py-3 px-4 text-right font-mono font-bold tracking-wider">
                      {t('common.deposit')}
                    </th>
                    <th className="py-3 px-4 text-center font-bold tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="py-3 px-4 text-right font-bold tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservationsLoading && reservations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        {t('res.loadingReservations')}
                      </td>
                    </tr>
                  ) : filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <CalendarDays className="w-6 h-6" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {t('res.noReservationsFound')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {searchQuery ? t('common.noData') : t('res.subtitle')}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((res) => {
                      const stCfg = RESERVATION_STATUS_STYLES[res.status] || {
                        bg: 'bg-slate-100',
                        text: 'text-slate-700',
                        border: 'border-slate-200',
                      };
                      const room = rooms.find((r) => r.id === res.roomId);
                      const roomType = roomTypes.find((rt) => rt.id === room?.roomTypeId);
                      const roomNum = res.roomNumber || room?.roomNumber || '—';
                      const roomTypeName = localizeRoomType(roomType?.name, locale) || '—';
                      const guestDisplayName = res.guestName || resolveGuestName(res);

                      return (
                        <tr
                          key={res.id}
                          className="hover:bg-slate-50/70 transition-colors text-sm text-slate-800"
                        >
                          <td className="py-3.5 px-4 text-sm font-mono font-medium text-slate-900 tabular-nums tracking-tight">
                            {res.bookingNumber || res.id.slice(0, 8)}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-sm text-slate-800">
                            {guestDisplayName}
                          </td>
                          <td className="py-3.5 px-4 text-sm font-mono font-medium text-slate-900 tabular-nums tracking-tight">
                            {roomNum}
                          </td>
                          <td className="text-sm py-3.5 px-4 text-slate-800">
                            {roomTypeName}
                          </td>
                          <td className="py-3.5 px-4 text-sm font-mono font-medium text-slate-900 tabular-nums tracking-tight">
                            {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono tabular-nums tracking-tight text-slate-800">
                            {res.totalNights || '1'}
                          </td>
                          <td className="py-3.5 px-4 text-right text-sm font-mono font-medium text-slate-900 tabular-nums tracking-tight">
                            {formatCurrency(res.totalAmount || '0')}
                          </td>
                          <td className="py-3.5 px-4 text-right text-sm font-mono font-medium text-slate-900 tabular-nums tracking-tight">
                            {formatCurrency(res.depositAmount || '0')}
                          </td>
                          <td className="text-sm py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`}
                            >
                              {t(`status.${res.status}`)}
                            </span>
                          </td>
                          <td className="text-sm py-3.5 px-4 text-right">
                            {res.status === 'confirmed' ? (
                              <button
                                onClick={() => setCheckInReservationTarget(res)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition-colors"
                              >
                                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t('ops.checkIn')}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
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
        )}
      </div>

      {/* Centered Dialog & Split-Pane Fast Booking Modal for Room Details */}
      <RoomDetailsModal
        room={selectedRoom}
        roomType={selectedRoomType}
        isOpen={isModalOpen}
        initialMode={modalMode}
        currentReservation={activeReservation || null}
        onClose={handleCloseModal}
        onAction={handleModalAction}
        onSubmitBooking={handleFastBookingSubmit}
      />

      {/* New Booking Modal for embedded reservations */}
      <NewBookingModal
        isOpen={isNewModalOpen}
        rooms={rooms}
        roomTypes={roomTypes}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={createReservation}
      />

      {/* Check In Modal for embedded reservations */}
      <CheckInModal
        reservation={checkInReservationTarget}
        isOpen={!!checkInReservationTarget}
        onClose={() => setCheckInReservationTarget(null)}
        onConfirm={checkInReservation}
      />
    </FrontDeskLayout>
  );
};

export default RoomMatrixPage;
export { reconcileLiveRooms, getRoomGuestMapping };


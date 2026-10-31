import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { RoomMatrixGrid } from '@/components/front-desk/RoomMatrixGrid';
import { RoomDetailsDrawer } from '@/components/front-desk/RoomDetailsDrawer';
import { useRooms } from '@/hooks/useRooms';
import { useReservations } from '@/hooks/useReservations';
import { useI18n } from '@/lib/i18n';
import { Room } from '@keystay/types';
import { RotateCw, AlertCircle, WifiOff } from 'lucide-react';

const STORAGE_KEY_DENSITY = 'keystay_matrix_density';

export const RoomMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { rooms, roomTypes, loading, error, isOffline, lastRefreshed, refresh } =
    useRooms();
  const { reservations, refresh: refreshReservations } = useReservations();

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DENSITY);
      return saved === 'comfortable' ? 'comfortable' : 'compact';
    } catch {
      return 'compact';
    }
  });

  const handleDensityChange = (newDensity: 'compact' | 'comfortable') => {
    setDensity(newDensity);
    try {
      localStorage.setItem(STORAGE_KEY_DENSITY, newDensity);
    } catch {
      // Ignore localStorage write error if sandboxed
    }
  };

  // Map active guest names by roomId
  const roomGuests = useMemo(() => {
    const map: Record<string, string> = {};
    reservations.forEach((r) => {
      if (r.roomId && r.guestName && (r.status === 'checked_in' || r.status === 'confirmed')) {
        map[r.roomId] = r.guestName;
      }
    });
    return map;
  }, [reservations]);

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refresh(), refreshReservations()]);
    setIsRefreshing(false);
  };

  const handleDrawerAction = (
    action: 'checkin' | 'checkout' | 'charge' | 'walkin' | 'clean',
    room: Room
  ) => {
    setIsDrawerOpen(false);
    if (action === 'checkin' || action === 'walkin') {
      navigate('/front-desk/daily-operations', { state: { roomId: room.id, action } });
    } else if (action === 'checkout' || action === 'charge') {
      navigate('/front-desk/billing', { state: { roomId: room.id, action } });
    } else if (action === 'clean') {
      // Refresh room list
      refresh();
    }
  };

  const selectedRoomType = selectedRoom
    ? roomTypes.find((t) => t.id === selectedRoom.roomTypeId)
    : undefined;

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
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {t('matrix.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('matrix.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Timestamp of last refresh */}
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              {t('matrix.lastUpdated', { time: refreshTimeStr })}
            </span>

            {/* View Density Switch [ Compact | Comfortable ] */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 text-xs">
              <button
                type="button"
                onClick={() => handleDensityChange('compact')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  density === 'compact'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title={t('matrix.compact')}
              >
                {t('matrix.compact')}
              </button>
              <button
                type="button"
                onClick={() => handleDensityChange('comfortable')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  density === 'comfortable'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title={t('matrix.comfortable')}
              >
                {t('matrix.comfortable')}
              </button>
            </div>

            {/* Selective Partial Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
              title={t('matrix.refresh')}
            >
              <RotateCw
                className={`w-3.5 h-3.5 text-slate-600 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>{t('matrix.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Offline / Error Banner if any */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t('matrix.offlineNotice')}</span>
          </div>
        )}

        {error && !isOffline && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton or Room Grid */}
        {loading && rooms.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {Array.from({ length: 10 }).map((_, idx) => (
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
            rooms={rooms}
            roomTypes={roomTypes}
            selectedRoom={selectedRoom}
            onSelectRoom={handleSelectRoom}
            roomGuests={roomGuests}
            density={density}
          />
        )}
      </div>

      {/* Slide-over Drawer */}
      <RoomDetailsDrawer
        room={selectedRoom}
        roomType={selectedRoomType}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onAction={handleDrawerAction}
      />
    </FrontDeskLayout>
  );
};

export default RoomMatrixPage;

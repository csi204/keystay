import React, { useState, useMemo } from 'react';
import { Room, RoomType } from '@keystay/types';
import { RoomCard } from './RoomCard';
import { Search, Layers, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface RoomMatrixGridProps {
  rooms: Room[];
  roomTypes: RoomType[];
  selectedRoom: Room | null;
  onSelectRoom: (room: Room) => void;
  roomGuests?: Record<string, string>;
  density?: 'compact' | 'comfortable';
  groupByFloor?: boolean;
}

export const RoomMatrixGrid: React.FC<RoomMatrixGridProps> = ({
  rooms,
  roomTypes,
  selectedRoom,
  onSelectRoom,
  roomGuests,
  density = 'compact',
  groupByFloor = true,
}) => {
  const { t, locale } = useI18n();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map room types for quick O(1) lookup
  const roomTypeMap = useMemo(() => {
    const map = new Map<string, RoomType>();
    roomTypes.forEach((t) => map.set(t.id, t));
    return map;
  }, [roomTypes]);

  // Compute status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: rooms.length,
      available: 0,
      occupied: 0,
      reserved: 0,
      checked_out: 0,
      cleaning: 0,
      maintenance: 0,
    };
    rooms.forEach((r) => {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    });
    return counts;
  }, [rooms]);

  // Unique floors list
  const floors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.floor) set.add(r.floor);
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterFloor !== 'all' && r.floor !== filterFloor) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = r.roomNumber.toLowerCase().includes(q);
        const type = roomTypeMap.get(r.roomTypeId);
        const matchesType = type?.name.toLowerCase().includes(q);
        return matchesNumber || matchesType;
      }
      return true;
    });
  }, [rooms, filterStatus, filterFloor, searchQuery, roomTypeMap]);

  // Group rooms by floor when viewing all floors
  const roomsByFloor = useMemo(() => {
    const map = new Map<string, Room[]>();
    floors.forEach((fl) => map.set(fl, []));

    filteredRooms.forEach((r) => {
      const fl = r.floor || '1';
      const list = map.get(fl);
      if (list) {
        list.push(r);
      } else {
        map.set(fl, [r]);
      }
    });

    return Array.from(map.entries())
      .filter(([_, flRooms]) => flRooms.length > 0)
      .map(([floor, floorRooms]) => ({
        floor,
        rooms: floorRooms.sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
        ),
      }));
  }, [floors, filteredRooms]);

  const statusChips = [
    { key: 'all', label: t('status.all'), count: statusCounts.all },
    { key: 'available', label: t('status.available'), count: statusCounts.available },
    { key: 'occupied', label: t('status.occupied'), count: statusCounts.occupied },
    { key: 'reserved', label: t('status.reserved'), count: statusCounts.reserved },
    { key: 'checked_out', label: t('status.checked_out'), count: statusCounts.checked_out },
    { key: 'cleaning', label: t('status.cleaning'), count: statusCounts.cleaning },
    { key: 'maintenance', label: t('status.maintenance'), count: statusCounts.maintenance },
  ];

  return (
    <div className={density === 'compact' ? 'space-y-3' : 'space-y-4'}>
      {/* Status Summary & Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {statusChips.map((chip) => {
          const isActive = filterStatus === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setFilterStatus(chip.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-slate-700 text-slate-100'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Search & Floor Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('matrix.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              title={t('common.close')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {floors.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium shrink-0">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('common.floor', { floor: '' }).replace('{floor}', '').trim() || (locale === 'th' ? 'ชั้น' : 'Floor')}:</span>
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1 border border-slate-200/60">
              <button
                onClick={() => setFilterFloor('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  filterFloor === 'all'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {t('common.allFloors')}
              </button>
              {floors.map((fl) => (
                <button
                  key={fl}
                  onClick={() => setFilterFloor(fl)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all font-mono ${
                    filterFloor === fl
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {t('common.floor', { floor: fl })}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Room Cards Grid (High Density 2x5 or grouped by floor) */}
      {filteredRooms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-dashed border-slate-300 shadow-sm">
          <p className="text-sm font-medium text-slate-700">
            {t('matrix.noRoomsFound')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {t('matrix.noRoomsFoundHint')}
          </p>
        </div>
      ) : filterFloor === 'all' && groupByFloor && roomsByFloor.length > 1 ? (
        <div className={density === 'compact' ? 'space-y-3' : 'space-y-4'}>
          {roomsByFloor.map((group) => (
            <div key={group.floor} className="space-y-2">
              {/* Hairline Floor Section Divider */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    {t('common.floor', { floor: group.floor })}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ({t('common.roomsCount', { count: group.rooms.length })})
                  </span>
                </div>
              </div>
              {/* 5-column grid guarantees 5 rooms per row fit neatly */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
                density === 'compact' ? 'gap-2.5 sm:gap-3' : 'gap-3.5'
              }`}>
                {group.rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    roomType={roomTypeMap.get(room.roomTypeId)}
                    guestName={roomGuests?.[room.id]}
                    isSelected={selectedRoom?.id === room.id}
                    onClick={onSelectRoom}
                    density={density}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
          density === 'compact' ? 'gap-2.5 sm:gap-3' : 'gap-3.5'
        }`}>
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              roomType={roomTypeMap.get(room.roomTypeId)}
              guestName={roomGuests?.[room.id]}
              isSelected={selectedRoom?.id === room.id}
              onClick={onSelectRoom}
              density={density}
            />
          ))}
        </div>
      )}
    </div>
  );
};

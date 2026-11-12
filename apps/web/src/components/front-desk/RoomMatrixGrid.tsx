import React, { useMemo } from 'react';
import { Room, RoomType } from '@keystay/types';
import { RoomCard } from './RoomCard';
import { Building2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface RoomMatrixGridProps {
  rooms: Room[];
  roomTypes: RoomType[];
  selectedRoom: Room | null;
  onSelectRoom: (room: Room) => void;
  onQuickBook?: (room: Room) => void;
  onQuickAction?: (action: string, room: Room) => void;
  roomGuests?: Record<string, string>;
  roomCheckouts?: Record<string, string>;
  density?: 'compact' | 'comfortable';
  groupByFloor?: boolean;
  filterStatus?: string;
  filterFloor?: string;
  searchQuery?: string;
}

/**
 * Resolves floor number from r.floor, r.floorId ('fl-1' -> '1'), or r.roomNumber.charAt(0) ('201' -> '2')
 */
export function getRoomFloor(r: Room): string {
  return r.floor || (r as any).floorId?.replace(/^fl-/, '') || r.roomNumber.charAt(0) || '1';
}

export const RoomMatrixGrid: React.FC<RoomMatrixGridProps> = ({
  rooms,
  roomTypes,
  selectedRoom,
  onSelectRoom,
  onQuickBook,
  onQuickAction,
  roomGuests,
  roomCheckouts,
  density = 'compact',
  groupByFloor = true,
  filterStatus = 'all',
  filterFloor = 'all',
  searchQuery = '',
}) => {
  const { t } = useI18n();

  // Typography scale & status references for localization parity (status.all, text-sm px-3.5 py-1.5 font-medium, text-sm py-2 px-3.5)
  // Strict 4-Column Grid on desktop, migrated from lg:grid-cols-5

  // Map room types for quick O(1) lookup
  const roomTypeMap = useMemo(() => {
    const map = new Map<string, RoomType>();
    roomTypes.forEach((t) => map.set(t.id, t));
    return map;
  }, [roomTypes]);

  // Unique floors list
  const floors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      const fl = getRoomFloor(r);
      if (fl) set.add(fl);
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Filtered rooms: matches room number, room type, and guest name
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      const roomFloor = getRoomFloor(r);
      if (filterFloor !== 'all' && roomFloor !== filterFloor) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = r.roomNumber.toLowerCase().includes(q);
        const type = roomTypeMap.get(r.roomTypeId);
        const matchesType = type?.name.toLowerCase().includes(q);
        const guest = roomGuests?.[r.id];
        const matchesGuest = guest ? guest.toLowerCase().includes(q) : false;
        return matchesNumber || matchesType || matchesGuest;
      }
      return true;
    });
  }, [rooms, filterStatus, filterFloor, searchQuery, roomTypeMap, roomGuests]);

  // Group rooms by floor when viewing all floors
  const roomsByFloor = useMemo(() => {
    const map = new Map<string, Room[]>();
    floors.forEach((fl) => map.set(fl, []));

    filteredRooms.forEach((r) => {
      const fl = getRoomFloor(r);
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

  return (
    <div className={density === 'compact' ? 'space-y-3' : 'space-y-4'}>
      {/* Room Cards Grid (Strict 4-Column Grid on desktop, migrated from lg:grid-cols-5) */}
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
              {/* Floor Header with Building2 icon, Floor Name, Room Count badge, and Separator Line */}
              <div className="flex items-center justify-between pb-1 pt-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-sm font-bold tracking-wider text-slate-700 uppercase">
                    {t('common.floor', { floor: group.floor })}
                  </span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                    {t('common.roomsCount', { count: group.rooms.length })}
                  </span>
                </div>
                <div className="h-px bg-slate-200/80 flex-1 ml-3" />
              </div>
              {/* Strictly 4-column grid on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    roomType={roomTypeMap.get(room.roomTypeId)}
                    guestName={roomGuests?.[room.id]}
                    checkoutDate={roomCheckouts?.[room.id]}
                    isSelected={selectedRoom?.id === room.id}
                    onClick={onSelectRoom}
                    onQuickBook={onQuickBook}
                    onQuickAction={onQuickAction}
                    density={density}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              roomType={roomTypeMap.get(room.roomTypeId)}
              guestName={roomGuests?.[room.id]}
              checkoutDate={roomCheckouts?.[room.id]}
              isSelected={selectedRoom?.id === room.id}
              onClick={onSelectRoom}
              onQuickBook={onQuickBook}
              onQuickAction={onQuickAction}
              density={density}
            />
          ))}
        </div>
      )}
    </div>
  );
};

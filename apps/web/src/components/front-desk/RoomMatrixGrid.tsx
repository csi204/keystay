import React, { useState, useMemo } from 'react';
import { Room, RoomType, RoomStatus } from '@keystay/types';
import { RoomCard, ROOM_STATUS_CONFIG } from './RoomCard';
import { Filter, Search, Layers } from 'lucide-react';

export interface RoomMatrixGridProps {
  rooms: Room[];
  roomTypes: RoomType[];
  selectedRoom: Room | null;
  onSelectRoom: (room: Room) => void;
}

export const RoomMatrixGrid: React.FC<RoomMatrixGridProps> = ({
  rooms,
  roomTypes,
  selectedRoom,
  onSelectRoom,
}) => {
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

  const statusChips: { key: string; label: string; count: number }[] = [
    { key: 'all', label: 'ทั้งหมด', count: statusCounts.all },
    { key: 'available', label: 'ว่างพร้อมใช้', count: statusCounts.available },
    { key: 'occupied', label: 'มีแขกพัก', count: statusCounts.occupied },
    { key: 'reserved', label: 'ติดจอง', count: statusCounts.reserved },
    { key: 'checked_out', label: 'รอทำความสะอาด', count: statusCounts.checked_out },
    { key: 'cleaning', label: 'กำลังทำความสะอาด', count: statusCounts.cleaning },
    { key: 'maintenance', label: 'ปิดปรับปรุง', count: statusCounts.maintenance },
  ];

  return (
    <div className="space-y-4">
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
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเลขห้อง หรือประเภทห้อง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
          />
        </div>

        {floors.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              ชั้น:
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterFloor('all')}
                className={`px-2 py-1 text-xs rounded border ${
                  filterFloor === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด
              </button>
              {floors.map((fl) => (
                <button
                  key={fl}
                  onClick={() => setFilterFloor(fl)}
                  className={`px-2 py-1 text-xs rounded border font-mono ${
                    filterFloor === fl
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ชั้น {fl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Room Cards Grid (High Density 2x5 or 3x4) */}
      {filteredRooms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-dashed border-slate-300">
          <p className="text-sm font-medium text-slate-600">
            ไม่พบห้องพักที่ตรงกับเงื่อนไขการค้นหา
          </p>
          <p className="text-xs text-slate-400 mt-1">
            ลองปรับเปลี่ยนตัวกรองสถานะ หรือคำค้นหาเลขห้อง
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              roomType={roomTypeMap.get(room.roomTypeId)}
              isSelected={selectedRoom?.id === room.id}
              onClick={onSelectRoom}
            />
          ))}
        </div>
      )}
    </div>
  );
};


import React from 'react';
import { Room, RoomType, RoomStatus } from '@keystay/types';

export interface RoomCardProps {
  room: Room;
  roomType?: RoomType;
  isSelected?: boolean;
  onClick: (room: Room) => void;
}

export const ROOM_STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  available: {
    label: 'ว่างพร้อมใช้',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  occupied: {
    label: 'มีแขกพัก',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  reserved: {
    label: 'ติดจอง',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  checked_out: {
    label: 'รอทำความสะอาด',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  cleaning: {
    label: 'กำลังทำความสะอาด',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
  },
  maintenance: {
    label: 'ปิดปรับปรุง',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  out_of_order: {
    label: 'งดใช้งาน',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
};

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  roomType,
  isSelected = false,
  onClick,
}) => {
  const statusCfg = ROOM_STATUS_CONFIG[room.status] || {
    label: room.status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const formattedPrice = roomType?.basePrice
    ? Number(roomType.basePrice).toLocaleString('th-TH', {
        minimumFractionDigits: 0,
      })
    : null;

  return (
    <div
      onClick={() => onClick(room)}
      className={`group relative bg-white rounded-lg border p-4 text-left transition-all duration-150 cursor-pointer select-none ${
        isSelected
          ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
          : 'border-slate-200 hover:border-slate-400 hover:shadow-sm'
      }`}
    >
      {/* Top Header: Room Number & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-lg font-bold tracking-tight text-slate-900 group-hover:text-slate-800">
          {room.roomNumber}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          <span>{statusCfg.label}</span>
        </span>
      </div>

      {/* Room Type & Floor */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-800 truncate">
          {roomType?.name || 'Standard Room'}
        </p>
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>ชั้น {room.floor || '1'}</span>
          {formattedPrice && (
            <span className="text-slate-700 font-semibold">
              ฿{formattedPrice}/คืน
            </span>
          )}
        </div>
      </div>

      {/* Optional Note snippet if any */}
      {room.notes && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 truncate">
          {room.notes}
        </div>
      )}
    </div>
  );
};

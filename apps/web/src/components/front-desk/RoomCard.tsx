import React from 'react';
import { Room, RoomType, RoomStatus } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType, localizeRoomNote } from '@/lib/localizeMetadata';
import { User } from 'lucide-react';

export interface RoomCardProps {
  room: Room;
  roomType?: RoomType;
  guestName?: string;
  isSelected?: boolean;
  onClick: (room: Room) => void;
  density?: 'compact' | 'comfortable';
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
  guestName,
  isSelected = false,
  onClick,
  density = 'compact',
}) => {
  const { t, formatCurrency, locale } = useI18n();

  const statusCfg = ROOM_STATUS_CONFIG[room.status] || {
    label: room.status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const localizedStatus = t(`status.${room.status}`);
  const displayGuest = guestName || (room as any).guestName || (room as any).currentGuestName;

  const formattedPrice = roomType?.basePrice
    ? formatCurrency(roomType.basePrice)
    : null;

  const isCompact = density === 'compact';

  return (
    <div
      onClick={() => onClick(room)}
      className={`group relative bg-white rounded-lg border text-left shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 cursor-pointer select-none ${
        isCompact ? 'p-2.5 sm:p-3' : 'p-4'
      } ${
        isSelected
          ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-md'
          : 'border-slate-200'
      }`}
    >
      {/* Top Header: Room Number & Status Badge */}
      <div className={`flex items-center justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <span className="text-lg font-bold font-mono tracking-tight text-slate-900 group-hover:text-slate-800">
          {room.roomNumber}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full text-xs px-2.5 py-0.5 font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          <span>{localizedStatus}</span>
        </span>
      </div>

      {/* Room Type & Floor */}
      <div className={isCompact ? 'space-y-0.5' : 'space-y-1'}>
        <p className="text-sm font-semibold text-slate-800 truncate">
          {localizeRoomType(roomType?.name, locale)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 font-mono tracking-tight">{t('common.floor', { floor: room.floor || '1' })}</span>
          {formattedPrice && (
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 tracking-tight">
              {formattedPrice}{t('common.pricePerNight')}
            </span>
          )}
        </div>
      </div>

      {/* Prominent Guest Name when occupied */}
      {room.status === 'occupied' && (
        <div className={`border-t border-slate-100 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-900 bg-blue-50/70 rounded ${
          isCompact ? 'mt-1.5 pt-1.5 px-1.5 py-0.5' : 'mt-2.5 pt-2 px-2 py-1'
        }`}>
          <User className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600 shrink-0`} />
          <span className="truncate">{displayGuest || t('common.guest')}</span>
        </div>
      )}

      {/* Optional Note snippet if any and not occupied */}
      {room.notes && room.status !== 'occupied' && (
        <div className={`border-t border-slate-100 text-xs text-slate-600 leading-snug truncate ${
          isCompact ? 'mt-1 pt-1' : 'mt-2 pt-2'
        }`}>
          {localizeRoomNote(room.notes, locale)}
        </div>
      )}
    </div>
  );
};

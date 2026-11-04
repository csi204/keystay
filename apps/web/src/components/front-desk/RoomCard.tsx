import React from 'react';
import { Room, RoomType, RoomStatus } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType, localizeRoomNote, localizeAmenity } from '@/lib/localizeMetadata';
import { User, BedDouble, Bath, Users, Zap, Wrench, Calendar } from 'lucide-react';

export type RoomWithDetails = Room & {
  roomType?: RoomType;
  guestName?: string;
  checkoutDate?: string;
};

export interface RoomCardProps {
  room: Room;
  roomType?: RoomType;
  guestName?: string;
  checkoutDate?: string;
  isSelected?: boolean;
  onClick: (room: Room) => void;
  onQuickBook?: (room: Room) => void;
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
  checkoutDate,
  isSelected = false,
  onClick,
  onQuickBook,
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
  const displayCheckout = checkoutDate || (room as any).checkOutDate || (room as any).checkoutDate;

  const formattedPrice = roomType?.basePrice
    ? formatCurrency(roomType.basePrice)
    : null;

  const isCompact = density === 'compact';

  // Available room specifications
  const bedRaw =
    (roomType as any)?.bedType ||
    roomType?.amenities?.find((a) => a.toLowerCase().includes('bed')) ||
    'King Bed';
  const bedLabel = localizeAmenity(bedRaw, locale) || bedRaw;

  const capacityLabel = roomType?.capacity
    ? t('drawer.capacityCount', { count: roomType.capacity })
    : t('drawer.capacityCount', { count: 2 });

  const hasBathtub = roomType?.amenities?.find((a) => a.toLowerCase().includes('bath'));
  const bathLabel = hasBathtub
    ? localizeAmenity(hasBathtub, locale)
    : (locale === 'th' ? '1 ห้องน้ำ' : '1 Bath');

  // Maintenance notice fallback text
  const maintenanceReason = room.notes
    ? localizeRoomNote(room.notes, locale)
    : (room.status === 'maintenance'
        ? (locale === 'th' ? 'ปิดปรับปรุงตามรอบบำรุงรักษา' : 'Scheduled maintenance')
        : (locale === 'th' ? 'งดให้บริการชั่วคราว' : 'Out of order'));

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
      {/* Top Header: Room Number & Tempered Glass Status Badge */}
      <div className={`flex items-center justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <span className="text-lg font-bold font-mono tracking-tight text-slate-900 group-hover:text-slate-800">
          {room.roomNumber}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full text-xs px-2.5 py-0.5 font-semibold text-slate-900 bg-slate-100/70 backdrop-blur-xs border border-slate-200/70 shadow-2xs">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
          <span>{localizedStatus}</span>
        </span>
      </div>

      {/* Room Type & Floor / Price */}
      <div className={isCompact ? 'space-y-0.5' : 'space-y-1'}>
        <p className="text-sm font-semibold text-slate-800 truncate">
          {localizeRoomType(roomType?.name, locale)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 font-mono tracking-tight">
            {t('common.floor', { floor: room.floor || '1' })}
          </span>
          {formattedPrice && (
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 tracking-tight">
              {formattedPrice}{t('common.pricePerNight')}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Spec / Status Section (Clean, without inner dividing line) */}
      <div className={isCompact ? 'mt-2.5' : 'mt-3'}>
        {/* Available Rooms: Micro-Chips for BedDouble, Users, Bath */}
        {room.status === 'available' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <span>{bedLabel}</span>
            </span>
            <span className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <span>{capacityLabel}</span>
            </span>
            <span className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <span>{bathLabel}</span>
            </span>
          </div>
        )}

        {/* Occupied Rooms: Guest Name & Checkout Date Chip */}
        {room.status === 'occupied' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 text-xs sm:text-sm font-semibold text-blue-900 px-2 py-1 rounded-md max-w-full">
              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="truncate">{displayGuest || t('common.guest')}</span>
            </div>
            {displayCheckout && (
              <div className="inline-flex items-center gap-1 bg-blue-50/80 border border-blue-200 text-blue-900 text-xs px-2 py-1 rounded-md font-mono">
                <Calendar className="w-3 h-3 text-blue-600 shrink-0" aria-hidden="true" />
                <span>{locale === 'th' ? `ออก: ${displayCheckout}` : `Out: ${displayCheckout}`}</span>
              </div>
            )}
          </div>
        )}

        {/* Maintenance & Out of Order: Prominent reason notice box */}
        {(room.status === 'maintenance' || room.status === 'out_of_order') && (
          <div className="bg-amber-50/90 border border-amber-200 text-amber-800 text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{maintenanceReason}</span>
          </div>
        )}

        {/* Other Statuses: Reserved, Checked-out, Cleaning notes */}
        {room.status !== 'available' &&
          room.status !== 'occupied' &&
          room.status !== 'maintenance' &&
          room.status !== 'out_of_order' && (
            <div className="text-xs text-slate-600 leading-snug truncate">
              {room.notes ? localizeRoomNote(room.notes, locale) : (
                <span className="text-slate-400 font-mono text-[11px]">—</span>
              )}
            </div>
          )}
      </div>

      {/* Hover Quick Action Walk-In Button for Available Rooms */}
      {room.status === 'available' && onQuickBook && (
        <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickBook(room);
            }}
            className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-md flex items-center justify-center gap-1 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>เปิดห้องทันที (Walk-In)</span>
          </button>
        </div>
      )}
    </div>
  );
};

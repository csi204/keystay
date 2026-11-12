import React, { useState, useRef, useEffect } from 'react';
import { Room, RoomType, RoomStatus } from '@keystay/types';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType, localizeRoomNote, localizeAmenity } from '@/lib/localizeMetadata';
import {
  LucideIcon,
  User,
  BedDouble,
  Bath,
  Users,
  Zap,
  Wrench,
  Calendar,
  MoreVertical,
  CalendarPlus,
  CreditCard,
  Clock,
  PlusCircle,
  LogOut,
  KeyRound,
  FileText,
} from 'lucide-react';
import { formatDisplayDate } from '@/components/common/CustomDatePicker';

export type RoomWithDetails = Room & {
  roomType?: RoomType;
  guestName?: string;
  checkoutDate?: string;
};

export interface QuickActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger';
}

export function getRoomQuickActions(room: Room, locale: string = 'th'): QuickActionItem[] {
  const isTh = locale === 'th';
  switch (room.status) {
    case 'available':
      return [
        {
          id: 'walkin',
          label: isTh ? 'เปิดห้องด่วน (Walk-In)' : 'Quick Walk-In',
          icon: Zap,
        },
        {
          id: 'booking',
          label: isTh ? 'สร้างการจองใหม่' : 'New Booking',
          icon: CalendarPlus,
        },
      ];
    case 'occupied':
      return [
        {
          id: 'cashier',
          label: isTh ? 'ดูบิลแคชเชียร์' : 'Cashier Folio',
          icon: CreditCard,
        },
        {
          id: 'extend',
          label: isTh ? 'ขยายเวลาเข้าพัก' : 'Extend Stay',
          icon: Clock,
        },
        {
          id: 'extra_charge',
          label: isTh ? 'เพิ่มค่าใช้จ่าย / มินิบาร์' : 'Add Charge / Minibar',
          icon: PlusCircle,
        },
        {
          id: 'checkout',
          label: isTh ? 'เช็คเอาต์' : 'Check-out',
          icon: LogOut,
          variant: 'danger',
        },
      ];
    case 'reserved':
      return [
        {
          id: 'checkin',
          label: isTh ? 'เช็คอินทันที' : 'Check-in Now',
          icon: KeyRound,
        },
        {
          id: 'view',
          label: isTh ? 'ดูรายละเอียดห้อง' : 'Room Details',
          icon: FileText,
        },
      ];
    default:
      return [
        {
          id: 'view',
          label: isTh ? 'ดูรายละเอียดห้อง' : 'Room Details',
          icon: FileText,
        },
      ];
  }
}

export interface RoomCardProps {
  room: Room;
  roomType?: RoomType;
  guestName?: string;
  checkoutDate?: string;
  isSelected?: boolean;
  onClick: (room: Room) => void;
  onQuickBook?: (room: Room) => void;
  onQuickAction?: (action: string, room: Room) => void;
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
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-950 dark:text-amber-200',
    border: 'border-amber-400 dark:border-amber-800',
    dot: 'bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900',
  },
  checked_out: {
    label: 'รอทำความสะอาด',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  cleaning: {
    label: 'รอทำความสะอาด',
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
  onQuickAction,
  density = 'compact',
}) => {
  const { t, formatCurrency, locale } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const quickActions = getRoomQuickActions(room, locale);

  const statusCfg = ROOM_STATUS_CONFIG[room.status] || {
    label: room.status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const localizedStatus = t(`status.${room.status}`);
  const resolvedFloor = room.floor || (room as any).floorId?.replace(/^fl-/, '') || room.roomNumber.charAt(0) || '1';
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
      {/* Top Header: Room Number, Tempered Glass Status Badge & Quick Actions Menu */}
      <div className={`flex items-center justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <span className="text-lg font-bold font-mono tracking-tight text-slate-900 group-hover:text-slate-800">
          {room.roomNumber}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full text-xs px-2.5 py-0.5 font-semibold text-slate-900 bg-slate-100/70 backdrop-blur-xs border border-slate-200/70 shadow-2xs">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
            <span>{localizedStatus}</span>
          </span>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Quick Actions"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" strokeWidth={1.75} aria-hidden="true" />
            </button>

            {/* Quick Actions Dropdown Menu */}
            {isMenuOpen && quickActions.length > 0 && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-30 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                  {locale === 'th' ? `ห้อง ${room.roomNumber}` : `Room ${room.roomNumber}`}
                </div>
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const isDanger = action.variant === 'danger' || action.id === 'checkout';
                  return (
                    <button
                      key={action.id}
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onQuickAction?.(action.id, room);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                        isDanger
                          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Type & Floor / Price */}
      <div className={isCompact ? 'space-y-0.5' : 'space-y-1'}>
        <p className="text-sm font-semibold text-slate-800 truncate">
          {localizeRoomType(roomType?.name, locale)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 font-mono tracking-tight">
            {t('common.floor', { floor: resolvedFloor })}
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
              <BedDouble className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="leading-none">{bedLabel}</span>
            </span>
            <span className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="leading-none">{capacityLabel}</span>
            </span>
            <span className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="leading-none">{bathLabel}</span>
            </span>
          </div>
        )}

        {/* Occupied Rooms: Guest Name & Checkout Date Chip */}
        {room.status === 'occupied' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayGuest && (
              <div className="inline-flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 text-xs sm:text-sm font-semibold text-blue-900 px-2.5 py-1 rounded-md max-w-full">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate leading-none">{displayGuest}</span>
              </div>
            )}
            {displayCheckout && (
              <div className="inline-flex items-center gap-1 bg-blue-50/80 border border-blue-200 text-blue-900 text-xs px-2 py-1 rounded-md font-mono">
                <Calendar className="w-3 h-3 text-blue-600 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="leading-none">{locale === 'th' ? `ออก: ${formatDisplayDate(displayCheckout, locale)}` : `Out: ${formatDisplayDate(displayCheckout, locale)}`}</span>
              </div>
            )}
          </div>
        )}

        {/* Reserved Rooms: Display Guest Name */}
        {room.status === 'reserved' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayGuest ? (
              <span
                className="inline-flex items-center gap-1 text-xs bg-amber-100/90 text-amber-950 font-bold border border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded max-w-[140px] truncate"
                title={displayGuest}
              >
                <User className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{displayGuest}</span>
              </span>
            ) : (
              <div className="text-xs text-slate-600 leading-snug truncate">
                {room.notes ? localizeRoomNote(room.notes, locale) : (
                  <span className="text-slate-400 font-mono text-[11px]">—</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Maintenance & Out of Order: Prominent reason notice box */}
        {(room.status === 'maintenance' || room.status === 'out_of_order') && (
          <div className="bg-amber-50/90 border border-amber-200 text-amber-800 text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate leading-none">{maintenanceReason}</span>
          </div>
        )}

        {/* Other Statuses: Checked-out, Cleaning notes */}
        {room.status !== 'available' &&
          room.status !== 'occupied' &&
          room.status !== 'reserved' &&
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
        <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-all duration-150 flex items-center justify-center gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickBook(room);
            }}
            className="w-full py-2 px-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-md flex items-center justify-center gap-1 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 active:scale-[0.98]"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
            <span>{locale === 'th' ? 'เปิดห้องทันที (Walk-In)' : 'Quick Walk-In'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

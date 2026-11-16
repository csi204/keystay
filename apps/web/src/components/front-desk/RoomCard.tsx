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
    bg: 'bg-amber-100',
    text: 'text-amber-950',
    border: 'border-amber-300',
    dot: 'bg-amber-500 ring-2 ring-amber-300',
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
      {/* Top Header: Room Number, Clean Dot Status & Quick Actions Menu */}
      <div className={`flex items-center justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <span className="text-lg font-bold tracking-tight tabular-nums text-slate-900 group-hover:text-slate-800">
          {room.roomNumber}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot.replace(/ring-\S+/g, '').trim()}`} />
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
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" strokeWidth={1.75} aria-hidden="true" />
            </button>

            {/* Quick Actions Dropdown Menu */}
            {isMenuOpen && quickActions.length > 0 && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-30 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
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
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-slate-700 hover:bg-slate-100'
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
          <span className="text-xs text-slate-500 tabular-nums">
            {t('common.floor', { floor: resolvedFloor })}
          </span>
          {formattedPrice && (
            <span className="text-xs sm:text-sm font-semibold tabular-nums text-slate-900">
              {formattedPrice}{t('common.pricePerNight')}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Spec / Status Section (Flat, no nested cards or tinted chips) */}
      <div className={`${isCompact ? 'mt-2.5 pt-2' : 'mt-3 pt-2.5'} border-t border-slate-100`}>
        {/* Available Rooms */}
        {room.status === 'available' && (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{bedLabel}</span>
              </span>
              <span className="text-slate-300" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{capacityLabel}</span>
              </span>
              <span className="text-slate-300" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{bathLabel}</span>
              </span>
            </div>
            {room.notes && (
              <p
                title={localizeRoomNote(room.notes, locale)}
                className="text-xs text-slate-500 truncate flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{localizeRoomNote(room.notes, locale)}</span>
              </p>
            )}
          </div>
        )}

        {/* Occupied Rooms */}
        {room.status === 'occupied' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              {displayGuest && (
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="truncate">{displayGuest}</span>
                </span>
              )}
              {displayCheckout && (
                <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums shrink-0">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{locale === 'th' ? `ออก: ${formatDisplayDate(displayCheckout, locale)}` : `Out: ${formatDisplayDate(displayCheckout, locale)}`}</span>
                </span>
              )}
            </div>
            {room.notes && (
              <p
                title={localizeRoomNote(room.notes, locale)}
                className="text-xs text-slate-500 truncate flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{localizeRoomNote(room.notes, locale)}</span>
              </p>
            )}
          </div>
        )}

        {/* Reserved Rooms */}
        {room.status === 'reserved' && (
          <div className="space-y-1">
            {displayGuest && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 max-w-full truncate"
                title={displayGuest}
              >
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{displayGuest}</span>
              </span>
            )}
            {room.notes ? (
              <p
                title={localizeRoomNote(room.notes, locale)}
                className="text-xs text-slate-500 truncate flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{localizeRoomNote(room.notes, locale)}</span>
              </p>
            ) : !displayGuest ? (
              <span className="text-slate-400 text-xs">—</span>
            ) : null}
          </div>
        )}

        {/* Maintenance & Out of Order */}
        {(room.status === 'maintenance' || room.status === 'out_of_order') && (
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-rose-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">{maintenanceReason}</span>
          </div>
        )}

        {/* Other Statuses: Checked-out, Cleaning notes */}
        {room.status !== 'available' &&
          room.status !== 'occupied' &&
          room.status !== 'reserved' &&
          room.status !== 'maintenance' &&
          room.status !== 'out_of_order' && (
            <div className="text-xs text-slate-500 leading-snug">
              {room.notes ? (
                <p
                  title={localizeRoomNote(room.notes, locale)}
                  className="inline-flex items-center gap-1 max-w-full truncate"
                >
                  <FileText className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{localizeRoomNote(room.notes, locale)}</span>
                </p>
              ) : (
                <span className="text-slate-400 text-xs">—</span>
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

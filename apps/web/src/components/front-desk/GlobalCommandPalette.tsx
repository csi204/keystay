import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  DoorOpen,
  User,
  LayoutGrid,
  UserCheck,
  CreditCard,
  HelpCircle,
  X,
  LucideIcon,
} from 'lucide-react';
import { Room } from '@keystay/types';
import { useRooms } from '@/hooks/useRooms';
import { useReservations, ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';

export type PaletteCategory = 'rooms' | 'guests' | 'commands';

export interface PaletteItem {
  id: string;
  category: PaletteCategory;
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    bg: string;
    text: string;
    border?: string;
    dot?: string;
  };
  icon?: LucideIcon;
  onSelect: () => void;
  metadata?: Record<string, any>;
}

export interface FilterPaletteItemsOptions {
  query: string;
  rooms?: Room[];
  reservations?: ExtendedReservation[];
  locale?: string;
  onSelectRoom?: (room: Room) => void;
  onSelectReservation?: (reservation: ExtendedReservation) => void;
  navigate?: (path: string) => void;
  onToggleTheme?: () => void;
  onOpenShortcuts?: () => void;
  onClose?: () => void;
}

const ROOM_STATUS_MAP: Record<
  Room['status'],
  { labelTh: string; labelEn: string; bg: string; text: string; border: string; dot: string }
> = {
  available: {
    labelTh: 'ว่าง',
    labelEn: 'Available',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  occupied: {
    labelTh: 'มีผู้พัก',
    labelEn: 'Occupied',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  reserved: {
    labelTh: 'ติดจอง',
    labelEn: 'Reserved',
    bg: 'bg-amber-100',
    text: 'text-amber-950 font-bold',
    border: 'border-amber-400',
    dot: 'bg-amber-500 ring-2 ring-amber-300',
  },
  cleaning: {
    labelTh: 'รอทำความสะอาด',
    labelEn: 'Cleaning',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  maintenance: {
    labelTh: 'ปิดปรับปรุง',
    labelEn: 'Maintenance',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  checked_out: {
    labelTh: 'เช็คเอาต์แล้ว',
    labelEn: 'Checked Out',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  out_of_order: {
    labelTh: 'ไม่พร้อมใช้งาน',
    labelEn: 'Out of Order',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

const RESERVATION_STATUS_MAP: Record<
  string,
  { labelTh: string; labelEn: string; bg: string; text: string; border: string }
> = {
  checked_in: {
    labelTh: 'เช็คอินแล้ว',
    labelEn: 'Checked In',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  confirmed: {
    labelTh: 'ยืนยันแล้ว',
    labelEn: 'Confirmed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  extended: {
    labelTh: 'ขยายเวลา',
    labelEn: 'Extended',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  checked_out: {
    labelTh: 'เช็คเอาต์แล้ว',
    labelEn: 'Checked Out',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  cancelled: {
    labelTh: 'ยกเลิก',
    labelEn: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  pending: {
    labelTh: 'รอดำเนินการ',
    labelEn: 'Pending',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  no_show: {
    labelTh: 'ไม่มาแสดงตน',
    labelEn: 'No Show',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
};

export function filterPaletteItems(options: FilterPaletteItemsOptions): PaletteItem[] {
  const {
    query,
    rooms = [],
    reservations = [],
    locale = 'th',
    onSelectRoom,
    onSelectReservation,
    navigate,
    onToggleTheme,
    onOpenShortcuts,
    onClose,
  } = options;

  const q = (query || '').trim().toLowerCase();
  const isThai = locale === 'th';

  const defaultCommands: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    keywords: string[];
    action: () => void;
  }> = [
    {
      id: 'cmd-room-matrix',
      title: isThai ? 'ผังห้องพัก (Room Matrix)' : 'Room Matrix',
      subtitle: isThai
        ? 'ดูสถานะห้องพัก ผังห้อง และรายการจองทั้งหมด'
        : 'View room matrix layout and active reservations',
      icon: LayoutGrid,
      keywords: ['matrix', 'room', 'ผังห้อง', 'ผังห้องพัก', 'ห้อง'],
      action: () => {
        if (navigate) navigate('/front-desk/room-matrix');
        onClose?.();
      },
    },
    {
      id: 'cmd-daily-ops',
      title: isThai ? 'เช็คอิน & เช็คเอาต์ (Daily Operations)' : 'Daily Operations (Check-In & Out)',
      subtitle: isThai
        ? 'จัดการผู้เข้าพัก เช็คอินด่วน และเช็คเอาต์ประจำวัน'
        : 'Manage arrivals, departures, and daily check-ins/outs',
      icon: UserCheck,
      keywords: ['daily', 'operations', 'checkin', 'checkout', 'เช็คอิน', 'เช็คเอาต์', 'เข้าพัก'],
      action: () => {
        if (navigate) navigate('/front-desk/daily-operations');
        onClose?.();
      },
    },
    {
      id: 'cmd-cashier',
      title: isThai ? 'แคชเชียร์ & บิล (Cashier Hub)' : 'Cashier Hub & Folios',
      subtitle: isThai
        ? 'เปิดบิล ชำระเงิน ค่ามัดจำ และออกใบเสร็จ'
        : 'Billing folios, payment collection, and receipts',
      icon: CreditCard,
      keywords: ['cashier', 'billing', 'folio', 'แคชเชียร์', 'บิล', 'การเงิน'],
      action: () => {
        if (navigate) navigate('/front-desk/cashier');
        onClose?.();
      },
    },
    {
      id: 'cmd-shortcuts',
      title: isThai ? 'ดูคีย์ลัดทั้งหมด (?)' : 'Keyboard Shortcuts Cheatsheet (?)',
      subtitle: isThai
        ? 'แสดงรายการปุ่มลัดและคำสั่งด่วนทั้งหมดในระบบ'
        : 'View all frontline operational keyboard shortcuts',
      icon: HelpCircle,
      keywords: ['shortcuts', 'keyboard', 'help', 'คีย์ลัด', 'ปุ่มลัด', 'ช่วยเหลือ'],
      action: () => {
        if (onOpenShortcuts) {
          onOpenShortcuts();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts'));
        }
        onClose?.();
      },
    },
  ];

  // 1. Filter commands
  const filteredCommands: PaletteItem[] = defaultCommands
    .filter((cmd) => {
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.subtitle.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.toLowerCase().includes(q))
      );
    })
    .map((cmd) => ({
      id: cmd.id,
      category: 'commands',
      title: cmd.title,
      subtitle: cmd.subtitle,
      icon: cmd.icon,
      onSelect: cmd.action,
    }));

  if (!q) {
    // When query is empty, return primary navigation commands
    return filteredCommands;
  }

  // 2. Filter rooms
  const filteredRooms: PaletteItem[] = rooms
    .filter((room) => {
      const roomNum = room.roomNumber.toLowerCase();
      const localizedType = localizeRoomType(room.roomTypeId, locale as any).toLowerCase();
      const rawType = (room.roomTypeId || '').toLowerCase();
      return roomNum.includes(q) || localizedType.includes(q) || rawType.includes(q);
    })
    .slice(0, 8)
    .map((room) => {
      const statusConfig = ROOM_STATUS_MAP[room.status] || ROOM_STATUS_MAP.available;
      const typeLabel = localizeRoomType(room.roomTypeId, locale as any) || room.roomTypeId;
      return {
        id: `room-${room.id}`,
        category: 'rooms',
        title: isThai ? `ห้อง ${room.roomNumber}` : `Room ${room.roomNumber}`,
        subtitle: `${typeLabel}${room.floor ? ` • ชั้น ${room.floor}` : ''}`,
        badge: {
          label: isThai ? statusConfig.labelTh : statusConfig.labelEn,
          bg: statusConfig.bg,
          text: statusConfig.text,
          border: statusConfig.border,
          dot: statusConfig.dot,
        },
        icon: DoorOpen,
        onSelect: () => {
          if (onSelectRoom) {
            onSelectRoom(room);
          } else if (navigate) {
            navigate(`/front-desk/room-matrix?roomId=${room.id}`);
          }
          onClose?.();
        },
        metadata: { room },
      };
    });

  // 3. Filter guests & reservations
  const filteredGuests: PaletteItem[] = reservations
    .filter((res) => {
      const guestName = resolveGuestName(res).toLowerCase();
      const code = (res.reservationCode || '').toLowerCase();
      const resId = (res.id || '').toLowerCase();
      const roomNum = (res.roomNumber || '').toLowerCase();
      return (
        guestName.includes(q) ||
        code.includes(q) ||
        resId.includes(q) ||
        roomNum.includes(q)
      );
    })
    .slice(0, 8)
    .map((res) => {
      const guestName = resolveGuestName(res);
      const statusConfig = RESERVATION_STATUS_MAP[res.status] || RESERVATION_STATUS_MAP.pending;
      const channelLabel =
        res.bookingSource === 'walk_in'
          ? 'Walk-In'
          : res.bookingSource === 'phone'
          ? 'Phone'
          : res.bookingSource === 'facebook'
          ? 'Facebook'
          : res.bookingSource || 'Direct';

      const subtitleParts: string[] = [];
      if (res.roomNumber) {
        subtitleParts.push(isThai ? `ห้อง ${res.roomNumber}` : `Room ${res.roomNumber}`);
      }
      if (res.reservationCode) {
        subtitleParts.push(res.reservationCode);
      }
      subtitleParts.push(channelLabel);

      return {
        id: `guest-${res.id}`,
        category: 'guests',
        title: guestName,
        subtitle: subtitleParts.join(' • '),
        badge: {
          label: isThai ? statusConfig.labelTh : statusConfig.labelEn,
          bg: statusConfig.bg,
          text: statusConfig.text,
          border: statusConfig.border,
        },
        icon: User,
        onSelect: () => {
          if (onSelectReservation) {
            onSelectReservation(res);
          } else if (navigate) {
            navigate(`/front-desk/cashier?resId=${res.id}`);
          }
          onClose?.();
        },
        metadata: { reservation: res },
      };
    });

  return [...filteredRooms, ...filteredGuests, ...filteredCommands];
}

export interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  rooms?: Room[];
  reservations?: ExtendedReservation[];
  onSelectRoom?: (room: Room) => void;
  onSelectReservation?: (reservation: ExtendedReservation) => void;
  onToggleTheme?: () => void;
  onOpenShortcuts?: () => void;
  navigate?: (path: string) => void;
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
  rooms: propRooms,
  reservations: propReservations,
  onSelectRoom,
  onSelectReservation,
  onToggleTheme,
  onOpenShortcuts,
  navigate: propNavigate,
}) => {
  const { locale } = useI18n();

  // Safe navigation hook (falls back if rendered outside Router context)
  let routerNavigate: ((path: string) => void) | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routerNavigate = useNavigate();
  } catch {
    routerNavigate = undefined;
  }

  const navigate = propNavigate || routerNavigate || ((path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  });

  // Fetch rooms and reservations if not passed as props
  const hookRooms = useRooms();
  const hookReservations = useReservations();

  const rooms = propRooms ?? hookRooms.rooms;
  const reservations = propReservations ?? hookReservations.reservations;

  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items based on active query
  const items = useMemo(() => {
    return filterPaletteItems({
      query,
      rooms,
      reservations,
      locale,
      onSelectRoom,
      onSelectReservation,
      navigate,
      onToggleTheme,
      onOpenShortcuts,
      onClose,
    });
  }, [
    query,
    rooms,
    reservations,
    locale,
    onSelectRoom,
    onSelectReservation,
    navigate,
    onToggleTheme,
    onOpenShortcuts,
    onClose,
  ]);

  // Reset selectedIndex when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened & reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Ensure active element scrolls into view
  useEffect(() => {
    if (listRef.current && items.length > 0) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, items.length]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        items.length > 0 ? (prev - 1 + items.length) % items.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const isThai = locale === 'th';

  // Group items by category for visual headers while preserving linear selectedIndex
  const categoryTitles: Record<PaletteCategory, string> = {
    rooms: isThai ? 'ห้องพัก' : 'Rooms',
    guests: isThai ? 'ผู้เข้าพัก & การจอง' : 'Guests & Reservations',
    commands: isThai ? 'การนำทาง & คำสั่งลัด' : 'Navigation & Commands',
  };

  // Group items in order: rooms -> guests -> commands
  const categoriesPresent = (['rooms', 'guests', 'commands'] as PaletteCategory[]).filter((cat) =>
    items.some((item) => item.category === cat)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-3 sm:px-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 border-b border-slate-200 bg-white shrink-0">
          <Search
            className="w-5 h-5 text-slate-400 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isThai
                ? 'ค้นหาห้อง, แขก, หรือพิมพ์คำสั่ง... (Esc เพื่อปิด)'
                : 'Search rooms, guests, or type a command... (Esc to close)'
            }
            className="w-full px-3 py-3.5 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none font-sans"
            autoComplete="off"
            spellCheck="false"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
              Esc
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto py-2 divide-y divide-slate-100 focus:outline-none"
        >
          {items.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <p className="text-sm text-slate-500">
                {isThai
                  ? `ไม่พบห้องพัก แขก หรือคำสั่งที่ตรงกับ "${query}"`
                  : `No rooms, guests, or commands matching "${query}"`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isThai
                  ? 'ลองค้นหาด้วยหมายเลขห้อง (101), ชื่อแขก, หรือ "แคชเชียร์"'
                  : 'Try searching by room number (101), guest name, or "cashier"'}
              </p>
            </div>
          ) : (
            categoriesPresent.map((category) => {
              const categoryItems = items.filter((it) => it.category === category);
              return (
                <div key={category} className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {categoryTitles[category]}
                  </div>
                  <div className="space-y-0.5 px-1.5">
                    {categoryItems.map((item) => {
                      const itemIndex = items.indexOf(item);
                      const isSelected = itemIndex === selectedIndex;
                      const Icon = item.icon || Search;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isSelected}
                          data-active={isSelected}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          onClick={() => item.onSelect()}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs font-medium ${
                            isSelected
                              ? 'bg-orange-50 text-orange-950 border-l-2 border-[#F97316]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-1.5 rounded-md ${
                                isSelected
                                  ? 'bg-orange-100 text-[#F97316]'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-xs truncate ${
                                  isSelected
                                    ? 'font-bold text-orange-950'
                                    : 'font-medium text-slate-900'
                                }`}
                              >
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-[11px] text-slate-400 truncate">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          {item.badge && (
                            <span
                              className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 flex items-center gap-1 border ${item.badge.bg} ${item.badge.text} ${
                                item.badge.border || 'border-transparent'
                              }`}
                            >
                              {item.badge.dot && (
                                <span className={`w-1.5 h-1.5 rounded-full ${item.badge.dot}`} />
                              )}
                              <span>{item.badge.label}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Navigation Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-sans shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-mono text-slate-600">
                ↑↓
              </kbd>
              <span>{isThai ? 'นำทาง' : 'Navigate'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-mono text-slate-600">
                Enter
              </kbd>
              <span>{isThai ? 'เลือก' : 'Select'}</span>
            </span>
          </div>

          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-mono text-slate-600">
              Esc
            </kbd>
            <span>{isThai ? 'ปิด' : 'Close'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

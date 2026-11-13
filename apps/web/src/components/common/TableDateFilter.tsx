import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  computePopoverCoords,
  formatDisplayDate,
  PopoverCoords,
} from './CustomDatePicker';

export interface DateFilterValue {
  startDate?: string;
  endDate?: string;
  day: string;
  month: string;
  year: string;
}

export const EMPTY_DATE_FILTER: DateFilterValue = {
  startDate: '',
  endDate: '',
  day: '',
  month: '',
  year: '',
};

export function isDateFilterActive(filter: DateFilterValue): boolean {
  return Boolean(
    (filter.startDate && filter.startDate.trim()) ||
      (filter.endDate && filter.endDate.trim()) ||
      (filter.day && filter.day.trim()) ||
      (filter.month && filter.month.trim()) ||
      (filter.year && filter.year.trim())
  );
}

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

const ENGLISH_MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;
const ENGLISH_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

interface ParsedCalendarParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Extracts local calendar year, month (1-12), and day (1-31) from either:
 * - Pure YYYY-MM-DD date string (parsed directly without UTC timezone shift)
 * - Full ISO datetime string (parsed to local calendar date)
 */
export function extractCalendarParts(dateStr: string | null | undefined): ParsedCalendarParts | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    if (
      Number.isInteger(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return { year, month, day };
    }
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

export function toIsoCalendarDate(dateStr: string | null | undefined): string | null {
  const parts = extractCalendarParts(dateStr);
  if (!parts) return null;
  const yyyy = String(parts.year).padStart(4, '0');
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Checks whether a date string (and optional end date string for stay ranges) matches the active filter:
 * - Single date selected (`startDate` only): matches when `dateStr` equals `startDate`
 * - Date range selected (`startDate` and `endDate`):
 *   - If `endDateStr` is provided (e.g., reservation check-in & check-out), matches when the stay falls within `[startDate, endDate]`
 *   - Otherwise (e.g., billing history single date), matches when `dateStr` is between `startDate` and `endDate` (inclusive)
 * - Also supports legacy `day` / `month` / `year` fields.
 */
export function matchesDateFilter(
  dateStr: string | null | undefined,
  filter: DateFilterValue,
  endDateStr?: string | null
): boolean {
  const startIso = filter.startDate?.trim() || '';
  const endIso = filter.endDate?.trim() || '';

  if (startIso || endIso) {
    const itemIso = toIsoCalendarDate(dateStr);
    if (!itemIso) return false;

    // Single date selected -> exact match on the date
    if (startIso && !endIso) {
      return itemIso === startIso;
    }
    if (!startIso && endIso) {
      return itemIso === endIso;
    }

    // Range selected -> inclusive range check
    const [rangeStart, rangeEnd] =
      startIso <= endIso ? [startIso, endIso] : [endIso, startIso];

    if (endDateStr) {
      const itemEndIso = toIsoCalendarDate(endDateStr);
      if (itemEndIso) {
        return itemIso >= rangeStart && itemEndIso <= rangeEnd;
      }
    }

    return itemIso >= rangeStart && itemIso <= rangeEnd;
  }

  const hasDay = Boolean(filter.day && filter.day.trim());
  const hasMonth = Boolean(filter.month && filter.month.trim());
  const hasYear = Boolean(filter.year && filter.year.trim());

  if (!hasDay && !hasMonth && !hasYear) return true;

  const parts = extractCalendarParts(dateStr);
  if (!parts) return false;

  if (hasDay && parts.day !== Number(filter.day)) {
    return false;
  }
  if (hasMonth && parts.month !== Number(filter.month)) {
    return false;
  }
  if (hasYear) {
    const rawYear = Number(filter.year);
    const normalizedFilterYear = rawYear > 2400 ? rawYear - 543 : rawYear;
    if (parts.year !== normalizedFilterYear) {
      return false;
    }
  }

  return true;
}

export interface TableDateFilterProps {
  value: DateFilterValue;
  onChange: (next: DateFilterValue) => void;
  dates?: Array<string | null | undefined>;
  years?: number[];
  className?: string;
}

export const TableDateFilter: React.FC<TableDateFilterProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const { locale } = useI18n();
  const isThai = locale === 'th';

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string>('');

  const startDate = useMemo(() => {
    if (value.startDate && value.startDate.trim()) return value.startDate.trim();
    if (value.year && value.month && value.day) {
      const y = Number(value.year) > 2400 ? Number(value.year) - 543 : Number(value.year);
      return `${String(y).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
    }
    return '';
  }, [value.startDate, value.year, value.month, value.day]);

  const endDate = useMemo(() => {
    return value.endDate?.trim() || '';
  }, [value.endDate]);

  const getInitialView = () => {
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const [y, m] = startDate.split('-').map(Number);
      return { year: y, month: m - 1 };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  };

  const [viewYear, setViewYear] = useState(() => getInitialView().year);
  const [viewMonth, setViewMonth] = useState(() => getInitialView().month);

  const [coords, setCoords] = useState<PopoverCoords>({
    top: 0,
    left: 16,
    placement: 'bottom',
  });

  const updateCoords = () => {
    if (typeof window === 'undefined') return;
    const el = triggerRef.current || containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords(
      computePopoverCoords(rect, window.innerWidth, window.innerHeight, 'auto', 320, 360)
    );
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleUpdate = () => updateCoords();
    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true });
    window.addEventListener('resize', handleUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleUpdate, { capture: true });
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setHoverDate('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setHoverDate('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const todayIso = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth]
  );
  const firstDayOfWeek = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth]
  );

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleSelectDate = (clickedIso: string) => {
    // 1st click (or starting a new selection after a range was already completed):
    // Select single date immediately -> table filters to this exact date right away,
    // while keeping calendar open in case the user clicks a 2nd date for a range.
    if (!startDate || (startDate && endDate)) {
      onChange({
        ...EMPTY_DATE_FILTER,
        startDate: clickedIso,
        endDate: '',
      });
      setHoverDate('');
      return;
    }

    // 2nd click when startDate is already chosen and endDate is empty:
    if (clickedIso === startDate) {
      // Clicking the same date confirms single-date filter and closes popover
      onChange({
        ...EMPTY_DATE_FILTER,
        startDate: clickedIso,
        endDate: '',
      });
      setHoverDate('');
      setIsOpen(false);
      return;
    }

    const [orderedStart, orderedEnd] =
      clickedIso < startDate ? [clickedIso, startDate] : [startDate, clickedIso];

    onChange({
      ...EMPTY_DATE_FILTER,
      startDate: orderedStart,
      endDate: orderedEnd,
    });
    setHoverDate('');
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    onChange({
      ...EMPTY_DATE_FILTER,
      startDate: todayIso,
      endDate: '',
    });
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setHoverDate('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(EMPTY_DATE_FILTER);
    setHoverDate('');
    setIsOpen(false);
  };

  const isActive = isDateFilterActive(value);

  const displayLabel = useMemo(() => {
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate, locale)} - ${formatDisplayDate(endDate, locale)}`;
    }
    if (startDate) {
      return formatDisplayDate(startDate, locale);
    }
    return '';
  }, [startDate, endDate, locale]);

  const monthTitle = isThai
    ? `${THAI_MONTHS_FULL[viewMonth]} ${viewYear + 543}`
    : `${ENGLISH_MONTHS_FULL[viewMonth]} ${viewYear}`;

  const previewEnd = endDate || hoverDate;
  const [rangeMin, rangeMax] = useMemo(() => {
    if (!startDate || !previewEnd) return ['', ''];
    return startDate <= previewEnd ? [startDate, previewEnd] : [previewEnd, startDate];
  }, [startDate, previewEnd]);

  const popoverContent = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      data-placement={coords.placement}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999,
        width: '320px',
      }}
      className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 p-3 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Month / Year Navigation Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="Previous month"
          className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <span className="text-sm font-semibold text-slate-800 tracking-tight font-sans">
          {monthTitle}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="Next month"
          className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Helper banner showing Single Date vs Range state */}
      <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] flex items-center justify-between gap-2">
        {!startDate ? (
          <span className="text-slate-500 font-sans">
            {isThai
              ? 'คลิกเลือก 1 วัน หรือคลิก 2 วันเพื่อเลือกช่วง'
              : 'Click 1 date or 2 dates for a range'}
          </span>
        ) : !endDate ? (
          <div className="flex items-center justify-between w-full gap-1">
            <span className="font-mono font-semibold text-slate-900">
              {formatDisplayDate(startDate, locale)}
            </span>
            <span className="text-indigo-600 font-sans font-medium">
              {isThai ? 'คลิกอีกวันเพื่อเลือกช่วง' : 'Click 2nd date for range'}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-slate-500 font-sans">{isThai ? 'ช่วงที่เลือก:' : 'Range:'}</span>
            <span className="font-mono font-semibold text-slate-900">
              {formatDisplayDate(startDate, locale)} - {formatDisplayDate(endDate, locale)}
            </span>
          </div>
        )}
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {(isThai ? THAI_DAYS : ENGLISH_DAYS).map((dayName, idx) => (
          <div
            key={dayName + idx}
            className="h-6 flex items-center justify-center text-[11px] font-semibold text-slate-400 select-none"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div
        className="grid grid-cols-7 gap-1"
        onMouseLeave={() => setHoverDate('')}
      >
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8 w-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayStr = String(day).padStart(2, '0');
          const monthStr = String(viewMonth + 1).padStart(2, '0');
          const dateIso = `${viewYear}-${monthStr}-${dayStr}`;

          const isStart = startDate === dateIso;
          const isEnd = endDate === dateIso;
          const isSelectedEndpoint = isStart || isEnd;
          const isInRange = Boolean(
            rangeMin && rangeMax && dateIso > rangeMin && dateIso < rangeMax
          );
          const isToday = todayIso === dateIso;

          let btnClass =
            'h-8 w-8 mx-auto flex items-center justify-center text-xs font-mono tabular-nums transition-colors cursor-pointer ';
          if (isSelectedEndpoint) {
            btnClass += 'bg-slate-900 text-white font-bold rounded-lg shadow-sm';
          } else if (isInRange) {
            btnClass += 'bg-slate-200/80 text-slate-900 font-semibold rounded-md';
          } else if (isToday) {
            btnClass +=
              'border border-slate-900/40 text-slate-900 font-bold hover:bg-slate-100 rounded-lg';
          } else {
            btnClass += 'text-slate-700 hover:bg-slate-100 font-medium rounded-lg';
          }

          return (
            <button
              key={dateIso}
              type="button"
              data-date={dateIso}
              onMouseEnter={() => {
                if (startDate && !endDate) {
                  setHoverDate(dateIso);
                }
              }}
              onClick={() => handleSelectDate(dateIso)}
              className={btnClass}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Quick actions footer */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
        <button
          type="button"
          onClick={handleSelectToday}
          className="font-medium text-slate-700 hover:text-slate-900 hover:underline transition-colors px-1 py-0.5 rounded cursor-pointer"
        >
          {isThai ? 'วันนี้' : 'Today'}
        </button>
        <div className="flex items-center gap-2">
          {startDate && !endDate && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors px-2.5 py-1 rounded-md cursor-pointer"
            >
              {isThai ? 'ตกลง' : 'Done'}
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors px-1 py-0.5 rounded cursor-pointer"
          >
            {isThai ? 'ล้างค่า' : 'Clear'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 font-sans">
        <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        <span>{isThai ? 'กรองวันที่:' : 'Date:'}</span>
      </span>

      {/* Single Calendar Trigger (matches CustomDatePicker style) */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={isThai ? 'เลือกวันที่หรือช่วงวันที่' : 'Select date or date range'}
        onClick={() => {
          updateCoords();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center justify-between gap-2 h-9 min-w-[220px] px-3 bg-white border rounded-lg text-xs transition-colors cursor-pointer ${
          isActive
            ? 'border-slate-900 text-slate-900 ring-1 ring-slate-900/10'
            : 'border-slate-300 text-slate-700 hover:border-slate-400'
        }`}
      >
        <span className="inline-flex items-center gap-2 truncate">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
          {displayLabel ? (
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {displayLabel}
            </span>
          ) : (
            <span className="text-slate-400 font-sans">
              {isThai ? 'เลือกวันที่ / ช่วงวันที่ (วว/ดด/ปปปป)' : 'Select date / range (DD/MM/YYYY)'}
            </span>
          )}
        </span>
      </button>

      {/* Clear Filter Button */}
      {isActive && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1 h-9 px-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer font-sans"
        >
          <X className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span>{isThai ? 'ล้างตัวกรอง' : 'Clear'}</span>
        </button>
      )}

      {isOpen &&
        (typeof document !== 'undefined' && document.body
          ? createPortal(popoverContent, document.body)
          : popoverContent)}
    </div>
  );
};

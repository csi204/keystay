import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface CustomDatePickerProps {
  value: string; // ISO YYYY-MM-DD
  onChange: (date: string) => void; // emits ISO YYYY-MM-DD
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  placement?: 'top' | 'bottom' | 'auto';
  defaultOpen?: boolean;
}

export interface PopoverCoords {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

/**
 * Determine popover placement based on element bounding rect and window height.
 * Returns 'top' when popover would overflow bottom bounds or clearance is < 300px.
 */
export function computePlacement(
  rect?: { bottom: number; top?: number } | null,
  windowHeight: number = typeof window !== 'undefined' ? window.innerHeight : 800,
  popoverHeight: number = 340
): 'top' | 'bottom' {
  if (!rect) return 'bottom';
  const clearanceBelow = windowHeight - rect.bottom;
  const topVal = rect.top ?? 0;
  if (clearanceBelow < popoverHeight || (clearanceBelow < 340 && topVal > 340) || rect.bottom + popoverHeight > windowHeight) {
    return 'top';
  }
  return 'bottom';
}

/**
 * Calculates fixed portal coordinates anchored to trigger input element.
 * Ensures the popover stays within viewport bounds and flips above if clearance below is insufficient.
 */
export function computePopoverCoords(
  rect: { top: number; bottom: number; left: number },
  windowWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1024,
  windowHeight: number = typeof window !== 'undefined' ? window.innerHeight : 768,
  placementProp: 'top' | 'bottom' | 'auto' = 'auto',
  popoverWidth: number = 320,
  popoverHeight: number = 340
): PopoverCoords {
  const spaceBelow = windowHeight - rect.bottom;
  const spaceAbove = rect.top;

  let placement: 'top' | 'bottom';
  if (placementProp === 'top') {
    placement = 'top';
  } else if (placementProp === 'bottom') {
    placement = 'bottom';
  } else {
    // If placement === 'top' or (available space below rect.bottom < 340 && rect.top > 340): place above
    if (spaceBelow < popoverHeight && spaceAbove > popoverHeight) {
      placement = 'top';
    } else if (spaceBelow < 340 && spaceAbove > 340) {
      placement = 'top';
    } else {
      placement = 'bottom';
    }
  }

  const top = placement === 'top' ? rect.top - popoverHeight - 6 : rect.bottom + 6;
  const left = Math.max(16, Math.min(rect.left, windowWidth - popoverWidth - 16));

  return { top, left, placement };
}

/**
 * Checks whether a given ISO date string satisfies min and max constraints.
 */
export function isDateWithinConstraints(dateIso: string, min?: string, max?: string): boolean {
  if (min && dateIso < min) return false;
  if (max && dateIso > max) return false;
  return true;
}

const THAI_MONTHS = [
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
];

const ENGLISH_MONTHS = [
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
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const ENGLISH_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Format ISO date string (YYYY-MM-DD) into display format DD/MM/YYYY.
 * If locale is 'th', year is converted to Buddhist Era (พ.ศ. = CE + 543).
 */
export function formatDisplayDate(isoDate: string, locale: string = 'th'): string {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';

  const year = parseInt(match[1], 10);
  const month = match[2];
  const day = match[3];

  const displayYear = locale === 'th' ? year + 543 : year;
  return `${day}/${month}/${displayYear}`;
}

/**
 * Parse display date text (DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY) into ISO string (YYYY-MM-DD).
 * If locale is 'th' and year is > 2400, it is converted from Buddhist Era (CE = BE - 543).
 * Returns null if invalid date or out-of-range day for that month.
 */
export function parseDisplayDate(text: string, locale: string = 'th'): string | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;

  if (locale === 'th' && year > 2400) {
    year = year - 543;
  }

  if (year < 1000 || year > 9999) return null;

  // Day range check for the specific year and month
  const maxDays = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDays) return null;

  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  id,
  name,
  placement = 'auto',
  defaultOpen = false,
}) => {
  const { locale } = useLanguage();
  const isThai = locale === 'th';

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [displayText, setDisplayText] = useState(() => formatDisplayDate(value, locale));

  const [coords, setCoords] = useState<PopoverCoords>(() => ({
    top: 0,
    left: 16,
    placement: placement === 'top' ? 'top' : 'bottom',
  }));

  const updateCoords = () => {
    if (typeof window === 'undefined') return;
    const el = inputRef.current || containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const newCoords = computePopoverCoords(
      rect,
      window.innerWidth,
      window.innerHeight,
      placement,
      320,
      340
    );
    setCoords(newCoords);
  };

  const handleOpen = () => {
    if (!disabled) {
      updateCoords();
      inputRef.current?.focus();
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, placement]);

  // Wire passive scroll & resize listeners on window to update coords in real time
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      updateCoords();
    };

    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleUpdate, { capture: true });
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, placement]);

  // Determine initial calendar view
  const getInitialView = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-');
      return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
    }
    if (min && /^\d{4}-\d{2}-\d{2}$/.test(min)) {
      const parts = min.split('-');
      return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  };

  const [viewYear, setViewYear] = useState(() => getInitialView().year);
  const [viewMonth, setViewMonth] = useState(() => getInitialView().month);

  // Sync formatted display text when value or locale changes
  useEffect(() => {
    setDisplayText(formatDisplayDate(value, locale));
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-');
      setViewYear(parseInt(parts[0], 10));
      setViewMonth(parseInt(parts[1], 10) - 1);
    }
  }, [value, locale]);

  // Click outside and escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideContainer = containerRef.current?.contains(target);
      const clickedInsidePopover = popoverRef.current?.contains(target);

      if (!clickedInsideContainer && !clickedInsidePopover) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Today ISO string
  const todayIso = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const isTodayDisabled = Boolean((min && todayIso < min) || (max && todayIso > max));

  // Calendar month boundary calculations
  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth]
  );
  const firstDayOfWeek = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth]
  );

  const isPrevMonthDisabled = useMemo(() => {
    if (!min) return false;
    const [minY, minM] = min.split('-').map(Number);
    if (viewYear < minY) return true;
    if (viewYear === minY && viewMonth <= minM - 1) return true;
    return false;
  }, [min, viewYear, viewMonth]);

  const isNextMonthDisabled = useMemo(() => {
    if (!max) return false;
    const [maxY, maxM] = max.split('-').map(Number);
    if (viewYear > maxY) return true;
    if (viewYear === maxY && viewMonth >= maxM - 1) return true;
    return false;
  }, [max, viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleSelectDate = (iso: string) => {
    if (disabled) return;
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange(iso);
    setDisplayText(formatDisplayDate(iso, locale));
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    if (isTodayDisabled) return;
    onChange(todayIso);
    setDisplayText(formatDisplayDate(todayIso, locale));
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setDisplayText('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDisplayText(text);
    const parsed = parseDisplayDate(text, locale);
    if (parsed) {
      if ((!min || parsed >= min) && (!max || parsed <= max)) {
        onChange(parsed);
        const parts = parsed.split('-');
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  };

  const handleInputBlur = () => {
    if (!displayText.trim()) {
      if (!required) {
        onChange('');
      } else {
        setDisplayText(formatDisplayDate(value, locale));
      }
      return;
    }
    const parsed = parseDisplayDate(displayText, locale);
    if (parsed && (!min || parsed >= min) && (!max || parsed <= max)) {
      onChange(parsed);
      setDisplayText(formatDisplayDate(parsed, locale));
    } else {
      setDisplayText(formatDisplayDate(value, locale));
    }
  };

  const monthTitle = isThai
    ? `${THAI_MONTHS[viewMonth]} ${viewYear + 543}`
    : `${ENGLISH_MONTHS[viewMonth]} ${viewYear}`;

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
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={isPrevMonthDisabled}
          aria-label="Previous month"
          className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <span className="text-sm font-semibold text-slate-800 tracking-tight font-sans">
          {monthTitle}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={isNextMonthDisabled}
          aria-label="Next month"
          className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
        </button>
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
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8 w-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayStr = String(day).padStart(2, '0');
          const monthStr = String(viewMonth + 1).padStart(2, '0');
          const dateIso = `${viewYear}-${monthStr}-${dayStr}`;
          const isSelected = value === dateIso;
          const isToday = todayIso === dateIso;
          const isDayDisabled = Boolean(
            (min && dateIso < min) || (max && dateIso > max) || disabled
          );

          let btnClass =
            'h-8 w-8 mx-auto flex items-center justify-center text-xs font-mono tabular-nums rounded-lg transition-colors ';
          if (isDayDisabled) {
            btnClass +=
              'text-slate-300 dark:text-slate-600 cursor-not-allowed hover:bg-transparent';
          } else if (isSelected) {
            btnClass +=
              'bg-slate-900 text-white font-bold rounded-lg shadow-sm cursor-pointer';
          } else if (isToday) {
            btnClass +=
              'border border-slate-900/40 text-slate-900 font-bold hover:bg-slate-100 cursor-pointer';
          } else {
            btnClass += 'text-slate-700 hover:bg-slate-100 font-medium cursor-pointer';
          }

          return (
            <button
              key={dateIso}
              type="button"
              data-date={dateIso}
              disabled={isDayDisabled}
              onClick={() => {
                if (!isDayDisabled) {
                  handleSelectDate(dateIso);
                }
              }}
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
          disabled={isTodayDisabled}
          className="font-medium text-slate-700 hover:text-slate-900 hover:underline disabled:opacity-40 disabled:no-underline transition-colors px-1 py-0.5 rounded cursor-pointer disabled:cursor-not-allowed"
        >
          {isThai ? 'วันนี้' : 'Today'}
        </button>
        {!required && (
          <button
            type="button"
            onClick={handleClear}
            className="font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors px-1 py-0.5 rounded cursor-pointer"
          >
            {isThai ? 'ล้างค่า' : 'Clear'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={handleOpen}
        className={`flex items-center w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono tabular-nums text-sm transition-colors cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100'
            : 'focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900'
        } ${className}`}
      >
        <Calendar className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" strokeWidth={1.75} />
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={displayText}
          placeholder={placeholder || (isThai ? 'วว/ดด/ปปปป' : 'DD/MM/YYYY')}
          disabled={disabled}
          required={required}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleOpen}
          className="w-full bg-transparent border-0 p-0 text-slate-900 focus:outline-none focus:ring-0 font-mono tabular-nums text-inherit"
        />
      </div>

      {isOpen && !disabled && (
        typeof document !== 'undefined' && document.body
          ? createPortal(popoverContent, document.body)
          : popoverContent
      )}
    </div>
  );
};

export default CustomDatePicker;

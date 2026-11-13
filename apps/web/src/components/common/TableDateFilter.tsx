import React, { useMemo } from 'react';
import { Calendar, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface DateFilterValue {
  day: string;
  month: string;
  year: string;
}

export const EMPTY_DATE_FILTER: DateFilterValue = {
  day: '',
  month: '',
  year: '',
};

const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

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

/**
 * Checks whether a date string matches the active Day / Month / Year filter.
 * Supports partial filters (e.g., month-only or year+month) and both YYYY-MM-DD and ISO UTC timestamps.
 */
export function matchesDateFilter(
  dateStr: string | null | undefined,
  filter: DateFilterValue
): boolean {
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
  dates,
  years,
  className = '',
}) => {
  const { locale } = useI18n();
  const isThai = locale === 'th';

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set<number>([
      2025,
      2026,
      2027,
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ]);

    if (years) {
      for (const y of years) {
        if (Number.isInteger(y) && y > 1900 && y < 3000) {
          yearSet.add(y > 2400 ? y - 543 : y);
        }
      }
    }

    if (dates) {
      for (const d of dates) {
        const parts = extractCalendarParts(d);
        if (parts) {
          yearSet.add(parts.year);
        }
      }
    }

    if (value.year) {
      const selectedY = Number(value.year);
      if (Number.isInteger(selectedY) && selectedY > 1900) {
        yearSet.add(selectedY > 2400 ? selectedY - 543 : selectedY);
      }
    }

    return Array.from(yearSet).sort((a, b) => a - b);
  }, [dates, years, value.year]);

  const monthLabels = isThai ? THAI_MONTHS : EN_MONTHS;
  const isActive = Boolean(value.day || value.month || value.year);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 font-sans">
        <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        <span>{isThai ? 'กรองวันที่:' : 'Date:'}</span>
      </span>

      {/* Day Dropdown (1-31) */}
      <select
        aria-label={isThai ? 'วัน' : 'Day'}
        value={value.day}
        onChange={(e) => onChange({ ...value, day: e.target.value })}
        className="h-9 px-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-sans cursor-pointer"
      >
        <option value="">{isThai ? 'วันทั้งหมด' : 'All Days'}</option>
        {Array.from({ length: 31 }, (_, idx) => {
          const dayNum = String(idx + 1);
          return (
            <option key={dayNum} value={dayNum}>
              {dayNum}
            </option>
          );
        })}
      </select>

      {/* Month Dropdown */}
      <select
        aria-label={isThai ? 'เดือน' : 'Month'}
        value={value.month}
        onChange={(e) => onChange({ ...value, month: e.target.value })}
        className="h-9 px-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-sans cursor-pointer"
      >
        <option value="">{isThai ? 'เดือนทั้งหมด' : 'All Months'}</option>
        {monthLabels.map((label, idx) => {
          const monthNum = String(idx + 1);
          return (
            <option key={monthNum} value={monthNum}>
              {label}
            </option>
          );
        })}
      </select>

      {/* Year Dropdown (BE in Thai, CE in English) */}
      <select
        aria-label={isThai ? 'ปี' : 'Year'}
        value={value.year}
        onChange={(e) => onChange({ ...value, year: e.target.value })}
        className="h-9 px-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-mono tabular-nums cursor-pointer"
      >
        <option value="">{isThai ? 'ปีทั้งหมด' : 'All Years'}</option>
        {yearOptions.map((ceYear) => (
          <option key={ceYear} value={String(ceYear)}>
            {isThai ? String(ceYear + 543) : String(ceYear)}
          </option>
        ))}
      </select>

      {/* Clear Filter Button */}
      {isActive && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_DATE_FILTER)}
          className="inline-flex items-center gap-1 h-9 px-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer font-sans"
        >
          <X className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span>{isThai ? 'ล้างตัวกรอง' : 'Clear'}</span>
        </button>
      )}
    </div>
  );
};

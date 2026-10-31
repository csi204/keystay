import React, { createContext, useContext, useState, useMemo } from 'react';
import { th } from '../locales/th';
import { en } from '../locales/en';

export type Locale = 'th' | 'en';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number | string) => string;
  formatDate: (dateStr?: string | null, format?: 'short' | 'medium' | 'long') => string;
  formatDateRange: (startStr?: string | null, endStr?: string | null, nights?: number) => string;
}

const STORAGE_KEY = 'keystay_locale';

/**
 * Safely retrieve initial locale from localStorage with try/catch fallback.
 */
function getStoredLocale(): Locale {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'th' || stored === 'en') {
        return stored;
      }
    }
  } catch {
    // Graceful fallback for sandboxed iframes or denied storage permissions
  }
  return 'th';
}

/**
 * Safely parse date string without timezone off-by-one shifts.
 */
function parseSafeDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return null;
  }
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const d = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Helper to translate a key with parameter interpolation ({param}).
 * Falls back to the key itself if not found.
 */
export function translateKey(
  dict: Record<string, string>,
  key: string,
  params?: Record<string, string | number>
): string {
  if (!dict || dict[key] === undefined) {
    return key;
  }
  const template = dict[key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, match) => {
    if (params[match] !== undefined) {
      return String(params[match]);
    }
    return `{${match}}`;
  });
}

/**
 * Format currency with ฿ symbol and 2-decimal precision.
 * Safe against NaN and empty strings.
 */
export function formatCurrencyHelper(amount: number | string, _locale: Locale = 'th'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) {
    return '฿0.00';
  }
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `฿${formatted}`;
}

/**
 * Format date string into localized short/medium/long formats.
 * Returns '—' for missing or invalid dates.
 */
export function formatDateHelper(
  dateStr?: string | null,
  format: 'short' | 'medium' | 'long' = 'short',
  locale: Locale = 'th'
): string {
  const d = parseSafeDate(dateStr);
  if (!d) {
    return '—';
  }

  const intlLocale = locale === 'th' ? 'th-TH' : 'en-US';

  try {
    if (format === 'short') {
      return new Intl.DateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } else if (format === 'medium') {
      return new Intl.DateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } else {
      return new Intl.DateTimeFormat(intlLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    }
  } catch {
    return '—';
  }
}

/**
 * Format date range cleanly into readable format (e.g. '28 ก.ย. 2569 - 2 ต.ค. 2569 (4 คืน)').
 * Returns '—' for missing or invalid dates.
 */
export function formatDateRangeHelper(
  startStr?: string | null,
  endStr?: string | null,
  nights?: number,
  locale: Locale = 'th'
): string {
  const sDate = parseSafeDate(startStr);
  const eDate = parseSafeDate(endStr);

  if (!sDate && !eDate) {
    return '—';
  }

  const startFormatted = sDate ? formatDateHelper(startStr, 'short', locale) : '—';
  const endFormatted = eDate ? formatDateHelper(endStr, 'short', locale) : '—';

  // Calculate nights if not provided
  let nightCount = nights;
  if (nightCount === undefined && sDate && eDate) {
    const diffMs = eDate.getTime() - sDate.getTime();
    const calculated = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (!isNaN(calculated) && calculated >= 0) {
      nightCount = calculated;
    }
  }

  if (nightCount !== undefined && nightCount >= 0) {
    const nightLabel =
      locale === 'th'
        ? `${nightCount} คืน`
        : `${nightCount} night${nightCount === 1 ? '' : 's'}`;
    return `${startFormatted} - ${endFormatted} (${nightLabel})`;
  }

  return `${startFormatted} - ${endFormatted}`;
}

const defaultContextValue: I18nContextValue = {
  locale: 'th',
  setLocale: () => {},
  t: (key, params) => translateKey(th, key, params),
  formatCurrency: (amount) => formatCurrencyHelper(amount, 'th'),
  formatDate: (dateStr, format) => formatDateHelper(dateStr, format, 'th'),
  formatDateRange: (startStr, endStr, nights) => formatDateRangeHelper(startStr, endStr, nights, 'th'),
};

const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, newLocale);
      }
    } catch {
      // Ignore localStorage failure in restricted contexts
    }
  };

  const dictionary = useMemo(() => (locale === 'th' ? th : en), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string, params?: Record<string, string | number>) =>
        translateKey(dictionary, key, params),
      formatCurrency: (amount: number | string) =>
        formatCurrencyHelper(amount, locale),
      formatDate: (dateStr?: string | null, format?: 'short' | 'medium' | 'long') =>
        formatDateHelper(dateStr, format, locale),
      formatDateRange: (startStr?: string | null, endStr?: string | null, nights?: number) =>
        formatDateRangeHelper(startStr, endStr, nights, locale),
    }),
    [locale, dictionary]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  return context || defaultContextValue;
}

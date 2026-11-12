import React, { useState, useEffect } from 'react';
import { Phone, CreditCard, Globe, AlertCircle } from 'lucide-react';

/**
 * Strips all non-digit characters from the input string.
 */
export function cleanDigits(val: string): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

/**
 * Formats a phone number to xxx-xxx-xxxx pattern (max 10 digits).
 * Non-digit characters are stripped.
 */
export function formatPhoneNumber(val: string): string {
  if (!val) return '';
  const digits = cleanDigits(val).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Checks if phone number is valid (strictly 10 digits).
 */
export function isValidPhone(val: string): boolean {
  if (!val) return false;
  const digits = cleanDigits(val);
  return digits.length === 10;
}

/**
 * Formats Thai National ID to x-xxxx-xxxxx-xx-x pattern (max 13 digits).
 * Non-digit characters are stripped.
 */
export function formatThaiId(val: string): string {
  if (!val) return '';
  const digits = cleanDigits(val).slice(0, 13);
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  if (digits.length <= 10) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10)}`;
  }
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
}

/**
 * Checks if Thai ID is valid (strictly 13 digits).
 */
export function isValidThaiId(val: string): boolean {
  if (!val) return false;
  const digits = cleanDigits(val);
  return digits.length === 13;
}

/**
 * Formats Passport Number: 2 uppercase letters + up to 7 digits (max 9 chars, e.g. AC1234567).
 */
export function formatPassport(val: string): string {
  if (!val) return '';
  const upper = val.toUpperCase();
  let letters = '';
  let digits = '';

  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    if (letters.length < 2) {
      if (/[A-Z]/.test(ch)) {
        letters += ch;
      }
    } else {
      if (/[0-9]/.test(ch) && digits.length < 7) {
        digits += ch;
      }
    }
  }

  return letters + digits;
}

/**
 * Checks if Passport number is valid (strictly 2 uppercase letters + 7 digits).
 */
export function isValidPassport(val: string): boolean {
  if (!val) return false;
  const cleaned = val.trim().replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{2}\d{7}$/.test(cleaned);
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  error?: string | boolean;
  showIcon?: boolean;
  autoFocus?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  touched?: boolean;
  defaultTouched?: boolean;
}

/**
 * Accessible Phone Input with auto-masking xxx-xxx-xxxx, Lucide icon, and 10-digit cap.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  id,
  name,
  label,
  placeholder = '081-234-5678',
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  error,
  showIcon = true,
  autoFocus = false,
  onBlur,
  touched: propTouched,
  defaultTouched = false,
}) => {
  const [isTouched, setIsTouched] = useState(defaultTouched);
  const isFieldTouched = propTouched !== undefined ? propTouched : isTouched;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true);
    onBlur?.(e);
  };

  const isPhoneValid = isValidPhone(value);
  const hasValidationError = isFieldTouched && Boolean(value) && !isPhoneValid;
  const isInvalid = Boolean(error) || hasValidationError;
  const errorMessage =
    typeof error === 'string'
      ? error
      : hasValidationError
        ? 'เบอร์โทรศัพท์ต้องครบ 10 หลัก (0xx-xxx-xxxx)'
        : undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label} {required && <span className="text-rose-500 font-bold ml-1 text-xs select-none">*</span>}
        </label>
      )}
      <div className="relative">
        {showIcon && (
          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          id={id}
          name={name}
          type="tel"
          value={formatPhoneNumber(value)}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={12}
          className={`w-full min-h-[44px] py-2 px-3 ${showIcon ? 'pl-9' : ''} bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 dark:focus:border-slate-400 font-mono tabular-nums shadow-2xs transition-colors ${
            isInvalid ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-600'
          } ${inputClassName}`}
        />
      </div>
      {errorMessage && (
        <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 font-medium">
          <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};

export interface NationalIdOrPassportInputProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'thai_id' | 'passport';
  onTypeChange?: (type: 'thai_id' | 'passport') => void;
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  error?: string | boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  touched?: boolean;
  defaultTouched?: boolean;
}

/**
 * National ID or Passport Input with segmented pills, automatic formatting,
 * required indicator, and touch targets.
 */
export const NationalIdOrPassportInput: React.FC<NationalIdOrPassportInputProps> = ({
  value,
  onChange,
  type: propType,
  onTypeChange,
  id,
  name,
  label,
  required = true,
  disabled = false,
  className = '',
  inputClassName = '',
  error,
  onBlur,
  touched: propTouched,
  defaultTouched = false,
}) => {
  const [internalMode, setInternalMode] = useState<'thai_id' | 'passport'>(() => {
    if (propType) return propType;
    if (value && /[a-zA-Z]/.test(value)) return 'passport';
    return 'thai_id';
  });

  const currentMode = propType || internalMode;
  const [isTouched, setIsTouched] = useState(defaultTouched);
  const isFieldTouched = propTouched !== undefined ? propTouched : isTouched;

  useEffect(() => {
    if (propType) {
      setInternalMode(propType);
    }
  }, [propType]);

  const handleModeChange = (newMode: 'thai_id' | 'passport') => {
    if (newMode === currentMode) return;
    setInternalMode(newMode);
    onTypeChange?.(newMode);
    setIsTouched(false);
    if (value) {
      if (newMode === 'thai_id') {
        onChange(formatThaiId(cleanDigits(value)));
      } else {
        onChange(formatPassport(value));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (currentMode === 'thai_id') {
      onChange(formatThaiId(rawVal));
    } else {
      onChange(formatPassport(rawVal));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true);
    onBlur?.(e);
  };

  const isValueValid = currentMode === 'thai_id' ? isValidThaiId(value) : isValidPassport(value);
  const hasValidationError = isFieldTouched && Boolean(value) && !isValueValid;
  const isInvalid = Boolean(error) || hasValidationError;

  const errorMessage =
    typeof error === 'string'
      ? error
      : hasValidationError
        ? currentMode === 'thai_id'
          ? 'เลขบัตรประชาชนต้องครบ 13 หลัก (x-xxxx-xxxxx-xx-x)'
          : 'หมายเลขหนังสือเดินทางต้องมี 7–9 หลัก'
        : undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with Mode Toggle Segmented Pills */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <label htmlFor={id} className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label || (currentMode === 'thai_id' ? 'เลขบัตรประชาชน' : 'เลขพาสปอร์ต')}
          <span className="text-slate-400 font-normal text-xs ml-1">
            {currentMode === 'thai_id' ? '(Thai ID)' : '(Passport)'}
          </span>
          {required && <span className="text-rose-500 font-bold ml-1 text-xs select-none">*</span>}
        </label>

        {/* Segmented Pills */}
        <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => handleModeChange('thai_id')}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all min-h-[30px] ${
              currentMode === 'thai_id'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span>บัตรประชาชน (Thai ID)</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('passport')}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all min-h-[30px] ${
              currentMode === 'passport'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>พาสปอร์ต (Passport)</span>
          </button>
        </div>
      </div>

      {/* Input Field with leading icon and min-h-[44px] */}
      <div className="relative">
        {currentMode === 'thai_id' ? (
          <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        ) : (
          <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          id={id}
          name={name}
          type="text"
          value={currentMode === 'thai_id' ? formatThaiId(value) : formatPassport(value)}
          onChange={handleInputChange}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          placeholder={currentMode === 'thai_id' ? '1-2345-67890-12-3' : 'AC1234567'}
          maxLength={currentMode === 'thai_id' ? 17 : 9}
          className={`w-full min-h-[44px] py-2 px-3 pl-9 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 dark:focus:border-slate-400 font-mono tabular-nums shadow-2xs transition-colors ${
            isInvalid ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 dark:border-slate-600'
          } ${inputClassName}`}
        />
      </div>

      {errorMessage && (
        <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 font-medium">
          <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};

export default {
  PhoneInput,
  NationalIdOrPassportInput,
  cleanDigits,
  formatPhoneNumber,
  isValidPhone,
  formatThaiId,
  isValidThaiId,
  formatPassport,
  isValidPassport,
};

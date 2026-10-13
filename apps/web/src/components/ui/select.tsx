import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  placeholder?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onChange,
      name,
      disabled,
      className,
      containerClassName,
      placeholder = 'เลือกตัวเลือก...',
      options: directOptions,
      children,
    },
    ref
  ) => {
    // 1. Extract options from children (<option>) if directOptions is not provided
    const parsedOptions: SelectOption[] = React.useMemo(() => {
      if (directOptions && directOptions.length > 0) {
        return directOptions;
      }
      const list: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === 'option') {
          list.push({
            value: String(child.props.value ?? ''),
            label: String(child.props.children ?? child.props.value ?? ''),
          });
        }
      });
      return list;
    }, [directOptions, children]);

    // 2. State management
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(
      controlledValue !== undefined ? controlledValue : defaultValue || ''
    );
    const containerRef = useRef<HTMLDivElement>(null);

    const activeValue = controlledValue !== undefined ? controlledValue : internalValue;
    const selectedOption = parsedOptions.find((opt) => opt.value === activeValue);

    // 3. Handle outside click to close dropdown
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      }
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }, [isOpen]);

    const handleSelect = (val: string) => {
      setInternalValue(val);
      setIsOpen(false);
      if (onChange) {
        onChange({ target: { value: val, name } });
      }
    };

    return (
      <div
        ref={containerRef}
        className={cn('relative w-full select-none', containerClassName)}
      >
        {/* Custom Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={cn(
            'w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 shadow-2xs flex items-center justify-between gap-2 transition-all text-left',
            'hover:border-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]',
            isOpen && 'border-[#F97316] ring-1 ring-[#F97316]',
            disabled && 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-75',
            className
          )}
        >
          <span className={cn('truncate', !selectedOption && 'text-slate-400')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180 text-[#F97316]'
            )}
          />
        </button>

        {/* Custom Floating Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200/90 shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {parsedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                ไม่มีตัวเลือก
              </div>
            ) : (
              parsedOptions.map((opt) => {
                const isSelected = opt.value === activeValue;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-orange-50/80 font-bold text-[#F97316]'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

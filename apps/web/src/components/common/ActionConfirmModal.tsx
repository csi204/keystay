import React, { useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Trash2,
  CreditCard,
  Lock,
  X,
  Loader2,
} from 'lucide-react';

export type ActionConfirmVariant = 'danger' | 'primary' | 'warning';

export interface ActionSummaryDetail {
  label: string;
  value: string | React.ReactNode;
}

export interface ActionConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ActionConfirmVariant;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
  summaryDetails?: ActionSummaryDetail[];
  icon?: 'alert' | 'check' | 'trash' | 'card' | 'lock';
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'primary',
  onConfirm,
  onClose,
  isSubmitting = false,
  summaryDetails,
  icon,
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Resolve Header Icon component
  const renderIcon = () => {
    const iconClass = 'w-5 h-5 shrink-0';
    if (icon === 'trash') return <Trash2 className={iconClass} />;
    if (icon === 'check') return <CheckCircle2 className={iconClass} />;
    if (icon === 'card') return <CreditCard className={iconClass} />;
    if (icon === 'lock') return <Lock className={iconClass} />;
    if (icon === 'alert') return <AlertCircle className={iconClass} />;

    // Default icon based on variant
    if (variant === 'danger') return <Trash2 className={iconClass} />;
    if (variant === 'warning') return <AlertCircle className={iconClass} />;
    return <CheckCircle2 className={iconClass} />;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconWrapper: 'bg-rose-50 text-rose-600 border-rose-200',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus:ring-rose-500 shadow-sm',
        };
      case 'warning':
        return {
          iconWrapper: 'bg-amber-50 text-amber-600 border-amber-200',
          confirmBtn:
            'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white focus:ring-amber-500 shadow-sm',
        };
      case 'primary':
      default:
        return {
          iconWrapper: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          confirmBtn:
            'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white focus:ring-emerald-500 shadow-sm',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-confirm-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg border flex items-center justify-center ${styles.iconWrapper}`}
            >
              {renderIcon()}
            </div>
            <h2
              id="action-confirm-title"
              className="text-base font-bold text-slate-900"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {description}
          </p>

          {/* Optional Summary Details List */}
          {summaryDetails && summaryDetails.length > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2">
              {summaryDetails.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-slate-500 font-medium shrink-0">
                    {item.label}
                  </span>
                  <span className="text-slate-900 font-semibold font-mono tracking-tight text-right truncate">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors disabled:opacity-50 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-hidden focus:ring-2 ${styles.confirmBtn}`}
          >
            {isSubmitting && (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

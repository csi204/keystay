import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, type LucideIcon } from 'lucide-react';
import { useToast, type ToastType } from '../../context/ToastContext';

export interface ToastConfigItem {
  icon: LucideIcon;
  iconColor: string;
  borderClass: string;
}

export const TOAST_CONFIG: Record<ToastType, ToastConfigItem> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    borderClass: 'border-emerald-200/80 bg-emerald-50/20',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-500',
    borderClass: 'border-rose-200/80 bg-rose-50/20',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    borderClass: 'border-amber-200/80 bg-amber-50/20',
  },
  info: {
    icon: Info,
    iconColor: 'text-sky-500',
    borderClass: 'border-sky-200/80 bg-sky-50/20',
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[9999] pointer-events-none flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
        const IconComponent = config.icon;

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto bg-white/95 backdrop-blur-md border shadow-lg rounded-xl p-3.5 flex items-start gap-3 animate-in slide-in-from-top-3 fade-in duration-200 ${config.borderClass}`}
          >
            <IconComponent
              className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`}
              strokeWidth={1.75}
            />

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-sm font-semibold text-slate-800 leading-snug">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-md transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

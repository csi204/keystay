import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (type: ToastType, title: string, description?: string, duration?: number) => string;
  showSuccess: (title: string, description?: string, duration?: number) => string;
  showError: (title: string, description?: string, duration?: number) => string;
  showWarning: (title: string, description?: string, duration?: number) => string;
  showInfo: (title: string, description?: string, duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const DEFAULT_TOAST_DURATION = 3500;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export interface ToastProviderProps {
  children?: React.ReactNode;
  initialToasts?: ToastItem[];
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, initialToasts }) => {
  const [toasts, setToasts] = useState<ToastItem[]>(() => initialToasts || []);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string, duration?: number): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const effectiveDuration = duration ?? DEFAULT_TOAST_DURATION;

      const newToast: ToastItem = {
        id,
        type,
        title,
        description,
        duration: effectiveDuration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (effectiveDuration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, effectiveDuration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast('success', title, description, duration),
    [showToast]
  );

  const showError = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast('error', title, description, duration),
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast('warning', title, description, duration),
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, description?: string, duration?: number) =>
      showToast('info', title, description, duration),
    [showToast]
  );

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value: ToastContextValue = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearToasts,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

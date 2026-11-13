import { useEffect, useRef, useCallback } from 'react';

const EDITABLE_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Returns true when the user currently has focus inside an editable form control
 * (INPUT, TEXTAREA, SELECT, or a contentEditable element).
 */
export function isActivelyEditing(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;

  const tagName = (active.tagName || '').toUpperCase();
  if (EDITABLE_TAG_NAMES.has(tagName)) {
    return true;
  }

  if (active.isContentEditable) {
    return true;
  }

  if (typeof active.getAttribute === 'function') {
    const attr = active.getAttribute('contenteditable');
    if (attr === 'true' || attr === '') {
      return true;
    }
  }

  return false;
}

/**
 * Returns true when any global/layout modal or drawer (`[role="dialog"][aria-modal="true"]`)
 * is currently rendered open in the DOM.
 */
export function hasOpenDialog(): boolean {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
    return false;
  }
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
}

export interface AutoRefreshControllerOptions {
  onRefresh: () => void | Promise<void>;
  intervalMs?: number;
  paused?: boolean;
}

export interface AutoRefreshController {
  start: () => void;
  stop: () => void;
  resetTimer: () => void;
  setPaused: (paused: boolean) => void;
  setIntervalMs: (intervalMs: number) => void;
  updateOnRefresh: (fn: () => void | Promise<void>) => void;
  dispose: () => void;
}

/**
 * Imperative controller powering `useAutoRefresh`.
 * Skips both periodic interval ticks and `visibilitychange` refetches when
 * `paused || isActivelyEditing() || hasOpenDialog()`, and resets the countdown
 * whenever unpaused or when a global modal dialog closes.
 */
export function createAutoRefreshController(
  options: AutoRefreshControllerOptions
): AutoRefreshController {
  let onRefreshFn = options.onRefresh;
  let intervalMs = options.intervalMs ?? 60000;
  let paused = Boolean(options.paused);
  let timerId: ReturnType<typeof setInterval> | null = null;
  let disposed = false;
  let started = false;
  let dialogOpen = hasOpenDialog();
  let observer: MutationObserver | null = null;

  const isBlocked = () => paused || isActivelyEditing() || hasOpenDialog();

  const clearExistingTimer = () => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const runIfAllowed = () => {
    if (disposed || isBlocked()) {
      return;
    }
    void onRefreshFn();
  };

  const startTimer = () => {
    clearExistingTimer();
    if (disposed || paused || (observer !== null && dialogOpen)) {
      return;
    }
    timerId = setInterval(() => {
      runIfAllowed();
    }, intervalMs);
  };

  const syncDialogState = () => {
    if (disposed) return;
    const nowDialogOpen = hasOpenDialog();
    if (nowDialogOpen === dialogOpen) {
      return;
    }
    dialogOpen = nowDialogOpen;
    if (dialogOpen) {
      clearExistingTimer();
    } else if (started && !paused) {
      // Transitioning from dialog-open back to idle: reset countdown for a full intervalMs
      startTimer();
    }
  };

  const handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') {
      runIfAllowed();
    }
  };

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  if (
    typeof MutationObserver === 'function' &&
    typeof document !== 'undefined' &&
    document.body &&
    typeof document.body === 'object'
  ) {
    try {
      observer = new MutationObserver(() => {
        syncDialogState();
      });
      observer.observe(document.body as Node, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['role', 'aria-modal'],
      });
    } catch {
      observer = null;
    }
  }

  return {
    start: () => {
      started = true;
      dialogOpen = hasOpenDialog();
      startTimer();
    },
    stop: () => {
      started = false;
      clearExistingTimer();
    },
    resetTimer: () => {
      dialogOpen = hasOpenDialog();
      startTimer();
    },
    setPaused: (nextPaused: boolean) => {
      const wasPaused = paused;
      paused = Boolean(nextPaused);
      dialogOpen = hasOpenDialog();
      if (paused) {
        clearExistingTimer();
      } else if (wasPaused || timerId === null) {
        // Transitioning back to active: reset countdown so it waits a full intervalMs
        startTimer();
      }
    },
    setIntervalMs: (nextMs: number) => {
      if (nextMs !== intervalMs) {
        intervalMs = nextMs;
        if (started && !paused) {
          startTimer();
        }
      }
    },
    updateOnRefresh: (fn: () => void | Promise<void>) => {
      onRefreshFn = fn;
    },
    dispose: () => {
      disposed = true;
      started = false;
      clearExistingTimer();
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    },
  };
}

export interface UseAutoRefreshOptions {
  onRefresh: () => void | Promise<void>;
  intervalMs?: number;
  paused?: boolean;
}

/**
 * Periodically invokes `onRefresh` and refetches when the tab becomes visible,
 * automatically pausing whenever `paused` is true or the user is actively editing
 * an input/textarea/select/contentEditable element.
 * Resets the countdown timer when `paused` transitions back to `false`.
 */
export function useAutoRefresh({
  onRefresh,
  intervalMs = 60000,
  paused = false,
}: UseAutoRefreshOptions): { resetTimer: () => void } {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const controllerRef = useRef<AutoRefreshController | null>(null);

  useEffect(() => {
    const controller = createAutoRefreshController({
      onRefresh: () => onRefreshRef.current(),
      intervalMs,
      paused,
    });
    controllerRef.current = controller;
    controller.start();

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setIntervalMs(intervalMs);
  }, [intervalMs]);

  useEffect(() => {
    controllerRef.current?.setPaused(paused);
  }, [paused]);

  const resetTimer = useCallback(() => {
    controllerRef.current?.resetTimer();
  }, []);

  return { resetTimer };
}

export default useAutoRefresh;

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  isActivelyEditing,
  hasOpenDialog,
  createAutoRefreshController,
  useAutoRefresh,
} from '../hooks/useAutoRefresh';
import { useReservations } from '../hooks/useReservations';
import { RoomDetailsModal } from '../components/front-desk/RoomDetailsModal';
import { WalkInModal } from '../components/front-desk/WalkInModal';
import { ToastProvider } from '../context/ToastContext';
import type { Room, RoomType } from '@keystay/types';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

/**
 * Minimal React 18 hook test harness for running real hooks inside `node --test` without jsdom.
 */
function runHook<T>(hookFn: () => T) {
  const states: any[] = [];
  const refs: any[] = [];
  const effects: Array<{ fn: () => void | (() => void); deps: any[]; cleanup?: (() => void) | void }> = [];
  let stateIdx = 0;
  let refIdx = 0;
  let effectIdx = 0;
  let currentResult: T;

  const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  const dispatcher = {
    useState(initial: any) {
      const idx = stateIdx++;
      if (!(idx in states)) {
        states[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setter = (val: any) => {
        states[idx] = typeof val === 'function' ? val(states[idx]) : val;
      };
      return [states[idx], setter];
    },
    useRef(initial: any) {
      const idx = refIdx++;
      if (!(idx in refs)) {
        refs[idx] = { current: initial };
      }
      return refs[idx];
    },
    useCallback(fn: any) {
      return fn;
    },
    useMemo(fn: any) {
      return fn();
    },
    useEffect(fn: any, deps: any[]) {
      const idx = effectIdx++;
      const prev = effects[idx];
      const changed =
        !prev ||
        !deps ||
        !prev.deps ||
        deps.length !== prev.deps.length ||
        deps.some((d, i) => !Object.is(d, prev.deps[i]));
      if (changed) {
        if (prev?.cleanup && typeof prev.cleanup === 'function') {
          prev.cleanup();
        }
        effects[idx] = { fn, deps, cleanup: fn() };
      }
    },
  };

  function render() {
    stateIdx = 0;
    refIdx = 0;
    effectIdx = 0;
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current;
    ReactInternals.ReactCurrentDispatcher.current = dispatcher;
    try {
      currentResult = hookFn();
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher;
    }
    return currentResult;
  }

  function unmount() {
    for (const eff of effects) {
      if (eff?.cleanup && typeof eff.cleanup === 'function') {
        eff.cleanup();
      }
    }
  }

  return { render, unmount, get result() { return currentResult; } };
}

describe('Task 4: Pause Auto-Refresh, Prevent Modal Input Reset & Fix Walk-In/Slip Persistence', () => {
  describe('1. useAutoRefresh & isActivelyEditing', () => {
    it('isActivelyEditing detects INPUT, TEXTAREA, SELECT, and contentEditable elements', () => {
      const origDoc = (globalThis as any).document;
      try {
        (globalThis as any).document = { activeElement: { tagName: 'INPUT' } };
        assert.strictEqual(isActivelyEditing(), true);

        (globalThis as any).document = { activeElement: { tagName: 'textarea' } };
        assert.strictEqual(isActivelyEditing(), true);

        (globalThis as any).document = { activeElement: { tagName: 'SELECT' } };
        assert.strictEqual(isActivelyEditing(), true);

        (globalThis as any).document = {
          activeElement: { tagName: 'DIV', isContentEditable: true },
        };
        assert.strictEqual(isActivelyEditing(), true);

        (globalThis as any).document = {
          activeElement: { tagName: 'BODY', isContentEditable: false },
        };
        assert.strictEqual(isActivelyEditing(), false);

        (globalThis as any).document = { activeElement: null };
        assert.strictEqual(isActivelyEditing(), false);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });

    it('pauses interval & visibilitychange when paused = true or activeElement is INPUT, and resets timer on unpause', (t) => {
      const origDoc = (globalThis as any).document;
      const listeners: Record<string, Array<() => void>> = {};
      const mockDoc: any = {
        visibilityState: 'visible',
        activeElement: { tagName: 'BODY', isContentEditable: false },
        addEventListener: (evt: string, fn: () => void) => {
          listeners[evt] = listeners[evt] || [];
          listeners[evt].push(fn);
        },
        removeEventListener: (evt: string, fn: () => void) => {
          listeners[evt] = (listeners[evt] || []).filter((f) => f !== fn);
        },
      };

      (globalThis as any).document = mockDoc;
      t.mock.timers.enable({ apis: ['setInterval'] });

      let refreshCount = 0;
      const controller = createAutoRefreshController({
        onRefresh: () => {
          refreshCount++;
        },
        intervalMs: 60000,
        paused: false,
      });

      try {
        controller.start();

        // Advance 60s -> fires once
        t.mock.timers.tick(60000);
        assert.strictEqual(refreshCount, 1);

        // visibilitychange fires when visible & not paused/editing
        listeners['visibilitychange']?.forEach((fn) => fn());
        assert.strictEqual(refreshCount, 2);

        // Pause -> interval and visibilitychange must skip
        controller.setPaused(true);
        t.mock.timers.tick(120000);
        listeners['visibilitychange']?.forEach((fn) => fn());
        assert.strictEqual(refreshCount, 2);

        // Unpause -> must reset countdown and NOT fire immediately or after 59s
        controller.setPaused(false);
        t.mock.timers.tick(59000);
        assert.strictEqual(refreshCount, 2);

        // At full 60s after unpause -> fires once
        t.mock.timers.tick(1000);
        assert.strictEqual(refreshCount, 3);

        // Active INPUT element -> skips interval and visibilitychange
        mockDoc.activeElement = { tagName: 'INPUT', isContentEditable: false };
        t.mock.timers.tick(60000);
        listeners['visibilitychange']?.forEach((fn) => fn());
        assert.strictEqual(refreshCount, 3);

        // Blur back to BODY -> resumes
        mockDoc.activeElement = { tagName: 'BODY', isContentEditable: false };
        t.mock.timers.tick(60000);
        assert.strictEqual(refreshCount, 4);
      } finally {
        controller.dispose();
        t.mock.timers.reset();
        (globalThis as any).document = origDoc;
      }
    });

    it('useAutoRefresh React hook skips when paused and restarts full countdown when unpaused', (t) => {
      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        visibilityState: 'visible',
        activeElement: { tagName: 'BODY', isContentEditable: false },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      t.mock.timers.enable({ apis: ['setInterval'] });

      let refreshCount = 0;
      let paused = true;

      const harness = runHook(() =>
        useAutoRefresh({
          onRefresh: () => {
            refreshCount++;
          },
          intervalMs: 60000,
          paused,
        })
      );

      try {
        harness.render();
        t.mock.timers.tick(120000);
        assert.strictEqual(refreshCount, 0, 'Must not refresh while paused = true');

        paused = false;
        harness.render();
        t.mock.timers.tick(59000);
        assert.strictEqual(refreshCount, 0, 'Must wait full intervalMs after unpausing');
        t.mock.timers.tick(1000);
        assert.strictEqual(refreshCount, 1, 'Should refresh after full intervalMs');
      } finally {
        harness.unmount();
        t.mock.timers.reset();
        (globalThis as any).document = origDoc;
      }
    });

    it('RoomMatrixPage, DailyOperationsPage, and CashierFolioPage wire useAutoRefresh with modal pause guards, and hooks use hasLoadedOnceRef', () => {
      const files = [
        'apps/web/src/pages/front-desk/RoomMatrixPage.tsx',
        'apps/web/src/pages/front-desk/DailyOperationsPage.tsx',
        'apps/web/src/pages/front-desk/CashierFolioPage.tsx',
      ];
      for (const rel of files) {
        const code = fs.readFileSync(resolveFilePath(rel), 'utf-8');
        assert.match(code, /useAutoRefresh/, `${rel} must call useAutoRefresh`);
        assert.match(code, /paused:\s*isAnyModalOpen/, `${rel} must pass paused: isAnyModalOpen`);
      }

      const hookFiles = [
        'apps/web/src/hooks/useRooms.ts',
        'apps/web/src/hooks/useReservations.ts',
        'apps/web/src/hooks/useBilling.ts',
      ];
      for (const rel of hookFiles) {
        const code = fs.readFileSync(resolveFilePath(rel), 'utf-8');
        assert.match(code, /hasLoadedOnceRef/, `${rel} must track hasLoadedOnceRef to avoid loading flashes`);
      }
    });

    it('pauses auto-refresh when a global [role="dialog"][aria-modal="true"] is open and resets timer when closed', (t) => {
      const origDoc = (globalThis as any).document;
      const origMO = (globalThis as any).MutationObserver;
      const listeners: Record<string, Array<() => void>> = {};
      let observerCb: (() => void) | null = null;
      const triggerMutation = () => {
        observerCb?.();
      };
      let dialogPresent = false;

      const mockDoc: any = {
        visibilityState: 'visible',
        activeElement: { tagName: 'BODY', isContentEditable: false },
        body: {},
        querySelector: (selector: string) =>
          selector === '[role="dialog"][aria-modal="true"]' && dialogPresent ? {} : null,
        addEventListener: (evt: string, fn: () => void) => {
          listeners[evt] = listeners[evt] || [];
          listeners[evt].push(fn);
        },
        removeEventListener: (evt: string, fn: () => void) => {
          listeners[evt] = (listeners[evt] || []).filter((f) => f !== fn);
        },
      };

      class MockMutationObserver {
        constructor(cb: () => void) {
          observerCb = cb;
        }
        observe() {}
        disconnect() {
          observerCb = null;
        }
      }

      (globalThis as any).document = mockDoc;
      (globalThis as any).MutationObserver = MockMutationObserver;
      t.mock.timers.enable({ apis: ['setInterval'] });

      let refreshCount = 0;
      const controller = createAutoRefreshController({
        onRefresh: () => {
          refreshCount++;
        },
        intervalMs: 60000,
        paused: false,
      });

      try {
        assert.strictEqual(hasOpenDialog(), false);
        controller.start();

        // Elapse 30s before opening global dialog
        t.mock.timers.tick(30000);
        assert.strictEqual(refreshCount, 0);

        // Open global dialog (e.g., QuickEmergencyDrawer / KeyboardShortcutsModal / GlobalCommandPalette)
        dialogPresent = true;
        assert.strictEqual(hasOpenDialog(), true);
        triggerMutation();

        // Advance 120s and trigger visibilitychange while dialog is open -> must NOT refresh
        t.mock.timers.tick(120000);
        listeners['visibilitychange']?.forEach((fn) => fn());
        assert.strictEqual(refreshCount, 0, 'Must skip interval and visibilitychange while global dialog is open');

        // Close dialog -> must reset countdown and wait a full 60s before refreshing
        dialogPresent = false;
        assert.strictEqual(hasOpenDialog(), false);
        triggerMutation();

        t.mock.timers.tick(59000);
        assert.strictEqual(refreshCount, 0, 'Must reset timer to full intervalMs after global dialog closes');

        t.mock.timers.tick(1000);
        assert.strictEqual(refreshCount, 1, 'Should refresh after full intervalMs once global dialog closed');

        // Verify all FrontDeskLayout global drawers/modals render role="dialog" aria-modal="true"
        const layoutDialogFiles = [
          'apps/web/src/components/front-desk/QuickEmergencyDrawer.tsx',
          'apps/web/src/components/common/KeyboardShortcutsModal.tsx',
          'apps/web/src/components/front-desk/GlobalCommandPalette.tsx',
          'apps/web/src/components/front-desk/FrontDeskLayout.tsx',
        ];
        for (const rel of layoutDialogFiles) {
          const code = fs.readFileSync(resolveFilePath(rel), 'utf-8');
          assert.match(code, /role="dialog"/, `${rel} must include role="dialog"`);
          assert.match(code, /aria-modal="true"/, `${rel} must include aria-modal="true"`);
        }
      } finally {
        controller.dispose();
        t.mock.timers.reset();
        (globalThis as any).document = origDoc;
        (globalThis as any).MutationObserver = origMO;
      }
    });
  });

  describe('2. Modal Form Preservation on Background Refresh & WalkInModal Hardening', () => {
    it('RoomDetailsModal preserves user-typed guestName when room/roomType prop references refresh while open', () => {
      const modalCode = fs.readFileSync(
        resolveFilePath('apps/web/src/components/front-desk/RoomDetailsModal.tsx'),
        'utf-8'
      );

      // Must track prevOpenRef and prevRoomIdRef for form reset
      assert.match(modalCode, /prevOpenRef/);
      assert.match(modalCode, /prevRoomIdRef/);
      assert.match(modalCode, /if\s*\(justOpened\s*\|\|\s*switchedRoom\)/);

      // Must NOT wipe editedNotes or exit edit mode while isEditingNotes is active
      assert.match(modalCode, /isEditingNotesRef/);
      assert.match(modalCode, /!isEditingNotesRef\.current/);

      // Behavioral verification using React state simulation of RoomDetailsModal's effect
      let guestName = '';
      let isOpen = true;
      let room: Room = {
        id: 'rm-101',
        roomNumber: '101',
        roomTypeId: 'rt-std',
        status: 'available',
        floor: 1,
      } as unknown as Room;
      let roomType: RoomType = {
        id: 'rt-std',
        name: 'Standard',
        basePrice: '1200',
        capacity: 2,
      } as unknown as RoomType;

      const harness = runHook(() => {
        const [name, setName] = React.useState('');
        guestName = name;
        const prevOpenRef = React.useRef(false);
        const prevRoomIdRef = React.useRef<string | undefined>(undefined);

        React.useEffect(() => {
          const wasOpen = prevOpenRef.current;
          const prevRoomId = prevRoomIdRef.current;
          const currentRoomId = room?.id;
          prevOpenRef.current = isOpen;
          prevRoomIdRef.current = currentRoomId;
          if (!isOpen) return;
          const justOpened = !wasOpen && isOpen;
          const switchedRoom = currentRoomId !== prevRoomId;
          if (justOpened || switchedRoom) {
            setName('');
          }
        }, [isOpen, room?.id, roomType, room?.status]);

        return { setName };
      });

      harness.render();
      // User types guestName
      harness.result.setName('สมชาย ใจดี');
      harness.render();
      assert.strictEqual(guestName, 'สมชาย ใจดี');

      // Background refresh creates new room & roomType object references with same room.id
      room = { ...room, status: 'available' };
      roomType = { ...roomType, basePrice: '1200' };
      harness.render();
      assert.strictEqual(
        guestName,
        'สมชาย ใจดี',
        'guestName must NOT be wiped when room/roomType references refresh while isOpen === true'
      );

      // Switching to a different room DOES reset guestName
      room = { ...room, id: 'rm-102', roomNumber: '102' };
      harness.render();
      harness.render();
      assert.strictEqual(guestName, '', 'Switching to a different room should reset form');

      harness.unmount();
    });

    it('RoomDetailsModal, WalkInModal, NewBookingModal, CheckOutModal, and ExtendStayModal guard initialization with prevOpenRef', () => {
      const modalPaths = [
        'apps/web/src/components/front-desk/RoomDetailsModal.tsx',
        'apps/web/src/components/front-desk/WalkInModal.tsx',
        'apps/web/src/components/front-desk/NewBookingModal.tsx',
        'apps/web/src/components/front-desk/CheckOutModal.tsx',
        'apps/web/src/components/front-desk/ExtendStayModal.tsx',
      ];
      for (const rel of modalPaths) {
        const code = fs.readFileSync(resolveFilePath(rel), 'utf-8');
        assert.match(code, /prevOpenRef/, `${rel} must use prevOpenRef to prevent resetting inputs on background refresh`);
      }
    });

    it('CheckOutModal separates form reset from folio fetch so parent re-renders never abort in-flight /api/bills/by-reservation fetch', async () => {
      const checkOutCode = fs.readFileSync(
        resolveFilePath('apps/web/src/components/front-desk/CheckOutModal.tsx'),
        'utf-8'
      );

      // Verify the folio fetch effect is strictly keyed on [isOpen, reservationId]
      assert.match(
        checkOutCode,
        /apiFetch<DetailedBill>\(`\/api\/bills\/by-reservation\/\$\{reservationId\}`\)[\s\S]*?\}, \[isOpen, reservationId\]\);/,
        'CheckOutModal folio fetch effect must depend strictly on [isOpen, reservationId]'
      );

      // Simulate separated effects with an in-flight async fetch during parent object re-renders
      let resolveFetch!: (val: { data: { id: string; items: Array<{ id: string }> } }) => void;
      let fetchAbortCount = 0;
      let billIdState: string | null = null;
      let folioItemsState: Array<{ id: string }> = [];

      let reservation = { id: 'res-42', totalNights: 2, totalAmount: 2400 };
      let roomType = { id: 'rt-1', basePrice: '1200' };
      const isOpen = true;

      const harness = runHook(() => {
        const [billId, setBillId] = React.useState<string | null>(null);
        const [folioItems, setFolioItems] = React.useState<Array<{ id: string }>>([]);
        const [note, setNote] = React.useState('');
        billIdState = billId;
        folioItemsState = folioItems;

        const prevOpenRef = React.useRef(false);
        const prevResIdRef = React.useRef<string | undefined>(undefined);
        const defaultItemRef = React.useRef<{ id: string } | null>(null);
        defaultItemRef.current = { id: `room-${reservation.id}` };

        const reservationId = reservation?.id;

        // Effect 1: form state reset on open/reservation switch
        React.useEffect(() => {
          const wasOpen = prevOpenRef.current;
          const prevResId = prevResIdRef.current;
          prevOpenRef.current = isOpen;
          prevResIdRef.current = reservationId;
          if (!isOpen || !reservationId) return;
          if (!wasOpen || reservationId !== prevResId) {
            setNote('');
          }
        }, [isOpen, reservationId]);

        // Effect 2: async folio fetch strictly keyed on [isOpen, reservationId]
        React.useEffect(() => {
          if (!isOpen || !reservationId) return;
          let isMounted = true;
          new Promise<{ data: { id: string; items: Array<{ id: string }> } }>((resolve) => {
            resolveFetch = resolve;
          }).then((res) => {
            if (!isMounted) return;
            setBillId(res.data.id);
            setFolioItems(res.data.items.length > 0 ? res.data.items : [defaultItemRef.current!]);
          });
          return () => {
            isMounted = false;
            fetchAbortCount++;
          };
        }, [isOpen, reservationId]);

        return { setNote, note };
      });

      harness.render();
      assert.strictEqual(fetchAbortCount, 0);

      // Simulate parent background refresh creating new reservation & roomType objects while fetch is in flight
      reservation = { ...reservation };
      roomType = { ...roomType, basePrice: '1300' };
      harness.render();
      assert.strictEqual(fetchAbortCount, 0, 'Parent re-render must NOT abort in-flight folio fetch');

      // Resolve in-flight folio fetch and re-render to read updated state
      resolveFetch({ data: { id: 'bill-99', items: [{ id: 'item-1' }] } });
      await Promise.resolve();
      await Promise.resolve();
      harness.render();

      assert.strictEqual(billIdState, 'bill-99');
      assert.deepStrictEqual(folioItemsState, [{ id: 'item-1' }]);

      harness.unmount();
    });

    it('WalkInModal renders safely when amenities is non-array or roomTypes/rooms are empty/missing', () => {
      assert.doesNotThrow(() => {
        const html = renderToStaticMarkup(
          React.createElement(WalkInModal, {
            isOpen: true,
            availableRooms: [
              { id: 'rm-101', roomNumber: '101', roomTypeId: 'rt-1', status: 'available', floor: 1 } as any,
            ],
            rooms: [
              { id: 'rm-101', roomNumber: '101', roomTypeId: 'rt-1', status: 'available', floor: 1 } as any,
            ],
            roomTypes: [
              { id: 'rt-1', name: 'Deluxe', basePrice: null as any, amenities: 'Wi-Fi, King Bed' as any } as any,
            ],
            onClose: () => {},
            onSubmit: async () => ({ success: true }),
          })
        );
        assert.ok(html.includes('101'));
      });
    });

    it('RoomDetailsModal renders safely in booking mode', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(RoomDetailsModal, {
            isOpen: true,
            initialMode: 'booking',
            bookingMode: 'walkin',
            room: { id: 'rm-101', roomNumber: '101', roomTypeId: 'rt-1', status: 'available', floor: 1 } as any,
            roomType: { id: 'rt-1', name: 'Standard', basePrice: '1200', capacity: 2, amenities: [] } as any,
            onClose: () => {},
          })
        )
      );
      assert.ok(html.includes('101'));
    });
  });

  describe('3. Payment Slip Persistence & Walk-In Upfront Fields', () => {
    it('useReservations.verifyPaymentSlip calls POST /api/reservations/:id/slip and refreshes reservations', async () => {
      const origFetch = globalThis.fetch;
      const calls: Array<{ url: string; method?: string; body?: any }> = [];

      globalThis.fetch = (async (input: any, init?: any) => {
        const url = String(input);
        const method = init?.method || 'GET';
        const body = init?.body ? JSON.parse(init.body) : undefined;
        calls.push({ url, method, body });

        if (url.endsWith('/api/reservations') && method === 'GET') {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'res-1',
                  roomId: 'rm-101',
                  status: 'checked_in',
                  paymentStatus: 'paid',
                  paymentSlipUrl: 'data:image/jpeg;base64,slip123',
                  paymentSlipRef: 'REF-999',
                  createdAt: '2026-11-13T00:00:00Z',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url.endsWith('/api/reservations/res-1/slip') && method === 'POST') {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: 'res-1',
                paymentStatus: 'paid',
                paymentSlipUrl: body.paymentSlipUrl,
                paymentSlipRef: body.paymentSlipRef,
                paymentVerifiedAt: '2026-11-13T10:00:00Z',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      const harness = runHook(() => useReservations());
      try {
        harness.render();
        const res = await harness.result.verifyPaymentSlip('res-1', {
          paymentSlipUrl: 'data:image/jpeg;base64,slip123',
          paymentSlipRef: 'REF-999',
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual((res as any).data?.paymentSlipUrl, 'data:image/jpeg;base64,slip123');
        assert.strictEqual((res as any).data?.paymentSlipRef, 'REF-999');

        const slipCall = calls.find((c) => c.url.endsWith('/api/reservations/res-1/slip'));
        assert.ok(slipCall, 'Must POST to /api/reservations/:id/slip');
        assert.strictEqual(slipCall.method, 'POST');
        assert.deepStrictEqual(slipCall.body, {
          paymentSlipUrl: 'data:image/jpeg;base64,slip123',
          paymentSlipRef: 'REF-999',
        });

        const getCalls = calls.filter((c) => c.url.endsWith('/api/reservations') && c.method === 'GET');
        assert.ok(getCalls.length >= 2, 'Must refresh reservations after verifying slip');
      } finally {
        harness.unmount();
        globalThis.fetch = origFetch;
      }
    });

    it('useReservations.walkInCheckIn forwards paymentSlipUrl, paymentSlipRef, and creates paid initial bill with isPaid: true and serviceChargeRate: 0', async () => {
      const origFetch = globalThis.fetch;
      const calls: Array<{ url: string; method?: string; body?: any }> = [];

      globalThis.fetch = (async (input: any, init?: any) => {
        const url = String(input);
        const method = init?.method || 'GET';
        const body = init?.body ? JSON.parse(init.body) : undefined;
        calls.push({ url, method, body });

        if (url.endsWith('/api/reservations/walk-in') && method === 'POST') {
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: 'res-walkin-1', roomNumber: '101', nightlyRate: 1500 },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url.endsWith('/api/bills') && method === 'POST') {
          return new Response(
            JSON.stringify({ success: true, data: { id: 'bill-1' } }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      const harness = runHook(() => useReservations());
      try {
        harness.render();
        const result = await harness.result.walkInCheckIn({
          roomId: 'rm-101',
          guestName: 'สมชาย ใจดี',
          phone: '081-234-5678',
          nationalIdOrPassport: '1234567890123',
          checkInDate: '2026-11-13',
          checkOutDate: '2026-11-15',
          depositAmount: '500',
          nightlyRate: 1500,
          paymentMethod: 'qr_promptpay',
          paymentSlipUrl: 'data:image/jpeg;base64,walkinslip',
          paymentSlipRef: 'QR-20261113',
        });

        assert.strictEqual(result.success, true);

        const walkInCall = calls.find((c) => c.url.endsWith('/api/reservations/walk-in'));
        assert.ok(walkInCall, 'Must POST to /api/reservations/walk-in');
        assert.strictEqual(walkInCall.body.paymentSlipUrl, 'data:image/jpeg;base64,walkinslip');
        assert.strictEqual(walkInCall.body.paymentSlipRef, 'QR-20261113');
        assert.strictEqual(walkInCall.body.nightlyRate, 1500);

        const billCall = calls.find((c) => c.url.endsWith('/api/bills'));
        assert.ok(billCall, 'Must auto-create initial bill via POST /api/bills');
        assert.strictEqual(billCall.body.serviceChargeRate, 0);
        assert.strictEqual(billCall.body.paymentMethod, 'qr_promptpay');
        assert.strictEqual(billCall.body.status, 'paid');
        assert.strictEqual(billCall.body.depositDeducted, 500);
        assert.deepStrictEqual(billCall.body.items[0], {
          category: 'room',
          itemType: 'room_charge',
          description: 'Room Charge (2 nights)',
          quantity: 2,
          unitPrice: 1500,
          isPaid: true,
        });
      } finally {
        harness.unmount();
        globalThis.fetch = origFetch;
      }
    });

    it('RoomMatrixPage passes onVerifySlip={verifyPaymentSlip} and RoomDetailsModal updates currentReservation on verify', () => {
      const matrixCode = fs.readFileSync(
        resolveFilePath('apps/web/src/pages/front-desk/RoomMatrixPage.tsx'),
        'utf-8'
      );
      const modalCode = fs.readFileSync(
        resolveFilePath('apps/web/src/components/front-desk/RoomDetailsModal.tsx'),
        'utf-8'
      );

      assert.match(matrixCode, /verifyPaymentSlip/);
      assert.match(matrixCode, /onVerifySlip=\{verifyPaymentSlip\}/);

      assert.match(modalCode, /paymentSlipUrl:\s*paymentSlipUrl\s*\|\|\s*undefined/);
      assert.match(modalCode, /paymentSlipRef:\s*paymentSlipRef\.trim\(\)\s*\|\|\s*undefined/);
      assert.match(modalCode, /nightlyRate:\s*roomType\?\.basePrice\s*\?\s*Number\(roomType\.basePrice\)\s*:\s*undefined/);
      assert.match(modalCode, /setCurrentReservation\(/);
    });
  });
});

# Front Desk Resilience, Room State Reconciliation & Seamless Billing Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 7 front-desk operational defects: reconcile room statuses (`liveRooms` for confirmed, checked_in, checked_out), restore floor dividers and room card floor numbers, implement a global Toast notification system, prevent calendar popover clipping, ensure stay extension syncs state, and provide a seamless One-Click Auto-Settle Checkout & auto-created active folio in billing.

**Architecture:** 
1. **Dynamic Room State Reconciliation:** `RoomMatrixPage` and `room-inventory` webhooks reconcile room status deterministically from active reservations (`confirmed` -> `reserved`, `checked_in`/`extended` -> `occupied`, `checked_out` -> `cleaning`). Relax webhook guards in `room-inventory` so checkout events are never dropped.
2. **Floor & Date Parity:** Derive floor from `r.floor || r.floorId?.replace('fl-', '') || r.roomNumber.charAt(0)` across Grid and RoomCards to restore floor headers with separator lines. Format checkout dates using `formatDisplayDate(displayCheckout, locale)`.
3. **Global Toast Notification:** Lightweight, production-grade `ToastContext` and `ToastContainer` with Swiss design aesthetics, Lucide icons, auto-dismiss in 3.5s, wired across all front-desk operations.
4. **Seamless Financial Flow (User Decisions A1 & A1):** One-Click Check-Out automatically creates/finalizes bills with status `paid` (`ชำระแล้ว`) and transitions room to `cleaning` without forcing the user into Cashier Folio. Clicking "เพิ่มค่าใช้จ่าย" for a room without a bill auto-creates an active folio on the fly.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Cloudflare Workers / Hono, SQLite D1, Vitest, Playwright.

---

## Global Constraints
- Strictly adhere to `feat/frontdesk-channels-and-amenities` branch.
- Lucide React icon imports must use exact PascalCase names and `strokeWidth={1.75}`.
- All monetary amounts must format with `tabular-nums font-mono` and two decimal places.
- Dates rendered in Thai must display Buddhist Era (`พ.ศ.`) and English CE (`ค.ศ.`).
- All 11 monorepo packages must pass `pnpm typecheck` and all unit/integration tests must pass cleanly.

---

## Review Focus
1. **Room State Sync:** Ensuring a newly created reservation immediately turns the room to `reserved` (`ติดจอง`), and checkout immediately turns it to `cleaning` (`รอทำความสะอาด`) without stale cached states.
2. **Floor Section Headers:** Confirming that viewing "All Floors" in Room Matrix Grid renders distinct floor sections (`ชั้น 1`, `ชั้น 2`, etc.) with divider lines and room count badges.
3. **Checkout Payment Settlement:** Ensuring `POST /api/bills/:id/pay` handles `netDue === 0` (e.g. covered by deposit) and sets status `paid` cleanly without 400 validation error.
4. **Toast Feedback:** Ensuring every user action (check-in, check-out, extend stay, new booking) triggers clear, non-intrusive feedback.
5. **No Visual Clipping:** Verifying datepickers and modals never overflow viewport bounds or clip content.

---

## Tasks

### Task 1: Dynamic Room Status Engine & Webhook Resilience
**Files:**
- `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- `services/room-inventory/src/routes/webhooks.ts`
- `apps/web/src/__tests__/RoomMatrixStatusSync.test.ts` (new)

- [x] **Step 1.1: Write failing test for Room Matrix live status reconciliation**
  Create `apps/web/src/__tests__/RoomMatrixStatusSync.test.ts` testing:
  - Room with `confirmed` reservation maps to `reserved` (`ติดจอง`) with reserved guest name.
  - Room with `checked_in` or `extended` reservation maps to `occupied` (`มีแขกพัก`) with guest name.
  - Room with today's `checked_out` reservation transitions from `reserved`/`occupied` to `cleaning` (`รอทำความสะอาด`).
  - Room with no active reservations clears stale `reserved` status to `available` (`ว่างพร้อมใช้`).

- [x] **Step 1.2: Run test to confirm failure**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/RoomMatrixStatusSync.test.ts`

- [x] **Step 1.3: Update `liveRooms` and `roomGuests` in `RoomMatrixPage.tsx`**
  - In `RoomMatrixPage.tsx`:
    - Map reservations by roomId:
      - `checked_in` | `extended` -> `occupied`
      - `confirmed` -> `reserved`
      - `checked_out` (today) -> `cleaning`
    - In `liveRooms`: if a room has status `'reserved'` in DB but no active confirmed reservation exists, set status to `'available'`.
    - In `roomGuests`: include both active in-house guests and confirmed booking guests so `ติดจอง` always shows the guest name.

- [x] **Step 1.4: Relax checkout webhook guard in `services/room-inventory`**
  - In `services/room-inventory/src/routes/webhooks.ts`:
    - In `/checkout` webhook: change `if (room.status !== 'occupied')` to permit checkout transitions from `'occupied'`, `'reserved'`, or `'checked_out'`.
    - Ensure room status reliably updates to `'checked_out'` (or `'cleaning'`).

- [x] **Step 1.5: Verify test passes & commit**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/RoomMatrixStatusSync.test.ts`
  Git commit: `feat(front-desk): reconcile dynamic room statuses and relax room-inventory checkout guard`

---

### Task 2: Floor Dividers, Grouping & RoomCard Floor/Checkout Date Resolution
**Files:**
- `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- `apps/web/src/components/front-desk/RoomCard.tsx`
- `services/room-inventory/src/routes/rooms.ts`
- `apps/web/src/__tests__/RoomMatrixGridFloors.test.ts` (new)

- [ ] **Step 2.1: Write failing test for Floor Grouping & RoomCard Date formatting**
  Create `apps/web/src/__tests__/RoomMatrixGridFloors.test.ts` verifying:
  - Floor is extracted reliably from `r.floor || r.floorId?.replace('fl-', '') || r.roomNumber.charAt(0)`.
  - `floors` contains all distinct floors (`1`, `2`, `3`, `4`, `5`).
  - Floor header section renders `ชั้น X` with room count and divider line.
  - `RoomCard.tsx` renders checkout date formatted via `formatDisplayDate(displayCheckout, locale)`.
  - `RoomCard.tsx` displays the correct floor number rather than hardcoded `ชั้น 1`.

- [ ] **Step 2.2: Run test to confirm failure**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/RoomMatrixGridFloors.test.ts`

- [ ] **Step 2.3: Implement floor resolution in `RoomMatrixGrid.tsx` & `RoomCard.tsx`**
  - In `RoomMatrixGrid.tsx`:
    - Helper `getRoomFloor(r: Room): string`: returns `r.floor || (r as any).floorId?.replace(/^fl-/, '') || r.roomNumber.charAt(0) || '1'`.
    - Populate `floors` from `getRoomFloor(r)`.
    - Render floor header dividers with `Building2` icon, floor name, room count badge, and `h-px bg-slate-200/80` line.
  - In `RoomCard.tsx`:
    - Helper `resolvedFloor = room.floor || (room as any).floorId?.replace(/^fl-/, '') || room.roomNumber.charAt(0) || '1'`.
    - Format `displayCheckout`: `<span className="leading-none">{locale === 'th' ? 'ออก: ' + formatDisplayDate(displayCheckout, locale) : 'Out: ' + formatDisplayDate(displayCheckout, locale)}</span>`.

- [ ] **Step 2.4: Ensure `services/room-inventory` returns `floor` alias in GET /rooms**
  - In `services/room-inventory/src/routes/rooms.ts`:
    - Map `allRooms` to include `floor: r.floorId ? r.floorId.replace(/^fl-/, '') : r.roomNumber.charAt(0)`.

- [ ] **Step 2.5: Verify test passes & commit**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/RoomMatrixGridFloors.test.ts`
  Git commit: `feat(front-desk): restore floor section dividers and format room card checkout dates`

---

### Task 3: Global Toast Notification System
**Files:**
- `apps/web/src/context/ToastContext.tsx` (new)
- `apps/web/src/components/common/ToastContainer.tsx` (new)
- `apps/web/src/App.tsx`
- `apps/web/src/__tests__/ToastSystem.test.ts` (new)

- [ ] **Step 3.1: Write failing test for Toast System**
  Create `apps/web/src/__tests__/ToastSystem.test.ts` testing:
  - `useToast()` provides `showSuccess`, `showError`, `showWarning`, `showInfo`.
  - Toast displays title, description, and correct Lucide icon.
  - Auto-dismisses after duration.

- [ ] **Step 3.2: Run test to confirm failure**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/ToastSystem.test.ts`

- [ ] **Step 3.3: Implement `ToastContext.tsx` and `ToastContainer.tsx`**
  - Modern Swiss design styling (fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none).
  - Cards: `pointer-events-auto bg-white/95 backdrop-blur-sm border shadow-lg rounded-xl p-3.5 min-w-[320px] max-w-md animate-in slide-in-from-top-2 duration-200`.
  - Types:
    - Success: `emerald-500` icon `CheckCircle2`, border `emerald-200/80`
    - Error: `rose-500` icon `AlertCircle`, border `rose-200/80`
    - Warning: `amber-500` icon `AlertTriangle`, border `amber-200/80`
    - Info: `sky-500` icon `Info`, border `sky-200/80`
  - Wrap `App.tsx` with `<ToastProvider>`.

- [ ] **Step 3.4: Verify test passes & commit**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/ToastSystem.test.ts`
  Git commit: `feat(common): implement global Swiss toast notification system`

---

### Task 4: Extend Stay State Synchronization & DatePicker Smart Bounds
**Files:**
- `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- `apps/web/src/components/front-desk/ExtendStayModal.tsx`
- `apps/web/src/components/common/CustomDatePicker.tsx`
- `services/reservation/src/routes/reservations.ts`
- `apps/web/src/__tests__/ExtendStaySync.test.ts` (new)

- [ ] **Step 4.1: Write failing test for Extend Stay and Popover bounds**
  Create `apps/web/src/__tests__/ExtendStaySync.test.ts` testing:
  - `ExtendStayModal` invokes `onSuccess(updatedRes)` when API succeeds.
  - `RoomDetailsModal` updates its displayed checkout date and re-renders room status upon extension.
  - `CustomDatePicker` computes smart upward placement (`bottom-full mb-1.5`) when container bottom clearance is < 300px.

- [ ] **Step 4.2: Run test to confirm failure**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/ExtendStaySync.test.ts`

- [ ] **Step 4.3: Implement state updates in `RoomDetailsModal.tsx` and `ExtendStayModal.tsx`**
  - In `ExtendStayModal.tsx`:
    - Call `toast.showSuccess(t('extend.successTitle'), t('extend.successDesc'))`.
    - Pass `res.data` to `onSuccess(res.data)`.
  - In `RoomDetailsModal.tsx`:
    - Pass `onSuccess={(updatedRes) => { setCurrentReservation(updatedRes); onAction?.('refresh', room); }}`.
  - In `services/reservation/src/routes/reservations.ts`:
    - In `handleExtendStay`: allow extensions for `status IN ('checked_in', 'extended', 'confirmed')`.

- [ ] **Step 4.4: Improve `CustomDatePicker.tsx` smart bounds**
  - In `computePlacement`: account for modal element bounding rectangle so popover opens above if space below is limited.

- [ ] **Step 4.5: Verify test passes & commit**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/ExtendStaySync.test.ts`
  Git commit: `feat(front-desk): synchronize extend stay state and enhance datepicker popover placement`

---

### Task 5: One-Click Auto-Settle Checkout & Cashier Active Folio Auto-Creation (User Decision A1 & A1)
**Files:**
- `apps/web/src/components/front-desk/CheckOutModal.tsx`
- `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- `services/billing/src/routes/bills.ts`
- `apps/web/src/__tests__/SeamlessCheckoutBilling.test.ts` (new)

- [ ] **Step 5.1: Write failing test for One-Click Auto-Settle & Auto-Create Folio**
  Create `apps/web/src/__tests__/SeamlessCheckoutBilling.test.ts` verifying:
  - Confirming checkout automatically settles bill in `@keystay/billing` with status `'paid'`.
  - If `netDue === 0`, payment is marked completed without 400 error.
  - Daily Operations billing history tab immediately includes settled bill with emerald `'ชำระแล้ว'` badge.
  - Navigating to Cashier page for an in-house room without an existing bill auto-creates an active folio on the fly.

- [ ] **Step 5.2: Run test to confirm failure**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/SeamlessCheckoutBilling.test.ts`

- [ ] **Step 5.3: Update `POST /bills/:id/pay` in `services/billing` for zero/positive dues**
  - In `services/billing/src/routes/bills.ts`:
    - If `netPayable === 0` (or `paymentAmount === 0` because deposit covers total): update bill status to `'paid'` and return success instead of 400 `INVALID_AMOUNT`.
    - Support paymentMethod case-insensitively (`CARD`, `CASH`, `PROMPTPAY`, `TRANSFER`).

- [ ] **Step 5.4: Implement One-Click Auto-Settle in `CheckOutModal.tsx` & `DailyOperationsPage.tsx`**
  - In `CheckOutModal.tsx`:
    - Ensure bill creation and `/pay` run reliably.
    - Close modal immediately upon completion.
    - Trigger `toast.showSuccess(t('checkout.successTitle'), t('checkout.successDesc'))`.
    - Trigger `onSuccess?.()`.
  - In `DailyOperationsPage.tsx`:
    - `handleCheckoutSuccess`: `Promise.all([refreshReservations(), refreshRooms(), refreshBilling()])`.
    - In billing history table: ensure `isPaid = b.status === 'paid'` displays emerald badge `'ชำระแล้ว'` with full 80mm receipt capability.

- [ ] **Step 5.5: Implement Auto-Create Active Folio in `CashierFolioPage.tsx`**
  - When navigating with `action === 'add-charge'` or `roomId` / `reservationId`:
    - If matching bill is not found in `bills`, call `POST /api/bills` to create an active bill for that room/guest, then load and select it immediately.

- [ ] **Step 5.6: Verify test passes & commit**
  Run: `pnpm --filter @keystay/web test apps/web/src/__tests__/SeamlessCheckoutBilling.test.ts`
  Git commit: `feat(front-desk): implement one-click checkout auto-settle and cashier active folio auto-creation`

---

### Task 6: Verification, Typecheck & Playwright Visual Testing
**Files:**
- `scripts/verify-frontdesk-visuals.mjs`
- Screenshots in `preview-responsive/`

- [ ] **Step 6.1: Run backend Mocha test suite**
  Run: `pnpm test` (verify all 162 backend tests pass across all microservices).

- [ ] **Step 6.2: Run frontend web test suite**
  Run: `pnpm test:web` (verify all 221+ web tests pass).

- [ ] **Step 6.3: Run monorepo typecheck**
  Run: `pnpm typecheck` (verify all 11 packages pass with 0 errors).

- [ ] **Step 6.4: Execute Playwright Visual Verification script**
  Run: `node scripts/verify-frontdesk-visuals.mjs`
  Verify that the generated screenshots demonstrate:
  - Floor section dividers with badges (`ชั้น 1 (4 ห้อง)`, `ชั้น 2 (4 ห้อง)`).
  - Room 101 displaying `ติดจอง` with guest name.
  - Room 102 displaying `รอทำความสะอาด` after checkout.
  - Daily Operations showing paid bill in billing history.

- [ ] **Step 6.5: Commit final verification artifacts**
  Git commit: `chore(test): verify all frontdesk resilience and billing integration fixes`


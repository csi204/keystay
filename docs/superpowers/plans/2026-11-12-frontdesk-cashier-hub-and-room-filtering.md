# Front Desk Cashier Hub, Ghost Room Elimination & Smart Availability Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate ghost rooms (103, 302, 402), fix `status.extended` localization, add editable room notes in RoomDetailsModal, build a Portal-based datepicker that never clips, implement smart date-range room availability filtering in modals, and transform Cashier into a first-class Master-Detail Hub with pending active folios and primary sidebar navigation.

**Architecture:**
1. **Strict PMS State Integrity (Ghost Room Elimination):** Reconcile orphan occupied rooms: any room with status `occupied` in DB that has no active reservation (`checked_in` or `extended`) is reconciled to `available` (`ว่างพร้อมใช้`). Update D1 seed records for 103, 302, 402.
2. **Editable Room Notes & Status Localization:** Add inline quick edit for room notes in `RoomDetailsModal` with `PATCH /api/rooms/:id/notes`. Add missing `'status.extended'` in Thai and English dictionaries.
3. **Portal-Based DatePicker & Native Arrow Hiding:** Migrate `CustomDatePicker` popover to React `createPortal(popover, document.body)` with floating bounds calculation so it is never clipped by modal scroll containers. Apply `appearance-none` to hide native select and number arrows.
4. **Smart Date-Range Room Availability:** Implement `getAvailableRoomsForDates` to filter out rooms with overlapping reservations or non-operational status, preventing double bookings.
5. **Integrated Cashier Hub (Master-Detail):** Add "แคชเชียร์และบิล" to primary sidebar navigation. Redesign `CashierFolioPage` into a Master-Detail view (searchable bills list on left, folio details on right). Ensure newly created active folios start with status `pending` (`รอชำระ`) with the real guest name.

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
1. **Ghost Room Cleared:** Verifying rooms 103, 302, 402 are properly marked `available` and have no fake occupied status.
2. **DatePicker Never Clipped:** Verifying calendar popover mounts via React Portal at `document.body` level and remains fully visible.
3. **Room Dropdown Filtered:** Verifying that selecting dates in Walk-In and New Booking modals only presents rooms genuinely available for those dates.
4. **Cashier Folio Pending Status:** Verifying that creating an active folio for an in-house guest starts in `pending` (`รอชำระ`) with real guest name, never pre-settled as `paid`.
5. **Sidebar Navigation & Master-Detail:** Verifying the new sidebar item navigates smoothly to Cashier Hub with searchable left panel.

---

## Tasks

### Task 1: Eliminate Ghost Rooms & Enforce Strict PMS State Integrity & Prevention
**Files:**
- `apps/web/src/lib/roomStatusReconciliation.ts`
- `services/room-inventory/src/routes/rooms.ts`
- `scripts/seeds/02_room.sql`
- `apps/web/src/__tests__/GhostRoomElimination.test.ts` (new)

- [ ] **Step 1.1: Write failing test for orphan occupied room reconciliation and prevention**
  Create `apps/web/src/__tests__/GhostRoomElimination.test.ts` testing:
  - If a room has status `'occupied'` in DB but no active reservation (`checked_in` or `extended`) exists in reservations, `reconcileLiveRooms` automatically reconciles it to `'available'`.
  - Rooms 103, 302, 402 without reservations are displayed as `available` (`ว่างพร้อมใช้`).
  - Rooms with real checked-in reservations remain `occupied`.
  - Prevention: Verify that any attempt to manually assign `occupied` status in `services/room-inventory` requires a verified reservation context, preventing orphan occupancy creation in the future.

- [ ] **Step 1.2: Run test to confirm failure**
  Run: `node --import tsx --test apps/web/src/__tests__/GhostRoomElimination.test.ts`

- [ ] **Step 1.3: Update `reconcileLiveRooms` in `roomStatusReconciliation.ts`**
  - In `apps/web/src/lib/roomStatusReconciliation.ts`:
    - Strict PMS Invariant: If `room.status === 'occupied'` and `!activeCheckedInByRoomId.has(room.id)`:
      - Automatically auto-heal and set `room.status = 'available' as const`.
  - In `scripts/seeds/02_room.sql`:
    - Permanently fix seed definitions of `rm-103`, `rm-302`, and `rm-402` to `'available'`.
  - In `services/room-inventory/src/routes/rooms.ts`:
    - Add status update validation guard: changing room status to `'occupied'` directly via PUT/PATCH is rejected unless triggered by authenticated webhook or valid reservation ID, ensuring ghost rooms can never be accidentally introduced.

- [ ] **Step 1.4: Update Miniflare D1 SQLite database for rooms 103, 302, 402**
  - Run SQL update on `services/room-inventory/.wrangler/state/v3/d1/...` to set status of `rm-103`, `rm-302`, `rm-402` to `available`.

- [ ] **Step 1.5: Verify test passes & commit**
  Run: `node --import tsx --test apps/web/src/__tests__/GhostRoomElimination.test.ts`
  Git commit: `feat(front-desk): eliminate ghost occupied rooms and enforce PMS integrity`

---

### Task 2: Fix `status.extended` Localization & Editable Room Notes
**Files:**
- `apps/web/src/locales/th.ts`, `apps/web/src/locales/en.ts`
- `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- `services/room-inventory/src/routes/rooms.ts`
- `apps/web/src/__tests__/RoomNotesAndLocalization.test.ts` (new)

- [ ] **Step 2.1: Write failing test for status.extended and editable notes**
  Create `apps/web/src/__tests__/RoomNotesAndLocalization.test.ts` verifying:
  - `status.extended` localized string exists in `th.ts` ('ขยายเวลาพัก') and `en.ts` ('Extended').
  - `RoomDetailsModal` renders an edit button (pencil icon) for room notes.
  - Editing notes allows typing and saving, updating room notes state and triggering toast.

- [ ] **Step 2.2: Run test to confirm failure**
  Run: `node --import tsx --test apps/web/src/__tests__/RoomNotesAndLocalization.test.ts`

- [ ] **Step 2.3: Add `status.extended` to i18n dictionaries**
  - In `apps/web/src/locales/th.ts`: add `'status.extended': 'ขยายเวลาพัก'`.
  - In `apps/web/src/locales/en.ts`: add `'status.extended': 'Extended'`.

- [ ] **Step 2.4: Implement inline editable room notes in `RoomDetailsModal.tsx`**
  - Add `isEditingNotes`, `editedNotes`, `isSavingNotes` states.
  - When clicking edit button (Pencil icon): toggle into edit mode with textarea, "บันทึก" and "ยกเลิก" buttons.
  - On save: call `PATCH /api/rooms/:id` (or `PUT /api/rooms/:id`) updating `notes`.
  - On success: update local `room.notes`, show success toast, exit edit mode.
  - Ensure backend `services/room-inventory/src/routes/rooms.ts` supports updating `notes`.

- [ ] **Step 2.5: Verify test passes & commit**
  Run: `node --import tsx --test apps/web/src/__tests__/RoomNotesAndLocalization.test.ts`
  Git commit: `feat(front-desk): add status.extended localization and editable room notes`

---

### Task 3: Portal-Based DatePicker Floating Placement & Clean Arrow Hiding
**Files:**
- `apps/web/src/components/common/CustomDatePicker.tsx`
- `apps/web/src/components/front-desk/NewBookingModal.tsx`
- `apps/web/src/components/front-desk/WalkInModal.tsx`
- `apps/web/src/__tests__/PortalDatePicker.test.ts` (new)

- [x] **Step 3.1: Write failing test for Portal DatePicker and arrow hiding**
  Create `apps/web/src/__tests__/PortalDatePicker.test.ts` verifying:
  - `CustomDatePicker` renders popover inside React Portal (`document.body`).
  - Popover coordinates calculate fixed positioning based on trigger element rect.
  - Popover is never clipped by parent dialog containers.
  - Select inputs and number inputs have native arrow suppression classes.

- [x] **Step 3.2: Run test to confirm failure**
  Run: `node --import tsx --test apps/web/src/__tests__/PortalDatePicker.test.ts`

- [x] **Step 3.3: Refactor `CustomDatePicker.tsx` to use React Portal**
  - Use `createPortal(popoverElement, document.body)`.
  - Compute fixed coordinates:
    - Get trigger bounding rect: `rect = triggerRef.current.getBoundingClientRect()`.
    - If `placement === 'top'` or clearance below is < 320px: position above (`top: rect.top - popoverHeight - 8`).
    - Otherwise position below (`top: rect.bottom + 8`).
    - Left position: `Math.max(16, Math.min(rect.left, window.innerWidth - popoverWidth - 16))`.
  - Reposition on window resize or scroll.

- [x] **Step 3.4: Hide native dropdown & spin arrows across front-desk modals**
  - In `WalkInModal.tsx`, `NewBookingModal.tsx`, `DailyOperationsPage.tsx`:
    - Apply `appearance-none` to `<select>` elements and add clean custom ChevronDown icons where needed.
    - Apply `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none` to number inputs.

- [x] **Step 3.5: Verify test passes & commit**
  Run: `node --import tsx --test apps/web/src/__tests__/PortalDatePicker.test.ts`
  Git commit: `feat(common): implement portal-based datepicker and clean select arrow styling`

---

### Task 4: Smart Date-Range Room Availability Filtering & Overbooking Guard
**Files:**
- `apps/web/src/lib/roomAvailability.ts` (new)
- `apps/web/src/components/front-desk/WalkInModal.tsx`
- `apps/web/src/components/front-desk/NewBookingModal.tsx`
- `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- `apps/web/src/__tests__/RoomAvailabilityFilter.test.ts` (new)

- [ ] **Step 4.1: Write failing test for date-range room availability**
  Create `apps/web/src/__tests__/RoomAvailabilityFilter.test.ts` verifying:
  - `getAvailableRoomsForDates(rooms, reservations, checkIn, checkOut)` excludes rooms with overlapping active reservations (`confirmed`, `checked_in`, `extended`).
  - Excludes rooms in `maintenance` or `out_of_order`.
  - Excludes same-day walk-in for rooms currently `cleaning`.
  - Returns only genuinely available rooms.

- [ ] **Step 4.2: Run test to confirm failure**
  Run: `node --import tsx --test apps/web/src/__tests__/RoomAvailabilityFilter.test.ts`

- [ ] **Step 4.3: Create `apps/web/src/lib/roomAvailability.ts`**
  - Implement `getAvailableRoomsForDates`:
    ```typescript
    export function getAvailableRoomsForDates(
      rooms: Room[],
      reservations: Reservation[],
      checkInDate: string,
      checkOutDate: string,
      isWalkInToday: boolean = false
    ): Room[]
    ```
    - Checks overlap: `r.checkInDate < checkOutDate && r.checkOutDate > checkInDate`.
    - Filters out booked/occupied rooms.

- [ ] **Step 4.4: Integrate into `WalkInModal.tsx`, `NewBookingModal.tsx`, and `DailyOperationsPage.tsx`**
  - Dynamic room options: as the user changes checkInDate or checkOutDate, the room selection dropdown re-evaluates `availableRoomsForDates`.
  - If the currently selected room is not available for new dates, automatically select the first available room or prompt user.
  - If 0 rooms are available: display clear notice `<p className="text-amber-600 text-xs mt-1">ไม่มีห้องว่างในช่วงวันที่เลือก</p>` and disable confirmation.

- [ ] **Step 4.5: Verify test passes & commit**
  Run: `node --import tsx --test apps/web/src/__tests__/RoomAvailabilityFilter.test.ts`
  Git commit: `feat(front-desk): implement smart date-range room availability filtering`

---

### Task 5: Integrated Cashier Hub (Master-Detail, Pending Active Folio & Sidebar Navigation)
**Files:**
- `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- `services/billing/src/routes/bills.ts`
- `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- `apps/web/src/__tests__/CashierHubMasterDetail.test.ts` (new)

- [ ] **Step 5.1: Write failing test for Cashier Hub & pending active folio**
  Create `apps/web/src/__tests__/CashierHubMasterDetail.test.ts` verifying:
  - `FrontDeskLayout` contains primary navigation item for "แคชเชียร์และบิล" (`/front-desk/billing`).
  - New active folio created for an in-house room starts in status `'pending'` (`รอชำระ`), not `'paid'`.
  - Cashier page passes real guest name (not fallback `'Guest'`).
  - Cashier page features Master-Detail layout with searchable bills list on the left and folio details on the right.
  - Auto-refresh badge is unified with pulse indicator.

- [ ] **Step 5.2: Run test to confirm failure**
  Run: `node --import tsx --test apps/web/src/__tests__/CashierHubMasterDetail.test.ts`

- [ ] **Step 5.3: Add Cashier & Folios to primary sidebar navigation**
  - In `FrontDeskLayout.tsx`:
    - Add item: `{ title: t('nav.billing') || 'แคชเชียร์และบิล', path: '/front-desk/billing', key: 'billing', icon: ReceiptText }`.
    - Ensure active state highlights properly.

- [ ] **Step 5.4: Ensure newly created active folios start with status `pending`**
  - In `services/billing/src/routes/bills.ts`:
    - In `POST /bills`: when creating a bill with 0 items, set `status = 'pending'`, ensuring it is never auto-closed as paid.
  - In `RoomMatrixPage.tsx`:
    - When navigating to `/front-desk/billing`, pass exact guest name: `guestName: roomRes?.guestName || roomGuests[room.id]`.

- [ ] **Step 5.5: Redesign `CashierFolioPage.tsx` to Swiss Master-Detail Layout**
  - Left Panel (Master):
    - Search input for room number, guest name, bill number.
    - Filter tabs: `ทั้งหมด`, `เปิดบิลอยู่ / กำลังพัก (Pending)`, `ชำระแล้ว (Paid)`.
    - Clean bill cards with room badge, guest name, total amount, status pill.
  - Right Panel (Detail):
    - Detailed folio items, Add Charge button, Request Amenities, and Payment Settlement.
  - Top header:
    - Replace manual refresh button with `[Pulse dot] อัปเดตอัตโนมัติ: HH:mm:ss`.

- [ ] **Step 5.6: Streamline Daily Operations "รอเช็คเอาท์ & คิดเงิน"**
  - In `DailyOperationsPage.tsx`:
    - In departures table actions: add "เปิดหน้าแคชเชียร์ Folio" button alongside "เช็คเอาท์ด่วน".

- [ ] **Step 5.7: Verify test passes & commit**
  Run: `node --import tsx --test apps/web/src/__tests__/CashierHubMasterDetail.test.ts`
  Git commit: `feat(front-desk): build integrated master-detail cashier hub and pending active folios`

---

### Task 6: Verification, Monorepo Typecheck & Playwright Visual Testing
**Files:**
- `scripts/verify-frontdesk-visuals.mjs`
- Screenshots in `preview-responsive/`

- [ ] **Step 6.1: Run backend Mocha test suite**
  Run: `pnpm test` (verify all 163 backend tests pass).

- [ ] **Step 6.2: Run frontend web test suite**
  Run: `pnpm test:web` (verify all 255+ web tests pass).

- [ ] **Step 6.3: Run monorepo typecheck**
  Run: `pnpm typecheck` (verify all 11 packages pass with 0 errors).

- [ ] **Step 6.4: Execute Playwright Visual Verification script**
  Update and run `scripts/verify-frontdesk-visuals.mjs`.
  Capture and verify:
  - `01-room-matrix-no-ghost-rooms.png`: Rooms 103, 302, 402 shown as `ว่างพร้อมใช้` (no ghost occupied rooms).
  - `02-cashier-hub-master-detail.png`: Master-detail Cashier Hub with sidebar navigation and pending status.
  - `03-portal-datepicker-no-clip.png`: Portal DatePicker floating cleanly above modal without clipping.
  - `04-room-notes-inline-edit.png`: Editable room notes in RoomDetailsModal.

- [ ] **Step 6.5: Commit final verification artifacts**
  Git commit: `chore(test): verify cashier hub, ghost room elimination, and portal datepicker`


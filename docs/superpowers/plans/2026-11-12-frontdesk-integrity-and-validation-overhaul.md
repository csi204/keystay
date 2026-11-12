# Front Desk Integrity, Validation Guardrails & Cashier Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Front Desk, Walk-In Check-In, Room Availability Filter, Input Validation Masks, Cashier Hub Folio Synchronization, and Guardrails to eliminate ghost names, human error, date anomalies, and UI defects.

**Architecture:** 
1. Backend & Seed Integrity: Normalize guest name parsing in `services/reservation` (no `'Customer'` suffix) and update mock reservation dates to current/future dates.
2. Robust Filtering & Availability: Enhance `roomAvailability.ts` with strict physical and active reservation blocking.
3. Common Input Masks & Guardrails: Build `MaskedInputs.tsx` (Phone `xxx-xxx-xxxx`, Thai National ID `x-xxxx-xxxxx-xx-x`, Passport `AA1234567`) and `ActionConfirmModal.tsx` for settlement, checkin/checkout, and item deletion.
4. Operational Routing & Sub-Tabs: Split Daily Operations departures into "Due Today" and "Early Checkout / Extended", and auto-route room matrix checkout clicks.
5. Cashier Integrity & Lucide Icons: Lock room charges, dynamically bind actual reservation deposits, display net total due, eliminate all raw emojis, and standardize Thai spelling to "เช็คเอาต์".

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Cloudflare Workers / D1 (Hono), Mocha / Node Test Runner.

**Spec:** [frontdesk-integrity-and-validation-overhaul-plan.md](file:///C:/Users/Miller-Wise/.gemini/antigravity/brain/ce602030-c088-44a0-bc3d-eb1e96aba320/frontdesk-integrity-and-validation-overhaul-plan.md)

## Global Constraints
- Zero raw emojis in rendered HTML/React code — use Lucide React icons (`Lock`, `Zap`, `Check`, `AlertCircle`, etc.).
- Standardize Thai spelling: use "เช็คเอาต์" (ต.เต่า การันต์) everywhere instead of "เช็คเอาท์" or "เช็คเอาท?".
- Display Net Total Due (ยอดที่ต้องชำระสุทธิ) after deposit deduction prominently.
- Never append `'Customer'` or `'Guest'` to single guest names.
- Touch target minimum: `min-h-[44px]` for all interactive controls.
- Font family: `font-mono tabular-nums` for all currency amounts, numbers, phone, IDs, and dates.

## Review Focus
1. Phone input allows letters or >10 digits -> Must reject non-digits and cap strictly at 10 digits formatted as `xxx-xxx-xxxx`.
2. Thai ID allows >13 digits or malformed structure -> Must auto-format as `x-xxxx-xxxxx-xx-x` with max 13 digits.
3. Room 102 (or any occupied room) appears in walk-in/new booking dropdown for today -> Must be strictly filtered out by `isRoomAvailable`.
4. Deleting room charge from bill removes main accommodation fee -> Must be locked with Lucide `Lock` icon and non-deletable.
5. In-house guest with extended stay wants early checkout -> Must be visible and actionable under the new "เช็คเอาต์ก่อนกำหนด / ขยายเวลา" sub-tab.

---

### Task 1: Seed Dates & Reservation Guest Name Fix (Backend & Seed Alignment)

**Files:**
- Modify: `services/reservation/src/routes/reservations.ts:358-365,663-670`
- Modify: `scripts/seeds/03_reservation.sql`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx:270-285`
- Test: `services/reservation/test/reservation-name-parsing.test.ts`

- [x] **Step 1.1: Write unit test for guest name parsing in reservation service**
  - Ensure single name `"อัศวิน"` results in `firstName: 'อัศวิน'`, `lastName: ''`, `fullName: 'อัศวิน'`.
- [x] **Step 1.2: Update `services/reservation/src/routes/reservations.ts`**
  - In `POST /walk-in` and `POST /reservations`:
    ```ts
    const nameParts = (data.guestName || '').trim().split(/\s+/);
    const firstName = data.firstName || nameParts[0] || 'Guest';
    const lastName = data.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
    const guestFullName = `${firstName} ${lastName}`.trim();
    ```
- [x] **Step 1.3: Update seed reservations in `scripts/seeds/03_reservation.sql`**
  - Update old September 2026 check-in/out dates to current date `2026-11-12` and future dates (`2026-11-13` - `2026-11-18`), matching realistic live PMS testing.
  - Re-execute local D1 seed: `pnpm dlx wrangler d1 execute db_reservation --local --config=services/reservation/wrangler.jsonc --file=scripts/seeds/03_reservation.sql --yes`.
- [x] **Step 1.4: Forward `bookingSource` in `RoomMatrixPage.tsx`**
  - Pass `bookingSource: data.bookingSource` in `handleFastBookingSubmit` to ensure selected channel is saved.
- [x] **Step 1.5: Run tests and commit**
  - Run `pnpm test` to verify all reservation tests pass.
  - Commit: `git commit -m "fix(reservation): eliminate Customer suffix, align mock dates to current timeline, and pass bookingSource"`.

---

### Task 2: Robust Room Availability Filtering & Active Occupancy Protection

**Files:**
- Modify: `apps/web/src/lib/roomAvailability.ts`
- Create: `apps/web/src/lib/__tests__/roomAvailabilityStrict.test.ts`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx:73-78`
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx:82-90`

- [x] **Step 2.1: Write unit tests in `roomAvailabilityStrict.test.ts`**
  - Test that room with physical status `occupied`, `reserved`, `cleaning`, `maintenance`, `out_of_order` is rejected for today.
  - Test that room with active reservation `checked_in` or `extended` is strictly rejected for today even if checkOutDate is in the past.
- [x] **Step 2.2: Update `apps/web/src/lib/roomAvailability.ts`**
  - Enhance `isRoomAvailable`:
    ```ts
    // Strict Active Occupancy Guard
    const hasActiveOccupant = reservations.some(
      (r) =>
        (r.roomId === room.id || (room.roomNumber && r.roomNumber === room.roomNumber)) &&
        (r.status === 'checked_in' || r.status === 'extended') &&
        (!excludeReservationId || r.id !== excludeReservationId)
    );
    if (hasActiveOccupant && targetIn <= todayIsoString) {
      return false;
    }
    // Physical room status guard for same-day
    if (targetIn <= todayIsoString) {
      if (['occupied', 'reserved', 'cleaning', 'maintenance', 'out_of_order'].includes(room.status)) {
        return false;
      }
    }
    ```
- [x] **Step 2.3: Verify in `DailyOperationsPage.tsx` and `NewBookingModal.tsx`**
  - Ensure `availableRoomsForDates` uses enhanced `isRoomAvailable` so occupied rooms (e.g. 102, 101) never appear for today's walk-in or new booking.
- [x] **Step 2.4: Run tests and commit**
  - Run `npm run test:web`.
  - Commit: `git commit -m "feat(front-desk): enforce strict active occupancy and same-day status in room availability filter"`.

---

### Task 3: Masked Inputs Component & Strict Validation Formats

**Files:**
- Create: `apps/web/src/components/common/MaskedInputs.tsx`
- Create: `apps/web/src/components/common/__tests__/MaskedInputs.test.ts`
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx`
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`

- [ ] **Step 3.1: Write tests for formatting utilities in `MaskedInputs.test.ts`**
  - Test phone number formatting: `0812345678` -> `081-234-5678`, capped at 10 digits.
  - Test Thai ID formatting: `1234567890123` -> `1-2345-67890-12-3`, capped at 13 digits.
  - Test Passport formatting: `ac1234567` -> `AC1234567`, uppercase 2 letters + 7 digits.
- [ ] **Step 3.2: Create `apps/web/src/components/common/MaskedInputs.tsx`**
  - Implement `PhoneInput`:
    - Auto-formats on type (`xxx-xxx-xxxx`).
    - Strips non-digits, maxLength 10 digits (12 chars with dashes).
    - Uses `font-mono tabular-nums`.
  - Implement `NationalIdOrPassportInput`:
    - Segmented toggle: "บัตรประชาชน (Thai ID)" / "พาสปอร์ต (Passport)".
    - Thai ID: `x-xxxx-xxxxx-xx-x` (13 digits max).
    - Passport: 2 letters + 7 numbers (9 chars max, auto uppercase).
    - Required field with clear visual indicator.
- [ ] **Step 3.3: Integrate into `WalkInModal.tsx`, `NewBookingModal.tsx`, `RoomDetailsModal.tsx`**
  - Replace raw inputs with `PhoneInput` and `NationalIdOrPassportInput`.
  - Add optional Email input `(ไม่บังคับ)` to all modals for consistency.
  - Limit guest count selector `guestsCount` dynamically: `max = roomType?.capacity || 2`.
- [ ] **Step 3.4: Run tests and commit**
  - Run `npm run test:web`.
  - Commit: `git commit -m "feat(ui): add reusable masked phone, thai id, and passport inputs with capacity validation"`.

---

### Task 4: Walk-In Check-In vs New Booking Split & Checkout Operational Routing

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`

- [ ] **Step 4.1: Separate Walk-In and New Booking in `RoomDetailsModal.tsx`**
  - "เปิดห้องด่วน (Walk-In)":
    - If check-in date is TODAY: calls `walkInCheckIn` directly (`POST /api/reservations/walk-in`), immediately checks in guest, status becomes `checked_in`, room becomes `occupied`.
    - Requires National ID / Passport.
  - "สร้างการจองใหม่ห้องนี้":
    - Opens advance reservation mode (`createReservation`), status `confirmed`.
  - Replace raw emojis with Lucide React icons (`Zap`, `Calendar`, etc.).
- [ ] **Step 4.2: Update Checkout Action in `RoomDetailsModal.tsx` and `RoomMatrixPage.tsx`**
  - When clicking "เช็คเอาต์": navigate to `/front-desk/daily-operations` with `state: { roomId: room.id, action: 'checkout' }`.
- [ ] **Step 4.3: Split Departures into 2 Sub-Tabs in `DailyOperationsPage.tsx`**
  - In `tab === 'departures'`:
    - Sub-tab 1: **"รอเช็คเอาต์วันนี้"** (`departuresDueToday`: `status === 'checked_in' && checkOutDate <= todayStr`).
    - Sub-tab 2: **"เช็คเอาต์ก่อนกำหนด / ขยายเวลา"** (`allActiveInHouse`: all remaining `checked_in` and `extended` rooms).
  - Handle incoming `location.state.roomId`: auto-select room and trigger `CheckOutModal` smoothly.
- [ ] **Step 4.4: Run tests and commit**
  - Run `npm run test:web`.
  - Commit: `git commit -m "feat(front-desk): split walk-in instant check-in, route checkout to daily operations, and add early-checkout subtab"`.

---

### Task 5: Cashier Folio Resilience, Room Charge Lock & Deposit Parity

**Files:**
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Modify: `apps/web/src/lib/folioCategory.ts`
- Create: `apps/web/src/components/common/ActionConfirmModal.tsx`

- [ ] **Step 5.1: Create `ActionConfirmModal.tsx`**
  - Generic accessible confirmation modal with title, description, summary details (room, guest, net amount), danger/primary style, and confirm/cancel buttons.
  - Zero raw emojis: use Lucide icons (`AlertCircle`, `CheckCircle2`, `Lock`).
- [ ] **Step 5.2: Fix deposit binding in `CashierFolioPage.tsx`**
  - Pass dynamic `depositAmount`:
    ```ts
    const matchingRes = reservations.find(r => r.roomId === selectedBill.roomId || (selectedBill.roomNumber && r.roomNumber === selectedBill.roomNumber));
    depositAmount={String(matchingRes?.depositAmount ?? selectedBill.depositDeducted ?? 500)}
    ```
  - Display Net Total Due (ยอดที่ต้องชำระสุทธิ) prominently on Master bill cards.
- [ ] **Step 5.3: Update `FolioSplitScreen.tsx` and `folioCategory.ts`**
  - Add `whitespace-nowrap` to `FolioCategoryBadge` so "ค่าห้องพัก" never wraps.
  - Localize room charge description in Thai (e.g. `ค่าห้องพัก ${typeName} (${nights} คืน)`).
  - Lock Room Charge (`category === 'room'`): show Lucide `Lock` icon (`w-3.5 h-3.5 text-slate-400`), disable deletion.
  - Attach `ActionConfirmModal` when clicking delete on extra items (minibar, laundry, services).
  - Attach `ActionConfirmModal` before confirming settlement payment.
- [ ] **Step 5.4: Run tests and commit**
  - Run `npm run test:web`.
  - Commit: `git commit -m "feat(cashier): lock room charges, bind dynamic deposit amount, show net total due, and add confirm dialogs"`.

---

### Task 6: Standardize Thai Spelling of "เช็คเอาต์" & Zero-Emoji Audit

**Files:**
- Modify: `apps/web/src/lib/i18n.tsx`
- Modify: `apps/web/src/locales/th.ts`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/CheckOutModal.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- Modify: `apps/web/src/components/front-desk/ExtendStayModal.tsx`

- [ ] **Step 6.1: Global search and replace "เช็คเอาท์" / "เช็คเอาท?"**
  - Replace all occurrences with "เช็คเอาต์" (ต.เต่า การันต์) across all UI strings, labels, and translations.
- [ ] **Step 6.2: Zero-Emoji Audit**
  - Check all components for raw emojis (`🔒`, `⚡`, `🗓️`, `✏️`, `⚠️`, `✅`) and replace with standard Lucide React icons.
- [ ] **Step 6.3: Add Confirmation to Check-In Modal**
  - Add confirmation before executing check-in in `CheckInModal.tsx`.
- [ ] **Step 6.4: Run tests and commit**
  - Run `npm run test:web`.
  - Commit: `git commit -m "fix(i18n): standardize checkout spelling to เช็คเอาต์ and ensure zero raw emojis in UI"`.

---

### Task 7: Monorepo Verification & Visual Demonstration

**Files:**
- Run test suites and capture screenshots.

- [ ] **Step 7.1: Run Mocha Backend Suite**
  - Command: `pnpm test` (all 211 tests must pass).
- [ ] **Step 7.2: Run Web Test Suite**
  - Command: `npm run test:web` (all 315+ web tests must pass).
- [ ] **Step 7.3: Monorepo Typecheck**
  - Command: `pnpm dlx turbo run typecheck` (11 packages 0 errors).
- [ ] **Step 7.4: Visual Proof & Screenshots**
  - Capture screenshots verifying:
    1. Phone & Thai ID masked formatting.
    2. Room 102 blocked from walk-in/new booking dropdown for today.
    3. Single name "อัศวิน" saved cleanly without "Customer".
    4. Room charge locked with Lucide `Lock` icon and non-deletable.
    5. Daily operations departures tab with 2 sub-tabs (Due Today and Early/Extended).
    6. Net total due displayed clearly and deposit matching ฿3,000.
    7. All Thai spellings standardized to "เช็คเอาต์".


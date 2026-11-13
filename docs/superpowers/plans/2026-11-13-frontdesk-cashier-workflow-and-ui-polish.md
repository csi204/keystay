# Front Desk Cashier Workflow, PMS Payment Integrity & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the KeyStay PMS front desk workflow to match international hotel standards by collecting Room Rate + Deposit upfront at check-in, making Checkout the single settlement point, supporting reservation cancellation with reason logs, redesigning the Cashier page into an expansive 2-column folio manager, fixing the Night Audit theme toggle and color contrast across modals and inputs, fixing the Daily Operations Walk-in crash, adding client-side slip image compression, and implementing deep-linking for Command Palette room searches.

**Architecture:**
- **Theme & Contrast:** Standardize `ThemeContext` imports to eliminate module aliasing bugs in Vite. Define complete dark mode CSS custom properties in `globals.css` and enforce crisp contrast tokens (`text-slate-900 dark:text-slate-100`, `bg-white dark:bg-slate-800`, `border-slate-300 dark:border-slate-600`) across all inputs, select elements, and modal titles.
- **PMS Payment Integrity:**
  - Walk-in / Check-in creates/updates a folio with full room accommodation + deposit, setting bill status to `paid` (`ชำระแล้ว`) and reservation payment status to `paid`.
  - Adding extra charges (minibar, extra amenities, stay extension) during the stay marks the bill status as `unpaid` (`รอชำระ`).
  - Checkout in `DailyOperationsPage.tsx` calculates the net balance between accumulated extra charges and the upfront deposit, settles payment / refunds deposit, marks the bill as `paid`, sets reservation to `checked_out`, and updates room status to `checked_out (รอทำความสะอาด)`.
  - Cashier page becomes a pure Folio Manager (view items, add charges/amenities, print bills/tax invoices); bill closing is delegated exclusively to Checkout.
- **Slip Compression:** Implement `compressImageToBase64` via an HTML5 canvas to resize slips to max 1000px at 0.75 quality (~80KB Base64), enabling instant storage and sharp lightbox zooming without memory bloat.
- **Cancellation with Audit Log:** Create `CancelReservationModal.tsx` prompting staff for structured reasons (No-show, Guest Request, Emergency, Other) with optional notes, updating reservation status to `cancelled`, and freeing the room to `available`.
- **Command Palette Deep Linking:** Add query parameter detection in `RoomMatrixPage.tsx` (`?roomId=...`) to auto-open `RoomDetailsModal` when selecting a room from `GlobalCommandPalette`.
- **Layout & Ergonomics:** Redesign `CashierFolioPage.tsx` from 3 tight columns into an expansive 2-column layout (35% bill selector, 65% wide line items table with bottom net summary bar). Remove `(Cashier Hub)` English subtitle. Convert room card note boxes into compact single-line chips.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS, Vite, Lucide React, HTML5 Canvas API, Vitest / Node test runner, Hono / Cloudflare D1.

**Spec:** User interview requirements via `/brainstorming` (2026-11-13):
1. Fix theme switcher so Night Audit and Light mode toggle reliably; fix faded input and label contrast across all modals and daily operations.
2. Fix Daily Operations Walk-in button crash (`roomTypes.find` null check).
3. Walk-in modal: remove booking source selector tabs (hardcode to Walk-in); keep source tabs only in advance booking.
4. Compress uploaded payment slip images before Base64 serialization so they persist and render in `SlipViewerModal`.
5. Upfront payment at Check-in (Room Fee + Deposit = Paid); adding minibar/amenities flips bill to `unpaid`; Checkout is the single point for net settlement & bill closing.
6. Support reservation cancellation with reason modal, updating status to `cancelled` and releasing room to `available`.
7. Redesign Cashier page into 2 wide columns with bottom summary and remove settlement button; remove `(Cashier Hub)` title; make room card notes compact; fix departure badge count.
8. Deep link room selections from `GlobalCommandPalette` (`Ctrl+K`) into `RoomMatrixPage`.

## Global Constraints

- Thai orthography standard: strictly use "เช็คเอาต์" (ต.เต่า การันต์); zero instances of "เช็คเอาท์".
- Zero raw Unicode emojis in code; use official Lucide React icons with `strokeWidth={1.5}` or `1.75`.
- Maintain `min-h-[44px]` touch targets for all primary buttons.
- Monetary figures must use `font-mono tabular-nums` formatting.
- All test suites must pass: `pnpm --filter @keystay/web test:run` and mocha tests.

## Review Focus

1. **Theme Toggle Context Singularity:** Clicking the Night Audit button must reliably toggle `localStorage` and `document.documentElement.classList` between `'dark'` and `'light'` without getting stuck.
2. **Safe Render on Undefined Metadata:** `WalkInModal.tsx` must never crash when `roomTypes` is empty or undefined during initial load.
3. **Folio & Reservation Synchronization:** Marking a room as checked-out must settle the bill and update reservation `paymentStatus` and `status` simultaneously with zero state divergence.
4. **Slip Image Data URL Integrity:** Compressed slip uploads must generate valid `data:image/jpeg;base64,...` strings that open cleanly in `SlipViewerModal` without breaking storage limits.
5. **Command Palette URL Cleanliness:** Selecting a room from the Command Palette must open the room details modal and cleanly clear the `roomId` search param from history when the modal is closed.

---

### Task 1: Theme Toggle & High-Contrast Typography / Input Colors Fix

**Files:**
- Modify: `apps/web/src/App.tsx:1-10`
- Modify: `apps/web/src/context/ThemeContext.tsx:1-87`
- Modify: `apps/web/src/styles/globals.css:1-67`
- Modify: `apps/web/src/components/front-desk/AddExtraChargeModal.tsx:1-120`
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx:600-640`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx:180-260`
- Test: `apps/web/src/__tests__/theme-toggle-and-contrast.test.tsx`

**Interfaces:**
- Consumes: `useTheme(): { theme, isDark, toggleTheme }`
- Produces: Reliable light/dark switching, CSS `.dark` variables in `globals.css`, and high-contrast inputs/labels across all modals.

- [x] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/theme-toggle-and-contrast.test.tsx`:
Test that:
1. `ThemeContext` canonical import in `App.tsx` and `FrontDeskLayout.tsx` points to `@/context/ThemeContext`.
2. `globals.css` defines `.dark` CSS variables (`--background: 222 47% 11%`, `--foreground: 210 40% 98%`).
3. `AddExtraChargeModal.tsx` specifies explicit text and background colors for `<select>` and `<option>` elements (`text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-800`).
4. Daily Operations page and inputs have high contrast text classes (`text-slate-900 dark:text-slate-100`).

- [x] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/theme-toggle-and-contrast.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement Theme Toggle & Contrast fixes**
- In `App.tsx`: change `import { ThemeProvider } from './context/ThemeContext';` to `import { ThemeProvider } from '@/context/ThemeContext';` to eliminate duplicate module instantiation.
- In `globals.css`: add `.dark { --background: 222 47% 6%; --foreground: 210 40% 98%; --card: 222 47% 9%; --card-foreground: 210 40% 98%; --border: 217 33% 17%; --input: 217 33% 17%; }`.
- In `AddExtraChargeModal.tsx`: add `text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600` to the category `<select>` and `<option>` tags.
- In `FrontDeskLayout.tsx`: ensure `toggleTheme` updates state and `document.documentElement` class list immediately.

- [x] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/theme-toggle-and-contrast.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add apps/web/src/App.tsx apps/web/src/context/ThemeContext.tsx apps/web/src/styles/globals.css apps/web/src/components/front-desk/AddExtraChargeModal.tsx apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/__tests__/theme-toggle-and-contrast.test.tsx
git commit -m "fix(front-desk): fix dark mode toggle singularity and enforce high-contrast input styles"
```

---

### Task 2: Walk-In Modal Crash Fix & Booking Source Simplification

**Files:**
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx:150-180, 280-320`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:600-660`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx:675-690`
- Test: `apps/web/src/__tests__/walkin-modal-safe-render.test.tsx`

**Interfaces:**
- Consumes: `roomTypes?: RoomType[]`
- Produces: Safe rendering with fallback when `roomTypes` is empty/undefined; removal of booking source selector in Walk-In modal (hardcodes `bookingSource = 'walk_in'`).

- [x] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/walkin-modal-safe-render.test.tsx`:
Test that:
1. `WalkInModal` renders without throwing when `roomTypes` is `undefined` or `[]`.
2. `WalkInModal` does NOT render booking source tabs ("โทรศัพท์เข้ามาจอง" or "เพจ Facebook").
3. Submitting walk-in sends `bookingSource: 'walk_in'`.

- [x] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/walkin-modal-safe-render.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement WalkInModal defensive guard & source cleanup**
In `WalkInModal.tsx`:
- Use `(roomTypes || []).find(...)` and fallback capacity `selectedRoomType?.capacity || 2`.
- Remove the "ช่องทางการจอง (BOOKING SOURCE)" tab buttons from the Walk-In modal JSX. Set default state `bookingSource = 'walk_in'`.
- Pass safe fallbacks in `DailyOperationsPage.tsx` and `RoomDetailsModal.tsx`.

- [x] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/walkin-modal-safe-render.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/WalkInModal.tsx apps/web/src/pages/front-desk/DailyOperationsPage.tsx apps/web/src/__tests__/walkin-modal-safe-render.test.tsx
git commit -m "fix(front-desk): prevent WalkInModal crash on undefined roomTypes and remove walkin booking source tabs"
```

---

### Task 3: Client-Side Slip Image Compression & Storage

**Files:**
- Create: `apps/web/src/lib/imageCompression.ts`
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx:100-130, 480-520`
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx:100-130, 480-520`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:120-150`
- Modify: `apps/web/src/components/front-desk/SlipViewerModal.tsx:1-80`
- Test: `apps/web/src/__tests__/slip-image-compression.test.tsx`

**Interfaces:**
- Produces: `compressImageToBase64(file: File, maxWidth?: number, quality?: number): Promise<string>`
- Consumes: Slip image files from `<input type="file" accept="image/*">`

- [x] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/slip-image-compression.test.tsx`:
Test that:
1. `compressImageToBase64` helper exists and returns a promise resolving to a Base64 Data URL (`data:image/jpeg;base64,...`).
2. `WalkInModal` and `NewBookingModal` store the compressed Data URL in `paymentSlipUrl`.
3. `SlipViewerModal` renders the Base64 image with zoom controls and fallback for missing slip.

- [x] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/slip-image-compression.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement `imageCompression.ts` and wire into modals**
Create `apps/web/src/lib/imageCompression.ts`:
- Read file as Image, draw onto HTML Canvas resizing to `maxWidth = 1000px`, export with `canvas.toDataURL('image/jpeg', 0.75)`.
- Fallback for non-browser / node environments to read as Base64 buffer.
Wire upload handler in `WalkInModal.tsx`, `NewBookingModal.tsx`, and `RoomDetailsModal.tsx`.
Update `SlipViewerModal.tsx` to display the image source seamlessly.

- [x] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/slip-image-compression.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add apps/web/src/lib/imageCompression.ts apps/web/src/components/front-desk/WalkInModal.tsx apps/web/src/components/front-desk/NewBookingModal.tsx apps/web/src/components/front-desk/SlipViewerModal.tsx apps/web/src/__tests__/slip-image-compression.test.tsx
git commit -m "feat(front-desk): implement client-side slip image compression and persistent viewer"
```

---

### Task 4: Hotel PMS Payment Architecture Overhaul (Upfront Room+Deposit & Folio Sync)

**Files:**
- Modify: `services/reservation/src/routes/reservations.ts:180-240`
- Modify: `apps/web/src/hooks/useReservations.ts:120-180`
- Modify: `apps/web/src/hooks/useBilling.ts:80-140`
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx:30-100, 580-620`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx:90-130, 480-550`
- Test: `apps/web/src/__tests__/pms-payment-workflow.test.tsx`

**Interfaces:**
- Produces:
  - Upfront Check-in calculation: Total Paid = `Room Rate * Nights + Deposit`.
  - Initial Folio status: `paid`.
  - Adding extra charge / minibar: switches Folio status to `unpaid` (`รอชำระ`).
  - Checkout in Daily Operations: settles balance (`extraCharges - deposit`), completes checkout, marks bill `paid`, and sets room to `checked_out (รอทำความสะอาด)`.
  - Departure tab badge: calculates `dueTodayDepartures.length + earlyOrExtendedDepartures.length` so in-house stays are accurately reflected.

- [x] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/pms-payment-workflow.test.tsx`:
Test that:
1. Walk-in check-in creates reservation with `status: 'checked_in'` and `paymentStatus: 'paid'`.
2. Initial folio bill created with room fee and deposit has `status: 'paid'`.
3. Adding a minibar item updates bill status to `unpaid` (`รอชำระ`).
4. Daily Operations departures badge reflects all active in-house departures (`dueToday + earlyOrExtended`).
5. Billing History table displays `ยอดสุทธิ` (Net Total) in the amount column.

- [x] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/pms-payment-workflow.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement PMS Payment Workflow logic**
- In `reservations.ts` / `useReservations.ts`: when walk-in checkin occurs, set `paymentStatus = 'paid'` and record total amount = `roomRate * nights + deposit`.
- In `useBilling.ts` / `CashierFolioPage.tsx`: when an extra charge is added to an active bill, update `bill.status = 'unpaid'`.
- In `DailyOperationsPage.tsx`:
  - Update `const departuresCount = dueTodayDepartures.length + earlyOrExtendedDepartures.length;`.
  - In checkout handler: settle the bill, refund deposit difference, update reservation `paymentStatus = 'paid'`, and complete checkout.
  - In Billing History tab: ensure amount column displays Net Total (`ยอดสุทธิ`).

- [x] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/pms-payment-workflow.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add services/reservation/src/routes/reservations.ts apps/web/src/hooks/useReservations.ts apps/web/src/hooks/useBilling.ts apps/web/src/pages/front-desk/CashierFolioPage.tsx apps/web/src/pages/front-desk/DailyOperationsPage.tsx apps/web/src/__tests__/pms-payment-workflow.test.tsx
git commit -m "feat(front-desk): overhaul PMS payment workflow with upfront room+deposit and checkout settlement"
```

---

### Task 5: Reservation Cancellation with Reason & Audit Log Modal

**Files:**
- Create: `apps/web/src/components/front-desk/CancelReservationModal.tsx`
- Modify: `services/reservation/src/routes/reservations.ts:250-300`
- Modify: `apps/web/src/hooks/useReservations.ts:180-220`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:1400-1450`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx:240-270`
- Test: `apps/web/src/__tests__/cancel-reservation-modal.test.tsx`

**Interfaces:**
- Produces: `CancelReservationModal`, `cancelReservation(reservationId, reason, note)`
- Reasons: "ลูกค้าแจ้งขอยกเลิก (Guest Request)", "ไม่มาแสดงตัว (No-Show)", "เหตุฉุกเฉิน / สภาพอากาศ (Emergency)", "อื่นๆ (Other)"
- Releases room to `available` immediately and records audit log.

- [x] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/cancel-reservation-modal.test.tsx`:
Test that:
1. `CancelReservationModal` renders reason dropdown and note input.
2. Submitting cancellation calls `cancelReservation` with reason.
3. Target reservation status becomes `cancelled` and room status reverts to `available`.

- [x] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/cancel-reservation-modal.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement `CancelReservationModal.tsx` and cancellation API**
Create `CancelReservationModal.tsx`:
- Dropdown select for cancellation reason with accessible labels.
- Textarea for optional cancellation notes.
- Action buttons: "ยืนยันยกเลิกการจอง" (danger red) and "ยกเลิก".
In `reservations.ts`: add `POST /api/reservations/:id/cancel` which sets `status = 'cancelled'`, logs reason, and sets room status to `available`.
Wire into `RoomDetailsModal.tsx`, `RoomMatrixPage.tsx`, and reservation table rows.

- [x] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/cancel-reservation-modal.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/CancelReservationModal.tsx services/reservation/src/routes/reservations.ts apps/web/src/hooks/useReservations.ts apps/web/src/components/front-desk/RoomDetailsModal.tsx apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/__tests__/cancel-reservation-modal.test.tsx
git commit -m "feat(front-desk): implement reservation cancellation modal with reason and audit log"
```

---

### Task 6: Command Palette Deep Navigation & Room Matrix URL Search Query

**Files:**
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx:90-140`
- Modify: `apps/web/src/components/front-desk/GlobalCommandPalette.tsx:320-360`
- Test: `apps/web/src/__tests__/command-palette-deep-navigation.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams()` in `RoomMatrixPage.tsx`
- Produces: Auto-opening of `RoomDetailsModal` when URL has `?roomId=...` and clearing of query parameter upon modal close.

- [x] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/command-palette-deep-navigation.test.tsx`:
Test that:
1. When `RoomMatrixPage` loads with `?roomId=rm-101`, it finds the matching room and opens `RoomDetailsModal`.
2. Closing the modal clears `roomId` from URL search params.

- [x] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/command-palette-deep-navigation.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement Deep Navigation in `RoomMatrixPage.tsx`**
In `RoomMatrixPage.tsx`:
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const urlRoomId = searchParams.get('roomId');

useEffect(() => {
  if (urlRoomId && rooms.length > 0) {
    const matched = rooms.find((r) => r.id === urlRoomId || r.roomNumber === urlRoomId);
    if (matched) {
      setSelectedRoom(matched);
      setIsModalOpen(true);
    }
  }
}, [urlRoomId, rooms]);

const handleCloseModal = () => {
  setIsModalOpen(false);
  if (urlRoomId) {
    searchParams.delete('roomId');
    setSearchParams(searchParams, { replace: true });
  }
};
```

- [x] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/command-palette-deep-navigation.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/components/front-desk/GlobalCommandPalette.tsx apps/web/src/__tests__/command-palette-deep-navigation.test.tsx
git commit -m "feat(front-desk): support deep-link room modal opening from Command Palette"
```

---

### Task 7: Cashier Page Redesign (2-Column Layout, Remove English Parentheses, Compact Room Note Badges)

**Files:**
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx:1-50, 480-671`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx:150-350`
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx:210-250`
- Test: `apps/web/src/__tests__/cashier-layout-redesign.test.tsx`

**Interfaces:**
- Produces:
  - Header title: strictly `แคชเชียร์และบิล` (no English subtitle).
  - 2-Column layout: 35% bill selector, 65% wide line items table.
  - Bottom summary bar with Net Total & "พิมพ์ใบเสร็จ/ใบกำกับภาษี".
  - Removal of "บันทึกรับเงินและปิดยอด" from Cashier page (delegated to Checkout).
  - Room note on room card rendered as compact single-line chip with icon (e.g. Room 205).

- [x] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/cashier-layout-redesign.test.tsx`:
Test that:
1. Cashier page title does not contain `(Cashier Hub)`.
2. Bill line items table has full width in 2-column layout.
3. No settlement button exists on Cashier page; prints invoice and adds extra charges only.
4. RoomCard notes render as compact chip with `max-w-full truncate`.

- [x] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/cashier-layout-redesign.test.tsx`
Expected: FAIL

- [x] **Step 3: Implement 2-Column Layout and Compact Notes**
- In `CashierFolioPage.tsx`: change title to `แคชเชียร์และบิล`. Reorganize layout into 2 columns: Left 35% bill master, Right 65% `FolioSplitScreen`.
- In `FolioSplitScreen.tsx`: remove the right-hand settlement form column. Place line items in full width, place "ขอของใช้เสริม" and "เพิ่มค่าใช้จ่าย / มินิบาร์" buttons at the top right, and place the Net Due summary and Print Invoice button in a clean bottom bar.
- In `RoomCard.tsx`: replace the full-width yellow box for notes with a compact inline chip:
```tsx
<div className="inline-flex items-center gap-1 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 max-w-full truncate">
  <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
  <span className="truncate">{localizeRoomNote(room.notes, locale)}</span>
</div>
```

- [x] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/cashier-layout-redesign.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add apps/web/src/pages/front-desk/CashierFolioPage.tsx apps/web/src/components/front-desk/FolioSplitScreen.tsx apps/web/src/components/front-desk/RoomCard.tsx apps/web/src/__tests__/cashier-layout-redesign.test.tsx
git commit -m "feat(front-desk): redesign Cashier page to 2-column folio manager and compact room notes"
```

---

### Task 8: Whole-Suite Verification, Regression Suite & Visual Proofs

**Files:**
- Test: Full web vitest suite (`pnpm --filter @keystay/web test:run`)
- Test: Full typecheck (`pnpm dlx turbo run typecheck`)
- Test: Backend mocha test suite (`npm run test:all`)
- Output Artifacts: Screenshots in `preview-responsive/` (19 through 23)

**Interfaces:**
- Consumes: All implementations from Tasks 1 through 7
- Produces: 100% passing tests, verified zero regression on existing Front Desk workflows, clean build, and verified responsive screenshots.

- [x] **Step 1: Run comprehensive web and backend test suites**
Run:
```bash
pnpm --filter @keystay/web test:run
npm run test:all
pnpm dlx turbo run typecheck
```
Expected: 100% passing, 0 TypeScript errors.

- [x] **Step 2: Capture visual verification screenshots**
Capture screenshots via browser script:
1. `preview-responsive/19-fixed-light-dark-toggle.png` (Showing reliable light/dark mode switch)
2. `preview-responsive/20-safe-walkin-and-compact-card.png` (Safe walk-in without crash and compact room notes)
3. `preview-responsive/21-cashier-2-column-redesign.png` (New 2-column Cashier page with no scrolling)
4. `preview-responsive/22-cancel-reservation-modal.png` (Cancel reservation modal with reason dropdown)
5. `preview-responsive/23-compressed-slip-viewer.png` (Compressed slip image preview in lightbox)

- [x] **Step 3: Commit final suite polish & visual proofs**
```bash
git add preview-responsive/ docs/superpowers/plans/
git commit -m "chore(front-desk): complete verification and capture visual proofs for cashier workflow and UI polish"
```


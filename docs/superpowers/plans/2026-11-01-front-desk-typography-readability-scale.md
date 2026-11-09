# Front-Desk Typography & Readability Scale Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the typography scale and visual contrast across all 4 Front-Desk & Cashier Portal pages and Layout, replacing overly small (`text-xs`, `text-[10px]`, `text-[11px]`) text with international, studio-grade readable scales (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-3xl`) optimized for IBM Plex Sans Thai and high-contrast operational clarity.

**Architecture:** Refactor the font sizing tokens and padding rhythm across `FrontDeskLayout`, `RoomCard`, `RoomDetailsDrawer`, `RoomMatrixGrid`, `RoomMatrixPage`, `ReservationsPage`, `DailyOperationsPage`, `CashierFolioPage`, and `FolioSplitScreen`. Ensure table cells, room numbers, prices, notes, and hero settlement figures have prominent visual hierarchy while preserving responsive balance in both compact and comfortable modes.

**Tech Stack:** React 18, Tailwind CSS, TypeScript, IBM Plex Sans Thai, Vite, Node.js Test Runner.

**Spec:** [docs/designsystem.md](file:///e:/MyWork/PJ_P3_1/keystay/docs/designsystem.md), [c:\Users\Miller-Wise\.gemini\config\plugins\superpowers\skills\frontend-design\SKILL.md](file:///c:/Users/Miller-Wise/.gemini/config/plugins/superpowers/skills/frontend-design/SKILL.md).

## Global Constraints

- **International Readability Standards:** Base body and table cell text must be at least 14px (`text-sm`), ensuring Thai diacritics (สระบน/สระล่าง: อิ, อี, อุ, อู, ไม้เอก, ไม้โท) and loopheads remain crisp and legible without clipping.
- **Swiss Monospace Numerals:** All room numbers, currency amounts, dates, booking codes, and counters must maintain `font-mono tabular-nums tracking-tight`.
- **Prominent Visual Hierarchy:** Room numbers on cards must stand out prominently (`text-lg font-bold font-mono`). Net Due on Cashier Folio must be a prominent hero number (`text-2xl sm:text-3xl font-bold font-mono`).
- **No Overflow Regressions:** Upgrading font sizes must not introduce horizontal or vertical layout overflow in compact 5-column grid or split-screen views.
- **Test Invariants:** All existing 103 unit tests must continue to pass, with tests updated to reflect the enhanced font scale.

## Review Focus

- Room numbers on RoomCard must be bold and prominent (`text-lg font-bold font-mono`), easily legible from a counter distance.
- Room notes at the bottom of RoomCard must be upgraded from unreadable `text-[9px]`/`text-[10px]` to legible `text-xs text-slate-700`.
- All table rows in Reservations and Daily Operations must render at `text-sm` (14px) instead of cramped `text-xs` (12px).
- Cashier Folio Net Due figure must be an eye-catching, high-contrast hero number (`text-2xl sm:text-3xl font-mono font-bold`).
- Secondary navigation tabs in FrontDeskLayout must be upgraded from `text-xs` to `text-sm font-medium`.

---

### Task 1: Global Navigation & Layout Typography Upgrade

**Files:**
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- Modify: `apps/web/src/__tests__/layout.test.ts`

- [ ] **Step 1: Update layout unit test for enhanced typography scale**

In `apps/web/src/__tests__/layout.test.ts`:
- Assert navigation tabs use `text-sm font-medium`.
- Assert header elements (clock, emergency button, profile) use enhanced readability classes.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/layout.test.ts`
Expected: FAIL.

- [ ] **Step 2: Upgrade typography scale in `FrontDeskLayout.tsx`**

In `FrontDeskLayout.tsx`:
- Upgrade navigation tabs from `text-xs` to `text-sm font-medium py-3 px-4`.
- Upgrade live clock to `text-xs sm:text-sm font-mono font-medium text-slate-700`.
- Upgrade emergency outsource button to `text-xs sm:text-sm font-semibold`.
- Upgrade profile indicator name to `text-sm font-semibold text-slate-900`.

- [ ] **Step 3: Run test and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/layout.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/__tests__/layout.test.ts
git commit -m "feat(web): upgrade FrontDeskLayout navigation and header typography scale"
```

---

### Task 2: Page 1 — Room Matrix & Room Details Drawer Typography Upgrade

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsDrawer.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Modify: `apps/web/src/__tests__/room-card.test.ts`
- Modify: `apps/web/src/__tests__/room-matrix-space-localization.test.ts`

- [ ] **Step 1: Update failing tests for Room Matrix typography scale**

In `apps/web/src/__tests__/room-card.test.ts` and `room-matrix-space-localization.test.ts`:
- Update assertions for room number (`text-lg font-bold font-mono text-slate-900`).
- Update assertions for room notes and room type scale (`text-sm font-semibold text-slate-800`, `text-xs text-slate-600`).

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-card.test.ts`
Expected: FAIL.

- [ ] **Step 2: Upgrade typography in `RoomCard.tsx`**

In `RoomCard.tsx`:
- Room number: `text-base` -> `text-lg font-bold font-mono tracking-tight text-slate-900`.
- Status badge: `text-[10px]` / `text-[11px]` -> `text-xs px-2.5 py-0.5 font-semibold`.
- Room type: `text-xs` -> `text-sm font-semibold text-slate-800`.
- Floor & Price: Floor `text-xs text-slate-600`, Price `text-xs sm:text-sm font-bold font-mono text-slate-900`.
- Guest name badge (occupied): `text-[11px]` -> `text-xs sm:text-sm font-semibold text-blue-900`.
- Room note (bottom): `text-[9px]` / `text-[10px]` -> `text-xs text-slate-600 leading-snug`.

- [ ] **Step 3: Upgrade typography in `RoomDetailsDrawer.tsx`**

In `RoomDetailsDrawer.tsx`:
- Room number header: `text-2xl` -> `text-3xl font-bold font-mono text-slate-900`.
- Status badge: `text-xs` -> `text-sm font-medium px-3 py-1`.
- Basic specs: labels `text-xs sm:text-sm text-slate-500`, values `text-base font-semibold text-slate-900`.
- Description: `text-[11px]` -> `text-sm leading-relaxed text-slate-700`.
- Amenities tags: `text-[11px]` -> `text-xs sm:text-sm px-2.5 py-1 font-medium`.
- Notes section: `text-xs` -> `text-sm leading-relaxed text-amber-950`.
- Action buttons: `text-xs` -> `text-sm font-semibold py-3`.

- [ ] **Step 4: Upgrade typography in `RoomMatrixPage.tsx` & `RoomMatrixGrid.tsx`**

In `RoomMatrixPage.tsx` & `RoomMatrixGrid.tsx`:
- Title: `text-xl` -> `text-2xl font-bold text-slate-900`.
- Subtitle: `text-xs` -> `text-sm text-slate-600`.
- Filter chips: `text-xs` -> `text-sm px-3.5 py-1.5 font-medium`.
- Search bar: `text-xs` -> `text-sm py-2 px-3.5`.
- Floor dividers: `text-xs` -> `text-sm font-bold tracking-wider text-slate-700`.

- [ ] **Step 5: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-card.test.ts apps/web/src/__tests__/room-matrix-space-localization.test.ts apps/web/src/__tests__/room-matrix-density.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/front-desk/RoomCard.tsx apps/web/src/components/front-desk/RoomDetailsDrawer.tsx apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/components/front-desk/RoomMatrixGrid.tsx apps/web/src/__tests__/room-card.test.ts apps/web/src/__tests__/room-matrix-space-localization.test.ts
git commit -m "feat(web): upgrade Room Matrix and Details Drawer typography scale and prominence"
```

---

### Task 3: Page 2 — Reservations Management Typography Upgrade

**Files:**
- Modify: `apps/web/src/pages/front-desk/ReservationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx`
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx`
- Modify: `apps/web/src/__tests__/reservations-space-localization.test.ts`

- [ ] **Step 1: Update failing tests for Reservations typography scale**

In `apps/web/src/__tests__/reservations-space-localization.test.ts`:
- Assert table rows render with `text-sm text-slate-800`.
- Assert numerals use `text-sm font-mono font-medium`.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/reservations-space-localization.test.ts`
Expected: FAIL.

- [ ] **Step 2: Upgrade typography in `ReservationsPage.tsx`**

In `ReservationsPage.tsx`:
- Title: `text-xl` -> `text-2xl font-bold text-slate-900`.
- Filter chips: `text-xs` -> `text-sm px-3.5 py-1.5`.
- Search bar: `text-xs` -> `text-sm py-2 px-3.5`.
- Table header: `text-xs font-bold text-slate-700 uppercase tracking-wider py-3`.
- Table body cells: `text-xs` -> `text-sm py-3.5 px-4 text-slate-800`.
- Booking ID, Room #, Dates, Total, Deposit: `text-sm font-mono font-medium text-slate-900`.
- Action buttons: `text-sm font-semibold py-1.5 px-3.5`.

- [ ] **Step 3: Upgrade typography in `NewBookingModal.tsx` and `WalkInModal.tsx`**

In `NewBookingModal.tsx` & `WalkInModal.tsx`:
- Field labels: `text-sm font-semibold text-slate-800`.
- Form inputs: `text-sm py-2 px-3`.
- Summary totals: `text-base font-bold font-mono text-slate-900`.
- Submit buttons: `text-sm font-semibold py-2.5`.

- [ ] **Step 4: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/reservations-space-localization.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/front-desk/ReservationsPage.tsx apps/web/src/components/front-desk/NewBookingModal.tsx apps/web/src/components/front-desk/WalkInModal.tsx apps/web/src/__tests__/reservations-space-localization.test.ts
git commit -m "feat(web): upgrade Reservations page and booking modals typography scale"
```

---

### Task 4: Page 3 — Daily Operations Typography Upgrade

**Files:**
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/CheckInModal.tsx`
- Modify: `apps/web/src/components/front-desk/CheckOutModal.tsx`
- Modify: `apps/web/src/components/front-desk/ExtendStayModal.tsx`
- Modify: `apps/web/src/__tests__/daily-operations-space-localization.test.ts`

- [ ] **Step 1: Update failing tests for Daily Operations typography scale**

In `apps/web/src/__tests__/daily-operations-space-localization.test.ts`:
- Assert queue sub-tabs use `text-sm font-semibold`.
- Assert table rows render with `text-sm text-slate-800`.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/daily-operations-space-localization.test.ts`
Expected: FAIL.

- [ ] **Step 2: Upgrade typography in `DailyOperationsPage.tsx`**

In `DailyOperationsPage.tsx`:
- Title: `text-xl` -> `text-2xl font-bold text-slate-900`.
- Queue sub-tabs: `text-xs` -> `text-sm font-semibold py-2.5 px-4`.
- Count badges: `text-xs font-mono font-bold px-2 py-0.5`.
- Table header: `text-xs font-bold text-slate-700 uppercase tracking-wider py-3`.
- Table body cells: `text-xs` -> `text-sm py-3.5 px-4 text-slate-800`.
- Action buttons (`เช็คอิน`, `เช็คเอาท์`, `ต่อเวลา`): `text-sm font-semibold py-1.5 px-3.5`.

- [ ] **Step 3: Upgrade typography in `CheckInModal.tsx`, `CheckOutModal.tsx`, `ExtendStayModal.tsx`**

In all 3 operational modals:
- Title: `text-xl font-bold text-slate-900`.
- Labels & specs: `text-sm font-medium text-slate-600`.
- Numerical values & refunds: `text-base font-bold font-mono text-slate-900`.
- Action buttons: `text-sm font-semibold py-2.5`.

- [ ] **Step 4: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/daily-operations-space-localization.test.ts apps/web/src/__tests__/operational-modals.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/front-desk/DailyOperationsPage.tsx apps/web/src/components/front-desk/CheckInModal.tsx apps/web/src/components/front-desk/CheckOutModal.tsx apps/web/src/components/front-desk/ExtendStayModal.tsx apps/web/src/__tests__/daily-operations-space-localization.test.ts
git commit -m "feat(web): upgrade Daily Operations and operational modals typography scale"
```

---

### Task 5: Page 4 — Cashier Folio Split-Screen & Tax Invoice Typography Upgrade

**Files:**
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Modify: `apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx`
- Modify: `apps/web/src/components/front-desk/AddExtraChargeModal.tsx`
- Modify: `apps/web/src/__tests__/cashier-folio-space-localization.test.ts`

- [ ] **Step 1: Update failing tests for Cashier Folio typography scale**

In `apps/web/src/__tests__/cashier-folio-space-localization.test.ts`:
- Assert itemized table rows render with `text-sm text-slate-900`.
- Assert Net Due renders with prominent hero scale (`text-2xl` or `text-3xl`).

Run: `pnpm dlx tsx --test apps/web/src/__tests__/cashier-folio-space-localization.test.ts`
Expected: FAIL.

- [ ] **Step 2: Upgrade typography in `CashierFolioPage.tsx` & `FolioSplitScreen.tsx`**

In `CashierFolioPage.tsx`:
- Title: `text-xl` -> `text-2xl font-bold text-slate-900`.
- Room selector chips: `text-xs` -> `text-sm font-medium px-3.5 py-1.5`.

In `FolioSplitScreen.tsx`:
- Itemized table headers: `text-xs font-bold text-slate-700 uppercase tracking-wider py-3`.
- Itemized table cells: `text-xs` -> `text-sm py-3.5 px-4 text-slate-800`.
- Unit prices and item totals: `text-sm font-semibold font-mono text-slate-900`.
- Settlement card:
  - Subtotal, VAT 7%, Deposit lines: `text-sm font-medium text-slate-700`.
  - Net Due label: `text-base font-bold text-slate-900`.
  - Net Due amount: `text-2xl sm:text-3xl font-bold font-mono text-slate-950 tracking-tight`.
  - Payment buttons: `text-sm font-semibold py-2.5`.
  - Action buttons (Record Settlement, Print Tax Invoice): `text-sm font-semibold py-3`.

- [ ] **Step 3: Upgrade typography in `ReceiptTaxInvoiceModal.tsx` and `AddExtraChargeModal.tsx`**

In `ReceiptTaxInvoiceModal.tsx`:
- Header title: `text-xl font-bold text-slate-900`.
- Tax invoice table rows: `text-sm py-2 px-3 text-slate-900`.
- Grand totals: `text-base sm:text-lg font-bold font-mono text-slate-950`.

In `AddExtraChargeModal.tsx`:
- Form labels: `text-sm font-semibold text-slate-800`.
- Preset pills: `text-xs sm:text-sm font-medium px-3 py-1.5`.
- Quantity & Unit price inputs: `text-sm py-2 px-3`.
- Total display: `text-base font-bold font-mono text-slate-900`.

- [ ] **Step 4: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/cashier-folio-space-localization.test.ts apps/web/src/__tests__/folio-calculation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/front-desk/CashierFolioPage.tsx apps/web/src/components/front-desk/FolioSplitScreen.tsx apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx apps/web/src/components/front-desk/AddExtraChargeModal.tsx apps/web/src/__tests__/cashier-folio-space-localization.test.ts
git commit -m "feat(web): upgrade Cashier Folio and Tax Invoice typography scale and hero metrics"
```

---

### Task 6: Full Integration Verification, Test Suite & Production Build

**Files:**
- Test: All suites in `apps/web/src/__tests__/*.test.ts` and `services/housekeeping/src/__tests__/*.test.ts`

- [ ] **Step 1: Run all unit tests across frontend and backend**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/*.test.ts services/housekeeping/src/__tests__/*.test.ts`
Expected: All 103+ tests PASS with 0 failures.

- [ ] **Step 2: Run TypeScript typecheck across monorepo**

Run: `pnpm dlx turbo run typecheck`
Expected: 0 errors across all 12 packages.

- [ ] **Step 3: Run Vite production build**

Run: `pnpm --filter @keystay/web build`
Expected: Clean production build with optimized assets.

- [ ] **Step 4: Commit release tag**

```bash
git commit --allow-empty -m "chore(release): complete front-desk typography and readability scale upgrade"
```

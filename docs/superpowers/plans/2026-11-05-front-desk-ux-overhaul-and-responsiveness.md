# Front Desk UX Overhaul & Responsive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Front Desk portal UI/UX based on peer review feedback: transition to a collapsible left sidebar, consolidate 4 menus into 2 focused workflows, redesign Room Cards (4-column grid, tempered glass status pills, spec chips, hover quick action, maintenance reasons), implement a center Split-Pane Booking Modal, create a unified search+filter toolbar with silent 30s auto-refresh, and guarantee enterprise responsiveness across Mobile, Tablet, and PC.

**Architecture:** 
- `FrontDeskLayout.tsx`: Replaces top navbar with a sleek 240px⮂64px collapsible left sidebar, reducing navigation to 2 primary portals (`/front-desk/room-matrix` and `/front-desk/daily-operations`) plus Outsource Emergency Drawer and profile controls.
- `RoomMatrixPage.tsx` & `RoomMatrixGrid.tsx`: Hosts a 4-column desktop grid with crisp floor dividers, a unified search + dropdown filter toolbar, silent 30s auto-refresh + tab-focus refetching, and an embedded `[ Grid | Table ]` view switcher to merge Reservations into the Matrix.
- `RoomCard.tsx`: Tempered glass status pill with colored dots, divider-free card body, prominent bottom spec chips (Bed, Capacity, Bath) for available rooms, guest/checkout chips for occupied rooms, and orange/red reason boxes for maintenance rooms, equipped with a hover action bar for 1-click walk-in booking.
- `RoomDetailsModal.tsx`: Centered dialog that smoothly expands into a 2-pane split modal (left: room details, right: 1-page fast booking/walk-in form with client-side validation).
- `DailyOperationsPage.tsx`: Integrates folio cashiering, deposit deductions, and tax invoice printing directly into the check-out flow.

**Tech Stack:** React 18, Vite, Tailwind CSS, Lucide React, Playwright visual inspection, TypeScript, Node test runner (`tsx --test`).

**Spec:** Review feedback documented in conversation and [docs/DOCS_REVIEW_AND_PROPOSED_FIXES.md](file:///e:/MyWork/PJ_P3_1/keystay/docs/DOCS_REVIEW_AND_PROPOSED_FIXES.md).

## Global Constraints

- Preserve all existing REST API contracts and Cloudflare Workers backend integration.
- Maintain bilingual Thai/English separation using `useI18n()` without raw string leakage.
- Strict anti-AI minimalist design: no generic purple gradients or AI slop, retain Swiss operational typography (`font-mono tabular-nums`).
- Touch targets on Tablet/Mobile must be at least 44px (`min-h-[44px]`).
- Desktop Room Grid must strictly render 4 columns (`lg:grid-cols-4 xl:grid-cols-4`).

## Review Focus

1. **Auto-Refresh State Safety:** Ensure silent 30s background polling or tab-focus refetching never wipes out form state or resets active modal inputs.
2. **Floor Separation & Divider Clarity:** Ensure floor group titles and dividing lines render cleanly even when filtered.
3. **Tempered Glass Status Legibility:** The status text must remain high-contrast black/slate-900 against the translucent frosted glass pill.
4. **Split-Pane Modal Overflow:** On smaller tablet screens, ensure the Split-Pane Modal gracefully stacks or scrolls without clipping the submit button.
5. **Zero Data Loss on Navigation Merge:** Merging Reservations into Room Matrix and Cashier into Daily Operations must retain 100% of existing table columns and settlement calculations.

---

### Task 1: Collapsible Left Sidebar & 2-Menu Navigation Layout (`FrontDeskLayout.tsx`)

**Files:**
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- Modify: `apps/web/src/locales/th.ts`
- Modify: `apps/web/src/locales/en.ts`
- Create / Update: `apps/web/src/__tests__/FrontDeskLayout.test.ts`

- [ ] **Step 1: Write unit tests for the Left Sidebar layout and 2-menu navigation**
  Create `apps/web/src/__tests__/FrontDeskLayout.test.ts` to verify that:
  - Sidebar renders with collapsible toggle (collapsed state stores in `localStorage`).
  - Navigation renders exactly 2 primary items: `ผังห้องพักและรายการจอง` (`/front-desk/room-matrix`) and `เช็คอิน/เช็คเอาต์ & แคชเชียร์` (`/front-desk/daily-operations`).
  - Emergency Outsource button, Live Clock, Language switch, and Logout exist.
  - Mobile hamburger drawer controls toggle for screens < 768px.

- [ ] **Step 2: Run test to confirm it fails**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/FrontDeskLayout.test.ts`

- [ ] **Step 3: Refactor `FrontDeskLayout.tsx` to Collapsible Left Sidebar**
  - Implement fixed `h-screen w-screen overflow-hidden flex bg-[#F8FAFC]`.
  - Sidebar: Width `w-60` when expanded, `w-16` when collapsed (`localStorage: keystay_fd_sidebar_collapsed`).
  - Add Logo and Collapse toggle button.
  - Implement 2 primary nav tabs with Lucide icons (`LayoutGrid`, `UserCheck`) and active indicator pills.
  - Bottom controls: Quick Emergency button (`ShieldCheck`), Live Clock (`Clock`), Language toggle (`Globe`), and Logout (`LogOut`).
  - Main area: `flex-1 h-screen overflow-y-auto min-w-0 p-4 sm:p-5 lg:p-6`.

- [ ] **Step 4: Update locales with 2-menu naming**
  Add keys in `th.ts` and `en.ts` for:
  - `nav.matrixAndReservations`: `ผังห้องพัก & รายการจอง` / `Room Matrix & Reservations`
  - `nav.operationsAndCashier`: `เช็คอิน/เอาต์ & แคชเชียร์` / `Operations & Cashier`

- [ ] **Step 5: Run tests and typecheck**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/FrontDeskLayout.test.ts`
  Verify layout compiles cleanly.

- [ ] **Step 6: Commit Task 1**
  `git add apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/locales/ apps/web/src/__tests__/FrontDeskLayout.test.ts`
  `git commit -m "feat(frontdesk): transform navbar to collapsible left sidebar with 2-menu consolidation"`

---

### Task 2: Redesigned Room Card with 4-Column Grid, Tempered Glass Status & Hover Action (`RoomCard.tsx` & `RoomMatrixGrid.tsx`)

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Create / Update: `apps/web/src/__tests__/RoomCard.test.ts`

- [ ] **Step 1: Write unit tests for new RoomCard and 4-column Grid features**
  Create `apps/web/src/__tests__/RoomCard.test.ts` verifying:
  - Status pill renders with colored dot (`w-2 h-2 rounded-full`) and black text (`text-slate-900`) inside frosted glass styling (`bg-slate-100/60 backdrop-blur-xs border border-slate-200/70`).
  - Card has no inner divider line (`border-t border-slate-100` removed).
  - Available rooms display feature chips (Bed, Capacity, Bathroom).
  - Occupied rooms display guest name and checkout date tag.
  - Maintenance rooms display maintenance reason in an amber/rose box.
  - Hover action button `[ ⚡ เปิดห้องทันที (Walk-In) ]` exists for available rooms.
  - Grid applies 4 columns on desktop (`lg:grid-cols-4 xl:grid-cols-4`).

- [ ] **Step 2: Run test to confirm it fails**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/RoomCard.test.ts`

- [ ] **Step 3: Refactor `RoomCard.tsx`**
  - Redesign status pill:
    ```tsx
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-slate-900 bg-slate-100/70 backdrop-blur-xs border border-slate-200/70 shadow-2xs">
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
      <span>{localizedStatus}</span>
    </span>
    ```
  - Remove inner dividing line (`border-t` removed).
  - Render bottom tags based on room status:
    - `available`: Chips for bed type, capacity, bath (`bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium`).
    - `occupied`: Guest name and checkout chip (`bg-blue-50/80 border border-blue-200 text-blue-900 text-xs px-2 py-1 rounded-md`).
    - `maintenance` / `out_of_order`: Prominent reason notice box (`bg-amber-50/90 border border-amber-200 text-amber-800 text-xs px-2.5 py-1.5 rounded-md font-medium`).
  - Add Hover Action overlay on available cards:
    ```tsx
    <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-1.5 z-10">
      <button onClick={(e) => { e.stopPropagation(); onQuickBook(room); }} className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-md flex items-center justify-center gap-1">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span>เปิดห้องทันที (Walk-In)</span>
      </button>
    </div>
    ```

- [ ] **Step 4: Update `RoomMatrixGrid.tsx` for 4-Column Layout & Floor Dividers**
  - Floor header: Icon `Building2`, Floor name (e.g., `ชั้น 1`), room count badge, with a clean separator `<div className="h-px bg-slate-200/80 flex-1 ml-3" />`.
  - Update grid classes to strictly 4 columns on desktop:
    `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`.

- [ ] **Step 5: Run tests and verify**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/RoomCard.test.ts`

- [ ] **Step 6: Commit Task 2**
  `git add apps/web/src/components/front-desk/RoomCard.tsx apps/web/src/components/front-desk/RoomMatrixGrid.tsx apps/web/src/__tests__/RoomCard.test.ts`
  `git commit -m "feat(frontdesk): redesign room cards with 4-col grid, tempered glass status, spec chips, and hover action"`

---

### Task 3: Unified Search, Status & Floor Filter Dropdown, and Silent Auto-Refresh Toolbar (`RoomMatrixPage.tsx`)

**Files:**
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Modify: `apps/web/src/locales/th.ts`
- Modify: `apps/web/src/locales/en.ts`
- Create / Update: `apps/web/src/__tests__/RoomMatrixToolbar.test.ts`

- [ ] **Step 1: Write unit tests for Toolbar and Auto-Refresh**
  Create `apps/web/src/__tests__/RoomMatrixToolbar.test.ts` verifying:
  - Density toggle `[ Compact | Comfortable ]` and manual refresh button are absent.
  - Search input filters room number, room type, and guest name.
  - Filter button opens dropdown containing status chips and floor selectors.
  - Live indicator displays pulse dot with formatted timestamp.
  - Sub-tabs switch between Matrix Grid and Reservations Table.

- [ ] **Step 2: Run test to confirm it fails**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/RoomMatrixToolbar.test.ts`

- [ ] **Step 3: Implement Unified Toolbar in `RoomMatrixPage.tsx`**
  - Build top action toolbar:
    - Search input (`w-full sm:w-72 lg:w-80 h-9 text-xs`).
    - Filter dropdown button with active filter counter badge.
    - End of toolbar: Live indicator `<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-xs text-slate-500 font-mono">อัปเดตอัตโนมัติ: {time}</span>`.
  - Sub-tabs for Room Matrix Page:
    - Tab 1: `ผังห้องพัก (Grid)`
    - Tab 2: `รายการจองทั้งหมด (Table)` (embeds the reservation table directly here).

- [ ] **Step 4: Implement Silent Auto-Refresh Mechanism**
  - Interval timer: Poll `refresh()` and `refreshReservations()` every 30 seconds.
  - Event listener on `visibilitychange`: Refetch immediately when switching back to the browser tab.
  - Refetch hook on mutation completion.
  - Update `lastRefreshed` timestamp on each successful cycle.

- [ ] **Step 5: Run tests and verify**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/RoomMatrixToolbar.test.ts`

- [ ] **Step 6: Commit Task 3**
  `git add apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/components/front-desk/RoomMatrixGrid.tsx apps/web/src/__tests__/RoomMatrixToolbar.test.ts apps/web/src/locales/`
  `git commit -m "feat(frontdesk): unified toolbar with dropdown filter, silent auto-refresh, and embedded reservations tab"`

---

### Task 4: Center Room Details & Split-Pane Booking Modal (`RoomDetailsModal.tsx`)

**Files:**
- Create: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- Remove / Deprecate: `apps/web/src/components/front-desk/RoomDetailsDrawer.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Create / Update: `apps/web/src/__tests__/RoomDetailsModal.test.ts`

- [ ] **Step 1: Write unit tests for Center Modal and Split-Pane expansion**
  Create `apps/web/src/__tests__/RoomDetailsModal.test.ts` verifying:
  - Modal opens centered on screen with backdrop blur.
  - Displays room specifications, amenities, notes, and action buttons.
  - Clicking "เปิดห้องด่วน (Walk-In)" or "สร้างการจอง" expands the modal into 2 panes (`w-full max-w-4xl`).
  - Left pane displays room details; right pane displays the streamlined booking form.
  - Form validates required fields (guest name, phone, valid date range, deposit >= 0) before submitting.

- [ ] **Step 2: Run test to confirm it fails**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/RoomDetailsModal.test.ts`

- [ ] **Step 3: Implement `RoomDetailsModal.tsx`**
  - Base state: Centered Dialog (`max-w-lg`) with room number hero, type, rate, specs, amenities chips, and notes.
  - Action buttons: `เปิดห้องด่วน (Walk-In)`, `สร้างการจองใหม่`, `แจ้งทำความสะอาด`, `ขยายเวลาพัก`.
  - Expanded state (Booking Mode):
    - Smoothly transitions modal container to `max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden`.
    - **Left Column (5 cols):** Room summary letterhead, room type, bed, capacity, nightly rate, amenities list.
    - **Right Column (7 cols):** 1-page fast booking form:
      - Guest Name (`input required text-xs h-9`)
      - Guest Phone (`input required text-xs font-mono h-9`)
      - Check-in & Check-out dates with night counter
      - Number of guests & Deposit amount (`font-mono`)
      - Payment method selector (`เงินสด`, `โอนเงิน`, `บัตรเครดิต`, `QR PromptPay`)
    - Inline validation banner and Submit button: `[ ยืนยันเปิดห้อง / ยืนยันการจอง ]`.
    - Back button to return to single-pane view.

- [ ] **Step 4: Wire `RoomDetailsModal` into `RoomMatrixPage.tsx`**
  - Replace `RoomDetailsDrawer` with `RoomDetailsModal`.
  - Support direct opening into Booking Mode when triggered from the RoomCard hover action.

- [ ] **Step 5: Run tests and verify**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/RoomDetailsModal.test.ts`

- [ ] **Step 6: Commit Task 4**
  `git add apps/web/src/components/front-desk/RoomDetailsModal.tsx apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/__tests__/RoomDetailsModal.test.ts`
  `git commit -m "feat(frontdesk): replace right drawer with center split-pane booking modal and inline validation"`

---

### Task 5: Consolidated Daily Operations & Cashier Settlement Flow (`DailyOperationsPage.tsx`)

**Files:**
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/CheckOutModal.tsx`
- Modify: `apps/web/src/locales/th.ts`
- Modify: `apps/web/src/locales/en.ts`
- Create / Update: `apps/web/src/__tests__/DailyOperationsCashier.test.ts`

- [ ] **Step 1: Write unit tests for consolidated Check-out & Cashiering flow**
  Create `apps/web/src/__tests__/DailyOperationsCashier.test.ts` verifying:
  - Daily Operations page hosts 3 sub-tabs: `รอเช็คอินวันนี้`, `รอเช็คเอาท์ & คิดเงิน`, `ประวัติบิลและการชำระ`.
  - Clicking "เช็คเอาต์" opens the complete Folio Settlement modal directly (itemized room rate, minibar charges, deposit credit, net due hero metric).
  - Folio settlement allows payment recording and printing Tax Invoice / Receipt ABB without navigating away.

- [ ] **Step 2: Run test to confirm it fails**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/DailyOperationsCashier.test.ts`

- [ ] **Step 3: Integrate Cashier Settlement into `CheckOutModal.tsx` & `DailyOperationsPage.tsx`**
  - Embed the itemized Folio Settlement table and Add Extra Charge actions directly inside the CheckOut process.
  - Allow front desk staff to:
    1. Review room charges + extra minibar items.
    2. Deduct deposit automatically.
    3. Select payment method for Net Due balance.
    4. Settle payment and immediately open/print the Thai Tax Invoice ABB modal.
  - Add third sub-tab in Daily Operations for `ประวัติบิลและการชำระ` to review past settlements.

- [ ] **Step 4: Run tests and verify**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/DailyOperationsCashier.test.ts`

- [ ] **Step 5: Commit Task 5**
  `git add apps/web/src/pages/front-desk/DailyOperationsPage.tsx apps/web/src/components/front-desk/CheckOutModal.tsx apps/web/src/__tests__/DailyOperationsCashier.test.ts apps/web/src/locales/`
  `git commit -m "feat(frontdesk): consolidate cashiering and folio settlement directly into check-out operations"`

---

### Task 6: Responsive Polish (Mobile, Tablet, PC) & Visual Verification

**Files:**
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Create: `scripts/visual-verify-frontdesk.mjs`

- [ ] **Step 1: Create Playwright multi-viewport visual test script**
  Create `scripts/visual-verify-frontdesk.mjs` to capture screenshots at:
  - Mobile: 375x812
  - Tablet: 768x1024
  - Standard Desktop: 1280x800
  - Wide Desktop: 1600x1000
  Output to `C:\Users\Miller-Wise\.gemini\antigravity\brain\ce602030-c088-44a0-bc3d-eb1e96aba320\preview-responsive\`.

- [ ] **Step 2: Fine-tune responsive breakpoints and touch targets**
  - Ensure mobile drawer slides smoothly when hamburger icon is clicked on mobile/tablet.
  - Ensure room cards adapt from 1 column (mobile), 2-3 columns (tablet), to 4 columns (desktop).
  - Verify touch targets are at least 44px (`min-h-[44px]`) on mobile/tablet buttons.
  - Verify Split-Pane Modal stacks vertically into a single scrollable view on mobile screens.

- [ ] **Step 3: Run Playwright capture script & inspect screenshots**
  Run `node scripts/visual-verify-frontdesk.mjs` and verify no clipping, horizontal overflow, or broken padding.

- [ ] **Step 4: Run full test suite and monorepo typecheck**
  Run `pnpm dlx tsx --test apps/web/src/__tests__/*.test.ts`
  Run `pnpm dlx turbo run typecheck --force`
  Run `pnpm --filter @keystay/web build`

- [ ] **Step 5: Commit Task 6**
  `git add apps/web/ scripts/visual-verify-frontdesk.mjs`
  `git commit -m "chore(frontdesk): responsive polish across tablet and pc with visual verification"`

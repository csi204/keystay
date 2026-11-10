# Front-Desk UI/UX Space Optimization & Complete Bilingual Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate all 4 Front-Desk & Cashier Portal pages by applying the `frontend-design` Master Craftsman standard: optimizing layout space utilization (eliminating awkward empty deserts and narrow 1280px caps while maintaining balanced negative space) and establishing 100% strict bilingual TH/EN separation (eliminating mixed English room notes, room types, and descriptions in Thai mode).

**Architecture:** Extend the i18n dictionary system (`th.ts` & `en.ts`) with comprehensive room metadata mappings (`roomType`, `roomNote`, `amenities`, `descriptions`). Upgrade layout containers across `FrontDeskLayout` and the 4 portal pages to fluid, high-density responsive bounds (`max-w-[1600px]`), and refine optical alignments and spacing rhythm across all cards, drawers, and modal dialogs.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React, IBM Plex Sans Thai, Node.js Test Runner.

**Spec:** [docs/designsystem.md](file:///e:/MyWork/PJ_P3_1/keystay/docs/designsystem.md), [c:\Users\Miller-Wise\.gemini\config\plugins\superpowers\skills\frontend-design\SKILL.md](file:///c:/Users/Miller-Wise/.gemini/config/plugins/superpowers/skills/frontend-design/SKILL.md).

## Global Constraints

- **Strict Path A (Master Craftsman):** Honor existing project design tokens and IBM Plex Sans Thai typography 100%. Do not introduce unapproved arbitrary hex colors or rogue gradients.
- **Strict Bilingual Separation:** In Thai mode (`locale === 'th'`), no raw English strings must leak into room notes, room types, amenities, drawer specs, or headers. In English mode (`locale === 'en'`), natural English must render cleanly.
- **Swiss Numerals:** All prices, room numbers, counters, dates, and currency totals must strictly maintain `font-mono tabular-nums tracking-tight`.
- **Space Optimization:** Remove narrow fixed bottlenecks; expand viewport utilization to `max-w-[1600px]` with balanced, intentional mathematical paddings (`p-4`, `p-6`) avoiding empty deserts or cramped clutter.
- **Test Invariants:** All existing 58 unit tests must continue to pass, with new tests added verifying zero string leakage and spatial density.

## Review Focus

- When viewing Room Matrix in Thai mode, room notes like "Near garden pathway" or "Accessible room" must translate to natural Thai ("ใกล้ทางเดินสวนหย่อม", "ห้องพักสำหรับผู้พิการ").
- When opening `RoomDetailsDrawer` in Thai mode, room type ("Standard Room"), description, and amenities ("King Bed", "Free Wi-Fi") must display in Thai ("ห้องสแตนดาร์ด", "เตียงคิงไซส์", "ฟรี Wi-Fi").
- On wide displays (1440px - 1920px+), the main front-desk portal should seamlessly expand without giant unused whitespace on the left/right flanks.
- Switching language between TH and EN must immediately update all room cards, notes, drawers, tables, and settlement totals without page reload.
- Mobile and tablet viewports must remain responsive without horizontal overflow.

---

### Task 1: Bilingual Metadata Dictionaries & Localization Helper

**Files:**
- Modify: `apps/web/src/locales/th.ts`
- Modify: `apps/web/src/locales/en.ts`
- Create: `apps/web/src/lib/localizeMetadata.ts`
- Create: `apps/web/src/__tests__/metadata-localization.test.ts`

- [ ] **Step 1: Write the failing unit tests for room metadata localization**

Create `apps/web/src/__tests__/metadata-localization.test.ts`:
- Test that `localizeRoomType('Standard Room', 'th')` returns `"ห้องสแตนดาร์ด"` and `'en'` returns `"Standard Room"`.
- Test that `localizeRoomNote('Near garden pathway', 'th')` returns `"ใกล้ทางเดินสวนหย่อม"` and `'en'` returns `"Near garden pathway"`.
- Test that `localizeRoomDescription(desc, 'th')` translates known seed descriptions to Thai.
- Test that `localizeAmenity('King Bed', 'th')` returns `"เตียงคิงไซส์"`.
- Test fallback behavior: if an unmapped custom note is provided, it returns the original string gracefully.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/metadata-localization.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Add room types, notes, descriptions, and amenities dictionaries**

In `apps/web/src/locales/th.ts` and `apps/web/src/locales/en.ts`:
Add dictionary entries under:
- `roomTypes`:
  - `Standard Room`: `ห้องสแตนดาร์ด` / `Standard Room`
  - `Deluxe Sea View`: `ห้องดีลักซ์ ซีวิว` / `Deluxe Sea View`
  - `Executive Suite`: `ห้องเอ็กเซ็กคิวทีฟ สวีท` / `Executive Suite`
  - `Presidential Villa`: `ห้องเพรสซิเดนเชียล วิลล่า` / `Presidential Villa`
- `roomNotes`:
  - `Near garden pathway`: `ใกล้ทางเดินสวนหย่อม` / `Near garden pathway`
  - `Late check-in guest`: `แขกเช็คอินช่วงดึก` / `Late check-in guest`
  - `Priority checkout clean`: `ห้องทำความสะอาดเร่งด่วน` / `Priority checkout clean`
  - `Accessible room`: `ห้องพักสำหรับผู้ใช้วีลแชร์` / `Accessible room`
  - `Ocean front`: `ริมชายหาดวิวทะเล` / `Ocean front`
  - `Awaiting housekeeping inspect`: `รอแม่บ้านตรวจสอบรอบสุดท้าย` / `Awaiting housekeeping inspect`
  - `Balcony terrace`: `ระเบียงรับลมส่วนตัว` / `Balcony terrace`
  - `AC fan replacement`: `รอเปลี่ยนพัดลมแอร์` / `AC fan replacement`
  - `Quiet zone`: `โซนเงียบสงบ` / `Quiet zone`
  - `Sunset view`: `วิวพระอาทิตย์ตกดิน` / `Sunset view`
  - `VIP David Tan arriving tomorrow`: `แขก VIP David Tan เข้าพักพรุ่งนี้` / `VIP David Tan arriving tomorrow`
  - `Deep cleaning routine`: `รอบทำความสะอาดล้ำลึก` / `Deep cleaning routine`
  - `Corner executive`: `ห้องมุมสวีทวิวพาโนรามา` / `Corner executive`
  - `Executive lounge access`: `สิทธิเข้าใช้เอ็กเซ็กคิวทีฟเลานจ์` / `Executive lounge access`
  - `Plumbing maintenance`: `ช่างกำลังตรวจสอบระบบประปา` / `Plumbing maintenance`
  - `High floor panoramic`: `ชั้นสูงวิวเมืองมุมกว้าง` / `High floor panoramic`
  - `Presidential Penthouse East`: `เพนต์เฮาส์ปีกตะวันออก` / `Presidential Penthouse East`
- `amenities`:
  - `King Bed`: `เตียงคิงไซส์` / `King Bed`
  - `Free Wi-Fi`: `ฟรี Wi-Fi` / `Free Wi-Fi`
  - `City View`: `วิวเมือง` / `City View`
  - `Work Desk`: `โต๊ะทำงาน` / `Work Desk`
  - `Ocean View`: `วิวทะเล` / `Ocean View`
  - `Balcony`: `ระเบียงส่วนตัว` / `Balcony`
  - `Mini-bar`: `มินิบาร์` / `Mini-bar`
  - `Bathtub`: `อ่างอาบน้ำ` / `Bathtub`
  - `Living Room`: `ห้องนั่งเล่นแยกส่วน` / `Living Room`
  - `Espresso Machine`: `เครื่องชงกาแฟเอสเปรสโซ` / `Espresso Machine`
  - `Lounge Access`: `สิทธิเข้าเอ็กเซ็กคิวทีฟเลานจ์` / `Lounge Access`
  - `Private Pool`: `สระว่ายน้ำส่วนตัว` / `Private Pool`
  - `Butler Service`: `บริการบัตเลอร์ส่วนตัว` / `Butler Service`
  - `Kitchenette`: `มุมครัวส่วนตัว` / `Kitchenette`

- [ ] **Step 3: Implement `apps/web/src/lib/localizeMetadata.ts`**

Export:
- `localizeRoomType(name: string | undefined, locale: 'th' | 'en'): string`
- `localizeRoomNote(note: string | undefined, locale: 'th' | 'en'): string`
- `localizeRoomDescription(desc: string | undefined, locale: 'th' | 'en'): string`
- `localizeAmenity(amenity: string, locale: 'th' | 'en'): string`

- [ ] **Step 4: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/metadata-localization.test.ts`
Expected: PASS with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/locales/ apps/web/src/lib/localizeMetadata.ts apps/web/src/__tests__/metadata-localization.test.ts
git commit -m "feat(i18n): implement room metadata localization helper and bilingual dictionaries"
```

---

### Task 2: Page 1 — Room Matrix & Room Details Drawer (Space & Localization Polish)

**Files:**
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsDrawer.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Create: `apps/web/src/__tests__/room-matrix-space-localization.test.ts`

- [ ] **Step 1: Write failing tests for Page 1 space optimization & localization**

Create `apps/web/src/__tests__/room-matrix-space-localization.test.ts`:
- Test that `RoomCard` uses `localizeRoomType` and `localizeRoomNote` without showing raw English in Thai mode.
- Test that `RoomDetailsDrawer` localizes room type, notes, description, and amenities based on active locale.
- Test that `FrontDeskLayout` uses `max-w-[1600px]` instead of `max-w-7xl` (1280px bottleneck).
- Test that `RoomMatrixGrid` and `RoomMatrixPage` utilize responsive layout with optimized density.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-matrix-space-localization.test.ts`
Expected: FAIL.

- [ ] **Step 2: Update `FrontDeskLayout.tsx` for optimal viewport space utilization**

In `FrontDeskLayout.tsx`:
- Change header, navigation tabs, and main content containers from `max-w-7xl` to `max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8`.
- Remove dead whitespace while preserving clean, comfortable negative space on large front-desk displays.

- [ ] **Step 3: Update `RoomCard.tsx` to localize notes and room type names**

In `RoomCard.tsx`:
- Import `localizeRoomType` and `localizeRoomNote` from `@/lib/localizeMetadata`.
- Render `{localizeRoomType(roomType?.name, locale)}`.
- Render `{localizeRoomNote(room.notes, locale)}`.
- Tighten card vertical spacing: in compact mode, ensure clean optical balance so room status, room number, type, price, and note fit neatly without vertical bloat.

- [ ] **Step 4: Update `RoomDetailsDrawer.tsx` to localize all room details**

In `RoomDetailsDrawer.tsx`:
- Import `localizeRoomType`, `localizeRoomNote`, `localizeRoomDescription`, `localizeAmenity`.
- Display localized room type name, localized description, localized amenities tags, and localized notes.
- Ensure all labels, buttons, and capacity strings strictly follow active locale without mixed languages.

- [ ] **Step 5: Polish `RoomMatrixPage.tsx` search and filter bar density**

In `RoomMatrixPage.tsx`:
- Align filter chips, search bar, and density toggle into an ergonomically balanced toolbar that uses the horizontal space effectively without leaving empty voids.
- Ensure smooth responsiveness across small and ultra-wide screens.

- [ ] **Step 6: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-matrix-space-localization.test.ts apps/web/src/__tests__/room-matrix-density.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/front-desk/ apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/__tests__/room-matrix-space-localization.test.ts
git commit -m "feat(web): optimize Room Matrix space utilization and eliminate mixed language in cards and drawer"
```

---

### Task 3: Page 2 — Reservations Management & Booking Modals (Space & Localization Polish)

**Files:**
- Modify: `apps/web/src/pages/front-desk/ReservationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx`
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx`
- Create: `apps/web/src/__tests__/reservations-space-localization.test.ts`

- [ ] **Step 1: Write failing tests for Reservations page space and localization**

Create `apps/web/src/__tests__/reservations-space-localization.test.ts`:
- Test that `ReservationsPage` table utilizes fluid width and proper column padding without excessive blank space.
- Test that room types in booking lists and modals are localized via `localizeRoomType`.
- Test that `NewBookingModal` and `WalkInModal` labels, placeholders, and error messages strictly respect active locale.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/reservations-space-localization.test.ts`
Expected: FAIL.

- [ ] **Step 2: Polish `ReservationsPage.tsx` table density and search toolbar**

In `ReservationsPage.tsx`:
- Upgrade table spacing: replace narrow padding with balanced data-density styling (`py-3 px-4`, `font-mono tabular-nums` on reservation codes, dates, nights, and prices).
- Localize room type columns and guest display names.
- Provide a clean, balanced empty state when search filters return 0 results.

- [ ] **Step 3: Localize and polish `NewBookingModal.tsx` and `WalkInModal.tsx`**

In `NewBookingModal.tsx` and `WalkInModal.tsx`:
- Localize room type selector options using `localizeRoomType(rt.name, locale)`.
- Ensure all modal inputs (guest name, phone, email, dates, deposit, payment method) use translated labels and placeholders.
- Ensure form submission and validation messages render in the selected language.

- [ ] **Step 4: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/reservations-space-localization.test.ts apps/web/src/__tests__/reservations-guest-name.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/front-desk/ReservationsPage.tsx apps/web/src/components/front-desk/NewBookingModal.tsx apps/web/src/components/front-desk/WalkInModal.tsx apps/web/src/__tests__/reservations-space-localization.test.ts
git commit -m "feat(web): optimize Reservations page table density and enforce full modal localization"
```

---

### Task 4: Page 3 — Daily Operations Workflows (Space & Localization Polish)

**Files:**
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/CheckInModal.tsx`
- Modify: `apps/web/src/components/front-desk/CheckOutModal.tsx`
- Modify: `apps/web/src/components/front-desk/ExtendStayModal.tsx`
- Create: `apps/web/src/__tests__/daily-operations-space-localization.test.ts`

- [ ] **Step 1: Write failing tests for Daily Operations space and localization**

Create `apps/web/src/__tests__/daily-operations-space-localization.test.ts`:
- Test that arrivals and departures lists make optimal use of horizontal space without feeling sparse.
- Test that room types and dates are formatted cleanly with `font-mono tabular-nums` and localized labels.
- Test that `CheckInModal`, `CheckOutModal`, and `ExtendStayModal` display 100% localized copy with zero English leaks in Thai mode.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/daily-operations-space-localization.test.ts`
Expected: FAIL.

- [ ] **Step 2: Optimize `DailyOperationsPage.tsx` queue card and table density**

In `DailyOperationsPage.tsx`:
- Refine Arrivals and Departures tables: tighten row spacing, optimize action button layout (`เช็คอิน`, `เช็คเอาท์`, `ต่อเวลา`), and ensure guest details and room badges align optically.
- Localize room types and date range formats.
- Ensure count badges (e.g. `รอเช็คอินวันนี้ (2)`, `รอเช็คเอาท์วันนี้ (3)`) use `font-mono` numerals and clean status styling.

- [ ] **Step 3: Polish Modals (Check-In, Check-Out Key Return, Extend Stay)**

In `CheckInModal.tsx`, `CheckOutModal.tsx`, `ExtendStayModal.tsx`:
- Localize room type names and key deposit notices.
- Ensure calculations (extra nights, nightly rate, key card deposit refund) display with `font-mono tabular-nums`.
- Verify smooth backdrop transitions and responsive modal sizing on all viewports.

- [ ] **Step 4: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/daily-operations-space-localization.test.ts apps/web/src/__tests__/operational-modals.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/front-desk/DailyOperationsPage.tsx apps/web/src/components/front-desk/CheckInModal.tsx apps/web/src/components/front-desk/CheckOutModal.tsx apps/web/src/components/front-desk/ExtendStayModal.tsx apps/web/src/__tests__/daily-operations-space-localization.test.ts
git commit -m "feat(web): polish Daily Operations layout density and complete operational modals localization"
```

---

### Task 5: Page 4 — Cashier Folio Split-Screen & Tax Invoice (Space & Polish)

**Files:**
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Modify: `apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx`
- Modify: `apps/web/src/components/front-desk/AddExtraChargeModal.tsx`
- Create: `apps/web/src/__tests__/cashier-folio-space-localization.test.ts`

- [ ] **Step 1: Write failing tests for Cashier Folio space and localization**

Create `apps/web/src/__tests__/cashier-folio-space-localization.test.ts`:
- Test that split-screen layout (left itemized charges: 60-65% width, right cashier settlement: 35-40% width) utilizes screen space cleanly.
- Test that extra charge item categories (Minibar, Laundry, Room Service, Damage) and tax invoice receipts are 100% localized.
- Test that zero `NaN` occurs across all item calculations and settlement amounts.

Run: `pnpm dlx tsx --test apps/web/src/__tests__/cashier-folio-space-localization.test.ts`
Expected: FAIL.

- [ ] **Step 2: Polish `FolioSplitScreen.tsx` grid balance and typography**

In `FolioSplitScreen.tsx`:
- Use balanced two-column asymmetric layout (`lg:grid-cols-12` with 7 cols for itemized folio and 5 cols for cashier settlement).
- Enhance itemized charges table: hairline dividers, `font-mono tabular-nums` on quantities and prices, clear category badges.
- Localize item descriptions (e.g. Minibar items, Deluxe Sea View nights) cleanly.

- [ ] **Step 3: Polish `ReceiptTaxInvoiceModal.tsx` and `AddExtraChargeModal.tsx`**

In `ReceiptTaxInvoiceModal.tsx`:
- Enforce crisp Thai Tax Invoice standards (`ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ`) with full bilingual toggle support.
- Ensure print media styles (`@media print`) fit standard A4 / thermal paper without awkward overflow.

In `AddExtraChargeModal.tsx`:
- Localize categories and item selection.
- Ensure quantity and unit price inputs calculate total dynamically without any NaN.

- [ ] **Step 4: Run tests and verify**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/cashier-folio-space-localization.test.ts apps/web/src/__tests__/cashier-folio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/front-desk/CashierFolioPage.tsx apps/web/src/components/front-desk/FolioSplitScreen.tsx apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx apps/web/src/components/front-desk/AddExtraChargeModal.tsx apps/web/src/__tests__/cashier-folio-space-localization.test.ts
git commit -m "feat(web): polish Cashier Folio split-screen spacing and finalize tax invoice localization"
```

---

### Task 6: Full Integration Verification, Test Suite & Production Build

**Files:**
- Test: All suites in `apps/web/src/__tests__/*.test.ts` and `services/housekeeping/src/__tests__/*.test.ts`

- [ ] **Step 1: Run all unit tests across frontend and backend**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/*.test.ts services/housekeeping/src/__tests__/*.test.ts`
Expected: All tests PASS with 0 failures.

- [ ] **Step 2: Run TypeScript typecheck across monorepo**

Run: `pnpm dlx turbo run typecheck`
Expected: 0 errors across all packages.

- [ ] **Step 3: Run Vite production build**

Run: `pnpm --filter @keystay/web build`
Expected: Clean production build with optimized assets.

- [ ] **Step 4: Commit release tag**

```bash
git commit --allow-empty -m "chore(release): complete front-desk space optimization and complete bilingual localization"
```

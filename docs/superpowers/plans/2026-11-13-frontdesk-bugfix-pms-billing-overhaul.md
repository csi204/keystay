# Front Desk Bugfix, Light-Mode Contrast, Slip Sync & PMS Billing Overhaul Plan

> **For agentic workers:** Use subagent-driven development. Follow each task's exact file paths, verification commands, and constraints (`เช็คเอาต์`, zero raw emojis, `min-h-[44px]` primary buttons, `font-mono tabular-nums` currency).

**Goal:** Resolve all 8 critical Front Desk & Cashier issues reported in live testing cleanly and permanently:
1. Eliminate Night Audit (Dark Mode) and standardize all UI surfaces, modals, and inputs onto crisp high-contrast Light Mode.
2. Prevent auto-refresh from wiping active form inputs or closing/resetting open modals by pausing refresh timers & visibility refetches during active edits/open dialogs.
3. Prevent Walk-In and Reservation creation from overwriting the user-typed guest name with `"Natthapong Techasorn"` when matching seed phone/ID numbers.
4. Fix Payment Slip persistence & synchronization across `WalkInModal`, `RoomDetailsModal`, `SlipViewerModal`, and `RoomMatrixPage`.
5. Remove the duplicate `"ยกเลิกการจอง"` button inside `RoomDetailsModal`.
6. Enforce strict PMS billing separation: initial room nights (+7% VAT) + keycard deposit are pre-paid (`ชำระแล้ว`); stay extensions and extra charges/minibar (+7% VAT) are added as separate unpaid items (`ค้างชำระ`); check-out nets only unpaid extras/extensions against the keycard deposit, shows deposit refund and hides payment methods when balance <= 0; Billing History always displays VAT-inclusive Net Total (`ยอดสุทธิ`).
7. Keep long Cashier bill & item lists bounded with internal scrolling (`overflow-y-auto`) without stretching outer page height.
8. Add 10-item pagination and Day/Month/Year (`วัน / เดือน / ปี`) date filters to both "รายการจองทั้งหมด" and "ประวัติบิลและการชำระ".

---

### Task 1: Reservation Service — Guest Name Preservation & Extension Metadata
**Files:**
- Modify: `services/reservation/src/routes/reservations.ts`
- Test: `services/reservation/src/__tests__/reservations-walkin-extend.test.ts` (or existing test suite in `services/reservation`)

**Steps:**
1. Inspect existing tests in `services/reservation` to follow the exact test runner pattern (`node --test` / `vitest`).
2. In `POST /reservations/walk-in` (lines 332–378) and `POST /reservations` (lines 633–676):
   - When `data.guestId` is NOT explicitly supplied:
     - Look up existing guest by `idCardNumber` first, then `phone`, then `email`.
     - **Critical rule:** Only reuse that `guestRecord` if the normalized typed `guestName` matches `${guestRecord.first_name} ${guestRecord.last_name}`. If the user typed a different guest name (e.g., `"สมชาย ใจดี"` vs seeded `"Natthapong Techasorn"` on test phone `081-234-5678`), **DO NOT** reuse `Natthapong Techasorn`; create a fresh `guests` record with the typed `firstName`, `lastName`, `phone`, `email`, `idCardNumber`!
     - If `guestId` IS explicitly supplied, use it directly as before.
3. In `handleExtendStay` (`POST/PUT /reservations/:id/extend-stay`):
   - Compute `extraNights = Math.max(1, Math.round((newCheckOutTime - oldCheckOutTime) / 86400000))` and `extensionSubtotal = Number((nightlyRate * extraNights).toFixed(2))`.
   - Return `{ ...mapReservation(updated), previousCheckOutDate: existing.check_out_date, extraNights, extensionSubtotal, nightlyRate }` in response `data`.
4. Run `services/reservation` typecheck & tests.

---

### Task 2: Billing Service & Shared Folio Summary — Pre-paid Item vs Unpaid Extra/Extension Math
**Files:**
- Modify: `services/billing/schema.sql`
- Modify: `services/billing/src/types.ts`
- Modify: `services/billing/src/validators/billing.validator.ts`
- Modify: `services/billing/src/routes/bills.ts`
- Modify: `apps/web/src/hooks/useBilling.ts`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Modify: `apps/web/src/lib/folioReconciliation.ts`
- Test: `services/billing` & `apps/web/src/__tests__/folio-math.test.ts`

**Steps:**
1. Inspect existing tests in `services/billing/src/__tests__` (if present) and `apps/web/src/__tests__`.
2. Update `bill_items` schema & billing route (`services/billing`):
   - Add `is_paid INTEGER NOT NULL DEFAULT 0` to `schema.sql`, and add a safe `ALTER TABLE bill_items ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0` guard (caught cleanly if column already exists) on startup/query or in a helper `ensureIsPaidColumn(db)` so local Miniflare SQLite DBs without fresh reset still work seamlessly.
   - Expose `isPaid: Boolean(row.is_paid)` in `mapBillItem`.
   - Allow `isPaid?: boolean` in `createBillSchema` items & `addBillItemSchema` (default `false` for `POST /bills/:id/items`).
   - Add `resolvePaymentMethod(db, rawMethod, rawMethodId)` helper so `cash -> pm-cash`, `transfer -> pm-transfer`, `credit_card -> pm-card`, `qr_promptpay -> pm-qr` works identically in BOTH `POST /bills` (initial paid bill) AND `POST /bills/:id/pay` (preventing FK constraint failure from `'upfront_checkin'` or `'cash'`).
   - In `POST /bills` and `recalculateBill`:
     - Respect explicit `serviceChargeRate = 0` (`data.serviceChargeRate !== undefined ? data.serviceChargeRate : 0.10` if needed by legacy backend tests, and in `recalculateBill` track `service_charge === 0` without resetting it to `0.10`!). Note: check if existing tests require default `0.10` or `0.00`; ensure frontend `POST /api/bills` always passes `serviceChargeRate: 0`.
     - When bill items include `isPaid` flags: `unpaidSubtotal = sum(items where !isPaid)`, `unpaidTax = unpaidSubtotal * taxRate`, `paidSubtotal = sum(items where isPaid)`, `paidTax = paidSubtotal * taxRate`. Update `amount_paid` accurately and compute `amount_due = Math.max(0, unpaidTotalWithVat - depositDeducted)` (while preserving `total_amount = totalSubtotal + totalTax + serviceCharge` for Billing History Net Total!).
     - In `DELETE /bills/:id/items/:itemId`: allow deleting unpaid extra items (`item.is_paid === 0`) even if initial room charge was paid (`bill.status === 'unpaid'` or `'partially_paid'`). After deletion, recalculate bill (`status = 'paid'` if no unpaid items remain!).
3. Update `calculateFolioSummary` in `apps/web/src/components/front-desk/FolioSplitScreen.tsx` + `BillItem` interface in `useBilling.ts`:
   - Accept `BillItem.isPaid?: boolean` and optional `reservationPaymentStatus?: 'paid' | 'unpaid'`.
   - Classify each item as paid if `item.isPaid === true` OR (`reservationPaymentStatus === 'paid'` AND initial `room_charge` item without extension tag).
   - Compute:
     - `subtotal`, `vat` (7% of unpaid subtotal), `totalWithVat` (total bill net amount WITH VAT across all items, for Billing History Net Total!),
     - `unpaidSubtotal`, `unpaidVat` (7% of `unpaidSubtotal`), `unpaidTotalWithVat`,
     - `paidTotalWithVat` (pre-paid room + 7% VAT),
     - `depositDeduction`,
     - `netDue = Math.max(0, round2(unpaidTotalWithVat - depositDeduction))`,
     - `refundAmount = Math.max(0, round2(depositDeduction - unpaidTotalWithVat))`,
     - `hasUnpaidCharges = unpaidItems.length > 0`.
4. Fix `apps/web/src/lib/folioReconciliation.ts` & `CashierFolioPage.tsx` (`reconcileLiveFolios`):
   - STOP overwriting all `room_charge` item descriptions to `(${matchingRes.totalNights} คืน)`! Preserve separate initial room items (`ค่าห้องพักเบื้องต้น`) and separate extension items (`ขยายเวลาเข้าพัก`).

---

### Task 3: Remove Dark Mode Completely & Polish Light Mode Contrast Across Front Desk
**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/context/ThemeContext.tsx`
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- Modify: `apps/web/src/components/common/MaskedInputs.tsx`
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx`
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx`
- Modify: `apps/web/src/components/front-desk/SlipViewerModal.tsx`
- Modify: `apps/web/src/components/front-desk/AddExtraChargeModal.tsx`
- Modify: `apps/web/src/components/front-desk/CheckOutModal.tsx`

**Steps:**
1. Lock Light Mode globally:
   - In `ThemeContext.tsx`, default and lock `theme = 'light'`, remove `'dark'` from `document.documentElement.classList` on mount, clear `'keystay_theme'` from `localStorage`.
   - Remove `.dark` CSS block in `globals.css` and remove `darkMode: 'class'` in `tailwind.config.ts`.
   - Remove `โหมดกะดึก (Night Audit)` button from `FrontDeskLayout.tsx` (both collapsed and expanded sidebar).
2. Clean up all `dark:...` classes across listed components and ensure crisp high contrast everywhere:
   - Inputs & Selects (`MaskedInputs.tsx`, `WalkInModal.tsx`, `NewBookingModal.tsx`, `RoomDetailsModal.tsx`, `AddExtraChargeModal.tsx`, `DailyOperationsPage.tsx`, etc.): solid `bg-white text-slate-900 placeholder:text-slate-400 border-slate-300`.
   - `RoomCard.tsx`: enhance `"ติดจอง"` badge & guest badge contrast (`bg-amber-100 text-amber-900 border-amber-300`), and compact yellow/amber room notes (`line-clamp-1` / compact pill `text-xs py-1 px-2`) so cards have uniform height and don't stretch excessively.
   - `DailyOperationsPage.tsx`: crisp `text-slate-900` headings and `text-slate-600` subtitles over `#F8FAFC` / `bg-white` surfaces.
   - `AddExtraChargeModal.tsx`: readable dark text labels (`text-slate-800`) and visible borders on white background.

---

### Task 4: Pause Auto-Refresh During Active Input/Open Modals & Fix Walk-In/Slip Persistence
**Files:**
- Create: `apps/web/src/hooks/useAutoRefresh.ts`
- Modify: `apps/web/src/hooks/useReservations.ts`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- Modify: `apps/web/src/components/front-desk/SlipViewerModal.tsx`
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx`

**Steps:**
1. Create `useAutoRefresh({ onRefresh, intervalMs = 60000, paused })`:
   - Checks both `paused` (true when any modal/drawer is open on the page) AND `isActivelyEditing()` (`document.activeElement` is `INPUT | TEXTAREA | SELECT | [contenteditable]`).
   - Also pauses `visibilitychange` auto-refetch while `paused || isActivelyEditing()`.
   - When `paused` switches from `true` back to `false` (or `resetTimer()` is called), resets the countdown from `intervalMs` so it never fires immediately after closing a modal.
   - Use `useAutoRefresh` in `RoomMatrixPage.tsx`, `DailyOperationsPage.tsx`, and `CashierFolioPage.tsx`.
2. Fix `RoomDetailsModal.tsx` state reset bug:
   - Guard the form initialization `useEffect` (lines 375–395) with a `wasOpenRef` / `[isOpen, room?.id]` check so it ONLY initializes when opening (`!wasOpen && isOpen`) or switching rooms — NEVER when background `roomType` / `room?.status` updates.
3. Fix Walk-In & Payment Slip persistence:
   - In `useReservations.ts`:
     - Extend `walkInCheckIn` params with `paymentSlipUrl?: string; paymentSlipRef?: string;`.
     - Add `verifyPaymentSlip(id, data)` calling `POST /api/reservations/${id}/slip` (and refreshing reservations).
     - Ensure initial auto-created bill in `walkInCheckIn` & `createReservation` sends `serviceChargeRate: 0`, `paymentMethod`, `status: 'paid'`, and marks initial room charge item `{ category: 'room', itemType: 'room_charge', description: ..., quantity: nights, unitPrice: nightlyRate, isPaid: true }`.
   - In `RoomDetailsModal.tsx` lines 562–576: pass `paymentSlipUrl`, `paymentSlipRef`, and `nightlyRate: roomType?.basePrice ? Number(roomType.basePrice) : undefined` inside `onWalkInCheckIn({...})`.
   - In `RoomMatrixPage.tsx`: pass `onVerifySlip={verifyPaymentSlip}` to `<RoomDetailsModal>` and update `activeReservation` / `currentReservation` cleanly on refresh.
   - Verify `DailyOperationsPage.tsx` `<RapidWalkInModal>` opens smoothly without any runtime error or white screen, and passes `paymentSlipUrl` / `paymentSlipRef`.

---

### Task 5: Remove Duplicate Cancel Button & Implement Separate Extension/Checkout Deposit Flow + Billing Net Total
**Files:**
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- Modify: `apps/web/src/components/front-desk/ExtendStayModal.tsx`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Modify: `apps/web/src/components/front-desk/CheckOutModal.tsx`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`

**Steps:**
1. In `RoomDetailsModal.tsx`:
   - Remove the duplicate `"ยกเลิกการจอง"` button inside the reserved guest card (lines 806–815). Keep ONLY ONE `"ยกเลิกการจอง"` button in the footer beside `"เช็คอิน"`.
2. In `ExtendStayModal.tsx`:
   - When extension succeeds: find the reservation's bill via `GET /api/bills/by-reservation/${reservation.id}` (creating it with the pre-paid initial stay item marked `isPaid: true` if none exists yet!), then `POST /api/bills/${bill.id}/items` to add a **new separate unpaid item**:
     - `description`: `ขยายเวลาเข้าพัก (+${extraNights} คืน)` (localized in EN: `Extended Stay (+${extraNights} nights)`), `category: 'room'`, `itemType: 'room_charge'`, `quantity: extraNights`, `unitPrice: nightlyRate`, `isPaid: false`.
3. In `FolioSplitScreen.tsx` & `CheckOutModal.tsx`:
   - Visually badge pre-paid items with `ชำระแล้ว` (`bg-emerald-50 text-emerald-700 border-emerald-200`) and new unpaid items (`ขยายเวลาเข้าพัก`, `มินิบาร์`, etc.) with `ค้างชำระ` (`bg-amber-50 text-amber-800 border-amber-200`).
   - Show breakdown strictly over UNPAID items:
     - `ยอดรายการค้างชำระ (ก่อน VAT)` (`summary.unpaidSubtotal`)
     - `ภาษีมูลค่าเพิ่ม 7%` (`summary.unpaidVat`)
     - `รวมค่าใช้จ่ายใหม่สุทธิ` (`summary.unpaidTotalWithVat`)
     - `หักเงินมัดจำ (คีย์การ์ด)` (`- summary.depositDeduction` when keycard returned)
   - Hero settlement banner:
     - If `summary.netDue > 0`: show `ยอดค้างชำระสุทธิ: ฿...` AND **show** payment method selector (`เงินสด / โอน / บัตรเครดิต / QR`).
     - If `summary.netDue === 0`: show `คืนเงินมัดจำ${summary.refundAmount === depositNum ? 'เต็มจำนวน' : 'คงเหลือ'}: ฿${summary.refundAmount}` AND **HIDE all payment method selector buttons** (both in CheckOutModal body & ActionConfirmModal summaryDetails!).
4. In `DailyOperationsPage.tsx` Billing History (`activeSubTab === 'billing'`):
   - Replace `parseFloat(b.netAmount || b.subtotal || '0')` (line 586) with the true VAT-inclusive Net Total (`Number(b.totalAmount) > 0 ? Number(b.totalAmount) : calculateFolioSummary(b.items, 0, b.subtotal).totalWithVat`) so Billing History ALWAYS shows VAT-inclusive Net Total (`ยอดสุทธิรวม VAT`).

---

### Task 6: Cashier Bounded Internal Scroll + Pagination (10/page) & Day/Month/Year Filters
**Files:**
- Create: `apps/web/src/components/common/TableDateFilter.tsx`
- Create: `apps/web/src/components/common/PaginationBar.tsx`
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`

**Steps:**
1. In `CashierFolioPage.tsx` & `FolioSplitScreen.tsx`:
   - Constrain left Bills column list to `max-h-[calc(100vh-260px)] overflow-y-auto` and right Folio items table wrapper inside `FolioSplitScreen.tsx` to `max-h-[340px] overflow-y-auto` so neither column pushes outer section or page height downward.
2. Create `TableDateFilter.tsx` (`วัน / เดือน / ปี` Day 1–31, Month Jan–Dec / ม.ค.–ธ.ค., Year BE e.g. 2568/2569/2570 + `ล้างตัวกรอง` button) and helper `matchesDateFilter(isoOrYmdDate, { day, month, year })`.
3. Create `PaginationBar.tsx` (`pageSize = 10`, showing `แสดง X–Y จาก Z รายการ`, Prev/Next buttons, page number pills, `min-h-[36px]`).
4. Wire both into:
   - `RoomMatrixPage.tsx` `"รายการจองทั้งหมด"` table (`filteredReservations` filtered by `checkInDate` or `createdAt` + paginated 10/page).
   - `DailyOperationsPage.tsx` `"ประวัติบิลและการชำระ"` table (`filteredBills` filtered by `createdAt` + paginated 10/page).

---

### Task 7: Verification — Tests, Typecheck, Build, Live Server & DevTools Browser Inspection
**Steps:**
1. Run `pnpm --filter @keystay/web typecheck` and `pnpm --filter @keystay/web test:run`.
2. Run `pnpm --filter @keystay/service-reservation test` and `pnpm --filter @keystay/service-billing test` (or `typecheck`).
3. Start backend & Vite web dev servers, log in as Front Desk, and verify in real Chrome browser (`browser` subagent) + test API calls that all 8 issues are cleanly fixed without visual contrast regressions or console errors.


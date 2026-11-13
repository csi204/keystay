# Front Desk Booking Channels, Slip Verification & Extra Amenities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement front-desk booking channels (`walk_in`, `phone`, `facebook`), slip verification workflow with Facebook Page banner and lightbox preview, and dedicated extra amenities request modal with automated folio roll-up into billing.

**Architecture:** Extend `db_reservation` with channel, slip, and amenity request tables; expose endpoints in `@keystay/reservation` with billing folio integration; upgrade Front Desk React modals (`NewBookingModal`, `RoomDetailsModal`) and create `RequestAmenitiesModal` adhering to strict anti-slop Lucide icon enterprise styling.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers / D1 SQLite, React 19, Tailwind CSS, Lucide Icons, Mocha, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-11-frontdesk-channels-and-amenities-design.md` and `docs/FEATURE_SPEC_DYNAMIC_PRICING_AND_EXTRAS.md`

## Global Constraints
- Strictly zero AI slop / no informal emojis; use Lucide enterprise icons only (`Phone`, `MessageSquare`, `Receipt`, `UploadCloud`, `CheckCircle2`, `BedDouble`).
- Single verification point rule: when `phone` or `facebook` channel is selected, render official notice: *"ลูกค้าต้องส่งสลิปยืนยันเข้าเพจ Facebook ของโรงแรม"*.
- Zero folio charge rule: free amenities (unit price = 0 THB) must NEVER create records in `bill_items` or modify folio amounts.
- Paid amenities rule: paid amenities (unit price > 0 THB) must create bill items, auto-recalculating subtotal, VAT 7%, and grand total.
- Git flow constraint: all commits must live on feature branch `feat/frontdesk-channels-and-amenities`.

## Review Focus
1. Phone booking without slip: Staff creates phone reservation with status `unpaid`; room is reserved and no slip URL is required at creation time.
2. Direct slip attachment at creation: Staff creates booking with phone/facebook, selects an image file, and immediately previews and attaches it, marking `payment_status: 'paid'`.
3. Non-image file handling: Selecting a non-image file in the file picker triggers an inline validation error rather than crashing the preview lightbox.
4. Free amenity request: Requesting 2 extra pillows (0 THB) creates an amenity request log but leaves folio balance completely untouched.
5. Paid amenity quantity calculation: Requesting 2 extra beds (300 THB/night each) adds 600 THB to folio subtotal and adds 42 THB (7% VAT) to total tax.

---

### Task 1: Git Branch Setup & Schema Migration for Booking Channels, Slips & Amenities

**Files:**
- Create: `services/reservation/migrations/0008_booking_channels_and_slips.sql`
- Modify: `services/reservation/schema.sql:20-50`
- Modify: `scripts/run-mocha.ts:180-230`
- Test: `tests/mocha/reservation-schema-channels.test.ts`

**Interfaces:**
- Produces: `reservations` table columns (`booking_source`, `payment_status`, `payment_slip_url`, `payment_slip_ref`, `payment_verified_at`, `payment_verified_by`) and `reservation_amenity_requests` table.

- [ ] **Step 1: Create feature branch**
```bash
git checkout -b feat/frontdesk-channels-and-amenities
```

- [ ] **Step 2: Write the failing schema test**
Create `tests/mocha/reservation-schema-channels.test.ts` asserting columns exist on `reservations` table and `reservation_amenity_requests` table can insert valid records.

- [ ] **Step 3: Run test to verify it fails**
Run: `pnpm test`
Expected: FAIL due to missing columns or table.

- [ ] **Step 4: Implement schema updates**
Update `services/reservation/schema.sql` and `scripts/run-mocha.ts` (in-memory sqlite test initialization) to add:
- `booking_source TEXT NOT NULL DEFAULT 'walk_in'`
- `payment_status TEXT NOT NULL DEFAULT 'unpaid'`
- `payment_slip_url TEXT`
- `payment_slip_ref TEXT`
- `payment_verified_at TEXT`
- `payment_verified_by TEXT`
- Table `reservation_amenity_requests`

- [ ] **Step 5: Run test to verify it passes**
Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add services/reservation/schema.sql scripts/run-mocha.ts tests/mocha/reservation-schema-channels.test.ts
git commit -m "feat(reservation): add schema migration for booking channels, slips, and amenity requests"
```

---

### Task 2: Backend API Endpoints for Booking Channels, Slips & Amenity Requests

**Files:**
- Modify: `services/reservation/src/index.ts`
- Modify: `tests/mocha/reservation.test.ts`
- Modify: `tests/mocha/dynamic-pricing-and-extras.test.ts`

**Interfaces:**
- Consumes: `reservations` table, `reservation_amenity_requests` table.
- Produces:
  - `POST /reservations/walk-in` & `POST /reservations`: accepts `booking_source`, `payment_status`, `payment_slip_ref`, `payment_slip_url`.
  - `PATCH /reservations/:id/payment`: updates `payment_status`, `payment_slip_url`, `payment_slip_ref`, `payment_verified_at`.
  - `GET /reservations/:id/amenities`: lists amenity requests for reservation.
  - `POST /reservations/:id/amenities`: records amenity request and if `is_chargeable = 1`, dispatches folio charge item.

- [ ] **Step 1: Write failing API tests**
Add test cases in `tests/mocha/reservation.test.ts` testing:
1. Walk-in and advance booking with `booking_source: 'phone'` and `payment_status: 'unpaid'`.
2. `PATCH /reservations/:id/payment` transitioning payment status to `paid` with slip ref and slip url.
3. `POST /reservations/:id/amenities` requesting free amenity (is_chargeable: 0, unit_price: 0).
4. `POST /reservations/:id/amenities` requesting paid amenity (is_chargeable: 1, unit_price: 300) and returning bill integration payload.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test`
Expected: FAIL on new endpoint assertions.

- [ ] **Step 3: Implement endpoint logic in `services/reservation/src/index.ts`**
Add request handlers and route definitions for channel recording, slip attachment, and amenity requests.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm test`
Expected: PASS (All tests passing)

- [ ] **Step 5: Commit**
```bash
git add services/reservation/src/index.ts tests/mocha/reservation.test.ts tests/mocha/dynamic-pricing-and-extras.test.ts
git commit -m "feat(reservation): implement booking channels, slip attachment, and amenity requests API"
```

---

### Task 3: Front Desk UI - Booking Channels & Slip Attachment in Reservation Modals

**Files:**
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:620-770`
- Create: `apps/web/src/__tests__/booking-channels-and-slips-modal.test.ts`

**Interfaces:**
- Consumes: Booking form inputs.
- Produces: `bookingSource`, `paymentSlipRef`, `paymentSlipUrl`, `paymentStatus` passed to `onSubmit`.

- [ ] **Step 1: Write failing UI unit tests**
Create `apps/web/src/__tests__/booking-channels-and-slips-modal.test.ts` testing:
1. Renders booking channel selector with `walk_in`, `phone`, `facebook`.
2. When `phone` or `facebook` is selected, renders the single verification notice banner.
3. Supports attaching file and entering bank reference.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter web test`
Expected: FAIL

- [ ] **Step 3: Implement UI in `NewBookingModal.tsx` and `RoomDetailsModal.tsx`**
- Add channel selector with Lucide icons (`UserCheck` for walk-in, `Phone` for phone, `MessageSquare` for Facebook).
- Add amber banner: *"ลูกค้าต้องส่งสลิปยืนยันเข้าเพจ Facebook ของโรงแรม"*.
- Add file picker with instant client-side Base64 DataURL preview and remove button.
- Add bank transaction reference input field (`payment_slip_ref`).

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/NewBookingModal.tsx apps/web/src/components/front-desk/RoomDetailsModal.tsx apps/web/src/__tests__/booking-channels-and-slips-modal.test.ts
git commit -m "feat(web): add booking channel selection and slip attachment to reservation modals"
```

---

### Task 4: Front Desk UI - Slip Viewer & Verification Lightbox in Room Details

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:260-460`
- Create: `apps/web/src/components/front-desk/SlipViewerModal.tsx`
- Create: `apps/web/src/__tests__/slip-viewer-modal.test.ts`

**Interfaces:**
- Consumes: `currentReservation.paymentSlipUrl`, `currentReservation.paymentSlipRef`, `currentReservation.paymentStatus`.
- Produces: `onVerifySlip(slipRef, slipUrl)` callback.

- [ ] **Step 1: Write failing UI unit test**
Create `apps/web/src/__tests__/slip-viewer-modal.test.ts` testing:
1. Renders slip image preview with zoom/lightbox capability.
2. Displays bank transaction reference and payment status badge.
3. Provides "ยืนยันการชำระเงิน (Verify Payment)" button for unpaid reservations.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter web test`
Expected: FAIL

- [ ] **Step 3: Implement `SlipViewerModal.tsx` and integrate into `RoomDetailsModal.tsx`**
- Show Channel Badge (`Walk-In` / `Phone` / `Facebook`) and Payment Badge (`Paid` / `Unpaid`) in Room Details Header.
- Add button "ดูหลักฐานสลิป / แนบสลิป" opening `SlipViewerModal`.
- Allow staff to upload/replace slip or enter bank ref, then click verify to mark `paid`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/SlipViewerModal.tsx apps/web/src/components/front-desk/RoomDetailsModal.tsx apps/web/src/__tests__/slip-viewer-modal.test.ts
git commit -m "feat(web): add slip viewer modal and verification actions to room details"
```

---

### Task 5: Front Desk UI - Dedicated Request Amenities Modal & Folio Integration

**Files:**
- Create: `apps/web/src/components/front-desk/RequestAmenitiesModal.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:400-435`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx:120-220`
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Create: `apps/web/src/__tests__/request-amenities-modal.test.ts`

**Interfaces:**
- Consumes: Room ID, Reservation ID, Bill ID, `onAddCharge` handler.
- Produces: Amenity request submission with automatic folio bill item dispatch for chargeable items.

- [ ] **Step 1: Write failing UI unit test**
Create `apps/web/src/__tests__/request-amenities-modal.test.ts` testing:
1. Renders free amenities tab (Extra Pillow, Extra Towel, Hairdryer - 0 THB) with "แจ้งแม่บ้าน ไม่ลงบิล".
2. Renders paid amenities tab (Extra Bed - 300 THB/night, Premium Toiletries - 150 THB) with "ลงบิล Folio".
3. Submitting a paid amenity triggers folio bill item creation with accurate quantity and unit price.
4. Submitting a free amenity does NOT invoke folio bill creation.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter web test`
Expected: FAIL

- [ ] **Step 3: Implement `RequestAmenitiesModal.tsx` and connect to `RoomDetailsModal` & `FolioSplitScreen`**
- Implement tabs: "ของใช้บริการฟรี (0 ฿)" and "บริการเสริมคิดเงิน".
- Quantity selectors and notes field.
- Auto-calculate total amenity cost.
- Wire up trigger in `RoomDetailsModal` (new button "ขอของใช้เสริม (Amenities)") and `FolioSplitScreen` (button "ขอของใช้เสริม").

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/RequestAmenitiesModal.tsx apps/web/src/components/front-desk/RoomDetailsModal.tsx apps/web/src/components/front-desk/FolioSplitScreen.tsx apps/web/src/pages/front-desk/CashierFolioPage.tsx apps/web/src/__tests__/request-amenities-modal.test.ts
git commit -m "feat(web): implement dedicated request amenities modal and folio billing roll-up"
```

---

### Task 6: End-to-End Verification, Full Test Suite Execution & Monorepo Build Check

**Files:**
- Modify: Documentation / Readme if necessary.
- Test: Full monorepo test suite.

**Interfaces:**
- Verifies all backend Mocha tests, frontend Vitest tests, and TypeScript typechecking pass with 0 errors.

- [ ] **Step 1: Run full Mocha test suite**
Run: `pnpm test`
Expected: All 152+ tests passing.

- [ ] **Step 2: Run all web frontend tests**
Run: `pnpm --filter web test`
Expected: 100% passing tests.

- [ ] **Step 3: Run monorepo typecheck**
Run: `pnpm typecheck`
Expected: 11 of 11 packages typecheck passed with 0 errors.

- [ ] **Step 4: Commit any remaining adjustments**
```bash
git commit -m "chore: finalize front-desk channels, slips, and extra amenities verification"
```


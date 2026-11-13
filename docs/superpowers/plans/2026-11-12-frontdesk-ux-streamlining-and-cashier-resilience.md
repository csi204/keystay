# Front Desk UX Streamlining, Live Folio Auto-Sync & Extra Charge Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This plan resolves the 4 core problems identified in live front-desk testing:
1. **Add Extra Charge Validation Failure:** Fixes payload mismatch between frontend (`category`) and backend (`itemType: z.enum(...)`) in `services/billing`.
2. **WYSIWYG Room Notes Editing:** Fixes language snapback from Thai to English upon clicking edit or saving in `RoomDetailsModal.tsx`.
3. **Live Folio Auto-Sync & Dummy Bill Elimination:** Reconciles active in-house reservations (e.g. room 101 "อัศวิน Customer") with live folios, eliminating stale $0 "paid" dummy bills and keeping real guest names and outstanding balances.
4. **Information Architecture & Workflow Streamlining:** Eliminates redundant buttons and ambiguous naming across Sidebar and Daily Operations, cleanly dividing Front Desk into (1) Room Matrix, (2) Check-In & Check-Out, and (3) Cashier & Folio Ledger.

---

## User Decisions & Invariants (from Brainstorming / Grill-Me)

> [!IMPORTANT]
> **Key Architectural Decisions Agreed with User:**
> 1. **Sidebar Navigation (3 Distinct Roles):**
>    - Menu 1: **"ผังห้องพัก" (Room Matrix)** — overview of all rooms and floor layout.
>    - Menu 2: **"เช็คอิน & เช็คเอาต์" (Check-In & Check-Out)** — front desk frontline counter (Today's Arrivals & Today's Departures). Remove redundant "เปิด Folio / บิล" in Departures table so staff have a single clear "เช็คเอาต์ & คิดเงิน" action.
>    - Menu 3: **"แคชเชียร์ & บิล" (Cashier Hub)** — centralized financial hub hosting active Master-Detail folios AND full historical billing ledger with 80mm thermal receipt reprint.
> 2. **Auto-Sync Live In-House Folio:**
>    - When viewing Cashier Hub or Room Details for an occupied/extended room, the folio is dynamically linked to the real in-house reservation: guest name "อัศวิน Customer", stay nights charge, and status `pending` (รอชำระ) until checkout.
> 3. **WYSIWYG Note Editing:**
>    - When clicking ✏️ edit note, pre-fill with the currently visible localized string (e.g. "ใกล้ทางเดินสวนหย่อม"), preserving Thai upon saving without reverting to English.
> 4. **Resilient Extra Charge Payload:**
>    - Backend `addBillItemSchema` accepts both `category` and `itemType`, mapping `'service'` to `'room_service'` and normalizing unit prices.

---

## Proposed File Changes

### Backend Billing Service
#### [services/billing/src/validators/billing.validator.ts](file:///e:/MyWork/PJ_P3_1/keystay/services/billing/src/validators/billing.validator.ts)
- Update `addBillItemSchema` and `createBillSchema` to accept both `itemType` and `category`.
- Coerce `unitPrice` and `quantity` safely.

#### [services/billing/src/routes/bills.ts](file:///e:/MyWork/PJ_P3_1/keystay/services/billing/src/routes/bills.ts)
- In `POST /bills/:id/items`: normalize incoming `category` / `itemType`, mapping `'service'` -> `'room_service'`, `'room'` -> `'room_charge'`.
- In `POST /bills`: support auto-reconciliation and ensure guest names from live reservations are respected.
- Clean up dummy bills for room 101/103 in `db_billing` where `guest_name = 'Guest (Room 101)'` and `status = 'paid'`.

### Frontend Web
#### [apps/web/src/hooks/useBilling.ts](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/hooks/useBilling.ts)
- In `addExtraCharge`: send both `itemType` and `category`, ensuring compatibility with backend.

#### [apps/web/src/components/front-desk/AddExtraChargeModal.tsx](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/components/front-desk/AddExtraChargeModal.tsx)
- Ensure clean submission with formatted numbers and proper error dismissal.

#### [apps/web/src/components/front-desk/RoomDetailsModal.tsx](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/components/front-desk/RoomDetailsModal.tsx)
- In `handleEditNotes`: pre-fill `editedNotes` with `localizeRoomNote(currentNotes, locale)`.
- On save: persist user's typed string directly without English fallback coercion.

#### [apps/web/src/lib/localizeMetadata.ts](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/lib/localizeMetadata.ts)
- Update `localizeRoomNote`: if note is already in Thai or custom user input, return as-is.

#### [apps/web/src/components/front-desk/FrontDeskLayout.tsx](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/components/front-desk/FrontDeskLayout.tsx)
- Rename sidebar items:
  - Item 1: "ผังห้องพัก" (Room Matrix)
  - Item 2: "เช็คอิน & เช็คเอาต์" (Check-In & Check-Out)
  - Item 3: "แคชเชียร์ & บิล" (Cashier & Bills)

#### [apps/web/src/pages/front-desk/DailyOperationsPage.tsx](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/pages/front-desk/DailyOperationsPage.tsx)
- In Departures tab table: remove the duplicate "เปิด Folio / บิล" action button from row actions, keeping "ขยายเวลาเข้าพัก" and primary "เช็คเอาต์ & คิดเงิน".
- Rename page header to "เคาน์เตอร์บริการเช็คอิน & เช็คเอาต์" (Frontline Check-in & Check-out Counter).

#### [apps/web/src/pages/front-desk/CashierFolioPage.tsx](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/pages/front-desk/CashierFolioPage.tsx)
- Auto-sync live in-house reservations with folios: if an in-house room is selected and has an unpaid reservation, display real guest name ("อัศวิน Customer") and keep status as `pending` (รอชำระ).
- Embed Billing History ledger tab or toggle directly inside Cashier Hub so staff have a complete one-stop financial desk.

---

## Verification Plan

### Automated Tests
1. **Billing Item Validator Test:**
   - Test adding extra charge with `{ category: 'minibar' }`, `{ category: 'service' }`, and `{ itemType: 'minibar' }`.
2. **Room Notes Localized Edit Test:**
   - Test that pre-fill in TH locale yields Thai string and saves Thai string cleanly.
3. **Live Folio Auto-Sync Test:**
   - Test that room 101 with extended reservation resolves to "อัศวิน Customer" and status `pending`.
4. **Web Test Suite:**
   - Run `pnpm test:web` -> must pass 100%.
5. **Backend Mocha Suite:**
   - Run `pnpm test` -> must pass 208/208 tests.
6. **Monorepo Typecheck:**
   - Run `pnpm dlx turbo run typecheck` -> 11/11 packages 0 errors.

---

## Tasks

- [x] **Task 1: Fix Add Extra Charge Payload & Validation in Billing Service**
  - [x] Update `services/billing/src/validators/billing.validator.ts` to accept `category` and `itemType`
  - [x] Update `services/billing/src/routes/bills.ts` to map category aliases and coerce prices
  - [x] Update `apps/web/src/hooks/useBilling.ts` to pass `itemType` and numeric `unitPrice`
  - [x] Verify adding extra charge via `AddExtraChargeModal` succeeds without validation error

- [x] **Task 2: WYSIWYG Room Notes Editing & Localization Persistence**
  - [x] Update `RoomDetailsModal.tsx` edit button to pre-fill `localizeRoomNote(currentNotes, locale)`
  - [x] Update `apps/web/src/lib/localizeMetadata.ts` to preserve Thai and custom note text
  - [x] Add unit test verifying editing notes in Thai stays in Thai

- [x] **Task 3: Live Folio Auto-Sync & Dummy Bill Cleanup**
  - [x] Clean up orphaned $0 paid dummy bills for room 101/103 in `db_billing`
  - [x] Update `CashierFolioPage.tsx` and `useBilling.ts` to auto-reconcile live in-house reservations with active folios (guest name, nights charge, pending status)
  - [x] Verify Room 101 displays "อัศวิน Customer" with status "รอชำระ" (Pending) in Cashier Hub

- [x] **Task 4: Streamline Front Desk Navigation & Information Architecture**
  - [x] Update `FrontDeskLayout.tsx` sidebar labels: "ผังห้องพัก", "เช็คอิน & เช็คเอาต์", "แคชเชียร์ & บิล"
  - [x] Streamline `DailyOperationsPage.tsx`: remove duplicate "เปิด Folio / บิล" button from Departures table
  - [x] Ensure Billing History sub-tab in Daily Operations and Cashier Hub is intuitive and non-redundant

- [x] **Task 5: Monorepo Verification & Visual Demonstration**
  - [x] Run `pnpm test` (all 211 mocha tests passing)
  - [x] Run `pnpm test:web` (all 315 web tests passing)
  - [x] Run `pnpm dlx turbo run typecheck` (0 errors)
  - [x] Capture visual verification screenshots confirming note edit in Thai, successful extra charge addition, and streamlined navigation


# Phase 3 Housekeeping & Outsource Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This plan integrates Boon's ([@Legxcy77](https://github.com/Legxcy77)) complete Phase 3 Housekeeping & Outsource deliverables merged in `origin/dev` (PR #31) and Khet's (@hazeco) latest merged backend modules into our active Front Desk branch (`feat/frontdesk-channels-and-amenities`), executes required database schema migrations, and wires the cross-team integration between Housekeeping (Before/After photo evidence) and Front Desk (`RoomDetailsModal.tsx`).

---

## User Review Required

> [!IMPORTANT]
> **Key Architectural Merges & Invariants:**
> 1. **Zero-Orphan Room Integrity:** Retain our fix for ghost rooms 103, 302, 402 in `02_room.sql` (`available`) and the strict PMS integrity guard in `services/room-inventory/src/routes/rooms.ts`, while adopting Boon's room number lookup flexibility and transition matrix (`checked_out -> available`).
> 2. **Front Desk Inspection Proof (`RoomDetailsModal.tsx`):** Front desk receptionists can now visually inspect Before & After photos uploaded by housekeepers before issuing room keys to check-in guests, ensuring room cleanliness proof and dispute prevention.
> 3. **Database Schema:** Execute `ALTER TABLE housekeeping_tasks ADD COLUMN before_photo_url TEXT;` and `after_photo_url TEXT;` on `db_housekeeping` alongside new tables (`outsource_contacts`, `minibar_items`, `task_templates`, `seasonal_pricing_rules`, `amenities_catalog`).

---

## Proposed Changes

### Merging & Backend Architecture
#### [package.json](file:///e:/MyWork/PJ_P3_1/keystay/package.json)
- Retain `"test:web"` script from Front Desk.
- Incorporate Boon's `"test:housekeeping"`, `"test:boon"`, `"seed:housekeeping"`, and `"@cloudflare/workers-types"`.

#### [apps/web/src/App.tsx](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/App.tsx)
- Retain `<ToastProvider>` and `<ToastContainer />` wrapping the entire application.
- Retain `/front-desk/cashier` route.
- Incorporate Boon's `/admin/tasks` (HousekeepingTasksPage) and `/housekeeping` (HousekeepingPortalPage) with `housekeeping` role redirect.

#### [scripts/seeds/02_room.sql](file:///e:/MyWork/PJ_P3_1/keystay/scripts/seeds/02_room.sql)
- Keep rooms 103, 302, 402 as `status = 'available'` (preserving ghost room elimination).
- Add Boon's `minibar_items` seed data (`mb-001` through `mb-006`).

#### [services/room-inventory/src/routes/rooms.ts](file:///e:/MyWork/PJ_P3_1/keystay/services/room-inventory/src/routes/rooms.ts)
- Retain computed `floor` in `GET /rooms` and `GET /rooms/:id`.
- Retain `PATCH /rooms/:id/notes` endpoint for Front Desk room notes editing.
- Retain Strict PMS Prevention guard (`INVALID_ORPHAN_STATUS`).
- Adopt Boon's `where(or(eq(rooms.id, id), eq(rooms.roomNumber, id)...))` query lookup and canonicalRoomId.
- Adopt `checked_out: ['cleaning', 'available']` transition and `PATCH /rooms/:id/status`.

---

### Database Migrations
#### Local D1 SQLite & Service Databases
- Apply `services/housekeeping/schema.sql` (adds `outsource_contacts`, `task_templates`, `before_photo_url`, `after_photo_url`).
- Apply `services/room-inventory/schema.sql` (adds `minibar_items`, `seasonal_pricing_rules`, `amenities_catalog`).
- Execute direct `ALTER TABLE housekeeping_tasks ADD COLUMN before_photo_url TEXT; ALTER TABLE housekeeping_tasks ADD COLUMN after_photo_url TEXT;` via Wrangler D1.

---

### Frontend Cross-Team Integration
#### [apps/web/src/components/front-desk/RoomDetailsModal.tsx](file:///e:/MyWork/PJ_P3_1/keystay/apps/web/src/components/front-desk/RoomDetailsModal.tsx)
- Integrate fetch to `GET /api/housekeeping/tasks?roomId=${room.id}` or `/api/housekeeping/tasks?roomNumber=${room.roomNumber}` to retrieve the latest task and its `beforePhotoUrl` / `afterPhotoUrl`.
- Render a dedicated "หลักฐานการตรวจรับห้องพัก (Housekeeping Inspection Proof)" section:
  - Displays Before & After photo thumbnails with side-by-side comparison.
  - Displays inspector name, task completion date/time, and status pill (`passed` / `clean`).
  - Clicking any image opens a full-screen image preview lightbox with high resolution and ESC/close handler.

---

## Verification Plan

### Automated Tests
1. **Unified Backend Mocha Suite:**
   - Run `pnpm test` -> must pass all 208 mocha tests (163 existing + 45 Boon Phase 3 tests).
2. **Boon Specific Mocha Suite:**
   - Run `pnpm test:housekeeping` -> must pass 21/21 outsource & housekeeping tests.
   - Run `pnpm test:boon` -> must pass 100%.
3. **Web Vitest Suite:**
   - Run `pnpm test:web` -> must pass all 283+ tests including new `HousekeepingEvidenceInFrontDesk.test.ts`.
4. **Monorepo Typecheck:**
   - Run `pnpm dlx turbo run typecheck` -> 12/12 packages passing with 0 errors.

---

## Tasks

- [x] **Task 1: Clean Merge of `origin/dev` into `feat/frontdesk-channels-and-amenities`**
  - [x] Execute `git merge origin/dev`
  - [x] Resolve conflict in `package.json` (keep both `test:web` and `test:housekeeping` / `test:boon`)
  - [x] Resolve conflict in `apps/web/src/App.tsx` (keep `<ToastProvider>` and `<ToastContainer />`, add housekeeping routes)
  - [x] Resolve conflict in `scripts/seeds/02_room.sql` (keep available status for 103, 302, 402; append minibar seeds)
  - [x] Resolve conflict in `services/room-inventory/src/routes/rooms.ts` (unify room number search, notes patch, and orphan guard)
  - [x] Commit merge commit with clear summary

- [x] **Task 2: Database Migrations & Seed Synchronization**
  - [x] Execute `ALTER TABLE housekeeping_tasks ADD COLUMN before_photo_url TEXT;` and `after_photo_url` on `db_housekeeping`
  - [x] Execute `scripts/migrate-d1.js` to update all 6 local D1 schemas
  - [x] Run `pnpm seed:housekeeping` to verify sample housekeeping data and photo URLs

- [x] **Task 3: Front Desk Housekeeping Evidence Display in `RoomDetailsModal.tsx`**
  - [x] Fetch latest housekeeping task for selected room via `GET /api/housekeeping/tasks?roomNumber=${room.roomNumber}`
  - [x] Add "หลักฐานการตรวจรับห้องพัก (Housekeeping Proof of Cleanliness)" card in `RoomDetailsModal.tsx`
  - [x] Render Before & After photo cards with timestamps and status badges
  - [x] Add modal lightbox view when clicking on photo thumbnails

- [x] **Task 4: Automated Test Suite for Front Desk Housekeeping Evidence**
  - [x] Create `apps/web/src/__tests__/HousekeepingEvidenceInFrontDesk.test.ts`
  - [x] Verify `RoomDetailsModal` correctly renders Before/After photo container, handles null photos gracefully, and opens lightbox
  - [x] Run `pnpm test:web` and confirm 100% pass

- [x] **Task 5: End-to-End Verification & Presentation Readiness**
  - [x] Run full mocha test suite (`pnpm test` -> 208 passing)
  - [x] Run monorepo typecheck (`pnpm dlx turbo run typecheck` -> 0 errors)
  - [x] Capture visual verification screenshot of `RoomDetailsModal` with photo evidence


# Front Desk Emergency Contact, High-Density Matrix & Operational Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 3 Front Desk & Cashier Portal by implementing the 4 remaining specification requirements: Quick Emergency Outsource Contact Drawer (UAT-FD07), Extend Stay & Check-out Key Return workflows (UAT-FD05/UC_ExtendStay), High-Density Single-Screen Matrix for 5–10 rooms, and Swiss `font-mono` numerals with selective refresh timestamps.

**Architecture:** Connect the Outsource Contacts table in `db_housekeeping` to API Gateway and a responsive `useOutsourceContacts` hook; add slide-over `QuickEmergencyDrawer` with Click-to-Call and LINE copy; implement `ExtendStayModal` and `CheckOutModal` with key card return verification; optimize `RoomMatrixGrid` to render multi-floor compact grids fitting 10 rooms in a single non-scrolling view; and polish typography tokens with `font-mono` and dynamic relative refresh indicators.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Hono, Cloudflare D1/Workers, Node test runner (`tsx --test`).

**Spec:** Direct requirements from project documentation:
1. `docs/อ่านก่อนทำงาน.md:244` & `docs/uat.md:252-277` (UAT-FD07): Quick Emergency Contact Drawer for 24h vendors with Click-to-Call (`tel:`) and LINE ID copy.
2. `docs/uat.md:182-214` (UAT-FD05) & `docs/Hotel_Management_System_updated.md:236` (UC_ExtendStay): Key card return checkbox on check-out (`keyCardReturned`) and stay extension modal (`PUT /reservations/:id/extend`).
3. `docs/designsystem.md:19` & `docs/อ่านก่อนทำงาน.md:242`: Compact High-Density Grid displaying all 5–10 rooms in a single view without scrolling.
4. `docs/designsystem.md:73, 126`: Strict Swiss typography with `font-mono font-medium tracking-tight` for prices, room numbers, and dates, with relative selective refresh timestamps.

---

## Global Constraints

- Must maintain strict TypeScript types across `@keystay/web` and backend services (`typecheck` must pass with 0 errors).
- All new tests must run and pass via `pnpm dlx tsx --test apps/web/src/__tests__/*.test.ts`.
- Must support full bilingual TH/EN localization via `useI18n()` with 1:1 key parity across `th.ts` and `en.ts`.
- Emergency contacts must provide offline/seed fallback so front desk staff can always reach technicians even during network drops.
- Design must adhere to Anti-AI Minimalist standards: 1px hairline borders, `#F8FAFC` background, `rounded-lg` radius, no neon glowing effects.

---

## Review Focus

1. **Clipboard API rejection:** When copying LINE ID in an insecure context or blocked browser permissions, fallback gracefully without uncaught promise rejection.
2. **Outsource offline resilience:** If `/api/housekeeping/outsource-contacts` returns an error or is offline, seamlessly serve seeded 24h contacts (Air, Plumbing, Electrical, Locksmith).
3. **Extend stay date validation:** Validation must ensure the extension date is strictly after the current check-out date, recalculating nights and extra charges accurately.
4. **Key card return state:** Check-out confirmation must record `keyCardReturned: boolean` and display key deposit refund status clearly.
5. **No-scroll density:** 10 rooms across Floors 1 and 2 must fit comfortably on a 1080p (and 1366x768) counter screen without requiring page scrolling.

---

### Task 1: Housekeeping Outsource Contacts API (API #101)

**Files:**
- Create: `services/housekeeping/src/routes/outsource-contacts.ts`
- Modify: `services/housekeeping/src/index.ts:1-70`
- Test: `services/housekeeping/src/__tests__/outsource-contacts.test.ts`

**Interfaces:**
- Produces: `GET /housekeeping/outsource-contacts` endpoint supporting `?category=...`, `?is_emergency=1`, and `?is_active=1` query filters, returning JSON matching DTO:
  ```typescript
  export interface OutsourceContactDTO {
    id: string;
    name: string;
    category: 'air_conditioning' | 'plumbing' | 'electrical' | 'locksmith' | 'gardening' | 'general_maintenance' | 'pest_control';
    serviceType: string;
    phonePrimary: string;
    phoneSecondary?: string | null;
    lineId?: string | null;
    isEmergency: boolean;
    availableHours: string;
    priceRateNote?: string | null;
    rating?: number;
    address?: string | null;
    notes?: string | null;
    isActive: boolean;
  }
  ```

- [ ] **Step 1: Write failing test for Outsource Contacts endpoint**

```typescript
// services/housekeeping/src/__tests__/outsource-contacts.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapOutsourceContact } from '../routes/outsource-contacts';

describe('Outsource Contacts API & Mapping', () => {
  it('maps database snake_case row to camelCase DTO correctly', () => {
    const row = {
      id: 'out-001',
      name: 'บจก. สยามแอร์เซอร์วิส',
      category: 'air_conditioning',
      service_type: 'ซ่อม/ล้างแอร์ห้องพัก 24 ชม.',
      phone_primary: '089-999-8888',
      phone_secondary: '02-123-4567',
      line_id: '@siamair24',
      is_emergency: 1,
      available_hours: '24 ชั่วโมง',
      price_rate_note: 'เริ่มต้น 500 บาท/เครื่อง',
      rating: 4.9,
      is_active: 1,
    };
    const dto = mapOutsourceContact(row);
    assert.strictEqual(dto.id, 'out-001');
    assert.strictEqual(dto.isEmergency, true);
    assert.strictEqual(dto.phonePrimary, '089-999-8888');
    assert.strictEqual(dto.lineId, '@siamair24');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test services/housekeeping/src/__tests__/outsource-contacts.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `outsource-contacts.ts` and mount in `services/housekeeping/src/index.ts`**

- In `services/housekeeping/src/routes/outsource-contacts.ts`: Implement Hono route supporting `GET /` with filters for `is_emergency`, `category`, and `is_active = 1`, and export `mapOutsourceContact`.
- In `services/housekeeping/src/index.ts`: Mount `app.route('/housekeeping/outsource-contacts', outsourceContactsRoute)` and `app.route('/outsource-contacts', outsourceContactsRoute)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test services/housekeeping/src/__tests__/outsource-contacts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/housekeeping/src/routes/outsource-contacts.ts services/housekeeping/src/index.ts services/housekeeping/src/__tests__/outsource-contacts.test.ts
git commit -m "feat(housekeeping): implement outsource contacts API with emergency filtering"
```

---

### Task 2: Quick Emergency Contact Drawer (UAT-FD07)

**Files:**
- Create: `apps/web/src/hooks/useOutsourceContacts.ts`
- Create: `apps/web/src/components/front-desk/QuickEmergencyDrawer.tsx`
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx:90-130`
- Modify: `apps/web/src/locales/th.ts`, `apps/web/src/locales/en.ts`
- Test: `apps/web/src/__tests__/emergency-drawer.test.ts`

**Interfaces:**
- Consumes: `GET /api/housekeeping/outsource-contacts` or fallback seeds.
- Produces: `useOutsourceContacts()` hook and `<QuickEmergencyDrawer isOpen={...} onClose={...} />` component with Click-to-Call (`tel:`) and LINE ID copy.

- [ ] **Step 1: Write failing test for emergency drawer and contacts hook**

```typescript
// apps/web/src/__tests__/emergency-drawer.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { FALLBACK_EMERGENCY_CONTACTS } from '../hooks/useOutsourceContacts';

describe('Quick Emergency Contact Drawer (UAT-FD07)', () => {
  it('provides seeded fallback emergency contacts for 24h reliability', () => {
    assert.strictEqual(FALLBACK_EMERGENCY_CONTACTS.length >= 4, true);
    const air = FALLBACK_EMERGENCY_CONTACTS.find((c) => c.category === 'air_conditioning');
    assert.strictEqual(air?.isEmergency, true);
    assert.match(air?.phonePrimary || '', /^08/);
  });

  it('incorporates emergency contact button and drawer in FrontDeskLayout', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx'), 'utf-8');
    assert.match(code, /QuickEmergencyDrawer/);
    assert.match(code, /isEmergencyOpen/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/emergency-drawer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `useOutsourceContacts.ts`, `QuickEmergencyDrawer.tsx`, and update `FrontDeskLayout.tsx`**

- In `apps/web/src/hooks/useOutsourceContacts.ts`: Implement hook fetching `/api/housekeeping/outsource-contacts?is_emergency=1` with fallback to `FALLBACK_EMERGENCY_CONTACTS`.
- In `apps/web/src/components/front-desk/QuickEmergencyDrawer.tsx`:
  - Slide-over drawer with 24-hour red alert badge (`24 ชั่วโมง / 24 Hours`).
  - Category filter pills (All, Air, Plumbing, Electrical, Locksmith).
  - Cards with Click-to-Call (`<a href="tel:...">`) and Copy LINE ID button with visual copied indicator.
  - Full i18n support.
- In `apps/web/src/components/front-desk/FrontDeskLayout.tsx`:
  - Add red-tinted alert button in header navbar: `🚨 {t('emergency.buttonTitle')}`.
  - Wire state `isEmergencyOpen` to render `<QuickEmergencyDrawer />`.
- In `locales/th.ts` & `en.ts`: Add keys for `emergency.*` with 1:1 parity.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/emergency-drawer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useOutsourceContacts.ts apps/web/src/components/front-desk/QuickEmergencyDrawer.tsx apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/locales/ apps/web/src/__tests__/emergency-drawer.test.ts
git commit -m "feat(web): implement Quick Emergency Outsource Contact Drawer (UAT-FD07)"
```

---

### Task 3: Operational Workflows (Extend Stay & Check-out Key Return Confirmation)

**Files:**
- Create: `apps/web/src/components/front-desk/ExtendStayModal.tsx`
- Create: `apps/web/src/components/front-desk/CheckOutModal.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsDrawer.tsx`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/locales/th.ts`, `apps/web/src/locales/en.ts`
- Test: `apps/web/src/__tests__/operational-modals.test.ts`

**Interfaces:**
- Produces: `<ExtendStayModal />` and `<CheckOutModal />` components adhering to `UC_ExtendStay` and `UAT-FD05`.

- [ ] **Step 1: Write failing test for operational modals**

```typescript
// apps/web/src/__tests__/operational-modals.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Operational Modals: Extend Stay & Check-Out Confirmation', () => {
  it('includes keyCardReturned and deposit return note in CheckOutModal', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/CheckOutModal.tsx'), 'utf-8');
    assert.match(code, /keyCardReturned/);
    assert.match(code, /useI18n/);
  });

  it('validates extension dates and calculates extra charge in ExtendStayModal', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/ExtendStayModal.tsx'), 'utf-8');
    assert.match(code, /newCheckOutDate/);
    assert.match(code, /extraNights/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/operational-modals.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `ExtendStayModal.tsx`, `CheckOutModal.tsx`, and wire them into Drawer and Daily Operations**

- In `ExtendStayModal.tsx`:
  - Show room, guest name, current check-out date.
  - Date picker for new check-out date (min = current checkOutDate + 1 day).
  - Calculate `extraNights = newDate - oldDate` and `extraCharge = extraNights * nightlyRate`.
  - Submit `PUT /api/reservations/:id/extend`.
- In `CheckOutModal.tsx`:
  - Show stay summary, room number, guest name.
  - Checkbox: "คืนคีย์การ์ด / กุญแจห้องพักครบถ้วน (`keyCardReturned`)" (default true).
  - Key deposit refund card: "คืนเงินมัดจำ ฿1,000.00 ให้แขก".
  - Notes field.
  - Confirm triggers `POST /api/reservations/:id/check-out` and forwards to Cashier Folio if pending balance remains.
- In `RoomDetailsDrawer.tsx`: Add "ขยายเวลาเข้าพัก (Extend Stay)" button when room is occupied.
- In `DailyOperationsPage.tsx`: Open `CheckOutModal` upon clicking Check-Out button.
- In `locales/th.ts` & `en.ts`: Add `extend.*` and `checkout.*` keys.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/operational-modals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/ExtendStayModal.tsx apps/web/src/components/front-desk/CheckOutModal.tsx apps/web/src/components/front-desk/RoomDetailsDrawer.tsx apps/web/src/pages/front-desk/DailyOperationsPage.tsx apps/web/src/locales/ apps/web/src/__tests__/operational-modals.test.ts
git commit -m "feat(web): implement Extend Stay modal and Check-out key card verification dialog"
```

---

### Task 4: High-Density 5–10 Room Single-Screen Matrix & Floor Grouping

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/locales/th.ts`, `apps/web/src/locales/en.ts`
- Test: `apps/web/src/__tests__/room-matrix-density.test.ts`

**Interfaces:**
- Produces: Single-screen overview where all 10 rooms (Floor 1 + Floor 2) fit in standard 1080p viewport without page scrolling, supporting floor grouping and density mode toggle.

- [ ] **Step 1: Write failing test for room matrix density and floor grouping**

```typescript
// apps/web/src/__tests__/room-matrix-density.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Room Matrix High-Density & Floor Grouping (Anti-AI Minimalist)', () => {
  it('supports floor grouping in RoomMatrixGrid to view all floors simultaneously', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomMatrixGrid.tsx'), 'utf-8');
    assert.match(code, /groupByFloor/);
    assert.match(code, /roomsByFloor/);
  });

  it('implements compact card view option for single-screen counter overview', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomCard.tsx'), 'utf-8');
    assert.match(code, /density/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-matrix-density.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `RoomMatrixGrid.tsx`, `RoomCard.tsx`, and `RoomMatrixPage.tsx`**

- In `RoomCard.tsx`: Add optional `density?: 'compact' | 'comfortable'` prop (compact reduces vertical padding so 10 rooms fit in a 2-row grid without vertical scroll).
- In `RoomMatrixGrid.tsx`:
  - When floor filter is "All", group rooms into Floor 1 (101-105) and Floor 2 (201-205) with clean hairline section dividers.
  - 5-column grid per floor guarantees full visibility of all rooms in one screen.
- In `RoomMatrixPage.tsx`: Add view density switch (`[ Compact | Comfortable ]`) with state saved in localStorage.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-matrix-density.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/RoomMatrixGrid.tsx apps/web/src/components/front-desk/RoomCard.tsx apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/locales/ apps/web/src/__tests__/room-matrix-density.test.ts
git commit -m "feat(web): add floor grouping and compact single-screen view for 5-10 room hotel"
```

---

### Task 5: Swiss Numerals (`font-mono`) & Selective Refresh Micro-UX

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Modify: `apps/web/src/pages/front-desk/ReservationsPage.tsx`
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Test: `apps/web/src/__tests__/micro-ux.test.ts`

**Interfaces:**
- Produces: Strict Swiss monospace numerals for prices, room numbers, codes, dates, and dynamic relative timestamps ("Updated just now" / "Updated 2m ago") across all 4 portal pages.

- [ ] **Step 1: Write failing test for monospace numerals and relative refresh label**

```typescript
// apps/web/src/__tests__/micro-ux.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatRelativeTime } from '../lib/i18n';

describe('Swiss Numerals & Selective Refresh Micro-UX', () => {
  it('formats relative refresh timestamp cleanly', () => {
    const now = new Date();
    assert.strictEqual(formatRelativeTime(now, 'th'), 'อัปเดตเมื่อสักครู่');
    assert.strictEqual(formatRelativeTime(now, 'en'), 'Updated just now');

    const twoMinutesAgo = new Date(Date.now() - 120000);
    assert.strictEqual(formatRelativeTime(twoMinutesAgo, 'th'), 'อัปเดต 2 นาทีที่แล้ว');
    assert.strictEqual(formatRelativeTime(twoMinutesAgo, 'en'), 'Updated 2m ago');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/micro-ux.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `formatRelativeTime` in `i18n.tsx` and integrate across all pages**

- In `apps/web/src/lib/i18n.tsx`: Implement and export `formatRelativeTime(date, locale)`.
- In `RoomMatrixPage.tsx`, `ReservationsPage.tsx`, `DailyOperationsPage.tsx`, and `CashierFolioPage.tsx`:
  - Display `formatRelativeTime(lastRefreshed, locale)` next to the refresh button.
- In `RoomCard.tsx`, `FolioSplitScreen.tsx`, and table rows:
  - Enforce `font-mono font-medium tracking-tight` on all numbers, currencies, and codes.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/micro-ux.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/i18n.tsx apps/web/src/components/front-desk/ apps/web/src/pages/front-desk/ apps/web/src/__tests__/micro-ux.test.ts
git commit -m "feat(web): apply Swiss font-mono numerals and selective refresh relative timestamps"
```

---

### Task 6: Full Integration Verification, End-to-End Test Suite, and Production Build

**Files:**
- Test: All test suites in `apps/web/src/__tests__/*.test.ts` and `services/housekeeping/src/__tests__/*.test.ts`

- [ ] **Step 1: Run all backend and frontend unit tests**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/*.test.ts services/housekeeping/src/__tests__/*.test.ts`
Expected: All tests PASS.

- [ ] **Step 2: Run TypeScript typecheck across monorepo**

Run: `pnpm --filter @keystay/web typecheck`
Expected: 0 errors.

Run: `pnpm --filter @keystay/housekeeping typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run production build**

Run: `pnpm --filter @keystay/web build`
Expected: Clean Vite production build.

- [ ] **Step 4: Commit and tag completion**

```bash
git commit --allow-empty -m "chore(release): complete Phase 3 front-desk emergency drawer, workflows, and matrix density"
```

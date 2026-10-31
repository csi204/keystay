# Front Desk & Cashier UI/UX & Bilingual i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Front Desk & Cashier portal into an enterprise-grade hospitality management system with a full bilingual TH/EN localization system, premium Thai typography (`IBM Plex Sans Thai`), refined visual hierarchy and card elevation, and fix data presentation bugs (Cashier `NaN` totals and placeholder guest names).

**Architecture:** A lightweight React-based i18n provider (`I18nProvider` + `useI18n`) with modular translation dictionaries (`th.ts`, `en.ts`), localized currency/date formatters, Google Fonts integration for modern Thai hospitality branding, and resilient data-mapping layers in front-desk hooks/components to ensure enterprise reliability.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vite, Node test runner (`tsx --test`), Cloudflare D1 microservices.

**Spec:** Direct requirements from SA Lead & QA Co-Lead (@allmusgus):
1. Eliminate confusing and cluttered bilingual bracketed labels (e.g., `ผังห้องพัก (Room Matrix)`).
2. Implement a full-featured TH/EN bilingual toggle system with persisted language state.
3. Integrate distinctive, professional Thai typography (`IBM Plex Sans Thai`) and scale up text sizes for counter readability.
4. Elevate visual hierarchy, card depths, and status indicators to look like a high-end PMS (Cloudbeds/Mews).
5. Fix data bugs: resolve `NaN` in Cashier Folio item totals, unify currency formatting, map real guest names from backend joins, and format dates naturally.

---

## Global Constraints

- Must maintain strict TypeScript types across `@keystay/web` (`pnpm --filter @keystay/web typecheck` must pass with 0 errors).
- All new tests must run and pass via `pnpm dlx tsx --test apps/web/src/__tests__/*.test.ts`.
- Must not break existing API Gateway and backend endpoints (`/api/rooms`, `/api/reservations`, `/api/bills`).
- Language choice must persist in `localStorage` with fallback to `'th'`, and gracefully handle environments where storage is blocked.
- Date and currency formatting must be responsive to active locale (TH shows Buddhist/CE Thai formatting with ฿; EN shows international standard).

---

## Review Focus

1. **Missing translation key:** Must return the translation key itself rather than throwing or rendering empty text.
2. **Bill item total calculation:** If `totalAmount` or `totalPrice` is missing, calculate `quantity * unitPrice` safely without ever displaying `NaN`.
3. **Guest name resolution:** If `guestName` is undefined, resolve `guest?.fullName`, `guest?.firstName`, or fallback to localized `'ผู้เข้าพัก'` / `'Guest'`.
4. **Invalid date handling:** Invalid or missing date strings passed to `formatDate` or `formatDateRange` must return `—` instead of throwing `Invalid Date`.
5. **Storage permission denial:** Accessing `localStorage` for language preference must be wrapped in `try/catch` to avoid crashes in sandboxed or cookie-blocked browsers.

---

### Task 1: Typography, Design System Foundation & Thai Font Integration

**Files:**
- Modify: `apps/web/index.html:8-15`
- Modify: `apps/web/tailwind.config.ts:63-66`
- Modify: `apps/web/src/styles/globals.css:35-56`
- Test: `apps/web/src/__tests__/typography.test.ts`

**Interfaces:**
- Produces: Tailwind font family class `font-sans` configured with `"IBM Plex Sans Thai"`, `Inter`, `system-ui`, and updated typography scales and shadow tokens.

- [ ] **Step 1: Write the failing test for font family and theme tokens**

```typescript
// apps/web/src/__tests__/typography.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Design System Typography & Styling', () => {
  it('includes IBM Plex Sans Thai in index.html Google Fonts link', () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/index.html'), 'utf-8');
    assert.match(html, /IBM\+Plex\+Sans\+Thai/);
  });

  it('configures IBM Plex Sans Thai in tailwind.config.ts font family', () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/tailwind.config.ts'), 'utf-8');
    assert.match(config, /IBM Plex Sans Thai/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/typography.test.ts`
Expected: FAIL (missing font declarations).

- [ ] **Step 3: Update `index.html`, `tailwind.config.ts`, and `globals.css`**

- In `apps/web/index.html`: Update Google Fonts preconnect and stylesheet link to include `IBM+Plex+Sans+Thai:wght@300;400;500;600;700` and `Inter:wght@400;500;600;700`.
- In `apps/web/tailwind.config.ts`: Set `fontFamily.sans` to `['"IBM Plex Sans Thai"', 'Inter', 'system-ui', '-apple-system', 'sans-serif']`. Add elevated shadow tokens `elevation-sm` and `elevation-md`.
- In `apps/web/src/styles/globals.css`: Adjust base font-size readability and card styling defaults.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/typography.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/index.html apps/web/tailwind.config.ts apps/web/src/styles/globals.css apps/web/src/__tests__/typography.test.ts
git commit -m "feat(web): integrate IBM Plex Sans Thai font and enhance typography system"
```

---

### Task 2: Comprehensive Bilingual i18n Engine (TH / EN)

**Files:**
- Create: `apps/web/src/locales/th.ts`
- Create: `apps/web/src/locales/en.ts`
- Create: `apps/web/src/lib/i18n.tsx`
- Test: `apps/web/src/__tests__/i18n.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type Locale = 'th' | 'en';
  export interface I18nContextValue {
    locale: Locale;
    setLocale: (l: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    formatCurrency: (amount: number | string) => string;
    formatDate: (dateStr?: string | null, format?: 'short' | 'medium' | 'long') => string;
    formatDateRange: (startStr?: string | null, endStr?: string | null, nights?: number) => string;
  }
  export const I18nProvider: React.FC<{ children: React.ReactNode }>;
  export function useI18n(): I18nContextValue;
  ```

- [ ] **Step 1: Write the failing test for i18n logic**

```typescript
// apps/web/src/__tests__/i18n.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { th } from '../locales/th';
import { en } from '../locales/en';
import { translateKey, formatCurrencyHelper, formatDateRangeHelper } from '../lib/i18n';

describe('i18n Translation & Formatting Engine', () => {
  it('contains matched keys across TH and EN dictionaries', () => {
    assert.strictEqual(typeof th['nav.roomMatrix'], 'string');
    assert.strictEqual(typeof en['nav.roomMatrix'], 'string');
    assert.strictEqual(th['nav.roomMatrix'], 'ผังห้องพัก');
    assert.strictEqual(en['nav.roomMatrix'], 'Room Matrix');
  });

  it('translates keys with parameter interpolation', () => {
    const textTh = translateKey(th, 'common.nightsCount', { count: 3 });
    const textEn = translateKey(en, 'common.nightsCount', { count: 3 });
    assert.strictEqual(textTh, '3 คืน');
    assert.strictEqual(textEn, '3 nights');
  });

  it('falls back to key when translation is missing', () => {
    assert.strictEqual(translateKey(th, 'nonexistent.key'), 'nonexistent.key');
  });

  it('formats currency consistently based on locale', () => {
    assert.strictEqual(formatCurrencyHelper(3500, 'th'), '฿3,500.00');
    assert.strictEqual(formatCurrencyHelper('120.50', 'en'), '฿120.50');
  });

  it('formats date ranges cleanly without raw ISO strings', () => {
    const rangeTh = formatDateRangeHelper('2026-09-28', '2026-10-02', 4, 'th');
    const rangeEn = formatDateRangeHelper('2026-09-28', '2026-10-02', 4, 'en');
    assert.match(rangeTh, /4 คืน/);
    assert.match(rangeEn, /4 nights/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/i18n.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `th.ts`, `en.ts`, and `i18n.tsx`**

- In `apps/web/src/locales/th.ts`: Provide comprehensive Thai strings for navigation, room statuses, table columns, bill details, actions, and validation.
- In `apps/web/src/locales/en.ts`: Provide corresponding English strings.
- In `apps/web/src/lib/i18n.tsx`: Implement `I18nProvider`, `useI18n`, storage persistence with try/catch, translation lookup with `{param}` replacement, currency formatter, and localized date formatter.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/locales/ apps/web/src/lib/i18n.tsx apps/web/src/__tests__/i18n.test.ts
git commit -m "feat(web): implement bilingual TH/EN i18n context, dictionaries, and formatters"
```

---

### Task 3: FrontDeskLayout Navigation & Header Redesign

**Files:**
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- Modify: `apps/web/src/App.tsx:30-40`
- Test: `apps/web/src/__tests__/layout.test.ts`

**Interfaces:**
- Consumes: `useI18n()` from `@/lib/i18n`.
- Produces: Redesigned header with `[ TH | EN ]` toggle, single-language navigation tabs, clean badge tags, and wrapped `I18nProvider`.

- [ ] **Step 1: Write the failing test for layout rendering with i18n**

```typescript
// apps/web/src/__tests__/layout.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('FrontDeskLayout with Language Switcher', () => {
  it('incorporates useI18n and language toggle in FrontDeskLayout', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
    assert.match(code, /setLocale/);
  });

  it('wraps routes with I18nProvider in App.tsx', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/App.tsx'), 'utf-8');
    assert.match(code, /I18nProvider/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement language switcher and clean tabs in `FrontDeskLayout.tsx` & `App.tsx`**

- In `apps/web/src/App.tsx`: Wrap application routes inside `<I18nProvider>`.
- In `apps/web/src/components/front-desk/FrontDeskLayout.tsx`:
  - Replace hardcoded bilingual tabs (`ผังห้องพัก (Room Matrix)`) with `{t('nav.roomMatrix')}`, `{t('nav.reservations')}`, `{t('nav.dailyOperations')}`, `{t('nav.billing')}`.
  - Add sleek segmented control toggle `[ TH | EN ]` with active pill indicator.
  - Enhance status chip, user profile indicator, and logout button styles.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/App.tsx apps/web/src/__tests__/layout.test.ts
git commit -m "feat(web): add header language switcher and clean localized navigation tabs"
```

---

### Task 4: Room Matrix Grid & Room Card Production Polish

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx`
- Modify: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Modify: `apps/web/src/components/front-desk/RoomDetailsDrawer.tsx`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Test: `apps/web/src/__tests__/room-card.test.ts`

**Interfaces:**
- Consumes: `useI18n()` for room statuses (`status.available`, `status.occupied`, etc.) and currency.
- Produces: Elevated room cards with bold room numbers, distinctive status badges, prominent guest names on occupied rooms, responsive floor tabs, and localized room detail slide-overs.

- [ ] **Step 1: Write the failing test for RoomCard rendering**

```typescript
// apps/web/src/__tests__/room-card.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('RoomCard Polish & Localization', () => {
  it('uses useI18n in RoomCard and removes raw bilingual labels', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomCard.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
    assert.doesNotMatch(code, /ว่างพร้อมใช้ \(Available\)/);
  });

  it('uses useI18n in RoomMatrixGrid for filter tabs and status chips', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomMatrixGrid.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-card.test.ts`
Expected: FAIL.

- [ ] **Step 3: Polish `RoomCard.tsx`, `RoomMatrixGrid.tsx`, `RoomDetailsDrawer.tsx`, and `RoomMatrixPage.tsx`**

- In `RoomCard.tsx`:
  - Upgrade room number to bold 16px font (`text-base font-bold text-slate-900`).
  - Render status as a soft pill badge using localized text (`t('status.' + room.status)`).
  - Show guest name prominently when occupied with a person icon.
  - Add subtle elevation border and hover lift (`shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150`).
- In `RoomMatrixGrid.tsx` & `RoomMatrixPage.tsx`:
  - Localize all filter buttons (`t('status.all')`, `t('status.available')`, etc.).
  - Enhance search input field styling and floor filter segmented control.
- In `RoomDetailsDrawer.tsx`:
  - Update all labels, actions, and status changes to use `t(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-card.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/RoomCard.tsx apps/web/src/components/front-desk/RoomMatrixGrid.tsx apps/web/src/components/front-desk/RoomDetailsDrawer.tsx apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/__tests__/room-card.test.ts
git commit -m "feat(web): polish Room Matrix cards, elevation, typography, and localization"
```

---

### Task 5: Reservations Page & Guest Name Mapping Fix

**Files:**
- Modify: `apps/web/src/hooks/useReservations.ts:60-90`
- Modify: `apps/web/src/pages/front-desk/ReservationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/NewReservationModal.tsx`
- Modify: `apps/web/src/components/front-desk/RapidWalkInModal.tsx`
- Test: `apps/web/src/__tests__/reservations-mapping.test.ts`

**Interfaces:**
- Consumes: API response with nested `res.guest.fullName`.
- Produces: `useReservations()` mapping that reliably surfaces `guestName: res.guest?.fullName || res.guestName`, and localized dates/table headers.

- [ ] **Step 1: Write the failing test for guest name mapping and date formatting**

```typescript
// apps/web/src/__tests__/reservations-mapping.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveGuestName } from '../hooks/useReservations';

describe('Reservation Guest Name & Date Presentation', () => {
  it('resolves guest name from nested guest object', () => {
    const rawBackendData = {
      id: 'res-001',
      guestId: 'gst-001',
      guest: {
        id: 'gst-001',
        fullName: 'Sarah Jenkins',
      },
    };
    const name = resolveGuestName(rawBackendData);
    assert.strictEqual(name, 'Sarah Jenkins');
  });

  it('falls back to top-level guestName or default placeholder', () => {
    assert.strictEqual(resolveGuestName({ guestName: 'Somchai Jaidee' }), 'Somchai Jaidee');
    assert.strictEqual(resolveGuestName({}), '—');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/reservations-mapping.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `useReservations.ts`, `ReservationsPage.tsx`, and reservation modals**

- In `apps/web/src/hooks/useReservations.ts`: Add exported helper `resolveGuestName(res)` and map `guestName: resolveGuestName(r)` when processing incoming reservation records.
- In `apps/web/src/pages/front-desk/ReservationsPage.tsx`:
  - Use `formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)` for natural date ranges.
  - Replace table headers and status badges with `useI18n`.
  - Style table with comfortable row padding and clear action buttons.
- In `NewReservationModal.tsx` & `RapidWalkInModal.tsx`:
  - Localize form fields, validation error messages, and submission buttons.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/reservations-mapping.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useReservations.ts apps/web/src/pages/front-desk/ReservationsPage.tsx apps/web/src/components/front-desk/NewReservationModal.tsx apps/web/src/components/front-desk/RapidWalkInModal.tsx apps/web/src/__tests__/reservations-mapping.test.ts
git commit -m "fix(web): resolve reservation guest name mapping and localize reservations management"
```

---

### Task 6: Cashier Folio `NaN` Bugfix & Split-Screen UI Polish

**Files:**
- Modify: `apps/web/src/components/front-desk/FolioSplitScreen.tsx:110-210`
- Modify: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Modify: `apps/web/src/components/front-desk/AddExtraChargeModal.tsx`
- Modify: `apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx`
- Test: `apps/web/src/__tests__/folio-calculation.test.ts`

**Interfaces:**
- Consumes: Bill items containing `totalPrice` / `totalAmount` / `unitPrice` * `quantity`.
- Produces: Safe `calculateItemTotal(item)` helper that guarantees no `NaN`, consistent currency formatting via `formatCurrency()`, and localized cashier split-screen.

- [ ] **Step 1: Write the failing test for safe item total calculation**

```typescript
// apps/web/src/__tests__/folio-calculation.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateItemTotal, calculateFolioSummary } from '../components/front-desk/FolioSplitScreen';

describe('Folio Item Calculation & NaN Guard', () => {
  it('calculates item total correctly when totalAmount is undefined but totalPrice is present', () => {
    const item = {
      id: 'bi-002',
      quantity: 3,
      unitPrice: '120.00',
      totalPrice: '360.00',
    };
    const total = calculateItemTotal(item);
    assert.strictEqual(total, 360);
    assert.strictEqual(Number.isNaN(total), false);
  });

  it('calculates fallback unitPrice * quantity when totals are missing', () => {
    const item = {
      id: 'bi-test',
      quantity: 2,
      unitPrice: '150.00',
    };
    const total = calculateItemTotal(item);
    assert.strictEqual(total, 300);
    assert.strictEqual(Number.isNaN(total), false);
  });

  it('calculates subtotal, VAT 7%, and net due without NaN', () => {
    const items = [
      { id: '1', quantity: 1, unitPrice: '1000' },
      { id: '2', quantity: 2, unitPrice: '250' },
    ];
    const summary = calculateFolioSummary(items, 500);
    assert.strictEqual(summary.subtotal, 1500);
    assert.strictEqual(summary.vat, 105);
    assert.strictEqual(summary.totalWithVat, 1605);
    assert.strictEqual(summary.netDue, 1105);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/folio-calculation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `FolioSplitScreen.tsx`, `CashierFolioPage.tsx`, and Cashier Modals**

- In `apps/web/src/components/front-desk/FolioSplitScreen.tsx`:
  - Export and implement `calculateItemTotal` and `calculateFolioSummary`.
  - Fix table cell rendering to use `formatCurrency(calculateItemTotal(it))` (no more `NaN` and no stray `$` symbols).
  - Localize all labels (Itemized Folio, Cashier Settlement, Subtotal, VAT 7%, Net Due, Payment methods).
- In `CashierFolioPage.tsx`:
  - Localize header, refresh button, search input, and bill list selector.
- In `AddExtraChargeModal.tsx` & `ReceiptTaxInvoiceModal.tsx`:
  - Localize modal titles, category options, inputs, and printable invoice layout.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/folio-calculation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/FolioSplitScreen.tsx apps/web/src/pages/front-desk/CashierFolioPage.tsx apps/web/src/components/front-desk/AddExtraChargeModal.tsx apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx apps/web/src/__tests__/folio-calculation.test.ts
git commit -m "fix(web): resolve NaN in folio item totals and localize cashier settlement portal"
```

---

### Task 7: Daily Operations, Check-In Modal Polish & Full Verification

**Files:**
- Modify: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Modify: `apps/web/src/components/front-desk/CheckInModal.tsx`
- Test: All test suites (`apps/web/src/__tests__/*.test.ts`)

**Interfaces:**
- Consumes: `useI18n()` across arrivals and departures.
- Produces: Polished daily operations dashboard with clean tab counts, guest cards with primary check-in/check-out actions, and localized check-in modal.

- [ ] **Step 1: Write verification test for daily operations localization**

```typescript
// apps/web/src/__tests__/daily-operations.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Daily Operations Localization & Polish', () => {
  it('uses useI18n in DailyOperationsPage and does not have raw bilingual tab headers', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
    assert.doesNotMatch(code, /รอเช็คอินวันนี้ \(Arrivals\)/);
  });

  it('uses useI18n in CheckInModal', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/CheckInModal.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/daily-operations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `DailyOperationsPage.tsx` and `CheckInModal.tsx`**

- In `DailyOperationsPage.tsx`:
  - Replace tab titles with `{t('ops.arrivalsToday')} ({arrivals.length})` and `{t('ops.departuresToday')} ({departures.length})`.
  - Format stay dates with `formatDateRange`.
  - Style action buttons with primary dark button for Check-In (`bg-slate-900 text-white`) and distinct secondary action for Check-Out.
- In `CheckInModal.tsx`:
  - Replace all labels with `t(...)`.
  - Display resolved guest name.

- [ ] **Step 4: Run all unit tests and verify they pass**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/*.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run TypeScript verification and web build**

Run: `pnpm --filter @keystay/web typecheck`
Expected: 0 errors.

Run: `pnpm --filter @keystay/web build`
Expected: Build succeeds with bundled assets.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/front-desk/DailyOperationsPage.tsx apps/web/src/components/front-desk/CheckInModal.tsx apps/web/src/__tests__/daily-operations.test.ts
git commit -m "feat(web): finalize daily operations polish and complete bilingual front-desk portal"
```


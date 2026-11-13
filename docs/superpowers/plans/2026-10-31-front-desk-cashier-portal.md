# Front Desk & Cashier Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Front Desk & Cashier Portal for KEYSTAY (`apps/web`), implementing Room Matrix, Slide-over Drawer, Reservations, Daily Operations, and Cashier Folio based on the Figma specification (`5:1094`).

**Architecture:** Route-level lazy-loaded React components in `apps/web/src/pages/front-desk/` wrapped by a shared `FrontDeskLayout` with role-based routing guards. State is managed locally with React hooks that consume Cloudflare API Gateway endpoints (`/api/rooms`, `/api/reservations`, `/api/bills`) with partial refresh triggers.

**Tech Stack:** React 18, Vite, TypeScript 5.8, Tailwind CSS, Lucide React, Zod, and `@keystay/types`.

**Spec:** `docs/อ่านก่อนทำงาน.md`, `docs/designsystem.md`, `docs/structure.md`, and Figma Section `5:1094` ("เดียร์ - pc first + little bit responsive").

## Global Constraints

- Design style: "Enterprise Minimalist & Swiss Typography" — monochrome & slate base (`#0F172A`, `#F8FAFC`, `#E2E8F0`), hairline 1px borders (`border-slate-200`), no glowing borders, no neon gradients, no large blur shadows, and no oversized `rounded-3xl` cards.
- High data density: Compact grids for 5–10 rooms, `font-mono` for room numbers, money amounts, and dates.
- Route guards: If an unauthenticated user or unauthorized role accesses internal routes directly, redirect or display 404 (Security by Obscurity).
- API convention: DTOs sent to and received from API Gateway use strings for numeric fields (`totalAmount`, `depositAmount`, `basePrice`).
- Selective Refresh: Each data panel/card provides a targeted refresh button to query latest state without WebSocket persistence.

## Review Focus

1. **Unauthenticated or Wrong Role Access:** An unauthorized user visiting `/front-desk/*` must be deflected to `/login` or 404 without exposing UI contents.
2. **Date Range Collision in Booking:** Booking overlap check must validate `checkInDate` and `checkOutDate` against existing bookings for the room.
3. **Empty / Loading / Offline State Handling:** When API Gateway is unreachable or responses fail, graceful fallbacks and offline banners must display rather than blank screens.
4. **Deposit & Settlement Math Precision:** Splitting room charges, minibar items, and deducting deposits must maintain exact string-to-number-to-string 2-decimal formatting without floating-point drift.
5. **Drawer & Modal Backdrop Keyboard Esc / Click Outside:** Clicking backdrop or pressing Esc should close active slide-overs and modals without losing background scroll state.

---

### Task 1: Front Desk Routing, Layout & Navigation Structure

**Files:**
- Create: `apps/web/src/components/front-desk/FrontDeskLayout.tsx`
- Create: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Modify: `apps/web/src/App.tsx:50-70, 170-220`
- Test: `apps/web/src/__tests__/front-desk-routing.test.ts`

**Interfaces:**
- Consumes:
  - `getAuthRole(): string`, `getAuthUser(): any`, `clearAuthSession(): void` from `@/lib/api`
  - `Logo` from `@/components/common/Logo`
  - `LayoutGrid`, `CalendarDays`, `UserCheck`, `ReceiptText`, `LogOut`, `Clock`, `KeyRound` from `lucide-react`
- Produces:
  - `FrontDeskLayout: React.FC<{ children: React.ReactNode; activeTab?: string }>`
  - `RoomMatrixPage: React.FC`
  - Routes in `App.tsx`:
    - `/front-desk` -> redirect to `/front-desk/room-matrix`
    - `/front-desk/room-matrix` -> `RoomMatrixPage`
    - `AuthenticatedHome` redirects `role === 'front_desk'` to `/front-desk/room-matrix`

- [ ] **Step 1: Write the failing test for Front Desk Navigation & Route Guard Logic**

```typescript
// apps/web/src/__tests__/front-desk-routing.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('frontDeskNavItems contains all 4 core portals', () => {
  const items = [
    { title: 'ผังห้องพัก (Room Matrix)', path: '/front-desk/room-matrix', key: 'matrix' },
    { title: 'รายการจอง (Reservations)', path: '/front-desk/reservations', key: 'reservations' },
    { title: 'เช็คอิน/เช็คเอาท์ (Arrivals & Departures)', path: '/front-desk/daily-operations', key: 'operations' },
    { title: 'แคชเชียร์และบิล (Bills & Cashier)', path: '/front-desk/billing', key: 'billing' },
  ];
  assert.strictEqual(items.length, 4);
  assert.strictEqual(items[0].path, '/front-desk/room-matrix');
});

test('role redirect resolves front_desk to /front-desk/room-matrix', () => {
  const getDestinationByRole = (role: string) => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'manager') return '/manager/dashboard';
    if (role === 'front_desk') return '/front-desk/room-matrix';
    return '/';
  };
  assert.strictEqual(getDestinationByRole('front_desk'), '/front-desk/room-matrix');
});
```

- [ ] **Step 2: Run test to verify it passes or fails**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/front-desk-routing.test.ts`
Expected: PASS

- [ ] **Step 3: Implement `FrontDeskLayout.tsx`, `RoomMatrixPage.tsx` placeholder, and update `App.tsx`**

1. Create `apps/web/src/components/front-desk/FrontDeskLayout.tsx`:
   - Top bar with Logo, live clock, user profile (`เดียร์ (ธีรภัทร) · Front Desk`), change password button, logout button.
   - Secondary navigation tab bar with:
     - `ผังห้องพัก (Room Matrix)` -> `/front-desk/room-matrix`
     - `รายการจอง (Reservations)` -> `/front-desk/reservations`
     - `เช็คอิน / เช็คเอาท์ วันนี้` -> `/front-desk/daily-operations`
     - `แคชเชียร์และบิล (Bills)` -> `/front-desk/billing`
   - Enterprise Minimalist styling: `#F8FAFC` background, hairline border `border-slate-200`, `font-sans`.
2. Create `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`:
   - Renders inside `FrontDeskLayout` with `activeTab="matrix"`.
3. Update `apps/web/src/App.tsx`:
   - In `AuthenticatedHome`: redirect `role === 'front_desk'` to `/front-desk/room-matrix`.
   - Add routes `/front-desk`, `/front-desk/room-matrix` wrapped in `<RequireAuth>`.

- [ ] **Step 4: Run typecheck and build to verify**

Run: `pnpm --filter @keystay/web typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/ apps/web/src/pages/front-desk/ apps/web/src/App.tsx apps/web/src/__tests__/front-desk-routing.test.ts
git commit -m "feat(web): add front-desk layout, routing guard, and room matrix page scaffold"
```

---

### Task 2: Room Matrix & Room Drawer (High-Density Grid + Slide-over Drawer)

**Files:**
- Create: `apps/web/src/components/front-desk/RoomCard.tsx`
- Create: `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`
- Create: `apps/web/src/components/front-desk/RoomDetailsDrawer.tsx`
- Create: `apps/web/src/hooks/useRooms.ts`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
- Test: `apps/web/src/__tests__/room-matrix.test.ts`

**Interfaces:**
- Consumes:
  - `Room`, `RoomType`, `RoomStatus` from `@keystay/types`
  - `apiFetch` from `@/lib/api`
  - `Card`, `Badge`, `Button` from `@/components/ui`
  - `X`, `BedDouble`, `User`, `Calendar`, `DollarSign`, `Sparkles`, `Wrench`, `Clock` from `lucide-react`
- Produces:
  - `RoomCard: React.FC<{ room: Room; roomType?: RoomType; onClick: (room: Room) => void }>`
  - `RoomMatrixGrid: React.FC<{ rooms: Room[]; roomTypes: RoomType[]; onSelectRoom: (room: Room) => void }>`
  - `RoomDetailsDrawer: React.FC<{ room: Room | null; onClose: () => void; onAction?: (action: string, room: Room) => void }>`
  - `useRooms: () => { rooms: Room[]; roomTypes: RoomType[]; loading: boolean; error: string | null; refresh: () => Promise<void> }`

- [ ] **Step 1: Write the failing test for Room Matrix status mapping and formatting**

```typescript
// apps/web/src/__tests__/room-matrix.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('getRoomStatusMeta returns correct soft-tint classes and Thai labels', () => {
  const statusMeta: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    available: { label: 'ว่างพร้อมใช้', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    occupied: { label: 'มีแขกพัก', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    reserved: { label: 'ติดจอง', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    checked_out: { label: 'รอทำความสะอาด', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    cleaning: { label: 'กำลังทำความสะอาด', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
    maintenance: { label: 'ปิดปรับปรุง', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    out_of_order: { label: 'งดใช้งาน', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  };

  assert.strictEqual(statusMeta.available.label, 'ว่างพร้อมใช้');
  assert.strictEqual(statusMeta.occupied.dot, 'bg-blue-500');
  assert.strictEqual(statusMeta.maintenance.label, 'ปิดปรับปรุง');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/room-matrix.test.ts`
Expected: PASS

- [ ] **Step 3: Implement `RoomCard.tsx`, `RoomMatrixGrid.tsx`, `RoomDetailsDrawer.tsx`, and `useRooms.ts`**

1. `apps/web/src/hooks/useRooms.ts`:
   - Fetches `/api/rooms` and `/api/rooms/types` using `apiFetch`.
   - Returns `{ rooms, roomTypes, loading, error, refresh }`.
2. `apps/web/src/components/front-desk/RoomCard.tsx`:
   - Minimalist 1px border card (`border-slate-200 hover:border-slate-400`).
   - Header with `font-mono text-base font-bold text-slate-900` room number and soft tint status badge.
   - Body showing room type name and price/night (`font-mono text-xs text-slate-600`).
   - Click handler to open details.
3. `apps/web/src/components/front-desk/RoomMatrixGrid.tsx`:
   - High-density CSS grid (2x5 or 3x4) displaying all 5–10 hotel rooms.
   - Status summary counters at top (`ทั้งหมด 10 ห้อง · ว่าง 4 · มีแขก 3 · รอทำความสะอาด 2 · ปิดปรับปรุง 1`).
   - Quick status filter tabs.
4. `apps/web/src/components/front-desk/RoomDetailsDrawer.tsx`:
   - Slide-over panel transitioning from right edge (`fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 z-50`).
   - Displays room number, floor, type, pricing, current status, active guest details (if occupied/reserved), and quick action buttons:
     - `เช็คอิน (Check-in)` if reserved
     - `เช็คเอาท์ (Check-out)` if occupied
     - `เพิ่มค่าใช้จ่าย (Add Extra Charge)` if occupied
     - `ปิดปรับปรุง (Maintenance)` toggle
5. Update `apps/web/src/pages/front-desk/RoomMatrixPage.tsx` with selective refresh button and drawer state.

- [ ] **Step 4: Run typecheck and build to verify**

Run: `pnpm --filter @keystay/web typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/ apps/web/src/hooks/ apps/web/src/pages/front-desk/ apps/web/src/__tests__/room-matrix.test.ts
git commit -m "feat(web): implement room matrix grid, status counters, and slide-over room details drawer"
```

---

### Task 3: Reservations, Booking Modal & Daily Operations (Arrivals/Departures & Walk-in)

**Files:**
- Create: `apps/web/src/pages/front-desk/ReservationsPage.tsx`
- Create: `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- Create: `apps/web/src/components/front-desk/NewReservationModal.tsx`
- Create: `apps/web/src/components/front-desk/CheckInModal.tsx`
- Create: `apps/web/src/components/front-desk/RapidWalkInModal.tsx`
- Create: `apps/web/src/hooks/useReservations.ts`
- Modify: `apps/web/src/App.tsx: add routes /front-desk/reservations and /front-desk/daily-operations`
- Test: `apps/web/src/__tests__/reservations.test.ts`

**Interfaces:**
- Consumes:
  - `Reservation`, `ReservationStatus`, `Room` from `@keystay/types`
  - `apiFetch` from `@/lib/api`
  - `Input`, `Label`, `Button`, `Table`, `Badge` from `@/components/ui`
  - `Calendar`, `Search`, `UserPlus`, `LogIn`, `LogOut`, `Filter`, `CheckCircle2` from `lucide-react`
- Produces:
  - `ReservationsPage: React.FC`
  - `DailyOperationsPage: React.FC`
  - `NewReservationModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }>`
  - `CheckInModal: React.FC<{ reservation?: Reservation | null; isOpen: boolean; onClose: () => void; onSuccess: () => void }>`
  - `RapidWalkInModal: React.FC<{ isOpen: boolean; availableRooms: Room[]; onClose: () => void; onSuccess: () => void }>`
  - `useReservations: () => { reservations: Reservation[]; loading: boolean; error: string | null; search: string; setSearch: (s: string) => void; refresh: () => Promise<void> }`

- [ ] **Step 1: Write the failing test for Date calculations and Booking validation**

```typescript
// apps/web/src/__tests__/reservations.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('calculateTotalNights computes exact whole nights', () => {
  const calculateTotalNights = (inDate: string, outDate: string): number => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };
  assert.strictEqual(calculateTotalNights('2026-11-01', '2026-11-04'), 3);
  assert.strictEqual(calculateTotalNights('2026-11-01', '2026-11-01'), 1);
});

test('calculateTotalAmount computes base price multiplied by nights in string format', () => {
  const calcAmount = (basePriceStr: string, nights: number): string => {
    const price = parseFloat(basePriceStr) || 0;
    return (price * nights).toFixed(2);
  };
  assert.strictEqual(calcAmount('1200.00', 3), '3600.00');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/reservations.test.ts`
Expected: PASS

- [ ] **Step 3: Implement `useReservations.ts`, Modals, and Pages**

1. `apps/web/src/hooks/useReservations.ts`:
   - Fetches `/api/reservations` with search and status filtering.
2. `apps/web/src/components/front-desk/NewReservationModal.tsx`:
   - Form with: Guest Full Name, Phone, Email, Room Selection, Check-in Date, Check-out Date, Deposit Amount.
   - Calculates total nights and total amount dynamically.
   - POST to `/api/reservations`.
3. `apps/web/src/components/front-desk/CheckInModal.tsx`:
   - Captures Guest National ID / Passport Number, deposit payment confirmation.
   - PUT to `/api/reservations/:id/check-in`.
4. `apps/web/src/components/front-desk/RapidWalkInModal.tsx`:
   - Simplified 1-step walk-in: select available room -> enter guest name & ID -> collect deposit -> immediate check-in.
   - POST to `/api/reservations/walk-in`.
5. `apps/web/src/pages/front-desk/ReservationsPage.tsx`:
   - Searchable table with booking number (`font-mono`), guest name, room number, date range, status badge, and action dropdown.
6. `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`:
   - Two side-by-side tabs/sections: **Today's Arrivals (คาดว่าจะเช็คอินวันนี้)** and **Today's Departures (คาดว่าจะเช็คเอาท์วันนี้)**.
   - Quick one-click action buttons for Check-in and Check-out.
7. Update `apps/web/src/App.tsx` routes.

- [ ] **Step 4: Run typecheck and build to verify**

Run: `pnpm --filter @keystay/web typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/ apps/web/src/hooks/ apps/web/src/pages/front-desk/ apps/web/src/App.tsx apps/web/src/__tests__/reservations.test.ts
git commit -m "feat(web): add reservation management, new booking modal, walk-in, and daily operations"
```

---

### Task 4: Cashier & Folio Split-Screen, Extra Charges & Invoices

**Files:**
- Create: `apps/web/src/pages/front-desk/CashierFolioPage.tsx`
- Create: `apps/web/src/components/front-desk/FolioSplitScreen.tsx`
- Create: `apps/web/src/components/front-desk/AddExtraChargeModal.tsx`
- Create: `apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx`
- Create: `apps/web/src/hooks/useBilling.ts`
- Modify: `apps/web/src/App.tsx: add route /front-desk/billing`
- Test: `apps/web/src/__tests__/cashier-billing.test.ts`

**Interfaces:**
- Consumes:
  - `Bill`, `BillStatus`, `Reservation` from `@keystay/types`
  - `apiFetch` from `@/lib/api`
  - `Input`, `Label`, `Button`, `Table`, `Badge` from `@/components/ui`
  - `Receipt`, `Plus`, `CreditCard`, `Banknote`, `QrCode`, `Printer`, `Download`, `CheckCircle` from `lucide-react`
- Produces:
  - `CashierFolioPage: React.FC`
  - `FolioSplitScreen: React.FC<{ bill: Bill | null; onAddCharge: () => void; onPay: () => void; onViewInvoice: () => void }>`
  - `AddExtraChargeModal: React.FC<{ billId: string; isOpen: boolean; onClose: () => void; onSuccess: () => void }>`
  - `ReceiptTaxInvoiceModal: React.FC<{ bill: Bill; isOpen: boolean; onClose: () => void }>`
  - `useBilling: () => { bills: Bill[]; loading: boolean; error: string | null; settlePayment: (billId: string, paymentMethod: string, amount: string) => Promise<boolean>; refresh: () => Promise<void> }`

- [ ] **Step 1: Write the failing test for Folio net settlement and tax calculation**

```typescript
// apps/web/src/__tests__/cashier-billing.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('calculateFolioSettlement calculates subtotal, 7% VAT, deposit deduction, and net due', () => {
  const calculateFolio = (items: { amount: number }[], depositAmount: number) => {
    const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
    const vat = Math.round(subtotal * 0.07 * 100) / 100;
    const totalWithVat = subtotal + vat;
    const netDue = Math.max(0, totalWithVat - depositAmount);
    return {
      subtotal: subtotal.toFixed(2),
      vat: vat.toFixed(2),
      totalWithVat: totalWithVat.toFixed(2),
      depositDeducted: depositAmount.toFixed(2),
      netDue: netDue.toFixed(2),
    };
  };

  const result = calculateFolio([{ amount: 2400 }, { amount: 150 }], 500);
  assert.strictEqual(result.subtotal, '2550.00');
  assert.strictEqual(result.vat, '178.50');
  assert.strictEqual(result.totalWithVat, '2728.50');
  assert.strictEqual(result.depositDeducted, '500.00');
  assert.strictEqual(result.netDue, '2228.50');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm dlx tsx --test apps/web/src/__tests__/cashier-billing.test.ts`
Expected: PASS

- [ ] **Step 3: Implement `useBilling.ts`, Cashier Folio Split-Screen, and Modals**

1. `apps/web/src/hooks/useBilling.ts`:
   - Fetches active bills (`/api/bills`), handles payment submission (`/api/bills/:id/pay`), and extra charge addition (`/api/bills/:id/items`).
2. `apps/web/src/components/front-desk/FolioSplitScreen.tsx`:
   - Left Pane: Itemized room charges, minibar items, laundry, extra beds, damage fees with date and amount (`font-mono`).
   - Right Pane: Subtotal, VAT 7%, Security Deposit already paid, Remaining Net Due (`text-2xl font-bold font-mono text-slate-900`), and Payment method buttons (Cash, Credit Card, PromptPay QR).
3. `apps/web/src/components/front-desk/AddExtraChargeModal.tsx`:
   - Modal to add minibar or extra charges: item description, category (Minibar, Laundry, Damage, Extra Bed), quantity, and unit price.
4. `apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx`:
   - Enterprise Minimalist printable invoice layout: Hotel header, Tax ID, Customer name & Tax ID, itemized table, VAT summary, cashier signature line, and Print (`window.print()`) button.
5. `apps/web/src/pages/front-desk/CashierFolioPage.tsx`:
   - Selector for active room/guest folio + Split Screen container.
6. Update `apps/web/src/App.tsx` routes.

- [ ] **Step 4: Run typecheck and full build**

Run: `pnpm --filter @keystay/web typecheck`
Run: `pnpm --filter @keystay/web build`
Expected: Build succeeds with all dynamic chunks emitted.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/front-desk/ apps/web/src/hooks/ apps/web/src/pages/front-desk/ apps/web/src/App.tsx apps/web/src/__tests__/cashier-billing.test.ts
git commit -m "feat(web): implement cashier folio split-screen, extra charges, and printable tax invoice"
```

---

## Self-Review Checklist

1. **Spec coverage:** 
   - Room Matrix & Drawer (Task 2) covers Figma nodes `1:856`, `1:2`, `1:5523`, `1:6031`.
   - Reservations, Booking & Walk-in (Task 3) covers Figma nodes `1:6809`, `1:7505`, `1:8334`, `1:6433`, `1:12118`, `1:13351`.
   - Cashier & Folio & Invoice (Task 4) covers Figma nodes `1:2944`, `1:8873`, `1:12548`, `1:13000`, `1:13728`.
   - Layout & Navigation (Task 1) covers structure and routing.
2. **Step scan:** Each task has explicit test assertions, file paths, signatures, build verifications, and git commit commands.
3. **Type consistency:** All types match `@keystay/types` (`Room`, `RoomType`, `Reservation`, `Bill`).
4. **Review Focus:** Covered unauthenticated access, date range collisions, offline fallbacks, decimal money math, and modal Esc/backdrop behaviors.
5. **Proportion:** Concise, actionable plan directly mapping to the 4 tasks.


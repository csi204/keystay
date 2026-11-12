# Front Desk Ergonomics, Global Command Hub & Night Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Front Desk UX/UI for enterprise boutique production standard by upgrading visual contrast for room statuses, splitting `RoomDetailsModal` into a compact 2-tab layout, adding inline instant field validation, adding a 3-dots Quick Actions context menu on room cards, implementing a Global Command Palette (`Ctrl+K`) and keyboard shortcuts (`Esc`, `/`, `Ctrl+Enter`, `?`), and introducing a high-contrast Night Audit Dark Mode.

**Architecture:** 
A modular React 19 / Tailwind CSS architecture extending `apps/web`:
- `RoomCard.tsx` gets a tempered glass status badge upgrade with WCAG AAA contrast and an isolated 3-dots dropdown menu (`MoreVertical`) with event isolation (`stopPropagation`).
- `RoomDetailsModal.tsx` splits into 2 discrete sub-views (`stay`: Guest & Folio Operations vs `room`: Amenities, Inspection Evidence & Notes) with occupancy-aware default tab selection.
- `MaskedInputs.tsx` and booking modals incorporate `onBlur` & length-based instant inline validation with `AlertCircle` indicators.
- `FrontDeskLayout.tsx` mounts a global `GlobalCommandPalette` (`Ctrl+K` / `/`) and `KeyboardShortcutsModal` (`?`) for rapid keyboard-driven frontline operations.
- `ThemeContext.tsx` manages persistent `'light' | 'dark'` theme switching, applying Tailwind `dark` class to `document.documentElement` with dedicated Night Audit slate palettes.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS, Vite, Lucide React icons, Vitest / Testing Library, Hono backend.

**Spec:** User interview requirements via `/grill-me` (2026-11-12):
1. Status "ติดจอง" high-contrast badge (WCAG AAA legible under counter lights).
2. 2-Tab structure for `RoomDetailsModal` eliminating vertical scrollbars.
3. Inline instant validation (On blur & format check) with red alert text below input.
4. Quick actions 3-dots context menu on `RoomCard`.
5. Global Command Palette (`Ctrl+K` / `/`) for instant search across rooms, guests, and actions.
6. Keyboard shortcuts (`Esc`, `/`, `Ctrl+Enter`, `?` cheatsheet).
7. Night Audit / Dark Mode with manual toggle in sidebar and command palette.
8. Tape Chart excluded as decided.

## Global Constraints

- Thai orthography standard: "เช็คเอาต์" (ต.เต่า การันต์) across all UI copy.
- Zero raw Unicode emojis in new code; use official Lucide React icons with `strokeWidth={1.5}` or `1.75`.
- Maintain `min-h-[44px]` touch targets for all primary buttons and interactive dropdowns.
- Monetary figures must use `font-mono tabular-nums` formatting.
- `document.documentElement.classList` is toggled for dark mode (`dark` class) with `localStorage` key `'keystay_theme'`.
- All tests must pass: `pnpm --filter @keystay/web test:run` and backend mocha suites.

## Review Focus

1. **Quick Actions Event Bubbling:** Clicking the 3-dots button on `RoomCard` must NOT trigger the parent card's `onClick` (opening the full modal). Test explicitly with `fireEvent.click` and verify only the quick menu opens.
2. **Tab Switching on Room Change:** Switching between an occupied room (e.g. 101) and an available room (e.g. 102) must update the default active tab correctly (`stay` for occupied, `room` for available/cleaning).
3. **Form Pre-mature Error Flashing:** Typing the first digit into a phone input or ID input must NOT immediately show a red error before user finishes or blurs the field.
4. **Command Palette Keyboard Trapping:** Pressing `Esc` inside the Command Palette must close the palette without bubbling to background modals; pressing `ArrowDown`/`ArrowUp` must cycle results cleanly.
5. **Dark Mode Hydration Flash:** Theme must read from `localStorage` synchronously or during initial mount to prevent white flash on page reload.

---

### Task 1: High-Contrast Status Badges & Amber "ติดจอง" Redesign

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx:43-50, 150-155, 212-228`
- Test: `apps/web/src/__tests__/room-card-contrast.test.tsx`

**Interfaces:**
- Consumes: `ROOM_STATUS_CONFIG` from `RoomCard.tsx`
- Produces: Enhanced high-contrast Tailwind classes for `reserved` (`bg-amber-100 text-amber-950 border-amber-400 font-bold`, dot `bg-amber-500 ring-2 ring-amber-300`), high-contrast guest chip on the card, and dark mode class variants.

- [ ] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/room-card-contrast.test.tsx`:
Verify that when `room.status === 'reserved'`, the status badge contains `bg-amber-100` and `text-amber-950`, and the guest badge uses high-contrast amber styling rather than washed-out `text-amber-700 bg-amber-50`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/room-card-contrast.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement high-contrast status styles in `RoomCard.tsx`**
Update `ROOM_STATUS_CONFIG.reserved` to:
```tsx
reserved: {
  label: 'ติดจอง',
  bg: 'bg-amber-100 dark:bg-amber-950/40',
  text: 'text-amber-950 dark:text-amber-200',
  border: 'border-amber-400 dark:border-amber-800',
  dot: 'bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900',
}
```
Update the status badge pill and bottom chip in `RoomCard.tsx` to ensure font weight is `font-bold` and border is clearly visible under harsh counter lighting.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/room-card-contrast.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/RoomCard.tsx apps/web/src/__tests__/room-card-contrast.test.tsx
git commit -m "feat(front-desk): upgrade room status badge contrast to WCAG AAA standards"
```

---

### Task 2: 2-Tab Architecture in `RoomDetailsModal`

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:1-250, 1700-1828`
- Test: `apps/web/src/__tests__/room-details-modal-tabs.test.tsx`

**Interfaces:**
- Consumes: `selectedRoom: Room`, `guestReservation?: ExtendedReservation`
- Produces: `activeTab: 'stay' | 'room'` tab switcher in `RoomDetailsModal`.
  - Tab `'stay'`: "ข้อมูลการเข้าพัก & ค่าใช้จ่าย" (Guest Name, Phone, Channel, Slip Button, Folio Action Buttons: Extend Stay, Add Charge, Checkout)
  - Tab `'room'`: "สภาพห้องพัก & งานแม่บ้าน" (Room Type, Capacity, Amenities, Housekeeping Inspection Before/After Lightbox, Internal Notes)
  - Default Tab: `'stay'` when `room.status === 'occupied'`, `'room'` when `room.status === 'available' | 'cleaning' | 'maintenance'`.

- [ ] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/room-details-modal-tabs.test.tsx`:
Test that:
1. `RoomDetailsModal` renders two tab buttons: `ข้อมูลการเข้าพัก & ค่าใช้จ่าย` and `สภาพห้องพัก & งานแม่บ้าน`.
2. For an `occupied` room, the `stay` tab is active by default.
3. For an `available` room, the `room` tab is active by default.
4. Clicking tab button switches content without vertical overflow.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/room-details-modal-tabs.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement 2-Tab Layout in `RoomDetailsModal.tsx`**
Add state:
```tsx
const [activeTab, setActiveTab] = useState<'stay' | 'room'>(() => {
  return room.status === 'occupied' ? 'stay' : 'room';
});

useEffect(() => {
  setActiveTab(room.status === 'occupied' ? 'stay' : 'room');
}, [room.id, room.status]);
```
Render compact tab header right under the room header:
```tsx
<div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 pt-2">
  <button
    type="button"
    onClick={() => setActiveTab('stay')}
    className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
      activeTab === 'stay'
        ? 'border-[#F97316] text-[#F97316]'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`}
  >
    <UserCheck className="w-3.5 h-3.5" />
    <span>ข้อมูลการเข้าพัก & ค่าใช้จ่าย</span>
  </button>
  <button
    type="button"
    onClick={() => setActiveTab('room')}
    className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
      activeTab === 'room'
        ? 'border-[#F97316] text-[#F97316]'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`}
  >
    <Sparkles className="w-3.5 h-3.5" />
    <span>สภาพห้องพัก & งานแม่บ้าน</span>
  </button>
</div>
```
Place guest info, check-out details, and folio action buttons into `activeTab === 'stay'`.
Place room specs, housekeeping evidence photos, and notes into `activeTab === 'room'`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/room-details-modal-tabs.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/RoomDetailsModal.tsx apps/web/src/__tests__/room-details-modal-tabs.test.tsx
git commit -m "feat(front-desk): split RoomDetailsModal into ergonomic 2-tab structure"
```

---

### Task 3: Inline Instant Validation in Masked Inputs & Booking Modals

**Files:**
- Modify: `apps/web/src/components/common/MaskedInputs.tsx:1-120`
- Modify: `apps/web/src/components/front-desk/WalkInModal.tsx:80-160`
- Modify: `apps/web/src/components/front-desk/NewBookingModal.tsx:80-160`
- Test: `apps/web/src/__tests__/inline-instant-validation.test.tsx`

**Interfaces:**
- Consumes: `isValidPhone(val: string): boolean`, `isValidThaiId(val: string): boolean`, `isValidPassport(val: string): boolean`
- Produces: `error?: string` prop and `showInlineError?: boolean` with automatic `onBlur` error trigger in `PhoneInput` and `NationalIdOrPassportInput`. Red border `border-rose-400 focus:ring-rose-400` and helper text with `AlertCircle`.

- [ ] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/inline-instant-validation.test.tsx`:
Test that:
1. When user inputs `08123` into `PhoneInput` and triggers `blur`, an inline error message appears: `เบอร์โทรศัพท์ต้องครบ 10 หลัก`.
2. When user inputs valid `0812345678` and blurs, the error message disappears.
3. When user inputs 12 digits in ID card and blurs, an error message appears: `เลขบัตรประชาชนต้องครบ 13 หลัก`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/inline-instant-validation.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Inline Validation logic in `MaskedInputs.tsx` & Modals**
Update `PhoneInput` and `NationalIdOrPassportInput` in `MaskedInputs.tsx`:
- Add `touched` state tracking on `onBlur`.
- If `touched` and value is non-empty and `!isValidPhone(value)`, display:
```tsx
{errorMessage && (
  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium animate-fadeIn">
    <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
    <span>{errorMessage}</span>
  </p>
)}
```
Wire `onBlur` listeners into `WalkInModal.tsx` and `NewBookingModal.tsx` for phone, identification, and check-out date verification.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/inline-instant-validation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/common/MaskedInputs.tsx apps/web/src/components/front-desk/WalkInModal.tsx apps/web/src/components/front-desk/NewBookingModal.tsx apps/web/src/__tests__/inline-instant-validation.test.tsx
git commit -m "feat(front-desk): implement instant on-blur inline validation for inputs"
```

---

### Task 4: Quick Actions Context Menu (`...` MoreVertical) on `RoomCard`

**Files:**
- Modify: `apps/web/src/components/front-desk/RoomCard.tsx:140-160, 240-272`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx:280-340`
- Test: `apps/web/src/__tests__/room-card-quick-actions.test.tsx`

**Interfaces:**
- Consumes: `onQuickAction?: (action: string, room: Room) => void`
- Produces: Popover menu triggered by clicking `MoreVertical` on `RoomCard`.
  - Actions for `available`: `walkin` (เปิดห้องด่วน), `booking` (สร้างการจองใหม่)
  - Actions for `occupied`: `cashier` (ดูบิลแคชเชียร์), `extend` (ขยายเวลาพัก), `extra_charge` (เพิ่มค่าใช้จ่าย/มินิบาร์), `checkout` (เช็คเอาต์)
  - Actions for `reserved`: `checkin` (เช็คอินทันที), `view` (ดูรายละเอียด)

- [ ] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/room-card-quick-actions.test.tsx`:
Test that:
1. Clicking the `...` button opens the quick actions menu.
2. Clicking `...` does NOT fire `onClick` of the card.
3. For an available room, options "เปิดห้องด่วน (Walk-In)" and "สร้างการจองใหม่" appear.
4. Clicking an option fires `onQuickAction` with the action key and closes the menu.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/room-card-quick-actions.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Quick Actions Menu in `RoomCard.tsx` & `RoomMatrixPage.tsx`**
In `RoomCard.tsx`:
Add state `isMenuOpen: boolean`.
Add button next to status pill:
```tsx
<div className="relative">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setIsMenuOpen((prev) => !prev);
    }}
    className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    aria-label={`เมนูด่วนสำหรับห้อง ${room.roomNumber}`}
  >
    <MoreVertical className="w-3.5 h-3.5" />
  </button>
  {isMenuOpen && (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-30 animate-fadeIn"
    >
      {/* Action items based on room.status with Lucide icons */}
    </div>
  )}
</div>
```
In `RoomMatrixPage.tsx`, wire `onQuickAction`:
- `'walkin'` -> opens `WalkInModal` with selected room
- `'booking'` -> opens `NewBookingModal` with selected room
- `'cashier'` -> navigates to `/front-desk/cashier` with query param
- `'checkout'` -> routes to daily operations checkout confirmation

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/room-card-quick-actions.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/RoomCard.tsx apps/web/src/pages/front-desk/RoomMatrixPage.tsx apps/web/src/__tests__/room-card-quick-actions.test.tsx
git commit -m "feat(front-desk): add 3-dots Quick Actions context menu to RoomCard"
```

---

### Task 5: Global Command Palette (`Ctrl+K` / `/` Omnibar) & Navigation Hub

**Files:**
- Create: `apps/web/src/components/front-desk/GlobalCommandPalette.tsx`
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx:135-155, 315-330`
- Test: `apps/web/src/__tests__/global-command-palette.test.tsx`

**Interfaces:**
- Consumes: `rooms`, `reservations`, `navigate`
- Produces: Global Command Palette component accessible from any front desk page via `Ctrl+K` shortcut or topbar search trigger button. Instant search across:
  - Room Numbers (e.g. "101", "305") -> with status indicator & click to open
  - Guest Names (e.g. "อัศวิน", "David") -> with room & reservation code
  - Quick System Actions: "ไปหน้าผังห้องพัก", "ไปหน้าเช็คอิน & เช็คเอาต์", "ไปหน้าแคชเชียร์ & บิล", "สลับโหมดกะดึก (Dark Mode)", "เปิดหน้าต่างคีย์ลัด (?)"

- [ ] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/global-command-palette.test.tsx`:
Test that:
1. Pressing `Ctrl+K` opens the Command Palette.
2. Typing "101" filters to Room 101.
3. Selecting Room 101 invokes the room selection callback and closes palette.
4. Pressing `Esc` closes the Command Palette.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/global-command-palette.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `GlobalCommandPalette.tsx` & integrate in `FrontDeskLayout.tsx`**
Create `GlobalCommandPalette.tsx`:
- Render backdrop modal with input at the top (`Search` icon, `font-sans`, placeholder `ค้นหาห้อง, แขก, หรือพิมพ์คำสั่ง... (Esc เพื่อปิด)`).
- Filter matching rooms and reservations in real-time.
- Support keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`).
- Render a topbar Omnibar button in `FrontDeskLayout.tsx`:
```tsx
<button
  type="button"
  onClick={() => setIsCommandPaletteOpen(true)}
  className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
>
  <Search className="w-3.5 h-3.5 text-slate-400" />
  <span>ค้นหาด่วนหรือพิมพ์คำสั่ง...</span>
  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300">
    Ctrl K
  </kbd>
</button>
```

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/global-command-palette.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/front-desk/GlobalCommandPalette.tsx apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/__tests__/global-command-palette.test.tsx
git commit -m "feat(front-desk): implement Global Command Palette (Ctrl+K Omnibar)"
```

---

### Task 6: Keyboard Shortcuts Engine & Cheatsheet Modal (`?`)

**Files:**
- Create: `apps/web/src/components/common/KeyboardShortcutsModal.tsx`
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx:50-95`
- Modify: `apps/web/src/components/front-desk/RoomDetailsModal.tsx:60-90`
- Test: `apps/web/src/__tests__/keyboard-shortcuts.test.tsx`

**Interfaces:**
- Consumes: Window keyboard event listener
- Produces:
  - `Esc`: Closes any open modal/drawer.
  - `/` or `Ctrl+K`: Opens Global Command Palette (when not focused in an input/textarea).
  - `?`: Opens `KeyboardShortcutsModal` Cheatsheet.
  - `Ctrl+Enter`: Submits the current active modal form.

- [ ] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/keyboard-shortcuts.test.tsx`:
Test that:
1. Pressing `?` triggers `KeyboardShortcutsModal`.
2. The modal displays shortcut groups: การนำทาง (Navigation), งานห้องพัก (Room Operations), การควบคุมทั่วไป (General).
3. Pressing `Esc` closes the shortcuts modal.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/keyboard-shortcuts.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `KeyboardShortcutsModal.tsx` and Global Keyboard Listeners**
Create `KeyboardShortcutsModal.tsx` with clean `<kbd>` styles and categorized shortcut tables.
Mount a global listener in `FrontDeskLayout.tsx`:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
      (e.target as HTMLElement)?.tagName
    );
    if (e.key === '?' && !isInput) {
      e.preventDefault();
      setIsShortcutsOpen(true);
    }
    if ((e.key === '/' && !isInput) || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/keyboard-shortcuts.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/common/KeyboardShortcutsModal.tsx apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/__tests__/keyboard-shortcuts.test.tsx
git commit -m "feat(front-desk): add keyboard shortcuts engine and cheatsheet modal"
```

---

### Task 7: Night Audit / Dark Mode System (`ThemeContext`, UI Tokens & Toggle)

**Files:**
- Create: `apps/web/src/context/ThemeContext.tsx`
- Modify: `apps/web/src/App.tsx:1-40`
- Modify: `apps/web/src/components/front-desk/FrontDeskLayout.tsx:450-480`
- Modify: `apps/web/src/pages/front-desk/RoomMatrixPage.tsx:1-50`
- Test: `apps/web/src/__tests__/dark-mode-theme.test.tsx`

**Interfaces:**
- Consumes: `localStorage.getItem('keystay_theme')`
- Produces: `useTheme(): { theme: 'light' | 'dark', toggleTheme: () => void }`
- Behavior: Toggles `'dark'` class on `document.documentElement`. Renders Lucide `Moon` / `Sun` toggle buttons in Front Desk sidebar and Command Palette.

- [ ] **Step 1: Write the failing test**
Create `apps/web/src/__tests__/dark-mode-theme.test.tsx`:
Test that:
1. `ThemeContext` initializes with `'light'` by default or from `localStorage`.
2. Calling `toggleTheme()` toggles theme to `'dark'` and adds `'dark'` class to `document.documentElement`.
3. The preference is stored in `localStorage.getItem('keystay_theme')`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @keystay/web test:run src/__tests__/dark-mode-theme.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `ThemeContext.tsx` and integrate toggle in `FrontDeskLayout.tsx`**
Create `ThemeContext.tsx`:
```tsx
export type Theme = 'light' | 'dark';

export const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: 'light', toggleTheme: () => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('keystay_theme') as Theme) || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('keystay_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```
Wrap `App.tsx` with `ThemeProvider`.
Add Night Audit toggle button in `FrontDeskLayout.tsx` next to language switch button with `Moon` / `Sun` icons.
Add dark theme styles (`dark:bg-slate-900`, `dark:border-slate-800`, `dark:text-slate-100`) across Front Desk views.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @keystay/web test:run src/__tests__/dark-mode-theme.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/context/ThemeContext.tsx apps/web/src/App.tsx apps/web/src/components/front-desk/FrontDeskLayout.tsx apps/web/src/__tests__/dark-mode-theme.test.tsx
git commit -m "feat(front-desk): implement Night Audit Dark Mode with theme switcher"
```

---

### Task 8: Whole-Suite Verification, Regression Suite & Visual Proofs

**Files:**
- Test: Full web vitest suite (`pnpm --filter @keystay/web test:run`)
- Test: Full typecheck (`pnpm turbo run typecheck`)
- Test: Backend mocha test suite (`npm run test:all`)
- Artifact: Visual screenshots in `preview-responsive/`

**Interfaces:**
- Consumes: All implementations from Tasks 1 through 7
- Produces: 100% passing tests, verified zero regression on existing Front Desk workflows, clean build, and verified responsive screenshots.

- [ ] **Step 1: Run comprehensive web and backend test suites**
Run:
```bash
pnpm --filter @keystay/web test:run
node --test services/reservation/src/**/*.test.ts
pnpm turbo run typecheck
```
Expected: 100% passing, 0 TypeScript errors.

- [ ] **Step 2: Capture visual verification screenshots**
Capture screenshots via browser or script for:
1. `preview-responsive/14-room-card-contrast-and-quick-actions.png` (High-contrast amber badges & open 3-dots menu)
2. `preview-responsive/15-room-details-modal-2-tabs.png` (2-Tab layout: Stay & Folio vs Room & Housekeeping)
3. `preview-responsive/16-global-command-palette.png` (Omnibar `Ctrl+K` active search)
4. `preview-responsive/17-inline-instant-validation.png` (Red alert hints on blur)
5. `preview-responsive/18-night-audit-dark-mode.png` (Dark mode active)

- [ ] **Step 3: Commit final suite polish & visual proofs**
```bash
git add preview-responsive/ docs/superpowers/plans/
git commit -m "chore(front-desk): complete verification and capture visual proofs for Front Desk ergonomics"
```


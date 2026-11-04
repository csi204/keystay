import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('RoomMatrixPage — Unified Toolbar, Popover Filter, Auto-Refresh & Sub-Tabs', () => {
  const pagePath = path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/RoomMatrixPage.tsx');
  const gridPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomMatrixGrid.tsx');

  const pageCode = fs.readFileSync(pagePath, 'utf-8');
  const gridCode = fs.readFileSync(gridPath, 'utf-8');

  it('removes density toggle and manual refresh button per peer review', () => {
    // Density toggle removed completely from page
    assert.doesNotMatch(pageCode, /keystay_matrix_density/);
    assert.doesNotMatch(pageCode, /handleDensityChange/);
    assert.doesNotMatch(pageCode, /matrix\.compact/);
    assert.doesNotMatch(pageCode, /matrix\.comfortable/);

    // Manual refresh button removed
    assert.doesNotMatch(pageCode, /handleManualRefresh/);
    assert.doesNotMatch(pageCode, /<RotateCw/);
    assert.doesNotMatch(pageCode, /matrix\.refresh/);
  });

  it('provides unified action bar with search input filtering room number, room type, and guest name', () => {
    // Search input with lucide Search icon and responsive width
    assert.match(pageCode, /Search/);
    assert.match(pageCode, /w-full\s+sm:w-72\s+lg:w-80\s+h-9\s+text-xs\s+pl-8/);

    // Grid search logic matches room number, room type, and guest name
    assert.match(gridCode, /matchesNumber|roomNumber/);
    assert.match(gridCode, /matchesType|roomTypeId|roomType/);
    assert.match(gridCode, /matchesGuest|roomGuests/);
  });

  it('provides filter button opening popover with status and floor selectors and active counter badge', () => {
    // SlidersHorizontal icon for filter button
    assert.match(pageCode, /SlidersHorizontal/);
    assert.match(pageCode, /isFilterOpen/);
    assert.match(pageCode, /activeFilterCount/);

    // Filter controls: filterStatus and filterFloor
    assert.match(pageCode, /filterStatus/);
    assert.match(pageCode, /filterFloor/);

    // Click outside handler to dismiss popover
    assert.match(pageCode, /handleClickOutside|mousedown/);
  });

  it('renders live pulse indicator with tabular numbers and formatted auto-refresh timestamp', () => {
    // Emerald pulse dot
    assert.match(pageCode, /w-2\s+h-2\s+rounded-full\s+bg-emerald-500\s+animate-pulse/);

    // Tabular numbers and font-mono timestamp
    assert.match(pageCode, /font-mono\s+tabular-nums\s+text-xs\s+text-slate-500/);
    assert.match(pageCode, /matrix\.autoRefresh/);
  });

  it('provides sub-tabs switching between Matrix Grid and Reservations Table with zero data loss', () => {
    // Sub-tab state
    assert.match(pageCode, /activeSubTab/);

    // Tab 1: Grid (LayoutGrid icon)
    assert.match(pageCode, /LayoutGrid/);
    assert.match(pageCode, /matrix\.tabGrid/);

    // Tab 2: Reservations Table (CalendarDays icon)
    assert.match(pageCode, /CalendarDays/);
    assert.match(pageCode, /matrix\.tabReservations/);

    // Embedded reservations functionality: modals, new reservation, check-in
    assert.match(pageCode, /NewBookingModal/);
    assert.match(pageCode, /CheckInModal/);
    assert.match(pageCode, /checkInReservation/);
    assert.match(pageCode, /res\.newReservation/);
  });

  it('implements silent 30s background auto-refresh and immediate visibilitychange refetch', () => {
    // 30-second interval
    assert.match(pageCode, /30000|30\s*\*\s*1000/);
    assert.match(pageCode, /setInterval/);
    assert.match(pageCode, /clearInterval/);

    // visibilitychange listener
    assert.match(pageCode, /document\.addEventListener\(['"]visibilitychange['"]/);
    assert.match(pageCode, /document\.visibilityState\s*===\s*['"]visible['"]/);
    assert.match(pageCode, /document\.removeEventListener\(['"]visibilitychange['"]/);
  });

  it('provides 1:1 translation parity for new matrix sub-tabs and auto-refresh across TH and EN', () => {
    assert.strictEqual(typeof th['matrix.tabGrid'], 'string');
    assert.strictEqual(typeof en['matrix.tabGrid'], 'string');
    assert.strictEqual(typeof th['matrix.tabReservations'], 'string');
    assert.strictEqual(typeof en['matrix.tabReservations'], 'string');
    assert.strictEqual(typeof th['matrix.autoRefresh'], 'string');
    assert.strictEqual(typeof en['matrix.autoRefresh'], 'string');
    assert.strictEqual(typeof th['matrix.filter'], 'string');
    assert.strictEqual(typeof en['matrix.filter'], 'string');
  });
});

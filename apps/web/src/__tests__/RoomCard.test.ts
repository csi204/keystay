import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const getFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  return p1;
};

describe('RoomCard & RoomMatrixGrid — 4-Column Grid, Tempered Glass Status, Spec Chips & Quick Walk-In', () => {
  const roomCardPath = getFilePath('apps/web/src/components/front-desk/RoomCard.tsx');
  const matrixGridPath = getFilePath('apps/web/src/components/front-desk/RoomMatrixGrid.tsx');

  const roomCardCode = fs.readFileSync(roomCardPath, 'utf-8');
  const matrixGridCode = fs.readFileSync(matrixGridPath, 'utf-8');

  it('renders status pill with colored dot, black text, and tempered frosted glass styling', () => {
    // Tempered glass / frosted translucent styling
    assert.match(roomCardCode, /bg-slate-100\/70\s+backdrop-blur-xs\s+border\s+border-slate-200\/70/);
    assert.match(roomCardCode, /text-slate-900/);
    // Colored dot indicator
    assert.match(roomCardCode, /w-2\s+h-2\s+rounded-full\s+shrink-0/);
  });

  it('removes inner dividing lines inside the card body for clean modern aesthetics', () => {
    // border-t border-slate-100 removed from card sections
    assert.doesNotMatch(roomCardCode, /border-t\s+border-slate-100/);
  });

  it('displays available room spec micro-chips for BedDouble, Users, and Bath', () => {
    // Available room status check
    assert.match(roomCardCode, /room\.status\s*===\s*['"]available['"]/);
    // Lucide icons
    assert.match(roomCardCode, /BedDouble/);
    assert.match(roomCardCode, /Users/);
    assert.match(roomCardCode, /Bath/);
    // Micro-chip styling
    assert.match(
      roomCardCode,
      /bg-slate-50\s+border\s+border-slate-200\s+text-slate-700\s+text-\[11px\]\s+px-2\s+py-0\.5\s+rounded-md\s+font-medium/
    );
  });

  it('displays guest name and checkout date chip for occupied rooms', () => {
    // Occupied room guest chip styling
    assert.match(
      roomCardCode,
      /bg-blue-50\/80\s+border\s+border-blue-200\s+text-blue-900\s+text-xs\s+px-2\s+py-1\s+rounded-md/
    );
    // Displays checkout information
    assert.match(roomCardCode, /displayCheckout|checkoutDate/);
  });

  it('displays prominent maintenance reason box for maintenance and out_of_order rooms', () => {
    // Maintenance or out of order status check
    assert.match(roomCardCode, /maintenance/);
    assert.match(roomCardCode, /out_of_order/);
    // Prominent reason box styling
    assert.match(
      roomCardCode,
      /bg-amber-50\/90\s+border\s+border-amber-200\s+text-amber-800\s+text-xs\s+px-2\.5\s+py-1\.5\s+rounded-md\s+font-medium/
    );
  });

  it('provides hover walk-in quick action overlay for available rooms', () => {
    assert.match(roomCardCode, /onQuickBook/);
    assert.match(roomCardCode, /Zap/);
    assert.match(roomCardCode, /group-hover:opacity-100/);
    assert.match(roomCardCode, /เปิดห้องทันที\s*\(Walk-In\)/);
    assert.match(roomCardCode, /e\.stopPropagation\(\)/);
  });

  it('enforces strictly 4 columns on desktop in RoomMatrixGrid with clean floor header dividers', () => {
    // 4 columns on desktop
    assert.match(matrixGridCode, /grid\s+grid-cols-1\s+sm:grid-cols-2\s+md:grid-cols-3\s+lg:grid-cols-4\s+gap-3/);
    // Floor header icon Building2
    assert.match(matrixGridCode, /Building2/);
    // Floor divider hairline
    assert.match(matrixGridCode, /h-px\s+bg-slate-200\/80\s+flex-1\s+ml-3/);
    // Passes onQuickBook to RoomCard
    assert.match(matrixGridCode, /onQuickBook=\{onQuickBook\}/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  localizeRoomType,
  localizeRoomNote,
  localizeRoomDescription,
  localizeAmenity,
} from '../lib/localizeMetadata';

describe('Page 1 — Room Matrix & Room Details Drawer (Space & Localization Polish)', () => {
  it('optimizes FrontDeskLayout viewport width from max-w-7xl to max-w-[1600px]', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx'),
      'utf-8'
    );
    // Should use max-w-[1600px]
    assert.match(code, /max-w-\[1600px\]/);
    assert.match(code, /max-w-\[1600px\] w-full mx-auto px-4 sm:px-6 lg:px-8/);
    // Must NOT contain old narrow max-w-7xl
    assert.doesNotMatch(code, /max-w-7xl/);
  });

  it('updates RoomCard to localize room types and operational notes based on locale', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomCard.tsx'),
      'utf-8'
    );
    assert.match(code, /localizeRoomType/);
    assert.match(code, /localizeRoomNote/);
    assert.match(code, /from ['"]@\/lib\/localizeMetadata['"]/);

    // Functional verification
    assert.strictEqual(localizeRoomType('Standard Room', 'th'), 'ห้องสแตนดาร์ด');
    assert.strictEqual(localizeRoomType('Standard Room', 'en'), 'Standard Room');
    assert.strictEqual(localizeRoomNote('Near garden pathway', 'th'), 'ใกล้ทางเดินสวนหย่อม');
    assert.strictEqual(localizeRoomNote('Near garden pathway', 'en'), 'Near garden pathway');
  });

  it('updates RoomDetailsDrawer to localize room type, description, amenities, and notes cleanly', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomDetailsDrawer.tsx'),
      'utf-8'
    );
    assert.match(code, /localizeRoomType/);
    assert.match(code, /localizeRoomNote/);
    assert.match(code, /localizeRoomDescription/);
    assert.match(code, /localizeAmenity/);
    assert.match(code, /from ['"]@\/lib\/localizeMetadata['"]/);

    // Functional verification
    const sampleDesc = 'Comfortable modern room with city view, work desk, and private ensuite bathroom.';
    assert.strictEqual(
      localizeRoomDescription(sampleDesc, 'th'),
      'ห้องพักทันสมัยสะดวกสบายพร้อมวิวเมือง โต๊ะทำงาน และห้องน้ำส่วนตัวในตัว'
    );
    assert.strictEqual(localizeAmenity('Free Wi-Fi', 'th'), 'ฟรี Wi-Fi');
    assert.strictEqual(localizeAmenity('Free Wi-Fi', 'en'), 'Free Wi-Fi');
  });

  it('polishes RoomMatrixPage and RoomMatrixGrid toolbar density and grid spacing', () => {
    const pageCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'),
      'utf-8'
    );
    const gridCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomMatrixGrid.tsx'),
      'utf-8'
    );

    // Page header / toolbar layout clean spacing
    assert.match(pageCode, /RoomMatrixGrid/);
    // Grid density handling and 5-column responsive layout
    assert.match(gridCode, /lg:grid-cols-5/);
    assert.match(gridCode, /density/);
  });

  it('enforces upgraded typography scales across RoomCard, RoomDetailsDrawer, RoomMatrixPage, and RoomMatrixGrid', () => {
    const cardCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomCard.tsx'),
      'utf-8'
    );
    const drawerCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomDetailsDrawer.tsx'),
      'utf-8'
    );
    const pageCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'),
      'utf-8'
    );
    const gridCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomMatrixGrid.tsx'),
      'utf-8'
    );

    // RoomCard typography scale
    assert.match(cardCode, /text-lg font-bold font-mono tracking-tight text-slate-900/);
    assert.match(cardCode, /text-xs px-2\.5 py-0\.5 font-semibold/);
    assert.match(cardCode, /text-sm font-semibold text-slate-800/);
    assert.match(cardCode, /text-xs text-slate-600/);
    assert.match(cardCode, /text-xs sm:text-sm font-bold font-mono text-slate-900/);
    assert.match(cardCode, /text-xs sm:text-sm font-semibold text-blue-900/);
    assert.match(cardCode, /text-xs text-slate-600 leading-snug/);

    // RoomDetailsDrawer typography scale
    assert.match(drawerCode, /text-3xl font-bold font-mono text-slate-900/);
    assert.match(drawerCode, /text-sm font-medium px-3 py-1/);
    assert.match(drawerCode, /text-xs sm:text-sm text-slate-500/);
    assert.match(drawerCode, /text-base font-semibold text-slate-900/);
    assert.match(drawerCode, /text-sm leading-relaxed text-slate-700/);
    assert.match(drawerCode, /text-xs sm:text-sm px-2\.5 py-1 font-medium/);
    assert.match(drawerCode, /text-sm leading-relaxed text-amber-950/);
    assert.match(drawerCode, /text-sm font-semibold py-3/);

    // RoomMatrixPage and RoomMatrixGrid typography scale
    assert.match(pageCode, /text-2xl font-bold text-slate-900/);
    assert.match(pageCode, /text-sm text-slate-600/);
    assert.match(gridCode, /text-sm px-3\.5 py-1\.5 font-medium/);
    assert.match(gridCode, /text-sm py-2 px-3\.5/);
    assert.match(gridCode, /text-sm font-bold tracking-wider text-slate-700/);
  });
});

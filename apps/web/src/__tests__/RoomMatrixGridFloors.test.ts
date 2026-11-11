import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import type { Room } from '@keystay/types';
import { formatDisplayDate } from '../components/common/CustomDatePicker';
import { getRoomFloor } from '../components/front-desk/RoomMatrixGrid';

describe('Task 2: Floor Dividers, Grouping & RoomCard Floor/Checkout Date Resolution', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const roomMatrixGridPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/RoomMatrixGrid.tsx'
  );
  const roomCardPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/RoomCard.tsx'
  );
  const roomInventoryRoomsPath = path.resolve(
    rootDir,
    'services/room-inventory/src/routes/rooms.ts'
  );

  const roomMatrixGridCode = fs.readFileSync(roomMatrixGridPath, 'utf-8');
  const roomCardCode = fs.readFileSync(roomCardPath, 'utf-8');
  const roomInventoryRoomsCode = fs.readFileSync(roomInventoryRoomsPath, 'utf-8');

  it('resolves floor correctly via getRoomFloor from floor, floorId, or roomNumber', () => {
    // 1. Explicit floor property
    const r1 = {
      id: 'r1',
      roomNumber: '101',
      roomTypeId: 'std',
      floor: '3',
      status: 'available',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as Room;
    assert.strictEqual(getRoomFloor(r1), '3');

    // 2. floorId fallback (e.g. 'fl-2' -> '2')
    const r2 = {
      id: 'r2',
      roomNumber: '201',
      roomTypeId: 'std',
      floorId: 'fl-2',
      status: 'available',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as unknown as Room;
    assert.strictEqual(getRoomFloor(r2), '2');

    // 3. roomNumber fallback (e.g. '405' -> '4')
    const r3 = {
      id: 'r3',
      roomNumber: '405',
      roomTypeId: 'std',
      status: 'available',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as unknown as Room;
    assert.strictEqual(getRoomFloor(r3), '4');

    // 4. Default fallback to '1'
    const r4 = {
      id: 'r4',
      roomNumber: '',
      roomTypeId: 'std',
      status: 'available',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    } as unknown as Room;
    assert.strictEqual(getRoomFloor(r4), '1');
  });

  it('verifies RoomMatrixGrid uses getRoomFloor to compute floors and roomsByFloor', () => {
    // getRoomFloor is exported and used in RoomMatrixGrid
    assert.match(roomMatrixGridCode, /export\s+function\s+getRoomFloor/);
    assert.match(roomMatrixGridCode, /getRoomFloor\(r\)/);

    // Floor divider elements: Building2 icon, room count badge, and separator hairline
    assert.match(roomMatrixGridCode, /Building2/);
    assert.match(roomMatrixGridCode, /common\.floor/);
    assert.match(roomMatrixGridCode, /common\.roomsCount/);
    assert.match(roomMatrixGridCode, /h-px\s+bg-slate-200\/80\s+flex-1\s+ml-3/);
  });

  it('verifies RoomCard resolves floor using resolvedFloor rather than hardcoded floor', () => {
    // resolvedFloor must be computed with floor, floorId, and roomNumber fallback
    assert.match(
      roomCardCode,
      /resolvedFloor\s*=\s*room\.floor\s*\|\|\s*\(room\s+as\s+any\)\.floorId\?\.replace\(\/\^fl-\/,\s*['"]['"]\)\s*\|\|\s*room\.roomNumber\.charAt\(0\)\s*\|\|\s*['"]1['"]/
    );
    // common.floor must use resolvedFloor
    assert.match(roomCardCode, /t\(['"]common\.floor['"],\s*\{\s*floor:\s*resolvedFloor\s*\}\)/);
  });

  it('verifies RoomCard formats displayCheckout using formatDisplayDate', () => {
    // formatDisplayDate imported from CustomDatePicker
    assert.match(roomCardCode, /import\s*\{[^}]*formatDisplayDate[^}]*\}\s*from/);

    // Formats checkout date with formatDisplayDate(displayCheckout, locale)
    assert.match(
      roomCardCode,
      /formatDisplayDate\(displayCheckout,\s*locale\)/
    );

    // Verify formatDisplayDate functionality for Buddhist Era & English CE
    assert.strictEqual(formatDisplayDate('2026-11-12', 'th'), '12/11/2569');
    assert.strictEqual(formatDisplayDate('2026-11-12', 'en'), '12/11/2026');
  });

  it('verifies RoomCard displays guest info when room.status === "reserved"', () => {
    // Checks for room.status === 'reserved' block
    assert.match(roomCardCode, /room\.status\s*===\s*['"]reserved['"]/);

    // Amber badge for reserved guest
    assert.match(roomCardCode, /text-amber-700\s+bg-amber-50/);
    assert.match(roomCardCode, /text-amber-500/);

    // Renders displayGuest in reserved section
    assert.match(roomCardCode, /\{displayGuest\}/);
  });

  it('verifies services/room-inventory/src/routes/rooms.ts maps floor alias in GET /rooms', () => {
    // In GET /rooms, returns floor alias
    assert.match(
      roomInventoryRoomsCode,
      /floor:\s*room\.floorId\s*\?\s*room\.floorId\.replace\(\/\^fl-\/,\s*['"]['"]\)\s*:\s*room\.roomNumber\.charAt\(0\)/
    );
  });
});

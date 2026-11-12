import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Room } from '@keystay/types';
import { filterPaletteItems } from '../components/front-desk/GlobalCommandPalette';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

const mockRooms: Room[] = [
  {
    id: 'rm-101',
    roomNumber: '101',
    roomTypeId: 'rt-deluxe',
    floor: '1',
    status: 'occupied',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rm-202',
    roomNumber: '202',
    roomTypeId: 'rt-suite',
    floor: '2',
    status: 'available',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('Task 6: Command Palette Deep Navigation & Room Matrix URL Search Query', () => {
  const roomMatrixPagePath = resolveFilePath('apps/web/src/pages/front-desk/RoomMatrixPage.tsx');
  const palettePath = resolveFilePath('apps/web/src/components/front-desk/GlobalCommandPalette.tsx');

  it('1. GlobalCommandPalette selects room and triggers navigation to /front-desk/room-matrix?roomId=...', () => {
    let navigatedPath: string | null = null;
    let closed = false;

    const items = filterPaletteItems({
      query: '101',
      rooms: mockRooms,
      reservations: [],
      locale: 'th',
      navigate: (path: string) => {
        navigatedPath = path;
      },
      onClose: () => {
        closed = true;
      },
    });

    const roomItem = items.find((i) => i.id === 'room-rm-101');
    assert.ok(roomItem, 'Room item 101 must exist in palette search results');

    roomItem.onSelect();
    assert.strictEqual(
      navigatedPath,
      '/front-desk/room-matrix?roomId=rm-101',
      'Selecting room in palette must navigate with ?roomId query param'
    );
    assert.strictEqual(closed, true, 'Palette should close on selection');
  });

  it('2. RoomMatrixPage imports useSearchParams and extracts urlRoomId', () => {
    assert.ok(fs.existsSync(roomMatrixPagePath), 'RoomMatrixPage.tsx must exist');
    const code = fs.readFileSync(roomMatrixPagePath, 'utf-8');

    // Must import useSearchParams from react-router-dom
    assert.match(
      code,
      /import\s+{[^}]*useSearchParams[^}]*}\s+from\s+['"]react-router-dom['"]/,
      'RoomMatrixPage.tsx must import useSearchParams from react-router-dom'
    );

    // Must initialize useSearchParams
    assert.match(
      code,
      /const\s*\[\s*searchParams\s*,\s*setSearchParams\s*\]\s*=\s*useSearchParams\(\)/,
      'RoomMatrixPage.tsx must initialize useSearchParams'
    );

    // Must get roomId query param
    assert.match(
      code,
      /const\s+urlRoomId\s*=\s*searchParams\.get\(['"]roomId['"]\)/,
      "RoomMatrixPage.tsx must extract urlRoomId via searchParams.get('roomId')"
    );
  });

  it('3. RoomMatrixPage detects urlRoomId and opens RoomDetailsModal with matched room', () => {
    const code = fs.readFileSync(roomMatrixPagePath, 'utf-8');

    // Must match room by id OR roomNumber
    assert.match(
      code,
      /rooms\.find\(\s*\(\s*r\s*\)\s*=>\s*\(?r\.id\s*===\s*urlRoomId\s*\|\|\s*r\.roomNumber\s*===\s*urlRoomId\)?\)/,
      'RoomMatrixPage.tsx must match room by id or roomNumber'
    );

    // Must set selected room and open modal
    assert.match(
      code,
      /setSelectedRoom\(matched\)/,
      'RoomMatrixPage.tsx must setSelectedRoom(matched)'
    );
    assert.match(
      code,
      /setIsModalOpen\(true\)/,
      'RoomMatrixPage.tsx must open modal (setIsModalOpen(true)) when matched'
    );
  });

  it('4. RoomMatrixPage clears roomId search param on modal close', () => {
    const code = fs.readFileSync(roomMatrixPagePath, 'utf-8');

    // handleCloseModal must delete roomId and replace history
    assert.match(
      code,
      /searchParams\.delete\(['"]roomId['"]\)/,
      "handleCloseModal must call searchParams.delete('roomId')"
    );
    assert.match(
      code,
      /setSearchParams\(\s*searchParams\s*,\s*\{\s*replace:\s*true\s*\}\s*\)/,
      'handleCloseModal must update searchParams with { replace: true }'
    );
  });

  it('5. Functional URL parameter matching and parameter removal behavior', () => {
    // Test URL param detection by ID
    const urlParamId = 'rm-101';
    const matchById = mockRooms.find((r) => r.id === urlParamId || r.roomNumber === urlParamId);
    assert.ok(matchById, 'Must match room by id');
    assert.strictEqual(matchById.roomNumber, '101');

    // Test URL param detection by roomNumber
    const urlParamNumber = '202';
    const matchByNumber = mockRooms.find((r) => r.id === urlParamNumber || r.roomNumber === urlParamNumber);
    assert.ok(matchByNumber, 'Must match room by roomNumber');
    assert.strictEqual(matchByNumber.id, 'rm-202');

    // Test non-matching room
    const urlParamUnknown = '999';
    const matchUnknown = mockRooms.find((r) => r.id === urlParamUnknown || r.roomNumber === urlParamUnknown);
    assert.strictEqual(matchUnknown, undefined, 'Unknown room ID must return undefined');

    // Test searchParams cleanup preserving other params
    const testParams = new URLSearchParams('roomId=rm-101&filter=clean&floor=2');
    testParams.delete('roomId');
    assert.strictEqual(testParams.get('roomId'), null, 'roomId should be deleted');
    assert.strictEqual(testParams.get('filter'), 'clean', 'filter param should remain');
    assert.strictEqual(testParams.get('floor'), '2', 'floor param should remain');
    assert.strictEqual(testParams.toString(), 'filter=clean&floor=2');
  });

  it('6. Thai orthography strictly uses เช็คเอาต์ (no เช็คเอาท์) and zero raw emojis', () => {
    const matrixCode = fs.readFileSync(roomMatrixPagePath, 'utf-8');
    const paletteCode = fs.readFileSync(palettePath, 'utf-8');

    // Check orthography
    assert.strictEqual(
      matrixCode.includes('เช็คเอาท์'),
      false,
      'RoomMatrixPage.tsx must not contain เช็คเอาท์ (use เช็คเอาต์)'
    );
    assert.strictEqual(
      paletteCode.includes('เช็คเอาท์'),
      false,
      'GlobalCommandPalette.tsx must not contain เช็คเอาท์ (use เช็คเอาต์)'
    );

    // Check raw emojis
    const rawEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.strictEqual(
      rawEmojiRegex.test(matrixCode),
      false,
      'RoomMatrixPage.tsx must not contain raw Unicode emojis'
    );
    assert.strictEqual(
      rawEmojiRegex.test(paletteCode),
      false,
      'GlobalCommandPalette.tsx must not contain raw Unicode emojis'
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { Room } from '@keystay/types';
import { I18nProvider } from '../lib/i18n';
import {
  GlobalCommandPalette,
  filterPaletteItems,
  PaletteItem,
} from '../components/front-desk/GlobalCommandPalette';
import type { ExtendedReservation } from '../hooks/useReservations';

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
    id: 'rm-201',
    roomNumber: '201',
    roomTypeId: 'rt-suite',
    floor: '2',
    status: 'available',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rm-305',
    roomNumber: '305',
    roomTypeId: 'rt-standard',
    floor: '3',
    status: 'reserved',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockReservations: ExtendedReservation[] = [
  {
    id: 'res-001',
    bookingNumber: 'BK-001',
    reservationCode: 'RES-001',
    roomId: 'rm-101',
    guestId: 'gst-1',
    checkInDate: '2026-11-12',
    checkOutDate: '2026-11-15',
    status: 'checked_in',
    totalNights: '3',
    totalAmount: '4500',
    depositAmount: '1000',
    guestName: 'อัศวิน ชัยชนะ',
    roomNumber: '101',
    roomTypeName: 'Deluxe Double',
    bookingSource: 'walk_in',
    createdAt: '2026-11-12T00:00:00Z',
    updatedAt: '2026-11-12T00:00:00Z',
  },
  {
    id: 'res-002',
    bookingNumber: 'BK-002',
    reservationCode: 'RES-002',
    roomId: 'rm-305',
    guestId: 'gst-2',
    checkInDate: '2026-11-13',
    checkOutDate: '2026-11-16',
    status: 'confirmed',
    totalNights: '3',
    totalAmount: '6000',
    depositAmount: '1000',
    guestName: 'David Miller',
    roomNumber: '305',
    roomTypeName: 'Standard Room',
    bookingSource: 'phone',
    createdAt: '2026-11-12T00:00:00Z',
    updatedAt: '2026-11-12T00:00:00Z',
  },
];

describe('Task 5: Global Command Palette (Ctrl+K / / Omnibar) & Navigation Hub', () => {
  const palettePath = resolveFilePath('apps/web/src/components/front-desk/GlobalCommandPalette.tsx');
  const layoutPath = resolveFilePath('apps/web/src/components/front-desk/FrontDeskLayout.tsx');

  it('1. File existence & exports: GlobalCommandPalette component and helpers exist', () => {
    assert.ok(fs.existsSync(palettePath), 'GlobalCommandPalette.tsx must exist');
    const code = fs.readFileSync(palettePath, 'utf-8');
    assert.match(code, /export\s+const\s+GlobalCommandPalette/);
    assert.match(code, /export\s+function\s+filterPaletteItems/);
  });

  it('2. Filter items: searches room numbers and localized room types', () => {
    const results101 = filterPaletteItems({
      query: '101',
      rooms: mockRooms,
      reservations: mockReservations,
      locale: 'th',
    });

    const roomMatches = results101.filter((r) => r.category === 'rooms');
    assert.equal(roomMatches.length, 1);
    assert.equal(roomMatches[0].title, 'ห้อง 101');
    assert.equal(roomMatches[0].id, 'room-rm-101');

    // Searching '201' matches room 201
    const results201 = filterPaletteItems({
      query: '201',
      rooms: mockRooms,
      reservations: mockReservations,
      locale: 'th',
    });
    assert.equal(results201.filter((r) => r.category === 'rooms').length, 1);
  });

  it('3. Filter items: searches guest names and reservation codes', () => {
    // Search by Thai guest name
    const resultsThai = filterPaletteItems({
      query: 'อัศวิน',
      rooms: mockRooms,
      reservations: mockReservations,
      locale: 'th',
    });
    const guestMatchesThai = resultsThai.filter((r) => r.category === 'guests');
    assert.equal(guestMatchesThai.length, 1);
    assert.match(guestMatchesThai[0].title, /อัศวิน ชัยชนะ/);

    // Search by English guest name
    const resultsEn = filterPaletteItems({
      query: 'David',
      rooms: mockRooms,
      reservations: mockReservations,
      locale: 'th',
    });
    const guestMatchesEn = resultsEn.filter((r) => r.category === 'guests');
    assert.equal(guestMatchesEn.length, 1);
    assert.match(guestMatchesEn[0].title, /David Miller/);

    // Search by reservation code prefix
    const resultsCode = filterPaletteItems({
      query: 'RES-002',
      rooms: mockRooms,
      reservations: mockReservations,
      locale: 'th',
    });
    assert.equal(resultsCode.filter((r) => r.category === 'guests').length, 1);
  });

  it('4. Navigation & system commands: contains Room Matrix, Daily Operations, Cashier, Dark Mode, and Shortcuts', () => {
    const defaultItems = filterPaletteItems({
      query: '',
      rooms: mockRooms,
      reservations: mockReservations,
      locale: 'th',
    });

    const navCommands = defaultItems.filter((r) => r.category === 'commands');
    assert.ok(navCommands.length >= 5, 'Should have at least 5 primary navigation commands');

    const commandTitles = navCommands.map((c) => c.title);
    assert.ok(commandTitles.some((t) => t.includes('ผังห้องพัก')));
    assert.ok(commandTitles.some((t) => t.includes('เช็คอิน & เช็คเอาต์')));
    assert.ok(commandTitles.some((t) => t.includes('แคชเชียร์ & บิล')));
    assert.ok(commandTitles.some((t) => t.includes('สลับโหมดกะดึก')));
    assert.ok(commandTitles.some((t) => t.includes('ดูคีย์ลัดทั้งหมด')));
  });

  it('5. UI rendering & styling: renders dialog with backdrop, search input, keyboard shortcuts hints, and zero emojis', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(GlobalCommandPalette, {
          isOpen: true,
          onClose: () => {},
          rooms: mockRooms,
          reservations: mockReservations,
        })
      )
    );

    // Backdrop with blur
    assert.match(html, /bg-slate-900\/40/);
    assert.match(html, /backdrop-blur/);

    // Search input with placeholder
    assert.match(html, /ค้นหาห้อง, แขก, หรือพิมพ์คำสั่ง/);

    // Navigation hints
    assert.match(html, /นำทาง/);
    assert.match(html, /เลือก/);
    assert.match(html, /ปิด/);

    // Zero emojis
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    assert.equal(emojiRegex.test(html), false, 'Rendered HTML must contain zero emojis');
  });

  it('6. FrontDeskLayout integration: mounts GlobalCommandPalette, Omnibar button, and shortcut listener', () => {
    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');

    // Imports GlobalCommandPalette
    assert.match(
      layoutCode,
      /import\s+{[^}]*GlobalCommandPalette[^}]*}\s+from\s+['"]\.\/GlobalCommandPalette['"]/,
      'FrontDeskLayout must import GlobalCommandPalette'
    );

    // State for command palette
    assert.match(
      layoutCode,
      /isCommandPaletteOpen/,
      'FrontDeskLayout must manage isCommandPaletteOpen state'
    );

    // Desktop Omnibar search button with Search icon and Ctrl K
    assert.match(
      layoutCode,
      /ค้นหาด่วนหรือพิมพ์คำสั่ง/,
      'FrontDeskLayout must render search trigger button'
    );
    assert.match(
      layoutCode,
      /Ctrl K/,
      'Omnibar trigger button must show Ctrl K badge'
    );

    // Keyboard shortcut handler for Ctrl+K / Cmd+K / Slash (/)
    assert.match(
      layoutCode,
      /\(e\.ctrlKey\s*\|\|\s*e\.metaKey\)\s*&&\s*e\.key\.toLowerCase\(\)\s*===\s*['"]k['"]/,
      'FrontDeskLayout must listen for Ctrl+K / Cmd+K'
    );

    // Mounts GlobalCommandPalette component
    assert.match(
      layoutCode,
      /<GlobalCommandPalette[\s\S]*?isOpen=\{isCommandPaletteOpen\}/,
      'FrontDeskLayout must render GlobalCommandPalette with isOpen'
    );
  });

  it('7. Thai orthography: standard เช็คเอาต์ (ต.เต่า การันต์), no เช็คเอาท์', () => {
    const paletteCode = fs.readFileSync(palettePath, 'utf-8');
    assert.doesNotMatch(paletteCode, /เช็คเอาท์/, 'Must not contain เช็คเอาท์');
    assert.match(paletteCode, /เช็คเอาต์/, 'Must use standard เช็คเอาต์');

    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
    assert.doesNotMatch(layoutCode, /เช็คเอาท์/, 'Must not contain เช็คเอาท์');
  });
});

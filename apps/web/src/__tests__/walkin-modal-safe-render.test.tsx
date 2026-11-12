import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { WalkInModal } from '../components/front-desk/WalkInModal';
import { Room } from '@keystay/types';

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
    id: 'room-101',
    roomNumber: '101',
    roomTypeId: 'type-std',
    status: 'available',
    floor: 1,
  } as unknown as Room,
  {
    id: 'room-102',
    roomNumber: '102',
    roomTypeId: 'type-dlx',
    status: 'available',
    floor: 1,
  } as unknown as Room,
];

describe('Task 2: Walk-In Modal Crash Fix & Booking Source Simplification', () => {
  const walkInModalPath = resolveFilePath('apps/web/src/components/front-desk/WalkInModal.tsx');
  const dailyOpsPath = resolveFilePath('apps/web/src/pages/front-desk/DailyOperationsPage.tsx');
  const roomDetailsModalPath = resolveFilePath('apps/web/src/components/front-desk/RoomDetailsModal.tsx');

  it('1. WalkInModal renders safely without throwing when roomTypes is undefined', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(WalkInModal, {
          isOpen: true,
          availableRooms: mockRooms,
          rooms: mockRooms,
          roomTypes: undefined as any,
          onClose: () => {},
          onSubmit: async () => ({ success: true }),
        })
      );
      assert.ok(html.includes('101'), 'Should render room number 101');
      assert.ok(html.includes('เปิดห้องด่วน (Walk-In Check-In)'), 'Should render modal title');
    });
  });

  it('2. WalkInModal renders safely without throwing when roomTypes is an empty array', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(WalkInModal, {
          isOpen: true,
          availableRooms: mockRooms,
          rooms: mockRooms,
          roomTypes: [],
          onClose: () => {},
          onSubmit: async () => ({ success: true }),
        })
      );
      assert.ok(html.includes('101'), 'Should render room number 101');
      assert.ok(html.includes('เปิดห้องด่วน (Walk-In Check-In)'), 'Should render modal title');
    });
  });

  it('3. WalkInModal does NOT render booking source tabs ("โทรศัพท์เข้ามาจอง" or "เพจ Facebook")', () => {
    const html = renderToStaticMarkup(
      React.createElement(WalkInModal, {
        isOpen: true,
        availableRooms: mockRooms,
        rooms: mockRooms,
        roomTypes: [],
        onClose: () => {},
        onSubmit: async () => ({ success: true }),
      })
    );

    assert.ok(!html.includes('โทรศัพท์เข้ามาจอง'), 'Must not render phone booking tab');
    assert.ok(!html.includes('เพจ Facebook'), 'Must not render Facebook booking tab');
    assert.ok(!html.includes('BOOKING SOURCE'), 'Must not render booking source header');
    assert.ok(!html.includes('ช่องทางการจอง'), 'Must not render booking source label');
  });

  it('4. WalkInModal source code hardcodes and passes bookingSource: "walk_in" on submission', () => {
    assert.ok(fs.existsSync(walkInModalPath), 'WalkInModal.tsx must exist');
    const code = fs.readFileSync(walkInModalPath, 'utf-8');

    // onSubmit call must pass bookingSource: 'walk_in'
    assert.match(
      code,
      /bookingSource:\s*['"]walk_in['"]/,
      'WalkInModal onSubmit payload must include bookingSource: "walk_in"'
    );

    // Defensive guards for roomTypes
    assert.match(
      code,
      /\(roomTypes\s*\|\|\s*\[\]\)\.find/,
      'WalkInModal must use (roomTypes || []).find(...) to prevent undefined crash'
    );
  });

  it('5. DailyOperationsPage and RoomDetailsModal pass safe fallbacks for roomTypes', () => {
    assert.ok(fs.existsSync(dailyOpsPath), 'DailyOperationsPage.tsx must exist');
    const dailyOpsCode = fs.readFileSync(dailyOpsPath, 'utf-8');

    // RapidWalkInModal invocation must use roomTypes={roomTypes || []} or safe fallback
    assert.match(
      dailyOpsCode,
      /<RapidWalkInModal[\s\S]*?roomTypes=\{roomTypes\s*\|\|\s*\[\]\}/,
      'DailyOperationsPage must pass roomTypes={roomTypes || []} to RapidWalkInModal'
    );

    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx must exist');
    const roomDetailsCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // RoomDetailsModal onWalkInCheckIn must also pass bookingSource: 'walk_in'
    assert.match(
      roomDetailsCode,
      /bookingSource:\s*['"]walk_in['"]/,
      'RoomDetailsModal must ensure walk_in bookingSource'
    );
  });
});

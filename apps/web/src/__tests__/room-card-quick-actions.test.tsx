import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { Room } from '@keystay/types';
import { I18nProvider } from '../lib/i18n';
import { RoomCard, getRoomQuickActions } from '../components/front-desk/RoomCard';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

const mockRoom = (status: Room['status'], id = 'rm-101', roomNumber = '101'): Room => ({
  id,
  roomNumber,
  roomTypeId: 'rt-deluxe',
  floor: '1',
  status,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

describe('Task 4: Quick Actions Context Menu (... MoreVertical) on RoomCard', () => {
  const roomCardPath = resolveFilePath('apps/web/src/components/front-desk/RoomCard.tsx');
  const roomMatrixGridPath = resolveFilePath('apps/web/src/components/front-desk/RoomMatrixGrid.tsx');
  const roomMatrixPagePath = resolveFilePath('apps/web/src/pages/front-desk/RoomMatrixPage.tsx');

  const roomCardCode = fs.readFileSync(roomCardPath, 'utf-8');
  const roomMatrixGridCode = fs.readFileSync(roomMatrixGridPath, 'utf-8');
  const roomMatrixPageCode = fs.readFileSync(roomMatrixPagePath, 'utf-8');

  it('1. Button & Event Isolation: renders 3-dots MoreVertical button with correct classes and stopPropagation', () => {
    // Check Lucide icon import
    assert.match(
      roomCardCode,
      /import\s+{[^}]*MoreVertical[^}]*}\s+from\s+['"]lucide-react['"]/,
      'RoomCard.tsx must import MoreVertical from lucide-react'
    );

    // Check button icon styling classes specified in brief
    assert.match(
      roomCardCode,
      /w-3\.5\s+h-3\.5\s+text-slate-400\s+hover:text-slate-800\s+dark:hover:text-slate-200/,
      'MoreVertical button icon must have specified styling'
    );

    // Check stopPropagation on trigger to prevent card onClick from firing
    assert.match(
      roomCardCode,
      /onClick=\{\s*\(e\)\s*=>\s*\{[\s\S]*?e\.stopPropagation\(\)[\s\S]*?setIsMenuOpen/,
      'MoreVertical button click must call e.stopPropagation() and toggle menu state'
    );

    // Check click outside listener
    assert.match(
      roomCardCode,
      /handleClickOutside[\s\S]*?contains\(e\.target[\s\S]*?setIsMenuOpen\(false\)/,
      'Context menu must auto-close on click outside'
    );
  });

  it('2. Context-Aware Actions: available room generates walkin and booking quick actions', () => {
    const availableRoom = mockRoom('available');
    const actions = getRoomQuickActions(availableRoom, 'th');

    const actionIds = actions.map((a) => a.id);
    assert.deepEqual(
      actionIds,
      ['walkin', 'booking'],
      'Available room must have walkin and booking quick actions'
    );

    const walkInAction = actions.find((a) => a.id === 'walkin');
    assert.ok(walkInAction, 'walkin action must exist');
    assert.equal(walkInAction?.label, 'เปิดห้องด่วน (Walk-In)');

    const bookingAction = actions.find((a) => a.id === 'booking');
    assert.ok(bookingAction, 'booking action must exist');
    assert.equal(bookingAction?.label, 'สร้างการจองใหม่');
  });

  it('3. Context-Aware Actions: occupied room generates cashier, extend, extra_charge, and checkout actions', () => {
    const occupiedRoom = mockRoom('occupied');
    const actions = getRoomQuickActions(occupiedRoom, 'th');

    const actionIds = actions.map((a) => a.id);
    assert.deepEqual(
      actionIds,
      ['cashier', 'extend', 'extra_charge', 'checkout'],
      'Occupied room must have cashier, extend, extra_charge, and checkout actions'
    );

    assert.equal(actions.find((a) => a.id === 'cashier')?.label, 'ดูบิลแคชเชียร์');
    assert.equal(actions.find((a) => a.id === 'extend')?.label, 'ขยายเวลาเข้าพัก');
    assert.equal(actions.find((a) => a.id === 'extra_charge')?.label, 'เพิ่มค่าใช้จ่าย / มินิบาร์');
    assert.equal(actions.find((a) => a.id === 'checkout')?.label, 'เช็คเอาต์');
  });

  it('4. Context-Aware Actions: reserved room generates checkin and view actions', () => {
    const reservedRoom = mockRoom('reserved');
    const actions = getRoomQuickActions(reservedRoom, 'th');

    const actionIds = actions.map((a) => a.id);
    assert.deepEqual(
      actionIds,
      ['checkin', 'view'],
      'Reserved room must have checkin and view actions'
    );

    assert.equal(actions.find((a) => a.id === 'checkin')?.label, 'เช็คอินทันที');
    assert.equal(actions.find((a) => a.id === 'view')?.label, 'ดูรายละเอียดห้อง');
  });

  it('5. Zero Unicode emojis & standard Thai spelling in RoomCard quick actions', () => {
    // Emoji regex
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    assert.equal(
      emojiRegex.test(roomCardCode),
      false,
      'RoomCard.tsx must contain zero raw emojis'
    );

    // Thai spelling of checkout must be เช็คเอาต์ (ต.เต่า การันต์), never เช็คเอาท์
    assert.doesNotMatch(roomCardCode, /เช็คเอาท์/, 'RoomCard must never use เช็คเอาท์');
    assert.match(roomCardCode, /เช็คเอาต์/, 'RoomCard must use standard เช็คเอาต์');
  });

  it('6. Props and Forwarding: RoomCardProps and RoomMatrixGridProps accept onQuickAction', () => {
    // RoomCardProps
    assert.match(
      roomCardCode,
      /onQuickAction\?:\s*\(action:\s*string,\s*room:\s*Room\)\s*=>\s*void/,
      'RoomCardProps must define onQuickAction'
    );

    // RoomMatrixGridProps
    assert.match(
      roomMatrixGridCode,
      /onQuickAction\?:\s*\(action:\s*string,\s*room:\s*Room\)\s*=>\s*void/,
      'RoomMatrixGridProps must define onQuickAction'
    );

    // RoomMatrixGrid forwards onQuickAction to RoomCard
    assert.match(
      roomMatrixGridCode,
      /onQuickAction=\{onQuickAction\}/,
      'RoomMatrixGrid must pass onQuickAction to RoomCard'
    );
  });

  it('7. RoomMatrixPage integration: wires onQuickAction and handles all quick action targets', () => {
    // Passes onQuickAction to RoomMatrixGrid
    assert.match(
      roomMatrixPageCode,
      /<RoomMatrixGrid[\s\S]*?onQuickAction=\{handleQuickAction\}/,
      'RoomMatrixPage must pass onQuickAction={handleQuickAction} to RoomMatrixGrid'
    );

    // Handles walkin action
    assert.match(
      roomMatrixPageCode,
      /action\s*===\s*['"]walkin['"]/,
      'handleQuickAction must handle walkin'
    );

    // Handles booking action
    assert.match(
      roomMatrixPageCode,
      /action\s*===\s*['"]booking['"]/,
      'handleQuickAction must handle booking'
    );

    // Handles cashier action -> navigates to /front-desk/cashier?roomId=
    assert.match(
      roomMatrixPageCode,
      /navigate\([`'"]\/front-desk\/cashier\?roomId=/,
      'handleQuickAction must navigate to /front-desk/cashier?roomId=${room.id}'
    );

    // Handles checkout action -> navigates to /front-desk/daily-operations
    assert.match(
      roomMatrixPageCode,
      /navigate\(['"]\/front-desk\/daily-operations['"],\s*\{\s*state:\s*\{\s*roomId:\s*room\.id,\s*action:\s*['"]checkout['"]/,
      'handleQuickAction must navigate to /front-desk/daily-operations with checkout action'
    );

    // Handles extend action
    assert.match(
      roomMatrixPageCode,
      /action\s*===\s*['"]extend['"]/,
      'handleQuickAction must handle extend'
    );

    // Handles extra_charge action
    assert.match(
      roomMatrixPageCode,
      /action\s*===\s*['"]extra_charge['"]/,
      'handleQuickAction must handle extra_charge'
    );

    // Handles checkin action
    assert.match(
      roomMatrixPageCode,
      /action\s*===\s*['"]checkin['"]/,
      'handleQuickAction must handle checkin'
    );
  });

  it('8. Runtime HTML rendering: renders MoreVertical quick action button on RoomCard', () => {
    const room = mockRoom('available');
    let cardClicked = false;
    let quickActionTriggered = false;

    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(RoomCard, {
          room,
          onClick: () => {
            cardClicked = true;
          },
          onQuickAction: () => {
            quickActionTriggered = true;
          },
        })
      )
    );

    // Button should be rendered with Quick Actions aria-label
    assert.match(html, /aria-label="Quick Actions"/);
    // Button styling classes present
    assert.match(html, /text-slate-400\s+hover:text-slate-800/);
    // Room number 101 rendered
    assert.match(html, /101/);
  });
});

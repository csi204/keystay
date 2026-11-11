import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { computePlacement } from '../components/common/CustomDatePicker';

describe('Task 4: Extend Stay State Synchronization & DatePicker Smart Bounds', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const extendStayModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/ExtendStayModal.tsx'
  );
  const roomDetailsModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/RoomDetailsModal.tsx'
  );
  const customDatePickerPath = path.resolve(
    rootDir,
    'apps/web/src/components/common/CustomDatePicker.tsx'
  );
  const reservationsRoutePath = path.resolve(
    rootDir,
    'services/reservation/src/routes/reservations.ts'
  );

  it('verifies all target files exist', () => {
    assert.ok(fs.existsSync(extendStayModalPath), 'ExtendStayModal.tsx should exist');
    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
    assert.ok(fs.existsSync(customDatePickerPath), 'CustomDatePicker.tsx should exist');
    assert.ok(fs.existsSync(reservationsRoutePath), 'reservations.ts should exist');
  });

  it('CustomDatePicker computePlacement computes "top" when popover overflows or clearance is < 300px', () => {
    // Space below is 800 - 550 = 250px (< 300px and < 320px popover) -> 'top'
    assert.strictEqual(computePlacement({ bottom: 550 }, 800, 320), 'top');

    // Space below is 800 - 700 = 100px (< 300px) -> 'top'
    assert.strictEqual(computePlacement({ bottom: 700 }, 800, 320), 'top');

    // Space below is 800 - 520 = 280px (< 300px clearance requirement) -> 'top'
    assert.strictEqual(computePlacement({ bottom: 520 }, 800, 320), 'top');

    // Space below is 800 - 200 = 600px (> 300px and 200 + 320 < 800) -> 'bottom'
    assert.strictEqual(computePlacement({ bottom: 200 }, 800, 320), 'bottom');

    // Null or undefined rect defaults to 'bottom'
    assert.strictEqual(computePlacement(null, 800, 320), 'bottom');
  });

  it('ExtendStayModal wires useToast and calls toast.showSuccess and onSuccess(updatedRes)', () => {
    const code = fs.readFileSync(extendStayModalPath, 'utf-8');

    // Must import useToast from ToastContext
    assert.match(
      code,
      /import\s*\{\s*useToast\s*\}\s*from\s*['"]@\/context\/ToastContext['"]/,
      'ExtendStayModal must import useToast from ToastContext'
    );

    // Must call useToast()
    assert.match(code, /const\s+.*useToast\(\)/, 'ExtendStayModal must invoke useToast()');

    // Must call toast.showSuccess or showSuccess on successful extension
    assert.match(
      code,
      /(?:toast\.)?showSuccess\(/,
      'ExtendStayModal must call toast.showSuccess upon successful extension'
    );

    // Must pass updated reservation data to onSuccess callback
    assert.match(
      code,
      /onSuccess\?\.\s*\(\s*(?:res\.data|updatedRes)/,
      'ExtendStayModal must call onSuccess with updated reservation data'
    );
  });

  it('RoomDetailsModal manages currentReservation state, passes onSuccess to ExtendStayModal, and triggers onAction("refresh", room)', () => {
    const code = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // Must define currentReservation state and setCurrentReservation
    assert.match(
      code,
      /setCurrentReservation/,
      'RoomDetailsModal must have setCurrentReservation state updater'
    );

    // RoomModalAction must include 'refresh'
    assert.match(
      code,
      /'refresh'/,
      'RoomModalAction or onAction must support "refresh" action'
    );

    // ExtendStayModal invocation in RoomDetailsModal must pass onSuccess
    assert.match(
      code,
      /<ExtendStayModal[\s\S]*?onSuccess=\{[\s\S]*?setCurrentReservation[\s\S]*?onAction\?\.\(['"]refresh['"],\s*room\)[\s\S]*?\}/,
      'ExtendStayModal must receive onSuccess callback that updates currentReservation and calls onAction("refresh", room)'
    );

    // RoomDetailsModal displays checkout date in active reservation card
    assert.match(
      code,
      /checkOutDate/,
      'RoomDetailsModal must render checkOutDate from currentReservation'
    );
  });

  it('services/reservation/src/routes/reservations.ts handleExtendStay accepts confirmed, checked_in, and extended statuses', () => {
    const code = fs.readFileSync(reservationsRoutePath, 'utf-8');

    // Verify handleExtendStay allows 'confirmed' alongside 'checked_in' and 'extended'
    assert.match(
      code,
      /existing\.status\s*!==\s*['"]checked_in['"]\s*&&\s*existing\.status\s*!==\s*['"]extended['"]\s*&&\s*existing\.status\s*!==\s*['"]confirmed['"]/,
      'handleExtendStay must accept "confirmed", "checked_in", and "extended" statuses'
    );
  });
});

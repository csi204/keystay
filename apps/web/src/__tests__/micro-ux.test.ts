import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { formatRelativeTime } from '../lib/i18n';

describe('Swiss Numerals & Selective Refresh Micro-UX', () => {
  it('formats relative refresh timestamp cleanly', () => {
    const now = new Date();
    assert.strictEqual(formatRelativeTime(now, 'th'), 'อัปเดตเมื่อสักครู่');
    assert.strictEqual(formatRelativeTime(now, 'en'), 'Updated just now');

    const twoMinutesAgo = new Date(Date.now() - 120000);
    assert.strictEqual(formatRelativeTime(twoMinutesAgo, 'th'), 'อัปเดต 2 นาทีที่แล้ว');
    assert.strictEqual(formatRelativeTime(twoMinutesAgo, 'en'), 'Updated 2m ago');

    const oneHourAgo = new Date(Date.now() - 3600000);
    assert.strictEqual(formatRelativeTime(oneHourAgo, 'th'), 'อัปเดต 1 ชม. ที่แล้ว');
    assert.strictEqual(formatRelativeTime(oneHourAgo, 'en'), 'Updated 1h ago');

    const twoDaysAgo = new Date(Date.now() - 172800000);
    assert.strictEqual(formatRelativeTime(twoDaysAgo, 'th'), 'อัปเดต 2 วันที่แล้ว');
    assert.strictEqual(formatRelativeTime(twoDaysAgo, 'en'), 'Updated 2d ago');
  });

  it('enforces font-mono and tracking-tight in RoomCard', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomCard.tsx'),
      'utf-8'
    );
    assert.match(code, /font-mono.*tracking-tight/);
  });

  it('enforces font-mono font-medium tracking-tight in FolioSplitScreen', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FolioSplitScreen.tsx'),
      'utf-8'
    );
    assert.match(code, /font-mono font-medium tracking-tight/);
  });

  it('displays relative refresh timestamp or unified auto-refresh badge across front desk portal pages', () => {
    const matrixCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'),
      'utf-8'
    );
    const reservationsCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/ReservationsPage.tsx'),
      'utf-8'
    );
    const operationsCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'),
      'utf-8'
    );
    const cashierCode = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/CashierFolioPage.tsx'),
      'utf-8'
    );

    assert.match(matrixCode, /refreshTimeStr/);
    assert.match(reservationsCode, /formatRelativeTime/);
    assert.match(operationsCode, /refreshTimeStr/);
    assert.match(cashierCode, /formatRelativeTime/);
  });
});

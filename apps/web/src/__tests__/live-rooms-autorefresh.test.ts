import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4 — Unified Auto-Refresh Pulse Badge & Dynamic liveRooms Occupancy Mapping', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;
  const roomMatrixPath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'
  );
  const dailyOpsPath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'
  );

  it('verifies RoomMatrixPage computes liveRooms with checked_in and extended reservation occupancy', () => {
    const code = fs.readFileSync(roomMatrixPath, 'utf-8');

    // Computes liveRooms
    assert.match(code, /const liveRooms = useMemo\(\(\) =>/);
    assert.match(code, /r\.status === 'checked_in' \|\| \(r\.status as string\) === 'extended'/);
    assert.match(code, /status:\s*'occupied' as const/);

    // Passes liveRooms to RoomMatrixGrid
    assert.match(code, /<RoomMatrixGrid[\s\S]*?rooms=\{liveRooms\}/);

    // Includes extended in roomGuests map
    assert.match(
      code,
      /\(r\.status === 'checked_in'\s*\|\|\s*r\.status === 'confirmed'\s*\|\|\s*\(r\.status as string\) === 'extended'\)/
    );
  });

  it('verifies RoomMatrixPage renders only a single unified auto-refresh pulse badge without duplicate chips', () => {
    const code = fs.readFileSync(roomMatrixPath, 'utf-8');

    // Duplicate ping chip must be absent
    assert.doesNotMatch(code, /animate-ping/);

    // Unified pulse badge with font-medium and refreshTimeStr
    assert.match(
      code,
      /<div className="flex items-center gap-2 px-2\.5 py-1\.5 bg-slate-50(?:\s+dark:bg-slate-800)? rounded-lg border border-slate-200\/60(?:\s+dark:border-slate-700)? shrink-0">/
    );
    assert.match(code, /w-2 h-2 rounded-full bg-emerald-500 animate-pulse/);
    assert.match(
      code,
      /locale === 'th'\s*\?\s*`อัปเดตอัตโนมัติ:\s*\$\{refreshTimeStr\}`\s*:\s*`Auto-refresh:\s*\$\{refreshTimeStr\}`/
    );
  });

  it('verifies DailyOperationsPage renders the matching unified auto-refresh badge without relative text', () => {
    const code = fs.readFileSync(dailyOpsPath, 'utf-8');

    // Computes refreshTimeStr with 2-digit hour, minute, second
    assert.match(code, /const refreshTimeStr = lastRefreshed\.toLocaleTimeString/);
    assert.match(code, /hour:\s*'2-digit',\s*minute:\s*'2-digit',\s*second:\s*'2-digit'/);

    // Does not use formatRelativeTime or animate-ping chips in header
    assert.doesNotMatch(code, /formatRelativeTime/);
    assert.doesNotMatch(code, /animate-ping/);

    // Unified pulse badge with font-medium and refreshTimeStr
    assert.match(
      code,
      /<div className="flex items-center gap-2 px-2\.5 py-1\.5 bg-slate-50(?:\s+dark:bg-slate-800)? rounded-lg border border-slate-200\/60(?:\s+dark:border-slate-700)? shrink-0">/
    );
    assert.match(code, /w-2 h-2 rounded-full bg-emerald-500 animate-pulse/);
    assert.match(
      code,
      /locale === 'th'\s*\?\s*`อัปเดตอัตโนมัติ:\s*\$\{refreshTimeStr\}`\s*:\s*`Auto-refresh:\s*\$\{refreshTimeStr\}`/
    );
  });
});

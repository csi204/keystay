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

describe('RoomCard Status Badge & Chip Contrast — WCAG AAA Compliance', () => {
  const roomCardPath = getFilePath('apps/web/src/components/front-desk/RoomCard.tsx');
  const roomCardCode = fs.readFileSync(roomCardPath, 'utf-8');

  it('configures reserved ("ติดจอง") status badge with high-contrast amber AAA palette in ROOM_STATUS_CONFIG', () => {
    // 1. Reserved status bg: bg-amber-100 dark:bg-amber-950/40
    assert.match(
      roomCardCode,
      /reserved:\s*\{[\s\S]*?bg:\s*['"]bg-amber-100 dark:bg-amber-950\/40['"]/,
      'reserved badge bg must be high-contrast amber-100 with dark mode support'
    );

    // 2. Reserved status text: text-amber-950 dark:text-amber-200
    assert.match(
      roomCardCode,
      /reserved:\s*\{[\s\S]*?text:\s*['"]text-amber-950 dark:text-amber-200['"]/,
      'reserved badge text must use text-amber-950 (>7:1 AAA ratio against amber-100)'
    );

    // 3. Reserved status border: border-amber-400 dark:border-amber-800
    assert.match(
      roomCardCode,
      /reserved:\s*\{[\s\S]*?border:\s*['"]border-amber-400 dark:border-amber-800['"]/,
      'reserved badge border must use high-contrast border-amber-400'
    );

    // 4. Reserved status dot: bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900
    assert.match(
      roomCardCode,
      /reserved:\s*\{[\s\S]*?dot:\s*['"]bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900['"]/,
      'reserved status dot must have ring halo for visibility under counter glare'
    );
  });

  it('upgrades reserved guest chip to high-contrast bold amber styling with dark mode support', () => {
    // Upgraded chip classes
    assert.match(
      roomCardCode,
      /bg-amber-100\/90\s+text-amber-950\s+font-bold\s+border\s+border-amber-300\s+dark:bg-amber-900\/40\s+dark:text-amber-200\s+dark:border-amber-700/,
      'reserved guest chip must use high-contrast bold amber styling'
    );

    // User icon inside reserved guest chip
    assert.match(
      roomCardCode,
      /<User className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0"/,
      'User icon in reserved guest chip must use text-amber-700 dark:text-amber-400'
    );

    // Washed out styling should not be present in the reserved guest chip
    assert.doesNotMatch(
      roomCardCode,
      /text-amber-700\s+bg-amber-50\s+px-1\.5\s+py-0\.5\s+rounded\s+border\s+border-amber-200\/60/,
      'washed out text-amber-700 bg-amber-50 styling must be replaced'
    );
  });

  it('ensures other status badges maintain valid contrast definitions', () => {
    assert.match(roomCardCode, /available:\s*\{/);
    assert.match(roomCardCode, /occupied:\s*\{/);
    assert.match(roomCardCode, /checked_out:\s*\{/);
    assert.match(roomCardCode, /cleaning:\s*\{/);
    assert.match(roomCardCode, /maintenance:\s*\{/);
    assert.match(roomCardCode, /out_of_order:\s*\{/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Room Matrix High-Density & Floor Grouping (Anti-AI Minimalist)', () => {
  it('supports floor grouping in RoomMatrixGrid to view all floors simultaneously', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomMatrixGrid.tsx'), 'utf-8');
    assert.match(code, /groupByFloor/);
    assert.match(code, /roomsByFloor/);
    // Hairline floor section divider
    assert.match(code, /border-b border-slate-200/);
    // 5-column grid per floor guarantees single screen overview for 5-10 rooms
    assert.match(code, /lg:grid-cols-5/);
  });

  it('implements compact card view option for single-screen counter overview', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomCard.tsx'), 'utf-8');
    assert.match(code, /density/);
    assert.match(code, /isCompact \? 'p-2\.5 sm:p-3' : 'p-4'/);
  });

  it('implements density toggle and localStorage persistence in RoomMatrixPage', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'), 'utf-8');
    assert.match(code, /keystay_matrix_density/);
    assert.match(code, /density === 'compact'/);
    assert.match(code, /density === 'comfortable'/);
    assert.match(code, /localStorage\.setItem/);
  });

  it('provides 1:1 translation parity for density and floor grouping across TH and EN', () => {
    assert.strictEqual(typeof th['matrix.compact'], 'string');
    assert.strictEqual(typeof en['matrix.compact'], 'string');
    assert.strictEqual(typeof th['matrix.comfortable'], 'string');
    assert.strictEqual(typeof en['matrix.comfortable'], 'string');
    assert.strictEqual(typeof th['common.roomsCount'], 'string');
    assert.strictEqual(typeof en['common.roomsCount'], 'string');
  });
});

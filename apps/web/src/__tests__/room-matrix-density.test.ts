import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Room Matrix High-Density & Floor Grouping (Anti-AI Minimalist)', () => {
  it('supports floor grouping in RoomMatrixGrid to view all floors simultaneously with 4-col desktop layout', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomMatrixGrid.tsx'), 'utf-8');
    assert.match(code, /groupByFloor/);
    assert.match(code, /roomsByFloor/);
    // Hairline floor section divider
    assert.match(code, /h-px bg-slate-200/);
    // 4-column grid per floor guarantees clean 4-column overview
    assert.match(code, /lg:grid-cols-4/);
  });

  it('removes density toggle from RoomMatrixPage per peer review simplification', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'), 'utf-8');
    assert.doesNotMatch(code, /keystay_matrix_density/);
    assert.doesNotMatch(code, /density === 'compact'/);
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

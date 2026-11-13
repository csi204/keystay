// apps/web/src/__tests__/room-card.test.ts
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

describe('RoomCard Polish & Localization', () => {
  it('uses useI18n in RoomCard and removes raw bilingual labels', () => {
    const code = fs.readFileSync(getFilePath('apps/web/src/components/front-desk/RoomCard.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
    assert.doesNotMatch(code, /ว่างพร้อมใช้ \(Available\)/);
  });

  it('configures bold 18px room numbers and subtle elevation hover lift in RoomCard', () => {
    const code = fs.readFileSync(getFilePath('apps/web/src/components/front-desk/RoomCard.tsx'), 'utf-8');
    assert.match(code, /text-lg font-bold font-mono tracking-tight text-slate-900/);
    assert.match(code, /shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150/);
    assert.match(code, /room\.status === 'occupied'/);
    assert.match(code, /displayGuest/);
  });

  it('uses useI18n in RoomMatrixGrid for filter tabs and status chips', () => {
    const code = fs.readFileSync(getFilePath('apps/web/src/components/front-desk/RoomMatrixGrid.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
    assert.match(code, /status\.all/);
  });

  it('uses useI18n in RoomDetailsDrawer for localized modal content', () => {
    const code = fs.readFileSync(getFilePath('apps/web/src/components/front-desk/RoomDetailsDrawer.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
    assert.match(code, /drawer\.roomDetails/);
  });

  it('uses useI18n in RoomMatrixPage', () => {
    const code = fs.readFileSync(getFilePath('apps/web/src/pages/front-desk/RoomMatrixPage.tsx'), 'utf-8');
    assert.match(code, /useI18n/);
    assert.match(code, /matrix\.title/);
  });
});

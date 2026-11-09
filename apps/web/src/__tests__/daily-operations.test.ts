import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Daily Operations Localization & Polish', () => {
  it('uses useI18n in DailyOperationsPage and does not have raw bilingual tab headers', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'),
      'utf-8'
    );
    assert.match(code, /useI18n/);
    assert.doesNotMatch(code, /รอเช็คอินวันนี้ \(Arrivals\)/);
    assert.doesNotMatch(code, /รอเช็คเอาท์วันนี้ \(Departures\)/);
  });

  it('uses formatDateRange and resolves guest name in DailyOperationsPage', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'),
      'utf-8'
    );
    assert.match(code, /formatDateRange/);
    assert.match(code, /resolveGuestName/);
  });

  it('uses useI18n in CheckInModal', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/CheckInModal.tsx'),
      'utf-8'
    );
    assert.match(code, /useI18n/);
  });
});

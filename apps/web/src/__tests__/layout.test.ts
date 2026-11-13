// apps/web/src/__tests__/layout.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('FrontDeskLayout with Language Switcher', () => {
  it('incorporates useI18n and language toggle in FrontDeskLayout', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx'),
      'utf-8'
    );
    assert.match(code, /useI18n/);
    assert.match(code, /setLocale/);
    assert.match(code, /t\(['"]nav\.roomMatrix['"]\)/);
    assert.match(code, /t\(['"]nav\.reservations['"]\)/);
    assert.match(code, /t\(['"]nav\.dailyOperations['"]\)/);
    assert.match(code, /t\(['"]nav\.billing['"]\)/);
  });

  it('wraps routes with I18nProvider in App.tsx', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/App.tsx'), 'utf-8');
    assert.match(code, /I18nProvider/);
  });

  it('uses enhanced typography scale for navigation tabs and header elements', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx'),
      'utf-8'
    );
    // Navigation tabs: text-sm font-medium py-3 px-4
    assert.match(code, /text-sm font-medium py-3 px-4/);
    // Live clock: text-xs sm:text-sm font-mono font-medium text-slate-700
    assert.match(code, /text-xs sm:text-sm font-mono font-medium text-slate-700/);
    // Emergency outsource button: text-xs sm:text-sm font-semibold
    assert.match(code, /text-xs sm:text-sm font-semibold/);
    // User profile name: text-sm font-semibold text-slate-900
    assert.match(code, /text-sm font-semibold text-slate-900/);
  });
});

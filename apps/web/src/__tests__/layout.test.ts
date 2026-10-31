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
});

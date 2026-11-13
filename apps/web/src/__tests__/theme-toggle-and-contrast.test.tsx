import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

describe('Task 1: Theme Toggle & High-Contrast Typography / Input Colors Fix', () => {
  const appPath = resolveFilePath('apps/web/src/App.tsx');
  const layoutPath = resolveFilePath('apps/web/src/components/front-desk/FrontDeskLayout.tsx');
  const globalsCssPath = resolveFilePath('apps/web/src/styles/globals.css');
  const extraChargeModalPath = resolveFilePath('apps/web/src/components/front-desk/AddExtraChargeModal.tsx');
  const dailyOpsPath = resolveFilePath('apps/web/src/pages/front-desk/DailyOperationsPage.tsx');

  it('1. ThemeContext canonical import in App.tsx and FrontDeskLayout.tsx removes Night Audit dark mode toggle', () => {
    assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
    assert.ok(fs.existsSync(layoutPath), 'FrontDeskLayout.tsx must exist');

    const appCode = fs.readFileSync(appPath, 'utf-8');
    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');

    // App.tsx must import from '@/context/ThemeContext' to prevent duplicate module instances
    assert.match(
      appCode,
      /import\s+\{[^}]*ThemeProvider[^}]*\}\s+from\s+['"]@\/context\/ThemeContext['"]/,
      'App.tsx must import ThemeProvider from "@/context/ThemeContext"'
    );
    assert.doesNotMatch(
      appCode,
      /import\s+\{[^}]*ThemeProvider[^}]*\}\s+from\s+['"]\.\/context\/ThemeContext['"]/,
      'App.tsx must NOT import ThemeProvider from relative path "./context/ThemeContext"'
    );

    // FrontDeskLayout.tsx must NOT include Night Audit toggle or dark: classes
    assert.doesNotMatch(layoutCode, /โหมดกะดึก/, 'FrontDeskLayout.tsx must remove Night Audit toggle');
    assert.doesNotMatch(layoutCode, /dark:/, 'FrontDeskLayout.tsx must remove all dark: classes');
  });

  it('2. globals.css removes .dark CSS variables and locks clean light mode tokens', () => {
    assert.ok(fs.existsSync(globalsCssPath), 'globals.css must exist');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');

    assert.doesNotMatch(cssContent, /\.dark\s*\{/, 'globals.css must NOT define a .dark selector');
    assert.match(cssContent, /:root\s*\{/, 'globals.css must define :root light mode CSS variables');
  });

  it('3. AddExtraChargeModal.tsx specifies explicit high-contrast light-mode text and background colors for select, option, and inputs', () => {
    assert.ok(fs.existsSync(extraChargeModalPath), 'AddExtraChargeModal.tsx must exist');
    const modalCode = fs.readFileSync(extraChargeModalPath, 'utf-8');

    // Category select must have crisp light-mode high contrast classes and zero dark: classes
    assert.match(
      modalCode,
      /<select[\s\S]*?className="[^"]*text-slate-900[^"]*bg-white[^"]*border-slate-300[^"]*"[\s\S]*?>/,
      'AddExtraChargeModal.tsx category <select> must specify crisp light-mode high-contrast styling'
    );
    assert.doesNotMatch(modalCode, /dark:/, 'AddExtraChargeModal.tsx must contain zero dark: classes');

    // Options inside category select must also have explicit high contrast classes
    assert.match(
      modalCode,
      /<option[^>]*className="[^"]*text-slate-900\s+bg-white[^"]*"[^>]*>/,
      'AddExtraChargeModal.tsx <option> tags must specify crisp light-mode high contrast classes'
    );
  });

  it('4. DailyOperationsPage.tsx and inputs have crisp high-contrast light-mode text classes', () => {
    assert.ok(fs.existsSync(dailyOpsPath), 'DailyOperationsPage.tsx must exist');
    const opsCode = fs.readFileSync(dailyOpsPath, 'utf-8');

    // Subtitle must have crisp high-contrast text class
    assert.match(
      opsCode,
      /text-slate-600/,
      'DailyOperationsPage.tsx subtitle must use high-contrast text-slate-600'
    );

    // Billing search input must have crisp light-mode contrast
    assert.match(
      opsCode,
      /bg-white\s+text-slate-900\s+placeholder:text-slate-400\s+border\s+border-slate-300/,
      'DailyOperationsPage.tsx search input must specify high-contrast light-mode input colors'
    );
    assert.doesNotMatch(opsCode, /dark:/, 'DailyOperationsPage.tsx must contain zero dark: classes');
  });

  it('5. Thai orthography constraint: strictly use "เช็คเอาต์" with zero instances of "เช็คเอาท์"', () => {
    const files = [appPath, layoutPath, globalsCssPath, extraChargeModalPath, dailyOpsPath];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      assert.doesNotMatch(content, /เช็คเอาท์/, `File ${path.basename(f)} contains forbidden spelling "เช็คเอาท์"`);
    }
  });
});

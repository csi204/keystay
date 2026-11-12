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

  it('1. ThemeContext canonical import in App.tsx and FrontDeskLayout.tsx points to @/context/ThemeContext', () => {
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

    // FrontDeskLayout.tsx must import from '@/context/ThemeContext'
    assert.match(
      layoutCode,
      /from\s+['"]@\/context\/ThemeContext['"]/,
      'FrontDeskLayout.tsx must import from "@/context/ThemeContext"'
    );
  });

  it('2. globals.css defines .dark CSS variables for high contrast dark mode', () => {
    assert.ok(fs.existsSync(globalsCssPath), 'globals.css must exist');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');

    assert.match(cssContent, /\.dark\s*\{/, 'globals.css must define a .dark selector');
    assert.match(cssContent, /--background:\s*222\s+47%\s+(?:6%|11%)/, 'globals.css must define dark --background');
    assert.match(cssContent, /--foreground:\s*210\s+40%\s+98%/, 'globals.css must define dark --foreground');
    assert.match(cssContent, /--card:\s*222\s+47%\s+9%/, 'globals.css must define dark --card');
    assert.match(cssContent, /--card-foreground:\s*210\s+40%\s+98%/, 'globals.css must define dark --card-foreground');
    assert.match(cssContent, /--border:\s*217\s+33%\s+17%/, 'globals.css must define dark --border');
    assert.match(cssContent, /--input:\s*217\s+33%\s+17%/, 'globals.css must define dark --input');
  });

  it('3. AddExtraChargeModal.tsx specifies explicit high-contrast text and background colors for select and option elements', () => {
    assert.ok(fs.existsSync(extraChargeModalPath), 'AddExtraChargeModal.tsx must exist');
    const modalCode = fs.readFileSync(extraChargeModalPath, 'utf-8');

    // Category select must have high contrast classes and dark mode styling
    assert.match(
      modalCode,
      /<select[\s\S]*?className="[^"]*text-slate-900[^"]*bg-white[^"]*dark:text-slate-100[^"]*dark:bg-slate-800[^"]*border-slate-300[^"]*dark:border-slate-600[^"]*"[\s\S]*?>/,
      'AddExtraChargeModal.tsx category <select> must specify high-contrast light and dark styling'
    );

    // Options inside category select must also have explicit high contrast classes
    assert.match(
      modalCode,
      /<option[^>]*className="[^"]*(?:text-slate-900|dark:text-slate-100)[^"]*"[^>]*>/,
      'AddExtraChargeModal.tsx <option> tags must specify high contrast classes'
    );
  });

  it('4. DailyOperationsPage.tsx and inputs have high contrast text classes', () => {
    assert.ok(fs.existsSync(dailyOpsPath), 'DailyOperationsPage.tsx must exist');
    const opsCode = fs.readFileSync(dailyOpsPath, 'utf-8');

    // Subtitle must have high contrast text class in dark mode
    assert.match(
      opsCode,
      /text-slate-600\s+dark:text-slate-300/,
      'DailyOperationsPage.tsx subtitle must use text-slate-600 dark:text-slate-300'
    );

    // Billing search input must have high contrast input styling
    assert.match(
      opsCode,
      /dark:bg-slate-800[^"]*dark:text-slate-100/,
      'DailyOperationsPage.tsx search input must specify dark mode background and high-contrast text'
    );
  });

  it('5. Thai orthography constraint: strictly use "เช็คเอาต์" with zero instances of "เช็คเอาท์"', () => {
    const files = [appPath, layoutPath, globalsCssPath, extraChargeModalPath, dailyOpsPath];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      assert.doesNotMatch(content, /เช็คเอาท์/, `File ${path.basename(f)} contains forbidden spelling "เช็คเอาท์"`);
    }
  });
});

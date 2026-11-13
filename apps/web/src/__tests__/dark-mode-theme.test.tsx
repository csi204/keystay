import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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

describe('Task 7: Night Audit / Dark Mode System (ThemeContext, UI Tokens & Toggle)', () => {
  const themeContextPath = resolveFilePath('apps/web/src/context/ThemeContext.tsx');
  const appPath = resolveFilePath('apps/web/src/App.tsx');
  const layoutPath = resolveFilePath('apps/web/src/components/front-desk/FrontDeskLayout.tsx');
  const roomMatrixPath = resolveFilePath('apps/web/src/pages/front-desk/RoomMatrixPage.tsx');

  it('1. File existence & exports: ThemeContext.tsx exists and exports ThemeContext, ThemeProvider, useTheme', async () => {
    assert.ok(fs.existsSync(themeContextPath), 'ThemeContext.tsx must exist');
    const themeModule = await import('../context/ThemeContext');
    assert.ok(themeModule.ThemeContext, 'ThemeContext must be exported');
    assert.ok(themeModule.ThemeProvider, 'ThemeProvider must be exported');
    assert.ok(themeModule.useTheme, 'useTheme must be exported');
  });

  it('2. ThemeContext implementation: supports localStorage persistence, dark class sync, and toggleTheme()', () => {
    assert.ok(fs.existsSync(themeContextPath), 'ThemeContext.tsx must exist');
    const code = fs.readFileSync(themeContextPath, 'utf-8');
    assert.match(code, /keystay_theme/, 'Must use keystay_theme key in localStorage');
    assert.match(code, /classList\.(add|remove|toggle)/, 'Must manipulate document.documentElement.classList');
    assert.match(code, /toggleTheme/, 'Must provide toggleTheme function');
    assert.match(code, /isDark/, 'Must provide isDark boolean flag');
    assert.match(code, /'light'\s*\|\s*'dark'/, 'Must define Theme type as light | dark');
  });

  it('3. App.tsx mounts ThemeProvider around application routes', () => {
    assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
    const code = fs.readFileSync(appPath, 'utf-8');
    assert.match(code, /ThemeProvider/, 'App.tsx must import and wrap with ThemeProvider');
    assert.match(code, /<ThemeProvider>[\s\S]*<\/ThemeProvider>/, 'ThemeProvider must enclose app routes');
  });

  it('4. FrontDeskLayout.tsx removes Night Audit toggle completely from sidebar & drawer', () => {
    assert.ok(fs.existsSync(layoutPath), 'FrontDeskLayout.tsx must exist');
    const code = fs.readFileSync(layoutPath, 'utf-8');
    assert.doesNotMatch(code, /โหมดกะดึก|Night Audit/, 'Sidebar must not contain Night Audit toggle');
    assert.doesNotMatch(code, /toggleTheme/, 'FrontDeskLayout must not wire toggleTheme');
    assert.match(code, /strokeWidth=\{1\.75\}/, 'Lucide icons must maintain strokeWidth={1.75}');
  });

  it('5. Light mode locked: FrontDeskLayout and RoomMatrixPage contain zero dark: classes', () => {
    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
    const matrixCode = fs.readFileSync(roomMatrixPath, 'utf-8');

    assert.doesNotMatch(layoutCode, /dark:/, 'FrontDeskLayout must have zero dark: classes');
    assert.doesNotMatch(matrixCode, /dark:/, 'RoomMatrixPage must have zero dark: classes');
  });

  it('6. Runtime behavior: ThemeProvider locks theme to light even if localStorage previously had dark', async () => {
    // Setup mock browser globals
    const storage: Record<string, string> = { keystay_theme: 'dark' };
    const classList = new Set<string>(['dark']);

    (globalThis as any).localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    };

    (globalThis as any).document = {
      documentElement: {
        classList: {
          add: (cls: string) => classList.add(cls),
          remove: (cls: string) => classList.delete(cls),
          contains: (cls: string) => classList.has(cls),
        },
      },
    };

    const { ThemeProvider, useTheme } = await import('../context/ThemeContext');

    let capturedTheme: any = null;
    const TestConsumer: React.FC = () => {
      const themeCtx = useTheme();
      capturedTheme = themeCtx;
      return React.createElement('div', null, themeCtx.theme);
    };

    renderToStaticMarkup(
      React.createElement(ThemeProvider, null, React.createElement(TestConsumer, null))
    );

    assert.ok(capturedTheme, 'Consumer must receive theme context');
    assert.equal(capturedTheme.theme, 'light', 'Theme should always lock to light');
    assert.equal(capturedTheme.isDark, false, 'isDark should always be false');
    assert.equal(typeof capturedTheme.toggleTheme, 'function', 'toggleTheme must be a function');
    capturedTheme.setTheme('dark');
    capturedTheme.toggleTheme();
    assert.equal(classList.has('dark'), false, 'dark class must stay removed from documentElement');
  });

  it('7. Zero emoji audit & Thai orthography compliance', () => {
    const contextCode = fs.existsSync(themeContextPath) ? fs.readFileSync(themeContextPath, 'utf-8') : '';
    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
    const matrixCode = fs.readFileSync(roomMatrixPath, 'utf-8');

    const combined = contextCode + layoutCode + matrixCode;

    // Check zero emojis
    const emojiRegex =
      /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    assert.equal(emojiRegex.test(combined), false, 'Front desk code must contain zero raw emojis');

    // Check Thai spelling: เช็คเอาต์ (ต.เต่า การันต์), no เช็คเอาท์
    assert.equal(/เช็คเอาท์/.test(combined), false, 'Must not use non-standard เช็คเอาท์ (must be เช็คเอาต์)');
  });
});


import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { I18nProvider } from '../lib/i18n';
import {
  KeyboardShortcutsModal,
  SHORTCUT_CATEGORIES,
  isKeyboardEventFromInput,
} from '../components/common/KeyboardShortcutsModal';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

describe('Task 6: Keyboard Shortcuts Engine & Cheatsheet Modal (?)', () => {
  const shortcutsModalPath = resolveFilePath(
    'apps/web/src/components/common/KeyboardShortcutsModal.tsx'
  );
  const layoutPath = resolveFilePath(
    'apps/web/src/components/front-desk/FrontDeskLayout.tsx'
  );
  const roomModalPath = resolveFilePath(
    'apps/web/src/components/front-desk/RoomDetailsModal.tsx'
  );

  it('1. File existence & exports: KeyboardShortcutsModal component and categories exist', () => {
    assert.ok(fs.existsSync(shortcutsModalPath), 'KeyboardShortcutsModal.tsx must exist');
    const code = fs.readFileSync(shortcutsModalPath, 'utf-8');
    assert.match(code, /export\s+const\s+KeyboardShortcutsModal/);
    assert.match(code, /export\s+const\s+SHORTCUT_CATEGORIES/);
    assert.match(code, /export\s+function\s+isKeyboardEventFromInput/);
  });

  it('2. Shortcut Categories & Definitions: Navigation, Room & Ops, and System', () => {
    assert.ok(Array.isArray(SHORTCUT_CATEGORIES), 'SHORTCUT_CATEGORIES must be an array');
    assert.equal(SHORTCUT_CATEGORIES.length, 3, 'Must contain exactly 3 main categories');

    const [navCategory, opsCategory, sysCategory] = SHORTCUT_CATEGORIES;

    // Category 1: Navigation & Search
    assert.match(navCategory.titleTh, /การนำทาง & ค้นหา/);
    const navKeys = navCategory.shortcuts.flatMap((s) => s.keys);
    assert.ok(navKeys.includes('Ctrl') && navKeys.includes('K'), 'Must include Ctrl + K');
    assert.ok(navKeys.includes('/'), 'Must include /');
    assert.ok(navKeys.includes('?'), 'Must include ?');
    assert.ok(navKeys.includes('Esc'), 'Must include Esc');

    // Category 2: Room & Operations
    assert.match(opsCategory.titleTh, /การทำงานห้องพัก & ฟอร์ม/);
    const opsKeys = opsCategory.shortcuts.flatMap((s) => s.keys);
    assert.ok(opsKeys.includes('↑') || opsKeys.includes('↓'), 'Must include Arrow keys');
    assert.ok(opsKeys.includes('Enter'), 'Must include Enter');
    assert.ok(
      opsCategory.shortcuts.some((s) => s.keys.includes('Ctrl') && s.keys.includes('Enter')),
      'Must include Ctrl + Enter shortcut'
    );

    // Category 3: System & Preferences (Light Mode locked, language switcher remains)
    assert.match(sysCategory.titleTh, /ระบบ & มุมมอง/);
    assert.ok(
      !sysCategory.shortcuts.some((s) => s.id === 'dark-mode' || s.descriptionTh.includes('สลับโหมดกะดึก')),
      'Night Audit dark mode shortcut should be removed'
    );
    assert.ok(
      sysCategory.shortcuts.some((s) => s.descriptionTh.includes('สลับภาษา')),
      'Must include language switcher'
    );
  });

  it('3. UI Rendering: renders dialog with backdrop blur, kbd badges, headers, and zero emojis', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(KeyboardShortcutsModal, {
          isOpen: true,
          onClose: () => {},
        })
      )
    );

    // Backdrop with blur
    assert.match(html, /bg-slate-900\/40/);
    assert.match(html, /backdrop-blur/);

    // Dialog structure
    assert.match(html, /max-w-lg/);
    assert.match(html, /rounded-xl/);

    // Headers & Categories
    assert.match(html, /การนำทาง (&amp;|&) ค้นหา/);
    assert.match(html, /การทำงานห้องพัก (&amp;|&) ฟอร์ม/);
    assert.match(html, /ระบบ (&amp;|&) มุมมอง/);

    // <kbd> tags rendered for shortcuts
    assert.match(html, /<kbd[^>]*>Ctrl<\/kbd>/);
    assert.match(html, /<kbd[^>]*>K<\/kbd>/);
    assert.match(html, /<kbd[^>]*>\?<\/kbd>/);
    assert.match(html, /<kbd[^>]*>Esc<\/kbd>/);

    // Zero emojis check
    const emojiRegex =
      /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    assert.equal(emojiRegex.test(html), false, 'Rendered modal HTML must contain zero emojis');
  });

  it('4. Closed state: returns null when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(KeyboardShortcutsModal, {
          isOpen: false,
          onClose: () => {},
        })
      )
    );
    assert.equal(html, '');
  });

  it('5. Input ignore logic: isKeyboardEventFromInput helper correctly identifies active input elements', () => {
    assert.equal(isKeyboardEventFromInput({ tagName: 'INPUT', isContentEditable: false }), true);
    assert.equal(isKeyboardEventFromInput({ tagName: 'TEXTAREA', isContentEditable: false }), true);
    assert.equal(isKeyboardEventFromInput({ tagName: 'SELECT', isContentEditable: false }), true);
    assert.equal(isKeyboardEventFromInput({ tagName: 'DIV', isContentEditable: true }), true);
    assert.equal(isKeyboardEventFromInput({ tagName: 'DIV', isContentEditable: false }), false);
    assert.equal(isKeyboardEventFromInput({ tagName: 'BUTTON', isContentEditable: false }), false);
    assert.equal(isKeyboardEventFromInput(null), false);
  });

  it('6. FrontDeskLayout integration: hooks ?, Esc, open-keyboard-shortcuts, and mounts KeyboardShortcutsModal', () => {
    const layoutCode = fs.readFileSync(layoutPath, 'utf-8');

    // Import KeyboardShortcutsModal
    assert.match(
      layoutCode,
      /import\s+{[^}]*KeyboardShortcutsModal[^}]*}\s+from\s+['"]@\/components\/common\/KeyboardShortcutsModal['"]/,
      'FrontDeskLayout must import KeyboardShortcutsModal'
    );

    // State for shortcuts modal
    assert.match(
      layoutCode,
      /isShortcutsOpen|isKeyboardShortcutsOpen/,
      'FrontDeskLayout must manage shortcuts modal open state'
    );

    // Keydown listener for '?'
    assert.match(
      layoutCode,
      /e\.key\s*===\s*['"]\?['"]/,
      'FrontDeskLayout must listen for ? key'
    );

    // Escape listener closing modal
    assert.match(
      layoutCode,
      /e\.key\s*===\s*['"]Escape['"]/,
      'FrontDeskLayout must listen for Escape key'
    );

    // Custom event listener for 'open-keyboard-shortcuts'
    assert.match(
      layoutCode,
      /['"]open-keyboard-shortcuts['"]/,
      'FrontDeskLayout must listen to open-keyboard-shortcuts custom event'
    );

    // Discoverable trigger button in sidebar or footer
    assert.match(
      layoutCode,
      /Keyboard|HelpCircle/,
      'FrontDeskLayout must provide a shortcut trigger button with an icon'
    );

    // Mounts KeyboardShortcutsModal
    assert.match(
      layoutCode,
      /<KeyboardShortcutsModal[\s\S]*?isOpen=\{/,
      'FrontDeskLayout must render KeyboardShortcutsModal'
    );
  });

  it('7. RoomDetailsModal integration: supports Ctrl+Enter (Cmd+Enter) form/note save and Esc dismiss', () => {
    const roomModalCode = fs.readFileSync(roomModalPath, 'utf-8');

    // Esc dismiss
    assert.match(
      roomModalCode,
      /e\.key\s*===\s*['"]Escape['"]/,
      'RoomDetailsModal must handle Escape key dismiss'
    );

    // Ctrl+Enter or Cmd+Enter for saving notes or submitting form
    assert.match(
      roomModalCode,
      /\(e\.ctrlKey\s*\|\|\s*e\.metaKey\)\s*&&\s*e\.key\s*===\s*['"]Enter['"]/,
      'RoomDetailsModal must handle Ctrl+Enter / Cmd+Enter for submission'
    );
  });

  it('8. Thai orthography: standard เช็คเอาต์ (ต.เต่า การันต์), no เช็คเอาท์', () => {
    const code = fs.readFileSync(shortcutsModalPath, 'utf-8');
    assert.doesNotMatch(code, /เช็คเอาท์/, 'Must not contain เช็คเอาท์');
    if (code.includes('เช็คเอา')) {
      assert.match(code, /เช็คเอาต์/, 'Must use standard เช็คเอาต์');
    }
  });
});

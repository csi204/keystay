import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 3: Portal-Based DatePicker Floating Placement & Clean Arrow Hiding', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const datePickerPath = path.resolve(
    rootDir,
    'apps/web/src/components/common/CustomDatePicker.tsx'
  );
  const walkInModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/WalkInModal.tsx'
  );
  const newBookingModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/NewBookingModal.tsx'
  );

  describe('CustomDatePicker Portal & Fixed Placement', () => {
    it('verifies CustomDatePicker imports createPortal and targets document.body', () => {
      assert.ok(fs.existsSync(datePickerPath), 'CustomDatePicker.tsx should exist');
      const code = fs.readFileSync(datePickerPath, 'utf-8');

      // createPortal import
      assert.match(
        code,
        /import\s+.*createPortal.*from\s+['"]react-dom['"]/,
        'Should import createPortal from react-dom'
      );

      // mounts to document.body
      assert.match(
        code,
        /createPortal\(.*,\s*document\.body\)/s,
        'Should render popover using createPortal targeting document.body'
      );
    });

    it('verifies popover is styled with position fixed, z-index 9999, and coordinates', () => {
      const code = fs.readFileSync(datePickerPath, 'utf-8');

      // Fixed positioning and high z-index to escape scroll containers
      assert.match(
        code,
        /z-\[9999\]|zIndex:\s*9999/,
        'Should have z-index 9999 so it is never clipped by modal scroll boundary'
      );
      assert.match(
        code,
        /fixed/,
        'Popover should use fixed positioning'
      );
      assert.match(
        code,
        /coords\.top|top:\s*`?\$\{?coords\.top\}?/,
        'Popover should position using dynamic coords.top'
      );
      assert.match(
        code,
        /coords\.left|left:\s*`?\$\{?coords\.left\}?/,
        'Popover should position using dynamic coords.left'
      );
    });

    it('verifies computePopoverCoords handles bounds calculation and viewport clamping', async () => {
      const mod = await import('../components/common/CustomDatePicker');
      assert.strictEqual(
        typeof (mod as any).computePopoverCoords,
        'function',
        'computePopoverCoords function should be exported'
      );

      const computePopoverCoords = (mod as any).computePopoverCoords;

      // When there is plenty of space below (rect bottom at 200, window 800h)
      const belowCoords = computePopoverCoords(
        { top: 160, bottom: 200, left: 100 },
        1024,
        800,
        'auto',
        320,
        340
      );
      assert.strictEqual(belowCoords.placement, 'bottom');
      assert.strictEqual(belowCoords.top, 206); // 200 + 6
      assert.strictEqual(belowCoords.left, 100);

      // When space below is tight (< 340) and space above > 340 (rect at 550, window 700h)
      const aboveCoords = computePopoverCoords(
        { top: 510, bottom: 550, left: 100 },
        1024,
        700,
        'auto',
        320,
        340
      );
      assert.strictEqual(aboveCoords.placement, 'top');
      assert.strictEqual(aboveCoords.top, 510 - 340 - 6); // 164
      assert.strictEqual(aboveCoords.left, 100);

      // Viewport left clamping: left < 16 clamps to 16
      const clampLeft = computePopoverCoords(
        { top: 100, bottom: 140, left: 5 },
        1024,
        800,
        'auto',
        320,
        340
      );
      assert.strictEqual(clampLeft.left, 16);

      // Viewport right clamping: left near right edge clamps to windowWidth - popoverWidth - 16
      const clampRight = computePopoverCoords(
        { top: 100, bottom: 140, left: 950 },
        1024,
        800,
        'auto',
        320,
        340
      );
      assert.strictEqual(clampRight.left, 1024 - 320 - 16); // 688
    });

    it('verifies scroll and resize listeners update coords in real time', () => {
      const code = fs.readFileSync(datePickerPath, 'utf-8');

      // Scroll and resize event listeners
      assert.match(
        code,
        /addEventListener\(\s*['"]scroll['"]/s,
        'Should attach scroll event listener'
      );
      assert.match(
        code,
        /addEventListener\(\s*['"]resize['"]/s,
        'Should attach resize event listener'
      );
      assert.match(
        code,
        /removeEventListener\(\s*['"]scroll['"]/s,
        'Should remove scroll event listener on unmount'
      );
      assert.match(
        code,
        /removeEventListener\(\s*['"]resize['"]/s,
        'Should remove resize event listener on unmount'
      );
    });
  });

  describe('Clean Arrow Hiding across Frontdesk Modals', () => {
    it('verifies WalkInModal has appearance-none on select with ChevronDown and spin button hidden on number input', () => {
      assert.ok(fs.existsSync(walkInModalPath), 'WalkInModal.tsx should exist');
      const code = fs.readFileSync(walkInModalPath, 'utf-8');

      // Select styling
      assert.match(
        code,
        /<select[\s\S]*?appearance-none/,
        'WalkInModal <select> should have appearance-none class'
      );
      assert.match(
        code,
        /ChevronDown.*text-slate-400.*pointer-events-none/,
        'WalkInModal should render a custom ChevronDown for select dropdown'
      );

      // Number input spin suppression
      assert.match(
        code,
        /\[appearance:textfield\]/,
        'Number input in WalkInModal should have [appearance:textfield]'
      );
      assert.match(
        code,
        /\[&::-webkit-outer-spin-button\]:appearance-none/,
        'Number input should suppress webkit-outer-spin-button'
      );
      assert.match(
        code,
        /\[&::-webkit-inner-spin-button\]:appearance-none/,
        'Number input should suppress webkit-inner-spin-button'
      );
    });

    it('verifies NewBookingModal has appearance-none on selects with ChevronDown and spin button hidden on number input', () => {
      assert.ok(fs.existsSync(newBookingModalPath), 'NewBookingModal.tsx should exist');
      const code = fs.readFileSync(newBookingModalPath, 'utf-8');

      // Select styling
      assert.match(
        code,
        /<select[\s\S]*?appearance-none/,
        'NewBookingModal <select> elements should have appearance-none class'
      );
      assert.match(
        code,
        /ChevronDown.*text-slate-400.*pointer-events-none/,
        'NewBookingModal should render a custom ChevronDown for select dropdowns'
      );

      // Number input spin suppression
      assert.match(
        code,
        /\[appearance:textfield\]/,
        'Number input in NewBookingModal should have [appearance:textfield]'
      );
      assert.match(
        code,
        /\[&::-webkit-outer-spin-button\]:appearance-none/,
        'Number input should suppress webkit-outer-spin-button'
      );
      assert.match(
        code,
        /\[&::-webkit-inner-spin-button\]:appearance-none/,
        'Number input should suppress webkit-inner-spin-button'
      );
    });
  });
});

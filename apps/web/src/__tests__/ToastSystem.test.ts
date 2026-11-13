import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
  ToastProvider,
  useToast,
  DEFAULT_TOAST_DURATION,
  type ToastItem,
  type ToastType,
} from '../context/ToastContext';
import { ToastContainer, TOAST_CONFIG } from '../components/common/ToastContainer';

describe('Task 3: Global Toast Notification System', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const appPath = path.resolve(rootDir, 'apps/web/src/App.tsx');
  const toastContextPath = path.resolve(rootDir, 'apps/web/src/context/ToastContext.tsx');
  const toastContainerPath = path.resolve(
    rootDir,
    'apps/web/src/components/common/ToastContainer.tsx'
  );

  it('verifies ToastContext and ToastContainer files exist', () => {
    assert.ok(fs.existsSync(toastContextPath), 'ToastContext.tsx should exist');
    assert.ok(fs.existsSync(toastContainerPath), 'ToastContainer.tsx should exist');
  });

  it('verifies DEFAULT_TOAST_DURATION is 3500ms', () => {
    assert.strictEqual(DEFAULT_TOAST_DURATION, 3500);
  });

  it('verifies useToast hook provides showSuccess, showError, showWarning, showInfo, removeToast', () => {
    let capturedContext: unknown = null;
    const TestComponent = () => {
      capturedContext = useToast();
      return null;
    };

    renderToStaticMarkup(
      React.createElement(ToastProvider, null, React.createElement(TestComponent))
    );

    const ctx = capturedContext as ReturnType<typeof useToast>;
    assert.ok(ctx, 'Context should be provided');
    assert.strictEqual(typeof ctx.showSuccess, 'function');
    assert.strictEqual(typeof ctx.showError, 'function');
    assert.strictEqual(typeof ctx.showWarning, 'function');
    assert.strictEqual(typeof ctx.showInfo, 'function');
    assert.strictEqual(typeof ctx.removeToast, 'function');
    assert.strictEqual(typeof ctx.clearToasts, 'function');
    assert.deepStrictEqual(ctx.toasts, []);
  });

  it('throws an error when useToast is used outside ToastProvider', () => {
    const TestComponent = () => {
      useToast();
      return null;
    };

    assert.throws(
      () => renderToStaticMarkup(React.createElement(TestComponent)),
      /useToast must be used within a ToastProvider/
    );
  });

  it('verifies Toast item structure and TOAST_CONFIG mapping for Lucide icons and colors', () => {
    const types: ToastType[] = ['success', 'error', 'warning', 'info'];

    for (const type of types) {
      const config = TOAST_CONFIG[type];
      assert.ok(config, `Config for ${type} should exist`);
      assert.ok(config.icon, `Icon for ${type} should exist`);
      assert.ok(config.iconColor, `Icon color for ${type} should exist`);
      assert.ok(config.borderClass, `Border & background class for ${type} should exist`);
    }

    // Verify exact Lucide icons associated with types
    assert.strictEqual(TOAST_CONFIG.success.icon, CheckCircle2);
    assert.strictEqual(TOAST_CONFIG.error.icon, AlertCircle);
    assert.strictEqual(TOAST_CONFIG.warning.icon, AlertTriangle);
    assert.strictEqual(TOAST_CONFIG.info.icon, Info);

    // Verify Swiss color styles
    assert.ok(TOAST_CONFIG.success.iconColor.includes('emerald-500'));
    assert.ok(TOAST_CONFIG.success.borderClass.includes('border-emerald-200/80'));
    assert.ok(TOAST_CONFIG.success.borderClass.includes('bg-emerald-50/20'));

    assert.ok(TOAST_CONFIG.error.iconColor.includes('rose-500'));
    assert.ok(TOAST_CONFIG.error.borderClass.includes('border-rose-200/80'));
    assert.ok(TOAST_CONFIG.error.borderClass.includes('bg-rose-50/20'));

    assert.ok(TOAST_CONFIG.warning.iconColor.includes('amber-500'));
    assert.ok(TOAST_CONFIG.warning.borderClass.includes('border-amber-200/80'));
    assert.ok(TOAST_CONFIG.warning.borderClass.includes('bg-amber-50/20'));

    assert.ok(TOAST_CONFIG.info.iconColor.includes('sky-500'));
    assert.ok(TOAST_CONFIG.info.borderClass.includes('border-sky-200/80'));
    assert.ok(TOAST_CONFIG.info.borderClass.includes('bg-sky-50/20'));
  });

  it('renders ToastContainer with Swiss precision styling and toast cards', () => {
    const sampleToasts: ToastItem[] = [
      {
        id: 'toast-1',
        type: 'success',
        title: 'Check-in Completed',
        description: 'Guest checked in successfully',
        duration: 3500,
      },
      {
        id: 'toast-2',
        type: 'error',
        title: 'Payment Failed',
        description: 'Unable to process QR code payment',
        duration: 5000,
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        { initialToasts: sampleToasts },
        React.createElement(ToastContainer)
      )
    );

    // Verify container positioning and styling
    assert.ok(html.includes('fixed top-4 right-4 z-[9999] pointer-events-none flex flex-col gap-2.5 max-w-sm w-full'));

    // Verify toast card elements and content
    assert.ok(html.includes('Check-in Completed'));
    assert.ok(html.includes('Guest checked in successfully'));
    assert.ok(html.includes('Payment Failed'));
    assert.ok(html.includes('Unable to process QR code payment'));

    // Verify card design tokens
    assert.ok(html.includes('pointer-events-auto bg-white/95 backdrop-blur-md border shadow-lg rounded-xl p-3.5'));
    assert.ok(html.includes('border-emerald-200/80 bg-emerald-50/20'));
    assert.ok(html.includes('border-rose-200/80 bg-rose-50/20'));

    // Close button presence with X icon
    assert.ok(html.includes('text-slate-400 hover:text-slate-600'));
    assert.ok(html.includes('aria-label="Close notification"'));
  });

  it('verifies dismissal logic: auto-dismiss timer and close button removal in source code', () => {
    const contextCode = fs.readFileSync(toastContextPath, 'utf-8');
    const containerCode = fs.readFileSync(toastContainerPath, 'utf-8');

    // Auto-dismissal timer in ToastContext
    assert.match(contextCode, /setTimeout/);
    assert.match(contextCode, /clearTimeout/);
    assert.match(contextCode, /removeToast/);
    assert.match(contextCode, /duration\s*\?\?\s*DEFAULT_TOAST_DURATION/);

    // Close button triggers removeToast in ToastContainer
    assert.match(containerCode, /removeToast\(toast\.id\)/);
    assert.match(containerCode, /strokeWidth=\{1\.75\}/);
  });

  it('verifies App.tsx wraps application with ToastProvider and renders ToastContainer', () => {
    const appCode = fs.readFileSync(appPath, 'utf-8');

    assert.match(appCode, /import\s*\{\s*ToastProvider\s*\}\s*from\s*['"]\.\/context\/ToastContext['"]/);
    assert.match(appCode, /import\s*\{\s*ToastContainer\s*\}\s*from\s*['"]\.\/components\/common\/ToastContainer['"]/);
    assert.match(appCode, /<ToastProvider>/);
    assert.match(appCode, /<\/ToastProvider>/);
    assert.match(appCode, /<ToastContainer\s*\/>/);
  });
});

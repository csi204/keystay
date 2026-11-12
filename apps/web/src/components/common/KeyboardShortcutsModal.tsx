import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface ShortcutItem {
  id: string;
  keys: string[];
  descriptionTh: string;
  descriptionEn: string;
  badgeTh?: string;
  badgeEn?: string;
}

export interface ShortcutCategory {
  id: string;
  titleTh: string;
  titleEn: string;
  shortcuts: ShortcutItem[];
}

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'navigation',
    titleTh: 'การนำทาง & ค้นหา',
    titleEn: 'Navigation & Search',
    shortcuts: [
      {
        id: 'palette',
        keys: ['Ctrl', 'K'],
        descriptionTh: 'เปิดแถบค้นหาด่วน (Command Palette)',
        descriptionEn: 'Open Command Palette',
      },
      {
        id: 'palette-slash',
        keys: ['/'],
        descriptionTh: 'เปิดแถบค้นหาด่วน (เมื่ออยู่นอกกล่องข้อความ)',
        descriptionEn: 'Open Command Palette (when not in input)',
      },
      {
        id: 'shortcuts-modal',
        keys: ['?'],
        descriptionTh: 'เปิดหน้าต่างสรุปคีย์ลัดนี้',
        descriptionEn: 'Open Keyboard Shortcuts Cheatsheet',
      },
      {
        id: 'escape-all',
        keys: ['Esc'],
        descriptionTh: 'ปิดหน้าต่างหรือเมนูป๊อปอัปทั้งหมด',
        descriptionEn: 'Close open modals or menus',
      },
    ],
  },
  {
    id: 'operations',
    titleTh: 'การทำงานห้องพัก & ฟอร์ม',
    titleEn: 'Room & Operations',
    shortcuts: [
      {
        id: 'navigate-items',
        keys: ['↑', '↓'],
        descriptionTh: 'เลื่อนเลือกรายการในเมนูหรือผลการค้นหา',
        descriptionEn: 'Navigate list items or search results',
      },
      {
        id: 'select-item',
        keys: ['Enter'],
        descriptionTh: 'เลือกรายการที่ไฮไลต์อยู่',
        descriptionEn: 'Select highlighted item',
      },
      {
        id: 'save-form',
        keys: ['Ctrl', 'Enter'],
        descriptionTh: 'บันทึกข้อมูลหรือยืนยันฟอร์มทันที',
        descriptionEn: 'Save or submit form immediately',
      },
    ],
  },
  {
    id: 'system',
    titleTh: 'ระบบ & มุมมอง',
    titleEn: 'System & Themes',
    shortcuts: [
      {
        id: 'dark-mode',
        keys: ['Ctrl', 'K'],
        badgeTh: 'พิมพ์ "dark"',
        badgeEn: 'Type "dark"',
        descriptionTh: 'สลับโหมดกะดึก (Dark Mode) ใน Command Palette',
        descriptionEn: 'Toggle Night Audit (Dark Mode) in Command Palette',
      },
      {
        id: 'language',
        keys: ['TH', 'EN'],
        badgeTh: 'แถบข้างล่าง',
        badgeEn: 'Sidebar footer',
        descriptionTh: 'สลับภาษา (TH / EN)',
        descriptionEn: 'Toggle language (TH / EN)',
      },
    ],
  },
];

export function isKeyboardEventFromInput(
  target: { tagName?: string; isContentEditable?: boolean } | null | undefined
): boolean {
  if (!target) return false;
  const tag = (target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(target.isContentEditable);
}

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { locale } = useI18n();
  const isThai = locale === 'th';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/70 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Keyboard className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="shortcuts-dialog-title"
                className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight"
              >
                {isThai
                  ? 'คีย์ลัดสำหรับแผนกต้อนรับ (Keyboard Shortcuts)'
                  : 'Front Desk Keyboard Shortcuts'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {isThai
                  ? 'กดปุ่มลัดเพื่อการทำงานที่รวดเร็วและแม่นยำ'
                  : 'Fast operational keyboard navigation reference'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isThai ? 'ปิดหน้าต่าง' : 'Close modal'}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.id} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                {isThai ? category.titleTh : category.titleEn}
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="py-2 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {isThai ? shortcut.descriptionTh : shortcut.descriptionEn}
                      </p>
                      {(shortcut.badgeTh || shortcut.badgeEn) && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {isThai ? shortcut.badgeTh : shortcut.badgeEn}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {shortcut.keys.map((k, idx) => (
                        <React.Fragment key={`${shortcut.id}-${k}-${idx}`}>
                          {idx > 0 && (
                            <span className="text-[10px] text-slate-400 font-bold px-0.5">+</span>
                          )}
                          <kbd className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            {isThai
              ? 'กด ? จากทุกหน้าเพื่อเปิดหน้าต่างนี้'
              : 'Press ? anywhere to open this cheatsheet'}
          </span>
          <div className="flex items-center gap-1 font-mono">
            <span>{isThai ? 'ปิด:' : 'Dismiss:'}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
              Esc
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

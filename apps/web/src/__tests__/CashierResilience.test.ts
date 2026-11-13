import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { localizeFolioDescription } from '../lib/localizeMetadata';
import { reconcileLiveFolios } from '../pages/front-desk/CashierFolioPage';
import type { DetailedBill } from '../hooks/useBilling';
import type { ExtendedReservation } from '../hooks/useReservations';

describe('Task 5: Cashier Folio Resilience, Room Charge Lock & Deposit Parity', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const actionConfirmModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/common/ActionConfirmModal.tsx'
  );
  const folioCategoryPath = path.resolve(
    rootDir,
    'apps/web/src/lib/folioCategory.ts'
  );
  const cashierFolioPagePath = path.resolve(
    rootDir,
    'apps/web/src/pages/front-desk/CashierFolioPage.tsx'
  );
  const folioSplitScreenPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/FolioSplitScreen.tsx'
  );

  it('Requirement 1: ActionConfirmModal exists with professional summary details, Lucide icons, min-h-[44px] targets, and ZERO raw emojis', () => {
    assert.ok(fs.existsSync(actionConfirmModalPath), 'ActionConfirmModal.tsx must exist');
    const code = fs.readFileSync(actionConfirmModalPath, 'utf-8');

    // Props interface verification
    assert.match(code, /isOpen:\s*boolean/);
    assert.match(code, /title:\s*string/);
    assert.match(code, /description:\s*string/);
    assert.match(code, /variant\?:\s*ActionConfirmVariant/);
    assert.match(code, /onConfirm:\s*\(\)\s*=>\s*void/);
    assert.match(code, /onClose:\s*\(\)\s*=>\s*void/);
    assert.match(code, /summaryDetails\?:\s*ActionSummaryDetail\[\]/);

    // Lucide icons verification (Zero raw emojis!)
    assert.match(code, /import\s*\{[^}]*AlertCircle[^}]*\}\s*from\s*['"]lucide-react['"]/);
    assert.match(code, /import\s*\{[^}]*CheckCircle2[^}]*\}\s*from\s*['"]lucide-react['"]/);
    assert.match(code, /import\s*\{[^}]*Trash2[^}]*\}\s*from\s*['"]lucide-react['"]/);
    assert.match(code, /import\s*\{[^}]*CreditCard[^}]*\}\s*from\s*['"]lucide-react['"]/);
    assert.match(code, /import\s*\{[^}]*Lock[^}]*\}\s*from\s*['"]lucide-react['"]/);

    // No raw emojis in the file
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(code), 'ActionConfirmModal.tsx must NOT contain any raw emoji characters');

    // Touch targets min-h-[44px]
    assert.match(code, /min-h-\[44px\]/);
  });

  it('Requirement 2: FolioCategoryBadge has whitespace-nowrap shrink-0 so Thai category labels never wrap', () => {
    assert.ok(fs.existsSync(folioCategoryPath), 'folioCategory.ts must exist');
    const code = fs.readFileSync(folioCategoryPath, 'utf-8');

    assert.match(
      code,
      /whitespace-nowrap\s+shrink-0/,
      'FolioCategoryBadge must include whitespace-nowrap and shrink-0 on badge span'
    );
  });

  it('Requirement 3: CashierFolioPage exports reconcileLiveFolios and preserves individual room charge and extension item descriptions', () => {
    assert.ok(fs.existsSync(cashierFolioPagePath), 'CashierFolioPage.tsx must exist');
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    // Exports reconcileLiveFolios
    assert.match(code, /export\s+function\s+reconcileLiveFolios/);

    // Passes reservationPaymentStatus to calculateFolioSummary
    assert.match(code, /reservationPaymentStatus:\s*billMatchingRes\?\.paymentStatus/);

    // Functional verification of reconcileLiveFolios
    const mockBill: DetailedBill = {
      id: 'bill-asawin-101',
      billNumber: 'INV-202611-101',
      reservationId: 'res-asawin',
      guestId: 'guest-asawin',
      guestName: 'Guest (Room 101)',
      roomNumber: '101',
      subtotal: '2400',
      taxAmount: '168',
      netAmount: '2400',
      paidAmount: '0',
      totalAmount: '2400',
      status: 'pending',
      items: [
        {
          id: 'item-rc',
          billId: 'bill-asawin-101',
          description: 'Room Charge (2 nights)',
          category: 'room',
          quantity: 2,
          unitPrice: '1200',
          totalAmount: '2400',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'item-ext',
          billId: 'bill-asawin-101',
          description: 'ขยายเวลาเข้าพัก (+1 คืน)',
          category: 'room',
          quantity: 1,
          unitPrice: '1200',
          totalAmount: '1200',
          isPaid: false,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockRes: ExtendedReservation = {
      id: 'res-asawin',
      bookingNumber: 'BK-101',
      guestId: 'guest-asawin',
      guestName: 'อัศวิน',
      roomNumber: '101',
      roomId: 'room-101',
      roomTypeName: 'Standard Room',
      checkInDate: '2026-11-12T00:00:00Z',
      checkOutDate: '2026-11-15T00:00:00Z',
      totalNights: '3',
      totalAmount: '3600',
      depositAmount: '1000',
      nightlyRate: 1200,
      status: 'extended',
      paymentStatus: 'paid',
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    };

    const reconciled = reconcileLiveFolios([mockBill], [mockRes], [], 'th');
    assert.strictEqual(reconciled.length, 1);
    assert.strictEqual(reconciled[0].guestName, 'อัศวิน');
    assert.ok(reconciled[0].items && reconciled[0].items.length === 2);
    // Preserves separate initial stay and extension item descriptions
    assert.strictEqual(reconciled[0].items[0].description, 'Room Charge (2 nights)');
    assert.strictEqual(reconciled[0].items[1].description, 'ขยายเวลาเข้าพัก (+1 คืน)');
    assert.strictEqual(localizeFolioDescription(reconciled[0].items[0].description, 'th'), 'ค่าห้องพัก (2 คืน)');
  });

  it('Requirement 3: CashierFolioPage calculates net amount due and displays ยอดสุทธิ in Left Panel bill cards', () => {
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    // Net amount calculation formula
    assert.match(
      code,
      /Math\.max\(\s*0,\s*\(totalWithVat\s*\|\|\s*Number\(b\.totalAmount\)\s*\|\|\s*0\)\s*-\s*\(Number\(b\.depositDeducted\)\s*\|\|\s*Number\(billMatchingRes\?\.depositAmount\)\s*\|\|\s*0\)\s*\)/
    );

    // Displays ยอดสุทธิ / Net Due label
    assert.match(code, /locale\s*===\s*['"]th['"]\s*\?\s*['"]ยอดสุทธิ['"]\s*:\s*['"]Net Due['"]/);
  });

  it('Requirement 3: CashierFolioPage binds dynamic deposit amount to matchingRes?.depositAmount ?? selectedBill.depositDeducted ?? 500', () => {
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    assert.match(
      code,
      /depositAmount=\{String\(matchingRes\?\.depositAmount\s*\?\?\s*selectedBill\.depositDeducted\s*\?\?\s*500\)\}/,
      'FolioSplitScreen in CashierFolioPage must use dynamic depositAmount'
    );
  });

  it('Requirement 4: FolioSplitScreen locks room charge items with Lucide Lock icon and prevents deletion', () => {
    assert.ok(fs.existsSync(folioSplitScreenPath), 'FolioSplitScreen.tsx must exist');
    const code = fs.readFileSync(folioSplitScreenPath, 'utf-8');

    // Checks room category or itemType room_charge lock condition
    assert.match(
      code,
      /it\.category\s*===\s*['"]room['"]\s*\|\|\s*\(it\s*as\s*any\)\.itemType\s*===\s*['"]room_charge['"]/
    );

    // Shows Lucide Lock icon
    assert.match(code, /<Lock\s+className=["'][^"']*text-slate-400[^"']*["']/);
    // Shows tooltip/title
    assert.match(
      code,
      /locale\s*===\s*['"]th['"]\s*\?\s*['"]รายการค่าห้องพักหลัก\s*\(ล็อค\)['"]\s*:\s*['"]Core stay fee\s*\(locked\)['"]/
    );

    // Zero raw emojis in FolioSplitScreen
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(code), 'FolioSplitScreen.tsx must NOT contain any raw emoji characters');
  });

  it('Requirement 4: FolioSplitScreen requires confirmation modal before deleting non-room items', () => {
    const code = fs.readFileSync(folioSplitScreenPath, 'utf-8');

    // Trash button opens delete confirmation
    assert.match(code, /setItemToDelete\(it\)/);
    // Modal confirmation question
    assert.match(code, /ยืนยันการลบรายการ/);
    assert.match(code, /onDeleteItem\(itemToDelete\.id\)/);
  });

  it('Requirement 4: FolioSplitScreen requires professional confirmation modal before payment settlement with summary details', () => {
    const code = fs.readFileSync(folioSplitScreenPath, 'utf-8');

    // Settlement button opens confirm modal
    assert.match(code, /setIsConfirmPaymentOpen\(true\)/);
    assert.match(code, /onConfirm=\{handleSettlePayment\}/);

    // Summary details includes Room, Guest, Payment Method, and Net Amount Due
    assert.match(code, /label:\s*locale\s*===\s*['"]th['"]\s*\?\s*['"]ห้อง['"]\s*:\s*['"]Room['"]/);
    assert.match(code, /label:\s*locale\s*===\s*['"]th['"]\s*\?\s*['"]ชื่อผู้เข้าพัก['"]\s*:\s*['"]Guest['"]/);
    assert.match(code, /label:\s*locale\s*===\s*['"]th['"]\s*\?\s*['"]วิธีชำระเงิน['"]\s*:\s*['"]Payment Method['"]/);
    assert.match(code, /label:\s*locale\s*===\s*['"]th['"]\s*\?\s*['"]ยอดรับชำระสุทธิ['"]\s*:\s*['"]Net Amount Due['"]/);
  });

  it('Requirement 5: localizeFolioDescription correctly localizes Room Charge (X nights) <-> ค่าห้องพัก (X คืน)', () => {
    // English to Thai
    assert.strictEqual(
      localizeFolioDescription('Room Charge (4 nights)', 'th'),
      'ค่าห้องพัก (4 คืน)'
    );
    assert.strictEqual(
      localizeFolioDescription('Room Charge (1 night)', 'th'),
      'ค่าห้องพัก (1 คืน)'
    );

    // Thai to English
    assert.strictEqual(
      localizeFolioDescription('ค่าห้องพัก (4 คืน)', 'en'),
      'Room Charge (4 nights)'
    );
    assert.strictEqual(
      localizeFolioDescription('ค่าห้องพัก (1 คืน)', 'en'),
      'Room Charge (1 night)'
    );
  });
});

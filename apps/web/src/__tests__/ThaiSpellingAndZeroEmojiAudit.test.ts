import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 6: Standardize Thai Spelling of เช็คเอาต์ & Zero-Emoji Audit', () => {
  const rootDir = process.cwd();

  // Helper to read file content
  const read = (relPath: string) =>
    fs.readFileSync(path.resolve(rootDir, relPath), 'utf-8');

  // Helper to walk directory for ts/tsx files
  const walkDir = (dir: string): string[] => {
    const fullDir = path.resolve(rootDir, dir);
    let results: string[] = [];
    if (!fs.existsSync(fullDir)) return results;
    for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
      const fullPath = path.join(fullDir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(walkDir(fullPath));
      } else if (/\.(tsx|ts)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  };

  it('Requirement 1: Thai spelling of "เช็คเอาต์" is standardized in locales and i18n', () => {
    const thContent = read('apps/web/src/locales/th.ts');
    assert.doesNotMatch(thContent, /เช็คเอาท์/, 'locales/th.ts must not contain non-standard "เช็คเอาท์"');
    assert.match(thContent, /'nav\.dailyOperations': 'เช็คอิน \/ เช็คเอาต์ วันนี้'/);
    assert.match(thContent, /'ops\.departuresToday': 'รอเช็คเอาต์วันนี้'/);
    assert.match(thContent, /'ops\.subtabCheckOutAndCashier': 'รอเช็คเอาต์ & คิดเงิน'/);
    assert.match(thContent, /'ops\.checkOut': 'เช็คเอาต์'/);
    assert.match(thContent, /'ops\.noDepartures': 'ไม่มีรายการรอเช็คเอาต์ในวันนี้'/);
    assert.match(thContent, /'ops\.checkOutSuccess': 'เช็คเอาต์สำเร็จ'/);
    assert.match(thContent, /'ops\.departuresDescription': 'รายการแขกที่เข้าพักอยู่และมีกำหนดเช็คเอาต์วันนี้'/);
    assert.match(thContent, /'res\.checkOutDate': 'วันเช็คเอาต์'/);
    assert.match(thContent, /'extend\.currentCheckOut': 'วันเช็คเอาต์เดิม'/);
    assert.match(thContent, /'extend\.newCheckOut': 'วันเช็คเอาต์ใหม่'/);
    assert.match(thContent, /'extend\.errorInvalidDate': 'วันเช็คเอาต์ใหม่ต้องหลังจากวันเช็คเอาต์เดิมอย่างน้อย 1 คืน'/);
    assert.match(thContent, /'checkout\.title': 'ยืนยันการเช็คเอาต์และคิดเงิน'/);
    assert.match(thContent, /'checkout\.settleAndCheckOut': 'ชำระเงินและเช็คเอาต์'/);
    assert.match(thContent, /'checkout\.settleSuccess': 'บันทึกการชำระเงินและเช็คเอาต์สำเร็จ'/);
    assert.match(thContent, /'checkout\.confirmButton': 'ยืนยันเช็คเอาต์'/);
    assert.match(thContent, /'checkout\.errorGeneral': 'เกิดข้อผิดพลาดในการเช็คเอาต์'/);

    const i18nContent = read('apps/web/src/lib/i18n.tsx');
    assert.doesNotMatch(i18nContent, /เช็คเอาท์/, 'lib/i18n.tsx must not contain "เช็คเอาท์"');
    assert.match(i18nContent, /'status\.checked_out': 'เช็คเอาต์แล้ว'/);
    assert.match(i18nContent, /'modal\.occupiedWarning': '.*ต้องรอเช็คเอาต์ก่อน\)?'/);

    const metaContent = read('apps/web/src/lib/localizeMetadata.ts');
    assert.doesNotMatch(metaContent, /เช็คเอาท์/, 'lib/localizeMetadata.ts must not contain "เช็คเอาท์"');
    assert.match(metaContent, /'Late Check-out Hourly Fee': 'ค่าธรรมเนียมเช็คเอาต์เกินเวลา \(รายชั่วโมง\)'/);
  });

  it('Requirement 1: Thai spelling of "เช็คเอาต์" is standardized across front-desk and admin pages/modals', () => {
    const checkOutModal = read('apps/web/src/components/front-desk/CheckOutModal.tsx');
    assert.doesNotMatch(checkOutModal, /เช็คเอาท์/, 'CheckOutModal.tsx must not contain "เช็คเอาท์"');
    assert.match(checkOutModal, /บันทึกการชำระเงินและเช็คเอาต์สำเร็จ/);

    const roomDetailsModal = read('apps/web/src/components/front-desk/RoomDetailsModal.tsx');
    assert.doesNotMatch(roomDetailsModal, /เช็คเอาท์/, 'RoomDetailsModal.tsx must not contain "เช็คเอาท์"');
    assert.match(roomDetailsModal, /วันเช็คเอาต์ต้องมาหลังวันเช็คอินอย่างน้อย 1 คืน/);
    assert.match(roomDetailsModal, /กำหนดเช็คเอาต์:/);

    const extraChargeModal = read('apps/web/src/components/front-desk/AddExtraChargeModal.tsx');
    assert.doesNotMatch(extraChargeModal, /เช็คเอาท์/, 'AddExtraChargeModal.tsx must not contain "เช็คเอาท์"');
    assert.match(extraChargeModal, /ค่าธรรมเนียมเช็คเอาต์เกินเวลา \(รายชั่วโมง\)/);

    const dailyOps = read('apps/web/src/pages/front-desk/DailyOperationsPage.tsx');
    assert.doesNotMatch(dailyOps, /เช็คเอาท์/, 'DailyOperationsPage.tsx must not contain "เช็คเอาท์"');
    assert.match(dailyOps, /รอเช็คเอาต์วันนี้/);
    assert.match(dailyOps, /เช็คเอาต์ก่อนกำหนด \/ ขยายเวลา/);
    assert.match(dailyOps, /เช็คเอาต์ & คิดเงิน/);

    const mgrDashboard = read('apps/web/src/pages/admin/ManagerDashboardPage.tsx');
    assert.doesNotMatch(mgrDashboard, /เช็คเอาท์/, 'ManagerDashboardPage.tsx must not contain "เช็คเอาท์"');
    assert.match(mgrDashboard, /เช็คเอาต์วันนี้/);

    const reportsPage = read('apps/web/src/pages/admin/ReportsAnalyticsPage.tsx');
    assert.doesNotMatch(reportsPage, /เช็คเอาท์/, 'ReportsAnalyticsPage.tsx must not contain "เช็คเอาท์"');
  });

  it('Requirement 2: Zero raw Unicode emojis in all front-desk components and pages', () => {
    const frontDeskFiles = [
      ...walkDir('apps/web/src/components/front-desk'),
      ...walkDir('apps/web/src/pages/front-desk'),
    ];

    assert.ok(frontDeskFiles.length > 10, 'Must have scanned front-desk files');

    // Emoji regex: pictographs, emoticons, dingbats, transport, symbols
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

    for (const filePath of frontDeskFiles) {
      const code = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(rootDir, filePath);
      assert.ok(
        !emojiRegex.test(code),
        `File ${relPath} must not contain any raw emojis. Use Lucide React icons instead.`
      );
    }
  });

  it('Requirement 3: CheckInModal requires ActionConfirmModal verification before executing check-in', () => {
    const checkInModal = read('apps/web/src/components/front-desk/CheckInModal.tsx');

    // Must import ActionConfirmModal
    assert.match(
      checkInModal,
      /import\s+{[^}]*ActionConfirmModal[^}]*}\s+from\s+['"]\.\.\/common\/ActionConfirmModal['"]/,
      'CheckInModal.tsx must import ActionConfirmModal'
    );

    // Must manage confirmation modal state
    assert.match(checkInModal, /const\s+\[isConfirmOpen,\s*setIsConfirmOpen\]\s*=\s*useState/);

    // Form submission triggers confirmation modal rather than immediately executing onConfirm
    assert.match(checkInModal, /setIsConfirmOpen\(true\)/);

    // Renders ActionConfirmModal with required summary details
    assert.match(checkInModal, /<ActionConfirmModal[\s\S]*isOpen={isConfirmOpen}/);
    assert.match(checkInModal, /'ห้องพัก'/);
    assert.match(checkInModal, /'ชื่อผู้เข้าพัก'/);
    assert.match(checkInModal, /'วันที่เข้าพัก'/);
    assert.match(checkInModal, /'เงินมัดจำคีย์การ์ด'/);

    // onConfirm is only invoked inside confirmation handler
    assert.match(checkInModal, /onConfirm={handleExecuteCheckIn}/);
    assert.match(checkInModal, /await\s+onConfirm\(reservation\.id,\s*nationalIdOrPassport\.trim\(\)\)/);
  });

  it('Requirement 3: CheckOutModal requires ActionConfirmModal verification before settling and completing checkout', () => {
    const checkOutModal = read('apps/web/src/components/front-desk/CheckOutModal.tsx');

    // Must import ActionConfirmModal
    assert.match(
      checkOutModal,
      /import\s+{[^}]*ActionConfirmModal[^}]*}\s+from\s+['"]\.\.\/common\/ActionConfirmModal['"]/,
      'CheckOutModal.tsx must import ActionConfirmModal'
    );

    // Must manage checkout confirmation modal state
    assert.match(
      checkOutModal,
      /const\s+\[isConfirmCheckoutOpen,\s*setIsConfirmCheckoutOpen\]\s*=\s*useState/
    );

    // Form submission triggers checkout confirmation modal
    assert.match(checkOutModal, /setIsConfirmCheckoutOpen\(true\)/);

    // Renders ActionConfirmModal with keycard, payment method, net due details
    assert.match(checkOutModal, /<ActionConfirmModal[\s\S]*isOpen={isConfirmCheckoutOpen}/);
    assert.match(checkOutModal, /'ห้องพัก'/);
    assert.match(checkOutModal, /'ชื่อผู้เข้าพัก'/);
    assert.match(checkOutModal, /'การคืนคีย์การ์ด'/);
    assert.match(checkOutModal, /'วิธีชำระเงิน'/);
    assert.match(checkOutModal, /'ยอดชำระสุทธิ'/);

    // Execution proceeds only on confirmation
    assert.match(checkOutModal, /onConfirm={handleExecuteCheckOut}/);
  });
});

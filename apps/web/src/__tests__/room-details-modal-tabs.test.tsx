import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const getFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  return p1;
};

describe('RoomDetailsModal — 2-Tab Ergonomic Architecture', () => {
  const modalPath = getFilePath('apps/web/src/components/front-desk/RoomDetailsModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'RoomDetailsModal.tsx should exist');
  const code = fs.readFileSync(modalPath, 'utf-8');

  it('Requirement 1 & 3: defines 2 discrete tabs (stay & room) with Swiss styling, #F97316 indicator, and min-h-[44px]', () => {
    // 1. Tab state definition
    assert.match(
      code,
      /activeTab.*setActiveTab.*['"]stay['"]\s*\|\s*['"]room['"]|['"]stay['"]\s*\|\s*['"]room['"].*activeTab/,
      'RoomDetailsModal must define activeTab state with stay | room'
    );

    // 2. Tab 1: ข้อมูลการเข้าพัก & ค่าใช้จ่าย
    assert.match(
      code,
      /ข้อมูลการเข้าพัก & ค่าใช้จ่าย/,
      'Modal must contain Thai label "ข้อมูลการเข้าพัก & ค่าใช้จ่าย" for stay tab'
    );
    assert.match(
      code,
      /UserCheck/,
      'Stay tab button must use Lucide UserCheck icon'
    );

    // 3. Tab 2: สภาพห้องพัก & งานแม่บ้าน
    assert.match(
      code,
      /สภาพห้องพัก & งานแม่บ้าน/,
      'Modal must contain Thai label "สภาพห้องพัก & งานแม่บ้าน" for room tab'
    );

    // 4. Tab switcher styling: active border #F97316 and touch target min-h-[44px]
    assert.match(
      code,
      /#F97316|border-\[#F97316\]/,
      'Active tab indicator must feature #F97316 border'
    );
    assert.match(
      code,
      /min-h-\[44px\]/,
      'Tab buttons must provide accessible touch target with min-h-[44px]'
    );
  });

  it('Requirement 2: implements occupancy-aware default tab logic based on room.status', () => {
    // Defaults to 'stay' when room.status === 'occupied', else 'room'
    assert.match(
      code,
      /room\??\.status\s*===\s*['"]occupied['"]\s*\?\s*['"]stay['"]\s*:\s*['"]room['"]/,
      'Default tab must dynamically resolve to "stay" for occupied rooms, and "room" otherwise'
    );
  });

  it('Requirement 1 & 4: Tab "stay" contains guest details, phone, national ID, slip preview, and folio operations', () => {
    // Guest information fields: name, phone, idCard, source, payment status
    assert.match(
      code,
      /phone|phoneNumber/,
      'Stay tab must display guest phone number'
    );
    assert.match(
      code,
      /idCardNumber|nationalIdOrPassport/,
      'Stay tab must display guest ID card / Passport'
    );
    assert.match(
      code,
      /setIsSlipViewerOpen\(true\)|ดูหลักฐานสลิป/,
      'Stay tab must include slip viewer button'
    );

    // Folio operations for occupied room: Extend, Amenities, Add Charge, Checkout
    assert.match(
      code,
      /ขยายเวลาเข้าพัก|extend\.button/,
      'Stay tab must feature extend stay action'
    );
    assert.match(
      code,
      /ขอของใช้เสริม|setIsAmenitiesModalOpen\(true\)/,
      'Stay tab must feature request amenities action'
    );
    assert.match(
      code,
      /เพิ่มค่าใช้จ่าย\/มินิบาร์|folio\.addCharge/,
      'Stay tab must feature add charge action'
    );
    assert.match(
      code,
      /ops\.checkOut|เช็คเอาต์/,
      'Stay tab must feature checkout action with correct Thai spelling'
    );
  });

  it('Requirement 1 & 4: Tab "room" contains room specs, amenities, housekeeping photo evidence, and notes', () => {
    // Specifications: type, floor, price, capacity
    assert.match(code, /localizeRoomType/);
    assert.match(code, /BedDouble/);
    assert.match(code, /Layers/);
    assert.match(code, /DollarSign/);
    assert.match(code, /Users/);

    // Amenities
    assert.match(code, /localizeAmenity/);

    // Housekeeping evidence and notes
    assert.match(code, /หลักฐานการตรวจรับห้องพัก|Housekeeping Inspection Evidence/);
    assert.match(code, /ก่อนทำความสะอาด/);
    assert.match(code, /หลังตรวจรับเสร็จสมบูรณ์/);
    assert.match(code, /localizeRoomNote/);
    assert.match(code, /handleStartEditNotes/);
  });

  it('Requirement 4: maintains Thai spelling standard "เช็คเอาต์" and zero raw emojis', () => {
    // Thai spelling: "เช็คเอาต์" with ต-เต่า การันต์
    assert.doesNotMatch(
      code,
      /เช็คเอาท์/,
      'Must NOT contain deprecated spelling เช็คเอาท์ (ท.ทหาร การันต์)'
    );

    // Zero raw Unicode emoji pictographs
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const lines = code.split('\n');
    const emojiLines = lines.filter((line) => emojiRegex.test(line));
    assert.strictEqual(
      emojiLines.length,
      0,
      `RoomDetailsModal.tsx must contain zero raw emojis, found: ${emojiLines.join(', ')}`
    );
  });
});

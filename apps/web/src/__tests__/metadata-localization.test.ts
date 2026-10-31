import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  localizeRoomType,
  localizeRoomNote,
  localizeRoomDescription,
  localizeAmenity,
} from '../lib/localizeMetadata';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Bilingual Room Metadata Localization Engine', () => {
  describe('localizeRoomType', () => {
    it('translates known room types into Thai and English', () => {
      assert.strictEqual(localizeRoomType('Standard Room', 'th'), 'ห้องสแตนดาร์ด');
      assert.strictEqual(localizeRoomType('Standard Room', 'en'), 'Standard Room');

      assert.strictEqual(localizeRoomType('Deluxe Sea View', 'th'), 'ห้องดีลักซ์ ซีวิว');
      assert.strictEqual(localizeRoomType('Deluxe Sea View', 'en'), 'Deluxe Sea View');

      assert.strictEqual(localizeRoomType('Executive Suite', 'th'), 'ห้องเอ็กเซ็กคิวทีฟ สวีท');
      assert.strictEqual(localizeRoomType('Executive Suite', 'en'), 'Executive Suite');

      assert.strictEqual(localizeRoomType('Presidential Villa', 'th'), 'ห้องเพรสซิเดนเชียล วิลล่า');
      assert.strictEqual(localizeRoomType('Presidential Villa', 'en'), 'Presidential Villa');
    });

    it('falls back gracefully to input string when unmapped', () => {
      assert.strictEqual(localizeRoomType('Honeymoon Penthouse', 'th'), 'Honeymoon Penthouse');
      assert.strictEqual(localizeRoomType('Honeymoon Penthouse', 'en'), 'Honeymoon Penthouse');
    });

    it('handles empty or undefined values safely without crashing', () => {
      assert.strictEqual(localizeRoomType(undefined, 'th'), '');
      assert.strictEqual(localizeRoomType(undefined, 'en'), '');
      assert.strictEqual(localizeRoomType('', 'th'), '');
    });
  });

  describe('localizeRoomNote', () => {
    it('translates all seed room notes into Thai and English', () => {
      assert.strictEqual(localizeRoomNote('Near garden pathway', 'th'), 'ใกล้ทางเดินสวนหย่อม');
      assert.strictEqual(localizeRoomNote('Near garden pathway', 'en'), 'Near garden pathway');

      assert.strictEqual(localizeRoomNote('Late check-in guest', 'th'), 'แขกเช็คอินช่วงดึก');
      assert.strictEqual(localizeRoomNote('Priority checkout clean', 'th'), 'ห้องทำความสะอาดเร่งด่วน');
      assert.strictEqual(localizeRoomNote('Accessible room', 'th'), 'ห้องพักสำหรับผู้ใช้วีลแชร์');
      assert.strictEqual(localizeRoomNote('Ocean front', 'th'), 'ริมชายหาดวิวทะเล');
      assert.strictEqual(localizeRoomNote('Awaiting housekeeping inspect', 'th'), 'รอแม่บ้านตรวจสอบรอบสุดท้าย');
      assert.strictEqual(localizeRoomNote('Balcony terrace', 'th'), 'ระเบียงรับลมส่วนตัว');
      assert.strictEqual(localizeRoomNote('AC fan replacement', 'th'), 'รอเปลี่ยนพัดลมแอร์');
      assert.strictEqual(localizeRoomNote('Quiet zone', 'th'), 'โซนเงียบสงบ');
      assert.strictEqual(localizeRoomNote('Sunset view', 'th'), 'วิวพระอาทิตย์ตกดิน');
      assert.strictEqual(localizeRoomNote('VIP David Tan arriving tomorrow', 'th'), 'แขก VIP David Tan เข้าพักพรุ่งนี้');
      assert.strictEqual(localizeRoomNote('Deep cleaning routine', 'th'), 'รอบทำความสะอาดล้ำลึก');
      assert.strictEqual(localizeRoomNote('Corner executive', 'th'), 'ห้องมุมสวีทวิวพาโนรามา');
      assert.strictEqual(localizeRoomNote('Executive lounge access', 'th'), 'สิทธิเข้าใช้เอ็กเซ็กคิวทีฟเลานจ์');
      assert.strictEqual(localizeRoomNote('Plumbing maintenance', 'th'), 'ช่างกำลังตรวจสอบระบบประปา');
      assert.strictEqual(localizeRoomNote('High floor panoramic', 'th'), 'ชั้นสูงวิวเมืองมุมกว้าง');
      assert.strictEqual(localizeRoomNote('Presidential Penthouse East', 'th'), 'เพนต์เฮาส์ปีกตะวันออก');
    });

    it('falls back gracefully to the original string for unmapped custom notes', () => {
      const customNote = 'Guest requested extra lavender pillow and quiet corner';
      assert.strictEqual(localizeRoomNote(customNote, 'th'), customNote);
      assert.strictEqual(localizeRoomNote(customNote, 'en'), customNote);
    });

    it('handles undefined or blank notes safely', () => {
      assert.strictEqual(localizeRoomNote(undefined, 'th'), '');
      assert.strictEqual(localizeRoomNote(undefined, 'en'), '');
      assert.strictEqual(localizeRoomNote('', 'th'), '');
    });
  });

  describe('localizeRoomDescription', () => {
    it('translates known seed descriptions into Thai', () => {
      const stdDesc = 'Comfortable modern room with city view, work desk, and private ensuite bathroom.';
      const dlxDesc = 'Spacious room featuring private balcony with panoramic ocean views and marble bathroom.';
      const steDesc = 'Luxurious corner suite with separate living area, dining table, and deep soaking bathtub.';
      const prsDesc = 'The pinnacle of luxury with private plunge pool, master jacuzzi, 2 bedrooms, and butler service.';

      const thStd = localizeRoomDescription(stdDesc, 'th');
      assert.strictEqual(typeof thStd, 'string');
      assert.notStrictEqual(thStd, stdDesc);
      assert.match(thStd, /ห้องพัก|วิวเมือง/);

      const enStd = localizeRoomDescription(stdDesc, 'en');
      assert.strictEqual(enStd, stdDesc);

      const thDlx = localizeRoomDescription(dlxDesc, 'th');
      assert.match(thDlx, /ระเบียงส่วนตัว|วิวทะเล/);

      const thSte = localizeRoomDescription(steDesc, 'th');
      assert.match(thSte, /ห้องสวีท|ห้องนั่งเล่น/);

      const thPrs = localizeRoomDescription(prsDesc, 'th');
      assert.match(thPrs, /สระว่ายน้ำส่วนตัว|บัตเลอร์/);
    });

    it('falls back gracefully to original description if unmapped', () => {
      const customDesc = 'Boutique eco-friendly pod with solar lighting and organic cotton bedding.';
      assert.strictEqual(localizeRoomDescription(customDesc, 'th'), customDesc);
      assert.strictEqual(localizeRoomDescription(customDesc, 'en'), customDesc);
    });

    it('handles undefined descriptions safely', () => {
      assert.strictEqual(localizeRoomDescription(undefined, 'th'), '');
      assert.strictEqual(localizeRoomDescription(undefined, 'en'), '');
    });
  });

  describe('localizeAmenity', () => {
    it('translates known amenities into Thai and English', () => {
      assert.strictEqual(localizeAmenity('King Bed', 'th'), 'เตียงคิงไซส์');
      assert.strictEqual(localizeAmenity('King Bed', 'en'), 'King Bed');

      assert.strictEqual(localizeAmenity('Free Wi-Fi', 'th'), 'ฟรี Wi-Fi');
      assert.strictEqual(localizeAmenity('City View', 'th'), 'วิวเมือง');
      assert.strictEqual(localizeAmenity('Work Desk', 'th'), 'โต๊ะทำงาน');
      assert.strictEqual(localizeAmenity('Ocean View', 'th'), 'วิวทะเล');
      assert.strictEqual(localizeAmenity('Balcony', 'th'), 'ระเบียงส่วนตัว');
      assert.strictEqual(localizeAmenity('Mini-bar', 'th'), 'มินิบาร์');
      assert.strictEqual(localizeAmenity('Bathtub', 'th'), 'อ่างอาบน้ำ');
      assert.strictEqual(localizeAmenity('Living Room', 'th'), 'ห้องนั่งเล่นแยกส่วน');
      assert.strictEqual(localizeAmenity('Espresso Machine', 'th'), 'เครื่องชงกาแฟเอสเปรสโซ');
      assert.strictEqual(localizeAmenity('Lounge Access', 'th'), 'สิทธิเข้าเอ็กเซ็กคิวทีฟเลานจ์');
      assert.strictEqual(localizeAmenity('Private Pool', 'th'), 'สระว่ายน้ำส่วนตัว');
      assert.strictEqual(localizeAmenity('Butler Service', 'th'), 'บริการบัตเลอร์ส่วนตัว');
      assert.strictEqual(localizeAmenity('Kitchenette', 'th'), 'มุมครัวส่วนตัว');
    });

    it('falls back gracefully to unmapped amenity string', () => {
      assert.strictEqual(localizeAmenity('Playstation 5', 'th'), 'Playstation 5');
      assert.strictEqual(localizeAmenity('Playstation 5', 'en'), 'Playstation 5');
    });

    it('handles empty amenity strings safely', () => {
      assert.strictEqual(localizeAmenity('', 'th'), '');
      assert.strictEqual(localizeAmenity('', 'en'), '');
    });
  });

  describe('dictionary 1:1 key parity for metadata entries', () => {
    it('ensures metadata keys match 1:1 between th.ts and en.ts', () => {
      const thKeys = Object.keys(th).filter(
        (k) =>
          k.startsWith('roomTypes.') ||
          k.startsWith('roomNotes.') ||
          k.startsWith('amenities.') ||
          k.startsWith('roomDescriptions.')
      );
      const enKeys = Object.keys(en).filter(
        (k) =>
          k.startsWith('roomTypes.') ||
          k.startsWith('roomNotes.') ||
          k.startsWith('amenities.') ||
          k.startsWith('roomDescriptions.')
      );

      assert.ok(thKeys.length > 0, 'th should contain metadata keys');
      assert.deepStrictEqual(
        thKeys.sort(),
        enKeys.sort(),
        'Metadata keys must match 1:1 between TH and EN dictionaries'
      );
    });
  });
});

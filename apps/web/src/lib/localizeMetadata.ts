import { th } from '../locales/th';
import { en } from '../locales/en';
import type { Locale } from './i18n';

// Pre-computed bidirectional lookup dictionaries
const ROOM_TYPES_TH: Record<string, string> = {};
const ROOM_TYPES_EN: Record<string, string> = {};
export const ROOM_NOTES_TH: Record<string, string> = {};
export const ROOM_NOTES_EN: Record<string, string> = {};
const AMENITIES_TH: Record<string, string> = {};
const AMENITIES_EN: Record<string, string> = {};
const ROOM_DESCRIPTIONS_TH: Record<string, string> = {};
const ROOM_DESCRIPTIONS_EN: Record<string, string> = {};
const FOLIO_ITEMS_TH: Record<string, string> = {
  // Minibar
  'Drinking Water': 'น้ำดื่ม',
  'Singha Beer': 'เบียร์สิงห์',
  'Chang Beer': 'เบียร์ช้าง',
  'Canned Soft Drink / Coke': 'น้ำอัดลม / โค้ก',
  'Soft Drink': 'น้ำอัดลม',
  'Coke': 'โค้ก',
  'Pringles Potato Chips': 'มันฝรั่งพริงเกิลส์',
  'Mineral Water': 'น้ำแร่ธรรมชาติ',
  // Laundry
  'Express Laundry Service': 'บริการซักรีดด่วนพิเศษ',
  'Shirt Washing & Ironing': 'ซักรีดเสื้อเชิ้ต',
  'Trousers / Pants': 'ซักรีดกางเกง',
  'Laundry Service': 'บริการซักรีด',
  // Damage
  'Lost Key Card Replacement': 'ค่าปรับคีย์การ์ดสูญหาย',
  'Stained Bed Linen': 'ค่าซักทำความสะอาดผ้าปูที่นอนเปื้อน',
  'Damaged Bath Towel': 'ค่าปรับผ้าเช็ดตัวเสียหาย',
  'Damage Compensation': 'ค่าชดเชยความเสียหาย',
  // Services
  'Extra Bed with Breakfast': 'เตียงเสริมพร้อมอาหารเช้า',
  'Extra Bed': 'เตียงเสริม',
  'Airport Shuttle Transfer': 'รถรับส่งสนามบิน',
  'Late Check-out Hourly Fee': 'ค่าธรรมเนียมเช็คเอาท์เกินเวลา (รายชั่วโมง)',
  'Room Service: American Breakfast': 'รูมเซอร์วิส: อาหารเช้าอเมริกัน',
  'Miscellaneous Charge': 'ค่าบริการเบ็ดเตล็ด',
};
const FOLIO_ITEMS_EN: Record<string, string> = {};

for (const [enKey, thVal] of Object.entries(FOLIO_ITEMS_TH)) {
  FOLIO_ITEMS_EN[thVal] = enKey;
  FOLIO_ITEMS_EN[enKey] = enKey;
  FOLIO_ITEMS_TH[thVal] = thVal;
}

// Index all metadata mappings from locales on initialization
for (const [key, thVal] of Object.entries(th)) {
  if (key.startsWith('roomTypes.')) {
    const rawName = key.replace('roomTypes.', '');
    const enVal = en[key] || rawName;
    ROOM_TYPES_TH[rawName] = thVal;
    ROOM_TYPES_TH[thVal] = thVal;
    ROOM_TYPES_EN[rawName] = enVal;
    ROOM_TYPES_EN[thVal] = enVal;
  } else if (key.startsWith('roomNotes.')) {
    const rawNote = key.replace('roomNotes.', '');
    const enVal = en[key] || rawNote;
    ROOM_NOTES_TH[rawNote] = thVal;
    ROOM_NOTES_TH[thVal] = thVal;
    ROOM_NOTES_EN[rawNote] = enVal;
    ROOM_NOTES_EN[thVal] = rawNote;
  } else if (key.startsWith('amenities.')) {
    const rawAmenity = key.replace('amenities.', '');
    const enVal = en[key] || rawAmenity;
    AMENITIES_TH[rawAmenity] = thVal;
    AMENITIES_TH[thVal] = thVal;
    AMENITIES_EN[rawAmenity] = enVal;
    AMENITIES_EN[thVal] = enVal;
  } else if (key.startsWith('roomDescriptions.')) {
    const rawDesc = key.replace('roomDescriptions.', '');
    const enVal = en[key] || rawDesc;
    ROOM_DESCRIPTIONS_TH[rawDesc] = thVal;
    ROOM_DESCRIPTIONS_TH[thVal] = thVal;
    ROOM_DESCRIPTIONS_EN[rawDesc] = enVal;
    ROOM_DESCRIPTIONS_EN[thVal] = enVal;
  }
}

/**
 * Localize a room type name (e.g. "Standard Room" -> "ห้องสแตนดาร์ด").
 * Returns the original string if not in dictionary, or empty string if undefined.
 */
export function localizeRoomType(name: string | undefined | null, locale: Locale = 'th'): string {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();
  if (locale === 'en') {
    return ROOM_TYPES_EN[trimmed] || en[`roomTypes.${trimmed}`] || trimmed;
  }
  return ROOM_TYPES_TH[trimmed] || th[`roomTypes.${trimmed}`] || trimmed;
}

/**
 * Localize a room operational note (e.g. "Near garden pathway" -> "ใกล้ทางเดินสวนหย่อม").
 * Gracefully falls back to raw string for custom notes.
 */
export function localizeRoomNote(note: string | undefined | null, locale: Locale = 'th'): string {
  if (!note || !note.trim()) return '';
  const trimmed = note.trim();
  if (locale === 'en') {
    return ROOM_NOTES_EN[trimmed] || en[`roomNotes.${trimmed}`] || trimmed;
  }
  return ROOM_NOTES_TH[trimmed] || th[`roomNotes.${trimmed}`] || trimmed;
}

/**
 * Localize room description from seeds into the active language.
 */
export function localizeRoomDescription(desc: string | undefined | null, locale: Locale = 'th'): string {
  if (!desc || !desc.trim()) return '';
  const trimmed = desc.trim();
  if (locale === 'en') {
    return ROOM_DESCRIPTIONS_EN[trimmed] || en[`roomDescriptions.${trimmed}`] || trimmed;
  }
  return ROOM_DESCRIPTIONS_TH[trimmed] || th[`roomDescriptions.${trimmed}`] || trimmed;
}

/**
 * Localize room amenity name (e.g. "King Bed" -> "เตียงคิงไซส์").
 */
export function localizeAmenity(amenity: string | undefined | null, locale: Locale = 'th'): string {
  if (!amenity || !amenity.trim()) return '';
  const trimmed = amenity.trim();
  if (locale === 'en') {
    return AMENITIES_EN[trimmed] || en[`amenities.${trimmed}`] || trimmed;
  }
  return AMENITIES_TH[trimmed] || th[`amenities.${trimmed}`] || trimmed;
}

/**
 * Localize folio item description (room charges, minibar, laundry, services, damage).
 */
export function localizeFolioDescription(desc: string | undefined | null, locale: Locale = 'th'): string {
  if (!desc || !desc.trim()) return '';
  const trimmed = desc.trim();

  // 1. Direct dictionary match
  if (locale === 'en') {
    if (FOLIO_ITEMS_EN[trimmed]) return FOLIO_ITEMS_EN[trimmed];
  } else {
    if (FOLIO_ITEMS_TH[trimmed]) return FOLIO_ITEMS_TH[trimmed];
  }

  // 2. Room type direct match
  const localizedRoom = localizeRoomType(trimmed, locale);
  if (localizedRoom && localizedRoom !== trimmed) {
    return localizedRoom;
  }

  // 3. Room type substring match, e.g. "Standard Room - 1 Night"
  for (const [rtEn, rtTh] of Object.entries(ROOM_TYPES_TH)) {
    if (trimmed.includes(rtEn)) {
      const target = locale === 'en' ? (ROOM_TYPES_EN[rtEn] || rtEn) : rtTh;
      return trimmed.replace(rtEn, target);
    }
    if (trimmed.includes(rtTh)) {
      const target = locale === 'en' ? (ROOM_TYPES_EN[rtTh] || rtEn) : rtTh;
      return trimmed.replace(rtTh, target);
    }
  }

  // 4. Dynamic Room Charge pattern match: "Room Charge (X nights)" / "ค่าห้องพัก (X คืน)"
  const roomChargeRegex = /^Room Charge\s*\(\s*(\d+)\s*nights?\s*\)$/i;
  const rcMatch = trimmed.match(roomChargeRegex);
  if (rcMatch) {
    const nights = rcMatch[1];
    return locale === 'th'
      ? `ค่าห้องพัก (${nights} คืน)`
      : `Room Charge (${nights} ${Number(nights) > 1 ? 'nights' : 'night'})`;
  }

  const thRoomChargeRegex = /^ค่าห้องพัก(?:\s*([^()]+))?\s*\(\s*(\d+)\s*คืน\s*\)$/;
  const thMatch = trimmed.match(thRoomChargeRegex);
  if (thMatch) {
    const typePart = thMatch[1]?.trim();
    const nights = thMatch[2];
    if (locale === 'en') {
      const enType = typePart ? (ROOM_TYPES_EN[typePart] || typePart) : '';
      return `${enType ? enType : 'Room Charge'} (${nights} ${Number(nights) > 1 ? 'nights' : 'night'})`;
    }
    return trimmed;
  }

  return trimmed;
}

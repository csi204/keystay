import { th } from '../locales/th';
import { en } from '../locales/en';
import type { Locale } from './i18n';

// Pre-computed bidirectional lookup dictionaries
const ROOM_TYPES_TH: Record<string, string> = {};
const ROOM_TYPES_EN: Record<string, string> = {};
const ROOM_NOTES_TH: Record<string, string> = {};
const ROOM_NOTES_EN: Record<string, string> = {};
const AMENITIES_TH: Record<string, string> = {};
const AMENITIES_EN: Record<string, string> = {};
const ROOM_DESCRIPTIONS_TH: Record<string, string> = {};
const ROOM_DESCRIPTIONS_EN: Record<string, string> = {};

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
    ROOM_NOTES_EN[thVal] = enVal;
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

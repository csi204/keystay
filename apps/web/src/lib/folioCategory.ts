import React from 'react';
import { BedDouble, Coffee, Sparkles, Shirt, AlertTriangle, Receipt } from 'lucide-react';
import { useI18n } from './i18n';

export type FolioCategoryKey = 'room' | 'minibar' | 'service' | 'laundry' | 'damage' | 'other';

export type FolioCategoryIconName =
  | 'BedDouble'
  | 'Coffee'
  | 'Sparkles'
  | 'Shirt'
  | 'AlertTriangle'
  | 'Receipt';

export interface ResolvedFolioCategory {
  key: FolioCategoryKey;
  labelKey: string;
  iconName: FolioCategoryIconName;
  badgeClass: string;
}

export const FOLIO_CATEGORY_CONFIG: Record<FolioCategoryKey, ResolvedFolioCategory> = {
  room: {
    key: 'room',
    labelKey: 'category.room',
    iconName: 'BedDouble',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  minibar: {
    key: 'minibar',
    labelKey: 'category.minibar',
    iconName: 'Coffee',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  service: {
    key: 'service',
    labelKey: 'category.service',
    iconName: 'Sparkles',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  laundry: {
    key: 'laundry',
    labelKey: 'category.laundry',
    iconName: 'Shirt',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  damage: {
    key: 'damage',
    labelKey: 'category.damage',
    iconName: 'AlertTriangle',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  other: {
    key: 'other',
    labelKey: 'category.other',
    iconName: 'Receipt',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const FALLBACK_LABELS: Record<FolioCategoryKey, string> = {
  room: 'Room Charge',
  minibar: 'Minibar / Beverage',
  service: 'Extra Service',
  laundry: 'Laundry Service',
  damage: 'Damage Compensation',
  other: 'Other',
};

export const FOLIO_CATEGORY_ICONS = {
  BedDouble,
  Coffee,
  Sparkles,
  Shirt,
  AlertTriangle,
  Receipt,
} as const;

/**
 * Resolves a folio line item to a well-defined category info object.
 * Checks item.category, item.itemType, item.item_type, item.type.
 * If missing, undefined, or 'other', analyzes item.description or item.name (case-insensitive)
 * with robust keyword detection for room, minibar, service, laundry, damage, or other.
 */
export function resolveFolioCategory(item: any): ResolvedFolioCategory {
  if (!item || typeof item !== 'object') {
    return FOLIO_CATEGORY_CONFIG.other;
  }

  // 1. Direct category match from known category fields
  const rawCat = item.category ?? item.itemType ?? item.item_type ?? item.type;
  if (typeof rawCat === 'string') {
    const normalized = rawCat.trim().toLowerCase();
    if (normalized === 'room') return FOLIO_CATEGORY_CONFIG.room;
    if (normalized === 'minibar') return FOLIO_CATEGORY_CONFIG.minibar;
    if (normalized === 'service' || normalized === 'amenity' || normalized === 'amenities') {
      return FOLIO_CATEGORY_CONFIG.service;
    }
    if (normalized === 'laundry') return FOLIO_CATEGORY_CONFIG.laundry;
    if (normalized === 'damage') return FOLIO_CATEGORY_CONFIG.damage;
    // 'other', 'undefined', 'null', or unknown strings fall through to description/name analysis
  }

  // 2. Keyword deduction from description or name
  const desc = typeof item.description === 'string' ? item.description : '';
  const name = typeof item.name === 'string' ? item.name : '';
  const text = `${desc} ${name}`.toLowerCase();

  if (text.length > 0) {
    // Laundry
    const laundryKeywords = ['laundry', 'ซัก', 'รีด'];
    if (laundryKeywords.some((k) => text.includes(k))) {
      return FOLIO_CATEGORY_CONFIG.laundry;
    }

    // Damage
    const damageKeywords = ['damage', 'broken', 'เสีย', 'ชดเชย', 'ปรับ'];
    if (damageKeywords.some((k) => text.includes(k))) {
      return FOLIO_CATEGORY_CONFIG.damage;
    }

    // Minibar
    const minibarKeywords = [
      'beer',
      'water',
      'coke',
      'minibar',
      'ถั่ว',
      'เบียร์',
      'น้ำดื่ม',
      'เครื่องดื่ม',
      'snack',
    ];
    if (minibarKeywords.some((k) => text.includes(k))) {
      return FOLIO_CATEGORY_CONFIG.minibar;
    }

    // Room
    const roomKeywords = ['room', 'night', 'ห้อง', 'คืน'];
    if (roomKeywords.some((k) => text.includes(k))) {
      return FOLIO_CATEGORY_CONFIG.room;
    }

    // Service
    const serviceKeywords = [
      'bed',
      'pillow',
      'towel',
      'เตียง',
      'หมอน',
      'ผ้า',
      'amenity',
      'service',
      'ของใช้',
    ];
    if (serviceKeywords.some((k) => text.includes(k))) {
      return FOLIO_CATEGORY_CONFIG.service;
    }
  }

  return FOLIO_CATEGORY_CONFIG.other;
}

export interface FolioCategoryBadgeProps {
  item: any;
  className?: string;
  showIcon?: boolean;
}

/**
 * Renders a clean chip badge with the appropriate Lucide icon and localized label.
 * Guaranteed never to render 'category.undefined' or an empty blank box.
 */
export const FolioCategoryBadge: React.FC<FolioCategoryBadgeProps> = ({
  item,
  className = '',
  showIcon = true,
}) => {
  const { t } = useI18n();
  const info = resolveFolioCategory(item);
  const IconComponent = FOLIO_CATEGORY_ICONS[info.iconName] || Receipt;
  const translated = t(info.labelKey);
  const label =
    translated && translated !== info.labelKey ? translated : FALLBACK_LABELS[info.key];

  return React.createElement(
    'span',
    {
      className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap shrink-0 ${info.badgeClass} ${className}`.trim(),
    },
    showIcon &&
      React.createElement(IconComponent, {
        className: 'w-3 h-3 flex-shrink-0',
        strokeWidth: 1.75,
        'aria-hidden': true,
      }),
    React.createElement('span', null, label)
  );
};

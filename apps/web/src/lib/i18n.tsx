import React, { createContext, useContext, useState, useMemo } from 'react';
import { th as frontDeskTh } from '../locales/th';
import { en as frontDeskEn } from '../locales/en';

export type Language = 'th' | 'en';
export type Locale = Language;

export interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  th: {
    // Nav & Sidebar
    'nav.home': 'หน้าหลัก',
    'nav.management': 'บริหารจัดการ',
    'nav.overview': 'ภาพรวม',
    'nav.roomsPricing': 'ห้องและราคา',
    'nav.minibar': 'มินิบาร์',
    'nav.reports': 'รายงาน',
    'nav.technicians': 'ช่างซ่อมบำรุง',
    'nav.usersRoles': 'ผู้ใช้และสิทธิ์',
    'nav.logout': 'ออกจากระบบ',
    'nav.changePassword': 'เปลี่ยนรหัสผ่าน',
    'nav.switchLang': 'สลับภาษา',
    'nav.langName': 'ภาษาไทย',

    // Roles
    'role.owner': 'Owner',
    'role.front_desk': 'Front Desk',
    'role.housekeeping': 'Housekeeping',

    // Tabs
    'tab.roomTypes': 'ประเภทห้องพัก',
    'tab.roomUnits': 'ห้องจริง (Room Units)',
    'tab.pricingRules': 'กฎราคาตามฤดูกาล',
    'tab.amenities': 'ของใช้และบริการเสริม',

    // Page Headers
    'header.roomTypes.title': 'ประเภทห้องพักและอัตราค่าบริการพื้นฐาน',
    'header.roomTypes.desc': 'กำหนดราคาต่อคืน (Base Price) จำนวนผู้เข้าพัก ขนาดห้อง และเตียงนอนที่ให้บริการ',
    'header.roomUnits.title': 'จัดการห้องพักจริง (Room Units)',
    'header.roomUnits.desc': 'เพิ่ม ปิดการใช้งาน แก้ไขข้อมูล หรือเปลี่ยนสถานะห้องพักรายห้อง แยกตามชั้น',
    'header.pricingRules.title': 'ระบบคำนวณราคาตามฤดูกาลและเทศกาล (Dynamic Seasonal Pricing)',
    'header.pricingRules.desc': 'ปรับอัตราค่าห้องพักตามฤดูกาลหรือเทศกาล โดยคงราคาฐานเดิมไว้ (Base Price ไม่เปลี่ยนแปลง)',
    'header.amenities.title': 'แคตตาล็อกของใช้และบริการเสริม (Extra Amenities Catalog)',
    'header.amenities.desc': 'กำหนดรายการของใช้ฟรีและของใช้คิดเงิน เพื่อส่งคำขอให้แม่บ้านและลงบิล Folio อัตโนมัติ',
    'header.minibar.title': 'สินค้าและราคามินิบาร์ (Master Data / Catalog)',
    'header.minibar.desc': 'กำหนดรายการสินค้ามินิบาร์ ราคาขายต่อชิ้น และจัดการสต็อก (กำหนดโดย Owner)',
    'header.reports.title': 'รายงานสถิติและการเงิน (Reports & Analytics)',
    'header.reports.desc': 'ภาพรวมผลประกอบการ รายได้ประจำวัน ADR RevPAR และอัตราการเข้าพัก',
    'header.users.title': 'การจัดการผู้ใช้และสิทธิ์การเข้าถึง (User Management & RBAC)',
    'header.users.desc': 'ควบคุมบัญชีพนักงาน กำหนดบทบาท และสิทธิ์การเข้าถึงระบบตามระดับงาน',
    'header.dashboard.title': 'ภาพรวมการดำเนินงานโรงแรม (Executive Dashboard)',
    'header.dashboard.desc': 'สรุปข้อมูลตัวชี้วัดรายวัน ประสิทธิภาพห้องพัก และรายได้สะสมประจำเดือน',

    // Buttons & Actions
    'action.addRoomType': 'เพิ่มประเภทห้อง',
    'action.addRoomUnit': 'เพิ่มห้องพัก',
    'action.edit': 'แก้ไข',
    'action.delete': 'ลบ',
    'action.changeStatus': 'เปลี่ยนสถานะ',
    'action.editRoom': 'แก้ไขห้อง',
    'action.closeRoom': 'ปิดใช้งานห้อง',
    'action.confirmDelete': 'ยืนยันลบ',
    'action.confirmClose': 'ยืนยันปิดห้อง',
    'action.cancel': 'ยกเลิก',
    'action.save': 'บันทึก',
    'action.saveChanges': 'บันทึกการแก้ไข',
    'action.refresh': 'รีเฟรชข้อมูล',
    'action.refreshSuccess': 'อัปเดตเรียบร้อย',
    'action.exportCsv': 'ส่งออก CSV',
    'action.exportPdf': 'ส่งออก PDF',
    'action.createUser': 'สร้างผู้ใช้ใหม่',
    'action.addItem': 'เพิ่มสินค้า',
    'action.addRule': 'เพิ่มกฎราคาใหม่',
    'action.addAmenity': 'เพิ่มของใช้/บริการ',
    'action.exportTaxReport': 'ส่งออกรายงานภาษีขาย (ภ.พ.30)',

    // Filters & Search
    'filter.searchRoomType': 'ค้นหาชื่อประเภทห้องพัก...',
    'filter.searchRoomUnit': 'ค้นหาเลขห้อง...',
    'filter.floor': 'ชั้น',
    'filter.allFloors': 'ทุกชั้น',
    'filter.roomType': 'ประเภทห้องพัก',
    'filter.allRoomTypes': 'ทุกประเภทห้อง',
    'filter.bedType': 'ประเภทเตียง',
    'filter.allBedTypes': 'ทุกแบบเตียง',
    'filter.occupancy': 'จำนวนผู้เข้าพัก',
    'filter.allOccupancies': 'ทุกขนาดผู้เข้าพัก',
    'filter.status': 'สถานะห้อง',
    'filter.allStatuses': 'ทุกสถานะ',
    'filter.clearFilters': 'ล้างตัวกรอง',
    'filter.showingTypes': 'แสดง {count} จากทั้งหมด {total} ประเภทห้องพัก',
    'filter.showingUnits': 'แสดง {count} จากทั้งหมด {total} ห้อง',

    // Room Fields
    'field.roomType': 'ประเภทห้องพัก',
    'field.roomTypeName': 'ชื่อประเภทห้องพัก',
    'field.description': 'รายละเอียดห้องพัก',
    'field.basePrice': 'ราคาพื้นฐานต่อคืน',
    'field.maxOccupancy': 'ผู้เข้าพักสูงสุด',
    'field.bedType': 'เตียงนอน',
    'field.sizeSqm': 'ขนาดห้อง (ตร.ม.)',
    'field.bathrooms': 'ห้องน้ำ',
    'field.actions': 'การจัดการ',
    'field.roomNumber': 'เลขห้อง',
    'field.floor': 'ชั้น',
    'field.status': 'สถานะ',
    'field.isActive': 'ใช้งาน',

    // Units / Suffixes
    'unit.perNight': '/คืน',
    'unit.persons': 'ท่าน',
    'unit.sqm': 'ตร.ม.',
    'unit.rooms': 'ห้อง',

    // Statuses
    'status.available': 'ว่าง',
    'status.reserved': 'จองแล้ว',
    'status.occupied': 'มีผู้เข้าพัก',
    'status.checked_out': 'เช็คเอาท์แล้ว',
    'status.cleaning': 'กำลังทำความสะอาด',
    'status.maintenance': 'ซ่อมบำรุง',
    'status.out_of_order': 'ปิดใช้งาน',

    // Modals & Validation
    'modal.createType.title': 'เพิ่มประเภทห้องพักใหม่',
    'modal.editType.title': 'แก้ไขประเภทห้องพักและราคา',
    'modal.deleteType.title': 'ยืนยันการลบประเภทห้องพัก',
    'modal.deleteType.confirm': 'คุณต้องการลบประเภทห้องพัก {name} ใช่หรือไม่? ห้องพักที่ผูกกับประเภทนี้จะไม่สามารถจำหน่ายได้',
    'modal.createRoom.title': 'เพิ่มห้องพักใหม่',
    'modal.editRoom.title': 'แก้ไขข้อมูลห้องพัก #{roomNumber}',
    'modal.selectFloorPlaceholder': '— เลือกชั้น —',
    'modal.selectTypePlaceholder': '— เลือกประเภทห้อง —',
    'modal.changeStatus.title': 'เปลี่ยนสถานะห้อง #{roomNumber}',
    'modal.changeStatus.current': 'สถานะปัจจุบัน:',
    'modal.changeStatus.changeTo': 'เปลี่ยนเป็น:',
    'modal.deleteRoom.title': 'ปิดใช้งานห้องพัก',
    'modal.deleteRoom.confirm': 'ห้อง #{roomNumber} จะถูกปิดใช้งาน (Soft Delete) และไม่สามารถจองได้จนกว่าจะเปิดใหม่ ยืนยันดำเนินการต่อหรือไม่?',
    'modal.occupiedWarning': 'ไม่สามารถเปลี่ยนสถานะหรือปิดห้องที่มีผู้เข้าพักอยู่ได้ (ต้องรอเช็คเอาท์ก่อน)',
    'modal.reservedWarning': 'ไม่สามารถเปลี่ยนสถานะหรือปิดห้องที่มีผู้จองล่วงหน้าได้',

    // Form Validation Errors
    'val.required': 'กรุณากรอกข้อมูลนี้',
    'val.positiveNumber': 'กรุณาระบุตัวเลขที่มากกว่า 0',
    'val.roomConflict': 'เลขห้องนี้มีอยู่ในระบบแล้ว กรุณาใช้เลขห้องอื่น',
    'val.invalidTransition': 'ไม่สามารถเปลี่ยนสถานะตามเงื่อนไข State Machine ได้',
  },
  en: {
    // Nav & Sidebar
    'nav.home': 'Home',
    'nav.management': 'Management',
    'nav.overview': 'Overview',
    'nav.roomsPricing': 'Rooms & Pricing',
    'nav.minibar': 'Minibar',
    'nav.reports': 'Reports',
    'nav.technicians': 'Technicians',
    'nav.usersRoles': 'Users & Roles',
    'nav.logout': 'Sign Out',
    'nav.changePassword': 'Change Password',
    'nav.switchLang': 'Switch Language',
    'nav.langName': 'English',

    // Roles
    'role.owner': 'Owner',
    'role.front_desk': 'Front Desk',
    'role.housekeeping': 'Housekeeping',

    // Tabs
    'tab.roomTypes': 'Room Types',
    'tab.roomUnits': 'Room Units',
    'tab.pricingRules': 'Seasonal Pricing',
    'tab.amenities': 'Extra Amenities',

    // Page Headers
    'header.roomTypes.title': 'Room Types & Base Rates',
    'header.roomTypes.desc': 'Configure base nightly rates, capacity, dimensions, and bedding offerings',
    'header.roomUnits.title': 'Room Units Management',
    'header.roomUnits.desc': 'Add, deactivate, update, or transition status for individual rooms per floor',
    'header.pricingRules.title': 'Dynamic Seasonal & Festival Pricing',
    'header.pricingRules.desc': 'Set seasonal rate rules without mutating base room prices (immutable baseline)',
    'header.amenities.title': 'Extra Amenities & Services Catalog',
    'header.amenities.desc': 'Manage free & paid amenities for housekeeping delivery and automatic folio billing',
    'header.minibar.title': 'Minibar Items & Pricing (Master Data / Catalog)',
    'header.minibar.desc': 'Manage minibar item catalog, selling price per unit, and inventory (Owner controlled)',
    'header.reports.title': 'Reports & Analytics',
    'header.reports.desc': 'Financial summaries, daily revenue stats, ADR, RevPAR, and occupancy performance',
    'header.users.title': 'User Management & Access Control (RBAC)',
    'header.users.desc': 'Manage employee accounts, assign roles, and administer permissions',
    'header.dashboard.title': 'Executive Dashboard',
    'header.dashboard.desc': 'Daily operations summary, inventory health, and month-to-date performance',

    // Buttons & Actions
    'action.addRoomType': 'Add Room Type',
    'action.addRoomUnit': 'Add Room Unit',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.changeStatus': 'Update Status',
    'action.editRoom': 'Edit Room',
    'action.closeRoom': 'Deactivate Room',
    'action.confirmDelete': 'Confirm Delete',
    'action.confirmClose': 'Confirm Deactivate',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.saveChanges': 'Save Changes',
    'action.refresh': 'Refresh Data',
    'action.refreshSuccess': 'Updated',
    'action.exportCsv': 'Export CSV',
    'action.exportPdf': 'Export PDF',
    'action.createUser': 'Create User',
    'action.addItem': 'Add Item',
    'action.addRule': 'Add Pricing Rule',
    'action.addAmenity': 'Add Amenity',
    'action.exportTaxReport': 'Export Sales Tax (PP.30)',

    // Filters & Search
    'filter.searchRoomType': 'Search room types...',
    'filter.searchRoomUnit': 'Search room number...',
    'filter.floor': 'Floor',
    'filter.allFloors': 'All Floors',
    'filter.roomType': 'Room Type',
    'filter.allRoomTypes': 'All Room Types',
    'filter.bedType': 'Bed Type',
    'filter.allBedTypes': 'All Bed Types',
    'filter.occupancy': 'Max Capacity',
    'filter.allOccupancies': 'All Capacities',
    'filter.status': 'Status',
    'filter.allStatuses': 'All Statuses',
    'filter.clearFilters': 'Clear Filters',
    'filter.showingTypes': 'Showing {count} of {total} room types',
    'filter.showingUnits': 'Showing {count} of {total} rooms',

    // Room Fields
    'field.roomType': 'Room Type',
    'field.roomTypeName': 'Room Type Name',
    'field.description': 'Description',
    'field.basePrice': 'Base Nightly Rate',
    'field.maxOccupancy': 'Max Capacity',
    'field.bedType': 'Bed Type',
    'field.sizeSqm': 'Dimensions (sq.m.)',
    'field.bathrooms': 'Bathrooms',
    'field.actions': 'Actions',
    'field.roomNumber': 'Room No.',
    'field.floor': 'Floor',
    'field.status': 'Status',
    'field.isActive': 'Active',

    // Units / Suffixes
    'unit.perNight': '/night',
    'unit.persons': 'guests',
    'unit.sqm': 'sq.m.',
    'unit.rooms': 'rooms',

    // Statuses
    'status.available': 'Available',
    'status.reserved': 'Reserved',
    'status.occupied': 'Occupied',
    'status.checked_out': 'Checked Out',
    'status.cleaning': 'Cleaning',
    'status.maintenance': 'Maintenance',
    'status.out_of_order': 'Out of Order',

    // Modals & Validation
    'modal.createType.title': 'Create New Room Type',
    'modal.editType.title': 'Edit Room Type & Rate',
    'modal.deleteType.title': 'Confirm Delete Room Type',
    'modal.deleteType.confirm': 'Are you sure you want to delete {name}? Associated rooms will be unsellable.',
    'modal.createRoom.title': 'Add New Room Unit',
    'modal.editRoom.title': 'Edit Room Unit #{roomNumber}',
    'modal.selectFloorPlaceholder': '— Select Floor —',
    'modal.selectTypePlaceholder': '— Select Room Type —',
    'modal.changeStatus.title': 'Update Status for Room #{roomNumber}',
    'modal.changeStatus.current': 'Current status:',
    'modal.changeStatus.changeTo': 'Change to:',
    'modal.deleteRoom.title': 'Deactivate Room Unit',
    'modal.deleteRoom.confirm': 'Room #{roomNumber} will be deactivated (soft delete). Proceed?',
    'modal.occupiedWarning': 'Cannot change status or deactivate an occupied room (must check out first)',
    'modal.reservedWarning': 'Cannot change status or deactivate a reserved room',

    // Form Validation Errors
    'val.required': 'This field is required',
    'val.positiveNumber': 'Please specify a number greater than 0',
    'val.roomConflict': 'Room number already exists in the system',
    'val.invalidTransition': 'Status transition is not allowed by the State Machine',
  },
};


export interface I18nContextValue {
  locale: Locale;
  language: Language;
  setLocale: (l: Locale) => void;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number | string) => string;
  formatDate: (dateStr?: string | null, format?: 'short' | 'medium' | 'long') => string;
  formatDateRange: (startStr?: string | null, endStr?: string | null, nights?: number | string) => string;
  formatRelativeTime: (date?: Date | string | number | null, locale?: Locale) => string;
}

export type I18nContextType = I18nContextValue;

const STORAGE_KEYS = ['keystay_app_lang', 'keystay_locale', 'keystay_language'];

function getInitialLocale(): Locale {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (const k of STORAGE_KEYS) {
        const val = window.localStorage.getItem(k);
        if (val === 'en' || val === 'th') return val;
      }
    }
  } catch {}
  return 'th';
}



/**
 * Safely parse date string without timezone off-by-one shifts.
 */
function parseSafeDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return null;
  }
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const d = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Helper to translate a key with parameter interpolation ({param}).
 * Falls back to the key itself if not found.
 */
export function translateKey(
  dict: Record<string, string>,
  key: string,
  params?: Record<string, string | number>
): string {
  if (!dict || dict[key] === undefined) {
    return key;
  }
  const template = dict[key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, match) => {
    if (params[match] !== undefined) {
      return String(params[match]);
    }
    return `{${match}}`;
  });
}

/**
 * Format currency with ฿ symbol and 2-decimal precision.
 * Safe against NaN and empty strings.
 */
export function formatCurrencyHelper(amount: number | string, _locale: Locale = 'th'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) {
    return '฿0.00';
  }
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `฿${formatted}`;
}

/**
 * Format date string into localized short/medium/long formats.
 * Returns '—' for missing or invalid dates.
 */
export function formatDateHelper(
  dateStr?: string | null,
  format: 'short' | 'medium' | 'long' = 'short',
  locale: Locale = 'th'
): string {
  const d = parseSafeDate(dateStr);
  if (!d) {
    return '—';
  }

  const intlLocale = locale === 'th' ? 'th-TH' : 'en-US';

  try {
    if (format === 'short') {
      return new Intl.DateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } else if (format === 'medium') {
      return new Intl.DateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } else {
      return new Intl.DateTimeFormat(intlLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    }
  } catch {
    return '—';
  }
}

/**
 * Format date range cleanly into readable format (e.g. '28 ก.ย. 2569 - 2 ต.ค. 2569 (4 คืน)').
 * Returns '—' for missing or invalid dates.
 */
export function formatDateRangeHelper(
  startStr?: string | null,
  endStr?: string | null,
  nights?: number | string,
  locale: Locale = 'th'
): string {
  const sDate = parseSafeDate(startStr);
  const eDate = parseSafeDate(endStr);

  if (!sDate && !eDate) {
    return '—';
  }

  const startFormatted = sDate ? formatDateHelper(startStr, 'short', locale) : '—';
  const endFormatted = eDate ? formatDateHelper(endStr, 'short', locale) : '—';

  // Calculate nights if not provided
  let nightCount: number | undefined =
    typeof nights === 'number'
      ? nights
      : nights !== undefined && nights !== null && !isNaN(Number(nights))
      ? Number(nights)
      : undefined;

  if (nightCount === undefined && sDate && eDate) {
    const diffMs = eDate.getTime() - sDate.getTime();
    const calculated = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (!isNaN(calculated) && calculated >= 0) {
      nightCount = calculated;
    }
  }

  if (nightCount !== undefined && nightCount >= 0) {
    const nightLabel =
      locale === 'th'
        ? `${nightCount} คืน`
        : `${nightCount} night${nightCount === 1 ? '' : 's'}`;
    return `${startFormatted} – ${endFormatted} (${nightLabel})`;
  }

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Format relative time cleanly for selective refresh timestamps.
 * Returns 'อัปเดตเมื่อสักครู่' / 'Updated just now' for < 60s,
 * 'อัปเดต X นาทีที่แล้ว' / 'Updated Xm ago' for < 60m,
 * 'อัปเดต X ชม. ที่แล้ว' / 'Updated Xh ago' for < 24h,
 * 'อัปเดต X วันที่แล้ว' / 'Updated Xd ago' for >= 24h.
 */
export function formatRelativeTime(
  date?: Date | string | number | null,
  locale: Locale = 'th'
): string {
  if (!date) {
    return locale === 'th' ? 'อัปเดตเมื่อสักครู่' : 'Updated just now';
  }

  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) {
    return '—';
  }

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return locale === 'th' ? 'อัปเดตเมื่อสักครู่' : 'Updated just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return locale === 'th' ? `อัปเดต ${diffMin} นาทีที่แล้ว` : `Updated ${diffMin}m ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return locale === 'th' ? `อัปเดต ${diffHr} ชม. ที่แล้ว` : `Updated ${diffHr}h ago`;
  }

  const diffDay = Math.floor(diffHr / 24);
  return locale === 'th' ? `อัปเดต ${diffDay} วันที่แล้ว` : `Updated ${diffDay}d ago`;
}

const defaultContextValue: I18nContextValue = {
  locale: 'th',
  language: 'th',
  setLocale: () => {},
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, params?: Record<string, string | number>) => {
    let text = frontDeskTh[key] ?? translations['th']?.[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return text;
  },
  formatCurrency: (amount) => formatCurrencyHelper(amount, 'th'),
  formatDate: (dateStr, format) => formatDateHelper(dateStr, format, 'th'),
  formatDateRange: (startStr, endStr, nights) => formatDateRangeHelper(startStr, endStr, nights, 'th'),
  formatRelativeTime: (date, loc) => formatRelativeTime(date, loc || 'th'),
};

const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        STORAGE_KEYS.forEach((k) => window.localStorage.setItem(k, newLocale));
      }
    } catch {}
  };

  const setLanguage = (lang: Language) => setLocale(lang);

  const toggleLanguage = () => {
    setLocale(locale === 'th' ? 'en' : 'th');
  };

  const currentDict = useMemo(() => (locale === 'en' ? frontDeskEn : frontDeskTh), [locale]);
  const fallbackDict = frontDeskTh;

  const t = useMemo(
    () =>
      (key: string, params?: Record<string, string | number>): string => {
        let text =
          currentDict[key] ??
          translations[locale]?.[key] ??
          fallbackDict[key] ??
          translations['th']?.[key] ??
          key;

        if (params) {
          Object.entries(params).forEach(([paramKey, val]) => {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
          });
        }
        return text;
      },
    [locale, currentDict]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      language: locale,
      setLocale,
      setLanguage,
      toggleLanguage,
      t,
      formatCurrency: (amount: number | string) => formatCurrencyHelper(amount, locale),
      formatDate: (dateStr?: string | null, format?: 'short' | 'medium' | 'long') =>
        formatDateHelper(dateStr, format, locale),
      formatDateRange: (startStr?: string | null, endStr?: string | null, nights?: number | string) =>
        formatDateRangeHelper(startStr, endStr, nights, locale),
      formatRelativeTime: (date?: Date | string | number | null, loc?: Locale) =>
        formatRelativeTime(date, loc || locale),
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  return context || defaultContextValue;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  return context || defaultContextValue;
};

import React, { createContext, useContext, useState } from 'react';

export type Language = 'th' | 'en';

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
    'nav.usersRoles': 'ผู้ใช้และสิทธิ์',
    'nav.logout': 'ออกจากระบบ',
    'nav.switchLang': 'สลับภาษา',
    'nav.langName': 'ภาษาไทย',

    // Roles
    'role.owner': 'Owner',
    'role.front_desk': 'Front Desk',
    'role.housekeeping': 'Housekeeping',

    // Tabs
    'tab.roomTypes': 'ประเภทห้องพัก',
    'tab.roomUnits': 'ห้องจริง (Room Units)',

    // Page Headers
    'header.roomTypes.title': 'ประเภทห้องพักและอัตราค่าบริการพื้นฐาน',
    'header.roomTypes.desc': 'กำหนดราคาต่อคืน (Base Price) จำนวนผู้เข้าพัก ขนาดห้อง และเตียงนอนที่ให้บริการ',
    'header.roomUnits.title': 'จัดการห้องพักจริง (Room Units)',
    'header.roomUnits.desc': 'เพิ่ม ปิดการใช้งาน แก้ไขข้อมูล หรือเปลี่ยนสถานะห้องพักรายห้อง แยกตามชั้น',
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
    'nav.usersRoles': 'Users & Roles',
    'nav.logout': 'Sign Out',
    'nav.switchLang': 'Switch Language',
    'nav.langName': 'English',

    // Roles
    'role.owner': 'Owner',
    'role.front_desk': 'Front Desk',
    'role.housekeeping': 'Housekeeping',

    // Tabs
    'tab.roomTypes': 'Room Types',
    'tab.roomUnits': 'Room Units',

    // Page Headers
    'header.roomTypes.title': 'Room Types & Base Rates',
    'header.roomTypes.desc': 'Configure base nightly rates, capacity, dimensions, and bedding offerings',
    'header.roomUnits.title': 'Room Units Management',
    'header.roomUnits.desc': 'Add, deactivate, update, or transition status for individual rooms per floor',
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

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export type Locale = Language;

const STORAGE_KEYS = ['keystay_app_lang', 'keystay_locale', 'keystay_language'];

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      for (const k of STORAGE_KEYS) {
        const val = localStorage.getItem(k);
        if (val === 'en' || val === 'th') return val;
      }
    } catch {}
    return 'th';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      STORAGE_KEYS.forEach((k) => localStorage.setItem(k, lang));
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'th' ? 'en' : 'th');
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] ?? translations['th']?.[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      language: 'th' as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        let text = translations['th']?.[key] ?? key;
        if (params) {
          Object.entries(params).forEach(([paramKey, val]) => {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
          });
        }
        return text;
      },
    };
  }
  return context;
};

export const useI18n = () => {
  const ctx = useTranslation();
  return {
    ...ctx,
    locale: ctx.language,
    setLocale: ctx.setLanguage,
  };
};

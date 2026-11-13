import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface EmergencyOutsourceContact {
  id: string;
  name: string;
  category: 'air_conditioning' | 'plumbing' | 'electrical' | 'locksmith' | 'pest_control' | 'general_maintenance' | string;
  categories?: string[];
  serviceType: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  lineId?: string | null;
  isEmergency: boolean;
  availableHours: string;
  openTime?: string;
  closeTime?: string;
  priceRateNote?: string | null;
  rating?: number;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export const FALLBACK_EMERGENCY_CONTACTS: EmergencyOutsourceContact[] = [
  {
    id: 'emerg-001',
    name: 'บจก. สยามแอร์เซอร์วิส',
    category: 'air_conditioning',
    categories: ['air_conditioning', 'general_maintenance'],
    serviceType: 'ซ่อมและล้างแอร์ห้องพัก แอร์ไม่เย็น น้ำหยด แก้ไขด่วน',
    phonePrimary: '089-999-8888',
    phoneSecondary: '02-123-4567',
    lineId: '@siamair24',
    isEmergency: true,
    availableHours: '00:00 - 23:59',
    openTime: '00:00',
    closeTime: '23:59',
    priceRateNote: 'เริ่มต้น 500 บาท / เครื่อง',
    address: 'เขตพญาไท กรุงเทพฯ',
    notes: 'ช่างมีคีย์การ์ดสำรอง สามารถเข้าตรวจสอบหน้างานภายใน 45 นาที',
    isActive: true,
  },
  {
    id: 'emerg-002',
    name: 'ช่างประปาด่วน พญาไท',
    category: 'plumbing',
    categories: ['plumbing'],
    serviceType: 'ท่อแตก น้ำรั่วซึม ชักโครกตัน ปั๊มน้ำขัดข้อง',
    phonePrimary: '081-888-7766',
    phoneSecondary: '086-111-2233',
    lineId: '@pipephayathai',
    isEmergency: true,
    availableHours: '00:00 - 23:59',
    openTime: '00:00',
    closeTime: '23:59',
    priceRateNote: 'ประเมินราคาตามจุด เริ่มต้น 400 บาท',
    address: 'เขตพญาไท กรุงเทพฯ',
    notes: 'ช่างเข้าถึงโรงแรมภายใน 30 นาที พร้อมอุปกรณ์ครบครัน',
    isActive: true,
  },
  {
    id: 'emerg-003',
    name: 'ช่างไฟฟ้านครบาล',
    category: 'electrical',
    categories: ['electrical'],
    serviceType: 'ไฟฟ้าลัดวงจร ไฟดับเฉพาะจุด เบรกเกอร์ทริป เปลี่ยนตู้ไฟ',
    phonePrimary: '086-555-4321',
    phoneSecondary: '02-987-6543',
    lineId: '@bkk_electric',
    isEmergency: true,
    availableHours: '00:00 - 23:59',
    openTime: '00:00',
    closeTime: '23:59',
    priceRateNote: 'ค่าตรวจเช็คเบื้องต้น 300 บาท',
    address: 'เขตราชเทวี กรุงเทพฯ',
    notes: 'มีใบรับรองช่างไฟฟ้าชำนาญการ มีอะไหล่พร้อมเปลี่ยนทันที',
    isActive: true,
  },
  {
    id: 'emerg-004',
    name: 'ชัยวัฒน์ กุญแจด่วน',
    category: 'locksmith',
    categories: ['locksmith'],
    serviceType: 'สะเดาะกุญแจ ทำคีย์การ์ดสำรอง ปลดล็อคห้องพัก',
    phonePrimary: '085-111-9999',
    phoneSecondary: null,
    lineId: '@chai_key24',
    isEmergency: true,
    availableHours: '00:00 - 23:59',
    openTime: '00:00',
    closeTime: '23:59',
    priceRateNote: 'เริ่มต้น 400 บาท / ครั้ง',
    address: 'เขตดินแดง กรุงเทพฯ',
    notes: 'มีมอเตอร์ไซค์มาถึงใน 15 นาที',
    isActive: true,
  },
  {
    id: 'emerg-005',
    name: 'ช่างต้อย ท่อตันสุขภัณฑ์ด่วน',
    category: 'plumbing',
    categories: ['plumbing', 'general_maintenance'],
    serviceType: 'แก้ท่อตัน ส้วมตัน น้ำรั่วซึม ซ่อมก๊อกน้ำ',
    phonePrimary: '081-222-3333',
    phoneSecondary: null,
    lineId: '@toy_pipe_express',
    isEmergency: true,
    availableHours: '00:00 - 23:59',
    openTime: '00:00',
    closeTime: '23:59',
    priceRateNote: 'ค่าบริการตรวจเช็ค 300 บาท',
    address: 'เขตห้วยขวาง กรุงเทพฯ',
    notes: 'รับงานฉุกเฉินดึก พกอุปกรณ์พร้อม',
    isActive: true,
  },
  {
    id: 'emerg-006',
    name: 'กรีนโพรเทค กำจัดปลวกและแมลง',
    category: 'pest_control',
    categories: ['pest_control'],
    serviceType: 'กำจัดมด ปลวก แมลงสาบ ฉีดพ่นละอองยาฆ่าเชื้อ',
    phonePrimary: '083-444-1122',
    phoneSecondary: null,
    lineId: '@green_pest',
    isEmergency: false,
    availableHours: '08:30 - 18:00',
    openTime: '08:30',
    closeTime: '18:00',
    priceRateNote: 'เหมาห้องละ 350 บาท',
    address: 'เขตจตุจักร กรุงเทพฯ',
    notes: 'ใช้น้ำยาไร้กลิ่น แขกสามารถเข้าพักได้หลังพ่น 1 ชั่วโมง',
    isActive: true,
  },
  {
    id: 'emerg-007',
    name: 'โปรคูล แอนด์ เซอร์วิส',
    category: 'air_conditioning',
    categories: ['air_conditioning'],
    serviceType: 'ตรวจเช็คระบบน้ำยาแอร์ ซ่อมคอมเพรสเซอร์',
    phonePrimary: '087-654-3210',
    phoneSecondary: null,
    lineId: '@procool_hvac',
    isEmergency: false,
    availableHours: '08:00 - 17:30',
    openTime: '08:00',
    closeTime: '17:30',
    priceRateNote: 'ล้างใหญ่ 600 บาท / เครื่อง',
    address: 'เขตสาทร กรุงเทพฯ',
    notes: 'มีประกันงานซ่อม 90 วัน',
    isActive: true,
  },
  {
    id: 'emerg-008',
    name: 'ช่างสมบูรณ์ งานไม้และเฟอร์นิเจอร์',
    category: 'general_maintenance',
    categories: ['general_maintenance'],
    serviceType: 'ซ่อมประตู บานพับตู้ เตียงนอน พื้นไม้ลามิเนต',
    phonePrimary: '086-777-8899',
    phoneSecondary: null,
    lineId: '@somboon_wood',
    isEmergency: false,
    availableHours: '09:00 - 18:00',
    openTime: '09:00',
    closeTime: '18:00',
    priceRateNote: 'ตามประเมินหน้างาน',
    address: 'เขตบางรัก กรุงเทพฯ',
    notes: 'ฝีมือประณีต เชี่ยวชาญงานโรงแรม',
    isActive: true,
  },
  {
    id: 'emerg-009',
    name: 'สมเกียรติการช่าง ไฟฟ้าและประปา',
    category: 'electrical',
    categories: ['electrical', 'plumbing'],
    serviceType: 'ซ่อมระบบไฟ ประปา สุขาภิบาล ปั๊มน้ำ',
    phonePrimary: '086-444-5555',
    phoneSecondary: null,
    lineId: '@somkiat_electric',
    isEmergency: true,
    availableHours: '00:00 - 23:59',
    openTime: '00:00',
    closeTime: '23:59',
    priceRateNote: 'ตามประเมินหน้างาน',
    address: 'เขตปทุมวัน กรุงเทพฯ',
    notes: 'มีใบประกอบวิชาชีพช่างไฟฟ้า',
    isActive: true,
  },
  {
    id: 'emerg-010',
    name: 'โมเดิร์น ล็อค เซอร์วิส',
    category: 'locksmith',
    categories: ['locksmith', 'general_maintenance'],
    serviceType: 'ติดตั้งและซ่อม Digital Door Lock ทุกแบรนด์',
    phonePrimary: '089-123-4567',
    phoneSecondary: null,
    lineId: '@modern_lock',
    isEmergency: false,
    availableHours: '08:00 - 20:00',
    openTime: '08:00',
    closeTime: '20:00',
    priceRateNote: 'ค่าบริการเริ่มต้น 500 บาท',
    address: 'เขตวัฒนา กรุงเทพฯ',
    notes: 'สำรองอะไหล่แผงวงจรและกลอนครบ',
    isActive: true,
  },
  {
    id: 'emerg-011',
    name: 'คลีนเทค บริการทำความสะอาดและซักฟอกพิเศษ',
    category: 'general_maintenance',
    categories: ['general_maintenance'],
    serviceType: 'ซักผ้าม่าน ซักพรม ขัดพื้นหินอ่อน',
    phonePrimary: '082-999-0011',
    phoneSecondary: null,
    lineId: '@cleantech_pro',
    isEmergency: false,
    availableHours: '08:00 - 17:00',
    openTime: '08:00',
    closeTime: '17:00',
    priceRateNote: 'เริ่มต้น 1,200 บาท / ห้อง',
    address: 'เขตยานนาวา กรุงเทพฯ',
    notes: 'นัดหมายล่วงหน้าอย่างน้อย 1 วัน',
    isActive: true,
  },
];

export function useOutsourceContacts(categoryFilter?: string) {
  const [contacts, setContacts] = useState<EmergencyOutsourceContact[]>(FALLBACK_EMERGENCY_CONTACTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = categoryFilter && categoryFilter !== 'all'
        ? `/api/housekeeping/outsource-contacts?category=${encodeURIComponent(categoryFilter)}`
        : '/api/housekeeping/outsource-contacts';

      const res = await apiFetch<EmergencyOutsourceContact[]>(endpoint);

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setContacts(res.data);
        setIsOffline(false);
      } else {
        setIsOffline(res.isOffline);
        if (categoryFilter && categoryFilter !== 'all') {
          setContacts(FALLBACK_EMERGENCY_CONTACTS.filter((c) =>
            c.categories ? c.categories.includes(categoryFilter) : c.category === categoryFilter
          ));
        } else {
          setContacts(FALLBACK_EMERGENCY_CONTACTS);
        }
      }
    } catch {
      setIsOffline(true);
      if (categoryFilter && categoryFilter !== 'all') {
        setContacts(FALLBACK_EMERGENCY_CONTACTS.filter((c) =>
          c.categories ? c.categories.includes(categoryFilter) : c.category === categoryFilter
        ));
      } else {
        setContacts(FALLBACK_EMERGENCY_CONTACTS);
      }
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    isOffline,
    lastRefreshed,
    refresh: fetchContacts,
    refetch: fetchContacts,
  };
}

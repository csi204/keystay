import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface EmergencyOutsourceContact {
  id: string;
  name: string;
  category: 'air_conditioning' | 'plumbing' | 'electrical' | 'locksmith' | 'gardening' | 'general_maintenance' | 'pest_control' | string;
  serviceType: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  lineId?: string | null;
  isEmergency: boolean;
  availableHours: string;
  priceRateNote?: string | null;
  rating?: number;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export const FALLBACK_EMERGENCY_CONTACTS: EmergencyOutsourceContact[] = [
  {
    id: 'emerg-001',
    name: 'บจก. สยามแอร์เซอร์วิส 24 ชม.',
    category: 'air_conditioning',
    serviceType: 'ซ่อม/ล้างแอร์ห้องพัก แอร์ไม่เย็น น้ำหยด ฉุกเฉิน 24 ชม.',
    phonePrimary: '089-999-8888',
    phoneSecondary: '02-123-4567',
    lineId: '@siamair24',
    isEmergency: true,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'เริ่มต้น 500 บาท / ครั้ง',
    rating: 4.9,
    address: 'เขตพญาไท กรุงเทพฯ',
    notes: 'ช่างมีคีย์การ์ดสำรอง สามารถเข้าตรวจสอบหน้างานภายใน 30 นาที',
    isActive: true,
  },
  {
    id: 'emerg-002',
    name: 'ช่างประปาด่วน พญาไท 24 ชม.',
    category: 'plumbing',
    serviceType: 'ท่อแตก น้ำรั่วซึม ชักโครกตัน ปั๊มน้ำขัดข้อง',
    phonePrimary: '081-888-7766',
    phoneSecondary: '086-111-2233',
    lineId: '@pipephayathai',
    isEmergency: true,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'ประเมินราคาตามจุด เริ่มต้น 400 บาท',
    rating: 4.8,
    address: 'เขตพญาไท กรุงเทพฯ',
    notes: 'ช่างเข้าถึงโรงแรมภายใน 20-30 นาที พร้อมอุปกรณ์ครบครัน',
    isActive: true,
  },
  {
    id: 'emerg-003',
    name: 'ช่างไฟฟ้านครบาล 24 ชม.',
    category: 'electrical',
    serviceType: 'ไฟฟ้าลัดวงจร ไฟดับเฉพาะจุด เบรกเกอร์ทริป เปลี่ยนตู้ไฟ',
    phonePrimary: '086-555-4321',
    phoneSecondary: '02-987-6543',
    lineId: '@bkk_electric',
    isEmergency: true,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'ค่าตรวจเช็คเบื้องต้น 300 บาท',
    rating: 5.0,
    address: 'เขตราชเทวี กรุงเทพฯ',
    notes: 'มีใบรับรองช่างไฟฟ้าชำนาญการ มีอะไหล่พร้อมเปลี่ยนทันที',
    isActive: true,
  },
  {
    id: 'emerg-004',
    name: 'ช่างกุญแจ สะเดาะกลอนดิจิทัล 24 ชม.',
    category: 'locksmith',
    serviceType: 'เปิดประตูดิจิทัล กุญแจติด ประตูห้องพักล็อค ดอกหักคา',
    phonePrimary: '082-333-9876',
    phoneSecondary: null,
    lineId: '@smartlock_fix',
    isEmergency: true,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'เริ่มต้น 500 - 800 บาท',
    rating: 4.9,
    address: 'เขตดินแดง กรุงเทพฯ',
    notes: 'เชี่ยวชาญระบบ Digital Door Lock และลูกบิดโรงแรมทุกรุ่น ไม่ทำให้ประตูเสียหาย',
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
        ? `/api/housekeeping/outsource-contacts?is_emergency=1&category=${encodeURIComponent(categoryFilter)}`
        : `/api/housekeeping/outsource-contacts?is_emergency=1`;

      const res = await apiFetch<EmergencyOutsourceContact[]>(endpoint);

      if (res.isOffline || res.error) {
        setIsOffline(true);
        const filteredFallback = categoryFilter && categoryFilter !== 'all'
          ? FALLBACK_EMERGENCY_CONTACTS.filter(c => c.category === categoryFilter)
          : FALLBACK_EMERGENCY_CONTACTS;
        setContacts(filteredFallback);
        if (res.error) {
          setError(res.error);
        }
      } else if (res.data && Array.isArray(res.data)) {
        setIsOffline(false);
        const data = res.data.length > 0 ? res.data : FALLBACK_EMERGENCY_CONTACTS;
        setContacts(data);
      } else {
        setContacts(FALLBACK_EMERGENCY_CONTACTS);
      }
    } catch (err: any) {
      setIsOffline(true);
      setError(err?.message || 'Error fetching outsource contacts');
      setContacts(FALLBACK_EMERGENCY_CONTACTS);
    } finally {
      setLastRefreshed(new Date());
      setLoading(false);
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
  };
}

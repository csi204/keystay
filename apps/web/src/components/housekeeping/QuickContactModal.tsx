import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Copy,
  Check,
  Search,
  AlertCircle,
  Wrench,
  X,
  Clock,
  Star,
  MessageCircle,
  ShieldAlert,
  Zap,
  Wind,
  Droplets,
  Key,
  ClipboardList,
} from 'lucide-react';

export interface OutsourceContactDTO {
  id: string;
  name: string;
  category: string;
  serviceType: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  lineId?: string | null;
  isEmergency: number;
  availableHours?: string | null;
  priceRateNote?: string | null;
  rating?: number | null;
  address?: string | null;
  notes?: string | null;
  isActive: number;
}

// 6 Core Categories optimized for Small & Boutique Hotels (Pure Lucide Icons, No Emojis)
export const PRIMARY_CATEGORIES: Record<
  string,
  { label: string; iconComponent: React.ElementType; color: string }
> = {
  all: { label: 'ทั้งหมด', iconComponent: ClipboardList, color: 'bg-slate-100 text-slate-700' },
  air_conditioning: { label: 'แอร์ / ความเย็น', iconComponent: Wind, color: 'bg-sky-50 text-sky-700 border-sky-200' },
  plumbing: { label: 'ประปา / ท่อตัน', iconComponent: Droplets, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  electrical: { label: 'ระบบไฟฟ้า', iconComponent: Zap, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  locksmith: { label: 'กุญแจ / คีย์การ์ด', iconComponent: Key, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  general_maintenance: { label: 'ซ่อมบำรุงทั่วไป', iconComponent: Wrench, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

// Fallback seed data in case backend API is not connected locally
const MOCK_OUTSOURCE_SEED: OutsourceContactDTO[] = [
  {
    id: 'out-001',
    name: 'บจก. สยามแอร์เซอร์วิส',
    category: 'air_conditioning',
    serviceType: 'ซ่อม/ล้างแอร์ห้องพัก 24 ชม.',
    phonePrimary: '089-999-8888',
    phoneSecondary: '02-123-4567',
    lineId: '@siamair24',
    isEmergency: 1,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'เริ่มต้น 500 บาท/เครื่อง',
    rating: 4.9,
    address: '123/45 ถ.สุขุมวิท กทม.',
    notes: 'ติดต่อคุณสมศักดิ์ มาถึงภายใน 45 นาที',
    isActive: 1,
  },
  {
    id: 'out-002',
    name: 'ช่างต้อย ท่อตันสุขภัณฑ์ด่วน',
    category: 'plumbing',
    serviceType: 'แก้ท่อตัน ส้วมตัน น้ำรั่วซึม',
    phonePrimary: '081-222-3333',
    phoneSecondary: null,
    lineId: 'toy_pipe_express',
    isEmergency: 1,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'ค่าบริการตรวจเช็ค 300 บาท',
    rating: 4.8,
    address: '88 ถ.พหลโยธิน กทม.',
    notes: 'รับงานฉุกเฉินดึก พกอุปกรณ์พร้อม',
    isActive: 1,
  },
  {
    id: 'out-003',
    name: 'สมเกียรติ การไฟฟ้า & ช่างซ่อม',
    category: 'electrical',
    serviceType: 'ไฟฟ้าลัดวงจร ซ่อมตู้ควบคุม เบรกเกอร์ทริป',
    phonePrimary: '086-444-5555',
    phoneSecondary: '086-444-5556',
    lineId: '@somkiat_electric',
    isEmergency: 1,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'ตามประเมินหน้างาน',
    rating: 5.0,
    address: '55 ซอยอารีย์ กทม.',
    notes: 'มีใบประกอบวิชาชีพช่างไฟฟ้า',
    isActive: 1,
  },
  {
    id: 'out-005',
    name: 'ชัยวัฒน์ กุญแจด่วน 24 ชม.',
    category: 'locksmith',
    serviceType: 'สะเดาะกุญแจ ทำคีย์การ์ดสำรอง ปลดล็อคห้อง',
    phonePrimary: '085-111-9999',
    phoneSecondary: null,
    lineId: 'chai_key24',
    isEmergency: 1,
    availableHours: '24 ชั่วโมง',
    priceRateNote: 'เริ่มต้น 400 บาท/ครั้ง',
    rating: 4.9,
    address: 'ปากซอยโรงแรม',
    notes: 'มีมอเตอร์ไซค์มาถึงใน 15 นาที',
    isActive: 1,
  },
  {
    id: 'out-004',
    name: 'ลุงชาญ คนสวน & ดูแลภูมิทัศน์',
    category: 'general_maintenance',
    serviceType: 'ตัดแต่งต้นไม้ ปลูกหญ้า ซ่อมแซมทั่วไปรอบอาคาร',
    phonePrimary: '087-777-8888',
    phoneSecondary: null,
    lineId: null,
    isEmergency: 0,
    availableHours: '08:00 - 17:00',
    priceRateNote: 'รายวัน 600 บาท/วัน',
    rating: 4.7,
    address: 'ชุมชนข้างโรงแรม',
    notes: 'เข้างานทุกวันอังคารและศุกร์',
    isActive: 1,
  },
];

interface QuickContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickContactModal: React.FC<QuickContactModalProps> = ({ isOpen, onClose }) => {
  const [contacts, setContacts] = useState<OutsourceContactDTO[]>(MOCK_OUTSOURCE_SEED);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyEmergency, setOnlyEmergency] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchContacts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('keystay_token') || sessionStorage.getItem('keystay_token');
        const res = await fetch('/api/housekeeping/outsource-contacts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setContacts(json.data);
          }
        }
      } catch (err) {
        console.warn('Using local mock outsource contacts (offline or dev fallback)');
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const emergencyContacts = contacts.filter((c) => c.isEmergency === 1 && c.isActive === 1);

  const filteredContacts = contacts.filter((c) => {
    if (!c.isActive) return false;
    if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
    if (onlyEmergency && c.isEmergency !== 1) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchService = c.serviceType.toLowerCase().includes(q);
      const matchPhone = c.phonePrimary.includes(q);
      if (!matchName && !matchService && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom duration-200">
        
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center font-bold shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 font-sans">
                  สมุดติดต่อช่างด่วน 24 ชม.
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200">
                  ฉุกเฉิน
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                โทรติดต่อช่างแอร์ ประปา ไฟฟ้า กุญแจ สำหรับโรงแรมขนาดเล็ก
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="p-3 border-b border-slate-100 bg-white space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อช่าง, ท่อตัน, ล้างแอร์, ไฟดับ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {Object.entries(PRIMARY_CATEGORIES).map(([catKey, { label, iconComponent: Icon }]) => (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-all border cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === catKey
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 divide-y divide-slate-100">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">ไม่พบรายชื่อช่างในหมวดหมู่นี้</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="pt-2.5 first:pt-0 pb-2.5 flex flex-col gap-2 bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans">
                        {contact.name}
                      </span>
                      
                      {contact.rating && (
                        <span className="text-[11px] text-amber-600 font-mono flex items-center gap-0.5 font-bold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {contact.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{contact.serviceType}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {contact.availableHours || 'ตามเวลานัดหมาย'}
                      </span>
                      {contact.priceRateNote && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {contact.priceRateNote}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(contact.id, contact.phonePrimary)}
                    title="คัดลอกเบอร์โทร"
                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedId === contact.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Mobile Call Buttons Full Row */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a
                    href={`tel:${contact.phonePrimary.replace(/[^0-9]/g, '')}`}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span>โทร {contact.phonePrimary}</span>
                  </a>

                  {contact.lineId ? (
                    <a
                      href={`https://line.me/ti/p/~${contact.lineId.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.99] text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ส่งรูปไลน์: {contact.lineId}</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => handleCopy(contact.id, contact.phonePrimary)}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>{copiedId === contact.id ? 'คัดลอกแล้ว!' : 'คัดลอกเบอร์'}</span>
                    </button>
                  )}
                </div>

                {contact.notes && (
                  <p className="text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50 mt-1 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{contact.notes}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>สิทธิ์เพิ่ม/ลบเบอร์ช่างเป็นของ Owner & Front Desk</span>
          <span className="font-mono font-bold text-slate-600">{filteredContacts.length} รายชื่อ</span>
        </div>
      </div>
    </div>
  );
};

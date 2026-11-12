import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { QuickContactModal } from '../../components/housekeeping/QuickContactModal';
import { clearAuthSession, getAuthToken, getAuthUser, apiUrl } from '../../lib/api';
import {
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  Wrench,
  Camera,
  ChevronRight,
  LogOut,
  User,
  Search,
  Building,
  Bed,
  Check,
  Play,
  Calendar,
  Layers,
  Flame,
  CheckCircle,
  X,
  Phone,
  CloudUpload,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  SlidersHorizontal,
  ClipboardList,
  ArrowLeft,
  Coffee,
  Maximize2,
  BookOpen,
  Bell,
  Moon,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  ArrowLeftRight,
  Eye,
  HelpCircle,
  Briefcase,
  Zap,
  DoorOpen,
  Pin,
} from 'lucide-react';

// Room & Task Interfaces
export interface ChecklistSubItem {
  id: string;
  label: string;
  sublabel: string;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  iconType: 'bed' | 'bath' | 'minibar' | 'final';
  items: ChecklistSubItem[];
}

export const HOTEL_CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    id: 'bedroom',
    title: '1. โซนเตียงนอน & ห้องพัก',
    iconType: 'bed',
    items: [
      {
        id: 'linen',
        label: 'เปลี่ยนผ้าปูที่นอน ปลอกหมอน และปลอกผ้านวมชุดใหม่',
        sublabel: 'ใช้ผ้าซักฆ่าเชื้อ สะอาด ไร้รอยเปื้อน และกลิ่นอับ',
      },
      {
        id: 'bedTuck',
        label: 'ดึงผ้าปูตึง ตบหมอนฟู จัดมุมเตียง 45 องศาสวยงาม',
        sublabel: 'มาตรฐานความตึงระดับโรงแรม เรียบกริบไร้รอยย่น',
      },
      {
        id: 'dusting',
        label: 'เช็ดฝุ่นโต๊ะข้างเตียง โต๊ะทำงาน หัวเตียง และโคมไฟ',
        sublabel: 'ใช้ผ้าไมโครไฟเบอร์ชุบน้ำยาเฉพาะ ไม่ทิ้งคราบ',
      },
      {
        id: 'floorClean',
        label: 'ดูดฝุ่น กวาด และถูพื้นห้องนอนรวมถึงใต้เตียง',
        sublabel: 'ตรวจเช็คไม่มีเศษเส้นผมหรือสิ่งสกปรกตกค้าง',
      },
    ],
  },
  {
    id: 'bathroom',
    title: '2. โซนห้องน้ำ & สุขภัณฑ์',
    iconType: 'bath',
    items: [
      {
        id: 'toiletSanitize',
        label: 'ขัดล้างและฆ่าเชื้อโถสุขภัณฑ์ อ่างล้างหน้า และฝักบัว',
        sublabel: 'ใช้น้ำยาฆ่าเชื้อแบคทีเรียและเช็ดแห้งสนิท',
      },
      {
        id: 'glassMirror',
        label: 'เช็ดกระจกเงาและกระจกกั้นโซนเปียกใสไร้คราบน้ำ',
        sublabel: 'ไร้คราบสบู่ ละอองน้ำ และรอยนิ้วมือ',
      },
      {
        id: 'towelsReplace',
        label: 'จัดชุดผ้าเช็ดตัว ผ้าเช็ดหน้า และพรมเท้าเซ็ตใหม่',
        sublabel: 'พับวางเรียงตามตำแหน่งมาตรฐานโรงแรมครบชุด',
      },
      {
        id: 'amenitiesRefill',
        label: 'เติมสบู่ แชมพู ครีมนวด แปรงสีฟัน และหมวกคลุมผม',
        sublabel: 'เช็คซีลและแพ็กเกจจิ้งสมบูรณ์ วางบนถาดอะเมนิตี้',
      },
    ],
  },
  {
    id: 'minibar',
    title: '3. มินิบาร์ & สิ่งอำนวยความสะดวก',
    iconType: 'minibar',
    items: [
      {
        id: 'minibarRefill',
        label: 'ตรวจเช็คและเติมมินิบาร์ครบเซ็ตแล้ว (พร้อมปล่อยห้อง)',
        sublabel: 'เครื่องดื่ม ขนมขบเคี้ยวในตู้เย็น และเบียร์ครบจำนวนตามมาตรฐาน',
      },
      {
        id: 'waterKettle',
        label: 'ล้างแก้วน้ำ กาน้ำร้อน และเติมน้ำดื่ม Keystay 2 ขวด',
        sublabel: 'แก้วคว่ำบนถาดรองสะอาดพร้อมฝาครอบแก้ว',
      },
    ],
  },
  {
    id: 'final_inspection',
    title: '4. ตรวจความเรียบร้อยรอบสุดท้าย',
    iconType: 'final',
    items: [
      {
        id: 'trashEmptied',
        label: 'เทถังขยะและใส่ถุงขยะใหม่ทุกจุด (ห้องนอน & ห้องน้ำ)',
        sublabel: 'เช็ดถังขยะให้สะอาดและแห้งสนิททั้งภายนอกและภายใน',
      },
      {
        id: 'acRemoteSpray',
        label: 'ทดสอบแอร์ ทีวี ปิดผ้าม่าน และฉีดสเปรย์ปรับอากาศ',
        sublabel: 'กลิ่นหอมสะอาดสดชื่น บรรยากาศพร้อมต้อนรับแขกใหม่',
      },
    ],
  },
];

export const ALL_CHECKLIST_ITEM_IDS = HOTEL_CHECKLIST_GROUPS.flatMap((g) =>
  g.items.map((i) => i.id)
);

// Room & Task Interfaces
interface CleaningTaskItem {
  id: string;
  roomNumber: string;
  floor: number;
  roomType: string;
  taskType: 'checkout_clean' | 'stayover_clean' | 'inspect' | 'daily_clean' | 'deep_clean' | 'inspection';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string;
  estMinutes: number;
  guestName?: string;
  notes?: string;
  checklist: Record<string, boolean>;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
}

interface RoomStatusItem {
  roomNumber: string;
  floor: number;
  type: string;
  status: 'available' | 'cleaning' | 'maintenance' | 'occupied' | 'reserved' | 'checked_out' | 'out_of_order';
  guestInfo?: string;
  notes?: string;
  outsourceNeeded?: string;
}

interface CompletedRoomItem {
  id?: string;
  roomNumber: string;
  finishedAt: string;
  inspector: string;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
}

// ========================================================
// Real-time Date & Calendar Helpers
// ========================================================
export const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export const ENG_MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const THAI_DAYS_FULL = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const isBeforeToday = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const isAfterToday = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
};

export const formatThaiDateShort = (date: Date): string => {
  const day = date.getDate();
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  const beYear = (date.getFullYear() + 543) % 100;
  return `${day} ${month} ${beYear}`;
};

export const formatThaiMonthHeader = (date: Date): string => {
  const monthName = THAI_MONTHS_FULL[date.getMonth()];
  const beYear = date.getFullYear() + 543;
  return `${monthName} ${beYear}`;
};

export const formatThaiFullDate = (date: Date): string => {
  const dayName = THAI_DAYS_FULL[date.getDay()];
  const day = date.getDate();
  const monthName = THAI_MONTHS_FULL[date.getMonth()];
  const beYear = date.getFullYear() + 543;
  return `${dayName}ที่ ${day} ${monthName} ${beYear}`;
};

export const getWeekDays = (refDate: Date): Date[] => {
  const curr = new Date(refDate);
  const day = curr.getDay(); // 0 is Sun, 1 is Mon
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(curr);
  monday.setDate(curr.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

export const getMonthDaysGrid = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const grid: { date: Date; isCurrentMonth: boolean }[] = [];

  // Preceding month padding days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    grid.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Trailing next month padding days
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    grid.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false,
    });
  }

  return grid;
};

export const STANDARD_MINIBAR_CATALOG = [
  { id: 'mb-001', name: 'น้ำดื่ม 600ml', price: 20, unit: 'ขวด' },
  { id: 'mb-002', name: 'โค้ก 330ml', price: 35, unit: 'กระป๋อง' },
  { id: 'mb-003', name: 'เบียร์ Chang 330ml', price: 80, unit: 'กระป๋อง' },
  { id: 'mb-004', name: 'มันฝรั่งทอด', price: 45, unit: 'ถุง' },
  { id: 'mb-005', name: 'ช็อกโกแลต KitKat', price: 35, unit: 'แท่ง' },
];

export const HousekeepingPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const staffName = authUser ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() : 'Somchai Clean';
  const staffInitials = authUser?.firstName ? authUser.firstName.slice(0, 2).toUpperCase() : 'SC';

  // Navigation State
  const [activeTab, setActiveTab] = useState<'tasks' | 'kanban' | 'status' | 'schedule' | 'profile'>('tasks');

  // Filter States
  const [taskFilter, setTaskFilter] = useState<'all' | 'checkout' | 'incoming' | 'stayover' | 'urgent' | 'floor1' | 'floor2_3'>('all');
  const [floorFilter, setFloorFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Tasks & Cleaning Checklist State (เริ่มจาก State ว่างเพื่อรอรับข้อมูลสดจาก Database)
  const [tasks, setTasks] = useState<CleaningTaskItem[]>([]);
  const [completedRooms, setCompletedRooms] = useState<CompletedRoomItem[]>([]);
  const [roomStatusList, setRoomStatusList] = useState<RoomStatusItem[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(30 * 60); // เริ่มที่ 30:00 (1800s) และนับถอยหลัง
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState<boolean>(false); // โหมดโฟกัสทำความสะอาด (Focus Mode)

  // Modals & Drawers
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [isSOPModalOpen, setIsSOPModalOpen] = useState<boolean>(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState<boolean>(false);
  const [handoverNote, setHandoverNote] = useState<string>('');

  // Before & After Photo Evidence Modals
  const [isBeforePhotoModalOpen, setIsBeforePhotoModalOpen] = useState<boolean>(false);
  const [isAfterPhotoModalOpen, setIsAfterPhotoModalOpen] = useState<boolean>(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [targetPhotoTask, setTargetPhotoTask] = useState<CleaningTaskItem | null>(null);
  const [selectedEvidenceRoom, setSelectedEvidenceRoom] = useState<CompletedRoomItem | null>(null);
  const [capturedBeforePhoto, setCapturedBeforePhoto] = useState<string | null>(null);
  const [capturedAfterPhoto, setCapturedAfterPhoto] = useState<string | null>(null);

  // Quick Minibar Check State (30-sec checkout express for Front Desk Billing)
  const [isQuickMinibarModalOpen, setIsQuickMinibarModalOpen] = useState<boolean>(false);
  const [quickMinibarRoom, setQuickMinibarRoom] = useState<string>('203');
  const [quickMinibarTaskId, setQuickMinibarTaskId] = useState<string | null>(null);
  const [quickMinibarCounts, setQuickMinibarCounts] = useState<Record<string, number>>({
    'mb-001': 0,
    'mb-002': 0,
    'mb-003': 0,
    'mb-004': 0,
    'mb-005': 0,
  });
  const [minibarCheckedStatus, setMinibarCheckedStatus] = useState<Record<string, { time: string; total: number; summary: string }>>({});

  const [maintenanceRoom, setMaintenanceRoom] = useState<string>('105');
  const [maintenanceCategory, setMaintenanceCategory] = useState<'broken' | 'electric' | 'missing' | 'sanitary' | 'lost_and_found'>('broken');
  const [maintenanceDesc, setMaintenanceDesc] = useState<string>('');
  const [lostAndFoundLocation, setLostAndFoundLocation] = useState<string>('Front Desk Counter');
  const [lostAndFoundDays, setLostAndFoundDays] = useState<number>(7);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<RoomStatusItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, setIsLoadingData] = useState<boolean>(false);


  // Preferences & Toggles
  const [isSoundAlertEnabled, setIsSoundAlertEnabled] = useState<boolean>(true);
  const [isEyeCareMode, setIsEyeCareMode] = useState<boolean>(false);

  // Real-time Dynamic Calendar & Shift Schedule State
  const [, setCurrentRealTime] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [weekRefDate, setWeekRefDate] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerViewMonth, setPickerViewMonth] = useState<number>(() => new Date().getMonth());
  const [pickerViewYear, setPickerViewYear] = useState<number>(() => new Date().getFullYear());

  const [selectedShiftPill, setSelectedShiftPill] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [isShiftSwapModalOpen, setIsShiftSwapModalOpen] = useState<boolean>(false);
  const [shiftSwapReason, setShiftSwapReason] = useState<'swap' | 'leave_urgent' | 'cover'>('swap');
  const [shiftSwapTargetStaff, setShiftSwapTargetStaff] = useState<string>('มาลี เรืองโรจน์');
  const [shiftSwapNotes, setShiftSwapNotes] = useState<string>('');

  // 1. Fetch live tasks from /api/housekeeping/tasks
  const fetchLiveTasks = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl('/api/housekeeping/tasks'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        console.warn('Session expired or invalid token (401). Redirecting to login...');
        clearAuthSession();
        navigate('/login', { replace: true });
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Completed tasks from DB
          const completedFromDb: CompletedRoomItem[] = json.data
            .filter((t: any) => t.status === 'completed')
            .map((t: any) => {
              const num = t.roomNumber || t.roomId?.replace('rm-', '') || '101';
              const timeStr = t.completedAt
                ? new Date(t.completedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                : 'เสร็จสมบูรณ์';
              return {
                id: t.id,
                roomNumber: num,
                finishedAt: timeStr,
                inspector: t.assignedStaff?.name || staffName,
                beforePhotoUrl: t.beforePhotoUrl || null,
                afterPhotoUrl: t.afterPhotoUrl || null,
              };
            });
          setCompletedRooms(completedFromDb);

          // Active and Pending tasks from DB
          const activeAndPending: CleaningTaskItem[] = json.data
            .filter((t: any) => t.status !== 'completed')
            .map((t: any) => {
              let savedChecklist: Record<string, boolean> = {};
              // โหลดสถานะ checklist จาก localStorage เฉพาะงานที่กำลังทำอยู่จริง และมีค่าบันทึกไว้
              if (t.status === 'in_progress') {
                try {
                  const raw = localStorage.getItem(`keystay_checklist_${t.id}`);
                  if (raw) savedChecklist = JSON.parse(raw);
                } catch {}
              }
              const num = t.roomNumber || t.roomId?.replace('rm-', '') || '101';
              return {
                id: t.id,
                roomNumber: num,
                floor: Math.floor(parseInt(num, 10) / 100) || 1,
                roomType: num.startsWith('2') || num.startsWith('3') ? 'ห้องดีลักซ์' : 'สแตนดาร์ด เตียงคู่',
                taskType: (t.taskType === 'checkout_clean' || t.taskType === 'stayover_clean' || t.taskType === 'inspect' || t.taskType === 'daily_clean' || t.taskType === 'deep_clean')
                  ? t.taskType
                  : 'checkout_clean',
                priority: (t.priority === 'urgent' || t.priority === 'high' || t.priority === 'normal' || t.priority === 'low')
                  ? t.priority
                  : 'normal',
                status: t.status === 'in_progress' ? 'in_progress' : 'pending',
                assignedTo: t.assignedStaff?.name || staffName,
                estMinutes: t.taskType === 'checkout_clean' ? 35 : t.taskType === 'deep_clean' ? 120 : 20,
                notes: t.notes || '',
                checklist: savedChecklist,
                beforePhotoUrl: t.beforePhotoUrl || null,
                afterPhotoUrl: t.afterPhotoUrl || null,
              };
            });
          setTasks(activeAndPending);
        }
      }
    } catch (err) {
      console.warn('Fallback to local tasks state:', err);
    }
  };

  // 2. Fetch live rooms from /api/rooms
  const fetchLiveRooms = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl('/api/rooms'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        console.warn('Session expired or invalid token (401). Redirecting to login...');
        clearAuthSession();
        navigate('/login', { replace: true });
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mappedRooms: RoomStatusItem[] = json.data.map((r: any) => {
            const num = r.roomNumber || r.id.replace('rm-', '');
            const fl = parseInt(r.floorId?.replace('fl-', '') || String(Math.floor(parseInt(num, 10) / 100)) || '1', 10);
            return {
              roomNumber: num,
              floor: fl,
              type: r.roomTypeId === 'rt-dlx' ? 'ห้องดีลักซ์' : r.roomTypeId === 'rt-ste' ? 'ห้องเอ็กเซ็กคิวทีฟ สวีท' : 'ห้องสแตนดาร์ด',
              status: r.status,
              notes: r.notes || '',
              guestInfo:
                r.status === 'occupied'
                  ? 'แขกกำลังเข้าพัก'
                  : r.status === 'cleaning'
                  ? 'กำลังทำความสะอาด'
                  : r.status === 'checked_out'
                  ? 'เช็คเอาท์แล้ว (รอทำความสะอาด)'
                  : r.status === 'available'
                  ? 'ห้องว่างพร้อมเปิดขาย'
                  : 'รอตรวจสอบ',
            };
          });
          setRoomStatusList(mappedRooms);
        }
      }
    } catch (err) {
      console.warn('Fallback to local rooms state:', err);
    }
  };

  // ตรวจสอบสิทธิ์และดึงข้อมูลสดจากฐานข้อมูลเมื่อเข้าสู่หน้าเว็บ (Initial Load)
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    setIsLoadingData(true);
    Promise.all([fetchLiveTasks(), fetchLiveRooms()]).finally(() => setIsLoadingData(false));
  }, [navigate]);

  // Real-time clock tick (every 10s to keep date & minutes current)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRealTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer tick (เริ่มที่ 30:00 และนับถอยหลัง)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const isNegative = totalSec < 0;
    const absSec = Math.abs(totalSec);
    const mins = Math.floor(absSec / 60);
    const secs = absSec % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Checklist handler พร้อมบันทึกสถานะการตรวจเช็ครายห้อง
  const handleToggleChecklist = (taskId: string, itemKey: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = {
          ...t.checklist,
          [itemKey]: !t.checklist[itemKey],
        };
        try {
          localStorage.setItem(`keystay_checklist_${taskId}`, JSON.stringify(updated));
        } catch {}
        return {
          ...t,
          checklist: updated,
        };
      })
    );
  };

  // Helper: ติ๊กครบ 12 ข้อทันที (สำหรับ Supervisor / ตรวจผ่านรวดเร็ว)
  const handleToggleAllChecklist = (taskId: string, forceDone: boolean) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newChecklist = { ...t.checklist };
        ALL_CHECKLIST_ITEM_IDS.forEach((id) => {
          newChecklist[id] = forceDone;
        });
        try {
          localStorage.setItem(`keystay_checklist_${taskId}`, JSON.stringify(newChecklist));
        } catch {}
        return { ...t, checklist: newChecklist };
      })
    );
    showToast(forceDone ? 'ตรวจรับครบทุกข้อเรียบร้อย (12/12)' : 'รีเซ็ตรายการตรวจสอบ');
  };

  // 2. Mandatory After Photo Flow: ตรวจสอบก่อนส่งมอบงานตรวจรับ
  const handleInitiateCompleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setTargetPhotoTask(task);
    setCapturedAfterPhoto(task.afterPhotoUrl || null);
    setIsAfterPhotoModalOpen(true);
  };

  // Complete Active Task: บันทึกงานเสร็จสมบูรณ์ ปลดปล่อยห้องเป็น available พร้อมบันทึกเข้า DB จริง
  const handleCompleteActiveTask = async (taskId: string) => {
    handleInitiateCompleteTask(taskId);
  };

  // ดำเนินการส่งมอบงานหลังจากบันทึกภาพถ่ายสภาพห้องหลังทำความสะอาดเสร็จสมบูรณ์
  const handleConfirmCompleteWithAfterPhoto = async () => {
    if (!targetPhotoTask) return;
    const taskId = targetPhotoTask.id;
    const task = targetPhotoTask;
    const afterPhoto = capturedAfterPhoto;

    // ล้างแคช checklist ของงานนี้ออกจาก localStorage ทันทีที่จบงาน
    try {
      localStorage.removeItem(`keystay_checklist_${taskId}`);
    } catch {}

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;
    const token = getAuthToken();

    // 1. นำออกจาก tasks ที่กำลังทำ
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    // 2. เพิ่มลงใน completedRooms
    setCompletedRooms((prev) => [
      {
        id: task.id,
        roomNumber: task.roomNumber,
        finishedAt: `เสร็จล่าสุด ${timeStr}`,
        inspector: `${staffName} (${authUser?.id || 'hk-staff-001'})`,
        beforePhotoUrl: task.beforePhotoUrl || null,
        afterPhotoUrl: afterPhoto || null,
      },
      ...prev,
    ]);

    // 3. อัปเดตสถานะห้องใน Room Matrix เป็น "พร้อมขาย" (available)
    setRoomStatusList((prev) =>
      prev.map((r) =>
        r.roomNumber === task.roomNumber
          ? {
              ...r,
              status: 'available',
              guestInfo: 'ห้องว่างพร้อมเปิดขาย',
              notes: `ทำความสะอาดและตรวจรับเรียบร้อยเมื่อ ${timeStr}`,
            }
          : r
      )
    );

    setIsAfterPhotoModalOpen(false);
    setTargetPhotoTask(null);
    setCapturedAfterPhoto(null);
    setIsTimerRunning(false);
    setIsFocusModeOpen(false);
    showToast(`✨ บันทึกภาพหลังทำห้อง ${task.roomNumber} เรียบร้อย! ปล่อยห้องพร้อมขายทันที`);

    // เชื่อมต่อ Backend API สด (Service #4: complete task with afterPhotoUrl & Service #2: room status available)
    try {
      await fetch(apiUrl(`/api/housekeeping/tasks/${taskId}/complete`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          inspectionStatus: 'passed',
          afterPhotoUrl: afterPhoto,
          notes: 'ทำความสะอาดครบ 12 ข้อตามมาตรฐาน บันทึกภาพถ่ายยืนยันความสะอาดเรียบร้อยแล้วพร้อมปล่อยขาย',
        }),
      });

      const roomId = `rm-${task.roomNumber}`;
      await fetch(apiUrl(`/api/rooms/${roomId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: 'available',
          changeReason: 'Housekeeping cleaning inspection completed with photo evidence',
        }),
      });

      // ดึง tasks และสถานะห้องสดใหม่จาก backend ให้ sync 100%
      await Promise.all([fetchLiveTasks(), fetchLiveRooms()]);
    } catch (err) {
      console.warn('API sync warning:', err);
    }
  };

  // 1. Mandatory Before Photo Flow: ตรวจสอบก่อนเริ่มงาน
  const handleInitiateStartTask = (taskId: string) => {
    const currentActive = tasks.find((t) => t.status === 'in_progress');
    if (currentActive && currentActive.id !== taskId) {
      showToast(`กรุณาตรวจรับงานห้อง ${currentActive.roomNumber} ให้เสร็จสิ้นก่อนเริ่มทำความสะอาดห้องใหม่`);
      return;
    }

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    setTargetPhotoTask(targetTask);
    setCapturedBeforePhoto(targetTask.beforePhotoUrl || null);
    setIsBeforePhotoModalOpen(true);
  };

  // ดำเนินการเริ่มงานหลังจากบันทึกภาพถ่ายสภาพห้องก่อนทำความสะอาดเรียบร้อยแล้ว
  const handleConfirmStartWithBeforePhoto = async () => {
    if (!targetPhotoTask) return;
    const taskId = targetPhotoTask.id;
    const targetTask = targetPhotoTask;
    const beforePhoto = capturedBeforePhoto;

    // เคลียร์ checklist ให้เริ่มจาก 0/12 ว่างเปล่าเสมอเมื่องานเริ่มทำใหม่ ไม่ใช้ค่าเก่า
    try {
      localStorage.removeItem(`keystay_checklist_${taskId}`);
    } catch {}

    // Reset งานอื่นที่อาจค้าง in_progress อยู่ ให้กลับเป็น pending และตั้ง checklist เป็น {}
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) return { ...t, status: 'in_progress', checklist: {}, beforePhotoUrl: beforePhoto };
        if (t.status === 'in_progress') return { ...t, status: 'pending' };
        return t;
      })
    );

    // อัปเดตสถานะห้องใน Room Matrix ให้เป็น cleaning
    setRoomStatusList((prev) =>
      prev.map((r) =>
        r.roomNumber === targetTask.roomNumber
          ? { ...r, status: 'cleaning', notes: `กำลังทำความสะอาด (${staffName})` }
          : r
      )
    );

    setIsBeforePhotoModalOpen(false);
    setTargetPhotoTask(null);
    setCapturedBeforePhoto(null);
    setTimerSeconds(30 * 60);
    setIsTimerRunning(true);
    setIsFocusModeOpen(true);
    showToast(`📸 บันทึกภาพก่อนทำห้อง ${targetTask.roomNumber} เรียบร้อย เข้าสู่โหมดเช็คลิสต์`);

    // เชื่อมต่อ Backend API สด (Service #4: update task with beforePhotoUrl & Service #2: room status cleaning)
    const token = getAuthToken();
    try {
      await fetch(apiUrl(`/api/housekeeping/tasks/${taskId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          beforePhotoUrl: beforePhoto,
        }),
      });

      const roomId = `rm-${targetTask.roomNumber}`;
      await fetch(apiUrl(`/api/rooms/${roomId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: 'cleaning',
          changeReason: 'Housekeeping cleaning in progress with before photo evidence',
        }),
      });
    } catch (err) {
      console.warn('API sync warning:', err);
    }
  };

  // Start Queue Task: สลับงานห้องที่เลือกเป็น in_progress และบันทึกเข้า DB จริง
  const handleStartTask = async (taskId: string) => {
    handleInitiateStartTask(taskId);
  };


  // Submit Maintenance or Lost & Found Issue to /api/housekeeping/issues
  const handleSubmitMaintenance = async () => {
    const token = getAuthToken();
    const roomId = `rm-${maintenanceRoom}`;

    let apiIssueType: 'damage' | 'malfunction' | 'missing_item' | 'cleanliness' | 'lost_and_found' = 'malfunction';
    if (maintenanceCategory === 'broken') apiIssueType = 'damage';
    else if (maintenanceCategory === 'electric') apiIssueType = 'malfunction';
    else if (maintenanceCategory === 'missing') apiIssueType = 'missing_item';
    else if (maintenanceCategory === 'sanitary') apiIssueType = 'cleanliness';
    else if (maintenanceCategory === 'lost_and_found') apiIssueType = 'lost_and_found';

    const payload: any = {
      roomId,
      roomNumber: maintenanceRoom,
      reportedBy: 'hk-staff-001',
      issueType: apiIssueType,
      severity: 'medium',
      description: maintenanceDesc.trim() || (apiIssueType === 'lost_and_found' ? 'ของที่ลูกค้าลืมไว้ในห้องพัก' : 'แจ้งตรวจสอบอุปกรณ์'),
    };

    if (activeTask && activeTask.roomNumber === maintenanceRoom) {
      payload.taskId = activeTask.id;
    }

    if (apiIssueType === 'lost_and_found') {
      payload.storageLocation = lostAndFoundLocation || 'Front Desk Counter';
      payload.retentionDays = lostAndFoundDays || 7;
    }

    try {
      const res = await fetch(apiUrl('/api/housekeeping/issues'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(
          apiIssueType === 'lost_and_found'
            ? `บันทึกของลืมห้อง ${maintenanceRoom} ส่งมอบ Front Counter (เก็บ ${lostAndFoundDays} วัน) สำเร็จ`
            : `บันทึกใบแจ้งปัญหาห้อง ${maintenanceRoom} ส่งต่อไปยังทีมช่างแล้ว`
        );
      } else {
        const errJson = await res.json().catch(() => null);
        showToast(`ไม่สามารถบันทึกได้: ${errJson?.message || res.statusText}`);
      }
    } catch (err) {
      console.warn('API issue report warning:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsMaintenanceModalOpen(false);
      setMaintenanceDesc('');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  // Quick Minibar Check Handlers (30-sec checkout express for Front Desk Billing)
  const handleOpenQuickMinibar = (roomNum: string, taskId?: string) => {
    setQuickMinibarRoom(roomNum);
    setQuickMinibarTaskId(taskId || null);
    setQuickMinibarCounts({
      'mb-001': 0,
      'mb-002': 0,
      'mb-003': 0,
      'mb-004': 0,
      'mb-005': 0,
    });
    setIsQuickMinibarModalOpen(true);
  };

  const handleSendMinibarCheck = async (isAllIntact: boolean) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;

    let totalAmt = 0;
    const consumedList: string[] = [];
    if (!isAllIntact) {
      STANDARD_MINIBAR_CATALOG.forEach((item) => {
        const count = quickMinibarCounts[item.id] || 0;
        if (count > 0) {
          totalAmt += count * item.price;
          consumedList.push(`${item.name} x${count} (${count * item.price}บ.)`);
        }
      });
    }

    const summaryText =
      isAllIntact || consumedList.length === 0
        ? 'มินิบาร์ครบ 100% (ไม่มีการบริโภค • คืนมัดจำได้ทันที)'
        : `มีรายการใช้: ${consumedList.join(', ')} รวม ${totalAmt} บาท`;

    setMinibarCheckedStatus((prev) => ({
      ...prev,
      [quickMinibarRoom]: {
        time: timeStr,
        total: totalAmt,
        summary: summaryText,
      },
    }));

    setIsQuickMinibarModalOpen(false);

    if (isAllIntact || consumedList.length === 0) {
      showToast(`แจ้ง Front Desk: มินิบาร์ห้อง ${quickMinibarRoom} ของครบ 100% คืนเงินมัดจำได้ทันที!`);
    } else {
      showToast(`ส่งยอดมินิบาร์ห้อง ${quickMinibarRoom}: ${totalAmt} บาท แจ้ง Front Desk ขึ้นบิลเรียบร้อย!`);
    }

    if (quickMinibarTaskId) {
      const token = getAuthToken();
      try {
        await fetch(apiUrl(`/api/housekeeping/tasks/${quickMinibarTaskId}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            notes: `[ตรวจมินิบาร์ ${timeStr} โดย ${staffName}] ${summaryText}`,
          }),
        });
      } catch (err) {
        console.warn('Could not sync minibar check to task note:', err);
      }
    }
  };

  // Helper to parse realistic hotel check-in/out timing from notes
  const parseCardTimingInfo = (t: CleaningTaskItem) => {
    const notes = t.notes || '';

    let checkinText = 'เช็กอิน 14:00 น.';
    let checkinSub = '(ตามรอบปกติ)';
    let checkinHour = 14;
    let checkinMinute = 0;

    if (notes.includes('11:45')) {
      checkinHour = 11;
      checkinMinute = 45;
      checkinText = 'เช็กอิน 11:45 น.';
      checkinSub = '(รอมัดจำหน้าเคาน์เตอร์)';
    } else if (notes.includes('12:30')) {
      checkinHour = 12;
      checkinMinute = 30;
      checkinText = 'เช็กอิน 12:30 น.';
      checkinSub = '(แขกขอล่วงหน้า/รอมัดจำ)';
    } else if (notes.includes('13:00')) {
      checkinHour = 13;
      checkinMinute = 0;
      checkinText = 'เช็กอิน 13:00 น.';
      checkinSub = '(ด่วนพิเศษ เข้าบ่ายโมง)';
    } else if (notes.includes('13:30')) {
      checkinHour = 13;
      checkinMinute = 30;
      checkinText = 'เช็กอิน 13:30 น.';
      checkinSub = '(จองผ่านระบบเข้าพัก)';
    } else if (notes.includes('14:00')) {
      checkinHour = 14;
      checkinMinute = 0;
      checkinText = 'เช็กอิน 14:00 น.';
      checkinSub = '(แขกใหม่พร้อมเข้าพัก)';
    } else if (notes.includes('14:30')) {
      checkinHour = 14;
      checkinMinute = 30;
      checkinText = 'เช็กอิน 14:30 น.';
      checkinSub = '(แขกใหม่ช่วงบ่าย)';
    } else if (notes.includes('15:00')) {
      checkinHour = 15;
      checkinMinute = 0;
      checkinText = 'เช็กอิน 15:00 น.';
      checkinSub = '(มีกระเป๋าฝากส่งขึ้นห้อง)';
    } else if (
      t.taskType === 'daily_clean' ||
      (t as any).taskType === 'stayover_clean' ||
      notes.includes('พักต่อเนื่อง')
    ) {
      checkinHour = 99; // Never overdue
      checkinText = 'แขกพักต่อเนื่อง';
      checkinSub = '(พัก 3 คืน ไม่เปลี่ยนเตียง)';
    }

    let checkoutText = 'เช็กเอาท์ 12:00 น.';
    let checkoutSub = 'ห้องว่างพร้อมเข้าทำ';

    if (notes.includes('10:30')) {
      checkoutText = 'เช็กเอาท์ 10:30 น.';
      checkoutSub = 'ตรวจเช็คแอร์ก่อนปล่อยห้อง';
    } else if (notes.includes('10:45')) {
      checkoutText = 'เช็กเอาท์ 10:45 น.';
      checkoutSub = 'ตรวจกลิ่นควันบุหรี่ระเบียง';
    } else if (notes.includes('11:00')) {
      checkoutText = 'เช็กเอาท์ 11:00 น.';
      checkoutSub = 'ห้องว่างพร้อมเข้าทำ';
    } else if (notes.includes('11:30')) {
      checkoutText = 'เช็กเอาท์ 11:30 น.';
      checkoutSub = 'แขกใหม่เข้า 12:30 น. ด่วนพิเศษ';
    } else if (notes.includes('11:45')) {
      checkoutText = 'เช็กเอาท์ 13:00 น.';
      checkoutSub = 'ห้องว่างพร้อมเข้าทำ';
    } else if (
      t.taskType === 'daily_clean' ||
      (t as any).taskType === 'stayover_clean' ||
      notes.includes('พักต่อเนื่อง')
    ) {
      checkoutText = 'บริการรอบเช้า';
      checkoutSub = 'เติมน้ำดื่มและเปลี่ยนผ้าเช็ดตัว';
    }

    let pillTime = 'เช็กอิน 14:00 น.';
    if (notes.includes('11:45')) pillTime = 'เช็กอิน 11:45 น.';
    else if (notes.includes('12:30')) pillTime = 'เช็กอิน 12:30 น.';
    else if (notes.includes('13:00')) pillTime = 'เช็กอิน 13:00 น.';
    else if (notes.includes('13:30')) pillTime = 'เช็กอิน 13:30 น.';
    else if (notes.includes('14:00')) pillTime = 'เช็กอิน 14:00 น.';
    else if (notes.includes('14:30')) pillTime = 'เช็กอิน 14:30 น.';
    else if (notes.includes('15:00')) pillTime = 'ส่งกระเป๋า 15:00 น.';
    else if (
      t.taskType === 'daily_clean' ||
      (t as any).taskType === 'stayover_clean' ||
      notes.includes('พักต่อเนื่อง')
    ) {
      pillTime = 'รอบบริการ 11:00 น.';
    }

    // Dynamic Overdue Calculation against current real-time clock
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetCheckinMinutes = checkinHour * 60 + checkinMinute;
    const isOverdue = checkinHour < 90 && currentMinutes > targetCheckinMinutes;
    const overdueMinutes = isOverdue ? currentMinutes - targetCheckinMinutes : 0;

    let overdueLabel = '';
    if (isOverdue) {
      if (overdueMinutes < 60) {
        overdueLabel = `${overdueMinutes} นาที`;
      } else {
        const hours = Math.floor(overdueMinutes / 60);
        const mins = overdueMinutes % 60;
        overdueLabel = mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชั่วโมง`;
      }
    }

    return { checkinText, checkinSub, checkoutText, checkoutSub, pillTime, isOverdue, overdueMinutes, overdueLabel };
  };

  // Active Room Task & Checklist Metrics
  const activeTask = tasks.find((t) => t.status === 'in_progress');
  const checklistTotalCount = ALL_CHECKLIST_ITEM_IDS.length; // 12 ข้อ
  const checklistCheckedCount = activeTask
    ? ALL_CHECKLIST_ITEM_IDS.filter((id) => Boolean(activeTask.checklist[id])).length
    : 0;
  const isAllChecked = activeTask ? checklistCheckedCount === checklistTotalCount : false;
  const checklistPercent = Math.round((checklistCheckedCount / checklistTotalCount) * 100);

  // Smart Sorting Weights (Business Priority & Hotel SOP Rules)
  const PRIORITY_WEIGHT: Record<string, number> = {
    urgent: 1, // VIP / แขกขอห้องด่วน
    high: 2,   // เช็คเอาท์มีแขกใหม่รอเข้าพัก
    normal: 3, // แขกพักต่อเนื่อง หรือห้องตรวจรอบสุดท้าย
    low: 4,
  };

  const TASK_TYPE_WEIGHT: Record<string, number> = {
    checkout_clean: 1, // ห้องเช็คเอาท์ (ต้องรีบทำเปิดขาย)
    daily_clean: 2,    // ห้องพักต่อเนื่อง
    stayover_clean: 2, // ห้องพักต่อเนื่อง (เปลี่ยนผ้า/ขยะ)
    deep_clean: 3,     // ทำความสะอาดลึก
    inspect: 4,        // ตรวจรับงานรอบสุดท้าย
    inspection: 4,     // ตรวจรับงานรอบสุดท้าย
  };

  // Filtered & Smart-Sorted Tasks for Tab 1
  const filteredTasks = tasks
    .filter((t) => {
      if (t.status === 'in_progress') return false; // Rendered in Active section
      if (taskFilter === 'urgent') return t.priority === 'urgent';
      if (taskFilter === 'checkout') {
        return t.taskType === 'checkout_clean' || (t.notes && t.notes.includes('เช็คเอาท์'));
      }
      if (taskFilter === 'incoming') {
        return t.notes && (t.notes.includes('เข้า') || t.notes.includes('แขกใหม่'));
      }
      if (taskFilter === 'stayover') {
        return t.taskType === 'daily_clean' || (t as any).taskType === 'stayover_clean' || (t.notes && t.notes.includes('พักต่อเนื่อง'));
      }
      if (taskFilter === 'floor1') return t.floor === 1;
      if (taskFilter === 'floor2_3') return t.floor >= 2;
      return true;
    })
    .sort((a, b) => {
      // 0. เคสด่วนเช็คเอาท์ที่ยังไม่ได้ตรวจมินิบาร์ ดันขึ้นบนสุดทันที (Front Desk รอมัดจำ)
      const aNeedsMinibar = (a.taskType === 'checkout_clean' || (a.notes && a.notes.includes('เช็คเอาท์'))) && !minibarCheckedStatus[a.roomNumber];
      const bNeedsMinibar = (b.taskType === 'checkout_clean' || (b.notes && b.notes.includes('เช็คเอาท์'))) && !minibarCheckedStatus[b.roomNumber];
      if (aNeedsMinibar && !bNeedsMinibar) return -1;
      if (!aNeedsMinibar && bNeedsMinibar) return 1;

      // 1. ห้องที่เลยเวลาเช็คอินแล้ว (Overdue Alert) ต้องรีบทำก่อนห้องปกติ
      const aTiming = parseCardTimingInfo(a);
      const bTiming = parseCardTimingInfo(b);
      if (aTiming.isOverdue && !bTiming.isOverdue) return -1;
      if (!aTiming.isOverdue && bTiming.isOverdue) return 1;
      if (aTiming.isOverdue && bTiming.isOverdue) {
        const diff = bTiming.overdueMinutes - aTiming.overdueMinutes;
        if (diff !== 0) return diff;
      }

      // 2. ระดับความเร่งด่วนทางธุรกิจ (urgent > high > normal)
      const pDiff = (PRIORITY_WEIGHT[a.priority] || 3) - (PRIORITY_WEIGHT[b.priority] || 3);
      if (pDiff !== 0) return pDiff;

      // 3. มีแขกใหม่กำลังจะเข้า (Turnover) ดันขึ้นก่อนห้องทั่วไป
      const aIncoming = a.notes && (a.notes.includes('เข้า') || a.notes.includes('แขกใหม่'));
      const bIncoming = b.notes && (b.notes.includes('เข้า') || b.notes.includes('แขกใหม่'));
      if (aIncoming && !bIncoming) return -1;
      if (!aIncoming && bIncoming) return 1;

      // 4. ประเภทงาน (checkout turnover > stayover > inspection)
      const tDiff = (TASK_TYPE_WEIGHT[a.taskType] || 2) - (TASK_TYPE_WEIGHT[b.taskType] || 2);
      if (tDiff !== 0) return tDiff;

      // 5. เส้นทางเดินและชั้นที่ใกล้ที่สุด (Proximity to active room's floor)
      const currentFloor = activeTask ? activeTask.floor : 1;
      const floorDiffA = Math.abs(a.floor - currentFloor);
      const floorDiffB = Math.abs(b.floor - currentFloor);
      if (floorDiffA !== floorDiffB) return floorDiffA - floorDiffB;

      // 6. เรียงตามเลขห้อง
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });

  // Shift Metrics & Dynamic Counts
  const completedCount = completedRooms.length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const totalShiftRooms = completedCount + tasks.length;
  const shiftProgressPercent = totalShiftRooms > 0 ? Math.round((completedCount / totalShiftRooms) * 100) : 0;

  // Dynamic filter pill counts
  const checkoutCount = tasks.filter(
    (t) => t.status !== 'in_progress' && (t.taskType === 'checkout_clean' || (t.notes && t.notes.includes('เช็คเอาท์')))
  ).length;
  const incomingCount = tasks.filter(
    (t) => t.status !== 'in_progress' && t.notes && (t.notes.includes('เข้า') || t.notes.includes('แขกใหม่'))
  ).length;
  const stayoverCount = tasks.filter(
    (t) =>
      t.status !== 'in_progress' &&
      (t.taskType === 'daily_clean' || (t as any).taskType === 'stayover_clean' || (t.notes && t.notes.includes('พักต่อเนื่อง')))
  ).length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'in_progress').length;
  const floor1Count = tasks.filter((t) => t.floor === 1 && t.status !== 'in_progress').length;
  const floor23Count = tasks.filter((t) => t.floor >= 2 && t.status !== 'in_progress').length;

  // Filtered Rooms for Tab 3 (Matrix)
  const roomFloorAllCount = roomStatusList.length;
  const roomFloor1Count = roomStatusList.filter((r) => r.floor === 1).length;
  const roomFloor2Count = roomStatusList.filter((r) => r.floor === 2).length;
  const roomFloor3Count = roomStatusList.filter((r) => r.floor === 3).length;

  const filteredRooms = roomStatusList.filter((r) => {
    if (floorFilter !== 'all' && r.floor.toString() !== floorFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.roomNumber.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.guestInfo && r.guestInfo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div
      className={`min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between selection:bg-slate-200 transition-all duration-300 ${
        isEyeCareMode ? 'sepia-[0.18] contrast-[0.98] bg-[#FAF8F5]' : ''
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 inset-x-4 max-w-sm mx-auto z-50 bg-[#0F172A] text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {isFocusModeOpen && activeTask ? (
        // ========================================================
        // FOCUS MODE: FULL-SCREEN CLEANING CHECKLIST
        // ========================================================
        <>
          {/* Focus Mode Sticky Top Bar */}
          <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
            <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsFocusModeOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 border border-slate-200 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>ภาพรวมคิวงาน</span>
              </button>

              <div className="flex flex-col items-center">
                
                <span className="text-base font-extrabold text-slate-900 font-mono leading-none mt-0.5">
                  ห้อง {activeTask.roomNumber}
                </span>
              </div>

              <div className="w-[100px]" />
            </div>
          </header>

          {/* Focus Mode Scrollable Content */}
          <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-32 flex flex-col gap-3.5">
            {/* Hero Card: Exact New Design matching Reference */}
            {(() => {
              const isCheckout =
                activeTask.taskType === 'checkout_clean' ||
                (activeTask.notes && activeTask.notes.includes('เช็คเอาท์'));
              const isIncoming =
                activeTask.notes &&
                (activeTask.notes.includes('เข้า') || activeTask.notes.includes('แขกใหม่'));
              const isStayover =
                activeTask.taskType === 'daily_clean' ||
                (activeTask as any).taskType === 'stayover_clean' ||
                (activeTask.notes && activeTask.notes.includes('พักต่อเนื่อง'));
              const isInspect =
                activeTask.taskType === 'inspect' ||
                (activeTask as any).taskType === 'inspection' ||
                (activeTask.notes && activeTask.notes.includes('รอตรวจ'));
              const isMinibarDone = Boolean(minibarCheckedStatus[activeTask.roomNumber]);
              const needsUrgentMinibar = isCheckout && !isMinibarDone;
              const timing = parseCardTimingInfo(activeTask);

              return (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-3.5 transition-all">
                  {/* Row 1: Orange Bar + Room Number | Status Pill | Duration / Timer */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Orange Bar + Room Number */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-10 rounded-full bg-[#F97316] shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-500 leading-tight ทิขๅ">
                          ห้องเลขที่
                        </span>
                        <span className="text-3xl font-black font-mono text-[#0F172A] tracking-tight leading-none">
                          {activeTask.roomNumber}
                        </span>
                      </div>
                    </div>

                    {/* Center: Status Pill */}
                    <div className="shrink-0">
                      {needsUrgentMinibar ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#FFEDD5] text-[#9A3412] text-xs font-bold shadow-2xs inline-block">
                          เพิ่งเช็คเอาท์ • รอมินิบาร์
                        </span>
                      ) : isCheckout && isMinibarDone ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>ตรวจมินิบาร์แล้ว</span>
                        </span>
                      ) : isStayover ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold shadow-2xs inline-block">
                          แขกพักต่อเนื่อง
                        </span>
                      ) : isInspect ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shadow-2xs inline-block">
                          รอตรวจปล่อยห้อง
                        </span>
                      ) : (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#FFEDD5] text-[#9A3412] text-xs font-bold shadow-2xs inline-block">
                          กำลังทำความสะอาด
                        </span>
                      )}
                    </div>

                    {/* Right: Estimated Duration / Timer */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[11px] font-medium text-slate-500 leading-tight">
                        เหลือเวลา
                      </span>
                      <div className="flex items-baseline gap-0.5 leading-none">
                        <span
                          className={`text-2xl font-black font-mono leading-none ${
                            timerSeconds <= 5 * 60 ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                          }`}
                        >
                          {formatTimer(timerSeconds)}
                        </span>
                        <span className="text-xs font-medium text-slate-600">น.</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Incoming Pill with Clock + Priority Pill */}
                  <div className="flex items-center gap-2 w-full">
                    {timing.isOverdue ? (
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 min-w-0">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                        <span className="font-black text-rose-950 shrink-0">เลยเวลาเช็คอินแล้ว</span>
                        <div className="w-px h-3.5 bg-rose-200 shrink-0" />
                        <span className="text-rose-700 font-bold truncate">
                          เลยกำหนด {timing.overdueLabel}
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#EFF6FF] border border-blue-100 text-xs text-blue-900 min-w-0">
                        <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center shrink-0">
                          <Clock className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                        </div>
                        <span className="font-bold text-blue-950 shrink-0">
                          {isIncoming
                            ? 'แขกใหม่กำลังเข้า'
                            : isStayover
                            ? 'แขกอยู่ในห้อง'
                            : 'กำลังทำความสะอาด'}
                        </span>
                        <div className="w-px h-3.5 bg-blue-200 shrink-0" />
                        <span className="text-slate-700 font-medium truncate">
                          {timing.pillTime}
                        </span>
                      </div>
                    )}

                    {activeTask.priority === 'urgent' || activeTask.roomNumber === '205' ? (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FFF1F2] border border-rose-100 shrink-0 relative overflow-hidden">
                        <div className="w-1 h-3.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-xs font-black text-rose-700">ด่วนพิเศษ</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-100 shrink-0 relative overflow-hidden">
                        <div className="w-1 h-3.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-amber-800">สำคัญสูง</span>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Timing Box (ช่วงเวลาเข้าพัก) */}
                  <div className="w-full rounded-2xl bg-[#F8FAFC] border border-slate-200/70 p-3.5 flex items-start gap-3">
                    <div className="w-14 shrink-0 flex flex-col text-[11px] font-medium text-slate-500 leading-tight pt-0.5">
                      <span>ช่วงเวลา</span>
                      <span>เข้าพัก</span>
                    </div>
                    <div className="w-px self-stretch bg-slate-200 shrink-0" />
                    <div className="flex flex-col gap-1 text-xs leading-snug flex-1 min-w-0">
                      <div className="truncate">
                        <span className="font-black text-slate-900">{timing.checkinText}</span>{' '}
                        <span className="text-slate-600 font-medium">{timing.checkinSub}</span>
                      </div>
                      <div className="truncate">
                        <span className="font-black text-slate-900">{timing.checkoutText}</span>{' '}
                        <span className="text-slate-500">{timing.checkoutSub}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Progress Bar */}
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">
                        ความคืบหน้ารวม {checklistCheckedCount} จาก {checklistTotalCount} รายการ
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isAllChecked ? 'text-emerald-600' : 'text-blue-600'
                        }`}
                      >
                        {checklistPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAllChecked ? 'bg-emerald-500' : 'bg-[#F97316]'
                        }`}
                        style={{ width: `${checklistPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Checklist Category Section Header & Quick Toggle All */}
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                รายการตรวจมาตรฐาน 4 หมวด ({checklistCheckedCount}/{checklistTotalCount})
              </span>
              <button
                type="button"
                onClick={() => handleToggleAllChecklist(activeTask.id, !isAllChecked)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isAllChecked ? 'รีเซ็ตทั้งหมด' : 'ติ๊กผ่านทั้งหมด'}</span>
              </button>
            </div>

            {/* 4 Categorized Checklist Cards */}
            {HOTEL_CHECKLIST_GROUPS.map((group) => {
              const groupCheckedCount = group.items.filter((item) =>
                Boolean(activeTask.checklist[item.id])
              ).length;
              const isGroupDone = groupCheckedCount === group.items.length;

              return (
                <div
                  key={group.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 flex flex-col gap-2.5"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                          isGroupDone
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {group.iconType === 'bed' && <Bed className="w-4 h-4" />}
                        {group.iconType === 'bath' && <Sparkles className="w-4 h-4" />}
                        {group.iconType === 'minibar' && <Coffee className="w-4 h-4" />}
                        {group.iconType === 'final' && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{group.title}</h3>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isGroupDone
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isGroupDone ? 'เสร็จสิ้น' : `${groupCheckedCount}/${group.items.length}`}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => {
                      const checked = Boolean(activeTask.checklist[item.id]);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklist(activeTask.id, item.id)}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer min-h-[52px] select-none ${
                            checked
                              ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50/80'
                              : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 active:scale-[0.99]'
                          }`}
                        >
                          <div className="pt-0.5 shrink-0">
                            {checked ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={`text-xs font-semibold leading-snug transition-all ${
                                checked
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-900'
                              }`}
                            >
                              {item.label}
                            </span>
                            <span
                              className={`text-[11px] leading-snug mt-0.5 ${
                                checked ? 'text-slate-400 line-through' : 'text-slate-500'
                              }`}
                            >
                              {item.sublabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </main>

          {/* Focus Mode Bottom Action Bar */}
          <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl p-3">
            <div className="max-w-md mx-auto grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMaintenanceRoom(activeTask.roomNumber);
                  setIsMaintenanceModalOpen(true);
                }}
                className="min-h-[48px] flex items-center justify-center gap-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all active:scale-95 text-xs font-bold cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>แจ้งชำรุด / ช่าง</span>
              </button>

              <button
                type="button"
                disabled={!isAllChecked}
                onClick={() => {
                  if (isAllChecked) {
                    handleCompleteActiveTask(activeTask.id);
                  }
                }}
                className={`min-h-[48px] flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  isAllChecked
                    ? 'bg-[#0F172A] hover:bg-slate-800 text-white shadow-md active:scale-95 cursor-pointer ring-2 ring-emerald-500/50'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
                title={
                  !isAllChecked
                    ? `กรุณาตรวจเช็คให้ครบทั้ง ${checklistTotalCount} รายการ`
                    : 'แตะเพื่อบันทึกจบงาน'
                }
              >
                <CheckCircle2
                  className={`w-4 h-4 transition-colors ${
                    isAllChecked ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                />
                <span>เสร็จสิ้นงาน ({checklistCheckedCount}/{checklistTotalCount})</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ========================================================
              1. TOP APP BAR (Sticky Header)
              Simplified & Minimalist: Logo center/left, Outsource Dial, Profile
              ======================================================== */}
          <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo Minimal */}
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={true} />
          </div>
          {/* Quick Actions Right */}
          <div className="flex items-center gap-2">
            {/* Quick Profile Jump Button to Tab 5 (Dedicated Profile Tab) */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`relative flex items-center p-0.5 rounded-full transition-all active:scale-95 cursor-pointer ${
                activeTab === 'profile'
                  ? 'ring-2 ring-[#0F172A]'
                  : 'hover:ring-2 hover:ring-slate-300'
              }`}
              title="เปิดหน้าโปรไฟล์ส่วนตัว"
            >
              <div className="relative w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-900 shadow-2xs">
                {staffInitials}
                {/* Online / Active Shift Indicator */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN CONTENT AREA (Scrollable Container)
          ======================================================== */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-28">
        {/* ====================================================
            TAB 1: งานของฉัน (My Tasks View)
            ==================================================== */}
        {activeTab === 'tasks' && (
          <div className="flex flex-col gap-4">
            {/* Top Shift Progress Card */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">
                      รอบกะเช้า (เวลาทำงาน)
                    </h2>
                    <p className="text-xs font-mono text-slate-500">07:00 - 15:30 น.</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                  เป้าหมาย {totalShiftRooms} ห้อง
                </span>
              </div>

              {/* Progress Bar */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700">ความคืบหน้ารวม {completedCount} จาก {totalShiftRooms} ห้อง</span>
                  <span className="font-mono text-blue-600 font-bold">{shiftProgressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${shiftProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* 3 Metric Counters */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-base font-bold font-mono text-slate-900">{completedCount}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5">เสร็จสิ้นแล้ว</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-base font-bold font-mono text-slate-900">{inProgressCount}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5">กำลังทำ</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-base font-bold font-mono text-slate-900">{pendingCount}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5">รอทำความสะอาด</span>
                </div>
              </div>
            </section>

            {/* Filter Pills with Express Categories */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setTaskFilter('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  taskFilter === 'all'
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ทั้งหมด ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('checkout')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                  taskFilter === 'checkout'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <span> เช็คเอาท์/มินิบาร์ ({checkoutCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('incoming')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                  taskFilter === 'incoming'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span> แขกกำลังจะเข้า ({incomingCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('stayover')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                  taskFilter === 'stayover'
                    ? 'bg-teal-700 text-white'
                    : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                }`}
              >
                <Bed className="w-3.5 h-3.5" />
                <span> พักต่อเนื่อง ({stayoverCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('urgent')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  taskFilter === 'urgent'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span>งานด่วนพิเศษ ({urgentCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('floor1')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  taskFilter === 'floor1'
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ชั้น 1 ({floor1Count})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('floor2_3')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  taskFilter === 'floor2_3'
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ชั้น 2-3 ({floor23Count})
              </button>
            </div>

            {/* SECTION 1: ACTIVE WORKING TASK (Room 105) */}
            {activeTask && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      กำลังดำเนินการ (1 ห้อง)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">เริ่ม 11:15 น.</span>
                </div>

                {/* Active Task Card - Exact Same Style from Reference */}
                {(() => {
                  const isCheckout =
                    activeTask.taskType === 'checkout_clean' ||
                    (activeTask.notes && activeTask.notes.includes('เช็คเอาท์'));
                  const isIncoming =
                    activeTask.notes &&
                    (activeTask.notes.includes('เข้า') || activeTask.notes.includes('แขกใหม่'));
                  const isMinibarDone = Boolean(minibarCheckedStatus[activeTask.roomNumber]);
                  const timing = parseCardTimingInfo(activeTask);

                  return (
                    <div
                      onClick={() => setIsFocusModeOpen(true)}
                      className="bg-white rounded-3xl border-2 border-amber-400 shadow-sm p-4 sm:p-5 flex flex-col gap-3.5 transition-all hover:border-amber-500 cursor-pointer"
                    >
                      {/* Row 1: Orange Bar + Room Number | Status Pill | Timer */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: Orange Bar + Room Number */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-10 rounded-full bg-[#F97316] shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">
                              ห้องเลขที่
                            </span>
                            <span className="text-3xl font-black font-mono text-[#0F172A] tracking-tight leading-none">
                              {activeTask.roomNumber}
                            </span>
                          </div>
                        </div>

                        {/* Center: Status Pill */}
                        <div className="shrink-0">
                          <span className="px-3.5 py-1.5 rounded-full bg-[#FFEDD5] text-[#9A3412] text-xs font-bold shadow-2xs inline-block">
                            กำลังทำความสะอาด
                          </span>
                        </div>

                        {/* Right: Remaining Time */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[11px] font-medium text-slate-500 leading-tight">
                            เหลือเวลา
                          </span>
                          <div className="flex items-baseline gap-0.5 leading-none">
                            <span
                              className={`text-2xl font-black font-mono leading-none ${
                                timerSeconds <= 5 * 60 ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                              }`}
                            >
                              {formatTimer(timerSeconds)}
                            </span>
                            <span className="text-xs font-medium text-slate-600">น.</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Incoming Pill with Clock + Priority Pill */}
                      <div className="flex items-center gap-2 w-full">
                        {timing.isOverdue ? (
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                            </span>
                            <span className="font-black text-rose-950 shrink-0">เลยเวลาเช็คอินแล้ว</span>
                            <div className="w-px h-3.5 bg-rose-200 shrink-0" />
                            <span className="text-rose-700 font-bold truncate">
                              เลยกำหนด {timing.overdueLabel}
                            </span>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#EFF6FF] border border-blue-100 text-xs text-blue-900 min-w-0">
                            <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center shrink-0">
                              <Clock className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                            </div>
                            <span className="font-bold text-blue-950 shrink-0">
                              {isIncoming ? 'แขกใหม่กำลังเข้า' : 'ห้องกำลังทำความสะอาด'}
                            </span>
                            <div className="w-px h-3.5 bg-blue-200 shrink-0" />
                            <span className="text-slate-700 font-medium truncate">
                              {timing.pillTime}
                            </span>
                          </div>
                        )}

                        {activeTask.priority === 'urgent' || activeTask.roomNumber === '205' ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FFF1F2] border border-rose-100 shrink-0 relative overflow-hidden">
                            <div className="w-1 h-3.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-xs font-black text-rose-700">ด่วนพิเศษ</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-100 shrink-0 relative overflow-hidden">
                            <div className="w-1 h-3.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-xs font-bold text-amber-800">สำคัญสูง</span>
                          </div>
                        )}
                      </div>

                      {/* Row 3: Timing Box (ช่วงเวลาเข้าพัก) */}
                      <div className="w-full rounded-2xl bg-[#F8FAFC] border border-slate-200/70 p-3.5 flex items-start gap-3">
                        <div className="w-14 shrink-0 flex flex-col text-[11px] font-medium text-slate-500 leading-tight pt-0.5">
                          <span>ช่วงเวลา</span>
                          <span>เข้าพัก</span>
                        </div>
                        <div className="w-px self-stretch bg-slate-200 shrink-0" />
                        <div className="flex flex-col gap-1 text-xs leading-snug flex-1 min-w-0">
                          <div className="truncate">
                            <span className="font-black text-slate-900">{timing.checkinText}</span>{' '}
                            <span className="text-slate-600 font-medium">{timing.checkinSub}</span>
                          </div>
                          <div className="truncate">
                            <span className="font-black text-slate-900">{timing.checkoutText}</span>{' '}
                            <span className="text-slate-500">{timing.checkoutSub}</span>
                          </div>
                        </div>
                      </div>

                      {/* Checklist Summary Progress Bar */}
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            ความคืบหน้ารายการตรวจ ({checklistCheckedCount}/{checklistTotalCount} ข้อ)
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              isAllChecked ? 'text-emerald-600' : 'text-blue-600'
                            }`}
                          >
                            {checklistPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isAllChecked ? 'bg-emerald-500' : 'bg-[#F97316]'
                            }`}
                            style={{ width: `${checklistPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Row 4: Action Buttons */}
                      <div className="flex items-center gap-2.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                        {isCheckout ? (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickMinibar(activeTask.roomNumber, activeTask.id)}
                            className="w-[38%] min-h-[52px] py-2 px-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                              ตรวจมินิบาร์
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">
                              {isMinibarDone ? 'ตรวจแล้ว' : '30 วิ'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMaintenanceRoom(activeTask.roomNumber);
                              setIsMaintenanceModalOpen(true);
                            }}
                            className="w-[38%] min-h-[52px] py-2 px-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                              แจ้งชำรุด
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">
                              ส่งช่างซ่อม
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsFocusModeOpen(true)}
                          className="flex-1 min-h-[52px] py-2 px-4 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-sm sm:text-base shadow-md shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>ตรวจเช็ครายการ ({checklistCheckedCount}/{checklistTotalCount})</span>
                          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* SECTION 2: QUEUE TASKS */}
            <section className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    คิวรอดำเนินการ ({filteredTasks.length} ห้อง)
                  </h3>
                </div>
                <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                  จัดลำดับตามความเร่งด่วน
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {filteredTasks.map((t) => {
                  const isCheckout = t.taskType === 'checkout_clean' || (t.notes && t.notes.includes('เช็คเอาท์'));
                  const isIncoming = t.notes && (t.notes.includes('เข้า') || t.notes.includes('แขกใหม่'));
                  const isStayover = t.taskType === 'daily_clean' || (t as any).taskType === 'stayover_clean' || (t.notes && t.notes.includes('พักต่อเนื่อง'));
                  const isInspect = t.taskType === 'inspect' || (t as any).taskType === 'inspection' || (t.notes && t.notes.includes('รอตรวจ'));
                  const isMinibarDone = Boolean(minibarCheckedStatus[t.roomNumber]);
                  const needsUrgentMinibar = isCheckout && !isMinibarDone;

                  const cardStyle = needsUrgentMinibar
                    ? 'bg-amber-50/40 border-2 border-amber-400 ring-2 ring-amber-300/30 shadow-sm'
                    : isIncoming
                    ? 'bg-blue-50/20 border-2 border-blue-200 shadow-2xs'
                    : isStayover
                    ? 'bg-teal-50/15 border border-teal-200 shadow-2xs'
                    : 'bg-white border border-slate-200 shadow-2xs';

                  const timing = parseCardTimingInfo(t);

                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col gap-3.5 transition-all hover:shadow-md"
                    >
                      {/* Row 1: Orange Bar + Room Number | Status Pill | Duration */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: Orange Bar + Room Number */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-10 rounded-full bg-[#F97316] shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">
                              ห้องเลขที่
                            </span>
                            <span className="text-3xl font-black font-mono text-[#0F172A] tracking-tight leading-none">
                              {t.roomNumber}
                            </span>
                          </div>
                        </div>

                        {/* Center: Status Pill */}
                        <div className="shrink-0">
                          {needsUrgentMinibar ? (
                            <span className="px-3.5 py-1.5 rounded-full bg-[#FFEDD5] text-[#9A3412] text-xs font-bold shadow-2xs inline-block">
                              เพิ่งเช็คเอาท์ • รอมินิบาร์
                            </span>
                          ) : isCheckout && isMinibarDone ? (
                            <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>ตรวจมินิบาร์แล้ว</span>
                            </span>
                          ) : isStayover ? (
                            <span className="px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold shadow-2xs inline-block">
                              แขกพักต่อเนื่อง
                            </span>
                          ) : isInspect ? (
                            <span className="px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold shadow-2xs inline-block">
                              รอตรวจปล่อยห้อง
                            </span>
                          ) : (
                            <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs inline-block">
                              ห้องว่างพร้อมทำ
                            </span>
                          )}
                        </div>

                        {/* Right: Estimated Duration */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[11px] font-medium text-slate-500 leading-tight mb-1">
                            ประมาณ
                          </span>
                          <div className="flex items-baseline gap-0.5 leading-none">
                            <span className="text-2xl font-black font-mono text-slate-900 leading-none">
                              {t.estMinutes}
                            </span>
                            <span className="text-xs font-medium text-slate-600">นาที</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Incoming Pill with Clock + Priority Pill */}
                      <div className="flex items-center gap-2 w-full">
                        {/* Left Pill (Blue / Pastel Incoming Pill OR Overdue Rose Alert) */}
                        {timing.isOverdue ? (
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                            </span>
                            <span className="font-black text-rose-950 shrink-0">
                              เลยเวลาเช็คอิน
                            </span>
                            <div className="w-px h-3.5 bg-rose-200 shrink-0" />
                            <span className="text-rose-700 font-bold truncate">
                              เลยกำหนด {timing.overdueLabel}
                            </span>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#EFF6FF] border border-blue-100 text-xs text-blue-900 min-w-0">
                            <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center shrink-0">
                              <Clock className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                            </div>
                            <span className="font-bold text-blue-950 shrink-0">
                              {isIncoming
                                ? 'แขกใหม่กำลังเข้า'
                                : isStayover
                                ? 'แขกอยู่ในห้อง'
                                : 'ห้องว่างพร้อมเข้าทำ'}
                            </span>
                            <div className="w-px h-3.5 bg-blue-200 shrink-0" />
                            <span className="text-slate-700 font-medium truncate">
                              {timing.pillTime}
                            </span>
                          </div>
                        )}

                        {/* Right Pill (Rose Priority Pill with Red Accent Bar) */}
                        {t.priority === 'urgent' ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FFF1F2] border border-rose-100 shrink-0 relative overflow-hidden">
                            <div className="w-1 h-3.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-xs font-black text-rose-700">ด่วนพิเศษ</span>
                          </div>
                        ) : t.priority === 'high' ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-100 shrink-0 relative overflow-hidden">
                            <div className="w-1 h-3.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-xs font-bold text-amber-800">สำคัญสูง</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 border border-slate-200/60 shrink-0">
                            <span className="text-xs font-medium text-slate-600">ปกติ</span>
                          </div>
                        )}
                      </div>

                      {/* Row 3: Timing Box (ช่วงเวลาเข้าพัก) */}
                      <div className="w-full rounded-2xl bg-[#F8FAFC] border border-slate-200/70 p-3.5 flex items-start gap-3">
                        <div className="w-14 shrink-0 flex flex-col text-[11px] font-medium text-slate-500 leading-tight pt-0.5">
                          <span>ช่วงเวลา</span>
                          <span>เข้าพัก</span>
                        </div>
                        <div className="w-px self-stretch bg-slate-200 shrink-0" />
                        <div className="flex flex-col gap-1 text-xs leading-snug flex-1 min-w-0">
                          <div className="truncate">
                            <span className="font-black text-slate-900">{timing.checkinText}</span>{' '}
                            <span className="text-slate-600 font-medium">{timing.checkinSub}</span>
                          </div>
                          <div className="truncate">
                            <span className="font-black text-slate-900">{timing.checkoutText}</span>{' '}
                            <span className="text-slate-500">{timing.checkoutSub}</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Action Buttons (ตรวจมินิบาร์ / 30 วิ | เริ่มงานทำความสะอาด >) */}
                      <div className="flex items-center gap-2.5 pt-0.5">
                        {isCheckout ? (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickMinibar(t.roomNumber, t.id)}
                            className="w-[38%] min-h-[52px] py-2 px-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                              ตรวจมินิบาร์
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">
                              {isMinibarDone ? 'ตรวจแล้ว' : '30 วิ'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMaintenanceRoom(t.roomNumber);
                              setIsMaintenanceModalOpen(true);
                            }}
                            className="w-[38%] min-h-[52px] py-2 px-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                              แจ้งชำรุด
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">
                              ส่งช่างซ่อม
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={Boolean(activeTask)}
                          onClick={() => {
                            if (!activeTask) handleStartTask(t.id);
                          }}
                          className={`flex-1 min-h-[52px] py-2 px-4 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                            activeTask
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white shadow-md shadow-orange-500/20 active:scale-98 cursor-pointer'
                          }`}
                          title={
                            activeTask
                              ? `กำลังทำความสะอาดห้อง ${activeTask.roomNumber} อยู่ กรุณาตรวจรับงานให้เสร็จสิ้นก่อนเริ่มห้องใหม่`
                              : 'แตะเพื่อเริ่มงาน'
                          }
                        >
                          <span>เริ่มงานทำความสะอาด</span>
                          <ChevronRight className={`w-5 h-5 stroke-[2.5] ${activeTask ? 'text-slate-300' : 'text-white'}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECTION 3: COMPLETED TODAY */}
            <section className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    เสร็จสิ้นแล้ววันนี้ ({completedRooms.length} ห้อง)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold text-emerald-600">
                  สมบูรณ์ 100%
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {completedRooms.map((c) => (
                  <div
                    key={c.roomNumber}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 flex items-center justify-between opacity-95 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold font-mono text-slate-900">
                            {c.roomNumber}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            เสร็จเมื่อ {c.finishedAt}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">ผู้ตรวจรับ: {c.inspector}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvidenceRoom(c);
                          setIsEvidenceModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                        title="ดูรูปภาพสภาพห้องก่อนและหลังทำความสะอาด"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">ดูหลักฐานภาพถ่าย</span>
                        <span className="sm:hidden">รูปถ่าย</span>
                      </button>

                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        พร้อมขาย
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ====================================================
            TAB 2: สถานะห้อง (Room Status Matrix View)
            ==================================================== */}
        {activeTab === 'status' && (
          <div className="flex flex-col gap-4">
            {/* 2x2 Operational Pulse KPI Grid */}
            <section className="grid grid-cols-2 gap-2.5">
              {/* Total Units */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    ห้องทั้งหมด
                  </span>
                  <Building className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold font-mono text-slate-900">22</span>
                  <span className="text-xs text-slate-400">ยูนิต</span>
                </div>
              </div>

              {/* Clean / Ready */}
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    สะอาด/พร้อม
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold font-mono text-emerald-700">14</span>
                  <span className="text-xs text-emerald-600">ห้อง</span>
                </div>
              </div>

              {/* Needs Cleaning */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    รอทำความสะอาด
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold font-mono text-amber-700">5</span>
                  <span className="text-xs text-amber-600">ห้อง</span>
                </div>
              </div>

              {/* Maintenance */}
              <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                    ซ่อมบำรุง/ปิด
                  </span>
                  <Wrench className="w-4 h-4 text-rose-600" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold font-mono text-rose-700">3</span>
                  <span className="text-xs text-rose-600">ห้อง</span>
                </div>
              </div>
            </section>

            {/* Fast Search & Floor Tabs */}
            <section className="flex flex-col gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาห้องพัก หรือ ประเภท..."
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Floor Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFloorFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    floorFilter === 'all'
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ทุกชั้น ({roomFloorAllCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFloorFilter('1')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    floorFilter === '1'
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ชั้น 1 ({roomFloor1Count})
                </button>
                <button
                  type="button"
                  onClick={() => setFloorFilter('2')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    floorFilter === '2'
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ชั้น 2 ({roomFloor2Count})
                </button>
                <button
                  type="button"
                  onClick={() => setFloorFilter('3')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    floorFilter === '3'
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  ชั้น 3 ({roomFloor3Count})
                </button>
              </div>
            </section>

            {/* Room Matrix List */}
            <section className="flex flex-col gap-2">
              {filteredRooms.map((r) => {
                const isClean = r.status === 'available';
                const isMaintenance = r.status === 'maintenance' || r.status === 'out_of_order';
                const isCleaning = r.status === 'cleaning';
                const isCheckedOut = r.status === 'checked_out';

                return (
                  <div
                    key={r.roomNumber}
                    onClick={() => setSelectedRoomDetail(r)}
                    className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Left Status Bar */}
                      <div
                        className={`w-1.5 h-10 rounded-full ${
                          isClean
                            ? 'bg-emerald-500'
                            : isMaintenance
                            ? 'bg-rose-500'
                            : isCleaning
                            ? 'bg-amber-500'
                            : isCheckedOut
                            ? 'bg-orange-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold font-mono text-slate-900">
                            {r.roomNumber}
                          </span>
                          <span className="text-xs text-slate-500">{r.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                          {r.guestInfo || r.notes}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isClean
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isMaintenance
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : isCleaning
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : isCheckedOut
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {isClean
                          ? 'พร้อมขาย'
                          : isMaintenance
                          ? 'แจ้งซ่อม'
                          : isCleaning
                          ? 'กำลังทำ'
                          : isCheckedOut
                          ? 'รอทำความสะอาด'
                          : 'เข้าพักอยู่'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        )}

        {/* ====================================================
            TAB 2: บอร์ดติดตามงาน (Swipeable Kanban Board View)
            ==================================================== */}
        {activeTab === 'kanban' && (
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">บอร์ดติดตามงานแม่บ้าน</h2>
                <p className="text-xs text-slate-500">ปัดซ้าย-ขวา เพื่อดูความคืบหน้าของแต่ละสถานะ</p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {totalShiftRooms} ห้องทั้งหมด
              </span>
            </div>

            {/* Column Quick Jump Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('kanban-col-pending')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>รอดำเนินการ ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById('kanban-col-progress')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all active:scale-95 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>กำลังทำ ({inProgressCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById('kanban-col-completed')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-all active:scale-95 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>พร้อมขาย ({completedCount})</span>
              </button>
            </div>

            {/* Horizontal Swipeable Kanban Columns (Trello Mobile Style) */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-3 -mx-4 px-4 pt-1">
              {/* COLUMN 1: รอดำเนินการ (Pending Tasks) */}
              <div
                id="kanban-col-pending"
                className="w-[84vw] max-w-[340px] shrink-0 snap-center flex flex-col bg-slate-100 rounded-2xl border border-slate-200 max-h-[68vh] overflow-hidden shadow-xs"
              >
                {/* Fixed Column Header */}
                <div className="p-3 bg-slate-100 border-b border-slate-200/90 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <h3 className="text-xs font-bold text-slate-800">รอดำเนินการ</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {filteredTasks.length} ห้อง
                  </span>
                </div>

                {/* Scrollable Column Content */}
                <div className="p-3 overflow-y-auto flex flex-col gap-2.5 flex-1 min-h-0">
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 flex flex-col gap-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-base font-bold font-mono text-slate-900">
                              ห้อง {t.roomNumber}
                            </span>
                            {t.priority === 'urgent' && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                ด่วนพิเศษ
                              </span>
                            )}
                            {t.taskType === 'stayover_clean' && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                พักต่อเนื่อง
                              </span>
                            )}
                            {t.taskType === 'inspect' && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                รอตรวจ
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            ชั้น {t.floor} • {t.roomType}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          ~{t.estMinutes} นาที
                        </span>
                      </div>

                      {t.notes && (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 line-clamp-2">
                          {t.notes}
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between border-t border-slate-100 gap-1">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Bed className="w-3 h-3 text-slate-400" /> ห้องว่าง
                        </span>
                        <div className="flex items-center gap-1">
                          {t.taskType === 'checkout_clean' && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickMinibar(t.roomNumber, t.id)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer border ${
                                minibarCheckedStatus[t.roomNumber]
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                              title="เช็คมินิบาร์ด่วนแจ้ง Front Desk ทันที"
                            >
                              <Zap className="w-3 h-3 text-amber-600" />
                              <span>{minibarCheckedStatus[t.roomNumber] ? 'ตรวจแล้ว' : 'มินิบาร์'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={Boolean(activeTask)}
                            onClick={() => {
                              if (!activeTask) handleStartTask(t.id);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors ${
                              activeTask
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                : 'bg-[#0F172A] hover:bg-slate-800 text-white active:scale-95 cursor-pointer'
                            }`}
                            title={
                              activeTask
                                ? `กำลังทำความสะอาดห้อง ${activeTask.roomNumber} อยู่ กรุณาตรวจรับงานให้เสร็จสิ้นก่อนเริ่มห้องใหม่`
                                : 'เริ่มงาน'
                            }
                          >
                            <Play className={`w-3 h-3 ${activeTask ? 'text-slate-300' : 'text-white'}`} />
                            <span>เริ่มงาน</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLUMN 2: กำลังทำความสะอาด (In Progress Tasks) */}
              <div
                id="kanban-col-progress"
                className="w-[84vw] max-w-[340px] shrink-0 snap-center flex flex-col bg-amber-50/70 rounded-2xl border border-amber-200 max-h-[68vh] overflow-hidden shadow-xs"
              >
                {/* Fixed Column Header */}
                <div className="p-3 bg-amber-100/70 border-b border-amber-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-xs font-bold text-amber-950">กำลังทำความสะอาด</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-amber-800 border border-amber-200 shadow-2xs">
                    {inProgressCount} ห้อง
                  </span>
                </div>

                {/* Scrollable Column Content */}
                <div className="p-3 overflow-y-auto flex flex-col gap-2.5 flex-1 min-h-0">
                  {activeTask ? (
                    <div className="bg-white rounded-xl border-2 border-amber-300 shadow-sm p-3.5 flex flex-col gap-2.5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                      <div className="flex items-start justify-between pl-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-bold font-mono text-slate-900">
                              ห้อง {activeTask.roomNumber}
                            </span>
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                              กำลังทำ
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            ชั้น {activeTask.floor} • {activeTask.roomType}
                          </p>
                        </div>

                        {/* Live Countdown Badge */}
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 font-mono font-bold text-xs text-amber-900">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>{formatTimer(timerSeconds)}</span>
                        </div>
                      </div>

                      {/* Bed Spec */}
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5 py-1 border-y border-slate-100">
                        <Bed className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>เตียงคิงไซส์ 1 หลัง • {activeTask.roomType}</span>
                      </div>

                      {/* Checklist Progress */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">
                            ตรวจเช็คแล้ว {checklistCheckedCount}/{checklistTotalCount} ข้อ
                          </span>
                          <span className="font-mono font-bold text-blue-600">{checklistPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isAllChecked ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${checklistPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => setIsFocusModeOpen(true)}
                        className="w-full min-h-[40px] mt-1 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>เข้าโหมดโฟกัสตรวจรายการ</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 border border-dashed border-amber-200 rounded-xl bg-white/50">
                      <Clock className="w-6 h-6 mx-auto mb-1 text-amber-400 opacity-60" />
                      <p className="text-xs font-medium text-slate-600">ยังไม่มีห้องที่กำลังทำอยู่</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">แตะ 'เริ่มงาน' จากช่องรอดำเนินการได้เลย</p>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 3: ตรวจรับเรียบร้อย (Ready / Done) */}
              <div
                id="kanban-col-completed"
                className="w-[84vw] max-w-[340px] shrink-0 snap-center flex flex-col bg-emerald-50/50 rounded-2xl border border-emerald-200 max-h-[68vh] overflow-hidden shadow-xs"
              >
                {/* Fixed Column Header */}
                <div className="p-3 bg-emerald-100/70 border-b border-emerald-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-bold text-emerald-950">ตรวจรับเรียบร้อย</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                    {completedCount} ห้อง
                  </span>
                </div>

                {/* Scrollable Column Content */}
                <div className="p-3 overflow-y-auto flex flex-col gap-2.5 flex-1 min-h-0">
                  {completedRooms.map((c) => (
                    <div
                      key={c.roomNumber}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 flex flex-col gap-2 hover:border-emerald-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-base font-bold font-mono text-slate-900">
                              ห้อง {c.roomNumber}
                            </span>
                            <p className="text-[10px] text-slate-400">เสร็จเมื่อ {c.finishedAt}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          พร้อมขาย
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>ผู้ตรวจรับ: {c.inspector}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">ส่งมอบฟร้อนท์แล้ว</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 4: ตารางกะ (Shift Schedule View)
            Real-time Dynamic Calendar, Shadcn Month Picker & Week Strip
            ==================================================== */}
        {activeTab === 'schedule' && (
          <div className="flex flex-col gap-3.5 pb-2">
            {/* 1. Calendar Header Month & Week Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-col gap-2.5 relative">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    onClick={() => {
                      setWeekRefDate((prev) => {
                        const next = new Date(prev);
                        next.setDate(next.getDate() - 7);
                        return next;
                      });
                      showToast(' สัปดาห์ก่อนหน้า');
                    }}
                    title="สัปดาห์ก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Clickable Month Name -> Opens Shadcn Monthly Calendar */}
                  <button
                    type="button"
                    onClick={() => {
                      setPickerViewMonth(weekRefDate.getMonth());
                      setPickerViewYear(weekRefDate.getFullYear());
                      setIsMonthPickerOpen((prev) => !prev);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer group"
                    title="กดเพื่อเลือกเดือน/วันผ่านปฏิทิน (Shadcn Calendar)"
                  >
                    <span className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {formatThaiMonthHeader(weekRefDate)}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                        isMonthPickerOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    onClick={() => {
                      setWeekRefDate((prev) => {
                        const next = new Date(prev);
                        next.setDate(next.getDate() + 7);
                        return next;
                      });
                      showToast('สัปดาห์ถัดไป');
                    }}
                    title="สัปดาห์ถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Today Jump Pill Button */}
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    setSelectedDate(now);
                    setWeekRefDate(now);
                    setPickerViewMonth(now.getMonth());
                    setPickerViewYear(now.getFullYear());
                    setIsMonthPickerOpen(false);
                    showToast(' แสดงตารางกะวันนี้ (วันปัจจุบัน)');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isToday(selectedDate)
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs'
                      : 'bg-slate-100 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 text-slate-600 hover:text-emerald-700'
                  }`}
                  title="กลับสู่วันนี้"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>วันนี้ (Today)</span>
                </button>
              </div>

              {/* ====================================================
                  SHADCN CALENDAR POPOVER / DROPDOWN
                  Matches media_1793525492392_d8cdc376.png
                  ==================================================== */}
              {isMonthPickerOpen && (
                <div className="absolute top-14 left-2 right-2 sm:left-4 sm:right-auto sm:w-80 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                  {/* Calendar Month Navigation Header */}
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (pickerViewMonth === 0) {
                          setPickerViewMonth(11);
                          setPickerViewYear((y) => y - 1);
                        } else {
                          setPickerViewMonth((m) => m - 1);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col items-center">
                      <span className="text-xs font-extrabold text-slate-900">
                        {ENG_MONTHS_FULL[pickerViewMonth]} {pickerViewYear}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {THAI_MONTHS_FULL[pickerViewMonth]} {pickerViewYear + 543}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (pickerViewMonth === 11) {
                          setPickerViewMonth(0);
                          setPickerViewYear((y) => y + 1);
                        } else {
                          setPickerViewMonth((m) => m + 1);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day of Week Headers (Su Mo Tu We Th Fr Sa) */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <span key={d} className="text-[11px] font-semibold text-slate-400 py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {getMonthDaysGrid(pickerViewYear, pickerViewMonth).map((cell, idx) => {
                      const isPast = isBeforeToday(cell.date);
                      const isCurrentDay = isToday(cell.date);
                      const isSelected = isSameDay(cell.date, selectedDate);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedDate(cell.date);
                            setWeekRefDate(cell.date);
                            setIsMonthPickerOpen(false);
                            if (isPast) {
                              showToast(` ดูประวัติย้อนหลัง วันที่ ${formatThaiDateShort(cell.date)} (อ่านอย่างเดียว)`);
                            } else if (isCurrentDay) {
                              showToast(' ตารางกะวันนี้ (พร้อมปฏิบัติงาน)');
                            } else {
                              showToast(` ตารางกะล่วงหน้า วันที่ ${formatThaiDateShort(cell.date)}`);
                            }
                          }}
                          className={`h-8 w-8 mx-auto rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${
                            !cell.isCurrentMonth
                              ? 'text-slate-300 opacity-40 hover:bg-slate-50'
                              : isSelected
                              ? 'bg-[#0F172A] text-white font-bold shadow-xs'
                              : isCurrentDay
                              ? 'border border-emerald-500 text-emerald-700 font-bold bg-emerald-50/50'
                              : isPast
                              ? 'text-slate-400 opacity-60 hover:bg-slate-100'
                              : 'text-slate-800 font-medium hover:bg-slate-100'
                          }`}
                        >
                          {cell.date.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  {/* Popover Footer */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        setSelectedDate(now);
                        setWeekRefDate(now);
                        setPickerViewMonth(now.getMonth());
                        setPickerViewYear(now.getFullYear());
                        setIsMonthPickerOpen(false);
                        showToast('เลือกวันปัจจุบันเรียบร้อย');
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      เลือกวันนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMonthPickerOpen(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              )}

              {/* 7 Days Strip (จ. อ. พ. พฤ. ศ. ส. อา.) */}
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {getWeekDays(weekRefDate).map((d) => {
                  const isPast = isBeforeToday(d);
                  const isCurrentDay = isToday(d);
                  const isSelected = isSameDay(d, selectedDate);
                  const dayName = THAI_DAYS_SHORT[d.getDay()];
                  const dateNum = d.getDate();

                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d);
                        if (isPast) {
                          showToast(` บันทึกประวัติย้อนหลัง วันที่ ${formatThaiDateShort(d)}`);
                        } else if (isCurrentDay) {
                          showToast(' ตารางกะวันนี้');
                        } else {
                          showToast(` ตารางกะล่วงหน้า วันที่ ${formatThaiDateShort(d)}`);
                        }
                      }}
                      className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? isPast
                            ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-400'
                            : 'bg-[#0F172A] text-white shadow-md ring-2 ring-emerald-400/40'
                          : isCurrentDay
                          ? 'bg-white border-2 border-emerald-400 text-slate-900 font-bold shadow-2xs hover:bg-emerald-50/30'
                          : isPast
                          ? 'bg-slate-50/70 border border-slate-100 text-slate-400 opacity-60 hover:opacity-100'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 shadow-2xs'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-medium ${
                          isSelected
                            ? 'text-slate-200 font-bold'
                            : isPast
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {dayName}
                      </span>
                      <span
                        className={`text-base font-extrabold mt-0.5 leading-tight ${
                          isSelected
                            ? 'text-white'
                            : isCurrentDay
                            ? 'text-emerald-700 font-black'
                            : isPast
                            ? 'text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {dateNum}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                          isSelected
                            ? isPast
                              ? 'bg-slate-300'
                              : 'bg-emerald-400 ring-2 ring-emerald-400/40'
                            : isCurrentDay
                            ? 'bg-emerald-500 ring-2 ring-emerald-200 animate-pulse'
                            : isPast
                            ? 'bg-slate-300'
                            : 'bg-blue-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Read-Only History Notice Banner when Past Date is Selected */}
            {isBeforeToday(selectedDate) && (
              <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-center justify-between text-xs text-amber-900 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold">
                      บันทึกประวัติย้อนหลัง (Read-Only History)
                    </span>
                    <span className="text-[11px] text-amber-800">
                      รอบงานวันที่ {formatThaiFullDate(selectedDate)} ปิดรอบแล้ว • ไม่สามารถขอยื่นสลับกะหรือแก้ไขย้อนหลังได้
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    setSelectedDate(now);
                    setWeekRefDate(now);
                    showToast(' กลับสู่วันปัจจุบันเรียบร้อย');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white text-amber-900 border border-amber-300 font-bold text-[11px] shadow-2xs shrink-0 cursor-pointer hover:bg-amber-100 active:scale-95 transition-all ml-2"
                >
                  กลับสู่วันนี้
                </button>
              </div>
            )}

            {/* 2. Daily Shift Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    กะการทำงาน (Daily Shift Summary)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-600 font-mono">
                  {formatThaiDateShort(selectedDate)}
                </span>
              </div>

              {/* Shift Selector Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedShiftPill('morning')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedShiftPill === 'morning'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>กะเช้า 07:00 - 15:30 (4 คน)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShiftPill('afternoon')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedShiftPill === 'afternoon'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>กะบ่าย 14:30 - 23:00 (2 คน)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShiftPill('night')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedShiftPill === 'night'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>กะดึก 23:00 - 07:00 (1 คน)</span>
                </button>
              </div>

              {/* Status Banner */}
              {isBeforeToday(selectedDate) ? (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      สถานะกะ: <strong className="font-bold text-slate-800">กะปิดรอบแล้ว (Closed Shift)</strong>
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] shrink-0">
                    ปิดรอบแล้ว
                  </span>
                </div>
              ) : isToday(selectedDate) ? (
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      สถานะกะของคุณ: <strong className="font-bold">กำลังปฏิบัติงานกะเช้า</strong>
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white text-blue-700 border border-blue-200 font-bold text-[11px] shadow-2xs shrink-0">
                    เหลือ 3 ชม. 45 นาที
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-medium">
                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      สถานะกะ: <strong className="font-bold">ตารางกะล่วงหน้า (Scheduled)</strong>
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 font-bold text-[11px] shadow-2xs shrink-0">
                    รอเข้าเวร
                  </span>
                </div>
              )}
            </div>

            {/* 3. Section Title: สรุปภาระงานทีมแม่บ้าน */}
            <div className="flex items-center justify-between mt-1 px-1">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  สรุปภาระงานทีมแม่บ้าน (3 คนในกะ)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isBeforeToday(selectedDate)
                    ? 'สรุปผลงานหลังปิดรอบกะประจำวัน'
                    : 'ติดตามความหนาแน่นและประสิทธิภาพการทำงาน'}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isBeforeToday(selectedDate)
                    ? 'bg-slate-100 text-slate-600 border-slate-300'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {isBeforeToday(selectedDate) ? 'ประวัติรอบกะ' : 'กะปัจจุบัน'}
              </span>
            </div>

            {/* Staff Card 1: สุดา รัตนภักดี (คุณ) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                      {staffInitials}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                        isBeforeToday(selectedDate) ? 'bg-slate-400' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900">{staffName}</h4>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#0F172A] text-white">
                        คุณ
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      หัวหน้ากะเช้า • ประจำโซน: ชั้น 1 - 2 (HK-001)
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    isBeforeToday(selectedDate)
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBeforeToday(selectedDate) ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  {isBeforeToday(selectedDate) ? 'เสร็จสิ้นรอบ' : 'กำลังปฏิบัติงาน'}
                </span>
              </div>

              {/* Workload Progress */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">ความคืบหน้ารวม</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      5 ห้อง <span className="text-xs font-normal text-slate-500">(เสร็จ 3, ทำ 1, รอ 1)</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-700 text-xs">Utilization 83% (แน่น)</span>
                  </div>
                </div>

                {/* Progress Bar 83% Blue */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: '83%' }} />
                </div>
              </div>

              {/* Status Footer */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isBeforeToday(selectedDate) ? 'บันทึกงานสมบูรณ์' : 'พร้อมรับงานเสริม (On-call)'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {isBeforeToday(selectedDate) ? 'ชั่วโมงงานครบ 8 ชม.' : 'เริ่มงานแล้ว 4 ชม. 15 นาที'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {isBeforeToday(selectedDate) ? (
                  <button
                    type="button"
                    onClick={() => showToast(' วันที่ผ่านมาแล้ว ไม่สามารถทำรายการสลับกะหรือแจ้งลาย้อนหลังได้')}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
                    title="ไม่สามารถทำรายการย้อนหลังได้"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>สลับกะ / แจ้งลา</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsShiftSwapModalOpen(true)}
                    className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
                    <span>สลับกะ / แจ้งลา</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tasks');
                    if (isBeforeToday(selectedDate)) {
                      showToast(` เปิดดูประวัติงานของวันที่ ${formatThaiDateShort(selectedDate)}`);
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-300" />
                  <span>ดูบันทึกงาน</span>
                </button>
              </div>
            </div>

            {/* Staff Card 2: มาลี เรืองโรจน์ */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                      มา
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                        isBeforeToday(selectedDate) ? 'bg-slate-400' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">มาลี เรืองโรจน์ (Malee)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      กะเช้า 07:00 - 15:30 • ประจำโซน: ชั้น 3 - 4 (HK-002)
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    isBeforeToday(selectedDate)
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBeforeToday(selectedDate) ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  {isBeforeToday(selectedDate) ? 'เสร็จสิ้นรอบ' : 'กำลังปฏิบัติงาน'}
                </span>
              </div>

              {/* Workload Progress */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">ความคืบหน้ารวม</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      3 ห้อง <span className="text-xs font-normal text-slate-500">(เสร็จ 2, รอ 1)</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 text-xs">Utilization 50% (ปกติ)</span>
                  </div>
                </div>

                {/* Progress Bar 50% Emerald */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: '50%' }} />
                </div>
              </div>

              {/* Action Button: ขอความช่วยเหลือ */}
              {isBeforeToday(selectedDate) ? (
                <button
                  type="button"
                  onClick={() => showToast('ไม่สามารถขอความช่วยเหลือในรอบกะที่ปิดแล้วได้')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60 mt-0.5"
                  title="ปิดรอบแล้ว"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>ขอความช่วยเหลือ (ปิดรอบแล้ว)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShiftSwapTargetStaff('มาลี เรืองโรจน์');
                    setShiftSwapReason('swap');
                    setIsShiftSwapModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer mt-0.5"
                >
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>ขอความช่วยเหลือ</span>
                </button>
              )}
            </div>

            {/* Staff Card 3: วิชัย แซ่ตั้ง (กะดึก) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-2.5 opacity-90">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                      วิช
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-300 ring-2 ring-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">วิชัย แซ่ตั้ง (Wichai)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      กะดึก 23:00 - 07:00 • ส่วนกลาง & ฉุกเฉิน (HK-003)
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                  {isBeforeToday(selectedDate) ? 'กะดึก (ปิดรอบ)' : 'กะดึก (ยังไม่เข้างาน)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                  <span>0 ห้อง มอบหมาย</span>
                </div>
                <span className="text-xs text-slate-400">สแตนด์บาย (0%)</span>
              </div>
            </div>

            {/* 4. Section: การครอบคลุมพื้นที่ (Zone Coverage) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    การครอบคลุมพื้นที่ (Zone Coverage)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ครบ 100%
                </span>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 text-xs">
                {/* Zone 1 */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>โซน 1 (ชั้น 1 - 2 • 10 ห้อง)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 ml-3">
                      ผู้รับผิดชอบ: {staffName}
                    </span>
                  </div>
                  <span className="text-emerald-700 font-bold text-xs">100% ครอบคลุม</span>
                </div>

                {/* Zone 2 */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>โซน 2 (ชั้น 3 - 4 • 8 ห้อง)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 ml-3">
                      ผู้รับผิดชอบ: มาลี เรืองโรจน์
                    </span>
                  </div>
                  <span className="text-emerald-700 font-bold text-xs">100% ครอบคลุม</span>
                </div>

                {/* VIP Suites */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>VIP Suites (ชั้น 5 • 4 ห้อง)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 ml-3">
                      มีผู้ตรวจรับพิเศษ (Supervisor On-site)
                    </span>
                  </div>
                  <span className="text-blue-700 font-bold text-xs">สแตนด์บาย</span>
                </div>
              </div>
            </div>

            {/* 4.5 Section: บันทึกส่งเวรประจำวัน (Daily Handover Note) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    บันทึกส่งเวรประจำวัน (Daily Handover Note)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">กะเช้า -&gt; กะบ่าย</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed font-sans">
                <div className="flex items-start gap-2">
                  <Pin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950">ข้อความส่งต่อถึงแม่บ้านกะถัดไป:</p>
                    <p className="mt-0.5 text-amber-900/90">{handoverNote}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Big Emergency Shift Swap Action Button */}
            {isBeforeToday(selectedDate) ? (
              <button
                type="button"
                onClick={() => showToast('วันที่เลือกเป็นประวัติย้อนหลัง ไม่สามารถยื่นคำขอฉุกเฉินหรือสลับกะได้')}
                className="w-full min-h-[48px] rounded-2xl bg-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-60 mt-1"
                title="ไม่สามารถทำรายการย้อนหลังได้"
              >
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <span>ประวัติย้อนหลัง (ไม่สามารถขอเปลี่ยนกะได้)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShiftSwapReason('swap');
                  setIsShiftSwapModalOpen(true);
                }}
                className="w-full min-h-[48px] rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md cursor-pointer mt-1"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>
                  {isToday(selectedDate)
                    ? 'ขอเปลี่ยนกะหรือแจ้งฉุกเฉิน (Emergency Swap)'
                    : 'ขอยื่นเปลี่ยนกะหรือแจ้งลาล่วงหน้า (Advance Request)'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* ====================================================
            TAB 5: โปรไฟล์ส่วนตัว (Dedicated Profile View)
            Separated into its own dedicated clean tab
            ==================================================== */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-3.5 pb-2">
            {/* 1. Profile Hero Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0F172A]" />

              <div className="flex items-start justify-between pl-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-13 h-13 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center font-extrabold text-blue-900 text-lg shadow-2xs">
                      {staffInitials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-base font-extrabold text-slate-900 leading-tight">{staffName}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        หัวหน้าเวร
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{authUser?.email || 'housekeeping@keystay.com'}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      รหัส HK-001 • ประจำโซนชั้น 1 และ 2
                    </p>
                  </div>
                </div>

                <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>เข้าเวรอยู่</span>
                </span>
              </div>

              {/* Shift Timing Bar */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-800">กะเช้า (เวลาทำงาน)</span>
                </div>
                <span className="font-mono font-bold text-slate-900">07:00 - 15:30 น.</span>
              </div>
            </div>

            {/* 2. Today's Performance Metrics (API #94 Context) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    ผลงานรอบกะวันนี้ (Turnover Performance)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  ทันเวลา (On Track)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
                  <span className="text-[11px] text-slate-500">ห้องที่ทำเสร็จแล้ว</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{completedCount}</span>
                    <span className="text-xs text-slate-500 font-mono">/ {totalShiftRooms} ห้อง</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${shiftProgressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
                  <span className="text-[11px] text-slate-500">ความเร็วเฉลี่ย/ห้อง</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold font-mono text-emerald-600">~26</span>
                    <span className="text-xs text-slate-500">นาที</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">เกณฑ์มาตรฐาน 30 นาที</p>
                </div>
              </div>
            </div>

            {/* 3. Operational Helpers & Direct Contacts */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                ตัวช่วยหน้างาน & ติดต่อเร่งด่วน
              </h3>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => showToast('กำลังต่อสายไปยัง เคาน์เตอร์ต้อนรับส่วนหน้า (Front Desk เบอร์ 0)')}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors text-left group active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">โทรหาเคาน์เตอร์ฟร้อนท์ (Front Desk)</p>
                      <p className="text-[10px] text-slate-500">ประสานงานแขกเช็คอิน/เช็คเอาท์ด่วน</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-white text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold shadow-2xs">
                    กด 0
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(true)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors text-left group active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">สมุดติดต่อช่าง Outsource 24 ชม.</p>
                      <p className="text-[10px] text-slate-500">12 หมวดหมู่ช่างแอร์ ประปา ไฟฟ้า กุญแจ</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSOPModalOpen(true)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors text-left group active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">คู่มือมาตรฐานการตรวจห้อง (SOP Guide)</p>
                      <p className="text-[10px] text-slate-500">เกณฑ์มาตรฐาน 4 หมวด 12 รายการ</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">12 ข้อ</span>
                </button>
              </div>
            </div>

            {/* 4. App Preferences (Shadcn Toggles) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                การตั้งค่าระบบ & การแจ้งเตือน
              </h3>

              <div className="flex flex-col divide-y divide-slate-100">
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-slate-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">เสียงแจ้งเตือนงานด่วน</p>
                      <p className="text-[10px] text-slate-500">ส่งเสียงเตือนเมื่อมีห้องเช็คเอาท์เร่งด่วน</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSoundAlertEnabled((prev) => !prev);
                      showToast(!isSoundAlertEnabled ? ' เปิดเสียงแจ้งเตือนงานด่วนแล้ว' : ' ปิดเสียงแจ้งเตือนแล้ว');
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSoundAlertEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isSoundAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-slate-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">โหมดถนอมสายตา (Eye Care)</p>
                      <p className="text-[10px] text-slate-500">ปรับโทนแสงอุ่น สบายตาเวลาตรวจห้องแสงน้อย</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEyeCareMode((prev) => !prev);
                      showToast(!isEyeCareMode ? ' เปิดโหมดถนอมสายตาแล้ว' : ' ปิดโหมดถนอมสายตาแล้ว');
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEyeCareMode ? 'bg-[#0F172A]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEyeCareMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 5. RBAC Security Notice & Full-Width Logout Button */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-700">สิทธิ์ผู้ใช้งาน: HOUSEKEEPING</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Keystay Mobile v1.0</span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                ระบบรักษาความปลอดภัยแบบ Dual-Tier RBAC: พนักงานแม่บ้านได้รับสิทธิ์ปฏิบัติการทำความสะอาดและดูเบอร์ช่างฉุกเฉิน (Read-Only Master Data)
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[48px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer mt-1"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>ออกจากระบบ (ส่งมอบเวรประจำวัน)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          BOTTOM NAVIGATION BAR (5 Tabs Mobile Layout)
          ======================================================== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="max-w-md mx-auto h-16 px-1 flex items-center justify-around">
          {/* Tab 1: งานของฉัน */}
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'tasks' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CheckCircle2
              className={`w-5 h-5 ${activeTab === 'tasks' ? 'text-slate-900 stroke-[2.5]' : ''}`}
            />
            <span className="text-[10px] mt-1">งานของฉัน</span>
          </button>

          {/* Tab 2: บอร์ด */}
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'kanban' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers
              className={`w-5 h-5 ${activeTab === 'kanban' ? 'text-slate-900 stroke-[2.5]' : ''}`}
            />
            <span className="text-[10px] mt-1">บอร์ด</span>
          </button>

          {/* Tab 3: สถานะห้อง */}
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'status' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building
              className={`w-5 h-5 ${activeTab === 'status' ? 'text-slate-900 stroke-[2.5]' : ''}`}
            />
            <span className="text-[10px] mt-1">สถานะห้อง</span>
          </button>

          {/* Tab 4: ตารางกะ */}
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'schedule' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar
              className={`w-5 h-5 ${activeTab === 'schedule' ? 'text-slate-900 stroke-[2.5]' : ''}`}
            />
            <span className="text-[10px] mt-1">ตารางกะ</span>
          </button>

          {/* Tab 5: โปรไฟล์ */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'profile' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User
              className={`w-5 h-5 ${activeTab === 'profile' ? 'text-slate-900 stroke-[2.5]' : ''}`}
            />
            <span className="text-[10px] mt-1">โปรไฟล์</span>
          </button>
        </div>
      </nav>
    </>
  )}

      {/* ========================================================
          MODAL 1: REPORT MAINTENANCE BOTTOM SHEET DRAWER
          Matches stitch_keystay_housekeeping_portal 2/report_maintenance_modal
          ======================================================== */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl max-h-[88vh] overflow-y-auto p-4 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 border-t border-slate-200">
            {/* Drawer Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                  maintenanceCategory === 'lost_and_found'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {maintenanceCategory === 'lost_and_found' ? <Briefcase className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {maintenanceCategory === 'lost_and_found' ? 'บันทึกของที่ลูกค้าลืมไว้ (Lost & Found)' : 'แจ้งปัญหา / ส่งซ่อมบำรุง'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ห้อง {maintenanceRoom} • {roomStatusList.find((r) => r.roomNumber === maintenanceRoom)?.type || 'ห้องพัก'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMaintenanceModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Issue Type Grid */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">ประเภทปัญหา</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceCategory('broken')}
                  className={`p-2.5 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                    maintenanceCategory === 'broken'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold">ชำรุด/แตกหัก</span>
                  <span className="text-[10px] opacity-75">เฟอร์นิเจอร์, ผนัง, สุขภัณฑ์</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMaintenanceCategory('electric')}
                  className={`p-2.5 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                    maintenanceCategory === 'electric'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold">เครื่องใช้ไฟฟ้า</span>
                  <span className="text-[10px] opacity-75">แอร์, ทีวี, ตู้เย็น, โคมไฟ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMaintenanceCategory('missing')}
                  className={`p-2.5 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                    maintenanceCategory === 'missing'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Bed className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold">ของหาย/ไม่ครบ</span>
                  <span className="text-[10px] opacity-75">รีโมท, แก้ว, ผ้าเช็ดตัว</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMaintenanceCategory('sanitary')}
                  className={`p-2.5 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                    maintenanceCategory === 'sanitary'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">สุขอนามัย/กลิ่น</span>
                  <span className="text-[10px] opacity-75">คราบหนัก, กลิ่นไม่พึงประสงค์</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMaintenanceCategory('lost_and_found')}
                  className={`col-span-2 p-2.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                    maintenanceCategory === 'lost_and_found'
                      ? 'bg-amber-900 text-white border-amber-900'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-bold block">ของที่ลูกค้าลืมไว้ (Lost & Found)</span>
                      <span className="text-[10px] opacity-75">ส่งมอบ Front Counter • นับถอยหลัง 7 วัน</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200/50 text-amber-800 font-bold">บันทึกป้องกันทุจริต</span>
                </button>
              </div>
            </div>

            {/* Lost & Found Extra Fields */}
            {maintenanceCategory === 'lost_and_found' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">สถานที่จัดเก็บของ (Storage Location)</label>
                  <input
                    type="text"
                    value={lostAndFoundLocation}
                    onChange={(e) => setLostAndFoundLocation(e.target.value)}
                    placeholder="เช่น ตู้เซฟ Front Counter, ห้องเก็บของชั้น 1"
                    className="w-full p-2 rounded-lg bg-white border border-amber-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">ระยะเวลานับถอยหลังเก็บรักษา (วัน)</label>
                  <div className="flex gap-2">
                    {[7, 14, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setLostAndFoundDays(d)}
                        className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                          lostAndFoundDays === d
                            ? 'bg-amber-800 text-white border-amber-800'
                            : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {d} วัน {d === 7 ? '(ทั่วไป)' : d === 30 ? '(ของมีค่า)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}


            

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">
                {maintenanceCategory === 'lost_and_found' ? 'คำอธิบายของที่ลืมไว้ (Lost & Found)' : 'คำอธิบายอาการชำรุด'}
              </label>
              <textarea
                rows={3}
                value={maintenanceDesc}
                onChange={(e) => setMaintenanceDesc(e.target.value)}
                placeholder={
                  maintenanceCategory === 'lost_and_found'
                    ? 'พิมพ์ระบุของที่ลืม เช่น หูฟังบลูทูธสีดำ, กระเป๋าสตางค์, สายชาร์จ...'
                    : 'พิมพ์ระบุอาการชำรุด เช่น แอร์มีน้ำหยด, ปลั๊กไฟหลวม, ลูกบิดประตูชำรุด...'
                }
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>

            {/* Section 4: Cloudflare R2 Upload Simulation */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">แนบรูปถ่ายหลักฐาน</span>
                <span className="text-[10px] font-mono text-blue-600 flex items-center gap-1">
                  <CloudUpload className="w-3 h-3" /> จัดเก็บภาพถ่ายส่วนกลาง
                </span>
              </div>
              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Camera className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">ถ่ายรูป หรือ แนบไฟล์</p>
                  <p className="text-[10px] text-slate-400">รองรับภาพถ่าย JPEG, PNG บันทึกอัตโนมัติ</p>
                </div>
              </div>
            </div>

            {/* Section 5: Outsource Direct Callout (Boon's Integration) */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-amber-700" />
                <div>
                  <p className="text-xs font-bold text-amber-900">ต้องการช่างภายนอกด่วน?</p>
                  <p className="text-[10px] text-amber-700">ดูเบอร์ช่างแอร์ ประปา ไฟฟ้า 24 ชม.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMaintenanceModalOpen(false);
                  setIsContactModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 active:scale-95"
              >
                <span>โทรหาช่าง</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMaintenanceModalOpen(false)}
                className="min-h-[44px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitMaintenance}
                className="min-h-[44px] px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                บันทึกลงระบบทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ROOM STATUS DETAIL DRAWER
          ======================================================== */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-2xl shadow-xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200 border-t border-slate-200">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-slate-900">
                    ห้อง {selectedRoomDetail.roomNumber}
                  </span>
                  <span className="text-xs text-slate-500">
                    ชั้น {selectedRoomDetail.floor} • {selectedRoomDetail.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{selectedRoomDetail.notes}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomDetail(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If room is in maintenance, offer direct call button */}
            {selectedRoomDetail.status === 'maintenance' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-900">สถานะ: ชำรุด/งดใช้งาน</p>
                  <p className="text-[10px] text-rose-700">มีเบอร์ช่างแอร์ภายนอกสแตนด์บาย 24 ชม.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoomDetail(null);
                    setIsContactModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <span>โทรหาช่างแอร์</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedRoomDetail(null)}
              className="w-full min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: SHIFT SWAP & EMERGENCY REQUEST MODAL
          Matches hotel SOP (Supervisor Review & Approval Workflow)
          ======================================================== */}
      {isShiftSwapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ขอสลับกะหรือแจ้งลาฉุกเฉิน</h3>
                  <p className="text-[11px] text-slate-500">ระบบส่งคำขอให้ Supervisor ประจำกะอนุมัติ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftSwapModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Type Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">ประเภทคำขอ</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'swap', label: 'สลับกะ' },
                  { id: 'leave_urgent', label: 'ลาฉุกเฉิน' },
                  { id: 'cover', label: 'เสริมเวร' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setShiftSwapReason(type.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      shiftSwapReason === type.id
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Staff Member */}
            {shiftSwapReason === 'swap' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">เพื่อนร่วมงานที่ต้องการสลับกะด้วย</label>
                <select
                  value={shiftSwapTargetStaff}
                  onChange={(e) => setShiftSwapTargetStaff(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                >
                  <option value="มาลี เรืองโรจน์">มาลี เรืองโรจน์ (กะเช้า • ประจำโซนชั้น 3-4)</option>
                  <option value="วิชัย แซ่ตั้ง">วิชัย แซ่ตั้ง (กะดึก • ส่วนกลาง & ฉุกเฉิน)</option>
                  <option value="น้องแพร สดใส">น้องแพร สดใส (กะบ่าย • 14:30 - 23:00)</option>
                </select>
              </div>
            )}

            {/* Date Details */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>วันและรอบกะที่เลือก:</span>
                <span className="font-bold text-slate-900">
                  {formatThaiFullDate(selectedDate)} ({selectedShiftPill === 'morning' ? 'กะเช้า 07:00-15:30' : selectedShiftPill === 'afternoon' ? 'กะบ่าย 14:30-23:00' : 'กะดึก 23:00-07:00'})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>โซนที่รับผิดชอบ:</span>
                <span className="font-semibold text-slate-900">โซน 1 (ชั้น 1 - 2 รวม 10 ห้อง)</span>
              </div>
            </div>

            {/* Reason Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">เหตุผลหรือบันทึกเพิ่มเติม (ถึง Supervisor)</label>
              <textarea
                value={shiftSwapNotes}
                onChange={(e) => setShiftSwapNotes(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ติดธุระด่วนทางบ้าน ตกลงสลับเวรกับคุณสมชายเรียบร้อยแล้ว..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A] placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                ตามระเบียบโรงแรม (SOP UAT-HK06): การสลับกะจะมีผลสมบูรณ์เมื่อ Supervisor ประจำกะกดอนุมัติในระบบ เพื่อให้มั่นใจว่าการครอบคลุมพื้นที่ (Zone Coverage) ไม่ต่ำกว่า 100%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsShiftSwapModalOpen(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsShiftSwapModalOpen(false);
                  showToast('ส่งคำขอสลับกะไปยัง Supervisor เรียบร้อยแล้ว (รอการอนุมัติในระบบ)');
                }}
                className="py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                ยืนยันส่งคำขอ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: OUTSOURCE QUICK CONTACT MODAL (Boon's Core UI)
          ======================================================== */}
      <QuickContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      {/* ========================================================
          MODAL 4: HOUSEKEEPING SOP GUIDE (คู่มือมาตรฐานการปฏิบัติงาน 12 ข้อ)
          ======================================================== */}
      {isSOPModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-200">
            
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden" />

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      คู่มือมาตรฐานการตรวจห้อง (SOP Guide)
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      12 ข้อมาตรฐาน
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    เกณฑ์ปฏิบัติงานมาตรฐาน 4 หมวดหมู่สำหรับแม่บ้านโรงแรม Keystay
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSOPModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: 4 Categories 12 Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Category 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                    <DoorOpen className="w-3.5 h-3.5" />
                  </span>
                  <span>หมวดที่ 1: ขั้นตอนก่อนเข้าห้องและสำรวจ (Entry & Assessment)</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700 pl-4 sm:pl-8">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-indigo-700 mr-1.5">1. เคาะประตู 3 ครั้งพร้อมขานชื่อ:</span>
                    <span>เคาะประตู 3 ครั้งพร้อมขาน "Housekeeping ขออนุญาตทำความสะอาดค่ะ" เสมอเพื่อความสุภาพและความปลอดภัย</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-indigo-700 mr-1.5">2. เปิดม่านระบายอากาศ + ตรวจระบบไฟ:</span>
                    <span>เปิดผ้าม่านระบายกลิ่นอับ ทดสอบเปิดไฟทุกดวง รีโมทแอร์ และทีวีว่าทำงานปกติ</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-indigo-700 mr-1.5">3. ตรวจมินิบาร์และของที่ลูกค้าลืมไว้ (Lost & Found):</span>
                    <span>เปิดตู้เย็นเช็คมินิบาร์ทันทีเพื่อแจ้ง Front Desk คืนมัดจำแขก และกวาดสายตาตรวจของลืมใต้เตียง/ตู้เสื้อผ้า หากพบให้ถ่ายรูปส่งระบบทันที</span>
                  </div>
                </div>
              </div>

              {/* Category 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span>หมวดที่ 2: การรื้อถอนและทำความสะอาดลึก (Stripping & Cleaning)</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700 pl-4 sm:pl-8">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-amber-700 mr-1.5">4. รื้อผ้าปูเตียงและผ้าเช็ดตัวเก่า:</span>
                    <span>ปลดปลอกหมอน ผ้าปู ผ้าเช็ดตัวลงถุงผ้า ห้ามวางผ้าใช้แล้วบนพื้นห้องเด็ดขาด</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-amber-700 mr-1.5">5. ฉีดน้ำยาฆ่าเชื้อห้องน้ำ 3-5 นาที:</span>
                    <span>ฉีดน้ำยาชักโครก อ่างล้างหน้า ผนัง และพื้น ปล่อยให้น้ำยาทำปฏิกิริยาก่อนเริ่มขัดล้าง</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-amber-700 mr-1.5">6. เก็บขยะทุกจุดและเช็ดถังขยะ:</span>
                    <span>รวบถุงขยะทุกจุด ทิ้งลงถังใหญ่ เช็ดทำความสะอาดถัง และสวมถุงขยะใหม่ทุกครั้ง</span>
                  </div>
                </div>
              </div>

              {/* Category 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                    <Bed className="w-3.5 h-3.5" />
                  </span>
                  <span>หมวดที่ 3: การเซ็ตอัปห้องและเติมสิ่งอำนวยความสะดวก (Setup & Amenities)</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700 pl-4 sm:pl-8">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-emerald-700 mr-1.5">7. ปูเตียงตึงเปรี๊ยะ (Hospital Corners):</span>
                    <span>ดึงผ้าปูเตียงให้ตึงเรียบ พับมุมสามเหลี่ยม ตบหมอนให้ฟู ไม่มีรอยยับหรือเส้นผม</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-emerald-700 mr-1.5">8. เช็ดห้องน้ำแห้งสนิท (Zero Moisture):</span>
                    <span>ขัดล้างกระจกใสไม่มีคราบน้ำ เช็ดพื้นและสุขภัณฑ์ให้แห้งสนิท ปิดฝาชักโครก</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-emerald-700 mr-1.5">9. เซ็ตของใช้และเติมมินิบาร์ครบถ้วน:</span>
                    <span>เติมน้ำดื่ม 2 ขวด, ผ้าเช็ดตัว 2 ผืน, สบู่, แชมพู, แปรงสีฟัน และจัดของในตู้เย็นให้ครบเซ็ต</span>
                  </div>
                </div>
              </div>

              {/* Category 4 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <span>หมวดที่ 4: การตรวจสอบขั้นสุดท้ายและความปลอดภัย (Final Inspection & Lock)</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700 pl-4 sm:pl-8">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-purple-700 mr-1.5">10. กวาดและถูพื้นถอยหลังออกจากห้อง:</span>
                    <span>กวาดและถูพื้นจากมุมในสุด ถอยหลังออกทางประตู เพื่อไม่ให้เกิดรอยเท้าบนพื้นสะอาด</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-purple-700 mr-1.5">11. ตรวจจุดสัมผัส + ฉีดสเปรย์ปรับอากาศ:</span>
                    <span>เช็ดแอลกอฮอล์ที่ลูกบิด สวิตช์ไฟ ดึงผ้าม่านให้สวยงาม ฉีดสเปรย์กลิ่นโรงแรม</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                    <span className="font-bold text-purple-700 mr-1.5">12. ล็อคห้องและกดเปลี่ยนสถานะในแอป:</span>
                    <span>ดึงประตูล็อคสนิท และกดเปลี่ยนสถานะห้องเป็น "พร้อมขาย (Available)" ในแอป Keystay</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Acknowledgement */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
              <button
                onClick={() => {
                  setIsSOPModalOpen(false);
                  showToast('รับทราบและยืนยันมาตรฐานการปฏิบัติงาน 12 ข้อเรียบร้อยแล้ว');
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>ฉันได้อ่านและเข้าใจมาตรฐานการปฏิบัติงานแล้ว</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================
          MODAL 5: QUICK MINIBAR CHECK (Express 30-sec Checkout Check)
          แยกอิสระเพื่อแจ้ง Front Desk ขึ้นบิล / คืนมัดจำแขกทันที
          โดยไม่ต้องรอทำความสะอาดเสร็จทั้ง 12 ข้อ
          ======================================================== */}
      {isQuickMinibarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden" />

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      ตรวจมินิบาร์ด่วน (ห้อง {quickMinibarRoom})
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                      30 วิ คืนมัดจำ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    แจ้ง Front Desk ทันที เพื่อขึ้นบิลหรือคืนเงินมัดจำแขก
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickMinibarModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* Option A: One-Tap 100% Intact / No Consumption */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    กรณีแขกไม่ได้ดื่ม/ทานอะไรเลย
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    แนะนำ (เร็วกว่า)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  หากมินิบาร์ครบสมบูรณ์ทุกรายการ ไม่มีการเปิดทาน สามารถกดยืนยันปุ่มนี้เพื่อแจ้ง Front Desk ให้คืนเงินมัดจำแขกได้ทันทีใน 1 วินาที
                </p>
                <button
                  type="button"
                  onClick={() => handleSendMinibarCheck(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ของครบ 100% (อนุมัติคืนมัดจำทันที)</span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                <div className="flex-1 h-px bg-slate-200" />
                <span>หรือหากมีการบริโภค / ของหาย</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Option B: Itemized Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">
                  ระบุจำนวนชิ้นที่เปิดทานหรือสูญหาย:
                </label>
                <div className="space-y-1.5">
                  {STANDARD_MINIBAR_CATALOG.map((item) => {
                    const count = quickMinibarCounts[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ฿{item.price} / {item.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setQuickMinibarCounts((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm active:scale-90 hover:bg-slate-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-xs text-slate-900">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuickMinibarCounts((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] || 0) + 1,
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm active:scale-90 hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer with Total and Submit */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block">ยอดรวมที่ต้องเก็บเงิน:</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  ฿
                  {STANDARD_MINIBAR_CATALOG.reduce(
                    (sum, item) => sum + (quickMinibarCounts[item.id] || 0) * item.price,
                    0
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSendMinibarCheck(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>ส่งยอดแจ้ง Front Desk ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 4: Mandatory Before Photo (รูปถ่ายสภาพห้องก่อนทำความสะอาด)
          ==================================================== */}
      {isBeforePhotoModalOpen && targetPhotoTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    ถ่ายภาพรวมห้องก่อนทำความสะอาด (ห้อง {targetPhotoTask.roomNumber})
                  </h2>
                  <p className="text-[11px] text-amber-800 font-medium">
                    * บังคับถ่ายภาพสภาพห้องก่อนเข้าทำ เพื่อเป็นหลักฐานความโปร่งใส
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBeforePhotoModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {capturedBeforePhoto ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 bg-slate-950 aspect-video flex items-center justify-center group">
                    <img
                      src={capturedBeforePhoto}
                      alt="Before cleaning"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>สภาพก่อนทำความสะอาด (Before)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCapturedBeforePhoto(null)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ถ่ายใหม่ / เปลี่ยนรูป</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors active:scale-99">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setCapturedBeforePhoto(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                        แตะตรงนี้เพื่อเปิดกล้องมือถือถ่ายรูป
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        หรือเลือกรูปถ่ายสภาพห้องก่อนทำจากอัลบั้ม
                      </span>
                    </div>
                  </label>

                  {/* Quick Preset Demo Photo for PC testing */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 block mb-2">
                      (สำหรับการทดสอบบนคอมพิวเตอร์ / ไม่มีกล้อง)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCapturedBeforePhoto(
                          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
                        )
                      }
                      className="py-1.5 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>ใช้รูปตัวอย่างจำลองสภาพห้อง</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">คำแนะนำมาตรฐาน:</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  • ยืนถ่ายจากมุมประตูห้องพัก ให้เห็นสภาพรวมของเตียงนอน พื้น และโต๊ะวางของ
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  • ภาพถ่ายจะถูกประทับเวลาและเก็บไว้ในระบบเพื่อยืนยันกับลูกค้า
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsBeforePhotoModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 active:scale-98 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!capturedBeforePhoto}
                onClick={handleConfirmStartWithBeforePhoto}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ${
                  capturedBeforePhoto
                    ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] text-white active:scale-98 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันภาพถ่าย & เข้าสู่รายการเช็คลิสต์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 5: Mandatory After Photo (รูปถ่ายสภาพห้องหลังทำความสะอาดเสร็จ)
          ==================================================== */}
      {isAfterPhotoModalOpen && targetPhotoTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    ถ่ายภาพยืนยันห้องหลังทำเสร็จ (ห้อง {targetPhotoTask.roomNumber})
                  </h2>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    * บันทึกสภาพห้องหลังทำความสะอาดเรียบร้อย ก่อนปลดปล่อยห้องขาย
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAfterPhotoModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {capturedAfterPhoto ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-950 aspect-video flex items-center justify-center group">
                    <img
                      src={capturedAfterPhoto}
                      alt="After cleaning"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>สภาพหลังทำเสร็จสมบูรณ์ (After)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCapturedAfterPhoto(null)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ถ่ายใหม่ / เปลี่ยนรูป</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-400 bg-emerald-50/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors active:scale-99">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setCapturedAfterPhoto(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                        แตะตรงนี้เพื่อเปิดกล้องถ่ายภาพห้องที่ทำเสร็จแล้ว
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        ถ่ายภาพเตียงตึง ห้องน้ำแห้ง และของใช้ครบเซ็ต
                      </span>
                    </div>
                  </label>

                  {/* Quick Preset Demo Photo for PC testing */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 block mb-2">
                      (สำหรับการทดสอบบนคอมพิวเตอร์ / ไม่มีกล้อง)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCapturedAfterPhoto(
                          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'
                        )
                      }
                      className="py-1.5 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>ใช้รูปตัวอย่างห้องสะอาดพร้อมขาย</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <span className="font-bold block">เกณฑ์การตรวจรับห้อง 100%:</span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ✓ เตียงนอนดึงตึงเปรี๊ยะ ไม่มีรอยยับหรือเส้นผม
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ✓ พื้นและห้องน้ำแห้งสนิท ไร้คราบน้ำและกลิ่นอับ
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ✓ ของใช้และมินิบาร์จัดวางตามตำแหน่งมาตรฐานครบถ้วน
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsAfterPhotoModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 active:scale-98 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                กลับไปเช็คลิสต์
              </button>
              <button
                type="button"
                disabled={!capturedAfterPhoto}
                onClick={handleConfirmCompleteWithAfterPhoto}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ${
                  capturedAfterPhoto
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันตรวจรับ & ปลดห้องพร้อมขาย (Available)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 6: View Evidence Comparison (ดูรูปเปรียบเทียบก่อน-หลังทำ)
          ==================================================== */}
      {isEvidenceModalOpen && selectedEvidenceRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      หลักฐานภาพถ่ายตรวจรับห้อง {selectedEvidenceRoom.roomNumber}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      พร้อมขาย
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    เสร็จสิ้นเมื่อ {selectedEvidenceRoom.finishedAt} • ผู้ตรวจรับ: {selectedEvidenceRoom.inspector}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Comparison Grid (Before vs After) */}
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>1. สภาพก่อนทำ (Before)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ก่อนเริ่มงาน</span>
                  </div>
                  <div className="rounded-2xl overflow-hidden border-2 border-amber-200 bg-slate-900 aspect-4/3 flex items-center justify-center">
                    {selectedEvidenceRoom.beforePhotoUrl ? (
                      <img
                        src={selectedEvidenceRoom.beforePhotoUrl}
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-xs block">ไม่มีภาพถ่ายก่อนทำ</span>
                        <span className="text-[10px] text-slate-500 block">(บันทึกแบบเร่งด่วน)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* After Photo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>2. สภาพหลังทำเสร็จ (After)</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">ตรวจรับผ่าน</span>
                  </div>
                  <div className="rounded-2xl overflow-hidden border-2 border-emerald-300 bg-slate-900 aspect-4/3 flex items-center justify-center">
                    {selectedEvidenceRoom.afterPhotoUrl ? (
                      <img
                        src={selectedEvidenceRoom.afterPhotoUrl}
                        alt="After"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-1 text-emerald-500 opacity-50" />
                        <span className="text-xs block">ตรวจรับเสร็จสมบูรณ์</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Anti-Dispute Verification Note */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>บันทึกความโปร่งใส (Dispute Prevention Record):</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  ภาพถ่ายชุดนี้ถูกบันทึกและผูกกับประวัติห้องพักในระบบ D1 เรียบร้อยแล้ว สามารถใช้เปิดยืนยันกับลูกค้าหน้าเคาน์เตอร์ Front Desk ได้ทันทีหากมีข้อโต้แย้งเรื่องความสะอาด
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="py-2 px-5 rounded-xl bg-[#0F172A] hover:bg-slate-800 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HousekeepingPortalPage;

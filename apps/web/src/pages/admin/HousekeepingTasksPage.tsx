import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch, getAuthToken, apiUrl } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  ClipboardCheck,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================
export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  assignedTo?: string | null;
  assignedStaff?: {
    id: string;
    name: string;
    zone?: string | null;
  } | null;
  taskType: 'checkout_clean' | 'daily_clean' | 'deep_clean' | 'inspection';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string | null;
  scheduledDate: string;
  startedAt?: string | null;
  completedAt?: string | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  inspectionStatus?: 'passed' | 'pending_inspection' | 'needs_reclean';
  createdAt: string;
  updatedAt: string;
}

export interface RoomIssue {
  id: string;
  taskId?: string | null;
  roomId: string;
  roomNumber?: string | null;
  reportedBy?: {
    id: string;
    name: string;
  } | null;
  issueType: 'damage' | 'missing_item' | 'malfunction' | 'hygiene' | 'lost_and_found' | 'other';
  description: string;
  photoR2Key?: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'expired_claimed';
  storageLocation?: string | null;
  retentionDays?: number | null;
  receivedByName?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  sublabel?: string;
  zone: 'bedroom' | 'bathroom' | 'minibar' | 'final_inspection';
}

export interface TaskTemplate {
  id: string;
  name: string;
  taskType: 'checkout_clean' | 'deep_clean' | 'daily_clean' | 'inspection';
  defaultPriority: 'normal' | 'high' | 'urgent';
  estimatedMinutes: number;
  description: string;
  checklistItems?: ChecklistItem[];
  isActive: boolean;
}

// ============================================================================
// Fallback & Seed Data for Resilience
// ============================================================================
const SEED_TASKS: HousekeepingTask[] = [
  {
    id: 'hkt-001',
    roomId: 'rm-203',
    roomNumber: '203',
    assignedTo: 'hk-staff-001',
    assignedStaff: { id: 'hk-staff-001', name: 'สมชาย คลีน', zone: 'ชั้น 1-2' },
    taskType: 'checkout_clean',
    priority: 'urgent',
    status: 'in_progress',
    notes: 'แขกขอเช็คอินด่วน 14:00 น. เปลี่ยนผ้าปูและขัดห้องน้ำ',
    scheduledDate: '2026-09-26',
    startedAt: '2026-09-26T11:30:00Z',
    completedAt: null,
    beforePhotoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&auto=format&fit=crop&q=80',
    afterPhotoUrl: null,
    inspectionStatus: 'pending_inspection',
    createdAt: '2026-09-26T11:15:00Z',
    updatedAt: '2026-09-26T11:30:00Z',
  },
  {
    id: 'hkt-004',
    roomId: 'rm-101',
    roomNumber: '101',
    assignedTo: 'hk-staff-001',
    assignedStaff: { id: 'hk-staff-001', name: 'สมชาย คลีน', zone: 'ชั้น 1-2' },
    taskType: 'daily_clean',
    priority: 'normal',
    status: 'completed',
    notes: 'จัดเตียง เช็ดทำความสะอาดห้องน้ำ เติมน้ำดื่มและของใช้ครบถ้วน',
    scheduledDate: '2026-09-26',
    startedAt: '2026-09-26T08:45:00Z',
    completedAt: '2026-09-26T09:15:00Z',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&auto=format&fit=crop&q=80',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900&auto=format&fit=crop&q=80',
    inspectionStatus: 'passed',
    createdAt: '2026-09-26T08:00:00Z',
    updatedAt: '2026-09-26T09:15:00Z',
  },
  {
    id: 'hkt-005',
    roomId: 'rm-402',
    roomNumber: '402',
    assignedTo: 'hk-staff-002',
    assignedStaff: { id: 'hk-staff-002', name: 'มาลี เรืองโรจน์', zone: 'ชั้น 3-4' },
    taskType: 'checkout_clean',
    priority: 'high',
    status: 'completed',
    notes: 'ทำความสะอาดครบวงจร ฉีดพ่นฆ่าเชื้อและจัดเตียงใหม่พร้อมรับแขก',
    scheduledDate: '2026-09-26',
    startedAt: '2026-09-26T10:00:00Z',
    completedAt: '2026-09-26T10:42:00Z',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=900&auto=format&fit=crop&q=80',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=900&auto=format&fit=crop&q=80',
    inspectionStatus: 'passed',
    createdAt: '2026-09-26T09:45:00Z',
    updatedAt: '2026-09-26T10:42:00Z',
  },
  {
    id: 'hkt-003',
    roomId: 'rm-305',
    roomNumber: '305',
    assignedTo: 'hk-staff-002',
    assignedStaff: { id: 'hk-staff-002', name: 'มาลี เรืองโรจน์', zone: 'ชั้น 3-4' },
    taskType: 'deep_clean',
    priority: 'normal',
    status: 'in_progress',
    notes: 'ซักพรม ขัดระเบียง และเช็ดผ้าม่าน',
    scheduledDate: '2026-09-26',
    startedAt: '2026-09-26T09:30:00Z',
    completedAt: null,
    beforePhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&auto=format&fit=crop&q=80',
    afterPhotoUrl: null,
    inspectionStatus: 'pending_inspection',
    createdAt: '2026-09-26T08:30:00Z',
    updatedAt: '2026-09-26T09:30:00Z',
  },
  {
    id: 'hkt-002',
    roomId: 'rm-104',
    roomNumber: '104',
    assignedTo: 'hk-staff-001',
    assignedStaff: { id: 'hk-staff-001', name: 'สมชาย คลีน', zone: 'ชั้น 1-2' },
    taskType: 'checkout_clean',
    priority: 'high',
    status: 'assigned',
    notes: 'เปลี่ยนผ้าปูที่นอนและเติมมินิบาร์ให้ครบถ้วน',
    scheduledDate: '2026-09-26',
    startedAt: null,
    completedAt: null,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    inspectionStatus: 'pending_inspection',
    createdAt: '2026-09-26T10:00:00Z',
    updatedAt: '2026-09-26T10:15:00Z',
  },
];

const SEED_ISSUES: RoomIssue[] = [
  {
    id: 'iss-001',
    taskId: 'hkt-001',
    roomId: 'rm-205',
    roomNumber: '205',
    reportedBy: { id: 'hk-staff-001', name: 'สมชาย คลีน' },
    issueType: 'malfunction',
    description: 'เครื่องปรับอากาศมีเสียงหวีดและทำความเย็นช้า',
    photoR2Key: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=900&auto=format&fit=crop&q=80',
    severity: 'high',
    status: 'acknowledged',
    createdAt: '2026-09-25T14:00:00Z',
  },
  {
    id: 'iss-002',
    taskId: null,
    roomId: 'rm-404',
    roomNumber: '404',
    reportedBy: { id: 'hk-staff-002', name: 'มาลี เรืองโรจน์' },
    issueType: 'damage',
    description: 'ท่อน้ำใต้อ่างอาบน้ำรั่วซึมลงพื้นห้องน้ำ',
    photoR2Key: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=900&auto=format&fit=crop&q=80',
    severity: 'critical',
    status: 'open',
    createdAt: '2026-09-26T09:00:00Z',
  },
  {
    id: 'iss-003',
    taskId: 'hkt-004',
    roomId: 'rm-101',
    roomNumber: '101',
    reportedBy: { id: 'hk-staff-001', name: 'สมชาย คลีน' },
    issueType: 'missing_item',
    description: 'พบแว่นกันแดดสีดำตกอยู่ใต้โต๊ะทำงาน เก็บรักษาไว้ที่เคาน์เตอร์ส่วนกลาง',
    photoR2Key: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900&auto=format&fit=crop&q=80',
    severity: 'low',
    status: 'open',
    createdAt: '2026-09-26T09:10:00Z',
  },
];

const SEED_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tt-001',
    name: 'ทำความสะอาดหลัง Checkout มาตรฐาน',
    taskType: 'checkout_clean',
    defaultPriority: 'high',
    estimatedMinutes: 45,
    description: 'เปลี่ยนผ้าปูเตียง ทำความสะอาดห้องน้ำ เช็ดฝุ่น เปลี่ยนผ้าเช็ดตัว เติมสบู่และน้ำดื่ม',
    checklistItems: [
      { id: 'linen', label: 'เปลี่ยนผ้าปูที่นอน ปลอกหมอน และปลอกผ้านวมชุดใหม่', sublabel: 'ใช้ผ้าซักฆ่าเชื้อ สะอาด ไร้รอยเปื้อน และกลิ่นอับ', zone: 'bedroom' },
      { id: 'bedTuck', label: 'ดึงผ้าปูตึง ตบหมอนฟู จัดมุมเตียง 45 องศาสวยงาม', sublabel: 'มาตรฐานความตึงระดับโรงแรม เรียบกริบไร้รอยย่น', zone: 'bedroom' },
      { id: 'dusting', label: 'เช็ดฝุ่นโต๊ะข้างเตียง โต๊ะทำงาน หัวเตียง และโคมไฟ', sublabel: 'ใช้ผ้าไมโครไฟเบอร์ชุบน้ำยาเฉพาะ ไม่ทิ้งคราบ', zone: 'bedroom' },
      { id: 'floorClean', label: 'ดูดฝุ่น กวาด และถูพื้นห้องนอนรวมถึงใต้เตียง', sublabel: 'ตรวจเช็คไม่มีเศษเส้นผมหรือสิ่งสกปรกตกค้าง', zone: 'bedroom' },
      { id: 'toiletSanitize', label: 'ขัดล้างและฆ่าเชื้อโถสุขภัณฑ์ อ่างล้างหน้า และฝักบัว', sublabel: 'ใช้น้ำยาฆ่าเชื้อแบคทีเรียและเช็ดแห้งสนิท', zone: 'bathroom' },
      { id: 'glassMirror', label: 'เช็ดกระจกเงาและกระจกกั้นโซนเปียกใสไร้คราบน้ำ', sublabel: 'ไร้คราบสบู่ ละอองน้ำ และรอยนิ้วมือ', zone: 'bathroom' },
      { id: 'towelsReplace', label: 'จัดชุดผ้าเช็ดตัว ผ้าเช็ดหน้า และพรมเท้าเซ็ตใหม่', sublabel: 'พับวางเรียงตามตำแหน่งมาตรฐานโรงแรมครบชุด', zone: 'bathroom' },
      { id: 'amenitiesRefill', label: 'เติมสบู่ แชมพู ครีมนวด แปรงสีฟัน และหมวกคลุมผม', sublabel: 'เช็คซีลและแพ็กเกจจิ้งสมบูรณ์ วางบนถาดอะเมนิตี้', zone: 'bathroom' },
      { id: 'minibarRefill', label: 'ตรวจเช็คและเติมมินิบาร์ครบเซ็ตแล้ว (พร้อมปล่อยห้อง)', sublabel: 'เครื่องดื่ม ขนมขบเคี้ยวในตู้เย็น และเบียร์ครบจำนวนตามมาตรฐาน', zone: 'minibar' },
      { id: 'waterKettle', label: 'ล้างแก้วน้ำ กาน้ำร้อน และเติมน้ำดื่ม Keystay 2 ขวด', sublabel: 'แก้วคว่ำบนถาดรองสะอาดพร้อมฝาครอบแก้ว', zone: 'minibar' },
      { id: 'trashEmptied', label: 'เทถังขยะและใส่ถุงขยะใหม่ทุกจุด (ห้องนอน & ห้องน้ำ)', sublabel: 'เช็ดถังขยะให้สะอาดและแห้งสนิททั้งภายนอกและภายใน', zone: 'final_inspection' },
      { id: 'acRemoteSpray', label: 'ทดสอบแอร์ ทีวี ปิดผ้าม่าน และฉีดสเปรย์ปรับอากาศ', sublabel: 'กลิ่นหอมสะอาดสดชื่น บรรยากาศพร้อมต้อนรับแขกใหม่', zone: 'final_inspection' },
    ],
    isActive: true,
  },
  {
    id: 'tt-002',
    name: 'ทำความสะอาดประจำวัน',
    taskType: 'daily_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 20,
    description: 'จัดเตียง ทำความสะอาดห้องน้ำ เติมของใช้ในห้อง เก็บขยะ',
    checklistItems: [
      { id: 'stayover_bed', label: 'จัดเตียงและดึงผ้าปูที่นอนให้ตึงเรียบร้อย', sublabel: 'จัดหมอนและผ้าห่มให้เป็นระเบียบ', zone: 'bedroom' },
      { id: 'stayover_bath', label: 'เช็ดทำความสะอาดอ่างล้างหน้า โถสุขภัณฑ์ และเปลี่ยนผ้าเช็ดตัว', sublabel: 'เติมสบู่และแชมพูที่พร่อง', zone: 'bathroom' },
      { id: 'stayover_trash', label: 'เก็บขยะและเปลี่ยนถุงขยะใหม่ทุกจุด', sublabel: 'ทั้งในห้องนอนและห้องน้ำ', zone: 'final_inspection' },
      { id: 'stayover_water', label: 'เติมน้ำดื่ม Keystay ประจำวัน 2 ขวด', sublabel: 'วางคู่กับแก้วน้ำสะอาด', zone: 'minibar' },
    ],
    isActive: true,
  },
  {
    id: 'tt-003',
    name: 'Deep Clean รายเดือน',
    taskType: 'deep_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 120,
    description: 'ทำความสะอาดทุกซอก เช็ดกระจก ซักผ้าม่าน ทำความสะอาดเครื่องปรับอากาศ ขัดระเบียง',
    checklistItems: [
      { id: 'deep_curtain', label: 'ซักและดูดฝุ่นผ้าม่านทั้งห้อง', sublabel: 'ตรวจเช็ครางม่านและตัวเกี่ยว', zone: 'bedroom' },
      { id: 'deep_carpet', label: 'ซักพรมและดูดไรฝุ่นที่นอนอย่างละเอียด', sublabel: 'ใช้น้ำยาซักพรมฆ่าเชื้อโรค', zone: 'bedroom' },
      { id: 'deep_ac', label: 'ถอดล้างแผ่นกรองเครื่องปรับอากาศและเช็ดหน้ากากแอร์', sublabel: 'เช็คระบบระบายน้ำทิ้ง', zone: 'bedroom' },
      { id: 'deep_balcony', label: 'ขัดล้างพื้นระเบียงและเช็ดกระจกภายนอก', sublabel: 'เช็ดราวกันตกและโต๊ะระเบียง', zone: 'final_inspection' },
      { id: 'deep_grout', label: 'ขัดคราบยาแนวและกระเบื้องห้องน้ำทั้งห้อง', sublabel: 'ขจัดคราบหินปูนและตะกรัน', zone: 'bathroom' },
    ],
    isActive: true,
  },
  {
    id: 'tt-004',
    name: 'ตรวจสอบห้องก่อน Check-in',
    taskType: 'inspection',
    defaultPriority: 'urgent',
    estimatedMinutes: 15,
    description: 'ตรวจอุปกรณ์ไฟฟ้า เช็คห้องน้ำ ตรวจมินิบาร์ ตรวจความเรียบร้อยและฉีดสเปรย์ปรับอากาศ',
    checklistItems: [
      { id: 'insp_elec', label: 'ทดสอบระบบไฟฟ้า แอร์ ทีวี และคีย์การ์ด', sublabel: 'ไฟติดครบทุกดวง รีโมทใช้งานได้', zone: 'bedroom' },
      { id: 'insp_plumb', label: 'ตรวจเช็คน้ำไหลแรง ท่อไม่ตัน ชักโครกกดทำงานปกติ', sublabel: 'ไม่มีน้ำรั่วซึม', zone: 'bathroom' },
      { id: 'insp_minibar', label: 'ตรวจเช็คสต็อกมินิบาร์และวันหมดอายุสินค้า', sublabel: 'สินค้าเรียงสวยงามตรงป้ายราคา', zone: 'minibar' },
      { id: 'insp_scent', label: 'ตรวจกลิ่นอับและความสะอาด ฉีดสเปรย์ปรับอากาศ', sublabel: 'อุณหภูมิห้อง 24 องศาพร้อมรับแขก', zone: 'final_inspection' },
    ],
    isActive: true,
  },
];

const EMPTY_TEMPLATE_FORM: Omit<TaskTemplate, 'id'> = {
  name: '',
  taskType: 'checkout_clean',
  defaultPriority: 'normal',
  estimatedMinutes: 30,
  description: '',
  checklistItems: [],
  isActive: true,
};

const ITEMS_PER_PAGE = 10;

// ============================================================================
// Main Page Component
// ============================================================================
export const HousekeepingTasksPage: React.FC = () => {
  const { t, language } = useTranslation();
  const isEn = language === 'en';

  // Tabs
  const [activeTab, setActiveTab] = useState<'inspection' | 'issues' | 'templates'>('inspection');
  const [loading, setLoading] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Data states
  const [tasks, setTasks] = useState<HousekeepingTask[]>(SEED_TASKS);
  const [issues, setIssues] = useState<RoomIssue[]>(SEED_ISSUES);
  const [templates, setTemplates] = useState<TaskTemplate[]>(SEED_TEMPLATES);

  // Tab 1 Filters & Pagination
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [taskPage, setTaskPage] = useState(1);

  // Tab 2 Filters & Pagination
  const [issueSearch, setIssueSearch] = useState('');
  const [issueSeverityFilter, setIssueSeverityFilter] = useState('all');
  const [issueStatusFilter, setIssueStatusFilter] = useState('all');
  const [issuePage, setIssuePage] = useState(1);

  // Tab 3 Filters & Pagination
  const [tplSearch, setTplSearch] = useState('');
  const [tplTypeFilter, setTplTypeFilter] = useState('all');
  const [tplPage, setTplPage] = useState(1);

  // Modals
  const [selectedTaskForZoom, setSelectedTaskForZoom] = useState<HousekeepingTask | null>(null);
  const [selectedIssueForZoom, setSelectedIssueForZoom] = useState<RoomIssue | null>(null);
  const [isEnlargedZoom, setIsEnlargedZoom] = useState<boolean>(false);
  const [activePhotoInModal, setActivePhotoInModal] = useState<'before' | 'after' | 'both'>('both');

  // Template Form Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateModalTab, setTemplateModalTab] = useState<'general' | 'checklist'>('general');
  const [editTemplate, setEditTemplate] = useState<TaskTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<Omit<TaskTemplate, 'id'>>(EMPTY_TEMPLATE_FORM);
  const [deleteTargetTemplate, setDeleteTargetTemplate] = useState<TaskTemplate | null>(null);

  // ============================================================================
  // API Fetchers
  // ============================================================================
  const fetchHousekeepingData = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch Tasks
      const tasksRes = await fetch(apiUrl('/api/housekeeping/tasks'), { headers }).catch(() => null);
      if (tasksRes && tasksRes.ok) {
        const json = await tasksRes.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setTasks(json.data);
          setIsOffline(false);
        }
      }

      // 2. Fetch Issues
      const issuesRes = await fetch(apiUrl('/api/housekeeping/issues'), { headers }).catch(() => null);
      if (issuesRes && issuesRes.ok) {
        const json = await issuesRes.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setIssues(json.data);
        }
      }

      // 3. Fetch Templates
      const tplRes = await fetch(apiUrl('/api/housekeeping/task-templates'), { headers }).catch(() => null);
      if (tplRes && tplRes.ok) {
        const json = await tplRes.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setTemplates(json.data);
        }
      }
    } catch (err) {
      console.warn('API error, using local data fallback:', err);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeepingData();
  }, []);

  const handleRefresh = async () => {
    await fetchHousekeepingData();
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 2000);
  };

  // ============================================================================
  // Inspection Action: Approve or Request Re-clean
  // ============================================================================
  const handleInspectTask = async (taskId: string, inspectionStatus: 'passed' | 'needs_reclean') => {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      if (inspectionStatus === 'passed') {
        await fetch(apiUrl(`/api/housekeeping/tasks/${taskId}/complete`), {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            inspectionStatus: 'passed',
            notes: 'ตรวจรับงานผ่านเรียบร้อย ห้องพร้อมเปิดให้บริการ',
          }),
        }).catch(() => null);
      } else {
        await fetch(apiUrl(`/api/housekeeping/tasks/${taskId}`), {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            status: 'in_progress',
            notes: 'ส่งกลับให้แก้ไข / ทำความสะอาดซ้ำ ตรวจสอบพบจุดบกพร่อง',
          }),
        }).catch(() => null);
      }

      // Optimistic state update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: inspectionStatus === 'passed' ? 'completed' : 'in_progress',
                inspectionStatus,
                notes:
                  inspectionStatus === 'passed'
                    ? 'ตรวจรับงานผ่านเรียบร้อย ห้องพร้อมเปิดให้บริการ'
                    : 'ส่งกลับให้แก้ไข / ทำความสะอาดซ้ำ ตรวจสอบพบจุดบกพร่อง',
              }
            : t
        )
      );

      setSelectedTaskForZoom(null);
    } catch (err) {
      console.warn('Failed to update task inspection:', err);
    }
  };

  // Update Room Issue Status
  const handleUpdateIssueStatus = async (issueId: string, newStatus: 'acknowledged' | 'resolved') => {
    try {
      const token = getAuthToken();
      await fetch(apiUrl(`/api/housekeeping/issues/${issueId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => null);

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId
            ? {
                ...iss,
                status: newStatus,
                resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : iss.resolvedAt,
              }
            : iss
        )
      );

      if (selectedIssueForZoom && selectedIssueForZoom.id === issueId) {
        setSelectedIssueForZoom((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.warn('Failed to update issue status:', err);
    }
  };

  // ============================================================================
  // Template CRUD & Checklist Item Builder
  // ============================================================================
  const openCreateTemplate = () => {
    setEditTemplate(null);
    setTemplateModalTab('general');
    setTemplateForm({
      ...EMPTY_TEMPLATE_FORM,
      checklistItems: [
        { id: `c-${Date.now()}-1`, label: '', sublabel: '', zone: 'bedroom' },
      ],
    });
    setShowTemplateModal(true);
  };

  const openEditTemplate = (tpl: TaskTemplate, initialTab: 'general' | 'checklist' = 'general') => {
    setEditTemplate(tpl);
    setTemplateModalTab(initialTab);
    setTemplateForm({
      name: tpl.name,
      taskType: tpl.taskType,
      defaultPriority: tpl.defaultPriority,
      estimatedMinutes: tpl.estimatedMinutes,
      description: tpl.description,
      checklistItems: tpl.checklistItems ? [...tpl.checklistItems] : [],
      isActive: tpl.isActive,
    });
    setShowTemplateModal(true);
  };

  const handleAddChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: '',
      sublabel: '',
      zone: 'bedroom',
    };
    setTemplateForm((prev) => ({
      ...prev,
      checklistItems: [...(prev.checklistItems || []), newItem],
    }));
  };

  const handleUpdateChecklistItem = (index: number, field: keyof ChecklistItem, value: string) => {
    setTemplateForm((prev) => {
      const items = [...(prev.checklistItems || [])];
      if (items[index]) {
        items[index] = { ...items[index], [field]: value };
      }
      return { ...prev, checklistItems: items };
    });
  };

  const handleDeleteChecklistItem = (index: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      checklistItems: (prev.checklistItems || []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || templateForm.estimatedMinutes <= 0) return;
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      if (editTemplate) {
        await fetch(apiUrl(`/api/housekeeping/task-templates/${editTemplate.id}`), {
          method: 'PUT',
          headers,
          body: JSON.stringify(templateForm),
        });
        setTemplates((prev) =>
          prev.map((t) => (t.id === editTemplate.id ? { ...editTemplate, ...templateForm } : t))
        );
      } else {
        const res = await fetch(apiUrl('/api/housekeeping/task-templates'), {
          method: 'POST',
          headers,
          body: JSON.stringify(templateForm),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setTemplates((prev) => [json.data, ...prev]);
          } else {
            setTemplates((prev) => [{ id: `tt-${Date.now()}`, ...templateForm }, ...prev]);
          }
        } else {
          setTemplates((prev) => [{ id: `tt-${Date.now()}`, ...templateForm }, ...prev]);
        }
      }
    } catch {
      if (editTemplate) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === editTemplate.id ? { ...editTemplate, ...templateForm } : t))
        );
      } else {
        setTemplates((prev) => [{ id: `tt-${Date.now()}`, ...templateForm }, ...prev]);
      }
    }
    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTargetTemplate) return;
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(apiUrl(`/api/housekeeping/task-templates/${deleteTargetTemplate.id}`), {
        method: 'DELETE',
        headers,
      });
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTargetTemplate.id));
    } catch {
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTargetTemplate.id));
    }
    setDeleteTargetTemplate(null);
  };

  // ============================================================================
  // Helpers & Labels
  // ============================================================================
  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'checkout_clean':
        return isEn ? 'Checkout Clean' : 'ทำความสะอาดหลังเช็คเอาท์';
      case 'daily_clean':
      case 'stayover_clean':
        return isEn ? 'Daily Stayover Clean' : 'ทำความสะอาดประจำวัน';
      case 'deep_clean':
        return isEn ? 'Deep Clean' : 'ทำความสะอาดละเอียด';
      case 'inspection':
        return isEn ? 'Room Inspection' : 'ตรวจความพร้อมห้องพัก';
      default:
        return type;
    }
  };

  const getTaskStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: isEn ? 'Completed' : 'เสร็จสิ้น',
          dot: 'bg-emerald-500',
        };
      case 'in_progress':
        return {
          label: isEn ? 'In Progress' : 'กำลังดำเนินการ',
          dot: 'bg-amber-500',
        };
      case 'assigned':
        return {
          label: isEn ? 'Assigned' : 'มอบหมายแล้ว',
          dot: 'bg-blue-500',
        };
      case 'pending':
        return {
          label: isEn ? 'Pending' : 'รอดำเนินการ',
          dot: 'bg-slate-400',
        };
      case 'cancelled':
        return {
          label: isEn ? 'Cancelled' : 'ยกเลิก',
          dot: 'bg-rose-500',
        };
      default:
        return { label: status, dot: 'bg-slate-400' };
    }
  };

  const getIssueSeverityInfo = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          label: isEn ? 'Critical' : 'วิกฤต',
          dot: 'bg-rose-600',
        };
      case 'high':
        return {
          label: isEn ? 'High' : 'สูง',
          dot: 'bg-amber-500',
        };
      case 'medium':
        return {
          label: isEn ? 'Medium' : 'ปานกลาง',
          dot: 'bg-blue-500',
        };
      case 'low':
        return {
          label: isEn ? 'Low' : 'ต่ำ',
          dot: 'bg-slate-400',
        };
      default:
        return { label: severity, dot: 'bg-slate-400' };
    }
  };

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'damage':
        return isEn ? 'Damaged Fixture' : 'สิ่งของชำรุด';
      case 'malfunction':
        return isEn ? 'Appliance Malfunction' : 'อุปกรณ์ขัดข้อง';
      case 'hygiene':
        return isEn ? 'Cleanliness Issue' : 'สุขอนามัยและความสะอาด';
      case 'missing_item':
      case 'lost_and_found':
        return isEn ? 'Lost & Found Item' : 'ของหายหรือลืมไว้';
      default:
        return type;
    }
  };

  const getIssueStatusInfo = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'expired_claimed':
        return {
          label: isEn ? 'Resolved' : 'แก้ไขเรียบร้อย',
          dot: 'bg-emerald-500',
        };
      case 'acknowledged':
        return {
          label: isEn ? 'Acknowledged' : 'รับทราบแล้ว',
          dot: 'bg-blue-500',
        };
      case 'open':
      default:
        return {
          label: isEn ? 'Open' : 'รอตรวจสอบ',
          dot: 'bg-rose-500',
        };
    }
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString(isEn ? 'en-US' : 'th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return iso;
    }
  };

  const calculateDurationMinutes = (start?: string | null, end?: string | null) => {
    if (!start || !end) return null;
    try {
      const diffMs = new Date(end).getTime() - new Date(start).getTime();
      const mins = Math.round(diffMs / 60000);
      return mins > 0 ? mins : 1;
    } catch {
      return null;
    }
  };

  // ============================================================================
  // Filtered & Paginated Lists
  // ============================================================================
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.roomNumber.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.assignedStaff?.name && t.assignedStaff.name.toLowerCase().includes(taskSearch.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(taskSearch.toLowerCase()));

      const matchStatus = taskStatusFilter === 'all' || t.status === taskStatusFilter;
      const matchType = taskTypeFilter === 'all' || t.taskType === taskTypeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [tasks, taskSearch, taskStatusFilter, taskTypeFilter]);

  const paginatedTasks = useMemo(() => {
    const start = (taskPage - 1) * ITEMS_PER_PAGE;
    return filteredTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTasks, taskPage]);

  const totalTaskPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE) || 1;

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      const matchSearch =
        (iss.roomNumber && iss.roomNumber.toLowerCase().includes(issueSearch.toLowerCase())) ||
        iss.description.toLowerCase().includes(issueSearch.toLowerCase()) ||
        (iss.reportedBy?.name && iss.reportedBy.name.toLowerCase().includes(issueSearch.toLowerCase()));

      const matchSeverity = issueSeverityFilter === 'all' || iss.severity === issueSeverityFilter;
      const matchStatus = issueStatusFilter === 'all' || iss.status === issueStatusFilter;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [issues, issueSearch, issueSeverityFilter, issueStatusFilter]);

  const paginatedIssues = useMemo(() => {
    const start = (issuePage - 1) * ITEMS_PER_PAGE;
    return filteredIssues.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredIssues, issuePage]);

  const totalIssuePages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE) || 1;

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchSearch =
        tpl.name.toLowerCase().includes(tplSearch.toLowerCase()) ||
        tpl.description.toLowerCase().includes(tplSearch.toLowerCase());
      const matchType = tplTypeFilter === 'all' || tpl.taskType === tplTypeFilter;
      return matchSearch && matchType;
    });
  }, [templates, tplSearch, tplTypeFilter]);

  const paginatedTemplates = useMemo(() => {
    const start = (tplPage - 1) * ITEMS_PER_PAGE;
    return filteredTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTemplates, tplPage]);

  const totalTemplatePages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE) || 1;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <AdminLayout activePath="/admin/tasks" isBackendOffline={isOffline}>
      {/* ── Page Header ── */}
      <div className="bg-white px-4 py-3.5 mb-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{t('nav.home')}</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">{t('header.housekeeping.title')}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#F97316]" />
              <span>{t('header.housekeeping.title')}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">{t('header.housekeeping.desc')}</p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>{refreshSuccess ? (isEn ? 'Updated' : 'อัปเดตแล้ว') : (isEn ? 'Refresh Data' : 'รีเฟรชข้อมูล')}</span>
            </Button>

            {activeTab === 'templates' && (
              <Button
                size="sm"
                onClick={openCreateTemplate}
                className="bg-[#F97316] hover:bg-orange-600 text-white text-xs font-semibold px-3 h-9 flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>{isEn ? 'Add Template' : 'เพิ่มแม่แบบงาน'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('inspection')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'inspection'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>{t('tab.housekeeping.inspection')}</span>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
              {tasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('issues')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'issues'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{t('tab.housekeeping.issues')}</span>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
              {issues.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>{t('tab.housekeeping.templates')}</span>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
              {templates.length}
            </span>
          </button>
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {/* ══════════════════════════════════════════════════════════
            TAB 1: INSPECTION & TASKS
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'inspection' && (
          <div className="space-y-4">
            {/* ── Neutral Stat Cards (Monochrome Numbers, Zero Rainbow Slop) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: isEn ? 'Total Tasks' : 'งานทำความสะอาดทั้งหมด',
                  value: tasks.length,
                },
                {
                  label: isEn ? 'In Progress' : 'กำลังดำเนินการ',
                  value: tasks.filter((t) => t.status === 'in_progress').length,
                },
                {
                  label: isEn ? 'Completed' : 'เสร็จสิ้นเรียบร้อย',
                  value: tasks.filter((t) => t.status === 'completed').length,
                },
                {
                  label: isEn ? 'With Before/After Photos' : 'มีรูปภาพตรวจงาน',
                  value: tasks.filter((t) => t.beforePhotoUrl || t.afterPhotoUrl).length,
                },
              ].map((s) => (
                <Card key={s.label} className="border-slate-200 bg-white shadow-2xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Clean Toolbar (No Card-in-Card Nesting) ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={isEn ? 'Search room, staff, notes...' : 'ค้นหาห้อง, พนักงาน, บันทึก...'}
                    value={taskSearch}
                    onChange={(e) => {
                      setTaskSearch(e.target.value);
                      setTaskPage(1);
                    }}
                    className="pl-9 h-9 text-xs border-slate-200 bg-white"
                  />
                  {taskSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskSearch('');
                        setTaskPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="w-44">
                  <Select
                    value={taskStatusFilter}
                    onChange={(e) => {
                      setTaskStatusFilter(e.target.value);
                      setTaskPage(1);
                    }}
                    className="text-xs h-9 bg-white"
                  >
                    <option value="all">{isEn ? 'All Statuses' : 'สถานะทั้งหมด'}</option>
                    <option value="in_progress">{isEn ? 'In Progress' : 'กำลังดำเนินการ'}</option>
                    <option value="completed">{isEn ? 'Completed' : 'เสร็จสิ้น'}</option>
                    <option value="assigned">{isEn ? 'Assigned' : 'มอบหมายแล้ว'}</option>
                    <option value="pending">{isEn ? 'Pending' : 'รอดำเนินการ'}</option>
                  </Select>
                </div>

                <div className="w-48">
                  <Select
                    value={taskTypeFilter}
                    onChange={(e) => {
                      setTaskTypeFilter(e.target.value);
                      setTaskPage(1);
                    }}
                    className="text-xs h-9 bg-white"
                  >
                    <option value="all">{isEn ? 'All Task Types' : 'ประเภทงานทั้งหมด'}</option>
                    <option value="checkout_clean">{isEn ? 'Checkout Clean' : 'ทำความสะอาดหลังเช็คเอาท์'}</option>
                    <option value="daily_clean">{isEn ? 'Daily Stayover Clean' : 'ทำความสะอาดประจำวัน'}</option>
                    <option value="deep_clean">{isEn ? 'Deep Clean' : 'ทำความสะอาดละเอียด'}</option>
                    <option value="inspection">{isEn ? 'Room Inspection' : 'ตรวจความพร้อมห้องพัก'}</option>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-medium self-end md:self-auto">
                {isEn ? 'Showing' : 'แสดง'} {filteredTasks.length} {isEn ? 'tasks' : 'รายการ'}
              </div>
            </div>

            {/* ── Tasks Table (Clean White Header, No Card-in-Card) ── */}
            <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Room' : 'ห้องพัก'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Task Type' : 'ประเภทงาน'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Staff' : 'แม่บ้านผู้รับผิดชอบ'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Status' : 'สถานะ'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Timeline' : 'เวลาเริ่ม - เสร็จสิ้น'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-center">{isEn ? 'Photos (Before / After)' : 'รูปถ่าย ก่อน / หลัง'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-right">{isEn ? 'Action' : 'การตรวจสอบ'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p>{isEn ? 'No housekeeping tasks found matching filters' : 'ไม่พบรายการงานทำความสะอาดที่ตรงกับตัวกรอง'}</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedTasks.map((t) => {
                        const statusInfo = getTaskStatusInfo(t.status);
                        const duration = calculateDurationMinutes(t.startedAt, t.completedAt);
                        const hasPhotos = Boolean(t.beforePhotoUrl || t.afterPhotoUrl);

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Room Number */}
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                              {t.roomNumber}
                            </td>

                            {/* Task Type */}
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              <div>{getTaskTypeLabel(t.taskType)}</div>
                              {t.notes && (
                                <div className="text-[11px] text-slate-400 truncate max-w-[220px] mt-0.5" title={t.notes}>
                                  {t.notes}
                                </div>
                              )}
                            </td>

                            {/* Staff */}
                            <td className="py-3 px-4 text-slate-700">
                              {t.assignedStaff ? (
                                <div>
                                  <div className="font-medium text-slate-900">{t.assignedStaff.name}</div>
                                  {t.assignedStaff.zone && (
                                    <div className="text-[11px] text-slate-400">{t.assignedStaff.zone}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">{isEn ? 'Unassigned' : 'ยังไม่ระบุแม่บ้าน'}</span>
                              )}
                            </td>

                            {/* Status with 8px dot (Zero Rainbow Text) */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dot}`} />
                                <span className="text-slate-700 font-medium">{statusInfo.label}</span>
                              </div>
                            </td>

                            {/* Timeline */}
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                              <div>{formatTime(t.startedAt)} - {formatTime(t.completedAt)}</div>
                              {duration && (
                                <div className="text-[10px] text-slate-400">
                                  {isEn ? `Duration: ${duration} mins` : `ใช้เวลา: ${duration} นาที`}
                                </div>
                              )}
                            </td>

                            {/* Before & After Thumbnails */}
                            <td className="py-2.5 px-4">
                              {hasPhotos ? (
                                <div
                                  onClick={() => setSelectedTaskForZoom(t)}
                                  className="flex items-center justify-center gap-2 cursor-pointer group"
                                  title={isEn ? 'Click to inspect high-resolution photos' : 'คลิกเพื่อดูภาพถ่ายเปรียบเทียบขนาดใหญ่'}
                                >
                                  {/* Before Thumbnail */}
                                  <div className="relative w-12 h-12 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0 shadow-2xs group-hover:border-orange-300 transition-colors">
                                    {t.beforePhotoUrl ? (
                                      <img
                                        src={t.beforePhotoUrl}
                                        alt="Before clean"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                                        -
                                      </div>
                                    )}
                                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[9px] text-center font-medium leading-tight py-0.5">
                                      {isEn ? 'Before' : 'ก่อน'}
                                    </span>
                                  </div>

                                  {/* After Thumbnail */}
                                  <div className="relative w-12 h-12 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0 shadow-2xs group-hover:border-orange-300 transition-colors">
                                    {t.afterPhotoUrl ? (
                                      <img
                                        src={t.afterPhotoUrl}
                                        alt="After clean"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                                        -
                                      </div>
                                    )}
                                    <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-white text-[9px] text-center font-medium leading-tight py-0.5">
                                      {isEn ? 'After' : 'หลัง'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-[11px] italic">
                                  {isEn ? 'No photos' : 'ไม่มีรูปภาพ'}
                                </div>
                              )}
                            </td>

                            {/* Inspection Action */}
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTaskForZoom(t)}
                                className="h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                <span>{isEn ? 'View Photos' : 'ดูภาพถ่าย'}</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalTaskPages > 1 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    {isEn ? 'Page' : 'หน้า'} {taskPage} {isEn ? 'of' : 'จาก'} {totalTaskPages}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={taskPage === 1}
                      onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={taskPage === totalTaskPages}
                      onClick={() => setTaskPage((p) => Math.min(totalTaskPages, p + 1))}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2: ROOM ISSUES & MALFUNCTIONS
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            {/* ── Neutral Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: isEn ? 'Total Reported Issues' : 'รายการแจ้งปัญหาทั้งหมด',
                  value: issues.length,
                },
                {
                  label: isEn ? 'Open' : 'รอตรวจสอบ',
                  value: issues.filter((i) => i.status === 'open').length,
                },
                {
                  label: isEn ? 'Acknowledged' : 'รับทราบแล้ว',
                  value: issues.filter((i) => i.status === 'acknowledged').length,
                },
                {
                  label: isEn ? 'Resolved' : 'แก้ไขเรียบร้อยแล้ว',
                  value: issues.filter((i) => i.status === 'resolved' || i.status === 'expired_claimed').length,
                },
              ].map((s) => (
                <Card key={s.label} className="border-slate-200 bg-white shadow-2xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Clean Toolbar ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={isEn ? 'Search room, description, staff...' : 'ค้นหาห้อง, รายละเอียด, ผู้แจ้ง...'}
                    value={issueSearch}
                    onChange={(e) => {
                      setIssueSearch(e.target.value);
                      setIssuePage(1);
                    }}
                    className="pl-9 h-9 text-xs border-slate-200 bg-white"
                  />
                  {issueSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setIssueSearch('');
                        setIssuePage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="w-44">
                  <Select
                    value={issueSeverityFilter}
                    onChange={(e) => {
                      setIssueSeverityFilter(e.target.value);
                      setIssuePage(1);
                    }}
                    className="text-xs h-9 bg-white"
                  >
                    <option value="all">{isEn ? 'All Severities' : 'ความรุนแรงทั้งหมด'}</option>
                    <option value="critical">{isEn ? 'Critical' : 'วิกฤต'}</option>
                    <option value="high">{isEn ? 'High' : 'สูง'}</option>
                    <option value="medium">{isEn ? 'Medium' : 'ปานกลาง'}</option>
                    <option value="low">{isEn ? 'Low' : 'ต่ำ'}</option>
                  </Select>
                </div>

                <div className="w-44">
                  <Select
                    value={issueStatusFilter}
                    onChange={(e) => {
                      setIssueStatusFilter(e.target.value);
                      setIssuePage(1);
                    }}
                    className="text-xs h-9 bg-white"
                  >
                    <option value="all">{isEn ? 'All Statuses' : 'สถานะทั้งหมด'}</option>
                    <option value="open">{isEn ? 'Open' : 'รอตรวจสอบ'}</option>
                    <option value="acknowledged">{isEn ? 'Acknowledged' : 'รับทราบแล้ว'}</option>
                    <option value="resolved">{isEn ? 'Resolved' : 'แก้ไขเรียบร้อย'}</option>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-medium self-end md:self-auto">
                {isEn ? 'Showing' : 'แสดง'} {filteredIssues.length} {isEn ? 'issues' : 'รายการ'}
              </div>
            </div>

            {/* ── Room Issues Table ── */}
            <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Room' : 'ห้องพัก'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Issue Type' : 'หมวดหมู่ปัญหา'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Severity' : 'ระดับความรุนแรง'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Description' : 'รายละเอียด'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Reported By' : 'ผู้แจ้ง'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Status' : 'สถานะ'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-center">{isEn ? 'Photo' : 'รูปภาพ'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-right">{isEn ? 'Action' : 'การจัดการ'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedIssues.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p>{isEn ? 'No room issues reported matching filters' : 'ไม่พบรายการปัญหาหรือสิ่งของชำรุดที่ตรงกับตัวกรอง'}</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedIssues.map((iss) => {
                        const sevInfo = getIssueSeverityInfo(iss.severity);
                        const statusInfo = getIssueStatusInfo(iss.status);

                        return (
                          <tr key={iss.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Room */}
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                              {iss.roomNumber || iss.roomId.replace('rm-', '')}
                            </td>

                            {/* Type */}
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {getIssueTypeLabel(iss.issueType)}
                            </td>

                            {/* Severity with 8px dot */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${sevInfo.dot}`} />
                                <span className="text-slate-700 font-medium">{sevInfo.label}</span>
                              </div>
                            </td>

                            {/* Description */}
                            <td className="py-3 px-4 text-slate-700 max-w-xs">
                              <div className="line-clamp-2" title={iss.description}>
                                {iss.description}
                              </div>
                            </td>

                            {/* Reporter */}
                            <td className="py-3 px-4 text-slate-600">
                              <div className="font-medium text-slate-800">{iss.reportedBy?.name || '-'}</div>
                              <div className="text-[11px] text-slate-400">{formatTime(iss.createdAt)}</div>
                            </td>

                            {/* Status with 8px dot */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dot}`} />
                                <span className="text-slate-700 font-medium">{statusInfo.label}</span>
                              </div>
                            </td>

                            {/* Photo Thumbnail */}
                            <td className="py-2.5 px-4 text-center">
                              {iss.photoR2Key ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedIssueForZoom(iss)}
                                  className="w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-100 hover:border-orange-400 transition-colors inline-block"
                                  title={isEn ? 'Click to inspect photo' : 'คลิกเพื่อดูรูปภาพ'}
                                >
                                  <img
                                    src={iss.photoR2Key}
                                    alt="Issue evidence"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">-</span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 text-right">
                              {iss.status === 'open' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateIssueStatus(iss.id, 'acknowledged')}
                                  className="h-8 px-2.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                                >
                                  <span>{isEn ? 'Acknowledge' : 'รับทราบ'}</span>
                                </Button>
                              )}
                              {iss.status === 'acknowledged' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateIssueStatus(iss.id, 'resolved')}
                                  className="h-8 px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                >
                                  <span>{isEn ? 'Mark Resolved' : 'แก้ไขแล้ว'}</span>
                                </Button>
                              )}
                              {iss.status === 'resolved' && (
                                <span className="text-xs text-slate-400 italic">
                                  {isEn ? 'Completed' : 'เสร็จสิ้น'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalIssuePages > 1 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    {isEn ? 'Page' : 'หน้า'} {issuePage} {isEn ? 'of' : 'จาก'} {totalIssuePages}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={issuePage === 1}
                      onClick={() => setIssuePage((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={issuePage === totalIssuePages}
                      onClick={() => setIssuePage((p) => Math.min(totalIssuePages, p + 1))}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3: TASK TEMPLATES
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {/* ── Neutral Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: isEn ? 'Total Templates' : 'แม่แบบงานทั้งหมด',
                  value: templates.length,
                },
                {
                  label: isEn ? 'Active' : 'เปิดใช้งาน',
                  value: templates.filter((t) => t.isActive).length,
                },
                {
                  label: isEn ? 'Inactive' : 'ปิดใช้งาน',
                  value: templates.filter((t) => !t.isActive).length,
                },
              ].map((s) => (
                <Card key={s.label} className="border-slate-200 bg-white shadow-2xs">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Clean Toolbar ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={isEn ? 'Search templates...' : 'ค้นหาแม่แบบงาน...'}
                    value={tplSearch}
                    onChange={(e) => {
                      setTplSearch(e.target.value);
                      setTplPage(1);
                    }}
                    className="pl-9 h-9 text-xs border-slate-200 bg-white"
                  />
                  {tplSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setTplSearch('');
                        setTplPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="w-48">
                  <Select
                    value={tplTypeFilter}
                    onChange={(e) => {
                      setTplTypeFilter(e.target.value);
                      setTplPage(1);
                    }}
                    className="text-xs h-9 bg-white"
                  >
                    <option value="all">{isEn ? 'All Task Types' : 'ประเภทงานทั้งหมด'}</option>
                    <option value="checkout_clean">{isEn ? 'Checkout Clean' : 'ทำความสะอาดหลังเช็คเอาท์'}</option>
                    <option value="daily_clean">{isEn ? 'Daily Stayover Clean' : 'ทำความสะอาดประจำวัน'}</option>
                    <option value="deep_clean">{isEn ? 'Deep Clean' : 'ทำความสะอาดละเอียด'}</option>
                    <option value="inspection">{isEn ? 'Room Inspection' : 'ตรวจความพร้อมห้องพัก'}</option>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-medium self-end md:self-auto">
                {isEn ? 'Showing' : 'แสดง'} {filteredTemplates.length} {isEn ? 'templates' : 'รายการ'}
              </div>
            </div>

            {/* ── Templates Table ── */}
            <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Template Name' : 'ชื่อแม่แบบงาน'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Task Type' : 'ประเภทงาน'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Est. Minutes' : 'เวลามาตรฐาน'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Checklist' : 'รายการตรวจสอบ'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Description' : 'รายละเอียดขั้นตอน'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">{isEn ? 'Status' : 'สถานะ'}</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-right">{isEn ? 'Actions' : 'จัดการ'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p>{isEn ? 'No task templates found' : 'ไม่พบข้อมูลแม่แบบงาน'}</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedTemplates.map((tpl) => (
                        <tr key={tpl.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900">{tpl.name}</td>
                          <td className="py-3 px-4 text-slate-700">{getTaskTypeLabel(tpl.taskType)}</td>
                          <td className="py-3 px-4 font-mono text-slate-900">{tpl.estimatedMinutes} {isEn ? 'mins' : 'นาที'}</td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => openEditTemplate(tpl, 'checklist')}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 hover:border-orange-200 transition-colors cursor-pointer"
                            >
                              <CheckSquare className="w-3 h-3 mr-1 text-slate-500" />
                              {tpl.checklistItems?.length || 0} {isEn ? 'items' : 'ข้อ'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={tpl.description}>
                            {tpl.description}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  tpl.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                              <span className="text-slate-700 font-medium">
                                {tpl.isActive ? (isEn ? 'Active' : 'ใช้งานอยู่') : (isEn ? 'Inactive' : 'ปิดใช้งาน')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditTemplate(tpl)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                title={isEn ? 'Edit template' : 'แก้ไขแม่แบบ'}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetTemplate(tpl)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title={isEn ? 'Delete template' : 'ลบแม่แบบ'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalTemplatePages > 1 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    {isEn ? 'Page' : 'หน้า'} {tplPage} {isEn ? 'of' : 'จาก'} {totalTemplatePages}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={tplPage === 1}
                      onClick={() => setTplPage((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={tplPage === totalTemplatePages}
                      onClick={() => setTplPage((p) => Math.min(totalTemplatePages, p + 1))}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          BEFORE / AFTER PHOTO INSPECTION ZOOM MODAL
      ══════════════════════════════════════════════════════════ */}
      {selectedTaskForZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {isEn ? `Cleaning Audit: Room ${selectedTaskForZoom.roomNumber}` : `ตรวจสอบภาพถ่ายงานทำความสะอาด: ห้อง ${selectedTaskForZoom.roomNumber}`}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {getTaskTypeLabel(selectedTaskForZoom.taskType)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn ? 'Staff:' : 'แม่บ้านผู้รับผิดชอบ:'}{' '}
                  <span className="font-semibold text-slate-700">
                    {selectedTaskForZoom.assignedStaff?.name || '-'}
                  </span>{' '}
                  ({selectedTaskForZoom.assignedStaff?.zone || '-'}) · {selectedTaskForZoom.scheduledDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnlargedZoom(!isEnlargedZoom)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  title={isEnlargedZoom ? (isEn ? 'Fit view' : 'ย่อขนาดพอดี') : (isEn ? 'Enlarge zoom' : 'ขยายภาพ 100%')}
                >
                  {isEnlargedZoom ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTaskForZoom(null);
                    setIsEnlargedZoom(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Side-by-Side Comparison */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Photo Viewer Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Before Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isEn ? 'Before Cleaning Photo' : 'รูปถ่ายก่อนทำความสะอาด'}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatTime(selectedTaskForZoom.startedAt)}
                    </span>
                  </div>

                  <div className={`relative rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center ${isEnlargedZoom ? 'min-h-[440px]' : 'h-72'}`}>
                    {selectedTaskForZoom.beforePhotoUrl ? (
                      <img
                        src={selectedTaskForZoom.beforePhotoUrl}
                        alt="Before cleaning"
                        className={`w-full h-full ${isEnlargedZoom ? 'object-contain' : 'object-cover'}`}
                      />
                    ) : (
                      <div className="text-center text-slate-500 text-xs p-6">
                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p>{isEn ? 'No before photo submitted' : 'ไม่มีรูปถ่ายก่อนเริ่มทำความสะอาด'}</p>
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm">
                      {isEn ? 'BEFORE' : 'ก่อนทำ'}
                    </span>
                  </div>
                </div>

                {/* 2. After Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isEn ? 'After Cleaning Photo' : 'รูปถ่ายหลังทำความสะอาด'}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatTime(selectedTaskForZoom.completedAt)}
                    </span>
                  </div>

                  <div className={`relative rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center ${isEnlargedZoom ? 'min-h-[440px]' : 'h-72'}`}>
                    {selectedTaskForZoom.afterPhotoUrl ? (
                      <img
                        src={selectedTaskForZoom.afterPhotoUrl}
                        alt="After cleaning"
                        className={`w-full h-full ${isEnlargedZoom ? 'object-contain' : 'object-cover'}`}
                      />
                    ) : (
                      <div className="text-center text-slate-500 text-xs p-6">
                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p>{isEn ? 'No after photo submitted yet' : 'ยังไม่มีรูปถ่ายหลังทำความสะอาดเสร็จ'}</p>
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 bg-emerald-800/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm">
                      {isEn ? 'AFTER' : 'หลังทำ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Details & Maid Notes (Clean Surface, No Card Nesting) */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2.5 border-b border-slate-200/70">
                  <div>
                    <span className="text-slate-400 block">{isEn ? 'Task Status' : 'สถานะงาน'}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${getTaskStatusInfo(selectedTaskForZoom.status).dot}`} />
                      <span className="font-semibold text-slate-800">
                        {getTaskStatusInfo(selectedTaskForZoom.status).label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">{isEn ? 'Duration' : 'เวลาที่ใช้'}</span>
                    <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                      {calculateDurationMinutes(selectedTaskForZoom.startedAt, selectedTaskForZoom.completedAt)
                        ? `${calculateDurationMinutes(selectedTaskForZoom.startedAt, selectedTaskForZoom.completedAt)} ${isEn ? 'mins' : 'นาที'}`
                        : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">{isEn ? 'Room Readiness' : 'ความพร้อมของห้อง'}</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedTaskForZoom.status === 'completed'
                        ? (isEn ? 'Available (Ready for Guest)' : 'พร้อมเปิดให้บริการ (Available)')
                        : (isEn ? 'Cleaning in Progress' : 'กำลังทำความสะอาด')}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">{isEn ? 'Maid Notes & Remarks' : 'บันทึกจากแม่บ้าน'}</span>
                  <p className="text-slate-700 leading-normal">
                    {selectedTaskForZoom.notes || (isEn ? 'No notes provided by staff' : 'ไม่มีบันทึกเพิ่มเติมจากแม่บ้าน')}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTaskForZoom(null);
                  setIsEnlargedZoom(false);
                }}
                className="text-xs h-9 px-3"
              >
                {isEn ? 'Close' : 'ปิดหน้าต่าง'}
              </Button>

              <div className="flex items-center gap-2">
                {selectedTaskForZoom.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInspectTask(selectedTaskForZoom.id, 'needs_reclean')}
                    className="text-xs h-9 px-3 border-amber-300 text-amber-800 hover:bg-amber-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    <span>{isEn ? 'Request Re-clean' : 'แจ้งให้ทำความสะอาดซ้ำ'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROOM ISSUE PHOTO ZOOM MODAL
      ══════════════════════════════════════════════════════════ */}
      {selectedIssueForZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEn
                    ? `Reported Issue: Room ${selectedIssueForZoom.roomNumber || selectedIssueForZoom.roomId}`
                    : `รายงานสิ่งของชำรุด: ห้อง ${selectedIssueForZoom.roomNumber || selectedIssueForZoom.roomId}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {getIssueTypeLabel(selectedIssueForZoom.issueType)} · {isEn ? 'Reported by' : 'ผู้แจ้ง:'} {selectedIssueForZoom.reportedBy?.name || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIssueForZoom(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">
              {selectedIssueForZoom.photoR2Key ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-950 h-80 flex items-center justify-center">
                  <img
                    src={selectedIssueForZoom.photoR2Key}
                    alt="Issue photo"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isEn ? 'No photo available' : 'ไม่มีรูปภาพประกอบ'}
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isEn ? 'Severity' : 'ระดับความรุนแรง'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getIssueSeverityInfo(selectedIssueForZoom.severity).dot}`} />
                    <span className="font-semibold text-slate-800">{getIssueSeverityInfo(selectedIssueForZoom.severity).label}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">{isEn ? 'Description' : 'รายละเอียดที่แม่บ้านรายงาน'}</span>
                  <p className="text-slate-800 font-medium leading-normal">{selectedIssueForZoom.description}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIssueForZoom(null)}
                className="text-xs h-9 px-3"
              >
                {isEn ? 'Close' : 'ปิด'}
              </Button>

              <div className="flex items-center gap-2">
                {selectedIssueForZoom.status === 'open' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateIssueStatus(selectedIssueForZoom.id, 'acknowledged')}
                    className="text-xs h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <span>{isEn ? 'Acknowledge Issue' : 'รับทราบการแจ้งปัญหา'}</span>
                  </Button>
                )}
                {selectedIssueForZoom.status === 'acknowledged' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateIssueStatus(selectedIssueForZoom.id, 'resolved')}
                    className="text-xs h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <span>{isEn ? 'Mark as Resolved' : 'บันทึกว่าแก้ไขเสร็จสิ้น'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CREATE / EDIT TASK TEMPLATE MODAL
      ══════════════════════════════════════════════════════════ */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[88vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 pt-4 pb-0 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {editTemplate ? (isEn ? 'Edit Task Template' : 'แก้ไขแม่แบบงาน') : (isEn ? 'New Task Template' : 'เพิ่มแม่แบบงานใหม่')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Underline Tabs */}
              <div className="flex items-center gap-6 text-xs">
                <button
                  type="button"
                  onClick={() => setTemplateModalTab('general')}
                  className={`pb-2.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                    templateModalTab === 'general'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isEn ? 'General Information' : 'ข้อมูลทั่วไป'}
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateModalTab('checklist')}
                  className={`pb-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    templateModalTab === 'checklist'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{isEn ? 'Checklist Items' : 'รายการตรวจสอบ'}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      templateModalTab === 'checklist'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {templateForm.checklistItems?.length || 0}
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto text-xs flex-1">
              {templateModalTab === 'general' ? (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {isEn ? 'Template Name' : 'ชื่อแม่แบบงาน'} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder={isEn ? 'e.g. Standard Checkout Cleaning' : 'เช่น ทำความสะอาดหลังเช็คเอาท์มาตรฐาน'}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Type & Priority */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {isEn ? 'Task Type' : 'ประเภทงาน'} <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={templateForm.taskType}
                        onChange={(e) => setTemplateForm({ ...templateForm, taskType: e.target.value as any })}
                        className="h-9 text-xs"
                      >
                        <option value="checkout_clean">{isEn ? 'Checkout Clean' : 'ทำความสะอาดหลังเช็คเอาท์'}</option>
                        <option value="daily_clean">{isEn ? 'Daily Stayover Clean' : 'ทำความสะอาดประจำวัน'}</option>
                        <option value="deep_clean">{isEn ? 'Deep Clean' : 'ทำความสะอาดละเอียด'}</option>
                        <option value="inspection">{isEn ? 'Room Inspection' : 'ตรวจความพร้อมห้องพัก'}</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {isEn ? 'Default Priority' : 'ระดับความเร่งด่วน'}
                      </label>
                      <Select
                        value={templateForm.defaultPriority}
                        onChange={(e) => setTemplateForm({ ...templateForm, defaultPriority: e.target.value as any })}
                        className="h-9 text-xs"
                      >
                        <option value="normal">{isEn ? 'Normal' : 'ปกติ'}</option>
                        <option value="high">{isEn ? 'High' : 'เร่งด่วน'}</option>
                        <option value="urgent">{isEn ? 'Urgent' : 'ด่วนมาก'}</option>
                      </Select>
                    </div>
                  </div>

                  {/* Estimated Minutes */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {isEn ? 'Estimated Duration (Minutes)' : 'ระยะเวลาโดยประมาณ (นาที)'} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={templateForm.estimatedMinutes || ''}
                      onChange={(e) => setTemplateForm({ ...templateForm, estimatedMinutes: Number(e.target.value) })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {isEn ? 'Procedures & Guidelines' : 'ขั้นตอนและรายละเอียดการทำความสะอาด'}
                    </label>
                    <textarea
                      rows={3}
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      placeholder={isEn ? 'Overview of cleaning procedures and standards...' : 'ระบุขั้นตอนการทำงาน รายการสิ่งของที่ต้องตรวจเช็คและเปลี่ยน...'}
                      className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="tpl-active"
                      checked={templateForm.isActive}
                      onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                      className="rounded text-orange-500 focus:ring-orange-400"
                    />
                    <label htmlFor="tpl-active" className="text-slate-700 font-medium cursor-pointer">
                      {isEn ? 'Enable this template' : 'เปิดใช้งานแม่แบบนี้'}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">
                      {isEn
                        ? 'Define inspection items by room zone for housekeeping staff'
                        : 'กำหนดหัวข้อการตรวจเช็คแยกตามโซนห้องพักสำหรับแม่บ้าน'}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Add Item' : 'เพิ่มข้อตรวจ'}</span>
                    </button>
                  </div>

                  {/* Flat Divide-y Rows */}
                  {(!templateForm.checklistItems || templateForm.checklistItems.length === 0) ? (
                    <div className="py-10 text-center text-slate-400">
                      <p className="text-xs">
                        {isEn ? 'No checklist items configured for this template.' : 'ยังไม่มีรายการตรวจสอบสำหรับแม่แบบนี้'}
                      </p>
                      <button
                        type="button"
                        onClick={handleAddChecklistItem}
                        className="mt-2 text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                      >
                        {isEn ? '+ Add first item' : '+ เพิ่มข้อตรวจข้อแรก'}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {templateForm.checklistItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="py-2.5 flex items-center gap-2.5 first:pt-1 last:pb-1"
                        >
                          <span className="w-5 text-right font-mono text-xs text-slate-400 shrink-0">
                            {idx + 1}.
                          </span>
                          <div className="w-44 shrink-0">
                            <Select
                              value={item.zone || 'bedroom'}
                              onChange={(e) => handleUpdateChecklistItem(idx, 'zone', e.target.value)}
                              className="h-8 text-xs"
                            >
                              <option value="bedroom">{isEn ? 'Bedroom' : 'เตียงนอน & ห้องพัก'}</option>
                              <option value="bathroom">{isEn ? 'Bathroom' : 'ห้องน้ำ & สุขภัณฑ์'}</option>
                              <option value="minibar">{isEn ? 'Minibar' : 'มินิบาร์ & เครื่องดื่ม'}</option>
                              <option value="final_inspection">{isEn ? 'Final Inspection' : 'ตรวจรอบสุดท้าย'}</option>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Input
                              value={item.label}
                              onChange={(e) => handleUpdateChecklistItem(idx, 'label', e.target.value)}
                              placeholder={isEn ? 'Inspection item description...' : 'ระบุรายการตรวจเช็ค เช่น เปลี่ยนผ้าปูที่นอน ปลอกหมอน'}
                              className="h-8 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0"
                            title={isEn ? 'Delete item' : 'ลบข้อนี้'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-white shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateModal(false)}
                className="text-xs h-9 px-3"
              >
                {isEn ? 'Cancel' : 'ยกเลิก'}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTemplate}
                className="text-xs h-9 px-4 bg-[#F97316] hover:bg-orange-600 text-white font-semibold"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                <span>{isEn ? 'Save Template' : 'บันทึกแม่แบบ'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              {isEn ? 'Delete Task Template' : 'ยืนยันการลบแม่แบบงาน'}
            </h3>
            <p className="text-slate-600">
              {isEn
                ? `Are you sure you want to delete template "${deleteTargetTemplate.name}"?`
                : `คุณแน่ใจหรือไม่ว่าต้องการลบแม่แบบงาน "${deleteTargetTemplate.name}"?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTargetTemplate(null)}
                className="text-xs h-9"
              >
                {isEn ? 'Cancel' : 'ยกเลิก'}
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteTemplate}
                className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {isEn ? 'Confirm Delete' : 'ยืนยันลบ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default HousekeepingTasksPage;

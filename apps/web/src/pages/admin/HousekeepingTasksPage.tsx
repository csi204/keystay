import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuthRole } from '@/lib/api';
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================
export interface TaskTemplate {
  id: string;
  name: string;
  taskType: 'checkout_clean' | 'deep_clean' | 'stayover_clean' | 'inspection';
  defaultPriority: 'normal' | 'high' | 'urgent';
  estimatedMinutes: number;
  description: string;
  isActive: boolean;
}

const TASK_TYPE_LABELS: Record<TaskTemplate['taskType'], string> = {
  checkout_clean: 'ทำความสะอาดหลัง Checkout',
  deep_clean: 'ทำความสะอาดลึก (Deep Clean)',
  stayover_clean: 'ทำความสะอาดระหว่างพัก',
  inspection: 'ตรวจสอบห้อง',
};

const PRIORITY_LABELS: Record<TaskTemplate['defaultPriority'], string> = {
  normal: 'ปกติ',
  high: 'เร่งด่วน',
  urgent: 'ด่วนมาก',
};

const PRIORITY_COLORS: Record<TaskTemplate['defaultPriority'], string> = {
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-600',
};

// shortcut: mock data only, upgrade when /api/housekeeping/task-templates is ready (@Legxcy77)
const SEED_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tt-001',
    name: 'ทำความสะอาดหลัง Checkout มาตรฐาน',
    taskType: 'checkout_clean',
    defaultPriority: 'high',
    estimatedMinutes: 45,
    description: 'เปลี่ยนผ้าปูเตียง ทำความสะอาดห้องน้ำ เช็ดฝุ่น เปลี่ยนผ้าเช็ดตัว',
    isActive: true,
  },
  {
    id: 'tt-002',
    name: 'ทำความสะอาดระหว่างพัก',
    taskType: 'stayover_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 30,
    description: 'จัดเตียง ทำความสะอาดห้องน้ำ เติมของใช้ในห้อง',
    isActive: true,
  },
  {
    id: 'tt-003',
    name: 'Deep Clean รายเดือน',
    taskType: 'deep_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 120,
    description: 'ทำความสะอาดทุกซอก เช็ดกระจก ซักผ้าม่าน ทำความสะอาดเครื่องปรับอากาศ',
    isActive: true,
  },
  {
    id: 'tt-004',
    name: 'ตรวจสอบห้องก่อน Check-in',
    taskType: 'inspection',
    defaultPriority: 'urgent',
    estimatedMinutes: 15,
    description: 'ตรวจอุปกรณ์ไฟฟ้า เช็คห้องน้ำ ตรวจมินิบาร์',
    isActive: true,
  },
];

const EMPTY_FORM: Omit<TaskTemplate, 'id'> = {
  name: '',
  taskType: 'checkout_clean',
  defaultPriority: 'normal',
  estimatedMinutes: 30,
  description: '',
  isActive: true,
};

// ============================================================================
// Component
// ============================================================================
export const HousekeepingTasksPage: React.FC = () => {
  const currentRole = getAuthRole();
  // Front Desk and Owner can both manage templates
  const canEdit = currentRole === 'front_desk' || currentRole === 'owner';

  const [templates, setTemplates] = useState<TaskTemplate[]>(SEED_TEMPLATES);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ทั้งหมด');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TaskTemplate | null>(null);
  const [form, setForm] = useState<Omit<TaskTemplate, 'id'>>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplate | null>(null);

  const typeOptions = ['ทั้งหมด', ...Object.keys(TASK_TYPE_LABELS)];

  const filtered = templates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ทั้งหมด' || t.taskType === filterType;
    return matchSearch && matchType;
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (t: TaskTemplate) => {
    setEditItem(t);
    setForm({ name: t.name, taskType: t.taskType, defaultPriority: t.defaultPriority, estimatedMinutes: t.estimatedMinutes, description: t.description, isActive: t.isActive });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editItem) {
      setTemplates((prev) => prev.map((t) => (t.id === editItem.id ? { ...editItem, ...form } : t)));
    } else {
      setTemplates((prev) => [...prev, { id: `tt-${Date.now()}`, ...form }]);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const activePath = currentRole === 'owner' ? '/admin/housekeeping' : '/front-desk/housekeeping';

  return (
    <AdminLayout activePath={activePath} isBackendOffline={false}>
      <div className="px-4 py-3.5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              รายการงานแม่บ้าน (Task Templates)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Front Desk กำหนดชุดงานที่แม่บ้านต้องทำในแต่ละสถานการณ์</p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              เพิ่ม Template
            </Button>
          )}
        </div>

        {/* API notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>หมายเหตุ (Dev):</strong> ข้อมูลนี้เป็น mock data — รอ <code>/api/housekeeping/task-templates</code> CRUD endpoints จากบุญ (@Legxcy77)
          </span>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="ค้นหา template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm h-8"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {typeOptions.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterType === t
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                }`}
              >
                {t === 'ทั้งหมด' ? 'ทั้งหมด' : TASK_TYPE_LABELS[t as TaskTemplate['taskType']]}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <Card className="shadow-none border border-slate-100">
            <CardContent className="py-12 text-center text-slate-400 text-sm">ไม่พบ template</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((t) => (
              <Card key={t.id} className={`shadow-none border ${t.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${t.isActive ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <Badge variant="outline" className="text-xs">{TASK_TYPE_LABELS[t.taskType]}</Badge>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.defaultPriority]}`}>
                          {PRIORITY_LABELS[t.defaultPriority]}
                        </span>
                        <span className="text-xs text-slate-400">~{t.estimatedMinutes} นาที</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                {editItem ? 'แก้ไข Template' : 'เพิ่ม Template ใหม่'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ชื่องาน *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น ทำความสะอาดหลัง Checkout"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">ประเภทงาน</label>
                  <select
                    value={form.taskType}
                    onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value as TaskTemplate['taskType'] }))}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                  >
                    {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">ความสำคัญ</label>
                  <select
                    value={form.defaultPriority}
                    onChange={(e) => setForm((f) => ({ ...f, defaultPriority: e.target.value as TaskTemplate['defaultPriority'] }))}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">เวลาประมาณ (นาที)</label>
                <Input
                  type="number"
                  min={5}
                  value={form.estimatedMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: Number(e.target.value) }))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">รายละเอียด</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="อธิบายสิ่งที่แม่บ้านต้องทำ..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tplActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="accent-orange-500"
                />
                <label htmlFor="tplActive" className="text-xs text-slate-600">ใช้งานอยู่</label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm flex items-center gap-1.5 justify-center"
              >
                <Save className="w-3.5 h-3.5" />
                บันทึก
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 text-sm">
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-bold text-slate-800">ยืนยันการลบ</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              ลบ template <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="flex gap-2">
              <Button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm">
                ลบเลย
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 text-sm">
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default HousekeepingTasksPage;

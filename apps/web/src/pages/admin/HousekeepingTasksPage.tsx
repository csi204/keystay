import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuthToken, apiUrl } from '@/lib/api';
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
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
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-600 border-red-200',
};

const SEED_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tt-001',
    name: 'ทำความสะอาดหลัง Checkout มาตรฐาน',
    taskType: 'checkout_clean',
    defaultPriority: 'high',
    estimatedMinutes: 45,
    description: 'เปลี่ยนผ้าปูเตียง ทำความสะอาดห้องน้ำ เช็ดฝุ่น เปลี่ยนผ้าเช็ดตัว เติมสบู่และน้ำดื่ม',
    isActive: true,
  },
  {
    id: 'tt-002',
    name: 'ทำความสะอาดระหว่างพัก (Stayover)',
    taskType: 'stayover_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 20,
    description: 'จัดเตียง ทำความสะอาดห้องน้ำ เติมของใช้ในห้อง เก็บขยะ',
    isActive: true,
  },
  {
    id: 'tt-003',
    name: 'Deep Clean รายเดือน',
    taskType: 'deep_clean',
    defaultPriority: 'normal',
    estimatedMinutes: 120,
    description: 'ทำความสะอาดทุกซอก เช็ดกระจก ซักผ้าม่าน ทำความสะอาดเครื่องปรับอากาศ ขัดระเบียง',
    isActive: true,
  },
  {
    id: 'tt-004',
    name: 'ตรวจสอบห้องก่อน Check-in',
    taskType: 'inspection',
    defaultPriority: 'urgent',
    estimatedMinutes: 15,
    description: 'ตรวจอุปกรณ์ไฟฟ้า เช็คห้องน้ำ ตรวจมินิบาร์ ตรวจความเรียบร้อยและฉีดสเปรย์ปรับอากาศ',
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

export const HousekeepingTasksPage: React.FC = () => {
  const [templates, setTemplates] = useState<TaskTemplate[]>(SEED_TEMPLATES);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ทั้งหมด');
  const [showModal, setShowModal] = useState(false);
  const [editTpl, setEditTpl] = useState<TaskTemplate | null>(null);
  const [form, setForm] = useState<Omit<TaskTemplate, 'id'>>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplate | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl('/api/housekeeping/task-templates'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTemplates(json.data);
        }
      }
    } catch (err) {
      console.warn('Fallback to local state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filtered = templates.filter((tpl) => {
    const matchSearch =
      tpl.name.toLowerCase().includes(search.toLowerCase()) ||
      tpl.description.toLowerCase().includes(search.toLowerCase());
    const matchType =
      filterType === 'ทั้งหมด' ||
      TASK_TYPE_LABELS[tpl.taskType] === filterType ||
      tpl.taskType === filterType;
    return matchSearch && matchType;
  });

  const openCreate = () => {
    setEditTpl(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (tpl: TaskTemplate) => {
    setEditTpl(tpl);
    setForm({
      name: tpl.name,
      taskType: tpl.taskType,
      defaultPriority: tpl.defaultPriority,
      estimatedMinutes: tpl.estimatedMinutes,
      description: tpl.description,
      isActive: tpl.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.estimatedMinutes <= 0) return;
    const token = getAuthToken();
    try {
      if (editTpl) {
        await fetch(apiUrl(`/api/housekeeping/task-templates/${editTpl.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(apiUrl('/api/housekeeping/task-templates'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(form),
        });
      }
      await fetchTemplates();
    } catch {
      if (editTpl) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === editTpl.id ? { ...editTpl, ...form } : t))
        );
      } else {
        setTemplates((prev) => [...prev, { id: `tt-${Date.now()}`, ...form }]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const token = getAuthToken();
    try {
      await fetch(apiUrl(`/api/housekeeping/task-templates/${deleteTarget.id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await fetchTemplates();
    } catch {
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const toggleActive = async (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const token = getAuthToken();
    try {
      await fetch(apiUrl(`/api/housekeeping/task-templates/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isActive: !tpl.isActive }),
      });
      await fetchTemplates();
    } catch {
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
      );
    }
  };

  const filterTabs = ['ทั้งหมด', ...Object.values(TASK_TYPE_LABELS)];

  return (
    <AdminLayout activePath="/admin/tasks" isBackendOffline={false}>
      <div className="px-4 py-3.5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              รายการแม่แบบงานแม่บ้าน (Task Templates)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Front Desk และ Owner ร่วมกันกำหนดชุดงานและเวลามาตรฐาน (SOP) ที่แม่บ้านต้องทำ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await fetchTemplates();
                setRefreshSuccess(true);
                setTimeout(() => setRefreshSuccess(false), 2500);
              }}
              className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{refreshSuccess ? 'อัปเดตเรียบร้อย' : 'รีเฟรช'}</span>
            </Button>
            <Button
              onClick={openCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 h-9 flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              สร้างแม่แบบงานใหม่
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
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
            {filterTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  filterType === cat
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid Cards */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            ไม่พบแม่แบบงานที่ค้นหา
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filtered.map((tpl) => (
              <Card
                key={tpl.id}
                className="shadow-2xs border border-slate-200 hover:border-slate-300 transition-all bg-white"
              >
                <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            tpl.isActive ? 'text-emerald-500' : 'text-slate-300'
                          }`}
                        />
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {tpl.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleActive(tpl.id)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer border ${
                            tpl.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {tpl.isActive ? 'เปิดใช้งาน' : 'ปิดพัก'}
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(tpl)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(tpl)}
                          className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold bg-slate-50 text-slate-700 border-slate-200"
                      >
                        {TASK_TYPE_LABELS[tpl.taskType]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold border ${
                          PRIORITY_COLORS[tpl.defaultPriority]
                        }`}
                      >
                        {PRIORITY_LABELS[tpl.defaultPriority]}
                      </Badge>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />~
                        {tpl.estimatedMinutes} นาที
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                      {tpl.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Create / Edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  {editTpl ? 'แก้ไขแม่แบบงานแม่บ้าน' : 'สร้างแม่แบบงานแม่บ้านใหม่'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    ชื่อแม่แบบงาน (Task Template Name)
                  </label>
                  <Input
                    placeholder="เช่น ทำความสะอาดหลัง Checkout ด่วน"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ประเภทงาน (Task Type)
                    </label>
                    <select
                      value={form.taskType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          taskType: e.target.value as TaskTemplate['taskType'],
                        })
                      }
                      className="w-full text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                      {Object.entries(TASK_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ความเร่งด่วนเริ่มต้น
                    </label>
                    <select
                      value={form.defaultPriority}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          defaultPriority: e.target.value as TaskTemplate['defaultPriority'],
                        })
                      }
                      className="w-full text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                      {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    ระยะเวลาประเมินมาตรฐาน (นาที)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    value={form.estimatedMinutes || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimatedMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    คำอธิบาย / ขั้นตอน SOP แม่บ้าน
                  </label>
                  <textarea
                    rows={3}
                    placeholder="ระบุสิ่งที่ต้องทำ เช่น เปลี่ยนผ้าปูเตียง เช็ดฝุ่น ขัดห้องน้ำ เติมน้ำดื่ม"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isTemplateActiveCheck"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label
                    htmlFor="isTemplateActiveCheck"
                    className="text-xs text-slate-700 select-none"
                  >
                    เปิดใช้งานแม่แบบนี้ทันที (Active)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  บันทึก
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Delete Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">
                ยืนยันการลบแม่แบบงาน
              </h3>
              <p className="text-xs text-slate-500">
                ต้องการลบแม่แบบงาน{' '}
                <strong className="text-slate-800">{deleteTarget.name}</strong>{' '}
                ออกจากระบบหรือไม่?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(null)}
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  ยืนยันลบ
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default HousekeepingTasksPage;


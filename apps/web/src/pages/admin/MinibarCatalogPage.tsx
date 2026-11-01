import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import {
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
  AlertTriangle,
  Package,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================
export interface MinibarItem {
  id: string;
  name: string;
  category: string;
  pricePerUnit: number;
  unit: string;
  isActive: boolean;
}

// shortcut: mock data only, upgrade when /api/room-inventory/minibar-items is ready (@Legxcy77)
const SEED_ITEMS: MinibarItem[] = [
  { id: 'mb-001', name: 'น้ำดื่ม 600ml', category: 'เครื่องดื่ม', pricePerUnit: 20, unit: 'ขวด', isActive: true },
  { id: 'mb-002', name: 'โค้ก 330ml', category: 'เครื่องดื่ม', pricePerUnit: 35, unit: 'กระป๋อง', isActive: true },
  { id: 'mb-003', name: 'เบียร์ Chang 330ml', category: 'แอลกอฮอล์', pricePerUnit: 80, unit: 'กระป๋อง', isActive: true },
  { id: 'mb-004', name: 'มันฝรั่งทอด', category: 'ขนม', pricePerUnit: 45, unit: 'ถุง', isActive: true },
  { id: 'mb-005', name: 'ช็อกโกแลต KitKat', category: 'ขนม', pricePerUnit: 35, unit: 'แท่ง', isActive: true },
  { id: 'mb-006', name: 'กาแฟสำเร็จรูป', category: 'เครื่องดื่ม', pricePerUnit: 25, unit: 'ซอง', isActive: false },
];

const CATEGORIES = ['ทั้งหมด', 'เครื่องดื่ม', 'แอลกอฮอล์', 'ขนม', 'อื่นๆ'];

const EMPTY_FORM: Omit<MinibarItem, 'id'> = {
  name: '',
  category: 'เครื่องดื่ม',
  pricePerUnit: 0,
  unit: 'ชิ้น',
  isActive: true,
};

// ============================================================================
// Component
// ============================================================================
export const MinibarCatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<MinibarItem[]>(SEED_ITEMS);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('ทั้งหมด');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MinibarItem | null>(null);
  const [form, setForm] = useState<Omit<MinibarItem, 'id'>>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<MinibarItem | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const filtered = items.filter((it) => {
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'ทั้งหมด' || it.category === filterCat;
    return matchSearch && matchCat;
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: MinibarItem) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, pricePerUnit: item.pricePerUnit, unit: item.unit, isActive: item.isActive });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || form.pricePerUnit <= 0) return;
    if (editItem) {
      setItems((prev) => prev.map((it) => (it.id === editItem.id ? { ...editItem, ...form } : it)));
    } else {
      setItems((prev) => [...prev, { id: `mb-${Date.now()}`, ...form }]);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const toggleActive = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isActive: !it.isActive } : it)));
  };

  return (
    <AdminLayout activePath="/admin/minibar" isBackendOffline={false}>
      <div className="px-4 py-3.5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              {t('header.minibar.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{t('header.minibar.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRefreshSuccess(true); setTimeout(() => setRefreshSuccess(false), 2500); }}
              className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span>{refreshSuccess ? t('action.refreshSuccess') : t('action.refresh')}</span>
            </Button>
            <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 h-9 flex items-center gap-1.5 font-semibold">
              <Plus className="w-4 h-4" />
              {t('action.addItem')}
            </Button>
          </div>
        </div>

        {/* API notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>หมายเหตุ (Dev):</strong> ข้อมูลนี้ยังเป็น mock data ในเครื่อง — รอ <code>/api/room-inventory/minibar-items</code> จากบุญ (@Legxcy77) ก่อน deploy จริง
          </span>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="ค้นหาสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm h-8"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterCat === cat
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'สินค้าทั้งหมด', value: items.length, color: 'text-slate-700' },
            { label: 'พร้อมขาย', value: items.filter((i) => i.isActive).length, color: 'text-emerald-600' },
            { label: 'ระงับการขาย', value: items.filter((i) => !i.isActive).length, color: 'text-slate-400' },
          ].map((s) => (
            <Card key={s.label} className="shadow-none border border-slate-100">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="shadow-none border border-slate-100">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              รายการสินค้า ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500">ชื่อสินค้า</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-500">หมวดหมู่</th>
                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-slate-500">ราคา/หน่วย</th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-slate-500">หน่วย</th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-slate-500">สถานะ</th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-slate-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        ไม่พบสินค้า
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                          ฿{item.pricePerUnit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 text-xs">{item.unit}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleActive(item.id)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              item.isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {item.isActive ? 'พร้อมขาย' : 'ระงับ'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
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
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                {editItem ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ชื่อสินค้า *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น น้ำดื่ม 600ml"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">หมวดหมู่</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                  >
                    {CATEGORIES.filter((c) => c !== 'ทั้งหมด').map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">หน่วย</label>
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="ขวด / ชิ้น / ซอง"
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ราคาต่อหน่วย (฿) *</label>
                <Input
                  type="number"
                  min={0}
                  value={form.pricePerUnit}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerUnit: Number(e.target.value) }))}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="accent-orange-500"
                />
                <label htmlFor="isActive" className="text-xs text-slate-600">พร้อมขาย</label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                onClick={handleSave}
                disabled={!form.name.trim() || form.pricePerUnit <= 0}
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
              ลบ <strong>{deleteTarget.name}</strong> ออกจากรายการมินิบาร์?
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

export default MinibarCatalogPage;

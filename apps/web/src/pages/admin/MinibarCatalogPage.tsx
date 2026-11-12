import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { getAuthToken, apiUrl } from '@/lib/api';
import {
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
  Package,
  RefreshCw,
  CheckCircle2,
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
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl('/api/room-inventory/minibar-items'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
        }
      }
    } catch (err) {
      console.warn('Fallback to local state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
    setForm({
      name: item.name,
      category: item.category,
      pricePerUnit: item.pricePerUnit,
      unit: item.unit,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.pricePerUnit <= 0) return;
    const token = getAuthToken();
    try {
      if (editItem) {
        await fetch(apiUrl(`/api/room-inventory/minibar-items/${editItem.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(apiUrl('/api/room-inventory/minibar-items'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(form),
        });
      }
      await fetchItems();
    } catch {
      // Local optimistic fallback
      if (editItem) {
        setItems((prev) => prev.map((it) => (it.id === editItem.id ? { ...editItem, ...form } : it)));
      } else {
        setItems((prev) => [...prev, { id: `mb-${Date.now()}`, ...form }]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const token = getAuthToken();
    try {
      await fetch(apiUrl(`/api/room-inventory/minibar-items/${deleteTarget.id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await fetchItems();
    } catch {
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const toggleActive = async (id: string) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    const token = getAuthToken();
    try {
      await fetch(apiUrl(`/api/room-inventory/minibar-items/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isActive: !it.isActive }),
      });
      await fetchItems();
    } catch {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)));
    }
  };

  return (
    <AdminLayout activePath="/admin/minibar" isBackendOffline={false}>
      <div className="px-4 py-3.5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              {t('header.minibar.title') || 'รายการมินิบาร์ (Minibar Catalog)'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดราคาสินค้าในมินิบาร์ — Owner และ Front Desk จัดการร่วมกัน
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await fetchItems();
                setRefreshSuccess(true);
                setTimeout(() => setRefreshSuccess(false), 2500);
              }}
              className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{refreshSuccess ? 'อัปเดตเรียบร้อย' : 'รีเฟรช'}</span>
            </Button>
            <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 h-9 flex items-center gap-1.5 font-semibold cursor-pointer">
              <Plus className="w-4 h-4" />
              เพิ่มสินค้า
            </Button>
          </div>
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
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
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

        {/* Items Table */}
        <Card className="shadow-none border border-slate-100">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              รายการสินค้า ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                ไม่พบรายการสินค้าที่ค้นหา
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400 font-mono">{item.id}</span>
                          <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-slate-200 text-slate-600">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-slate-500">หน่วย: {item.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-800">
                          ฿{item.pricePerUnit.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">/{item.unit}</span>
                      </div>

                      <button
                        onClick={() => toggleActive(item.id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.isActive ? 'พร้อมขาย' : 'ระงับ'}
                      </button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Create / Edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-orange-500" />
                  {editItem ? 'แก้ไขสินค้ามินิบาร์' : 'เพิ่มสินค้ามินิบาร์ใหม่'}
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
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสินค้า</label>
                  <Input
                    placeholder="เช่น น้ำแร่ 500ml"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">หมวดหมู่</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-orange-500"
                    >
                      {CATEGORIES.filter((c) => c !== 'ทั้งหมด').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">หน่วยนับ</label>
                    <Input
                      placeholder="เช่น ขวด, กระป๋อง"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ราคาขายต่อหน่วย (บาท)</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0.00"
                    value={form.pricePerUnit || ''}
                    onChange={(e) => setForm({ ...form, pricePerUnit: parseFloat(e.target.value) || 0 })}
                    className="text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded text-orange-500 focus:ring-orange-400"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs text-slate-700 select-none">
                    พร้อมจำหน่ายทันที (Active)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5">
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
              <h3 className="font-semibold text-slate-800 text-sm">ยืนยันการลบสินค้า</h3>
              <p className="text-xs text-slate-500">
                ต้องการลบ <strong className="text-slate-800">{deleteTarget.name}</strong> ออกจากระบบหรือไม่?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                  ยกเลิก
                </Button>
                <Button size="sm" onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
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

export default MinibarCatalogPage;

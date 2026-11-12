import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
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
  RotateCcw,
  ChevronLeft,
  ChevronRight,
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
  { id: 'mb-003', name: 'สไปรท์ 330ml', category: 'เครื่องดื่ม', pricePerUnit: 35, unit: 'กระป๋อง', isActive: true },
  { id: 'mb-004', name: 'เบียร์ Chang 330ml', category: 'แอลกอฮอล์', pricePerUnit: 80, unit: 'กระป๋อง', isActive: true },
  { id: 'mb-005', name: 'เบียร์ Singha 330ml', category: 'แอลกอฮอล์', pricePerUnit: 90, unit: 'กระป๋อง', isActive: true },
  { id: 'mb-006', name: 'ไวน์แดงขวดเล็ก 187ml', category: 'แอลกอฮอล์', pricePerUnit: 280, unit: 'ขวด', isActive: true },
  { id: 'mb-007', name: 'มันฝรั่งทอด Lay\'s', category: 'ขนม', pricePerUnit: 45, unit: 'ถุง', isActive: true },
  { id: 'mb-008', name: 'ช็อกโกแลต KitKat', category: 'ขนม', pricePerUnit: 35, unit: 'แท่ง', isActive: true },
  { id: 'mb-009', name: 'ถั่วรวมอบเกลือ', category: 'ขนม', pricePerUnit: 50, unit: 'ซอง', isActive: true },
  { id: 'mb-010', name: 'กาแฟสำเร็จรูป', category: 'เครื่องดื่ม', pricePerUnit: 25, unit: 'ซอง', isActive: false },
  { id: 'mb-011', name: 'ชาเขียวโออิชิ 380ml', category: 'เครื่องดื่ม', pricePerUnit: 30, unit: 'ขวด', isActive: true },
  { id: 'mb-012', name: 'ป๊อปคอร์นคาราเมล', category: 'ขนม', pricePerUnit: 65, unit: 'ถุง', isActive: true },
  { id: 'mb-013', name: 'บะหมี่กึ่งสำเร็จรูป', category: 'ขนม', pricePerUnit: 35, unit: 'ถ้วย', isActive: true },
  { id: 'mb-014', name: 'น้ำแร่ Perrier 330ml', category: 'เครื่องดื่ม', pricePerUnit: 95, unit: 'ขวด', isActive: true },
];

const CATEGORIES = ['ทั้งหมด', 'เครื่องดื่ม', 'แอลกอฮอล์', 'ขนม', 'อื่นๆ'];
const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MinibarItem | null>(null);
  const [form, setForm] = useState<Omit<MinibarItem, 'id'>>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<MinibarItem | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const loadMinibarItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<MinibarItem[]>('/api/minibar-items');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setIsOffline(false);
        setItems(res.data);
      } else {
        setIsOffline(res.isOffline);
        setItems(SEED_ITEMS);
      }
    } catch {
      setIsOffline(true);
      setItems(SEED_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMinibarItems();
  }, []);

  const handleRefresh = async () => {
    setRefreshSuccess(false);
    await loadMinibarItems();
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 2500);
  };

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'ทั้งหมด' || it.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [items, search, filterCat]);

  // Reset to page 1 on filter/search change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setFilterCat(val);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

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
    const payload = {
      name: form.name.trim(),
      category: form.category,
      pricePerUnit: Number(form.pricePerUnit),
      unit: form.unit.trim() || 'ชิ้น',
      isActive: form.isActive,
    };

    try {
      if (editItem) {
        await apiFetch(`/api/minibar-items/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/minibar-items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await loadMinibarItems();
    } catch {
      if (editItem) {
        setItems((prev) => prev.map((it) => (it.id === editItem.id ? { ...editItem, ...payload } : it)));
      } else {
        setItems((prev) => [{ id: `mb-${Date.now()}`, ...payload }, ...prev]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/minibar-items/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      await loadMinibarItems();
    } catch {
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const toggleActive = async (id: string) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;
    const newActive = !target.isActive;
    try {
      await apiFetch(`/api/minibar-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: newActive }),
      });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isActive: newActive } : it)));
    } catch {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isActive: newActive } : it)));
    }
  };

  return (
    <AdminLayout activePath="/admin/minibar" isBackendOffline={isOffline}>
      {/* ── Page Header ── */}
      <div className="bg-white px-4 py-3.5 mb-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{t('nav.home')}</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">{t('header.minibar.title')}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#F97316]" />
              <span>{t('header.minibar.title')}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">{t('header.minibar.desc')}</p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>{refreshSuccess ? t('action.refreshSuccess') : t('action.refresh')}</span>
            </Button>
            <Button
              size="sm"
              onClick={openCreate}
              className="bg-[#F97316] hover:bg-orange-600 text-white text-xs font-semibold px-3 h-9 flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('action.addItem')}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 space-y-4">
        {/* ── 3 Neutral Stats Cards (Zero Rainbow Slop) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'สินค้าทั้งหมด', value: items.length },
            { label: 'พร้อมขาย', value: items.filter((i) => i.isActive).length },
            { label: 'ระงับการขาย', value: items.filter((i) => !i.isActive).length },
          ].map((s) => (
            <Card key={s.label} className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Clean Toolbar with Selection Dropdown (Matching Room Types Tab) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อสินค้า..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-44">
              <Select
                value={filterCat}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="text-xs h-9 bg-white"
              >
                <option value="ทั้งหมด">ทุกหมวดหมู่</option>
                {CATEGORIES.filter((c) => c !== 'ทั้งหมด').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>

            {(search || filterCat !== 'ทั้งหมด') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilterCat('ทั้งหมด');
                  setCurrentPage(1);
                }}
                className="h-9 text-xs text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>

          <div className="text-xs text-slate-500 shrink-0 font-medium">
            แสดง {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} จากทั้งหมด {filtered.length} รายการสินค้า
          </div>
        </div>

        {/* ── Table (Matching Room Types Enterprise Font & Spacing) ── */}
        <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden rounded-xl">
          <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                รายการสินค้า · {filtered.length} รายการ
              </CardTitle>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              * ราคารวมภาษีมูลค่าเพิ่ม 7% เมื่อลงบิลเช็คเอาท์
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 w-72">ชื่อสินค้า</th>
                    <th className="py-2.5 px-3 w-40">หมวดหมู่</th>
                    <th className="py-2.5 px-3 text-center w-36">ราคาต่อหน่วย</th>
                    <th className="py-2.5 px-3 text-center w-28">หน่วยนับ</th>
                    <th className="py-2.5 px-3 text-center w-36">สถานะ</th>
                    <th className="py-2.5 px-4 text-center w-40">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        ไม่พบสินค้าที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-700 font-normal">{item.name}</td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="text-xs text-slate-700 font-normal">{item.category}</span>
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-slate-700 font-normal">
                          ฿{item.pricePerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 text-xs">{item.unit}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleActive(item.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                            title="คลิกเพื่อสลับสถานะ"
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                item.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            <span>{item.isActive ? 'พร้อมขาย' : 'ระงับการขาย'}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(item)}
                              className="h-7 text-xs px-2 border-slate-300 text-slate-700 hover:bg-slate-50 gap-1 font-medium"
                            >
                              <Pencil className="w-3 h-3 text-slate-500" />
                              <span>แก้ไข</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(item)}
                              className="h-7 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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

        {/* ── Pagination Bar (Active when items > 10) ── */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs mt-4">
            <div className="text-xs text-slate-500 font-medium">
              แสดง <span className="font-semibold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
              </span>{' '}
              จากทั้งหมด <span className="font-semibold text-slate-800">{filtered.length}</span> รายการสินค้า · 10 รายการต่อหน้า
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                ก่อนหน้า
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    currentPage === pageNum
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                ถัดไป
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal (Styled like Add Room Type Modal with Red Asterisks) ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">
                  {editItem ? 'แก้ไขสินค้ามินิบาร์' : 'เพิ่มสินค้ามินิบาร์ใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ชื่อสินค้า <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น น้ำดื่ม 600ml"
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    หมวดหมู่ <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="text-xs h-9"
                  >
                    {CATEGORIES.filter((c) => c !== 'ทั้งหมด').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    หน่วยนับ <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="ขวด / กระป๋อง / ถุง"
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ราคาต่อหน่วย · บาท <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.pricePerUnit}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerUnit: Number(e.target.value) }))}
                  className="text-xs font-mono h-9"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="accent-[#F97316] w-4 h-4 rounded"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  เปิดให้จำหน่าย (พร้อมขาย)
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
                className="flex-1 text-xs h-9"
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!form.name.trim() || form.pricePerUnit <= 0}
                className="flex-1 bg-[#F97316] hover:bg-orange-600 text-white text-xs h-9 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึก</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-slate-800">ยืนยันการลบสินค้า</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              ต้องการลบรายการ <strong>{deleteTarget.name}</strong> ออกจากแคตตาล็อกมินิบาร์หรือไม่?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 text-xs h-9"
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-9 shadow-2xs"
              >
                ยืนยันการลบ
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default MinibarCatalogPage;

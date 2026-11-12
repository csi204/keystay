import React, { useState, useEffect, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  X,
  Save,
  RotateCcw,
} from 'lucide-react';

export interface AmenityItem {
  id: string;
  nameTh: string;
  nameEn: string;
  category: 'bedding' | 'bath' | 'appliance' | 'food_drink' | 'other';
  isChargeable: boolean;
  unitPrice: number;
  unitNameTh: string;
  unitNameEn: string;
  stockQuantity: number; // -1 for unlimited
  isActive: boolean;
}

const SEED_AMENITIES: AmenityItem[] = [
  {
    id: 'am-extra-bed',
    nameTh: 'เตียงเสริม',
    nameEn: 'Extra Bed',
    category: 'bedding',
    isChargeable: true,
    unitPrice: 300.0,
    unitNameTh: 'หลัง/คืน',
    unitNameEn: 'bed/night',
    stockQuantity: 10,
    isActive: true,
  },
  {
    id: 'am-extra-pillow',
    nameTh: 'หมอนหนุนเสริม',
    nameEn: 'Extra Pillow',
    category: 'bedding',
    isChargeable: false,
    unitPrice: 0.0,
    unitNameTh: 'ใบ',
    unitNameEn: 'piece',
    stockQuantity: 40,
    isActive: true,
  },
  {
    id: 'am-extra-towel',
    nameTh: 'ผ้าเช็ดตัวเพิ่ม',
    nameEn: 'Extra Towel',
    category: 'bath',
    isChargeable: false,
    unitPrice: 0.0,
    unitNameTh: 'ผืน',
    unitNameEn: 'piece',
    stockQuantity: 50,
    isActive: true,
  },
  {
    id: 'am-bath-kit',
    nameTh: 'ชุดของใช้ห้องน้ำพรีเมียม',
    nameEn: 'Premium Bath Kit',
    category: 'bath',
    isChargeable: true,
    unitPrice: 150.0,
    unitNameTh: 'ชุด',
    unitNameEn: 'set',
    stockQuantity: 30,
    isActive: true,
  },
  {
    id: 'am-hair-dryer',
    nameTh: 'ไดร์เป่าผมเสริม',
    nameEn: 'Extra Hair Dryer',
    category: 'appliance',
    isChargeable: false,
    unitPrice: 0.0,
    unitNameTh: 'เครื่อง',
    unitNameEn: 'unit',
    stockQuantity: 15,
    isActive: true,
  },
  {
    id: 'am-iron',
    nameTh: 'เตารีดพร้อมโต๊ะรีดผ้า',
    nameEn: 'Iron & Board',
    category: 'appliance',
    isChargeable: false,
    unitPrice: 0.0,
    unitNameTh: 'ชุด',
    unitNameEn: 'set',
    stockQuantity: 8,
    isActive: true,
  },
];

export interface AmenitiesCatalogTabRef {
  openCreate: () => void;
}

interface AmenitiesCatalogTabProps {
  isOwner: boolean;
  isOffline: boolean;
}

export const AmenitiesCatalogTab = React.forwardRef<AmenitiesCatalogTabRef, AmenitiesCatalogTabProps>(({
  isOwner,
  isOffline,
}, ref) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<AmenityItem[]>(SEED_AMENITIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [chargeableFilter, setChargeableFilter] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AmenityItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AmenityItem | null>(null);
  const [validationError, setValidationError] = useState('');

  useImperativeHandle(ref, () => ({
    openCreate: () => openCreateModal(),
  }));

  const [form, setForm] = useState({
    nameTh: '',
    nameEn: '',
    category: 'bedding' as 'bedding' | 'bath' | 'appliance' | 'food_drink' | 'other',
    isChargeable: false,
    unitPrice: '0',
    unitNameTh: 'ชิ้น',
    unitNameEn: 'piece',
    stockQuantity: '-1',
  });

  // Load from backend if available
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await apiFetch<AmenityItem[]>('/api/v1/amenities');
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setItems(res.data);
        }
      } catch {
        // Fallback to seed data
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      it.nameTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || it.category === categoryFilter;
    const matchesChargeable =
      chargeableFilter === 'all' ||
      (chargeableFilter === 'free' && !it.isChargeable) ||
      (chargeableFilter === 'paid' && it.isChargeable);

    return matchesSearch && matchesCategory && matchesChargeable;
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      nameTh: '',
      nameEn: '',
      category: 'bedding',
      isChargeable: false,
      unitPrice: '0',
      unitNameTh: 'ชิ้น',
      unitNameEn: 'piece',
      stockQuantity: '-1',
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: AmenityItem) => {
    setEditingItem(item);
    setForm({
      nameTh: item.nameTh,
      nameEn: item.nameEn,
      category: item.category,
      isChargeable: item.isChargeable,
      unitPrice: String(item.unitPrice),
      unitNameTh: item.unitNameTh,
      unitNameEn: item.unitNameEn,
      stockQuantity: String(item.stockQuantity),
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: string) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;
    const newActive = !target.isActive;
    try {
      await apiFetch(`/api/v1/amenities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: newActive }),
      });
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, isActive: newActive } : it))
      );
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, isActive: newActive } : it))
      );
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameTh.trim()) {
      setValidationError('กรุณาระบุชื่อของใช้ (ภาษาไทย)');
      return;
    }
    const price = parseFloat(form.unitPrice) || 0;
    if (form.isChargeable && price <= 0) {
      setValidationError('รายการที่คิดเงินต้องระบุราคาต่อหน่วยมากกว่า 0 บาท');
      return;
    }

    const itemData: AmenityItem = {
      id: editingItem ? editingItem.id : `am-${Date.now().toString().slice(-6)}`,
      nameTh: form.nameTh.trim(),
      nameEn: form.nameEn.trim() || form.nameTh.trim(),
      category: form.category,
      isChargeable: form.isChargeable,
      unitPrice: form.isChargeable ? price : 0,
      unitNameTh: form.unitNameTh.trim() || 'ชิ้น',
      unitNameEn: form.unitNameEn.trim() || 'piece',
      stockQuantity: parseInt(form.stockQuantity, 10) || -1,
      isActive: editingItem ? editingItem.isActive : true,
    };

    try {
      if (editingItem) {
        await apiFetch(`/api/v1/amenities/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(itemData),
        });
      } else {
        await apiFetch('/api/v1/amenities', {
          method: 'POST',
          body: JSON.stringify(itemData),
        });
      }
      const res = await apiFetch<AmenityItem[]>('/api/v1/amenities');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setItems(res.data);
      } else {
        if (editingItem) {
          setItems((prev) => prev.map((it) => (it.id === editingItem.id ? itemData : it)));
        } else {
          setItems((prev) => [itemData, ...prev]);
        }
      }
    } catch {
      if (editingItem) {
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? itemData : it)));
      } else {
        setItems((prev) => [itemData, ...prev]);
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      await apiFetch(`/api/v1/amenities/${deletingItem.id}`, {
        method: 'DELETE',
      });
      const res = await apiFetch<AmenityItem[]>('/api/v1/amenities');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setItems(res.data);
      } else {
        setItems((prev) => prev.filter((it) => it.id !== deletingItem.id));
      }
    } catch {
      setItems((prev) => prev.filter((it) => it.id !== deletingItem.id));
    }
    setDeletingItem(null);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'bedding':
        return 'ห้องนอน / ที่นอน';
      case 'bath':
        return 'ห้องน้ำ / ซักรีด';
      case 'appliance':
        return 'เครื่องใช้ไฟฟ้า';
      case 'food_drink':
        return 'อาหารและเครื่องดื่ม';
      default:
        return 'บริการอื่นๆ';
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar: Search & Filters (Clean, Matching Tab 1 & Tab 2) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อของใช้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs h-9 bg-white border-slate-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs h-9 bg-white"
            >
              <option value="all">ทุกหมวดหมู่</option>
              <option value="bedding">ห้องนอน / ที่นอน</option>
              <option value="bath">ห้องน้ำ / ซักรีด</option>
              <option value="appliance">เครื่องใช้ไฟฟ้า</option>
              <option value="food_drink">อาหารและเครื่องดื่ม</option>
              <option value="other">บริการอื่นๆ</option>
            </Select>
          </div>

          <div className="w-48">
            <Select
              value={chargeableFilter}
              onChange={(e) => setChargeableFilter(e.target.value)}
              className="text-xs h-9 bg-white"
            >
              <option value="all">ทุกประเภทการคิดเงิน</option>
              <option value="free">เฉพาะบริการฟรี</option>
              <option value="paid">เฉพาะมีค่าบริการ</option>
            </Select>
          </div>

          {(searchQuery || categoryFilter !== 'all' || chargeableFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setChargeableFilter('all');
              }}
              className="h-9 text-xs text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      </div>

      {/* ── Amenities Table (Clean Enterprise Design) ── */}
      <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden rounded-xl">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#F97316]" />
            <CardTitle className="text-sm font-bold text-slate-900">
              แคตตาล็อกของใช้และบริการเสริม · {filteredItems.length} รายการ
            </CardTitle>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            * รายการคิดเงินจะรวมกับบิลเพื่อคำนวณภาษีมูลค่าเพิ่ม 7% ตอนเช็คเอาท์
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">ชื่อรายการ</th>
                  <th className="py-2.5 px-3">หมวดหมู่</th>
                  <th className="py-2.5 px-3">ประเภทการคิดเงิน</th>
                  <th className="py-2.5 px-3 text-right">ราคาต่อหน่วย</th>
                  <th className="py-2.5 px-3 text-center">หน่วยนับ</th>
                  <th className="py-2.5 px-3 text-center">คงเหลือในสต็อก</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  {isOwner && <th className="py-2.5 px-4 text-center">การจัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบรายการของใช้ที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.nameTh}</div>
                        <div className="text-[11px] text-slate-400 font-sans">{item.nameEn}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="text-xs text-slate-700">
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      {/* Subtle, zero-slop billing type text */}
                      <td className="py-3 px-3">
                        {item.isChargeable ? (
                          <span className="text-xs text-slate-700 font-medium">
                            มีค่าบริการ
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            ฟรี
                          </span>
                        )}
                      </td>
                      {/* Neutral monochrome price */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                        {item.isChargeable ? (
                          <span>
                            ฿{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">฿0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 text-xs">
                        {item.unitNameTh}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs">
                        {item.stockQuantity === -1 ? (
                          <span className="text-slate-400">ไม่จำกัด</span>
                        ) : (
                          <span className="font-semibold text-slate-700">{item.stockQuantity}</span>
                        )}
                      </td>
                      {/* Minimal enterprise status dot */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                          title="คลิกเพื่อสลับสถานะเปิด/ปิด"
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <span>{item.isActive ? 'เปิดบริการ' : 'ปิดชั่วคราว'}</span>
                        </button>
                      </td>
                      {isOwner && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(item)}
                              className="h-7 px-2 text-[11px] border-slate-300 text-slate-700"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingItem(item)}
                              className="h-7 px-2 text-[11px] border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal: Add / Edit Amenity ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingItem ? 'แก้ไขรายการของใช้/บริการ' : 'เพิ่มรายการของใช้/บริการใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ชื่อรายการ (ไทย) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="เช่น เตียงเสริม"
                    value={form.nameTh}
                    onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ชื่อรายการ (EN)
                  </label>
                  <Input
                    placeholder="เช่น Extra Bed"
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    หมวดหมู่ <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="text-xs h-9"
                  >
                    <option value="bedding">ห้องนอน / ที่นอน</option>
                    <option value="bath">ห้องน้ำ / ซักรีด</option>
                    <option value="appliance">เครื่องใช้ไฟฟ้า</option>
                    <option value="food_drink">อาหารและเครื่องดื่ม</option>
                    <option value="other">บริการอื่นๆ</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ประเภทการคิดเงิน <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.isChargeable ? 'chargeable' : 'free'}
                    onChange={(e) => {
                      const chargeable = e.target.value === 'chargeable';
                      setForm({
                        ...form,
                        isChargeable: chargeable,
                        unitPrice: chargeable ? (form.unitPrice === '0' ? '100' : form.unitPrice) : '0',
                      });
                    }}
                    className="text-xs h-9"
                  >
                    <option value="free">บริการฟรี</option>
                    <option value="chargeable">มีค่าบริการ</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ราคาต่อหน่วย {form.isChargeable && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    type="number"
                    step="any"
                    disabled={!form.isChargeable}
                    placeholder="0.00"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    className="text-xs font-mono h-9 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    หน่วยนับ (ไทย) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="เช่น หลัง, ชิ้น, ชุด"
                    value={form.unitNameTh}
                    onChange={(e) => setForm({ ...form, unitNameTh: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    หน่วยนับ (EN)
                  </label>
                  <Input
                    placeholder="เช่น bed, piece"
                    value={form.unitNameEn}
                    onChange={(e) => setForm({ ...form, unitNameEn: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  จำนวนสต็อกคงเหลือ (-1 หากไม่จำกัด)
                </label>
                <Input
                  type="number"
                  placeholder="-1 หรือ จำนวนชิ้น"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 text-xs border-slate-300"
                >
                  {t('action.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('action.save')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirm ── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm">ยืนยันการลบรายการของใช้</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              คุณต้องการลบรายการ <strong>"{deletingItem.nameTh}"</strong> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingItem(null)}
                className="h-8 text-xs"
              >
                {t('action.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteConfirm}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {t('action.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

AmenitiesCatalogTab.displayName = 'AmenitiesCatalogTab';

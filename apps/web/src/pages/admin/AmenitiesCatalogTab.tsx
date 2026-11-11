import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Tag,
  DollarSign,
  Gift,
  Receipt,
  Layers,
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
    nameTh: 'เตียงเสริม (Extra Bed)',
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

interface AmenitiesCatalogTabProps {
  isOwner: boolean;
  isOffline: boolean;
}

export const AmenitiesCatalogTab: React.FC<AmenitiesCatalogTabProps> = ({
  isOwner,
  isOffline,
}) => {
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

  // Metrics
  const totalCount = items.length;
  const freeCount = items.filter((it) => !it.isChargeable).length;
  const paidCount = items.filter((it) => it.isChargeable).length;

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

  const handleToggleActive = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isActive: !it.isActive } : it))
    );
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
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
      id: editingItem ? editingItem.id : `am-${Date.now()}`,
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

    if (editingItem) {
      setItems((prev) => prev.map((it) => (it.id === editingItem.id ? itemData : it)));
    } else {
      setItems((prev) => [itemData, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    setItems((prev) => prev.filter((it) => it.id !== deletingItem.id));
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
      {/* ── Metric Summary Chips ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              รายการทั้งหมด
            </span>
            <span className="text-xl font-bold font-mono text-slate-800">{totalCount} รายการ</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-emerald-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              บริการฟรี (ไม่ลงบิล)
            </span>
            <span className="text-xl font-bold font-mono text-emerald-800">{freeCount} รายการ</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Gift className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-orange-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider block">
              มีค่าบริการ (ลงบิล Folio อัตโนมัติ)
            </span>
            <span className="text-xl font-bold font-mono text-[#F97316]">{paidCount} รายการ</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-[#F97316]">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search & Filters ── */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อของใช้ (ไทย/EN)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 text-xs h-9 bg-white"
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

          <div className="w-40">
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

          <div className="w-40">
            <Select
              value={chargeableFilter}
              onChange={(e) => setChargeableFilter(e.target.value)}
              className="text-xs h-9 bg-white"
            >
              <option value="all">ทุกประเภทการคิดเงิน</option>
              <option value="free">เฉพาะบริการฟรี (฿0)</option>
              <option value="paid">เฉพาะมีค่าบริการ (ลงบิล)</option>
            </Select>
          </div>
        </div>

        {isOwner && (
          <Button
            size="sm"
            onClick={openCreateModal}
            className="text-xs font-semibold gap-1.5 h-9 bg-[#F97316] hover:bg-[#ea580c] text-white shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('action.addAmenity')}</span>
          </Button>
        )}
      </div>

      {/* ── Amenities Table ── */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#F97316]" />
            <CardTitle className="text-sm font-bold text-slate-800">
              แคตตาล็อกของใช้และบริการเสริม ({filteredItems.length} รายการ)
            </CardTitle>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            * รายการคิดเงินจะถูกนำไปรวมกับบิล Folio เพื่อคำนวณ VAT 7% ตอนเช็คเอาท์
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ชื่อรายการ (TH / EN)</th>
                  <th className="py-2.5 px-3">หมวดหมู่</th>
                  <th className="py-2.5 px-3 text-center">ประเภทการคิดเงิน</th>
                  <th className="py-2.5 px-3 text-right">ราคาต่อหน่วย</th>
                  <th className="py-2.5 px-3 text-center">หน่วยนับ</th>
                  <th className="py-2.5 px-3 text-center">คงเหลือในสต็อก</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  {isOwner && <th className="py-2.5 px-3 text-center">การจัดการ</th>}
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
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{item.nameTh}</div>
                        <div className="text-[11px] text-slate-400 font-sans">{item.nameEn}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.isChargeable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                            <Receipt className="w-3 h-3 text-[#F97316]" />
                            มีค่าบริการ (ลงบิล Folio)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Gift className="w-3 h-3 text-emerald-600" />
                            ฟรี (ไม่คิดเงิน)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {item.isChargeable ? (
                          <span className="text-slate-900">
                            ฿{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-600">฿0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 text-[11px]">
                        {item.unitNameTh}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        {item.stockQuantity === -1 ? (
                          <span className="text-slate-400">ไม่จำกัด</span>
                        ) : (
                          <span className="font-semibold text-slate-700">{item.stockQuantity}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleActive(item.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {item.isActive ? 'เปิดบริการ' : 'ปิดชั่วคราว'}
                        </button>
                      </td>
                      {isOwner && (
                        <td className="py-3 px-3 text-center">
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
                    ชื่อภาษาไทย *
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
                    ชื่อภาษาอังกฤษ
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
                    หมวดหมู่ *
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
                    ประเภทการคิดเงิน *
                  </label>
                  <Select
                    value={form.isChargeable ? 'paid' : 'free'}
                    onChange={(e) => {
                      const isPaid = e.target.value === 'paid';
                      setForm({
                        ...form,
                        isChargeable: isPaid,
                        unitPrice: isPaid && form.unitPrice === '0' ? '100' : isPaid ? form.unitPrice : '0',
                      });
                    }}
                    className="text-xs h-9"
                  >
                    <option value="free">ฟรี (ไม่คิดเงิน)</option>
                    <option value="paid">มีค่าบริการ (ลงบิล Folio)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ราคาต่อหน่วย (THB) {form.isChargeable && '*'}
                  </label>
                  <Input
                    required={form.isChargeable}
                    disabled={!form.isChargeable}
                    type="number"
                    min="0"
                    step="any"
                    value={form.isChargeable ? form.unitPrice : '0'}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    className={`text-xs font-mono h-9 ${!form.isChargeable ? 'bg-slate-50 text-slate-400' : ''}`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    หน่วยนับ (ไทย / EN)
                  </label>
                  <Input
                    placeholder="เช่น หลัง/คืน, ชิ้น, ผืน"
                    value={form.unitNameTh}
                    onChange={(e) => setForm({ ...form, unitNameTh: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  จำนวนคงเหลือในสต็อก (-1 คือไม่จำกัด)
                </label>
                <Input
                  type="number"
                  placeholder="-1"
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
              คุณต้องการลบ <strong>"{deletingItem.nameTh}"</strong> ใช่หรือไม่? รายการนี้จะถูกลบออกจากแคตตาล็อก
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
};


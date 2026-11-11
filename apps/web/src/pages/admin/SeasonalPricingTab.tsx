import React, { useState, useEffect, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  X,
  Save,
  RotateCcw,
} from 'lucide-react';
import type { RoomTypeItem } from './RoomsPricingPage';

export interface SeasonalPricingRule {
  id: string;
  name: string;
  tier: string;
  roomTypeId: string | null;
  startDate: string;
  endDate: string;
  daysOfWeek: number[] | null; // [5, 6, 0] for Fri, Sat, Sun
  adjustmentType: 'percent' | 'fixed_amount';
  adjustmentValue: number;
  priority?: number;
  isActive: boolean;
}

export const DEFAULT_TIERS = [
  'High Season',
  'Regular',
  'Low Season',
  'Special Holiday',
];

const SEED_SEASONAL_RULES: SeasonalPricingRule[] = [
  {
    id: 'rule-high-winter',
    name: 'High Season ภาคเหนือ',
    tier: 'High Season',
    roomTypeId: null,
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    daysOfWeek: null,
    adjustmentType: 'percent',
    adjustmentValue: 5.0,
    isActive: true,
  },
  {
    id: 'rule-countdown',
    name: 'คืนเคานต์ดาวน์ปีใหม่',
    tier: 'Special Holiday',
    roomTypeId: null,
    startDate: '2026-12-31',
    endDate: '2027-01-01',
    daysOfWeek: null,
    adjustmentType: 'fixed_amount',
    adjustmentValue: 300.0,
    isActive: true,
  },
  {
    id: 'rule-weekend-regular',
    name: 'วันหยุดสุดสัปดาห์ ศุกร์ - อาทิตย์',
    tier: 'Regular',
    roomTypeId: null,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    daysOfWeek: [5, 6, 0],
    adjustmentType: 'fixed_amount',
    adjustmentValue: 200.0,
    isActive: true,
  },
  {
    id: 'rule-low-rainy',
    name: 'Low Season หน้าฝน วันธรรมดา',
    tier: 'Low Season',
    roomTypeId: null,
    startDate: '2026-06-01',
    endDate: '2026-09-30',
    daysOfWeek: [1, 2, 3, 4],
    adjustmentType: 'percent',
    adjustmentValue: -10.0,
    isActive: true,
  },
];

export interface SeasonalPricingTabRef {
  openCreate: () => void;
}

interface SeasonalPricingTabProps {
  isOwner: boolean;
  roomTypes: RoomTypeItem[];
  isOffline: boolean;
}

export const SeasonalPricingTab = React.forwardRef<SeasonalPricingTabRef, SeasonalPricingTabProps>(({
  isOwner,
  roomTypes,
  isOffline,
}, ref) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<SeasonalPricingRule[]>(SEED_SEASONAL_RULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');

  // Dynamic Tier management (supports adding custom tiers)
  const [availableTiers, setAvailableTiers] = useState<string[]>(DEFAULT_TIERS);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SeasonalPricingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<SeasonalPricingRule | null>(null);
  const [validationError, setValidationError] = useState('');

  useImperativeHandle(ref, () => ({
    openCreate: () => openCreateModal(),
  }));

  const [form, setForm] = useState({
    name: '',
    tier: 'High Season',
    isCustomTier: false,
    customTierName: '',
    roomTypeId: 'all',
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    daysSelection: 'all', // 'all' | 'weekend' | 'weekday'
    adjustmentType: 'percent' as 'percent' | 'fixed_amount',
    adjustmentValue: '5',
  });

  // Load rules from backend if available
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await apiFetch<SeasonalPricingRule[]>('/api/v1/pricing/rules');
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setRules(res.data);
          // Add any new tiers from backend
          const backendTiers = res.data.map((r) => r.tier).filter(Boolean);
          setAvailableTiers((prev) => Array.from(new Set([...prev, ...backendTiers])));
        }
      } catch {
        // Fallback to initial seeds
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Filter Rules
  const filteredRules = rules.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || r.tier === tierFilter;
    const matchesRoom =
      roomTypeFilter === 'all' ||
      (roomTypeFilter === 'all_rooms' && r.roomTypeId === null) ||
      r.roomTypeId === roomTypeFilter;
    return matchesSearch && matchesTier && matchesRoom;
  });

  const openCreateModal = () => {
    setEditingRule(null);
    setForm({
      name: '',
      tier: availableTiers[0] || 'High Season',
      isCustomTier: false,
      customTierName: '',
      roomTypeId: 'all',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      daysSelection: 'all',
      adjustmentType: 'percent',
      adjustmentValue: '5',
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const openEditModal = (rule: SeasonalPricingRule) => {
    setEditingRule(rule);
    let daysSel = 'all';
    if (rule.daysOfWeek && rule.daysOfWeek.length === 3 && rule.daysOfWeek.includes(5)) {
      daysSel = 'weekend';
    } else if (rule.daysOfWeek && rule.daysOfWeek.length === 4 && rule.daysOfWeek.includes(1)) {
      daysSel = 'weekday';
    }

    const isExistingTier = availableTiers.includes(rule.tier);

    setForm({
      name: rule.name,
      tier: rule.tier,
      isCustomTier: !isExistingTier,
      customTierName: isExistingTier ? '' : rule.tier,
      roomTypeId: rule.roomTypeId || 'all',
      startDate: rule.startDate,
      endDate: rule.endDate,
      daysSelection: daysSel,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: String(rule.adjustmentValue),
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleToggleActive = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setValidationError('กรุณาระบุชื่อกฎราคา');
      return;
    }
    if (form.startDate > form.endDate) {
      setValidationError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }
    const val = parseFloat(form.adjustmentValue);
    if (isNaN(val)) {
      setValidationError('กรุณาระบุค่าการปรับราคาให้ถูกต้อง');
      return;
    }

    let finalTier = form.tier;
    if (form.isCustomTier) {
      const trimmedCustom = form.customTierName.trim();
      if (!trimmedCustom) {
        setValidationError('กรุณาระบุชื่อ Tier ใหม่');
        return;
      }
      finalTier = trimmedCustom;
      if (!availableTiers.includes(finalTier)) {
        setAvailableTiers((prev) => [...prev, finalTier]);
      }
    }

    let daysOfWeek: number[] | null = null;
    if (form.daysSelection === 'weekend') daysOfWeek = [5, 6, 0];
    if (form.daysSelection === 'weekday') daysOfWeek = [1, 2, 3, 4];

    const ruleData: SeasonalPricingRule = {
      id: editingRule ? editingRule.id : `rule-${Date.now()}`,
      name: form.name.trim(),
      tier: finalTier,
      roomTypeId: form.roomTypeId === 'all' ? null : form.roomTypeId,
      startDate: form.startDate,
      endDate: form.endDate,
      daysOfWeek,
      adjustmentType: form.adjustmentType,
      adjustmentValue: val,
      isActive: editingRule ? editingRule.isActive : true,
    };

    if (editingRule) {
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? ruleData : r)));
    } else {
      setRules((prev) => [ruleData, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deletingRule) return;
    setRules((prev) => prev.filter((r) => r.id !== deletingRule.id));
    setDeletingRule(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar: Search & Filters (Clean, Matching Tab 1 & Tab 2) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อกฎราคา..."
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
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="text-xs h-9 bg-white"
            >
              <option value="all">ทุก Tier ฤดูกาล</option>
              {availableTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-48">
            <Select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="text-xs h-9 bg-white"
            >
              <option value="all">ทุกประเภทห้อง</option>
              <option value="all_rooms">บังคับใช้ทุกห้อง</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </Select>
          </div>

          {(searchQuery || tierFilter !== 'all' || roomTypeFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setTierFilter('all');
                setRoomTypeFilter('all');
              }}
              className="h-9 text-xs text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      </div>

      {/* ── Rules Table (Clean Enterprise Design) ── */}
      <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden rounded-xl">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <CardTitle className="text-sm font-bold text-slate-900">
              รายการกฎการปรับราคาตามฤดูกาลและเทศกาล · {filteredRules.length} กฎ
            </CardTitle>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            * ราคาพื้นฐานในประเภทห้องพักจะไม่ถูกเปลี่ยนแปลง
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">ชื่อกฎราคา</th>
                  <th className="py-2.5 px-3 text-center">ระดับราคา</th>
                  <th className="py-2.5 px-3">ประเภทห้องที่ใช้</th>
                  <th className="py-2.5 px-3">ช่วงวันที่บังคับใช้</th>
                  <th className="py-2.5 px-3">เงื่อนไขวัน</th>
                  <th className="py-2.5 px-3 text-right">การปรับราคา</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  {isOwner && <th className="py-2.5 px-4 text-center">การจัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบกฎการปรับราคาที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => {
                    const targetRoom = roomTypes.find((rt) => rt.id === rule.roomTypeId);
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {rule.name}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-xs text-slate-700">
                            {rule.tier}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {targetRoom ? (
                            <span className="text-xs text-slate-700">{targetRoom.name}</span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              ทุกประเภทห้อง
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {rule.startDate} ถึง {rule.endDate}
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {rule.daysOfWeek ? (
                            rule.daysOfWeek.includes(5) ? (
                              <span className="text-xs text-slate-700">
                                ศุกร์ - อาทิตย์
                              </span>
                            ) : (
                              <span className="text-xs text-slate-700">
                                จันทร์ - พฤหัสบดี
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">ทุกวัน</span>
                          )}
                        </td>
                        {/* Neutral monochrome price adjustment (Zero AI Slop) */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {rule.adjustmentValue > 0 ? '+' : ''}
                          {rule.adjustmentType === 'percent'
                            ? `${rule.adjustmentValue}%`
                            : `฿${rule.adjustmentValue.toLocaleString()}`}
                        </td>
                        {/* Minimal enterprise status dot */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                            title="คลิกเพื่อสลับสถานะเปิด/ปิด"
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                rule.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            <span>{rule.isActive ? 'เปิดใช้' : 'ปิด'}</span>
                          </button>
                        </td>
                        {isOwner && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(rule)}
                                className="h-7 px-2 text-[11px] border-slate-300 text-slate-700"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingRule(rule)}
                                className="h-7 px-2 text-[11px] border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal: Add / Edit Seasonal Rule ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingRule ? 'แก้ไขกฎราคาตามฤดูกาล' : 'เพิ่มกฎราคาตามฤดูกาลใหม่'}
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
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ชื่อกฎราคา *
                </label>
                <Input
                  required
                  placeholder="เช่น High Season ภาคเหนือ"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ระดับ Tier *
                  </label>
                  <Select
                    value={form.isCustomTier ? '__custom__' : form.tier}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setForm({ ...form, isCustomTier: true, customTierName: '' });
                      } else {
                        setForm({ ...form, tier: e.target.value, isCustomTier: false });
                      }
                    }}
                    className="text-xs h-9"
                  >
                    {availableTiers.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="__custom__">+ กำหนดชื่อ Tier ใหม่...</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ประเภทห้องพัก
                  </label>
                  <Select
                    value={form.roomTypeId}
                    onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
                    className="text-xs h-9"
                  >
                    <option value="all">ทุกประเภทห้อง</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {form.isCustomTier && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <label className="text-xs font-semibold text-slate-800 block mb-1">
                    ระบุชื่อ Tier ใหม่ *
                  </label>
                  <Input
                    required
                    placeholder="เช่น Songkran Festival, Early Bird, etc."
                    value={form.customTierName}
                    onChange={(e) => setForm({ ...form, customTierName: e.target.value })}
                    className="text-xs h-9 bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    วันที่เริ่มต้น *
                  </label>
                  <Input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    วันที่สิ้นสุด *
                  </label>
                  <Input
                    required
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  เงื่อนไขวันในสัปดาห์
                </label>
                <Select
                  value={form.daysSelection}
                  onChange={(e) => setForm({ ...form, daysSelection: e.target.value })}
                  className="text-xs h-9"
                >
                  <option value="all">ทุกวันในสัปดาห์</option>
                  <option value="weekend">เฉพาะ ศุกร์ - อาทิตย์</option>
                  <option value="weekday">เฉพาะ จันทร์ - พฤหัสบดี</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    รูปแบบการปรับราคา *
                  </label>
                  <Select
                    value={form.adjustmentType}
                    onChange={(e) =>
                      setForm({ ...form, adjustmentType: e.target.value as any })
                    }
                    className="text-xs h-9"
                  >
                    <option value="percent">เปอร์เซ็นต์ %</option>
                    <option value="fixed_amount">จำนวนเงินคงที่ บาท</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ค่าปรับราคา {form.adjustmentType === 'percent' ? '%' : 'บาท'} *
                  </label>
                  <Input
                    required
                    type="number"
                    step="any"
                    placeholder="เช่น 5 หรือ -10 หรือ 300"
                    value={form.adjustmentValue}
                    onChange={(e) => setForm({ ...form, adjustmentValue: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>
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
      {deletingRule && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm">ยืนยันการลบกฎราคา</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              คุณต้องการลบกฎ <strong>"{deletingRule.name}"</strong> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingRule(null)}
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

SeasonalPricingTab.displayName = 'SeasonalPricingTab';

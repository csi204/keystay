import React, { useState, useEffect } from 'react';
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
  Calendar,
  DollarSign,
  AlertTriangle,
  X,
  Save,
  CheckCircle2,
  Percent,
  Calculator,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { RoomTypeItem } from './RoomsPricingPage';

export interface SeasonalPricingRule {
  id: string;
  name: string;
  tier: 'high' | 'low' | 'regular';
  roomTypeId: string | null;
  startDate: string;
  endDate: string;
  daysOfWeek: number[] | null; // [5, 6, 0] for Fri, Sat, Sun
  adjustmentType: 'percent' | 'fixed_amount';
  adjustmentValue: number;
  priority: number;
  isActive: boolean;
}

const SEED_SEASONAL_RULES: SeasonalPricingRule[] = [
  {
    id: 'rule-high-winter',
    name: 'High Season ภาคเหนือ (พ.ย. - ก.พ.)',
    tier: 'high',
    roomTypeId: null,
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    daysOfWeek: null,
    adjustmentType: 'percent',
    adjustmentValue: 5.0,
    priority: 10,
    isActive: true,
  },
  {
    id: 'rule-countdown',
    name: 'คืนเคานต์ดาวน์ปีใหม่ (31 ธ.ค. - 1 ม.ค.)',
    tier: 'high',
    roomTypeId: null,
    startDate: '2026-12-31',
    endDate: '2027-01-01',
    daysOfWeek: null,
    adjustmentType: 'fixed_amount',
    adjustmentValue: 300.0,
    priority: 25,
    isActive: true,
  },
  {
    id: 'rule-weekend-regular',
    name: 'วันหยุดสุดสัปดาห์ (ศุกร์ - เสาร์ - อาทิตย์)',
    tier: 'regular',
    roomTypeId: null,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    daysOfWeek: [5, 6, 0],
    adjustmentType: 'fixed_amount',
    adjustmentValue: 200.0,
    priority: 15,
    isActive: true,
  },
  {
    id: 'rule-low-rainy',
    name: 'Low Season หน้าฝน วันธรรมดา (มิ.ย. - ก.ย.)',
    tier: 'low',
    roomTypeId: null,
    startDate: '2026-06-01',
    endDate: '2026-09-30',
    daysOfWeek: [1, 2, 3, 4],
    adjustmentType: 'percent',
    adjustmentValue: -10.0,
    priority: 10,
    isActive: true,
  },
];

interface SeasonalPricingTabProps {
  isOwner: boolean;
  roomTypes: RoomTypeItem[];
  isOffline: boolean;
}

export const SeasonalPricingTab: React.FC<SeasonalPricingTabProps> = ({
  isOwner,
  roomTypes,
  isOffline,
}) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<SeasonalPricingRule[]>(SEED_SEASONAL_RULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');

  // Simulator State
  const [simRoomTypeId, setSimRoomTypeId] = useState<string>(roomTypes[0]?.id || 'rt-std');
  const [simDate, setSimDate] = useState<string>('2026-12-31');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SeasonalPricingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<SeasonalPricingRule | null>(null);
  const [validationError, setValidationError] = useState('');

  const [form, setForm] = useState({
    name: '',
    tier: 'high' as 'high' | 'low' | 'regular',
    roomTypeId: 'all',
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    daysSelection: 'all', // 'all' | 'weekend' | 'weekday'
    adjustmentType: 'percent' as 'percent' | 'fixed_amount',
    adjustmentValue: '5',
    priority: '10',
  });

  // Load rules from backend if available
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await apiFetch<SeasonalPricingRule[]>('/api/v1/pricing/rules');
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setRules(res.data);
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

  // Calculate simulated rate for a given room and date
  const selectedSimRoom = roomTypes.find((rt) => rt.id === simRoomTypeId) || roomTypes[0];
  const simCalculation = (() => {
    if (!selectedSimRoom) return null;
    const basePrice = selectedSimRoom.basePrice;
    const targetDate = new Date(simDate);
    const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 6 is Saturday

    // Match rules that cover this date & room
    const matchingRules = rules.filter((r) => {
      if (!r.isActive) return false;
      if (r.roomTypeId && r.roomTypeId !== selectedSimRoom.id) return false;
      if (simDate < r.startDate || simDate > r.endDate) return false;
      if (r.daysOfWeek && !r.daysOfWeek.includes(dayOfWeek)) return false;
      return true;
    });

    // Sort by priority desc
    matchingRules.sort((a, b) => b.priority - a.priority);
    const appliedRule = matchingRules[0] || null;

    let effectiveRate = basePrice;
    let adjustmentText = 'ราคาปกติ (Base Price)';

    if (appliedRule) {
      if (appliedRule.adjustmentType === 'percent') {
        effectiveRate = Math.round(basePrice * (1 + appliedRule.adjustmentValue / 100));
        adjustmentText = `${appliedRule.adjustmentValue > 0 ? '+' : ''}${appliedRule.adjustmentValue}%`;
      } else {
        effectiveRate = Math.round(basePrice + appliedRule.adjustmentValue);
        adjustmentText = `${appliedRule.adjustmentValue > 0 ? '+' : ''}฿${appliedRule.adjustmentValue.toLocaleString()}`;
      }
    }

    return {
      basePrice,
      effectiveRate,
      appliedRule,
      adjustmentText,
    };
  })();

  const openCreateModal = () => {
    setEditingRule(null);
    setForm({
      name: '',
      tier: 'high',
      roomTypeId: 'all',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      daysSelection: 'all',
      adjustmentType: 'percent',
      adjustmentValue: '5',
      priority: '10',
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

    setForm({
      name: rule.name,
      tier: rule.tier,
      roomTypeId: rule.roomTypeId || 'all',
      startDate: rule.startDate,
      endDate: rule.endDate,
      daysSelection: daysSel,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: String(rule.adjustmentValue),
      priority: String(rule.priority),
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

    let daysOfWeek: number[] | null = null;
    if (form.daysSelection === 'weekend') daysOfWeek = [5, 6, 0];
    if (form.daysSelection === 'weekday') daysOfWeek = [1, 2, 3, 4];

    const ruleData: SeasonalPricingRule = {
      id: editingRule ? editingRule.id : `rule-${Date.now()}`,
      name: form.name.trim(),
      tier: form.tier,
      roomTypeId: form.roomTypeId === 'all' ? null : form.roomTypeId,
      startDate: form.startDate,
      endDate: form.endDate,
      daysOfWeek,
      adjustmentType: form.adjustmentType,
      adjustmentValue: val,
      priority: parseInt(form.priority, 10) || 10,
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

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            High Season
          </span>
        );
      case 'regular':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Regular
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Low Season
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Interactive Rate Simulator Card ── */}
      <Card className="border border-orange-200/90 bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30 shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#F97316]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  เครื่องมือจำลองอัตราค่าห้องตามฤดูกาล (Rate Calculation Simulator)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">
                ทดลองเลือกประเภทห้องและวันที่เข้าพัก เพื่อดูว่ากฎราคาใดจะมีผลบังคับใช้ (คำนวณจาก Priority สูงสุด)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-44">
                <Select
                  value={simRoomTypeId}
                  onChange={(e) => setSimRoomTypeId(e.target.value)}
                  className="text-xs h-8 bg-white"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} (฿{rt.basePrice.toLocaleString()})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-36">
                <Input
                  type="date"
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="text-xs font-mono h-8 bg-white"
                />
              </div>

              {simCalculation && (
                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">ราคาคำนวณจริง</span>
                    <span className="text-sm font-bold font-mono text-[#F97316]">
                      ฿{simCalculation.effectiveRate.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400"> / คืน</span>
                  </div>
                  <div className="border-l border-slate-200 pl-2.5 text-left">
                    <span className="text-[10px] font-semibold text-slate-600 block">
                      {simCalculation.appliedRule
                        ? simCalculation.appliedRule.name
                        : 'ราคาฐานปกติ'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-medium">
                      {simCalculation.adjustmentText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar: Search & Filters ── */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อกฎราคา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-white"
            >
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </Input>
          </div>

          <div className="w-36">
            <Select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="text-xs h-9 bg-white"
            >
              <option value="all">ทุก Tier ฤดูกาล</option>
              <option value="high">High Season</option>
              <option value="regular">Regular</option>
              <option value="low">Low Season</option>
            </Select>
          </div>

          <div className="w-44">
            <Select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="text-xs h-9 bg-white"
            >
              <option value="all">ทุกประเภทห้อง</option>
              <option value="all_rooms">บังคับใช้ทุกห้อง (Global)</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
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
            <span>{t('action.addRule')}</span>
          </Button>
        )}
      </div>

      {/* ── Rules Table ── */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#F97316]" />
            <CardTitle className="text-sm font-bold text-slate-800">
              รายการกฎการปรับราคาตามฤดูกาลและเทศกาล ({filteredRules.length} กฎ)
            </CardTitle>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            * Base Price ในประเภทห้องพักจะไม่ถูกแตะต้อง
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ชื่อกฎราคา</th>
                  <th className="py-2.5 px-3 text-center">ระดับ (Tier)</th>
                  <th className="py-2.5 px-3">ประเภทห้องที่ใช้</th>
                  <th className="py-2.5 px-3">ช่วงวันที่บังคับใช้</th>
                  <th className="py-2.5 px-3">เงื่อนไขวัน</th>
                  <th className="py-2.5 px-3 text-right">การปรับราคา</th>
                  <th className="py-2.5 px-3 text-center">Priority</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  {isOwner && <th className="py-2.5 px-3 text-center">การจัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบกฎการปรับราคาที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => {
                    const targetRoom = roomTypes.find((rt) => rt.id === rule.roomTypeId);
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {rule.name}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {getTierBadge(rule.tier)}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {targetRoom ? (
                            <span className="font-medium text-slate-800">{targetRoom.name}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                              <Layers className="w-3 h-3 text-slate-400" />
                              ทุกประเภทห้อง (Global)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {rule.startDate} ถึง {rule.endDate}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600">
                          {rule.daysOfWeek ? (
                            rule.daysOfWeek.includes(5) ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                                ศ.-ส.-อา.
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                จ.-พฤ.
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">ทุกวัน</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span
                            className={
                              rule.adjustmentValue >= 0 ? 'text-rose-600' : 'text-emerald-600'
                            }
                          >
                            {rule.adjustmentValue > 0 ? '+' : ''}
                            {rule.adjustmentType === 'percent'
                              ? `${rule.adjustmentValue}%`
                              : `฿${rule.adjustmentValue.toLocaleString()}`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {rule.priority}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleActive(rule.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                              rule.isActive
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                rule.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {rule.isActive ? 'เปิดใช้' : 'ปิด'}
                          </button>
                        </td>
                        {isOwner && (
                          <td className="py-3 px-3 text-center">
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
                  placeholder="เช่น High Season ภาคเหนือ (พ.ย.-ก.พ.)"
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
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value as any })}
                    className="text-xs h-9"
                  >
                    <option value="high">High Season (บวกเพิ่ม)</option>
                    <option value="regular">Regular (วันหยุด)</option>
                    <option value="low">Low Season (ลดราคา)</option>
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
                    <option value="all">ทุกประเภทห้อง (Global)</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-3">
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
                    <option value="weekend">เฉพาะ ศุกร์-เสาร์-อาทิตย์</option>
                    <option value="weekday">เฉพาะ จันทร์-พฤหัสบดี</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Priority ลำดับความสำคัญ
                  </label>
                  <Input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>
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
                    <option value="percent">เปอร์เซ็นต์ (%)</option>
                    <option value="fixed_amount">จำนวนเงินคงที่ (บาท)</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ค่าปรับราคา ({form.adjustmentType === 'percent' ? '%' : 'บาท'}) *
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
};


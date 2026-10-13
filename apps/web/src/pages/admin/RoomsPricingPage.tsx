import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch, getAuthRole } from '@/lib/api';
import {
  BedDouble,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Maximize2,
  Lock,
  X,
  Save,
  AlertTriangle,
} from 'lucide-react';

export interface RoomTypeItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  maxOccupancy: number;
  bedType: string;
  sizeSqm: number;
  createdAt?: string;
  updatedAt?: string;
}

export const RoomsPricingPage: React.FC = () => {
  const currentRole = getAuthRole();
  const isManager = currentRole === 'manager';
  const roleBase = isManager ? '/manager' : '/admin';

  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([
    {
      id: 'rt-std',
      name: 'Standard Room',
      description: 'ห้องพักมาตรฐานพร้อมสิ่งอำนวยความสะดวกครบครัน เตียงคิงไซส์',
      basePrice: 1200,
      maxOccupancy: 2,
      bedType: 'King Bed',
      sizeSqm: 28,
    },
    {
      id: 'rt-dlx',
      name: 'Deluxe Room',
      description: 'ห้องพักดีลักซ์ระเบียงกว้าง วิวเมือง พร้อมสมาร์ททีวี',
      basePrice: 1800,
      maxOccupancy: 2,
      bedType: 'King Bed / Twin',
      sizeSqm: 36,
    },
    {
      id: 'rt-ste',
      name: 'Executive Suite',
      description: 'ห้องสวีทสำหรับครอบครัวหรือผู้บริหาร ห้องนั่งเล่นแยกเป็นสัดส่วน',
      basePrice: 2800,
      maxOccupancy: 4,
      bedType: 'King Bed',
      sizeSqm: 54,
    },
  ]);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    maxOccupancy: '2',
    bedType: 'King Bed',
    sizeSqm: '28',
  });

  const [editingType, setEditingType] = useState<RoomTypeItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    maxOccupancy: '2',
    bedType: 'King Bed',
    sizeSqm: '28',
  });

  const [deletingType, setDeletingType] = useState<RoomTypeItem | null>(null);

  // 1. Fetch Room Types from API Gateway
  const loadRoomTypes = async () => {
    setLoading(true);
    const res = await apiFetch<RoomTypeItem[]>('/api/room-types');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      setIsOffline(false);
      setRoomTypes(res.data);
    } else {
      setIsOffline(res.isOffline);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRoomTypes();
  }, []);

  // 2. Create Room Type
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.basePrice) return;

    const payload = {
      name: createForm.name.trim(),
      description: createForm.description.trim() || null,
      basePrice: parseFloat(createForm.basePrice) || 1200,
      maxOccupancy: parseInt(createForm.maxOccupancy, 10) || 2,
      bedType: createForm.bedType,
      sizeSqm: parseFloat(createForm.sizeSqm) || 28,
    };

    const res = await apiFetch('/api/room-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.data) {
      setRoomTypes((prev) => [...prev, res.data]);
    } else {
      // Local fallback
      setRoomTypes((prev) => [
        ...prev,
        { id: `rt-${Date.now()}`, ...payload },
      ]);
    }

    setIsCreateOpen(false);
    setCreateForm({
      name: '',
      description: '',
      basePrice: '',
      maxOccupancy: '2',
      bedType: 'King Bed',
      sizeSqm: '28',
    });
  };

  // 3. Open Edit Modal
  const openEditModal = (item: RoomTypeItem) => {
    setEditingType(item);
    setEditForm({
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice.toString(),
      maxOccupancy: item.maxOccupancy.toString(),
      bedType: item.bedType,
      sizeSqm: item.sizeSqm.toString(),
    });
  };

  // 4. Save Edit Room Type
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !editForm.name || !editForm.basePrice) return;

    const payload = {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      basePrice: parseFloat(editForm.basePrice) || 1200,
      maxOccupancy: parseInt(editForm.maxOccupancy, 10) || 2,
      bedType: editForm.bedType,
      sizeSqm: parseFloat(editForm.sizeSqm) || 28,
    };

    await apiFetch(`/api/room-types/${editingType.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    setRoomTypes((prev) =>
      prev.map((t) => (t.id === editingType.id ? { ...t, ...payload } : t))
    );
    setEditingType(null);
  };

  // 5. Delete Room Type
  const handleDeleteConfirm = async () => {
    if (!deletingType) return;
    await apiFetch(`/api/room-types/${deletingType.id}`, {
      method: 'DELETE',
    });
    setRoomTypes((prev) => prev.filter((t) => t.id !== deletingType.id));
    setDeletingType(null);
  };

  const filteredTypes = roomTypes.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      t.bedType.toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout activePath={`${roleBase}/rooms`} isBackendOffline={isOffline}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200/90 px-6 py-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>หน้าหลัก</span>
              <span>/</span>
              <span>บริหารจัดการ</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">ห้องและราคา</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>ประเภทห้องพักและอัตราค่าบริการพื้นฐาน</span>
              {isManager && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                  โหมดดูข้อมูลเท่านั้น (Read-Only)
                </Badge>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดราคาต่อคืน (Base Price) จำนวนผู้เข้าพัก ขนาดห้อง และเตียงนอนที่ให้บริการ
            </p>
          </div>

          {!isManager && (
            <Button
              size="sm"
              disabled={isOffline}
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-semibold gap-1.5 h-9 bg-[#F97316] hover:bg-[#ea580c] text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มประเภทห้อง</span>
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Manager Notice */}
        {isManager && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">สิทธิ์บทบาท Manager:</span> สามารถตรวจสอบข้อมูลประเภทห้องพักและราคาพื้นฐานได้ แต่การเพิ่ม แก้ไข หรือลบประเภทห้องพักต้องได้รับสิทธิ์จากผู้ดูแลระบบ (Admin)
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อประเภทห้อง, เตียงนอน..."
              className="pl-9 h-8.5 text-xs border-slate-200"
            />
          </div>

          <span className="text-xs text-slate-500">
            แสดง {filteredTypes.length} จากทั้งหมด {roomTypes.length} ประเภทห้องพัก
          </span>
        </div>

        {/* Room Types Cards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredTypes.map((t) => (
            <Card key={t.id} className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-[#F97316]" />
                  <span className="text-xs font-bold text-slate-900">{t.name}</span>
                </div>
                <span className="text-xs font-bold text-[#F97316] font-mono">
                  ฿{t.basePrice.toLocaleString()}<span className="text-[10px] text-slate-400 font-normal">/คืน</span>
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-slate-500 min-h-[32px] line-clamp-2">
                  {t.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.maxOccupancy} ท่าน</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.sizeSqm} ตร.ม.</span>
                  </div>
                  <div className="truncate text-right text-slate-500 font-medium" title={t.bedType}>
                    {t.bedType}
                  </div>
                </div>

                {!isManager && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isOffline}
                      onClick={() => openEditModal(t)}
                      className="h-7 text-xs px-2.5 border-slate-300 text-slate-700 gap-1"
                    >
                      <Pencil className="w-3 h-3 text-slate-500" />
                      <span>แก้ไข</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isOffline}
                      onClick={() => setDeletingType(t)}
                      className="h-7 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Table */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              ตารางกำหนดอัตราค่าบริการห้องพัก (Room Inventory Master)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ชื่อประเภทห้องพัก</th>
                    <th className="py-3 px-3">เตียงนอน</th>
                    <th className="py-3 px-3 text-center">ขนาด (ตร.ม.)</th>
                    <th className="py-3 px-3 text-center">ผู้เข้าพักสูงสุด</th>
                    <th className="py-3 px-3 text-right">ราคาพื้นฐาน (Base Price)</th>
                    {!isManager && <th className="py-3 px-4 text-center">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTypes.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{t.bedType}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">{t.sizeSqm}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">{t.maxOccupancy} ท่าน</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ฿{t.basePrice.toLocaleString()}
                      </td>
                      {!isManager && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isOffline}
                              onClick={() => openEditModal(t)}
                              className="h-7 text-xs px-2.5 border-slate-300 text-slate-700 gap-1 font-medium"
                            >
                              <Pencil className="w-3 h-3 text-slate-500" />
                              <span>แก้ไข</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isOffline}
                              onClick={() => setDeletingType(t)}
                              className="h-7 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal 1: Create Room Type */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">เพิ่มประเภทห้องพักใหม่</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ชื่อประเภทห้องพัก (Name) *
                </label>
                <Input
                  required
                  placeholder="เช่น Premier Deluxe Room"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  รายละเอียดห้องพัก (Description)
                </label>
                <Input
                  placeholder="ระบุจุดเด่นและสิ่งอำนวยความสะดวก"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ราคาต่อคืน (Base Price THB) *
                  </label>
                  <Input
                    required
                    type="number"
                    placeholder="1500"
                    value={createForm.basePrice}
                    onChange={(e) => setCreateForm({ ...createForm, basePrice: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ผู้เข้าพักสูงสุด (ท่าน) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max="10"
                    value={createForm.maxOccupancy}
                    onChange={(e) => setCreateForm({ ...createForm, maxOccupancy: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ประเภทเตียงนอน *
                  </label>
                  <Select
                    value={createForm.bedType}
                    onChange={(e) => setCreateForm({ ...createForm, bedType: e.target.value })}
                  >
                    <option value="King Bed">King Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                    <option value="Twin Bed">Twin Bed</option>
                    <option value="King Bed / Twin">King Bed / Twin</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ขนาดห้อง (ตร.ม.) *
                  </label>
                  <Input
                    required
                    type="number"
                    value={createForm.sizeSqm}
                    onChange={(e) => setCreateForm({ ...createForm, sizeSqm: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึก</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Room Type */}
      {editingType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">แก้ไขประเภทห้องพักและราคา</h3>
              </div>
              <button
                onClick={() => setEditingType(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ชื่อประเภทห้องพัก *
                </label>
                <Input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  รายละเอียดห้องพัก
                </label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ราคาต่อคืน (Base Price THB) *
                  </label>
                  <Input
                    required
                    type="number"
                    value={editForm.basePrice}
                    onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ผู้เข้าพักสูงสุด (ท่าน) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max="10"
                    value={editForm.maxOccupancy}
                    onChange={(e) => setEditForm({ ...editForm, maxOccupancy: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ประเภทเตียงนอน *
                  </label>
                  <Select
                    value={editForm.bedType}
                    onChange={(e) => setEditForm({ ...editForm, bedType: e.target.value })}
                  >
                    <option value="King Bed">King Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                    <option value="Twin Bed">Twin Bed</option>
                    <option value="King Bed / Twin">King Bed / Twin</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ขนาดห้อง (ตร.ม.) *
                  </label>
                  <Input
                    required
                    type="number"
                    value={editForm.sizeSqm}
                    onChange={(e) => setEditForm({ ...editForm, sizeSqm: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingType(null)}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไข</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Confirmation */}
      {deletingType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันการลบประเภทห้องพัก</h3>
                <p className="text-xs text-slate-500 font-mono">{deletingType.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed py-2">
              คุณต้องการลบประเภทห้องพัก <strong>{deletingType.name}</strong> ใช่หรือไม่? ห้องพักที่ผูกกับประเภทนี้จะไม่สามารถจำหน่ายได้
            </p>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingType(null)}
                className="text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteConfirm}
                className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบ</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RoomsPricingPage;

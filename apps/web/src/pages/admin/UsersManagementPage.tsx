import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, getAuthRole } from '@/lib/api';
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  Lock,
  Pencil,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'front_desk' | 'housekeeping';
  isActive: boolean;
  createdAt: string;
}

export const UsersManagementPage: React.FC = () => {
  const currentRole = getAuthRole();
  const isManager = currentRole === 'manager';

  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const [users, setUsers] = useState<UserItem[]>([
    {
      id: 'usr-1',
      email: 'khet.admin@keystay.io',
      firstName: 'เขต',
      lastName: 'โสภณ',
      role: 'admin',
      isActive: true,
      createdAt: '2026-09-01',
    },
    {
      id: 'usr-2',
      email: 'manager.bkk@keystay.io',
      firstName: 'วรพจน์',
      lastName: 'วิริยะกุล',
      role: 'manager',
      isActive: true,
      createdAt: '2026-09-10',
    },
    {
      id: 'usr-3',
      email: 'frontdesk.morning@keystay.io',
      firstName: 'วิทวัส',
      lastName: 'เกียรติสกุล',
      role: 'front_desk',
      isActive: true,
      createdAt: '2026-09-15',
    },
    {
      id: 'usr-4',
      email: 'housekeeping.lead@keystay.io',
      firstName: 'สุดา',
      lastName: 'บุญมี',
      role: 'housekeeping',
      isActive: true,
      createdAt: '2026-09-20',
    },
  ]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'front_desk' as 'admin' | 'manager' | 'front_desk' | 'housekeeping',
  });

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'front_desk' as 'admin' | 'manager' | 'front_desk' | 'housekeeping',
    isActive: true,
  });

  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setLoading(true);
      const res = await apiFetch<UserItem[]>('/api/auth/users');
      if (!isMounted) return;

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setIsOffline(false);
        setUsers(res.data);
      } else {
        setIsOffline(res.isOffline);
      }
      setLoading(false);
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.firstName || !createForm.lastName || !createForm.email || !createForm.password) return;

    const newUser: UserItem = {
      id: `usr-${Date.now()}`,
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim(),
      role: createForm.role,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // Attempt backend registration
    await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: createForm.password,
        role: newUser.role,
      }),
    });

    setUsers((prev) => [newUser, ...prev]);
    setIsCreateOpen(false);
    setCreateForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'front_desk',
    });
  };

  // 2. Open Edit Modal
  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  };

  // 3. Save Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Call update user details
    await apiFetch(`/api/auth/users/${editingUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
      }),
    });

    // Call update user role if changed
    if (editingUser.role !== editForm.role) {
      await apiFetch(`/api/auth/users/${editingUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editForm.role }),
      });
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              firstName: editForm.firstName.trim(),
              lastName: editForm.lastName.trim(),
              email: editForm.email.trim(),
              role: editForm.role,
              isActive: editForm.isActive,
            }
          : u
      )
    );
    setEditingUser(null);
  };

  // 4. Delete User
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    await apiFetch(`/api/auth/users/${deletingUser.id}`, {
      method: 'DELETE',
    });
    setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
    setDeletingUser(null);
  };

  // 5. Toggle Active
  const handleToggleActive = (id: string) => {
    if (isOffline || isManager) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
  };

  const roleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'front_desk':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'housekeeping':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const filteredUsers = users.filter((u) => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchesSearch =
      name.includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout activePath="/admin/users" isBackendOffline={isOffline}>
      {/* Context Header */}
      <div className="bg-white border-b border-slate-200/90 px-6 py-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>หน้าหลัก</span>
              <span>/</span>
              <span>ความปลอดภัยและสิทธิ์</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">ผู้ใช้และสิทธิ์</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>การบริหารจัดการผู้ใช้และสิทธิ์การเข้าถึง (RBAC)</span>
              {isManager && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                  โหมดดูข้อมูลเท่านั้น (Read-Only)
                </Badge>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดสิทธิ์ 4 บทบาทหลัก: Admin, Manager, Front Desk, Housekeeping
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isManager && (
              <Button
                size="sm"
                disabled={isOffline}
                onClick={() => setIsCreateOpen(true)}
                className="text-xs font-semibold gap-1.5 h-9 bg-[#F97316] hover:bg-[#ea580c] text-white"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>เพิ่มผู้ใช้งานใหม่</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Manager Notice */}
        {isManager && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">สิทธิ์จำกัดสำหรับบทบาท Manager:</span> คุณสามารถตรวจสอบรายชื่อและบทบาทของผู้ปฏิบัติงานได้ แต่ไม่สามารถแก้ไขสิทธิ์ ลบบัญชี หรือเพิ่มผู้ดูแลระบบได้
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, นามสกุล หรืออีเมลผู้ใช้..."
                className="pl-9 h-8.5 text-xs border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-slate-400">บทบาท:</span>
              <Select
                containerClassName="w-44"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">ทั้งหมด (All Roles)</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="front_desk">Front Desk</option>
                <option value="housekeeping">Housekeeping</option>
              </Select>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            แสดง {filteredUsers.length} จาก {users.length} บัญชี
          </span>
        </div>

        {/* Users Table */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900">
              รายชื่อผู้ใช้งานระบบ (Keystay Enterprise Directory)
            </CardTitle>
            <span className="text-[11px] text-slate-400 font-mono">Live RBAC Directory</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-3">อีเมล</th>
                    <th className="py-3 px-3 text-center">บทบาท (ROLE)</th>
                    <th className="py-3 px-3 text-center">สถานะ</th>
                    <th className="py-3 px-3">วันที่สร้าง</th>
                    {!isManager && <th className="py-3 px-4 text-center">การจัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">{u.email}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${roleBadgeStyle(
                            u.role
                          )}`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {u.isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {u.createdAt}
                      </td>
                      {!isManager && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. Edit User Modal Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isOffline}
                              onClick={() => openEditModal(u)}
                              title="แก้ไขข้อมูลและสิทธิ์"
                              className="h-7 text-[11px] px-2.5 border-slate-300 text-slate-700 hover:bg-slate-100 gap-1 font-medium"
                            >
                              <Pencil className="w-3 h-3 text-slate-500" />
                              <span>แก้ไข</span>
                            </Button>

                            {/* 2. Toggle Active Status */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isOffline || u.role === 'admin'}
                              onClick={() => handleToggleActive(u.id)}
                              className="h-7 text-[11px] px-2 border-slate-300 text-slate-700"
                            >
                              {u.isActive ? 'ระงับ' : 'เปิด'}
                            </Button>

                            {/* 3. Delete User Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isOffline || u.role === 'admin'}
                              onClick={() => setDeletingUser(u)}
                              title="ลบบัญชีผู้ใช้"
                              className="h-7 text-[11px] px-2 border-red-200 text-red-600 hover:bg-red-50"
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

      {/* Modal 1: Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">เพิ่มผู้ใช้งานใหม่</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="py-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ชื่อจริง *
                  </label>
                  <Input
                    required
                    placeholder="เช่น ศรันย์"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    นามสกุล *
                  </label>
                  <Input
                    required
                    placeholder="เช่น เจริญสุข"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  อีเมลเข้าสู่ระบบ *
                </label>
                <Input
                  required
                  type="email"
                  placeholder="saran.c@keystay.io"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  รหัสผ่านเริ่มต้น *
                </label>
                <Input
                  required
                  type="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  บทบาทและสิทธิ์การใช้งาน (RBAC) *
                </label>
                <Select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                >
                  <option value="front_desk">พนักงานต้อนรับ (Front Desk)</option>
                  <option value="housekeeping">แผนกแม่บ้าน (Housekeeping)</option>
                  <option value="manager">ผู้จัดการ (Manager)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </Select>
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
                  <span>บันทึกผู้ใช้</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลและสิทธิ์ผู้ใช้</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="py-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ชื่อจริง *
                  </label>
                  <Input
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    นามสกุล *
                  </label>
                  <Input
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  อีเมล *
                </label>
                <Input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  บทบาท (Role) *
                </label>
                <Select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                >
                  <option value="front_desk">พนักงานต้อนรับ (Front Desk)</option>
                  <option value="housekeeping">แผนกแม่บ้าน (Housekeeping)</option>
                  <option value="manager">ผู้จัดการ (Manager)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-slate-700 font-medium select-none cursor-pointer">
                  สถานะเปิดใช้งานบัญชี (Active Account)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
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

      {/* Modal 3: Delete Confirmation Dialog */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันการลบบัญชีผู้ใช้</h3>
                <p className="text-xs text-slate-500 font-mono">{deletingUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed py-2">
              คุณกำลังจะลบบัญชีของ <strong>{deletingUser.firstName} {deletingUser.lastName}</strong> ({deletingUser.role}) ออกจากระบบอย่างถาวร การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingUser(null)}
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
                <span>ยืนยันลบบัญชี</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UsersManagementPage;

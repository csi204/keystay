import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiFetch, getAuthRole } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  Wrench,
  Phone,
  MessageCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  Star,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  MapPin,
  ShieldAlert,
  Flame,
  Droplets,
  Zap,
  Key,
  Hammer,
  Bug,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import {
  EmergencyOutsourceContact,
  FALLBACK_EMERGENCY_CONTACTS,
} from '@/hooks/useOutsourceContacts';

const CATEGORIES = [
  { key: 'all', label: 'ทั้งหมด', icon: Hammer },
  { key: 'air_conditioning', label: 'แอร์ / ระบบปรับอากาศ', icon: Flame },
  { key: 'plumbing', label: 'ประปา / สุขาภิบาล', icon: Droplets },
  { key: 'electrical', label: 'ระบบไฟฟ้า', icon: Zap },
  { key: 'locksmith', label: 'ช่างกุญแจ / กลอนประตู', icon: Key },
  { key: 'pest_control', label: 'กำจัดแมลงและสัตว์รบกวน', icon: Bug },
  { key: 'general_maintenance', label: 'ช่างซ่อมบำรุงทั่วไป', icon: Wrench },
];

export const MaintenanceContactsPage: React.FC = () => {
  const isOwner = getAuthRole() === 'owner';
  const { t } = useTranslation();

  const [contacts, setContacts] = useState<EmergencyOutsourceContact[]>(
    FALLBACK_EMERGENCY_CONTACTS
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] =
    useState<EmergencyOutsourceContact | null>(null);
  const [deletingContact, setDeletingContact] =
    useState<EmergencyOutsourceContact | null>(null);
  const [validationError, setValidationError] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: 'air_conditioning',
    serviceType: '',
    phonePrimary: '',
    phoneSecondary: '',
    lineId: '',
    isEmergency: true,
    availableHours: '24 ชั่วโมง',
    priceRateNote: '',
    rating: '4.8',
    address: 'กรุงเทพฯ',
    notes: '',
  });

  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<EmergencyOutsourceContact[]>(
        '/api/housekeeping/outsource-contacts'
      );
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setIsOffline(false);
        setContacts(res.data);
      } else {
        setIsOffline(res.isOffline);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 2500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phonePrimary.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination (Max 9 cards per page)
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE) || 1;
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openCreateModal = () => {
    setEditingContact(null);
    setForm({
      name: '',
      category: 'air_conditioning',
      serviceType: '',
      phonePrimary: '',
      phoneSecondary: '',
      lineId: '',
      isEmergency: true,
      availableHours: '24 ชั่วโมง',
      priceRateNote: 'เริ่มต้น 500 บาท / ครั้ง',
      rating: '4.8',
      address: 'กรุงเทพฯ',
      notes: '',
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const openEditModal = (contact: EmergencyOutsourceContact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      category: contact.category,
      serviceType: contact.serviceType,
      phonePrimary: contact.phonePrimary,
      phoneSecondary: contact.phoneSecondary || '',
      lineId: contact.lineId || '',
      isEmergency: contact.isEmergency,
      availableHours: contact.availableHours,
      priceRateNote: contact.priceRateNote || '',
      rating: String(contact.rating || 4.8),
      address: contact.address || '',
      notes: contact.notes || '',
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleToggleActive = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setValidationError('กรุณาระบุชื่อช่างหรือบริษัทผู้ให้บริการ');
      return;
    }
    if (!form.phonePrimary.trim()) {
      setValidationError('กรุณาระบุเบอร์โทรศัพท์หลัก');
      return;
    }

    const itemData: EmergencyOutsourceContact = {
      id: editingContact ? editingContact.id : `emerg-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      serviceType: form.serviceType.trim() || 'บริการซ่อมบำรุงและดูแลระบบ',
      phonePrimary: form.phonePrimary.trim(),
      phoneSecondary: form.phoneSecondary.trim() || null,
      lineId: form.lineId.trim() || null,
      isEmergency: form.isEmergency,
      availableHours: form.availableHours.trim() || '24 ชั่วโมง',
      priceRateNote: form.priceRateNote.trim() || null,
      rating: parseFloat(form.rating) || 4.8,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      isActive: editingContact ? editingContact.isActive : true,
    };

    // Attempt backend persistence
    try {
      if (editingContact) {
        await apiFetch(`/api/housekeeping/outsource-contacts/${editingContact.id}`, {
          method: 'PUT',
          body: JSON.stringify(itemData),
        });
      } else {
        await apiFetch('/api/housekeeping/outsource-contacts', {
          method: 'POST',
          body: JSON.stringify(itemData),
        });
      }
    } catch {
      // Graceful offline fallback
    }

    if (editingContact) {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingContact.id ? itemData : c))
      );
    } else {
      setContacts((prev) => [itemData, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContact) return;
    try {
      await apiFetch(`/api/housekeeping/outsource-contacts/${deletingContact.id}`, {
        method: 'DELETE',
      });
    } catch {}

    setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id));
    setDeletingContact(null);
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'air_conditioning':
        return { label: 'แอร์ / ปรับอากาศ', icon: Flame };
      case 'plumbing':
        return { label: 'ประปา / สุขาภิบาล', icon: Droplets };
      case 'electrical':
        return { label: 'ระบบไฟฟ้า', icon: Zap };
      case 'locksmith':
        return { label: 'ช่างกุญแจ / กลอน', icon: Key };
      case 'pest_control':
        return { label: 'กำจัดแมลง', icon: Bug };
      default:
        return { label: 'ซ่อมบำรุงทั่วไป', icon: Wrench };
    }
  };

  return (
    <AdminLayout activePath="/admin/technicians" isBackendOffline={isOffline}>
      {/* ── Context Header ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3.5 mb-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{t('nav.home')}</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">ช่างซ่อมบำรุงและคู่ค้า</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#F97316]" />
              <span>สมุดเบอร์ช่างฉุกเฉินและคู่ค้าภายนอก (Maintenance & Outsource)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              จัดการรายชื่อช่างซ่อมบำรุง คู่ค้าภายนอก เบอร์โทรฉุกเฉิน 24 ชม. และอัตราค่าบริการ สำหรับทีมงานและ Front Desk
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={isOffline || refreshing}
              onClick={handleRefresh}
              className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing ? 'animate-spin text-[#F97316]' : 'text-slate-600'
                }`}
              />
              <span>{refreshSuccess ? t('action.refreshSuccess') : t('action.refresh')}</span>
            </Button>

            {isOwner && (
              <Button
                size="sm"
                onClick={openCreateModal}
                className="text-xs font-semibold gap-1.5 h-9 bg-[#F97316] hover:bg-[#ea580c] text-white shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มช่างซ่อมบำรุงใหม่</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* ── Category Chips Filter ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count =
              cat.key === 'all'
                ? contacts.length
                : contacts.filter((c) => c.category === cat.key).length;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Search Bar ── */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อช่าง, งานบริการ, หรือเบอร์โทร..."
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

          <div className="text-xs text-slate-500 font-mono">
            แสดง {filteredContacts.length} จากทั้งหมด {contacts.length} รายชื่อ
          </div>
        </div>

        {/* ── Technicians Cards Grid (Clean Enterprise Cards - Anti-Slop) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              ไม่พบรายชื่อช่างซ่อมบำรุงที่ตรงกับเงื่อนไข
            </div>
          ) : (
            paginatedContacts.map((contact) => {
              const catInfo = getCategoryInfo(contact.category);
              const CatIcon = catInfo.icon;
              return (
                <Card
                  key={contact.id}
                  className={`border rounded-xl transition-all shadow-2xs hover:shadow-xs hover:border-slate-300 flex flex-col justify-between overflow-hidden ${
                    contact.isActive
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-200/60 bg-slate-50/60 opacity-60'
                  }`}
                >
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100 space-y-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {contact.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate">
                          {catInfo.label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {contact.isEmergency && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                          <Clock className="w-2.5 h-2.5 text-rose-500" />
                          24 ชม.
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 text-xs">
                      {/* Service Type Description */}
                      <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                        {contact.serviceType}
                      </p>

                      {/* Contact Specs Grid */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-slate-600">
                        {/* Phone */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            เบอร์โทร
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-900">
                              {contact.phonePrimary}
                            </span>
                            <button
                              onClick={() => handleCopy(contact.phonePrimary, `phone-${contact.id}`)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors"
                              title="คัดลอกเบอร์โทร"
                            >
                              {copiedId === `phone-${contact.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* LINE ID */}
                        {contact.lineId && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                              LINE ID
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-800">
                                {contact.lineId}
                              </span>
                              <button
                                onClick={() => handleCopy(contact.lineId || '', `line-${contact.id}`)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors"
                                title="คัดลอก LINE ID"
                              >
                                {copiedId === `line-${contact.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Available Hours */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            เวลาทำการ
                          </span>
                          <span className="font-medium text-slate-800">
                            {contact.availableHours}
                          </span>
                        </div>

                        {/* Price Rate Note */}
                        {contact.priceRateNote && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                              อัตราค่าบริการ
                            </span>
                            <span className="font-medium text-slate-800">
                              {contact.priceRateNote}
                            </span>
                          </div>
                        )}

                        {/* Notes */}
                        {contact.notes && (
                          <div className="pt-1 text-[11px] text-slate-500 leading-relaxed border-t border-slate-50">
                            <span className="text-slate-400">หมายเหตุ:</span> {contact.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions: Primary Call on left, Edit & Delete on right */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <a
                        href={`tel:${contact.phonePrimary.replace(/[^0-9]/g, '')}`}
                        className="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-2xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>โทร {contact.phonePrimary}</span>
                      </a>

                      {isOwner && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isOffline}
                            onClick={() => openEditModal(contact)}
                            className="h-8 text-xs px-2.5 border-slate-300 text-slate-700 gap-1 font-medium"
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                            <span>แก้ไข</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isOffline}
                            onClick={() => setDeletingContact(contact)}
                            className="h-8 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50"
                            title="ลบ"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* ── Pagination Bar (Active when cards > 9) ── */}
        {filteredContacts.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs mt-4">
            <div className="text-xs text-slate-500">
              แสดง <span className="font-semibold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> ถึง{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)}
              </span>{' '}
              จากทั้งหมด <span className="font-semibold text-slate-800">{filteredContacts.length}</span> รายชื่อ
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

      {/* ── Modal: Add / Edit Technician ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingContact ? 'แก้ไขข้อมูลช่างซ่อมบำรุง' : 'เพิ่มช่างซ่อมบำรุง / คู่ค้าใหม่'}
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
                  ชื่อช่าง / บริษัทผู้ให้บริการ *
                </label>
                <Input
                  required
                  placeholder="เช่น บจก. สยามแอร์เซอร์วิส 24 ชม."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    หมวดหมู่งานบริการ *
                  </label>
                  <Select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="text-xs h-9"
                  >
                    <option value="air_conditioning">แอร์ / ระบบปรับอากาศ</option>
                    <option value="plumbing">ประปา / สุขาภิบาล</option>
                    <option value="electrical">ระบบไฟฟ้า</option>
                    <option value="locksmith">ช่างกุญแจ / กลอนประตู</option>
                    <option value="pest_control">กำจัดแมลงและสัตว์รบกวน</option>
                    <option value="general_maintenance">ช่างซ่อมบำรุงทั่วไป</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    เบอร์โทรศัพท์หลัก *
                  </label>
                  <Input
                    required
                    placeholder="เช่น 089-999-8888"
                    value={form.phonePrimary}
                    onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  รายละเอียดงานบริการที่รับทำ
                </label>
                <Input
                  placeholder="เช่น ซ่อม/ล้างแอร์ห้องพัก แอร์ไม่เย็น น้ำหยด ฉุกเฉิน 24 ชม."
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    LINE ID (ติดต่อด่วน)
                  </label>
                  <Input
                    placeholder="เช่น @siamair24"
                    value={form.lineId}
                    onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ช่วงเวลาที่พร้อมให้บริการ
                  </label>
                  <Input
                    placeholder="เช่น 24 ชั่วโมง หรือ 08:00 - 18:00"
                    value={form.availableHours}
                    onChange={(e) => setForm({ ...form, availableHours: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    อัตราค่าบริการโดยประมาณ
                  </label>
                  <Input
                    placeholder="เช่น เริ่มต้น 500 บาท / ครั้ง"
                    value={form.priceRateNote}
                    onChange={(e) => setForm({ ...form, priceRateNote: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    คะแนนประเมิน (Rating 1.0 - 5.0)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  หมายเหตุภายในสำหรับโรงแรม (เช่น คีย์การ์ด, เวลาถึงหน้างาน)
                </label>
                <Input
                  placeholder="เช่น ช่างมีคีย์การ์ดสำรอง สามารถเข้าตรวจสอบหน้างานภายใน 30 นาที"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="text-xs h-9"
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
      {deletingContact && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm">ยืนยันการลบรายชื่อช่าง</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              คุณต้องการลบ <strong>"{deletingContact.name}"</strong> ออกจากสมุดเบอร์ช่างฉุกเฉินใช่หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingContact(null)}
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
    </AdminLayout>
  );
};

export default MaintenanceContactsPage;

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  Clock,
  Copy,
  Check,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  RotateCcw,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  EmergencyOutsourceContact,
  FALLBACK_EMERGENCY_CONTACTS,
} from '@/hooks/useOutsourceContacts';

// Clean Categories (Zero Slashes /)
const CATEGORIES = [
  { key: 'air_conditioning', label: 'แอร์และระบบปรับอากาศ' },
  { key: 'plumbing', label: 'ระบบประปาและสุขาภิบาล' },
  { key: 'electrical', label: 'ระบบไฟฟ้า' },
  { key: 'locksmith', label: 'ช่างกุญแจและกลอนประตู' },
  { key: 'pest_control', label: 'กำจัดแมลงและสัตว์รบกวน' },
  { key: 'general_maintenance', label: 'ช่างซ่อมบำรุงทั่วไป' },
];

const TIME_OPTIONS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  '23:59',
];

const ITEMS_PER_PAGE = 9;

export const MaintenanceContactsPage: React.FC = () => {
  const isOwner = getAuthRole() === 'owner';
  const { t, locale } = useTranslation();

  const [contacts, setContacts] = useState<EmergencyOutsourceContact[]>(FALLBACK_EMERGENCY_CONTACTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyOutsourceContact | null>(null);
  const [deletingContact, setDeletingContact] = useState<EmergencyOutsourceContact | null>(null);
  const [validationError, setValidationError] = useState('');

  const [form, setForm] = useState({
    name: '',
    categories: ['air_conditioning'] as string[],
    serviceType: '',
    phonePrimary: '',
    phoneSecondary: '',
    lineId: '',
    is24Hours: true,
    openTime: '00:00',
    closeTime: '23:59',
    priceRateNote: '',
    address: 'กรุงเทพฯ',
    notes: '',
  });

  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<EmergencyOutsourceContact[]>('/api/housekeeping/outsource-contacts');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setIsOffline(false);
        setContacts(res.data);
      } else {
        setIsOffline(res.isOffline);
        setContacts(FALLBACK_EMERGENCY_CONTACTS);
      }
    } catch {
      setIsOffline(true);
      setContacts(FALLBACK_EMERGENCY_CONTACTS);
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

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.serviceType.toLowerCase().includes(q) ||
        c.phonePrimary.includes(q);

      const contactCats = c.categories && c.categories.length > 0 ? c.categories : [c.category];
      const matchesCategory =
        selectedCategory === 'all' || contactCats.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [contacts, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE) || 1;
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContacts, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setForm({
      name: '',
      categories: ['air_conditioning'],
      serviceType: '',
      phonePrimary: '',
      phoneSecondary: '',
      lineId: '',
      is24Hours: true,
      openTime: '00:00',
      closeTime: '23:59',
      priceRateNote: 'เริ่มต้น 500 บาท / ครั้ง',
      address: 'กรุงเทพฯ',
      notes: '',
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const openEditModal = (contact: EmergencyOutsourceContact) => {
    setEditingContact(contact);
    const cats = contact.categories && contact.categories.length > 0 ? contact.categories : [contact.category];
    const is24 = contact.openTime === '00:00' && contact.closeTime === '23:59' || contact.isEmergency || contact.availableHours?.includes('24');
    setForm({
      name: contact.name,
      categories: cats,
      serviceType: contact.serviceType,
      phonePrimary: contact.phonePrimary,
      phoneSecondary: contact.phoneSecondary || '',
      lineId: contact.lineId || '',
      is24Hours: is24,
      openTime: contact.openTime || (is24 ? '00:00' : '08:00'),
      closeTime: contact.closeTime || (is24 ? '23:59' : '17:00'),
      priceRateNote: contact.priceRateNote || '',
      address: contact.address || '',
      notes: contact.notes || '',
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const toggleCategorySelection = (catKey: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(catKey);
      if (exists) {
        if (prev.categories.length === 1) return prev; // Keep at least one
        return { ...prev, categories: prev.categories.filter((c) => c !== catKey) };
      } else {
        return { ...prev, categories: [...prev.categories, catKey] };
      }
    });
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setValidationError('กรุณาระบุชื่อช่างหรือบริษัทผู้ให้บริการ');
      return;
    }
    if (form.categories.length === 0) {
      setValidationError('กรุณาเลือกหมวดหมู่งานบริการอย่างน้อย 1 หมวดหมู่');
      return;
    }
    if (!form.phonePrimary.trim()) {
      setValidationError('กรุณาระบุเบอร์โทรศัพท์หลัก');
      return;
    }

    // Time validation: Closing time cannot be before or equal to opening time if not 24 hours
    const finalOpen = form.is24Hours ? '00:00' : form.openTime;
    const finalClose = form.is24Hours ? '23:59' : form.closeTime;

    if (!form.is24Hours && finalClose <= finalOpen) {
      setValidationError('เวลาปิดทำการต้องอยู่หลังเวลาเปิดทำการ');
      return;
    }

    const itemData: EmergencyOutsourceContact = {
      id: editingContact ? editingContact.id : `emerg-${Date.now()}`,
      name: form.name.trim(),
      category: form.categories[0] || 'general_maintenance',
      categories: form.categories,
      serviceType: form.serviceType.trim() || 'บริการซ่อมบำรุงและดูแลระบบ',
      phonePrimary: form.phonePrimary.trim(),
      phoneSecondary: form.phoneSecondary.trim() || null,
      lineId: form.lineId.trim() || null,
      isEmergency: form.is24Hours,
      availableHours: `${finalOpen} - ${finalClose}`,
      openTime: finalOpen,
      closeTime: finalClose,
      priceRateNote: form.priceRateNote.trim() || null,
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
      setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? itemData : c)));
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

  const getCategoryLabel = (category: string) => {
    const found = CATEGORIES.find((c) => c.key === category);
    return found ? found.label : 'ซ่อมบำรุงทั่วไป';
  };

  return (
    <AdminLayout activePath="/admin/technicians" isBackendOffline={isOffline}>
      {/* ── Context Header ── */}
      <div className="bg-white px-4 py-3.5 mb-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{t('nav.home')}</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">
                {locale === 'en' ? 'Technicians & Contacts' : 'ข้อมูลติดต่อคู่ค้าภายนอก'}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#F97316]" />
              <span>{locale === 'en' ? 'Emergency Maintenance & Outsource Directory' : 'ข้อมูลติดต่อคู่ค้าภายนอก'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {locale === 'en'
                ? 'Manage outsource contacts, emergency partners, and service fee rates for front desk and operations'
                : 'จัดการข้อมูลติดต่อคู่ค้าภายนอก เบอร์โทรฉุกเฉิน และอัตราค่าบริการ สำหรับแม่บ้านและ Front Desk'}
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
                <span>เพิ่มคู่ค้าใหม่</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* ── Clean Toolbar with Dropdown Selection (No Pill Filters & No Card Nesting) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อช่าง, งานบริการ, หรือเบอร์โทร..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-56">
              <Select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="text-xs h-9 bg-white"
              >
                <option value="all">ทุกหมวดหมู่งานบริการ</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>

            {(searchQuery || selectedCategory !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
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
            แสดง {filteredContacts.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} จากทั้งหมด {filteredContacts.length} รายชื่อคู่ค้า
          </div>
        </div>

        {/* ── Technicians Cards Grid (Clean Enterprise Cards, Max 9 per Page) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              ไม่พบรายชื่อช่างซ่อมบำรุงที่ตรงกับเงื่อนไข
            </div>
          ) : (
            paginatedContacts.map((contact) => {
              const cats = contact.categories && contact.categories.length > 0 ? contact.categories : [contact.category];
              const categoryLabel = cats.map((c) => getCategoryLabel(c)).join(' · ');
              const timeDisplay = `${contact.openTime || '00:00'} - ${contact.closeTime || '23:59'}`;

              return (
                <Card
                  key={contact.id}
                  className={`border rounded-xl transition-all shadow-2xs hover:shadow-xs hover:border-slate-300 flex flex-col justify-between overflow-hidden ${
                    contact.isActive
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-200/60 bg-slate-50/60 opacity-60'
                  }`}
                >
                  {/* Card Header: Technician Name on left (NO ICON), Operating Hours text on right (NO PILL SLOP) */}
                  <CardHeader className="py-3 px-4 flex flex-row items-start justify-between border-b border-slate-100 space-y-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {contact.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {categoryLabel}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5 text-right">
                      <div className="inline-flex items-center gap-1 text-xs font-mono font-medium text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{timeDisplay}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 text-xs">
                      {/* Contact Specs Grid */}
                      <div className="space-y-1.5 text-slate-600">
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

                        {/* Service Description: Moved right above Notes, matching Notes text style */}
                        {contact.serviceType && (
                          <div className="pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                            <span className="text-slate-400 font-medium">งานบริการ:</span> {contact.serviceType}
                          </div>
                        )}

                        {/* Notes: Styled identically */}
                        {contact.notes && (
                          <div className="pt-1 text-xs text-slate-600 leading-relaxed">
                            <span className="text-slate-400 font-medium">หมายเหตุ:</span> {contact.notes}
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

        {/* ── Pagination Bar (Active when contacts > 9) ── */}
        {filteredContacts.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs mt-4">
            <div className="text-xs text-slate-500 font-medium">
              แสดง <span className="font-semibold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)}
              </span>{' '}
              จากทั้งหมด <span className="font-semibold text-slate-800">{filteredContacts.length}</span> รายชื่อคู่ค้า · 9 การ์ดต่อหน้า
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
                  {editingContact ? 'แก้ไขข้อมูลคู่ค้า / ช่างซ่อม' : 'เพิ่มคู่ค้าช่างซ่อมบำรุงใหม่'}
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

            <form onSubmit={handleSaveSubmit} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ชื่อช่าง / บริษัทผู้ให้บริการ <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น บจก. สยามแอร์เซอร์วิส"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              {/* Multi-Category Selection (Supports multiple categories per card) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  หมวดหมู่งานบริการ (เลือกได้หลายหมวดหมู่) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  {CATEGORIES.map((cat) => {
                    const isChecked = form.categories.includes(cat.key);
                    return (
                      <label
                        key={cat.key}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors text-xs ${
                          isChecked ? 'text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategorySelection(cat.key)}
                          className="accent-[#F97316] w-3.5 h-3.5 rounded"
                        />
                        <span>{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Operating Hours Selection with Open/Close Validation */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    เวลาเปิด - ปิดทำการ <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is24Hours}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm({
                          ...form,
                          is24Hours: checked,
                          openTime: checked ? '00:00' : '08:00',
                          closeTime: checked ? '23:59' : '17:00',
                        });
                      }}
                      className="accent-[#F97316] w-3.5 h-3.5 rounded"
                    />
                    <span>เปิดบริการ 24 ชั่วโมง</span>
                  </label>
                </div>

                {!form.is24Hours ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">เวลาเปิด</span>
                      <Select
                        value={form.openTime}
                        onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                        className="text-xs h-9 bg-white font-mono"
                      >
                        {TIME_OPTIONS.filter((t) => t !== '23:59').map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">เวลาปิด</span>
                      <Select
                        value={form.closeTime}
                        onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                        className="text-xs h-9 bg-white font-mono"
                      >
                        {TIME_OPTIONS.filter((t) => t !== '00:00').map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-mono">
                    เปิดให้บริการตลอด 24 ชั่วโมง (00:00 - 23:59)
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    เบอร์โทรศัพท์หลัก <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="เช่น 089-999-8888"
                    value={form.phonePrimary}
                    onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    เบอร์โทรศัพท์สำรอง
                  </label>
                  <Input
                    placeholder="เช่น 02-123-4567"
                    value={form.phoneSecondary}
                    onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })}
                    className="text-xs font-mono h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    LINE ID
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
                    อัตราค่าบริการโดยประมาณ
                  </label>
                  <Input
                    placeholder="เช่น เริ่มต้น 500 บาท / ครั้ง"
                    value={form.priceRateNote}
                    onChange={(e) => setForm({ ...form, priceRateNote: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  รายละเอียดงานบริการที่รับทำ
                </label>
                <Input
                  placeholder="เช่น ซ่อมและล้างแอร์ห้องพัก แอร์ไม่เย็น น้ำหยด"
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  หมายเหตุภายในสำหรับโรงแรม
                </label>
                <Input
                  placeholder="เช่น ช่างมีคีย์การ์ดสำรอง สามารถเข้าตรวจสอบหน้างานภายใน 45 นาที"
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
                  className="h-8 text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1 shadow-2xs"
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
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">ยืนยันการลบข้อมูลช่าง</h3>
                <p className="text-xs text-slate-500 mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              ต้องการลบข้อมูล <strong className="text-slate-900 font-semibold">{deletingContact.name}</strong> ออกจากสมุดเบอร์ติดต่อฉุกเฉินหรือไม่?
            </p>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingContact(null)}
                className="h-8 text-xs border-slate-300"
              >
                {t('action.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteConfirm}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบ</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default MaintenanceContactsPage;

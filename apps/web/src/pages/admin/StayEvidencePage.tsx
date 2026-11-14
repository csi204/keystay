import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PaginationBar, paginateItems } from '@/components/common/PaginationBar';
import { apiFetch, assetUrl } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { resolveGuestName, type ExtendedReservation } from '@/hooks/useReservations';
import {
  FileCheck2,
  Search,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  CreditCard,
  UserCheck,
  X,
  Eye,
  BedDouble,
  Phone,
  IdCard,
  Calendar,
} from 'lucide-react';

type EvidenceFilter = 'all' | 'has_slip' | 'verified' | 'checked_in' | 'missing_slip';

const BOOKING_SOURCE_LABEL: Record<string, { th: string; en: string }> = {
  walk_in: { th: 'Walk-in หน้าเคาน์เตอร์', en: 'Walk-in' },
  phone: { th: 'โทรศัพท์จอง', en: 'Phone' },
  facebook: { th: 'เพจ Facebook', en: 'Facebook' },
};

const STATUS_DOT_MAP: Record<string, { th: string; en: string; dot: string }> = {
  checked_in: { th: 'กำลังเข้าพัก', en: 'Checked In', dot: 'bg-emerald-500' },
  extended: { th: 'พักต่อ', en: 'Extended', dot: 'bg-emerald-500' },
  checked_out: { th: 'เช็คเอาต์แล้ว', en: 'Checked Out', dot: 'bg-slate-400' },
  confirmed: { th: 'ยืนยันการจอง', en: 'Confirmed', dot: 'bg-amber-400' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', dot: 'bg-rose-500' },
};

export const StayEvidencePage: React.FC = () => {
  const { locale } = useTranslation();
  const isEn = locale === 'en';

  const [reservations, setReservations] = useState<ExtendedReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<EvidenceFilter>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<ExtendedReservation | null>(null);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<ExtendedReservation[]>('/api/reservations').catch(() => ({
        data: null,
        isOffline: true,
      }));
      if (Array.isArray(res.data)) {
        setReservations(res.data);
      } else {
        setReservations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleRefresh = async () => {
    await loadReservations();
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 2000);
  };

  const stats = useMemo(() => {
    const total = reservations.length;
    const withSlip = reservations.filter((r) => Boolean(r.paymentSlipUrl || r.paymentSlipRef)).length;
    const verified = reservations.filter((r) => r.paymentStatus === 'paid' || Boolean(r.paymentVerifiedAt)).length;
    const checkedIn = reservations.filter(
      (r) => r.status === 'checked_in' || r.status === 'extended' || r.status === 'checked_out'
    ).length;
    return { total, withSlip, verified, checkedIn };
  }, [reservations]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reservations.filter((r) => {
      if (filter === 'has_slip' && !r.paymentSlipUrl && !r.paymentSlipRef) return false;
      if (filter === 'verified' && r.paymentStatus !== 'paid' && !r.paymentVerifiedAt) return false;
      if (
        filter === 'checked_in' &&
        r.status !== 'checked_in' &&
        r.status !== 'extended' &&
        r.status !== 'checked_out'
      ) {
        return false;
      }
      if (filter === 'missing_slip' && (r.paymentSlipUrl || r.paymentSlipRef)) return false;

      if (!q) return true;
      const guestName = resolveGuestName(r).toLowerCase();
      const roomNumber = (r.roomNumber || '').toLowerCase();
      const code = (r.reservationCode || r.id || '').toLowerCase();
      const nationalId = (r.guest?.nationalId || '').toLowerCase();
      const slipRef = (r.paymentSlipRef || '').toLowerCase();
      const phone = (r.guest?.phone || '').toLowerCase();
      return (
        guestName.includes(q) ||
        roomNumber.includes(q) ||
        code.includes(q) ||
        nationalId.includes(q) ||
        slipRef.includes(q) ||
        phone.includes(q)
      );
    });
  }, [reservations, filter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const paginated = useMemo(
    () => paginateItems(filteredRows, currentPage, 10),
    [filteredRows, currentPage]
  );

  const formatDateTime = (val?: string | null) => {
    if (!val) return '-';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return new Intl.DateTimeFormat(isEn ? 'en-US' : 'th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  };

  return (
    <AdminLayout activePath="/admin/stay-evidence">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/90 px-4 py-3.5 mb-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Owner Portal</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">
                {isEn ? 'Stay & Payment Evidence' : 'หลักฐานการเข้าพัก'}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isEn ? 'Stay & Payment Evidence' : 'หลักฐานการเข้าพักและสลิปโอนเงิน'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isEn
                ? 'Audit payment slips, ID/passport records, and check-in timestamps submitted by Front Desk.'
                : 'ตรวจสอบรูปสลิปโอนเงิน เลขอ้างอิง บัตรประชาชน/พาสปอร์ต และเวลาเช็คอินที่ Front Desk บันทึกไว้'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F97316]' : 'text-slate-600'}`} />
            <span>
              {refreshSuccess
                ? isEn
                  ? 'Refreshed'
                  : 'อัปเดตแล้ว'
                : isEn
                ? 'Refresh'
                : 'รีเฟรชข้อมูล'}
            </span>
          </Button>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* 4 Summary Cards (Unified Owner Orange Icons) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                {isEn ? 'Total Bookings' : 'รายการจองทั้งหมด'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                {isEn ? 'With Payment Slip' : 'แนบสลิป/อ้างอิงแล้ว'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.withSlip}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                {isEn ? 'Payment Verified' : 'ยืนยันชำระแล้ว'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.verified}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                {isEn ? 'Checked In / Stayed' : 'เช็คอินเข้าพักแล้ว'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.checkedIn}</div>
          </div>
        </div>

        {/* Search & Filter Toolbar (Owner Standard) */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isEn
                    ? 'Search guest, room, ID card, slip ref...'
                    : 'ค้นหาชื่อแขก, เลขห้อง, เลขบัตร, เลขอ้างอิงสลิป...'
                }
                className="pl-9 h-8.5 text-xs border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-slate-400">{isEn ? 'Filter:' : 'ตัวกรอง:'}</span>
              <Select
                containerClassName="w-44"
                value={filter}
                onChange={(e) => setFilter(e.target.value as EvidenceFilter)}
              >
                <option value="all">{isEn ? 'All' : 'ทั้งหมด'}</option>
                <option value="has_slip">{isEn ? 'Has Slip / Ref' : 'มีสลิป/อ้างอิง'}</option>
                <option value="verified">{isEn ? 'Payment Verified' : 'ยืนยันชำระแล้ว'}</option>
                <option value="checked_in">{isEn ? 'Checked In' : 'เช็คอินแล้ว'}</option>
                <option value="missing_slip">{isEn ? 'No Slip' : 'ยังไม่แนบสลิป'}</option>
              </Select>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            {isEn
              ? `Showing ${paginated.totalItems} of ${reservations.length} records`
              : `แสดง ${paginated.totalItems} จาก ${reservations.length} รายการ`}
          </span>
        </div>

        {/* Evidence Table */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
            <CardTitle className="text-sm font-bold text-slate-900">
              {isEn ? 'Stay & Payment Records' : 'รายการหลักฐานการเข้าพักและสลิป'}
            </CardTitle>
            <span className="text-[11px] text-slate-400 font-mono">Front Desk Audit Log</span>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white border-b border-slate-100 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{isEn ? 'Room / Code' : 'ห้อง / รหัสจอง'}</th>
                    <th className="py-3 px-3">{isEn ? 'Guest & ID' : 'ผู้เข้าพัก & เลขบัตร'}</th>
                    <th className="py-3 px-3">{isEn ? 'Channel & Dates' : 'ช่องทาง & วันเข้าพัก'}</th>
                    <th className="py-3 px-3">{isEn ? 'Payment & Slip' : 'การชำระ & หลักฐานสลิป'}</th>
                    <th className="py-3 px-3">{isEn ? 'Status' : 'สถานะ'}</th>
                    <th className="py-3 px-4 text-right">{isEn ? 'Action' : 'ตรวจสอบ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {isEn ? 'Loading evidence records...' : 'กำลังโหลดข้อมูลหลักฐานการเข้าพัก...'}
                      </td>
                    </tr>
                  ) : paginated.pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {isEn ? 'No matching stay records found.' : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
                      </td>
                    </tr>
                  ) : (
                    paginated.pageItems.map((item) => {
                      const guestName = resolveGuestName(item);
                      const statusCfg = STATUS_DOT_MAP[item.status] || {
                        th: item.status,
                        en: item.status,
                        dot: 'bg-slate-400',
                      };
                      const sourceCfg = item.bookingSource ? BOOKING_SOURCE_LABEL[item.bookingSource] : null;
                      const hasSlip = Boolean(item.paymentSlipUrl || item.paymentSlipRef);
                      const isPaid = item.paymentStatus === 'paid' || Boolean(item.paymentVerifiedAt);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <div className="font-mono font-semibold text-slate-900">
                              {item.roomNumber ? (isEn ? `Rm ${item.roomNumber}` : `ห้อง ${item.roomNumber}`) : '-'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {item.reservationCode || item.id.slice(0, 8)}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="font-semibold text-slate-900">{guestName}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {item.guest?.nationalId
                                ? `${isEn ? 'ID' : 'บัตร'}: ${item.guest.nationalId}`
                                : isEn
                                ? 'No ID recorded'
                                : 'ยังไม่ระบุเลขบัตร'}
                            </div>
                            {item.guest?.phone && (
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.guest.phone}</div>
                            )}
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="text-slate-700 font-medium">
                              {sourceCfg ? (isEn ? sourceCfg.en : sourceCfg.th) : '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                              {item.checkInDate} → {item.checkOutDate}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isPaid ? 'bg-emerald-500' : 'bg-amber-400'
                                }`}
                              />
                              <span className="font-medium text-slate-700">
                                {isPaid
                                  ? isEn
                                    ? 'Paid'
                                    : 'ชำระแล้ว'
                                  : isEn
                                  ? 'Unpaid'
                                  : 'รอชำระ'}
                              </span>
                              {hasSlip && (
                                <span className="text-[11px] text-slate-500">
                                  · {isEn ? 'Slip Attached' : 'มีสลิป'}
                                </span>
                              )}
                            </div>
                            {item.paymentSlipRef && (
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Ref: {item.paymentSlipRef}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
                              <span className="font-medium text-slate-700">
                                {isEn ? statusCfg.en : statusCfg.th}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                              className="h-7 px-2.5 text-[11px] font-medium gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>{isEn ? 'View' : 'ดูหลักฐาน'}</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {paginated.totalItems > 0 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <PaginationBar
                  currentPage={paginated.currentPage}
                  totalPages={paginated.totalPages}
                  totalItems={paginated.totalItems}
                  startIndex={paginated.startIndex}
                  endIndex={paginated.endIndex}
                  pageSize={10}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evidence Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isEn ? 'Stay & Payment Evidence' : 'รายละเอียดหลักฐานการเข้าพัก'}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedItem.reservationCode || selectedItem.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left: Guest & Check-in Details */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <BedDouble className="w-4 h-4 text-[#F97316] shrink-0" />
                    <span className="font-bold text-sm text-slate-900">
                      {selectedItem.roomNumber ? `ห้อง ${selectedItem.roomNumber}` : '-'}
                    </span>
                    {selectedItem.roomTypeName && (
                      <span className="text-slate-500">({selectedItem.roomTypeName})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold">{resolveGuestName(selectedItem)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <IdCard className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono">
                      {selectedItem.guest?.nationalId || (isEn ? 'Not recorded' : 'ยังไม่ระบุเลขบัตร/พาสปอร์ต')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{selectedItem.guest?.phone || '-'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono">
                      {selectedItem.checkInDate} → {selectedItem.checkOutDate}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isEn ? 'Checked In At' : 'เวลาเช็คอินจริง'}</span>
                    <span className="font-mono font-medium text-slate-900">
                      {formatDateTime((selectedItem as any).checkedInAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isEn ? 'Slip Reference' : 'เลขอ้างอิงสลิป'}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedItem.paymentSlipRef || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isEn ? 'Verified At' : 'เวลายืนยันสลิป'}</span>
                    <span className="font-mono text-slate-700">
                      {formatDateTime(selectedItem.paymentVerifiedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{isEn ? 'Total Amount' : 'ยอดรวมการจอง'}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ฿{Number(selectedItem.totalAmount ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Slip Image Preview */}
              <div className="flex flex-col">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#F97316]" />
                  <span>{isEn ? 'Payment Slip Image' : 'รูปหลักฐานสลิปการโอนเงิน'}</span>
                </div>
                {selectedItem.paymentSlipUrl ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-center min-h-[260px]">
                    <img
                      src={assetUrl(selectedItem.paymentSlipUrl)}
                      alt={`Payment slip for ${selectedItem.roomNumber || selectedItem.id}`}
                      className="max-h-[380px] w-auto rounded-lg object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 flex flex-col items-center justify-center text-center min-h-[260px] text-slate-400">
                    <Clock className="w-8 h-8 mb-2 text-slate-300" />
                    <p className="text-xs font-medium text-slate-500">
                      {isEn
                        ? 'No payment slip image attached for this reservation.'
                        : 'ยังไม่มีรูปสลิปแนบสำหรับรายการจองนี้'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default StayEvidencePage;

import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const STATUS_BADGE_MAP: Record<string, { th: string; en: string; cls: string }> = {
  checked_in: { th: 'กำลังเข้าพัก', en: 'Checked In', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  extended: { th: 'พักต่อ', en: 'Extended', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  checked_out: { th: 'เช็คเอาต์แล้ว', en: 'Checked Out', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed: { th: 'ยืนยันการจอง', en: 'Confirmed', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const StayEvidencePage: React.FC = () => {
  const { locale } = useTranslation();
  const isEn = locale === 'en';

  const [reservations, setReservations] = useState<ExtendedReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<EvidenceFilter>('all');
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
    <AdminLayout>
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
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
            className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs self-start sm:self-auto"
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
        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                {isEn ? 'Total Bookings' : 'รายการจองทั้งหมด'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
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
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700">{stats.verified}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                {isEn ? 'Checked In / Stayed' : 'เช็คอินเข้าพักแล้ว'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{stats.checkedIn}</div>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="border-slate-200/90 shadow-2xs bg-white rounded-xl overflow-hidden">
          <CardHeader className="py-3.5 px-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isEn
                    ? 'Search guest, room, ID card, slip ref...'
                    : 'ค้นหาชื่อแขก, เลขห้อง, เลขบัตร, เลขอ้างอิงสลิป...'
                }
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', th: 'ทั้งหมด', en: 'All' },
                  { id: 'has_slip', th: 'มีสลิป/อ้างอิง', en: 'Has Slip' },
                  { id: 'verified', th: 'ยืนยันชำระแล้ว', en: 'Verified' },
                  { id: 'checked_in', th: 'เช็คอินแล้ว', en: 'Checked In' },
                  { id: 'missing_slip', th: 'ยังไม่แนบสลิป', en: 'No Slip' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === tab.id
                      ? 'bg-[#F97316] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isEn ? tab.en : tab.th}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">{isEn ? 'Room / Code' : 'ห้อง / รหัสจอง'}</th>
                    <th className="py-3 px-4">{isEn ? 'Guest & ID' : 'ผู้เข้าพัก & เลขบัตร'}</th>
                    <th className="py-3 px-4">{isEn ? 'Channel & Dates' : 'ช่องทาง & วันเข้าพัก'}</th>
                    <th className="py-3 px-4">{isEn ? 'Payment & Slip' : 'การชำระ & หลักฐานสลิป'}</th>
                    <th className="py-3 px-4">{isEn ? 'Status' : 'สถานะ'}</th>
                    <th className="py-3 px-4 text-right">{isEn ? 'Action' : 'ตรวจสอบ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {isEn ? 'Loading evidence records...' : 'กำลังโหลดข้อมูลหลักฐานการเข้าพัก...'}
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {isEn ? 'No matching stay records found.' : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item) => {
                      const guestName = resolveGuestName(item);
                      const statusCfg = STATUS_BADGE_MAP[item.status] || {
                        th: item.status,
                        en: item.status,
                        cls: 'bg-slate-100 text-slate-700 border-slate-200',
                      };
                      const sourceCfg = item.bookingSource ? BOOKING_SOURCE_LABEL[item.bookingSource] : null;
                      const hasSlip = Boolean(item.paymentSlipUrl || item.paymentSlipRef);
                      const isPaid = item.paymentStatus === 'paid' || Boolean(item.paymentVerifiedAt);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              {item.roomNumber ? (isEn ? `Rm ${item.roomNumber}` : `ห้อง ${item.roomNumber}`) : '-'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {item.reservationCode || item.id.slice(0, 8)}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900">{guestName}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {item.guest?.nationalId
                                ? `${isEn ? 'ID' : 'บัตร'}: ${item.guest.nationalId}`
                                : isEn
                                ? 'No ID recorded'
                                : 'ยังไม่ระบุเลขบัตร'}
                            </div>
                            {item.guest?.phone && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.guest.phone}</div>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top">
                            <div className="text-slate-700 font-medium">
                              {sourceCfg ? (isEn ? sourceCfg.en : sourceCfg.th) : '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                              {item.checkInDate} → {item.checkOutDate}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {isPaid
                                  ? isEn
                                    ? 'Paid'
                                    : 'ชำระแล้ว'
                                  : isEn
                                  ? 'Unpaid'
                                  : 'รอชำระ'}
                              </Badge>
                              {hasSlip && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold bg-orange-50 text-[#F97316] border-orange-200"
                                >
                                  {isEn ? 'Slip Attached' : 'มีสลิป'}
                                </Badge>
                              )}
                            </div>
                            {item.paymentSlipRef && (
                              <div className="text-[11px] font-mono text-slate-500 mt-1">
                                Ref: {item.paymentSlipRef}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top">
                            <Badge variant="outline" className={`text-[11px] font-semibold whitespace-nowrap ${statusCfg.cls}`}>
                              {isEn ? statusCfg.en : statusCfg.th}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 align-top text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                              className="h-8 px-2.5 text-xs font-semibold gap-1 border-slate-200 hover:border-[#F97316] hover:text-[#F97316]"
                            >
                              <Eye className="w-3.5 h-3.5" />
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

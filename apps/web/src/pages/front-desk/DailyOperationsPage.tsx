import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useReservations, ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { useBilling, DetailedBill } from '@/hooks/useBilling';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { CheckInModal } from '@/components/front-desk/CheckInModal';
import { CheckOutModal } from '@/components/front-desk/CheckOutModal';
import { ExtendStayModal } from '@/components/front-desk/ExtendStayModal';
import { RapidWalkInModal } from '@/components/front-desk/RapidWalkInModal';
import { ReceiptTaxInvoiceModal, TaxInvoiceAbbModal } from '@/components/front-desk/ReceiptTaxInvoiceModal';
import {
  UserPlus,
  LogIn,
  LogOut,
  Receipt,
  CalendarPlus,
  WifiOff,
  Search,
  Printer,
} from 'lucide-react';

export const DailyOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale, formatDate, formatDateRange, formatCurrency } = useI18n();
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    reservations,
    loading: reservationsLoading,
    isOffline,
    lastRefreshed,
    refresh: refreshReservations,
    checkInReservation,
    walkInCheckIn,
  } = useReservations();

  const { rooms, roomTypes, refresh: refreshRooms } = useRooms();

  const {
    bills,
    loading: billingLoading,
    refresh: refreshBilling,
    loadBillDetails,
  } = useBilling();

  const [activeSubTab, setActiveSubTab] = useState<'arrivals' | 'departures' | 'billing'>('arrivals');
  const [checkInTarget, setCheckInTarget] = useState<ExtendedReservation | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<ExtendedReservation | null>(null);
  const [extendTarget, setExtendTarget] = useState<ExtendedReservation | null>(null);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);

  // Billing history sub-tab state
  const [billingSearchQuery, setBillingSearchQuery] = useState('');
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<DetailedBill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const handleManualRefresh = async () => {
    await Promise.all([refreshReservations(), refreshRooms(), refreshBilling()]);
  };

  const refreshTimeStr = lastRefreshed.toLocaleTimeString(
    locale === 'th' ? 'th-TH' : 'en-US',
    { hour: '2-digit', minute: '2-digit', second: '2-digit' }
  );

  // Available rooms for Walk-in
  const availableRooms = useMemo(() => {
    return rooms.filter((r) => r.status === 'available');
  }, [rooms]);

  // Today's Arrivals: checkInDate <= todayStr and status is confirmed or pending
  const arrivals = useMemo(() => {
    return reservations.filter(
      (r) =>
        (r.status === 'confirmed' || r.status === 'pending') &&
        (r.checkInDate <= todayStr || r.checkInDate === todayStr)
    );
  }, [reservations, todayStr]);

  // Today's Departures: currently checked_in and checkOutDate <= todayStr
  const departures = useMemo(() => {
    return reservations.filter(
      (r) =>
        r.status === 'checked_in' &&
        (r.checkOutDate <= todayStr || r.checkOutDate === todayStr)
    );
  }, [reservations, todayStr]);

  // Filtered bills for billing history ledger
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (!billingSearchQuery.trim()) return true;
      const q = billingSearchQuery.toLowerCase().trim();
      const matchesGuest = b.guestName?.toLowerCase().includes(q) || false;
      const matchesRoom = b.roomNumber?.toLowerCase().includes(q) || false;
      const matchesId = b.id.toLowerCase().includes(q);
      return matchesGuest || matchesRoom || matchesId;
    });
  }, [bills, billingSearchQuery]);

  const handleOpenReprintInvoice = async (bill: DetailedBill) => {
    const full = await loadBillDetails(bill.id);
    setSelectedBillForInvoice(full || bill);
    setIsInvoiceModalOpen(true);
  };

  return (
    <FrontDeskLayout activeTab="operations">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {t('ops.title')}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5 font-sans">
              {t('ops.todayDate', {
                date: formatDate(todayStr, 'long'),
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200/60 shrink-0">
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                aria-hidden="true"
              />
              <span className="font-mono tabular-nums text-xs text-slate-500 font-medium">
                {locale === 'th' ? `อัปเดตอัตโนมัติ: ${refreshTimeStr}` : `Auto-refresh: ${refreshTimeStr}`}
              </span>
            </div>

            <button
              onClick={() => setIsWalkInOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors min-h-[36px] font-sans"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>{t('ops.walkIn')}</span>
            </button>
          </div>
        </div>

        {/* Status notice */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-sans">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
            <span>{t('folio.offlineNotice')}</span>
          </div>
        )}

        {/* 3 Operational Sub-Tabs: Arrivals, Departures & Cashier, and Billing History */}
        <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          {/* Sub-tab 1: Check-in / Arrivals Today */}
          <button
            onClick={() => setActiveSubTab('arrivals')}
            className={`flex items-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors whitespace-nowrap min-h-[44px] font-sans ${
              activeSubTab === 'arrivals'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <LogIn className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span className="font-sans font-semibold">{t('ops.subtabCheckInToday') || t('ops.arrivalsToday')}</span>
            <span
              className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded-full ${
                activeSubTab === 'arrivals'
                  ? 'bg-emerald-200/80 text-emerald-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              ({arrivals.length})
            </span>
          </button>

          {/* Sub-tab 2: Check-out & Cashier / Departures Today */}
          <button
            onClick={() => setActiveSubTab('departures')}
            className={`flex items-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors whitespace-nowrap min-h-[44px] font-sans ${
              activeSubTab === 'departures'
                ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <LogOut className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span className="font-sans font-semibold">{t('ops.subtabCheckOutAndCashier') || t('ops.departuresToday')}</span>
            <span
              className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded-full ${
                activeSubTab === 'departures'
                  ? 'bg-blue-200/80 text-blue-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              ({departures.length})
            </span>
          </button>

          {/* Sub-tab 3: Billing & Settlement History with Receipt icon */}
          <button
            onClick={() => setActiveSubTab('billing')}
            className={`flex items-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors whitespace-nowrap min-h-[44px] font-sans ${
              activeSubTab === 'billing'
                ? 'bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Receipt className="w-4 h-4 text-purple-600" aria-hidden="true" />
            <span className="font-sans font-semibold">{t('ops.subtabBillingHistory')}</span>
            <span
              className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded-full ${
                activeSubTab === 'billing'
                  ? 'bg-purple-200/80 text-purple-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              ({bills.length})
            </span>
          </button>
        </div>

        {/* Content Section */}
        {activeSubTab === 'arrivals' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-sm text-emerald-900 font-medium font-sans">
              <span>{t('ops.arrivalsDescription')}</span>
              <span className="font-sans text-xs text-emerald-700 font-medium">
                {t('ops.totalItems', { count: arrivals.length })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('res.bookingNumber')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.guestName')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.room')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.roomType')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.dates')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans text-right">{t('common.deposit')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrivals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-sans">
                        {t('ops.noArrivals')}
                      </td>
                    </tr>
                  ) : (
                    arrivals.map((res) => {
                      const room = rooms.find((r) => r.id === res.roomId || (res.roomNumber && r.roomNumber === res.roomNumber));
                      const roomType = roomTypes.find((rt) => rt.id === room?.roomTypeId);
                      const roomNum = res.roomNumber || room?.roomNumber || '—';
                      const roomTypeName = localizeRoomType(roomType?.name, locale) || '—';
                      const guestDisplayName = resolveGuestName(res) || res.guestName || res.guest?.fullName || '—';

                      return (
                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium tabular-nums text-slate-900 text-sm">
                            {res.bookingNumber || res.id.slice(0, 8)}
                          </td>
                          <td className="py-3.5 px-4 font-sans text-sm font-medium text-slate-800">
                            {guestDisplayName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-medium tabular-nums text-xs border border-slate-200">
                              {roomNum}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-sm font-medium text-slate-800">
                            {roomTypeName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium tabular-nums text-slate-600 text-sm">
                            {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 text-sm">
                            {formatCurrency(res.depositAmount || '0')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setCheckInTarget(res)}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold py-1.5 px-3.5 text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors min-h-[36px] font-sans"
                            >
                              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t('ops.checkIn')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Departures & Cashier Sub-tab */}
        {activeSubTab === 'departures' && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-sm text-blue-900 font-medium font-sans">
              <span>{t('ops.departuresDescription')}</span>
              <span className="font-sans text-xs text-blue-700 font-medium">
                {t('ops.totalItems', { count: departures.length })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('res.bookingNumber')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.guestName')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.room')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.roomType')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">{t('common.dates')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans text-right">{t('common.total')}</th>
                    <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departures.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-sans">
                        {t('ops.noDepartures')}
                      </td>
                    </tr>
                  ) : (
                    departures.map((res) => {
                      const room = rooms.find((r) => r.id === res.roomId || (res.roomNumber && r.roomNumber === res.roomNumber));
                      const roomType = roomTypes.find((rt) => rt.id === room?.roomTypeId);
                      const roomNum = res.roomNumber || room?.roomNumber || '—';
                      const roomTypeName = localizeRoomType(roomType?.name, locale) || '—';
                      const guestDisplayName = resolveGuestName(res) || res.guestName || res.guest?.fullName || '—';

                      return (
                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium tabular-nums text-slate-900 text-sm">
                            {res.bookingNumber || res.id.slice(0, 8)}
                          </td>
                          <td className="py-3.5 px-4 font-sans text-sm font-medium text-slate-800">
                            {guestDisplayName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-medium tabular-nums text-xs border border-slate-200">
                              {roomNum}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-sm font-medium text-slate-800">
                            {roomTypeName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium tabular-nums text-slate-600 text-sm">
                            {formatDateRange(res.checkInDate, res.checkOutDate, res.totalNights)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 text-sm">
                            {formatCurrency(res.totalAmount || '0')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setExtendTarget(res)}
                                className="inline-flex items-center gap-1 text-sm font-semibold py-1.5 px-3.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors min-h-[36px] font-sans"
                                title={t('extend.button')}
                              >
                                <CalendarPlus className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                <span>{t('extend.button')}</span>
                              </button>
                              <button
                                onClick={() => setCheckOutTarget(res)}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold py-1.5 px-3.5 text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors min-h-[36px] font-sans"
                                title={t('ops.checkOutAndSettle') || t('ops.checkOut')}
                              >
                                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t('ops.checkOutAndSettle') || t('ops.checkOut')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Billing & Settlement History Sub-tab */}
        {activeSubTab === 'billing' && (
          <div className="space-y-3">
            {/* Search & Ledger Header */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('ops.searchBillingPlaceholder') || t('folio.searchPlaceholder')}
                  value={billingSearchQuery}
                  onChange={(e) => setBillingSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium font-sans">
                {t('ops.totalItems', { count: filteredBills.length })}
              </div>
            </div>

            {/* Bills Ledger Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">
                        {t('invoice.number')}
                      </th>
                      <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">
                        {t('common.room')}
                      </th>
                      <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">
                        {t('common.guestName')}
                      </th>
                      <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans">
                        {t('common.dates')}
                      </th>
                      <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans text-right">
                        {t('common.total')}
                      </th>
                      <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans text-center">
                        {t('common.status')}
                      </th>
                      <th className="text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 font-sans text-right">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-sans">
                          {t('ops.noBillingHistory')}
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((b) => {
                        const isPaid = b.status === 'paid';
                        const billTotal = parseFloat(b.netAmount || b.subtotal || '0');

                        return (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium tabular-nums text-slate-900 text-sm">
                              INV-{b.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-medium tabular-nums text-xs border border-slate-200">
                                {b.roomNumber || '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-sans text-sm font-medium text-slate-800">
                              {b.guestName || t('common.guest')}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium tabular-nums text-slate-600 text-sm">
                              {formatDate(b.createdAt, 'medium')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 text-sm">
                              {formatCurrency(billTotal)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium border ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {isPaid ? t('folio.paid') : t('folio.pending')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleOpenReprintInvoice(b)}
                                className="inline-flex items-center text-xs sm:text-sm font-semibold py-1.5 px-3 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs transition-colors min-h-[36px] active:scale-[0.98] font-sans"
                                title="พิมพ์สลิป (80mm)"
                              >
                                <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                                <span>{locale === 'th' ? 'พิมพ์สลิป (80mm)' : 'Print Slip (80mm)'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Check In Modal */}
      <CheckInModal
        reservation={checkInTarget}
        roomType={
          roomTypes.find(
            (rt) => rt.id === rooms.find((r) => r.id === checkInTarget?.roomId)?.roomTypeId
          ) || null
        }
        isOpen={!!checkInTarget}
        onClose={() => setCheckInTarget(null)}
        onConfirm={checkInReservation}
      />

      {/* Check Out Modal with Itemized Folio Settlement & Cashier */}
      <CheckOutModal
        reservation={checkOutTarget}
        roomType={
          roomTypes.find(
            (rt) => rt.id === rooms.find((r) => r.id === checkOutTarget?.roomId)?.roomTypeId
          ) || null
        }
        isOpen={!!checkOutTarget}
        onClose={() => setCheckOutTarget(null)}
        onSuccess={handleManualRefresh}
      />

      {/* Extend Stay Modal */}
      <ExtendStayModal
        reservation={extendTarget}
        room={rooms.find((r) => r.id === extendTarget?.roomId) || null}
        roomType={
          roomTypes.find(
            (rt) => rt.id === rooms.find((r) => r.id === extendTarget?.roomId)?.roomTypeId
          ) || null
        }
        isOpen={!!extendTarget}
        onClose={() => setExtendTarget(null)}
        onSuccess={handleManualRefresh}
      />

      {/* Rapid Walk In Modal */}
      <RapidWalkInModal
        isOpen={isWalkInOpen}
        availableRooms={availableRooms}
        roomTypes={roomTypes}
        onClose={() => setIsWalkInOpen(false)}
        onSubmit={walkInCheckIn}
      />

      {/* Reprint Thai Tax Invoice (ABB) Modal */}
      <ReceiptTaxInvoiceModal
        bill={selectedBillForInvoice}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedBillForInvoice(null);
        }}
      />
    </FrontDeskLayout>
  );
};

export default DailyOperationsPage;

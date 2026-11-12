import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useBilling, DetailedBill } from '@/hooks/useBilling';
import { useReservations, ExtendedReservation } from '@/hooks/useReservations';
import { useRooms } from '@/hooks/useRooms';
import { Room } from '@keystay/types';
import { FolioSplitScreen, calculateFolioSummary } from '@/components/front-desk/FolioSplitScreen';
import { AddExtraChargeModal } from '@/components/front-desk/AddExtraChargeModal';
import { RequestAmenitiesModal } from '@/components/front-desk/RequestAmenitiesModal';
import { ReceiptTaxInvoiceModal } from '@/components/front-desk/ReceiptTaxInvoiceModal';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType } from '@/lib/localizeMetadata';
import { apiFetch } from '@/lib/api';
import {
  Search,
  WifiOff,
  Receipt,
  ReceiptText,
} from 'lucide-react';

export type RoomWithRoomType = Room & {
  roomType?: { name?: string; basePrice?: number | string };
};

export function reconcileLiveFolios(
  rawBills: DetailedBill[],
  reservations: ExtendedReservation[],
  rooms: RoomWithRoomType[] = [],
  locale: 'th' | 'en' = 'th'
): DetailedBill[] {
  return rawBills
    .filter((bill) => {
      const isDummyName =
        typeof bill.guestName === 'string' &&
        (bill.guestName.startsWith('Guest (Room ') || bill.guestName === 'Guest');
      const total = Number(bill.totalAmount || bill.subtotal || 0);
      const hasZeroItems = !bill.items || bill.items.length === 0;
      const isStaleDummyPaid = bill.status === 'paid' && total === 0 && hasZeroItems && isDummyName;

      if (isStaleDummyPaid) {
        const matchingRes = reservations.find(
          (r) =>
            (r.id === bill.reservationId || r.roomNumber === bill.roomNumber) &&
            (r.status === 'checked_in' || r.status === 'extended')
        );
        // If no matching active reservation exists, exclude stale dummy bill
        if (!matchingRes) return false;
      }
      return true;
    })
    .map((bill) => {
      const matchingRes = reservations.find(
        (r) =>
          (r.id === bill.reservationId || r.roomNumber === bill.roomNumber) &&
          (r.status === 'checked_in' || r.status === 'extended')
      );

      if (!matchingRes) return bill;

      const realGuestName = matchingRes.guestName || matchingRes.guest?.fullName;
      const isFallbackName =
        !bill.guestName ||
        bill.guestName.startsWith('Guest (Room ') ||
        bill.guestName === 'Guest' ||
        bill.guestName === '—';

      const effectiveGuestName =
        realGuestName && realGuestName.trim() && realGuestName !== '—'
          ? realGuestName.trim()
          : isFallbackName
          ? realGuestName || bill.guestName
          : bill.guestName;

      const total = Number(bill.totalAmount || bill.subtotal || 0);
      const hasZeroItems = !bill.items || bill.items.length === 0;
      const resPaymentStatus = matchingRes.paymentStatus || (matchingRes as any).payment_status;
      const shouldBePending = resPaymentStatus !== 'paid' && total === 0 && hasZeroItems;

      const room = rooms.find(
        (rm) =>
          rm.roomNumber === (bill.roomNumber || matchingRes.roomNumber) ||
          rm.id === (bill.roomId || matchingRes.roomId)
      );
      const nights = Math.max(1, Number(matchingRes.totalNights) || 1);
      const typeName = localizeRoomType(matchingRes.roomTypeName || room?.roomType?.name, locale);
      const desc = locale === 'th' ? `ค่าห้องพัก ${typeName || ''} (${nights} คืน)` : `${typeName || 'Room Charge'} (${nights} nights)`;

      const items = bill.items?.map((it) => {
        if (
          it.category === 'room' ||
          (it as any).itemType === 'room_charge' ||
          (it as any).item_type === 'room_charge' ||
          it.description?.toLowerCase().includes('room charge') ||
          it.description?.startsWith('ค่าห้องพัก')
        ) {
          return {
            ...it,
            description: desc,
          };
        }
        return it;
      });

      return {
        ...bill,
        guestName: effectiveGuestName,
        status: shouldBePending ? ('pending' as const) : bill.status,
        items: items || bill.items,
      };
    });
}

export const CashierFolioPage: React.FC = () => {
  const { t, locale, formatRelativeTime, formatCurrency } = useI18n();
  const location = useLocation();
  const navState = location.state as {
    reservationId?: string;
    roomId?: string;
    roomNumber?: string;
    guestName?: string;
    billId?: string;
    action?: string;
  } | null;

  const { reservations, loading: reservationsLoading } = useReservations();
  const { rooms: rawRooms, roomTypes } = useRooms();
  const rooms: RoomWithRoomType[] = useMemo(
    () =>
      rawRooms.map((rm) => ({
        ...rm,
        roomType: roomTypes.find((rt) => rt.id === rm.roomTypeId),
      })),
    [rawRooms, roomTypes]
  );

  const {
    bills: rawBills,
    selectedBill: rawSelectedBill,
    setSelectedBill,
    loading: billingLoading,
    error,
    isOffline,
    lastRefreshed,
    refresh,
    loadBillDetails,
    loadBillByReservation,
    addExtraCharge,
    deleteChargeItem,
    settleBillPayment,
  } = useBilling(reservations);

  const loading = billingLoading || reservationsLoading;

  // Cross-reference bills with active in-house reservations & heal/exclude stale dummy bills
  const bills = useMemo(() => {
    return reconcileLiveFolios(rawBills, reservations, rooms, locale as any);
  }, [rawBills, reservations, rooms, locale]);

  // Synchronize selected bill with active reservation details
  const selectedBill = useMemo(() => {
    if (!rawSelectedBill) return null;
    const matchingRes = reservations.find(
      (r) =>
        (r.id === rawSelectedBill.reservationId || r.roomNumber === rawSelectedBill.roomNumber) &&
        (r.status === 'checked_in' || r.status === 'extended')
    );

    if (!matchingRes) return rawSelectedBill;

    const realGuestName = matchingRes.guestName || matchingRes.guest?.fullName;
    const isFallbackName =
      !rawSelectedBill.guestName ||
      rawSelectedBill.guestName.startsWith('Guest (Room ') ||
      rawSelectedBill.guestName === 'Guest' ||
      rawSelectedBill.guestName === '—';

    const effectiveGuestName =
      realGuestName && realGuestName.trim() && realGuestName !== '—'
        ? realGuestName.trim()
        : isFallbackName
        ? realGuestName || rawSelectedBill.guestName
        : rawSelectedBill.guestName;

    const total = Number(rawSelectedBill.totalAmount || rawSelectedBill.subtotal || 0);
    const hasZeroItems = !rawSelectedBill.items || rawSelectedBill.items.length === 0;
    const resPaymentStatus = matchingRes.paymentStatus || (matchingRes as any).payment_status;
    const shouldBePending = resPaymentStatus !== 'paid' && total === 0 && hasZeroItems;

    const room = rooms.find(
      (rm) =>
        rm.roomNumber === (rawSelectedBill.roomNumber || matchingRes.roomNumber) ||
        rm.id === (rawSelectedBill.roomId || matchingRes.roomId)
    );
    const nights = Math.max(1, Number(matchingRes.totalNights) || 1);
    const typeName = localizeRoomType(matchingRes.roomTypeName || room?.roomType?.name, locale);
    const desc = locale === 'th' ? `ค่าห้องพัก ${typeName || ''} (${nights} คืน)` : `${typeName || 'Room Charge'} (${nights} nights)`;

    const items = rawSelectedBill.items?.map((it) => {
      if (
        it.category === 'room' ||
        (it as any).itemType === 'room_charge' ||
        (it as any).item_type === 'room_charge' ||
        it.description?.toLowerCase().includes('room charge') ||
        it.description?.startsWith('ค่าห้องพัก')
      ) {
        return {
          ...it,
          description: desc,
        };
      }
      return it;
    });

    return {
      ...rawSelectedBill,
      guestName: effectiveGuestName,
      status: shouldBePending ? ('pending' as const) : rawSelectedBill.status,
      items: items || rawSelectedBill.items,
    };
  }, [rawSelectedBill, reservations, rooms, locale]);

  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'paid'>('all');
  const autoCreatedRef = useRef(false);

  // Auto-select bill from navigation state if passed, or auto-create folio on the fly if none exists
  useEffect(() => {
    if (navState?.reservationId) {
      const match = bills.find((b) => b.reservationId === navState.reservationId);
      if (match) {
        loadBillDetails(match.id);
        return;
      }
      loadBillByReservation(navState.reservationId);
    } else if (navState?.billId) {
      loadBillDetails(navState.billId);
      return;
    }

    const matchingBill = bills.find(
      (b) =>
        (navState?.roomId &&
          (b.roomId === navState.roomId || (b as any).room_id === navState.roomId)) ||
        (navState?.roomNumber && b.roomNumber === navState.roomNumber)
    );

    if (matchingBill) {
      loadBillDetails(matchingBill.id);
    } else if (
      !autoCreatedRef.current &&
      !loading &&
      (navState?.action === 'add-charge' ||
        navState?.action === 'charge' ||
        navState?.action === 'minibar' ||
        Boolean(navState?.roomId || navState?.roomNumber || navState?.reservationId)) &&
      Boolean(navState?.roomNumber || navState?.roomId || navState?.reservationId)
    ) {
      autoCreatedRef.current = true;
      const roomNum = navState?.roomNumber || '—';
      const resId = navState?.reservationId || `res-${Date.now()}`;

      // Look up matchingRes using roomNum or resId
      const matchingRes = reservations.find(
        (r) =>
          (resId && r.id === resId) ||
          (roomNum && roomNum !== '—' && r.roomNumber === roomNum) ||
          (navState?.roomId && r.roomId === navState.roomId)
      );

      const guestName =
        matchingRes?.guestName ||
        matchingRes?.guest?.fullName ||
        (navState as any)?.guestName ||
        'Guest';

      // Calculate nightly rate items if available
      const items: Array<{
        itemType: 'room_charge';
        category: 'room';
        description: string;
        quantity: number;
        unitPrice: number;
      }> = [];

      let depositDeducted = 0;
      if (matchingRes) {
        depositDeducted = Number(matchingRes.depositAmount || 0);
        const nights = Math.max(1, Number(matchingRes.totalNights) || 1);
        const nightlyRate =
          matchingRes.nightlyRate !== undefined && matchingRes.nightlyRate !== null
            ? Number(matchingRes.nightlyRate)
            : matchingRes.totalAmount
            ? Number(matchingRes.totalAmount) / nights
            : 0;

        if (nightlyRate > 0) {
          const room = rooms.find(
            (rm) =>
              rm.roomNumber === (roomNum || matchingRes?.roomNumber) ||
              rm.id === (navState?.roomId || matchingRes?.roomId)
          );
          const typeName = localizeRoomType(matchingRes?.roomTypeName || room?.roomType?.name, locale);
          const desc = locale === 'th' ? `ค่าห้องพัก ${typeName || ''} (${nights} คืน)` : `${typeName || 'Room Charge'} (${nights} nights)`;
          items.push({
            itemType: 'room_charge',
            category: 'room',
            description: desc,
            quantity: nights,
            unitPrice: nightlyRate,
          });
        }
      }

      const subtotal = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

      apiFetch<any>('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: resId,
          guestName,
          roomNumber: roomNum,
          subtotal,
          depositDeducted,
          items,
          status: 'pending',
        }),
      })
        .then(async (createRes) => {
          if (createRes.data) {
            await refresh();
            const newBill = await loadBillDetails(createRes.data.id);
            if (newBill) {
              setSelectedBill(newBill);
            }
            setIsAddChargeOpen(true);
          }
        })
        .catch((e) => console.warn('Auto-create active folio failed:', e));
    } else if (bills.length > 0 && !selectedBill) {
      loadBillDetails(bills[0].id);
    }
  }, [navState, bills, loading, reservations, rooms, locale]);

  // Handle direct actions triggered from navigation
  useEffect(() => {
    if (
      navState?.action === 'add-charge' ||
      navState?.action === 'charge' ||
      navState?.action === 'minibar'
    ) {
      setIsAddChargeOpen(true);
    } else if (navState?.action === 'amenities') {
      setIsAmenitiesOpen(true);
    }
  }, [navState?.action]);

  const refreshTimeStr = lastRefreshed.toLocaleTimeString(
    locale === 'th' ? 'th-TH' : 'en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
  );

  const pendingCount = bills.filter((b) => b.status !== 'paid').length;
  const paidCount = bills.filter((b) => b.status === 'paid').length;

  const filteredBills = bills.filter((b) => {
    // Status filter tab
    if (filterTab === 'pending' && b.status === 'paid') return false;
    if (filterTab === 'paid' && b.status !== 'paid') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchesGuest = b.guestName?.toLowerCase().includes(q) || false;
    const matchesRoom = b.roomNumber?.toLowerCase().includes(q) || false;
    const matchesBillNum = (b.billNumber || '').toLowerCase().includes(q);
    const matchesId = b.id.toLowerCase().includes(q);
    return matchesGuest || matchesRoom || matchesBillNum || matchesId;
  });

  const matchingRes = selectedBill
    ? reservations.find(
        (r) =>
          (r.id === selectedBill.reservationId || (selectedBill.roomNumber && r.roomNumber === selectedBill.roomNumber)) &&
          (r.status === 'checked_in' || r.status === 'extended')
      )
    : null;

  return (
    <FrontDeskLayout activeTab="cashier">
      <div className="space-y-4">
        {/* Header with Standard Pulse Auto-Refresh Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {locale === 'th' ? 'แคชเชียร์และบิล (Cashier Hub)' : 'Cashier Hub & Folios'}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5 font-sans">
              {locale === 'th'
                ? 'ศูนย์กลางจัดการโฟลิโอค่าใช้จ่าย บันทึกการชำระเงิน และออกใบเสร็จ/ใบกำกับภาษี'
                : 'Centralized Folio Billing & Payment Settlement Hub'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              title={formatRelativeTime(lastRefreshed, locale)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/60 shrink-0"
            >
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                aria-hidden="true"
              />
              <span className="font-mono tabular-nums text-xs text-slate-500 font-medium">
                {locale === 'th' ? `อัปเดตอัตโนมัติ: ${refreshTimeStr}` : `Auto-refresh: ${refreshTimeStr}`}
              </span>
            </div>
          </div>
        </div>

        {/* Status notice */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-sans">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
            <span>{t('folio.offlineNotice')}</span>
          </div>
        )}

        {/* Swiss Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (Master Panel): Search, Filter Tabs & Bill Cards */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={locale === 'th' ? 'ค้นหาเลขห้อง ชื่อ หรือเลขบิล...' : 'Search room, guest, or bill...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/30 overflow-x-auto no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-2.5 px-3 font-semibold text-center whitespace-nowrap transition-colors border-b-2 ${
                  filterTab === 'all'
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {locale === 'th' ? 'ทั้งหมด' : 'All'}
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full font-mono tabular-nums text-[10px] bg-slate-100 text-slate-600">
                  {bills.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                className={`flex-1 py-2.5 px-3 font-semibold text-center whitespace-nowrap transition-colors border-b-2 ${
                  filterTab === 'pending'
                    ? 'border-amber-500 text-amber-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {locale === 'th' ? 'เปิดบิลอยู่ / กำลังพัก' : 'Pending'}
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full font-mono tabular-nums text-[10px] bg-amber-100 text-amber-800">
                  {pendingCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('paid')}
                className={`flex-1 py-2.5 px-3 font-semibold text-center whitespace-nowrap transition-colors border-b-2 ${
                  filterTab === 'paid'
                    ? 'border-emerald-600 text-emerald-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {locale === 'th' ? 'ชำระแล้ว' : 'Paid'}
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full font-mono tabular-nums text-[10px] bg-emerald-100 text-emerald-800">
                  {paidCount}
                </span>
              </button>
            </div>

            {/* Bill List Cards */}
            <div className="p-3 space-y-2 max-h-[calc(100vh-270px)] overflow-y-auto">
              {filteredBills.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 text-xs font-sans">
                  {locale === 'th' ? 'ไม่พบบิลตามเงื่อนไขที่ค้นหา' : 'No bills found matching criteria'}
                </div>
              ) : (
                filteredBills.map((b) => {
                  const isSelected = selectedBill?.id === b.id;
                  const isPaid = b.status === 'paid';
                  const roomNum = b.roomNumber || '—';
                  const billMatchingRes = reservations.find(
                    (r) =>
                      (r.id === b.reservationId || (b.roomNumber && r.roomNumber === b.roomNumber)) &&
                      (r.status === 'checked_in' || r.status === 'extended')
                  );
                  const depositDeduction = Number(b.depositDeducted) || Number(billMatchingRes?.depositAmount) || 0;
                  const summary = calculateFolioSummary(b.items, depositDeduction, b.subtotal || b.totalAmount || 0);
                  const totalWithVat = summary.totalWithVat;
                  const netAmount = Math.max(0, (totalWithVat || Number(b.totalAmount) || 0) - (Number(b.depositDeducted) || Number(billMatchingRes?.depositAmount) || 0));

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => loadBillDetails(b.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded border tabular-nums ${
                              isSelected
                                ? 'bg-white/10 text-white border-white/20'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {roomNum}
                          </span>
                          <span
                            className={`font-sans font-semibold text-sm truncate ${
                              isSelected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {b.guestName || t('common.guest')}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium tabular-nums tracking-tight border shrink-0 ${
                            isSelected
                              ? isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isPaid ? (locale === 'th' ? 'ชำระแล้ว' : 'Paid') : (locale === 'th' ? 'รอชำระ' : 'Pending')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100/10">
                        <span
                          className={`font-mono text-[11px] truncate ${
                            isSelected ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {b.billNumber || b.id.slice(0, 12)}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {locale === 'th' ? 'ยอดสุทธิ' : 'Net Due'}
                          </span>
                          <span
                            className={`font-mono font-bold tabular-nums text-sm ${
                              isSelected ? 'text-emerald-300' : 'text-slate-900'
                            }`}
                          >
                            {formatCurrency(netAmount)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (Detail Panel): Folio Details or Empty State */}
          <div className="lg:col-span-8">
            {selectedBill ? (
              <FolioSplitScreen
                bill={selectedBill}
                depositAmount={String(matchingRes?.depositAmount ?? selectedBill.depositDeducted ?? 500)}
                onAddCharge={() => setIsAddChargeOpen(true)}
                onRequestAmenities={() => setIsAmenitiesOpen(true)}
                onDeleteItem={(itemId) => {
                  if (selectedBill) deleteChargeItem(selectedBill.id, itemId);
                }}
                onPay={async (method, amount) => {
                  if (!selectedBill) return false;
                  const res = await settleBillPayment(selectedBill.id, method, amount);
                  return !!res.success;
                }}
                onViewInvoice={() => setIsReceiptOpen(true)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center min-h-[420px]">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-700 font-sans">
                  {locale === 'th' ? 'กรุณาเลือกบิลเพื่อดูรายละเอียด' : 'Select a bill to view details'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">
                  {locale === 'th'
                    ? 'เลือกบิลห้องพักจากรายการทางด้านซ้ายเพื่อดูรายละเอียด คิดเงิน และเพิ่มค่าใช้จ่าย'
                    : 'Select a room bill from the list on the left to inspect charges, settle balance, or add extras.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Extra Charge Modal */}
      {selectedBill && (
        <AddExtraChargeModal
          billId={selectedBill.id}
          isOpen={isAddChargeOpen}
          onClose={() => setIsAddChargeOpen(false)}
          onSubmit={addExtraCharge}
        />
      )}

      {/* Request Extra Amenities Modal */}
      {selectedBill && (
        <RequestAmenitiesModal
          isOpen={isAmenitiesOpen}
          onClose={() => setIsAmenitiesOpen(false)}
          roomId={selectedBill.roomId || navState?.roomId}
          roomNumber={selectedBill.roomNumber || navState?.roomNumber}
          reservationId={selectedBill.reservationId || navState?.reservationId}
          billId={selectedBill.id}
          onSubmitAmenity={async (data) => {
            return { success: true };
          }}
          onAddFolioCharge={addExtraCharge}
        />
      )}

      {/* Printable Receipt & Tax Invoice Modal */}
      <ReceiptTaxInvoiceModal
        bill={selectedBill}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </FrontDeskLayout>
  );
};

export default CashierFolioPage;

import React, { useState, useEffect, useMemo } from 'react';
import { ExtendedReservation, resolveGuestName } from '@/hooks/useReservations';
import { RoomType } from '@keystay/types';
import { DetailedBill, BillItem } from '@/hooks/useBilling';
import { useI18n } from '@/lib/i18n';
import { localizeRoomType, localizeFolioDescription } from '@/lib/localizeMetadata';
import { calculateFolioSummary, FolioItemLike } from '@/components/front-desk/FolioSplitScreen';
import { AddExtraChargeModal } from '@/components/front-desk/AddExtraChargeModal';
import { ReceiptTaxInvoiceModal } from '@/components/front-desk/ReceiptTaxInvoiceModal';
import { FolioCategoryBadge } from '@/lib/folioCategory';
import { apiFetch } from '@/lib/api';
import {
  X,
  LogOut,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  FileText,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  Plus,
  Trash2,
  Printer,
} from 'lucide-react';

export interface CheckOutModalProps {
  reservation: ExtendedReservation | null;
  roomType?: RoomType | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onConfirm?: (
    reservationId: string,
    data: {
      keyCardReturned: boolean;
      note?: string;
      actualCheckOut: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  reservation,
  roomType,
  isOpen,
  onClose,
  onSuccess,
  onConfirm,
}) => {
  const { t, locale, formatCurrency, formatDateRange } = useI18n();

  const [keyCardReturned, setKeyCardReturned] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'qr_promptpay' | 'transfer'>('cash');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Folio state
  const [billId, setBillId] = useState<string | null>(null);
  const [folioItems, setFolioItems] = useState<BillItem[]>([]);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [settledBill, setSettledBill] = useState<DetailedBill | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const guestDisplayName = reservation
    ? resolveGuestName(reservation) ||
      reservation.guestName ||
      reservation.guest?.fullName ||
      '—'
    : '—';

  const roomTypeName = localizeRoomType(
    roomType?.name ||
      (reservation as any)?.roomType ||
      (reservation as any)?.roomTypeName ||
      (reservation as any)?.room?.roomType?.name,
    locale
  );

  const depositAmountNum = Number(reservation?.depositAmount || 1000);
  const depositFormatted = formatCurrency(depositAmountNum);

  // Initialize folio items when modal opens
  useEffect(() => {
    if (!isOpen || !reservation) return;

    setKeyCardReturned(true);
    setNote('');
    setPaymentMethod('cash');
    setError(null);
    setIsSuccess(false);
    setSettledBill(null);

    const nights = Math.max(1, Number(reservation.totalNights) || 1);
    const nightlyRate = roomType?.basePrice
      ? Number(roomType.basePrice)
      : Math.round(Number(reservation.totalAmount || 1200) / nights);
    const roomSubtotal = nightlyRate * nights;

    const defaultRoomItem: BillItem = {
      id: `room-${reservation.id}`,
      billId: reservation.id,
      description: roomTypeName
        ? `${roomTypeName} (${nights} ${locale === 'th' ? 'คืน' : 'nights'})`
        : `Room Charge (${nights} nights)`,
      category: 'room',
      quantity: nights,
      unitPrice: String(nightlyRate),
      totalAmount: String(roomSubtotal),
      createdAt: new Date().toISOString(),
    };

    let isMounted = true;

    // Fetch existing bill from backend if exists
    apiFetch<DetailedBill>(`/api/bills/by-reservation/${reservation.id}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setBillId(res.data.id);
          if (res.data.items && res.data.items.length > 0) {
            setFolioItems(res.data.items);
          } else {
            setFolioItems([defaultRoomItem]);
          }
        } else {
          setBillId(null);
          setFolioItems([defaultRoomItem]);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setBillId(null);
        setFolioItems([defaultRoomItem]);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, reservation, roomType, roomTypeName, locale]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isAddChargeOpen && !isReceiptOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAddChargeOpen, isReceiptOpen, onClose]);

  // Calculate folio summary
  const summary = useMemo(() => {
    const fallbackSubtotal = reservation?.totalAmount || 1200;
    const effectiveDeposit = keyCardReturned ? depositAmountNum : 0;
    return calculateFolioSummary(folioItems as FolioItemLike[], effectiveDeposit, fallbackSubtotal);
  }, [folioItems, keyCardReturned, depositAmountNum, reservation]);

  if (!isOpen || !reservation) return null;

  // Add extra charge handler
  const handleAddExtraCharge = async (
    targetBillId: string,
    data: {
      description: string;
      category: 'room' | 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
      quantity: number;
      unitPrice: string;
    }
  ) => {
    const calculatedTotal = (data.quantity * parseFloat(data.unitPrice || '0')).toFixed(2);
    const newItem: BillItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      billId: targetBillId || billId || reservation.id,
      description: data.description,
      category: data.category,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalAmount: calculatedTotal,
      createdAt: new Date().toISOString(),
    };

    if (billId) {
      try {
        await apiFetch(`/api/bills/${billId}/items`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Backend add item failed, fallback to local state', e);
      }
    }

    setFolioItems((prev) => [...prev, newItem]);
    setIsAddChargeOpen(false);
    return { success: true };
  };

  // Delete extra charge handler
  const handleDeleteItem = async (itemId: string) => {
    if (billId) {
      try {
        await apiFetch(`/api/bills/${billId}/items/${itemId}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Backend delete item failed, fallback to local state', e);
      }
    }
    setFolioItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Submit checkout and cashier settlement
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const actualCheckOut = new Date().toISOString();
    const payload = {
      actualCheckOut,
      keyCardReturned,
      note: note.trim() || undefined,
    };

    try {
      let isCheckoutSuccess = false;
      let errMsg: string | undefined;

      if (onConfirm) {
        const res = await onConfirm(reservation.id, payload);
        isCheckoutSuccess = res.success;
        errMsg = res.error;
      } else {
        const res = await apiFetch(`/api/reservations/${reservation.id}/check-out`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        isCheckoutSuccess = !res.error;
        errMsg = res.error || undefined;
      }

      if (!isCheckoutSuccess) {
        setError(errMsg || t('checkout.errorGeneral'));
        setIsSubmitting(false);
        return;
      }

      let billIdToPay = billId;

      if (!billIdToPay) {
        const mappedItems = folioItems.map((item) => {
          let itemType = 'other';
          if (item.category === 'room') itemType = 'room_charge';
          else if (item.category === 'minibar') itemType = 'minibar';
          else if (item.category === 'laundry') itemType = 'laundry';
          else if (item.category === 'service') itemType = 'room_service';
          else if (item.category === 'damage') itemType = 'damage';
          return {
            itemType,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
          };
        });

        const createBillRes = await apiFetch<any>('/api/bills', {
          method: 'POST',
          body: JSON.stringify({
            reservationId: reservation.id,
            guestName: guestDisplayName,
            roomNumber: reservation.roomNumber || '—',
            depositDeducted: depositAmountNum,
            items: mappedItems,
          }),
        });
        if (createBillRes.data?.id) {
          billIdToPay = createBillRes.data.id;
        }
      }

      if (billIdToPay) {
        await apiFetch(`/api/bills/${billIdToPay}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            paymentMethod,
            amount: Math.max(0, summary.netDue).toFixed(2),
          }),
        }).catch((e) => console.warn('Payment recording error:', e));
      }

      // Create settled bill object for instant Tax Invoice ABB receipt (if referenced)
      const finalizedBill: DetailedBill = {
        id: billIdToPay || billId || reservation.id,
        reservationId: reservation.id,
        guestId: reservation.guestId,
        guestName: guestDisplayName,
        roomNumber: reservation.roomNumber || '—',
        status: 'paid',
        subtotal: summary.subtotal.toFixed(2),
        taxAmount: summary.vat.toFixed(2),
        netAmount: summary.totalWithVat.toFixed(2),
        paidAmount: summary.totalWithVat.toFixed(2),
        items: folioItems,
        payments: [
          {
            id: `pay-${Date.now()}`,
            billId: billIdToPay || billId || reservation.id,
            amount: Math.max(0, summary.netDue).toFixed(2),
            paymentMethod,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSettledBill(finalizedBill);

      // Trigger onSuccess and close modal immediately (do not remain stuck in modal)
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || t('checkout.errorGeneral'));
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleAndCheckOut = handleSubmit;

  const handleFinish = () => {
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
        />

        {/* Modal Dialog */}
        <div className="relative bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {t('checkout.title')}
                </h2>
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  {t('checkout.bookingNumber')}: {reservation.bookingNumber || reservation.id.slice(0, 8)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('common.close')}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {isSuccess ? (
              /* Success Screen with Immediate ABB Print Action */
              <div className="py-8 px-4 text-center space-y-5">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-slate-900">
                    {t('checkout.settleSuccess')}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {t('common.room')} <span className="font-mono font-bold">{reservation.roomNumber}</span> · {guestDisplayName}
                  </p>
                </div>

                {/* Hero Metric Settled */}
                <div className="max-w-md mx-auto p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    {t('checkout.paidStatus')}
                  </div>
                  <div className="text-3xl font-extrabold font-mono tabular-nums text-emerald-950">
                    {formatCurrency(summary.netDue)}
                  </div>
                  <div className="text-xs text-emerald-700 font-medium">
                    {t('checkout.paymentMethod')}: {t(`payment.${paymentMethod}`)}
                  </div>
                </div>

                {/* Actions: Print ABB & Finish */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsReceiptOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4 text-slate-700" strokeWidth={1.75} aria-hidden="true" />
                    <span>{t('checkout.printReceiptAbb')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinish}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all active:scale-[0.98]"
                  >
                    <span>{t('checkout.closeSettled')}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Check-out & Folio Settlement Flow */
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Stay Info Card */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">{t('checkout.guestName')}</span>
                    <span className="font-semibold text-slate-900 truncate block">{guestDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('checkout.roomNumber')}</span>
                    <span className="font-bold font-mono tabular-nums text-slate-900 text-base">
                      {reservation.roomNumber || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('common.roomType')}</span>
                    <span className="font-medium text-slate-800 text-xs sm:text-sm block">
                      {roomTypeName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('checkout.stayPeriod')}</span>
                    <span className="font-mono tabular-nums text-slate-700 text-xs block">
                      {formatDateRange(reservation.checkInDate, reservation.checkOutDate, reservation.totalNights)}
                    </span>
                  </div>
                </div>

                {/* Itemized Folio Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-slate-600" aria-hidden="true" />
                      <h4 className="text-sm font-bold text-slate-900">
                        {t('checkout.folioSettlement')}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddChargeOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-2xs min-h-[32px]"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      <span>{t('checkout.addCharge')}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-2.5 px-3">{t('checkout.roomCharges')}</th>
                          <th className="py-2.5 px-2 text-center w-16">{t('folio.qty')}</th>
                          <th className="py-2.5 px-3 text-right font-mono tabular-nums w-24">{t('folio.unitPrice')}</th>
                          <th className="py-2.5 px-3 text-right font-mono tabular-nums w-28">{t('folio.amount')}</th>
                          <th className="py-2.5 px-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {folioItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400 text-xs italic">
                              {t('checkout.noExtraCharges')}
                            </td>
                          </tr>
                        ) : (
                          folioItems.map((item) => {
                            const isRoom = item.category === 'room' || item.id?.startsWith('room-');
                            const itemPrice = parseFloat(item.unitPrice || '0') || 0;
                            const itemTotal = parseFloat(item.totalAmount || '0') || itemPrice * (item.quantity || 1);

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3 text-slate-800 font-medium">
                                  <div className="flex items-center gap-2">
                                    <FolioCategoryBadge item={item} />
                                    <span className="truncate max-w-[220px] sm:max-w-xs">
                                      {localizeFolioDescription(item.description, locale)}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700">
                                  {item.quantity}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                                  {formatCurrency(itemPrice)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums text-slate-900">
                                  {formatCurrency(itemTotal)}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  {!isRoom && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                                      title={t('common.delete')}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Breakdown & Deductions */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-200 space-y-2 text-xs sm:text-sm font-mono tabular-nums">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-sans">{t('checkout.subtotal')}</span>
                      <span>{formatCurrency(summary.subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span className="font-sans">{t('checkout.vat')}</span>
                      <span>{formatCurrency(summary.vat)}</span>
                    </div>

                    <div className="flex justify-between text-slate-800 font-semibold pt-1 border-t border-slate-200">
                      <span className="font-sans">{t('checkout.totalWithVat')}</span>
                      <span>{formatCurrency(summary.totalWithVat)}</span>
                    </div>

                    {keyCardReturned && summary.depositDeduction > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span className="font-sans flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          {t('checkout.depositDeduction')}
                        </span>
                        <span>- {formatCurrency(summary.depositDeduction)}</span>
                      </div>
                    )}
                  </div>

                  {/* Net Due Hero Metric */}
                  <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-400 font-sans font-semibold">
                        {t('checkout.netDue')} (ยอดชำระสุทธิ)
                      </div>
                      <div className="text-xs text-slate-400 font-sans mt-0.5">
                        {keyCardReturned
                          ? t('checkout.keyDepositRefundTitle') + ` (-${depositFormatted})`
                          : t('checkout.keyCardMissingWarning')}
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
                      {formatCurrency(summary.netDue)}
                    </div>
                  </div>
                </div>

                {/* Key Card Return Checkbox */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2 shadow-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={keyCardReturned}
                      onChange={(e) => setKeyCardReturned(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-slate-600" aria-hidden="true" />
                        {t('checkout.keyCardReturned')}
                      </span>
                    </div>
                  </label>

                  {/* Key Deposit Refund / Warning Notice */}
                  {keyCardReturned ? (
                    <div className="mt-1.5 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs sm:text-sm text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                        <span>{t('checkout.keyDepositRefundTitle')}</span>
                      </div>
                      <p className="text-xs text-emerald-700 font-mono tabular-nums">
                        {t('checkout.keyDepositRefundNotice', { amount: depositFormatted })}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1.5 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs sm:text-sm text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-xs leading-relaxed font-sans">
                        {t('checkout.keyCardMissingWarning')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Method Selector (When Net Due > 0) */}
                {summary.netDue > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {t('checkout.paymentMethod')}
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'cash', label: t('payment.cash'), icon: Banknote },
                        { id: 'transfer', label: t('payment.transfer'), icon: Building2 },
                        { id: 'credit_card', label: t('payment.creditCard'), icon: CreditCard },
                        { id: 'qr_promptpay', label: t('payment.qrPromptpay'), icon: QrCode },
                      ].map((pm) => {
                        const Icon = pm.icon;
                        const isSelected = paymentMethod === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id as any)}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs sm:text-sm font-semibold transition-colors min-h-[44px] ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} aria-hidden="true" />
                            <span>{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>{t('checkout.notes')}</span>
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('checkout.notesPlaceholder')}
                    className="w-full text-xs sm:text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none font-sans"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] active:scale-[0.98]"
                  >
                    {t('common.cancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="text-sm font-semibold py-2.5 px-6 text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>
                      {isSubmitting
                        ? t('checkout.submitting')
                        : summary.netDue > 0
                          ? `${t('checkout.settleAndCheckOut')} (${formatCurrency(summary.netDue)})`
                          : t('checkout.confirmButton')}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Add Extra Charge Modal */}
      <AddExtraChargeModal
        billId={billId || reservation.id}
        isOpen={isAddChargeOpen}
        onClose={() => setIsAddChargeOpen(false)}
        onSubmit={handleAddExtraCharge}
      />

      {/* Instant Printable Receipt & Thai Tax Invoice ABB */}
      <ReceiptTaxInvoiceModal
        bill={settledBill}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </>
  );
};

export default CheckOutModal;

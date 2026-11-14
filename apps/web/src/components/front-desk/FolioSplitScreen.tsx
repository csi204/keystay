import React, { useState } from 'react';
import { DetailedBill, BillItem } from '../../hooks/useBilling';
import { useI18n } from '../../lib/i18n';
import { localizeFolioDescription } from '../../lib/localizeMetadata';
import { FolioCategoryBadge } from '../../lib/folioCategory';
import { ActionConfirmModal } from '../common/ActionConfirmModal';

export { localizeFolioDescription };
import {
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  Trash2,
  Lock,
  Printer,
  CheckCircle,
  AlertCircle,
  Receipt,
  Sparkles,
} from 'lucide-react';

export interface FolioItemLike {
  id?: string;
  billId?: string;
  description?: string;
  category?: string;
  itemType?: string;
  quantity?: number;
  unitPrice?: string | number;
  totalAmount?: string | number;
  totalPrice?: string | number;
  isPaid?: boolean;
  createdAt?: string;
  [key: string]: any;
}

export interface FolioSummary {
  subtotal: number;
  vat: number;
  totalWithVat: number;
  depositDeduction: number;
  netDue: number;
  paidTotalWithVat: number;
  unpaidSubtotal: number;
  unpaidVat: number;
  unpaidTotalWithVat: number;
  refundAmount: number;
  hasUnpaidCharges: boolean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isExtensionChargeDescription(description?: string): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  return (
    description.includes('ขยายเวลา') ||
    lower.includes('extended stay') ||
    lower.includes('extend stay') ||
    lower.includes('extension')
  );
}

export function isFolioItemPaid(
  item: FolioItemLike,
  options?: { reservationPaymentStatus?: string }
): boolean {
  if (item.isPaid === true || item.is_paid === 1 || item.is_paid === true) return true;
  const isRoomCategory =
    item.category === 'room' ||
    item.itemType === 'room_charge' ||
    item.item_type === 'room_charge';
  if (
    options?.reservationPaymentStatus === 'paid' &&
    isRoomCategory &&
    !isExtensionChargeDescription(item.description)
  ) {
    return true;
  }
  if (item.isPaid === false) return false;
  if (item.is_paid !== undefined && item.is_paid !== null) {
    return Boolean(item.is_paid);
  }
  return false;
}

/**
 * Calculates total for a folio item safely.
 * Handles both `totalAmount` and `totalPrice`, and falls back to `unitPrice * quantity`.
 * Guaranteed to never return NaN.
 */
export function calculateItemTotal(item?: FolioItemLike | null): number {
  if (!item) return 0;

  // 1. Check totalAmount
  if (item.totalAmount !== undefined && item.totalAmount !== null && item.totalAmount !== '') {
    const parsed = typeof item.totalAmount === 'number' ? item.totalAmount : parseFloat(String(item.totalAmount));
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return parsed;
    }
  }

  // 2. Check totalPrice
  if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
    const parsed = typeof item.totalPrice === 'number' ? item.totalPrice : parseFloat(String(item.totalPrice));
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return parsed;
    }
  }

  // 3. Fallback: quantity * unitPrice
  const rawQty = item.quantity;
  const parsedQty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty ?? 1));
  const validQty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0;

  const rawPrice = item.unitPrice;
  const parsedPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice ?? 0));
  const validPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;

  const calculated = validQty * validPrice;
  return Number.isFinite(calculated) && !Number.isNaN(calculated) ? calculated : 0;
}

/**
 * Calculates folio subtotal, VAT 7%, total with VAT, paid vs unpaid splits,
 * deposit refund, and net due after deposit deduction.
 * Guaranteed to never return NaN.
 */
export function calculateFolioSummary(
  items?: FolioItemLike[] | null,
  deposit: number | string = 0,
  fallbackSubtotal: number | string = 0,
  options?: { reservationPaymentStatus?: string }
): FolioSummary {
  let subtotal = 0;
  let paidSubtotal = 0;
  let unpaidSubtotal = 0;
  let hasUnpaidCharges = false;

  if (items && items.length > 0) {
    for (const it of items) {
      const itemTotal = calculateItemTotal(it);
      if (isFolioItemPaid(it, options)) {
        paidSubtotal += itemTotal;
      } else {
        unpaidSubtotal += itemTotal;
        hasUnpaidCharges = true;
      }
    }
    paidSubtotal = round2(paidSubtotal);
    unpaidSubtotal = round2(unpaidSubtotal);
    subtotal = round2(paidSubtotal + unpaidSubtotal);
  } else {
    const parsedFallback = typeof fallbackSubtotal === 'number'
      ? fallbackSubtotal
      : parseFloat(String(fallbackSubtotal));
    const safeFallback = Number.isFinite(parsedFallback) && parsedFallback > 0 ? parsedFallback : 0;
    subtotal = safeFallback;
    if (options?.reservationPaymentStatus === 'paid') {
      paidSubtotal = safeFallback;
      unpaidSubtotal = 0;
      hasUnpaidCharges = false;
    } else {
      paidSubtotal = 0;
      unpaidSubtotal = safeFallback;
      hasUnpaidCharges = safeFallback > 0;
    }
  }

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    subtotal = 0;
  }
  if (!Number.isFinite(paidSubtotal) || paidSubtotal < 0) {
    paidSubtotal = 0;
  }
  if (!Number.isFinite(unpaidSubtotal) || unpaidSubtotal < 0) {
    unpaidSubtotal = 0;
  }

  const vat = round2(subtotal * 0.07);
  const totalWithVat = round2(subtotal + vat);

  const paidVat = round2(paidSubtotal * 0.07);
  const paidTotalWithVat = round2(paidSubtotal + paidVat);

  const unpaidVat = round2(unpaidSubtotal * 0.07);
  const unpaidTotalWithVat = round2(unpaidSubtotal + unpaidVat);

  const parsedDeposit = typeof deposit === 'number'
    ? deposit
    : parseFloat(String(deposit));
  const depositDeduction = Number.isFinite(parsedDeposit) && parsedDeposit > 0 ? parsedDeposit : 0;

  const netDue = Math.max(0, round2(unpaidTotalWithVat - depositDeduction));
  const refundAmount = Math.max(0, round2(depositDeduction - unpaidTotalWithVat));

  return {
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    vat: Number.isFinite(vat) ? vat : 0,
    totalWithVat: Number.isFinite(totalWithVat) ? totalWithVat : 0,
    depositDeduction: Number.isFinite(depositDeduction) ? depositDeduction : 0,
    netDue: Number.isFinite(netDue) ? netDue : 0,
    paidTotalWithVat: Number.isFinite(paidTotalWithVat) ? paidTotalWithVat : 0,
    unpaidSubtotal: Number.isFinite(unpaidSubtotal) ? unpaidSubtotal : 0,
    unpaidVat: Number.isFinite(unpaidVat) ? unpaidVat : 0,
    unpaidTotalWithVat: Number.isFinite(unpaidTotalWithVat) ? unpaidTotalWithVat : 0,
    refundAmount: Number.isFinite(refundAmount) ? refundAmount : 0,
    hasUnpaidCharges,
  };
}

export interface FolioSplitScreenProps {
  bill: DetailedBill | null;
  depositAmount?: string;
  reservationPaymentStatus?: string;
  isCheckedOut?: boolean;
  isInHouse?: boolean;
  onAddCharge: () => void;
  onRequestAmenities?: () => void;
  onDeleteItem: (itemId: string) => void;
  onPay?: (method: 'cash' | 'credit_card' | 'qr_promptpay' | 'transfer', amount: string) => Promise<boolean>;
  onViewInvoice: () => void;
  showSettlement?: boolean;
}

export const FolioSplitScreen: React.FC<FolioSplitScreenProps> = ({
  bill,
  depositAmount = '500',
  reservationPaymentStatus,
  isCheckedOut = false,
  isInHouse = false,
  onAddCharge,
  onRequestAmenities,
  onDeleteItem,
  onPay,
  onViewInvoice,
  showSettlement = false,
}) => {
  const { t, locale, formatCurrency } = useI18n();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'qr_promptpay' | 'transfer'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FolioItemLike | null>(null);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);

  if (!bill) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-dashed border-slate-300">
        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">{t('folio.selectBill')}</p>
        <p className="text-xs text-slate-400 mt-1">{t('folio.selectBillHint')}</p>
      </div>
    );
  }

  const items = bill.items || [];
  const isPaid = bill.status === 'paid' || paymentSuccess || Boolean(isCheckedOut);
  const canAddCharges = !isCheckedOut && (!isPaid || Boolean(isInHouse));
  const effectivePaymentStatus = isPaid
    ? 'paid'
    : reservationPaymentStatus || (bill.status === 'paid' ? 'paid' : undefined);
  const summary = calculateFolioSummary(
    isPaid ? items.map((it) => ({ ...it, isPaid: true })) : items,
    depositAmount,
    bill.subtotal,
    {
      reservationPaymentStatus: effectivePaymentStatus,
    }
  );
  const depositAmountNum = Number(depositAmount || 0);

  const handleSettlePayment = async () => {
    if (!onPay) return;
    setPayError(null);
    setIsProcessing(true);
    const success = await onPay(paymentMethod, summary.netDue.toFixed(2));
    setIsProcessing(false);
    if (success) {
      setPaymentSuccess(true);
      setIsConfirmPaymentOpen(false);
    } else {
      setPayError(t('payment.error'));
      setIsConfirmPaymentOpen(false);
    }
  };

  const handleSettle = handleSettlePayment;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${showSettlement ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : 'flex flex-col'}`}>
      {/* Folio Items Container (Full Width when pure manager, 7 cols when split) */}
      <div className={`${showSettlement ? 'lg:col-span-7 border-b lg:border-b-0 lg:border-r border-slate-200' : 'w-full'} flex flex-col justify-between`}>
        {/* Top Header: Room/Guest Info & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 font-sans">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                <span>{t('folio.itemizedTitle')}</span>
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium tabular-nums border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isPaid ? (locale === 'th' ? 'ชำระแล้ว' : 'Paid') : (locale === 'th' ? 'รอชำระ' : 'Pending')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              {t('common.room')} <span className="font-mono font-medium tracking-tight tabular-nums text-slate-800">{bill.roomNumber || '—'}</span> · {t('common.guest')}: <span className="font-medium text-slate-800">{bill.guestName || t('common.guest')}</span>
            </p>
          </div>

          {canAddCharges && (
            <div className="flex items-center gap-2">
              {onRequestAmenities && (
                <button
                  type="button"
                  onClick={onRequestAmenities}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{locale === 'th' ? 'ขอของใช้เสริม' : 'Amenities'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onAddCharge}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === 'th' ? 'เพิ่มค่าใช้จ่าย / มินิบาร์' : t('folio.addCharge')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Line Items Table: Bounded Internal Vertical Scroll with Sticky Header */}
        <div className="overflow-x-auto overflow-y-auto max-h-[340px] w-full flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider py-3">
                <th className="py-3 px-4">{t('folio.category')}</th>
                <th className="py-3 px-4">{t('folio.item')}</th>
                <th className="py-3 px-4 text-center font-mono tracking-tight tabular-nums">{t('folio.qty')}</th>
                <th className="py-3 px-4 text-right font-mono tracking-tight tabular-nums">{t('folio.unitPrice')}</th>
                <th className="py-3 px-4 text-right font-mono tracking-tight tabular-nums">{t('folio.amount')}</th>
                {!isPaid && <th className="py-3 px-4 text-center">{t('common.delete')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isPaid ? 5 : 6} className="py-12 text-center text-sm text-slate-400 font-sans">
                    {t('folio.empty')}
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const itemPaid = isPaid || isFolioItemPaid(it, { reservationPaymentStatus: effectivePaymentStatus });
                  const isRoomCharge = it.category === 'room' || (it as any).itemType === 'room_charge' || (it as any).item_type === 'room_charge';
                  const isLocked = itemPaid || (isRoomCharge && !isExtensionChargeDescription(it.description));

                  return (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="text-sm py-3.5 px-4 text-slate-800">
                      <FolioCategoryBadge item={it} />
                    </td>
                    <td className="text-sm py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{localizeFolioDescription(it.description, locale)}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            itemPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {itemPaid ? (locale === 'th' ? 'ชำระแล้ว' : 'Paid') : (locale === 'th' ? 'ค้างชำระ' : 'Unpaid')}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm py-3.5 px-4 text-center font-mono tracking-tight tabular-nums text-slate-800">
                      {it.quantity}
                    </td>
                    <td className="text-sm py-3.5 px-4 text-right font-semibold font-mono tracking-tight tabular-nums text-slate-900">
                      {formatCurrency(it.unitPrice || 0)}
                    </td>
                    <td className="text-sm py-3.5 px-4 text-right font-semibold font-mono tracking-tight tabular-nums text-slate-900">
                      {formatCurrency(calculateItemTotal(it))}
                    </td>
                    {!isPaid && (
                      <td className="text-sm py-3.5 px-4 text-center">
                        {isLocked ? (
                          <div
                            className="inline-flex items-center justify-center p-2 rounded text-slate-400 bg-slate-100/80 cursor-not-allowed"
                            title={
                              locale === 'th'
                                ? 'รายการค่าห้องพักหลัก (ล็อค)'
                                : 'Core stay fee (locked)'
                            }
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setItemToDelete(it)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pure Manager Bottom Bar (When settlement form is hidden) */}
        {!showSettlement && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Money Breakdown Row */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-xs text-slate-600">
              {summary.paidTotalWithVat > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-700 font-medium">
                    {locale === 'th' ? 'ชำระแล้ว (ห้องพัก+VAT):' : 'Paid Initial Stay:'}
                  </span>
                  <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                    {formatCurrency(summary.paidTotalWithVat)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">
                  {locale === 'th' ? 'ยอดรายการค้างชำระ (ก่อน VAT):' : `${t('folio.subtotal')}:`}
                </span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {formatCurrency(summary.unpaidSubtotal)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">{t('folio.vat')}:</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {formatCurrency(summary.unpaidVat)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">
                  {locale === 'th' ? 'รวมค่าใช้จ่ายใหม่สุทธิ:' : `${t('folio.totalAmount')}:`}
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(summary.unpaidTotalWithVat)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">{t('folio.depositDeducted')}:</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  -{formatCurrency(summary.depositDeduction)}
                </span>
              </div>
            </div>

            {/* Net Total Due / Deposit Refund & Print Invoice Button */}
            <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
              <div className="text-left md:text-right">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  {summary.netDue > 0
                    ? (locale === 'th' ? 'ยอดค้างชำระสุทธิ' : t('folio.netDue'))
                    : summary.refundAmount > 0
                      ? summary.refundAmount === depositAmountNum && depositAmountNum > 0
                        ? (locale === 'th' ? 'คืนเงินมัดจำเต็มจำนวน' : 'Full Deposit Refund')
                        : (locale === 'th' ? 'คืนเงินมัดจำคงเหลือ' : 'Remaining Deposit Refund')
                      : (locale === 'th' ? 'ยอดสุทธิ' : t('folio.netDue'))}
                </div>
                <div
                  className={
                    summary.netDue === 0 && summary.refundAmount > 0
                      ? 'text-2xl sm:text-3xl font-mono font-bold text-emerald-700 tracking-tight tabular-nums'
                      : 'text-2xl sm:text-3xl font-mono font-bold text-slate-950 tracking-tight tabular-nums'
                  }
                >
                  {formatCurrency(summary.netDue > 0 ? summary.netDue : summary.refundAmount)}
                </div>
              </div>

              <button
                type="button"
                onClick={onViewInvoice}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>{locale === 'th' ? 'พิมพ์ใบเสร็จ/ใบกำกับภาษี' : t('folio.printInvoice')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Pane: Settlement & Payment Cashier (5 Cols) - Hidden on Cashier Page */}
      {showSettlement && (
        <div className="lg:col-span-5 p-6 bg-slate-50/50 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">{t('folio.settlementTitle')}</h3>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isPaid ? t('folio.paid') : t('folio.pending')}
              </span>
            </div>

            {payError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            {/* Money Breakdown */}
            <div className="space-y-2.5 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              {summary.paidTotalWithVat > 0 && (
                <div className="flex justify-between items-center text-sm font-medium text-emerald-700 font-mono tracking-tight tabular-nums pb-2 border-b border-slate-100">
                  <span className="font-sans flex items-center gap-1.5">
                    <span>{locale === 'th' ? 'ค่าห้องพักเบื้องต้น (รวม VAT 7%)' : 'Initial Stay (incl. VAT)'}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {locale === 'th' ? 'ชำระแล้ว' : 'Paid'}
                    </span>
                  </span>
                  <span>{formatCurrency(summary.paidTotalWithVat)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums">
                <span className="font-sans">{locale === 'th' ? 'ยอดรายการค้างชำระ (ก่อน VAT):' : `${t('folio.subtotal')}:`}</span>
                <span>{formatCurrency(summary.unpaidSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums">
                <span className="font-sans">{t('folio.vat')}:</span>
                <span>{formatCurrency(summary.unpaidVat)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums">
                <span className="font-sans">{locale === 'th' ? 'รวมค่าใช้จ่ายใหม่สุทธิ:' : `${t('folio.totalAmount')}:`}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(summary.unpaidTotalWithVat)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums pt-1.5 border-t border-slate-100">
                <span className="font-sans">{t('folio.depositDeducted')}:</span>
                <span className="text-emerald-700">-{formatCurrency(summary.depositDeduction)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                <span className="text-base font-bold text-slate-900">
                  {summary.netDue > 0
                    ? (locale === 'th' ? 'ยอดค้างชำระสุทธิ:' : `${t('folio.netDue')}:`)
                    : summary.refundAmount > 0
                      ? summary.refundAmount === depositAmountNum && depositAmountNum > 0
                        ? (locale === 'th' ? 'คืนเงินมัดจำเต็มจำนวน:' : 'Full Deposit Refund:')
                        : (locale === 'th' ? 'คืนเงินมัดจำคงเหลือ:' : 'Remaining Deposit Refund:')
                      : (locale === 'th' ? 'ยอดค้างชำระสุทธิ:' : `${t('folio.netDue')}:`)}
                </span>
                <span
                  className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight tabular-nums ${
                    summary.netDue === 0 && summary.refundAmount > 0 ? 'text-emerald-700' : 'text-slate-950'
                  }`}
                >
                  {formatCurrency(summary.netDue > 0 ? summary.netDue : summary.refundAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector (Only when Net Due > 0) */}
            {!isPaid && summary.netDue > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t('payment.method')}:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'cash', label: t('payment.cash'), icon: Banknote },
                    { key: 'credit_card', label: t('payment.creditCard'), icon: CreditCard },
                    { key: 'qr_promptpay', label: t('payment.qrPromptpay'), icon: QrCode },
                    { key: 'transfer', label: t('payment.transfer'), icon: Receipt },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMethod(m.key as any)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            {!isPaid ? (
              <button
                type="button"
                onClick={() => setIsConfirmPaymentOpen(true)}
                disabled={isProcessing}
                className="w-full py-3 px-4 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? t('payment.processing')
                    : `${t('payment.settle')} ${formatCurrency(summary.netDue)} ${t('folio.closeBill')}`.trim()}
                </span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center text-sm text-emerald-800 font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{t('payment.success')}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onViewInvoice}
              className="w-full py-3 px-4 min-h-[44px] bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('folio.printInvoice')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <ActionConfirmModal
          isOpen={!!itemToDelete}
          variant="danger"
          title={locale === 'th' ? 'ยืนยันการลบรายการ' : 'Confirm Delete Item'}
          description={
            locale === 'th'
              ? `ยืนยันการลบรายการ ${localizeFolioDescription(itemToDelete.description, locale)} (${formatCurrency(calculateItemTotal(itemToDelete))}) ใช่หรือไม่?`
              : `Are you sure you want to delete ${localizeFolioDescription(itemToDelete.description, locale)} (${formatCurrency(calculateItemTotal(itemToDelete))})?`
          }
          confirmText={locale === 'th' ? 'ลบรายการ' : 'Delete Item'}
          cancelText={locale === 'th' ? 'ยกเลิก' : 'Cancel'}
          onConfirm={() => {
            if (itemToDelete?.id) {
              onDeleteItem(itemToDelete.id);
            }
            setItemToDelete(null);
          }}
          onClose={() => setItemToDelete(null)}
        />
      )}

      {/* Settle Payment Confirmation Modal */}
      {showSettlement && (
        <ActionConfirmModal
          isOpen={isConfirmPaymentOpen}
          variant="primary"
          title={locale === 'th' ? 'ยืนยันการรับชำระเงิน' : 'Confirm Payment Settlement'}
          description={
            locale === 'th'
              ? `ยืนยันการบันทึกรับเงินจำนวน ${formatCurrency(summary.netDue)} และปิดยอดโฟลิโอห้อง ${bill.roomNumber || '—'} ใช่หรือไม่?`
              : `Confirm recording payment of ${formatCurrency(summary.netDue)} and settling folio for Room ${bill.roomNumber || '—'}?`
          }
          confirmText={
            locale === 'th'
              ? `บันทึกรับเงิน ${formatCurrency(summary.netDue)} และปิดยอด`
              : `Confirm ${formatCurrency(summary.netDue)} & Settle`
          }
          cancelText={locale === 'th' ? 'ยกเลิก' : 'Cancel'}
          isSubmitting={isProcessing}
          onConfirm={handleSettlePayment}
          onClose={() => setIsConfirmPaymentOpen(false)}
          summaryDetails={[
            {
              label: locale === 'th' ? 'ห้อง' : 'Room',
              value: bill.roomNumber || '—',
            },
            {
              label: locale === 'th' ? 'ชื่อผู้เข้าพัก' : 'Guest',
              value: bill.guestName || t('common.guest'),
            },
            ...(summary.netDue > 0
              ? [
                  {
                    label: locale === 'th' ? 'วิธีชำระเงิน' : 'Payment Method',
                    value:
                      paymentMethod === 'cash'
                        ? locale === 'th'
                          ? 'เงินสด'
                          : 'Cash'
                        : paymentMethod === 'credit_card'
                        ? locale === 'th'
                          ? 'บัตรเครดิต'
                          : 'Credit Card'
                        : paymentMethod === 'qr_promptpay'
                        ? locale === 'th'
                          ? 'QR พร้อมเพย์'
                          : 'QR PromptPay'
                        : locale === 'th'
                        ? 'โอนเงินธนาคาร'
                        : 'Bank Transfer',
                  },
                  {
                    label: locale === 'th' ? 'ยอดรับชำระสุทธิ' : 'Net Amount Due',
                    value: formatCurrency(summary.netDue),
                  },
                ]
              : [
                  {
                    label:
                      summary.refundAmount === depositAmountNum && depositAmountNum > 0
                        ? locale === 'th'
                          ? 'คืนเงินมัดจำเต็มจำนวน'
                          : 'Full Deposit Refund'
                        : locale === 'th'
                        ? 'คืนเงินมัดจำคงเหลือ'
                        : 'Remaining Deposit Refund',
                    value: formatCurrency(summary.refundAmount),
                  },
                ]),
          ]}
        />
      )}
    </div>
  );
};

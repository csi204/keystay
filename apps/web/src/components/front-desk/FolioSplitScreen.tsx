import React, { useState } from 'react';
import { DetailedBill, BillItem } from '../../hooks/useBilling';
import { useI18n } from '../../lib/i18n';
import { localizeFolioDescription } from '../../lib/localizeMetadata';

export { localizeFolioDescription };
import {
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  AlertCircle,
  Receipt,
} from 'lucide-react';

export interface FolioItemLike {
  id?: string;
  billId?: string;
  description?: string;
  category?: string;
  quantity?: number;
  unitPrice?: string | number;
  totalAmount?: string | number;
  totalPrice?: string | number;
  createdAt?: string;
  [key: string]: any;
}

export interface FolioSummary {
  subtotal: number;
  vat: number;
  totalWithVat: number;
  depositDeduction: number;
  netDue: number;
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
 * Calculates folio subtotal, VAT 7%, total with VAT, and net due after deposit deduction.
 * Guaranteed to never return NaN.
 */
export function calculateFolioSummary(
  items?: FolioItemLike[] | null,
  deposit: number | string = 0,
  fallbackSubtotal: number | string = 0
): FolioSummary {
  let subtotal = 0;

  if (items && items.length > 0) {
    subtotal = items.reduce((acc, it) => acc + calculateItemTotal(it), 0);
  } else {
    const parsedFallback = typeof fallbackSubtotal === 'number'
      ? fallbackSubtotal
      : parseFloat(String(fallbackSubtotal));
    subtotal = Number.isFinite(parsedFallback) && parsedFallback > 0 ? parsedFallback : 0;
  }

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    subtotal = 0;
  }

  const vat = Math.round(subtotal * 0.07 * 100) / 100;
  const totalWithVat = Math.round((subtotal + vat) * 100) / 100;

  const parsedDeposit = typeof deposit === 'number'
    ? deposit
    : parseFloat(String(deposit));
  const depositDeduction = Number.isFinite(parsedDeposit) && parsedDeposit > 0 ? parsedDeposit : 0;

  const netDue = Math.max(0, Math.round((totalWithVat - depositDeduction) * 100) / 100);

  return {
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    vat: Number.isFinite(vat) ? vat : 0,
    totalWithVat: Number.isFinite(totalWithVat) ? totalWithVat : 0,
    depositDeduction: Number.isFinite(depositDeduction) ? depositDeduction : 0,
    netDue: Number.isFinite(netDue) ? netDue : 0,
  };
}

export interface FolioSplitScreenProps {
  bill: DetailedBill | null;
  depositAmount?: string;
  onAddCharge: () => void;
  onDeleteItem: (itemId: string) => void;
  onPay: (method: 'cash' | 'credit_card' | 'qr_promptpay' | 'transfer', amount: string) => Promise<boolean>;
  onViewInvoice: () => void;
}

export const FolioSplitScreen: React.FC<FolioSplitScreenProps> = ({
  bill,
  depositAmount = '500',
  onAddCharge,
  onDeleteItem,
  onPay,
  onViewInvoice,
}) => {
  const { t, locale, formatCurrency } = useI18n();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'qr_promptpay' | 'transfer'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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
  const summary = calculateFolioSummary(items, depositAmount, bill.subtotal);
  const isPaid = bill.status === 'paid' || paymentSuccess;

  const handleSettle = async () => {
    setPayError(null);
    setIsProcessing(true);
    const success = await onPay(paymentMethod, summary.netDue.toFixed(2));
    setIsProcessing(false);
    if (success) {
      setPaymentSuccess(true);
    } else {
      setPayError(t('payment.error'));
    }
  };

  const categoryLabels: Record<string, string> = {
    room: t('category.room'),
    minibar: t('category.minibar'),
    laundry: t('category.laundry'),
    damage: t('category.damage'),
    service: t('category.service'),
    other: t('category.other'),
  };

  const categoryBadgeStyles: Record<string, string> = {
    room: 'bg-blue-50 text-blue-700 border-blue-200',
    minibar: 'bg-amber-50 text-amber-700 border-amber-200',
    laundry: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    damage: 'bg-rose-50 text-rose-700 border-rose-200',
    service: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Left Pane: Itemized Folio Items (7 Cols) */}
      <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-700" />
              <span>{t('folio.itemizedTitle')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('common.room')} <span className="font-mono font-medium tracking-tight tabular-nums">{bill.roomNumber || '—'}</span> · {t('common.guest')}: {bill.guestName || t('common.guest')}
            </p>
          </div>

          {!isPaid && (
            <button
              onClick={onAddCharge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('folio.addCharge')}</span>
            </button>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider py-3">
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
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                    {t('folio.empty')}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="text-sm py-3.5 px-4 text-slate-800">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${categoryBadgeStyles[it.category] || categoryBadgeStyles.other}`}>
                        {categoryLabels[it.category] || it.category}
                      </span>
                    </td>
                    <td className="text-sm py-3.5 px-4 font-medium text-slate-900">
                      {localizeFolioDescription(it.description, locale)}
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
                        <button
                          onClick={() => onDeleteItem(it.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Pane: Settlement & Payment Cashier (5 Cols) */}
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
            <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums">
              <span>{t('folio.subtotal')}:</span>
              <span>{formatCurrency(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums">
              <span>{t('folio.vat')}:</span>
              <span>{formatCurrency(summary.vat)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums">
              <span>{t('folio.totalAmount')}:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(summary.totalWithVat)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-slate-700 font-mono tracking-tight tabular-nums pt-1.5 border-t border-slate-100">
              <span>{t('folio.depositDeducted')}:</span>
              <span className="text-emerald-700">-{formatCurrency(summary.depositDeduction)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
              <span className="text-base font-bold text-slate-900">{t('folio.netDue')}:</span>
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-950 tracking-tight tabular-nums">{formatCurrency(summary.netDue)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          {!isPaid && (
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
              onClick={handleSettle}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
            onClick={onViewInvoice}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>{t('folio.printInvoice')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { DetailedBill } from '../../hooks/useBilling';
import { useI18n } from '../../lib/i18n';
import { th } from '../../locales/th';
import { en } from '../../locales/en';
import { calculateItemTotal, calculateFolioSummary, localizeFolioDescription } from './FolioSplitScreen';
import { X, Printer } from 'lucide-react';

export interface ReceiptTaxInvoiceModalProps {
  bill: DetailedBill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptTaxInvoiceModal: React.FC<ReceiptTaxInvoiceModalProps> = ({
  bill,
  isOpen,
  onClose,
}) => {
  const { locale, formatCurrency, formatDate } = useI18n();
  const [invoiceLocale, setInvoiceLocale] = useState<'th' | 'en'>(locale);

  useEffect(() => {
    if (isOpen) {
      setInvoiceLocale(locale);
    }
  }, [isOpen, locale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !bill) return null;

  const invT = (key: string): string => {
    if (invoiceLocale === 'th') return th[key] || en[key] || key;
    return en[key] || th[key] || key;
  };

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${bill.id.slice(0, 8).toUpperCase()}`;
  const currentDate = formatDate(new Date().toISOString(), 'medium');

  const summary = calculateFolioSummary(bill.items, 0, bill.subtotal);
  const paidAmount = parseFloat(bill.paidAmount || '0') || (bill.status === 'paid' ? summary.totalWithVat : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 p-8 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {invT('invoice.preview')}
            </span>

            {/* Bilingual preview/print toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setInvoiceLocale('th')}
                className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
                  invoiceLocale === 'th'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setInvoiceLocale('en')}
                className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
                  invoiceLocale === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{invT('invoice.print')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="space-y-6 text-slate-900 font-sans print:text-black">
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{invT('invoice.hotelName')}</h1>
              <p className="text-xs text-slate-500 print:text-slate-700 mt-0.5">
                {invT('invoice.hotelAddress')}
              </p>
              <p className="text-xs text-slate-500 print:text-slate-700 font-mono tabular-nums tracking-tight mt-0.5">
                {invT('invoice.taxId')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-bold tracking-tight block text-slate-900">
                {invoiceLocale === 'th' ? 'ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ' : invT('invoice.title')}
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-tight block uppercase">
                {invoiceLocale === 'th' ? 'TAX INVOICE (ABB)' : 'ORIGINAL'}
              </span>
              <span className="text-xs text-slate-600 font-mono tabular-nums tracking-tight block mt-1">
                {invT('invoice.number')} {invoiceNumber}
              </span>
              <span className="text-xs text-slate-600 font-mono tabular-nums tracking-tight block">
                {invT('invoice.date')} {currentDate}
              </span>
            </div>
          </div>

          {/* Guest / Bill Details */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 print:bg-transparent print:p-0 print:border-none">
            <div>
              <span className="text-slate-500 print:text-slate-700 block mb-0.5">{invT('invoice.guestName')}</span>
              <span className="font-semibold text-slate-900 print:text-black text-sm">
                {bill.guestName || invT('invoice.walkInGuest')}
              </span>
              <span className="text-slate-600 print:text-slate-800 block text-[11px] mt-0.5">
                {invT('invoice.room')} {invT('common.room')} <span className="font-mono font-medium tabular-nums tracking-tight">{bill.roomNumber || '—'}</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 print:text-slate-700 block mb-0.5">{invT('invoice.cashier')}</span>
              <span className="font-semibold text-slate-900 print:text-black">{invT('invoice.cashierName')}</span>
              <span className="text-slate-600 print:text-slate-800 font-mono tabular-nums tracking-tight block text-[11px] mt-0.5">
                {invT('common.status')}: {bill.status === 'paid' ? invT('payment.success') : invT('folio.pending')}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 print:border-slate-900 font-semibold text-xs text-slate-700 print:text-black">
                <th className="py-2.5 px-3 font-mono tabular-nums tracking-tight">{invT('invoice.seq')}</th>
                <th className="py-2.5 px-3">{invT('folio.item')}</th>
                <th className="py-2.5 px-3 text-center font-mono tabular-nums tracking-tight">{invT('folio.qty')}</th>
                <th className="py-2.5 px-3 text-right font-mono tabular-nums tracking-tight">{invT('folio.unitPrice')}</th>
                <th className="py-2.5 px-3 text-right font-mono tabular-nums tracking-tight">{invT('folio.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {bill.items && bill.items.length > 0 ? (
                bill.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="text-sm py-2 px-3 font-mono tabular-nums tracking-tight text-slate-500 print:text-black">{idx + 1}</td>
                    <td className="text-sm py-2 px-3 font-medium text-slate-900 print:text-black">
                      {localizeFolioDescription(item.description, invoiceLocale)}
                    </td>
                    <td className="text-sm py-2 px-3 text-center font-mono tabular-nums tracking-tight text-slate-900 print:text-black">{item.quantity}</td>
                    <td className="text-sm py-2 px-3 text-right font-mono tabular-nums tracking-tight text-slate-900 print:text-black">
                      {formatCurrency(item.unitPrice || 0)}
                    </td>
                    <td className="text-sm py-2 px-3 text-right font-mono tabular-nums tracking-tight font-medium text-slate-900 print:text-black">
                      {formatCurrency(calculateItemTotal(item))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="text-sm py-2 px-3 font-mono tabular-nums tracking-tight text-slate-500 print:text-black">1</td>
                  <td className="text-sm py-2 px-3 font-medium text-slate-900 print:text-black">{invT('invoice.roomAndService')}</td>
                  <td className="text-sm py-2 px-3 text-center font-mono tabular-nums tracking-tight text-slate-900 print:text-black">1</td>
                  <td className="text-sm py-2 px-3 text-right font-mono tabular-nums tracking-tight text-slate-900 print:text-black">{formatCurrency(summary.subtotal)}</td>
                  <td className="text-sm py-2 px-3 text-right font-mono tabular-nums tracking-tight font-medium text-slate-900 print:text-black">{formatCurrency(summary.subtotal)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Calculation Box */}
          <div className="pt-4 border-t border-slate-300 print:border-slate-900 flex justify-end">
            <div className="w-72 space-y-2 text-sm font-mono tabular-nums tracking-tight">
              <div className="flex justify-between text-slate-600 print:text-black">
                <span>{invT('folio.subtotal')}:</span>
                <span>{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 print:text-black">
                <span>{invT('folio.vat')}:</span>
                <span>{formatCurrency(summary.vat)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 print:border-slate-800">
                <span className="font-bold text-slate-900 print:text-black">{invT('invoice.netTotal')}</span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-950 print:text-black">{formatCurrency(summary.totalWithVat)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 print:text-black font-semibold pt-1">
                <span>{invT('invoice.paidAmount')}</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 print:text-black">
            <div>
              <div className="border-b border-slate-400 print:border-black w-48 mx-auto mb-1.5" />
              <span>{invT('invoice.guestSignature')}</span>
            </div>
            <div>
              <div className="border-b border-slate-400 print:border-black w-48 mx-auto mb-1.5" />
              <span>{invT('invoice.cashierSignature')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TaxInvoiceAbbModal = ReceiptTaxInvoiceModal;
export type TaxInvoiceAbbModalProps = ReceiptTaxInvoiceModalProps;

export default ReceiptTaxInvoiceModal;

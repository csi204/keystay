import React, { useState, useEffect } from 'react';
import { DetailedBill } from '../../hooks/useBilling';
import { useI18n } from '../../lib/i18n';
import { th } from '../../locales/th';
import { en } from '../../locales/en';
import { getAuthUser } from '../../lib/api';
import { calculateItemTotal, calculateFolioSummary, localizeFolioDescription } from './FolioSplitScreen';
import { X, Printer } from 'lucide-react';

export interface ReceiptTaxInvoiceModalProps {
  bill: DetailedBill | null;
  isOpen: boolean;
  onClose: () => void;
  cashierName?: string;
  paymentMethod?: string;
}

export const ReceiptTaxInvoiceModal: React.FC<ReceiptTaxInvoiceModalProps> = ({
  bill,
  isOpen,
  onClose,
  cashierName,
  paymentMethod: paymentMethodProp,
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

  const authUser = getAuthUser();
  const resolvedCashier = cashierName || (
    authUser?.fullName ||
    (authUser?.firstName && authUser?.lastName
      ? `${authUser.firstName} ${authUser.lastName}`
      : authUser?.firstName || authUser?.username || 'เดียร์ (ธีรภัทร)')
  );
  const cashierRoleTitle = authUser?.role === 'owner'
    ? 'Hotel Owner'
    : authUser?.role === 'housekeeping'
    ? 'Housekeeping'
    : 'Front Desk';
  const cashierDisplay = `${resolvedCashier} · ${cashierRoleTitle}`;

  const invT = (key: string): string => {
    if (invoiceLocale === 'th') return th[key] || en[key] || key;
    return en[key] || th[key] || key;
  };

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${bill.id.slice(0, 8).toUpperCase()}`;

  // Date format: DD/MM/YYYY HH:mm
  const invoiceDateObj = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = !isNaN(invoiceDateObj.getTime())
    ? `${pad(invoiceDateObj.getDate())}/${pad(invoiceDateObj.getMonth() + 1)}/${invoiceDateObj.getFullYear()} ${pad(invoiceDateObj.getHours())}:${pad(invoiceDateObj.getMinutes())}`
    : `${pad(new Date().getDate())}/${pad(new Date().getMonth() + 1)}/${new Date().getFullYear()} ${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
  const currentDate = formatDate(new Date().toISOString(), 'medium');

  const summary = calculateFolioSummary(bill.items, 0, bill.subtotal);
  const paidAmount = parseFloat(bill.paidAmount || '0') || (bill.status === 'paid' ? summary.totalWithVat : 0);
  const changeAmount = Math.max(0, paidAmount - summary.totalWithVat);

  const primaryPayment = bill.payments && bill.payments.length > 0 ? bill.payments[0] : null;
  const rawPaymentMethod = paymentMethodProp || primaryPayment?.paymentMethod || (bill as any).paymentMethod || 'cash';

  const formatPaymentMethod = (method?: string) => {
    switch (method) {
      case 'credit_card':
        return invoiceLocale === 'th' ? 'บัตรเครดิต (Credit Card)' : 'Credit Card';
      case 'qr_promptpay':
        return invoiceLocale === 'th' ? 'QR พร้อมเพย์ (QR PromptPay)' : 'QR PromptPay';
      case 'transfer':
        return invoiceLocale === 'th' ? 'โอนเงิน (Transfer)' : 'Transfer';
      case 'cash':
      default:
        return invoiceLocale === 'th' ? 'เงินสด (Cash)' : 'Cash';
    }
  };

  const formatAmount = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val) || '0');
    return isNaN(num)
      ? '0.00'
      : num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden !important;
          }
          .receipt-80mm-paper, .receipt-80mm-paper * {
            visibility: visible !important;
          }
          .receipt-80mm-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            min-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Backdrop */}
      <div
        className="fixed inset-0 print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center my-auto py-4 print:static print:p-0 print:m-0 print:py-0 print:my-0">
        {/* Top Action Toolbar (hidden during print) */}
        <div className="w-[360px] max-w-[360px] mb-3 bg-slate-800 text-white rounded-lg p-3 shadow-xl border border-slate-700/60 print:hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
            <h2 className="text-xs font-semibold text-slate-200">
              ตัวอย่างสลิปใบเสร็จรับเงิน (80mm Thermal POS Slip)
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors active:scale-[0.98]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2.5 gap-2">
            {/* Language toggle: TH / EN */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setInvoiceLocale('th')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  invoiceLocale === 'th'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setInvoiceLocale('en')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  invoiceLocale === 'en'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all active:scale-[0.98] min-h-[44px]"
            >
              <Printer className="w-4 h-4 mr-1.5" strokeWidth={1.75} aria-hidden="true" />
              <span>พิมพ์สลิปใบเสร็จ (80mm)</span>
            </button>
          </div>
        </div>

        {/* 80mm Thermal Receipt Paper */}
        <div className="receipt-80mm-paper w-[360px] max-w-[360px] print:w-[80mm] print:max-w-[80mm] bg-white text-slate-900 print:text-black shadow-2xl rounded-sm p-5 print:p-0 font-mono tabular-nums text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="text-center space-y-0.5">
            <div className="font-bold text-sm text-slate-950 print:text-black">
              *** โรงแรม คีย์สเตย์ (KEYSTAY HOTEL) ***
            </div>
            <div className="text-[11px] text-slate-600 print:text-black">
              999 ถ.พหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900
            </div>
            <div className="text-[11px] text-slate-600 print:text-black">
              เลขประจำตัวผู้เสียภาษี (TAX ID): 0-1055-67091-23-4
            </div>
            <div className="text-[11px] text-slate-600 print:text-black font-medium">
              เครื่อง POS: POS-01 (Front Desk)
            </div>
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-slate-300 print:border-black my-2.5" />

          {/* Title: Tax Invoice (ABB) / Receipt */}
          <div className="text-center font-bold">
            <div className="text-sm tracking-tight text-slate-950 print:text-black">
              {/* ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ */}
              ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ
            </div>
            <div className="text-xs tracking-wider text-slate-800 print:text-black">
              TAX INVOICE (ABB) / RECEIPT
            </div>
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-slate-300 print:border-black my-2.5" />

          {/* Metadata block */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-1">
              <span className="text-slate-600 print:text-black shrink-0">เลขที่ / NO :</span>
              <span className="font-bold text-slate-900 print:text-black text-right truncate">
                {invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between gap-1">
              <span className="text-slate-600 print:text-black shrink-0">วันที่ / DATE:</span>
              <span className="text-right truncate">{formattedDate}</span>
            </div>
            <div className="flex justify-between gap-1">
              <span className="text-slate-600 print:text-black shrink-0">ห้อง / ROOM :</span>
              <span className="font-semibold text-slate-900 print:text-black text-right truncate">
                {bill.roomNumber || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-1">
              <span className="text-slate-600 print:text-black shrink-0">ลูกค้า / GUEST:</span>
              <span className="text-right truncate">
                {bill.guestName || (invoiceLocale === 'th' ? 'ลูกค้าทั่วไป (Walk-in)' : 'Walk-in Guest')}
              </span>
            </div>
            <div className="flex justify-between gap-1">
              <span className="text-slate-600 print:text-black shrink-0">แคชเชียร์ / CASHIER:</span>
              <span className="font-medium text-slate-900 print:text-black text-right truncate">
                {resolvedCashier} ({cashierRoleTitle})
              </span>
            </div>
            <div className="sr-only print:hidden">{cashierDisplay}</div>
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-slate-300 print:border-black my-2.5" />

          {/* Items section */}
          <div className="space-y-2">
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item, idx) => {
                const itemTotal = calculateItemTotal(item);
                return (
                  <div key={item.id || idx} className="space-y-0.5">
                    {/* Line 1: [Index]. [Description] */}
                    <div className="font-medium text-slate-900 print:text-black truncate">
                      {idx + 1}. {localizeFolioDescription(item.description, invoiceLocale)}
                    </div>
                    {/* Line 2:    [Qty] x [UnitPrice]               [TotalAmount] */}
                    <div className="flex justify-between pl-3 text-slate-600 print:text-black">
                      <span>
                        {item.quantity} x {formatAmount(item.unitPrice || 0)}
                      </span>
                      <span className="font-medium text-slate-900 print:text-black">
                        {formatAmount(itemTotal)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-0.5">
                <div className="font-medium text-slate-900 print:text-black truncate">
                  1. {invT('invoice.roomAndService')}
                </div>
                <div className="flex justify-between pl-3 text-slate-600 print:text-black">
                  <span>1 x {formatAmount(summary.subtotal)}</span>
                  <span className="font-medium text-slate-900 print:text-black">
                    {formatAmount(summary.subtotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-slate-300 print:border-black my-2.5" />

          {/* Calculations section */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 print:text-black">ยอดรวมก่อนภาษี (SUBTOTAL) :</span>
              <span className="font-medium text-slate-900 print:text-black">
                {formatAmount(summary.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 print:text-black">ภาษีมูลค่าเพิ่ม 7% (VAT 7%) :</span>
              <span className="font-medium text-slate-900 print:text-black">
                {formatAmount(summary.vat)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate-950 print:text-black pt-0.5 text-sm">
              <span>ยอดรวมสุทธิ (TOTAL NET) :</span>
              <span>{formatAmount(summary.totalWithVat)}</span>
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-slate-300 print:border-black my-2" />

            <div className="flex justify-between">
              <span className="text-slate-600 print:text-black">ชำระโดย (PAID BY) :</span>
              <span className="font-medium text-slate-900 print:text-black">
                {formatPaymentMethod(rawPaymentMethod)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 print:text-black">รับเงินมา (AMOUNT PAID) :</span>
              <span className="font-medium text-slate-900 print:text-black">
                {formatAmount(paidAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 print:text-black">เงินทอน (CHANGE) :</span>
              <span className="font-medium text-slate-900 print:text-black">
                {formatAmount(changeAmount)}
              </span>
            </div>
          </div>

          {/* Dashed divider */}
          <div className="border-t border-dashed border-slate-300 print:border-black my-2.5" />

          {/* Footer section */}
          <div className="text-center space-y-2 pt-1">
            <div className="text-[11px] text-slate-600 print:text-black font-medium">
              (ราคารวมภาษีมูลค่าเพิ่ม 7% แล้ว / VAT 7% INCLUDED)
            </div>

            {/* Authentic SVG Barcode & Simulation */}
            <div className="py-1 flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 200 40"
                className="w-48 h-9 print:w-44 print:h-8"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="0" y="0" width="3" height="30" />
                <rect x="5" y="0" width="1.5" height="30" />
                <rect x="9" y="0" width="4.5" height="30" />
                <rect x="16" y="0" width="1.5" height="30" />
                <rect x="20" y="0" width="3" height="30" />
                <rect x="25" y="0" width="6" height="30" />
                <rect x="33" y="0" width="1.5" height="30" />
                <rect x="37" y="0" width="3" height="30" />
                <rect x="42" y="0" width="4.5" height="30" />
                <rect x="49" y="0" width="1.5" height="30" />
                <rect x="53" y="0" width="6" height="30" />
                <rect x="61" y="0" width="3" height="30" />
                <rect x="66" y="0" width="1.5" height="30" />
                <rect x="70" y="0" width="4.5" height="30" />
                <rect x="77" y="0" width="3" height="30" />
                <rect x="82" y="0" width="1.5" height="30" />
                <rect x="86" y="0" width="6" height="30" />
                <rect x="94" y="0" width="3" height="30" />
                <rect x="99" y="0" width="1.5" height="30" />
                <rect x="103" y="0" width="4.5" height="30" />
                <rect x="110" y="0" width="3" height="30" />
                <rect x="115" y="0" width="1.5" height="30" />
                <rect x="119" y="0" width="6" height="30" />
                <rect x="127" y="0" width="1.5" height="30" />
                <rect x="131" y="0" width="3" height="30" />
                <rect x="136" y="0" width="4.5" height="30" />
                <rect x="143" y="0" width="3" height="30" />
                <rect x="148" y="0" width="1.5" height="30" />
                <rect x="152" y="0" width="6" height="30" />
                <rect x="160" y="0" width="3" height="30" />
                <rect x="165" y="0" width="1.5" height="30" />
                <rect x="169" y="0" width="4.5" height="30" />
                <rect x="176" y="0" width="1.5" height="30" />
                <rect x="180" y="0" width="3" height="30" />
                <rect x="185" y="0" width="6" height="30" />
                <rect x="193" y="0" width="3" height="30" />
                <rect x="198" y="0" width="2" height="30" />
                <text x="100" y="38" textAnchor="middle" fontSize="9" fontFamily="monospace" letterSpacing="1.5">
                  {invoiceNumber}
                </text>
              </svg>
              <div className="text-[10px] tracking-widest text-slate-400 print:text-black font-mono select-none">
                |||| | ||||| || |||||||| ||||
              </div>
            </div>

            <div className="font-bold text-xs tracking-tight text-slate-900 print:text-black">
              *** ขอบคุณที่ใช้บริการ / THANK YOU ***
            </div>

            {/* Cashier signature note */}
            <div className="text-[10px] text-slate-500 print:text-black pt-1">
              <span>{invT('invoice.cashierSignature')}: {resolvedCashier}</span>
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

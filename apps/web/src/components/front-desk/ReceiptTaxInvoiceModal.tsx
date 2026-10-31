import React, { useEffect } from 'react';
import { DetailedBill } from '@/hooks/useBilling';
import { X, Printer, CheckCircle } from 'lucide-react';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${bill.id.slice(0, 8).toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const subtotal = parseFloat(bill.subtotal || '0');
  const vat = parseFloat(bill.taxAmount || '0') || Math.round(subtotal * 0.07 * 100) / 100;
  const netAmount = parseFloat(bill.netAmount || '0') || subtotal + vat;
  const paidAmount = parseFloat(bill.paidAmount || '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 p-8 print:p-0 print:border-none print:shadow-none animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            ตัวอย่างใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบเสร็จ (Print)</span>
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
              <h1 className="text-xl font-bold tracking-tight">โรงแรม คีย์สเตย์ (KEYSTAY HOTEL)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                999 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900
              </p>
              <p className="text-xs text-slate-500 font-mono">เลขประจำตัวผู้เสียภาษี: 0-1055-67891-23-4</p>
            </div>
            <div className="text-right">
              <span className="text-base font-bold tracking-tight block">
                ใบเสร็จรับเงิน / ใบกำกับภาษี
              </span>
              <span className="text-xs text-slate-500 font-mono block mt-0.5">
                เลขที่: {invoiceNumber}
              </span>
              <span className="text-xs text-slate-500 font-mono block">วันที่: {currentDate}</span>
            </div>
          </div>

          {/* Guest / Bill Details */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 print:bg-transparent print:p-0 print:border-none">
            <div>
              <span className="text-slate-500 block mb-0.5">ชื่อลูกค้า / ผู้เข้าพัก:</span>
              <span className="font-semibold text-slate-900 text-sm">
                {bill.guestName || 'ลูกค้าทั่วไป (Walk-in / Guest)'}
              </span>
              <span className="text-slate-600 block text-[11px] mt-0.5">
                ห้องพัก: ห้อง {bill.roomNumber || '—'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block mb-0.5">พนักงานผู้ออกบิล (Cashier):</span>
              <span className="font-semibold text-slate-900">เดียร์ (ธีรภัทร) · Front Desk</span>
              <span className="text-slate-600 font-mono block text-[11px] mt-0.5">
                สถานะ: {bill.status === 'paid' ? 'ชำระเงินเรียบร้อยแล้ว' : 'รอชำระเงิน'}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 font-semibold text-slate-700">
                <th className="py-2 font-mono">ลำดับ</th>
                <th className="py-2">รายการ</th>
                <th className="py-2 text-center font-mono">จำนวน</th>
                <th className="py-2 text-right font-mono">ราคา/หน่วย</th>
                <th className="py-2 text-right font-mono">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bill.items && bill.items.length > 0 ? (
                bill.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-2 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2 font-medium text-slate-900">{item.description}</td>
                    <td className="py-2 text-center font-mono">{item.quantity}</td>
                    <td className="py-2 text-right font-mono">
                      ฿{Number(item.unitPrice).toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-mono font-medium">
                      ฿{Number(item.totalAmount).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2 font-mono text-slate-500">1</td>
                  <td className="py-2 font-medium text-slate-900">ค่าห้องพักและบริการ</td>
                  <td className="py-2 text-center font-mono">1</td>
                  <td className="py-2 text-right font-mono">฿{subtotal.toLocaleString()}</td>
                  <td className="py-2 text-right font-mono font-medium">฿{subtotal.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Calculation Box */}
          <div className="pt-4 border-t border-slate-300 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>ยอดรวมก่อนภาษี:</span>
                <span>฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                <span>฿{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>ยอดรวมทั้งสิ้น (Net Total):</span>
                <span>฿{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>ยอดชำระแล้ว:</span>
                <span>฿{paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1.5" />
              <span>ลงชื่อผู้รับบริการ / แขกผู้เข้าพัก</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1.5" />
              <span>ลงชื่อพนักงานแคชเชียร์ผู้รับเงิน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

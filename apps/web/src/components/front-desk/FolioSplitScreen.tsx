import React, { useState } from 'react';
import { DetailedBill, BillItem } from '@/hooks/useBilling';
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'qr_promptpay' | 'transfer'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  if (!bill) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-dashed border-slate-300">
        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">กรุณาเลือกบิลห้องพักจากรายการด้านบน</p>
        <p className="text-xs text-slate-400 mt-1">เพื่อเปิดหน้าต่างแยกสองฝั่ง (Split Screen) จัดการค่าใช้จ่ายและคิดเงิน</p>
      </div>
    );
  }

  const items = bill.items || [];
  const subtotal = items.length > 0
    ? items.reduce((acc, it) => acc + (parseFloat(it.totalAmount) || 0), 0)
    : parseFloat(bill.subtotal || '0');

  const vat = Math.round(subtotal * 0.07 * 100) / 100;
  const totalWithVat = subtotal + vat;
  const depositDeduction = parseFloat(depositAmount) || 0;
  const netDue = Math.max(0, totalWithVat - depositDeduction);
  const isPaid = bill.status === 'paid' || paymentSuccess;

  const handleSettle = async () => {
    setPayError(null);
    setIsProcessing(true);
    const success = await onPay(paymentMethod, netDue.toFixed(2));
    setIsProcessing(false);
    if (success) {
      setPaymentSuccess(true);
    } else {
      setPayError('เกิดข้อผิดพลาดในการบันทึกการชำระเงิน');
    }
  };

  const categoryLabels: Record<string, string> = {
    room: 'ค่าห้องพัก',
    minibar: 'มินิบาร์/เครื่องดื่ม',
    laundry: 'บริการซักรีด',
    damage: 'ค่าชดเชยทรัพย์สิน',
    service: 'บริการเสริม',
    other: 'อื่นๆ',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Left Pane: Itemized Folio Items (7 Cols) */}
      <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-700" />
              <span>รายการค่าใช้จ่ายในโฟลิโอ (Itemized Folio)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ห้อง {bill.roomNumber || '—'} · แขก: {bill.guestName || 'ผู้เข้าพัก'}
            </p>
          </div>

          {!isPaid && (
            <button
              onClick={onAddCharge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มค่าใช้จ่าย / มินิบาร์</span>
            </button>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2 px-3">หมวดหมู่</th>
                <th className="py-2 px-3">รายละเอียด</th>
                <th className="py-2 px-3 text-center font-mono">จำนวน</th>
                <th className="py-2 px-3 text-right font-mono">ราคา/หน่วย</th>
                <th className="py-2 px-3 text-right font-mono">รวม (฿)</th>
                {!isPaid && <th className="py-2 px-3 text-center">ลบ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    ยังไม่มีรายการค่าใช้จ่ายเสริม
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                        {categoryLabels[it.category] || it.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{it.description}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">{it.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ฿{Number(it.unitPrice).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      ฿{Number(it.totalAmount).toLocaleString()}
                    </td>
                    {!isPaid && (
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onDeleteItem(it.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="ลบรายการ"
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
            <h3 className="text-sm font-bold text-slate-900">สรุปยอดชำระและปิดบิล (Cashier Settlement)</h3>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isPaid ? 'ชำระแล้ว' : 'รอชำระเงิน'}
            </span>
          </div>

          {payError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          {/* Money Breakdown */}
          <div className="space-y-2 text-xs font-mono bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex justify-between text-slate-600">
              <span>ยอดรวมค่าบริการ (Subtotal):</span>
              <span>฿{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
              <span>฿{vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ยอดรวมทั้งสิ้น:</span>
              <span className="font-semibold text-slate-800">฿{totalWithVat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium pt-1.5 border-t border-slate-100">
              <span>หักเงินมัดจำกุญแจแล้ว:</span>
              <span>-฿{depositDeduction.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>ยอดชำระสุทธิ (Net Due):</span>
              <span className="text-lg text-emerald-800">฿{netDue.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          {!isPaid && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                เลือกช่องทางการชำระเงิน:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'cash', label: 'เงินสด (Cash)', icon: Banknote },
                  { key: 'credit_card', label: 'บัตรเครดิต', icon: CreditCard },
                  { key: 'qr_promptpay', label: 'QR พร้อมเพย์', icon: QrCode },
                  { key: 'transfer', label: 'โอนผ่านธนาคาร', icon: Receipt },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPaymentMethod(m.key as any)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
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
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'กำลังบันทึกชำระเงิน...'
                  : `รับชำระเงิน ฿${netDue.toFixed(2)} และปิดบิล`}
              </span>
            </button>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>บิลนี้ชำระเงินเสร็จสิ้นแล้ว</span>
            </div>
          )}

          <button
            onClick={onViewInvoice}
            className="w-full py-2 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>ดู / พิมพ์ใบเสร็จรับเงิน (Print Tax Invoice)</span>
          </button>
        </div>
      </div>
    </div>
  );
};


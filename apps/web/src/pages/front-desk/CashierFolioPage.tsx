import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useBilling, DetailedBill } from '@/hooks/useBilling';
import { FolioSplitScreen } from '@/components/front-desk/FolioSplitScreen';
import { AddExtraChargeModal } from '@/components/front-desk/AddExtraChargeModal';
import { ReceiptTaxInvoiceModal } from '@/components/front-desk/ReceiptTaxInvoiceModal';
import {
  ReceiptText,
  RotateCw,
  Search,
  WifiOff,
  AlertCircle,
} from 'lucide-react';

export const CashierFolioPage: React.FC = () => {
  const location = useLocation();
  const navState = location.state as {
    reservationId?: string;
    roomId?: string;
    billId?: string;
  } | null;

  const {
    bills,
    selectedBill,
    setSelectedBill,
    loading,
    error,
    isOffline,
    lastRefreshed,
    refresh,
    loadBillDetails,
    loadBillByReservation,
    addExtraCharge,
    deleteChargeItem,
    settleBillPayment,
  } = useBilling();

  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-select bill from navigation state if passed
  useEffect(() => {
    if (navState?.reservationId) {
      loadBillByReservation(navState.reservationId);
    } else if (navState?.billId) {
      loadBillDetails(navState.billId);
    } else if (bills.length > 0 && !selectedBill) {
      loadBillDetails(bills[0].id);
    }
  }, [navState, bills]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    if (selectedBill) {
      await loadBillDetails(selectedBill.id);
    }
    setIsRefreshing(false);
  };

  const filteredBills = bills.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchesGuest = b.guestName?.toLowerCase().includes(q) || false;
    const matchesRoom = b.roomNumber?.toLowerCase().includes(q) || false;
    const matchesId = b.id.toLowerCase().includes(q);
    return matchesGuest || matchesRoom || matchesId;
  });

  return (
    <FrontDeskLayout activeTab="billing">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              แคชเชียร์และบิลโฟลิโอ (Bills & Cashier)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              หน้าต่างแยกสองฝั่ง (Split Screen) จัดการค่าใช้จ่าย มินิบาร์ หักเงินมัดจำ และออกใบเสร็จ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">รีเฟรชบิล</span>
            </button>
          </div>
        </div>

        {/* Status notice */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>โหมด Offline ข้อมูลอาจไม่อัปเดต</span>
          </div>
        )}

        {/* Bill Selector Ribbon */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขห้อง หรือชื่อแขก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {filteredBills.map((b) => {
              const isSelected = selectedBill?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => loadBillDetails(b.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white font-medium shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono font-bold">ห้อง {b.roomNumber || '—'}</span>
                  <span className="opacity-80 truncate max-w-[100px]">{b.guestName || 'ผู้เข้าพัก'}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      b.status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {b.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Screen Component */}
        <FolioSplitScreen
          bill={selectedBill}
          depositAmount="500"
          onAddCharge={() => setIsAddChargeOpen(true)}
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

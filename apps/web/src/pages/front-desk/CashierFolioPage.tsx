import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';
import { useBilling, DetailedBill } from '@/hooks/useBilling';
import { FolioSplitScreen } from '@/components/front-desk/FolioSplitScreen';
import { AddExtraChargeModal } from '@/components/front-desk/AddExtraChargeModal';
import { ReceiptTaxInvoiceModal } from '@/components/front-desk/ReceiptTaxInvoiceModal';
import { useI18n } from '@/lib/i18n';
import {
  RotateCw,
  Search,
  WifiOff,
} from 'lucide-react';

export const CashierFolioPage: React.FC = () => {
  const { t, locale, formatRelativeTime } = useI18n();
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
            <h1 className="text-2xl font-bold text-slate-900">
              {t('folio.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('folio.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono tabular-nums tracking-tight hidden sm:inline">
              {formatRelativeTime(lastRefreshed, locale)}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('folio.refreshBills')}</span>
            </button>
          </div>
        </div>

        {/* Status notice */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t('folio.offlineNotice')}</span>
          </div>
        )}

        {/* Bill Selector Ribbon */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('folio.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            {filteredBills.length === 0 ? (
              <span className="text-xs text-slate-400 py-1.5 px-2 italic">
                {t('res.noReservationsFound')}
              </span>
            ) : (
              filteredBills.map((b) => {
                const isSelected = selectedBill?.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => loadBillDetails(b.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-mono font-medium tabular-nums tracking-tight">
                      {t('common.room')} {b.roomNumber || '—'}
                    </span>
                    <span className="opacity-80 truncate max-w-[110px]">
                      {b.guestName || t('common.guest')}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium tabular-nums tracking-tight border ${
                        isSelected
                          ? b.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : b.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {b.status === 'paid' ? t('folio.paid') : t('folio.pending')}
                    </span>
                  </button>
                );
              })
            )}
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

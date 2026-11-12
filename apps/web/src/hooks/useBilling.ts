import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { Bill } from '@keystay/types';
import type { ExtendedReservation } from './useReservations';
import {
  syncBillWithReservation,
  reconcileBillsWithReservations,
} from '../lib/folioReconciliation';

export { syncBillWithReservation, reconcileBillsWithReservations };

export interface BillItem {
  id: string;
  billId: string;
  description: string;
  category: 'room' | 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  createdAt: string;
}

export interface BillPayment {
  id: string;
  billId: string;
  amount: string;
  paymentMethod: 'cash' | 'credit_card' | 'qr_promptpay' | 'transfer';
  referenceNumber?: string;
  createdAt: string;
}

export interface DetailedBill extends Bill {
  billNumber?: string;
  totalAmount?: string | number;
  depositDeducted?: string | number;
  amountDue?: string | number;
  guestName?: string;
  roomNumber?: string;
  roomId?: string;
  items?: BillItem[];
  payments?: BillPayment[];
}

export function useBilling(reservations?: ExtendedReservation[]) {
  const [bills, setBills] = useState<DetailedBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<DetailedBill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const synchronizedBills = useMemo(() => {
    if (!reservations || reservations.length === 0) return bills;
    return reconcileBillsWithReservations(bills, reservations);
  }, [bills, reservations]);

  const synchronizedSelectedBill = useMemo(() => {
    if (!selectedBill) return null;
    if (!reservations || reservations.length === 0) return selectedBill;
    return syncBillWithReservation(selectedBill, reservations);
  }, [selectedBill, reservations]);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiFetch<DetailedBill[]>('/api/bills');

    if (res.isOffline) {
      setIsOffline(true);
    } else {
      setIsOffline(false);
    }

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setBills(sorted);
    }

    setLastRefreshed(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const loadBillDetails = async (id: string) => {
    const res = await apiFetch<DetailedBill>(`/api/bills/${id}`);
    if (res.data) {
      setSelectedBill(res.data);
      return res.data;
    }
    return null;
  };

  const loadBillByReservation = async (reservationId: string) => {
    const res = await apiFetch<DetailedBill>(`/api/bills/by-reservation/${reservationId}`);
    if (res.data) {
      setSelectedBill(res.data);
      return res.data;
    }
    return null;
  };

  const addExtraCharge = async (
    billId: string,
    data: {
      description: string;
      category: 'room' | 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
      quantity: number;
      unitPrice: string;
    }
  ) => {
    const rawCategory = data.category || 'other';
    let itemType: string = 'other';
    if (rawCategory === 'service') itemType = 'room_service';
    else if (rawCategory === 'room') itemType = 'room_charge';
    else if (['minibar', 'laundry', 'damage', 'other'].includes(rawCategory)) itemType = rawCategory;

    const res = await apiFetch(`/api/bills/${billId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        description: data.description,
        category: rawCategory,
        itemType,
        unitPrice: Number(data.unitPrice),
        quantity: Number(data.quantity) || 1,
      }),
    });
    if (!res.error) {
      await loadBillDetails(billId);
      await fetchBills();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const deleteChargeItem = async (billId: string, itemId: string) => {
    const res = await apiFetch(`/api/bills/${billId}/items/${itemId}`, {
      method: 'DELETE',
    });
    if (!res.error) {
      await loadBillDetails(billId);
      await fetchBills();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const settleBillPayment = async (
    billId: string,
    paymentMethod: 'cash' | 'credit_card' | 'qr_promptpay' | 'transfer',
    amount: string,
    referenceNumber?: string
  ) => {
    const res = await apiFetch(`/api/bills/${billId}/pay`, {
      method: 'POST',
      body: JSON.stringify({
        paymentMethod,
        amount,
        referenceNumber,
      }),
    });
    if (!res.error) {
      await loadBillDetails(billId);
      await fetchBills();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  return {
    bills: synchronizedBills,
    selectedBill: synchronizedSelectedBill,
    rawBills: bills,
    rawSelectedBill: selectedBill,
    setSelectedBill,
    loading,
    error,
    isOffline,
    lastRefreshed,
    refresh: fetchBills,
    loadBillDetails,
    loadBillByReservation,
    addExtraCharge,
    deleteChargeItem,
    settleBillPayment,
  };
}


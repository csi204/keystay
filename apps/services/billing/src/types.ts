export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  QSTASH_URL?: string;
  QSTASH_TOKEN?: string;
}

export interface BillRecord {
  id: string;
  bill_number: string;
  reservation_id: string;
  guest_name: string;
  room_number: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  deposit_deducted: number;
  amount_paid: number;
  amount_due: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'refunded' | 'void';
  created_at: string;
  updated_at: string;
}

export interface BillItemRecord {
  id: string;
  bill_id: string;
  item_type: 'room_charge' | 'minibar' | 'laundry' | 'room_service' | 'damage' | 'other';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_date: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  bill_id: string;
  payment_method_id: string;
  amount: number;
  reference_number: string | null;
  status: 'completed' | 'failed' | 'refunded';
  paid_at: string;
  created_at: string;
}

export interface PaymentMethodRecord {
  id: string;
  name: string;
  code: string;
  is_active: number;
  created_at: string;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  bill_id: string;
  issued_to_name: string;
  issued_to_email: string | null;
  total_amount: number;
  status: 'draft' | 'issued' | 'sent' | 'void';
  sent_at: string | null;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  bill_id: string;
  payment_id: string | null;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  refunded_by: string | null;
  created_at: string;
}

// ==========================================
// DTO Mappers (Rule #4 String Contract)
// ==========================================

export function mapBill(row: any) {
  if (!row) return null;
  const subtotal = Number(row.subtotal || 0).toFixed(2);
  const discountAmount = Number(row.discount_amount || 0).toFixed(2);
  const taxRate = Number(row.tax_rate ?? 0.07).toFixed(2);
  const taxAmount = Number(row.tax_amount || 0).toFixed(2);
  const serviceCharge = Number(row.service_charge || 0).toFixed(2);
  const totalAmount = Number(row.total_amount || 0).toFixed(2);
  const depositDeducted = Number(row.deposit_deducted || 0).toFixed(2);
  const amountPaid = Number(row.amount_paid || 0).toFixed(2);
  const amountDue = Number(row.amount_due || 0).toFixed(2);

  return {
    id: row.id,
    billNumber: row.bill_number,
    reservationId: row.reservation_id,
    guestName: row.guest_name,
    roomNumber: row.room_number,
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    serviceCharge,
    totalAmount,
    depositDeducted,
    amountPaid,
    amountDue,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBillItem(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    billId: row.bill_id,
    itemType: row.item_type,
    description: row.description,
    quantity: String(row.quantity ?? 1),
    unitPrice: Number(row.unit_price || 0).toFixed(2),
    totalPrice: Number(row.total_price || 0).toFixed(2),
    itemDate: row.item_date,
    createdAt: row.created_at,
  };
}

export function mapPayment(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    billId: row.bill_id,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name || null,
    paymentMethodCode: row.payment_method_code || null,
    amount: Number(row.amount || 0).toFixed(2),
    referenceNumber: row.reference_number || null,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

export function mapPaymentMethod(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

export function mapInvoice(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    billId: row.bill_id,
    issuedToName: row.issued_to_name,
    issuedToEmail: row.issued_to_email || null,
    totalAmount: Number(row.total_amount || 0).toFixed(2),
    status: row.status,
    sentAt: row.sent_at || null,
    createdAt: row.created_at,
  };
}

export function mapRefund(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    billId: row.bill_id,
    paymentId: row.payment_id || null,
    amount: Number(row.amount || 0).toFixed(2),
    reason: row.reason,
    status: row.status,
    refundedBy: row.refunded_by || null,
    createdAt: row.created_at,
  };
}

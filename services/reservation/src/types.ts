export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  QSTASH_URL?: string;
  QSTASH_TOKEN?: string;
}

export interface GuestRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  id_card_number: string | null;
  nationality: string | null;
  address: string | null;
  notes: string | null;
  total_stays: number;
  created_at: string;
  updated_at: string;
}

export interface ReservationRecord {
  id: string;
  reservation_code: string;
  guest_id: string;
  room_id: string;
  room_number: string;
  room_type_name: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'extended';
  booking_type: 'advance' | 'walk_in';
  check_in_date: string;
  check_out_date: string;
  actual_check_in: string | null;
  actual_check_out: string | null;
  num_guests: number;
  nightly_rate: number;
  total_nights: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  deposit_amount: number;
  total_amount: number;
  special_requests: string | null;
  booking_source?: 'walk_in' | 'phone' | 'facebook';
  payment_status?: 'unpaid' | 'paid';
  payment_slip_url?: string | null;
  payment_slip_ref?: string | null;
  payment_verified_at?: string | null;
  payment_verified_by?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function mapGuest(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    email: row.email || null,
    phone: row.phone || null,
    idCardNumber: row.id_card_number || null,
    nationality: row.nationality || null,
    address: row.address || null,
    notes: row.notes || null,
    totalStays: String(row.total_stays ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReservation(row: any) {
  if (!row) return null;
  const numGuests = Number(row.num_guests || 1);
  const nightlyRate = Number(row.nightly_rate || 0).toFixed(2);
  const totalNights = String(row.total_nights ?? 0);
  const subtotal = Number(row.subtotal || 0).toFixed(2);
  const discountAmount = Number(row.discount_amount || 0).toFixed(2);
  const taxAmount = Number(row.tax_amount || 0).toFixed(2);
  const depositAmount = Number(row.deposit_amount || 0).toFixed(2);
  const totalAmount = Number(row.total_amount || 0).toFixed(2);

  return {
    id: row.id,
    reservationCode: row.reservation_code,
    guestId: row.guest_id,
    roomId: row.room_id,
    roomNumber: row.room_number,
    roomTypeName: row.room_type_name,
    status: row.status,
    bookingType: row.booking_type,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    actualCheckIn: row.actual_check_in || null,
    actualCheckOut: row.actual_check_out || null,
    numGuests,
    nightlyRate,
    totalNights,
    subtotal,
    discountAmount,
    taxAmount,
    depositAmount,
    totalAmount,
    specialRequests: row.special_requests || null,
    bookingSource: row.booking_source || 'walk_in',
    paymentStatus: row.payment_status || 'unpaid',
    paymentSlipUrl: row.payment_slip_url || null,
    paymentSlipRef: row.payment_slip_ref || null,
    paymentVerifiedAt: row.payment_verified_at || null,
    paymentVerifiedBy: row.payment_verified_by || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.first_name || row.guest_name ? {
      guest: {
        id: row.guest_id,
        firstName: row.first_name || (row.guest_name ? row.guest_name.split(' ')[0] : ''),
        lastName: row.last_name || (row.guest_name ? row.guest_name.split(' ').slice(1).join(' ') : ''),
        fullName: row.guest_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        email: row.guest_email || row.email || null,
        phone: row.guest_phone || row.phone || null,
        idCardNumber: row.id_card_number || null,
        nationality: row.nationality || null,
      }
    } : {}),
  };
}

export function mapAmenityRequest(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    reservationId: row.reservation_id,
    amenityId: row.amenity_id,
    amenityName: row.amenity_name,
    quantity: Number(row.quantity || 1),
    unitPrice: Number(row.unit_price || 0),
    totalPrice: Number(row.total_price || 0),
    isChargeable: Number(row.is_chargeable || 0),
    status: row.status || 'requested',
    billedToFolio: Number(row.billed_to_folio || 0),
    billItemId: row.bill_item_id || null,
    notes: row.notes || null,
    requestedAt: row.requested_at,
    deliveredAt: row.delivered_at || null,
  };
}

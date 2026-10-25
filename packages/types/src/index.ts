import { z } from 'zod';

// ==========================================
// 1. Auth & User Types (4 Roles)
// ==========================================
export const UserRoleSchema = z.enum(['admin', 'manager', 'front_desk', 'housekeeping']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JWTPayload {
  sub: string;
  username: string;
  role: UserRole;
  exp?: number;
  iat?: number;
}

// ==========================================
// 2. Room State Machine (7 Real-time Statuses)
// ==========================================
export const RoomStatusSchema = z.enum([
  'available',
  'reserved',
  'occupied',
  'checked_out',
  'cleaning',
  'maintenance',
  'out_of_order',
]);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  floor: string;
  status: RoomStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomType {
  id: string;
  name: string;
  description?: string;
  basePrice: string;
  capacity: number;
  imageUrl?: string;
  amenities: string[];
}

// ==========================================
// 3. Reservation & Booking Types
// ==========================================
export const ReservationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
]);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export interface Reservation {
  id: string;
  bookingNumber: string;
  guestId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  totalNights: string;
  totalAmount: string;
  depositAmount: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. Housekeeping Types
// ==========================================
export const TaskTypeSchema = z.enum(['checkout_clean', 'deep_clean', 'stayover_clean', 'inspection']);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TaskPrioritySchema = z.enum(['normal', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum(['pending', 'assigned', 'in_progress', 'completed', 'verified', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export interface HousekeepingTask {
  id: string;
  roomId: string;
  staffId?: string;
  taskType: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  completedAt?: string;
  createdAt: string;
}

// 4.1 Outsource Contacts Types
export const OutsourceCategorySchema = z.enum([
  'air_conditioning',
  'plumbing',
  'electrical',
  'carpentry',
  'general_maintenance',
  'locksmith',
  'pest_control',
  'gardening',
  'laundry',
  'transport',
  'cleaning',
  'other',
]);
export type OutsourceCategory = z.infer<typeof OutsourceCategorySchema>;

export interface OutsourceContact {
  id: string;
  name: string;
  category: OutsourceCategory;
  serviceType: string;
  phonePrimary: string;
  phoneSecondary?: string;
  lineId?: string;
  isEmergency: number;
  availableHours?: string;
  priceRateNote?: string;
  rating?: number;
  address?: string;
  notes?: string;
  isActive: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. Billing & Cashier Types
// ==========================================
export const BillStatusSchema = z.enum(['pending', 'partially_paid', 'paid', 'refunded', 'void']);
export type BillStatus = z.infer<typeof BillStatusSchema>;

export interface Bill {
  id: string;
  reservationId: string;
  guestId: string;
  subtotal: string;
  taxAmount: string;
  netAmount: string;
  paidAmount: string;
  status: BillStatus;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. R2 Cloudflare Asset Types
// ==========================================
export interface AssetUploadResult {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

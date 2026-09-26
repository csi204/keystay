import { z } from 'zod';

// ========================================================
// 1. Check-in Event -> Upstash Topic: hotel.reservation.checkin
// ========================================================
export const ReservationCheckedInEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('ReservationCheckedIn'),
  timestamp: z.string().datetime(),
  reservationId: z.string().uuid(),
  roomId: z.string().uuid(),
  roomNumber: z.string(),
  guestId: z.string().uuid(),
  guestName: z.string(),
  checkInTime: z.string().datetime(),
  expectedCheckOutDate: z.string(),
  performedBy: z.string().uuid(),
});
export type ReservationCheckedInEvent = z.infer<typeof ReservationCheckedInEventSchema>;

// ========================================================
// 2. Check-out Event -> Upstash Topic: hotel.reservation.checkout (Fan-out 4 ทาง)
// ========================================================
export const ReservationCheckedOutEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('ReservationCheckedOut'),
  timestamp: z.string().datetime(),
  reservationId: z.string().uuid(),
  bookingNumber: z.string(),
  bookingType: z.enum(['standard', 'walk_in']),
  roomId: z.string().uuid(),
  roomNumber: z.string(),
  roomTypeId: z.string().uuid(),
  roomTypeName: z.string(),
  floor: z.string(),
  guestId: z.string().uuid(),
  guestName: z.string(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  checkInDate: z.string(),
  actualCheckIn: z.string().datetime(),
  checkOutDate: z.string(),
  actualCheckOut: z.string().datetime(),
  totalNights: z.string(),
  nightlyRate: z.string(),
  roomTotalAmount: z.string(),
  depositAmount: z.string().default('0.00'),
  taxRate: z.string().default('0.07'),
  taxAmount: z.string(),
  netAmount: z.string(),
  currency: z.literal('THB').default('THB'),
  cleaningType: z.enum(['checkout_clean', 'deep_clean']).default('checkout_clean'),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  specialNotes: z.string().optional(),
  performedBy: z.string().uuid(),
});
export type ReservationCheckedOutEvent = z.infer<typeof ReservationCheckedOutEventSchema>;

// ========================================================
// 3. Housekeeping Task Complete Event -> Upstash Topic: hotel.housekeeping.completed
// ========================================================
export const HousekeepingTaskCompletedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('HousekeepingTaskCompleted'),
  timestamp: z.string().datetime(),
  taskId: z.string().uuid(),
  roomId: z.string().uuid(),
  roomNumber: z.string(),
  staffId: z.string().uuid(),
  staffName: z.string(),
  completedAt: z.string().datetime(),
  inspectionStatus: z.enum(['passed', 'pending_inspection']).default('passed'),
  nextRoomStatus: z.literal('available'),
});
export type HousekeepingTaskCompletedEvent = z.infer<typeof HousekeepingTaskCompletedEventSchema>;

import { z } from 'zod';

export const createReservationSchema = z
  .object({
    guestId: z.string().optional(),
    guestName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    guestPhone: z.string().optional().nullable(),
    guestEmail: z.string().optional().nullable(),
    roomId: z.string().min(1, 'Room ID is required'),
    roomNumber: z.string().optional(),
    roomTypeName: z.string().optional(),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'checkInDate must be in YYYY-MM-DD format'),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'checkOutDate must be in YYYY-MM-DD format'),
    numGuests: z.coerce.number().int().min(1).default(1),
    nightlyRate: z.coerce.number().min(0, 'Nightly rate must be positive'),
    totalNights: z.coerce.number().int().min(1).optional(),
    depositAmount: z.coerce.number().min(0).default(0),
    discountAmount: z.coerce.number().min(0).default(0),
    specialRequests: z.string().optional().nullable(),
    bookingType: z.enum(['advance', 'walk_in']).default('advance'),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: 'checkOutDate must be after checkInDate',
    path: ['checkOutDate'],
  })
  .refine((data) => data.guestId || data.guestName || data.firstName, {
    message: 'Either guestId, guestName, or firstName must be provided',
    path: ['guestId'],
  });

export const updateReservationSchema = z.object({
  roomId: z.string().optional(),
  roomNumber: z.string().optional(),
  roomTypeName: z.string().optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  numGuests: z.coerce.number().int().min(1).optional(),
  nightlyRate: z.coerce.number().min(0).optional(),
  depositAmount: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  specialRequests: z.string().optional().nullable(),
  status: z.enum(['confirmed', 'checked_in', 'checked_out', 'cancelled', 'extended']).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

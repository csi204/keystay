import { z } from 'zod';

export const validDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const d = new Date(val + 'T00:00:00Z');
      return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
    },
    { message: 'Invalid calendar date (e.g. non-existent day like Feb 31 or invalid leap year)' }
  );

export const createReservationSchema = z
  .object({
    guestId: z.string().optional(),
    guestName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    guestPhone: z.string().optional().nullable(),
    guestEmail: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
    roomId: z.string().min(1, 'Room ID is required'),
    roomNumber: z.string().optional(),
    roomTypeName: z.string().optional(),
    checkInDate: validDateSchema,
    checkOutDate: validDateSchema,
    numGuests: z.coerce.number().int().min(1).default(1),
    nightlyRate: z.coerce.number().min(0, 'Nightly rate must be positive'),
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
  checkInDate: validDateSchema.optional(),
  checkOutDate: validDateSchema.optional(),
  numGuests: z.coerce.number().int().min(1).optional(),
  nightlyRate: z.coerce.number().min(0).optional(),
  depositAmount: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  specialRequests: z.string().optional().nullable(),
  status: z.enum(['confirmed', 'checked_in', 'checked_out', 'extended']).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

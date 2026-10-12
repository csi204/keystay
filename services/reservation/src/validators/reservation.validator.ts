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

// Phase 2: Check-in Validator (#36)
export const checkInReservationSchema = z.object({
  actualCheckIn: z.string().optional(),
  idCardNumber: z.string().optional().nullable(),
  depositAmount: z.coerce.number().min(0, 'Deposit amount must be non-negative').optional(),
  specialNotes: z.string().optional().nullable(),
});

// Phase 2: Check-out Validator (#37)
export const checkOutReservationSchema = z.object({
  actualCheckOut: z.string().optional(),
  keyCardReturned: z.coerce.boolean().optional().default(true),
  cleaningType: z.enum(['checkout_clean', 'deep_clean']).optional().default('checkout_clean'),
  priority: z.enum(['normal', 'high', 'urgent']).optional().default('normal'),
  specialNotes: z.string().optional().nullable(),
});

// Phase 2: Cancel Validator (#38)
export const cancelReservationSchema = z.object({
  reason: z.string().optional().nullable(),
});

// Phase 2: Modify Dates Validator (#39)
export const modifyDatesSchema = z
  .object({
    checkInDate: validDateSchema,
    checkOutDate: validDateSchema,
    reason: z.string().optional().nullable(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: 'checkOutDate must be after checkInDate',
    path: ['checkOutDate'],
  });

// Phase 2: Extend Stay Validator (#49)
export const extendStaySchema = z.object({
  newCheckOutDate: validDateSchema,
  additionalDeposit: z.coerce.number().min(0).optional().default(0),
  specialNotes: z.string().optional().nullable(),
});

// Phase 2: Upgrade Room Validator (#50)
export const upgradeRoomSchema = z.object({
  newRoomId: z.string().min(1, 'New Room ID is required'),
  newRoomNumber: z.string().min(1, 'New Room Number is required'),
  newRoomTypeName: z.string().min(1, 'New Room Type Name is required'),
  newNightlyRate: z.coerce.number().min(0, 'New nightly rate must be non-negative').optional(),
  reason: z.string().optional().nullable(),
});

// Phase 2: Walk-in Validator (#52)
export const walkInSchema = z
  .object({
    roomId: z.string().min(1, 'Room ID is required'),
    roomNumber: z.string().optional(),
    roomTypeName: z.string().optional(),
    guestId: z.string().optional(),
    guestName: z.string().min(1, 'Guest name is required'),
    guestPhone: z.string().optional().nullable(),
    guestEmail: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
    idCardNumber: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    checkInDate: validDateSchema.optional(),
    checkOutDate: validDateSchema,
    numGuests: z.coerce.number().int().min(1).default(1),
    nightlyRate: z.coerce.number().min(0, 'Nightly rate must be positive'),
    depositAmount: z.coerce.number().min(0).default(0),
    discountAmount: z.coerce.number().min(0).default(0),
    specialRequests: z.string().optional().nullable(),
  })
  .refine((data) => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const checkIn = data.checkInDate || today;
    return data.checkOutDate > checkIn;
  }, {
    message: 'checkOutDate must be after checkInDate',
    path: ['checkOutDate'],
  });

// Phase 2: Apply Discount Validator (#54)
export const applyDiscountSchema = z
  .object({
    discountAmount: z.coerce.number().min(0).optional(),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountReason: z.string().optional(),
    reason: z.string().optional(),
    discountCode: z.string().optional(),
  })
  .refine((data) => data.discountAmount !== undefined || data.discountPercent !== undefined, {
    message: 'Either discountAmount or discountPercent must be specified',
    path: ['discountAmount'],
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type CheckInReservationInput = z.infer<typeof checkInReservationSchema>;
export type CheckOutReservationInput = z.infer<typeof checkOutReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type ModifyDatesInput = z.infer<typeof modifyDatesSchema>;
export type ExtendStayInput = z.infer<typeof extendStaySchema>;
export type UpgradeRoomInput = z.infer<typeof upgradeRoomSchema>;
export type WalkInInput = z.infer<typeof walkInSchema>;
export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;

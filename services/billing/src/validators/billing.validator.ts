import { z } from 'zod';

export const createBillSchema = z.object({
  reservationId: z.string().min(1, 'Reservation ID is required'),
  guestName: z.string().min(1, 'Guest name is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  subtotal: z.coerce.number().min(0).optional(),
  depositDeducted: z.coerce.number().min(0).default(0),
  serviceChargeRate: z.coerce.number().min(0).max(1).optional(),
  taxRate: z.coerce.number().min(0).max(1).optional(),
  items: z
    .array(
      z.object({
        itemType: z.enum(['room_charge', 'minibar', 'laundry', 'room_service', 'damage', 'other']),
        description: z.string().min(1, 'Description is required'),
        quantity: z.coerce.number().int().min(1).default(1),
        unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
        itemDate: z.string().optional(),
      })
    )
    .optional(),
});

export const updateBillSchema = z.object({
  guestName: z.string().optional(),
  roomNumber: z.string().optional(),
  status: z.enum(['pending', 'partially_paid', 'paid', 'refunded', 'void']).optional(),
  depositDeducted: z.coerce.number().min(0).optional(),
});

export const addBillItemSchema = z.object({
  itemType: z.enum(['room_charge', 'minibar', 'laundry', 'room_service', 'damage', 'other']),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
  itemDate: z.string().optional(),
});

export const payBillSchema = z.object({
  paymentMethodId: z.string().optional(),
  paymentMethod: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Payment amount must be greater than 0').optional(),
  referenceNumber: z.string().optional(),
  depositDeducted: z.coerce.number().min(0).optional(),
});

export const applyBillDiscountSchema = z
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

export const refundBillSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Refund amount must be greater than 0'),
  reason: z.string().min(1, 'Refund reason is required'),
  paymentId: z.string().optional(),
});

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  isActive: z.boolean().default(true),
});

export const sendInvoiceEmailSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type AddBillItemInput = z.infer<typeof addBillItemSchema>;
export type PayBillInput = z.infer<typeof payBillSchema>;
export type ApplyBillDiscountInput = z.infer<typeof applyBillDiscountSchema>;
export type RefundBillInput = z.infer<typeof refundBillSchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;

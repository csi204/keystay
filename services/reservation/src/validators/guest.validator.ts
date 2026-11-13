import { z } from 'zod';

export const createGuestSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().min(3, 'Phone number must have at least 3 digits').optional().nullable(),
  idCardNumber: z.string().optional().nullable(),
  nationality: z.string().optional().nullable().default('Thai'),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateGuestSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(3).optional().nullable(),
  idCardNumber: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

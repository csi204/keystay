import { z } from 'zod';

export const OutsourceCategoryEnum = z.enum([
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
export type OutsourceCategory = z.infer<typeof OutsourceCategoryEnum>;

const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM');

export const CreateOutsourceContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: OutsourceCategoryEnum.optional(),
  // หลายหมวดหมู่ต่อ 1 คู่ค้า (หมวดแรกจะถูกใช้เป็น category หลักหากไม่ได้ระบุ category แยก)
  categories: z.array(OutsourceCategoryEnum).min(1).optional(),
  serviceType: z.string().min(1, 'Service type is required'),
  phonePrimary: z.string().min(1, 'Primary phone is required'),
  phoneSecondary: z.string().optional().nullable(),
  lineId: z.string().optional().nullable(),
  isEmergency: z
    .union([z.boolean(), z.number(), z.string()])
    .transform((v) => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v > 0 ? 1 : 0;
      return v.toLowerCase() === 'true' || v === '1' ? 1 : 0;
    })
    .default(0),
  availableHours: z.string().default('24 ชั่วโมง'),
  priceRateNote: z.string().optional().nullable(),
  openTime: TimeSchema.optional().nullable(),
  closeTime: TimeSchema.optional().nullable(),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z
    .union([z.boolean(), z.number(), z.string()])
    .transform((v) => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v > 0 ? 1 : 0;
      return v.toLowerCase() === 'true' || v === '1' ? 1 : 0;
    })
    .default(1),
});

export const UpdateOutsourceContactSchema = CreateOutsourceContactSchema.partial();


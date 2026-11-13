import { z } from 'zod';

export const AdjustmentTypeSchema = z.enum(['percent', 'fixed_amount']);

export const CreateSeasonalPricingRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'ต้องระบุชื่อกฎราคา'),
  tier: z.string().min(1, 'ต้องระบุ Tier (เช่น High Season, Special Holiday)'),
  roomTypeId: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate ต้องอยู่ในรูปแบบ YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate ต้องอยู่ในรูปแบบ YYYY-MM-DD'),
  daysOfWeek: z.array(z.number().min(0).max(6)).nullable().optional(),
  adjustmentType: AdjustmentTypeSchema,
  adjustmentValue: z.number(),
  priority: z.number().int().optional().default(10),
  isActive: z.union([z.boolean(), z.number()]).optional().default(true),
});

export const UpdateSeasonalPricingRuleSchema = z.object({
  name: z.string().min(1).optional(),
  tier: z.string().min(1).optional(),
  roomTypeId: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).nullable().optional(),
  adjustmentType: AdjustmentTypeSchema.optional(),
  adjustmentValue: z.number().optional(),
  priority: z.number().int().optional(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
});

export const CalculateRateSchema = z.object({
  room_type_id: z.string().min(1, 'ต้องระบุ room_type_id'),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'check_in_date ต้องอยู่ในรูปแบบ YYYY-MM-DD'),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'check_out_date ต้องอยู่ในรูปแบบ YYYY-MM-DD'),
});

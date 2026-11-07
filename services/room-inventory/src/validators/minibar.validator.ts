import { z } from 'zod';

export const MinibarCategoryEnum = z.enum([
  'เครื่องดื่ม',
  'แอลกอฮอล์',
  'ขนม',
  'อื่นๆ',
]);

export const CreateMinibarItemSchema = z.object({
  name: z.string().min(1, 'ชื่อสินค้าจำเป็นต้องระบุ').max(100),
  category: MinibarCategoryEnum,
  pricePerUnit: z.coerce.number().positive('ราคาต่อหน่วยต้องมากกว่า 0'),
  unit: z.string().min(1, 'หน่วยนับจำเป็นต้องระบุ').max(20),
  isActive: z.union([z.boolean(), z.number()]).optional().default(true),
});

export const UpdateMinibarItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: MinibarCategoryEnum.optional(),
  pricePerUnit: z.coerce.number().positive().optional(),
  unit: z.string().min(1).max(20).optional(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
});

export const MinibarQuerySchema = z.object({
  category: z.string().optional(),
  isActive: z.string().optional(), // 'true', 'false', '1', '0'
  search: z.string().optional(),
});

export type CreateMinibarItemInput = z.infer<typeof CreateMinibarItemSchema>;
export type UpdateMinibarItemInput = z.infer<typeof UpdateMinibarItemSchema>;
export type MinibarQueryInput = z.infer<typeof MinibarQuerySchema>;


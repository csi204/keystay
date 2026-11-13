import { z } from 'zod';

export const AmenityCategoryEnum = z.enum(['bedding', 'bath', 'appliance', 'food_drink', 'other']);

export const CreateAmenityCatalogSchema = z.object({
  id: z.string().optional(),
  nameTh: z.string().min(1, 'ต้องระบุชื่อภาษาไทย'),
  nameEn: z.string().min(1, 'ต้องระบุชื่อภาษาอังกฤษ'),
  category: AmenityCategoryEnum,
  isChargeable: z.union([z.boolean(), z.number()]).optional().default(false),
  unitPrice: z.number().min(0, 'ราคาต้องไม่ติดลบ').optional().default(0.0),
  unitNameTh: z.string().optional().default('ชิ้น'),
  unitNameEn: z.string().optional().default('piece'),
  stockQuantity: z.number().int().optional().default(-1),
  isActive: z.union([z.boolean(), z.number()]).optional().default(true),
});

export const UpdateAmenityCatalogSchema = z.object({
  nameTh: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  category: AmenityCategoryEnum.optional(),
  isChargeable: z.union([z.boolean(), z.number()]).optional(),
  unitPrice: z.number().min(0).optional(),
  unitNameTh: z.string().optional(),
  unitNameEn: z.string().optional(),
  stockQuantity: z.number().int().optional(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
});

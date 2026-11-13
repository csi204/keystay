import { z } from 'zod';

export const TaskTypeEnum = z.enum([
  'checkout_clean',
  'stayover_clean',
  'deep_clean',
  'inspection',
]);

export const TaskPriorityEnum = z.enum([
  'urgent',
  'high',
  'normal',
  'low',
]);

export const CreateTaskTemplateSchema = z.object({
  name: z.string().min(1, 'ชื่อแม่แบบงานจำเป็นต้องระบุ').max(100),
  taskType: TaskTypeEnum,
  defaultPriority: TaskPriorityEnum.default('normal'),
  estimatedMinutes: z.coerce.number().int().positive('ระยะเวลาโดยประมาณต้องมากกว่า 0 นาที').default(30),
  description: z.string().optional(),
  checklistItems: z.union([z.array(z.any()), z.string()]).optional().nullable(),
  isActive: z.union([z.boolean(), z.number()]).optional().default(true),
});

export const UpdateTaskTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  taskType: TaskTypeEnum.optional(),
  defaultPriority: TaskPriorityEnum.optional(),
  estimatedMinutes: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
  checklistItems: z.union([z.array(z.any()), z.string()]).optional().nullable(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
});

export const TaskTemplateQuerySchema = z.object({
  taskType: z.string().optional(),
  isActive: z.string().optional(), // 'true', 'false', '1', '0'
  search: z.string().optional(),
});

export type CreateTaskTemplateInput = z.infer<typeof CreateTaskTemplateSchema>;
export type UpdateTaskTemplateInput = z.infer<typeof UpdateTaskTemplateSchema>;
export type TaskTemplateQueryInput = z.infer<typeof TaskTemplateQuerySchema>;


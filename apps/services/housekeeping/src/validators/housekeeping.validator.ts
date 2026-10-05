import { z } from 'zod';

// ==========================================
// 1. Enums
// ==========================================
export const TaskTypeEnum = z.enum([
  'checkout_clean',
  'daily_clean',
  'deep_clean',
  'inspection',
]);
export type TaskType = z.infer<typeof TaskTypeEnum>;

export const TaskPriorityEnum = z.enum(['urgent', 'high', 'normal', 'low']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const TaskStatusEnum = z.enum([
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const StaffShiftEnum = z.enum(['day', 'night']);
export type StaffShift = z.infer<typeof StaffShiftEnum>;

export const IssueTypeEnum = z.enum(['damage', 'missing_item', 'malfunction', 'hygiene']);
export type IssueType = z.infer<typeof IssueTypeEnum>;

export const IssueSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type IssueSeverity = z.infer<typeof IssueSeverityEnum>;

export const IssueStatusEnum = z.enum(['open', 'acknowledged', 'resolved']);
export type IssueStatus = z.infer<typeof IssueStatusEnum>;

// ==========================================
// 2. Task Schemas
// ==========================================
export const CreateTaskSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  assignedTo: z.string().optional(),
  taskType: TaskTypeEnum.default('checkout_clean'),
  priority: TaskPriorityEnum.default('normal'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  notes: z.string().optional(),
  eventSource: z.string().default('manual'),
});

export const UpdateTaskSchema = z.object({
  roomNumber: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
  taskType: TaskTypeEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  notes: z.string().optional(),
  scheduledDate: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const AssignTaskSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  scheduledDate: z.string().optional(),
  priority: TaskPriorityEnum.optional(),
});

export const CompleteTaskSchema = z.object({
  inspectionStatus: z.enum(['passed', 'pending_inspection']).default('passed'),
  notes: z.string().optional(),
  completedBy: z.string().optional(),
});

// ==========================================
// 3. Staff Schemas
// ==========================================
export const CreateStaffSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  zone: z.string().default('All Floors'),
  shift: StaffShiftEnum.default('day'),
  isActive: z
    .union([z.boolean(), z.number(), z.string()])
    .transform((v) => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v > 0 ? 1 : 0;
      return v.toLowerCase() === 'true' || v === '1' ? 1 : 0;
    })
    .default(1),
  maxTasksPerDay: z.coerce.number().int().positive().default(10),
});

export const UpdateStaffSchema = CreateStaffSchema.partial();

export const UpdateStaffZoneSchema = z.object({
  zone: z.string().min(1, 'Zone is required'),
});

// ==========================================
// 4. Room Issue Schemas (Cloudflare R2)
// ==========================================
export const ReportIssueSchema = z.object({
  taskId: z.string().optional().nullable(),
  roomId: z.string().optional(),
  roomNumber: z.string().optional(),
  reportedBy: z.string().min(1, 'Reported by staff ID is required'),
  issueType: IssueTypeEnum,
  description: z.string().min(1, 'Description is required'),
  severity: IssueSeverityEnum.default('medium'),
  photoR2Key: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ==========================================
// 5. Schedule Schemas
// ==========================================
export const CreateScheduleSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  scheduleDate: z.string().min(1, 'Schedule date is required'),
  shift: StaffShiftEnum.default('day'),
  zoneAssigned: z.string().min(1, 'Zone assigned is required'),
  isDayOff: z
    .union([z.boolean(), z.string(), z.number()])
    .transform((v) => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v > 0 ? 1 : 0;
      return v.toLowerCase() === 'true' || v === '1' ? 1 : 0;
    })
    .default(0),
});


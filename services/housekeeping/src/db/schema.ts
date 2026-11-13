import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 1. Housekeeping Staff Table (พนักงานแม่บ้าน)
export const housekeepingStaff = sqliteTable('housekeeping_staff', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  zone: text('zone').notNull().default('All Floors'),
  shift: text('shift', { enum: ['day', 'night'] })
    .notNull()
    .default('day'),
  isActive: integer('is_active').notNull().default(1),
  maxTasksPerDay: integer('max_tasks_per_day').notNull().default(10),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 2. Housekeeping Tasks Table (ตารางงานทำความสะอาด)
export const housekeepingTasks = sqliteTable('housekeeping_tasks', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  roomNumber: text('room_number').notNull(),
  assignedTo: text('assigned_to').references(() => housekeepingStaff.id),
  taskType: text('task_type', {
    enum: ['checkout_clean', 'daily_clean', 'deep_clean', 'inspection'],
  })
    .notNull()
    .default('checkout_clean'),
  priority: text('priority', {
    enum: ['urgent', 'high', 'normal', 'low'],
  })
    .notNull()
    .default('normal'),
  status: text('status', {
    enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  notes: text('notes'),
  scheduledDate: text('scheduled_date').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  beforePhotoUrl: text('before_photo_url'),
  afterPhotoUrl: text('after_photo_url'),
  eventSource: text('event_source').notNull().default('manual'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 3. Room Issues Table (รายการแจ้งสิ่งของชำรุด/ปัญหาในห้องพัก & Lost & Found)
export const roomIssues = sqliteTable('room_issues', {
  id: text('id').primaryKey(),
  taskId: text('task_id').references(() => housekeepingTasks.id),
  roomId: text('room_id').notNull(),
  reportedBy: text('reported_by')
    .notNull()
    .references(() => housekeepingStaff.id),
  issueType: text('issue_type', {
    enum: ['damage', 'missing_item', 'malfunction', 'hygiene', 'lost_and_found'],
  }).notNull(),
  description: text('description').notNull(),
  photoR2Key: text('photo_r2_key'),
  severity: text('severity', {
    enum: ['low', 'medium', 'high', 'critical'],
  })
    .notNull()
    .default('medium'),
  status: text('status', {
    enum: ['open', 'acknowledged', 'resolved', 'expired_claimed'],
  })
    .notNull()
    .default('open'),
  storageLocation: text('storage_location').default('Front Desk Counter'),
  retentionDays: integer('retention_days').default(7),
  receivedByName: text('received_by_name'),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull(),
});

// 4. Housekeeping Schedule Table (ตารางกะการทำงาน)
export const housekeepingSchedule = sqliteTable('housekeeping_schedule', {
  id: text('id').primaryKey(),
  staffId: text('staff_id')
    .notNull()
    .references(() => housekeepingStaff.id),
  scheduleDate: text('schedule_date').notNull(),
  shift: text('shift').notNull().default('day'),
  zoneAssigned: text('zone_assigned').notNull(),
  isDayOff: integer('is_day_off').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

// 5. Outbox Events Table (Transactional Outbox Pattern)
export const outboxEvents = sqliteTable('outbox_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('pending'),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull(),
});

// 6. Outsource Contacts Table (สมุดรายชื่อคู่ค้า/ช่าง/คนสวนภายนอก)
export const outsourceContacts = sqliteTable('outsource_contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', {
    enum: [
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
    ],
  }).notNull(),
  serviceType: text('service_type').notNull(),
  phonePrimary: text('phone_primary').notNull(),
  phoneSecondary: text('phone_secondary'),
  lineId: text('line_id'),
  isEmergency: integer('is_emergency').notNull().default(0),
  categories: text('categories'), // JSON array เช่น '["air_conditioning","general_maintenance"]'
  availableHours: text('available_hours').default('24 ชั่วโมง'),
  openTime: text('open_time'), // HH:MM
  closeTime: text('close_time'), // HH:MM
  priceRateNote: text('price_rate_note'),
  rating: real('rating').default(5.0),
  address: text('address'),
  notes: text('notes'),
  isActive: integer('is_active').notNull().default(1),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 7. Task Templates Table (แม่แบบงานมาตรฐาน SOP สำหรับแม่บ้าน - กำหนดโดย Front Desk & Owner)
export const taskTemplates = sqliteTable('task_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  taskType: text('task_type', {
    enum: ['checkout_clean', 'stayover_clean', 'deep_clean', 'inspection'],
  }).notNull(),
  defaultPriority: text('default_priority', {
    enum: ['urgent', 'high', 'normal', 'low'],
  })
    .notNull()
    .default('normal'),
  estimatedMinutes: integer('estimated_minutes').notNull().default(30),
  description: text('description'),
  checklistItems: text('checklist_items'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 8. Amenity Requests Table (รายการขอของใช้และบริการเสริมจากลูกค้า/ฟรอนต์)
export const amenityRequests = sqliteTable('amenity_requests', {
  id: text('id').primaryKey(),
  roomNumber: text('room_number').notNull(),
  reservationId: text('reservation_id'),
  amenityId: text('amenity_id').notNull(),
  amenityName: text('amenity_name').notNull(),
  category: text('category').notNull().default('other'),
  quantity: integer('quantity').notNull().default(1),
  isChargeable: integer('is_chargeable').notNull().default(0), // 0 = ฟรี, 1 = มีค่าใช้จ่าย
  unitPrice: real('unit_price').notNull().default(0.0),
  totalPrice: real('total_price').notNull().default(0.0),
  status: text('status', {
    enum: ['pending', 'preparing', 'delivered', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  requestedBy: text('requested_by').default('Front Desk'),
  assignedTo: text('assigned_to').references(() => housekeepingStaff.id),
  notes: text('notes'),
  deliveredAt: text('delivered_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type HousekeepingStaff = typeof housekeepingStaff.$inferSelect;
export type NewHousekeepingStaff = typeof housekeepingStaff.$inferInsert;

export type HousekeepingTask = typeof housekeepingTasks.$inferSelect;
export type NewHousekeepingTask = typeof housekeepingTasks.$inferInsert;

export type RoomIssue = typeof roomIssues.$inferSelect;
export type NewRoomIssue = typeof roomIssues.$inferInsert;

export type HousekeepingSchedule = typeof housekeepingSchedule.$inferSelect;
export type NewHousekeepingSchedule = typeof housekeepingSchedule.$inferInsert;

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;

export type OutsourceContact = typeof outsourceContacts.$inferSelect;
export type NewOutsourceContact = typeof outsourceContacts.$inferInsert;

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;

export type AmenityRequest = typeof amenityRequests.$inferSelect;
export type NewAmenityRequest = typeof amenityRequests.$inferInsert;

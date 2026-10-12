import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 1. Daily Stats Table
export const dailyStats = sqliteTable('daily_stats', {
  id: text('id').primaryKey(),
  statDate: text('stat_date').notNull().unique(),
  totalRooms: integer('total_rooms').notNull().default(0),
  occupiedRooms: integer('occupied_rooms').notNull().default(0),
  availableRooms: integer('available_rooms').notNull().default(0),
  reservedRooms: integer('reserved_rooms').notNull().default(0),
  maintenanceRooms: integer('maintenance_rooms').notNull().default(0),
  occupancyRate: real('occupancy_rate').notNull().default(0),
  totalCheckins: integer('total_checkins').notNull().default(0),
  totalCheckouts: integer('total_checkouts').notNull().default(0),
  totalCancellations: integer('total_cancellations').notNull().default(0),
  totalWalkIns: integer('total_walk_ins').notNull().default(0),
  totalRevenue: real('total_revenue').notNull().default(0),
  roomRevenue: real('room_revenue').notNull().default(0),
  minibarRevenue: real('minibar_revenue').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 2. Revenue Records Table
export const revenueRecords = sqliteTable('revenue_records', {
  id: text('id').primaryKey(),
  recordDate: text('record_date').notNull(),
  reservationId: text('reservation_id'),
  billId: text('bill_id'),
  roomTypeName: text('room_type_name'),
  revenueType: text('revenue_type', { enum: ['room_charge', 'service', 'minibar', 'refund'] }).notNull(),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method'),
  createdAt: text('created_at').notNull(),
});

// 3. Monthly Summary Table
export const monthlySummary = sqliteTable('monthly_summary', {
  id: text('id').primaryKey(),
  yearMonth: text('year_month').notNull().unique(),
  totalRevenue: real('total_revenue').notNull().default(0),
  netRevenue: real('net_revenue').notNull().default(0),
  avgOccupancyRate: real('avg_occupancy_rate').notNull().default(0),
  totalReservations: integer('total_reservations').notNull().default(0),
  cancellationRate: real('cancellation_rate').notNull().default(0),
  avgStayDuration: real('avg_stay_duration').notNull().default(0),
  totalGuests: integer('total_guests').notNull().default(0),
  adr: real('adr').notNull().default(0),
  revpar: real('revpar').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 4. Room Performance Table
export const roomPerformance = sqliteTable('room_performance', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  roomNumber: text('room_number').notNull(),
  roomTypeName: text('room_type_name'),
  yearMonth: text('year_month').notNull(),
  totalBookings: integer('total_bookings').notNull().default(0),
  totalNightsSold: integer('total_nights_sold').notNull().default(0),
  totalRevenue: real('total_revenue').notNull().default(0),
  maintenanceDays: integer('maintenance_days').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 5. Guest Demographics Table
export const guestDemographics = sqliteTable('guest_demographics', {
  id: text('id').primaryKey(),
  yearMonth: text('year_month').notNull(),
  nationality: text('nationality').notNull(),
  guestCount: integer('guest_count').notNull().default(0),
  totalRevenue: real('total_revenue').notNull().default(0),
  avgStayNights: real('avg_stay_nights').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 6. Housekeeping Performance Table
export const housekeepingPerformance = sqliteTable('housekeeping_performance', {
  id: text('id').primaryKey(),
  staffId: text('staff_id').notNull(),
  staffName: text('staff_name').notNull(),
  recordDate: text('record_date').notNull(),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  avgDurationMinutes: real('avg_duration_minutes').notNull().default(0),
  issuesReported: integer('issues_reported').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 7. Audit Events Table
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  sourceService: text('source_service').notNull(),
  performedBy: text('performed_by'),
  ipAddress: text('ip_address'),
  payload: text('payload').notNull(),
  receivedAt: text('received_at').notNull(),
});

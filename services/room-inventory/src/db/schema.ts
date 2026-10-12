import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 1. Room Types Table (ประเภทห้องพัก)
export const roomTypes = sqliteTable('room_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  basePrice: real('base_price').notNull(),
  maxOccupancy: integer('max_occupancy').notNull().default(2),
  bedType: text('bed_type').notNull(),
  sizeSqm: real('size_sqm').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 2. Floors Table (ชั้น)
export const floors = sqliteTable('floors', {
  id: text('id').primaryKey(),
  floorNumber: integer('floor_number').notNull().unique(),
  name: text('name').notNull(),
  totalRooms: integer('total_rooms').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

// 3. Rooms Table (ห้องพัก 22 ห้อง)
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  roomNumber: text('room_number').notNull().unique(),
  roomTypeId: text('room_type_id')
    .notNull()
    .references(() => roomTypes.id),
  floorId: text('floor_id')
    .notNull()
    .references(() => floors.id),
  status: text('status', {
    enum: [
      'available',
      'reserved',
      'occupied',
      'checked_out',
      'cleaning',
      'maintenance',
      'out_of_order',
    ],
  })
    .notNull()
    .default('available'),
  isActive: integer('is_active').notNull().default(1),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 4. Room Amenities Table (สิ่งอำนวยความสะดวก)
export const roomAmenities = sqliteTable('room_amenities', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  amenityName: text('amenity_name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

// 5. Room Status History Table (ประวัติการเปลี่ยนสถานะห้องพัก)
export const roomStatusHistory = sqliteTable('room_status_history', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  previousStatus: text('previous_status').notNull(),
  newStatus: text('new_status').notNull(),
  changedBy: text('changed_by'),
  changeReason: text('change_reason'),
  eventSource: text('event_source').notNull().default('manual'),
  createdAt: text('created_at').notNull(),
});

// 6. Outbox Events Table (สำหรับ Transactional Outbox Pattern)
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

export type RoomType = typeof roomTypes.$inferSelect;
export type NewRoomType = typeof roomTypes.$inferInsert;

export type Floor = typeof floors.$inferSelect;
export type NewFloor = typeof floors.$inferInsert;

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type RoomAmenity = typeof roomAmenities.$inferSelect;
export type NewRoomAmenity = typeof roomAmenities.$inferInsert;

export type RoomStatusHistory = typeof roomStatusHistory.$inferSelect;
export type NewRoomStatusHistory = typeof roomStatusHistory.$inferInsert;

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;

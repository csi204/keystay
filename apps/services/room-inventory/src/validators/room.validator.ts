import { z } from 'zod';

// Room Status enum schema
export const RoomStatusEnum = z.enum([
  'available',
  'reserved',
  'occupied',
  'checked_out',
  'cleaning',
  'maintenance',
  'out_of_order',
]);

// 1. Room Type Validators
export const CreateRoomTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  basePrice: z.coerce.number().positive('Base price must be positive'),
  maxOccupancy: z.coerce.number().int().positive().default(2),
  bedType: z.string().min(1, 'Bed type is required'),
  sizeSqm: z.coerce.number().positive('Size in SQM must be positive'),
});

export const UpdateRoomTypeSchema = CreateRoomTypeSchema.partial();

// 2. Floor Validators
export const CreateFloorSchema = z.object({
  floorNumber: z.coerce.number().int(),
  name: z.string().min(1, 'Floor name is required'),
  totalRooms: z.coerce.number().int().default(0),
});

// 3. Room Validators
export const CreateRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  roomTypeId: z.string().min(1, 'Room type ID is required'),
  floorId: z.string().min(1, 'Floor ID is required'),
  notes: z.string().optional(),
});

export const UpdateRoomSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  roomTypeId: z.string().min(1).optional(),
  floorId: z.string().min(1).optional(),
  notes: z.string().optional(),
  isActive: z.coerce.number().int().min(0).max(1).optional(),
});

export const UpdateRoomStatusSchema = z.object({
  status: RoomStatusEnum,
  changedBy: z.string().optional(),
  changeReason: z.string().optional(),
});

export const UpdateRoomMaintenanceSchema = z.object({
  inMaintenance: z.coerce.boolean(),
  reason: z.string().optional(),
  changedBy: z.string().optional(),
});

// 4. Amenity Validators
export const CreateAmenitySchema = z.object({
  amenityName: z.string().min(1, 'Amenity name is required'),
  description: z.string().optional(),
});

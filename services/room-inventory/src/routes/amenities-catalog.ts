import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../db/client';
import { amenitiesCatalog, type AmenityCatalogItem } from '../db/schema';
import {
  CreateAmenityCatalogSchema,
  UpdateAmenityCatalogSchema,
} from '../validators/amenities-catalog.validator';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

export const amenitiesCatalogRoute = new Hono<{ Bindings: Env }>();

// Initial 4 Seed Amenities
export const SEED_AMENITIES_CATALOG = [
  {
    id: 'am-extra-bed',
    nameTh: 'เตียงเสริม',
    nameEn: 'Extra Bed',
    category: 'bedding' as const,
    isChargeable: 1,
    unitPrice: 300.0,
    unitNameTh: 'หลัง',
    unitNameEn: 'unit',
    stockQuantity: 5,
    isActive: 1,
  },
  {
    id: 'am-extra-pillow',
    nameTh: 'หมอนหนุนเสริม',
    nameEn: 'Extra Pillow',
    category: 'bedding' as const,
    isChargeable: 0,
    unitPrice: 0.0,
    unitNameTh: 'ใบ',
    unitNameEn: 'piece',
    stockQuantity: 30,
    isActive: 1,
  },
  {
    id: 'am-hair-dryer',
    nameTh: 'ไดร์เป่าผมพลังไอออน',
    nameEn: 'Ionic Hair Dryer',
    category: 'appliance' as const,
    isChargeable: 0,
    unitPrice: 0.0,
    unitNameTh: 'เครื่อง',
    unitNameEn: 'unit',
    stockQuantity: 15,
    isActive: 1,
  },
  {
    id: 'am-premium-dental',
    nameTh: 'เซ็ตแปรงสีฟันพรีเมียม',
    nameEn: 'Premium Dental Kit',
    category: 'bath' as const,
    isChargeable: 1,
    unitPrice: 50.0,
    unitNameTh: 'ชุด',
    unitNameEn: 'set',
    stockQuantity: 50,
    isActive: 1,
  },
];

async function ensureSeeded(db: any) {
  const existing = await db.select().from(amenitiesCatalog).limit(1).all();
  if (existing.length === 0) {
    const now = new Date().toISOString();
    for (const item of SEED_AMENITIES_CATALOG) {
      await db.insert(amenitiesCatalog).values({
        ...item,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
  }
}

function mapAmenityToDto(item: AmenityCatalogItem) {
  return {
    id: item.id,
    nameTh: item.nameTh,
    nameEn: item.nameEn,
    category: item.category,
    isChargeable: Boolean(item.isChargeable),
    unitPrice: item.unitPrice,
    unitNameTh: item.unitNameTh,
    unitNameEn: item.unitNameEn,
    stockQuantity: item.stockQuantity,
    isActive: Boolean(item.isActive),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// 1. GET / - ดึงรายการของใช้และบริการเสริมทั้งหมด
amenitiesCatalogRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const category = c.req.query('category');
  const isChargeableQuery = c.req.query('is_chargeable') ?? c.req.query('isChargeable');
  const isActiveQuery = c.req.query('is_active') ?? c.req.query('isActive');

  let rows = await db.select().from(amenitiesCatalog).orderBy(desc(amenitiesCatalog.createdAt)).all();

  if (category) {
    rows = rows.filter((r) => r.category === category);
  }

  if (isChargeableQuery !== undefined && isChargeableQuery !== '') {
    const isCh = isChargeableQuery === '1' || isChargeableQuery.toLowerCase() === 'true';
    rows = rows.filter((r) => Boolean(r.isChargeable) === isCh);
  }

  if (isActiveQuery !== undefined && isActiveQuery !== '') {
    const isAct = isActiveQuery === '1' || isActiveQuery.toLowerCase() === 'true';
    rows = rows.filter((r) => Boolean(r.isActive) === isAct);
  }

  return c.json({
    success: true,
    data: rows.map(mapAmenityToDto),
  });
});

// 2. GET /:id - รายละเอียดตาม ID
amenitiesCatalogRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(amenitiesCatalog).where(eq(amenitiesCatalog.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: `Amenity item '${id}' not found` }, 404);
  }

  return c.json({
    success: true,
    data: mapAmenityToDto(existing),
  });
});

// 3. POST / - เพิ่มรายการของใช้ในแคตตาล็อกใหม่
amenitiesCatalogRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateAmenityCatalogSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const now = new Date().toISOString();
  const id = parsed.data.id || `am-${Date.now().toString().slice(-6)}`;

  const isChargeableVal = parsed.data.isChargeable === true || parsed.data.isChargeable === 1 ? 1 : 0;
  const isActiveVal = parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1;

  const newItem = {
    id,
    nameTh: parsed.data.nameTh,
    nameEn: parsed.data.nameEn,
    category: parsed.data.category,
    isChargeable: isChargeableVal,
    unitPrice: isChargeableVal ? parsed.data.unitPrice ?? 0.0 : 0.0,
    unitNameTh: parsed.data.unitNameTh ?? 'ชิ้น',
    unitNameEn: parsed.data.unitNameEn ?? 'piece',
    stockQuantity: parsed.data.stockQuantity ?? -1,
    isActive: isActiveVal,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(amenitiesCatalog).values(newItem).run();

  return c.json(
    {
      success: true,
      message: 'Amenity created successfully',
      data: mapAmenityToDto(newItem as any),
    },
    201,
  );
});

// 4. PUT /:id - แก้ไขรายการของใช้
amenitiesCatalogRoute.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdateAmenityCatalogSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(amenitiesCatalog).where(eq(amenitiesCatalog.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: `Amenity item '${id}' not found` }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Partial<AmenityCatalogItem> = {
    updatedAt: now,
  };

  if (parsed.data.nameTh !== undefined) updateData.nameTh = parsed.data.nameTh;
  if (parsed.data.nameEn !== undefined) updateData.nameEn = parsed.data.nameEn;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.isChargeable !== undefined) {
    updateData.isChargeable = parsed.data.isChargeable === true || parsed.data.isChargeable === 1 ? 1 : 0;
  }
  if (parsed.data.unitPrice !== undefined) updateData.unitPrice = parsed.data.unitPrice;
  if (parsed.data.unitNameTh !== undefined) updateData.unitNameTh = parsed.data.unitNameTh;
  if (parsed.data.unitNameEn !== undefined) updateData.unitNameEn = parsed.data.unitNameEn;
  if (parsed.data.stockQuantity !== undefined) updateData.stockQuantity = parsed.data.stockQuantity;
  if (parsed.data.isActive !== undefined) {
    updateData.isActive = parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1;
  }

  await db.update(amenitiesCatalog).set(updateData).where(eq(amenitiesCatalog.id, id)).run();

  const updated = await db.select().from(amenitiesCatalog).where(eq(amenitiesCatalog.id, id)).get();

  return c.json({
    success: true,
    message: 'Amenity updated successfully',
    data: mapAmenityToDto(updated!),
  });
});

// 5. DELETE /:id - ปิดการใช้งาน (Soft delete) หรือ Hard delete
amenitiesCatalogRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const hard = c.req.query('hard') === 'true';
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(amenitiesCatalog).where(eq(amenitiesCatalog.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: `Amenity item '${id}' not found` }, 404);
  }

  if (hard) {
    await db.delete(amenitiesCatalog).where(eq(amenitiesCatalog.id, id)).run();
    return c.json({ success: true, message: 'Amenity permanently deleted' });
  }

  const now = new Date().toISOString();
  await db.update(amenitiesCatalog).set({ isActive: 0, updatedAt: now }).where(eq(amenitiesCatalog.id, id)).run();

  return c.json({
    success: true,
    message: 'Amenity deactivated successfully',
    data: { id, isActive: false },
  });
});

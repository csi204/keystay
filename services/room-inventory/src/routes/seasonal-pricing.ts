import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { seasonalPricingRules, roomTypes, type SeasonalPricingRule } from '../db/schema';
import {
  CreateSeasonalPricingRuleSchema,
  UpdateSeasonalPricingRuleSchema,
  CalculateRateSchema,
} from '../validators/pricing.validator';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

export const seasonalPricingRoute = new Hono<{ Bindings: Env }>();

// Initial Seed Rules
export const SEED_PRICING_RULES = [
  {
    id: 'rule-high-winter',
    name: 'High Season ภาคเหนือ (พ.ย.-ก.พ.)',
    tier: 'High Season',
    roomTypeId: null,
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    daysOfWeek: null,
    adjustmentType: 'percent' as const,
    adjustmentValue: 5.0,
    priority: 10,
    isActive: 1,
  },
  {
    id: 'rule-countdown',
    name: 'คืนเคานต์ดาวน์ปีใหม่',
    tier: 'Special Holiday',
    roomTypeId: null,
    startDate: '2026-12-31',
    endDate: '2027-01-01',
    daysOfWeek: null,
    adjustmentType: 'fixed_amount' as const,
    adjustmentValue: 300.0,
    priority: 25,
    isActive: 1,
  },
];

async function ensureSeeded(db: any) {
  const existing = await db.select().from(seasonalPricingRules).limit(1).all();
  if (existing.length === 0) {
    const now = new Date().toISOString();
    for (const rule of SEED_PRICING_RULES) {
      await db.insert(seasonalPricingRules).values({
        ...rule,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
  }
}

function mapRuleToDto(r: SeasonalPricingRule) {
  let parsedDays: number[] | null = null;
  if (r.daysOfWeek) {
    try {
      parsedDays = JSON.parse(r.daysOfWeek);
    } catch {
      parsedDays = null;
    }
  }
  return {
    id: r.id,
    name: r.name,
    tier: r.tier,
    roomTypeId: r.roomTypeId,
    startDate: r.startDate,
    endDate: r.endDate,
    daysOfWeek: parsedDays,
    adjustmentType: r.adjustmentType,
    adjustmentValue: r.adjustmentValue,
    priority: r.priority,
    isActive: Boolean(r.isActive),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// 1. GET /rules - ดึงรายการกฎราคาทั้งหมด
seasonalPricingRoute.get('/rules', async (c) => {
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const rules = await db
    .select()
    .from(seasonalPricingRules)
    .orderBy(desc(seasonalPricingRules.priority), desc(seasonalPricingRules.createdAt))
    .all();

  return c.json({
    success: true,
    data: rules.map(mapRuleToDto),
  });
});

// 2. POST /rules - เพิ่มกฎราคาใหม่
seasonalPricingRoute.post('/rules', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateSeasonalPricingRuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const now = new Date().toISOString();
  const id = parsed.data.id || `rule-${Date.now().toString().slice(-6)}`;

  const newRule = {
    id,
    name: parsed.data.name,
    tier: parsed.data.tier,
    roomTypeId: parsed.data.roomTypeId ?? null,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    daysOfWeek: parsed.data.daysOfWeek ? JSON.stringify(parsed.data.daysOfWeek) : null,
    adjustmentType: parsed.data.adjustmentType,
    adjustmentValue: parsed.data.adjustmentValue,
    priority: parsed.data.priority ?? 10,
    isActive: parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(seasonalPricingRules).values(newRule).run();

  return c.json(
    {
      success: true,
      message: 'Seasonal pricing rule created successfully',
      data: mapRuleToDto(newRule as any),
    },
    201,
  );
});

// 3. PUT /rules/:id - แก้ไขกฎราคา
seasonalPricingRoute.put('/rules/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdateSeasonalPricingRuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(seasonalPricingRules).where(eq(seasonalPricingRules.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: `Rule '${id}' not found` }, 404);
  }

  const now = new Date().toISOString();
  const updateData: Partial<SeasonalPricingRule> = {
    updatedAt: now,
  };

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.tier !== undefined) updateData.tier = parsed.data.tier;
  if (parsed.data.roomTypeId !== undefined) updateData.roomTypeId = parsed.data.roomTypeId;
  if (parsed.data.startDate !== undefined) updateData.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updateData.endDate = parsed.data.endDate;
  if (parsed.data.daysOfWeek !== undefined) {
    updateData.daysOfWeek = parsed.data.daysOfWeek ? JSON.stringify(parsed.data.daysOfWeek) : null;
  }
  if (parsed.data.adjustmentType !== undefined) updateData.adjustmentType = parsed.data.adjustmentType;
  if (parsed.data.adjustmentValue !== undefined) updateData.adjustmentValue = parsed.data.adjustmentValue;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.isActive !== undefined) {
    updateData.isActive = parsed.data.isActive === false || parsed.data.isActive === 0 ? 0 : 1;
  }

  await db.update(seasonalPricingRules).set(updateData).where(eq(seasonalPricingRules.id, id)).run();

  const updated = await db.select().from(seasonalPricingRules).where(eq(seasonalPricingRules.id, id)).get();

  return c.json({
    success: true,
    message: 'Seasonal pricing rule updated successfully',
    data: mapRuleToDto(updated!),
  });
});

// 4. DELETE /rules/:id - ปิดการใช้งาน (Soft delete) หรือ Hard delete
seasonalPricingRoute.delete('/rules/:id', async (c) => {
  const id = c.req.param('id');
  const hard = c.req.query('hard') === 'true';
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  const existing = await db.select().from(seasonalPricingRules).where(eq(seasonalPricingRules.id, id)).get();
  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: `Rule '${id}' not found` }, 404);
  }

  if (hard) {
    await db.delete(seasonalPricingRules).where(eq(seasonalPricingRules.id, id)).run();
    return c.json({ success: true, message: 'Rule permanently deleted' });
  }

  const now = new Date().toISOString();
  await db.update(seasonalPricingRules).set({ isActive: 0, updatedAt: now }).where(eq(seasonalPricingRules.id, id)).run();

  return c.json({
    success: true,
    message: 'Rule deactivated successfully',
    data: { id, isActive: false },
  });
});

// 5. POST /calculate-rate - ระบบช่วยคำนวณราคาห้องพักตามช่วงเวลา
seasonalPricingRoute.post('/calculate-rate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CalculateRateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() }, 400);
  }

  const { room_type_id, check_in_date, check_out_date } = parsed.data;
  const db = getDb(c.env.DB);
  await ensureSeeded(db);

  // ดึงข้อมูล Room Type เพื่อทราบราคาฐาน (base_price)
  const rType = await db.select().from(roomTypes).where(eq(roomTypes.id, room_type_id)).get();
  const basePrice = rType ? rType.basePrice : 1500.0;

  // ดึงกฎราคาที่เปิดใช้งานอยู่
  const activeRules = await db
    .select()
    .from(seasonalPricingRules)
    .where(eq(seasonalPricingRules.isActive, 1))
    .orderBy(desc(seasonalPricingRules.priority))
    .all();

  // สร้าง array วันที่พัก (คืนที่เข้าพัก: ตั้งแต่วันที่ check_in ถึงก่อน check_out)
  const start = new Date(check_in_date);
  const end = new Date(check_out_date);

  if (start >= end) {
    return c.json({ success: false, error: 'INVALID_DATES', message: 'check_out_date ต้องมากกว่า check_in_date' }, 400);
  }

  const dailyBreakdown: Array<{
    date: string;
    rate: number;
    ruleName: string;
    tier: string;
    adjustment: string;
  }> = [];

  let totalRoomCharge = 0;
  const cur = new Date(start);

  while (cur < end) {
    const curDateStr = cur.toISOString().split('T')[0];
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

    // ค้นหากฎที่ตรงกับวันปัจจุบัน (優先度สูงสุดตาม Priority)
    let matchedRule: SeasonalPricingRule | null = null;

    for (const rule of activeRules) {
      // ตรวจสอบ Room Type (null = global หรือตรงกับห้องที่เลือก)
      if (rule.roomTypeId && rule.roomTypeId !== room_type_id) {
        continue;
      }

      // ตรวจสอบช่วงวันที่
      if (curDateStr < rule.startDate || curDateStr > rule.endDate) {
        continue;
      }

      // ตรวจสอบวันในสัปดาห์ (ถ้ามีระบุ)
      if (rule.daysOfWeek) {
        try {
          const allowedDays: number[] = JSON.parse(rule.daysOfWeek);
          if (Array.isArray(allowedDays) && !allowedDays.includes(dayOfWeek)) {
            continue;
          }
        } catch {
          // parse error, skip
        }
      }

      matchedRule = rule;
      break; // พบกฎ Priority สูงสุดที่ match แล้ว
    }

    let rate = basePrice;
    let ruleName = 'ราคามาตรฐาน (Standard)';
    let tier = 'Regular';
    let adjustment = '0฿';

    if (matchedRule) {
      ruleName = matchedRule.name;
      tier = matchedRule.tier;

      if (matchedRule.adjustmentType === 'percent') {
        const diff = (basePrice * matchedRule.adjustmentValue) / 100;
        rate = Math.round((basePrice + diff) * 100) / 100;
        adjustment = `${matchedRule.adjustmentValue >= 0 ? '+' : ''}${matchedRule.adjustmentValue}%`;
      } else {
        rate = Math.round((basePrice + matchedRule.adjustmentValue) * 100) / 100;
        adjustment = `${matchedRule.adjustmentValue >= 0 ? '+' : ''}${matchedRule.adjustmentValue}฿`;
      }
    }

    dailyBreakdown.push({
      date: curDateStr,
      rate,
      ruleName,
      tier,
      adjustment,
    });

    totalRoomCharge += rate;
    cur.setDate(cur.getDate() + 1);
  }

  const totalNights = dailyBreakdown.length;
  const averageNightlyRate = totalNights > 0 ? Math.round((totalRoomCharge / totalNights) * 100) / 100 : basePrice;

  return c.json({
    success: true,
    roomTypeId: room_type_id,
    basePrice,
    totalNights,
    dailyBreakdown,
    totalRoomCharge,
    averageNightlyRate,
  });
});

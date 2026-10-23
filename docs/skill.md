# SKILL.md — Hotel Management System

> ไฟล์นี้คือ "คู่มือกฎ" สำหรับใครก็ตามที่เขียนโค้ดในโปรเจกต์นี้ (คนหรือ AI assistant) อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง แล้วไปอ่านไฟล์ที่เกี่ยวข้องเพิ่มตามหมวดงาน

## อ่านไฟล์ไหนต่อ ตามงานที่ทำ

| กำลังจะทำอะไร | อ่านไฟล์ |
|---|---|
| ดูภาพรวมโปรเจกต์ทั้งหมด (spec, UML, ERD, UAT) | `README.md` (root ของ repo) |
| เข้าใจภาพรวมสถาปัตยกรรม/เหตุผลการออกแบบ | `docs/design.md` |
| ทำ UI, สี, font, component, Status Badge | `docs/designsystem.md` |
| หา path ไฟล์ว่าวางตรงไหนใน monorepo | `docs/structure.md` |
| เขียนหน้าเว็บ/component ฝั่ง Front Desk, Housekeeping, Billing, Manager | `docs/design.md` + `docs/designsystem.md` |
| เขียน service ฝั่ง backend (Cloudflare Workers + D1) | `docs/systemdesign.md` |
| ดูแผนแบ่งงาน, Phase, ใครรับผิดชอบ service ไหน | `docs/อ่านก่อนทำงาน.md` |
| ดู Test Cases, เกณฑ์การทดสอบ, UAT ฉบับละเอียด | `docs/uat.md` |
| ติดตั้งครั้งแรกหรือ setup เครื่องใหม่ | `docs/How to Install and Command.md` |

> `README.md` อยู่ที่ **root** ของ repo — ไม่ได้อยู่ใน `docs/`

## กฎเหล็ก 7 ข้อ ที่ห้ามฝ่าฝืนไม่ว่าจะทำงานหมวดไหน

1. **Database-per-service** — ห้าม service ไหน query ข้าม D1 ของ service อื่นตรงๆ เด็ดขาด ต้องสื่อสารผ่าน **Upstash QStash (Pub/Sub Event Bus)** หรือ HTTP Service Binding เท่านั้น (ดูเหตุผลใน `design.md`)

2. **Outbox Pattern ด้วย Drizzle `db.batch()`** — ทุกครั้งที่มีการเปลี่ยนสถานะสำคัญ ต้องบันทึกข้อมูลหลักคู่กับ `INSERT INTO outbox_events` เสมอ โดย**ห้ามใช้ interactive transaction (`db.transaction()`) บน Cloudflare D1** เพื่อป้องกันปัญหา Lock Timeout ให้ใช้ **`await db.batch([stmt1, stmt2])`** ของ Drizzle ORM ซึ่งทำงานเป็น Atomic Unit ในเที่ยวเดียว 100%

3. **Room State Machine & Date Range Availability**
   - **`rooms.status` ในตาราง `rooms`** คือสถานะทางกายภาพ **ณ วินาทีปัจจุบัน** (Real-time Today Status) เท่านั้น (7 สถานะ: `available`, `reserved`, `occupied`, `checked_out`, `cleaning`, `maintenance`, `out_of_order`)
   - **การจองล่วงหน้า (Advance Booking)** ต้องตรวจสอบห้องว่างจาก **ช่วงวันที่ (`check_in_date` ถึง `check_out_date`)** ในตาราง `reservations` ห้ามไปแก้ `rooms.status` ของวันข้างหน้าล่วงหน้าเด็ดขาด
   - **ตอน Check-out** ห้องต้องเปลี่ยนเป็น `checked_out` ทันทีที่แขกคืนกุญแจ โดย Room Inventory เป็นหนึ่งใน Subscriber ที่รับ Event จาก Check-out

4. **RBAC ตาม 4 บทบาทหลัก (ไม่มี Role Billing แยก)** — สิทธิ์ในระบบแบ่งเป็น 4 บทบาท:
   - `admin`: ดูแลระบบทั้งหมด, จัดการผู้ใช้, ดูแล Infrastructure, จัดการ Master Data ข้อมูลช่างและคู่ค้า Outsource (Full CRUD)
   - `manager`: ดูแลสถิติ, KPI Dashboard, อนุมัติส่วนลดพิเศษ, ตรวจสอบสัญญาคู่ค้า Outsource
   - `front_desk`: **รวมงาน Front Office + Cashiering/Billing** (จอง, เช็คอิน, เช็คเอาท์, เพิ่มค่ามินิบาร์, รับชำระเงิน, ออกใบเสร็จ) พร้อมสิทธิ์ Read-Only ดูเบอร์และโทรเรียกช่าง Outsource ฉุกเฉิน 24 ชม.
   - `housekeeping`: ตรวจสอบงานทำความสะอาด, รับงาน, บันทึกงานเสร็จ, แจ้งสิ่งชำรุด พร้อมสิทธิ์ Read-Only ดูเบอร์ช่าง Outsource เฉพาะทางเพื่อประสานงานซ่อมหน้างาน

5. **ห้ามใช้ Native Node.js Package บน Workers** — Cloudflare Workers รันบน V8 Isolates ไม่ใช่ Node.js ห้ามใช้ `bcrypt`, `prisma`, หรือ package ที่มี native bindings ใดๆ ให้ใช้ `bcryptjs`, `drizzle-orm`, `@upstash/qstash`, และ `crypto.randomUUID()` แทนเสมอ

6. **DTO — API รับ/ส่งเป็น string เท่านั้น** — ทุก request/response body ผ่าน API ต้องเป็น string เสมอ backend รับมาแล้วค่อย parse/convert เอง (ใช้ `z.coerce.number()` หรือ `.transform()` ใน Zod) ห้าม frontend ส่ง `number`, `boolean`, หรือ `Date object` ตรงๆ ใน JSON body

7. **Upstash QStash สำหรับ Event-Driven Pub/Sub** — ใช้ Upstash QStash เป็น Message Broker แทน Cloudflare Queues เพื่อแก้ปัญหา Fan-out (1 Event กระจายไปยังหลาย Subscriber พร้อมกัน) ผู้ส่ง (Producer) ยิง POST เข้า Topic แล้ว QStash จะส่ง Webhook POST ไปยัง Endpoint ของ Subscriber แต่ละตัว พร้อมระบบ Auto-Retry, DLQ, และ Idempotency (`upstash-message-id`)

```typescript
// ตัวอย่าง Atomic Outbox ด้วย db.batch() บน Cloudflare D1
await db.batch([
  db.update(reservations)
    .set({ status: 'checked_out', actualCheckOut: new Date().toISOString() })
    .where(eq(reservations.id, reservationId)),
  db.insert(reservationHistory).values({
    id: crypto.randomUUID(),
    reservationId,
    action: 'checked_out',
    performedBy: currentUserId,
  }),
  db.insert(outboxEvents).values({
    id: crypto.randomUUID(),
    eventType: 'ReservationCheckedOut',
    aggregateId: reservationId,
    aggregateType: 'Reservation',
    payload: JSON.stringify(checkoutPayload),
    status: 'pending',
  })
]);
```

## Tech Stack สรุปย่อ

| หมวด | เทคโนโลยี |
|---|---|
| Language | TypeScript (Frontend + Backend) |
| Serverless Compute | Cloudflare Workers (V8 Isolates) |
| API Gateway | Cloudflare Workers (Reverse Proxy + JWT Verify) |
| Database | Cloudflare D1 (Serverless SQLite) — 6 DBs แยกต่อ service |
| ORM | Drizzle ORM (type-safe, no native bindings, edge-compatible) |
| Caching / Session | Cloudflare KV (Session, Permissions, Config) |
| Message Bus & Pub/Sub | **Upstash QStash** (Serverless Pub/Sub Fan-out, HTTP Webhooks, Auto-Retry, DLQ, At-Least-Once) |
| Frontend | React + Vite + TypeScript |
| UI Styling | Tailwind CSS (Utility-first + Status-Color System) |
| Frontend Hosting | Cloudflare Workers (Static Assets) |
| API Documentation | OpenAPI / Swagger |
| Testing | Postman (Functional + Integration) |
| CI/CD | GitHub Actions + Wrangler CLI |
| Monorepo | pnpm Workspaces |

## หลักการตั้งชื่อ (Naming Convention) ทั้งโปรเจกต์

| บริบท | Convention | ตัวอย่าง |
|---|---|---|
| ตัวแปร / function / object key ใน TypeScript | `camelCase` | `roomTypeId`, `checkInDate`, `totalAmount` |
| Interface / Type / Class / React Component | `PascalCase` | `ReservationStatus`, `RoomCard`, `CheckInModal` |
| ตาราง D1 (SQL) | `snake_case` พหูพจน์ | `reservation_history`, `outbox_events`, `bill_items` |
| Column ใน D1 (SQL) | `snake_case` | `guest_id`, `created_at`, `room_type_id` |
| Route / endpoint URL | `kebab-case` | `/housekeeping/tasks`, `/rooms/available`, `/bills/:id/pay` |
| Service folder / Worker name | `kebab-case` | `auth-user`, `room-inventory`, `hotel-service-reservation` |
| Event Type (Queue payload) | `PascalCase` | `ReservationCheckedOut`, `HousekeepingTaskCompleted` |
| ไฟล์ TypeScript/React | `PascalCase.tsx` (component), `camelCase.ts` (util/hook) | `RoomCard.tsx`, `useRooms.ts`, `apiClient.ts` |

### กฎสำคัญเรื่อง camelCase vs snake_case

**TypeScript ทั้งหมดใช้ `camelCase`** — ตัวแปร, function, object, interface field, response JSON ทุกอย่าง

**D1 / SQL ใช้ `snake_case`** — เพราะเป็น SQL standard ถ้าฝืนใช้ camelCase ใน SQL ต้องใส่ quotes ทุกครั้ง (`"roomTypeId"`) ยุ่งยากโดยไม่จำเป็น

**Drizzle จัดการ bridge ให้อัตโนมัติ** — เขียน schema แบบนี้ครั้งเดียว แล้วใช้ camelCase ใน TypeScript ได้เลย:

```typescript
// db/schema.ts — เขียนครั้งเดียว Drizzle handle ให้
export const reservations = sqliteTable('reservations', {
  id: text('id').primaryKey(),
  roomTypeId: text('room_type_id').notNull(),   // ← SQL column: room_type_id
  checkInDate: text('check_in_date').notNull(),  // ← SQL column: check_in_date
  totalAmount: real('total_amount').notNull(),   // ← SQL column: total_amount
});

// ใช้งาน — ได้ camelCase ออกมาเลย ไม่ต้อง map เอง
const res = await db.select().from(reservations).get();
console.log(res.roomTypeId);   // ✅ camelCase
console.log(res.checkInDate);  // ✅ camelCase
```

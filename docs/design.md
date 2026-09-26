# design.md — System Design & Architecture Decisions

> เอกสารนี้รวม "ทำไม" ของการตัดสินใจออกแบบทั้งหมด ใช้ตอบคำถามอาจารย์/เพื่อนร่วมทีมตอนถูกถามว่า "ทำไมถึงออกแบบแบบนี้"

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

Hotel Management System ใช้สถาปัตยกรรม **Microservices บน Cloudflare Serverless Stack ร่วมกับ Upstash QStash Message Broker** แบ่งเป็น 6 services:

| Service | ความรับผิดชอบหลัก | DB ที่เป็นเจ้าของ |
|---|---|---|
| `auth-user` | ยืนยันตัวตน JWT, จัดการ User และ Role (RBAC) | `db_auth_user` (D1) + KV |
| `room-inventory` | คลังห้องพัก, ประเภทห้อง, ชั้น, สถานะห้องจริง ณ ปัจจุบัน | `db_room` (D1) |
| `reservation` | การจองล่วงหน้า (Date Range), Walk-in, Check-in/out, ประวัติการจอง | `db_reservation` (D1) |
| `housekeeping` | งานทำความสะอาด, ทีมแม่บ้าน, บันทึกการตรวจห้อง, แจ้งซ่อม | `db_housekeeping` (D1) |
| `billing` | บิล, ค่ามินิบาร์/บริการเสริม, รับชำระเงิน, ออกใบเสร็จ/ใบกำกับภาษี | `db_billing` (D1) |
| `report-analytics` | สถิติ Occupancy Rate, รายได้ประจำวัน/เดือน, ประสิทธิภาพงาน | `db_report` (D1) |

ทุก client (Frontend SPA) เรียกผ่าน **API Gateway Worker** ตัวเดียว ไม่เรียก service ตรงๆ

---

## 2. ทำไมต้องเป็น Database-per-Service (ไม่ใช้ DB กลางตัวเดียว)

หลักการของ Microservices คือแต่ละ service ต้องเป็นเจ้าของ D1 database ของตนเองอย่างเด็ดขาด ห้าม service อื่น query ข้าม DB ตรงๆ:
1. **Loose coupling:** `room-inventory` ปรับปรุง schema เมื่อไหร่ก็ได้โดยไม่กระทบ `reservation`
2. **Failure isolation:** ถ้า `billing` มีปัญหา แม่บ้านยังคงรับงานทำความสะอาดได้ ฟร้อนท์ยังดูผังห้องได้
3. **Scale แยกอิสระ:** ช่วงเช็คอินบ่าย 2 โมง `reservation` มีโหลดสูง ไม่ดึงให้ `report-analytics` ช้าตาม
4. **Clear ownership:** สมาชิกในทีมดูแล DB ของตนเองชัดเจน ไม่แก้ทับกัน

> **Trade-off:** การ JOIN ข้าม service ทำไม่ได้โดยตรง จึงต้องใช้ **Soft References (UUID v4)** และ **Denormalized Fields** (เช่น เก็บ `guest_name`, `room_number` ในตารางบิล) เพื่อให้อ่านข้อมูลได้รวดเร็วโดยไม่ต้องเรียกข้าม Service ซ้ำซ้อน

---

## 3. Outbox Pattern บน Cloudflare D1: ทำไมต้องใช้ `db.batch()`?

การส่ง Event ข้ามเซอร์วิสต้องใช้ **Transactional Outbox Pattern** เสมอ เพื่อป้องกันปัญหาข้อมูลไม่สอดคล้อง (Dual-write problem):
- เมื่อมีการเปลี่ยนสถานะสำคัญ เช่น Check-out ข้อมูลหลักและ Event ต้องถูกบันทึกลงฐานข้อมูลพร้อมกัน

### ⚠️ ข้อจำกัดทางเทคนิคของ Cloudflare D1
Cloudflare D1 เป็น SQLite บน Edge ที่ทำงานแบบ HTTP/Isolate การใช้ async interactive transaction ข้าม Event Loop (`db.transaction(async (tx) => { ... })`) อาจพบปัญหา Database Lock Timeout หรือความไม่เสถียรได้ง่าย

### ✅ แนวทางที่ถูกต้อง: Drizzle `db.batch()`
เราใช้ **`await db.batch([stmt1, stmt2, stmt3])`** ของ Drizzle ORM แทน เพราะ Cloudflare D1 รองรับ Batch Statements ในตัว และรับประกันว่าทุกคำสั่งใน Array จะทำงานเป็น **Atomic Transaction 100%** ในเที่ยวเดียว (Single Round-trip):

```typescript
await db.batch([
  db.update(reservations).set({ status: 'checked_out' }).where(eq(reservations.id, id)),
  db.insert(reservationHistory).values({ id: crypto.randomUUID(), action: 'checked_out', performedBy: userId }),
  db.insert(outboxEvents).values({ id: crypto.randomUUID(), eventType: 'ReservationCheckedOut', payload, status: 'pending' })
]);
```

---

## 4. สถานะห้องพัก (Room State Machine) vs การจองล่วงหน้า (Date Range)

ข้อผิดพลาดที่พบบ่อยในระบบโรงแรมคือ การนำสถานะทางกายภาพของห้อง มาผูกกับการจองล่วงหน้า ซึ่งทำให้ระบบล่ม (False Full)

### 1. `rooms.status` คือสถานะทางกายภาพ "วันนี้/เวลานี้" (Real-time Today Status)
มี 7 สถานะที่ควบคุมด้วย State Machine:
```
available → reserved        (วันเช็คอิน: แขกมีกำหนดเดินทางถึงวันนี้)
reserved  → occupied        (ReservationCheckedIn: แขกมาถึงและรับกุญแจ)
occupied  → checked_out     (ReservationCheckedOut: แขกคืนห้อง / ส่ง Event เข้า QStash)
checked_out → cleaning      (Housekeeping รับงานทำความสะอาด)
cleaning  → available       (HousekeepingTaskCompleted: แม่บ้านตรวจผ่าน ห้องพร้อมขาย)

reserved  → available       (ReservationCancelled หรือ No-Show)
available / cleaning → maintenance  (ตรวจพบสิ่งชำรุด / แจ้งซ่อม)
maintenance → available     (ซ่อมเสร็จ)
available → out_of_order    (ปิดปรับปรุงใหญ่ระยะยาว)
```

### 2. การจองล่วงหน้า (Advance Booking) ไม่เปลี่ยน `rooms.status` ทันที!
ถ้าแขกจองห้อง 201 สำหรับเดือนหน้า **ห้ามแก้ `rooms.status` ของห้อง 201 เป็น `reserved` ในวันนี้เด็ดขาด** เพราะจะทำให้ห้อง 201 ว่างสำหรับแขกที่จะมาพักสัปดาห์นี้ถูกปิดกั้น
* **วิธีเช็คห้องว่าง:** Query ตาราง `reservations` เพื่อตรวจช่วงวันที่ (`check_in_date` ถึง `check_out_date`) ว่าไม่มีการจองที่ทับซ้อนกัน (Overlapping Dates)
* **การเปลี่ยนเป็น `reserved`:** จะเกิดขึ้นใน **"วันเช็คอินจริง (Arrival Date)"** โดยมี Night Audit Worker คอยปรับสถานะในเวลา 02:00 น.

---

## 5. ทำไมต้องใช้ Upstash QStash (Serverless Pub/Sub) แทน Cloudflare Queues?

### ⚠️ ปัญหาของ Cloudflare Queues: ไม่รองรับ Native 1:N Fan-out
Cloudflare Queues เป็นคิวแบบ Point-to-Point (Competing Consumers) หากมี Worker หลายตัวฟังคิวเดียวกัน Worker ตัวแรกที่ดึงข้อความไปจะลบข้อความออกจากคิว ทำให้เซอร์วิสอื่นไม่ได้รับข้อความ

### ✅ ทำไม Upstash QStash ถึงเป็นคำตอบที่สมบูรณ์แบบ:
1. **True 1:N Pub/Sub Fan-out:** Producer ยิง Event เข้า Topic ครั้งเดียว (`hotel.reservation.checkout`) แล้ว QStash จะกระจายยิง Webhook HTTP POST ไปหา Subscriber ทั้ง 4 เซอร์วิสพร้อมกัน:
   - `room-inventory`: อัปเดตสถานะห้องเป็น `checked_out` ทันที
   - `housekeeping`: สร้าง Task ทำความสะอาดห้องพักอัตโนมัติ
   - `billing`: สร้าง Bill พร้อมคิดค่าห้อง และรอหักค่ามินิบาร์
   - `report-analytics`: บันทึกสถิติ checkout ประจำวัน
2. **ออกแบบมาเพื่อ Serverless 100%:** สื่อสารผ่าน REST API ธรรมดา ไม่ต้องเปิด Persistent TCP Connection (ซึ่งขัดกับธรรมชาติ Isolate ของ Workers)
3. **Local Dev เป็นมิตร:** ในเครื่อง dev ทุกเซอร์วิสเป็นแค่ HTTP Endpoint ธรรมดา ยิงทดสอบด้วย Postman ได้ทันที
4. **ความปลอดภัย & ความทนทาน:** มี Webhook Signature Verification (`@upstash/qstash`), Auto-Retry (Exponential Backoff), และ Dead-Letter Queue (DLQ) ในตัว

---

## 6. โครงสร้างสิทธิ์ RBAC (4 บทบาทหลัก — รวม Billing เข้า Front Desk)

ในงานจริง แขกคืนกุญแจและจ่ายเงินหน้าเคาน์เตอร์กับพนักงานต้อนรับ จึง**ไม่ควรมี Role Billing แยกต่างหาก** แต่ควรรวมเข้ากับ Front Desk (Front Desk Cashier):

| สิทธิ์การทำงาน (Action) | Front Desk (เดียร์) | Housekeeping (บุญ) | Manager (เขต) | Admin (เขต) |
|---|---|---|---|---|
| ผังห้องและสถานะห้องพักจริง | ✅ | ✅ (เฉพาะงานทำความสะอาด) | ✅ | ✅ |
| สร้าง / ปรับปรุง / ยกเลิกการจอง | ✅ | ❌ | ✅ | ✅ |
| เช็คอิน / เช็คเอาท์ | ✅ | ❌ | ✅ | ✅ |
| เพิ่มรายการมินิบาร์ / ค่าเสียหาย | ✅ | ❌ (แจ้งผ่าน Issue) | ✅ | ✅ |
| คิดเงิน / ออกบิล / ออกใบเสร็จ | ✅ | ❌ | ✅ | ✅ |
| รับงาน / รายงานทำความสะอาดเสร็จ | ❌ | ✅ | ✅ | ✅ |
| แจ้งห้องชำรุดส่งซ่อม | ❌ | ✅ | ✅ | ✅ |
| ดูรายงานสถิติ / KPI Dashboard | ❌ | ❌ | ✅ | ✅ |
| อนุมัติส่วนลดพิเศษเกินเกณฑ์ | ❌ | ❌ | ✅ | ✅ |
| จัดการบัญชีผู้ใช้ / พนักงาน | ❌ | ❌ | ❌ | ✅ |

---

## 7. ส่วนเสริมทางสถาปัตยกรรมที่สำคัญ (Operational Realities)

### 7.1 กระบวนการเงินมัดจำ (Security Deposit) & ตรวจมินิบาร์
- **ตอน Check-in:** Front Desk บันทึกรับเงินมัดจำ (Security Deposit เช่น 1,000 บาท)
- **ตอน Check-out:** 
  1. Front Desk กด "เริ่มเช็คเอาท์" ระบบส่งสัญญาณให้แม่บ้านทำ "Quick Inspection" ตรวจมินิบาร์
  2. แม่บ้านอัปเดตการใช้มินิบาร์ (เช่น เบียร์ 2 กระป๋อง 200 บาท) เข้าสู่ระบบ
  3. Front Desk สรุปยอดบิล หักจากเงินมัดจำ 1,000 - 200 = ทอนเงินสดคืนแขก 800 บาท จบกระบวนการใน 2 นาที

### 7.2 ระบบ Night Audit & Daily Rollover (Cloudflare Cron Trigger)
รันทุกวันเวลา 02:00 AM (`0 2 * * *`):
1. ตรวจสอบการจองที่มีกำหนดเช็คอินเมื่อวานแต่ไม่มา → ปรับสถานะเป็น `no_show` และคืนห้อง
2. ปรับสถานะห้องพักที่มีกำหนดเช็คอินวันนี้เป็น `reserved`
3. สรุปตัวเลขรายได้, Occupancy Rate, ADR, RevPAR ประจำวันเข้า `daily_stats`

### 7.3 ป้องกันการจองซ้อน (Double Booking Race Condition)
เมื่อมีผู้ใช้งานจองห้องพักในเสี้ยววินาทีเดียวกัน:
- ในระดับแอปพลิเคชัน: ตรวจสอบความว่างของห้องในตาราง `reservations` ภายใน Atomic Batch Statement
- ในระดับฐานข้อมูล: ทำ Partial Unique Index บน `reservations` สำหรับห้องและวันที่จอง

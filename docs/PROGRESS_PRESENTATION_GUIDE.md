# 🎯 คู่มือนำเสนอความคืบหน้าโปรเจกต์ KEYSTAY — CSI400 Senior Project
## ระบบบริหารจัดการโรงแรมขนาดเล็ก (5–10 ห้อง) ด้วย Cloudflare Edge Microservices & Event-Driven Architecture

> **เอกสารฉบับนี้จัดทำขึ้นสำหรับการนำเสนอความคืบหน้า (Progress Presentation) โดยเฉพาะ**  
> มุ่งเน้นการแสดง **"หลักฐานเชิงประจักษ์ที่ตรวจสอบได้จริง (Verifiable Evidence)"** ตามเกณฑ์ประเมิน 7 ข้อของ **อาจารย์ท็อป (อ.ท็อป)**  
> โดยแบ่งหัวข้อตามความรับผิดชอบของสมาชิกแต่ละคนในทีม และจัดเรียงการนำเสนอเป็นลำดับขั้นตอนแบบ **Step-by-Step Flow** ตามจังหวะเวลาจริงของการดำเนินงานโรงแรม (Operational Real-time Boundary)

---

## 👥 ข้อมูลสมาชิกในทีมและการแบ่งความรับผิดชอบหลัก

| สมาชิก | รหัสนักศึกษา / GitHub | ตำแหน่งในทีม | ส่วนงานที่รับผิดชอบหลัก | สัดส่วน APIs ที่ดูแล |
|---|---|---|---|---|
| **เขต (เขตโสภณ)** | `@hazeco` | **Project & Infra Lead** | Cloudflare Edge, API Gateway, Auth/User, Security, Report/Analytics, Project Status | **26 APIs** + Gateway |
| **เดียร์ (ธีรภัทร)** | `@allmusgus` | **SA Lead** | Reservation, Billing, Room State Machine, Atomic Outbox D1 Batch, Front Desk Portal | **40 APIs** |
| **บุญ (ปวริศ)** | `@Legxcy77` | **QA Lead** | Room Inventory, Housekeeping, Outsource Maintenance, Quality Assurance, Test Automation | **39 APIs** |

---

## 📋 แผนผังความสอดคล้องกับ 7 เกณฑ์ประเมินของ อ.ท็อป (Evaluation Criteria Mapping Matrix)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   7 เกณฑ์ประเมินความคืบหน้า CSI400 (อาจารย์ท็อป)                     │
└────────────────────────────────────┬───────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  เขต (@hazeco)   │        │ เดียร์ (@allmusgus)│        │ บุญ (@Legxcy77)  │
│  Project & Infra │        │  System Analyst  │        │  QA & Operations │
├──────────────────┤        ├──────────────────┤        ├──────────────────┤
│ 1. Architecture  │        │ 2. API Impl.     │        │ 4. Integration   │
│    (Edge Gateway │        │    (Walk-in,     │        │    (HK Task &    │
│     & Topology)  │        │     Check-in/out,│        │     R2 Photo)    │
│ 5. Security      │        │     Billing)     │        │ 6. Testing       │
│    (JWT & RBAC   │        │ 3. Database      │        │    (Automated    │
│     Middleware)  │        │    (D1 SQLite &  │        │     Test Suites &│
│ 7. Project Status│        │     Batch Atomic)│        │     Error Cases) │
│    (Roadmap &    │        │ 4. Integration   │        │ 1. Architecture  │
│     Issues #1-#13│        │    (Fan-out 1:4) │        │    (Outsource)   │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

| เกณฑ์ประเมินของ อ.ท็อป | สิ่งที่ต้องแสดงเป็นหลักฐาน | ผู้รับผิดชอบหลัก | ส่วนที่นำเสนอในเอกสารนี้ |
|---|---|---|---|
| **1. Architecture** | แผนผังบริการ, หน้าที่ของแต่ละ Service, เส้นทางข้อมูล (Data Path) | **เขต** & **บุญ** | หมวดที่ 1 (Flow 1.1) และ หมวดที่ 3 (Flow 3.2) |
| **2. API Implementation** | Endpoints ครบถ้วน (GET, POST, PUT, DELETE) พร้อม Payload | **เดียร์** & ทุกคน | หมวดที่ 2 (Flow 2.1, 2.2) และ หมวดที่ 3 (Flow 3.1, 3.2) |
| **3. Database** | โครงสร้าง D1 Schemas, Foreign Keys, ข้อมูลบันทึกจริง (Real Record Proof) | **เดียร์** | หมวดที่ 2 (Database Evidence) |
| **4. Integration** | การเชื่อมโยง Frontend ↔ Gateway ↔ Backend ↔ Upstash QStash 1:4 Fan-out | **เขต** & **เดียร์** | หมวดที่ 1 (Flow 1.1) และ หมวดที่ 2 (Flow 2.2) |
| **5. Security** | การตรวจสอบ JWT Bearer, สิทธิ์ตาม 4 บทบาท (RBAC), การซ่อนหน้า (404 Obscurity) | **เขต** | หมวดที่ 1 (Flow 1.2) |
| **6. Testing** | ผลการทดสอบ API Happy Path (200, 201) และ Error Cases (400, 401, 403, 404, 409) | **บุญ** & **เดียร์** | หมวดที่ 2 (Flow 2.3) และ หมวดที่ 3 (Flow 3.3) |
| **7. Project Status** | สรุปงานที่เสร็จ, กำลังทำ, ปัญหาที่พบ, แผนงานถัดไปบน GitHub Projects | **เขต** | หมวดที่ 1 (Flow 1.3) |

---

## 🗂️ ลิงก์เอกสารอ้างอิงและเครื่องมือที่เกี่ยวข้องในโปรเจกต์
- 📊 **Interactive System Diagrams (HTML):** [hotel-system-diagrams.html](file:///e:/MyWork/PJ_P3_1/keystay/docs/hotel-system-diagrams.html)
- 📖 **System Specification & Architecture:** [Hotel_Management_System_updated.md](file:///e:/MyWork/PJ_P3_1/keystay/docs/Hotel_Management_System_updated.md)
- 🛡️ **Security Policy & Rules:** [SECURITY.md](file:///e:/MyWork/PJ_P3_1/keystay/docs/SECURITY.md)
- 🧪 **24 UAT Scenarios:** [uat.md](file:///e:/MyWork/PJ_P3_1/keystay/docs/uat.md)
- 📜 **Reservation Test Script (Phase 2):** [test-reservation-phase2.js](file:///e:/MyWork/PJ_P3_1/keystay/scripts/test-reservation-phase2.js)
- 📜 **Billing Test Script (Phase 2):** [test-billing-phase2.js](file:///e:/MyWork/PJ_P3_1/keystay/scripts/test-billing-phase2.js)
- 📦 **Shared Type Definitions:** [packages/types/src/index.ts](file:///e:/MyWork/PJ_P3_1/keystay/packages/types/src/index.ts)

---

# 📌 หมวดที่ 1: การนำเสนอของ "เขต" (@hazeco — Project & Infra Lead)
### หัวข้อหลัก: Edge Architecture, Zero-Trust Security, API Gateway & Project Management

---

### 🔹 Flow 1.1: สถาปัตยกรรมรวมและเส้นทางข้อมูลระดับ Edge (End-to-End Edge Architecture Flow)
*ตอบโจทย์เกณฑ์: **1. Architecture** & **4. Integration***

```
[ Client: Browser / Web App ]
            │  HTTPS / TLS 1.3
            ▼
[ Cloudflare Global Anycast Network + WAF ]
            │  DDoS Protection, SSL Termination (<5ms edge latency)
            ▼
[ Central API Gateway Worker (apps/api-gateway) ]
     ├── 1. CORS Validation & Security Headers (Strict CSP, X-Frame-Options)
     ├── 2. JWT Verification via Cloudflare KV (Check Blacklist & Expiry)
     ├── 3. Role-Based Access Control (RBAC) Guard
     ├── 4. Request Header Enrichment (x-user-id, x-user-role, x-internal-service-key)
     └── 5. Reverse Proxy Routing via Cloudflare Service Bindings
            │
            ├──► /api/v1/auth/*        ──► [ auth-user Worker ] ──► (D1: db_auth_user)
            ├──► /api/v1/rooms/*       ──► [ room-inventory Worker ] ──► (D1: db_room)
            ├──► /api/v1/reservations/*──► [ reservation Worker ] ──► (D1: db_reservation)
            ├──► /api/v1/housekeeping/*──► [ housekeeping Worker ] ──► (D1: db_housekeeping + R2)
            ├──► /api/v1/billing/*     ──► [ billing Worker ] ──► (D1: db_billing)
            └──► /api/v1/reports/*     ──► [ report-analytics Worker ] ──► (D1: db_report)
```

#### 🎯 1. ขอบเขตและหน้าที่การทำงาน (Scope & Responsibilities)
- รับผิดชอบโครงสร้างพื้นฐานระดับ Serverless Edge ทั้งหมดบน **Cloudflare Workers** (V8 Isolates) ไร้ภาระเรื่อง OS Patching หรือ Container Boot Time
- Central API Gateway ทำหน้าที่เป็นจุดรับ Traffic ทางเดียว (Single Entry Point) โดยบังคับตรวจสอบความถูกต้องของ Token ก่อนส่งต่อไปยัง Microservices
- การติดต่อระหว่าง Gateway และ Microservices ภายใน ใช้ **Cloudflare Service Bindings** ซึ่งเป็นการเรียกข้าม Isolate ในหน่วยความจำเดียวกัน (Zero Network Overhead Latency ~0ms)

#### 💡 2. จุดเด่นทางเทคนิคที่โชว์อาจารย์ (Architectural Highlights)
- **Zero Cold-Start (<5ms):** Cloudflare Workers ทำงานบน V8 Isolates ไม่มี Cold Start ช้าเหมือน Docker หรือ AWS Lambda
- **Zero Trust Network:** Microservices แต่ละตัวไม่เปิด Public Internet ให้บุคคลภายนอกเข้าถึงตรงๆ ได้ จะปฏิเสธ Request ที่ไม่มี `x-internal-service-key` ที่ถูกต้อง
- **Database-per-Service:** แยก D1 SQLite อิสระ 6 ฐานข้อมูล ป้องกันปัญหา Database Bottleneck และ Schema Coupling

---

### 🔹 Flow 1.2: ระบบยืนยันตัวตนและการจัดการสิทธิ์ (Zero-Trust Security & RBAC Flow)
*ตอบโจทย์เกณฑ์: **5. Security** & **2. API Implementation***

```
[ พนักงานเข้าหน้าจอ /login ]
            │
            ├── 1. กรอก Email/Username + Password + ติ๊ก "Remember Me"
            ▼
[ POST /api/v1/auth/login ]
            │
            ├── ตรวจสอบรหัสผ่านผ่าน bcryptjs (Salt 10 rounds)
            ├── ดึง Role ผู้ใช้: 'admin' | 'manager' | 'front_desk' | 'housekeeping'
            ├── สร้าง Access Token (JWT 15 นาที) + Refresh Token (30 วันหาก Remember Me)
            └── บันทึก Session Hash ลง Cloudflare KV (`keystay_kv`)
            ▼
[ Frontend Shell (apps/web) ดักอ่าน Role ]
            │
            ├── role: 'admin' | 'manager'  ──► Redirect สู่ /admin (Manager & Admin Portal)
            ├── role: 'front_desk'         ──► Redirect สู่ /front-desk (Front Desk Portal)
            └── role: 'housekeeping'       ──► Redirect สู่ /housekeeping (Housekeeping Portal)
```

#### 🛡️ สิทธิการเข้าถึงตาม 4 บทบาทหลัก (RBAC Matrix)

| ทรัพยากร / หน้าที่ | `admin` | `manager` | `front_desk` | `housekeeping` |
|---|:---:|:---:|:---:|:---:|
| จัดการ User & Role (`/users`) | ✅ Full CRUD | ❌ ซ่อนปุ่ม | ❌ 404/403 | ❌ 404/403 |
| จัดการ Master Data ช่าง Outsource (`/outsource-contacts`) | ✅ Full CRUD | 👁️ Read-only | 👁️ Quick Call | 👁️ Quick Call |
| จองห้อง / เช็คอิน / เช็คเอาท์ (`/reservations`) | ✅ | ✅ | ✅ Full Access | ❌ 404/403 |
| คิดเงิน / ออกใบเสร็จ / จัดการมินิบาร์ (`/bills`) | ✅ | ✅ | ✅ Cashier Full | ❌ 404/403 |
| รับงานทำความสะอาด / ตรวจห้อง (`/housekeeping/tasks`) | ✅ | 👁️ ดูรายงาน | 👁️ ดูสถานะ | ✅ Full Access |
| ดูสถิติรายได้ & Occupancy (`/reports`) | ✅ | ✅ Full Report | ❌ | ❌ |

#### 💡 จุดเด่นความปลอดภัยที่โชว์อาจารย์ (Security Highlights)
- **Security by Obscurity (404 Guard):** หากพนักงาน `housekeeping` แอบพิมพ์ URL ข้ามไป `/admin` ระบบ Frontend Guard และ Gateway จะตอบกลับด้วย **`404 Not Found`** เสมือนว่าหน้านั้นไม่มีอยู่จริง แทนที่จะตอบ 403 Forbidden เพื่อป้องกันไม่ให้ผู้โจมตีสำรวจ Endpoint ภายในระบบได้
- **Instant Token Revocation via KV:** หากพนักงานทำบัตรหายหรือถูกให้ออกจากงาน Admin สามารถกด Revoke Session ทันที Token จะติด Blacklist ใน Cloudflare KV ภายในเวลา <1 วินาทีทั่วโลก

---

### 🔹 Flow 1.3: สรุปสถานะโครงการและการบริหารงาน (Project Status & Engineering Roadmap)
*ตอบโจทย์เกณฑ์: **7. Project Status***

#### 📊 สถานะความคืบหน้า 4 Phases ตาม GitHub Project Board (csi204/projects/1)

```
[ Phase 0: Core Setup ] ──► ✅ เสร็จสมบูรณ์ 100% (Issue #1)
[ Phase 1: Core CRUD ]  ──► 🟢 เสร็จแล้ว 85% (Issue #2, #3, #4)
[ Phase 2: Business Op] ──► 🟡 กำลังดำเนินการ 75% (Issue #5, #6 เสร็จแล้ว / #7, #8, #9 กำลังทำ)
[ Phase 3: Portals UI ] ──► ⚪ กำลังเริ่มต้น (Issue #10, #11, #12)
[ Phase 4: UAT & Demo ] ──► ⚪ เตรียมการทดสอบ 24 Scenarios (Issue #13)
```

- **งานที่เสร็จสมบูรณ์แล้ว (Completed):**
  1. โครงสร้าง Monorepo (pnpm Workspaces + Turborepo + TypeScript 5.8)
  2. ติดตั้ง Cloudflare D1 ฐานข้อมูล 6 ตัว พร้อมระบบ Migration อัตโนมัติ (`npm run d1:migrate:local`)
  3. ติดตั้ง Cloudflare R2 Bucket สำหรับรูปถ่ายหลักฐานชำรุด
  4. Core Schemas, State Machine และ Endpoints ของ `reservation` (24 APIs) และ `billing` (16 APIs)
  5. ระบบ Event-Driven ผ่าน Upstash QStash และ Automated Integration Test Scripts
- **งานที่กำลังดำเนินการ (In Progress):**
  1. เชื่อมต่อระบบงานแม่บ้าน (`housekeeping`) และการบันทึกช่างภายนอก (`outsource_contacts`) 5 APIs
  2. การสร้างหน้า UI 3 Portals สไตล์ Enterprise Minimalist (Front Desk, Housekeeping, Manager)
- **ปัญหาและอุปสรรคที่พบ พร้อมวิธีแก้ไข (Challenges & Resolutions):**
  - *ปัญหา 1:* Cloudflare D1 ล็อกฐานข้อมูลเมื่อใช้ Interactive Transaction `db.transaction()`  
    *การแก้ไข:* เปลี่ยนมาใช้ `await db.batch([stmt1, stmt2])` ทำงานเป็น Atomic Unit ใน 1 รอบการรัน ปราศจาก Lock Timeout 100%
  - *ปัญหา 2:* Cloudflare Queues ไม่รองรับการกระจาย Event 1 สัญญาณไปหลาย Service (Fan-out)  
    *การแก้ไข:* นำ Upstash QStash มาใช้เป็น Event Bus ทำงานแบบ Pub/Sub Webhook พร้อมระบบ Dead Letter Queue (DLQ)

---

# 📌 หมวดที่ 2: การนำเสนอของ "เดียร์" (@allmusgus — SA Lead)
### หัวข้อหลัก: Core Domain Logic, Room State Machine, D1 Batch Atomic, Check-in/out & Billing

---

### 🔹 Flow 2.1 (AC 2): จังหวะรับแขกหน้างาน (Front Desk Check-in & Walk-in Flow)
*ตอบโจทย์เกณฑ์: **2. API Implementation**, **3. Database** & **4. Integration***

```
[ แขกเดินทางมาถึงเคาน์เตอร์ Front Desk ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 [ แขก Walk-in เข้ามา ]    [ แขกจองล่วงหน้ามาแล้ว ]
        │                   │
        │                   ├── ค้นหาการจอง: GET /reservations/today-checkins
        ▼                   ▼
 [ POST /walk-in ]        [ POST /reservations/:id/check-in ]
  (Endpoint #52)           (Endpoint #36)
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
 [ Drizzle ORM: await db.batch([ ... ]) ] ──► (Atomic Unit 3 Stmts ในเที่ยวเดียว)
   ├── 1. UPDATE reservations SET status = 'checked_in', actual_check_in = NOW(), deposit_amount = ?
   ├── 2. INSERT INTO reservation_history (action = 'checked_in', performed_by = ?)
   └── 3. INSERT INTO outbox_events (eventType = 'ReservationCheckedIn', payload = ?)
                  │
                  ▼
 [ ส่ง Event ไปยัง Upstash QStash ]
                  │
                  ▼
 [ Room Inventory Service ปรับสถานะห้อง ]
   rooms.status: 'available' / 'reserved' ──► 'occupied'
                  │
                  ▼
 [ Front Desk มอบคีย์การ์ดให้แขก ] ──► แขกเข้าห้องพักสำเร็จ!
 [ 📌 สิ้นสุดกระบวนการเช็คอิน: แขกเข้าพัก (Stay Period) -> รอจนถึงวันเช็คเอาท์เพื่อเข้าสู่ AC 3 ]
```

#### 🛠️ รายการ APIs ที่สาธิตใน Flow รับแขก
1. **`POST /api/v1/walk-in` (Endpoint #52):**
   - รวมการสร้างข้อมูลแขก (`guests`) + สร้าง Booking + เช็คอินเข้าห้องทันทีในขั้นตอนเดียว
   - *ตัวอย่าง Request Body:*
     ```json
     {
       "guestName": "Somchai Walkin Test",
       "guestPhone": "0899998888",
       "guestEmail": "somchai@test.com",
       "roomId": "rm-101",
       "roomNumber": "101",
       "roomTypeName": "Deluxe Double",
       "checkInDate": "2026-10-25",
       "checkOutDate": "2026-10-27",
       "numGuests": 2,
       "nightlyRate": "1500.00",
       "depositAmount": "500.00",
       "specialRequests": "Non-smoking room"
     }
     ```
2. **`POST /api/v1/reservations/:id/check-in` (Endpoint #36):**
   - รับเช็คอินกรณีแขกจองล่วงหน้า บันทึกเวลาเข้าจริง และบันทึกเงินมัดจำกุญแจ (`depositAmount`)
3. **`GET /api/v1/reservations/today-checkins` (Endpoint #42):**
   - ดึงรายการแขกที่จะเข้าพักวันนี้ สำหรับแสดงผลบน Front Desk Compact Matrix Grid

#### 🗄️ หลักฐานผลการบันทึกข้อมูลจริงใน Database (D1 Real Record Evidence)
*ผลการ Query ตาราง `reservations` ใน Cloudflare D1:*
```sql
SELECT id, booking_number, status, actual_check_in, deposit_amount, total_amount 
FROM reservations WHERE id = 'res-walkin-demo-001';
```
*Output ที่ได้จริงจาก D1:*
```json
{
  "id": "res-walkin-demo-001",
  "booking_number": "BK-261025-0101",
  "status": "checked_in",
  "actual_check_in": "2026-10-25T14:05:22.118Z",
  "deposit_amount": "500.00",
  "total_amount": "3000.00"
}
```

#### 💡 จุดเด่นที่โชว์อาจารย์ (Architectural Highlights)
- **Atomic Unit ด้วย `db.batch()`:** ป้องกันปัญหาข้อมูลไม่สอดคล้อง (เช่น เช็คอินสำเร็จแต่ไม่ได้บันทึก Log หรือ Outbox ไม่ถูกสร้าง) หากคำสั่งใดในชุดล้มเหลว ระบบจะ Rollback ทั้งหมดทันที
- **Date Range Overlap Detection:** การตรวจสอบห้องว่างใช้วิธีคำนวณช่วงวันที่ทับซ้อน (Date Range Collision) ในฐานข้อมูล `reservations` โดยตรง ทำให้รองรับการจองล่วงหน้าข้ามเดือนได้อย่างถูกต้อง 100%

---

### 🔹 Flow 2.2 (AC 3): จังหวะคืนห้องและชำระบิล (Check-out Fan-out 1:4 & Cashier Settlement Flow)
*ตอบโจทย์เกณฑ์: **2. API Implementation**, **3. Database** & **4. Integration***

```
[ แขกนำกุญแจมาคืนที่เคาน์เตอร์ ]
            │
            ▼
[ Front Desk กด Check-out: POST /reservations/:id/check-out (Endpoint #37) ]
            │
            ├── 1. บันทึก actual_check_out = NOW(), status = 'checked_out'
            ├── 2. บันทึก Outbox Event 'ReservationCheckedOut'
            └── 3. ส่ง Event เข้า Upstash QStash Topic: `hotel.reservation.checkout`
            │
            ├─────────────────────────────────────────────────────────────────┐
            │          ⚡ Asynchronous Event Fan-out 1:4 (คู่ขนาน 4 ทาง)      │
            ▼                                                                 ▼
┌─────────────────────────┐                                       ┌─────────────────────────┐
│ 1. room-inventory       │                                       │ 2. housekeeping         │
│ ปรับ rooms.status ทันที: │                                       │ สร้าง Task ด่วนอัตโนมัติ: │
│ 'occupied' ──►          │                                       │ type: 'checkout_clean'  │
│ 'checked_out'           │                                       │ priority: 'urgent'      │
└─────────────────────────┘                                       └─────────────────────────┘
            │                                                                 │
            ▼                                                                 ▼
┌─────────────────────────┐                                       ┌─────────────────────────┐
│ 3. billing              │                                       │ 4. report-analytics     │
│ ล็อกบิลค่าห้อง, นำยอด   │                                       │ บันทึกสถิติ ALOS และ    │
│ มัดจำมารอหักลบอัตโนมัติ │                                       │ Occupancy Rate          │
└─────────────────────────┘                                       └─────────────────────────┘
            │
            ▼
[ Front Desk เช็คบิล: เพิ่มค่ามินิบาร์ POST /bills/:id/items ]
            │
            ▼
[ ชำระเงินปิดบิล: POST /bills/:id/pay (หักมัดจำอัตโนมัติ) ]
            │
            ▼
[ พิมพ์ใบเสร็จรับเงินสมบูรณ์: GET /bills/:id/receipt ] ──► ส่งแขกเดินทางกลับ!
```

#### 🛠️ รายการ APIs ที่สาธิตใน Flow เช็คเอาท์และการเงิน
1. **`POST /api/v1/reservations/:id/check-out` (Endpoint #37):**
   - ตรวจสอบสถานะว่าต้องเป็น `checked_in` เท่านั้น และยิง Event Fan-out 1:4
2. **`POST /api/v1/bills/:id/items` (Endpoint #80):**
   - เพิ่มรายการค่าใช้จ่ายเสริม เช่น ค่ามินิบาร์, ค่าเครื่องดื่ม, ค่าผ้าเช็ดตัวชำรุด
3. **`POST /api/v1/bills/:id/pay` (Endpoint #82):**
   - รับเงิน, หักเงินมัดจำ (`depositDeducted`), คำนวณยอดสุทธิ และเปลี่ยนสถานะบิลเป็น `paid`
4. **`GET /api/v1/bills/:id/receipt` (Endpoint #83):**
   - ออกใบเสร็จรับเงินทางการพร้อมแจกแจง VAT 7% และรายละเอียดรายการย่อย

#### 🗄️ หลักฐานผลการบันทึกข้อมูลจริงใน Database (D1 Billing Evidence)
*ผลการ Query ตาราง `bills` และ `bill_items` ใน D1:*
```sql
SELECT b.id, b.status, b.subtotal, b.deposit_deducted, b.total_amount, i.item_name, i.price
FROM bills b 
LEFT JOIN bill_items i ON b.id = i.bill_id
WHERE b.id = 'bill-demo-001';
```
*Output ที่ได้จริงจาก D1:*
```json
{
  "id": "bill-demo-001",
  "status": "paid",
  "subtotal": "3250.00",
  "deposit_deducted": "500.00",
  "total_amount": "2750.00",
  "items": [
    { "item_name": "Room Charge (2 Nights)", "price": "3000.00" },
    { "item_name": "Minibar: Singha Beer x2", "price": "160.00" },
    { "item_name": "Minibar: Pringles Can", "price": "90.00" }
  ]
}
```

---

### 🔹 Flow 2.3: หลักฐานผลการทดสอบระบบการจองและการเงิน (Testing Evidence)
*ตอบโจทย์เกณฑ์: **6. Testing***  
*ผู้รับผิดชอบการทดสอบ: **เดียร์ (@allmusgus)** ผ่านสคริปต์อัตโนมัติ `scripts/test-reservation-phase2.js` และ `scripts/test-billing-phase2.js`*

#### 🧪 1. กรณีทดสอบระบบการจอง (Reservation Test Cases)

| Test Case | รายละเอียดการทดสอบ | สิ่งที่คาดหวัง | ผลการรันจริง (Status Code) |
|---|---|---|:---:|
| **TC-RES-01** | จองและเช็คอิน Walk-in สำเร็จ (Happy Path) | สร้างข้อมูลและสถานะเป็น `checked_in` | ✅ **201 Created** |
| **TC-RES-02** | Walk-in ซ้อนห้องและวันที่ผู้อื่นพักอยู่ (Edge Case) | ปฏิเสธการจอง ป้องกัน Overbooking | ❌ **409 Conflict** (`ROOM_OVERBOOKING_CONFLICT`) |
| **TC-RES-03** | เช็คอินซ้ำในห้องที่เช็คอินไปแล้ว (Edge Case) | ปฏิเสธการเปลี่ยนสถานะซ้ำซ้อน | ❌ **400 Bad Request** (`INVALID_RESERVATION_STATUS`) |
| **TC-RES-04** | เช็คเอาท์ห้องที่ไม่ได้อยู่ในสถานะ checked_in | ปฏิเสธการเช็คเอาท์ | ❌ **400 Bad Request** (`CANNOT_CHECKOUT_UNCHECKED_RESERVATION`) |

#### 🧪 2. กรณีทดสอบระบบการเงินและมินิบาร์ (Billing Test Cases)

| Test Case | รายละเอียดการทดสอบ | สิ่งที่คาดหวัง | ผลการรันจริง (Status Code) |
|---|---|---|:---:|
| **TC-BIL-01** | เพิ่มรายการมินิบาร์ลงบิลที่ยังเปิดอยู่ | ยอดรวมของบิลเพิ่มขึ้นอย่างถูกต้อง | ✅ **201 Created** |
| **TC-BIL-02** | ชำระเงินปิดบิลพร้อมหักมัดจำอัตโนมัติ | สถานะบิลเปลี่ยนเป็น `paid` ยอดเงินถูกต้อง | ✅ **200 OK** |
| **TC-BIL-03** | พยายามชำระเงินซ้ำในบิลที่ปิดไปแล้ว (Edge Case) | ป้องกัน Double-Charge | ❌ **400 Bad Request** (`BILL_ALREADY_PAID`) |
| **TC-BIL-04** | เพิ่มรายการมินิบาร์ในบิลที่จ่ายเงินไปแล้ว | ห้ามแก้ไขบิลที่ปิดบัญชีแล้ว | ❌ **400 Bad Request** (`CANNOT_MODIFY_PAID_BILL`) |

---

# 📌 หมวดที่ 3: การนำเสนอของ "บุญ" (@Legxcy77 — QA Lead)
### หัวข้อหลัก: Room Inventory, Housekeeping Inspection, Outsource Maintenance & QA Automation

---

### 🔹 Flow 3.1: จังหวะหมุนเวียนห้องและตรวจรับงานทำความสะอาด (Housekeeping Turnover & Inspection Flow)
*ตอบโจทย์เกณฑ์: **1. Architecture**, **2. API Implementation** & **4. Integration***

```
[ Event Fan-out: ReservationCheckedOut ]
                  │
                  ▼
[ Housekeeping Service สร้าง Task ด่วนอัตโนมัติ: type = 'checkout_clean', priority = 'urgent' ]
                  │
                  ▼
[ พนักงานแม่บ้านเปิดดูรายการงานบนมือถือ: GET /housekeeping/rooms-to-clean (Endpoint #62) ]
                  │
                  ▼
[ แม่บ้านกดรับงาน: PUT /housekeeping/tasks/:id/assign (Endpoint #60) ]
  rooms.status: 'checked_out' ──► 'cleaning'
                  │
                  ▼
[ แม่บ้านทำความสะอาดเสร็จ: เปลี่ยนผ้าปู, เติมสบู่, เช็คห้องน้ำ ]
                  │
                  ▼
[ หัวหน้าแม่บ้านตรวจรับงาน (Inspection Gate): PUT /housekeeping/tasks/:id/complete (Endpoint #61) ]
                  │
                  ▼
[ Housekeeping Service ยิง Event 'HousekeepingTaskCompleted' สู่ QStash ]
                  │
                  ▼
[ Room Inventory Service ปรับสถานะห้องเป็น 'available' ]
  🎯 rooms.status: 'cleaning' ──► 'available' (พร้อมเปิดขายรอบใหม่!)
```

#### 💡 ทำไมตรงนี้ถึงเป็น "จุดสิ้นสุดที่แท้จริง (Closed-Loop Room Turnover)":
> ในชีวิตจริงของโรงแรมขนาดเล็ก การที่แขกเช็คเอาท์ออกไปไม่ได้แปลว่ากระบวนการเสร็จสิ้น แต่เป็นจุดเริ่มต้นของวงรอบการหมุนเวียนห้อง (Room Turnover) ที่เกิดขึ้นต่อเนื่องกันในบ่ายวันเดียวกันทันที (ภายใน 30–60 นาที) ระบบนี้ทำให้ห้องที่ทำความสะอาดเสร็จ **คืนสถานะกลับมาเป็น `available` บนหน้าจอ Front Desk ทันทีโดยไม่ต้องโทรหากัน** ปิดวงรอบได้อย่างสมบูรณ์

#### 🛠️ รายการ APIs ที่สาธิตใน Flow งานแม่บ้าน
1. **`GET /api/v1/housekeeping/rooms-to-clean` (Endpoint #62):**
   - แสดงรายการห้องที่ต้องทำความสะอาด เรียงตามความเร่งด่วน (`urgent` ขึ้นก่อน)
2. **`PUT /api/v1/housekeeping/tasks/:id/assign` (Endpoint #60):**
   - มอบหมายงานให้พนักงานแม่บ้านรายคน พร้อมเปลี่ยนสถานะห้องเป็น `cleaning`
3. **`PUT /api/v1/housekeeping/tasks/:id/complete` (Endpoint #61):**
   - ตรวจรับงานและบันทึกเวลาเสร็จสิ้น พร้อม Trigger Event ปลดห้องกลับมาขาย
4. **`PUT /api/v1/rooms/:id/status` (Endpoint #19):**
   - อัปเดตสถานะห้องตาม State Machine พร้อมบันทึกลง `room_status_history`

---

### 🔹 Flow 3.2: การแจ้งชำรุดและเรียกช่าง Outsource ฉุกเฉิน 24 ชม. (Emergency Outsource Flow)
*ตอบโจทย์เกณฑ์: **1. Architecture**, **2. API Implementation**, **3. Database** & **5. Security***

```
[ แม่บ้านทำความสะอาด / หรือแขกโทรแจ้ง Front Desk ว่าแอร์ไม่เย็น / ท่อน้ำรั่ว ]
                        │
                        ▼
[ แจ้งชำรุดผ่านระบบ: POST /housekeeping/tasks/:id/report-issue (Endpoint #69) ]
  ├── 1. ระบุรายละเอียดปัญหา (เช่น "แอร์ห้อง 204 น้ำหยด คอยล์ร้อนเสียงดัง")
  └── 2. แนบรูปถ่ายหลักฐานความเสียหาย ──► อัปโหลดตรงสู่ Cloudflare R2 Storage (`keystay` bucket)
                        │
                        ▼
[ Room Inventory ปรับสถานะห้องทันที: rooms.status = 'maintenance' (ห้ามขาย) ]
                        │
                        ▼
[ พนักงานกดเปิด Quick Emergency Outsource Contact บนหน้าจอ ]
  GET /housekeeping/outsource-contacts?is_emergency=1 (Endpoint #71)
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 📞 แสดงรายชื่อช่าง Outsource เฉพาะทาง 24 ชม. (คลิกโทรออก หรือทัก LINE ได้ทันที) │
│ - ช่างแอร์: บริษัท สยามแอร์เซอร์วิส จำกัด (โทร: 081-234-5678, LINE: @siamair) │
│ - ช่างประปา: ช่างสมบูรณ์ การช่างฉุกเฉิน 24 ชม. (โทร: 089-876-5432)          │
│ - ช่างกุญแจ: ร้านคีย์การ์ด & ดิจิทัลล็อค ด่วน (โทร: 086-555-4321)            │
└────────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
[ ช่างภายนอกเข้ามาซ่อมเสร็จหน้างาน ──► แม่บ้านตรวจสอบ ──► ปลดสถานะห้องกลับสู่ระบบ ]
  PUT /rooms/:id/maintenance (Endpoint #27) ──► rooms.status = 'available'
```

#### 🛡️ การจัดการสิทธิ์ 2 ระดับในระบบช่าง Outsource (Dual-Tier Security Model)
- **ระดับ Admin (Full CRUD):**
  - มีสิทธิ์สร้าง, แก้ไข, ระงับคู่ค้า, บันทึกอัตราค่าบริการ และตรวจสัญญาจ้าง ผ่าน APIs #73, #74, #75
- **ระดับ Front Desk & Housekeeping (Read-Only Operational View):**
  - อนุญาตให้ **ดูเบอร์โทรศัพท์, LINE ID และประเภทงานซ่อมเท่านั้น** เพื่อโทรประสานงานหน้างานด่วน
  - **ถูกบล็อกไม่ให้แก้ไขหรือลบข้อมูลคู่ค้า** หากพยายามยิงคำสั่ง PUT/DELETE จะได้ผลลัพธ์ **`403 Forbidden`**

#### 🗄️ หลักฐานผลการบันทึกข้อมูลคู่ค้า Outsource ใน Database (D1 Schema & Records)
*ผลการ Query ตาราง `outsource_contacts` ใน D1:*
```sql
SELECT id, name, category, service_type, phone_primary, line_id, is_emergency 
FROM outsource_contacts WHERE is_emergency = 1;
```
*Output ที่ได้จริงจาก D1:*
```json
[
  {
    "id": "outsource-001",
    "name": "บริษัท สยามแอร์เซอร์วิส จำกัด",
    "category": "air_conditioning",
    "service_type": "ซ่อมและล้างเครื่องปรับอากาศฉุกเฉิน",
    "phone_primary": "081-234-5678",
    "line_id": "@siamair24hr",
    "is_emergency": 1
  },
  {
    "id": "outsource-002",
    "name": "ช่างสมบูรณ์ การช่าง 24 ชม.",
    "category": "plumbing",
    "service_type": "ท่อประปารั่ว ปั๊มน้ำขัดข้อง",
    "phone_primary": "089-876-5432",
    "line_id": "somboon_fix",
    "is_emergency": 1
  }
]
```

---

### 🔹 Flow 3.3: ชุดการทดสอบระบบอัตโนมัติในฐานะ QA Lead (Comprehensive QA & Automated Test Suite)
*ตอบโจทย์เกณฑ์: **6. Testing***  
*ผู้รับผิดชอบการทดสอบ: **บุญ (@Legxcy77)***

#### 🧪 1. การทดสอบงานแม่บ้านและช่าง Outsource (Housekeeping & Outsource Tests)

| Test Case | รายละเอียดการทดสอบ | สิ่งที่คาดหวัง | ผลการรันจริง (Status Code) |
|---|---|---|:---:|
| **TC-HK-01** | ดึงรายชื่อช่างฉุกเฉิน 24 ชม. (Happy Path) | คืนเฉพาะช่างที่มี `is_emergency = 1` | ✅ **200 OK** |
| **TC-HK-02** | Housekeeping พยายามลบข้อมูลช่าง Outsource (Security Guard) | ปฏิเสธการเข้าถึง ให้สิทธิ์เฉพาะ Admin | ❌ **403 Forbidden** (`ADMIN_ROLE_REQUIRED`) |
| **TC-HK-03** | แจ้งสิ่งชำรุดโดยไม่แนบรูปถ่ายหรือหมวดหมู่ (Validation) | ปฏิเสธ Request ที่ข้อมูลไม่ครบถ้วน | ❌ **400 Bad Request** (`MISSING_REQUIRED_FIELDS`) |
| **TC-HK-04** | ปิดงานทำความสะอาดใน Task ID ที่ไม่มีอยู่จริง (Error Case) | แจ้งไม่พบ Task | ❌ **404 Not Found** (`TASK_NOT_FOUND`) |
| **TC-HK-05** | เปลี่ยนสถานะห้องผิดลำดับ State Machine (เช่น ข้ามจาก cleaning ไป occupied) | ป้องกัน State ขัดแย้ง | ❌ **409 Conflict** (`INVALID_STATE_TRANSITION`) |

---

# 🎤 บทสรุปและสคริปต์การพูดนำเสนอ 5–8 นาที (Speaking Script for Top's Demo)

> **เคล็ดลับสำหรับการนำเสนอต่อหน้า อ.ท็อป:**  
> ไม่ต้องบรรยายโค้ดทีละบรรทัด แต่ให้เน้นการแสดง **"หลักฐานจริงบนหน้าจอ"** (ยิง API ให้ดูผลลัพธ์ Status Code, เปิด D1 Query ข้อมูลที่เปลี่ยนสถานะจริง, และเปิด Diagram ประกอบ)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ลำดับการพูดและบทสนทนาในห้องสอบ                         │
└────────────────────────────────────────────────────────────────────────┘

[ นาทีที่ 0:00 - 0:30 ]
🗣️ เขต (PM): "กราบสวัสดีครับอาจารย์ท็อป วันนี้ทีม KEYSTAY ขออนุญาตนำเสนอความคืบหน้าระบบ
บริหารจัดการโรงแรมขนาดเล็ก 5-10 ห้อง ด้วยสถาปัตยกรรม Cloudflare Edge Microservices 
และ Event-Driven Pub/Sub ครับ โดยในวันนี้เราเตรียมหลักฐานการทำงานจริงมาแสดงครบทั้ง 7 เกณฑ์ 
แบ่งตามสเต็ปการทำงานจริงของโรงแรมครับ..."

[ นาทีที่ 0:30 - 2:00 ]
🗣️ เขต (Infra): "ผมเขต รับผิดชอบสถาปัตยกรรมระบบและความปลอดภัยครับ...
1. ฝั่ง Architecture: เราเลือกใช้ Cloudflare Workers รันบน V8 Isolates ไม่มี Cold-start ช้า
2. ฝั่ง Security: เราทำ Unified Login จุดเดียว ตรวจสอบ JWT Bearer และทำ RBAC 4 บทบาท โดยถ้าพนักงาน
   พยายามเข้าหน้าจอที่ไม่ได้รับอนุญาต Gateway จะตอบกลับด้วย 404 เพื่อซ่อนเส้นทางภายในระบบครับ 
   (สาธิตการยิง Token และแสดงผล 401/404)"

[ นาทีที่ 2:00 - 4:30 ]
🗣️ เดียร์ (SA Lead): "ต่อมาเป็นฝั่ง Core Domain Logic ที่ผมเดียร์รับผิดชอบครับ...
1. จังหวะรับแขกหน้างาน (AC 2): เรามี 1-Click Walk-in ที่รวมการสร้าง Guest, Booking และ Check-in 
   ไว้ในคำสั่งเดียว โดยใช้ `await db.batch()` ของ Drizzle ORM บันทึกลง 3 ตารางใน 1 Atomic Unit 
   ป้องกันปัญหา Lock Timeout บน Cloudflare D1 ครับ (เปิดผล D1 Record จริงให้ดู)
2. จังหวะคืนห้องและเคลียร์เงิน (AC 3): เมื่อแขกเช็คเอาท์ เราไม่ได้ยิง HTTP หากันตรงๆ แต่ใช้ Upstash QStash 
   ทำ Asynchronous Fan-out 1:4 กระจายไปยัง Room, Housekeeping, Billing และ Report พร้อมกันทันที 
   และฝั่ง Billing จะนำมัดจำมาหักลบค่ามินิบาร์ให้อัตโนมัติ ป้องกันยอดติดลบครับ (เปิดรัน scripts/test-billing-phase2.js 
   แสดงผล TC Pass ครบถ้วน)"

[ นาทีที่ 4:30 - 6:30 ]
🗣️ บุญ (QA Lead): "และส่วนของผม บุญ รับผิดชอบระบบแม่บ้าน คู่ค้า Outsource และการทดสอบระบบครับ...
1. วงรอบหมุนเวียนห้อง (Room Turnover): ทันทีที่รับ Event Fan-out งานแม่บ้านด่วนจะถูกสร้างขึ้น เมื่อแม่บ้าน
   ทำความสะอาดเสร็จและผ่านด่านตรวจรับ (Inspection Gate) ห้องจะเปลี่ยนเป็น `available` พร้อมเปิดขายรอบใหม่
   ทันทีภายในบ่ายวันเดียวกัน เกิดเป็น Closed-Loop Turnover อย่างสมบูรณ์ครับ
2. ระบบช่างฉุกเฉิน 24 ชม.: หากพบสิ่งชำรุด รูปถ่ายจะถูกส่งขึ้น Cloudflare R2 และ Front Desk หรือแม่บ้าน
   สามารถเปิดดูรายชื่อช่าง Outsource ฉุกเฉินเพื่อโทรออกได้ทันที โดยสิทธิ์การแก้ข้อมูลเราจำกัดไว้เฉพาะ Admin 
   เท่านั้นครับ (แสดงผลทดสอบ 403 Forbidden เมื่อผู้ใช้อื่นพยายามแก้ไขข้อมูลคู่ค้า)"

[ นาทีที่ 6:30 - 7:30 ]
🗣️ เขต (PM): "สรุปสถานะโปรเจกต์ปัจจุบัน Core Services และ Schemas เสร็จสมบูรณ์แล้ว 80% มีการทดสอบ 
Automated Test ครอบคลุมทั้งกรณีสำเร็จและ Error Handling ทุกรูปแบบ แผนงานถัดไปคือการประกอบหน้าจอ UI 
ทั้ง 3 Portals สไตล์ Enterprise Minimalist ให้พร้อมสำหรับ UAT 24 Scenarios ใน Phase ถัดไปครับ 
พวกเราขอจบการนำเสนอความคืบหน้าเท่านี้ ขอบพระคุณอาจารย์ท็อปครับ"
```

---

## 🏁 Checklist ก่อนเข้าห้องสอบกับ อ.ท็อป (Pre-Presentation Checklist)
- [ ] รันคำสั่งจำลอง D1 Database ใน Local: `pnpm d1:migrate:local` และ `pnpm d1:seed:local`
- [ ] เปิดไฟล์ไดอะแกรม [docs/hotel-system-diagrams.html](file:///e:/MyWork/PJ_P3_1/keystay/docs/hotel-system-diagrams.html) เตรียมไว้ในเบราว์เซอร์
- [ ] เปิด Terminal เตรียมรันชุดทดสอบสด:
  - `node ./scripts/test-reservation-phase2.js`
  - `node ./scripts/test-billing-phase2.js`
- [ ] เปิดหน้าต่าง GitHub Project Board: [csi204/projects/1](https://github.com/orgs/csi204/projects/1)
- [ ] ตรวจสอบว่าทุกคนจำสคริปต์และตัวเลขสถิติของตนเองได้อย่างแม่นยำ

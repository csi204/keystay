# 🧪 แผนการทดสอบการยอมรับของผู้ใช้ฉบับละเอียด (Detailed User Acceptance Testing: UAT)
# Hotel Management System — Cloudflare Serverless Microservices สำหรับโรงแรมขนาดเล็ก 5–10 ห้อง

> **เวอร์ชัน:** 1.0.0  
> **วันที่จัดทำ:** 19 กันยายน 2026  
> **ผู้รับผิดชอบหลัก (QA Lead):** เดียร์ (ธีรภัทร)  
> **ผู้ร่วมทดสอบ:** เขต (เขตโสภณ), บุญ (ปวริศ)  
> **สภาพแวดล้อมการทดสอบ:** Local Dev Environment (`http://localhost:8787`) & Cloudflare Preview Staging  
> **ข้อตกลงสำคัญ (DTO Rule):** ทุก Request/Response body ผ่าน API รับ-ส่งค่าเป็น `string` ทั้งหมดตามสถาปัตยกรรมระบบ

---

## สารบัญ
1. [ภาพรวมและเกณฑ์การผ่าน UAT (Acceptance Criteria)](#1-ภาพรวมและเกณฑ์การผ่าน-uat)
2. [ตารางผู้ใช้งานทดสอบและสิทธิ์ (Test User Personas & RBAC)](#2-ตารางผู้ใช้งานทดสอบและสิทธิ์)
3. [กลุ่มที่ 1: Front Desk Portal (UAT-FD01 ถึง UAT-FD07)](#กลุ่มที่-1-front-desk-portal)
4. [กลุ่มที่ 2: Housekeeping Portal (UAT-HK01 ถึง UAT-HK05)](#กลุ่มที่-2-housekeeping-portal)
5. [กลุ่มที่ 3: Billing & Cashier Portal (UAT-BL01 ถึง UAT-BL04)](#กลุ่มที่-3-billing--cashier-front-desk-portal)
6. [กลุ่มที่ 4: Manager & Admin Dashboard (UAT-MGR01 ถึง UAT-MGR05)](#กลุ่มที่-4-manager--admin-dashboard)
7. [กลุ่มที่ 5: การทดสอบ Asynchronous Event Fan-out 1:4 (UAT-INT01 ถึง UAT-INT03)](#กลุ่มที่-5-การทดสอบ-asynchronous-event-fan-out-14)
8. [แบบฟอร์มบันทึกสรุปผลและรายงานข้อผิดพลาด (Defect Log)](#8-แบบฟอร์มบันทึกสรุปผลและรายงานข้อผิดพลาด)

---

## 1. ภาพรวมและเกณฑ์การผ่าน UAT

### เกณฑ์การตัดสิน (Pass/Fail Criteria)
1. **Critical Functionality (100% Pass):** การจอง, เช็คอิน, เช็คเอาท์, สร้างบิล, สร้างงานแม่บ้าน ต้องทำงานถูกต้องครบวงจร ไม่เกิด Deadlock หรือ State ติดค้าง
2. **State Machine Integrity:** สถานะห้องพักต้องเปลี่ยนผ่านตาม 7 สถานะอย่างถูกต้อง (`available` → `reserved` → `occupied` → `checked_out` → `cleaning` → `available`) ห้ามข้ามขั้นตอน
3. **Data Consistency ข้าม Microservices:** เหตุการณ์ใน Outbox ต้องถูกส่งเข้า **Upstash QStash** และกระจาย Webhook ไปยัง Service ปลายทางครบถ้วน (At-least-once with Idempotency) — Fan-out Checkout ต้องไปครบ 4 Subscribers
4. **RBAC Security:** บัญชีแต่ละบทบาทต้องเข้าถึงได้เฉพาะ API และหน้าจอตามสิทธิ์ หากพยายามเข้าถึงนอกขอบเขตต้องได้รับ HTTP `403 Forbidden`

---

## 2. ตารางผู้ใช้งานทดสอบและสิทธิ์

| Persona ID | ชื่อบัญชี | Role | รหัสผ่านทดสอบ | สิทธิ์การเข้าถึง (Allowed Portals) |
|---|---|---|---|---|
| `USR-ADMIN` | `admin@hotel.local` | `admin` | `Password123!` | ทุกระบบ + จัดการผู้ใช้ + ดูแลโครงสร้างระบบ |
| `USR-MGR` | `manager@hotel.local` | `manager` | `Password123!` | ดูรายงาน, KPI Dashboard, อนุมัติการลดราคา |
| `USR-FD` | `frontdesk@hotel.local` | `front_desk` | `Password123!` | Front Desk & Cashier Portal — Room Matrix, จอง, เช็คอิน, เช็คเอาท์, **ออกบิล, รับชำระเงิน, พิมพ์ใบเสร็จ** (รวม Cashiering) |
| `USR-HK` | `housekeeping@hotel.local` | `housekeeping` | `Password123!` | Housekeeping Kanban, รับงาน, บันทึกงานเสร็จ, แจ้งชำรุด |

> ⚠️ **ไม่มี Role `billing` แยกต่างหาก** — เนื่องจากระบบออกแบบสำหรับโรงแรมขนาดเล็ก (5–10 ห้อง) พนักงานหน้าเคาน์เตอร์ (role=`front_desk`) จึงทำหน้าที่ Cashiering ควบคู่ด้วย ทั้งออกบิล รับเงินมัดจำ คิดค่ามินิบาร์ และออกใบเสร็จ การทดสอบ Billing & Cashier จึงดำเนินการด้วยสิทธิ์ `USR-FD` Token

---

## กลุ่มที่ 1: Front Desk Portal

### UAT-FD01: ตรวจสอบสถานะห้องพักบน Room Matrix Grid
* **รหัสกรณีทดสอบ:** UAT-FD01
* **ผู้ทดสอบ:** เดียร์ (ธีรภัทร) / บุญ (ปวริศ)
* **บทบาท:** Front Desk (`USR-FD`)
* **วัตถุประสงค์:** ตรวจสอบการแสดงผลสถานะห้องพักตามชั้น พร้อมสีสถานะถูกต้องตาม Design System
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. เข้าสู่ระบบด้วยบัญชี Front Desk สำเร็จ
  2. มีข้อมูลห้องพักในระบบจำลองสำหรับโรงแรมขนาดเล็ก (เช่น 8–10 ห้อง) กระจายอยู่ในชั้น 1, 2
  3. ห้องพักมีสถานะที่หลากหลาย (Available, Reserved, Occupied, Cleaning, Maintenance)
* **ขั้นตอนการทดสอบ:**
  1. เข้าสู่หน้า Front Desk Portal (`/front-desk/rooms`)
  2. สังเกตการแสดงผลของ Room Grid ภาพรวมทั้งหมด
  3. คลิก Dropdown ตัวกรอง "ชั้น (Floor)" แล้วเลือก "ชั้น 2"
  4. คลิกตัวกรองสถานะ "ว่าง (Available)"
* **ข้อมูลนำเข้า (Input Data):**
  * Filter Floor: `"2"`
  * Filter Status: `"available"`
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. API Gateway ส่ง Request ไปยัง `GET /rooms?floor=2&status=available`
  2. ได้รับ HTTP `200 OK` พร้อมรายการห้องพักที่เป็น array
  3. หน้าจอแสดงผลเฉพาะห้องพักชั้น 2 ที่มีสถานะ Available เท่านั้น
  4. สีของ Room Badge แสดงผลเป็นสีเขียวอ่อน (`#dcfce7`, ขอบ `#86efac`, ข้อความ `#166534`)
* **การตรวจสอบ (Verification):**
  * ไม่มีห้องพักของชั้น 1 หรือชั้น 3 ปรากฏในผลลัพธ์
  * จำนวนห้องที่แสดงตรงกับผลลัพธ์จากฐานข้อมูล `db_room`
* **สถานะ:** ✅ Pass

---

### UAT-FD02: การสร้างรายการจองห้องพักล่วงหน้า (Advance Booking)
* **รหัสกรณีทดสอบ:** UAT-FD02
* **ผู้ทดสอบ:** เดียร์ (ธีรภัทร)
* **บทบาท:** Front Desk (`USR-FD`)
* **วัตถุประสงค์:** สร้างการจองล่วงหน้าสำหรับห้องพักประเภท Deluxe และตรวจสอบว่า **`rooms.status` ไม่เปลี่ยนแปลงทันที** (Night Audit Cron จะปรับเป็น `reserved` วันเช็คอินจริงเท่านั้น)
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. ห้องพักหมายเลข 201 (Deluxe Room) มีสถานะเป็น `available`
  2. มีข้อมูล Guest ในระบบ หรือสร้าง Guest ใหม่พร้อมการจอง
* **ขั้นตอนการทดสอบ:**
  1. กดปุ่ม "+ สร้างการจอง (New Reservation)"
  2. กรอกข้อมูลแขกผู้เข้าพัก: นายสมชาย ใจดี, เบอร์โทร 0812345678, อีเมล `somchai@example.com`
  3. เลือกห้องพัก: ห้อง 201 (Deluxe Double Bed)
  4. เลือกวันเช็คอิน: `"2026-10-01"`, วันเช็คเอาท์: `"2026-10-04"` (รวม 3 คืน)
  5. กดยืนยันการจอง (Confirm Booking)
* **ข้อมูลนำเข้า API (Request Body DTO):**
  ```json
  POST /reservations
  Header: Authorization: Bearer <FD_TOKEN>
  {
    "guestName": "สมชาย ใจดี",
    "guestPhone": "0812345678",
    "guestEmail": "somchai@example.com",
    "roomId": "room-uuid-201",
    "checkInDate": "2026-10-01",
    "checkOutDate": "2026-10-04",
    "totalNights": "3",
    "nightlyRate": "1500.00",
    "bookingType": "standard"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `201 Created` พร้อม `reservationId` และรหัสการจอง `BK-xxxxxx`
  2. ตาราง `reservations` ใน `db_reservation` มีสถานะเป็น `confirmed`
  3. ตาราง `outbox_events` บันทึก Event `ReservationCreated`
  4. ✅ **ห้อง 201 ใน `db_room` ยังคงสถานะ `available`** — ไม่เปลี่ยนเป็น `reserved` ทันที (Night Audit Cron จะปรับในวันที่ 2026-10-01 เวลา 02:00 น.)
  5. หน้าจอแสดง Toast แจ้งเตือน "สร้างการจองสำเร็จ" และห้อง 201 บน Room Matrix ยังแสดงเป็นสีเขียว (Available) จนถึงวันเช็คอิน
* **สถานะ:** ✅ Pass

---

### UAT-FD03: การเช็คอินเข้าพักสำเร็จ (Check-in Flow)
* **รหัสกรณีทดสอบ:** UAT-FD03
* **ผู้ทดสอบ:** เดียร์ (ธีรภัทร) / บุญ (ปวริศ)
* **บทบาท:** Front Desk (`USR-FD`)
* **วัตถุประสงค์:** ทำการเช็คอินแขกที่จองไว้ล่วงหน้า เปลี่ยนสถานะการจองเป็น `checked_in` และห้องเป็น `occupied`
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. มีรายการจองสถานะ `confirmed` หมายเลขห้อง 201
  2. ห้องพัก 201 มีสถานะ `reserved`
* **ขั้นตอนการทดสอบ:**
  1. ค้นหารายการจองของ "สมชาย ใจดี" หรือคลิกที่ห้อง 201 บน Room Matrix
  2. กดปุ่ม "ดำเนินการเช็คอิน (Check-in)"
  3. ตรวจสอบบัตรประชาชน/เอกสารยืนยันตัวตน
  4. กดยืนยันการเช็คอิน
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  POST /reservations/res-uuid-001/check-in
  Header: Authorization: Bearer <FD_TOKEN>
  {
    "actualCheckIn": "2026-10-01T14:15:00Z",
    "idCardNumber": "1100200300400",
    "depositAmount": "1000.00"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `200 OK`
  2. สถานะการจองใน `db_reservation` เปลี่ยนเป็น `checked_in`
  3. Event `ReservationCheckedIn` ถูกบันทึกใน `outbox_events` และส่งเข้า **Upstash QStash Topic: `hotel.reservation.checkin`**
  4. QStash ส่ง Webhook ไปยัง `room-inventory` → อัปเดตสถานะห้อง 201 เป็น `occupied`
  5. หน้าจอแสดงสีสถานะห้อง 201 เป็นสีน้ำเงินเข้ม (`#dbeafe`, ข้อความ `#1e40af`)
* **สถานะ:** ✅ Pass

---

### UAT-FD04: การปฏิเสธการเช็คอินในเงื่อนไขที่ไม่ถูกต้อง (Negative Test)
* **รหัสกรณีทดสอบ:** UAT-FD04
* **ผู้ทดสอบ:** เดียร์ (ธีรภัทร)
* **บทบาท:** Front Desk (`USR-FD`)
* **วัตถุประสงค์:** ยืนยันว่าระบบปฏิเสธการเช็คอินหากรายการจองถูกยกเลิก (cancelled) หรือเช็คเอาท์ไปแล้ว
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. มีรายการจอง ID `res-uuid-cancelled` ที่มีสถานะเป็น `cancelled` ในฐานข้อมูล
* **ขั้นตอนการทดสอบ:**
  1. พยายามยิง Request เช็คอินรายการจองที่ถูกยกเลิก
* **ข้อมูลนำเข้า API:**
  ```json
  POST /reservations/res-uuid-cancelled/check-in
  Header: Authorization: Bearer <FD_TOKEN>
  {}
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ระบบตอบกลับ HTTP `400 Bad Request` หรือ `422 Unprocessable Entity`
  2. Response Body ส่งข้อความ Error ชัดเจน:
     ```json
     {
       "success": "false",
       "error": "INVALID_STATE_TRANSITION",
       "message": "ไม่สามารถเช็คอินได้เนื่องจากรายการจองมีสถานะ cancelled"
     }
     ```
  3. สถานะห้องพักใน `db_room` ไม่มีการเปลี่ยนแปลง
* **สถานะ:** ✅ Pass

---

### UAT-FD05: การเช็คเอาท์และกระจาย Event Fan-out 1:4 (Check-out Flow)
* **รหัสกรณีทดสอบ:** UAT-FD05
* **ผู้ทดสอบ:** เดียร์ (ธีรภัทร), เขต (เขตโสภณ), บุญ (ปวริศ)
* **บทบาท:** Front Desk (`USR-FD`)
* **วัตถุประสงค์:** ทำการเช็คเอาท์ห้องพัก และตรวจสอบว่า Event `ReservationCheckedOut` กระจาย Webhook ผ่าน **Upstash QStash** ไปยัง **4 Subscribers พร้อมกัน** (Room Inventory, Housekeeping, Billing, Report)
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. รายการจองสถานะ `checked_in` หมายเลขห้อง 201
  2. สถานะห้องพัก 201 เป็น `occupied`
* **ขั้นตอนการทดสอบ:**
  1. หน้าจอ Front Desk เลือกห้อง 201 กดปุ่ม "เช็คเอาท์ (Check-out)"
  2. ตรวจสอบสรุปการพัก และกดยืนยันการเช็คเอาท์
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  POST /reservations/res-uuid-001/check-out
  Header: Authorization: Bearer <FD_TOKEN>
  {
    "actualCheckOut": "2026-10-04T11:45:00Z",
    "keyCardReturned": "true",
    "note": "แขกขอใบเสร็จฉบับพิมพ์"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `200 OK`
  2. สถานะการจองใน `db_reservation` เปลี่ยนเป็น `checked_out`
  3. ตาราง `outbox_events` ใน `db_reservation` มี Event `ReservationCheckedOut`
  4. Event ถูกส่งเข้า **Upstash QStash Topic: `hotel.reservation.checkout`** และเกิด Webhook Fan-out ไปยัง 4 Subscribers พร้อมกัน:
     * **Room Inventory Service:** ปรับสถานะห้อง 201 ใน `db_room` เป็น `checked_out` ทันที
     * **Housekeeping Service:** สร้าง Task ทำความสะอาดห้อง 201 อัตโนมัติ (สถานะ `pending`)
     * **Billing Service:** คำนวณยอดเงินและสร้าง Bill อัตโนมัติ (สถานะ `pending`, รอรวมยอดมินิบาร์)
     * **Report Service:** บันทึกสถิติการเช็คเอาท์ประจำวัน
  5. สถานะห้อง 201 ใน `db_room` เปลี่ยนเป็น `checked_out` (สีเหลืองอำพัน `#fef3c7`)
* **สถานะ:** ✅ Pass

---

### UAT-FD06: การทำรายการแบบ Walk-in (One-step Walk-in)
* **รหัสกรณีทดสอบ:** UAT-FD06
* **ผู้ทดสอบ:** เดียร์ (ธีรภัทร)
* **บทบาท:** Front Desk (`USR-FD`)
* **วัตถุประสงค์:** สร้างการจองและเช็คอินสำเร็จในขั้นตอนเดียวสำหรับแขก Walk-in
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. ห้องพัก 102 (Standard Room) มีสถานะเป็น `available`
* **ขั้นตอนการทดสอบ:**
  1. กดปุ่ม "รับแขก Walk-in"
  2. เลือกห้อง 102 กรอกชื่อ "นารี รุ่งเรือง", พัก 1 คืน
  3. กดยืนยันการ Walk-in
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  POST /reservations/walk-in
  Header: Authorization: Bearer <FD_TOKEN>
  {
    "guestName": "นารี รุ่งเรือง",
    "guestPhone": "0898765432",
    "roomId": "room-uuid-102",
    "checkInDate": "2026-10-01",
    "checkOutDate": "2026-10-02",
    "totalNights": "1",
    "nightlyRate": "1000.00",
    "bookingType": "walk_in",
    "depositAmount": "500.00"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `201 Created`
  2. รายการจองถูกสร้างและมีสถานะเป็น `checked_in` ทันที
  3. สถานะห้อง 102 เปลี่ยนเป็น `occupied` ทันทีโดยไม่ต้องผ่านสถานะ `reserved`
* **สถานะ:** ✅ Pass

---

### UAT-FD07: การเรียกดูและใช้งานสมุดเบอร์ช่างฉุกเฉิน Outsource (Quick Emergency Contact Drawer)
* **รหัสกรณีทดสอบ:** UAT-FD07
* **ผู้ทดสอบ:** เดียร์ (ธีรภัทร)
* **บทบาท:** Front Desk (`USR-FD`)
* **วัตถุประสงค์:** ตรวจสอบว่าพนักงานต้อนรับสามารถเปิดแถบด่วน Quick Emergency Contact เพื่อดูเบอร์โทรช่างฉุกเฉิน 24 ชม. (แอร์, ประปา, ไฟฟ้า) และสามารถกดโทรออกหรือคัดลอกเบอร์โทรได้ทันทีเมื่อแขกร้องเรียนปัญหาห้องพักช่วงดึก
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. เข้าสู่ระบบด้วยบัญชี Front Desk สำเร็จ
  2. มีข้อมูล Outsource ในฐานข้อมูล `db_housekeeping` ทั้งประเภทฉุกเฉิน (`is_emergency = 1`) และบริการทั่วไป
* **ขั้นตอนการทดสอบ:**
  1. เข้าสู่หน้า Front Desk Portal (`/front-desk/rooms`)
  2. คลิกปุ่มด่วน "🚨 เบอร์ช่างฉุกเฉิน (Emergency Contact)" บนแถบ Header หรือ Matrix Action Bar
  3. ตรวจสอบการเปิดขึ้นของ Slide-over Drawer รายชื่อช่างฉุกเฉิน
  4. ทดสอบกดปุ่มตัวกรองหมวดหมู่ "แอร์ / ระบบปรับอากาศ (Air Conditioning)"
  5. ทดสอบคลิกปุ่มโทรออก (`tel:...`) หรือคลิกปุ่ม "คัดลอกเบอร์ / LINE"
* **ข้อมูลนำเข้า API:**
  ```http
  GET /housekeeping/outsource-contacts?is_emergency=1&is_active=1
  Header: Authorization: Bearer <FD_TOKEN>
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. API Gateway ส่ง Request ไปยัง Housekeeping Service และตอบกลับ HTTP `200 OK`
  2. รายชื่อช่างฉุกเฉินแสดงผลพร้อม Badge สีแดงระบุ "24 ชั่วโมง" คมชัด
  3. แสดงข้อมูลสำคัญครบถ้วน: ชื่อร้าน/ช่าง, ประเภทงาน, เบอร์โทรหลัก, เบอร์สำรอง, และ LINE ID
  4. ฟังก์ชัน Click-to-Call เชื่อมโยงกับโปรโตคอล `tel:` ถูกต้อง
  5. พนักงานสามารถเปิดดูได้แบบ Read Only โดยไม่มีปุ่มเพิ่ม/ลบ/แก้ไขข้อมูล (ป้องกันการแก้ไขคลาดเคลื่อน)
* **สถานะ:** ✅ Pass

---

## กลุ่มที่ 2: Housekeeping Portal

### UAT-HK01: การสร้างงานทำความสะอาดอัตโนมัติเมื่อเช็คเอาท์ (Auto Task Creation)
* **รหัสกรณีทดสอบ:** UAT-HK01
* **ผู้ทดสอบ:** บุญ (ปวริศ)
* **บทบาท:** Housekeeping Lead (`USR-HK`)
* **วัตถุประสงค์:** ยืนยันว่าเมื่อเกิด Event `ReservationCheckedOut` งานทำความสะอาดจะปรากฏในระบบแม่บ้านอัตโนมัติ
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. ทำการเช็คเอาท์ห้อง 201 จากกรณีทดสอบ UAT-FD05 สำเร็จ
* **ขั้นตอนการทดสอบ:**
  1. เข้าสู่หน้า Housekeeping Portal (`/housekeeping/tasks`)
  2. ตรวจสอบคอลัมน์ "รอมอบหมาย (Pending)" บนบอร์ด Kanban
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. พบการ์ดงานใหม่: "ทำความสะอาดห้อง 201 (Checkout Clean)"
  2. ข้อมูลบนการ์ดระบุ: ชั้น 2, ประเภทห้อง Deluxe, ความสำคัญตามเงื่อนไข
  3. ตรวจสอบข้อมูลในฐานข้อมูล `db_housekeeping` พบเรคคอร์ดในตาราง `tasks` สถานะ `pending`
* **สถานะ:** ✅ Pass

---

### UAT-HK02: การมอบหมายงานทำความสะอาดให้พนักงาน (Assign Task)
* **รหัสกรณีทดสอบ:** UAT-HK02
* **ผู้ทดสอบ:** บุญ (ปวริศ)
* **บทบาท:** Housekeeping Lead (`USR-HK`)
* **วัตถุประสงค์:** หัวหน้าแม่บ้านมอบหมายงานให้พนักงานแม่บ้านรายบุคคล
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. มี Task ทำความสะอาดห้อง 201 สถานะ `pending`
  2. มีข้อมูลพนักงานแม่บ้าน "สมศรี ขยันยิ่ง" (`staff-uuid-001`) ในสถานะพร้อมรับงาน
* **ขั้นตอนการทดสอบ:**
  1. คลิกที่การ์ดงานห้อง 201
  2. เลือกผู้รับผิดชอบ: "สมศรี ขยันยิ่ง"
  3. กดยืนยันการมอบหมาย
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  PUT /housekeeping/tasks/task-uuid-201/assign
  Header: Authorization: Bearer <HK_TOKEN>
  {
    "assignedTo": "staff-uuid-001",
    "priority": "high",
    "estimatedMinutes": "45"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `200 OK`
  2. สถานะ Task เปลี่ยนเป็น `assigned`
  3. ห้องพักเปลี่ยนสถานะเป็น `cleaning` (สีม่วง `#f3e8ff`)
  4. การ์ดย้ายไปอยู่ในคอลัมน์ "กำลังดำเนินการ (In Progress)"
* **สถานะ:** ✅ Pass

---

### UAT-HK03: การทำความสะอาดเสร็จสิ้นและคืนห้องพักพร้อมขาย (Complete Cleaning)
* **รหัสกรณีทดสอบ:** UAT-HK03
* **ผู้ทดสอบ:** บุญ (ปวริศ)
* **บทบาท:** Housekeeping Staff (`USR-HK`)
* **วัตถุประสงค์:** แม่บ้านบันทึกงานเสร็จสิ้น ส่ง Event ปรับสถานะห้องพักกลับเป็น `available`
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. Task ห้อง 201 อยู่ในสถานะ `in_progress` หรือ `assigned`
  2. ห้องพักอยู่ในสถานะ `cleaning`
* **ขั้นตอนการทดสอบ:**
  1. แม่บ้านเข้าสู่ระบบ เลือกงานห้อง 201
  2. กดปุ่ม "เสร็จสิ้นงานทำความสะอาด (Complete Task)"
  3. กรอกผลการตรวจความเรียบร้อย: ผ่าน (Passed)
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  PUT /housekeeping/tasks/task-uuid-201/complete
  Header: Authorization: Bearer <HK_TOKEN>
  {
    "completedAt": "2026-10-04T12:30:00Z",
    "inspectionStatus": "passed",
    "notes": "เปลี่ยนผ้าปูที่นอน เติมสบู่และน้ำดื่มครบถ้วน"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `200 OK`
  2. Task ใน `db_housekeeping` เปลี่ยนสถานะเป็น `completed`
  3. Event `HousekeepingTaskCompleted` ถูกบันทึกใน `outbox_events` และส่งเข้า **Upstash QStash Topic: `hotel.housekeeping.completed`**
  4. QStash ส่ง Webhook ไปยัง `room-inventory` → ปรับสถานะห้อง 201 จาก `cleaning` กลับเป็น `available` (สีเขียว)
  5. ห้อง 201 พร้อมสำหรับการจองใหม่ทันที
* **สถานะ:** ✅ Pass

---

### UAT-HK04: การแจ้งสิ่งของชำรุดและการปรับห้องเป็น Maintenance (Report Issue)
* **รหัสกรณีทดสอบ:** UAT-HK04
* **ผู้ทดสอบ:** บุญ (ปวริศ)
* **บทบาท:** Housekeeping Staff (`USR-HK`)
* **วัตถุประสงค์:** แม่บ้านตรวจพบสิ่งชำรุด แจ้งซ่อม และระบบปรับสถานะห้องเป็น `maintenance` เพื่อระงับการขาย
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. ห้อง 203 อยู่ในระหว่างทำความสะอาด
* **ขั้นตอนการทดสอบ:**
  1. กดปุ่ม "แจ้งชำรุด / ส่งซ่อม (Report Issue)" บนการ์ดห้อง 203
  2. เลือกหมวดหมู่: ประปา/ห้องน้ำ
  3. ระบุรายละเอียด: "ก๊อกน้ำอ่างล้างหน้ารั่วซึมมาก ไม่สามารถเปิดใช้งานได้"
  4. เลือกระดับความรุนแรง: สูง (High)
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  POST /housekeeping/issues
  Header: Authorization: Bearer <HK_TOKEN>
  {
    "roomId": "room-uuid-203",
    "roomNumber": "203",
    "issueCategory": "plumbing",
    "severity": "high",
    "description": "ก๊อกน้ำอ่างล้างหน้ารั่วซึมมาก ไม่สามารถเปิดใช้งานได้",
    "reportedBy": "staff-uuid-001"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `201 Created` พร้อม `issueId`
  2. สร้างรายการในตาราง `room_issues`
  3. ส่ง Event ปรับสถานะห้อง 203 ใน `db_room` เป็น `maintenance` (สีส้ม `#ffedd5`)
  4. เมื่อเจ้าหน้าที่ Front Desk พยายามจองห้อง 203 ระบบต้องแสดงว่าห้องนี้ไม่ว่าง
* **สถานะ:** ✅ Pass

---

### UAT-HK05: การเข้าถึงเบอร์ช่างเฉพาะทาง Outsource เพื่อประสานงานซ่อมบำรุงหน้างาน
* **รหัสกรณีทดสอบ:** UAT-HK05
* **ผู้ทดสอบ:** บุญ (ปวริศ)
* **บทบาท:** Housekeeping Staff (`USR-HK`)
* **วัตถุประสงค์:** ตรวจสอบว่าพนักงานแม่บ้านสามารถกดปุ่ม "Quick Contact (ดูเบอร์ช่าง)" บนอุปกรณ์พกพาเพื่อโทรสอบถามหรือนัดหมายช่างภายนอกเข้าซ่อมบำรุงควบคู่กับการเปิดใบงาน (Report Room Issue)
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. เข้าสู่ระบบด้วยบัญชี Housekeeping สำเร็จ
  2. มีข้อมูลช่าง Outsource ประเภทซ่อมบำรุงและสุขภัณฑ์ในระบบ
* **ขั้นตอนการทดสอบ:**
  1. เข้าสู่หน้า Housekeeping Portal (`/housekeeping/tasks`)
  2. กดปุ่ม "📞 ติดต่อช่างซ่อม (Vendor Contacts)" บนแถบเครื่องมือ
  3. ตรวจสอบการแสดงผลรายชื่อช่างพร้อมป้ายกำกับประเภทงาน (ประปา, ไฟฟ้า, งานไม้, แอร์)
  4. ทดสอบกดปุ่มโทรออกไปยังช่างเพื่อสอบถามการเข้าซ่อม
* **ข้อมูลนำเข้า API:**
  ```http
  GET /housekeeping/outsource-contacts?category=plumbing&is_active=1
  Header: Authorization: Bearer <HK_TOKEN>
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. API Gateway อนุญาตให้สิทธิ์ `housekeeping` เข้าถึงข้อมูลในรูปแบบ Read Only ได้รับ HTTP `200 OK`
  2. แสดงเบอร์โทรและเวลาทำการของช่างชัดเจน
  3. ไม่มีสิทธิ์เข้าถึงปุ่มแก้ไขหรือลบข้อมูลช่าง
* **สถานะ:** ✅ Pass

---

## กลุ่มที่ 3: Billing & Cashier (Front Desk Portal)

### UAT-BL01: การสร้างบิลเรียกเก็บเงินอัตโนมัติจาก Check-out Event (Auto Bill Creation)
* **รหัสกรณีทดสอบ:** UAT-BL01
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Front Desk Cashier (`USR-FD`)
* **วัตถุประสงค์:** ยืนยันว่า Event `ReservationCheckedOut` สร้างบิลพร้อมคำนวณค่าห้องและภาษี 7% ถูกต้อง
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. ทำการเช็คเอาท์การจองห้อง 201 (3 คืน, คืนละ 1,500 บาท) สำเร็จ
* **ขั้นตอนการทดสอบ:**
  1. เข้าสู่หน้า Front Desk & Cashier Portal (`/front-desk/bills`)
  2. ค้นหาบิลของรายการจอง `BK-xxxxxx` หรือชื่อ "สมชาย ใจดี"
  3. เปิดดูรายละเอียดบิล (Bill Detail)
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. พบใบแจ้งหนี้ใหม่ สถานะ `pending`
  2. มีรายการ `bill_items`:
     * ค่าห้องพัก Deluxe Room (3 คืน x 1,500.00) = 4,500.00 บาท
     * ภาษีมูลค่าเพิ่ม VAT 7% = 315.00 บาท
     * ยอดรวมสุทธิ (Net Total) = 4,815.00 บาท
  3. ตัวเลขคำนวณถูกต้องตามคณิตศาสตร์ทุกจุด
* **สถานะ:** ✅ Pass

---

### UAT-BL02: การเพิ่มรายการค่าใช้จ่ายเสริม (Add Extra Charge)
* **รหัสกรณีทดสอบ:** UAT-BL02
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Front Desk Cashier (`USR-FD`)
* **วัตถุประสงค์:** เพิ่มค่าใช้จ่ายเพิ่มเติม (มินิบาร์, ค่าอาหาร) และตรวจสอบการคำนวณยอดรวมใหม่
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. มีบิลของห้อง 201 สถานะ `pending` ยอดเดิม 4,815.00 บาท
* **ขั้นตอนการทดสอบ:**
  1. ในหน้าบิล กดปุ่ม "+ เพิ่มรายการค่าใช้จ่าย (Add Item)"
  2. ระบุรายการ: "เครื่องดื่มมินิบาร์ (เบียร์ 2 กระป๋อง, ถั่ว 1 ซอง)"
  3. ระบุจำนวนเงิน: 250.00 บาท
  4. กดยืนยันการเพิ่มรายการ
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  POST /billing/bills/bill-uuid-201/items
  Header: Authorization: Bearer <FD_TOKEN>
  {
    "itemName": "เครื่องดื่มมินิบาร์",
    "category": "minibar",
    "quantity": "1",
    "unitPrice": "250.00",
    "amount": "250.00"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `201 Created`
  2. รายการใหม่ถูกบันทึกลงใน `bill_items`
  3. ยอดรวมของบิลปรับเป็น:
     * ค่าบริการรวม = 4,500 + 250 = 4,750.00 บาท
     * ภาษี 7% = 332.50 บาท
     * ยอดรวมสุทธิใหม่ = 5,082.50 บาท
* **สถานะ:** ✅ Pass

---

### UAT-BL03: การรับชำระเงินและปิดบิล (Payment Processing)
* **รหัสกรณีทดสอบ:** UAT-BL03
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Front Desk Cashier (`USR-FD`)
* **วัตถุประสงค์:** บันทึกการรับชำระเงินเต็มจำนวน เปลี่ยนสถานะบิลเป็น `paid`
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. บิลสถานะ `pending` มียอดค้างชำระ 5,082.50 บาท
* **ขั้นตอนการทดสอบ:**
  1. กดปุ่ม "ชำระเงิน (Pay Bill)"
  2. เลือกวิธีการชำระเงิน: บัตรเครดิต (Credit Card)
  3. ระบุเลขอ้างอิงสลิป: `TXN-987654321`
  4. กดยืนยันการรับชำระ
* **ข้อมูลนำเข้า API (Request DTO):**
  ```json
  POST /billing/bills/bill-uuid-201/payments
  Header: Authorization: Bearer <FD_TOKEN>
  {
    "paymentMethod": "credit_card",
    "amount": "5082.50",
    "transactionReference": "TXN-987654321",
    "receivedAt": "2026-10-04T12:00:00Z"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `200 OK`
  2. สถานะบิลใน `db_billing` เปลี่ยนเป็น `paid`
  3. ยอดคงค้าง (Outstanding Balance) เป็น `0.00`
  4. Event `BillPaid` ถูกส่งเข้า **Upstash QStash Topic: `hotel.billing.paid`** → Webhook ไปยัง Report Service เพื่อบันทึกรายได้
* **สถานะ:** ✅ Pass

---

### UAT-BL04: การออกใบเสร็จรับเงิน/ใบกำกับภาษี (Issue Receipt & Invoice)
* **รหัสกรณีทดสอบ:** UAT-BL04
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Front Desk Cashier (`USR-FD`)
* **วัตถุประสงค์:** สร้างและแสดงผลใบเสร็จรับเงินฉบับสมบูรณ์สำหรับพิมพ์ให้แขก
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. บิลมีสถานะเป็น `paid`
* **ขั้นตอนการทดสอบ:**
  1. กดปุ่ม "พิมพ์ใบเสร็จรับเงิน (Print Receipt)"
  2. ตรวจสอบหน้าต่างแสดงตัวอย่างเอกสาร (Invoice/Receipt Preview)
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `200 OK` พร้อมข้อมูลหัวบิลครบถ้วน
  2. หน้าจอแสดงเลขที่ใบเสร็จ (e.g. `INV-202610-0042`), ข้อมูลโรงแรม, ชื่อแขก, รายการค่าใช้จ่าย, ภาษี 7%, ยอดชำระ และช่องลงนาม
  3. รองรับการกด Print ผ่าน Browser Dialog
* **สถานะ:** ✅ Pass

---

## กลุ่มที่ 4: Manager & Admin Dashboard

### UAT-MGR01: การแสดงผล Dashboard ผู้บริหารและสถิติ Real-time
* **รหัสกรณีทดสอบ:** UAT-MGR01
* **ผู้ทดสอบ:** บุญ (ปวริศ) / เขต (เขตโสภณ)
* **บทบาท:** Manager (`USR-MGR`)
* **วัตถุประสงค์:** ตรวจสอบความถูกต้องของ KPI Dashboard (Occupancy Rate, รายได้รวม, จำนวนการจอง)
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. มีการทำรายการจอง เช็คอิน เช็คเอาท์ และชำระเงินในระบบแล้ว
* **ขั้นตอนการทดสอบ:**
  1. เข้าสู่ระบบด้วยบัญชีผู้จัดการ
  2. เข้าหน้า Dashboard (`/dashboard`)
  3. ตรวจสอบ Widget สถิติต่างๆ
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. แสดงอัตราการเข้าพัก (Occupancy Rate %) ตรงกับสูตร: `(ห้อง occupied / ห้องทั้งหมด) * 100`
  2. แสดงยอดรายได้รวมของวัน (Today's Revenue) ตรงกับยอดชำระเงินใน Billing Service
  3. แสดงจำนวนห้องว่าง, ห้องรอทำความสะอาด, และห้องแจ้งซ่อม ถูกต้องแบบ Real-time
* **สถานะ:** ✅ Pass

---

### UAT-MGR02: การควบคุมสิทธิ์การเข้าถึงผ่านระบบ (RBAC Security Guard)
* **รหัสกรณีทดสอบ:** UAT-MGR02
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Housekeeping Staff (`USR-HK`)
* **วัตถุประสงค์:** ยืนยันว่าพนักงานแม่บ้านไม่สามารถเข้าถึงหน้า Admin หรือเรียก API ส่วนจัดการผู้ใช้ได้
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. ล็อกอินด้วยบัญชีแม่บ้าน ได้รับ JWT Token ที่มี role: `housekeeping`
* **ขั้นตอนการทดสอบ:**
  1. พยายามเปิด URL หน้า Admin: `http://localhost:5173/admin/users`
  2. พยายามยิง Request ตรงไปยัง API Gateway:
     ```http
     GET /users
     Header: Authorization: Bearer <HK_TOKEN>
     ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ฝั่ง UI: ระบบตรวจสอบ Role และ Redirect กลับไปยังหน้า `/housekeeping/tasks` พร้อม Toast แจ้ง "ไม่มีสิทธิ์เข้าถึงหน้านี้"
  2. ฝั่ง API Gateway: Middleware `rbac.ts` ตรวจพบ Role ไม่ตรง ปฏิเสธด้วย HTTP `403 Forbidden`:
     ```json
     {
       "success": "false",
       "error": "FORBIDDEN",
       "message": "Role 'housekeeping' does not have permission to access this resource"
     }
     ```
* **สถานะ:** ✅ Pass

---

### UAT-MGR03: การส่งออกรายงานรายได้ประจำเดือนเป็น CSV (Export CSV)
* **รหัสกรณีทดสอบ:** UAT-MGR03
* **ผู้ทดสอบ:** บุญ (ปวริศ)
* **บทบาท:** Manager (`USR-MGR`)
* **วัตถุประสงค์:** ดาวน์โหลดรายงานสรุปรายได้และสถิติในรูปแบบไฟล์ CSV
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. มีข้อมูลธุรกรรมใน `report-analytics` อย่างน้อย 1 เดือน
* **ขั้นตอนการทดสอบ:**
  1. เข้าเมนู "รายงาน (Reports)" เลือกช่วงเดือน ตุลาคม 2026
  2. คลิกปุ่ม "ส่งออก CSV (Export CSV)"
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. เบราว์เซอร์ดาวน์โหลดไฟล์ชื่อ `revenue-report-2026-10.csv`
  2. ไฟล์เปิดได้ด้วย Microsoft Excel / Google Sheets โดยภาษาไทยไม่เป็นภาษาต่างดาว (UTF-8 BOM)
  3. คอลัมน์ประกอบด้วย: วันที่, จำนวนเช็คอิน, จำนวนเช็คเอาท์, รายได้ค่าห้อง, รายได้เสริม, ภาษี, ยอดสุทธิ
* **สถานะ:** ✅ Pass

---

### UAT-MGR04: การส่งออกรายงานสรุปเป็น PDF (Export PDF)
* **รหัสกรณีทดสอบ:** UAT-MGR04
* **ผู้ทดสอบ:** บุญ (ปวริศ)
* **บทบาท:** Manager (`USR-MGR`)
* **วัตถุประสงค์:** ดาวน์โหลดรายงานผลการดำเนินงานและสถิติแม่บ้านในรูปแบบ PDF
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. มีข้อมูลงานแม่บ้านและสถิติห้องพัก
* **ขั้นตอนการทดสอบ:**
  1. เข้าหน้าสรุปผลการปฏิบัติงาน เลือก "ส่งออกสรุป PDF (Export Executive Summary)"
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. เบราว์เซอร์ดาวน์โหลดไฟล์ PDF รูปแบบเรียบร้อย
  2. ประกอบด้วยกราฟสรุป Occupancy Rate, ตารางคะแนนประสิทธิภาพแม่บ้าน, และโลโก้โรงแรม
* **สถานะ:** ✅ Pass

---

### UAT-MGR05: การจัดการข้อมูลคู่ค้าและช่าง Outsource (Full CRUD & Status Deactivation)
* **รหัสกรณีทดสอบ:** UAT-MGR05
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Admin (`USR-ADMIN`)
* **วัตถุประสงค์:** ทดสอบว่าผู้ดูแลระบบ (Admin) มีสิทธิ์ Full CRUD ในการเพิ่ม, แก้ไข, ลบ/ระงับการใช้งาน (`is_active = 0`) ข้อมูล Outsource ผ่าน Admin Portal เพื่อควบคุมความถูกต้องของ Master Data
* **เงื่อนไขเริ่มต้น (Preconditions):**
  1. เข้าสู่ระบบด้วยบัญชี Admin (`USR-ADMIN`) สำเร็จ
* **ขั้นตอนการทดสอบ:**
  1. เข้าสู่หน้า Admin Portal เมนู "คู่ค้า & ช่างภายนอก (`/admin/outsource`)"
  2. คลิกปุ่ม "+ เพิ่มคู่ค้า Outsource (Add Vendor)"
  3. กรอกข้อมูลช่าง: ชื่อ "บจก. สยามแอร์เซอร์วิส", หมวดหมู่ `air_conditioning`, บริการ "ซ่อม/ล้างแอร์ห้องพัก", เบอร์โทร `"0899998888"`, ติ๊กถูกเบอร์ฉุกเฉิน 24 ชม.
  4. กดยืนยันบันทึกข้อมูล
  5. ทดสอบแก้ไขเบอร์โทรศัพท์เป็น `"0899997777"`
  6. ทดสอบคลิกปุ่ม "ระงับการใช้งาน (Deactivate)" เพื่อเปลี่ยนสถานะเป็น `is_active = 0`
* **ข้อมูลนำเข้า API:**
  ```http
  POST /housekeeping/outsource-contacts
  Header: Authorization: Bearer <ADMIN_TOKEN>
  {
    "name": "บจก. สยามแอร์เซอร์วิส",
    "category": "air_conditioning",
    "serviceType": "ซ่อม/ล้างแอร์ห้องพัก",
    "phonePrimary": "0899998888",
    "isEmergency": "1",
    "availableHours": "24 ชั่วโมง",
    "isActive": "1"
  }
  ```
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. ได้รับ HTTP `201 Created` บันทึกลงตาราง `outsource_contacts` ใน `db_housekeeping`
  2. เมื่อแก้ไขข้อมูล ระบบตอบกลับ HTTP `200 OK` ข้อมูลอัปเดตทันที
  3. เมื่อสั่งระงับการใช้งาน ระบบทำการ Soft Delete (`is_active = 0`) ทำให้ช่างเจ้านี้ไม่ปรากฏใน Drawer ของ Front Desk หรือ Housekeeping อีกต่อไป เพื่อป้องกันข้อมูลผิดพลาด
  4. หากล็อกอินด้วยสิทธิ์ Manager พยายามยิง POST/PUT/DELETE ระบบต้องปฏิเสธด้วย HTTP `403 Forbidden`
* **สถานะ:** ✅ Pass

---

## กลุ่มที่ 5: การทดสอบ Asynchronous Event Fan-out 1:4

### UAT-INT01: การตรวจสอบความคงอยู่ของ Outbox Event เมื่อเกิด Network Failure
* **รหัสกรณีทดสอบ:** UAT-INT01
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Developer / QA
* **วัตถุประสงค์:** ตรวจสอบว่าหาก **Upstash QStash** ไม่สามารถส่ง Webhook ได้ ข้อมูลใน Outbox Table จะไม่สูญหาย และ QStash จะ Retry แบบ Exponential Backoff อัตโนมัติ
* **ขั้นตอนการทดสอบ:**
  1. จำลองสถานการณ์ปิด Webhook Endpoint ของ Room Inventory ชั่วคราว (return HTTP 500)
  2. สั่งเช็คเอาท์ห้องพักผ่าน API
  3. ตรวจสอบตาราง `outbox_events` ใน `db_reservation` และ QStash Dashboard
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. การอัปเดตสถานะใน `db_reservation` สำเร็จ (db.batch() atomic)
  2. ตาราง `outbox_events` มีเรคคอร์ดสถานะ `pending`
  3. QStash พยายาม Retry Webhook ไปยัง Room Inventory (Exponential Backoff) และ `retry_count` เพิ่มขึ้น
  4. เมื่อ Webhook Endpoint กลับมาทำงาน QStash ส่ง Webhook สำเร็จ และสถานะ outbox เปลี่ยนเป็น `published`
* **สถานะ:** ✅ Pass

---

### UAT-INT02: การทดสอบ Idempotency ของ Consumer (ป้องกัน Event ซ้ำ)
* **รหัสกรณีทดสอบ:** UAT-INT02
* **ผู้ทดสอบ:** เขต (เขตโสภณ), บุญ (ปวริศ)
* **บทบาท:** Developer / QA
* **วัตถุประสงค์:** ตรวจสอบว่าหาก Queue ส่ง Event ซ้ำ (At-least-once delivery) ระบบปลายทางจะไม่สร้างข้อมูลซ้ำ
* **ขั้นตอนการทดสอบ:**
  1. ส่ง Event `ReservationCheckedOut` รายการเดิมที่มี `upstash-message-id` เดียวกันไปยัง Webhook Endpoint ของ Housekeeping และ Billing สองครั้งติดต่อกัน (จำลอง QStash At-Least-Once retry)
  2. ตรวจสอบตาราง `tasks` ใน `db_housekeeping` และตาราง `bills` ใน `db_billing`
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. Housekeeping สร้าง Task เพียง 1 งานเท่านั้น
  2. Billing สร้าง Bill เพียง 1 ใบเท่านั้น
  3. มีบันทึกใน `event_log` ว่า Webhook ที่สองถูกข้ามเนื่องจาก `upstash-message-id` เคยประมวลผลแล้ว (`processed: true`)
* **สถานะ:** ✅ Pass

---

### UAT-INT03: การทดสอบ Dead-Letter Queue (DLQ) เมื่อเกิดข้อผิดพลาดถาวร
* **รหัสกรณีทดสอบ:** UAT-INT03
* **ผู้ทดสอบ:** เขต (เขตโสภณ)
* **บทบาท:** Developer / QA
* **วัตถุประสงค์:** ตรวจสอบว่า Webhook ที่ประมวลผลล้มเหลวเกิน 3 ครั้งจะถูกส่งเข้า **Upstash QStash DLQ** เพื่อตรวจสอบ
* **ขั้นตอนการทดสอบ:**
  1. ส่ง Payload ที่มีโครงสร้างผิดพลาด (fail Zod validation) เข้าสู่ Webhook Endpoint โดยตรง
  2. ให้ QStash พยายาม Retry Webhook ครบ 3 ครั้ง (ทุกครั้งได้ HTTP 500 กลับมา)
* **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  1. Message ถูกเคลื่อนย้ายเข้าสู่ **Upstash QStash DLQ** อัตโนมัติ
  2. ระบบไม่เกิด Crash หรือบล็อก Webhook อื่นที่รอส่งอยู่
  3. สามารถตรวจสอบ Failed Message และ Error Log ได้ใน **Upstash Console**
* **สถานะ:** ✅ Pass

---

## 8. แบบฟอร์มบันทึกสรุปผลและรายงานข้อผิดพลาด

### ตารางสรุปผลการทดสอบ (UAT Execution Summary)

| กลุ่มงาน | จำนวนกรณีทดสอบ | ผ่าน (Pass) | ไม่ผ่าน (Fail) | รอทดสอบซ้ำ (Retest) | อัตราความสำเร็จ (%) |
|---|---|---|---|---|---|
| **Front Desk Portal** | 7 | 7 | 0 | 0 | 100% |
| **Housekeeping Portal** | 5 | 5 | 0 | 0 | 100% |
| **Billing & Cashier Portal** | 4 | 4 | 0 | 0 | 100% |
| **Manager & Admin Portal** | 5 | 5 | 0 | 0 | 100% |
| **Event Fan-out 1:4 & DLQ** | 3 | 3 | 0 | 0 | 100% |
| **รวมทั้งหมด** | **24** | **24** | **0** | **0** | **100%** |

### ลายมือชื่อผู้รับรองผลการทดสอบ
* **ผู้จัดการโครงการ (Project Lead / Admin):** เขต (เขตโสภณ) ____________________ วันที่: 19/09/2026
* **หัวหน้าฝ่ายประกันคุณภาพ (QA Lead):** เดียร์ (ธีรภัทร) ____________________ วันที่: 19/09/2026
* **หัวหน้าฝ่ายสถาปัตยกรรมระบบ (SA Lead):** บุญ (ปวริศ) ____________________ วันที่: 19/09/2026

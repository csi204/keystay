# Front Desk Booking Channels, Slip Verification & Extra Amenities Design

**Date:** 2026-11-11  
**Author:** Dear (ธีรภัทร เหนียมสุวรรณ) & Antigravity  
**Status:** Approved for Implementation (ผ่านการสัมภาษณ์ความต้องการร่วมกับผู้ใช้แล้ว)  
**Deliverables Covered:** SPEC-2026-004 Deliverable 2 & Deliverable 3 (Front Desk Scope)  

---

## 1. Intent & The Why

### 1.1 ที่มาและปัญหาเดิม (Background)
ตามคำแนะนำในการตรวจงานของ อ.ท็อป:
1. การจองห้องพักในชีวิตจริงของโรงแรมขนาดเล็ก (5–10 ห้อง) ไม่ได้มีเฉพาะการเดินเข้ามาหน้าเคาน์เตอร์ (Walk-in) เท่านั้น แต่มีลูกค้าโทรศัพท์เข้ามาจองล่วงหน้า หรือทักแชทสอบถามทางหน้าเพจ Facebook ของโรงแรม
2. ในกรณีโทรจองหรือทักเพจ ลูกค้ามักโอนเงินผ่าน Mobile Banking และส่งสลิปเพื่อยืนยันการจอง ระบบเดิมยังไม่มีฟิลด์ระบุช่องทางจอง (`booking_source`) และยังไม่มีที่บันทึก/แนบหลักฐานสลิปโอนเงิน (`payment_slip_url`, `payment_slip_ref`)
3. การขอของใช้เพิ่มเติมในห้องพักเดิมยังไม่ได้แยกชัดเจนระหว่าง "ของใช้ฟรี" (เช่น หมอนเสริม, ผ้าเช็ดตัว) กับ "ของใช้มีค่าบริการ" (เช่น เตียงเสริม 300 บาท/คืน) ซึ่งตามข้อกำหนดของ PM เขต ของใช้ที่คิดเงินจะต้องถูกนำมารวมเข้าสู่บิล Folio ของห้องพักทันที

### 1.2 วัตถุประสงค์ (Why)
- ยกระดับ Front Desk Portal ให้รองรับ 3 ช่องทางการจองจริง: `walk_in`, `phone`, `facebook`
- บังคับใช้กฎทางธุรกิจ (Business Rule): สลิปการโอนเงินทั้งหมดจะต้องถูกส่งเข้า "กล่องข้อความเพจ Facebook ของโรงแรม" เป็นจุดตรวจสอบกลาง (Single Verification Point)
- ให้พนักงาน Front Desk สามารถแนบ/ตรวจดูรูปสลิปและกรอกเลขอ้างอิงธนาคารได้ทั้งตอนสร้างการจอง และในหน้ารายละเอียดห้องพัก
- สร้างระบบขอของใช้และบริการเสริม (Extra Amenities) ที่แยกของฟรี (0 บาท แจ้งแม่บ้าน ไม่ลงบิล) และของคิดเงิน (> 0 บาท วิ่งลง `bill_items` ใน Folio อัตโนมัติ)

---

## 2. Goals, Non-Goals & Anti-Goals

### 2.1 Goals (เป้าหมายหลัก)
- **G1 (Booking Channels UI):** มี Dropdown เลือกช่องทางจอง `walk_in` (ค่าเริ่มต้น), `phone`, `facebook` ทั้งใน `NewBookingModal` และ `RoomDetailsModal` (โหมด Fast Walk-In)
- **G2 (Single Verification Point Banner):** เมื่อเลือกช่องทาง `phone` หรือ `facebook` จะแสดง Banner สีส้มเตือนชัดเจน: *"ลูกค้าต้องส่งสลิปยืนยันเข้าเพจ Facebook ของโรงแรม"*
- **G3 (Slip Upload & Lightbox Preview):** รองรับการเลือกไฟล์สลิปจากเครื่องเพื่อแสดงภาพพรีวิวขยายใหญ่ (Lightbox) ทันทีในเบราว์เซอร์ พร้อมช่องกรอกเลขที่อ้างอิงธุรกรรมธนาคาร (`payment_slip_ref`)
- **G4 (Dual-point Slip Management):** สามารถแนบสลิปได้ตั้งแต่ตอนสร้างการจอง และสามารถเข้ามาดูรูปสลิป / กรอกเลขสลิป / กดยืนยันการชำระเงิน (`payment_status: 'paid'`) ย้อนหลังใน `RoomDetailsModal` ได้
- **G5 (Request Amenities Modal):** สร้าง Modal สวยงามระดับ Enterprise สำหรับพนักงาน Front Desk เลือกของใช้ในห้อง มีแท็บแยกหมวดหมู่ฟรี (0 บาท) และหมวดคิดเงิน (เช่น เตียงเสริม 300 บาท/คืน)
- **G6 (Automated Folio Roll-up):** เมื่อพนักงานยืนยันการขอของใช้คิดเงิน ระบบจะเพิ่มรายการลงบิล `bill_items` ของห้องนั้นทันที พร้อมคำนวณ Subtotal, VAT 7%, และ Grand Total ใหม่แบบ Real-time
- **G7 (Automated Tests):** มีชุดทดสอบ Automated Mocha Tests และ Frontend Unit Tests ตรวจสอบทุกเงื่อนไขอย่างรัดกุม 100%

### 2.2 Non-Goals (สิ่งที่ไม่ทำในรอบนี้)
- **NG1:** ไม่ทำหน้าเว็บ Public ให้ลูกค้าภายนอกจองเอง (Public Booking Engine) หรือระบบ AI Web Chatbot (เนื่องจากอยู่นอก Scope ของระบบบริหารจัดการโรงแรมหลังบ้าน PMS)
- **NG2:** ไม่ผูก Cloudflare R2 บักเก็ตจริงแบบมีค่าใช้จ่ายคลาวด์ ให้ใช้ Base64 DataURL / D1 URL Mock สำหรับการพรีวิวรูปสลิป
- **NG3:** ไม่ทำหน้าจอ Owner Portal จัดการแคตตาล็อกของใช้ (ส่วนนี้เป็นความรับผิดชอบของ PM เขต ตาม RACI Deliverable 3)

### 2.3 Anti-Goals (ข้อห้ามเด็ดขาด)
- **AG1 (No AI Slop / Emojis):** ห้ามใช้ Emoji แปลกปลอมหรือดีไซน์การ์ตูน ให้ใช้ Lucide Enterprise Icons เท่านั้น
- **AG2 (No Broken Folio Balance):** ของใช้ฟรี (0 บาท) ต้องไม่สร้างรายการขยะหรือเพิ่มยอด 0.00 บาทลงในตารางบิล Folio เพื่อป้องกันความสับสนทางบัญชี
- **AG3 (No Direct Push to dev):** งานทั้งหมดต้องพัฒนาบน Feature Branch `feat/frontdesk-channels-and-amenities` เท่านั้น

---

## 3. Approaches Considered & Trade-offs

| แนวทาง | ข้อดี | ข้อเสีย | ผลการตัดสินใจ |
| :--- | :--- | :--- | :--- |
| **แนวทางที่ 1: (Selected) Dedicated Amenities Modal + Dual-Point Slip Management บนกิ่งเดียว** | ประสบการณ์ใช้งานตรงกับเคาน์เตอร์จริงมากที่สุด, จัดการสลิปได้ยืดหยุ่น, แยกของฟรีกับของเสียเงินชัดเจน ไม่สับสน, ควบคุมคุณภาพด้วย 1 PR | ต้องสร้างคอมโพเนนต์ Modal ใหม่ 1 ตัว (`RequestAmenitiesModal.tsx`) | **เลือกแนวทางนี้ (Selected)** |
| **แนวทางที่ 2: รวมของใช้ลงใน AddExtraChargeModal เดิม และแนบสลิปเฉพาะตอนสร้างจอง** | โค้ดน้อย ใช้คอมโพเนนต์เดิม | ของฟรีจะถูกยัดเยียดเข้าไปในหน้าคิดเงิน พนักงานจะงง, และถ้าลูกค้ายังไม่โอนเงินตอนโทรจอง จะบันทึกสลิปย้อนหลังไม่ได้ | ไม่เลือก |
| **แนวทางที่ 3: แยกเป็น 2 กิ่งต่อเนื่อง (Channels & Slips กิ่งแรก, Amenities กิ่งสอง)** | แต่ละ PR ขนาดเล็กลง | เสียเวลา context switch และเปิด PR สองรอบ ทั้งที่ทั้งสองงานเป็นสโคป Front Desk ของคุณเดียร์เหมือนกัน | ไม่เลือก (เลือกทำบนกิ่งรวมตามคำแนะนำคุณเดียร์) |

---

## 4. Architectural & UI Design Details

### 4.1 Schema Update
**Database:** `db_reservation` (`services/reservation/schema.sql`)
```sql
ALTER TABLE reservations ADD COLUMN booking_source TEXT NOT NULL DEFAULT 'walk_in' CHECK(booking_source IN ('walk_in', 'phone', 'facebook'));
ALTER TABLE reservations ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid'));
ALTER TABLE reservations ADD COLUMN payment_slip_url TEXT;
ALTER TABLE reservations ADD COLUMN payment_slip_ref TEXT;
ALTER TABLE reservations ADD COLUMN payment_verified_at TEXT;
ALTER TABLE reservations ADD COLUMN payment_verified_by TEXT;
```

**Database:** `db_reservation` (ตารางคำขอของใช้)
```sql
CREATE TABLE IF NOT EXISTS reservation_amenity_requests (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    amenity_id TEXT NOT NULL,
    amenity_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0.0,
    total_price REAL NOT NULL DEFAULT 0.0,
    is_chargeable INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'delivered', 'cancelled')),
    billed_to_folio INTEGER NOT NULL DEFAULT 0,
    bill_item_id TEXT,
    notes TEXT,
    requested_at TEXT NOT NULL,
    delivered_at TEXT
);
```

### 4.2 UI Components Architecture
1. **`NewBookingModal.tsx`:**
   - เพิ่มฟิลด์เลือก `bookingSource` (`walk_in`, `phone`, `facebook`)
   - แสดง Badge เตือนสำหรับ `phone` / `facebook`
   - เพิ่ม Collapsible/Section "หลักฐานการชำระเงิน (Payment Slip)" สำหรับแนบไฟล์หรือกรอก Bank Ref ล่วงหน้า
2. **`RoomDetailsModal.tsx`:**
   - โหมด Fast Walk-in: เพิ่มตัวเลือกช่องทางจองและสลิปแบบเดียวกัน
   - โหมด Details (เมื่อห้อง occupied หรือ reserved):
     - แสดงป้าย Channel Badge (`Walk-In` / `Phone` / `Facebook`)
     - แสดงสถานะการชำระเงิน (`Paid` เขียว หรือ `Unpaid` ส้ม)
     - ปุ่ม "ดู/แนบสลิปโอนเงิน" (เปิด Slip Preview Lightbox Modal)
     - ปุ่ม "ขอของใช้เสริม (Amenities)" เปิด `RequestAmenitiesModal`
3. **`RequestAmenitiesModal.tsx` (Component ใหม่):**
   - แสดงรายการแคตตาล็อกของใช้
   - แท็บ "ของใช้บริการฟรี (0 บาท)" -> หมอนเสริม, ผ้าเช็ดตัว, ไดร์เป่าผม (ไม่ลงบิล)
   - แท็บ "บริการเสริมมีค่าใช้จ่าย" -> เตียงเสริม (300 บาท/คืน), เซ็ตอาบน้ำพรีเมียม (150 บาท) (ลงบิล Folio)
   - สรุปยอดเงินและกดยืนยัน
4. **`FolioSplitScreen.tsx` / `CashierFolioPage.tsx`:**
   - แสดงรายการ Amenity ที่ถูกเรียกเก็บเงินใน Folio Items อย่างสวยงาม

---

## 5. What's Left to the Builder
- เขียน Implementation Plan ละเอียดแบบ TDD ด้วย `writing-plans`
- แตก Branch `feat/frontdesk-channels-and-amenities`
- ดำเนินการตาม Tasks และตรวจสอบด้วย Automated Tests


# รายการตรวจสอบและข้อเสนอแนะในการปรับปรุงเอกสาร (Documentation Review & Action Plan)

> **เอกสาร:** ข้อเสนอแนะการปรับปรุงเอกสารระบบ KEYSTAY ให้สอดคล้องกับการปรับปรุงสถาปัตยกรรม RBAC 3 Roles  
> **ผู้จัดทำ:** เดียร์ (`@allmusgus` — SA Lead & QA Co-Lead)  
> **ผู้ร่วมปรึกษา:** เขต (`@hazeco` — Project Lead)  
> **อ้างอิง Commit:** `d7734da` / PR `feat/owner-role-minibar-housekeeping`  
> **วันที่:** 4 พฤศจิกายน 2026 (ปรับปรุงเรียบร้อย: 5 พฤศจิกายน 2026)  

---

## 1. ที่มาและวัตถุประสงค์ (Context & Purpose)

สืบเนื่องจากที่เขตได้ปรับปรุงสถาปัตยกรรมระบบในการรวมบทบาทผู้ใช้งาน (RBAC Consolidation) จากเดิม **4 Roles (`admin`, `manager`, `front_desk`, `housekeeping`)** ปรับลดเหลือ **3 Roles (`owner`, `front_desk`, `housekeeping`)** โดยรวมหน้าที่ของผู้จัดการและผู้ดูแลระบบเข้าเป็น **"เจ้าของ / ผู้บริหาร (Owner)"** พร้อมเปลี่ยนชื่อพอร์ทัลเป็น **"Owner Portal (`/admin`)"**

จากการตรวจทานเอกสารทั้ง 9 ไฟล์ในโฟลเดอร์ `docs/` พบว่ามีหลายจุดที่ยังคงค้างข้อความเดิม หรือมีการแก้ไขแบบ Search & Replace ไม่สมบูรณ์ ทำให้เกิดข้อความที่ขัดแย้งกันเอง (Contradictions) และบางจุดส่งผลกระทบต่อคำสั่งรันระบบ Seed Database ในเครื่องจริง

เอกสารฉบับนี้รวบรวม **จุดที่ต้องแก้ไขทั้งหมดแบบเจาะจงรายไฟล์ พร้อมข้อเสนอ Before / After** และได้รับการยืนยันจากเขตให้ดำเนินการแก้ไขเรียบร้อยแล้ว

---

## 2. จุดสำคัญระดับวิกฤต (Critical Issues — กระทบ Logic & ระบบ Seed)

### 🔴 2.1 `docs/Hotel_Management_System_updated.md` (บรรทัดที่ 69–73)
* **ปัญหา:**
  1. หัวข้อยังระบุว่า **"RBAC 4 บทบาทหลัก"**
  2. มีการพิมพ์ตกหล่นที่ผิดพลาดอย่างรุนแรง: **`ผู้จัดการ (Manager — role=front_desk)`** (ระบุว่าผู้จัดการมี role เป็น front_desk)
  3. บรรทัดของ Owner ยังหลงเหลือข้อความเดิมว่า *"โดย Admin เป็นผู้มีสิทธิ์ Full CRUD..."*
* **การแก้ไข:**
  - ปรับปรุงหัวข้อเป็น **RBAC 3 บทบาทหลัก**
  - รวมหน้าที่ของ Manager เข้ากับ Owner และใช้ `role=owner`
  - ลบข้อความตกค้างของ Admin ออก

---

### 🔴 2.2 `docs/How to Install and Command.md` & ไฟล์ `scripts/seeds/01_auth_user.sql`
* **ปัญหา:**
  1. ตารางรหัสผ่านและสิทธิ์ในเอกสารยังบอกให้ล็อกอินด้วย `role=admin` และ `role=manager` ซึ่งไม่มีในระบบแล้ว
  2. ในไฟล์ Seed `scripts/seeds/01_auth_user.sql` มีการ Insert `role='admin'` และ `role='manager'` ซึ่งขัดกับ `CHECK(role IN ('owner', 'front_desk', 'housekeeping'))`
* **การแก้ไข:**
  - กำหนดบัญชี Demo/UAT สำหรับ Owner เป็น **`owner@keystay.com` / `Keystay@2026` / `owner`**
  - ปรับปรุง `scripts/seeds/01_auth_user.sql` ให้ Insert `usr-owner-001` และลบแถวของ manager ออก
  - ปรับปรุง Permissions ให้ Role `owner` ได้สิทธิ์ `*`

---

## 3. จุดข้อความตกค้างที่ได้รับการปรับปรุงแล้ว (Completed Updates)

1. **`docs/systemdesign.md`:** ปรับเป็น RBAC 3 Roles ทั้ง 4 จุดในเอกสาร
2. **`docs/อ่านก่อนทำงาน.md`:** ปรับ Claims JWT เป็น 3 Roles (`owner | front_desk | housekeeping`) และตัดเงื่อนไขการซ่อนปุ่มของ Manager ออก
3. **`docs/uat.md`:** ปรับหัวข้อกลุ่มที่ 4 เป็น `Owner Portal & Executive Dashboard` และปรับผู้ทดสอบเคส UAT-MGR01-05 เป็น Owner (`USR-OWNER`)
4. **`docs/PROGRESS_PRESENTATION_GUIDE.md`:** ปรับไดอะแกรม Redirection ให้เป็น `role: 'owner' ──► Redirect สู่ /admin (Owner Portal)`
5. **`docs/designsystem.md`:** ปรับชื่อ Portal และ JWT Role ให้เป็น Owner
6. **`docs/hotel-system-diagrams.html`:** ปรับ Node และคำอธิบายแผนภาพ Activity 4 ให้เป็น Owner

---

## 4. การปรับปรุงโค้ดเพิ่มเติม (Code Improvements)

1. **Enrich ข้อมูล roomType ใน `apps/web/src/pages/admin/RoomsPricingPage.tsx`:**
   - ในฟังก์ชัน `loadRooms()` ได้ทำการดึง `/api/room-types` และทำการ Map ข้อมูล `roomType` (ชื่อประเภทห้องและราคา) เข้ากับ `RoomUnit` แต่ละห้อง ทำให้ตาราง Room Units แสดงชื่อประเภทห้องและราคาถูกต้อง ไม่แสดง `—` อีกต่อไป
   - ในฟังก์ชัน `handleCreateRoomSubmit()` ได้ทำการ Enrich `roomType` และ `floor` ทันทีเมื่อสร้างห้องสำเร็จ
2. **ระบบ i18n กลาง (`apps/web/src/lib/i18n.tsx`):**
   - รองรับทั้ง `useTranslation()` (สำหรับหน้า Owner Portal เดิม) และ `useI18n()` (สำหรับระบบ Localization กลาง)
   - เชื่อมโยงและซิงค์ `localStorage` ข้ามคีย์ (`keystay_app_lang`, `keystay_locale`, `keystay_language`) เพื่อให้การสลับภาษาทำงานร่วมกันได้ 100%


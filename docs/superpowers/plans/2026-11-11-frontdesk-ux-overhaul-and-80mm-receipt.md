# แผนงาน Front Desk UX/UI Overhaul & 80mm POS Thermal Receipt System

## 1. การประยุกต์ใช้ชุดสกิลการออกแบบ (Design & Icon Skills Integration)

เพื่อให้ผลงานออกมามีคุณภาพสูงสุดตามมาตรฐาน Studio Craft และหลีกเลี่ยงงาน AI สำเร็จรูป (Anti-AI Slop) ทุก Task ในแผนนี้จะถูกกำกับด้วย 4 สกิลหลักดังนี้:

### 1.1 `design-taste-frontend` (Anti-Slop Art Direction for App Screens)
- **Operate Surface Rules:** ออกแบบเพื่อการทำงานจริงของพนักงานต้อนรับ (Front Desk Staff) เน้นความเร็ว การกวาดสายตา (Scanability) และความแม่นยำของข้อมูลตัวเลข
- **Swiss Precision Typography:** บังคับใช้ `font-mono tabular-nums` สำหรับตัวเลขการเงิน (ยอดรวม, ภาษี VAT 7%, เงินมัดจำ), หมายเลขห้อง, และวันที่/เวลาทั้งหมด ผสานกับ `IBM Plex Sans Thai`
- **Authentic 80mm Thermal Receipt:** ปฏิเสธการเรนเดอร์บิลแบบการ์ดเว็บไซต์ทั่วไป หันมาจำลองกระดาษม้วนความร้อนจริง (80mm Thermal POS Slip) ขาว-ดำ Monochrome, เส้นประคั่น (`border-dashed`), และความกว้างตายตัวที่พอดีกับหัวพิมพ์ ไม่ล้น ไม่ตัดทอน
- **Zero Decorative Slop:** ตัด Gradient สีม่วงนีออน, เงาเบลอหนาเตอะ, และไอคอนในกรอบสี่เหลี่ยมลูกกวาดออกทั้งหมด ใช้เส้นแบ่ง 1px สะอาดตา (`border-slate-200`) และพื้นผิวสัมผัสเรียบหรู

### 1.2 `impeccable` (Operate Mode & Craft Floor)
- **Full State Fidelity:** ทุกปุ่มกดและ Input ต้องรองรับทุกสถานะอย่างสมบูรณ์:
  - *Resting:* คอนทราสต์อ่านง่าย ชัดเจน
  - *Hover:* ยกตัวละมุน (`hover:-translate-y-0.5 hover:shadow-xs` หรือ `hover:bg-slate-100`)
  - *Active:* สัมผัสปุ่มกดจริง (`active:scale-[0.98]`)
  - *Focus-Visible:* เส้นขอบโฟกัสเข้าถึงง่าย (`focus-visible:ring-2 focus-visible:ring-slate-900`)
  - *Disabled:* ลด Opacity และติด `cursor-not-allowed`
- **Accessibility & Keyboard Nav:** 
  - ปุ่มไอคอนเดี่ยวต้องมี `aria-label` หรือ `<span className="sr-only">`
  - ไอคอนตกแต่งคู่กับข้อความต้องมี `aria-hidden="true"`
  - ทุก Modal รองรับการกด `Escape` เพื่อปิด และ `Enter` เพื่อยืนยัน
- **Optical Alignment & Spacing Rhythm:** จัดการ Baseline ของไอคอนและข้อความให้ตรงกันเป๊ะตามสัดส่วนคณิตศาสตร์ (`p-3.5`, `p-4`, `p-6`)

### 1.3 `lucide-icons` (Standardized Icon System)
- ใช้ไอคอนแท้จาก `lucide-react` ด้วยชื่อ PascalCase เท่านั้น: `ArrowLeft`, `Printer`, `Receipt`, `UserCheck`, `BedDouble`, `Bath`, `Users`, `Banknote`, `QrCode`, `Calendar`, `ShieldCheck`, `Clock`, `RotateCw`
- คุมขนาดตายตัว: Micro (`w-3 h-3`), Compact (`w-3.5 h-3.5`), Standard (`w-4 h-4`), Prominent (`w-5 h-5`)
- คุม Stroke Width: ใช้ `strokeWidth={1.75}` ทั่วทั้งระบบ เพื่อความเฉียบคม สไตล์ Luxury Enterprise ไม่หนาเทอะทะ

### 1.4 `simple-icons` (Official Brand Assets)
- ใช้ SVG เวกเตอร์ทางการตามมาตรฐาน Simple Icons (`viewBox="0 0 24 24"`) สำหรับช่องทางการชำระเงินและช่องทางการจอง:
  - **Visa** (`#1434CB`)
  - **Mastercard** (`#EB001B`)
  - **Facebook** (`#1877F2`)
  - **PromptPay / Thai QR Payment** สัญลักษณ์มาตรฐานกรมสรรพากร/ธปท.

---

## 2. แผนการปฏิบัติการราย Task (Step-by-Step Implementation)

### Task 1: แก้ไขลูกศรย้อนกลับซ้ำซ้อนใน `RoomDetailsModal.tsx`
- **ไฟล์:** `apps/web/src/components/front-desk/RoomDetailsModal.tsx`
- **มาตรฐานสกิล:** `lucide-icons` + `impeccable`
  - ใช้ `<ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />`
  - ลบตัวอักษร `'← '` ในสตริงภาษาไทยและอังกฤษออกทั้งหมด
  - เพิ่ม Micro-interaction: `hover:-translate-x-0.5 transition-transform`

### Task 2: ปรับความถี่ Auto-Refresh เป็น 1 นาที และเพิ่มแถบสถานะใน `RoomMatrixPage.tsx`
- **ไฟล์:** 
  - `apps/web/src/pages/front-desk/RoomMatrixPage.tsx`
  - `apps/web/src/__tests__/RoomMatrixToolbar.test.ts`
- **มาตรฐานสกิล:** `design-taste-frontend` + `impeccable`
  - ปรับ `setInterval` เป็น 60,000ms (1 นาทีเต็ม)
  - เพิ่ม Badge แสดงสถานะความสดใหม่ของข้อมูล: จุดสีเขียว Pulse (`animate-pulse bg-emerald-500`) พร้อมข้อความ `"อัปเดตอัตโนมัติทุก 1 นาที"` ควบคู่กับเวลาล่าสุด (`tabular-nums`)
  - อัปเดตการทดสอบใน `RoomMatrixToolbar.test.ts`

### Task 3: ยกเครื่อง `WalkInModal.tsx` เป็น Split 2-Pane Studio Layout
- **ไฟล์:**
  - `apps/web/src/components/front-desk/WalkInModal.tsx`
  - `apps/web/src/__tests__/walkin-modal-studio.test.ts`
- **มาตรฐานสกิล:** `design-taste-frontend` + `impeccable` + `lucide-icons` + `simple-icons`
  - ขยาย Layout เป็น `max-w-3xl` สองคอลัมน์สมมาตร
  - **Pane ซ้าย:** สรุปห้องพักแบบ Live Visual Showcase
    - หัวการ์ดแสดงหมายเลขห้องและ Badge สถานะห้องว่าง
    - ชิปสเปคห้องพัก: `<BedDouble />` เตียง, `<Users />` ความจุ, `<Bath />` ห้องน้ำ
    - ตัวคำนวณราคาแบบเรียลไทม์ (Live Financial Calculator): ค่าห้อง (จำนวนคืน × ราคาต่อคืน) + เงินมัดจำกุญแจ = ยอดรวมสุทธิที่ต้องชำระ (`font-mono tabular-nums`)
  - **Pane ขวา:** ฟอร์มข้อมูลผู้เข้าพักและช่องทางการชำระเงิน
    - Input สะอาดตาพร้อมไอคอนนำหน้า: ชื่อแขก, เบอร์โทร, วันเช็คเอาท์ (คำนวณจำนวนคืนอัตโนมัติ), เลขบัตร ปชช./พาสปอร์ต
    - ปุ่มเลือกวิธีชำระเงินแบบ Visual Grid พร้อม Simple Icons: เงินสด, บัตรเครดิต (Visa/Mastercard), QR PromptPay, โอนเงิน
    - ปุ่มกดยืนยันมีฟีดแบ็ก `active:scale-[0.98]` และตัวหมุน Loading

### Task 4: ผูกชื่อพนักงานแคชเชียร์ในใบเสร็จกับ Session ผู้ใช้จริง
- **ไฟล์:**
  - `apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx`
- **มาตรฐานสกิล:** `impeccable`
  - นำเข้า `getAuthUser` จาก `@/lib/api`
  - ดึงข้อมูลพนักงานกะปัจจุบัน: `authUser?.fullName || `${authUser.firstName} ${authUser.lastName}` || authUser.username || 'เดียร์ (ธีรภัทร)'`
  - แสดงผลในใบเสร็จเป็น `[ชื่อจริงพนักงาน] · Front Desk Cashier`

### Task 5: พัฒนาระบบใบเสร็จสลิปความร้อน 80mm POS Thermal Slip
- **ไฟล์:**
  - `apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx`
  - `apps/web/src/__tests__/receipt-80mm-thermal.test.ts`
- **มาตรฐานสกิล:** `design-taste-frontend` + `impeccable` + `lucide-icons` + `simple-icons`
  - โครงสร้างใบเสร็จสลิปความร้อน 80mm ตามมาตรฐานกรมสรรพากร:
    - **Header:** โรงแรม คีย์สเตย์ (KEYSTAY HOTEL), ที่อยู่, Tax ID 13 หลัก, POS Terminal ID: POS-01
    - **Title:** ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ (TAX INVOICE - ABB)
    - **Metadata:** เลขที่ INV-XXXXX, วันที่-เวลาจริง (DD/MM/YYYY HH:mm), ห้องพัก, ชื่อแขก, พนักงานแคชเชียร์
    - **Items Table:** รูปแบบสลิป POS แยกแถวชัดเจน (จำนวน x ราคา = ยอดเงิน) คั่นด้วยเส้นประ `border-dashed`
    - **Financials:** Subtotal, VAT 7% Included (คำนวณตามสูตรภาษีถูกต้อง), Net Total ตัวหนาชัดเจน, วิธีชำระเงิน, เงินทอน
    - **Footer:** Barcode จำลอง, ข้อความ "ราคารวมภาษีมูลค่าเพิ่มแล้ว", "ขอบคุณที่ใช้บริการ / THANK YOU"
  - **Print CSS:**
    - `@media print { @page { size: 80mm auto; margin: 0; } ... }` พิมพ์ออกหัวพิมพ์ความร้อน 80mm ตรงเป๊ะ 100% ไม่มีขอบล้น
  - **Screen Preview:**
    - แสดงกระดาษสลิปสีขาวคมชัดบนพื้นหลัง Backdrop เรียบหรู พร้อมปุ่มพิมพ์ `<Printer />` และปุ่มสลับภาษา TH/EN

### Task 6: ยกระดับจุดสัมผัสอื่นๆ ใน Front Desk และตรวจรับด้วย Playwright
- **ไฟล์:**
  - `apps/web/src/components/front-desk/CheckInModal.tsx`
  - `apps/web/src/components/front-desk/CheckOutModal.tsx`
  - `apps/web/src/components/front-desk/RoomCard.tsx`
  - `apps/web/src/pages/front-desk/DailyOperationsPage.tsx`
- **มาตรฐานสกิล:** `playwright` + `frontend-design`
  - ยกระดับ `CheckInModal` และ `CheckOutModal` ให้แสดงสรุปห้อง/สเปคเตียง และผสานการสั่งพิมพ์สลิป 80mm ทันทีที่เช็คเอาท์
  - จัดระเบียบชิปสเปคบน `RoomCard` ให้ได้สัดส่วน Optical Balance
  - เพิ่มปุ่มพิมพ์สลิป 80mm ด่วนใน Billing History
  - เขียน Playwright Verification Script ตรวจสอบภาพ Render จริง (Screenshot capture) ทั้งในมุมมอง Desktop และการพิมพ์สลิป 80mm

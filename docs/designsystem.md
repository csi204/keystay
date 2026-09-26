# 🎨 designsystem.md — "KEYSTAY Minimalist" Design System (Anti-AI-Template)

> **กฎเหล็กสำหรับ UI ของ KEYSTAY:** ทุกหน้าจอ (Front Desk, Housekeeping, Manager & Admin, Unified Login) ต้องยึดมั่นในสไตล์ **"Enterprise Minimalist & Operational Clarity"**  
> ⚠️ **คำเตือนสำคัญ:** ห้ามใช้ AI Template, ห้ามใส่ลูกเล่นแฟนซีที่ดูเป็น AI-Generated ทั่วไปโดยเด็ดขาด

---

## 🚫 1. ข้อห้ามเด็ดขาด (Anti-AI Manifesto — Banned Aesthetics)

เพื่อไม่ให้แอปพลิเคชันดูเหมือนงาน Generic AI ทั่วไป ทุกคนในทีมต้องปฏิบัติตามข้อห้ามต่อไปนี้:

| ❌ สิ่งที่ห้ามทำ (Banned AI Tropes) | เหตุผล | ✅ สิ่งที่ต้องทำแทน (The Minimalist Way) |
|---|---|---|
| **ห้ามใช้ Neon / Glowing Gradients** (เช่น พื้นหลังไล่สีม่วง-ฟ้า, ปุ่มเรืองแสงนีออน) | ดูไม่เป็นมืออาชีพ ลายตา และทำให้เจ้าหน้าที่ตาล้าเวลานั่งทำงาน 8 ชั่วโมง | ใช้ **Neutral Monochrome & Slate Base** (ขาว, ดำ, เทา Slate) ร่วมกับสีจุดเน้นเฉพาะจุด |
| **ห้ามใช้ Heavy Glassmorphism** (เช่น การ์ดฝ้าเบลอ `backdrop-blur-xl` หนาๆ) | เปลือง GPU, อ่านข้อมูลยาก, ขาดความคมชัดในการอ่านตัวเลข | ใช้ **Solid Surface (`#FFFFFF`)** พร้อมเส้นขอบคมชัดระดับ 1px (`border-slate-200`) |
| **ห้ามใช้การ์ดกลมดิก บวมๆ** (`rounded-3xl` หรือ `rounded-[32px]`) | ดูเหมือนของเล่น ขาดความเป็น Enterprise System | ใช้ **Crisp Functional Radius** (`rounded-md` 6px หรือ `rounded-lg` 8px เท่านั้น) |
| **ห้ามใส่เงาฟุ้งกระจายขนาดใหญ่** (`shadow-2xl` หรือเงาสีสะท้อน) | รกสายตา ดูเลอะเทอะ | ใช้ **Hairline Borders (`border border-slate-200`)** ร่วมกับเงาบางเบา (`shadow-sm`) |
| **ห้ามใส่ Floating 3D Tilt / Parallax Blobs** ในพื้นหลัง | ไร้ประโยชน์ทางฟังก์ชัน และรบกวนสมาธิผู้ใช้งาน | พื้นหลังสีเรียบสะอาดตา **`#F8FAFC`** หรือ `#FFFFFF` |
| **ห้ามทำ UI หลวมเกินไป (Low Density)** การ์ดใหญ่แต่มีตัวหนังสือ 2 คำ | โรงแรมต้องการเห็นข้อมูลเยอะๆ ในหน้าเดียวเพื่อตัดสินใจเร็ว | **High Information Density** จัดวางแบบ Grid/Table เห็น 22 ห้องในจอเดียว |

---

## 🏛️ 2. ปรัชญาความงามของ KEYSTAY (Core Principles)

1. **Status-First Clarity:** สีถูกสงวนไว้ใช้สำหรับ **"สถานะห้องพักและงาน"** เท่านั้น ไม่ใช่เพื่อความสวยงามประดับฉาก
2. **Swiss & Scandinavian Typography:** ลำดับชั้นตัวอักษรคมชัด ไม่ฟุ่มเฟือย ตัวเลขเงินตราและรหัสห้องต้องใช้ `font-mono` เสมอ
3. **Hairline Precision:** แบ่งพื้นที่ด้วยเส้นแบ่ง 1px (`border-slate-200` / `border-slate-300`) ที่ชัดเจน เป็นระเบียบเหมือนสเปรดชีตการเงินระดับสูง
4. **Selective Partial Refresh (No-WebSocket):** แต่ละวิดเจ็ตที่มีข้อมูล Real-time จะมีปุ่มไอคอน Refresh เล็กๆ คมๆ พร้อมสถานะ "Updated 2m ago" ให้พนักงานกดอัปเดตเฉพาะส่วนได้ทันที

---

## 🎨 3. Color Tokens (โทนสีสไตล์มินิมอลมืออาชีพ)

### 3.1 ฐานสีหลัก (90% ของหน้าจอ — Monochrome & Slate)
```css
--color-bg-app:       #F8FAFC; /* Slate 50 — พื้นหลังหลัก สบายตาสุดๆ */
--color-surface:      #FFFFFF; /* Pure White — พื้นผิวการ์ด ตาราง โมดอล */
--color-surface-sub:  #F1F5F9; /* Slate 100 — พื้นหลังหัวตาราง, ช่องค้นหา */
--color-border:       #E2E8F0; /* Slate 200 — เส้นขอบ Hairline 1px */
--color-border-hover: #CBD5E1; /* Slate 300 — เส้นขอบเมื่อ Hover/Focus */
--color-text-main:    #0F172A; /* Slate 900 — ตัวหนังสือหลัก คมชัด อ่านง่าย */
--color-text-muted:   #64748B; /* Slate 500 — คำอธิบาย ป้ายกำกับเล็ก */
--color-accent-dark:  #0F172A; /* Slate 900 — ปุ่ม Primary ดำมินิมอลสไตล์ Vercel/Linear */
```

### 3.2 สีสถานะห้องพัก 7 สี (Soft Tint Badges — ผูกกับ State Machine)
> 💡 **กฎสำคัญ:** ใช้สีพื้นหลังแบบ **Tint อ่อนโยน** คู่กับ **ข้อความสีเข้ม** และ **ขอบสีปานกลาง** เพื่อให้อ่านออกง่ายที่สุด และไม่แสบตา:

| สถานะ (Status) | Background | Text Color | Border Color | ความหมายทางธุรกิจ |
|---|---|---|---|---|
| `available` | `#F0FDF4` (Green 50) | `#166534` (Green 800) | `#BBF7D0` (Green 200) | ห้องว่าง พร้อมขายและเช็คอิน |
| `reserved` | `#EFF6FF` (Blue 50) | `#1E40AF` (Blue 800) | `#BFDBFE` (Blue 200) | จองแล้ว มีกำหนดเข้าพักวันนี้ |
| `occupied` | `#ECFDF5` (Emerald 50)| `#065F46` (Emerald 800)| `#A7F3D0` (Emerald 200)| มีแขกเข้าพักอยู่ |
| `checked_out` | `#F8FAFC` (Slate 50) | `#334155` (Slate 700) | `#CBD5E1` (Slate 300) | เช็คเอาท์แล้ว รอแม่บ้านทำความสะอาด |
| `cleaning` | `#FFFBEB` (Amber 50) | `#92400E` (Amber 800) | `#FDE68A` (Amber 200) | แม่บ้านกำลังทำความสะอาด |
| `maintenance` | `#FEF2F2` (Red 50) | `#991B1B` (Red 800) | `#FECACA` (Red 200) | ส่งซ่อม งดใช้งานชั่วคราว |
| `out_of_order` | `#F1F5F9` (Slate 100) | `#475569` (Slate 600) | `#CBD5E1` (Slate 300) | ปิดปรับปรุงใหญ่ระยะยาว |

---

## 🔤 4. Typography & Numerals (การจัดลำดับฟอนต์)

```css
font-sans: 'Inter', system-ui, -apple-system, sans-serif;
font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
```

### กฎการใช้ตัวเลข:
- **ยอดเงิน (฿), รหัสห้องพัก (101, 202), Booking Code, วันที่/เวลา:** ต้องใช้ **`font-mono font-medium tracking-tight`** เสมอ เพื่อให้ตัวเลขในตารางเรียงหลักตรงกันสวยงาม

### ขนาดตัวหนังสือ (Tight Hierarchy):
- **Page Header:** `text-lg font-bold text-slate-900 tracking-tight` (18px — ไม่ต้องใหญ่เกินไป)
- **Section Title:** `text-sm font-semibold text-slate-800` (14px)
- **Table / Body Text:** `text-xs text-slate-700` (12px - 13px)
- **Sub-label / Meta:** `text-[11px] font-medium text-slate-500 uppercase tracking-wider`
- **Metric Figure (KPI):** `text-2xl font-bold font-mono text-slate-900` (24px)

---

## 🖥️ 5. รายละเอียดดีไซน์เฉพาะ 3 Frontend Portals (Phase 3)

### 1. Front Desk & Cashier Portal — เดียร์ (`@allmusgus`)
- **ผังห้อง Real-time (22-Room Matrix Grid):**
  - แสดงห้องพักทั้งหมด 22 ห้อง แบ่งตามชั้น 1–5 ในมุมมอง Grid ที่เห็นครบในหน้าจอเดียว
  - การ์ดห้องพักทรงสี่เหลี่ยมเรียบง่าย (`rounded-md`, ขอบ `border-slate-200`) ขนาดกะทัดรัด
  - ตัวเลขห้องเด่นชัด เช่น `202` (font-mono), ชื่อประเภทห้องตัวเล็กด้านล่าง, มุมขวาบนมีจุด Dot สีประจำสถานะ
  - เมื่อคลิกที่ห้อง จะเปิด **Slide-over Drawer** ฝั่งขวา เพื่อดูรายละเอียดแขก, ปุ่มเช็คอิน, หรือปุ่มเช็คเอาท์
- **หน้าต่างเช็คเอาท์ & คิดเงิน (Cashier Split View):**
  - **ฝั่งซ้าย:** ตารางสรุปรายการ (ค่าห้อง 4 คืน, มินิบาร์ Heineken 3 กระป๋อง, ค่าซักรีด)
  - **ฝั่งขวา:** แถบสรุปยอดสุทธิ (Subtotal - Deposit 3,000 + VAT 7% = Total Due) ชัดเจน ตัวเลขขนาดใหญ่
  - ปุ่ม Action: ดำมินิมอล `[บันทึกชำระเงิน]`, ขาวขอบเทา `[พิมพ์ใบเสร็จ/Tax Invoice]`

### 2. Housekeeping Portal — บุญ (`@Legxcy77`)
- **ออกแบบ Mobile-First (เน้นใช้งานบนสมาร์ทโฟน/iPad ของแม่บ้าน):**
  - **Cleaning Kanban Board:** แถบคอลัมน์เรียบง่าย 3 ขั้นตอน: `To Do` | `In Progress` | `Completed`
  - **Task Card:** การ์ดห้องขนาดใหญ่พอดีนิ้วสัมผัส (Touch Target ≥ 44px)
    - แถบสีสถานะแนวตั้งหนา 4px อยู่ซ้ายสุดของการ์ด
    - มี Checkbox เช็คลิสต์ 4 รายการ (เปลี่ยนผ้าปู, เติมสบู่, เช็คตู้เย็นมินิบาร์, ดูดฝุ่น)
    - ปุ่มกดสถานะ: ปุ่มสไตล์ Minimal `[เริ่มทำความสะอาด]` ➡️ `[เสร็จสิ้นส่งตรวจ]`
  - **ถ่ายรูปแจ้งห้องชำรุด (R2 Photo Upload):**
    - กรอบแนบรูปภาพเส้นประสี Slate 1px เรียบหรู
    - เมื่อถ่ายภาพ จะแสดง Thumbnail ขนาดเล็กพร้อมปุ่มกากบาทลบออก และแสดงแถบ Progress อัปโหลดเข้า Cloudflare R2

### 3. Manager & Admin Portal — เขต (`@hazeco`)
- **Executive KPI Tiles (แดชบอร์ดผู้บริหารสไตล์ Stripe/Linear):**
  - การ์ดสีขาว ขอบเทาบางเฉียบ 1px แสดง 4 ตัวเลขหลัก:
    1. **Occupancy Rate:** `68.18%` (พร้อมเปรียบเทียบสัปดาห์ก่อน `+4.5%`)
    2. **Today Revenue:** `฿62,100.00`
    3. **ADR (Average Daily Rate):** `฿4,020.00`
    4. **RevPAR:** `฿2,982.84`
  - **ปุ่ม Refresh เฉพาะส่วน (Selective Refresh):** มุมขวาบนของการ์ดแต่ละใบมีปุ่มไอคอนหมุนเล็กๆ `[↻ Refresh]` เมื่อกดแล้วจะเรียก `POST /api/reports/refresh?section=kpi` หรือ `revenue` เพื่ออัปเดตตัวเลขเฉพาะการ์ดนั้นโดยไม่ต้องโหลดทั้งหน้าใหม่
- **Minimalist Charts (กราฟเรียบหรู):**
  - กราฟเส้นแบบ **Monochrome Line Chart** (เส้นสีดำ `#0F172A` หรือ Slate `#334155` บางเฉียบ 1.5px) บนพื้นตารางสีจาง
  - กราฟแท่งสัญชาติแขกผู้เข้าพัก: แท่งสีเทา Slate ไล่ระดับความเข้มตามสัดส่วน ไม่ใช้สีรุ้ง
- **ปุ่มส่งออกรายงาน:** ปุ่ม Minimal `[Export CSV]` และ `[Printable PDF]`

### 4. Single Portal Login (`/login`)
- กล่องล็อกอินสีขาวโมโนโครม กว้าง 380px กึ่งกลางหน้าจอสี `#F8FAFC`
- โลโก้ **KEYSTAY** ฟอนต์ Sans-serif ตัวหนาสีดำสนิทพร้อมคำบรรยายขนาดเล็ก "Enterprise Hospitality"
- ช่อง Input อีเมล/ชื่อผู้ใช้ และรหัสผ่าน กรอบ 1px Focus ขอบดำ
- Checkbox "จำฉันไว้ในระบบ" (Remember Me) แบบมินิมอล

---

## ⚡ 6. กลไกการรีเฟรชข้อมูล (Partial Refresh Architecture)

```
[UI Component: Revenue Card]
         │
         ▼ (กดปุ่มไอคอน Refresh บนการ์ด)
[POST /api/reports/refresh?section=revenue]
         │
         ├──> API Gateway ตรวจสอบสิทธิ์ (JWT Role: Manager/Admin)
         ├──> Forward ไปยัง report-analytics Worker
         ├──> คำนวณสรุปเฉพาะยอดขายจาก D1 db_report
         │
         ▼ (ตอบกลับ JSON สดใหม่ทันที)
[อัปเดตเฉพาะ State ของการ์ด Revenue Card + แสดง Timestamp "Refreshed just now"]
```
> ✅ **ข้อดี:** ไม่ต้องเปิด WebSocket ค้างไว้ตลอดเวลา ไม่กินแบนด์วิดท์ Cloudflare ฟรี และตอบสนองรวดเร็วในเสี้ยววินาที

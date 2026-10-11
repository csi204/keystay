# 🎨 designsystem.md — "KEYSTAY Minimalist" Design System (Anti-AI & shadcn/ui Standard)

> **กฎเหล็กสำหรับ UI ของ KEYSTAY:** ทุกหน้าจอ (Front Desk & Cashier, Housekeeping, Manager & Admin, Unified Login) ต้องยึดมั่นในสไตล์ **"Enterprise Minimalist & Operational Clarity"**  
> ⚠️ **คำเตือนสำคัญ:** ห้ามใช้ AI Template, ห้ามใส่ลูกเล่นแฟนซีที่ดูเป็น AI-Generated ทั่วไปโดยเด็ดขาด **ต้องสร้าง UI จาก Primitive Components มาตรฐานของ shadcn/ui เท่านั้น**

---

## 🚫 1. ข้อห้ามเด็ดขาด (Anti-AI Manifesto — Banned Aesthetics)

เพื่อไม่ให้แอปพลิเคชันดูเหมือนงาน Generic AI ทั่วไป ทุกคนในทีมต้องปฏิบัติตามข้อห้ามต่อไปนี้อย่างเคร่งครัด:

| ❌ สิ่งที่ห้ามทำ (Banned AI Tropes) | เหตุผล | ✅ สิ่งที่ต้องทำแทน (The Minimalist & shadcn Way) |
|---|---|---|
| **ห้ามใช้ Neon / Glowing Gradients** (เช่น พื้นหลังไล่สีม่วง-ฟ้า, ปุ่มเรืองแสงนีออน) | ดูไม่เป็นมืออาชีพ ลายตา และทำให้เจ้าหน้าที่ตาล้าเวลานั่งทำงาน 8 ชั่วโมง | ใช้ **Neutral Monochrome & Slate Base** (ขาว, ดำ, เทา Slate) ร่วมกับสีจุดเน้นเฉพาะจุด |
| **ห้ามใช้ Heavy Glassmorphism** (เช่น การ์ดฝ้าเบลอ `backdrop-blur-xl` หนาๆ) | เปลือง GPU, อ่านข้อมูลยาก, ขาดความคมชัดในการอ่านตัวเลข | ใช้ **Solid Surface (`#FFFFFF`)** พร้อมเส้นขอบคมชัดระดับ 1px (`border-slate-200`) |
| **ห้ามใช้การ์ดกลมดิก บวมๆ** (`rounded-3xl` หรือ `rounded-[32px]`) | ดูเหมือนของเล่น ขาดความเป็น Enterprise System | ใช้ **Crisp Functional Radius** ของ shadcn (`rounded-md` 6px หรือ `rounded-lg` 8px เท่านั้น) |
| **ห้ามใส่เงาฟุ้งกระจายขนาดใหญ่** (`shadow-2xl` หรือเงาสีสะท้อน) | รกสายตา ดูเลอะเทอะ | ใช้ **Hairline Borders (`border border-slate-200`)** ร่วมกับเงาบางเบา (`shadow-sm` หรือ `shadow-card`) |
| **ห้ามใส่ Floating 3D Tilt / Parallax Blobs** ในพื้นหลัง | ไร้ประโยชน์ทางฟังก์ชัน และรบกวนสมาธิผู้ใช้งาน | พื้นหลังสีเรียบสะอาดตา **`#F8FAFC`** (Slate 50) หรือ `#FFFFFF` |
| **ห้ามทำ UI หลวมเกินไป (Low Density)** การ์ดใหญ่แต่มีตัวหนังสือ 2 คำ | โรงแรมต้องการเห็นข้อมูลเยอะๆ ในหน้าเดียวเพื่อตัดสินใจเร็ว | **High Information Density** จัดวางแบบ Grid/Table เห็นผังห้องทั้งหมด (5–10 ห้อง) ครบในจอเดียว |
| **ห้ามเขียน Ad-hoc HTML/CSS ขึ้นมาเองตามใจชอบ** | ดีไซน์กระจัดกระจาย ไม่สม่ำเสมอ และดูแลรักษายาก | **ใช้ Component มาตรฐานของ shadcn/ui** (`@/components/ui/*`) ที่คุม Design Tokens เดียวกันทั้งระบบ |

---

## 🧩 2. มาตรฐานการใช้ Component (shadcn/ui Architecture)

ระบบ KEYSTAY เลือกใช้ **shadcn/ui** (ขับเคลื่อนด้วย Radix UI Primitives, Tailwind CSS, และ `class-variance-authority`) เป็นรากฐาน UI เดียวกันทั้งระบบ โดยมีโครงสร้างดังนี้:

### 2.1 โครงสร้างไฟล์ในโปรเจกต์ (`apps/web`)
```text
apps/web/src/
├── components/
│   ├── ui/                    # 📦 Core shadcn/ui Primitives
│   │   ├── button.tsx         # ปุ่ม Action (default, outline, secondary, ghost, destructive, brand)
│   │   ├── badge.tsx          # ป้ายสถานะ 7 สีห้องพัก และแท็กต่างๆ
│   │   ├── card.tsx           # การ์ดข้อมูล (CardHeader, CardTitle, CardContent, CardFooter)
│   │   ├── input.tsx          # ช่องกรอกข้อมูลเส้นขอบคมกริบ
│   │   ├── table.tsx          # ตารางข้อมูลความหนาแน่นสูง (Table, TableHeader, TableRow, TableCell)
│   │   └── ...                # dialog.tsx, sheet.tsx, tabs.tsx
│   └── common/
│       └── Logo.tsx
├── lib/
│   └── utils.ts               # cn() helper (clsx + tailwind-merge)
└── styles/
    └── globals.css            # shadcn CSS Variables & Design Tokens
```

### 2.2 รายการ Components บังคับใช้ในแต่ละ Portal
1. **Front Desk & Cashier Portal:**
   - `Card` สำหรับการ์ดห้องพักใน Room Matrix
   - `Badge` (variant: `available`, `reserved`, `occupied`, ฯลฯ) สำหรับบอกสถานะห้อง
   - `Sheet` (Slide-over Drawer) สำหรับแสดงรายละเอียดห้องเมื่อคลิก
   - `Dialog` สำหรับหน้าต่างบันทึกเช็คอิน, เช็คเอาท์, และเคลียร์บิล
   - `Table` สำหรับรายการจอง และรายการบิล/มินิบาร์
   - `Button` สำหรับปุ่ม Action หลัก (สไตล์ดำมินิมอล หรือแบรนด์ส้ม)
2. **Housekeeping Portal:**
   - `Card` สำหรับ Cleaning Task Cards บน Kanban Board
   - `Badge` (variant: `cleaning`, `maintenance`) สำหรับแสดงระดับความเร่งด่วนและประเภทงาน
   - `Button` ขนาดใหญ่พอดีนิ้วสัมผัส (Touch Target ≥ 44px)
3. **Manager & Admin Portal:**
   - `Card` สำหรับ Executive KPI Tiles (Occupancy, Revenue, ADR, RevPAR)
   - `Table` สำหรับรายการพนักงาน, ตารางประวัติแขก (CRM), และงบการเงิน
   - `Input` + `Button` สำหรับแบบฟอร์มค้นหาและตัวกรองข้อมูล

---

## 🏛️ 3. ปรัชญาความงามของ KEYSTAY (Core Principles)

1. **Status-First Clarity:** สีถูกสงวนไว้ใช้สำหรับ **"สถานะห้องพักและงาน"** เท่านั้น ไม่ใช่เพื่อความสวยงามประดับฉาก
2. **Swiss & Scandinavian Typography:** ลำดับชั้นตัวอักษรคมชัด ไม่ฟุ่มเฟือย ตัวเลขเงินตราและรหัสห้องต้องใช้ `font-mono` เสมอ
3. **Hairline Precision:** แบ่งพื้นที่ด้วยเส้นแบ่ง 1px (`border-slate-200` / `border-slate-300`) ที่ชัดเจน เป็นระเบียบเหมือนสเปรดชีตการเงินระดับสูง
4. **Selective Partial Refresh (No-WebSocket):** แต่ละวิดเจ็ตที่มีข้อมูล Real-time จะมีปุ่มไอคอน Refresh เล็กๆ คมๆ พร้อมสถานะ "Updated 2m ago" ให้พนักงานกดอัปเดตเฉพาะส่วนได้ทันที

---

## 🎨 4. Color Tokens (โทนสีสไตล์มินิมอลมืออาชีพ)

### 4.1 ฐานสีหลัก (90% ของหน้าจอ — Monochrome & Slate)
```css
--background:       210 40% 98%; /* #F8FAFC Slate 50 — พื้นหลังหลัก สบายตาสุดๆ */
--foreground:       222 47% 11%; /* #0F172A Slate 900 — ตัวหนังสือหลัก คมชัด อ่านง่าย */
--card:             0 0% 100%;   /* #FFFFFF — พื้นผิวการ์ด ตาราง โมดอล */
--border:           214 32% 91%; /* #E2E8F0 Slate 200 — เส้นขอบ Hairline 1px */
--muted:            210 40% 96%; /* #F1F5F9 Slate 100 — พื้นหลังหัวตาราง, ช่องค้นหา */
--muted-foreground: 215 16% 47%; /* #64748B Slate 500 — คำอธิบาย ป้ายกำกับเล็ก */
--primary:          222 47% 11%; /* Slate 900 — ปุ่ม Primary ดำมินิมอลสไตล์ Vercel/Linear */
--accent:           24 95% 53%;  /* #F97316 Brand Orange — จุดดึงดูดสายตาเฉพาะจุด */
```

### 4.2 สีสถานะห้องพัก 7 สี (Soft Tint Badges — ผูกกับ State Machine)
> 💡 **กฎสำคัญ:** ใช้สีพื้นหลังแบบ **Tint อ่อนโยน** คู่กับ **ข้อความสีเข้ม** และ **ขอบสีปานกลาง** เพื่อให้อ่านออกง่ายที่สุด และไม่แสบตา:

| สถานะ (Status) | Background | Text Color | Border Color | shadcn Badge Variant | ความหมายทางธุรกิจ |
|---|---|---|---|---|---|
| `available` | `#F0FDF4` (Green 50) | `#166534` (Green 800) | `#BBF7D0` (Green 200) | `variant="available"` | ห้องว่าง พร้อมขายและเช็คอิน |
| `reserved` | `#EFF6FF` (Blue 50) | `#1E40AF` (Blue 800) | `#BFDBFE` (Blue 200) | `variant="reserved"` | จองแล้ว มีกำหนดเข้าพักวันนี้ |
| `occupied` | `#ECFDF5` (Emerald 50)| `#065F46` (Emerald 800)| `#A7F3D0` (Emerald 200)| `variant="occupied"` | มีแขกเข้าพักอยู่ |
| `checked_out` | `#F8FAFC` (Slate 50) | `#334155` (Slate 700) | `#CBD5E1` (Slate 300) | `variant="checkedOut"` | เช็คเอาท์แล้ว รอแม่บ้านทำความสะอาด |
| `cleaning` | `#FFFBEB` (Amber 50) | `#92400E` (Amber 800) | `#FDE68A` (Amber 200) | `variant="cleaning"` | แม่บ้านกำลังทำความสะอาด |
| `maintenance` | `#FEF2F2` (Red 50) | `#991B1B` (Red 800) | `#FECACA` (Red 200) | `variant="maintenance"` | ส่งซ่อม งดใช้งานชั่วคราว |
| `out_of_order` | `#F1F5F9` (Slate 100) | `#475569` (Slate 600) | `#CBD5E1` (Slate 300) | `variant="outOfOrder"` | ปิดปรับปรุงใหญ่ระยะยาว |

---

## 🔤 5. Typography & Numerals (การจัดลำดับฟอนต์)

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

## 🖥️ 6. ตัวอย่างการใช้ shadcn/ui ใน 3 Frontend Portals (Phase 3)

### 1. Front Desk & Cashier Portal — เดียร์ (`@allmusgus`)
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function RoomCard({ roomNumber, roomType, status }: RoomProps) {
  return (
    <Card className="hover:border-slate-300 transition-colors cursor-pointer">
      <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
        <span className="font-mono text-sm font-bold text-slate-900">{roomNumber}</span>
        <Badge variant={status}>{status}</Badge>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <p className="text-[11px] text-slate-500">{roomType}</p>
      </CardContent>
    </Card>
  );
}
```

### 2. Housekeeping Portal — บุญ (`@Legxcy77`)
- **Cleaning Task Card:** ใช้ `Card` พร้อม Checkbox เช็คลิสต์ 4 รายการ และปุ่ม `Button` สไตล์มินิมอล
- **Touch Targets:** ปุ่มกว้างพอดีนิ้วสัมผัส `h-10 text-sm` พร้อมรูปถ่ายห้องชำรุดส่งเข้า Cloudflare R2

### 3. Manager & Admin Portal — เขต (`@hazeco`)
- **Executive KPI Tiles:** การ์ดสีขาว ขอบ 1px พร้อมตัวเลข `font-mono text-2xl`
- **ตารางสรุปงบการเงินและลูกค้า:** ใช้ `Table`, `TableHeader`, `TableRow`, `TableCell` จาก `@/components/ui/table` เพื่อความกระชับและเป็นระเบียบระดับ Enterprise

---

## ⚡ 7. กลไกการรีเฟรชข้อมูล (Partial Refresh Architecture)

```
[UI Component: KPI Card]
         │
         ▼ (กดปุ่มไอคอน Refresh บนการ์ด)
[POST /api/reports/refresh?section=kpi]
         │
         ├──> API Gateway ตรวจสอบสิทธิ์ (JWT Role: Manager/Admin)
         ├──> Forward ไปยัง report-analytics Worker
         ├──> คำนวณสรุปเฉพาะยอดขายจาก D1 db_report
         │
         ▼ (ตอบกลับ JSON สดใหม่ทันที)
[อัปเดตเฉพาะ State ของการ์ด KPI Card + แสดง Timestamp "Refreshed just now"]
```
> ✅ **ข้อดี:** ไม่ต้องเปิด WebSocket ค้างไว้ตลอดเวลา ไม่กินแบนด์วิดท์ Cloudflare ฟรี และตอบสนองรวดเร็วในเสี้ยววินาที

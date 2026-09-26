# designsystem.md — "Operational Clarity" Design System

> ใช้ไฟล์นี้เวลาทำ UI ทุกครั้ง ไม่ต้องเดาสีหรือเดา spacing เอง — ทุกค่าตั้งเป็น CSS variable ใน Tailwind config แล้วทุกหน้าใช้ร่วมกัน ห้าม hardcode hex ในแต่ละ component เด็ดขาด

## แนวคิด

**"Status-First & Operational Clarity"** — พนักงานหน้างานต้องมองเห็นและเข้าใจสถานะของห้องพัก งาน หรือยอดเงิน ได้ทันทีจากสีและสัญลักษณ์ โดยไม่ต้องเสียเวลาอ่านข้อความ ลด Cognitive Load ในช่วง Peak Hour ที่ต้องรับมือหลายอย่างพร้อมกัน

## 1. Color Palette

| Token | Hex | บทบาท | ใช้ที่ไหน |
|---|---|---|---|
| `--color-base-bg` | `#FAFAF9` | Primary Background | พื้นหลังทุกหน้าจอ สบายตาตลอดกะงาน |
| `--color-surface` | `#FFFFFF` | Card / Panel Surface | การ์ดข้อมูล, Modal, Drawer, Table |
| `--color-text-primary` | `#1E293B` | Primary Text | หัวข้อ, รหัสห้อง, ยอดเงิน, ข้อความหลัก |
| `--color-text-muted` | `#64748B` | Secondary Text | ป้ายกำกับ, คำอธิบาย, timestamp |
| `--color-border` | `#E2E8F0` | Border / Divider | กรอบ input, เส้นแบ่งตาราง, card border |
| `--color-accent` | `#F97316` | Primary Accent | ปุ่ม CTA หลัก, เมนูที่ active, icon สำคัญ |
| `--color-accent-hover` | `#EA580C` | Accent Hover | สถานะ hover ของปุ่ม primary |

### Status Color Mapping (ผูกกับ Room State Machine)

| สถานะ (enum value) | Background | Text | Border | ใช้กับ |
|---|---|---|---|---|
| `available` | `#F0FDF4` | `#15803D` | `#BBF7D0` | ห้องว่าง พร้อมขาย |
| `reserved` | `#EFF6FF` | `#1D4ED8` | `#BFDBFE` | จองแล้ว รอเช็คอิน |
| `occupied` | `#ECFDF5` | `#065F46` | `#A7F3D0` | มีแขกเข้าพัก |
| `checked_out` | `#F8FAFC` | `#475569` | `#CBD5E1` | เช็คเอาท์แล้ว รอแม่บ้าน |
| `cleaning` | `#FFFBEB` | `#B45309` | `#FDE68A` | กำลังทำความสะอาด |
| `maintenance` | `#FEF2F2` | `#B91C1C` | `#FECACA` | ส่งซ่อม งดใช้งาน |
| `out_of_order` | `#F1F5F9` | `#334155` | `#CBD5E1` | ปิดปรับปรุงใหญ่ |

> กฎ: สีใน Badge/Tag ให้ใช้ tint (พื้นอ่อน + ข้อความเข้ม + border ปานกลาง) ไม่ใช้สีเต็มบน text เพื่อ readability ที่ดีกว่า

### Status Color สำหรับงาน Housekeeping และ Bill

| สถานะ | สี | ใช้กับ |
|---|---|---|
| `pending` | Slate Gray | Task รอ Assign, Bill ยังไม่ชำระ |
| `assigned` / `confirmed` | Blue | Task มอบหมายแล้ว, การจองยืนยัน |
| `in_progress` | Amber | Task กำลังทำ |
| `completed` / `paid` | Emerald | Task เสร็จ, Bill ชำระแล้ว |
| `cancelled` / `failed` | Red | ยกเลิก, ล้มเหลว |

## 2. Typography

| Token | Font size | Weight | Line height | ใช้กับ |
|---|---|---|---|---|
| `--text-page-title` | 24px | 700 | 32px | หัวข้อหน้า (Page title) |
| `--text-section` | 18px | 600 | 28px | หัวข้อ section / card header |
| `--text-body` | 14px | 400 | 20px | เนื้อหาทั่วไป |
| `--text-label` | 12px | 500 | 16px | label, Badge, helper text |
| `--text-number` | mono | 600 | — | รหัสห้อง, ยอดเงิน, เวลา (ใช้ `font-mono`) |

Font family: `'Inter', 'Sarabun', system-ui, sans-serif`
- `Inter` — สำหรับ UI ทั่วไปและตัวเลข
- `Sarabun` — fallback สำหรับข้อความไทย

## 3. Spacing Scale

ใช้ฐาน 4px ทั้งระบบ: `4, 8, 12, 16, 24, 32, 48, 64` px (Tailwind default scale `p-1` ถึง `p-16`)

## 4. Border Radius & Shadow

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--radius-sm` | 6px | Badge, Input, Tag |
| `--radius-md` | 10px | Button, Card เล็ก |
| `--radius-lg` | 16px | Modal, Drawer, Card ใหญ่ |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | Card บน light background |

## 5. Component Tokens (Tailwind Config)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#F97316', hover: '#EA580C' },
        'room-available': { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
        'room-reserved':  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
        'room-occupied':  { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
        'room-cleaning':  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
        'room-maintenance':{ bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
      },
      fontFamily: {
        sans: ['Inter', 'Sarabun', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
}
```

## 6. Layout Shell

โครงสร้าง Layout หลักเป็น **Fixed Sidebar + Fluid Content**:

```
┌─────────────────────────────────────────────────────┐
│  Header: Breadcrumb | Quick Search (Ctrl+K) | User  │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                       │
│ w-64     │  bg-stone-50  p-6  overflow-y-auto        │
│ fixed    │  flex-1  min-h-screen                    │
│          │                                          │
│ Nav Menu │  Page Content (Grid, Table, Kanban)       │
└──────────┴──────────────────────────────────────────┘
```

## 7. Icon

ใช้ชุดเดียวทั้งระบบ — `lucide-react` ห้ามผสมชุดอื่น ห้ามใช้ emoji ใน UI

## 8. Responsive Breakpoints

| Breakpoint | ขนาด | โหมด |
|---|---|---|
| Desktop | ≥ 1280px | มาตรฐาน — Sidebar + Full table (Front Desk, Manager) |
| Tablet | 768–1024px | Sidebar ยุบได้ — ปุ่ม touch target ≥ 44×44px (Housekeeping บน iPad) |
| Mobile | < 768px | Hamburger menu — Table กลายเป็น Card View |

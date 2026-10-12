# structure.md — Monorepo Folder Structure (pnpm Workspaces)

```
hotel-management-system/
├── apps/
│   └── web/                      # Frontend SPA — React + Vite + Tailwind CSS
├── services/                     # Backend Workers (TypeScript)
│   ├── api-gateway/              # Central API Gateway — Reverse Proxy, JWT Guard, RBAC, Service Bindings
│   ├── auth-user/            # Service #1: Auth + User Management (12 APIs) — db_auth_user
│   ├── room-inventory/       # Service #2: Rooms, Types, Floors, Amenities (18 APIs) — db_room
│   ├── reservation/          # Service #3: Reservations, Guests, Check-in/out (24 APIs) — db_reservation
│   ├── housekeeping/         # Service #4: Tasks, Staff, Issues, Schedule (16 APIs) — db_housekeeping
│   ├── billing/              # Service #5: Bills, Payments, Invoices (16 APIs) — db_billing
│   └── report-analytics/     # Service #6: Stats, Revenue, Occupancy (14 APIs) — db_report
│
├── packages/                     # โค้ดที่ใช้ร่วมกันข้าม apps/services
│   ├── types/                    # Shared TypeScript Interfaces, DTOs, Enums (auth, room, reservation, housekeeping, billing, report)
│   ├── events/                   # Upstash QStash Event Payload & Webhook Schema (type-safe contract ระหว่าง Producer/Consumer)
│   ├── config/                   # Base tsconfig.json, ESLint config, Prettier config
│   └── utils/                    # Common helpers: date formatting, UUID generation, currency rounding
│
├── docs/                         # เอกสารโปรเจกต์ (สำหรับทีมพัฒนา)
│   ├── skill.md                  # กฎเหล็กและ Tech Stack (อ่านก่อนเริ่มงานทุกครั้ง)
│   ├── design.md                 # Architecture decisions — ทำไมถึงออกแบบแบบนี้
│   ├── designsystem.md           # Design System — สี, typography, components, Status-Color
│   ├── structure.md              # ไฟล์นี้ — โครงสร้างโฟลเดอร์
│   ├── systemdesign.md           # System Architecture, Sequence Diagrams, 100 APIs
│   ├── อ่านก่อนทำงาน.md          # แผนแบ่งงาน, Phase, Service Ownership
│   ├── uat.md                    # แผนและผลการทดสอบการยอมรับของผู้ใช้ฉบับละเอียด (21 Test Cases)
│   └── How to Install and Command.md  # Onboarding + คำสั่งรันโปรเจกต์
│
│   ⚠️  README.md ไม่ได้อยู่ใน docs/ — อยู่ที่ root ของ repo (ดูด้านล่าง)
│
├── scripts/
│   ├── migrate-all.sh            # รัน Drizzle Migration ทั้ง 6 D1 databases
│   ├── seed-all.sh               # เติม Mock Data (Room Types, Users, Rooms) สำหรับ dev/test
│   └── dev.sh                    # สตาร์ททุก Service + Frontend พร้อมกัน
│
├── .github/
│   └── workflows/
│       ├── ci.yml                # Lint + Typecheck + ทดสอบ ทุก PR
│       └── deploy.yml            # Deploy Workers + Web ขึ้น Cloudflare เมื่อ Merge เข้า main
│
├── pnpm-workspace.yaml           # กำหนด packages apps/* และ packages/*
├── package.json                  # Root scripts: dev, build, lint, typecheck
├── tsconfig.base.json            # Base TypeScript config ที่ทุก workspace สืบทอด
├── .prettierrc                   # Prettier formatting rules
└── README.md                     # เอกสารภาพรวมโปรเจกต์ฉบับสมบูรณ์ (System Spec, 100 APIs, UML, ERD, UAT)
```

> `README.md` ที่ root คือเอกสารหลักของโปรเจกต์ทั้งหมด — ประกอบด้วย System Architecture, State Machine, Sequence Diagrams, 100 APIs, ER Diagrams, และ UAT ครบ 18 test cases

## โครงสร้างภายใน `services/api-gateway/`

```
services/api-gateway/
├── src/
│   ├── index.ts                  # Worker entry point (fetch handler)
│   ├── middleware/
│   │   ├── auth.ts               # ตรวจสอบ JWT Access Token ดึง role จาก payload
│   │   ├── rbac.ts               # Guard ตาม 4 roles: admin | manager | front_desk | housekeeping (front_desk ดูแล billing ด้วย)
│   │   ├── cors.ts               # Cross-Origin Resource Sharing headers
│   │   ├── rate-limit.ts         # Rate limiting ผ่าน Cloudflare KV
│   │   └── logger.ts             # Access log + response time
│   └── routes/
│       └── router.ts             # Map URL prefix → Service Binding
├── package.json
├── tsconfig.json
└── wrangler.toml                 # Service Bindings (ชี้ไปทั้ง 6 Workers) + KV binding
```

## โครงสร้างภายในแต่ละ `services/<service-name>/`

```
services/reservation/        # ตัวอย่าง: Reservation Service
├── src/
│   ├── index.ts                  # Worker entry point (fetch handler + QStash webhook handler)
│   ├── controllers/              # รับ HTTP Request, validate, ส่งต่อให้ service layer
│   │   ├── reservation.controller.ts
│   │   └── guest.controller.ts
│   ├── services/                 # Business Logic + State Machine + Outbox management (db.batch)
│   │   ├── reservation.service.ts
│   │   └── guest.service.ts
│   ├── db/
│   │   ├── client.ts             # Drizzle ORM initializer เชื่อมต่อ D1
│   │   └── schema.ts             # Drizzle schema ของ service นี้เท่านั้น (ห้าม import schema service อื่น)
│   ├── webhooks/
│   │   └── qstash-consumer.ts    # รับ Webhook Event จาก Upstash QStash พร้อม verify signature
│   ├── events/
│   │   └── qstash-producer.ts    # Outbox dispatcher — ส่ง Event เข้า Upstash QStash Topic (Fan-out)
│   └── validators/
│       └── reservation.validator.ts  # Zod schema สำหรับ validate request body/query
├── drizzle/
│   └── migrations/               # SQL Migration files สร้างโดย Drizzle Kit
│       ├── 0000_init_schema.sql
│       └── 0001_add_outbox.sql
├── drizzle.config.ts             # Drizzle Kit config (ชี้ไปที่ D1 db_reservation)
├── .dev.vars                     # QSTASH_TOKEN, JWT_SECRET (gitignored)
├── package.json
├── tsconfig.json
└── wrangler.toml                 # D1 binding + Service Binding declarations
```

## โครงสร้างภายใน `apps/web/` (3 Portals สำหรับสมาชิก 3 คน)

```
apps/web/
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root component + React Router setup
│   ├── components/
│   │   ├── common/               # Button, Input, Modal, Drawer, Toast, StatusBadge, Spinner
│   │   ├── layout/               # Sidebar, Header, Breadcrumbs, PageContainer
│   │   └── room/                 # RoomCard, RoomGrid, RoomStatusFilter
│   ├── pages/
│   │   ├── auth/                 # LoginPage, UnauthorizedPage
│   │   ├── front-desk/           # 🧑‍💼 Portal 1 (เดียร์): Room Matrix, Check-in, Check-out, Walk-in, Bills & Cashier, Minibar, Invoices
│   │   ├── housekeeping/         # 🧹 Portal 2 (บุญ): Task Kanban, Room Clean Status, Staff Schedule, Report Issues
│   │   └── manager-admin/        # 📊 Portal 3 (เขต): KPI Dashboard, Occupancy/Revenue Reports, User Management, Audit Logs
│   ├── hooks/                    # useAuth, useRooms, useTasks, useBills
│   ├── services/
│   │   └── api.ts                # Axios/Fetch client เรียก API Gateway เท่านั้น (ไม่เรียก service ตรงๆ)
│   └── styles/
│       └── globals.css           # Tailwind directives + CSS variables ของ Design System
├── index.html
├── package.json
├── tailwind.config.ts            # สี Status-Color, spacing, font
├── tsconfig.json
└── vite.config.ts
```

## โครงสร้างภายใน `packages/types/`

```
packages/types/
├── src/
│   ├── auth.types.ts             # User, Role enum, TokenPair, JWTPayload
│   ├── room.types.ts             # Room, RoomType, RoomStatus enum, Amenity, Floor
│   ├── reservation.types.ts      # Reservation, Guest, BookingType enum, ReservationStatus enum
│   ├── housekeeping.types.ts     # HousekeepingTask, Staff, RoomIssue, Priority enum, TaskStatus enum
│   ├── billing.types.ts          # Bill, BillItem, Payment, Invoice, BillStatus enum
│   └── report.types.ts           # DailyStats, MonthlySummary, RevenueRecord, KPIOverview
├── package.json
└── tsconfig.json
```

## โครงสร้างภายใน `packages/events/`

```
packages/events/
├── src/
│   ├── index.ts                  # Re-export ทุก event
│   ├── room-events.ts            # RoomStatusChangedEvent
│   ├── reservation-events.ts     # ReservationCreatedEvent, ReservationCheckedInEvent,
│   │                             # ReservationCheckedOutEvent, ReservationCancelledEvent
│   ├── housekeeping-events.ts    # HousekeepingTaskCompletedEvent
│   └── billing-events.ts         # BillPaidEvent
├── package.json
└── tsconfig.json
```

## กฎการวางไฟล์

- ห้าม service ไหน import schema/client ของ service อื่นโดยตรง — แต่ละ service เห็นเฉพาะ `schema.ts` ของตัวเอง
- TypeScript Types และ Event Payloads ที่ใช้ข้าม service ต้องอยู่ใน `packages/types` หรือ `packages/events` เท่านั้น ห้าม copy-paste
- Component React ที่ใช้มากกว่า 1 หน้า ต้องอยู่ใน `components/common/` ไม่ copy-paste ข้ามหน้า
- Zod validator ที่ใช้ทั้ง frontend (form) และ backend (request body) ให้อยู่ใน `packages/types` เพื่อไม่ให้ schema drift ออกจากกัน

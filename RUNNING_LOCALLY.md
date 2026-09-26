# RUNNING_LOCALLY.md — วิธีรันโปรเจกต์บนเครื่อง (Local Dev)

> สรุปย่อจาก `docs/How to Install and Command.md` ให้เช็คลิสต์เดียวจบ ไล่ทำตามลำดับข้อ

## ✅ Checklist ก่อนเริ่ม

- [ ] Node.js **v22.x** (`node --version`)
- [ ] pnpm **9.x** (`npm install -g pnpm`)
- [ ] Wrangler CLI **3.70.x+** (`npm install -g wrangler`)
- [ ] Cloudflare account + `wrangler login` แล้ว
- [ ] ได้ไฟล์ `.dev.vars` ของ service ที่รับผิดชอบมาจากเขตแล้ว

---

## ขั้นตอน

### 1. Clone + checkout branch
```bash
git clone <repo-url>
cd hotel-management-system
git checkout dev
```

### 2. ติดตั้ง dependencies (รันที่ root เท่านั้น)
```bash
pnpm install
```

### 3. Login Cloudflare (ครั้งแรกครั้งเดียว)
```bash
wrangler login
```

### 4. วางไฟล์ `.dev.vars`
วางไว้ที่ `apps/services/<ชื่อ-service>/.dev.vars` เช่น
```
JWT_SECRET=your-secret-here
CLOUDFLARE_ACCOUNT_ID=xxxx
DB_NAME=db_reservation
```
> ⚠️ ห้าม commit ไฟล์นี้ขึ้น Git

### 5. สร้าง D1 local + รัน Migration
```bash
pnpm db:migrate:local          # ทั้ง 6 databases พร้อมกัน
# หรือเฉพาะ service เดียว:
pnpm --filter @hotel/service-reservation db:migrate:local
```

### 6. เติม Mock Data
```bash
pnpm db:seed:local
```

### 7. รันโปรเจกต์
```bash
pnpm dev                # ทุก service + frontend พร้อมกัน
# หรือแยกรัน:
pnpm dev:backend         # เฉพาะ api-gateway + services/*
pnpm dev:frontend        # เฉพาะ apps/web
pnpm --filter @hotel/service-reservation dev   # เฉพาะ service เดียว
```

### 8. ทดสอบด้วย Postman
1. Import `tests/postman/Hotel_System_100_APIs.json`
2. เลือก Environment: **Local** (`http://localhost:8787`)
3. ยิง `POST /login` ก่อน เพื่อรับ JWT (Postman set Bearer token อัตโนมัติ)
4. ไล่ทดสอบ flow: จอง → เช็คอิน → เช็คเอาท์ → ตรวจแม่บ้าน → บิล → รายงาน

---

## 🧪 คำสั่งตรวจสอบคุณภาพโค้ด (รันก่อน commit/PR)
```bash
pnpm typecheck
pnpm lint
pnpm build
```

---

## ❓ Troubleshooting ที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `D1 Database binding not found` | ยังไม่ได้รัน `pnpm db:migrate:local` — ต้องสร้างไฟล์ `.wrangler/state/v3/d1/` ก่อน |
| `401 Unauthorized` ตลอด | เช็ค Header `Authorization: Bearer <token>`; Access Token หมดอายุใน 15 นาที ให้ยิง `POST /refresh-token` |
| Queue/Webhook consumer ไม่ทำงานในเครื่อง | ใช้ `wrangler dev --remote` หรือยิง HTTP ตรงเข้า consumer endpoint ผ่าน Postman แทน |
| `drizzle-kit generate` ไม่ออก migration file | เช็คว่า `schema.ts` มี export ตาราง และ `drizzle.config.ts` ชี้ path ถูก |
| `wrangler deploy` ล้มเหลว "CPU time limit" | เช็คว่าไม่ได้ import package ที่มี native binding (เช่น `bcrypt`, `prisma`) — ใช้ `bcryptjs` + `drizzle-orm` เท่านั้น |

---

## 📖 อ่านต่อก่อนเริ่มเขียนโค้ด

ลำดับที่แนะนำ: `docs/อ่านก่อนทำงาน.md` (หา Phase ของตัวเอง) → `docs/skill.md` (กฎเหล็ก) → `docs/structure.md` (หา path) → `docs/design.md` (เหตุผลการออกแบบ) → `docs/designsystem.md` (ทำ UI) → `docs/systemdesign.md` (100 APIs + Sequence Diagrams)

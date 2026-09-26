# 🚀 Onboarding Guide — Hotel Management System

คู่มือ setup โปรเจกต์ครั้งแรก สำหรับสมาชิกทีมทุกคน

---

## 1️⃣ ติดตั้งเครื่องมือพื้นฐาน

```bash
# ติดตั้งและสลับไปใช้ Node.js v22 (ต้องเป็น v22+ เท่านั้น)
nvm install 22
nvm use 22

# ติดตั้ง pnpm แบบ global
npm install -g pnpm

# ติดตั้ง Wrangler CLI (Cloudflare Workers toolchain)
npm install -g wrangler

# ตรวจสอบ version
node --version    # v22.x.x
pnpm --version    # 9.x.x
wrangler --version # 3.70.x+
```

## 2️⃣ Clone โปรเจกต์

```bash
git clone <repo-url>
cd hotel-management-system
git checkout dev
```

## 3️⃣ ติดตั้ง Dependencies

```bash
# รันที่ root ของ monorepo เท่านั้น — ติดตั้งทุก workspace พร้อมกัน
pnpm install
```

## 4️⃣ ล็อกอิน Cloudflare

```bash
# ทำครั้งแรกเท่านั้น — browser จะเปิดขึ้นมาให้ authorize
wrangler login
```

## 5️⃣ ตั้งค่า Environment Variables

นำไฟล์ `.dev.vars` ของ service ที่ได้รับมอบหมาย (ขอจากเขตผ่าน Discord/LINE) มาวางไว้ใน folder ของ service นั้น:

```
apps/services/<ชื่อ-service>/.dev.vars
```

ตัวอย่าง `.dev.vars` สำหรับ `reservation`:
```
JWT_SECRET=your-secret-here
CLOUDFLARE_ACCOUNT_ID=xxxx
DB_NAME=db_reservation
```

> ⚠️ ห้าม commit ไฟล์ `.dev.vars` หรือ `.env` ขึ้น Git เด็ดขาด — มี `.gitignore` ครอบไว้แล้ว แต่ระวังด้วย

## 6️⃣ สร้าง D1 Database Local + รัน Migration

```bash
# รัน Migration ทั้ง 6 databases พร้อมกัน (local mode)
pnpm db:migrate:local

# หรือรัน migration เฉพาะ service เดียว
pnpm --filter @hotel/service-reservation db:migrate:local

# เติม Mock Data สำหรับทดสอบ (Room Types, Users, Rooms ตัวอย่าง)
pnpm db:seed:local
```

## 7️⃣ อ่านเอกสารก่อนเริ่มงาน

อ่านตามลำดับนี้:

1. งานที่ได้รับมอบหมาย → ดูจาก `docs/อ่านก่อนทำงาน.md` (Phase ของตัวเอง)
2. `docs/skill.md` — กฎเหล็ก 5 ข้อ + Naming Convention
3. `docs/structure.md` — หา path ไฟล์ว่าวางตรงไหน
4. `docs/design.md` — ทำไมถึงออกแบบแบบนี้ (อ่านก่อนเขียน business logic)
5. `docs/designsystem.md` — เวลาทำ UI (สี, spacing, component)
6. `docs/systemdesign.md` — สถาปัตยกรรมระดับระบบ + 100 APIs + Sequence Diagrams

## 8️⃣ เริ่มทำงาน

```bash
# PR feature เข้า dev เท่านั้น — ห้าม push ตรงเข้า main

# สร้าง branch ใหม่จากชื่องาน/feature ของตัวเอง
git checkout -b feat/<service-name>-<feature>
# เช่น
git checkout -b feat/reservation-check-in
git checkout -b feat/housekeeping-assign-task
git checkout -b fix/billing-tax-calculation
```

เริ่มทำตาม Phase ที่ระบุไว้ใน `docs/อ่านก่อนทำงาน.md`

---

## ▶️ คำสั่งรันโปรเจกต์

| คำสั่ง | ใช้เมื่อ |
|---|---|
| `pnpm dev` | รันทุก service + frontend พร้อมกันทั้งหมด |
| `pnpm dev:frontend` | รันเฉพาะ Frontend SPA (apps/web) |
| `pnpm dev:backend` | รันเฉพาะ backend (api-gateway + services/*) |
| `pnpm --filter @hotel/service-reservation dev` | รันเฉพาะ service ตัวเดียว |
| `pnpm --filter @hotel/web dev` | รันเฉพาะ Frontend |
| `pnpm typecheck` | ตรวจ TypeScript errors ทุก workspace |
| `pnpm lint` | รัน ESLint ทุก workspace |
| `pnpm build` | Build ทุก app/service สำหรับ production |

## 🗄️ คำสั่ง Database (Drizzle + D1)

| คำสั่ง | ใช้เมื่อ |
|---|---|
| `pnpm db:generate` | สร้าง Migration SQL จาก Drizzle schema ที่แก้ไข |
| `pnpm db:migrate:local` | รัน Migration ลงใน D1 local ทุกตัว |
| `pnpm db:migrate:prod` | รัน Migration ขึ้น Cloudflare D1 Production (เขตเท่านั้น) |
| `pnpm db:seed:local` | เติม Mock Data (Room Types, Users ตัวอย่าง) |
| `pnpm db:studio` | เปิด Drizzle Studio GUI ดู/แก้ข้อมูลใน browser |

## 🚢 คำสั่ง Deploy (Wrangler)

| คำสั่ง | ใช้เมื่อ |
|---|---|
| `wrangler deploy` | Deploy Worker ตัวเดียว (รันใน folder ของ service นั้น) |
| `pnpm deploy:all` | Deploy ทุก service + frontend ขึ้น Cloudflare (CI/CD เท่านั้น) |
| `wrangler tail` | ดู real-time logs ของ Worker ที่ deploy แล้ว |
| `wrangler d1 execute <db-name> --command "SELECT * FROM rooms LIMIT 5"` | Query D1 Production ตรงๆ เพื่อ debug |

## 🧪 คำสั่ง Test (Postman)

```bash
# Import Postman Collection
# 1. เปิด Postman
# 2. Import → File → เลือก tests/postman/Hotel_System_100_APIs.json
# 3. เลือก Environment: Local (http://localhost:8787)
# 4. ยิง POST /login ก่อนเพื่อรับ JWT Token (Postman จะ set Bearer อัตโนมัติ)
# 5. ทดสอบตาม Flow: จอง → เช็คอิน → เช็คเอาท์ → ตรวจแม่บ้าน → บิล → รายงาน
```

---

## ❓ Troubleshooting ที่พบบ่อย

**Q: รัน `pnpm dev` แล้วขึ้น "D1 Database binding not found"**
→ ให้รัน `pnpm db:migrate:local` ก่อน — Wrangler ต้องสร้างไฟล์ `.wrangler/state/v3/d1/` ในเครื่องก่อน

**Q: ได้รับ `401 Unauthorized` ตลอด**
→ ตรวจว่า Header มี `Authorization: Bearer <token>` หรือยัง Access Token อายุ 15 นาที ให้ยิง `POST /refresh-token` เพื่อขอชุดใหม่

**Q: Queue Consumer ไม่ทำงานในเครื่อง**
→ Cloudflare Queues ไม่รองรับ local emulation เต็มรูปแบบ ให้ใช้ `wrangler dev --remote` หรือ test consumer โดยตรงผ่าน Postman ยิง HTTP ตรงไปที่ consumer endpoint

**Q: Drizzle generate แล้วไม่มีไฟล์ migration ออกมา**
→ ตรวจว่า `schema.ts` มี export ตารางออกมาหรือยัง และ `drizzle.config.ts` ชี้ path ถูกต้อง

**Q: `wrangler deploy` ล้มเหลว "Script startup exceeded CPU time limit"**
→ มักเกิดจาก import package ที่หนักเกิน เช่น Prisma — ตรวจสอบว่าใช้แค่ Drizzle ORM และไม่มี Native Binding ใดๆ

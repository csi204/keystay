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
git clone https://github.com/csi204/keystay.git
cd keystay
git checkout dev
```

### 2. ติดตั้ง dependencies (รันที่ root เท่านั้น)
```bash
pnpm install
```

### 3. Login Cloudflare (หากต้องการดูรีซอร์สหรือรันคำสั่ง wrangler)
```bash
pnpm dlx wrangler login
```

### 4. วางไฟล์ `.env` ที่ root และ `.dev.vars` ในแต่ละ service
- คัดลอกค่าจาก `OnlyMe/SECRETS_HANDBOOK.md` หรือถามค่าจากเขต (`@hazeco`)
- ที่ root: สร้างไฟล์ `.env` (ดูตัวอย่างใน `.env.example`)
- ที่แต่ละ service: สร้างไฟล์ `.dev.vars` เช่น `services/auth-user/.dev.vars`
> ⚠️ ห้าม commit ไฟล์ `.env` และ `*.dev.vars` ขึ้น Git เด็ดขาด (อยู่ใน `.gitignore` แล้ว)

### 5. สร้าง D1 Local SQLite + รัน Migration ครบทั้ง 6 Services ในคำสั่งเดียว
```bash
pnpm d1:migrate:local
```
> คำสั่งนี้จะสร้างตารางฐานข้อมูล SQLite จำลองลงใน `.wrangler/state/v3/d1/` ของแต่ละ service ให้อัตโนมัติ โดยไม่ต้องกังวลว่าจะกระทบกับฐานข้อมูลจริงบน Cloudflare!


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
pnpm --filter @keystay/service-reservation dev   # เฉพาะ service เดียว
```

### 💡 โหมดการรัน: Local Mode vs Remote Mode (สำคัญมาก)

* **โหมด Local (ค่าเริ่มต้นเวลาพิมพ์ `pnpm dev` หรือ `wrangler dev`):**
  * แม้เราจะระบุ `database_id` หรือชื่อ Bucket ไว้ใน `wrangler.jsonc` แล้ว แต่เมื่อเรารันในโหมดปกติ Wrangler จะ **จำลอง D1 (SQLite), KV และ R2 ไว้บนเครื่องคอมพิวเตอร์ของเราเอง** (เก็บไว้ในโฟลเดอร์ `.wrangler/state/v3/`)
  * **ข้อดีมาก:** เพื่อนๆ ทั้ง 3 คน (เขต, บุญ, เดียร์) สามารถกดรัน สร้างข้อมูล ทดสอบ ลบตาราง หรืออัปโหลดรูปภาพได้อย่างอิสระ ข้อมูลไม่ปนกัน และไม่มีทางกระทบกับ Cloudflare ของจริง
* **โหมด Remote (`wrangler dev --remote`):**
  * จะเชื่อมต่อไปยัง Cloudflare ของจริง (D1, KV, R2 บน Cloud) ก็ต่อเมื่อเราสั่ง flag `--remote` เท่านั้น
  * เหมาะสำหรับตอนทำฟีเจอร์เสร็จแล้วอยากเทสร่วมกับระบบ Cloud จริง หรือทดสอบ Webhook ของ Upstash ก่อนที่จะ Merge เข้า `main`

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

## ⚡ สถาปัตยกรรม Frontend: Route Lazy Loading & Code Splitting

แอปพลิเคชันฝั่งหน้าบ้าน (`apps/web`) ใช้สถาปัตยกรรม **Route-level Lazy Loading** ด้วย `React.lazy` และ `<React.Suspense>` เพื่อประสิทธิภาพระดับ Enterprise:

### 1. ทำไมถึงต้องทำ Lazy Load?
* หน้า **Admin & Manager Portal** มีขนาดใหญ่และมี Dependency หนัก (เช่น แผนภูมิวิเคราะห์, Recharts, ตารางจัดการผู้ใช้, ตารางจัดการห้องและราคา)
* หากไม่ทำ Lazy Loading ผู้ใช้ทั่วไปหรือพนักงาน Front Desk ที่เข้าหน้าแรก/หน้า Login จะต้องดาวน์โหลด JavaScript ก้อนยักษ์ทั้งหมด ทำให้หน้าเว็บโหลดช้า
* เมื่อใช้ Lazy Loading ตัว Bundle เริ่มต้นของหน้า Login จะมีขนาดเบามาก และโหลดเสร็จในเสี้ยววินาที (~100-150ms) โดยส่วนของ Admin จะถูกแยกเป็น Chunks ดาวน์โหลดเฉพาะเมื่อผู้ใช้เข้าสู่ระบบสำเร็จเท่านั้น

### 2. รูปแบบการใช้งานในโค้ด (`apps/web/src/App.tsx`)
```tsx
// 1. นำเข้า Component หน้าแบบ Dynamic Import ผ่าน React.lazy
const ManagerDashboardPage = React.lazy(() => import('./pages/admin/ManagerDashboardPage'));
const RoomsPricingPage = React.lazy(() => import('./pages/admin/RoomsPricingPage'));
const UsersManagementPage = React.lazy(() => import('./pages/admin/UsersManagementPage'));
const ReportsAnalyticsPage = React.lazy(() => import('./pages/admin/ReportsAnalyticsPage'));

// 2. ครอบ Routes ด้วย React.Suspense พร้อม UI Fallback ขณะกำลังโหลด Chunk
<React.Suspense
  fallback={
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col items-center justify-center p-8 text-slate-500">
      <div className="w-9 h-9 rounded-full border-2 border-[#F97316] border-t-transparent animate-spin mb-3" />
      <span className="text-xs font-medium">กำลังโหลดโมดูลระบบ...</span>
    </div>
  }
>
  <Routes>
    {/* นิยาม Route ปกติ */}
  </Routes>
</React.Suspense>
```

### 3. ผลลัพธ์เมื่อ Build ด้วย Vite
เมื่อสั่ง `pnpm --filter @keystay/web build` ตัว Vite จะตัดไฟล์เป็น Dynamic Chunks อัตโนมัติ:
* `dist/assets/ManagerDashboardPage-[hash].js`
* `dist/assets/RoomsPricingPage-[hash].js`
* `dist/assets/UsersManagementPage-[hash].js`
* `dist/assets/ReportsAnalyticsPage-[hash].js`
ช่วยลด First Contentful Paint (FCP) และประหยัด Bandwidth ของระบบ

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

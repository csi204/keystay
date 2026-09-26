# 🚀 Onboarding Guide — KEYSTAY Hotel Management System

คู่มือติดตั้งและรันโปรเจกต์ฉบับสมบูรณ์ สำหรับสมาชิกทีม KEYSTAY ทุกคน (เขต, เดียร์, บุญ)

---

## 👥 ข้อมูลสมาชิกและบทบาทหน้าที่ (Team Matrix)

| สมาชิก | GitHub | บทบาทหลัก | ดูแล Frontend | ดูแล Backend |
|---|---|---|---|---|
| **เขต (เขตโสภณ)** | `@hazeco` | **Project Lead**, Infra, DevOps, CI/CD, Gateway, Security | Manager & Admin Portal (`/admin`) | `api-gateway`<br>`auth-user`<br>`report-analytics` |
| **เดียร์ (ธีรภัทร)** | `@allmusgus` | **SA Lead**, System Analyst, Schemas, State Machine, Outbox Patterns | Front Desk & Cashier Portal (`/front-desk`) | `reservation`<br>`billing` |
| **บุญ (ปวริศ)** | `@Legxcy77` | **QA Lead**, UAT Scenarios, Postman Automation, QA Quality Gates | Housekeeping Portal (`/housekeeping`) | `room-inventory`<br>`housekeeping` |

📌 **ติดตามงานและ Kanban Board ได้ที่:** [KEYSTAY GitHub Projects](https://github.com/orgs/csi204/projects/1)  
🛡️ **นโยบายความปลอดภัยและข้อควรระวัง:** [docs/SECURITY.md](file:///d:/code/keystay/docs/SECURITY.md)  
🤝 **คู่มือและ Event Contracts:** [docs/อ่านก่อนทำงาน.md](file:///d:/code/keystay/docs/อ่านก่อนทำงาน.md)

---

## 1️⃣ ติดตั้งเครื่องมือพื้นฐาน (Prerequisites)

```bash
# 1. ติดตั้ง Node.js v22 (ต้องเป็น v22.x เท่านั้น)
nvm install 22
nvm use 22

# 2. ติดตั้ง pnpm v11 (ระบบใช้ pnpm@11.11.0)
npm install -g pnpm@11.11.0

# 3. ติดตั้ง Cloudflare Wrangler CLI (เวอร์ชันล่าสุด 4.x+)
npm install -g wrangler

# ตรวจสอบเวอร์ชัน
node --version       # v22.x.x
pnpm --version       # 11.11.0
wrangler --version    # 4.140.x+
```

---

## 2️⃣ Clone โปรเจกต์ & เช็คเอาท์ Branch `dev`

```bash
# Clone repository
git clone https://github.com/csi204/keystay.git
cd keystay

# สลับไปยัง branch dev (ทุกคนทำงานบน dev แตก branch ออกไป)
git checkout dev
```

---

## 3️⃣ ติดตั้ง Dependencies

```bash
# ติดตั้ง dependencies ทุก workspace พร้อมกันที่ root
pnpm install
```

---

## 4️⃣ เข้าสู่ระบบ Cloudflare (ทำครั้งแรกครั้งเดียว)

```bash
# รันคำสั่งนี้ แล้วเบราว์เซอร์จะเปิดขึ้นมาให้กดยืนยัน Authorize
wrangler login
```

---

## 5️⃣ การตั้งค่า Secrets & Environment Variables

- สำหรับ **Local Development**: มีค่า Default ที่พร้อมรันได้ทันทีโดยไม่ต้องแก้ไข `.env`
- สำหรับ **Remote Cloudflare**: ทุก Service ได้รับการ Bind D1, KV, R2 และใส่ Secrets (`JWT_SECRET`, `QSTASH_TOKEN`, `CLOUDFLARE_API_TOKEN`) ไว้บน Cloudflare Dashboard ครบถ้วนแล้ว
- หากต้องการดูคู่มือ Secrets เจาะลึก: อ่านได้ที่ `OnlyMe/secrets/SECRETS_HANDBOOK.md`

---

## 6️⃣ สร้าง Database และเติม Mock Data (Seed)

ระบบเตรียมคำสั่งรันอัตโนมัติทั้ง 6 ฐานข้อมูลไว้ให้แล้ว:

```bash
# 1. รันสร้าง Table ลงฐานข้อมูล Local SQLite ทั้ง 6 เซอร์วิส
pnpm d1:migrate:local

# 2. เติมข้อมูลจำลอง (Users, Rooms, Reservations, Tasks, Bills, Reports) ลง Local
pnpm d1:seed:local

# (ทางเลือก) สำหรับเขต: อัปเดต Schema และ Seed ขึ้น Cloudflare Remote D1 จริง
pnpm d1:migrate:remote
pnpm d1:seed:remote
```

> 💡 **หมายเหตุ:** สามารถใช้คำสั่ง `pnpm db:migrate:local` และ `pnpm db:seed:local` แทนได้เช่นกัน (เป็น alias)

---

## 7️⃣ รันระบบเพื่อเริ่มพัฒนา (Local Development)

```bash
# รันทุกแอปและทุกเซอร์วิสพร้อมกัน (Turborepo Concurrency)
pnpm dev

# หรือรันเฉพาะ Frontend อย่างเดียว (Vite SPA พอร์ต 5173)
pnpm dev:frontend

# หรือรันเฉพาะ Backend อย่างเดียว (API Gateway พอร์ต 8787 + เซอร์วิส 8788-8793)
pnpm dev:backend

# หรือรันเฉพาะเซอร์วิสของตัวเอง (เช่น เซอร์วิส reservation)
pnpm --filter @keystay/reservation dev
```

### 🌐 Ports ประจำแต่ละเซอร์วิส:
| แอป / เซอร์วิส | Local Port | หน้าที่ |
|---|---|---|
| `apps/web` | `5173` | Frontend Single Page Application (React + Vite) |
| `apps/api-gateway` | `8787` | Central API Gateway, Reverse Proxy, JWT Guard, Rate Limiter |
| `auth-user` | `8788` | Authentication, Users, Roles & Permissions |
| `room-inventory` | `8789` | Rooms, Room Types, Floors, Status History |
| `reservation` | `8790` | Bookings, Guests, Check-in / Check-out, Walk-in |
| `housekeeping` | `8791` | Cleaning Kanban, Task Assignment, Room Issues |
| `billing` | `8792` | Folio Bills, Minibar Items, Payments & Invoices |
| `report-analytics` | `8793` | KPIs, Daily Stats, Occupancy %, CSV/PDF Export |

---

## 🔑 บัญชีเข้าสู่ระบบเริ่มต้น (Default Seed Users)

พนักงานทุกแผนกล็อกอินผ่านหน้าจอเดียวที่ `/login`:

| Email | Password | Role | สิทธิ์ / หน้าจอที่เปิดได้ |
|---|---|---|---|
| `admin@keystay.com` | `Keystay@2026` | `admin` | Manager & Admin Portal (`/admin`) — สิทธิ์เต็ม |
| `manager@keystay.com` | `Keystay@2026` | `manager` | Manager & Admin Portal (`/admin`) — ดู KPI, คุมราคา |
| `frontdesk@keystay.com` | `Keystay@2026` | `front_desk` | Front Desk & Cashier Portal (`/front-desk`) |
| `housekeeping@keystay.com` | `Keystay@2026` | `housekeeping` | Housekeeping Portal (`/housekeeping`) |

---

## 8️⃣ Git Workflow & กฎการส่งงาน

```bash
# 1. แตก branch ใหม่จาก dev เสมอ (ห้าม push ตรงเข้า main หรือ dev)
git checkout dev
git pull origin dev
git checkout -b feat/ชื่อฟีเจอร์-หรือ-issue

# เช่น
git checkout -b feat/room-inventory-state-machine
git checkout -b feat/reservation-checkin-flow
git checkout -b test/housekeeping-uat-scenario

# 2. คอมมิตโค้ดตาม Conventional Commits
git commit -m "feat(reservation): implement advance booking validation"

# 3. Push ขึ้น GitHub แล้วเปิด Pull Request เข้าหา 'dev'
git push origin feat/ชื่อฟีเจอร์
# ใน PR Description ให้พิมพ์ "Closes #IssueNumber" เช่น "Closes #3" เพื่อปิดงานอัตโนมัติ
```

---

## 🚢 คำสั่ง Deploy ขึ้น Cloudflare

- **อัตโนมัติ (CI/CD):** เมื่อ PR ถูก Merge เข้า `main` GitHub Actions (`.github/workflows/deploy.yml`) จะ Build และ Deploy ทุกเซอร์วิสขึ้น Cloudflare Workers & Pages อัตโนมัติ
- **Manual Deploy รายเซอร์วิส:**
  ```bash
  cd apps/services/report-analytics
  pnpm dlx wrangler deploy
  ```

---

## ❓ FAQ & Troubleshooting

**Q: ทำไมรัน `pnpm dev` แล้วขึ้น Error เกี่ยวกับ D1 Database binding?**  
👉 ให้รัน `pnpm d1:migrate:local` และ `pnpm d1:seed:local` ก่อน เพื่อให้ Wrangler จำลอง SQLite ไฟล์ในโฟลเดอร์ `.wrangler/state/` ในเครื่อง

**Q: ได้รับ HTTP `401 Unauthorized` เวลาเรียก API?**  
👉 API ส่วนใหญ่ (ยกเว้น `/health` และ `/api/auth/login`) ต้องแนบ Header:  
`Authorization: Bearer <jwt-access-token>`  
Access Token มีอายุ 15 นาที หากหมดอายุ ให้เรียก `POST /api/auth/refresh-token` เพื่อขอ Token ใหม่

**Q: ทดสอบ Webhook หรือ Event ระหว่างเครื่องอย่างไร?**  
👉 ให้ยิง HTTP POST ตรงไปยัง Webhook endpoint ของเซอร์วิสนั้นๆ (เช่น `http://localhost:8789/webhooks/checkout`) โดยแนบ Body JSON ตามโครงสร้าง Zod ใน `packages/events/src/index.ts`

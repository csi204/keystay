# DEPENDENCIES.md — Hotel Management System

> รวบรวมจากสิ่งที่ระบุไว้ใน `skill.md` (Tech Stack), `structure.md` และ `How to Install and Command.md`
> **หมายเหตุ:** เอกสารต้นทางไม่ได้ระบุเลขเวอร์ชันของทุก package เป๊ะๆ (ไม่มี `package.json` แนบมา) รายการนี้จึงเป็น "รายชื่อ + ช่วงเวอร์ชันที่ควรใช้" ให้ล็อกเวอร์ชันจริงตอนรัน `pnpm add` ครั้งแรกแล้ว commit `pnpm-lock.yaml` ไว้เป็นความจริงสุดท้าย

---

## 0. เครื่องมือระดับเครื่อง (Global Tooling — ระบุ version ชัดใน docs)

| เครื่องมือ | เวอร์ชันที่ต้องใช้ | ใช้ทำอะไร |
|---|---|---|
| Node.js | **v22.x** (ห้ามต่ำกว่า) | Runtime สำหรับ dev tooling ทั้งหมด |
| pnpm | **9.x** | Package manager + Workspaces |
| wrangler | **3.70.x+** | Cloudflare Workers CLI (dev, deploy, D1, tail) |

---

## 1. Root — `package.json` (dev-only, ใช้ทั้ง monorepo)

| Package | หมวด | เหตุผล |
|---|---|---|
| `typescript` | devDependency | ทุก workspace สืบทอด `tsconfig.base.json` |
| `eslint` + config plugins | devDependency | `pnpm lint` |
| `prettier` | devDependency | `.prettierrc` — format กลาง |
| `wrangler` | devDependency (หรือ global) | ใช้ deploy/migrate D1 |

---

## 2. `packages/*` (shared code — ไม่มี runtime dependency หนัก)

| Package | ใช้ใน | Dependency |
|---|---|---|
| `packages/types` | ทุก service + frontend | ไม่มี runtime dep (type-only) |
| `packages/events` | Producer/Consumer ทุก service | `zod` (validate event payload) |
| `packages/config` | ทุก workspace | — (เก็บ config file เฉยๆ) |
| `packages/utils` | ทุก service + frontend | ไม่ระบุ lib ภายนอกใน docs — เขียนเอง (date format, UUID, currency rounding) |

---

## 3. `services/api-gateway` (Cloudflare Worker)

| Package | ใช้ทำอะไร |
|---|---|
| `hono` **หรือ** raw `fetch` handler | Router (docs ไม่ได้ระบุ framework ชัด — `hono` เป็นตัวเลือกมาตรฐานที่เบาและรันบน Workers ได้ดี ถ้าไม่ใช้ framework ก็เขียน router.ts เองได้) |
| `jose` | Verify JWT แบบ edge-compatible (แทน `jsonwebtoken` ซึ่งพึ่ง Node native) |
| `@hotel/types` (workspace) | Shared types |

> ⚠️ ไม่มีการระบุ JWT library ตายตัวใน docs ที่ให้มา — `jose` คือคำแนะนำเพราะเป็น edge/Workers-compatible (ไม่มี native binding) สอดคล้องกับกฎเหล็กข้อ 5 ใน `skill.md`

---

## 4. `services/*` (ทั้ง 6 services: auth-user, room-inventory, reservation, housekeeping, billing, report-analytics)

ทุก service ใช้ dependency ชุดเดียวกันเป็นหลัก:

| Package | หมวด | เหตุผล |
|---|---|---|
| `drizzle-orm` | dependency | ORM หลัก, bridge camelCase ↔ snake_case, `db.batch()` สำหรับ Outbox Pattern |
| `drizzle-kit` | devDependency | Generate migration SQL จาก schema |
| `zod` | dependency | Validate request body/query (`reservation.validator.ts` เป็นต้น) |
| `@upstash/qstash` | dependency | ส่ง Event เข้า Topic (Producer) + Verify Webhook Signature (Consumer) |
| `bcryptjs` | dependency (เฉพาะ `auth-user`) | Hash password — **ห้ามใช้ `bcrypt`** (native binding ใช้ไม่ได้บน Workers) |
| `@hotel/types`, `@hotel/events`, `@hotel/config`, `@hotel/utils` | workspace dependency | Shared code |
| `wrangler` | devDependency | Local dev + deploy ต่อ service |
| `@cloudflare/workers-types` | devDependency | Type ของ D1, KV, Fetch env สำหรับ TypeScript |

**เฉพาะ `auth-user`:**
- `bcryptjs` (hash/verify password)
- `jose` (issue/verify JWT + refresh token)

---

## 5. `apps/web` (Frontend SPA — 3 Portals)

| Package | หมวด | เหตุผล |
|---|---|---|
| `react`, `react-dom` | dependency | UI library |
| `react-router-dom` | dependency | Route ระหว่าง 3 Portals (front-desk, housekeeping, manager-admin) |
| `vite`, `@vitejs/plugin-react` | devDependency | Dev server + build |
| `typescript` | devDependency | Type safety |
| `tailwindcss`, `postcss`, `autoprefixer` | devDependency | ตาม `designsystem.md` (Status-Color System) |
| `lucide-react` | dependency | ชุดไอคอนเดียวทั้งระบบ (ห้ามผสมชุดอื่น ตาม designsystem.md ข้อ 7) |
| `axios` | dependency | เรียก API Gateway ผ่าน `services/api.ts` (หรือใช้ native `fetch` แทนได้) |
| `@hotel/types` | workspace dependency | Shared DTO/enum ระหว่าง front กับ back |
| `zod` | dependency | Validate form ฝั่ง client (schema เดียวกับ backend ใน `packages/types`) |

---

## 6. Infrastructure / External Services (ไม่ใช่ npm package แต่ต้อง provision)

| บริการ | ใช้ทำอะไร | เจ้าของ (ตาม อ่านก่อนทำงาน.md) |
|---|---|---|
| Cloudflare D1 (×6) | ฐานข้อมูลต่อ service | เขต (setup ตอน Phase 0) |
| Cloudflare KV | Session/Permission cache, Rate limit | เขต |
| Upstash QStash | Pub/Sub message bus (Topics + Webhook) | เขต |
| GitHub Actions | CI/CD (`ci.yml`, `deploy.yml`) | เขต |

---

## 7. ทดสอบ (ไม่ใช่ runtime dependency)

- **Postman** (external app, ไม่ใช่ npm package) — ใช้ Collection `tests/postman/Hotel_System_100_APIs.json`
- ไม่มี automated test framework (เช่น vitest/jest) ถูกระบุใน docs ที่ให้มา — การทดสอบทั้งหมดอิงกับ Manual UAT + Postman ตาม `uat.md`

---

### สรุปคำสั่งติดตั้ง (อ้างอิงจาก How to Install and Command.md)

```bash
nvm install 22 && nvm use 22
npm install -g pnpm wrangler
pnpm install     # รันที่ root เท่านั้น ติดตั้งทุก workspace พร้อมกัน
```

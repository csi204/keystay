# 🛡️ นโยบายความปลอดภัยและแนวทางปฏิบัติ (Security Guidelines & Best Practices)

> **เอกสารฉบับนี้กำหนดมาตรฐานความปลอดภัยระดับองค์กรสำหรับโครงการ KEYSTAY (Hotel Management System)**  
> ⚠️ **คำเตือนสำหรับนักพัฒนาทุกคนและ AI Coding Assistant:** ห้ามละเมิดกฎในเอกสารนี้โดยเด็ดขาด การเขียนโค้ดที่ข้ามการตรวจสอบความปลอดภัยถือว่าไม่ผ่านเกณฑ์การส่งมอบงาน

---

## 📑 สารบัญ (Table of Contents)
1. [คำสั่งกำกับ AI Coding Assistant (AI Safety Directives)](#1-คำสั่งกำกับ-ai-coding-assistant-ai-safety-directives)
2. [การป้องกัน SQL Injection บน Cloudflare D1](#2-การป้องกัน-sql-injection-บน-cloudflare-d1)
3. [นโยบาย CORS (Cross-Origin Resource Sharing)](#3-นโยบาย-cors-cross-origin-resource-sharing)
4. [การป้องกัน XSS (Cross-Site Scripting) และ Content Security Policy](#4-การป้องกัน-xss-cross-site-scripting)
5. [การป้องกัน CSRF และการรักษาความปลอดภัยของ Token](#5-การป้องกัน-csrf-และการรักษาความปลอดภัยของ-token)
6. [การแยกเครือข่ายและระบบ Private Network (Tailnet / Cloudflare Zero Trust / Service Bindings)](#6-การแยกเครือข่ายและ-private-network)
7. [การยืนยันตัวตนและการเข้ารหัสรหัสผ่าน (Authentication & Password Security)](#7-การยืนยันตัวตนและรหัสผ่าน)
8. [การป้องกันการโจมตีแบบ DoS และ Rate Limiting บน Cloudflare KV](#8-การป้องกัน-dos-และ-rate-limiting)
9. [การยืนยัน Signature ของ Upstash QStash Webhooks](#9-การยืนยัน-signature-ของ-upstash-qstash-webhooks)
10. [การคุ้มครองข้อมูลส่วนบุคคล (PII) และการบันทึก Log](#10-การคุ้มครองข้อมูลส่วนบุคคล-pii)

---

## 1. 🤖 คำสั่งกำกับ AI Coding Assistant (AI Safety Directives)

เมื่อมี AI (Antigravity, Cursor, Copilot, ChatGPT, Claude ฯลฯ) เข้ามาช่วยเขียนโค้ดหรือแก้ไขระบบในโปรเจกต์นี้ **AI ต้องปฏิบัติตามกฎ 7 ข้อนี้อย่างเคร่งครัด:**

1. 🚫 **ห้ามเขียน Raw String Concatenation ใน SQL:** ทุกคำสั่ง SQL ต้องใช้ Prepared Statements `db.prepare('... ? ...').bind(...)` เสมอ
2. 🚫 **ห้ามใช้ Wildcard `*` ใน CORS ร่วมกับ Credentials:** Origin ต้องระบุเฉพาะโดเมนที่อนุญาตเท่านั้น
3. 🚫 **ห้าม Hardcode Secrets:** ห้ามใส่ Secret, API Token, Private Key ในโค้ดหรือคอมมิตเข้า Git ต้องอ่านผ่าน `env` ของ Cloudflare Workers เท่านั้น
4. 🚫 **ห้าม Bypass JWT หรือ RBAC Middleware:** ห้ามสร้าง Endpoint ที่เข้าถึงข้อมูลหลังบ้านโดยไม่มีการตรวจสอบ Token และ Role
5. 🚫 **ห้ามใช้ `dangerouslySetInnerHTML` ใน React:** ยกเว้นกรณีผ่าน Sanitizer (DOMPurify) และมีเหตุผลจำเป็นอย่างยิ่ง
6. 🚫 **ห้ามข้ามการตรวจสอบ Webhook Signature:** ทุก Endpoint ที่รับ Webhook จาก Upstash QStash ต้องมีโค้ดตรวจสอบ Signature เสมอ
7. 🚫 **ห้ามบันทึกข้อมูลละเอียดอ่อนลง Log:** ห้าม `console.log(password)`, `console.log(token)`, หรือ `console.log(creditCard)` เด็ดขาด

---

## 2. 💉 การป้องกัน SQL Injection บน Cloudflare D1

Cloudflare D1 ทำงานบนเอนจิน SQLite ดังนั้นการโจมตีแบบ SQL Injection สามารถทำลายหรือขโมยฐานข้อมูลได้หากไม่ระวัง

### ❌ ตัวอย่างที่อันตรายและห้ามทำเด็ดขาด:
```typescript
// ❌ ผิดมหันต์: การต่อสตริงเปิดช่องโหว่ SQL Injection ทันที
const email = req.query('email');
const query = `SELECT * FROM users WHERE email = '${email}'`;
const result = await db.prepare(query).all();
```

### ✅ ตัวอย่างที่ถูกต้องและปลอดภัย:
```typescript
// ✅ ถูกต้อง: ใช้ Parameterized Prepared Statements ด้วย .bind()
const email = req.query('email');
const result = await db
  .prepare('SELECT id, email, first_name, role, is_active FROM users WHERE email = ?')
  .bind(email)
  .first();
```

### 📌 กฎการจัดการ Transaction ป้องกัน Race Condition:
สำหรับการทำรายการทางการเงินหรือการเปลี่ยนสถานะห้องพัก ให้ใช้ `db.batch([...])` เพื่อให้คำสั่งทำงานเป็น Atomic Transaction:
```typescript
await db.batch([
  db.prepare('UPDATE rooms SET status = ? WHERE id = ?').bind('occupied', roomId),
  db.prepare('INSERT INTO room_status_history (id, room_id, previous_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?)').bind(uuid(), roomId, 'reserved', 'occupied', userId),
  db.prepare('INSERT INTO outbox_events (id, event_type, aggregate_id, payload) VALUES (?, ?, ?, ?)').bind(uuid(), 'RoomStatusChanged', roomId, payloadJson)
]);
```

---

## 3. 🌐 นโยบาย CORS (Cross-Origin Resource Sharing)

API Gateway ทำหน้าที่เป็นด่านหน้าจุดเดียว (Single Entry Point) ในการจัดการ CORS:

### มาตรฐานที่กำหนด:
```typescript
import { cors } from 'hono/cors';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',                         // Vite Local Development
  'http://localhost:3000',                         // Alternate Local Dev
  'https://keystay-web.khetsophon-ain.workers.dev', // Production Cloudflare Web SPA
  'https://keystay.hotel'                          // Custom Production Domain
];

app.use('*', cors({
  origin: (origin) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return origin || '*';
    }
    return null; // ปฏิเสธ Origin ที่ไม่ได้รับอนุญาต
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key'],
  exposeHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 ชั่วโมงสำหรับ Preflight Cache
  credentials: true,
}));
```

---

## 4. 🛡️ การป้องกัน XSS (Cross-Site Scripting)

1. **Context Encoding:** React ทำการ Escape ข้อมูลที่เป็นข้อความให้อัตโนมัติใน JSX
2. **ห้ามใช้ `dangerouslySetInnerHTML`:** ห้ามแปลงข้อความจากผู้ใช้หรือแขกมาแสดงเป็น HTML ดิบ
3. **Security Headers:** API Gateway และ Frontend Web ต้องส่ง HTTP Response Headers ต่อไปนี้:
   - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.r2.cloudflarestorage.com; connect-src 'self' https://keystay-api-gateway.*.workers.dev;`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY` (ป้องกัน Clickjacking)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 5. 🔑 การป้องกัน CSRF และการรักษาความปลอดภัยของ Token

1. **Token-Based Architecture:** สถาปัตยกรรมใช้ `Authorization: Bearer <token>` เป็นหลัก ซึ่งปลอดภัยจากการโจมตีแบบ Cross-Site Request Forgery (CSRF) โดยธรรมชาติ เพราะเบราว์เซอร์จะไม่ส่ง Header นี้ไปกับ Cross-Origin Request โดยอัตโนมัติ
2. **Refresh Token Rotation:** เมื่อใช้ Refresh Token เพื่อขอ Access Token ใหม่ ให้สร้าง Refresh Token คู่ใหม่และยกเลิกคู่เดิมทันที เพื่อตรวจจับกรณี Token ถูกขโมย (Token Reuse Detection)
3. **Session Revocation ผ่าน KV:** เมื่อผู้ใช้กด Logout ให้บันทึก `jti` (JWT ID) หรือ Session ID ลงใน Cloudflare KV พร้อมกำหนด TTL ตามอายุของ Token เพื่อบล็อกการนำ Token เก่ามาใช้ซ้ำทันที

---

## 6. 🔒 การแยกเครือข่ายและ Private Network

### 1. Cloudflare Service Bindings (Zero Public Exposure)
- Microservices ทั้ง 6 ตัว (`auth-user`, `room-inventory`, `reservation`, `housekeeping`, `billing`, `report-analytics`) ถูกเรียกผ่าน **Service Bindings** จาก `api-gateway`
- Service Bindings เป็นการสื่อสารระหว่าง Worker บน Memory Bus ภายในเครือข่ายของ Cloudflare เอง โดย **ไม่วิ่งออก Public Internet**
- ไม่ต้องเปิด Public Route ให้ Microservices หลังบ้าน ลดพื้นที่การโจมตี (Attack Surface) ได้ 100%

### 2. Tailnet / Tailscale VPN & Cloudflare Zero Trust (สำหรับงาน Admin & Hotel Intranet)
- สำหรับระบบหลังบ้านของโรงแรม (เช่น เครื่องแคชเชียร์หน้าฟรอนต์, เทอร์มินัลแม่บ้าน, จอห้องเซิร์ฟเวอร์):
  - แนะนำให้เชื่อมต่อผ่าน **Tailscale Tailnet** เพื่อสร้าง Mesh VPN เข้ารหัสแบบ WireGuard จุดต่อจุด
  - ป้องกันไม่ให้แฮกเกอร์ในเครือข่าย WiFi สาธารณะของโรงแรมสามารถ Scan หาเครื่องพนักงานหรือเข้าถึงระบบได้
  - หากต้องการเชื่อมต่อ Cloudflare เข้ากับเครือข่ายโรงแรม สามารถใช้ **Cloudflare Tunnel (cloudflared)** ผ่าน Zero Trust Access ได้โดยไม่ต้องเปิดพอร์ต Forwarding บน Router ของโรงแรม

---

## 7. 🔐 การยืนยันตัวตนและรหัสผ่าน (Authentication & Password Security)

1. **Password Hashing:**
   - ใช้ PBKDF2 (SHA-256, 100,000 Iterations, Salt 16 bytes) หรือ bcrypt (Salt rounds 10+)
   - ห้ามใช้ MD5, SHA-1 หรือ Plain SHA-256 เด็ดขาด
2. **Password Policy:**
   - รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร
   - ต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษอย่างน้อย 1 ตัว
3. **Timing-Attack Resistance:**
   - การเปรียบเทียบ Signature ของ JWT หรือ Hash ต้องใช้ฟังก์ชัน `crypto.subtle.timingSafeEqual()` เสมอ

---

## 8. ⏱️ การป้องกัน DoS และ Rate Limiting บน Cloudflare KV

ระบบควบคุมความถี่ในการยิง Request ผ่าน Cloudflare KV ที่ API Gateway:
- **Global Rate Limit:** จำกัด 100 requests ต่อนาที ต่อ 1 IP Address
- **Auth Rate Limit (Login & Forgot Password):** จำกัด 5 ครั้งต่อ 15 นาที ต่อ 1 บัญชีผู้ใช้ หากเกินโควตาจะล็อกชั่วคราวและคืนสถานะ `429 Too Many Requests`
- สคริปต์ตรวจจับจะบันทึก Counter ลงใน KV ด้วย Key `ratelimit:<ip>:<timestamp_minute>` พร้อม `expirationTtl: 120`

---

## 9. 🪝 การยืนยัน Signature ของ Upstash QStash Webhooks

Upstash QStash ส่ง Webhook ข้าม Service มาทาง HTTP POST เพื่อป้องกันไม่ให้ผู้ไม่ประสงค์ดีส่ง Request ปลอมตัวเป็น Event Bus ระบบจึงบังคับตรวจ Signature:

```typescript
import { Receiver } from '@upstash/qstash';

export async function verifyQStashSignature(c: Context, next: Next) {
  const signature = c.req.header('upstash-signature');
  if (!signature) {
    return c.json({ error: 'Missing Upstash signature' }, 401);
  }

  const receiver = new Receiver({
    currentSigningKey: c.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: c.env.QSTASH_NEXT_SIGNING_KEY,
  });

  const body = await c.req.text();
  const isValid = await receiver.verify({
    signature,
    body,
    url: c.req.url,
  });

  if (!isValid) {
    return c.json({ error: 'Invalid Upstash signature' }, 401);
  }

  // ส่งต่อหลังจากตรวจสอบสำเร็จ
  c.set('rawBody', body);
  await next();
}
```

---

## 10. 👤 การคุ้มครองข้อมูลส่วนบุคคล (PII) และ Audit Logging

1. **ข้อมูลระบุตัวตนแขก (PII):**
   - เลขบัตรประชาชน (`id_card_number`) และพาสปอร์ต ถือเป็นข้อมูลละเอียดอ่อน (Sensitive PII)
   - หน้าจอ UI ทั่วไปต้อง Mask แสดงเฉพาะ 4 หลักสุดท้าย เช่น `XXXXXXXXX1234`
   - มีเพียงผู้ที่มี Role `admin` หรือ `manager` เท่านั้นที่สามารถกดดูฉบับเต็มได้
2. **Audit Logging:**
   - การกระทำสำคัญ (เช่น การคืนเงิน `refund`, การเปลี่ยน Role ผู้ใช้, การยกเลิกบิล, การลดราคา) ต้องถูกบันทึกเข้าตาราง `audit_events` ใน `db_report` พร้อมระบุ `performed_by`, `ip_address`, `timestamp` และ `snapshot` ของข้อมูลเสมอ

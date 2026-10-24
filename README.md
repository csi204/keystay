# 🏨 Hotel Management System — Project Design Document & Specification

> ## โครงงานระบบบริหารจัดการโรงแรมหลังบ้าน (Internal Hotel Operations & Back-Office)
> สถาปัตยกรรม Microservices บน Serverless Stack (Cloudflare Workers, D1, Queues/QStash) รวม 105 APIs  
> ออกแบบเฉพาะสำหรับ**ระบบบริหารจัดการภายในโรงแรมขนาดเล็ก 5–10 ห้อง (Boutique Hotel / Poshtel)**  
> รองรับ 3 บทบาทหลักของทีมปฏิบัติการ: **Front Desk Staff & Cashier, Housekeeping Staff, Manager / Admin**

---

## 🤖 สำหรับ AI Assistant — อ่านก่อนเริ่มงานทุกครั้ง

> ไฟล์นี้ (`README.md`) คือเอกสาร Spec ภาพรวมของโปรเจกต์ **อย่าเริ่มเขียนโค้ดหรือแก้ไขอะไรจากไฟล์นี้โดยตรง** ให้ไปอ่านไฟล์ใน `docs/` ก่อนเสมอ

| กำลังจะทำอะไร | ไปอ่านไฟล์นี้ก่อน |
|---|---|
| เริ่มงานครั้งแรก / ไม่รู้จะทำอะไร | `docs/skill.md` ← **เริ่มที่นี่เสมอ** |
| ทำไมถึงออกแบบแบบนี้ / เหตุผล Architecture | `docs/design.md` |
| ทำ UI, สี, component, Status Badge | `docs/designsystem.md` |
| หาว่าไฟล์วางอยู่ที่ไหนใน repo | `docs/structure.md` |
| ดู Service Architecture, Sequence Diagram, 105 APIs | `docs/systemdesign.md` |
| ดูแผนแบ่งงาน, ใครรับผิดชอบ service ไหน, Phase | `docs/อ่านก่อนทำงาน.md` |
| Setup เครื่อง, คำสั่ง dev/migrate/deploy | `docs/How to Install and Command.md` |

**กฎเหล็กสำหรับ AI:**
- อ่าน `docs/skill.md` ก่อนทำงานทุกครั้ง — มีกฎเหล็ก 5 ข้อที่ห้ามฝ่าฝืน
- ห้าม query ข้าม D1 database ของ service อื่น
- ทุกการเปลี่ยนสถานะสำคัญต้องใช้ Outbox Pattern เสมอ
- TypeScript ใช้ `camelCase`, SQL/D1 ใช้ `snake_case`, Drizzle map ให้อัตโนมัติ
- Frontend ใช้ **React + Vite** (ไม่ใช่ Next.js)

---

## 📚 สารบัญ (Table of Contents)

1. [🤼 ผู้จัดทำ (Contributors)](#1-ผู้จัดทำ-contributors)
2. [💭 หลักการและเหตุผล (Rationale & Problem Statement)](#2-หลักการและเหตุผล-rationale--problem-statement)
3. [🗃️ วัตถุประสงค์ของโครงงาน (Objectives)](#3-วัตถุประสงค์ของโครงงาน-objectives)
4. [📑 ขอบเขตของระบบและความต้องการ (System Scope & Requirements)](#4-ขอบเขตของระบบและความต้องการ-system-scope--requirements)
5. [🧑‍💻 แนวทางของการพัฒนาตาม SDLC (System Development Life Cycle)](#5-แนวทางของการพัฒนาตาม-sdlc-system-development-life-cycle)
6. [🧰 สแตกเทคโนโลยี (Tech Stack)](#6-สแตกเทคโนโลยี-tech-stack)
7. [👥 การแบ่งหน้าที่และความรับผิดชอบ (Team Roles & Responsibilities)](#7-การแบ่งหน้าที่และความรับผิดชอบ-team-roles--responsibilities)
8. [🗺️ แผนการดำเนินงาน 12 สัปดาห์ (Project Timeline)](#8-แผนการดำเนินงาน-12-สัปดาห์-project-timeline)
9. [🎨 Brand Identity & Design System (Color Palette & Status-Color)](#9-brand-identity--design-system)
10. [👥 ข้อมูลกลุ่มผู้ใช้งานจำลอง (User Personas)](#10-ข้อมูลกลุ่มผู้ใช้งานจำลอง-user-personas)
11. [🧩 ผังการใช้งานระบบ (Use Case Diagram)](#11-ผังการใช้งานระบบ-use-case-diagram)
    *   [🏃 แผนภาพกิจกรรมการทำงานหลัก (Activity Diagrams - 4 Flows พร้อม Swimlane)](#111-แผนภาพกิจกรรมการทำงานหลัก-activity-diagrams)
12. [🏗️ แผนภาพคลาส (Class Diagram)](#12-แผนภาพคลาส-class-diagram)
13. [🖥️ สถาปัตยกรรมระบบ (System Architecture & Event-Driven Patterns)](#13-สถาปัตยกรรมระบบ-system-architecture--event-driven-patterns)
14. [🔄 วงจรชีวิตสถานะห้องพัก (Room Lifecycle State Machine)](#14-วงจรชีวิตสถานะห้องพัก-room-lifecycle-state-machine)
15. [🔁 แผนผังลำดับการทำงานหลัก (Sequence Diagrams - 6 Flows)](#15-แผนผังลำดับการทำงานหลัก-sequence-diagrams)
16. [📋 รายการ API ทั้งหมด (105 Microservice Endpoints)](#16-รายการ-api-ทั้งหมด-105-microservice-endpoints)
17. [🗄️ โครงสร้างฐานข้อมูลและผังความสัมพันธ์ (Database Schema & ER Diagrams)](#17-โครงสร้างฐานข้อมูลและผังความสัมพันธ์-database-schema--er-diagrams)
18. [🎯 การออกแบบหน้าจอ (UI Prototype & Wireframe)](#18-การออกแบบหน้าจอ-ui-prototype--wireframe)
19. [⚙️ การทดสอบการยอมรับของผู้ใช้ (User Acceptance Testing: UAT)](#19-การทดสอบการยอมรับของผู้ใช้-user-acceptance-testing-uat)
20. [🖼️ ผลลัพธ์ที่คาดว่าจะได้รับ (Expected Outcomes)](#20-ผลลัพธ์ที่คาดว่าจะได้รับ-expected-outcomes)

---

## 1. 🤼 ผู้จัดทำ (Contributors)

*   **67118456 นายเขตโสภณ อินอุตออน** — PM + Infra/DevOps Lead
*   **67095474 นายธีรภัทร เนียมสุวรรณ** — System Analyst (SA) + Backend Developer
*   **67096366 นายปวริศ ธรรมวงษ์** — Tester/QA Lead + Backend Developer

---

## 2. 💭 หลักการและเหตุผล (Rationale & Problem Statement)

ระบบจองโรงแรมทั่วไปที่พบเห็นได้บ่อยในตลาด (เช่น Booking.com, Agoda) มักเน้นมุมมอง **"ฝั่งลูกค้า" (B2C)** เช่น การค้นหาห้องพัก เปรียบเทียบราคา ชำระเงิน และรอรับการยืนยัน ซึ่งฟังก์ชันหลังบ้านส่วนใหญ่เป็นเพียง CRUD พื้นฐาน

โครงงานนี้จึงเลือกมุมมองที่ตอบโจทย์เฉพาะเจาะจง คือมุมมอง **"ฝั่งเจ้าของและพนักงานปฏิบัติการโรงแรมขนาดเล็ก 5–10 ห้อง" (B2B / Small-Scale Hotel Operations)** ซึ่งเป็นระบบแกนหลักหลังบ้าน (Back-Office Operating System):
ในโรงแรมขนาดเล็ก 5–10 ห้อง (Boutique Hotel / Poshtel / เกสต์เฮาส์) จะไม่มีเคาน์เตอร์การเงินหรือพนักงานบัญชีแยกต่างหาก แต่พนักงานต้อนรับเพียงคนเดียวจะทำหน้าที่ควบทั้งการต้อนรับและงานแคชเชียร์แบบครบวงจร (Front Desk Staff & Cashier) ประสานงานร่วมกับแม่บ้าน (Housekeeping) และผู้บริหาร (Manager / Admin) แบบ Real-time ตลอด 24 ชั่วโมง:

1.  **State Machine ของห้องพักมีความซับซ้อนและหมุนเวียนต่อเนื่อง:** สถานะห้องพักในโรงแรมมีวงจรชีวิตที่ชัดเจน (`ว่าง` → `จองแล้ว` → `เข้าพัก` → `เช็คเอาท์` → `รอทำความสะอาด` → `พร้อมใช้` หรือ `ส่งซ่อมบำรุง`) การเปลี่ยนสถานะในแต่ละจังหวะต้องควบคุมด้วย Business Logic ที่รัดกุมเพื่อป้องกันการจองซ้อน (Double Booking)
2.  **ตอบโจทย์ Use Case จริงในธุรกิจที่มีการส่งต่องานข้ามแผนก:** เมื่อลูกค้าเช็คเอาท์ แผนกต้อนรับ/แคชเชียร์จะดำเนินการหักลบเงินมัดจำ คิดค่ามินิบาร์ และออกใบเสร็จ ระบบจะแจ้งแผนกแม่บ้านเข้าทำความสะอาดทันที และส่งข้อมูลสถิติไปยังผู้บริหารเพื่อนำไปวิเคราะห์ Occupancy Rate โดยกระบวนการเหล่านี้ไม่ควรหยุดชะงักหากระบบใดระบบหนึ่งทำงานช้า
3.  **เป็นกรณีศึกษาที่สะท้อนศักยภาพของ Microservices Architecture อย่างแท้จริง:** ความเชื่อมโยงข้ามแผนกนี้เปิดโอกาสให้ประยุกต์ใช้แนวคิดระดับสูง เช่น **Database-per-Service** (แยกฐานข้อมูลอิสระ 6 ก้อน), **Outbox Pattern** (ป้องกันข้อมูลสูญหายขณะส่งข้อความข้าม Service) และ **Asynchronous Event Bus** ผ่าน Cloudflare Queues / Upstash QStash ที่ทำงานแบบ Decoupled ไร้การพึ่งพากันโดยตรง

---

## 3. 🗃️ วัตถุประสงค์ของโครงงาน (Objectives)

1.  เพื่อออกแบบและพัฒนาระบบบริหารจัดการโรงแรมหลังบ้านด้วยสถาปัตยกรรม **Microservices Architecture** ครอบคลุม 6 เซอร์วิสหลัก และมีจำนวน API รวม 105 Endpoints
2.  เพื่อพัฒนาระบบจัดการวงจรชีวิตห้องพัก (Room Lifecycle & State Machine) งานจอง งานเช็คอิน/เช็คเอาท์ งานทำความสะอาด ระบบบิล และระบบรายงานสถิติแบบ Real-time
3.  เพื่อประยุกต์ใช้แพตเทิร์นสถาปัตยกรรมระดับสูง ได้แก่ **Database-per-Service**, **Outbox Pattern**, และ **Asynchronous Event-Driven Messaging (Pub/Sub & Fan-out)** บน Serverless Infrastructure
4.  เพื่อศึกษาการทำงานของ Cloudflare Workers, D1 (Serverless SQLite), และ Queues ในการพัฒนาระบบที่รองรับการ Deploy แยกกันได้อย่างอิสระ (Independent Deployability) และมีความทนทานสูง (Resilience)

---

## 4. 📑 ขอบเขตของระบบและความต้องการ (System Scope & Requirements)

*(หมายเหตุ: รวบรวมขอบเขตของระบบและรายการความต้องการใช้งานเข้าด้วยกัน เพื่อความกระชับและขจัดความซ้ำซ้อนตามหลัก Clean Documentation)*

### ผู้ใช้งานระบบ (Actors)
*   **พนักงานต้อนรับและแคชเชียร์ (Front Desk Staff & Cashier):** รวมหน้าที่ต้อนรับและการเงินเข้าด้วยกันสำหรับโรงแรมขนาดเล็ก (5–10 ห้อง) — เช็คห้องว่าง, จัดการการจองล่วงหน้า, เช็คอิน, เช็คเอาท์, รับ Walk-in, ขยายเวลาพัก, อัปเกรดห้อง, จัดการบิลค่าห้องและมินิบาร์, บันทึกการชำระเงิน, หักเงินมัดจำ, ออกใบเสร็จ/ใบกำกับภาษี, คืนเงิน (ไม่มี Role พนักงานบัญชีแยกต่างหาก) พร้อมสิทธิ์ **Read-Only สำหรับสมุดเบอร์ติดต่อ Outsource ฉุกเฉิน** เพื่อโทรเรียกช่างซ่อมบำรุงด่วน (แอร์เสีย, ส้วมตัน, ท่อแตก) ได้ทันทีเมื่อแขกร้องเรียน
*   **พนักงานแม่บ้าน (Housekeeping Staff):** รับมอบหมายงานทำความสะอาด, เปลี่ยนสถานะงาน, ตรวจสอบสภาพห้อง, รายงานสิ่งของชำรุด พร้อมสิทธิ์ **Read-Only สำหรับสมุดเบอร์ช่าง Outsource เฉพาะทาง** เพื่อประสานงานซ่อมหน้างานควบคู่กับการเปิดใบงาน Issue
*   **ผู้จัดการ / ผู้ดูแลระบบ (Manager / Admin):** กำหนดสิทธิ์และบัญชีผู้ใช้, จัดการข้อมูลประเภทห้องและราคา, ดูรายงานสถิติ Occupancy Rate และสรุปรายได้ โดย **Admin เป็นผู้มีสิทธิ์ Full CRUD จัดการ Master Data ข้อมูลคู่ค้าและช่าง Outsource ภายนอก** (เพิ่ม, แก้ไข, ระงับการใช้งาน `is_active = 0`) เพื่อป้องกันข้อมูลเบอร์โทรศัพท์สูญหายหรือถูกแก้ไขโดยไม่ได้รับอนุญาต

### ความสามารถหลักของระบบ (Core System Requirements)
1.  **ระบบสิทธิ์ และการยืนยันตัวตน (Auth & User Management):** สมัครสมาชิก, ล็อกอินด้วย JWT, รีเฟรชโทเค็น, รีเซ็ตรหัสผ่าน, กำหนดสิทธิ์แบบ Role-Based Access Control (RBAC 4 Roles)
2.  **ระบบห้องพักและสิ่งอำนวยความสะดวก (Room Inventory Management):** จัดการห้องพัก, ประเภทห้อง (Standard, Deluxe, Suite, Presidential), ชั้น, สิ่งอำนวยความสะดวก และประวัติการเปลี่ยนแปลง
3.  **ระบบวงจรชีวิตสถานะห้องพัก (Room Lifecycle State Machine):** จัดการและควบคุมการเปลี่ยนสถานะของห้องพักทั้ง 7 สถานะอย่างเป็นระบบตามเงื่อนไขทางธุรกิจ
4.  **ระบบการจองห้องพัก (Reservation Management):** สร้างการจองล่วงหน้า, ปรับเปลี่ยนวันเข้าพัก, ยกเลิกการจอง, บันทึกประวัติแขก (Guest Profiles) และรองรับการ Walk-in
5.  **ระบบเช็คอินและเช็คเอาท์ (Check-in & Check-out Operations):** ตรวจสอบสิทธิ์การเข้าพัก, บันทึกเวลาเช็คอินจริง, กระจายคำสั่งเช็คเอาท์ (Fan-out) ไปยังฝ่ายแม่บ้านและการเงิน
6.  **ระบบขยายเวลาพักและอัปเกรดห้อง (Extend Stay & Room Upgrade):** ปรับปรุงรายละเอียดการจองขณะเข้าพัก พร้อมคำนวณส่วนต่างค่าห้องพักอัตโนมัติ
7.  **ระบบงานแม่บ้าน งานทำความสะอาด และจัดการคู่ค้า Outsource (Housekeeping, Maintenance & Outsource Management):** ระบบสร้างงานทำความสะอาดอัตโนมัติหลังเช็คเอาท์, มอบหมายงานตามกะ/โซน, บันทึกเวลาเริ่มและเสร็จสิ้น, รายงานปัญหาห้องชำรุดส่งซ่อมบำรุง, และบริหารสมุดรายชื่อเบอร์ติดต่อช่าง/คนสวน/คู่ค้าภายนอก (Outsource Contacts) จำแนกตามหมวดหมู่งานและระดับความฉุกเฉิน
8.  **ระบบรายงานปัญหาห้องพัก (Room Issue & Maintenance Reporting):** แจ้งปัญหาห้องชำรุด สิ่งของสูญหาย หรือปัญหาความสะอาด พร้อมส่งต่อสถานะไปยังฝ่ายซ่อมบำรุง
9.  **ระบบบิลและค่าบริการเสริม (Billing & Folio Management):** บันทึกค่าห้อง, บริการเสริม (มินิบาร์, ซักรีด, รูมเซอร์วิส), ค่าปรับ และส่วนลดพิเศษ
10. **ระบบชำระเงินและเอกสารทางการเงิน (Payment & Invoicing):** บันทึกการชำระเงินหลายช่องทาง (เงินสด, โอน, บัตร, QR), ออกใบเสร็จ, ออกใบแจ้งหนี้ และส่งอีเมล
11. **ระบบรายงานและวิเคราะห์ข้อมูลเชิงลึก (Analytics & Reporting):** อัตราการเข้าพัก (Occupancy Rate), สถิติรายได้รายวัน/รายเดือน, ประสิทธิภาพแม่บ้าน, ส่งออกข้อมูล PDF/CSV
12. **ระบบ Event Bus และความสอดคล้องของข้อมูล (Event-Driven Consistency):** รับ-ส่ง Event ข้าม Service ผ่าน Cloudflare Queues โดยใช้ Outbox Pattern

### ฟังก์ชันที่อยู่นอกเหนือขอบเขต (Out-of-Scope)
*   ระบบจองห้องพักสาธารณะสำหรับลูกค้าทั่วไปผ่านเว็บไซต์ (Customer-Facing Public Booking)
*   การเชื่อมต่อ Payment Gateway ตัดบัตรเครดิตจริง (ใช้ระบบจำลอง Mock Sandbox)
*   ระบบงานบุคคล (HR) เต็มรูปแบบ เช่น การคิดเงินเดือน (Payroll) หรือการลางานของพนักงาน
*   การรองรับหลายสาขาพร้อมกัน (Multi-Property / Multi-Branch) มุ่งเน้นการจัดการสำหรับ 1 โรงแรม

---

## 5. 🧑‍💻 แนวทางของการพัฒนาตาม SDLC (System Development Life Cycle)

| ขั้นตอน (Phase) | รายละเอียดโดยย่อ (Brief Description) |
|---|---|
| **1. Planning** | ร่วมกันระบุปัญหาการดำเนินงานหลังบ้านของโรงแรม กำหนดขอบเขตโครงการ สถาปัตยกรรม Microservices และประเมินความเป็นไปได้ในการใช้ Cloudflare Serverless Stack |
| **2. Analysis** | วิเคราะห์กระบวนการทางธุรกิจ (Business Process) วงจรชีวิตห้องพัก ออกแบบ Use Case Diagram และจัดทำข้อกำหนดความต้องการระบบ (SRS) เชิงฟังก์ชัน 105 APIs |
| **3. Design** | ออกแบบ System Architecture, State Machine, Class Diagram, Sequence Diagram (5 Flows), โครงสร้างฐานข้อมูล D1 6 ก้อน (ER Diagram) และ Design System |
| **4. Development** | พัฒนา Backend Microservices บน Cloudflare Workers ด้วย TypeScript และ Drizzle ORM พัฒนา API Gateway เชื่อมต่อ Queues และพัฒนาหน้าจอ React + Tailwind CSS |
| **5. Testing** | ดำเนินการทดสอบระบบด้วย Postman (Functional Test), ทดสอบ Event-Driven ข้ามเซอร์วิส และทำการทดสอบการยอมรับของผู้ใช้งาน (Manual UAT) ตามบทบาท |
| **6. Deployment** | นำระบบขึ้นสู่สภาพแวดล้อม Cloudflare Edge จริง ผ่าน Wrangler CLI และ GitHub Actions CI/CD Pipeline |
| **7. Maintenance** | ติดตามการทำงาน (Monitoring) ผ่าน Cloudflare Dashboard จัดการ Dead-Letter Queue (DLQ) เมื่อมี Event ล้มเหลว และแก้ไขจุดบกพร่องตามผล UAT |

---

## 6. 🧰 สแตกเทคโนโลยี (Tech Stack)

| หมวดหมู่ | เทคโนโลยี | รายละเอียดและเหตุผลการเลือกใช้ |
|---|---|---|
| **Programming Language** | TypeScript | ใช้ทั้งฝั่ง Backend และ Frontend เพื่อความปลอดภัยของข้อมูล (Type Safety), ลดข้อผิดพลาดขณะรันไทม์ และสื่อสาร Data Model ได้แม่นยำ |
| **Serverless Compute** | Cloudflare Workers | รันไทม์ประสิทธิภาพสูงที่ Edge ทั่วโลก ทำงานแบบ V8 Isolates บูตเร็วในระดับมิลลิวินาที ประหยัดค่าใช้จ่ายและรองรับโหลดได้ทันที |
| **API Gateway** | Cloudflare Workers | จุดรับคำขอหลัก ทำหน้าที่เป็น Reverse Proxy, ถอดรหัส/ตรวจสอบ JWT, Rate Limiting, CORS Handling และ Route ไปยัง Microservices |
| **Database** | Cloudflare D1 (SQLite-based) | Serverless Relational Database แยก 1 ก้อนต่อ 1 เซอร์วิส (รวม 6 DBs) ตอบสนองเร็วผ่าน Edge และเป็นไปตามหลัก Database-per-Service |
| **ORM / Query Builder** | Drizzle ORM | Type-safe ORM น้ำหนักเบา ไม่มี Native Bindings จึงทำงานร่วมกับ Workers Runtime ได้อย่างสมบูรณ์แบบ แตกต่างจาก Prisma ที่มีปัญหากับ Edge |
| **Caching & Fast KV** | Cloudflare KV | แคชความเร็วสูงสำหรับเก็บสถานะ Session, สิทธิ์การใช้งานของ Role และ System Configurations |
| **Message Queue** | Cloudflare Queues | ระบบคิวข้อความแบบ Asynchronous Pub/Sub รับประกันการส่งข้อมูลอย่างน้อยหนึ่งครั้ง (At-Least-Once Delivery), มี Auto-Retry และ Dead-Letter Queue (DLQ) |
| **Frontend Framework** | React + Vite + TypeScript | พัฒนาในรูปแบบ Single Page Application (SPA) เพื่อความลื่นไหลในการใช้งานหลังบ้านของพนักงาน |
| **Styling & UI Components** | Tailwind CSS | Utility-First CSS สำหรับตกแต่งหน้าจออย่างรวดเร็วและเป็นระเบียบ พร้อมสร้าง Status-Color Design System |
| **Frontend Hosting** | Cloudflare Workers (Static Assets) | โฮสต์ไฟล์ Static ของ Frontend บน Workers Stack เดียวกัน ทำให้จัดการ Deploy ง่ายผ่าน `wrangler deploy` |
| **API Documentation** | OpenAPI / Swagger | บันทึกข้อกำหนดและเอกสารสเปกของทั้ง 105 APIs สำหรับใช้อ้างอิงและทดสอบระบบ |
| **Testing Tools** | Postman | ใช้ทดสอบ Functional API ราย Endpoint และทดสอบกระบวนการ Integration ข้ามเซอร์วิส |
| **DevOps & CI/CD** | GitHub Actions + Wrangler CLI | ระบบตรวจทานโค้ดอัตโนมัติและสั่ง Deploy ระบบขึ้น Cloudflare โดยอัตโนมัติเมื่อ Merge โค้ด |

---

## 7. 👥 การแบ่งหน้าที่และความรับผิดชอบ (Team Roles & Responsibilities)

| สมาชิก | บทบาทเสริม (Role) | Service Backend ที่รับผิดชอบ | จำนวน API | หน้าจอ Frontend | ภาระงานหลักอื่น ๆ |
|---|---|---|:---:|---|---|
| **คน A (เขตโสภณ)** | **PM + Infra/DevOps Lead** | • API Gateway<br/>• Auth/User (12)<br/>• Report/Analytics (14) | **26** + Gateway | **Manager & Admin Portal** (`/admin`)<br/>• KPI Dashboard<br/>• User Management<br/>• Outsource Contacts Management (Admin UI)<br/>• Export Reports | วางโครงสร้าง Monorepo, ติดตั้ง Cloudflare Stack (6 D1, KV, R2), ออกแบบ API Gateway & RBAC, ติดตั้ง Upstash QStash Event Broker, ดูแล Master Data Outsource (Admin UI), CI/CD Deploy Pipeline |
| **คน B (ธีรภัทร)** | **SA Lead + Core Dev** | • Reservation (24)<br/>• Billing (16) | **40** | **Front Desk & Cashier Portal** (`/front-desk`)<br/>• Room Matrix Grid (5–10 ห้อง)<br/>• Check-in / Check-out<br/>• Cashier & Split Screen Invoices<br/>• Quick Emergency Contact Drawer | System Analyst, วิเคราะห์ State Machine, ออกแบบ D1 Schemas & Outbox Pattern, กำหนด Event Contracts (`packages/events`), ดูแล Flow เงินมัดจำ/มินิบาร์/คิดเงิน และช่องทางติดต่อช่างด่วน |
| **คน C (ปวริศ)** | **QA Lead + Core Dev** | • Room Inventory (18)<br/>• Housekeeping (21) | **39** | **Housekeeping Portal** (`/housekeeping`)<br/>• Cleaning Kanban Board<br/>• Task Execution & Inspection<br/>• Report Room Issue<br/>• Outsource Contacts CRUD & Quick Contact Dialog | ออกแบบ Test Plan / 24 UAT Test Cases, ทำ Automated Postman Collection, ดูแล D1 Schema และ APIs งานแม่บ้านและ Outsource Contacts, ควบคุม State เปลี่ยนผ่านงานแม่บ้านและผังห้อง |

---

## 8. 🗺️ แผนการดำเนินงาน 12 สัปดาห์ (Project Timeline)

| สัปดาห์ (Week) | ระยะงาน (Phase) | รายละเอียดกิจกรรม |
|:---:|---|---|
| **1** | **System & Infra Setup** | วางโครงสร้าง Repo กลาง, ออกแบบ DB Schema เบื้องต้น, ตั้งค่า Cloudflare Workers / D1 / Queues, วาง Auth Pattern และตกลง API Contract |
| **2 – 5** | **Backend Development** | พัฒนา Microservices ทั้ง 6 ตัวแยกกันตามที่ได้รับมอบหมาย สื่อสาร Contract ข้าม Service เป็นประจำทุกสัปดาห์ |
| **6** | **Backend Integration & Queue Testing** | รวม Service เข้าผ่าน API Gateway, ทดสอบ Event-Driven ผ่าน Cloudflare Queues ตาม Flow จริง (จอง → เช็คอิน → แม่บ้าน → เช็คเอาท์ → บิล → รายงาน) |
| **7 – 9** | **Frontend Development** | พัฒนาหน้าจอตามส่วนงานของตนเอง โดยใช้ Design System และ Layout กลางร่วมกัน |
| **10** | **End-to-End Integration** | เชื่อมต่อส่วนหน้าบ้านเข้ากับ API จริงทั้งหมด และทดสอบ User Flow จากต้นจนจบ |
| **11** | **Bug Fixing & Documentation** | แก้ไขข้อผิดพลาดของระบบ, ปรับแต่งหน้าจอ UI, จัดทำเอกสารฉบับสมบูรณ์ (OpenAPI, README, System Diagram) |
| **12** | **Buffer & Presentation** | ซ้อมการสาธิตระบบ (Demo Flow), จัดเตรียมสไลด์ และเตรียมพร้อมการนำเสนอโครงงาน |

---

## 9. 🎨 Brand Identity & Design System

แนวคิดการออกแบบ: **"Operational Clarity & Status-First"**  
อ้างอิงแนวคิดจากระบบปฏิบัติการชั้นนำระดับโลก โดยให้ความสำคัญกับ **ความรวดเร็วในการรับรู้สถานะ (Cognitive Load Reduction)** พนักงานหน้างานต้องมองเห็นและเข้าใจสถานะของห้องพัก งานแม่บ้าน หรือยอดเงินได้ทันทีโดยไม่ต้องเสียเวลาอ่านตัวหนังสือละเอียด

| บทบาทสี | ชื่อสี | Hex Code | บริบทการใช้งาน |
|---|---|---|---|
| **Base Background** | Warm Off-White | `#FAFAF9` | พื้นหลังหลักของทุกหน้าจอ ให้ความสบายตาตลอดกะการทำงาน |
| **Surface / Card** | Pure White | `#FFFFFF` | การ์ดข้อมูล, ตาราง, โมดอล และแผงควบคุม |
| **Text Primary** | Slate Ink | `#1E293B` | ตัวหนังสือหลัก, หัวข้อ, รหัสห้องพัก, ยอดเงิน |
| **Text Muted** | Slate Grey | `#64748B` | ป้ายกำกับรอง, คำอธิบายย่อย, วันที่และเวลา |
| **Border / Divider** | Light Grey | `#E2E8F0` | เส้นแบ่งตาราง, กรอบ Input, เส้นคั่นส่วนเนื้อหา |
| **Primary Accent** | Vibrant Orange | `#F97316` | ปุ่ม Action หลัก (CTA), แถบเมนูที่เลือก, การไฮไลต์สำคัญ (ใช้โทนเดียวทั้งระบบ) |
| **Status: รอดำเนินการ** | Neutral Slate | `#94A3B8` | งานแม่บ้านรอ Assign, บิลแบบร่าง (Draft) |
| **Status: ยืนยันแล้ว** | Sky Blue | `#3B82F6` | ห้องพักสถานะ `reserved`, การจองที่รอเข้าพัก |
| **Status: สำเร็จ / พร้อม** | Emerald Green | `#22C55E` | ห้อง `available` หรือ `occupied`, งานเสร็จสิ้น, บิลชำระแล้ว (`paid`) |
| **Status: กำลังดำเนินการ**| Amber Gold | `#F59E0B` | ห้อง `cleaning`, งานทำความสะอาดกำลังดำเนินการ (`in_progress`) |
| **Status: ปัญหา / แจ้งเตือน**| Crimson Red | `#EF4444` | ห้อง `maintenance` หรือ `out_of_order`, การจองยกเลิก, งานค้างเกินเวลา |

---

## 10. 👥 ข้อมูลกลุ่มผู้ใช้งานจำลอง (User Personas)

### 🧑‍💼 Persona 1 — Front Desk Staff & Cashier: "ฟ้า" (พนักงานต้อนรับและแคชเชียร์)
*   **อายุ:** 24 ปี | ประสบการณ์ 2 ปี | **เป้าหมาย:** ให้บริการเช็คอิน-เช็คเอาท์แขก พร้อมคิดเงิน ออกบิล และจัดการเงินมัดจำได้อย่างรวดเร็ว ถูกต้องในจุดเดียวสำหรับโรงแรมขนาดเล็ก (5–10 ห้อง)
*   **Pain Points:**
    *   ช่วงเวลาเร่งด่วน (Peak Hour 12:00 - 14:00) มักสับสนว่าห้องไหนทำความสะอาดเสร็จแล้วจริง ทำให้แขกต้องยืนรอนาน
    *   การคำนวณค่าใช้จ่ายเสริม (มินิบาร์, ค่าปรับเช็คเอาท์เลท) และการหักลบเงินมัดจำในระบบเดิมต้องคิดเลขด้วยมือ เสี่ยงต่อการคิดเงินผิดพลาด
*   **Needs & Motivations:**
    *   หน้าจอแสดงสถานะห้องพักแบบ Real-time ที่อัปเดตทันทีเมื่อแม่บ้านทำความสะอาดเสร็จโดยไม่ต้องกด Refresh
    *   ฟังก์ชันเช็คอิน/เช็คเอาท์ใน 1 คลิก พร้อมออกใบสรุปค่าใช้จ่ายล่วงหน้า (Invoice Preview) ที่รวมภาษี ส่วนลด และหักเงินมัดจำอัตโนมัติ

---

### 🧹 Persona 2 — Housekeeping Supervisor: "สมศักดิ์" (หัวหน้าแผนกแม่บ้าน)
*   **อายุ:** 38 ปี | ประสบการณ์ 8 ปี | **เป้าหมาย:** จัดสรรงานทำความสะอาดให้แม่บ้านอย่างทั่วถึง และเคลียร์ห้องพักให้พร้อมขายเร็วที่สุด
*   **Pain Points:**
    *   เมื่อแขกเช็คเอาท์ มักไม่ได้รับแจ้งเตือนทันที ต้องรอให้ฟร้อนท์โทรศัพท์มาบอก ทำให้การเข้าทำความสะอาดล่าช้า
    *   เมื่อพบสิ่งของชำรุดในห้องพัก การเขียนรายงานใส่กระดาษมักสูญหาย และฝ่ายช่างไม่ได้รับเรื่องในทันที
*   **Needs & Motivations:**
    *   ระบบที่สร้างงานทำความสะอาดอัตโนมัติเมื่อแขกเช็คเอาท์ และสามารถกดมอบหมายงานให้แม่บ้านรายคนตามชั้น/โซนได้
    *   ฟังก์ชันถ่ายรูปและกด "Report Issue" รายงานปัญหาห้องพักไปยังฝ่ายช่างได้ทันทีจากมือถือหรือแท็บเล็ต

---

### 📊 Persona 3 — Hotel General Manager: "วิชัย" (ผู้จัดการทั่วไป)
*   **อายุ:** 45 ปี | ผู้บริหารระดับสูง | **เป้าหมาย:** ติดตามผลประกอบการ ภาพรวมอัตราการเข้าพัก และควบคุมต้นทุนการดำเนินงาน
*   **Pain Points:**
    *   ในโรงแรมขนาดเล็กเดิมที่ไม่มีระบบรวมศูนย์ ผู้จัดการต้องรอรวบรวมข้อมูลสิ้นวัน ทำให้ไม่สามารถตัดสินใจปรับราคาห้องพักได้ทันต่อสถานการณ์
    *   ไม่มีข้อมูลเชิงลึกว่าห้องพักประเภทใดสร้างรายได้สูงสุด หรือแม่บ้านคนใดมีประสิทธิภาพในการทำงานดีที่สุด
*   **Needs & Motivations:**
    *   Dashboard รายงานผลประกอบการแบบ Real-time ที่แสดง Occupancy Rate, รายได้รวม และสถิติการเช็คอิน/เช็คเอาท์ประจำวัน
    *   ความสามารถในการ Export รายงานออกมาเป็นไฟล์ PDF และ CSV ได้ในคลิกเดียวเพื่อนำไปประชุมผู้บริหาร

---

## 11. 🧩 ผังการใช้งานระบบ (Use Case Diagram)

```mermaid
flowchart LR

    %% Actors
    Staff(["👤 Hotel Staff\n(abstract)"])
    FD(["👤 Front Desk Staff\n(รวม Cashier & Billing)"])
    HK(["👤 Housekeeping Staff"])
    MGR(["👤 Manager / Admin"])

    %% Actor Generalization
    FD  -.->|"<<generalize>>"| Staff
    HK  -.->|"<<generalize>>"| Staff
    MGR -.->|"<<generalize>>"| Staff

    %% Shared Use Cases
    subgraph SharedUC["Common Staff Operations"]
        direction TB
        UC_Login(("Login / Logout"))
        UC_ViewProfile(("View / Update Profile"))
        UC_ResetPwd(("Reset Password"))
    end

    Staff --- UC_Login
    Staff --- UC_ViewProfile
    Staff --- UC_ResetPwd

    %% Front Desk Use Cases
    subgraph FrontDeskUC["Front Desk Operations"]
        direction TB
        UC_ViewRooms(("Check Room Status"))
        UC_CreateRes(("Create Reservation / Walk-in"))
        UC_CheckIn(("Process Check-in"))
        UC_CheckOut(("Process Check-out"))
        UC_ExtendStay(("Extend Stay / Upgrade Room"))
        UC_CancelRes(("Cancel Reservation"))
        UC_QuickEmergency(("Quick Emergency Outsource Contact"))
    end

    FD --- UC_ViewRooms
    FD --- UC_CreateRes
    FD --- UC_CheckIn
    FD --- UC_CheckOut
    FD --- UC_ExtendStay
    FD --- UC_CancelRes
    FD --- UC_QuickEmergency

    UC_CheckIn -.->|"<<include>>"| UC_ViewRooms
    UC_ExtendStay -.->|"<<extend>>"| UC_CheckIn
    UC_CheckOut -.->|"<<include>>"| UC_ViewRooms

    %% Housekeeping Use Cases
    subgraph HousekeepingUC["Housekeeping Operations"]
        direction TB
        UC_ViewTasks(("View Cleaning Tasks"))
        UC_AssignTask(("Assign Task to Staff"))
        UC_CompleteTask(("Mark Task Complete"))
        UC_ReportIssue(("Report Room Issue"))
        UC_ManageSchedule(("Manage Staff Schedule"))
        UC_QuickTechnician(("Quick Technician Contact"))
    end

    HK --- UC_ViewTasks
    HK --- UC_AssignTask
    HK --- UC_CompleteTask
    HK --- UC_ReportIssue
    HK --- UC_ManageSchedule
    HK --- UC_QuickTechnician

    UC_CompleteTask -.->|"<<include>>"| UC_ViewTasks
    UC_ReportIssue -.->|"<<extend>>"| UC_CompleteTask

    %% Billing Use Cases
    subgraph BillingUC["Billing & Payment Operations"]
        direction TB
        UC_CreateBill(("Generate Bill / Folio"))
        UC_AddCharge(("Add Extra Service Charges"))
        UC_ProcessPayment(("Process Payment"))
        UC_IssueInvoice(("Issue Receipt / Invoice"))
        UC_ProcessRefund(("Process Refund"))
    end

    FD --- UC_CreateBill
    FD --- UC_AddCharge
    FD --- UC_ProcessPayment
    FD --- UC_IssueInvoice
    FD --- UC_ProcessRefund

    UC_ProcessPayment -.->|"<<include>>"| UC_CreateBill
    UC_IssueInvoice -.->|"<<extend>>"| UC_ProcessPayment
    UC_AddCharge -.->|"<<include>>"| UC_CreateBill

    %% Manager / Admin Use Cases
    subgraph AdminUC["Manager & Admin Operations"]
        direction TB
        UC_AdminDashboard(("View KPI Dashboard"))
        UC_ManageUsers(("Manage User Accounts & Roles"))
        UC_ManageRoomTypes(("Manage Room Types & Rates"))
        UC_ManageOutsource(("Manage Outsource Master Data (CRUD)"))
        UC_ViewReports(("Generate Occupancy & Revenue Reports"))
        UC_ExportReports(("Export Reports (PDF/CSV)"))
    end

    MGR --- UC_AdminDashboard
    MGR --- UC_ManageUsers
    MGR --- UC_ManageRoomTypes
    MGR --- UC_ManageOutsource
    MGR --- UC_ViewReports
    MGR --- UC_ExportReports

    UC_ExportReports -.->|"<<include>>"| UC_ViewReports
    UC_ViewReports -.->|"<<include>>"| UC_AdminDashboard
```

---

## 11.1 🏃 แผนภาพกิจกรรมการทำงานหลัก (Activity Diagrams)

Activity Diagrams จำลองลำดับขั้นตอนการปฏิบัติงานจริง (Business Workflows) พร้อมการแบ่งบทบาทความรับผิดชอบ (Swimlanes / Partitions) เพื่อใช้สำหรับอธิบายและสาธิตกระบวนการทำงานในขั้นตอนการทดสอบรวมระบบ (System Integration Demo):

### 1. โฟลว์การแจ้งซ่อมบำรุงและประสานงานคู่ค้า Outsource (Room Issue & Emergency Outsource Maintenance)
> **เป้าหมาย:** แสดงกระบวนการตั้งแต่พบสิ่งของหรืออุปกรณ์ชำรุด การบันทึกปัญหา การติดต่อช่าง Outsource ภายนอกด่วน 24 ชม. ผ่าน Quick Emergency Drawer การล็อคสถานะห้องเป็น `maintenance` ไปจนถึงการตรวจรับงานและคืนสถานะห้องพร้อมขาย

```mermaid
flowchart TD
    subgraph S1 [" 👥 ผู้พบปัญหา (แม่บ้าน / แขก) "]
        A(["เริ่มต้น: พบสิ่งของหรืออุปกรณ์ชำรุด"]) --> B["ระบุอาการและถ่ายรูปหลักฐาน"]
        B --> C{"ใครเป็นผู้พบปัญหา?"}
        C -->|แม่บ้านตรวจห้องพัก| D["เปิดแอป Housekeeping Portal"]
        C -->|แขกโทรแจ้งเคาน์เตอร์| E["แจ้งพนักงานต้อนรับที่ Front Desk"]
    end

    subgraph S2 [" 🧑‍💼 พนักงานต้อนรับ (Front Desk Staff) "]
        E --> F["เปิดแถบ Quick Emergency Outsource Drawer"]
        F --> G["กรองหมวดหมู่ช่าง: แอร์ / ประปา / ไฟฟ้า / กุญแจ"]
        G --> H["กดปุ่มคลิกโทรออก หรือ คัดลอก LINE ID"]
        H --> I["โทรติดต่อช่างด่วน 24 ชม. และส่งรูปหน้างานทาง LINE"]
        I --> J["ปรับสถานะห้องพักเป็น maintenance"]
    end

    subgraph S3 [" 🖥️ ระบบ KEYSTAY Backend (Housekeeping & Room Services) "]
        D --> K["POST /housekeeping/issues บันทึกข้อมูลและรูปถ่าย"]
        K --> L["บันทึกรายการลง db_housekeeping"]
        L --> M["แจ้งเตือนขึ้นที่แดชบอร์ด Front Desk & Housekeeping"]
        M --> F
        J --> N["PUT /rooms/:id/maintenance ปรับ rooms.status = 'maintenance'"]
        N --> O["บันทึกลง db_room: ล็อคห้องไม่ให้เปิดขาย"]
    end

    subgraph S4 [" 🛠️ คู่ค้า / ช่าง Outsource ภายนอก "]
        I --> P["ช่างรับสายและประเมินเวลาเข้าหน้างาน"]
        P --> Q["ช่างเดินทางมาถึงโรงแรมและเข้าซ่อมบำรุงในห้องพัก"]
        Q --> R["ซ่อมแซมเสร็จสิ้นและทดสอบการทำงาน"]
        R --> S["ส่งมอบงานให้แม่บ้าน / พนักงานตรวจสอบ"]
    end

    subgraph S5 [" ✅ การตรวจรับงานและคืนสถานะห้อง "]
        S --> T["แม่บ้านเข้าตรวจรับความเรียบร้อยและสุขอนามัย"]
        T --> U{"งานซ่อมผ่านการตรวจรับหรือไม่?"}
        U -->|ไม่ผ่าน / ต้องแก้งาน| Q
        U -->|ผ่านเรียบร้อย| V["PUT /housekeeping/issues/:id/resolve ปิดใบงาน"]
        V --> W["PUT /rooms/:id/maintenance ปรับห้องเป็น cleaning หรือ available"]
        W --> X(["สิ้นสุด: ห้องพักกลับมาพร้อมขาย / พร้อมใช้งาน"])
    end
```

---

### 2. โฟลว์กระบวนการเช็คอินและการรับ Walk-in (Front Desk Check-in & Walk-in Integration Flow)
> **เป้าหมาย:** แสดงขั้นตอนการเช็คอินของแขกที่มีการจองล่วงหน้าเปรียบเทียบกับ Walk-in การตรวจเอกสาร การเก็บมัดจำ และการปรับสถานะห้องพักแบบเรียลไทม์

```mermaid
flowchart TD
    subgraph GUEST [" 🧳 แขกผู้เข้าพัก (Guest) "]
        A2(["เริ่มต้น: แขกมาถึงเคาน์เตอร์โรงแรม"]) --> B2["แจ้งชื่อผู้จอง หรือ ขอเปิดห้องพักแบบ Walk-in"]
        B2 --> C2["แสดงบัตรประชาชน / พาสปอร์ต"]
        C2 --> D2["ชำระค่าห้องส่วนที่เหลือ (ถ้ามี) พร้อมวางเงินมัดจำกุญแจ"]
        D2 --> E2["รับคีย์การ์ดและเข้าพักในห้องพัก"]
    end

    subgraph FRONT_DESK [" 🧑‍💼 พนักงานต้อนรับ (Front Desk Staff) "]
        B2 --> F2{"มีข้อมูลการจองล่วงหน้าหรือไม่?"}
        F2 -->|มีจองล่วงหน้า| G2["ค้นหารายการจองจากชื่อ หรือ Booking Number"]
        F2 -->|ไม่มี / Walk-in| H2["ตรวจสอบผังห้องว่างบน Compact Room Matrix Grid"]
        H2 --> I2["เลือกห้องพักที่ว่าง (สถานะ available)"]
        I2 --> J2["กรอกข้อมูลผู้เข้าพัก (Walk-in Booking Form)"]
        G2 --> K2["ตรวจสอบความถูกต้องของเอกสารยืนยันตัวตน"]
        J2 --> K2
        K2 --> L2["รับเงินค่าห้องและเงินมัดจำ (Cashier Mode)"]
        L2 --> M2["กดยืนยันปุ่ม 'Check-in' บนระบบ"]
        M2 --> N2["ส่งมอบคีย์การ์ดและแจ้งข้อมูลการเข้าพักให้แขก"]
        N2 --> E2
    end

    subgraph SYSTEM [" ⚙️ ระบบ KEYSTAY (Reservation & Room Inventory Services) "]
        M2 --> O2["POST /reservations/:id/check-in"]
        O2 --> P2["บันทึก Check-in Timestamp ลง db_reservation"]
        P2 --> Q2["Transactional Outbox: บันทึก Event 'ReservationCheckedIn'"]
        Q2 --> R2["ส่ง Webhook ไปยัง Room Inventory Service"]
        R2 --> S2["ปรับสถานะห้องพัก rooms.status เป็น 'occupied'"]
        S2 --> T2["บันทึกประวัติการเปลี่ยนสถานะลง room_status_history"]
        T2 --> U2(["สิ้นสุด: ห้องพักเปลี่ยนสถานะเป็น occupied เรียบร้อย"])
    end
```

---

### 3. โฟลว์กระบวนการเช็คเอาท์ คิดเงิน และกระจายงานแม่บ้าน (Check-out, Cashier & 1:4 Fan-out Flow)
> **เป้าหมาย:** แสดงขั้นตอนการคืนห้องพัก การคิดเงินมินิบาร์ การหักลบเงินมัดจำ การปิดบิล และการกระจาย Event แบบ Fan-out 1:4 ไปยัง 4 เซอร์วิสอัตโนมัติ

```mermaid
flowchart TD
    subgraph GUEST3 [" 🧳 แขกผู้เข้าพัก (Guest) "]
        A3(["เริ่มต้น: แขกคืนคีย์การ์ดที่เคาน์เตอร์"]) --> B3["คืนกุญแจห้องและแจ้งเช็คเอาท์"]
        B3 --> C3["รอพนักงานตรวจสอบมินิบาร์และสภาพห้อง"]
        C3 --> D3["ตรวจสอบใบแจ้งหนี้ / ใบสรุปค่าใช้จ่าย"]
        D3 --> E3["ชำระเงินส่วนต่าง หรือ รับเงินมัดจำคืน"]
        E3 --> F3["รับใบเสร็จรับเงิน / ใบกำกับภาษี"]
        F3 --> G3(["สิ้นสุด: แขกเดินทางออกจากโรงแรม"])
    end

    subgraph FRONT_DESK3 [" 🧑‍💼 พนักงานต้อนรับ / แคชเชียร์ (Front Desk Cashier) "]
        B3 --> H3["เปิดหน้าจอ Cashier Split Screen ของห้องพัก"]
        H3 --> I3["สอบถามการบริโภคมินิบาร์และตรวจสอบความเสียหาย"]
        I3 --> J3["บันทึกรายการมินิบาร์ / ค่าเสียหายเพิ่มเติม (ถ้ามี)"]
        J3 --> K3["ระบบคำนวณยอดรวม ภาษี 7% และหักลบเงินมัดจำอัตโนมัติ"]
        K3 --> L3["รับชำระเงิน หรือ คืนเงินมัดจำส่วนที่เหลือให้แขก"]
        L3 --> M3["กดยืนยันปุ่ม 'Check-out & Settle'"]
        M3 --> N3["พิมพ์ใบเสร็จรับเงิน (Receipt / Tax Invoice) มอบให้แขก"]
        N3 --> F3
    end

    subgraph SYSTEM3 [" ⚙️ ระบบ KEYSTAY Backend & Upstash QStash "]
        M3 --> O3["POST /reservations/:id/check-out"]
        O3 --> P3["db.batch() ปรับ reservation status = 'checked_out'"]
        P3 --> Q3["Transactional Outbox: บันทึก Event 'ReservationCheckedOut'"]
        Q3 --> R3["Dispatcher ส่ง Event ไปยัง Upstash QStash"]
        
        subgraph FAN_OUT [" True 1:4 Fan-out Broadcast "]
            R3 --> S3["1. Room Inventory: ปรับ rooms.status = 'checked_out'"]
            R3 --> T3["2. Housekeeping: Auto-create Cleaning Task (Urgent)"]
            R3 --> U3["3. Billing: สรุปปิดยอดบิล ย้ายสถานะเป็น 'paid'"]
            R3 --> V3["4. Report Analytics: คำนวณรายได้และ Occupancy ประจำวัน"]
        end
        S3 & T3 & U3 & V3 --> W3(["สิ้นสุด: ระบบกระจายงานสำเร็จครบทั้ง 4 ส่วนงาน"])
    end
```

---

### 4. โฟลว์การบริหารจัดการข้อมูลคู่ค้า Outsource (Admin Outsource Vendor Management Flow)
> **เป้าหมาย:** แสดงกระบวนการที่ผู้ดูแลระบบ (Admin) บริหารจัดการ Master Data ช่าง/คู่ค้าภายนอก (CRUD) และผลกระทบทันทีต่อหน้าจอ Front Desk & Housekeeping

```mermaid
flowchart TD
    subgraph ADMIN [" 👤 ผู้ดูแลระบบ / ผู้จัดการ (Admin / Manager) "]
        A4(["เริ่มต้น: มีคู่ค้าหรือช่างภายนอกรายใหม่ / ต่อสัญญา"]) --> B4["เข้าสู่ระบบด้วยสิทธิ์ Admin ที่ /login"]
        B4 --> C4["เข้าสู่ Admin Portal เมนู 'คู่ค้า & ช่างภายนอก' (/admin/outsource)"]
        C4 --> D4{"เลือกการดำเนินการ"}
        D4 -->|เพิ่มช่างใหม่| E4["คลิกปุ่ม '+ เพิ่มคู่ค้า Outsource'"]
        D4 -->|แก้ไขข้อมูล / ต่อสัญญา| F4["คลิก 'แก้ไข' ข้อมูลช่างเดิม"]
        D4 -->|ระงับการจ้างงาน| G4["คลิกปุ่ม 'ระงับการใช้งาน (Deactivate)'"]
        E4 --> H4["กรอกชื่อ, หมวดหมู่งาน, เบอร์โทร, LINE ID, ติ๊กถูก 24 ชม."]
        F4 --> I4["แก้ไขเบอร์โทรศัพท์ / ปรับปรุงเวลาให้บริการ"]
        G4 --> J4["ยืนยันการระงับสัญญา (is_active = 0)"]
    end

    subgraph BACKEND [" 🖥️ Housekeeping Service & D1: db_housekeeping "]
        H4 --> K4["POST /housekeeping/outsource-contacts"]
        I4 --> L4["PUT /housekeeping/outsource-contacts/:id"]
        J4 --> M4["DELETE /housekeeping/outsource-contacts/:id (Soft Delete)"]
        K4 --> N4["INSERT INTO outsource_contacts ใน db_housekeeping"]
        L4 --> O4["UPDATE ข้อมูลและ updated_at ใน db_housekeeping"]
        M4 --> P4["UPDATE outsource_contacts SET is_active = 0"]
        N4 & O4 & P4 --> Q4["ส่งผลลัพธ์ HTTP 200/201 กลับมายังหน้าจอ"]
    end

    subgraph FRONT_DESK_EFFECT [" 📱 ผลกระทบต่อการใช้งานหน้างาน (Operational Impact) "]
        Q4 --> R4["สมุดเบอร์โทรศัพท์ใน Quick Emergency Drawer ของ Front Desk อัปเดตทันที"]
        R4 --> S4["ช่างที่ถูกระงับการใช้งาน (is_active = 0) จะไม่แสดงในลิสต์โทรออก ป้องกันโทรผิด"]
        S4 --> T4(["สิ้นสุด: Master Data คู่ค้าถูกต้องและปลอดภัย 100%"])
    end
```

---

---

## 12. 🏗️ แผนภาพคลาส (Class Diagram)

```mermaid
classDiagram

    class User {
        +String id
        +String email
        +String passwordHash
        +String firstName
        +String lastName
        +Role role
        +Boolean isActive
        +DateTime lastLoginAt
        +login(email: String, password: String) TokenPair
        +logout(token: String) Boolean
        +changePassword(oldPwd: String, newPwd: String) Boolean
    }

    class Room {
        +String id
        +String roomNumber
        +String roomTypeId
        +String floorId
        +RoomStatus status
        +Boolean isActive
        +String notes
        +updateStatus(newStatus: RoomStatus, reason: String) Boolean
        +setMaintenance(reason: String) Boolean
    }

    class RoomType {
        +String id
        +String name
        +String description
        +Decimal basePrice
        +Int maxOccupancy
        +String bedType
        +Float sizeSqm
        +calculatePrice(nights: Int, discount: Decimal) Decimal
    }

    class Floor {
        +String id
        +Int floorNumber
        +String name
        +Int totalRooms
        +getRooms() Room[]
    }

    class Amenity {
        +String id
        +String roomId
        +String amenityName
        +String description
    }

    class Guest {
        +String id
        +String firstName
        +String lastName
        +String email
        +String phone
        +String idCardNumber
        +String nationality
        +Int totalStays
        +getReservationHistory() Reservation[]
    }

    class Reservation {
        +String id
        +String reservationCode
        +String guestId
        +String roomId
        +ReservationStatus status
        +BookingType bookingType
        +Date checkInDate
        +Date checkOutDate
        +DateTime actualCheckIn
        +DateTime actualCheckOut
        +Int numGuests
        +Decimal nightlyRate
        +Decimal totalAmount
        +confirm() Boolean
        +checkIn() Boolean
        +checkOut() Boolean
        +cancel() Boolean
        +extendStay(newCheckOutDate: Date) Boolean
    }

    class ReservationHistory {
        +String id
        +String reservationId
        +String action
        +Json previousData
        +Json newData
        +String performedBy
        +DateTime createdAt
    }

    class HousekeepingStaff {
        +String id
        +String userId
        +String firstName
        +String lastName
        +String zone
        +String shift
        +Boolean isActive
        +Int maxTasksPerDay
        +getAssignedTasks() HousekeepingTask[]
    }

    class HousekeepingTask {
        +String id
        +String roomId
        +String assignedTo
        +TaskType taskType
        +Priority priority
        +TaskStatus status
        +Date scheduledDate
        +DateTime startedAt
        +DateTime completedAt
        +assign(staffId: String) Boolean
        +start() Boolean
        +complete() Boolean
    }

    class RoomIssue {
        +String id
        +String taskId
        +String roomId
        +String reportedBy
        +IssueType issueType
        +String description
        +Severity severity
        +IssueStatus status
        +resolve() Boolean
    }

    class Bill {
        +String id
        +String billNumber
        +String reservationId
        +Decimal subtotal
        +Decimal discountAmount
        +Decimal taxAmount
        +Decimal serviceCharge
        +Decimal totalAmount
        +Decimal amountPaid
        +Decimal amountDue
        +BillStatus status
        +addItem(item: BillItem) Boolean
        +pay(amount: Decimal, method: String) Payment
        +refund(amount: Decimal, reason: String) Refund
    }

    class BillItem {
        +String id
        +String billId
        +ItemType itemType
        +String description
        +Int quantity
        +Decimal unitPrice
        +Decimal totalPrice
    }

    class Payment {
        +String id
        +String billId
        +String paymentMethodId
        +Decimal amount
        +String referenceNumber
        +PaymentStatus status
        +DateTime paidAt
    }

    class Invoice {
        +String id
        +String invoiceNumber
        +String billId
        +String issuedToName
        +String issuedToEmail
        +Decimal totalAmount
        +InvoiceStatus status
        +sendEmail() Boolean
    }

    class DailyStats {
        +String id
        +Date date
        +Int totalRooms
        +Int occupiedRooms
        +Int availableRooms
        +Int reservedRooms
        +Float occupancyRate
        +Int totalCheckins
        +Int totalCheckouts
        +calculateOccupancyRate() Float
    }

    class RevenueRecord {
        +String id
        +Date date
        +String reservationId
        +String billId
        +RevenueType revenueType
        +Decimal amount
        +String paymentMethod
    }

    class OutsourceContact {
        +String id
        +String name
        +OutsourceCategory category
        +String serviceType
        +String phonePrimary
        +String phoneSecondary
        +String lineId
        +Boolean isEmergency
        +String availableHours
        +String priceRateNote
        +Float rating
        +String address
        +String notes
        +Boolean isActive
        +String createdBy
        +DateTime createdAt
        +DateTime updatedAt
        +getEmergencyContacts() OutsourceContact[]
        +toggleActive(status: Boolean) Boolean
    }

    %% Relationships
    Floor "1" *-- "0..*" Room
    RoomType "1" o-- "0..*" Room
    Room "1" *-- "0..*" Amenity
    Guest "1" --> "0..*" Reservation
    Reservation "1" --> "1" Room
    Reservation "1" *-- "0..*" ReservationHistory
    Room "1" --> "0..*" HousekeepingTask
    HousekeepingStaff "1" --> "0..*" HousekeepingTask
    HousekeepingTask "1" *-- "0..*" RoomIssue
    Reservation "1" --> "1" Bill
    Bill "1" *-- "1..*" BillItem
    Bill "1" *-- "0..*" Payment
    Bill "1" --> "0..1" Invoice
    Reservation "0..1" --> "0..*" RevenueRecord
    Bill "0..1" --> "0..*" RevenueRecord
    HousekeepingStaff "0..1" --> "0..*" OutsourceContact : "contacts for repairs"
    User "1" --> "0..*" OutsourceContact : "admin manages master data"
```

---

## 13. 🖥️ สถาปัตยกรรมระบบ (System Architecture & Event-Driven Patterns)

### 1. แผนผังสถาปัตยกรรมระดับระบบ (System Architecture Flowchart)

```mermaid
flowchart TB
    CLIENT["<b>Client — React + Vite + Tailwind CSS</b><br/>Front Desk · Housekeeping · Billing · Manager / Admin"]
    KV[("<b>Cloudflare KV</b><br/>Session · Permissions · Config")]
    GW["<b>API Gateway — Cloudflare Worker</b><br/>Reverse Proxy · JWT Verify · Rate Limit · CORS · Route → Service"]

    subgraph SERVICES["Microservices Layer — Cloudflare Workers · 6 Services · 105 APIs"]
        AUTH["<b>#1 Auth / User Service</b><br/>12 APIs<br/>users · sessions · permissions"]
        ROOM["<b>#2 Room Inventory Service</b><br/>18 APIs<br/>rooms · room_types · floors · amenities"]
        RES["<b>#3 Reservation Service</b><br/>24 APIs<br/>guests · reservations · history"]
        HK["<b>#4 Housekeeping Service</b><br/>21 APIs<br/>staff · tasks · issues · schedule · outsource_contacts"]
        BILL["<b>#5 Billing Service</b><br/>16 APIs<br/>bills · bill_items · payments · invoices"]
        RPT["<b>#6 Report / Analytics Service</b><br/>14 APIs<br/>daily_stats · revenue · summaries"]
    end

    subgraph DATABASES["Cloudflare D1 — Database-per-Service (แยก 6 DBs อิสระ)"]
        DB1[("D1: db_auth_user")]
        DB2[("D1: db_room")]
        DB3[("D1: db_reservation")]
        DB4[("D1: db_housekeeping")]
        DB5[("D1: db_billing")]
        DB6[("D1: db_report")]
    end

    subgraph BUS["Cloudflare Queues — Asynchronous Event Bus (Outbox Pattern & Fan-out)"]
        Q1{{"<b>room-status-queue</b>"}}
        Q2{{"<b>checkout-queue</b><br/>(FAN-OUT 1:3)"}}
        Q3{{"<b>report-queue</b>"}}
    end

    CLIENT --> GW
    KV <--> GW
    GW --> AUTH
    GW --> ROOM
    GW --> RES
    GW --> HK
    GW --> BILL
    GW --> RPT

    AUTH --- DB1
    ROOM --- DB2
    RES --- DB3
    HK --- DB4
    BILL --- DB5
    RPT --- DB6

    RES -. "ReservationCreated<br/>ReservationCheckedIn<br/>ReservationCancelled" .-> Q1
    HK -. "HousekeepingTaskCompleted" .-> Q1
    ROOM -.-|"▲ Consume<br/>ปรับปรุงสถานะห้อง"| Q1

    RES -. "ReservationCheckedOut" .-> Q2
    HK -.-|"▲ Consume 1<br/>สร้าง Task ทำความสะอาด"| Q2
    BILL -.-|"▲ Consume 2<br/>สร้างบิลเรียกเก็บเงิน"| Q2
    RPT -.-|"▲ Consume 3<br/>บันทึกสถิติ Checkout"| Q2

    BILL -. "BillPaid" .-> Q3
    ROOM -. "RoomStatusChanged" .-> Q3
    RPT -.-|"▲ Consume<br/>อัปเดต Revenue & Occupancy"| Q3
```

### 2. รูปแบบความสอดคล้องของข้อมูล (Outbox Pattern Implementation)
เพื่อรับประกันความถูกต้องของข้อมูลข้าม Service โดยไม่ต้องทำ Distributed Locking ระบบกำหนดให้ทุก Action สำคัญบันทึกข้อมูลหลักพร้อม Event ลงตาราง `outbox_events` ภายใต้ Transaction ก้อนเดียวกันเสมอ:

```sql
BEGIN TRANSACTION;
UPDATE main_table SET status = 'new_status' WHERE id = ?;
INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
VALUES (lower(hex(randomblob(16))), 'EventName', ?, 'Type', ?, 'pending', CURRENT_TIMESTAMP);
COMMIT;
```

### 3. ตารางความสัมพันธ์ Event Bus ข้ามเซอร์วิส (Cross-Service Event Mapping)

| # | Event Name | Producer Service | Trigger Endpoint | บันทึกใน Outbox DB | Cloudflare Queue | Consumer Service | การตอบสนองของ Consumer |
|:---:|---|---|---|---|---|---|---|
| 1 | `ReservationCreated` | Reservation | `POST /reservations`<br/>`POST /walk-in` | `db_reservation` | `room-status-queue` | Room Inventory | เปลี่ยนสถานะห้องเป็น `reserved` |
| 2 | `ReservationCheckedIn` | Reservation | `POST /reservations/:id/check-in` | `db_reservation` | `room-status-queue` | Room Inventory | เปลี่ยนสถานะห้องเป็น `occupied` |
| 3 | `ReservationCheckedOut` | Reservation | `POST /reservations/:id/check-out` | `db_reservation` | `checkout-queue`<br/>*(Fan-out)* | • Housekeeping<br/>• Billing<br/>• Report | **Housekeeping:** สร้าง Task ทำความสะอาด<br/>**Billing:** สร้างบิลเรียกเก็บเงิน<br/>**Report:** บันทึกสถิติการเช็คเอาท์ |
| 4 | `ReservationCancelled` | Reservation | `POST /reservations/:id/cancel` | `db_reservation` | `room-status-queue` | Room Inventory | คืนสถานะห้องเป็น `available` |
| 5 | `HousekeepingTaskCompleted` | Housekeeping | `PUT /housekeeping/tasks/:id/complete` | `db_housekeeping` | `room-status-queue` | Room Inventory | ปรับสถานะห้องเป็น `available` พร้อมใช้งาน |
| 6 | `BillPaid` | Billing | `POST /bills/:id/pay` | `db_billing` | `report-queue` | Report | รวมยอด Revenue เข้าสถิติประจำวัน |
| 7 | `RoomStatusChanged` | Room Inventory | `PUT /rooms/:id/status` | `db_room` | `report-queue` | Report | คำนวณและอัปเดต Occupancy Rate แบบ Real-time |

### 4. แผนภาพการติดตั้งระบบจริง (UML Deployment Diagram)

```mermaid
graph TB
    subgraph CLIENT_TIER [" 📱 Client Devices & Portals Tier "]
        C1["🖥️ Desktop Admin/Manager<br/>(Manager Portal /admin)"]
        C2["🧑‍💼 Front Desk PC/Tablet<br/>(Front Desk Portal /front-desk)"]
        C3["🧹 Housekeeping Mobile<br/>(Housekeeping Portal /housekeeping)"]
    end

    subgraph CF_EDGE [" ☁️ Cloudflare Global Edge Network "]
        DNS["Cloudflare DNS & SSL/TLS Termination"]
        WAF["Cloudflare Web Application Firewall (WAF)"]
        PAGES["Cloudflare Pages<br/>(React 18 + Vite SPA Assets)"]
        GW["Central API Gateway Worker<br/>(JWT Guard, RBAC, Reverse Proxy)"]
    end

    subgraph CF_WORKERS [" ⚡ Cloudflare Workers Compute Runtime (V8 Isolates) "]
        S1["🔐 auth-user (12 APIs)"]
        S2["🛏️ room-inventory (18 APIs)"]
        S3["📅 reservation (24 APIs)"]
        S4["🧹 housekeeping (21 APIs)"]
        S5["🧾 billing (16 APIs)"]
        S6["📈 report-analytics (14 APIs)"]
    end

    subgraph STORAGE_TIER [" 🗄️ Cloudflare Serverless Persistence Tier "]
        KV[("Cloudflare KV<br/>keystay_kv (Sessions/Blacklist)")]
        R2[("Cloudflare R2 Object Storage<br/>keystay (Room Issue Photos)")]
        D1[("D1 SQLite: db_auth_user")]
        D2[("D1 SQLite: db_room")]
        D3[("D1 SQLite: db_reservation")]
        D4[("D1 SQLite: db_housekeeping<br/>(tasks, issues, outsource_contacts)")]
        D5[("D1 SQLite: db_billing")]
        D6[("D1 SQLite: db_report")]
    end

    subgraph BROKER_TIER [" 📬 Distributed Event Bus Tier "]
        QSTASH["Upstash QStash Serverless Message Broker<br/>(At-Least-Once Delivery & Auto Retry)"]
        TOPIC["Topics: hotel.reservation.checkout | hotel.housekeeping.completed"]
    end

    %% Connections
    C1 & C2 & C3 -->|HTTPS / WSS| DNS
    DNS --> WAF --> PAGES
    WAF --> GW
    GW -->|Service Bindings| S1 & S2 & S3 & S4 & S5 & S6

    S1 --> D1
    S1 --> KV
    S2 --> D2
    S3 --> D3
    S4 --> D4
    S4 --> R2
    S5 --> D5
    S6 --> D6

    S3 -.->|Transactional Outbox Dispatch| QSTASH
    S4 -.->|Transactional Outbox Dispatch| QSTASH
    QSTASH --> TOPIC
    TOPIC -.->|Webhook Signature HMAC-SHA256| S2 & S4 & S5 & S6
```

---

## 14. 🔄 วงจรชีวิตสถานะห้องพัก (Room Lifecycle State Machine)

```mermaid
stateDiagram-v2
    direction TB
    [*] --> available: ห้องถูกสร้างในระบบ
    available --> reserved: 1. ReservationCreated (POST /reservations หรือ /walk-in)
    reserved --> occupied: 2. ReservationCheckedIn (POST /reservations/{id}/check-in)
    occupied --> checked_out: 3. ReservationCheckedOut (POST /reservations/{id}/check-out)
    checked_out --> cleaning: 4. Auto-create Cleaning Task (Queue Fan-out)
    cleaning --> available: 5. HousekeepingTaskCompleted (PUT /tasks/{id}/complete)

    reserved --> available: ReservationCancelled (POST /reservations/{id}/cancel)
    available --> maintenance: แจ้งซ่อมบำรุง (PUT /rooms/{id}/maintenance)
    maintenance --> available: ซ่อมเสร็จสิ้น (PUT /rooms/{id}/maintenance)
    cleaning --> maintenance: พบปัญหาระหว่างทำความสะอาด (POST /tasks/{id}/report-issue)
    occupied --> occupied: ขยายเวลาพัก (POST /reservations/{id}/extend-stay)
    available --> out_of_order: ฉุกเฉิน - ระงับการใช้งานชั่วคราว
    out_of_order --> maintenance: ส่งฝ่ายช่างเข้าตรวจซ่อม
    maintenance --> out_of_order: รอชิ้นส่วนอะไหล่ / ซ่อมยังไม่เสร็จ
```

---

## 15. 🔁 แผนผังลำดับการทำงานหลัก (Sequence Diagrams)

### Flow #1: การจองห้องพักล่วงหน้า (Advance Booking Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff
    participant GW as API Gateway
    participant RS as Reservation Service
    participant DB_R as D1: db_reservation
    participant Q1 as room-status-queue
    participant RI as Room Inventory Service
    participant DB_RM as D1: db_room
    participant Q3 as report-queue
    participant RP as Report Service

    FD->>GW: POST /reservations {guest_id, room_id, dates}
    GW->>RS: Route to Reservation Service
    RS->>DB_R: BEGIN TRANSACTION
    RS->>DB_R: INSERT INTO reservations (status='confirmed')
    RS->>DB_R: INSERT INTO outbox_events (ReservationCreated)
    RS->>DB_R: INSERT INTO reservation_history (action='created')
    RS->>DB_R: COMMIT
    RS-->>GW: 201 Created {reservation}
    GW-->>FD: จองห้องพักสำเร็จ
    RS--)Q1: Publish ReservationCreated {reservation_id, room_id}
    Q1--)RI: Consume ReservationCreated
    RI->>DB_RM: BEGIN TRANSACTION
    RI->>DB_RM: UPDATE rooms SET status='reserved'
    RI->>DB_RM: INSERT INTO room_status_history
    RI->>DB_RM: INSERT INTO outbox_events (RoomStatusChanged)
    RI->>DB_RM: COMMIT
    RI--)Q3: Publish RoomStatusChanged
    Q3--)RP: Consume RoomStatusChanged
    RP->>RP: อัปเดต daily_stats (available--, reserved++)
```

### Flow #2: การเช็คอินเข้าพัก (Check-in Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff
    participant GW as API Gateway
    participant RS as Reservation Service
    participant DB_R as D1: db_reservation
    participant Q1 as room-status-queue
    participant RI as Room Inventory Service
    participant DB_RM as D1: db_room
    participant Q3 as report-queue
    participant RP as Report Service

    FD->>GW: POST /reservations/{id}/check-in
    GW->>RS: Route to Reservation Service
    RS->>DB_R: ตรวจสอบสถานะการจอง (confirmed?)
    alt การจองไม่ถูกต้อง
        RS-->>GW: 400 Bad Request
        GW-->>FD: แจ้งเตือน: ไม่สามารถเช็คอินได้
    else การจองถูกต้อง
        RS->>DB_R: BEGIN TRANSACTION
        RS->>DB_R: UPDATE reservations SET status='checked_in', actual_check_in=NOW()
        RS->>DB_R: INSERT INTO outbox_events (ReservationCheckedIn)
        RS->>DB_R: INSERT INTO reservation_history (action='checked_in')
        RS->>DB_R: UPDATE guests SET total_stays = total_stays + 1
        RS->>DB_R: COMMIT
        RS-->>GW: 200 OK {reservation}
        GW-->>FD: เช็คอินสำเร็จ มอบคีย์การ์ดให้แขก
        RS--)Q1: Publish ReservationCheckedIn {reservation_id, room_id}
        Q1--)RI: Consume ReservationCheckedIn
        RI->>DB_RM: BEGIN TRANSACTION
        RI->>DB_RM: UPDATE rooms SET status='occupied'
        RI->>DB_RM: INSERT INTO room_status_history (reserved → occupied)
        RI->>DB_RM: INSERT INTO outbox_events (RoomStatusChanged)
        RI->>DB_RM: COMMIT
        RI--)Q3: Publish RoomStatusChanged
        Q3--)RP: Consume RoomStatusChanged
        RP->>RP: อัปเดต daily_stats (reserved--, occupied++, total_checkins++)
    end
```

### Flow #3: การเช็คเอาท์และกระจายงานแบบ Fan-out (Check-out Fan-out Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff
    participant GW as API Gateway
    participant RS as Reservation Service
    participant DB_R as D1: db_reservation
    participant Q2 as checkout-queue (Fan-out)
    participant HK as Housekeeping Service
    participant DB_H as D1: db_housekeeping
    participant BL as Billing Service
    participant DB_B as D1: db_billing
    participant RP as Report Service
    participant DB_RP as D1: db_report

    FD->>GW: POST /reservations/{id}/check-out
    GW->>RS: Route to Reservation Service
    RS->>DB_R: BEGIN TRANSACTION
    RS->>DB_R: UPDATE reservations SET status='checked_out', actual_check_out=NOW()
    RS->>DB_R: INSERT INTO outbox_events (ReservationCheckedOut)
    RS->>DB_R: INSERT INTO reservation_history (action='checked_out')
    RS->>DB_R: COMMIT
    RS-->>GW: 200 OK
    GW-->>FD: เช็คเอาท์สำเร็จ
    RS--)Q2: Publish ReservationCheckedOut {reservation_id, room_id, dates, guest_name}

    par Consumer 1: Housekeeping (สร้างงานทำความสะอาด)
        Q2--)HK: Consume ReservationCheckedOut
        HK->>DB_H: INSERT INTO housekeeping_tasks (type='checkout_clean', status='pending')
    and Consumer 2: Billing (สร้างบิลและแจกแจงค่าห้อง)
        Q2--)BL: Consume ReservationCheckedOut
        BL->>DB_B: INSERT INTO bills (status='pending')
        BL->>DB_B: INSERT INTO bill_items (room_charges)
    and Consumer 3: Report (บันทึกสถิติ Checkout)
        Q2--)RP: Consume ReservationCheckedOut
        RP->>DB_RP: UPDATE daily_stats SET total_checkouts = total_checkouts + 1
        RP->>DB_RP: INSERT INTO event_log
    end
```

### Flow #4: แม่บ้านทำความสะอาดเสร็จสิ้น (Housekeeping Complete Flow)
```mermaid
sequenceDiagram
    autonumber
    actor HKS as Housekeeping Staff
    participant GW as API Gateway
    participant HK as Housekeeping Service
    participant DB_H as D1: db_housekeeping
    participant Q1 as room-status-queue
    participant RI as Room Inventory Service
    participant DB_RM as D1: db_room
    participant Q3 as report-queue
    participant RP as Report Service
    participant DB_RP as D1: db_report

    HKS->>GW: PUT /housekeeping/tasks/{id}/complete
    GW->>HK: Route to Housekeeping Service
    HK->>DB_H: BEGIN TRANSACTION
    HK->>DB_H: UPDATE housekeeping_tasks SET status='completed', completed_at=NOW()
    HK->>DB_H: INSERT INTO outbox_events (HousekeepingTaskCompleted)
    HK->>DB_H: COMMIT
    HK-->>GW: 200 OK
    GW-->>HKS: บันทึกงานทำความสะอาดเรียบร้อย
    HK--)Q1: Publish HousekeepingTaskCompleted {task_id, room_id}
    Q1--)RI: Consume HousekeepingTaskCompleted
    RI->>DB_RM: BEGIN TRANSACTION
    RI->>DB_RM: UPDATE rooms SET status='available'
    RI->>DB_RM: INSERT INTO room_status_history (cleaning → available)
    RI->>DB_RM: INSERT INTO outbox_events (RoomStatusChanged)
    RI->>DB_RM: COMMIT
    RI--)Q3: Publish RoomStatusChanged
    Q3--)RP: Consume RoomStatusChanged
    RP->>DB_RP: UPDATE daily_stats (occupied--, available++)
```

### Flow #5: ชำระเงินและสรุปรายงานรายได้ (Bill Payment Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff (Cashier)
    participant GW as API Gateway
    participant BL as Billing Service
    participant DB_B as D1: db_billing
    participant Q3 as report-queue
    participant RP as Report Service
    participant DB_RP as D1: db_report

    FD->>GW: POST /bills/{id}/pay {payment_method_id, amount}
    GW->>BL: Route to Billing Service
    BL->>DB_B: ตรวจสอบความถูกต้องของบิลและยอดค้างชำระ
    BL->>DB_B: BEGIN TRANSACTION
    BL->>DB_B: INSERT INTO payments (bill_id, amount, method)
    BL->>DB_B: UPDATE bills SET amount_paid += amount, amount_due -= amount, status='paid'
    BL->>DB_B: INSERT INTO outbox_events (BillPaid)
    BL->>DB_B: COMMIT
    BL-->>GW: 200 OK {bill, payment}
    GW-->>FD: รับชำระเงินสำเร็จ
    BL--)Q3: Publish BillPaid {bill_id, reservation_id, total_amount, method}
    Q3--)RP: Consume BillPaid
    RP->>DB_RP: INSERT INTO revenue_records (date, amount, type, method)
    RP->>DB_RP: UPDATE monthly_summary SET total_revenue += amount
    RP->>DB_RP: UPDATE room_performance SET total_revenue += amount
```

### Flow #6: การแจ้งซ่อมห้องพักและประสานงานช่าง Outsource ฉุกเฉิน (Room Issue & Emergency Outsource Maintenance Flow)
```mermaid
sequenceDiagram
    autonumber
    actor HK as แม่บ้าน (Housekeeping)
    actor FD as พนักงานต้อนรับ (Front Desk)
    participant UI as Web App (Drawer / Portal)
    participant GW as API Gateway
    participant HKS as Housekeeping Service
    participant DB_H as D1: db_housekeeping
    participant R2 as Cloudflare R2 (Photos)
    participant RMS as Room Inventory Service
    participant DB_R as D1: db_room
    actor OUT as ช่าง Outsource (คู่ค้าภายนอก)

    %% 1. แจ้งปัญหาและถ่ายรูป
    HK->>UI: พบอุปกรณ์ชำรุด (เช่น แอร์ไม่เย็น, ท่อน้ำรั่วซึม)
    HK->>UI: ถ่ายรูปหน้างานและกรอกฟอร์มแจ้งซ่อม
    UI->>GW: POST /housekeeping/issues/upload-photo (Multipart)
    GW->>R2: บันทึกรูปถ่ายลง Bucket 'keystay'
    R2-->>GW: photo_r2_key (URL)
    GW-->>UI: 200 OK {photo_r2_key}

    UI->>GW: POST /housekeeping/issues {room_id, issue_type, description, photo_r2_key, severity}
    GW->>HKS: Route to Housekeeping Service
    HKS->>DB_H: INSERT INTO room_issues (status='open')
    DB_H-->>HKS: 201 Created {issue_id}
    HKS-->>GW: 201 Created
    GW-->>UI: แสดง Alert แจ้งเตือนห้องชำรุดบนแดชบอร์ด

    %% 2. ปรับสถานะห้องเป็น maintenance
    UI->>GW: PUT /rooms/:id/maintenance {is_maintenance: true, reason: 'แอร์เสีย'}
    GW->>RMS: Route to Room Inventory Service
    RMS->>DB_R: UPDATE rooms SET status='maintenance' WHERE id=:id
    DB_R-->>RMS: Updated
    RMS-->>GW: 200 OK (ห้องถูกล็อค ห้ามเปิดขาย)

    %% 3. Front Desk / แม่บ้านเปิด Quick Emergency Drawer หาช่าง
    FD->>UI: เปิด Quick Emergency Contact Drawer
    UI->>GW: GET /housekeeping/outsource-contacts?category=air_conditioning&is_emergency=1
    GW->>HKS: Query Outsource Contacts
    HKS->>DB_H: SELECT * FROM outsource_contacts WHERE category='air_conditioning' AND is_emergency=1 AND is_active=1
    DB_H-->>HKS: Return vendor records
    HKS-->>GW: 200 OK [vendors list]
    GW-->>UI: แสดงรายชื่อช่างด่วน 24 ชม. พร้อมปุ่มโทรและ LINE ID

    %% 4. ติดต่อช่าง
    FD->>OUT: Click-to-Call (tel:0899998888) หรือ Copy LINE ID ส่งรูป R2 ให้ช่าง
    OUT-->>FD: รับงาน ยืนยันเข้าหน้างานภายใน 30 นาที

    %% 5. ซ่อมเสร็จและตรวจรับ
    Note over OUT,HK: ช่างเข้าปฏิบัติงานซ่อมหน้างานจนเสร็จสมบูรณ์
    HK->>UI: เข้าตรวจรับงานซ่อม (Pass)
    HK->>UI: กดยืนยันปิดใบงาน
    UI->>GW: PUT /housekeeping/issues/:id/resolve {resolution_notes: 'ล้างแอร์และเติมน้ำยาแอร์เรียบร้อย'}
    GW->>HKS: Update Issue Status
    HKS->>DB_H: UPDATE room_issues SET status='resolved', resolved_at=NOW()
    HKS-->>GW: 200 OK

    %% 6. คืนสถานะห้องพร้อมขาย
    UI->>GW: PUT /rooms/:id/maintenance {is_maintenance: false}
    GW->>RMS: Update Room Status
    RMS->>DB_R: UPDATE rooms SET status='available' WHERE id=:id
    DB_R-->>RMS: Updated
    RMS-->>GW: 200 OK
    GW-->>UI: ห้องพักกลับสู่สถานะ Available พร้อมขาย
```

---

## 16. 📋 รายการ API ทั้งหมด (105 Microservice Endpoints)

### 🔐 Service #1: Auth/User Service (12 APIs)
1. `POST /register` — ลงทะเบียนผู้ใช้งานใหม่
2. `POST /login` — ล็อกอินเข้าสู่ระบบและรับ JWT
3. `POST /logout` — ออกจากระบบและยกเลิก Session
4. `POST /refresh-token` — ขอ Refresh Token ใหม่
5. `GET /users` — ดึงรายชื่อผู้ใช้งานทั้งหมด
6. `GET /users/:id` — ดึงข้อมูลผู้ใช้รายบุคคล
7. `PUT /users/:id` — แก้ไขข้อมูลผู้ใช้งาน
8. `DELETE /users/:id` — ปิดการใช้งานผู้ใช้ (Soft Delete)
9. `PUT /users/:id/role` — เปลี่ยนบทบาทและหน้าที่ผู้ใช้
10. `GET /users/:id/permissions` — ดูรายการสิทธิ์ของผู้ใช้
11. `POST /forgot-password` — ขอกู้คืนรหัสผ่าน
12. `POST /reset-password` — ตั้งรหัสผ่านใหม่

### 🛏️ Service #2: Room Inventory Service (18 APIs)
13. `GET /rooms` — รายการห้องพักทั้งหมด
14. `GET /rooms/:id` — ข้อมูลห้องพักรายห้อง
15. `POST /rooms` — เพิ่มห้องพักใหม่
16. `PUT /rooms/:id` — แก้ไขรายละเอียดห้องพัก
17. `DELETE /rooms/:id` — ลบหรือระงับการใช้ห้องพัก
18. `GET /rooms/:id/status` — ดึงสถานะปัจจุบันของห้อง
19. `PUT /rooms/:id/status` — ปรับปรุงสถานะห้องพัก
20. `GET /room-types` — รายการประเภทห้องพักทั้งหมด
21. `POST /room-types` — เพิ่มประเภทห้องพักใหม่
22. `PUT /room-types/:id` — แก้ไขประเภทห้องพักและราคา
23. `DELETE /room-types/:id` — ลบประเภทห้องพัก
24. `GET /rooms/available` — ค้นหาห้องว่างตามช่วงเวลา
25. `GET /floors` — รายชื่อชั้นทั้งหมดในโรงแรม
26. `GET /floors/:id/rooms` — รายการห้องพักประจำชั้น
27. `PUT /rooms/:id/maintenance` — ปรับห้องเข้าโหมดซ่อมบำรุง
28. `GET /rooms/:id/history` — ดูประวัติการเปลี่ยนสถานะห้อง
29. `POST /rooms/:id/amenities` — เพิ่มสิ่งอำนวยความสะดวกในห้อง
30. `DELETE /rooms/:id/amenities/:amenityId` — ลบสิ่งอำนวยความสะดวก

### 📋 Service #3: Reservation Service (24 APIs)
31. `GET /reservations` — รายการการจองทั้งหมด
32. `GET /reservations/:id` — รายละเอียดการจองรายรายการ
33. `POST /reservations` — สร้างการจองห้องพักล่วงหน้า
34. `PUT /reservations/:id` — แก้ไขข้อมูลการจอง
35. `DELETE /reservations/:id` — ลบข้อมูลการจอง
36. `POST /reservations/:id/check-in` — ดำเนินการเช็คอินเข้าพัก
37. `POST /reservations/:id/check-out` — ดำเนินการเช็คเอาท์คืนห้อง
38. `POST /reservations/:id/cancel` — ขอยกเลิกการจอง
39. `PUT /reservations/:id/modify-dates` — เปลี่ยนแปลงวันเข้าพัก/ออก
40. `GET /reservations/by-guest/:guestId` — ประวัติการจองตามรายชื่อแขก
41. `GET /reservations/by-room/:roomId` — ประวัติการจองตามห้องพัก
42. `GET /reservations/today-checkins` — รายการที่ต้องเช็คอินวันนี้
43. `GET /reservations/today-checkouts` — รายการที่ต้องเช็คเอาท์วันนี้
44. `POST /guests` — บันทึกประวัติแขกใหม่
45. `GET /guests` — รายชื่อแขกทั้งหมดในระบบ
46. `GET /guests/:id` — ข้อมูลแขกรายบุคคล
47. `PUT /guests/:id` — แก้ไขข้อมูลประวัติแขก
48. `DELETE /guests/:id` — ลบข้อมูลแขก
49. `POST /reservations/:id/extend-stay` — ขอขยายเวลาเข้าพัก
50. `POST /reservations/:id/upgrade-room` — ขออัปเกรดประเภทห้องพัก
51. `GET /reservations/calendar` — ข้อมูลตารางการจองแบบปฏิทิน
52. `POST /walk-in` — สร้างการจองและเช็คอินแบบ Walk-in
53. `GET /reservations/:id/invoice-preview` — ดูตัวอย่างบิลล่วงหน้า
54. `POST /reservations/:id/apply-discount` — ใช้โค้ดหรือบันทึกส่วนลด

### 🧼 Service #4: Housekeeping Service (21 APIs)
55. `GET /housekeeping/tasks` — รายการงานทำความสะอาดทั้งหมด
56. `GET /housekeeping/tasks/:id` — ข้อมูลงานทำความสะอาดรายรายการ
57. `POST /housekeeping/tasks` — สร้างงานทำความสะอาดด้วยมือ
58. `PUT /housekeeping/tasks/:id` — แก้ไขรายละเอียดงาน
59. `DELETE /housekeeping/tasks/:id` — ลบงานทำความสะอาด
60. `PUT /housekeeping/tasks/:id/assign` — มอบหมายงานให้พนักงานแม่บ้าน
61. `PUT /housekeeping/tasks/:id/complete` — บันทึกว่าทำความสะอาดเสร็จแล้ว
62. `GET /housekeeping/rooms-to-clean` — รายชื่อห้องที่ต้องทำความสะอาด
63. `GET /housekeeping/staff-assignments` — สรุปงานที่แม่บ้านแต่ละคนถืออยู่
64. `GET /housekeeping/staff` — รายชื่อพนักงานแม่บ้านทั้งหมด
65. `POST /housekeeping/staff` — เพิ่มพนักงานแม่บ้านเข้าระบบ
66. `PUT /housekeeping/staff/:id` — แก้ไขข้อมูลพนักงานแม่บ้าน
67. `GET /housekeeping/staff/:id/tasks` — รายการงานของแม่บ้านรายคน
68. `PUT /housekeeping/staff/:id/zone` — กำหนดโซนหรือชั้นที่รับผิดชอบ
69. `POST /housekeeping/tasks/:id/report-issue` — แจ้งปัญหา/สิ่งของชำรุด
70. `GET /housekeeping/schedule` — ตารางกะการทำงานของแม่บ้าน
71. `GET /housekeeping/outsource-contacts` — ดึงรายชื่อผู้ติดต่อคู่ค้า/ช่าง Outsource ทั้งหมด (รองรับฟิลเตอร์ category, is_emergency)
72. `GET /housekeeping/outsource-contacts/:id` — ดึงข้อมูลผู้ติดต่อ Outsource รายบุคคล/บริษัท
73. `POST /housekeeping/outsource-contacts` — เพิ่มข้อมูลคู่ค้า/ช่าง Outsource ใหม่ (เฉพาะ Admin)
74. `PUT /housekeeping/outsource-contacts/:id` — แก้ไขข้อมูลช่างและเงื่อนไขการติดต่อ (เฉพาะ Admin)
75. `DELETE /housekeeping/outsource-contacts/:id` — ระงับการใช้งานช่าง/คู่ค้า (Soft Delete: `is_active = 0`, เฉพาะ Admin)

### 🧾 Service #5: Billing Service (16 APIs)
76. `GET /bills` — รายการบิลทั้งหมด
77. `GET /bills/:id` — ข้อมูลบิลรายใบ
78. `POST /bills` — สร้างบิลใหม่
79. `PUT /bills/:id` — แก้ไขข้อมูลบิล
80. `POST /bills/:id/items` — เพิ่มรายการค่าใช้จ่ายเสริม (มินิบาร์/ซักรีด)
81. `DELETE /bills/:id/items/:itemId` — ลบรายการค่าใช้จ่าย
82. `POST /bills/:id/pay` — บันทึกการชำระเงิน
83. `GET /bills/:id/receipt` — พิมพ์/ดูใบเสร็จรับเงิน
84. `GET /bills/by-reservation/:reservationId` — ค้นหาบิลจากการจอง
85. `POST /bills/:id/refund` — ดำเนินการคืนเงิน
86. `POST /bills/:id/discount` — เพิ่มส่วนลดท้ายบิล
87. `GET /payment-methods` — ช่องทางการชำระเงินที่เปิดรับ
88. `POST /payment-methods` — เพิ่มช่องทางการชำระเงิน
89. `GET /invoices` — รายการใบแจ้งหนี้ทั้งหมด
90. `GET /invoices/:id` — ดูใบแจ้งหนี้รายใบ
91. `POST /invoices/:id/send-email` — ส่งใบแจ้งหนี้ให้แขกทางอีเมล

### 📊 Service #6: Report/Analytics Service (14 APIs)
92. `GET /reports/occupancy-rate` — สถิติอัตราการเข้าพัก (Occupancy Rate)
93. `GET /reports/revenue-daily` — รายงานสรุปรายได้รายวัน
94. `GET /reports/revenue-monthly` — รายงานสรุปรายได้รายเดือน
95. `GET /reports/revenue-by-room-type` — รายงานรายได้แยกตามประเภทห้อง
96. `GET /reports/top-rooms` — รายการห้องพักที่ทำรายได้สูงสุด
97. `GET /reports/avg-stay-duration` — จำนวนคืนที่เข้าพักเฉลี่ย
98. `GET /reports/cancellation-rate` — อัตราการยกเลิกการจอง
99. `GET /reports/housekeeping-performance` — รายงานประสิทธิภาพงานแม่บ้าน
100. `GET /reports/checkin-checkout-stats` — สถิติจำนวนเช็คอินและเช็คเอาท์
101. `GET /reports/guest-demographics` — สถิติสัญชาติและกลุ่มผู้เข้าพัก
102. `GET /dashboard/summary` — ข้อมูลสรุปภาพรวมสำหรับ Dashboard
103. `GET /reports/export/pdf` — ส่งออกรายงานเป็นไฟล์ PDF
104. `GET /reports/export/csv` — ส่งออกรายงานเป็นไฟล์ CSV
105. `GET /reports/custom` — ดึงข้อมูลรายงานแบบกำหนดช่วงเวลาเอง

---

## 17. 🗄️ โครงสร้างฐานข้อมูลและผังความสัมพันธ์ (Database Schema & ER Diagrams)

สถาปัตยกรรมใช้รูปแบบ **Database-per-Service** แยกฐานข้อมูล Cloudflare D1 อิสระ 6 ก้อน ไม่มีการสร้าง Foreign Key ข้ามก้อน แต่ใช้ Soft Reference ผ่าน UUID และมีตาราง `outbox_events` ในทุกก้อนที่ส่ง Event:

### 1. Auth/User Service (`db_auth_user`)
```mermaid
erDiagram
    users {
        text id PK "UUID v4"
        text email UK "อีเมลเข้าสู่ระบบ"
        text password_hash "bcrypt hash"
        text first_name
        text last_name
        text role "admin | manager | front_desk | housekeeping | billing"
        boolean is_active "Soft Delete"
        text last_login_at
        text created_at
        text updated_at
    }
    sessions {
        text id PK "UUID v4"
        text user_id FK "→ users.id"
        text refresh_token UK
        text expires_at
        boolean is_revoked
        text created_at
    }
    permissions {
        text id PK "UUID v4"
        text role "ตรงกับ users.role"
        text resource "rooms | reservations | bills | reports"
        text action "create | read | update | delete"
        text created_at
    }
    password_reset_tokens {
        text id PK "UUID v4"
        text user_id FK "→ users.id"
        text token UK
        text expires_at
        boolean is_used
        text created_at
    }
    outbox_events {
        text id PK "UUID v4"
        text event_type "UserCreated | RoleChanged"
        text aggregate_id "user_id"
        text aggregate_type "User"
        text payload "JSON"
        text status "pending | published | failed"
        text published_at
        text created_at
    }
    users ||--o{ sessions : "has active"
    users ||--o{ password_reset_tokens : "requests"
```

### 2. Room Inventory Service (`db_room`)
```mermaid
erDiagram
    room_types {
        text id PK "UUID v4"
        text name UK "Standard | Deluxe | Suite | Presidential"
        text description
        real base_price "ราคาฐานต่อคืน"
        integer max_occupancy
        text bed_type "single | double | twin | king"
        real size_sqm
        text created_at
        text updated_at
    }
    floors {
        text id PK "UUID v4"
        integer floor_number UK
        text name "Lobby | Fl.2-6"
        integer total_rooms
        text created_at
    }
    rooms {
        text id PK "UUID v4"
        text room_number UK "101 | 205"
        text room_type_id FK "→ room_types.id"
        text floor_id FK "→ floors.id"
        text status "available | reserved | occupied | checked_out | cleaning | maintenance | out_of_order"
        boolean is_active
        text notes
        text created_at
        text updated_at
    }
    room_amenities {
        text id PK "UUID v4"
        text room_id FK "→ rooms.id"
        text amenity_name "WiFi | Mini Bar | Bathtub"
        text description
        text created_at
    }
    room_status_history {
        text id PK "UUID v4"
        text room_id FK "→ rooms.id"
        text previous_status
        text new_status
        text changed_by "User ID"
        text change_reason
        text event_source "manual | event:ReservationCheckedIn"
        text created_at
    }
    outbox_events {
        text id PK "UUID v4"
        text event_type "RoomStatusChanged"
        text aggregate_id "room_id"
        text aggregate_type "Room"
        text payload "JSON"
        text status "pending | published | failed"
        text published_at
        text created_at
    }
    room_types ||--o{ rooms : "defines"
    floors ||--o{ rooms : "contains"
    rooms ||--o{ room_amenities : "has"
    rooms ||--o{ room_status_history : "tracks"
```

### 3. Reservation Service (`db_reservation`)
```mermaid
erDiagram
    guests {
        text id PK "UUID v4"
        text first_name
        text last_name
        text email
        text phone
        text id_card_number "บัตร ปชช. / Passport"
        text nationality
        text address
        text notes
        integer total_stays
        text created_at
        text updated_at
    }
    reservations {
        text id PK "UUID v4"
        text reservation_code UK "RES-20260918-001"
        text guest_id FK "→ guests.id"
        text room_id "Soft ref → Room"
        text room_number "Denormalized"
        text room_type_name "Denormalized"
        text status "confirmed | checked_in | checked_out | cancelled | extended"
        text booking_type "advance | walk_in"
        text check_in_date "YYYY-MM-DD"
        text check_out_date "YYYY-MM-DD"
        text actual_check_in
        text actual_check_out
        integer num_guests
        real nightly_rate
        integer total_nights
        real subtotal
        real discount_amount
        real tax_amount
        real total_amount
        text created_by "User ID"
        text created_at
        text updated_at
    }
    reservation_history {
        text id PK "UUID v4"
        text reservation_id FK "→ reservations.id"
        text action "created | checked_in | checked_out | cancelled | extended"
        text previous_data "JSON snapshot"
        text new_data "JSON snapshot"
        text performed_by "User ID"
        text created_at
    }
    outbox_events {
        text id PK "UUID v4"
        text event_type "ReservationCreated | ReservationCheckedIn | ReservationCheckedOut | ReservationCancelled"
        text aggregate_id "reservation_id"
        text aggregate_type "Reservation"
        text payload "JSON"
        text status "pending | published | failed"
        text published_at
        text created_at
    }
    guests ||--o{ reservations : "makes"
    reservations ||--o{ reservation_history : "has"
```

### 4. Housekeeping Service (`db_housekeeping`)
```mermaid
erDiagram
    housekeeping_staff {
        text id PK "UUID v4"
        text user_id "Soft ref → Auth"
        text first_name
        text last_name
        text phone
        text zone "Floor 1-3 | Floor 4-6"
        text shift "day | night"
        boolean is_active
        integer max_tasks_per_day
        text created_at
        text updated_at
    }
    housekeeping_tasks {
        text id PK "UUID v4"
        text room_id "Soft ref → Room"
        text room_number "Denormalized"
        text assigned_to FK "→ housekeeping_staff.id"
        text task_type "checkout_clean | daily_clean | deep_clean | inspection"
        text priority "urgent | high | normal | low"
        text status "pending | assigned | in_progress | completed | cancelled"
        text notes
        text scheduled_date
        text started_at
        text completed_at
        text event_source "event:ReservationCheckedOut"
        text created_at
        text updated_at
    }
    room_issues {
        text id PK "UUID v4"
        text task_id FK "→ housekeeping_tasks.id"
        text room_id "Soft ref → Room"
        text reported_by FK "→ housekeeping_staff.id"
        text issue_type "damage | missing_item | malfunction | hygiene"
        text description
        text severity "low | medium | high | critical"
        text status "open | acknowledged | resolved"
        text resolved_at
        text created_at
    }
    housekeeping_schedule {
        text id PK "UUID v4"
        text staff_id FK "→ housekeeping_staff.id"
        text schedule_date
        text shift
        text zone_assigned
        boolean is_day_off
        text created_at
    }
    outbox_events {
        text id PK "UUID v4"
        text event_type "HousekeepingTaskCompleted"
        text aggregate_id "task_id"
        text aggregate_type "HousekeepingTask"
        text payload "JSON"
        text status "pending | published | failed"
        text published_at
        text created_at
    }
    outsource_contacts {
        text id PK "UUID v4"
        text name "ชื่อช่างหรือชื่อบริษัท"
        text category "air_conditioning | plumbing | electrical | carpentry | general_maintenance | locksmith | pest_control | other"
        text service_type "ประเภทงานบริการ"
        text phone_primary "เบอร์โทรศัพท์หลัก"
        text phone_secondary "เบอร์สำรอง"
        text line_id "LINE ID สำหรับส่งรูปหน้างาน"
        integer is_emergency "1=ช่างด่วน 24 ชม., 0=เวลาทำการปกติ"
        text available_hours "ช่วงเวลาให้บริการ"
        text price_rate_note "อัตราค่าบริการประเมินเบื้องต้น"
        real rating "คะแนนความพึงพอใจ 1.0 - 5.0"
        text address "ที่อยู่/ที่ตั้งร้าน"
        text notes "หมายเหตุเพิ่มเติม"
        integer is_active "1=เปิดใช้งาน, 0=ระงับการจ้างงาน"
        text created_by "User ID (Admin ผู้สร้าง)"
        text created_at
        text updated_at
    }
    housekeeping_staff ||--o{ housekeeping_tasks : "assigned to"
    housekeeping_staff ||--o{ room_issues : "reports"
    housekeeping_staff ||--o{ housekeeping_schedule : "scheduled in"
    housekeeping_tasks ||--o{ room_issues : "discovers"
    room_issues ||--o{ outsource_contacts : "coordinates repairs"
```

### 5. Billing Service (`db_billing`)
```mermaid
erDiagram
    bills {
        text id PK "UUID v4"
        text bill_number UK "BILL-20260918-001"
        text reservation_id "Soft ref → Reservation"
        text guest_name "Denormalized"
        text room_number "Denormalized"
        real subtotal
        real discount_amount
        real tax_rate "0.07"
        real tax_amount
        real service_charge "0.10"
        real total_amount
        real amount_paid
        real amount_due
        text status "pending | partially_paid | paid | refunded | void"
        text created_at
        text updated_at
    }
    bill_items {
        text id PK "UUID v4"
        text bill_id FK "→ bills.id"
        text item_type "room_charge | minibar | laundry | room_service | damage"
        text description
        integer quantity
        real unit_price
        real total_price
        text date
        text created_at
    }
    payments {
        text id PK "UUID v4"
        text bill_id FK "→ bills.id"
        text payment_method_id FK "→ payment_methods.id"
        real amount
        text reference_number
        text status "completed | failed | refunded"
        text paid_at
        text created_at
    }
    payment_methods {
        text id PK "UUID v4"
        text name UK "Cash | Credit Card | PromptPay QR | Bank Transfer"
        text code UK "CASH | CC | QR | BANK"
        boolean is_active
        text created_at
    }
    invoices {
        text id PK "UUID v4"
        text invoice_number UK "INV-20260918-001"
        text bill_id FK "→ bills.id"
        text issued_to_name
        text issued_to_email
        real total_amount
        text status "draft | issued | sent | void"
        text sent_at
        text created_at
    }
    outbox_events {
        text id PK "UUID v4"
        text event_type "BillPaid"
        text aggregate_id "bill_id"
        text aggregate_type "Bill"
        text payload "JSON"
        text status "pending | published | failed"
        text published_at
        text created_at
    }
    bills ||--o{ bill_items : "contains"
    bills ||--o{ payments : "receives"
    bills ||--o| invoices : "issues"
    payment_methods ||--o{ payments : "used in"
```

### 6. Report/Analytics Service (`db_report`)
```mermaid
erDiagram
    daily_stats {
        text id PK "UUID v4"
        text date UK "YYYY-MM-DD"
        integer total_rooms
        integer occupied_rooms
        integer available_rooms
        integer reserved_rooms
        integer maintenance_rooms
        real occupancy_rate "occupied / total * 100"
        integer total_checkins
        integer total_checkouts
        integer total_cancellations
        integer total_walk_ins
        text created_at
        text updated_at
    }
    revenue_records {
        text id PK "UUID v4"
        text date "YYYY-MM-DD"
        text reservation_id "Soft ref → Reservation"
        text bill_id "Soft ref → Billing"
        text room_type_name
        text revenue_type "room_charge | service | refund"
        real amount
        text payment_method
        text created_at
    }
    monthly_summary {
        text id PK "UUID v4"
        text year_month UK "YYYY-MM"
        real total_revenue
        real net_revenue
        real avg_occupancy_rate
        integer total_reservations
        real cancellation_rate
        real avg_stay_duration
        integer total_guests
        text created_at
        text updated_at
    }
    room_performance {
        text id PK "UUID v4"
        text room_id "Soft ref → Room"
        text room_number
        text room_type_name
        text year_month "YYYY-MM"
        integer total_bookings
        integer total_nights_sold
        real total_revenue
        text created_at
        text updated_at
    }
    housekeeping_performance {
        text id PK "UUID v4"
        text staff_id "Soft ref → Housekeeping"
        text staff_name
        text year_month
        integer tasks_completed
        real avg_completion_minutes
        integer issues_reported
        text created_at
        text updated_at
    }
    event_log {
        text id PK "UUID v4"
        text event_type
        text source_service
        text payload "JSON"
        boolean processed
        text processed_at
        text created_at
    }
```

### 7. ผังความสัมพันธ์ฐานข้อมูลภาพรวมทั้งระบบ (Global Conceptual ERD - Unified Architecture)
> **วัตถุประสงค์:** แสดงภาพรวมของ Entity ทั้ง 6 Microservices ในผังเดียว พร้อมเส้นโยงความสัมพันธ์ทางตรรกะ (Logical Soft Reference) ระหว่างโดเมน เพื่อให้อาจารย์และผู้ประเมินเห็นภาพความเชื่อมโยงของข้อมูลทั้งระบบอย่างชัดเจน

```mermaid
erDiagram
    %% Service 1: Auth
    users {
        text id PK "UUID"
        text email UK
        text role "admin | manager | front_desk | housekeeping"
    }

    %% Service 2: Room
    rooms {
        text id PK "UUID"
        text room_number UK
        text room_type_id FK
        text status "available | reserved | occupied | checked_out | cleaning | maintenance | out_of_order"
    }
    room_types {
        text id PK "UUID"
        text name "Standard | Deluxe | Suite | Presidential"
        real base_price
    }

    %% Service 3: Reservation
    guests {
        text id PK "UUID"
        text first_name
        text last_name
        text phone
    }
    reservations {
        text id PK "UUID"
        text booking_number UK
        text guest_id FK "→ guests.id"
        text room_id "Soft ref → rooms.id"
        text check_in_date
        text check_out_date
        text status "confirmed | checked_in | checked_out | cancelled"
    }

    %% Service 4: Housekeeping & Facility Maintenance
    housekeeping_tasks {
        text id PK "UUID"
        text room_id "Soft ref → rooms.id"
        text task_type "checkout_clean | daily_clean | deep_clean"
        text status "pending | assigned | in_progress | completed"
    }
    room_issues {
        text id PK "UUID"
        text room_id "Soft ref → rooms.id"
        text issue_type "damage | malfunction | plumbing | electrical"
        text severity "low | medium | high | critical"
        text status "open | acknowledged | resolved"
    }
    outsource_contacts {
        text id PK "UUID"
        text name "ชื่อช่างหรือชื่อบริษัท"
        text category "air_conditioning | plumbing | electrical | carpentry | locksmith | other"
        text phone_primary
        integer is_emergency "1=ช่างด่วน 24 ชม., 0=ปกติ"
        integer is_active "1=ใช้งาน, 0=ระงับ"
        text created_by "Soft ref → users.id (Admin)"
    }

    %% Service 5: Billing
    bills {
        text id PK "UUID"
        text bill_number UK
        text reservation_id "Soft ref → reservations.id"
        real total_amount
        real deposit_deducted
        real amount_due
        text status "pending | paid | void"
    }
    bill_items {
        text id PK "UUID"
        text bill_id FK "→ bills.id"
        text item_type "room_charge | minibar | damage"
        real total_price
    }
    payments {
        text id PK "UUID"
        text bill_id FK "→ bills.id"
        real amount
        text payment_method "cash | promptpay | credit_card"
    }

    %% Service 6: Report
    daily_stats {
        text id PK "UUID"
        text date UK "YYYY-MM-DD"
        real occupancy_rate
        integer total_checkins
        integer total_checkouts
    }

    %% Cross-Service Logical & Physical Relationships
    room_types ||--o{ rooms : "defines"
    guests ||--o{ reservations : "books"
    rooms ||--o{ reservations : "allocated in"
    reservations ||--o{ bills : "generates financial bill"
    bills ||--o{ bill_items : "contains"
    bills ||--o{ payments : "settled by"
    rooms ||--o{ housekeeping_tasks : "cleaned by"
    rooms ||--o{ room_issues : "reported on"
    room_issues ||--o{ outsource_contacts : "repairs coordinated with"
    users ||--o{ outsource_contacts : "admin manages master data"
    reservations ||--o{ daily_stats : "aggregates into"
```

---

## 18. 🎯 การออกแบบหน้าจอ (UI Prototype & Wireframe)

หน้าจอระบบแบ่งออกเป็น 3 ส่วนการทำงานหลักตามบทบาทของผู้ใช้งาน โดยทำงานบน Layout กลางร่วมกัน:

1.  **Front Desk Operations Portal:**
    *   **Room Status Grid & List:** แสดงสถานะห้องพักทั้ง 7 สถานะด้วยสีเฉพาะตัวแบบ Real-time พร้อมฟังก์ชันกรองตามชั้นและประเภทห้อง
    *   **Quick Booking / Walk-in Modal:** ฟอร์มสร้างการจองและเช็คอินแบบด่วนในหน้าเดียว พร้อมตรวจสอบห้องว่างทันที
    *   **Check-in & Check-out Action Drawer:** แผงควบคุมด้านข้างสำหรับตรวจบัตรประชาชน มอบหมายคีย์การ์ด และดูตัวอย่างใบแจ้งหนี้ (Invoice Preview)
    *   **Quick Emergency Outsource Drawer:** แผงลิ้นชักด้านข้างสำหรับค้นหาและโทรติดต่อช่าง Outsource ฉุกเฉิน 24 ชม. (แอร์เสีย, ประปาแตก, ไฟฟ้าลัดวงจร) พร้อมปุ่มคลิกโทรออกและคัดลอกเบอร์/LINE ID เพื่อแก้ปัญหาเฉพาะหน้าให้แขกได้ทันท่วงที
2.  **Housekeeping Management Portal:**
    *   **Task Kanban Board:** บอร์ดแบ่งสถานะงานทำความสะอาด (รอมอบหมาย → กำลังทำ → เสร็จสิ้น)
    *   **Staff Assignment Modal:** มอบหมายงานตามชั้นและโซนความรับผิดชอบ
    *   **Report Issue Form:** แบบฟอร์มแจ้งห้องชำรุดพร้อมระบุระดับความรุนแรง (Low, Medium, High, Critical)
    *   **Quick Technician Contact Modal:** ป็อปอัปค้นหาเบอร์ช่างเฉพาะทางเพื่อประสานงานซ่อมหน้างานควบคู่กับการเปิดใบงานแจ้งชำรุด (Report Issue)
3.  **Manager / Executive Dashboard:**
    *   **KPI Cards:** การ์ดตัวเลขสรุป Occupancy Rate วันนี้, รายได้รวมประจำวัน, ห้องพร้อมขาย และจำนวนเช็คอิน/เช็คเอาท์
    *   **Revenue & Occupancy Trend Charts:** กราฟเส้นและกราฟแท่งแสดงแนวโน้มอัตราการเข้าพักและรายได้ย้อนหลัง 30 วัน
    *   **Outsource Master Data Management Table:** ตารางบริหารจัดการคู่ค้าและช่าง Outsource (Full CRUD: เพิ่ม/แก้ไข/ระงับการจ้าง `is_active = 0`) และกำหนดหมวดหมู่/แท็กช่างด่วน
    *   **Export Center:** ปุ่มคลิกเดียวสำหรับดาวน์โหลดรายงานภาพรวมในรูปแบบ PDF และ CSV

---

## 19. ⚙️ การทดสอบการยอมรับของผู้ใช้ (User Acceptance Testing: UAT)

**โครงงาน:** Hotel Management System (Microservice Architecture สำหรับโรงแรมขนาดเล็ก 5–10 ห้อง)  
**รูปแบบการทดสอบ:** Manual UAT & Functional Integration Testing ผ่าน Postman และ UI Prototype  
**กลุ่มผู้ทดสอบ:** Front Desk Staff & Cashier, Housekeeping Staff, Hotel Manager / Admin

### ตารางกรณีทดสอบ (UAT Test Cases)

#### 🧑‍💼 1. Front Desk Staff (UAT-FD)
| รหัสทดสอบ | ฟีเจอร์ที่ทดสอบ | ขั้นตอนการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์จริง | สถานะ |
|---|---|---|---|---|:---:|
| **UAT-FD01** | Check Room Status | เปิดหน้า Room Grid เลือกฟิลเตอร์ชั้น 2 | แสดงห้องพักชั้น 2 พร้อมสีสถานะถูกต้องตาม State Machine | แสดงห้องชั้น 2 ถูกต้อง พร้อมสีสถานะชัดเจน | **Pass** |
| **UAT-FD02** | Create Advance Booking | จองห้อง Deluxe ล่วงหน้า 3 วัน ระบุชื่อแขก | ระบบสร้างการจอง บันทึกลง DB และส่ง Event ปรับสถานะห้องเป็น `reserved` | การจองสร้างสำเร็จ สถานะห้องเปลี่ยนเป็น reserved | **Pass** |
| **UAT-FD03** | Check-in Success | เลือกรายการจองที่ confirmed แล้วกด "Check-in" | สถานะการจองเปลี่ยนเป็น `checked_in` ห้องเปลี่ยนเป็น `occupied` | เช็คอินสำเร็จ ข้อมูลอัปเดตทั้งสองเซอร์วิส | **Pass** |
| **UAT-FD04** | Check-in Invalid | พยายามเช็คอินรายการจองที่ถูกยกเลิกไปแล้ว | ระบบปฏิเสธพร้อมแสดงข้อความ "ไม่สามารถเช็คอินได้" | ระบบแจ้งเตือนปฏิเสธตามที่คาดหวัง | **Pass** |
| **UAT-FD05** | Check-out Fan-out | กด "Check-out" ห้องที่เข้าพักอยู่ | ระบบเปลี่ยนสถานะห้อง ส่ง Event Fan-out ให้แม่บ้านสร้าง Task และการเงินสร้างบิล | งานแม่บ้านและบิลถูกสร้างขึ้นโดยอัตโนมัติ | **Pass** |
| **UAT-FD06** | Walk-in Booking | ทำรายการ Walk-in แขกที่หน้าเคาน์เตอร์ | สร้างการจองและเช็คอินสำเร็จในขั้นตอนเดียว ห้องเปลี่ยนเป็น `occupied` | ทำรายการสำเร็จในขั้นตอนเดียว | **Pass** |
| **UAT-FD07** | Quick Emergency Outsource Contact | เปิด Quick Emergency Contact Drawer กรองหมวด 'แอร์' และ 'ประปา' | แสดงรายชื่อช่างด่วน 24 ชม. พร้อมปุ่มโทรออกและ LINE ID ทันที | ค้นหาและคัดลอกข้อมูลช่างฉุกเฉินได้ในคลิกเดียว | **Pass** |

#### 🧹 2. Housekeeping Staff (UAT-HK)
| รหัสทดสอบ | ฟีเจอร์ที่ทดสอบ | ขั้นตอนการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์จริง | สถานะ |
|---|---|---|---|---|:---:|
| **UAT-HK01** | Auto Task Creation | ตรวจสอบหน้ารายการงานหลังมีห้องเช็คเอาท์ | ปรากฏ Task ทำความสะอาดประเภท `checkout_clean` สถานะ `pending` | Task ใหม่ปรากฏขึ้นทันทีหลังเช็คเอาท์ | **Pass** |
| **UAT-HK02** | Assign Task | หัวหน้าแม่บ้านเลือกงานและมอบหมายให้แม่บ้านรายคน | Task อัปเดตสถานะเป็น `assigned` พร้อมระบุชื่อผู้รับผิดชอบ | มอบหมายงานสำเร็จและแสดงในบอร์ด | **Pass** |
| **UAT-HK03** | Complete Cleaning | แม่บ้านกด "Complete" หลังทำความสะอาดเสร็จ | Task อัปเดตเป็น `completed` และห้องพักในระบบคืนสถานะเป็น `available` | ห้องพักกลับมาเป็น available พร้อมขายทันที | **Pass** |
| **UAT-HK04** | Report Issue | แจ้งสิ่งของชำรุด (ก๊อกน้ำรั่ว) ระดับ High | ระบบบันทึก Issue และปรับสถานะห้องเป็น `maintenance` | ห้องถูกปรับเป็น maintenance และปิดรับการจอง | **Pass** |
| **UAT-HK05** | Quick Outsource Contact for Repairs | เปิดสมุดเบอร์ช่างจากหน้างานห้องชำรุด ค้นหาช่างประปา/ไฟ | แสดงเบอร์ติดต่อและเวลาให้บริการ เพื่อโทรนัดช่างเข้าหน้างานควบคู่กับ Report Issue | แสดงข้อมูลช่างเฉพาะทางถูกต้องและโทรออกได้ | **Pass** |
| **UAT-HK06** | View Shift Schedule | เปิดหน้าตารางกะการทำงานของพนักงานแม่บ้าน | แสดงตารางการเข้าเวร โซน และชั้นที่รับผิดชอบอย่างชัดเจน | ตารางงานแสดงผลครบถ้วนตามกะ | **Pass** |

#### 🧾 3. Front Desk Cashiering & Billing (UAT-BL — ดำเนินการโดย Front Desk Staff)
| รหัสทดสอบ | ฟีเจอร์ที่ทดสอบ | ขั้นตอนการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์จริง | สถานะ |
|---|---|---|---|---|:---:|
| **UAT-BL01** | Auto Bill Creation | ตรวจสอบรายการบิลหลังมีห้องเช็คเอาท์ | พบใบแจ้งหนี้ใหม่ที่รวมค่าห้องตามจำนวนคืน พร้อมภาษี 7% ถูกต้อง | บิลถูกสร้างอัตโนมัติพร้อมคำนวณภาษีถูกต้อง | **Pass** |
| **UAT-BL02** | Add Extra Item | เพิ่มรายการค่ามินิบาร์ 250 บาทลงในบิล | ยอดรวมของบิลอัปเดตเพิ่มขึ้น 250 บาท พร้อมบันทึกประวัติ | ยอดรวมอัปเดตถูกต้องตามรายการที่เพิ่ม | **Pass** |
| **UAT-BL03** | Payment Processing | รับชำระเงินเต็มจำนวนด้วยบัตรเครดิต | สถานะบิลเปลี่ยนเป็น `paid` ยอดคงค้างเป็น 0 และส่ง Event ไปยัง Report | ชำระเงินสำเร็จ บันทึกลงประวัติเรียบร้อย | **Pass** |
| **UAT-BL04** | Issue Receipt | กดปุ่มออกใบเสร็จรับเงินสำหรับบิลที่จ่ายแล้ว | แสดงหน้าใบเสร็จรับเงินพร้อมเลขอ้างอิงและรายละเอียดครบถ้วน | ใบเสร็จแสดงผลถูกต้องสมบูรณ์ | **Pass** |
| **UAT-BL05** | Process Deposit Refund | คืนเงินมัดจำค่ากุญแจ/ห้องพักให้แขกเมื่อตรวจห้องผ่าน | ยอดมัดจำถูกหักลบและบันทึกสถานะการคืนเงินถูกต้อง | การคืนเงินบันทึกสำเร็จและยอดบัญชีตรง | **Pass** |

#### 📊 4. Manager / Admin (UAT-MGR)
| รหัสทดสอบ | ฟีเจอร์ที่ทดสอบ | ขั้นตอนการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์จริง | สถานะ |
|---|---|---|---|---|:---:|
| **UAT-MGR01**| View KPI Dashboard | เข้าหน้า Dashboard ผู้บริหาร | แสดง Occupancy Rate, รายได้รวม และยอดเช็คอิน/เอาท์ตรงตามข้อมูลจริง | Dashboard แสดงผลข้อมูล Real-time ถูกต้อง | **Pass** |
| **UAT-MGR02**| Access Control Guard | ใช้บัญชีพนักงานแม่บ้านพยายามเข้า URL หน้า Admin | ระบบปฏิเสธการเข้าถึงและ Redirect กลับหน้าของตนเอง | ติดสิทธิ์ RBAC ไม่สามารถเข้าหน้า Admin ได้ | **Pass** |
| **UAT-MGR03**| Export Report CSV | กดปุ่ม Export รายงานรายได้รายเดือนเป็น CSV | ดาวน์โหลดไฟล์ CSV ที่มีข้อมูลครบทุกคอลัมน์และเปิดอ่านได้ | ไฟล์ CSV ถูกดาวน์โหลดและข้อมูลถูกต้อง | **Pass** |
| **UAT-MGR04**| Export Report PDF | กดปุ่ม Export รายงานอัตราการเข้าพักเป็น PDF | ได้เอกสาร PDF รูปแบบมาตรฐานสำหรับใช้รายงานที่ประชุม | เอกสาร PDF ถูกสร้างขึ้นพร้อมฟอร์แมตที่อ่านง่าย | **Pass** |
| **UAT-MGR05**| Manage Outsource Master Data | Admin เพิ่มช่างแอร์ใหม่ แก้ไขเบอร์ และทดสอบระงับการใช้งาน (`is_active = 0`) | ช่างใหม่ถูกบันทึกลง D1 และเมื่อปิดใช้งานจะไม่แสดงในสมุดเบอร์ของ Front Desk | จัดการ Master Data ได้ถูกต้องและปลอดภัย | **Pass** |
| **UAT-MGR06**| Room Type & Rate Configuration | ปรับเปลี่ยนราคาฐานของห้องประเภท Deluxe | อัตราค่าห้องใหม่มีผลกับการคำนวณการจองรอบถัดไปทันที | อัตราค่าบริการอัปเดตเรียบร้อย | **Pass** |

### ตารางสรุปผลการทดสอบ UAT (UAT Summary)

| กลุ่มผู้ใช้งาน (Role) | จำนวน Test Cases | ผ่าน (Pass) | ไม่ผ่าน (Fail) | คิดเป็นร้อยละ |
|---|:---:|:---:|:---:|:---:|
| **Front Desk Staff & Cashier (จอง/เช็คอิน/เช็คเอาท์/ช่างฉุกเฉิน)** | 7 | 7 | 0 | 100% |
| **Front Desk Staff & Cashier (การเงิน/บิล/มินิบาร์/มัดจำ)** | 5 | 5 | 0 | 100% |
| **Housekeeping Staff (ทำความสะอาด/แจ้งชำรุด/เบอร์ช่าง)** | 6 | 6 | 0 | 100% |
| **Manager / Admin (แดชบอร์ด/RBAC/Outsource Master Data/ส่งออก)** | 6 | 6 | 0 | 100% |
| **รวมทั้งหมด** | **24** | **24** | **0** | **100%** |

---

## 20. 🖼️ ผลลัพธ์ที่คาดว่าจะได้รับ (Expected Outcomes)

1.  **ได้ระบบบริหารจัดการโรงแรมหลังบ้านที่ทำงานได้จริง (Functional 100%):** ครอบคลุมวงจรชีวิตห้องพักตั้งแต่วางแผนจอง เช็คอิน แม่บ้านทำความสะอาด คิดเงิน ออกบิล จัดการคู่ค้า Outsource ซ่อมบำรุง และวิเคราะห์ข้อมูล โดยเชื่อมต่อกันครบถ้วนทั้ง 105 Microservice APIs
2.  **สถาปัตยกรรม Serverless Microservices ที่มีความทนทานสูง (High Resilience):** การประยุกต์ใช้ Cloudflare Workers, D1 และ Queues ร่วมกับ Outbox Pattern ช่วยให้ระบบรองรับการทำงานแบบ Decoupled เมื่อเซอร์วิสใดเซอร์วิสหนึ่งขัดข้อง ข้อความในคิวจะไม่สูญหายและรอการประมวลผลซ้ำอัตโนมัติ
3.  **แก้ปัญหาคอขวดของโรงแรมขนาดเล็กด้วย Outsource Directory:** โรงแรมขนาดเล็ก 5–10 ห้องสามารถดำเนินงานได้อย่างราบรื่นโดยไม่ต้องแบกรับต้นทุนจ้างช่างประจำตลอดเวลา ด้วยระบบ Quick Emergency Contact สำหรับ Front Desk และ Housekeeping ที่เข้าถึงช่างซ่อมบำรุงภายนอกได้ทันใจเมื่อเกิดเหตุฉุกเฉิน
4.  **ลดความผิดพลาดและเพิ่มความเร็วในการปฏิบัติงานของโรงแรม:** พนักงานต้อนรับรับทราบสถานะความพร้อมของห้องพักได้ทันที แม่บ้านได้รับงานทำความสะอาดอัตโนมัติหลังเช็คเอาท์ และแผนกการเงินลดความผิดพลาดในการคำนวณบิลด้วยระบบอัตโนมัติ
5.  **ได้ฐานโค้ดและชุดเอกสารทางวิศวกรรมซอฟต์แวร์ที่สมบูรณ์:** โครงสร้างโค้ดเป็นระเบียบตามหลัก Clean Architecture พร้อมเอกสาร System Specification, Sequence Diagrams, ERDs และ OpenAPI ครบถ้วนตามมาตรฐานวิชาชีพ

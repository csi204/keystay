# 🏨 Hotel Management System — Project Design Document & Specification[cite: 7]

> ## โครงงานระบบบริหารจัดการโรงแรมหลังบ้าน (Internal Hotel Operations & Back-Office)[cite: 7]
> สถาปัตยกรรม Microservices บน Serverless Stack (Cloudflare Workers, D1, Upstash QStash, KV) รวม 105 APIs[cite: 1, 7]  
> ออกแบบเฉพาะสำหรับ**ระบบบริหารจัดการภายในโรงแรมขนาดเล็ก 5–10 ห้อง (Boutique Hotel / Poshtel)**  
> รวมบทบาทพนักงานต้อนรับและแคชเชียร์เป็นหนึ่งเดียว (Front Desk Staff & Cashier): **Front Desk Staff & Cashier, Housekeeping Staff, Manager, Admin**[cite: 1, 6, 7]

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
12. [🏗️ แผนภาพคลาส (Class Diagram)](#12-แผนภาพคลาส-class-diagram)
13. [🖥️ สถาปัตยกรรมระบบ (System Architecture & Event-Driven Patterns)](#13-สถาปัตยกรรมระบบ-system-architecture--event-driven-patterns)
14. [🔄 วงจรชีวิตสถานะห้องพัก (Room Lifecycle State Machine)](#14-วงจรชีวิตสถานะห้องพัก-room-lifecycle-state-machine)
15. [🔁 แผนผังลำดับการทำงานหลัก (Sequence Diagrams - 5 Flows)](#15-แผนผังลำดับการทำงานหลัก-sequence-diagrams)
16. [📋 รายการ API ทั้งหมด (105 Microservice Endpoints)](#16-รายการ-api-ทั้งหมด-105-microservice-endpoints)
17. [🗄️ โครงสร้างฐานข้อมูลและผังความสัมพันธ์ (Database Schema & ER Diagrams)](#17-โครงสร้างฐานข้อมูลและผังความสัมพันธ์-database-schema--er-diagrams)
18. [🎯 การออกแบบหน้าจอ (UI Prototype & Wireframe)](#18-การออกแบบหน้าจอ-ui-prototype--wireframe)
19. [⚙️ การทดสอบการยอมรับของผู้ใช้ (User Acceptance Testing: UAT)](#19-การทดสอบการยอมรับของผู้ใช้-user-acceptance-testing-uat)
20. [🖼️ ผลลัพธ์ที่คาดว่าจะได้รับ (Expected Outcomes)](#20-ผลลัพธ์ที่คาดว่าจะได้รับ-expected-outcomes)

---

## 1. 🤼 ผู้จัดทำ (Contributors)

*   **คน A (เขตโสภณ อินอุตออน)** — Project Manager (PM) + Infra/DevOps Lead[cite: 1, 7]
*   **คน B (ธีรภัทร เนียมสุวรรณ)** — System Analyst (SA) + Backend Developer[cite: 1, 7]
*   **คน C (ปวริศ ธรรมวงษ์)** — Tester / QA Lead + Backend Developer[cite: 1, 7]

---

## 2. 💭 หลักการและเหตุผล (Rationale & Problem Statement)

ระบบจองโรงแรมทั่วไปที่พบเห็นได้บ่อยในตลาด (เช่น Booking.com, Agoda) มักเน้นมุมมอง **"ฝั่งลูกค้า" (B2C)** เช่น การค้นหาห้องพัก เปรียบเทียบราคา ชำระเงิน และรอรับการยืนยัน ซึ่งฟังก์ชันหลังบ้านส่วนใหญ่เป็นเพียง CRUD พื้นฐาน[cite: 7]

โครงงานนี้จึงเลือกมุมมองที่ตอบโจทย์เฉพาะเจาะจง คือมุมมอง **"ฝั่งเจ้าของและพนักงานปฏิบัติการโรงแรมขนาดเล็ก 5–10 ห้อง" (B2B / Small-Scale Hotel Operations)** ซึ่งเป็นระบบแกนหลักหลังบ้าน (Back-Office Operating System):
ในโรงแรมขนาดเล็ก 5–10 ห้อง (Boutique Hotel / Poshtel / เกสต์เฮาส์) จะไม่มีเคาน์เตอร์การเงินหรือพนักงานบัญชีแยกต่างหาก แต่พนักงานต้อนรับเพียงคนเดียวจะทำหน้าที่ควบทั้งการต้อนรับและงานแคชเชียร์แบบครบวงจร (Front Desk Staff & Cashier) ประสานงานร่วมกับแม่บ้าน (Housekeeping) และผู้บริหาร (Management) แบบ Real-time ตลอด 24 ชั่วโมง[cite: 1, 7]:

1.  **State Machine ของห้องพักมีความซับซ้อนและหมุนเวียนต่อเนื่อง:** สถานะห้องพักในโรงแรมมีวงจรชีวิตที่ชัดเจน (`ว่าง` → `จองแล้ว` → `เข้าพัก` → `เช็คเอาท์` → `รอทำความสะอาด` → `พร้อมใช้` หรือ `ส่งซ่อมบำรุง`) การเปลี่ยนสถานะในแต่ละจังหวะต้องควบคุมด้วย Business Logic ที่รัดกุมเพื่อป้องกันการจองซ้อน (Double Booking)[cite: 7]
2.  **ตอบโจทย์ Use Case จริงในธุรกิจที่มีการส่งต่องานข้ามแผนก:** เมื่อลูกค้าเช็คเอาท์ แผนกต้อนรับต้องแจ้งแผนกแม่บ้านเข้าทำความสะอาดทันที ระบบการเงินต้องสร้างบิลรอรวมยอดมินิบาร์ และระบบรายงานต้องบันทึกสถิติเพื่อนำไปวิเคราะห์ Occupancy Rate โดยกระบวนการเหล่านี้ไม่ควรหยุดชะงักหากระบบใดระบบหนึ่งทำงานช้า[cite: 1, 7]
3.  **เป็นกรณีศึกษาที่สะท้อนศักยภาพของ Microservices Architecture อย่างแท้จริง:** ความเชื่อมโยงข้ามแผนกนี้เปิดโอกาสให้ประยุกต์ใช้แนวคิดระดับสูง เช่น **Database-per-Service** (แยกฐานข้อมูล D1 อิสระ 6 ก้อน), **Outbox Pattern** (ป้องกันข้อมูลสูญหายขณะส่งข้อความข้าม Service) และ **Asynchronous Event Bus** ผ่าน Upstash QStash ที่ทำงานแบบ True Pub/Sub 1:N Fan-out ไร้การพึ่งพากันโดยตรง[cite: 1, 7]

---

## 3. 🗃️ วัตถุประสงค์ของโครงงาน (Objectives)

1.  เพื่อออกแบบและพัฒนาระบบบริหารจัดการโรงแรมหลังบ้านด้วยสถาปัตยกรรม **Microservices Architecture** ครอบคลุม 6 เซอร์วิสหลัก และมีจำนวน API รวม 105 Endpoints[cite: 1, 7]
2.  เพื่อพัฒนาระบบจัดการวงจรชีวิตห้องพัก (Room Lifecycle & State Machine) งานจอง งานเช็คอิน/เช็คเอาท์ งานทำความสะอาด ระบบบิล และระบบรายงานสถิติแบบ Real-time[cite: 7]
3.  เพื่อประยุกต์ใช้แพตเทิร์นสถาปัตยกรรมระดับสูง ได้แก่ **Database-per-Service**, **Outbox Pattern**, และ **Asynchronous Event-Driven Messaging (True 1:N Fan-out Pub/Sub via Webhooks)** บน Serverless Infrastructure[cite: 1, 7]
4.  เพื่อศึกษาการทำงานของ Cloudflare Workers, Cloudflare D1 (Serverless SQLite), Cloudflare KV และ Upstash QStash ในการพัฒนาระบบที่รองรับการ Deploy แยกกันได้อย่างอิสระ (Independent Deployability) และมีความทนทานสูง (Resilience)[cite: 1, 7]

---

## 4. 📑 ขอบเขตของระบบและความต้องการ (System Scope & Requirements)

### ผู้ใช้งานระบบ (Actors & Roles)
ระบบควบคุมการเข้าถึงด้วย **Role-Based Access Control (RBAC) 4 บทบาทหลัก**:
*   **พนักงานต้อนรับและแคชเชียร์ (Front Desk Staff & Cashier — `role=front_desk`):** รวมหน้าที่ต้อนรับและการเงินเข้าด้วยกันสำหรับโรงแรมขนาดเล็ก (5–10 ห้อง) — เช็คห้องว่าง, จัดการการจองล่วงหน้า, เช็คอิน, เช็คเอาท์, รับ Walk-in, ขยายเวลาพัก, อัปเกรดห้อง, คิดเงินค่าห้อง/มินิบาร์, หักเงินมัดจำ, ออกใบเสร็จรับเงิน และดำเนินการคืนเงิน *(ไม่มี Role พนักงานบัญชีแยกต่างหาก เพื่อความคล่องตัวในการปฏิบัติงานหน้าเคาน์เตอร์)* พร้อมสิทธิ์ **Read-Only สำหรับสมุดเบอร์ติดต่อ Outsource ฉุกเฉิน 24 ชม.** เพื่อโทรเรียกช่างซ่อมบำรุงด่วน (แอร์เสีย, ส้วมตัน, ท่อแตก) ได้ทันทีเมื่อแขกร้องเรียน[cite: 1, 6, 7]
*   **พนักงานแม่บ้าน (Housekeeping Staff — `role=housekeeping`):** รับมอบหมายงานทำความสะอาด, เปลี่ยนสถานะงาน, ตรวจสอบสภาพห้อง, รายงานสิ่งของชำรุด พร้อมสิทธิ์ **Read-Only สำหรับสมุดเบอร์ช่าง Outsource เฉพาะทาง** เพื่อประสานงานซ่อมหน้างานควบคู่กับการเปิดใบงาน Issue[cite: 7]
*   **ผู้จัดการ (Manager — `role=manager`):** ตรวจสอบภาพรวมการดำเนินงาน, จัดการประเภทห้องพักและอัตราค่าบริการ, ติดตาม Occupancy Rate และรายงานรายได้[cite: 7]
*   **ผู้ดูแลระบบ (Admin — `role=admin`):** กำหนดสิทธิ์และบัญชีผู้ใช้งาน, ตั้งค่าระบบความปลอดภัย, ดูแลภาพรวมของระบบทั้งหมด โดย **Admin เป็นผู้มีสิทธิ์ Full CRUD จัดการ Master Data ข้อมูลคู่ค้าและช่าง Outsource ภายนอก** (เพิ่ม, แก้ไข, ระงับการใช้งาน `is_active = 0`) เพื่อป้องกันข้อมูลเบอร์ติดต่อสูญหายหรือถูกแก้ไขโดยไม่ได้รับอนุญาต[cite: 7]

1.  **ระบบสิทธิ์ และการยืนยันตัวตน (Auth & User Management):** ระบบเข้าสู่ระบบจุดเดียว (Single Portal `/login` for all roles) พร้อมฟังก์ชัน **Remember Me (จำฉันไว้ในระบบ)** ที่จดจำ Email/Username และขยายอายุ Refresh Token เป็น 30 วัน, ล็อกอินด้วย JWT, รีเฟรชโทเค็น, รีเซ็ตรหัสผ่าน, นำทางผู้ใช้ไปยัง Portal ตามบทบาทอัตโนมัติ (Role-Based Redirection: Admin/Manager ➡️ `/admin`, Front Desk ➡️ `/front-desk`, Housekeeping ➡️ `/housekeeping`), กำหนดสิทธิ์แบบ Role-Based Access Control (4 Roles) แคชผ่าน Cloudflare KV[cite: 1, 6, 7]
2.  **ระบบห้องพักและสิ่งอำนวยความสะดวก (Room Inventory Management):** จัดการห้องพัก, ประเภทห้อง (Standard, Deluxe, Suite, Presidential), ชั้น, สิ่งอำนวยความสะดวก และประวัติการเปลี่ยนแปลง[cite: 1, 7]
3.  **ระบบวงจรชีวิตสถานะห้องพัก (Room Lifecycle State Machine):** จัดการและควบคุมการเปลี่ยนสถานะของห้องพักทั้ง 7 สถานะอย่างเป็นระบบตามเงื่อนไขทางธุรกิจ[cite: 7]
4.  **ระบบการจองห้องพัก (Reservation Management):** สร้างการจองล่วงหน้า (ตรวจสอบ Date Range Overlap โดยยังไม่เปลี่ยน `rooms.status` ทันที), บันทึกประวัติแขก (Guest Profiles) และรองรับการ Walk-in[cite: 3, 7]
5.  **ระบบประมวลผลตามเวลา (Night Audit Cron Worker):** ทำงานอัตโนมัติทุกวันเวลา 02:00 น. ตรวจสอบ No-show และปรับสถานะห้องพักที่มีกำหนดเช็คอินวันนี้เป็น `reserved`[cite: 3, 6]
6.  **ระบบเช็คอินและเช็คเอาท์ (Check-in & Check-out Operations):** บันทึกยอดมัดจำ (`depositAmount`), บันทึกเวลาจริง และกระจายคำสั่งเช็คเอาท์แบบ Fan-out 1:4 ไปยังฝ่ายห้องพัก แม่บ้าน การเงิน และรายงาน[cite: 1, 2, 4]
7.  **ระบบขยายเวลาพักและอัปเกรดห้อง (Extend Stay & Room Upgrade):** ปรับปรุงรายละเอียดการจองขณะเข้าพัก พร้อมคำนวณส่วนต่างค่าห้องพักอัตโนมัติ[cite: 7]
8.  **ระบบงานแม่บ้าน งานทำความสะอาด และจัดการคู่ค้า Outsource (Housekeeping, Maintenance & Outsource Management):** ระบบสร้างงานทำความสะอาดอัตโนมัติหลังเช็คเอาท์, มอบหมายงานตามกะ/โซน, บันทึกเวลาเริ่มและเสร็จสิ้น, รายงานปัญหาห้องชำรุดส่งซ่อมบำรุง, และบริหารสมุดรายชื่อเบอร์ติดต่อช่าง/คนสวน/คู่ค้าภายนอก (Outsource Contacts) จำแนกตามหมวดหมู่งานและระดับความฉุกเฉิน[cite: 1, 2, 7]
9.  **ระบบรายงานปัญหาห้องพัก (Room Issue & Maintenance Reporting):** แจ้งปัญหาห้องชำรุด สิ่งของสูญหาย หรือปัญหาความสะอาด พร้อมส่งต่อสถานะไปยังฝ่ายซ่อมบำรุง[cite: 7]
10. **ระบบบิลและการชำระเงิน (Billing & Payment Operations):** บันทึกค่าห้อง, บริการเสริม (มินิบาร์, ซักรีด), หักเงินมัดจำ, รับชำระเงินหลายช่องทาง (เงินสด, โอน, บัตร, QR) และออกใบเสร็จ[cite: 6, 7]
11. **ระบบรายงานและวิเคราะห์ข้อมูลเชิงลึก (Analytics & Reporting):** อัตราการเข้าพัก (Occupancy Rate), สถิติรายได้รายวัน/รายเดือน, ประสิทธิภาพแม่บ้าน, ส่งออกข้อมูล PDF/CSV[cite: 7]
12. **ระบบ Event Bus และความสอดคล้องของข้อมูล (Event-Driven Consistency):** รับ-ส่ง Event ข้าม Service ผ่าน Upstash QStash โดยใช้ Outbox Pattern และ HTTP Webhooks ที่มีการยืนยัน Signature[cite: 1]

### ฟังก์ชันที่อยู่นอกเหนือขอบเขต (Out-of-Scope)
*   ระบบจองห้องพักสาธารณะสำหรับลูกค้าทั่วไปผ่านเว็บไซต์ (Customer-Facing Public Booking)[cite: 7]
*   การเชื่อมต่อ Payment Gateway ตัดบัตรเครดิตจริง (ใช้ระบบบันทึกและจำลอง Sandbox)[cite: 7]
*   ระบบงานบุคคล (HR) เต็มรูปแบบ เช่น การคิดเงินเดือน (Payroll) หรือการลางานของพนักงาน[cite: 7]
*   การรองรับหลายสาขาพร้อมกัน (Multi-Property / Multi-Branch) มุ่งเน้นการจัดการสำหรับ 1 โรงแรม[cite: 7]

---

## 5. 🧑‍💻 แนวทางของการพัฒนาตาม SDLC (System Development Life Cycle)

| ขั้นตอน (Phase) | รายละเอียดโดยย่อ (Brief Description) |
|---|---|
| **1. Planning** | ร่วมกันระบุปัญหาการดำเนินงานหลังบ้านของโรงแรม กำหนดขอบเขตโครงการ สถาปัตยกรรม Microservices และประเมินการใช้ Cloudflare Serverless Stack + Upstash QStash[cite: 1, 7] |
| **2. Analysis** | วิเคราะห์กระบวนการทางธุรกิจ (Business Process) วงจรชีวิตห้องพัก ออกแบบ Use Case Diagram และจัดทำข้อกำหนดความต้องการระบบ (SRS) เชิงฟังก์ชัน 105 APIs[cite: 1, 7] |
| **3. Design** | ออกแบบ System Architecture, State Machine, Class Diagram, Sequence Diagram (5 Flows), โครงสร้างฐานข้อมูล D1 6 ก้อน (ER Diagram) และ Design System[cite: 1, 7] |
| **4. Development** | พัฒนา Backend Microservices บน Cloudflare Workers ด้วย TypeScript พัฒนา API Gateway เชื่อมต่อ Upstash QStash Webhooks และพัฒนาหน้าจอ React + Tailwind CSS[cite: 1, 7] |
| **5. Testing** | ดำเนินการทดสอบระบบด้วย Postman (Functional Test), ทดสอบ Event-Driven ข้ามเซอร์วิส (Webhook Delivery & DLQ) และทำการทดสอบการยอมรับของผู้ใช้งาน (Manual UAT)[cite: 1, 7] |
| **6. Deployment** | นำระบบขึ้นสู่สภาพแวดล้อม Cloudflare Edge จริง ผ่าน Wrangler CLI และ GitHub Actions CI/CD Pipeline[cite: 7] |
| **7. Maintenance** | ติดตามการทำงาน (Monitoring) ผ่าน Cloudflare Dashboard และ Upstash Console ตรวจสอบ Dead-Letter Queue (DLQ) เมื่อมี Webhook ล้มเหลว[cite: 1, 7] |

---

## 6. 🧰 สแตกเทคโนโลยี (Tech Stack)

| หมวดหมู่ | เทคโนโลยี | รายละเอียดและเหตุผลการเลือกใช้ |
|---|---|---|
| **Programming Language** | TypeScript | ใช้ทั้งฝั่ง Backend และ Frontend เพื่อความปลอดภัยของข้อมูล (Type Safety), ลดข้อผิดพลาดขณะรันไทม์ และสื่อสาร Data Model ได้แม่นยำ[cite: 7] |
| **Serverless Compute** | Cloudflare Workers | รันไทม์ประสิทธิภาพสูงที่ Edge ทั่วโลก ทำงานแบบ V8 Isolates บูตเร็วระดับมิลลิวินาที ประหยัดค่าใช้จ่ายและรองรับโหลดได้ทันที[cite: 7] |
| **API Gateway** | Cloudflare Workers | จุดรับคำขอหลัก ทำหน้าที่ Reverse Proxy, ตรวจสอบ JWT, RBAC Guard, Rate Limiting, CORS Handling และ Route ไปยัง Microservices[cite: 1, 6, 7] |
| **Database** | Cloudflare D1 (SQLite-based) | Serverless Relational Database แยก 1 ก้อนต่อ 1 เซอร์วิส (`auth`, `room`, `reserve`, `house`, `bill`, `report`) ตอบสนองเร็วผ่าน Edge ตามหลัก Database-per-Service[cite: 1, 7] |
| **Caching & Fast KV** | Cloudflare KV | แคชความเร็วสูงสำหรับเก็บสถานะ Session, สิทธิ์การใช้งานของ Role และ System Configurations[cite: 1, 7] |
| **Message Queue / Event Bus**| Upstash QStash | Serverless Pub/Sub Event Bus ส่งผ่าน HTTP Webhooks รับประกันการส่งข้อมูล, รองรับ True 1:N Fan-out, Webhook Signature Verification, Auto-Retry แบบ Exponential Backoff และ DLQ[cite: 1, 2] |
| **Scheduled Jobs** | Cloudflare Cron Triggers | Night Audit Cron ทำงานทุกวันเวลา 02:00 น. เพื่อตรวจสอบ No-show และปรับสถานะห้องเป็น reserved[cite: 3, 6] |
| **Frontend Framework** | React + Vite + TypeScript | พัฒนาในรูปแบบ Single Page Application (SPA) เพื่อความลื่นไหลในการใช้งานหลังบ้านของพนักงาน[cite: 7] |
| **Styling & UI Components** | Tailwind CSS | Utility-First CSS สำหรับตกแต่งหน้าจออย่างรวดเร็ว พร้อมสร้าง Status-Color Design System[cite: 7] |
| **Frontend Hosting** | Cloudflare Workers (Static Assets) | โฮสต์ไฟล์ Static ของ Frontend บน Workers Stack เดียวกัน ทำให้จัดการ Deploy ง่ายผ่าน `wrangler deploy`[cite: 7] |
| **API Documentation** | OpenAPI / Swagger | บันทึกข้อกำหนดและเอกสารสเปกของทั้ง 105 APIs สำหรับใช้อ้างอิงและทดสอบระบบ[cite: 7] |
| **Testing Tools** | Postman | ใช้ทดสอบ Functional API ราย Endpoint และทดสอบกระบวนการ Integration ข้ามเซอร์วิส[cite: 7] |
| **DevOps & CI/CD** | GitHub Actions + Wrangler CLI | ระบบตรวจทานโค้ดอัตโนมัติและสั่ง Deploy ระบบขึ้น Cloudflare โดยอัตโนมัติเมื่อ Merge โค้ด[cite: 7] |

---

## 7. 👥 การแบ่งหน้าที่และความรับผิดชอบ (Team Roles & Responsibilities)

| สมาชิก | บทบาทหลักในทีม | Service Backend ที่รับผิดชอบ | จำนวน API | หน้าจอ Frontend | ภาระงานหลักอื่น ๆ |
|---|---|---|:---:|---|---|
| **คน A (เขตโสภณ)** | **PM + Infra/DevOps Lead** | • API Gateway<br/>• Auth/User (12)<br/>• Report/Analytics (14) | **26** + Gateway | **Manager & Admin Portal** (`/admin`)<br/>• KPI Dashboard<br/>• User Management<br/>• Outsource Contacts Management (Admin UI)<br/>• Export Reports | วางโครงสร้าง Monorepo, ติดตั้ง Cloudflare Stack (6 D1, KV, R2), ออกแบบ API Gateway & RBAC, ติดตั้ง Upstash QStash Event Broker, ดูแล Master Data Outsource (Admin UI), CI/CD Deploy Pipeline |
| **คน B (ธีรภัทร)** | **SA Lead + Core Dev** | • Reservation (24)<br/>• Billing (16) | **40** | **Front Desk & Cashier Portal** (`/front-desk`)<br/>• Room Matrix Grid (5–10 ห้อง)<br/>• Check-in / Check-out<br/>• Cashier & Split Screen Invoices<br/>• Quick Emergency Contact Drawer | System Analyst, วิเคราะห์ State Machine, ออกแบบ D1 Schemas & Outbox Pattern, กำหนด Event Contracts (`packages/events`), ดูแล Flow เงินมัดจำ/มินิบาร์/คิดเงิน และช่องทางติดต่อช่างด่วน |
| **คน C (ปวริศ)** | **QA Lead + Core Dev** | • Room Inventory (18)<br/>• Housekeeping (21) | **39** | **Housekeeping Portal** (`/housekeeping`)<br/>• Cleaning Kanban Board<br/>• Task Execution & Inspection<br/>• Report Room Issue<br/>• Outsource Contacts CRUD & Quick Contact Dialog | ออกแบบ Test Plan / 24 UAT Test Cases, ทำ Automated Postman Collection, ดูแล D1 Schema และ APIs งานแม่บ้านและ Outsource Contacts, ควบคุม State เปลี่ยนผ่านงานแม่บ้านและผังห้อง |

---

## 8. 🗺️ แผนการดำเนินงาน 12 สัปดาห์ (Project Timeline)

| สัปดาห์ (Week) | ระยะงาน (Phase) | รายละเอียดกิจกรรม |
|:---:|---|---|
| **1** | **System & Infra Setup** | วางโครงสร้าง Repo กลาง, ออกแบบ DB Schema เบื้องต้น, ตั้งค่า Cloudflare Workers / D1 (6 DBs) / KV / Upstash QStash, วาง Auth Pattern และตกลง API Contract[cite: 1, 7] |
| **2 – 5** | **Backend Development** | พัฒนา Microservices ทั้ง 6 ตัวแยกกันตามที่ได้รับมอบหมาย เขียน Outbox Pattern และ Webhook Endpoints สื่อสาร Contract ข้าม Service เป็นประจำทุกสัปดาห์[cite: 1, 7] |
| **6** | **Backend Integration & Event Testing** | รวม Service เข้าผ่าน API Gateway, ทดสอบ Event-Driven ผ่าน Upstash QStash ตาม Flow จริง (จอง → เช็คอิน → แม่บ้าน → เช็คเอาท์ Fan-out 1:4 → บิล → รายงาน)[cite: 1, 2, 7] |
| **7 – 9** | **Frontend Development** | พัฒนาหน้าจอตามส่วนงานของตนเอง โดยใช้ Design System และ Layout กลางร่วมกัน[cite: 7] |
| **10** | **End-to-End Integration** | เชื่อมต่อส่วนหน้าบ้านเข้ากับ API จริงทั้งหมด และทดสอบ User Flow จากต้นจนจบ[cite: 7] |
| **11** | **Bug Fixing & Documentation** | แก้ไขข้อผิดพลาดของระบบ, ปรับแต่งหน้าจอ UI, จัดทำเอกสารฉบับสมบูรณ์ (OpenAPI, README, System Diagrams Viewer)[cite: 6, 7] |
| **12** | **Buffer & Presentation** | ซ้อมการสาธิตระบบ (Demo Flow), จัดเตรียมสไลด์ และเตรียมพร้อมการนำเสนอโครงงาน[cite: 7] |

---

## 9. 🎨 Brand Identity & Design System

แนวคิดการออกแบบ: **"Operational Clarity & Status-First"**[cite: 7]  
ให้ความสำคัญกับ **ความรวดเร็วในการรับรู้สถานะ (Cognitive Load Reduction)** พนักงานหน้างานต้องมองเห็นและเข้าใจสถานะของห้องพัก งานแม่บ้าน หรือยอดเงินได้ทันที[cite: 7]

| บทบาทสี | ชื่อสี | Hex Code | บริบทการใช้งาน |
|---|---|---|---|
| **Base Background** | Warm Off-White | `#FAFAF9` | พื้นหลังหลักของทุกหน้าจอ ให้ความสบายตาตลอดกะการทำงาน[cite: 7] |
| **Surface / Card** | Pure White | `#FFFFFF` | การ์ดข้อมูล, ตาราง, โมดอล และแผงควบคุม[cite: 7] |
| **Text Primary** | Slate Ink | `#1E293B` | ตัวหนังสือหลัก, หัวข้อ, รหัสห้องพัก, ยอดเงิน[cite: 7] |
| **Text Muted** | Slate Grey | `#64748B` | ป้ายกำกับรอง, คำอธิบายย่อย, วันที่และเวลา[cite: 7] |
| **Border / Divider** | Light Grey | `#E2E8F0` | เส้นแบ่งตาราง, กรอบ Input, เส้นคั่นส่วนเนื้อหา[cite: 7] |
| **Primary Accent** | Vibrant Orange | `#F97316` | ปุ่ม Action หลัก (CTA), แถบเมนูที่เลือก, การไฮไลต์สำคัญ[cite: 7] |
| **Status: รอดำเนินการ** | Neutral Slate | `#94A3B8` | งานแม่บ้านรอ Assign, บิลแบบร่าง (Draft)[cite: 7] |
| **Status: ยืนยันแล้ว** | Sky Blue | `#3B82F6` | ห้องพักสถานะ `reserved`, การจองที่รอเข้าพัก[cite: 7] |
| **Status: สำเร็จ / พร้อม** | Emerald Green | `#22C55E` | ห้อง `available` หรือ `occupied`, งานเสร็จสิ้น, บิลชำระแล้ว (`paid`)[cite: 7] |
| **Status: กำลังดำเนินการ**| Amber Gold | `#F59E0B` | ห้อง `cleaning`, งานทำความสะอาดกำลังดำเนินการ (`in_progress`)[cite: 7] |
| **Status: ปัญหา / แจ้งเตือน**| Crimson Red | `#EF4444` | ห้อง `maintenance` หรือ `out_of_order`, การจองยกเลิก, งานค้างเกินเวลา[cite: 7] |

---

## 10. 👥 ข้อมูลกลุ่มผู้ใช้งานจำลอง (User Personas)

### 🧑‍💼 Persona 1 — Front Desk & Cashier Staff: "ฟ้า" (พนักงานต้อนรับและคิดเงิน)
*   **อายุ:** 24 ปี | ประสบการณ์ 2 ปี | **บทบาทในระบบ:** `role=front_desk`[cite: 7]
*   **เป้าหมาย:** ให้บริการเช็คอิน-เช็คเอาท์แขกได้อย่างรวดเร็ว ถูกต้อง บันทึกมัดจำ และคิดเงินค่าห้องรวมมินิบาร์ออกใบเสร็จได้จบในจุดเดียว[cite: 7]
*   **Pain Points:** ช่วงเวลาเร่งด่วนมักสับสนว่าห้องไหนแม่บ้านทำความสะอาดเสร็จแล้วจริง และการคิดเงินค่ามินิบาร์ร่วมกับค่าห้องในระบบเดิมต้องสลับหลายหน้าจอ[cite: 7]
*   **Needs & Motivations:** แผงควบคุมที่อัปเดตสถานะห้องทันทีแบบ Real-time และฟังก์ชัน Check-out ที่สร้างบิลพร้อมหักเงินมัดจำให้อัตโนมัติ[cite: 7]

---

### 🧹 Persona 2 — Housekeeping Supervisor: "สมศักดิ์" (หัวหน้าแผนกแม่บ้าน)
*   **อายุ:** 38 ปี | ประสบการณ์ 8 ปี | **บทบาทในระบบ:** `role=housekeeping`
*   **เป้าหมาย:** จัดสรรงานทำความสะอาดให้แม่บ้านอย่างทั่วถึง และเคลียร์ห้องพักให้พร้อมขายเร็วที่สุด[cite: 7]
*   **Pain Points:** ไม่ทราบทันทีเมื่อแขกเช็คเอาท์ ต้องรอโทรศัพท์แจ้ง ทำให้เข้าทำความสะอาดช้า[cite: 7]
*   **Needs & Motivations:** ระบบที่สร้างงานทำความสะอาดอัตโนมัติเมื่อแขกเช็คเอาท์ พร้อมมอบหมายงานตามโซน และแจ้งห้องชำรุดเข้าฝ่ายซ่อมได้ทันที[cite: 7]

---

### 📊 Persona 3 — Hotel General Manager: "วิชัย" (ผู้จัดการทั่วไป)
*   **อายุ:** 45 ปี | ผู้บริหารระดับสูง | **บทบาทในระบบ:** `role=manager`
*   **เป้าหมาย:** ติดตามผลประกอบการ ภาพรวมอัตราการเข้าพัก (Occupancy Rate) และควบคุมต้นทุนการดำเนินงาน[cite: 7]
*   **Pain Points:** ในโรงแรมขนาดเล็กเดิมที่ไม่มีระบบรวมศูนย์ ผู้จัดการต้องรอรวบรวมข้อมูลสิ้นวัน ทำให้ไม่สามารถตัดสินใจปรับราคาห้องพักได้ทันต่อสถานการณ์[cite: 7]
*   **Needs & Motivations:** Dashboard แสดง Occupancy Rate, รายได้รวม และสถิติเช็คอิน/เช็คเอาท์แบบ Real-time พร้อมส่งออกรายงาน PDF/CSV ในคลิกเดียว[cite: 7]

---

## 11. 🧩 ผังการใช้งานระบบ (Use Case Diagram)

```mermaid
flowchart LR

    %% Actors
    Staff(["👤 Hotel Staff\n(abstract)"])
    FD(["👤 Front Desk Staff\n(รวม Cashier / Billing)"])
    HK(["👤 Housekeeping Staff"])
    MGR(["👤 Manager / Admin"])

    %% Actor Generalization
    FD  -.->|"<<generalize>>"| Staff
    HK  -.->|"<<generalize>>"| Staff
    MGR -.->|"<<generalize>>"| Staff

    %% Shared Use Cases
    subgraph SharedUC["Common Operations"]
        direction TB
        UC_Login(("Login / Logout"))
        UC_ViewProfile(("View / Update Profile"))
        UC_ResetPwd(("Reset Password"))
    end

    Staff --- UC_Login
    Staff --- UC_ViewProfile
    Staff --- UC_ResetPwd

    %% Front Desk & Billing Use Cases
    subgraph FrontDeskUC["Front Desk & Cashier Operations"]
        direction TB
        UC_ViewRooms(("Check Room Status"))
        UC_CreateRes(("Create Advance Reservation / Walk-in"))
        UC_CheckIn(("Process Check-in & Deposit"))
        UC_CheckOut(("Process Check-out (Fan-out)"))
        UC_ExtendStay(("Extend Stay / Upgrade Room"))
        UC_CancelRes(("Cancel Reservation"))
        UC_ManageBills(("Manage Bills & Folio"))
        UC_AddCharge(("Add Extra Service Charges"))
        UC_ProcessPayment(("Process Payment & Deduct Deposit"))
        UC_IssueInvoice(("Issue Receipt / Invoice"))
        UC_ProcessRefund(("Process Refund"))
        UC_QuickEmergency(("Quick Emergency Outsource Contact"))
    end

    FD --- UC_ViewRooms
    FD --- UC_CreateRes
    FD --- UC_CheckIn
    FD --- UC_CheckOut
    FD --- UC_ExtendStay
    FD --- UC_CancelRes
    FD --- UC_ManageBills
    FD --- UC_AddCharge
    FD --- UC_ProcessPayment
    FD --- UC_IssueInvoice
    FD --- UC_ProcessRefund
    FD --- UC_QuickEmergency

    UC_CheckIn -.->|"<<include>>"| UC_ViewRooms
    UC_CheckOut -.->|"<<include>>"| UC_ViewRooms
    UC_ProcessPayment -.->|"<<include>>"| UC_ManageBills
    UC_IssueInvoice -.->|"<<extend>>"| UC_ProcessPayment
    UC_AddCharge -.->|"<<include>>"| UC_ManageBills

    %% Housekeeping Use Cases
    subgraph HousekeepingUC["Housekeeping Operations"]
        direction TB
        UC_ViewTasks(("View Cleaning Tasks"))
        UC_AssignTask(("Assign Task to Staff"))
        UC_CompleteTask(("Mark Task Complete"))
        UC_ReportIssue(("Report Room Issue / Maintenance"))
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

    %% Manager / Admin Use Cases
    subgraph AdminUC["Manager & Admin Operations"]
        direction TB
        UC_AdminDashboard(("View KPI Dashboard"))
        UC_ManageUsers(("Manage User Accounts & Roles (4 Roles)"))
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
        +checkIn(deposit: Decimal) Boolean
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
        +Decimal depositDeducted
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
    CLIENT["<b>Client — React + Tailwind CSS</b><br/>Front Desk (รวม Cashier/Billing) · Housekeeping Staff<br/>Manager / Admin"]
    KV[("<b>Cloudflare KV</b><br/>Session Cache · Permissions · Config")]
    GW["<b>API Gateway — Cloudflare Worker</b><br/>Reverse Proxy · JWT Verify · Rate Limit · CORS · Route → Service"]

    subgraph SERVICES["Microservices Layer — Cloudflare Workers · 6 Services · 105 APIs"]
        AUTH["<b>#1 Auth / User Service</b><br/>12 APIs · คน A (PM)<br/>users · sessions · permissions"]
        ROOM["<b>#2 Room Inventory Service</b><br/>18 APIs · คน C (QA)<br/>rooms · room_types · floors"]
        RES["<b>#3 Reservation Service</b><br/>24 APIs · คน B (SA)<br/>guests · reservations · history"]
        HK["<b>#4 Housekeeping Service</b><br/>21 APIs · คน C (QA)<br/>staff · tasks · issues · schedule · outsource_contacts"]
        BILL["<b>#5 Billing Service</b><br/>16 APIs · คน B (SA)<br/>bills · bill_items · payments · invoices"]
        RPT["<b>#6 Report / Analytics Service</b><br/>14 APIs · คน A (PM)<br/>daily_stats · revenue · summaries"]
    end

    subgraph DATABASES["Cloudflare D1 — Database-per-Service (แยก 6 DBs อิสระ)"]
        DB1[("D1: auth")]
        DB2[("D1: room")]
        DB3[("D1: reserve")]
        DB4[("D1: house")]
        DB5[("D1: bill")]
        DB6[("D1: report")]
    end

    subgraph BUS["Upstash QStash — Serverless Pub/Sub Event Bus · Fan-out 1:4 · Auto-Retry · DLQ"]
        TOPIC_CHECKIN{{"<b>hotel.reservation.checkin</b><br/>Topic"}}
        TOPIC_CHECKOUT{{"<b>hotel.reservation.checkout</b><br/>Topic (FAN-OUT 1:4)"}}
        TOPIC_HK{{"<b>hotel.housekeeping.completed</b><br/>Topic"}}
        TOPIC_BILL{{"<b>hotel.billing.paid</b><br/>Topic"}}
    end

    CRON["<b>Night Audit Cron Worker</b><br/>⏰ ทุกวัน 02:00 AM<br/>• ตรวจสอบ No-show<br/>• วันเช็คอินถึง → ปรับ rooms.status='reserved'<br/>• Rollup สถิติประจำวัน"]

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

    RES -. "Publish (Check-in)" .-> TOPIC_CHECKIN
    TOPIC_CHECKIN -. "Webhook POST → occupied" .-> ROOM

    RES -. "Publish (Check-out)" .-> TOPIC_CHECKOUT
    TOPIC_CHECKOUT -. "Webhook (1) → checked_out" .-> ROOM
    TOPIC_CHECKOUT -. "Webhook (2) → create task" .-> HK
    TOPIC_CHECKOUT -. "Webhook (3) → create bill" .-> BILL
    TOPIC_CHECKOUT -. "Webhook (4) → stats log" .-> RPT

    HK -. "Publish (Task Done)" .-> TOPIC_HK
    TOPIC_HK -. "Webhook POST → available" .-> ROOM

    BILL -. "Publish (Bill Paid)" .-> TOPIC_BILL
    TOPIC_BILL -. "Webhook POST → revenue" .-> RPT

    CRON --> RES
    CRON --> ROOM
    CRON --> RPT
```

### 2. รูปแบบความสอดคล้องของข้อมูล (Outbox Pattern Implementation)
เพื่อรับประกันความถูกต้องของข้อมูลข้าม Service โดยไม่ต้องทำ Distributed Locking ระบบกำหนดให้ทุก Action สำคัญบันทึกข้อมูลหลักพร้อม Event ลงตาราง `outbox_events` ภายใต้ Atomic Transaction ก้อนเดียวกัน (`await db.batch([...])`)[cite: 7]:

```sql
BEGIN TRANSACTION;
UPDATE reservations SET status = 'checked_in', actual_check_in = CURRENT_TIMESTAMP WHERE id = ?;
INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
VALUES (lower(hex(randomblob(16))), 'ReservationCheckedIn', ?, 'Reservation', ?, 'pending', CURRENT_TIMESTAMP);
INSERT INTO reservation_history (id, reservation_id, action, performed_by, created_at)
VALUES (lower(hex(randomblob(16))), ?, 'checked_in', ?, CURRENT_TIMESTAMP);
COMMIT;
```

### 3. ตารางความสัมพันธ์ Event Bus ข้ามเซอร์วิส (Cross-Service Event Mapping via Upstash QStash)

| # | Event Name | Producer Service | Trigger Endpoint | บันทึกใน Outbox DB | Upstash QStash Topic / Method | Consumer Service | การตอบสนองของ Consumer |
|:---:|---|---|---|---|---|---|---|
| 1 | `ReservationCreated`[cite: 7] | Reservation[cite: 7] | `POST /reservations`[cite: 7] | `D1: reserve`[cite: 1] | *ไม่มี Queue* (Scheduled Night Audit Cron)[cite: 3] | Room Inventory[cite: 7] | Night Audit Cron รันเวลา 02:00 น. ในวันเช็คอินจริงเพื่อปรับสถานะห้องเป็น `reserved`[cite: 3] |
| 2 | `ReservationCheckedIn`[cite: 7] | Reservation[cite: 7] | `POST /reservations/:id/check-in`[cite: 7] | `D1: reserve`[cite: 1] | `hotel.reservation.checkin`[cite: 1] | Room Inventory[cite: 7] | Webhook POST `/webhooks/checkin` → เปลี่ยนสถานะห้องเป็น `occupied`[cite: 1, 4] |
| 3 | `ReservationCheckedOut`[cite: 7] | Reservation[cite: 7] | `POST /reservations/:id/check-out`[cite: 7] | `D1: reserve`[cite: 1] | `hotel.reservation.checkout`<br/>*(True Fan-out 1:4)*[cite: 1, 2] | • Room Inventory<br/>• Housekeeping<br/>• Billing<br/>• Report[cite: 1, 2] | **(1) Room:** ปรับ `status='checked_out'` ทันที[cite: 1, 2]<br/>**(2) HK:** สร้าง cleaning task (`pending`)[cite: 1, 2]<br/>**(3) Bill:** สร้างบิลรอคิดเงินรวมมินิบาร์[cite: 1, 2]<br/>**(4) Report:** `total_checkouts++`[cite: 1, 2] |
| 4 | `ReservationCancelled`[cite: 7] | Reservation[cite: 7] | `POST /reservations/:id/cancel`[cite: 7] | `D1: reserve`[cite: 1] | `hotel.reservation.checkin`[cite: 1] | Room Inventory[cite: 7] | คืนสถานะห้องเป็น `available`[cite: 1, 7] |
| 5 | `HousekeepingTaskCompleted`[cite: 7] | Housekeeping[cite: 7] | `PUT /housekeeping/tasks/:id/complete`[cite: 7] | `D1: house`[cite: 1] | `hotel.housekeeping.completed`[cite: 1] | Room Inventory[cite: 7] | Webhook POST `/webhooks/housekeeping-completed` → ปรับห้องเป็น `available`[cite: 1, 5] |
| 6 | `BillPaid`[cite: 7] | Billing[cite: 7] | `POST /bills/:id/pay`[cite: 7] | `D1: bill`[cite: 1] | `hotel.billing.paid`[cite: 1] | Report[cite: 7] | Webhook POST `/webhooks/bill-paid` → อัปเดตรายได้ใน `revenue_records`[cite: 1, 6] |

---

## 14. 🔄 วงจรชีวิตสถานะห้องพัก (Room Lifecycle State Machine)

```mermaid
stateDiagram-v2
    direction TB
    [*] --> available: ห้องถูกสร้างในระบบ
    available --> reserved: Walk-in หรือ Night Audit 02:00 น. (วันเช็คอินจริง)
    reserved --> occupied: 2. ReservationCheckedIn (POST /reservations/{id}/check-in)
    occupied --> checked_out: 3. ReservationCheckedOut (POST /reservations/{id}/check-out)
    checked_out --> cleaning: 4. Auto-create Cleaning Task (QStash Fan-out Webhook)
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

## 15. 🔁 แผนผังลำดับการทำงานหลัก (Sequence Diagrams - 5 Flows)

### Flow #1: การจองห้องพักล่วงหน้า (Advance Booking Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff
    participant GW as API Gateway
    participant RS as Reservation Service
    participant DB_R as D1: Reservation DB

    FD->>GW: POST /reservations<br/>{guest_id, room_id, dates, ...}
    GW->>RS: Route to Reservation Service<br/>(role=front_desk)

    RS->>DB_R: SELECT reservations<br/>WHERE room_id=? AND dates overlap
    Note over DB_R: ตรวจช่วงวันที่ทับซ้อน (Date Range check)

    alt ห้องว่าง
        RS->>DB_R: BEGIN TRANSACTION
        RS->>DB_R: INSERT INTO reservations<br/>(status = 'confirmed')
        RS->>DB_R: INSERT INTO outbox_events<br/>(event_type = 'ReservationCreated')
        RS->>DB_R: INSERT INTO reservation_history<br/>(action = 'created')
        RS->>DB_R: COMMIT
        RS-->>GW: 201 Created {reservation}
        GW-->>FD: ✅ จองสำเร็จ (rooms.status ยังไม่เปลี่ยน)
    else ห้องไม่ว่าง
        RS-->>GW: 409 Conflict
        GW-->>FD: ❌ ห้องถูกจองแล้วในช่วงวันที่นั้น
    end

    Note over RS,DB_R: Night Audit 02:00 AM (วันเช็คอินถึง)<br/>→ UPDATE rooms SET status='reserved'<br/>(ไม่ผ่าน Upstash QStash — เป็น Scheduled Cron Job)
```

### Flow #2: การเช็คอินเข้าพัก (Check-in Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff
    participant GW as API Gateway
    participant RS as Reservation Service
    participant DB_R as D1: Reservation DB
    participant QSTASH as Upstash QStash
    participant RI as Room Inventory Service
    participant DB_RM as D1: Room DB

    FD->>GW: POST /reservations/:id/check-in<br/>{depositAmount}
    GW->>RS: Route to Reservation Service<br/>(role=front_desk)

    RS->>DB_R: Validate reservation<br/>(status = 'confirmed'?)
    alt reservation not found or invalid status
        RS-->>GW: 400 Bad Request
        GW-->>FD: Error: ไม่สามารถเช็คอินได้
    else valid reservation
        RS->>DB_R: BEGIN TRANSACTION
        RS->>DB_R: UPDATE reservations<br/>SET status = 'checked_in',<br/>actual_check_in = NOW()
        RS->>DB_R: INSERT INTO outbox_events<br/>(ReservationCheckedIn)
        RS->>DB_R: INSERT INTO reservation_history<br/>(action = 'checked_in')
        RS->>DB_R: UPDATE guests<br/>SET total_stays = total_stays + 1
        RS->>DB_R: COMMIT
        RS-->>GW: 200 OK {reservation}
        GW-->>FD: เช็คอินสำเร็จ (บันทึกยอดมัดจำ depositAmount)

        RS-)QSTASH: POST /v2/topics/hotel.reservation.checkin<br/>{reservation_id, room_id}

        QSTASH-)RI: Webhook POST /webhooks/checkin
        RI->>DB_RM: BEGIN TRANSACTION
        RI->>DB_RM: UPDATE rooms SET status = 'occupied'
        RI->>DB_RM: INSERT INTO room_status_history<br/>(reserved → occupied)
        RI->>DB_RM: COMMIT
    end
```

### Flow #3: การเช็คเอาท์และกระจายงานแบบ Fan-out 1:4 (Check-out Fan-out Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff
    participant GW as API Gateway
    participant RS as Reservation Service
    participant DB_R as D1: Reservation DB
    participant QSTASH as Upstash QStash
    participant RI as Room Inventory Service
    participant DB_RM as D1: Room DB
    participant HK as Housekeeping Service
    participant DB_H as D1: Housekeeping DB
    participant BL as Billing Service
    participant DB_B as D1: Billing DB
    participant RP as Report Service
    participant DB_RP as D1: Report DB

    FD->>GW: POST /reservations/:id/check-out
    GW->>RS: Route to Reservation Service<br/>(role=front_desk)

    RS->>DB_R: Validate reservation<br/>(status = 'checked_in'?)

    RS->>DB_R: BEGIN TRANSACTION
    RS->>DB_R: UPDATE reservations<br/>SET status = 'checked_out',<br/>actual_check_out = NOW()
    RS->>DB_R: INSERT INTO outbox_events<br/>(ReservationCheckedOut)
    RS->>DB_R: INSERT INTO reservation_history
    RS->>DB_R: COMMIT
    RS-->>GW: 200 OK
    GW-->>FD: เช็คเอาท์สำเร็จ

    RS-)QSTASH: POST /v2/topics/hotel.reservation.checkout<br/>{reservation_id, room_id, guest_name, dates, amounts}

    par Webhook (1): Room Inventory
        QSTASH-)RI: Webhook POST /webhooks/checkout
        RI->>DB_RM: UPDATE rooms<br/>SET status='checked_out'
        Note over RI,DB_RM: ห้องพร้อมเข้าคิวทำความสะอาด
    and Webhook (2): Housekeeping
        QSTASH-)HK: Webhook POST /webhooks/checkout
        HK->>DB_H: INSERT INTO housekeeping_tasks<br/>(type='checkout_clean', status='pending')
        Note over HK,DB_H: สร้างงานทำความสะอาดอัตโนมัติ
    and Webhook (3): Billing
        QSTASH-)BL: Webhook POST /webhooks/checkout
        BL->>DB_B: INSERT INTO bills<br/>(status='pending')
        BL->>DB_B: INSERT INTO bill_items<br/>(room_charge ตามจำนวนคืน)
        Note over BL,DB_B: สร้างบิลรอรวมยอดมินิบาร์<br/>รอ Front Desk Cashier มาคิดเงิน (ดู Diagram #5)
    and Webhook (4): Report
        QSTASH-)RP: Webhook POST /webhooks/checkout
        RP->>DB_RP: UPDATE daily_stats<br/>SET total_checkouts++
        Note over RP,DB_RP: บันทึกสถิติ checkout ประจำวัน
    end

    Note over QSTASH: หาก Subscriber ตัวใดล้มเหลว<br/>QStash Retry แบบ Exponential Backoff<br/>(สูงสุด 3 ครั้ง) → ไม่สำเร็จเข้า Dead-Letter Queue (DLQ)
```

### Flow #4: แม่บ้านทำความสะอาดเสร็จสิ้น (Housekeeping Complete Flow)
```mermaid
sequenceDiagram
    autonumber
    actor HKS as Housekeeping Staff
    participant GW as API Gateway
    participant HK as Housekeeping Service
    participant DB_H as D1: Housekeeping DB
    participant QSTASH as Upstash QStash
    participant RI as Room Inventory Service
    participant DB_RM as D1: Room DB

    HKS->>GW: PUT /housekeeping/tasks/:id/complete
    GW->>HK: Route to Housekeeping Service

    HK->>DB_H: Validate task<br/>(status = 'in_progress'?)

    HK->>DB_H: BEGIN TRANSACTION
    HK->>DB_H: UPDATE housekeeping_tasks<br/>SET status = 'completed',<br/>completed_at = NOW()
    HK->>DB_H: INSERT INTO outbox_events<br/>(HousekeepingTaskCompleted)
    HK->>DB_H: COMMIT
    HK-->>GW: 200 OK
    GW-->>HKS: งานทำความสะอาดเสร็จสิ้น

    HK-)QSTASH: POST /v2/topics/hotel.housekeeping.completed<br/>{task_id, room_id, room_number}

    QSTASH-)RI: Webhook POST /webhooks/housekeeping-completed
    RI->>DB_RM: BEGIN TRANSACTION
    RI->>DB_RM: UPDATE rooms<br/>SET status = 'available'
    RI->>DB_RM: INSERT INTO room_status_history<br/>(cleaning → available)
    RI->>DB_RM: COMMIT

    Note over HKS,RI: ✅ ห้องพร้อมให้จองรอบต่อไป<br/>Room Lifecycle ครบวงจร
```

### Flow #5: การชำระเงินและออกใบเสร็จ (Billing & Payment Flow)
```mermaid
sequenceDiagram
    autonumber
    actor FD as Front Desk Staff (Cashier)
    participant GW as API Gateway
    participant BL as Billing Service
    participant DB_B as D1: Billing DB
    participant QSTASH as Upstash QStash
    participant RP as Report Service
    participant DB_RP as D1: Report DB

    Note over FD: ตรวจสอบบิล: ค่าห้อง + มินิบาร์ - เงินมัดจำ (role=front_desk)
    FD->>GW: POST /bills/:id/pay<br/>{paymentMethod, amount, depositDeducted}
    GW->>BL: Route to Billing Service<br/>(role=front_desk)
    BL->>DB_B: Validate bill (status = 'pending')
    BL->>DB_B: BEGIN TRANSACTION
    BL->>DB_B: INSERT INTO payments (method, amount)
    BL->>DB_B: UPDATE bills SET status='paid', deposit_deducted=depositDeducted
    BL->>DB_B: INSERT INTO outbox_events (BillPaid)
    BL->>DB_B: COMMIT
    BL-->>GW: 200 OK {billId, receiptUrl}
    GW-->>FD: ✅ ชำระเงินสำเร็จ ออกใบเสร็จได้

    BL-)QSTASH: POST /v2/topics/hotel.billing.paid<br/>{bill_id, amount, method}
    QSTASH-)RP: Webhook POST /webhooks/bill-paid
    RP->>DB_RP: BEGIN TRANSACTION
    RP->>DB_RP: INSERT INTO revenue_records (amount, method)
    RP->>DB_RP: UPDATE monthly_summary SET total_revenue += amount
    RP->>DB_RP: COMMIT
    Note over RP,DB_RP: ชำระเงินทำโดย Front Desk (role=front_desk)<br/>ไม่มี Role Billing แยกต่างหาก
```

---

## 16. 📋 รายการ API ทั้งหมด (105 Microservice Endpoints)

### 🔐 Service #1: Auth/User Service (12 APIs) — Owner: คน A (PM)[cite: 1, 7]
1. `POST /register` — ลงทะเบียนผู้ใช้งานใหม่[cite: 7]
2. `POST /login` — ล็อกอินเข้าสู่ระบบและรับ JWT[cite: 7]
3. `POST /logout` — ออกจากระบบและยกเลิก Session[cite: 7]
4. `POST /refresh-token` — ขอ Refresh Token ใหม่[cite: 7]
5. `GET /users` — ดึงรายชื่อผู้ใช้งานทั้งหมด[cite: 7]
6. `GET /users/:id` — ดึงข้อมูลผู้ใช้รายบุคคล[cite: 7]
7. `PUT /users/:id` — แก้ไขข้อมูลผู้ใช้งาน[cite: 7]
8. `DELETE /users/:id` — ปิดการใช้งานผู้ใช้ (Soft Delete)[cite: 7]
9. `PUT /users/:id/role` — เปลี่ยนบทบาทผู้ใช้ (4 Roles)[cite: 7]
10. `GET /users/:id/permissions` — ดูรายการสิทธิ์ของผู้ใช้[cite: 7]
11. `POST /forgot-password` — ขอกู้คืนรหัสผ่าน[cite: 7]
12. `POST /reset-password` — ตั้งรหัสผ่านใหม่[cite: 7]

### 🛏️ Service #2: Room Inventory Service (18 APIs) — Owner: คน B (SA)[cite: 1, 7]
13. `GET /rooms` — รายการห้องพักทั้งหมด[cite: 7]
14. `GET /rooms/:id` — ข้อมูลห้องพักรายห้อง[cite: 7]
15. `POST /rooms` — เพิ่มห้องพักใหม่[cite: 7]
16. `PUT /rooms/:id` — แก้ไขรายละเอียดห้องพัก[cite: 7]
17. `DELETE /rooms/:id` — ลบหรือระงับการใช้ห้องพัก[cite: 7]
18. `GET /rooms/:id/status` — ดึงสถานะปัจจุบันของห้อง[cite: 7]
19. `PUT /rooms/:id/status` — ปรับปรุงสถานะห้องพัก[cite: 7]
20. `GET /room-types` — รายการประเภทห้องพักทั้งหมด[cite: 7]
21. `POST /room-types` — เพิ่มประเภทห้องพักใหม่[cite: 7]
22. `PUT /room-types/:id` — แก้ไขประเภทห้องพักและราคา[cite: 7]
23. `DELETE /room-types/:id` — ลบประเภทห้องพัก[cite: 7]
24. `GET /rooms/available` — ค้นหาห้องว่างตามช่วงเวลา[cite: 7]
25. `GET /floors` — รายชื่อชั้นทั้งหมดในโรงแรม[cite: 7]
26. `GET /floors/:id/rooms` — รายการห้องพักประจำชั้น[cite: 7]
27. `PUT /rooms/:id/maintenance` — ปรับห้องเข้าโหมดซ่อมบำรุง[cite: 7]
28. `GET /rooms/:id/history` — ดูประวัติการเปลี่ยนสถานะห้อง[cite: 7]
29. `POST /rooms/:id/amenities` — เพิ่มสิ่งอำนวยความสะดวกในห้อง[cite: 7]
30. `DELETE /rooms/:id/amenities/:amenityId` — ลบสิ่งอำนวยความสะดวก[cite: 7]

### 📋 Service #3: Reservation Service (24 APIs) — Owner: คน C (QA)[cite: 1, 7]
31. `GET /reservations` — รายการการจองทั้งหมด[cite: 7]
32. `GET /reservations/:id` — รายละเอียดการจองรายรายการ[cite: 7]
33. `POST /reservations` — สร้างการจองห้องพักล่วงหน้า (Date Range Check)[cite: 7]
34. `PUT /reservations/:id` — แก้ไขข้อมูลการจอง[cite: 7]
35. `DELETE /reservations/:id` — ลบข้อมูลการจอง[cite: 7]
36. `POST /reservations/:id/check-in` — ดำเนินการเช็คอินเข้าพักและเก็บมัดจำ[cite: 4, 7]
37. `POST /reservations/:id/check-out` — ดำเนินการเช็คเอาท์คืนห้อง (Fan-out 1:4)[cite: 1, 2, 7]
38. `POST /reservations/:id/cancel` — ขอยกเลิกการจอง[cite: 7]
39. `PUT /reservations/:id/modify-dates` — เปลี่ยนแปลงวันเข้าพัก/ออก[cite: 7]
40. `GET /reservations/by-guest/:guestId` — ประวัติการจองตามรายชื่อแขก[cite: 7]
41. `GET /reservations/by-room/:roomId` — ประวัติการจองตามห้องพัก[cite: 7]
42. `GET /reservations/today-checkins` — รายการที่ต้องเช็คอินวันนี้[cite: 7]
43. `GET /reservations/today-checkouts` — รายการที่ต้องเช็คเอาท์วันนี้[cite: 7]
44. `POST /guests` — บันทึกประวัติแขกใหม่[cite: 7]
45. `GET /guests` — รายชื่อแขกทั้งหมดในระบบ[cite: 7]
46. `GET /guests/:id` — ข้อมูลแขกรายบุคคล[cite: 7]
47. `PUT /guests/:id` — แก้ไขข้อมูลประวัติแขก[cite: 7]
48. `DELETE /guests/:id` — ลบข้อมูลแขก[cite: 7]
49. `POST /reservations/:id/extend-stay` — ขอขยายเวลาเข้าพัก[cite: 7]
50. `POST /reservations/:id/upgrade-room` — ขออัปเกรดประเภทห้องพัก[cite: 7]
51. `GET /reservations/calendar` — ข้อมูลตารางการจองแบบปฏิทิน[cite: 7]
52. `POST /walk-in` — สร้างการจองและเช็คอินแบบ Walk-in[cite: 7]
53. `GET /reservations/:id/invoice-preview` — ดูตัวอย่างบิลล่วงหน้า[cite: 7]
54. `POST /reservations/:id/apply-discount` — ใช้โค้ดหรือบันทึกส่วนลด[cite: 7]

### 🧼 Service #4: Housekeeping Service (21 APIs) — Owner: คน B (SA)[cite: 1, 7]
55. `GET /housekeeping/tasks` — รายการงานทำความสะอาดทั้งหมด[cite: 7]
56. `GET /housekeeping/tasks/:id` — ข้อมูลงานทำความสะอาดรายรายการ[cite: 7]
57. `POST /housekeeping/tasks` — สร้างงานทำความสะอาดด้วยมือ[cite: 7]
58. `PUT /housekeeping/tasks/:id` — แก้ไขรายละเอียดงาน[cite: 7]
59. `DELETE /housekeeping/tasks/:id` — ลบงานทำความสะอาด[cite: 7]
60. `PUT /housekeeping/tasks/:id/assign` — มอบหมายงานให้พนักงานแม่บ้าน[cite: 7]
61. `PUT /housekeeping/tasks/:id/complete` — บันทึกว่าทำความสะอาดเสร็จแล้ว[cite: 5, 7]
62. `GET /housekeeping/rooms-to-clean` — รายชื่อห้องที่ต้องทำความสะอาด[cite: 7]
63. `GET /housekeeping/staff-assignments` — สรุปงานที่แม่บ้านแต่ละคนถืออยู่[cite: 7]
64. `GET /housekeeping/staff` — รายชื่อพนักงานแม่บ้านทั้งหมด[cite: 7]
65. `POST /housekeeping/staff` — เพิ่มพนักงานแม่บ้านเข้าระบบ[cite: 7]
66. `PUT /housekeeping/staff/:id` — แก้ไขข้อมูลพนักงานแม่บ้าน[cite: 7]
67. `GET /housekeeping/staff/:id/tasks` — รายการงานของแม่บ้านรายคน[cite: 7]
68. `PUT /housekeeping/staff/:id/zone` — กำหนดโซนหรือชั้นที่รับผิดชอบ[cite: 7]
69. `POST /housekeeping/tasks/:id/report-issue` — แจ้งปัญหา/สิ่งของชำรุด[cite: 7]
70. `GET /housekeeping/schedule` — ตารางกะการทำงานของแม่บ้าน[cite: 7]
71. `GET /housekeeping/outsource-contacts` — ดึงรายชื่อผู้ติดต่อคู่ค้า/ช่าง Outsource ทั้งหมด (รองรับฟิลเตอร์ category, is_emergency)[cite: 7]
72. `GET /housekeeping/outsource-contacts/:id` — ดึงข้อมูลผู้ติดต่อ Outsource รายบุคคล/บริษัท[cite: 7]
73. `POST /housekeeping/outsource-contacts` — เพิ่มข้อมูลคู่ค้า/ช่าง Outsource ใหม่ (เฉพาะ Admin)[cite: 7]
74. `PUT /housekeeping/outsource-contacts/:id` — แก้ไขข้อมูลช่างและเงื่อนไขการติดต่อ (เฉพาะ Admin)[cite: 7]
75. `DELETE /housekeeping/outsource-contacts/:id` — ระงับการใช้งานช่าง/คู่ค้า (Soft Delete: `is_active = 0`, เฉพาะ Admin)[cite: 7]

### 🧾 Service #5: Billing Service (16 APIs) — Owner: คน A (PM)[cite: 1, 7]
*(ดำเนินการโดย Front Desk Cashier / `role=front_desk`)*[cite: 1, 6]
76. `GET /bills` — รายการบิลทั้งหมด[cite: 7]
77. `GET /bills/:id` — ข้อมูลบิลรายใบ[cite: 7]
78. `POST /bills` — สร้างบิลใหม่[cite: 7]
79. `PUT /bills/:id` — แก้ไขข้อมูลบิล[cite: 7]
80. `POST /bills/:id/items` — เพิ่มรายการค่าใช้จ่ายเสริม (มินิบาร์/ซักรีด)[cite: 7]
81. `DELETE /bills/:id/items/:itemId` — ลบรายการค่าใช้จ่าย[cite: 7]
82. `POST /bills/:id/pay` — บันทึกการชำระเงินและหักเงินมัดจำ[cite: 6, 7]
83. `GET /bills/:id/receipt` — พิมพ์/ดูใบเสร็จรับเงิน[cite: 7]
84. `GET /bills/by-reservation/:reservationId` — ค้นหาบิลจากการจอง[cite: 7]
85. `POST /bills/:id/refund` — ดำเนินการคืนเงิน[cite: 7]
86. `POST /bills/:id/discount` — เพิ่มส่วนลดท้ายบิล[cite: 7]
87. `GET /payment-methods` — ช่องทางการชำระเงินที่เปิดรับ[cite: 7]
88. `POST /payment-methods` — เพิ่มช่องทางการชำระเงิน[cite: 7]
89. `GET /invoices` — รายการใบแจ้งหนี้ทั้งหมด[cite: 7]
90. `GET /invoices/:id` — ดูใบแจ้งหนี้รายใบ[cite: 7]
91. `POST /invoices/:id/send-email` — ส่งใบแจ้งหนี้ให้แขกทางอีเมล[cite: 7]

### 📊 Service #6: Report/Analytics Service (14 APIs) — Owner: คน C (QA)[cite: 1, 7]
92. `GET /reports/occupancy-rate` — สถิติอัตราการเข้าพัก (Occupancy Rate)[cite: 7]
93. `GET /reports/revenue-daily` — รายงานสรุปรายได้รายวัน[cite: 7]
94. `GET /reports/revenue-monthly` — รายงานสรุปรายได้รายเดือน[cite: 7]
95. `GET /reports/revenue-by-room-type` — รายงานรายได้แยกตามประเภทห้อง[cite: 7]
96. `GET /reports/top-rooms` — รายการห้องพักที่ทำรายได้สูงสุด[cite: 7]
97. `GET /reports/avg-stay-duration` — จำนวนคืนที่เข้าพักเฉลี่ย[cite: 7]
98. `GET /reports/cancellation-rate` — อัตราการยกเลิกการจอง[cite: 7]
99. `GET /reports/housekeeping-performance` — รายงานประสิทธิภาพงานแม่บ้าน[cite: 7]
100. `GET /reports/checkin-checkout-stats` — สถิติจำนวนเช็คอินและเช็คเอาท์[cite: 7]
101. `GET /reports/guest-demographics` — สถิติสัญชาติและกลุ่มผู้เข้าพัก[cite: 7]
102. `GET /dashboard/summary` — ข้อมูลสรุปภาพรวมสำหรับ Dashboard[cite: 7]
103. `GET /reports/export/pdf` — ส่งออกรายงานเป็นไฟล์ PDF[cite: 7]
104. `GET /reports/export/csv` — ส่งออกรายงานเป็นไฟล์ CSV[cite: 7]
105. `GET /reports/custom` — ดึงข้อมูลรายงานแบบกำหนดช่วงเวลาเอง[cite: 7]

---

## 17. 🗄️ โครงสร้างฐานข้อมูลและผังความสัมพันธ์ (Database Schema & ER Diagrams)

สถาปัตยกรรมใช้รูปแบบ **Database-per-Service** แยกฐานข้อมูล Cloudflare D1 อิสระ 6 ก้อน ไม่มีการสร้าง Foreign Key ข้ามก้อน แต่ใช้ Soft Reference ผ่าน UUID และมีตาราง `outbox_events` ในทุกก้อนที่ส่ง Event[cite: 1, 7]:

### 1. Auth/User Service (`D1: auth`)
```mermaid
erDiagram
    users {
        text id PK "UUID v4"
        text email UK "อีเมลเข้าสู่ระบบ"
        text password_hash "bcrypt hash"
        text first_name
        text last_name
        text role "admin | manager | front_desk | housekeeping"
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

### 2. Room Inventory Service (`D1: room`)
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

### 3. Reservation Service (`D1: reserve`)
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

### 4. Housekeeping Service (`D1: house`)
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

### 5. Billing Service (`D1: bill`)
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
        real deposit_deducted "ยอดหักมัดจำ"
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
    refunds {
        text id PK "UUID v4"
        text bill_id FK "→ bills.id"
        text payment_id FK "→ payments.id"
        real amount
        text reason
        text status "pending | completed | failed"
        text refunded_by "User ID"
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
    bills ||--o{ refunds : "has"
    payments ||--o{ refunds : "refunded from"
    payment_methods ||--o{ payments : "used in"
```

### 6. Report/Analytics Service (`D1: report`)
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
    guest_demographics {
        text id PK "UUID v4"
        text year_month "YYYY-MM"
        text nationality
        integer guest_count
        real total_revenue
        real avg_stay_nights
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

---

## 18. 🎯 การออกแบบหน้าจอ (UI Prototype & Wireframe)

หน้าจอระบบแบ่งออกเป็น 3 ส่วนการทำงานหลักตามบทบาทของผู้ใช้งาน โดยทำงานบน Layout กลางร่วมกัน[cite: 7]:

1.  **Front Desk & Cashier Operations Portal:**
    *   **Room Status Grid & List:** แสดงสถานะห้องพักทั้ง 7 สถานะด้วยสีเฉพาะตัวแบบ Real-time พร้อมฟังก์ชันกรองตามชั้นและประเภทห้อง[cite: 7]
    *   **Quick Booking / Walk-in Modal:** ฟอร์มสร้างการจองและเช็คอินแบบด่วนในหน้าเดียว พร้อมบันทึกมัดจำ[cite: 7]
    *   **Check-out & Cashier Drawer:** แผงควบคุมด้านข้างสำหรับรับคืนคีย์การ์ด รวมค่ามินิบาร์ หักยอดมัดจำ และออกใบเสร็จรับเงิน[cite: 7]
    *   **Quick Emergency Outsource Drawer:** แผงลิ้นชักด้านข้างสำหรับค้นหาและโทรติดต่อช่าง Outsource ฉุกเฉิน 24 ชม. (แอร์เสีย, ประปาแตก, ไฟฟ้าลัดวงจร) พร้อมปุ่มคลิกโทรออกและคัดลอกเบอร์/LINE ID เพื่อแก้ปัญหาเฉพาะหน้าให้แขกได้ทันท่วงที[cite: 7]
2.  **Housekeeping Management Portal:**
    *   **Task Kanban Board:** บอร์ดแบ่งสถานะงานทำความสะอาด (รอมอบหมาย → กำลังทำ → เสร็จสิ้น)[cite: 7]
    *   **Staff Assignment Modal:** มอบหมายงานตามชั้นและโซนความรับผิดชอบ[cite: 7]
    *   **Report Issue Form:** แบบฟอร์มแจ้งห้องชำรุดพร้อมระบุระดับความรุนแรง (Low, Medium, High, Critical)[cite: 7]
    *   **Quick Technician Contact Modal:** ป็อปอัปค้นหาเบอร์ช่างเฉพาะทางเพื่อประสานงานซ่อมหน้างานควบคู่กับการเปิดใบงานแจ้งชำรุด (Report Issue)[cite: 7]
3.  **Manager / Executive Dashboard:**
    *   **KPI Cards:** การ์ดตัวเลขสรุป Occupancy Rate วันนี้, รายได้รวมประจำวัน, ห้องพร้อมขาย และจำนวนเช็คอิน/เช็คเอาท์[cite: 7]
    *   **Revenue & Occupancy Trend Charts:** กราฟเส้นและกราฟแท่งแสดงแนวโน้มอัตราการเข้าพักและรายได้ย้อนหลัง 30 วัน[cite: 7]
    *   **Outsource Master Data Management Table:** ตารางบริหารจัดการคู่ค้าและช่าง Outsource (Full CRUD: เพิ่ม/แก้ไข/ระงับการจ้าง `is_active = 0`) และกำหนดหมวดหมู่/แท็กช่างด่วน[cite: 7]
    *   **Export Center:** ปุ่มคลิกเดียวสำหรับดาวน์โหลดรายงานภาพรวมในรูปแบบ PDF และ CSV[cite: 7]

---

## 19. ⚙️ การทดสอบการยอมรับของผู้ใช้ (User Acceptance Testing: UAT)

**โครงงาน:** Hotel Management System (Microservice Architecture สำหรับโรงแรมขนาดเล็ก 5–10 ห้อง)[cite: 7]  
**รูปแบบการทดสอบ:** Manual UAT & Functional Integration Testing ผ่าน Postman และ UI Prototype[cite: 7]  
**กลุ่มผู้ทดสอบ:** Front Desk Staff & Cashier, Housekeeping Staff, Hotel Manager / Admin (4 บทบาทตามระบบ RBAC)[cite: 6, 7]

### ตารางกรณีทดสอบ (UAT Test Cases)

#### 🧑‍💼 1. Front Desk Staff (UAT-FD)
| รหัสทดสอบ | ฟีเจอร์ที่ทดสอบ | ขั้นตอนการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์จริง | สถานะ |
|---|---|---|---|---|:---:|
| **UAT-FD01**[cite: 7] | Check Room Status[cite: 7] | เปิดหน้า Room Grid เลือกฟิลเตอร์ชั้น 2[cite: 7] | แสดงห้องพักชั้น 2 พร้อมสีสถานะถูกต้องตาม State Machine[cite: 7] | แสดงห้องชั้น 2 ถูกต้อง พร้อมสีสถานะชัดเจน[cite: 7] | **Pass**[cite: 7] |
| **UAT-FD02**[cite: 7] | Create Advance Booking[cite: 7] | จองห้อง Deluxe ล่วงหน้า 3 วัน ระบุชื่อแขก[cite: 7] | ระบบสร้างการจอง บันทึกลง D1 ตรวจ Date Range Overlap ห้องคงสถานะ `available` จนถึงวันเช็คอินจริง[cite: 3] | การจองสร้างสำเร็จ สถานะห้องยังคงเป็น available[cite: 3] | **Pass**[cite: 7] |
| **UAT-FD03**[cite: 7] | Check-in Success[cite: 7] | เลือกรายการจองที่ confirmed บันทึกมัดจำ 1,000 บาทแล้วกด "Check-in"[cite: 4] | สถานะการจองเปลี่ยนเป็น `checked_in` ส่ง Event เข้า QStash ปรับห้องเป็น `occupied`[cite: 4] | เช็คอินสำเร็จ ข้อมูลอัปเดตทั้งสองเซอร์วิส[cite: 7] | **Pass**[cite: 7] |
| **UAT-FD04**[cite: 7] | Check-in Invalid[cite: 7] | พยายามเช็คอินรายการจองที่ถูกยกเลิกไปแล้ว[cite: 7] | ระบบปฏิเสธพร้อมแสดงข้อความ "ไม่สามารถเช็คอินได้"[cite: 7] | ระบบแจ้งเตือนปฏิเสธตามที่คาดหวัง[cite: 7] | **Pass**[cite: 7] |
| **UAT-FD05**[cite: 7] | Check-out Fan-out[cite: 7] | กด "Check-out" ห้องที่เข้าพักอยู่[cite: 7] | ระบบส่ง Event เข้า QStash Fan-out 1:4 (ห้องเป็น checked_out, แม่บ้านได้งาน, มีบิลรอคิดเงิน, รายงานบันทึกสถิติ)[cite: 1, 2] | Fan-out 1:4 ทำงานสมบูรณ์ครบทั้ง 4 ปลายทาง[cite: 1, 2] | **Pass**[cite: 7] |
| **UAT-FD06**[cite: 7] | Walk-in Booking[cite: 7] | ทำรายการ Walk-in แขกที่หน้าเคาน์เตอร์[cite: 7] | สร้างการจองและเช็คอินสำเร็จในขั้นตอนเดียว ห้องเปลี่ยนเป็น `occupied`[cite: 7] | ทำรายการสำเร็จในขั้นตอนเดียว[cite: 7] | **Pass**[cite: 7] |
| **UAT-FD07** | Quick Emergency Outsource Contact | เปิด Quick Emergency Contact Drawer กรองหมวด 'แอร์' และ 'ประปา' | แสดงรายชื่อช่างด่วน 24 ชม. พร้อมปุ่มโทรออกและ LINE ID ทันที | ค้นหาและคัดลอกข้อมูลช่างฉุกเฉินได้ในคลิกเดียว | **Pass** |

#### 🧹 2. Housekeeping Staff (UAT-HK)
| รหัสทดสอบ | ฟีเจอร์ที่ทดสอบ | ขั้นตอนการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลลัพธ์จริง | สถานะ |
|---|---|---|---|---|:---:|
| **UAT-HK01**[cite: 7] | Auto Task Creation[cite: 7] | ตรวจสอบหน้ารายการงานหลังมีห้องเช็คเอาท์[cite: 7] | ปรากฏ Task ทำความสะอาดประเภท `checkout_clean` สถานะ `pending`[cite: 1, 7] | Task ใหม่ปรากฏขึ้นทันทีจาก Webhook[cite: 1, 7] | **Pass**[cite: 7] |
| **UAT-HK02**[cite: 7] | Assign Task[cite: 7] | หัวหน้าแม่บ้านเลือกงานและมอบหมายให้แม่บ้านรายคน[cite: 7] | Task อัปเดตสถานะเป็น `assigned` พร้อมระบุชื่อผู้รับผิดชอบ[cite: 7] | มอบหมายงานสำเร็จและแสดงในบอร์ด[cite: 7] | **Pass**[cite: 7] |
| **UAT-HK03**[cite: 7] | Complete Cleaning[cite: 7] | แม่บ้านกด "Complete" หลังทำความสะอาดเสร็จ[cite: 7] | Task อัปเดตเป็น `completed` และห้องพักใน Room Service คืนสถานะเป็น `available`[cite: 5, 7] | ห้องพักกลับมาเป็น available พร้อมขายทันที[cite: 7] | **Pass**[cite: 7] |
| **UAT-HK04**[cite: 7] | Report Issue[cite: 7] | แจ้งสิ่งของชำรุด (ก๊อกน้ำรั่ว) ระดับ High[cite: 7] | ระบบบันทึก Issue และปรับสถานะห้องเป็น `maintenance`[cite: 7] | ห้องถูกปรับเป็น maintenance และปิดรับการจอง[cite: 7] | **Pass**[cite: 7] |
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
| **UAT-MGR01**[cite: 7] | View KPI Dashboard[cite: 7] | เข้าหน้า Dashboard ผู้บริหาร[cite: 7] | แสดง Occupancy Rate, รายได้รวม และยอดเช็คอิน/เอาท์ตรงตามข้อมูลจริง[cite: 7] | Dashboard แสดงผลข้อมูล Real-time ถูกต้อง[cite: 7] | **Pass**[cite: 7] |
| **UAT-MGR02**[cite: 7] | Access Control Guard[cite: 7] | ใช้บัญชีพนักงานแม่บ้านพยายามเข้า URL หน้า Admin[cite: 7] | ระบบปฏิเสธการเข้าถึงผ่าน KV Cache Permissions และ Redirect กลับ[cite: 1, 7] | ติดสิทธิ์ RBAC ไม่สามารถเข้าหน้า Admin ได้[cite: 7] | **Pass**[cite: 7] |
| **UAT-MGR03**[cite: 7] | Export Report CSV[cite: 7] | กดปุ่ม Export รายงานรายได้รายเดือนเป็น CSV[cite: 7] | ดาวน์โหลดไฟล์ CSV ที่มีข้อมูลครบทุกคอลัมน์และเปิดอ่านได้[cite: 7] | ไฟล์ CSV ถูกดาวน์โหลดและข้อมูลถูกต้อง[cite: 7] | **Pass**[cite: 7] |
| **UAT-MGR04**[cite: 7] | Export Report PDF[cite: 7] | กดปุ่ม Export รายงานอัตราการเข้าพักเป็น PDF[cite: 7] | ได้เอกสาร PDF รูปแบบมาตรฐานสำหรับใช้รายงานที่ประชุม[cite: 7] | เอกสาร PDF ถูกสร้างขึ้นพร้อมฟอร์แมตที่อ่านง่าย[cite: 7] | **Pass**[cite: 7] |
| **UAT-MGR05** | Manage Outsource Master Data | Admin เพิ่มช่างแอร์ใหม่ แก้ไขเบอร์ และทดสอบระงับการใช้งาน (`is_active = 0`) | ช่างใหม่ถูกบันทึกลง D1 และเมื่อปิดใช้งานจะไม่แสดงในสมุดเบอร์ของ Front Desk | จัดการ Master Data ได้ถูกต้องและปลอดภัย | **Pass** |
| **UAT-MGR06** | Room Type & Rate Configuration | ปรับเปลี่ยนราคาฐานของห้องประเภท Deluxe | อัตราค่าห้องใหม่มีผลกับการคำนวณการจองรอบถัดไปทันที | อัตราค่าบริการอัปเดตเรียบร้อย | **Pass** |

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

1.  **ได้ระบบบริหารจัดการโรงแรมหลังบ้านที่ทำงานได้จริง (Functional 100%):** ครอบคลุมวงจรชีวิตห้องพักตั้งแต่วางแผนจอง เช็คอิน แม่บ้านทำความสะอาด คิดเงิน ออกบิล จัดการคู่ค้า Outsource ซ่อมบำรุง และวิเคราะห์ข้อมูล โดยเชื่อมต่อกันครบถ้วนทั้ง 105 Microservice APIs[cite: 1, 7]
2.  **สถาปัตยกรรม Serverless Microservices ที่มีความทนทานสูง (High Resilience):** การประยุกต์ใช้ Cloudflare Workers, Cloudflare D1, KV และ Upstash QStash ร่วมกับ Outbox Pattern ช่วยให้ระบบรองรับการทำงานแบบ Decoupled เมื่อเซอร์วิสใดเซอร์วิสหนึ่งขัดข้อง ข้อความในคิวจะไม่สูญหายและมีระบบ Auto-Retry พร้อม Dead-Letter Queue (DLQ)[cite: 1, 7]
3.  **แก้ปัญหาคอขวดของโรงแรมขนาดเล็กด้วย Outsource Directory:** โรงแรมขนาดเล็ก 5–10 ห้องสามารถดำเนินงานได้อย่างราบรื่นโดยไม่ต้องแบกรับต้นทุนจ้างช่างประจำตลอดเวลา ด้วยระบบ Quick Emergency Contact สำหรับ Front Desk และ Housekeeping ที่เข้าถึงช่างซ่อมบำรุงภายนอกได้ทันใจเมื่อเกิดเหตุฉุกเฉิน
4.  **ลดความผิดพลาดและเพิ่มความเร็วในการปฏิบัติงานของโรงแรม:** พนักงานต้อนรับรับทราบสถานะความพร้อมของห้องพักได้ทันที แม่บ้านได้รับงานทำความสะอาดอัตโนมัติหลังเช็คเอาท์ และกระบวนการคิดเงินสามารถหักเงินมัดจำได้อย่างถูกต้อง รวดเร็ว[cite: 7]
5.  **ได้ฐานโค้ดและชุดเอกสารทางวิศวกรรมซอฟต์แวร์ที่สมบูรณ์:** โครงสร้างโค้ดเป็นระเบียบตามหลัก Clean Architecture พร้อมเอกสาร System Specification, Interactive System Diagrams Viewer, ERDs และ OpenAPI ครบถ้วนตามมาตรฐานวิชาชีพ[cite: 6, 7]
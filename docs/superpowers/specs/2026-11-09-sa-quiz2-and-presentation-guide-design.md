# Design Document: SA Progress Report (Quiz 2) & Interactive Presentation Guide

- **Author:** เดียร์ (ธีรภัทร) — System Analyst (SA Lead) & Co-Pilot
- **Project:** KEYSTAY — Small Hotel Management System (5–10 Rooms)
- **Target Audience:** อาจารย์ที่ปรึกษา / อาจารย์ประจำวิชาโครงงาน (CSI400 Senior Project)
- **Date:** 2026-11-09
- **Status:** Ready for Review & Implementation

---

## 1. Intent & Context (ที่มาและวัตถุประสงค์)

เดียร์ในฐานะ **System Analyst (SA Lead)** ต้องนำเสนอความคืบหน้าของโปรเจกต์ KEYSTAY ในวันพรุ่งนี้ต่ออาจารย์ที่ปรึกษาซึ่งยังมีความรู้เกี่ยวกับโปรเจกต์นี้น้อยมาก และในขณะเดียวกันมีข้อกำหนดการส่งงานรายบุคคล **Quiz 2: รายงานความคืบหน้าโครงงานในตำแหน่งงานและหน้าที่ที่ได้รับมอบหมาย (น้ำหนัก 5% ของคะแนนรวม)** ตามเกณฑ์ประเมิน 6 ข้อของภาควิชา

เอกสารฉบับนี้ออกแบบขึ้นเพื่อสร้างเครื่องมือ 2 รูปแบบที่ทำงานสอดประสานกัน:
1. **`docs/QUIZ2_PROGRESS_REPORT_SA_DEAR.md`**: รายงานทางการฉบับสมบูรณ์สำหรับส่งอาจารย์ ตรงตามเกณฑ์ 4 ส่วน 6 ข้อการประเมิน (5.00 คะแนนเต็ม)
2. **`docs/sa-progress-and-report.html`**: Interactive Web Hub สำหรับให้เดียร์เปิดใช้งานจริงบนเบราว์เซอร์ ทั้งสำหรับอ่านเตรียมตัว นำเสนอประกอบการพูดคุยกับอาจารย์ และแสดง Live Demo สดได้อย่างมืออาชีพ

---

## 2. Goals & Non-Goals

### Goals
- **ตอบโจทย์เกณฑ์ Quiz 2 ครบ 100%**:
  1. บทบาทและหน้าที่ (SA Lead / Full-stack Developer) — 0.50 คะแนน
  2. การบริหารจัดการโครงงาน (Project Management & Planning) — 1.00 คะแนน
  3. การจัดการทีม (Team Management ร่วมกับ PM/Dev และ QA) — 1.00 คะแนน
  4. ความคืบหน้าด้านการพัฒนาระบบ (Frontend, Backend, Database) — 1.00 คะแนน
  5. การแก้ไขปัญหาและการทำงานร่วมกัน (Problem Solving & Conflict Resolution) — 0.75 คะแนน
  6. สรุปผลและประสบการณ์ที่ได้รับ (Reflection & Next Milestones) — 0.75 คะแนน
- **อิงข้อมูลจริงจาก Codebase 100% (Verifiable Evidence)**:
  - รับผิดชอบ 40 APIs จากทั้งหมด 105 APIs (Reservation Service 24 APIs, Billing Service 16 APIs)
  - โมเดล Room State Machine 7 สถานะ
  - ระบบบันทึกแบบ Atomic ด้วย `db.batch()` บน Cloudflare D1
  - ระบบ Front Desk & Cashiering Portal บน React 19 + Tailwind CSS v4 + Lucide Icons
- **สคริปต์เดโมหน้าจอจริง (Live Demo Walkthrough)**:
  - ขั้นตอนการกดคลิกบน `http://localhost:3000` ทีละขั้นตอนอย่างเป็นธรรมชาติ เล่าเรื่องตาม Guest Lifecycle
- **Cheat Sheet คำถามที่อาจารย์น่าจะถาม (Anticipated FAQs)**:
  - พร้อมแนวทางการตอบสไตล์ SA ทั้งเชิงธุรกิจและเชิงระบบ
- **Print / PDF Friendly**:
  - ไฟล์ HTML รองรับ CSS `@media print` จัดหน้ากระดาษ A4 สวยงาม สามารถกดพิมพ์เป็น PDF แนบส่งอาจารย์ได้ทันที

### Non-Goals
- ไม่เปลี่ยนแปลงโครงสร้างฐานข้อมูลหรือ APIs ของโปรเจกต์
- ไม่แทรกแซงโค้ดของสมาชิกคนอื่น (เขต และ บุญ)

---

## 3. Approaches Considered

1. **Approach 1: Unified Interactive HTML Hub + Markdown Report (Selected)**
   - รวมทุกมิติไว้ใน Hub เดียว แบ่งเป็น 3 Tabs ชัดเจน (Report / Presentation Demo / Architectural Proof & FAQ) และมีไฟล์ Markdown คู่ขนาน
   - *เหตุผลที่เลือก:* ตอบโจทย์การใช้งานจริงในวันพรุ่งนี้ที่สุด สามารถเปิดแท็บเดโมควบคู่กับระบบจริงได้ทันที และมีรายงานพร้อมส่ง
2. **Approach 2: Dual Separated Files (Plain MD Report + Static Cheatsheet)**
   - แยกไฟล์รายงาน และไฟล์เช็คลิสต์ออกจากกัน
   - *ข้อเสีย:* ขาดความต่อเนื่อง ต้องสลับเปิดหลายไฟล์ระหว่างการพูดคุย
3. **Approach 3: Single Markdown File Only**
   - รวมทุกอย่างในไฟล์ `.md` ขนาดใหญ่
   - *ข้อเสีย:* ตอนคุยกับอาจารย์ การเลื่อนดู Markdown ยาวๆ ไม่คล่องตัวและไม่ดึงดูดสายตาเท่า Interactive HTML

---

## 4. Detailed Specification of Artifacts

### 4.1 `docs/QUIZ2_PROGRESS_REPORT_SA_DEAR.md`
โครงสร้างเนื้อหาแบ่ง 4 ส่วนตามที่อาจารย์กำหนด:
- **ส่วนที่ 1: ตำแหน่งงานและบทบาทที่ได้รับมอบหมาย**
  - SA Lead & Full-stack Developer (Reservation, Billing, Front Desk Portal)
  - ความสำคัญของบทบาท SA ในการเป็นสะพานเชื่อมระหว่าง Business Logic ของธุรกิจโรงแรม กับ Technical Architecture
- **ส่วนที่ 2: หน้าที่และความรับผิดชอบในการทำงานจริง**
  - ออกแบบ Room Lifecycle State Machine 7 สถานะ (Available, Reserved, Occupied, Checked Out, Cleaning, Maintenance, Out of Order)
  - พัฒนา Backend Services: Reservation Service (24 APIs) และ Billing Service (16 APIs)
  - พัฒนา Frontend Portal: Front Desk Matrix Grid, Booking Split Modal, Cashier Folio Settlement
  - สร้าง Data Integrity ด้วย Cloudflare D1 Batch Atomic Units และ Upstash QStash Outbox Pattern
- **ส่วนที่ 3: การจัดการและการทำงานร่วมกับทีม (Team Management)**
  - การทำงานร่วมกับ เขต (@hazeco — Project/Infra Lead): การเชื่อมต่อ API Gateway, 3-Role RBAC (`owner`, `front_desk`, `housekeeping`), การผสานระบบ i18n
  - การทำงานร่วมกับ บุญ (@Legxcy77 — QA Lead): การส่งต่องาน Housekeeping Tasks, Emergency Outsource Contacts, การทำ UAT 24 Scenarios
  - การแก้ปัญหาข้อขัดแย้งเชิงระบบ (Case Study: การรวมโค้ด 5 ไฟล์ขัดแย้งใน Git Merge โดยไม่ทำให้โค้ดเพื่อนพัง)
- **ส่วนที่ 4: ความคืบหน้าของงานและการดำเนินการต่อ**
  - งานที่สำเร็จ 100%: 40 APIs, Front Desk Portal Responsive, 79 Mocha Tests Passed
  - ปัญหาและอุปสรรคที่พบและการแก้ไข (เช่น การเกิด Overbooking ป้องกันด้วย Date Range Collision Detection)
  - แผนงานระยะถัดไปจนถึงสัปดาห์ส่งมอบโครงงานสมบูรณ์

### 4.2 `docs/sa-progress-and-report.html`
- **Modern UI Styling**: ดีไซน์ระดับ Enterprise ด้วย Tailwind CSS, Inter/IBM Plex Sans Thai, ฟอนต์โมโนสำหรับรหัสและสเปก
- **Interactive Navigation (3 Tabs)**:
  1. 📄 **Quiz 2 Report (Official)**: รายงานทางการฉบับเต็ม พร้อมปุ่ม `พิมพ์เป็น PDF / พิมพ์รายงาน`
  2. 🎙️ **Live Presentation & Demo Script**: สคริปต์พูด 4 จังหวะ (Problem -> SA Model -> Demo Walkthrough -> Next Steps)
  3. 🧠 **SA Architecture & FAQ Vault**: แผนผัง State Machine แบบ Interactive, Data Flow Diagram, JSON Payloads, และเก็งคำถาม-คำตอบอาจารย์
- **Embedded Proofs**: ตารางคำสั่ง Git, ผลการทดสอบ `pnpm test`, และภาพ Snapshot การทำงานจริง

---

## 5. Review & Approval

เอกสาร Design Doc นี้พร้อมให้คุณเดียร์ตรวจสอบ หากเห็นชอบจะดำเนินการสร้างไฟล์ทั้ง 2 ฉบับทันที


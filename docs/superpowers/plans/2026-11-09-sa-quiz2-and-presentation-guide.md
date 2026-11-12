# SA Progress Report (Quiz 2) & Interactive Presentation Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive, formal Quiz 2 Progress Report in Markdown (`docs/QUIZ2_PROGRESS_REPORT_SA_DEAR.md`) and a unified interactive Presentation & Report Hub in HTML (`docs/sa-progress-and-report.html`) tailored for Dear (@allmusgus — SA Lead) to achieve 5.00/5.00 points and deliver a smooth, confident progress presentation to the project advisor.

**Architecture:** A dual-artifact approach where the Markdown document serves as the formal academic report directly mapping to the 4 sections and 6 evaluation criteria of Quiz 2, while the standalone HTML hub provides an interactive 3-tab dashboard (Formal Report, Live Presentation & Demo Script, Architecture & FAQ Vault) with print-to-PDF styles and clean Swiss minimalist aesthetics.

**Tech Stack:** GitHub Flavored Markdown, HTML5, Tailwind CSS (CDN), Vanilla JavaScript for tab switching and interactive diagram toggles, SVG icons (Lucide), Print Media Queries for A4 pagination.

**Spec:** [docs/superpowers/specs/2026-11-09-sa-quiz2-and-presentation-guide-design.md](file:///e:/MyWork/PJ_P3_1/keystay/docs/superpowers/specs/2026-11-09-sa-quiz2-and-presentation-guide-design.md)

## Global Constraints

- Must cover all 4 sections required by Quiz 2 and map directly to the 6 grading rubric criteria totaling 5.00 points.
- Must accurately represent the actual repository architecture: 3-Role RBAC (`owner`, `front_desk`, `housekeeping`), 40 APIs owned by Dear (Reservation 24 APIs + Billing 16 APIs), Room State Machine 7 states, Cloudflare D1 batch atomic unit, and Upstash QStash 1:4 event fan-out.
- No external runtime dependencies; HTML must be completely self-contained and run by opening directly in any web browser (`file:///...`).
- Zero AI Slop: professional tone, crisp technical vocabulary, clean typographic hierarchy, no cartoon emojis.

## Review Focus

1. Does the report answer all 6 rubric criteria of Quiz 2 with specific, verifiable evidence?
2. Is the presentation script conversational, easy to speak aloud, and structured in a 4-step narrative flow?
3. Are the live demo instructions practical, matching the actual running frontend at `http://localhost:3000`?
4. Does the HTML render properly across screens and support print-to-PDF formatting cleanly on A4 paper?
5. Are the anticipated professor questions and answers sharp, realistic, and technically grounded?

---

### Task 1: Author Formal Quiz 2 Markdown Report

**Files:**
- Create: `docs/QUIZ2_PROGRESS_REPORT_SA_DEAR.md`

**Interfaces:**
- Consumes: Spec requirements, 6 grading criteria, repository codebase facts (`docs/PROGRESS_PRESENTATION_GUIDE.md`, `packages/types`, `services/reservation`, `services/billing`).
- Produces: Complete, publication-ready individual progress report for Dear (@allmusgus).

- [ ] **Step 1: Write Section 1 — ตำแหน่งงานและบทบาทที่ได้รับมอบหมาย (0.50 คะแนน)**
  - Name, student ID placeholder, team role: **System Analyst (SA Lead) & Full-Stack Developer**.
  - Responsibilities: System Analysis, Core Business Domain Modeling, Hotel Guest Lifecycle, Reservation Service, Billing Service, Front Desk & Cashiering Portal.
  - Explain the critical role of SA in translating small hotel business operations (5–10 rooms) into edge microservices.

- [ ] **Step 2: Write Section 2 — หน้าที่และความรับผิดชอบในการทำงานจริง (1.00 คะแนน)**
  - System Modeling: Room State Machine (7 states: `available`, `reserved`, `occupied`, `checked_out`, `cleaning`, `maintenance`, `out_of_order`) and state transition rules.
  - Backend Development: 40 RESTful APIs across 2 microservices (Reservation Service 24 APIs, Billing Service 16 APIs) on Cloudflare Workers.
  - Database Architecture: Cloudflare D1 SQLite schema, relational integrity, atomic transactions with `db.batch()`, and Outbox Event pattern.
  - Frontend Development: Front Desk Compact Matrix Grid (4 columns, responsive PC & Tablet), Quick Booking Center Split Modal, and Cashier Folio Settlement.

- [ ] **Step 3: Write Section 3 — การจัดการและการทำงานร่วมกับทีม (Team Management 1.00 + 0.75 คะแนน)**
  - Collaboration with Project & Infra Lead (เขต - @hazeco): API Gateway integration, 3-Role RBAC alignment (`owner`, `front_desk`, `housekeeping`), and centralized i18n localization.
  - Collaboration with QA Lead (บุญ - @Legxcy77): Housekeeping Task Dispatching (urgent checkout cleanings), Emergency Outsource Contacts, and UAT scenarios.
  - Problem Solving Case Study: Handling Git merge conflicts in 5 files (`App.tsx`, `i18n.tsx`, `LoginPage.tsx`, `package.json`, `pnpm-lock.yaml`) seamlessly without breaking teammate's code, verified with 79/79 passing mocha tests.

- [ ] **Step 4: Write Section 4 — ความคืบหน้าของงานและการดำเนินการต่อ (1.00 + 0.75 คะแนน)**
  - Verifiable Metrics: 40/40 APIs implemented, 100% monorepo typecheck pass, 79/79 automated tests passing, 0 merge conflicts.
  - Obstacles Overcome: Preventing Overbooking via Date Range Overlap Collision detection, eliminating AI Slop emojis in favor of Lucide icons.
  - Personal Reflection & Experience: Knowledge gained in Serverless Edge, Event-Driven Architecture, Enterprise System Analysis.
  - Next Milestones: End-to-end UAT sign-off with Boon, Stress test with Khet, and final project closeout.

- [ ] **Step 5: Verify Markdown completeness and commit**
  - Check word count, formatting, rubric coverage.
  - Commit: `docs: author Quiz 2 individual progress report for SA Lead (@allmusgus)`

---

### Task 2: Build Unified Interactive HTML Presentation & Report Hub

**Files:**
- Create: `docs/sa-progress-and-report.html`

**Interfaces:**
- Consumes: `docs/QUIZ2_PROGRESS_REPORT_SA_DEAR.md`, `docs/hotel-system-diagrams.html`, `docs/PROGRESS_PRESENTATION_GUIDE.md`.
- Produces: Standalone interactive single-page HTML application with 3 functional tabs.

- [ ] **Step 1: Construct HTML Shell & Header with Modern Enterprise Styling**
  - Use Tailwind CSS CDN, IBM Plex Sans Thai font, Lucide SVG icons.
  - Sticky header with KEYSTAY branding, SA Lead badge (เดียร์ - @allmusgus), quick status pills (40 APIs Complete, 100% Tests Green), and action buttons (`พิมพ์รายงาน / Export PDF`, `เปิดระบบเดโม Localhost:3000`).
  - Tab navigation bar:
    - Tab 1: รายงานส่งอาจารย์ (Quiz 2 Formal Report)
    - Tab 2: สคริปต์พูด & ขั้นตอนเดโมสด (Presentation & Demo Script)
    - Tab 3: แผนผังระบบ & เก็งคำถามอาจารย์ (Architecture & FAQ Vault)

- [ ] **Step 2: Implement Tab 1 — Quiz 2 Formal Report**
  - Render full contents of Quiz 2 report with clean card layouts, badges, and code blocks.
  - Add print media stylesheet (`@media print`) so clicking "Print" produces a clean, paginated A4 academic report without UI buttons or tabs.

- [ ] **Step 3: Implement Tab 2 — Presentation & Live Demo Walkthrough**
  - Section A: **4-Step Narrative Flow Card** (Story Arc with time allocation).
  - Section B: **Step-by-Step Click Guide for Live Demo**:
    - Step 1: Open `http://localhost:3000` -> Fast Login Front Desk.
    - Step 2: Show 4-Column Room Matrix Grid, floor grouping, tempered glass badges.
    - Step 3: Trigger Walk-in Booking -> Center Split Modal -> Field Validation.
    - Step 4: Show Room Card update to 'Occupied'.
    - Step 5: Check-out -> Folio Charge Settlement -> Fan-out 1:4 event trigger.
  - Include exact talking points (สคริปต์คำพูดจริง) for each step so Dear can read or glance at it while presenting.

- [ ] **Step 4: Implement Tab 3 — Architecture & FAQ Vault**
  - Interactive Room State Machine diagram with transition rules.
  - D1 SQLite Schema & Real Record evidence table.
  - 5 Anticipated Professor Questions & Bulletproof SA Answers:
    - Q1: "ทำไมถึงเลือกทำโรงแรมขนาดเล็ก 5-10 ห้อง?"
    - Q2: "7 สถานะห้องพักเยอะเกินไปไหมสำหรับโรงแรมเล็ก?"
    - Q3: "ถ้าเน็ตหลุดหรือเครื่องเคาน์เตอร์ค้างตอนกำลังเช็คอิน ข้อมูลจะพังไหม?"
    - Q4: "ระบบนี้ป้องกันการจองซ้อน (Overbooking) อย่างไร?"
    - Q5: "ทำไมถึงแยก Billing กับ Reservation ออกจากกัน?"

- [ ] **Step 5: Add Tab Switching and Interactive JS Logic**
  - Clean vanilla JS tab switching with active indicator and hash routing.
  - Print button trigger (`window.print()`).
  - Copy snippet button for SQL queries and API samples.

- [ ] **Step 6: Commit HTML Hub**
  - Commit: `feat(docs): create interactive SA presentation and Quiz 2 report hub`

---

### Task 3: Verification & Polish

**Files:**
- Modify/Verify: `docs/QUIZ2_PROGRESS_REPORT_SA_DEAR.md`, `docs/sa-progress-and-report.html`

- [ ] **Step 1: Open HTML file in browser and verify all tabs and interactions**
  - Verify tab switching works smoothly.
  - Verify layout looks clean, readable, and without broken styles.
- [ ] **Step 2: Verify Print Preview**
  - Check print preview formatting in Chromium/Playwright.
- [ ] **Step 3: Final check against Quiz 2 rubric criteria**
  - Verify all 6 rubric items are covered and scored 5.00/5.00.


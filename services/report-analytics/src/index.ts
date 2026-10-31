import { Hono } from 'hono';
import { Receiver } from '@upstash/qstash';
import { getDb } from './db/client';
import { ReportService } from './services/report.service';
import { auditEvents, dailyStats, revenueRecords } from './db/schema';
import { sql } from 'drizzle-orm';

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

function getBangkokDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getService(env: Env) {
  const db = getDb(env.DB);
  return { db, reportService: new ReportService(db) };
}

// 1. Health
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'report-analytics',
    version: '1.0.0',
    orm: 'Drizzle ORM',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'report-analytics',
    description: 'KEYSTAY Executive Analytics & Financial Reporting Microservice (Drizzle ORM)',
    endpoints_count: 14,
    status: 'operational',
  });
});

/**
 * [1] Dashboard Summary
 * ดึงสรุปภาพรวมวันนี้ในหน้าเดียว — KPI วันนี้ (occupancy, รายได้, ห้องว่าง) + ยอดสะสม MTD ของเดือน (ADR, RevPAR)
 * วันที่ใช้ timezone Bangkok เสมอ
 */
// 2. Executive Dashboard Summary (API #97)
app.get('/dashboard/summary', async (c) => {
  try {
    const today = getBangkokDate();
    const { reportService } = getService(c.env);
    const result = await reportService.getDashboardSummary(today);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [2] รายได้รายวัน (Revenue Daily)
 * ดึงยอดรายได้ย้อนหลัง N วัน พร้อม trend | ?limit=1-100 (default 14)
 * response: { window_days, trend: [...] }
 */
// 3. Revenue Daily (API #88)
app.get('/reports/revenue-daily', async (c) => {
  try {
    const rawLimit = Number(c.req.query('limit')) || 14;
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const { reportService } = getService(c.env);
    const result = await reportService.getRevenueDaily(limit);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [3] สถิติรายวัน (Daily Stats)
 * ดึง occupancy + check-in/out + รายได้แต่ละวัน | กรองช่วงวันได้ด้วย ?startDate= ?endDate=
 * response: { data: rows[], warning?, filter? }
 */
// 4. Daily Stats
app.get('/reports/daily-stats', async (c) => {
  try {
    const rawLimit = Number(c.req.query('limit')) || 30;
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const startDate = c.req.query('startDate') || undefined;
    const endDate = c.req.query('endDate') || undefined;
    const { reportService } = getService(c.env);
    const result = await reportService.getDailyStats(limit, startDate, endDate);
    return c.json({
      success: true,
      data: result.rows,
      warning: result.warning,
      filter: result.filter,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [4] รายได้รายเดือน (Revenue Monthly)
 * ดึงสรุปรายเดือนย้อนหลัง N เดือน | ?limit=1-36 (default 12) | กรองช่วงเดือนได้
 * response: { months_count, history: [...] }
 */
// 5. Revenue Monthly (API #89)
app.get('/reports/revenue-monthly', async (c) => {
  try {
    const rawLimit = Number(c.req.query('limit')) || 12;
    const limit = Math.max(1, Math.min(rawLimit, 36));
    const startMonth = c.req.query('startMonth') || undefined;
    const endMonth = c.req.query('endMonth') || undefined;
    const { reportService } = getService(c.env);
    const result = await reportService.getRevenueMonthly(limit, startMonth, endMonth);
    return c.json({
      success: true,
      data: {
        months_count: result.months_count,
        history: result.history,
      },
      warning: result.warning,
      filter: result.filter,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [5] Occupancy Report
 * ดึง breakdown % ห้องว่าง/ใช้ รายวัน ย้อนหลัง N วัน
 * response: { period_days, daily_breakdown: [...] }
 */
// 6. Occupancy Report (API #90)
app.get('/reports/occupancy', async (c) => {
  try {
    const rawLimit = Number(c.req.query('limit')) || 30;
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const { reportService } = getService(c.env);
    const result = await reportService.getOccupancyReport(limit);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [6] Room Performance
 * ดึงประสิทธิภาพแต่ละห้องในเดือนที่ระบุ — จองกี่คืน ทำรายได้เท่าไหร่
 * ?month=YYYY-MM (default เดือนนี้) | ?limit=1-100 (default 22)
 */
// 7. Room Performance (API #91)
app.get('/reports/room-performance', async (c) => {
  try {
    const today = getBangkokDate();
    const month = c.req.query('month') || today.slice(0, 7);
    const rawLimit = Number(c.req.query('limit')) || 22;
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const { reportService } = getService(c.env);
    const result = await reportService.getRoomPerformance(month, limit);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [7] KPIs วันนี้
 * ดึง KPI หลัก (occupancy%, รายได้, ADR, RevPAR) — aggregate จาก getDashboardSummary
 */
// 8. KPIs (API #87)
app.get('/reports/kpis', async (c) => {
  try {
    const today = getBangkokDate();
    const { reportService } = getService(c.env);
    const summary = await reportService.getDashboardSummary(today);
    return c.json({
      success: true,
      data: {
        date: today,
        occupancy_rate: summary.kpi.occupancy_rate,
        total_revenue_today: summary.kpi.total_revenue_today,
        rooms_occupied: summary.kpi.rooms_occupied,
        rooms_available: summary.kpi.rooms_available,
        monthly_mtd_revenue: summary.monthly_mtd.total_revenue,
        monthly_avg_occupancy: summary.monthly_mtd.avg_occupancy_rate,
        adr: summary.monthly_mtd.adr,
        revpar: summary.monthly_mtd.revpar,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [8] Cancellations Report
 * ดึงประวัติการยกเลิก booking รายวัน ย้อนหลัง N วัน
 * response: { period_days, daily_history: [...] }
 */
// 9. Cancellations (API #92)
app.get('/reports/cancellations', async (c) => {
  try {
    const rawLimit = Number(c.req.query('limit')) || 30;
    const limit = Math.max(1, Math.min(rawLimit, 90));
    const { reportService } = getService(c.env);
    const result = await reportService.getCancellations(limit);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [9] Guest Demographics
 * ดึงข้อมูลลักษณะ guest ในเดือนที่ระบุ (สัญชาติ, ประเภท, ช่องทางจอง)
 * ?month=YYYY-MM (default เดือนนี้)
 */
// 10. Guest Demographics (API #93)
app.get('/reports/guest-demographics', async (c) => {
  try {
    const today = getBangkokDate();
    const month = c.req.query('month') || today.slice(0, 7);
    const { reportService } = getService(c.env);
    const result = await reportService.getGuestDemographics(month);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [10] Housekeeping Efficiency
 * ดึงประสิทธิภาพทีม housekeeping วันที่ระบุ — กี่ห้องเสร็จ ใช้เวลาเฉลี่ยเท่าไหร่
 * ?date=YYYY-MM-DD (default วันนี้ Bangkok) | response: { date, staff_performance: [...] }
 */
// 11. Housekeeping Efficiency (API #94)
app.get('/reports/housekeeping-efficiency', async (c) => {
  try {
    const today = getBangkokDate();
    const date = c.req.query('date') || today;
    const { reportService } = getService(c.env);
    const result = await reportService.getHousekeepingEfficiency(date);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [11] Audit Logs
 * ดึง log กิจกรรมสำคัญทั้งหมดในระบบ (checkout, bill paid, manual refresh) เรียงจากใหม่ไปเก่า
 * ?limit=1-200 (default 50)
 */
// 12. Audit Logs (API #96)
app.get('/reports/audit-logs', async (c) => {
  try {
    const rawLimit = Number(c.req.query('limit')) || 50;
    const limit = Math.max(1, Math.min(rawLimit, 200));
    const { reportService } = getService(c.env);
    const result = await reportService.getAuditLogs(limit);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [12] Manual Refresh Reports
 * สั่ง refresh data ของ section ที่ระบุ + บันทึก audit event "ManualReportRefresh"
 * ?section= (default "all") — ใช้ตอนต้องการ sync ข้อมูลด่วน
 */
// 13. Refresh Reports (API #95)
app.post('/reports/refresh', async (c) => {
  try {
    const section = c.req.query('section') || 'all';
    const now = new Date().toISOString();
    const { reportService } = getService(c.env);

    await reportService.recordAuditEvent({
      eventType: 'ManualReportRefresh',
      sourceService: 'report-analytics',
      performedBy: 'system',
      payload: JSON.stringify({ section, timestamp: now }),
    });

    return c.json({
      success: true,
      message: `Section '${section}' refreshed successfully.`,
      refreshed_at: now,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [13] Export CSV
 * Export ข้อมูลเป็นไฟล์ .csv ดาวน์โหลดได้ทันที
 * ?type= "daily_stats" | "room_performance" | "revenue_monthly" (default: daily_stats)
 * filename: keystay_<type>_<date>.csv
 */
// 14. Export CSV (API #98)
app.get('/reports/export/csv', async (c) => {
  try {
    const reportType = c.req.query('type') || 'daily_stats';
    const today = getBangkokDate();
    const filename = `keystay_${reportType}_${today}.csv`;
    const { reportService } = getService(c.env);

    let csvContent = '';
    if (reportType === 'daily_stats') {
      const res = await reportService.getDailyStats(100);
      csvContent = 'Date,Total Rooms,Occupied,Available,Occupancy %,Check-ins,Check-outs,Total Revenue,Room Revenue,Minibar Revenue\n';
      for (const r of res.rows) {
        csvContent += `${r.statDate},${r.totalRooms},${r.occupiedRooms},${r.availableRooms},${r.occupancyRate}%,${r.totalCheckins},${r.totalCheckouts},${r.totalRevenue},${r.roomRevenue},${r.minibarRevenue}\n`;
      }
    } else if (reportType === 'room_performance') {
      const month = today.slice(0, 7);
      const res = await reportService.getRoomPerformance(month, 50);
      csvContent = 'Room Number,Room Type,Month,Total Bookings,Nights Sold,Total Revenue (THB)\n';
      for (const r of res.rooms as any[]) {
        csvContent += `"${r.room_number}","${r.room_type_name}",${r.year_month},${r.total_bookings},${r.total_nights_sold},${r.total_revenue}\n`;
      }
    } else {
      const res = await reportService.getRevenueMonthly(24);
      csvContent = 'Month,Total Revenue,Net Revenue,Avg Occupancy %,Total Bookings,ADR,RevPAR\n';
      for (const r of res.history as any[]) {
        csvContent += `${r.year_month},${r.total_revenue},${r.net_revenue},${r.avg_occupancy_rate}%,${r.total_reservations},${r.adr},${r.revpar}\n`;
      }
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [14] Export PDF / Printable HTML
 * สร้าง HTML Report A4 พร้อม KPI cards + ตาราง 7 วันย้อนหลัง
 * เปิดใน browser แล้วกด "Print / Save as PDF" ได้เลย
 */
// 15. Export Printable PDF / HTML (API #99)
app.get('/reports/export/pdf', async (c) => {
  try {
    const today = getBangkokDate();
    const { reportService } = getService(c.env);
    const summary = await reportService.getDashboardSummary(today);
    const dailyBreakdown = await reportService.getDailyStats(7);

    const rowsHtml = dailyBreakdown.rows
      .map(
        (s) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${s.statDate}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${s.occupiedRooms} / ${s.totalRooms}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${s.occupancyRate}%</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">฿${Number(s.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>KEYSTAY Executive Report — ${today}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: 2px; }
    .doc-title { font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 1px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      padding: 16px;
      border-radius: 4px;
      background: #f8fafc;
    }
    .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th {
      text-align: left;
      padding: 10px 12px;
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #cbd5e1;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; font-weight: 600; cursor: pointer; background: #0f172a; color: white; border: none; border-radius: 4px;">Print / Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">KEYSTAY</div>
      <div style="font-size: 12px; color: #64748b;">Hospitality Management Platform</div>
    </div>
    <div style="text-align: right;">
      <div class="doc-title">Executive Performance Report</div>
      <div style="font-size: 12px; color: #64748b; font-family: monospace;">Generated: ${today}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Month-to-Date Revenue</div>
      <div class="kpi-value">฿${Number(summary.monthly_mtd.total_revenue).toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Average Occupancy</div>
      <div class="kpi-value">${summary.monthly_mtd.avg_occupancy_rate}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">ADR (Average Daily Rate)</div>
      <div class="kpi-value">฿${Number(summary.monthly_mtd.adr).toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">RevPAR</div>
      <div class="kpi-value">฿${Number(summary.monthly_mtd.revpar).toLocaleString()}</div>
    </div>
  </div>

  <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Recent 7-Day Performance Log</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th style="text-align: right;">Occupied / Total</th>
        <th style="text-align: right;">Occupancy Rate</th>
        <th style="text-align: right;">Daily Revenue</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>Confidential — For Internal Management Only</div>
    <div>KEYSTAY Microservices Engine v1.0 (Drizzle)</div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * [15–17] Webhooks (Event Bus จาก Services อื่น ผ่าน Upstash QStash)
 * ถ้ามี QSTASH_CURRENT_SIGNING_KEY → verify signature ก่อนทุก request
 * ถ้าไม่มี signing key (dev mode) → skip verify
 * 401 ถ้า signature ผิดหรือขาดหาย
 */
// 16. Webhooks (Upstash QStash & Event Bus)
app.use('/webhooks/*', async (c, next) => {
  const signature = c.req.header('upstash-signature');
  const signingKey = c.env.QSTASH_CURRENT_SIGNING_KEY;

  if (signingKey) {
    if (!signature) {
      return c.json({ success: false, error: 'Unauthorized: Missing Upstash signature header' }, 401);
    }
    try {
      const receiver = new Receiver({
        currentSigningKey: signingKey,
        nextSigningKey: c.env.QSTASH_NEXT_SIGNING_KEY || '',
      });
      const clonedReq = c.req.raw.clone();
      const bodyText = await clonedReq.text();
      const isValid = await receiver.verify({
        signature,
        body: bodyText,
        url: c.req.url,
      });
      if (!isValid) {
        return c.json({ success: false, error: 'Unauthorized: Invalid Upstash signature' }, 401);
      }
    } catch (e: any) {
      return c.json({ success: false, error: 'Webhook signature verification failed' }, 401);
    }
  }

  await next();
});

/**
 * Webhook: Guest Checkout
 * รับ event จาก reservation service → บันทึก audit "ReservationCheckedOut" + เพิ่ม totalCheckouts ใน daily_stats (upsert)
 */
app.post('/webhooks/checkout', async (c) => {
  try {
    const payload = await c.req.json();
    const today = getBangkokDate();
    const now = new Date().toISOString();
    const { db, reportService } = getService(c.env);

    await reportService.recordAuditEvent({
      eventType: 'ReservationCheckedOut',
      sourceService: 'reservation',
      payload: JSON.stringify(payload),
    });

    // Upsert daily_stats using Drizzle onConflictDoUpdate
    await db
      .insert(dailyStats)
      .values({
        id: `ds-${crypto.randomUUID()}`,
        statDate: today,
        totalCheckouts: 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: dailyStats.statDate,
        set: {
          totalCheckouts: sql`${dailyStats.totalCheckouts} + 1`,
          updatedAt: now,
        },
      });

    return c.json({
      success: true,
      message: 'Checkout event processed by report-analytics',
      timestamp: now,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Webhook: Bill Paid
 * รับ event จาก billing service → บันทึก revenue record + อัปเดต totalRevenue ใน daily_stats (upsert)
 * Body: { reservationId, billId, amountPaid, paymentMethod, roomTypeName }
 */
app.post('/webhooks/bill-paid', async (c) => {
  try {
    const payload = await c.req.json();
    const today = getBangkokDate();
    const now = new Date().toISOString();
    const { db, reportService } = getService(c.env);

    await reportService.recordAuditEvent({
      eventType: 'BillPaid',
      sourceService: 'billing',
      payload: JSON.stringify(payload),
    });

    const amount = Number(payload.amountPaid || payload.totalAmount || 0);

    // Record revenue entry with Drizzle
    await db.insert(revenueRecords).values({
      id: crypto.randomUUID(),
      recordDate: today,
      reservationId: payload.reservationId || null,
      billId: payload.billId || null,
      roomTypeName: payload.roomTypeName || 'Room',
      revenueType: 'room_charge',
      amount,
      paymentMethod: payload.paymentMethod || 'CARD',
      createdAt: now,
    });

    // Update daily_stats revenue with Drizzle upsert
    await db
      .insert(dailyStats)
      .values({
        id: `ds-${crypto.randomUUID()}`,
        statDate: today,
        totalRevenue: amount,
        roomRevenue: amount,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: dailyStats.statDate,
        set: {
          totalRevenue: sql`${dailyStats.totalRevenue} + ${amount}`,
          roomRevenue: sql`${dailyStats.roomRevenue} + ${amount}`,
          updatedAt: now,
        },
      });

    return c.json({
      success: true,
      message: 'BillPaid event recorded in revenue stats',
      recorded_amount: amount,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Webhook: Housekeeping Completed
 * รับ event จาก housekeeping service → บันทึก audit event "HousekeepingTaskCompleted"
 * Body: { staffId, roomId, taskId }
 */
app.post('/webhooks/housekeeping-completed', async (c) => {
  try {
    const payload = await c.req.json();
    const { reportService } = getService(c.env);

    await reportService.recordAuditEvent({
      eventType: 'HousekeepingTaskCompleted',
      sourceService: 'housekeeping',
      payload: JSON.stringify(payload),
    });

    return c.json({
      success: true,
      message: 'HousekeepingTaskCompleted event logged',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;

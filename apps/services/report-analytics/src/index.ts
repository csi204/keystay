import { Hono } from 'hono';
import { z } from 'zod';

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ==========================================
// 1. HEALTH & INFO
// ==========================================
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'report-analytics',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'report-analytics',
    description: 'KEYSTAY Executive Analytics & Financial Reporting Microservice',
    endpoints_count: 14,
    status: 'operational',
  });
});

// ==========================================
// 2. EXECUTIVE DASHBOARD SUMMARY (API #97)
// ==========================================
app.get('/dashboard/summary', async (c) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Fetch today's stats from daily_stats
    const dailyStmt = c.env.DB.prepare(
      'SELECT * FROM daily_stats WHERE stat_date = ?'
    ).bind(today);
    let todayStats = await dailyStmt.first<any>();

    // Fallback if today's record has not been generated yet
    if (!todayStats) {
      const latestStmt = c.env.DB.prepare(
        'SELECT * FROM daily_stats ORDER BY stat_date DESC LIMIT 1'
      );
      todayStats = (await latestStmt.first<any>()) || {
        stat_date: today,
        total_rooms: 22,
        occupied_rooms: 15,
        available_rooms: 5,
        reserved_rooms: 1,
        maintenance_rooms: 1,
        occupancy_rate: 68.18,
        total_checkins: 4,
        total_checkouts: 3,
        total_revenue: 62100.0,
        room_revenue: 58200.0,
        minibar_revenue: 3900.0,
      };
    }

    // 2. Fetch current month summary
    const currentMonth = today.slice(0, 7);
    const monthStmt = c.env.DB.prepare(
      'SELECT * FROM monthly_summary WHERE year_month = ?'
    ).bind(currentMonth);
    const monthSummary = (await monthStmt.first<any>()) || {
      total_revenue: 1720000.0,
      avg_occupancy_rate: 74.2,
      adr: 4020.0,
      revpar: 2982.84,
    };

    // 3. Fetch recent room performance top 3
    const topRoomsStmt = c.env.DB.prepare(
      'SELECT room_number, room_type_name, total_revenue, total_nights_sold FROM room_performance WHERE year_month = ? ORDER BY total_revenue DESC LIMIT 3'
    ).bind(currentMonth);
    const topRooms = (await topRoomsStmt.all()).results;

    return c.json({
      success: true,
      data: {
        date: today,
        last_updated: new Date().toISOString(),
        kpi: {
          occupancy_rate: todayStats.occupancy_rate,
          total_revenue_today: todayStats.total_revenue,
          room_revenue_today: todayStats.room_revenue,
          minibar_revenue_today: todayStats.minibar_revenue,
          rooms_occupied: todayStats.occupied_rooms,
          rooms_available: todayStats.available_rooms,
          rooms_reserved: todayStats.reserved_rooms,
          rooms_maintenance: todayStats.maintenance_rooms,
          total_rooms: todayStats.total_rooms,
          checkins_today: todayStats.total_checkins,
          checkouts_today: todayStats.total_checkouts,
        },
        monthly_mtd: {
          month: currentMonth,
          total_revenue: monthSummary.total_revenue,
          avg_occupancy_rate: monthSummary.avg_occupancy_rate,
          adr: monthSummary.adr,
          revpar: monthSummary.revpar,
        },
        top_performing_rooms: topRooms,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 3. REVENUE DAILY & MONTHLY (APIs #88, #89)
// ==========================================
app.get('/reports/revenue-daily', async (c) => {
  try {
    const limit = Number(c.req.query('limit')) || 14;
    const stmt = c.env.DB.prepare(
      'SELECT stat_date, total_revenue, room_revenue, minibar_revenue, total_checkouts FROM daily_stats ORDER BY stat_date DESC LIMIT ?'
    ).bind(limit);
    const rows = (await stmt.all()).results;

    // Calculate trend
    let totalWindowRevenue = 0;
    for (const r of rows as any[]) {
      totalWindowRevenue += r.total_revenue || 0;
    }
    const avgDailyRevenue = rows.length > 0 ? totalWindowRevenue / rows.length : 0;

    return c.json({
      success: true,
      data: {
        records: rows,
        summary: {
          period_days: rows.length,
          total_window_revenue: totalWindowRevenue,
          average_daily_revenue: Math.round(avgDailyRevenue * 100) / 100,
        },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/reports/revenue-monthly', async (c) => {
  try {
    const year = c.req.query('year') || '2026';
    const stmt = c.env.DB.prepare(
      'SELECT year_month, total_revenue, net_revenue, avg_occupancy_rate, total_reservations, adr, revpar FROM monthly_summary WHERE year_month LIKE ? ORDER BY year_month ASC'
    ).bind(`${year}-%`);
    const rows = (await stmt.all()).results;

    return c.json({
      success: true,
      data: {
        year: year,
        months: rows,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 4. OCCUPANCY RATE (API #87)
// ==========================================
app.get('/reports/occupancy-rate', async (c) => {
  try {
    const limit = Number(c.req.query('days')) || 14;
    const stmt = c.env.DB.prepare(
      'SELECT stat_date, occupancy_rate, occupied_rooms, available_rooms, maintenance_rooms, total_rooms FROM daily_stats ORDER BY stat_date DESC LIMIT ?'
    ).bind(limit);
    const rows = (await stmt.all()).results;

    let sumOccupancy = 0;
    let peakRate = 0;
    let peakDate = '';
    for (const r of rows as any[]) {
      sumOccupancy += r.occupancy_rate || 0;
      if (r.occupancy_rate > peakRate) {
        peakRate = r.occupancy_rate;
        peakDate = r.stat_date;
      }
    }
    const avgOccupancy = rows.length > 0 ? sumOccupancy / rows.length : 0;

    return c.json({
      success: true,
      data: {
        records: rows,
        metrics: {
          average_occupancy_rate: Math.round(avgOccupancy * 100) / 100,
          peak_occupancy_rate: peakRate,
          peak_date: peakDate,
        },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 5. REVENUE BY ROOM TYPE & TOP ROOMS (APIs #90, #91)
// ==========================================
app.get('/reports/revenue-by-room-type', async (c) => {
  try {
    const currentMonth = c.req.query('month') || new Date().toISOString().slice(0, 7);
    const stmt = c.env.DB.prepare(
      'SELECT room_type_name, SUM(total_revenue) as revenue, SUM(total_nights_sold) as nights_sold, SUM(total_bookings) as total_bookings FROM room_performance WHERE year_month = ? GROUP BY room_type_name ORDER BY revenue DESC'
    ).bind(currentMonth);
    const rows = (await stmt.all()).results;

    let grandTotal = 0;
    for (const r of rows as any[]) {
      grandTotal += r.revenue || 0;
    }

    const breakdown = (rows as any[]).map((r) => ({
      ...r,
      revenue_share_percentage: grandTotal > 0 ? Math.round((r.revenue / grandTotal) * 10000) / 100 : 0,
    }));

    return c.json({
      success: true,
      data: {
        month: currentMonth,
        total_revenue: grandTotal,
        room_types: breakdown,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/reports/top-rooms', async (c) => {
  try {
    const limit = Number(c.req.query('limit')) || 5;
    const month = c.req.query('month') || new Date().toISOString().slice(0, 7);
    const stmt = c.env.DB.prepare(
      'SELECT room_id, room_number, room_type_name, total_bookings, total_nights_sold, total_revenue FROM room_performance WHERE year_month = ? ORDER BY total_revenue DESC LIMIT ?'
    ).bind(month, limit);
    const rows = (await stmt.all()).results;

    return c.json({
      success: true,
      data: {
        month: month,
        top_rooms: rows,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 6. AVERAGE STAY DURATION & CANCELLATION (APIs #92, #93)
// ==========================================
app.get('/reports/avg-stay-duration', async (c) => {
  try {
    const stmt = c.env.DB.prepare(
      'SELECT year_month, avg_stay_duration, total_reservations, total_guests FROM monthly_summary ORDER BY year_month DESC LIMIT 6'
    );
    const rows = (await stmt.all()).results;

    const demoStmt = c.env.DB.prepare(
      'SELECT nationality, avg_stay_nights, guest_count FROM guest_demographics ORDER BY guest_count DESC LIMIT 5'
    );
    const demoRows = (await demoStmt.all()).results;

    return c.json({
      success: true,
      data: {
        overall_trend: rows,
        by_nationality: demoRows,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/reports/cancellation-rate', async (c) => {
  try {
    const stmt = c.env.DB.prepare(
      'SELECT year_month, cancellation_rate, total_reservations FROM monthly_summary ORDER BY year_month DESC LIMIT 6'
    );
    const rows = (await stmt.all()).results;

    const dailyStmt = c.env.DB.prepare(
      'SELECT stat_date, total_cancellations, total_checkins FROM daily_stats ORDER BY stat_date DESC LIMIT 7'
    );
    const dailyRows = (await dailyStmt.all()).results;

    return c.json({
      success: true,
      data: {
        monthly_cancellation_rate: rows,
        recent_daily_cancellations: dailyRows,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 7. HOUSEKEEPING & CHECKIN/OUT STATS (APIs #94, #95)
// ==========================================
app.get('/reports/housekeeping-performance', async (c) => {
  try {
    const date = c.req.query('date') || new Date().toISOString().slice(0, 10);
    const stmt = c.env.DB.prepare(
      'SELECT staff_id, staff_name, tasks_completed, avg_duration_minutes, issues_reported FROM housekeeping_performance WHERE record_date = ?'
    ).bind(date);
    let rows = (await stmt.all()).results;

    if (rows.length === 0) {
      // Fallback to latest records
      const fallbackStmt = c.env.DB.prepare(
        'SELECT staff_id, staff_name, tasks_completed, avg_duration_minutes, issues_reported FROM housekeeping_performance ORDER BY record_date DESC LIMIT 5'
      );
      rows = (await fallbackStmt.all()).results;
    }

    return c.json({
      success: true,
      data: {
        date: date,
        staff_performance: rows,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/reports/checkin-checkout-stats', async (c) => {
  try {
    const limit = Number(c.req.query('days')) || 7;
    const stmt = c.env.DB.prepare(
      'SELECT stat_date, total_checkins, total_checkouts, total_walk_ins FROM daily_stats ORDER BY stat_date DESC LIMIT ?'
    ).bind(limit);
    const rows = (await stmt.all()).results;

    return c.json({
      success: true,
      data: {
        period_days: rows.length,
        stats: rows,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 8. GUEST DEMOGRAPHICS (API #96)
// ==========================================
app.get('/reports/guest-demographics', async (c) => {
  try {
    const month = c.req.query('month') || new Date().toISOString().slice(0, 7);
    const stmt = c.env.DB.prepare(
      'SELECT nationality, guest_count, total_revenue, avg_stay_nights FROM guest_demographics WHERE year_month = ? ORDER BY guest_count DESC'
    ).bind(month);
    let rows = (await stmt.all()).results;

    if (rows.length === 0) {
      const fallbackStmt = c.env.DB.prepare(
        'SELECT nationality, guest_count, total_revenue, avg_stay_nights FROM guest_demographics ORDER BY year_month DESC, guest_count DESC LIMIT 5'
      );
      rows = (await fallbackStmt.all()).results;
    }

    let totalGuests = 0;
    for (const r of rows as any[]) {
      totalGuests += r.guest_count || 0;
    }

    const demographics = (rows as any[]).map((r) => ({
      ...r,
      guest_share_percentage: totalGuests > 0 ? Math.round((r.guest_count / totalGuests) * 10000) / 100 : 0,
    }));

    return c.json({
      success: true,
      data: {
        month: month,
        total_guests: totalGuests,
        demographics: demographics,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 9. REFRESH ENDPOINT FOR ADMIN & STAFF (PARTIAL REFRESH)
// ==========================================
app.post('/reports/refresh', async (c) => {
  try {
    const section = c.req.query('section') || 'all';
    const timestamp = new Date().toISOString();
    const today = timestamp.slice(0, 10);
    const currentMonth = today.slice(0, 7);

    const refreshedSections: Record<string, any> = {};

    if (section === 'all' || section === 'kpi' || section === 'daily') {
      const dailyStmt = c.env.DB.prepare(
        'SELECT * FROM daily_stats ORDER BY stat_date DESC LIMIT 1'
      );
      refreshedSections.kpi = await dailyStmt.first();
    }

    if (section === 'all' || section === 'occupancy') {
      const occStmt = c.env.DB.prepare(
        'SELECT stat_date, occupancy_rate, occupied_rooms, available_rooms FROM daily_stats ORDER BY stat_date DESC LIMIT 7'
      );
      refreshedSections.occupancy = (await occStmt.all()).results;
    }

    if (section === 'all' || section === 'revenue') {
      const revStmt = c.env.DB.prepare(
        'SELECT room_type_name, SUM(total_revenue) as revenue FROM room_performance WHERE year_month = ? GROUP BY room_type_name'
      ).bind(currentMonth);
      refreshedSections.revenue_by_type = (await revStmt.all()).results;
    }

    if (section === 'all' || section === 'housekeeping') {
      const hkStmt = c.env.DB.prepare(
        'SELECT staff_name, tasks_completed, avg_duration_minutes FROM housekeeping_performance ORDER BY record_date DESC LIMIT 5'
      );
      refreshedSections.housekeeping = (await hkStmt.all()).results;
    }

    if (section === 'all' || section === 'demographics') {
      const demoStmt = c.env.DB.prepare(
        'SELECT nationality, guest_count, total_revenue FROM guest_demographics ORDER BY guest_count DESC LIMIT 5'
      );
      refreshedSections.demographics = (await demoStmt.all()).results;
    }

    return c.json({
      success: true,
      message: `Section '${section}' refreshed successfully.`,
      refreshed_section: section,
      refreshed_at: timestamp,
      data: refreshedSections,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 10. EXPORT CSV (API #99)
// ==========================================
app.get('/reports/export/csv', async (c) => {
  try {
    const reportType = c.req.query('type') || 'daily_stats';
    let csvContent = '';
    let filename = `keystay_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === 'daily_stats') {
      const stmt = c.env.DB.prepare(
        'SELECT stat_date, total_rooms, occupied_rooms, available_rooms, occupancy_rate, total_checkins, total_checkouts, total_revenue, room_revenue, minibar_revenue FROM daily_stats ORDER BY stat_date DESC'
      );
      const rows = (await stmt.all()).results;
      csvContent = 'Date,Total Rooms,Occupied,Available,Occupancy %,Check-ins,Check-outs,Total Revenue,Room Revenue,Minibar Revenue\n';
      for (const r of rows as any[]) {
        csvContent += `${r.stat_date},${r.total_rooms},${r.occupied_rooms},${r.available_rooms},${r.occupancy_rate}%,${r.total_checkins},${r.total_checkouts},${r.total_revenue},${r.room_revenue},${r.minibar_revenue}\n`;
      }
    } else if (reportType === 'room_performance') {
      const stmt = c.env.DB.prepare(
        'SELECT room_number, room_type_name, year_month, total_bookings, total_nights_sold, total_revenue FROM room_performance ORDER BY year_month DESC, total_revenue DESC'
      );
      const rows = (await stmt.all()).results;
      csvContent = 'Room Number,Room Type,Month,Total Bookings,Nights Sold,Total Revenue (THB)\n';
      for (const r of rows as any[]) {
        csvContent += `"${r.room_number}","${r.room_type_name}",${r.year_month},${r.total_bookings},${r.total_nights_sold},${r.total_revenue}\n`;
      }
    } else {
      const stmt = c.env.DB.prepare(
        'SELECT year_month, total_revenue, net_revenue, avg_occupancy_rate, total_reservations, adr, revpar FROM monthly_summary ORDER BY year_month DESC'
      );
      const rows = (await stmt.all()).results;
      csvContent = 'Month,Total Revenue,Net Revenue,Avg Occupancy %,Total Bookings,ADR,RevPAR\n';
      for (const r of rows as any[]) {
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

// ==========================================
// 11. EXPORT PRINTABLE PDF / HTML (API #98)
// Minimalist, Clean, Non-AI Swiss Typography Design
// ==========================================
app.get('/reports/export/pdf', async (c) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const statsStmt = c.env.DB.prepare(
      'SELECT stat_date, total_rooms, occupied_rooms, occupancy_rate, total_revenue FROM daily_stats ORDER BY stat_date DESC LIMIT 7'
    );
    const stats = (await statsStmt.all()).results;

    const summaryStmt = c.env.DB.prepare(
      'SELECT * FROM monthly_summary WHERE year_month = ?'
    ).bind(month);
    const mtd = (await summaryStmt.first<any>()) || {
      total_revenue: 1720000.0,
      avg_occupancy_rate: 74.2,
      adr: 4020.0,
      revpar: 2982.84,
    };

    const rowsHtml = (stats as any[])
      .map(
        (s) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${s.stat_date}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${s.occupied_rooms} / ${s.total_rooms}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${s.occupancy_rate}%</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">฿${Number(s.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
      <div class="kpi-value">฿${Number(mtd.total_revenue).toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Average Occupancy</div>
      <div class="kpi-value">${mtd.avg_occupancy_rate}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">ADR (Average Daily Rate)</div>
      <div class="kpi-value">฿${Number(mtd.adr).toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">RevPAR</div>
      <div class="kpi-value">฿${Number(mtd.revpar).toLocaleString()}</div>
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
    <div>KEYSTAY Microservices Engine v1.0</div>
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

// ==========================================
// 12. CUSTOM REPORT QUERY BUILDER (API #100)
// ==========================================
app.get('/reports/custom', async (c) => {
  try {
    const groupBy = c.req.query('groupBy') || 'day';
    const limit = Number(c.req.query('limit')) || 30;

    if (groupBy === 'room_type') {
      const stmt = c.env.DB.prepare(
        'SELECT room_type_name, SUM(total_bookings) as bookings, SUM(total_nights_sold) as nights, SUM(total_revenue) as revenue FROM room_performance GROUP BY room_type_name ORDER BY revenue DESC'
      );
      const rows = (await stmt.all()).results;
      return c.json({ success: true, groupBy: 'room_type', results: rows });
    }

    if (groupBy === 'nationality') {
      const stmt = c.env.DB.prepare(
        'SELECT nationality, SUM(guest_count) as total_guests, SUM(total_revenue) as revenue, AVG(avg_stay_nights) as avg_stay FROM guest_demographics GROUP BY nationality ORDER BY total_guests DESC'
      );
      const rows = (await stmt.all()).results;
      return c.json({ success: true, groupBy: 'nationality', results: rows });
    }

    // Default by date
    const stmt = c.env.DB.prepare(
      'SELECT stat_date, occupancy_rate, total_revenue, total_checkins, total_checkouts FROM daily_stats ORDER BY stat_date DESC LIMIT ?'
    ).bind(limit);
    const rows = (await stmt.all()).results;
    return c.json({ success: true, groupBy: 'day', results: rows });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 13. WEBHOOK CONSUMERS (Upstash QStash & Event Bus)
// ==========================================
app.post('/webhooks/checkout', async (c) => {
  try {
    const payload = await c.req.json();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // Record audit event
    await c.env.DB.prepare(
      'INSERT INTO audit_events (id, event_type, source_service, payload, received_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(
        crypto.randomUUID(),
        'ReservationCheckedOut',
        'reservation',
        JSON.stringify(payload),
        now
      )
      .run();

    // Increment today's checkouts in daily_stats
    await c.env.DB.prepare(
      'UPDATE daily_stats SET total_checkouts = total_checkouts + 1, updated_at = ? WHERE stat_date = ?'
    )
      .bind(now, today)
      .run();

    return c.json({
      success: true,
      message: 'Checkout event processed by report-analytics',
      timestamp: now,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/webhooks/bill-paid', async (c) => {
  try {
    const payload = await c.req.json();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // 1. Record in audit_events
    await c.env.DB.prepare(
      'INSERT INTO audit_events (id, event_type, source_service, payload, received_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), 'BillPaid', 'billing', JSON.stringify(payload), now)
      .run();

    // 2. Record revenue entry
    const amount = Number(payload.amountPaid || payload.totalAmount || 0);
    await c.env.DB.prepare(
      'INSERT INTO revenue_records (id, record_date, reservation_id, bill_id, room_type_name, revenue_type, amount, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        crypto.randomUUID(),
        today,
        payload.reservationId || null,
        payload.billId || null,
        payload.roomTypeName || 'Room',
        'room_charge',
        amount,
        payload.paymentMethod || 'CARD',
        now
      )
      .run();

    // 3. Update daily_stats revenue
    await c.env.DB.prepare(
      'UPDATE daily_stats SET total_revenue = total_revenue + ?, room_revenue = room_revenue + ?, updated_at = ? WHERE stat_date = ?'
    )
      .bind(amount, amount, now, today)
      .run();

    return c.json({
      success: true,
      message: 'BillPaid event recorded in revenue stats',
      recorded_amount: amount,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/webhooks/housekeeping-completed', async (c) => {
  try {
    const payload = await c.req.json();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO audit_events (id, event_type, source_service, payload, received_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(
        crypto.randomUUID(),
        'HousekeepingTaskCompleted',
        'housekeeping',
        JSON.stringify(payload),
        now
      )
      .run();

    return c.json({
      success: true,
      message: 'HousekeepingTaskCompleted event logged',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;

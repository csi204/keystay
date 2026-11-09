import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import type { Database } from '../db/client';
import {
  dailyStats,
  monthlySummary,
  roomPerformance,
  revenueRecords,
  guestDemographics,
  housekeepingPerformance,
  auditEvents,
} from '../db/schema';

export class ReportService {
  constructor(private db: Database) {}

  /**
   * ดึงสรุปภาพรวมสำหรับ Executive Dashboard (KPI วันนี้, ยอดสะสม MTD ของเดือน, 3 ห้องที่สร้างรายได้สูงสุด)
   */
  async getDashboardSummary(today: string) {
    let todayRecord: any = await this.db
      .select()
      .from(dailyStats)
      .where(eq(dailyStats.statDate, today))
      .get();

    if (!todayRecord) {
      todayRecord = (await this.db
        .select()
        .from(dailyStats)
        .orderBy(desc(dailyStats.statDate))
        .limit(1)
        .get()) || {
        statDate: today,
        totalRooms: 22,
        occupiedRooms: 15,
        availableRooms: 5,
        reservedRooms: 1,
        maintenanceRooms: 1,
        occupancyRate: 68.18,
        totalCheckins: 4,
        totalCheckouts: 3,
        totalRevenue: 62100.0,
        roomRevenue: 58200.0,
        minibarRevenue: 3900.0,
      };
    }

    const currentMonth = today.slice(0, 7);
    const monthSummary: any = (await this.db
      .select()
      .from(monthlySummary)
      .where(eq(monthlySummary.yearMonth, currentMonth))
      .get()) || {
      totalRevenue: 1720000.0,
      avgOccupancyRate: 74.2,
      adr: 4020.0,
      revpar: 2982.84,
    };

    const topRooms = await this.db
      .select({
        room_number: roomPerformance.roomNumber,
        room_type_name: roomPerformance.roomTypeName,
        total_revenue: roomPerformance.totalRevenue,
        total_nights_sold: roomPerformance.totalNightsSold,
      })
      .from(roomPerformance)
      .where(eq(roomPerformance.yearMonth, currentMonth))
      .orderBy(desc(roomPerformance.totalRevenue))
      .limit(3)
      .all();

    return {
      date: today,
      last_updated: new Date().toISOString(),
      kpi: {
        occupancy_rate: todayRecord.occupancyRate ?? todayRecord.occupancy_rate,
        total_revenue_today: todayRecord.totalRevenue ?? todayRecord.total_revenue,
        room_revenue_today: todayRecord.roomRevenue ?? todayRecord.room_revenue,
        minibar_revenue_today: todayRecord.minibarRevenue ?? todayRecord.minibar_revenue,
        rooms_occupied: todayRecord.occupiedRooms ?? todayRecord.occupied_rooms,
        rooms_available: todayRecord.availableRooms ?? todayRecord.available_rooms,
        rooms_reserved: todayRecord.reservedRooms ?? todayRecord.reserved_rooms,
        rooms_maintenance: todayRecord.maintenanceRooms ?? todayRecord.maintenance_rooms,
        total_rooms: todayRecord.totalRooms ?? todayRecord.total_rooms,
        checkins_today: todayRecord.totalCheckins ?? todayRecord.total_checkins,
        checkouts_today: todayRecord.totalCheckouts ?? todayRecord.total_checkouts,
      },
      monthly_mtd: {
        month: currentMonth,
        total_revenue: monthSummary.totalRevenue ?? monthSummary.total_revenue,
        avg_occupancy_rate: monthSummary.avgOccupancyRate ?? monthSummary.avg_occupancy_rate,
        adr: monthSummary.adr,
        revpar: monthSummary.revpar,
      },
      top_performing_rooms: topRooms,
    };
  }

  /**
   * ดึงแนวโน้มรายได้รายวันย้อนหลัง (รวมรายได้ห้องพัก และมินิบาร์) พร้อมคำนวณรายได้เฉลี่ยต่อวัน
   */
  async getRevenueDaily(limit: number) {
    const rows = await this.db
      .select({
        stat_date: dailyStats.statDate,
        total_revenue: dailyStats.totalRevenue,
        room_revenue: dailyStats.roomRevenue,
        minibar_revenue: dailyStats.minibarRevenue,
        total_checkouts: dailyStats.totalCheckouts,
      })
      .from(dailyStats)
      .orderBy(desc(dailyStats.statDate))
      .limit(limit)
      .all();

    let totalWindowRevenue = 0;
    for (const r of rows) {
      totalWindowRevenue += r.total_revenue || 0;
    }
    const avgDailyRevenue = rows.length > 0 ? Number((totalWindowRevenue / rows.length).toFixed(2)) : 0;

    return {
      window_days: limit,
      total_window_revenue: totalWindowRevenue,
      average_daily_revenue: avgDailyRevenue,
      trend: rows.reverse(),
    };
  }

  /**
   * ดึงสถิติรายวัน (ห้องว่าง, ห้องไม่ว่าง, อัตราเข้าพัก, จำนวนเช็คอิน/เช็คเอาท์) รองรับการกรองช่วงวันที่ (startDate, endDate)
   */
  async getDailyStats(limit: number, startDate?: string, endDate?: string) {
    let warning: string | null = null;
    let start = startDate;
    let end = endDate;

    if (start && end && start > end) {
      warning = `startDate (${start}) is after endDate (${end}). Date range was automatically swapped to [${end} .. ${start}].`;
      const temp = start;
      start = end;
      end = temp;
    }

    const conditions: any[] = [];
    if (start) {
      conditions.push(gte(dailyStats.statDate, start));
    }
    if (end) {
      conditions.push(lte(dailyStats.statDate, end));
    }

    const query = this.db
      .select()
      .from(dailyStats)
      .orderBy(desc(dailyStats.statDate));

    let rows: any[];
    if (conditions.length > 0) {
      rows = await query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .limit(limit)
        .all();
    } else {
      rows = await query.limit(limit).all();
    }

    return {
      rows,
      warning,
      filter: {
        startDate: start || null,
        endDate: end || null,
        limit,
      },
    };
  }

  /**
   * ดึงสรุปรายได้รายเดือน (รายได้รวม, รายได้สุทธิ, อัตราเข้าพักเฉลี่ย, ADR, RevPAR) รองรับการกรองช่วงเดือน (startMonth, endMonth)
   */
  async getRevenueMonthly(limit: number, startMonth?: string, endMonth?: string) {
    let warning: string | null = null;
    let start = startMonth;
    let end = endMonth;

    if (start && end && start > end) {
      warning = `startMonth (${start}) is after endMonth (${end}). Month range was automatically swapped to [${end} .. ${start}].`;
      const temp = start;
      start = end;
      end = temp;
    }

    const conditions: any[] = [];
    if (start) {
      conditions.push(gte(monthlySummary.yearMonth, start));
    }
    if (end) {
      conditions.push(lte(monthlySummary.yearMonth, end));
    }

    const query = this.db
      .select({
        year_month: monthlySummary.yearMonth,
        total_revenue: monthlySummary.totalRevenue,
        net_revenue: monthlySummary.netRevenue,
        avg_occupancy_rate: monthlySummary.avgOccupancyRate,
        total_reservations: monthlySummary.totalReservations,
        adr: monthlySummary.adr,
        revpar: monthlySummary.revpar,
      })
      .from(monthlySummary)
      .orderBy(desc(monthlySummary.yearMonth));

    let rows: any[];
    if (conditions.length > 0) {
      rows = await query
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .limit(limit)
        .all();
    } else {
      rows = await query.limit(limit).all();
    }

    return {
      months_count: rows.length,
      history: rows,
      warning,
      filter: {
        startMonth: start || null,
        endMonth: end || null,
        limit,
      },
    };
  }

  /**
   * ดึงรายงานอัตราการเข้าพัก (Occupancy Rate) รายวัน พร้อมคำนวณอัตราเข้าพักเฉลี่ยของช่วงเวลา
   */
  async getOccupancyReport(limit: number) {
    const rows = await this.db
      .select({
        stat_date: dailyStats.statDate,
        total_rooms: dailyStats.totalRooms,
        occupied_rooms: dailyStats.occupiedRooms,
        available_rooms: dailyStats.availableRooms,
        reserved_rooms: dailyStats.reservedRooms,
        maintenance_rooms: dailyStats.maintenanceRooms,
        occupancy_rate: dailyStats.occupancyRate,
      })
      .from(dailyStats)
      .orderBy(desc(dailyStats.statDate))
      .limit(limit)
      .all();

    let sumRate = 0;
    for (const r of rows) sumRate += r.occupancy_rate || 0;
    const avgRate = rows.length > 0 ? Number((sumRate / rows.length).toFixed(2)) : 0;

    return {
      period_days: limit,
      average_occupancy_rate: avgRate,
      daily_breakdown: rows.reverse(),
    };
  }

  /**
   * ดึงสถิติประสิทธิภาพรายห้องในเดือนที่ระบุ (จำนวนบุ๊กกิ้ง, คืนที่ขายได้, รายได้รวม)
   */
  async getRoomPerformance(yearMonth: string, limit: number) {
    const rows = await this.db
      .select({
        room_id: roomPerformance.roomId,
        room_number: roomPerformance.roomNumber,
        room_type_name: roomPerformance.roomTypeName,
        year_month: roomPerformance.yearMonth,
        total_bookings: roomPerformance.totalBookings,
        total_nights_sold: roomPerformance.totalNightsSold,
        total_revenue: roomPerformance.totalRevenue,
        maintenance_days: roomPerformance.maintenanceDays,
      })
      .from(roomPerformance)
      .where(eq(roomPerformance.yearMonth, yearMonth))
      .orderBy(desc(roomPerformance.totalRevenue))
      .limit(limit)
      .all();

    return {
      month: yearMonth,
      rooms: rows,
    };
  }

  /**
   * ดึงสถิติประวัติการยกเลิกห้องพักรายวัน พร้อมคำนวณอัตราการยกเลิกภาพรวม (Overall Cancellation Rate)
   */
  async getCancellations(limit: number) {
    const rows = await this.db
      .select({
        stat_date: dailyStats.statDate,
        total_checkins: dailyStats.totalCheckins,
        total_cancellations: dailyStats.totalCancellations,
      })
      .from(dailyStats)
      .orderBy(desc(dailyStats.statDate))
      .limit(limit)
      .all();

    let totalCancels = 0;
    let totalCheckins = 0;
    for (const r of rows) {
      totalCancels += r.total_cancellations || 0;
      totalCheckins += r.total_checkins || 0;
    }
    const rate = (totalCancels + totalCheckins) > 0 ? Number(((totalCancels / (totalCancels + totalCheckins)) * 100).toFixed(2)) : 0;

    return {
      period_days: limit,
      total_cancellations: totalCancels,
      overall_cancellation_rate: rate,
      daily_history: rows.reverse(),
    };
  }

  /**
   * ดึงข้อมูลประชากรศาสตร์ของแขกที่เข้าพักตามสัญชาติในเดือนที่ระบุ (จำนวนแขก, รายได้, จำนวนคืนเฉลี่ย)
   */
  async getGuestDemographics(yearMonth: string) {
    const rows = await this.db
      .select({
        nationality: guestDemographics.nationality,
        guest_count: guestDemographics.guestCount,
        total_revenue: guestDemographics.totalRevenue,
        avg_stay_nights: guestDemographics.avgStayNights,
      })
      .from(guestDemographics)
      .where(eq(guestDemographics.yearMonth, yearMonth))
      .orderBy(desc(guestDemographics.guestCount))
      .all();

    return {
      month: yearMonth,
      demographics: rows,
    };
  }

  /**
   * ดึงสถิติประสิทธิภาพการทำงานของแผนกแม่บ้านในวันที่ระบุ (จำนวนงานที่สำเร็จ, เวลาเฉลี่ย, ปัญหาที่รายงาน)
   */
  async getHousekeepingEfficiency(recordDate: string) {
    const rows = await this.db
      .select({
        staff_id: housekeepingPerformance.staffId,
        staff_name: housekeepingPerformance.staffName,
        tasks_completed: housekeepingPerformance.tasksCompleted,
        avg_duration_minutes: housekeepingPerformance.avgDurationMinutes,
        issues_reported: housekeepingPerformance.issuesReported,
      })
      .from(housekeepingPerformance)
      .where(eq(housekeepingPerformance.recordDate, recordDate))
      .all();

    return {
      date: recordDate,
      staff_performance: rows,
    };
  }

  /**
   * ดึงรายการบันทึกประวัติการตรวจสอบกิจกรรมในระบบ (Audit Logs)
   */
  async getAuditLogs(limit: number) {
    const rows = await this.db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.receivedAt))
      .limit(limit)
      .all();
    return rows;
  }

  /**
   * บันทึก Audit Event สำหรับติดตามกิจกรรมสำคัญในระบบ
   */
  async recordAuditEvent(event: {
    eventType: string;
    sourceService: string;
    performedBy?: string;
    ipAddress?: string;
    payload: string;
  }) {
    await this.db.insert(auditEvents).values({
      id: crypto.randomUUID(),
      eventType: event.eventType,
      sourceService: event.sourceService,
      performedBy: event.performedBy,
      ipAddress: event.ipAddress,
      payload: event.payload,
      receivedAt: new Date().toISOString(),
    });
  }
}

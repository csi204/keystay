import { type Env } from '../types';

function getBangkokDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export interface NightAuditResult {
  success: boolean;
  auditDate: string;
  noShowsCount: number;
  noShowCount?: number;
  todayArrivalsCount: number;
  expectedArrivalsToday?: number;
  todayDeparturesCount: number;
  expectedDeparturesToday?: number;
  timestamp: string;
  error?: string;
}

/**
 * Night Audit Cron Worker:
 * Runs automatically every day at 02:00 AM (Bangkok time) to:
 * 1. Mark past confirmed reservations as No-show (cancelled status in DB) and release booked dates.
 * 2. Identify and summarize today's arrivals and departures.
 * 3. Log audit activities in reservation_history and outbox_events.
 */
export async function runNightAudit(env: Env, customDate?: string): Promise<NightAuditResult> {
  const auditDate = customDate || getBangkokDate();
  const now = new Date().toISOString();

  try {
    // 1. Detect No-Shows: confirmed reservations with check_in_date < auditDate
    const noShowsQuery = `
      SELECT id, reservation_code, room_id, guest_id, check_in_date, check_out_date
      FROM reservations
      WHERE check_in_date < ? AND status = 'confirmed'
    `;
    const noShowsResult = await env.DB.prepare(noShowsQuery).bind(auditDate).all<any>();
    const noShowRows = noShowsResult.results || [];

    for (const res of noShowRows) {
      const historyId = crypto.randomUUID();
      const outboxId = crypto.randomUUID();

      await env.DB.batch([
        env.DB.prepare(
          `UPDATE reservations
           SET status = 'cancelled',
               special_requests = CASE
                 WHEN special_requests IS NULL OR special_requests = '' THEN '[Night Audit] Automatically cancelled due to No-Show'
                 ELSE special_requests || ' | [Night Audit] Automatically cancelled due to No-Show'
               END,
               updated_at = ?
           WHERE id = ?`
        ).bind(now, res.id),

        env.DB.prepare(
          'DELETE FROM room_booked_dates WHERE reservation_id = ?'
        ).bind(res.id),

        env.DB.prepare(
          `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          historyId,
          res.id,
          'no_show',
          JSON.stringify({ status: 'confirmed' }),
          JSON.stringify({ status: 'cancelled', reason: 'No-Show via Night Audit' }),
          'system_night_audit',
          now
        ),

        env.DB.prepare(
          `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          outboxId,
          'ReservationNoShow',
          res.id,
          'Reservation',
          JSON.stringify({
            eventId: outboxId,
            eventType: 'ReservationNoShow',
            reservationId: res.id,
            reservationCode: res.reservation_code,
            roomId: res.room_id,
            auditDate,
            timestamp: now,
          }),
          'pending',
          now
        ),
      ]);
    }

    // 2. Count Today's Arrivals
    const arrivalsQuery = `
      SELECT COUNT(*) as count
      FROM reservations
      WHERE check_in_date = ? AND status = 'confirmed'
    `;
    const arrivalsResult = await env.DB.prepare(arrivalsQuery).bind(auditDate).first<{ count: number }>();
    const todayArrivalsCount = arrivalsResult?.count || 0;

    // 3. Count Today's Departures
    const departuresQuery = `
      SELECT COUNT(*) as count
      FROM reservations
      WHERE check_out_date = ? AND status IN ('checked_in', 'extended')
    `;
    const departuresResult = await env.DB.prepare(departuresQuery).bind(auditDate).first<{ count: number }>();
    const todayDeparturesCount = departuresResult?.count || 0;

    console.log(`[Night Audit] Completed for ${auditDate}: ${noShowRows.length} no-shows, ${todayArrivalsCount} arrivals, ${todayDeparturesCount} departures.`);

    return {
      success: true,
      auditDate,
      noShowsCount: noShowRows.length,
      noShowCount: noShowRows.length,
      todayArrivalsCount,
      expectedArrivalsToday: todayArrivalsCount,
      todayDeparturesCount,
      expectedDeparturesToday: todayDeparturesCount,
      timestamp: now,
    };
  } catch (err: any) {
    console.error(`[Night Audit] Error processing night audit for ${auditDate}:`, err);
    return {
      success: false,
      auditDate,
      noShowsCount: 0,
      todayArrivalsCount: 0,
      todayDeparturesCount: 0,
      timestamp: now,
      error: err.message || 'Unknown error during night audit',
    };
  }
}

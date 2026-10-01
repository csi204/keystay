import { Hono } from 'hono';
import { type Env, mapReservation } from '../types';
import {
  createReservationSchema,
  updateReservationSchema,
  checkInReservationSchema,
  checkOutReservationSchema,
  cancelReservationSchema,
  modifyDatesSchema,
  extendStaySchema,
  upgradeRoomSchema,
  walkInSchema,
  applyDiscountSchema,
} from '../validators/reservation.validator';
import { publishToQStash } from '../events/publisher';
import { runNightAudit } from '../cron/night-audit';
import type { ReservationCheckedInEvent, ReservationCheckedOutEvent } from '@keystay/events';

const reservations = new Hono<{ Bindings: Env }>();

// 5.1 Helper to get today's date in YYYY-MM-DD formatted in Bangkok timezone
function getTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// 1.1 Helper to split date range into an array of individual dates [startDate, endDate)
function getDateRangeArray(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (current < end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

// ==========================================
// 42. GET /reservations/today-checkins — แขกที่ต้องเช็คอินวันนี้
// ==========================================
reservations.get('/today-checkins', async (c) => {
  try {
    const today = c.req.query('date') || getTodayString();

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.check_in_date = ? AND r.status IN ('confirmed')
      ORDER BY r.room_number ASC
    `;

    const result = await c.env.DB.prepare(query).bind(today).all();

    return c.json({
      success: true,
      date: today,
      count: (result.results || []).length,
      data: (result.results || []).map(mapReservation),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch today check-ins' } }, 500);
  }
});

// ==========================================
// 43. GET /reservations/today-checkouts — แขกที่ต้องเช็คเอาท์วันนี้
// ==========================================
reservations.get('/today-checkouts', async (c) => {
  try {
    const today = c.req.query('date') || getTodayString();

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.check_out_date = ? AND r.status = 'checked_in'
      ORDER BY r.room_number ASC
    `;

    const result = await c.env.DB.prepare(query).bind(today).all();

    return c.json({
      success: true,
      date: today,
      count: (result.results || []).length,
      data: (result.results || []).map(mapReservation),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch today check-outs' } }, 500);
  }
});

// ==========================================
// 51. GET /reservations/calendar — ข้อมูลปฏิทินแสดงไทม์ไลน์การจอง
// ==========================================
reservations.get('/calendar', async (c) => {
  try {
    const startDate = c.req.query('startDate') || getTodayString();
    const roomId = c.req.query('roomId');

    let query = `
      SELECT r.id, r.reservation_code, r.guest_id, r.room_id, r.room_number, r.room_type_name,
             r.status, r.booking_type, r.check_in_date, r.check_out_date, r.total_nights, r.total_amount,
             g.first_name, g.last_name, g.phone as guest_phone
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.status IN ('confirmed', 'checked_in', 'extended', 'checked_out')
        AND r.check_out_date >= ?
    `;
    const params: any[] = [startDate];

    const endDate = c.req.query('endDate');
    if (endDate) {
      query += ' AND r.check_in_date <= ?';
      params.push(endDate);
    }

    if (roomId) {
      query += ' AND r.room_id = ?';
      params.push(roomId);
    }

    query += ' ORDER BY r.check_in_date ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const events = (result.results || []).map((row: any) => ({
      id: row.id,
      reservationCode: row.reservation_code,
      guestId: row.guest_id,
      guestName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Guest',
      guestPhone: row.guest_phone || null,
      roomId: row.room_id,
      roomNumber: row.room_number,
      roomTypeName: row.room_type_name,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      totalNights: row.total_nights,
      totalAmount: String(row.total_amount),
      status: row.status,
      bookingType: row.booking_type,
    }));

    return c.json({
      success: true,
      startDate,
      endDate: endDate || null,
      count: events.length,
      data: events,
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch calendar reservations' } }, 500);
  }
});

// ==========================================
// 40. GET /reservations/by-guest/:guestId — ประวัติการจองตามแขก
// ==========================================
reservations.get('/by-guest/:guestId', async (c) => {
  try {
    const guestId = c.req.param('guestId');

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.guest_id = ?
      ORDER BY r.check_in_date DESC
    `;

    const result = await c.env.DB.prepare(query).bind(guestId).all();

    return c.json({
      success: true,
      guestId,
      count: (result.results || []).length,
      data: (result.results || []).map(mapReservation),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch guest reservations' } }, 500);
  }
});

// ==========================================
// 41. GET /reservations/by-room/:roomId — ประวัติการจองตามห้องพัก
// ==========================================
reservations.get('/by-room/:roomId', async (c) => {
  try {
    const roomId = c.req.param('roomId');

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.room_id = ?
      ORDER BY r.check_in_date DESC
    `;

    const result = await c.env.DB.prepare(query).bind(roomId).all();

    return c.json({
      success: true,
      roomId,
      count: (result.results || []).length,
      data: (result.results || []).map(mapReservation),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch room reservations' } }, 500);
  }
});

// ==========================================
// 31. GET /reservations — รายการการจองทั้งหมด
// ==========================================
reservations.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const guestId = c.req.query('guestId');
    const roomId = c.req.query('roomId');
    const checkInDate = c.req.query('checkInDate');
    const checkOutDate = c.req.query('checkOutDate');
    const search = c.req.query('search')?.trim();

    // 2.1 Clamp limit and offset
    const rawLimit = parseInt(c.req.query('limit') || '50', 10);
    const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 100);

    const rawOffset = parseInt(c.req.query('offset') || '0', 10);
    const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (status) {
      whereClauses.push('r.status = ?');
      params.push(status);
    }

    if (guestId) {
      whereClauses.push('r.guest_id = ?');
      params.push(guestId);
    }

    if (roomId) {
      whereClauses.push('r.room_id = ?');
      params.push(roomId);
    }

    if (checkInDate) {
      whereClauses.push('r.check_in_date >= ?');
      params.push(checkInDate);
    }

    if (checkOutDate) {
      whereClauses.push('r.check_out_date <= ?');
      params.push(checkOutDate);
    }

    if (search) {
      whereClauses.push(
        '(r.reservation_code LIKE ? OR r.room_number LIKE ? OR g.first_name LIKE ? OR g.last_name LIKE ? OR g.phone LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      ${whereSql}
      ORDER BY r.check_in_date DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      ${whereSql}
    `;

    const dataParams = [...params, limit, offset];
    const result = await c.env.DB.prepare(query).bind(...dataParams).all();
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
    const total = countResult?.count || 0;

    return c.json({
      success: true,
      data: (result.results || []).map(mapReservation),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch reservations' } }, 500);
  }
});

// ==========================================
// 52. POST /reservations/walk-in — รับแขก Walk-in และเช็คอินทันทีในขั้นตอนเดียว
// ==========================================
reservations.post('/walk-in', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = walkInSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';
    const today = getTodayString();
    const checkInDate = data.checkInDate || today;
    const checkOutDate = data.checkOutDate;

    // 1. Resolve or Insert Guest Atomically
    let guestId: string = data.guestId || '';
    let guestRecord: any = null;
    let stmtInsertGuest: any = null;

    if (guestId) {
      guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(guestId).first();
      if (!guestRecord) {
        return c.json({ success: false, error: { code: 'GUEST_NOT_FOUND', message: `Guest with ID ${guestId} not found` } }, 404);
      }
    } else {
      if (data.guestPhone) {
        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE phone = ?').bind(data.guestPhone.trim()).first();
      }
      if (!guestRecord && data.idCardNumber) {
        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE id_card_number = ?').bind(data.idCardNumber.trim()).first();
      }
      if (!guestRecord && data.guestEmail) {
        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE email = ?').bind(data.guestEmail.trim()).first();
      }

      if (guestRecord) {
        guestId = guestRecord.id;
      } else {
        guestId = `gst-${crypto.randomUUID()}`;
        const nameParts = data.guestName.trim().split(' ');
        const firstName = nameParts[0] || 'Walk-in';
        const lastName = nameParts.slice(1).join(' ') || 'Guest';

        stmtInsertGuest = c.env.DB.prepare(
          `INSERT INTO guests (id, first_name, last_name, email, phone, id_card_number, nationality, total_stays, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        ).bind(
          guestId,
          firstName,
          lastName,
          data.guestEmail?.trim() || null,
          data.guestPhone?.trim() || null,
          data.idCardNumber?.trim() || null,
          data.nationality?.trim() || 'Thai',
          now,
          now
        );
      }
    }

    // 2. Overlap Check for Walk-in Room Availability
    const overlapQuery = `
      SELECT id, reservation_code, check_in_date, check_out_date, status
      FROM reservations
      WHERE room_id = ?
        AND status IN ('confirmed', 'checked_in', 'extended')
        AND check_in_date < ?
        AND check_out_date > ?
      LIMIT 1
    `;
    const conflicting = await c.env.DB.prepare(overlapQuery).bind(data.roomId, checkOutDate, checkInDate).first<any>();

    if (conflicting) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ROOM_OVERBOOKING_CONFLICT',
            message: `Room is already occupied/reserved for this date range by reservation ${conflicting.reservation_code}`,
            conflictingReservation: conflicting,
          },
        },
        409
      );
    }

    // 3. Calculation & IDs
    const checkInTime = new Date(checkInDate).getTime();
    const checkOutTime = new Date(checkOutDate).getTime();
    const totalNights = Math.max(1, Math.round((checkOutTime - checkInTime) / (1000 * 3600 * 24)));

    const nightlyRate = Number(data.nightlyRate);
    const subtotal = Number((nightlyRate * totalNights).toFixed(2));
    const discountAmount = Number(data.discountAmount || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));
    const depositAmount = Number(data.depositAmount || 0);

    const reservationId = `res-${crypto.randomUUID()}`;
    const codeSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const reservationCode = `RES-${new Date().getFullYear()}-${codeSuffix}`;
    const roomNumber = data.roomNumber || data.roomId.replace('rm-', '');
    const roomTypeName = data.roomTypeName || 'Standard Room';

    // 4. Batch Operations (Atomic Unit)
    const stmts: any[] = [];
    if (stmtInsertGuest) {
      stmts.push(stmtInsertGuest);
    } else if (guestRecord) {
      stmts.push(
        c.env.DB.prepare('UPDATE guests SET total_stays = total_stays + 1, updated_at = ? WHERE id = ?').bind(now, guestId)
      );
    }

    // Insert Reservation
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO reservations (
          id, reservation_code, guest_id, room_id, room_number, room_type_name,
          status, booking_type, check_in_date, check_out_date, actual_check_in,
          num_guests, nightly_rate, total_nights, subtotal, discount_amount,
          tax_amount, deposit_amount, total_amount, special_requests, created_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'checked_in', 'walk_in', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        reservationId,
        reservationCode,
        guestId,
        data.roomId,
        roomNumber,
        roomTypeName,
        checkInDate,
        checkOutDate,
        now,
        data.numGuests || 1,
        nightlyRate,
        totalNights,
        subtotal,
        discountAmount,
        taxAmount,
        depositAmount,
        totalAmount,
        data.specialRequests || 'Walk-in guest',
        callerId,
        now,
        now
      )
    );

    // Book Dates
    const dates = getDateRangeArray(checkInDate, checkOutDate);
    for (const d of dates) {
      stmts.push(
        c.env.DB.prepare('INSERT INTO room_booked_dates (room_id, booked_date, reservation_id) VALUES (?, ?, ?)').bind(data.roomId, d, reservationId)
      );
    }

    // Reservation History
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'walk_in_check_in', NULL, ?, ?, ?)`
      ).bind(
        `rh-${crypto.randomUUID()}`,
        reservationId,
        JSON.stringify({ status: 'checked_in', bookingType: 'walk_in', depositAmount }),
        callerId,
        now
      )
    );

    // Outbox Event
    const outboxId = `evt-${crypto.randomUUID()}`;
    const checkinEvent: ReservationCheckedInEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'ReservationCheckedIn',
      timestamp: now,
      reservationId,
      roomId: data.roomId,
      roomNumber,
      guestId,
      guestName: data.guestName.trim(),
      checkInTime: now,
      expectedCheckOutDate: checkOutDate,
      performedBy: callerId.includes('-') && callerId.length === 36 ? callerId : crypto.randomUUID(),
    };

    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
         VALUES (?, 'ReservationCheckedIn', ?, 'Reservation', ?, 'pending', ?)`
      ).bind(outboxId, reservationId, JSON.stringify(checkinEvent), now)
    );

    await c.env.DB.batch(stmts);

    // 5. Fire Event to QStash
    await publishToQStash(c.env, 'hotel.reservation.checkin', checkinEvent, outboxId);

    // 6. Return mapped result
    const createdRow = await c.env.DB.prepare(`
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.id = ?
    `).bind(reservationId).first();

    return c.json(
      {
        success: true,
        message: 'Walk-in reservation created and checked in successfully',
        data: mapReservation(createdRow),
      },
      201
    );
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to process walk-in' } }, 500);
  }
});

// ==========================================
// Night Audit Trigger — รันประมวลผล Night Audit
// ==========================================
reservations.post('/night-audit', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const customDate = c.req.query('date') || body.auditDate || body.date;
    const result = await runNightAudit(c.env, customDate);
    return c.json({ success: result.success, data: result });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to run night audit' } }, 500);
  }
});

// ==========================================
// 32. GET /reservations/:id — รายละเอียดการจองรายรายการ
// ==========================================
reservations.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality, g.address, g.notes as guest_notes
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.id = ? OR r.reservation_code = ?
    `;

    const reservation = await c.env.DB.prepare(query).bind(id, id).first();

    if (!reservation) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    // Fetch reservation audit history
    const history = await c.env.DB.prepare(
      'SELECT id, action, previous_data, new_data, performed_by, created_at FROM reservation_history WHERE reservation_id = ? ORDER BY created_at ASC'
    )
      .bind(reservation.id)
      .all();

    return c.json({
      success: true,
      data: {
        ...mapReservation(reservation),
        history: history.results || [],
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch reservation' } }, 500);
  }
});

// ==========================================
// 33. POST /reservations — สร้างการจองห้องพักล่วงหน้า (Advance Booking)
// ==========================================
reservations.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    // 1. Resolve or Prepare Guest Creation Statement (Atomic 3.2: No Orphaned Guest)
    let guestId = data.guestId;
    let guestRecord: any = null;
    let stmtInsertGuest: any = null;
    let guestNameForOutbox = data.guestName;
    let guestEmailForOutbox = data.guestEmail;
    let guestPhoneForOutbox = data.guestPhone;

    if (guestId) {
      guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(guestId).first();
      if (!guestRecord) {
        return c.json({ success: false, error: { code: 'GUEST_NOT_FOUND', message: `Guest with ID ${guestId} not found` } }, 404);
      }
      guestNameForOutbox = `${guestRecord.first_name} ${guestRecord.last_name}`.trim();
      guestEmailForOutbox = guestRecord.email;
      guestPhoneForOutbox = guestRecord.phone;
    } else {
      // Find existing by phone or email
      if (data.guestPhone) {
        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE phone = ?').bind(data.guestPhone.trim()).first();
      }
      if (!guestRecord && data.guestEmail) {
        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE email = ?').bind(data.guestEmail.trim()).first();
      }

      if (guestRecord) {
        guestId = guestRecord.id;
        guestNameForOutbox = `${guestRecord.first_name} ${guestRecord.last_name}`.trim();
        guestEmailForOutbox = guestRecord.email;
        guestPhoneForOutbox = guestRecord.phone;
      } else {
        // Prepare atomic guest insertion statement (will execute in batch, no orphans on error)
        guestId = `gst-${crypto.randomUUID()}`;
        const nameParts = (data.guestName || '').trim().split(' ');
        const firstName = (data.firstName || nameParts[0] || 'Guest').trim();
        const lastName = (data.lastName || nameParts.slice(1).join(' ') || 'Customer').trim();
        guestNameForOutbox = `${firstName} ${lastName}`.trim();

        stmtInsertGuest = c.env.DB.prepare(
          `INSERT INTO guests (id, first_name, last_name, email, phone, nationality, total_stays, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'Thai', 0, ?, ?)`
        ).bind(guestId, firstName, lastName, data.guestEmail?.trim() || null, data.guestPhone?.trim() || null, now, now);
      }
    }

    // 2. Fast Overlap Check (First-line defense)
    const overlapQuery = `
      SELECT id, reservation_code, check_in_date, check_out_date, status
      FROM reservations
      WHERE room_id = ?
        AND status IN ('confirmed', 'checked_in', 'extended')
        AND check_in_date < ?
        AND check_out_date > ?
      LIMIT 1
    `;

    const conflicting = await c.env.DB.prepare(overlapQuery).bind(data.roomId, data.checkOutDate, data.checkInDate).first<any>();

    if (conflicting) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ROOM_OVERBOOKING_CONFLICT',
            message: `Room is already booked for the selected date range (${conflicting.check_in_date} to ${conflicting.check_out_date}) by reservation ${conflicting.reservation_code}`,
            conflictingReservation: conflicting,
          },
        },
        409
      );
    }

    // 3. 3.1 Strict Server Calculation for Duration & Financials
    const checkInTime = new Date(data.checkInDate).getTime();
    const checkOutTime = new Date(data.checkOutDate).getTime();
    const totalNights = Math.max(1, Math.round((checkOutTime - checkInTime) / (1000 * 3600 * 24)));

    const nightlyRate = Number(data.nightlyRate);
    const subtotal = Number((nightlyRate * totalNights).toFixed(2));
    const discountAmount = Number(data.discountAmount || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));
    const depositAmount = Number(data.depositAmount || 0);

    // 3.3 High Entropy Reservation Code (8-character alphanumeric slice)
    const reservationId = `res-${crypto.randomUUID()}`;
    const codeSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const reservationCode = `RES-${new Date().getFullYear()}-${codeSuffix}`;
    const roomNumber = data.roomNumber || data.roomId.replace('rm-', '');
    const roomTypeName = data.roomTypeName || 'Standard Room';

    // Walk-in reservations are immediately checked-in per UAT spec
    const reservationStatus = data.bookingType === 'walk_in' ? 'checked_in' : 'confirmed';
    const actualCheckIn = data.bookingType === 'walk_in' ? now : null;

    // 4. Outbox Event & Audit Trail Payload
    const outboxPayload = {
      eventId: crypto.randomUUID(),
      eventType: 'ReservationCreated',
      timestamp: now,
      reservationId,
      reservationCode,
      status: reservationStatus,
      guestId,
      guestName: guestNameForOutbox,
      guestEmail: guestEmailForOutbox,
      guestPhone: guestPhoneForOutbox,
      roomId: data.roomId,
      roomNumber,
      roomTypeName,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      actualCheckIn,
      totalNights,
      nightlyRate: String(nightlyRate),
      totalAmount: String(totalAmount),
      depositAmount: String(depositAmount),
      bookingType: data.bookingType,
      performedBy: callerId,
    };

    // 5. 1.1 Break down into individual dates for room_booked_dates
    const bookedDates = getDateRangeArray(data.checkInDate, data.checkOutDate);

    // 6. Build Atomic D1 Batch Statements
    const batchStatements: any[] = [];

    // Prepend guest insert if newly created
    if (stmtInsertGuest) {
      batchStatements.push(stmtInsertGuest);
    }

    // Insert reservation
    batchStatements.push(
      c.env.DB.prepare(
        `INSERT INTO reservations (
          id, reservation_code, guest_id, room_id, room_number, room_type_name,
          status, booking_type, check_in_date, check_out_date, actual_check_in,
          num_guests, nightly_rate, total_nights, subtotal, discount_amount, tax_amount, deposit_amount,
          total_amount, special_requests, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        reservationId,
        reservationCode,
        guestId,
        data.roomId,
        roomNumber,
        roomTypeName,
        reservationStatus,
        data.bookingType,
        data.checkInDate,
        data.checkOutDate,
        actualCheckIn,
        data.numGuests,
        nightlyRate,
        totalNights,
        subtotal,
        discountAmount,
        taxAmount,
        depositAmount,
        totalAmount,
        data.specialRequests || null,
        callerId,
        now,
        now
      )
    );

    // 1.1 Insert individual booked dates for hard DB-level uniqueness constraint
    for (const d of bookedDates) {
      batchStatements.push(
        c.env.DB.prepare(
          'INSERT INTO room_booked_dates (room_id, booked_date, reservation_id) VALUES (?, ?, ?)'
        ).bind(data.roomId, d, reservationId)
      );
    }

    // Insert history
    batchStatements.push(
      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'created', NULL, ?, ?, ?)`
      ).bind(`rh-${crypto.randomUUID()}`, reservationId, JSON.stringify(outboxPayload), callerId, now)
    );

    // Insert outbox event
    batchStatements.push(
      c.env.DB.prepare(
        `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
         VALUES (?, 'ReservationCreated', ?, 'Reservation', ?, 'pending', ?)`
      ).bind(`evt-${crypto.randomUUID()}`, reservationId, JSON.stringify(outboxPayload), now)
    );

    // Execute atomic batch
    await c.env.DB.batch(batchStatements);

    // Fetch and return created reservation with joined guest
    const created = await c.env.DB.prepare(
      `SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
       FROM reservations r
       LEFT JOIN guests g ON r.guest_id = g.id
       WHERE r.id = ?`
    )
      .bind(reservationId)
      .first();

    return c.json(
      {
        success: true,
        data: mapReservation(created),
        message: 'Reservation booked successfully',
      },
      201
    );
  } catch (error: any) {
    if (error.message && (error.message.includes('room_booked_dates') || error.message.includes('UNIQUE constraint failed') || error.message.includes('idx_'))) {
      if (error.message.includes('room_booked_dates')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'ROOM_OVERBOOKING_CONFLICT',
              message: 'Room has already been booked for one or more dates in this selected period (concurrency lock)',
            },
          },
          409
        );
      }
      if (error.message.includes('phone') || error.message.includes('idx_guests_phone_unique')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_PHONE',
              message: 'A guest with this phone number already exists',
            },
          },
          409
        );
      }
      if (error.message.includes('id_card') || error.message.includes('idx_guests_id_card_unique')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_ID_CARD',
              message: 'A guest with this ID card already exists',
            },
          },
          409
        );
      }
      if (error.message.includes('reservation_code') || error.message.includes('idx_reservations_code')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'RESERVATION_CODE_CONFLICT',
              message: 'Reservation code collision detected, please retry',
            },
          },
          409
        );
      }
      return c.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: error.message || 'Database unique constraint violation',
          },
        },
        409
      );
    }
    return c.json({ success: false, error: { message: error.message || 'Failed to create reservation' } }, 500);
  }
});

// ==========================================
// 34. PUT /reservations/:id — แก้ไขข้อมูลการจอง
// ==========================================
reservations.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_code = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    if (existing.status === 'cancelled') {
      return c.json({ success: false, error: { code: 'INVALID_STATUS', message: 'Cannot modify a cancelled reservation' } }, 400);
    }

    if (existing.status === 'checked_out') {
      return c.json({ success: false, error: { code: 'INVALID_STATUS', message: 'Cannot modify a completed/checked-out reservation' } }, 400);
    }

    const body = await c.req.json();
    const parsed = updateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const newRoomId = data.roomId || existing.room_id;
    const newCheckInDate = data.checkInDate || existing.check_in_date;
    const newCheckOutDate = data.checkOutDate || existing.check_out_date;

    // Check date logic
    if (newCheckOutDate <= newCheckInDate) {
      return c.json({ success: false, error: { message: 'checkOutDate must be after checkInDate' } }, 400);
    }

    const isRoomOrDatesChanged =
      newRoomId !== existing.room_id ||
      newCheckInDate !== existing.check_in_date ||
      newCheckOutDate !== existing.check_out_date;

    // Fast overlap check if room or dates were changed
    if (isRoomOrDatesChanged) {
      const conflict = await c.env.DB.prepare(
        `SELECT id, reservation_code, check_in_date, check_out_date
         FROM reservations
         WHERE room_id = ?
           AND id != ?
           AND status IN ('confirmed', 'checked_in', 'extended')
           AND check_in_date < ?
           AND check_out_date > ?
         LIMIT 1`
      )
        .bind(newRoomId, existing.id, newCheckOutDate, newCheckInDate)
        .first<any>();

      if (conflict) {
        return c.json(
          {
            success: false,
            error: {
              code: 'ROOM_OVERBOOKING_CONFLICT',
              message: `Room is already booked from ${conflict.check_in_date} to ${conflict.check_out_date} by reservation ${conflict.reservation_code}`,
            },
          },
          409
        );
      }
    }

    // 3.1 Strict Server Recalculation
    const checkInTime = new Date(newCheckInDate).getTime();
    const checkOutTime = new Date(newCheckOutDate).getTime();
    const totalNights = Math.max(1, Math.round((checkOutTime - checkInTime) / (1000 * 3600 * 24)));

    const nightlyRate = data.nightlyRate !== undefined ? Number(data.nightlyRate) : Number(existing.nightly_rate);
    const subtotal = Number((nightlyRate * totalNights).toFixed(2));
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Number(existing.discount_amount);
    const depositAmount = data.depositAmount !== undefined ? Number(data.depositAmount) : Number(existing.deposit_amount);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

    const roomNumber = data.roomNumber || (data.roomId ? data.roomId.replace('rm-', '') : existing.room_number);
    const roomTypeName = data.roomTypeName || existing.room_type_name;
    const numGuests = data.numGuests !== undefined ? data.numGuests : existing.num_guests;
    const specialRequests = data.specialRequests !== undefined ? data.specialRequests : existing.special_requests;
    const newStatus = data.status || existing.status;

    const batchStatements: any[] = [];

    // Statement: Update reservation record
    batchStatements.push(
      c.env.DB.prepare(
        `UPDATE reservations SET
          room_id = ?, room_number = ?, room_type_name = ?,
          check_in_date = ?, check_out_date = ?, num_guests = ?,
          nightly_rate = ?, total_nights = ?, subtotal = ?, discount_amount = ?,
          tax_amount = ?, deposit_amount = ?, total_amount = ?,
          special_requests = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).bind(
        newRoomId,
        roomNumber,
        roomTypeName,
        newCheckInDate,
        newCheckOutDate,
        numGuests,
        nightlyRate,
        totalNights,
        subtotal,
        discountAmount,
        taxAmount,
        depositAmount,
        totalAmount,
        specialRequests,
        newStatus,
        now,
        existing.id
      )
    );

    // 1.1 Update room_booked_dates if room, dates, or status changed (Release locks on cancelled or checked_out)
    if (newStatus === 'cancelled' || newStatus === 'checked_out') {
      batchStatements.push(
        c.env.DB.prepare('DELETE FROM room_booked_dates WHERE reservation_id = ?').bind(existing.id)
      );
    } else if (isRoomOrDatesChanged) {
      batchStatements.push(
        c.env.DB.prepare('DELETE FROM room_booked_dates WHERE reservation_id = ?').bind(existing.id)
      );
      const newBookedDates = getDateRangeArray(newCheckInDate, newCheckOutDate);
      for (const d of newBookedDates) {
        batchStatements.push(
          c.env.DB.prepare(
            'INSERT INTO room_booked_dates (room_id, booked_date, reservation_id) VALUES (?, ?, ?)'
          ).bind(newRoomId, d, existing.id)
        );
      }
    }

    // Statement: Insert audit history
    batchStatements.push(
      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'updated', ?, ?, ?, ?)`
      ).bind(
        `rh-${crypto.randomUUID()}`,
        existing.id,
        JSON.stringify({
          status: existing.status,
          checkInDate: existing.check_in_date,
          checkOutDate: existing.check_out_date,
          roomId: existing.room_id,
          totalAmount: existing.total_amount,
        }),
        JSON.stringify({
          status: newStatus,
          checkInDate: newCheckInDate,
          checkOutDate: newCheckOutDate,
          roomId: newRoomId,
          totalAmount,
        }),
        callerId,
        now
      )
    );

    // 4.1 Statement: Insert Outbox Event on PUT
    const eventType = newStatus === 'cancelled' ? 'ReservationCancelled' : 'ReservationUpdated';
    batchStatements.push(
      c.env.DB.prepare(
        `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
         VALUES (?, ?, ?, 'Reservation', ?, 'pending', ?)`
      ).bind(
        `evt-${crypto.randomUUID()}`,
        eventType,
        existing.id,
        JSON.stringify({
          eventId: crypto.randomUUID(),
          eventType,
          reservationId: existing.id,
          reservationCode: existing.reservation_code,
          roomId: newRoomId,
          checkInDate: newCheckInDate,
          checkOutDate: newCheckOutDate,
          totalAmount: String(totalAmount),
          status: newStatus,
          timestamp: now,
          performedBy: callerId,
        }),
        now
      )
    );

    await c.env.DB.batch(batchStatements);

    const updated = await c.env.DB.prepare(
      `SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
       FROM reservations r
       LEFT JOIN guests g ON r.guest_id = g.id
       WHERE r.id = ?`
    )
      .bind(existing.id)
      .first();

    return c.json({
      success: true,
      data: mapReservation(updated),
      message: 'Reservation updated successfully',
    });
  } catch (error: any) {
    if (error.message && (error.message.includes('room_booked_dates') || error.message.includes('UNIQUE constraint failed') || error.message.includes('idx_'))) {
      if (error.message.includes('room_booked_dates')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'ROOM_OVERBOOKING_CONFLICT',
              message: 'Room has already been booked for one or more dates in this period (concurrency lock)',
            },
          },
          409
        );
      }
      return c.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: error.message || 'Database conflict on update',
          },
        },
        409
      );
    }
    return c.json({ success: false, error: { message: error.message || 'Failed to update reservation' } }, 500);
  }
});

// ==========================================
// 35. DELETE /reservations/:id — ยกเลิกหรือลบข้อมูลการจอง
// ==========================================
reservations.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_code = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    // 6.3 Lifecycle guards
    if (existing.status === 'checked_in') {
      return c.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_CHECKED_IN',
            message: 'Cannot cancel an active checked-in reservation. Please perform check-out first.',
          },
        },
        400
      );
    }

    if (existing.status === 'checked_out') {
      return c.json(
        {
          success: false,
          error: {
            code: 'CANNOT_CANCEL_CHECKED_OUT',
            message: 'Cannot cancel a reservation that has already checked out.',
          },
        },
        400
      );
    }

    if (existing.status === 'cancelled') {
      return c.json(
        {
          success: false,
          error: {
            code: 'ALREADY_CANCELLED',
            message: 'Reservation is already cancelled.',
          },
        },
        400
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    // Atomic Batch: Mark as cancelled, release room_booked_dates, record history, and publish outbox event
    const stmtCancel = c.env.DB.prepare(
      `UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?`
    ).bind(now, existing.id);

    // 1.1 Free up room_booked_dates for this cancelled reservation
    const stmtFreeBookedDates = c.env.DB.prepare(
      'DELETE FROM room_booked_dates WHERE reservation_id = ?'
    ).bind(existing.id);

    const stmtHistory = c.env.DB.prepare(
      `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
       VALUES (?, ?, 'cancelled', ?, '{"status":"cancelled"}', ?, ?)`
    ).bind(`rh-${crypto.randomUUID()}`, existing.id, JSON.stringify({ status: existing.status }), callerId, now);

    const stmtOutbox = c.env.DB.prepare(
      `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
       VALUES (?, 'ReservationCancelled', ?, 'Reservation', ?, 'pending', ?)`
    ).bind(
      `evt-${crypto.randomUUID()}`,
      existing.id,
      JSON.stringify({
        eventId: crypto.randomUUID(),
        eventType: 'ReservationCancelled',
        reservationId: existing.id,
        reservationCode: existing.reservation_code,
        roomId: existing.room_id,
        timestamp: now,
        performedBy: callerId,
      }),
      now
    );

    await c.env.DB.batch([stmtCancel, stmtFreeBookedDates, stmtHistory, stmtOutbox]);

    return c.json({
      success: true,
      data: { id: existing.id, reservationCode: existing.reservation_code, status: 'cancelled' },
      message: 'Reservation cancelled successfully',
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to cancel reservation' } }, 500);
  }
});

// ==========================================
// 36. POST /reservations/:id/check-in — เช็คอินเข้าพัก
// ==========================================
reservations.post('/:id/check-in', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = checkInReservationSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.id = ? OR r.reservation_code = ?
    `;
    const existing: any = await c.env.DB.prepare(query).bind(id, id).first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    // State transition guards
    if (existing.status === 'checked_in') {
      return c.json({ success: false, error: { code: 'ALREADY_CHECKED_IN', message: 'Reservation is already checked in' } }, 400);
    }
    if (existing.status === 'checked_out') {
      return c.json({ success: false, error: { code: 'ALREADY_CHECKED_OUT', message: 'Cannot check in a reservation that has already checked out' } }, 400);
    }
    if (existing.status === 'cancelled') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: 'ไม่สามารถเช็คอินได้เนื่องจากรายการจองมีสถานะ cancelled',
        },
      }, 400);
    }

    const actualCheckIn = data.actualCheckIn || now;
    const depositAmount = data.depositAmount !== undefined ? Number(data.depositAmount) : Number(existing.deposit_amount || 0);

    const stmts: any[] = [];

    // 1. Update reservation status to checked_in
    stmts.push(
      c.env.DB.prepare(
        `UPDATE reservations
         SET status = 'checked_in', actual_check_in = ?, deposit_amount = ?, updated_at = ?
         WHERE id = ?`
      ).bind(actualCheckIn, depositAmount, now, existing.id)
    );

    // 2. Update guest idCardNumber if provided
    if (data.idCardNumber && !existing.id_card_number) {
      stmts.push(
        c.env.DB.prepare('UPDATE guests SET id_card_number = ?, updated_at = ? WHERE id = ?').bind(data.idCardNumber.trim(), now, existing.guest_id)
      );
    }

    // 3. Record reservation history
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'check_in', ?, ?, ?, ?)`
      ).bind(
        `rh-${crypto.randomUUID()}`,
        existing.id,
        JSON.stringify({ status: existing.status, depositAmount: existing.deposit_amount }),
        JSON.stringify({ status: 'checked_in', actualCheckIn, depositAmount }),
        callerId,
        now
      )
    );

    // 4. Outbox Event (ReservationCheckedIn)
    const outboxId = `evt-${crypto.randomUUID()}`;
    const guestFullName = `${existing.first_name || ''} ${existing.last_name || ''}`.trim() || 'Guest';
    const checkinEvent: ReservationCheckedInEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'ReservationCheckedIn',
      timestamp: now,
      reservationId: existing.id,
      roomId: existing.room_id,
      roomNumber: existing.room_number,
      guestId: existing.guest_id,
      guestName: guestFullName,
      checkInTime: actualCheckIn,
      expectedCheckOutDate: existing.check_out_date,
      performedBy: callerId.includes('-') && callerId.length === 36 ? callerId : crypto.randomUUID(),
    };

    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
         VALUES (?, 'ReservationCheckedIn', ?, 'Reservation', ?, 'pending', ?)`
      ).bind(outboxId, existing.id, JSON.stringify(checkinEvent), now)
    );

    await c.env.DB.batch(stmts);

    // 5. Fire event to Upstash Topic: hotel.reservation.checkin
    await publishToQStash(c.env, 'hotel.reservation.checkin', checkinEvent, outboxId);

    // 6. Return response
    const updated = await c.env.DB.prepare(query).bind(existing.id, existing.id).first();

    return c.json({
      success: true,
      message: 'Check-in processed successfully',
      data: mapReservation(updated),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to process check-in' } }, 500);
  }
});

// ==========================================
// 37. POST /reservations/:id/check-out — เช็คเอาท์และกระจาย Event Fan-out 1:4
// ==========================================
reservations.post('/:id/check-out', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = checkOutReservationSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.id = ? OR r.reservation_code = ?
    `;
    const existing: any = await c.env.DB.prepare(query).bind(id, id).first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    if (existing.status === 'checked_out') {
      return c.json({ success: false, error: { code: 'ALREADY_CHECKED_OUT', message: 'Reservation is already checked out' } }, 400);
    }

    if (existing.status !== 'checked_in' && existing.status !== 'extended') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot check out reservation with status '${existing.status}'. Only checked_in or extended guests can be checked out.`,
        },
      }, 400);
    }

    const actualCheckOut = data.actualCheckOut || now;

    // 1. Update reservation
    const stmtUpdate = c.env.DB.prepare(
      `UPDATE reservations
       SET status = 'checked_out', actual_check_out = ?, updated_at = ?
       WHERE id = ?`
    ).bind(actualCheckOut, now, existing.id);

    // 2. Reservation history
    const stmtHistory = c.env.DB.prepare(
      `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
       VALUES (?, ?, 'check_out', ?, ?, ?, ?)`
    ).bind(
      `rh-${crypto.randomUUID()}`,
      existing.id,
      JSON.stringify({ status: existing.status }),
      JSON.stringify({ status: 'checked_out', actualCheckOut, keyCardReturned: data.keyCardReturned }),
      callerId,
      now
    );

    // 3. Outbox Event (ReservationCheckedOut) — Fan-out 1:4 schema
    const outboxId = `evt-${crypto.randomUUID()}`;
    const guestFullName = `${existing.first_name || ''} ${existing.last_name || ''}`.trim() || 'Guest';
    const floor = existing.room_number ? existing.room_number.charAt(0) : '1';

    const checkoutEvent: ReservationCheckedOutEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'ReservationCheckedOut',
      timestamp: now,
      reservationId: existing.id,
      bookingNumber: existing.reservation_code,
      bookingType: existing.booking_type === 'walk_in' ? 'walk_in' : 'standard',
      roomId: existing.room_id,
      roomNumber: existing.room_number,
      roomTypeId: existing.room_id,
      roomTypeName: existing.room_type_name || 'Standard Room',
      floor,
      guestId: existing.guest_id,
      guestName: guestFullName,
      guestEmail: existing.guest_email || undefined,
      guestPhone: existing.guest_phone || undefined,
      checkInDate: existing.check_in_date,
      actualCheckIn: existing.actual_check_in || `${existing.check_in_date}T14:00:00Z`,
      checkOutDate: existing.check_out_date,
      actualCheckOut,
      totalNights: String(existing.total_nights),
      nightlyRate: Number(existing.nightly_rate).toFixed(2),
      roomTotalAmount: Number(existing.subtotal).toFixed(2),
      depositAmount: Number(existing.deposit_amount || 0).toFixed(2),
      taxRate: '0.07',
      taxAmount: Number(existing.tax_amount || 0).toFixed(2),
      netAmount: Number(existing.total_amount || 0).toFixed(2),
      currency: 'THB',
      cleaningType: data.cleaningType || 'checkout_clean',
      priority: data.priority || 'normal',
      specialNotes: data.specialNotes || existing.special_requests || undefined,
      performedBy: callerId.includes('-') && callerId.length === 36 ? callerId : crypto.randomUUID(),
    };

    const stmtOutbox = c.env.DB.prepare(
      `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
       VALUES (?, 'ReservationCheckedOut', ?, 'Reservation', ?, 'pending', ?)`
    ).bind(outboxId, existing.id, JSON.stringify(checkoutEvent), now);

    await c.env.DB.batch([stmtUpdate, stmtHistory, stmtOutbox]);

    // 4. Fire QStash Fan-out to Upstash Topic: hotel.reservation.checkout
    await publishToQStash(c.env, 'hotel.reservation.checkout', checkoutEvent, outboxId);

    const updated = await c.env.DB.prepare(query).bind(existing.id, existing.id).first();

    return c.json({
      success: true,
      message: 'Check-out completed successfully and published to Fan-out subscribers',
      data: mapReservation(updated),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to process check-out' } }, 500);
  }
});

// ==========================================
// 38. POST /reservations/:id/cancel — ขอยกเลิกการจอง
// ==========================================
reservations.post('/:id/cancel', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = cancelReservationSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const existing: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_code = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    if (existing.status === 'checked_in') {
      return c.json(
        {
          success: false,
          error: {
            code: 'CANNOT_CANCEL_CHECKED_IN',
            message: 'Cannot cancel an active checked-in reservation. Please perform check-out first.',
          },
        },
        400
      );
    }

    if (existing.status === 'checked_out') {
      return c.json(
        {
          success: false,
          error: {
            code: 'CANNOT_CANCEL_CHECKED_OUT',
            message: 'Cannot cancel a reservation that has already checked out.',
          },
        },
        400
      );
    }

    if (existing.status === 'cancelled') {
      return c.json(
        {
          success: false,
          error: {
            code: 'ALREADY_CANCELLED',
            message: 'Reservation is already cancelled.',
          },
        },
        400
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const stmtCancel = c.env.DB.prepare(
      `UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?`
    ).bind(now, existing.id);

    const stmtFreeBookedDates = c.env.DB.prepare(
      'DELETE FROM room_booked_dates WHERE reservation_id = ?'
    ).bind(existing.id);

    const stmtHistory = c.env.DB.prepare(
      `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
       VALUES (?, ?, 'cancelled', ?, ?, ?, ?)`
    ).bind(
      `rh-${crypto.randomUUID()}`,
      existing.id,
      JSON.stringify({ status: existing.status }),
      JSON.stringify({ status: 'cancelled', reason: parsed.data.reason || null }),
      callerId,
      now
    );

    const outboxId = `evt-${crypto.randomUUID()}`;
    const cancelPayload = {
      eventId: crypto.randomUUID(),
      eventType: 'ReservationCancelled',
      reservationId: existing.id,
      reservationCode: existing.reservation_code,
      roomId: existing.room_id,
      timestamp: now,
      performedBy: callerId,
      reason: parsed.data.reason || null,
    };

    const stmtOutbox = c.env.DB.prepare(
      `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
       VALUES (?, 'ReservationCancelled', ?, 'Reservation', ?, 'pending', ?)`
    ).bind(outboxId, existing.id, JSON.stringify(cancelPayload), now);

    await c.env.DB.batch([stmtCancel, stmtFreeBookedDates, stmtHistory, stmtOutbox]);

    await publishToQStash(c.env, 'hotel.reservation.checkin', cancelPayload, outboxId);

    return c.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: { id: existing.id, reservationCode: existing.reservation_code, status: 'cancelled' },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to cancel reservation' } }, 500);
  }
});

// ==========================================
// 39. PUT /reservations/:id/modify-dates — เปลี่ยนแปลงวันเข้าพัก/ออก
// ==========================================
reservations.put('/:id/modify-dates', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = modifyDatesSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const { checkInDate, checkOutDate, reason } = parsed.data;

    const existing: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_code = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    if (existing.status === 'cancelled' || existing.status === 'checked_out') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot modify dates for reservation with status '${existing.status}'`,
          },
        },
        400
      );
    }

    // Check overlap on room_id excluding current reservation
    const overlapQuery = `
      SELECT id, reservation_code, check_in_date, check_out_date
      FROM reservations
      WHERE room_id = ?
        AND id != ?
        AND status IN ('confirmed', 'checked_in', 'extended')
        AND check_in_date < ?
        AND check_out_date > ?
      LIMIT 1
    `;
    const conflicting = await c.env.DB.prepare(overlapQuery).bind(existing.room_id, existing.id, checkOutDate, checkInDate).first<any>();

    if (conflicting) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ROOM_OVERBOOKING_CONFLICT',
            message: `Selected dates (${checkInDate} to ${checkOutDate}) conflict with reservation ${conflicting.reservation_code}`,
            conflictingReservation: conflicting,
          },
        },
        409
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const checkInTime = new Date(checkInDate).getTime();
    const checkOutTime = new Date(checkOutDate).getTime();
    const totalNights = Math.max(1, Math.round((checkOutTime - checkInTime) / (1000 * 3600 * 24)));

    const nightlyRate = Number(existing.nightly_rate);
    const subtotal = Number((nightlyRate * totalNights).toFixed(2));
    const discountAmount = Number(existing.discount_amount || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

    const stmts: any[] = [];

    // Delete old booked dates
    stmts.push(c.env.DB.prepare('DELETE FROM room_booked_dates WHERE reservation_id = ?').bind(existing.id));

    // Insert new booked dates
    const dates = getDateRangeArray(checkInDate, checkOutDate);
    for (const d of dates) {
      stmts.push(
        c.env.DB.prepare('INSERT INTO room_booked_dates (room_id, booked_date, reservation_id) VALUES (?, ?, ?)').bind(existing.room_id, d, existing.id)
      );
    }

    // Update reservation
    stmts.push(
      c.env.DB.prepare(
        `UPDATE reservations
         SET check_in_date = ?, check_out_date = ?, total_nights = ?, subtotal = ?, tax_amount = ?, total_amount = ?, updated_at = ?
         WHERE id = ?`
      ).bind(checkInDate, checkOutDate, totalNights, subtotal, taxAmount, totalAmount, now, existing.id)
    );

    // Record history
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'modify_dates', ?, ?, ?, ?)`
      ).bind(
        `rh-${crypto.randomUUID()}`,
        existing.id,
        JSON.stringify({ checkInDate: existing.check_in_date, checkOutDate: existing.check_out_date, totalNights: existing.total_nights }),
        JSON.stringify({ checkInDate, checkOutDate, totalNights, reason: reason || null }),
        callerId,
        now
      )
    );

    await c.env.DB.batch(stmts);

    const updated = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(existing.id).first();

    return c.json({
      success: true,
      message: 'Reservation dates modified successfully',
      data: mapReservation(updated),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to modify dates' } }, 500);
  }
});

// ==========================================
// 49. POST /reservations/:id/extend-stay — ขยายเวลาการเข้าพัก
// ==========================================
reservations.post('/:id/extend-stay', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = extendStaySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const { newCheckOutDate, additionalDeposit, specialNotes } = parsed.data;

    const existing: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_code = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    if (existing.status !== 'checked_in' && existing.status !== 'extended') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Stay extension is only available for active in-house guests (checked_in or extended).',
          },
        },
        400
      );
    }

    if (newCheckOutDate <= existing.check_out_date) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_EXTENSION_DATE',
            message: `newCheckOutDate (${newCheckOutDate}) must be after current check-out date (${existing.check_out_date})`,
          },
        },
        400
      );
    }

    // Check availability for the extension period
    const overlapQuery = `
      SELECT id, reservation_code, check_in_date, check_out_date
      FROM reservations
      WHERE room_id = ?
        AND id != ?
        AND status IN ('confirmed', 'checked_in', 'extended')
        AND check_in_date < ?
        AND check_out_date > ?
      LIMIT 1
    `;
    const conflicting = await c.env.DB.prepare(overlapQuery).bind(existing.room_id, existing.id, newCheckOutDate, existing.check_out_date).first<any>();

    if (conflicting) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ROOM_OVERBOOKING_CONFLICT',
            message: `Room is not available for extension: conflicts with reservation ${conflicting.reservation_code} starting ${conflicting.check_in_date}`,
            conflictingReservation: conflicting,
          },
        },
        409
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const checkInTime = new Date(existing.check_in_date).getTime();
    const newCheckOutTime = new Date(newCheckOutDate).getTime();
    const newTotalNights = Math.max(1, Math.round((newCheckOutTime - checkInTime) / (1000 * 3600 * 24)));

    const nightlyRate = Number(existing.nightly_rate);
    const subtotal = Number((nightlyRate * newTotalNights).toFixed(2));
    const discountAmount = Number(existing.discount_amount || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));
    const newDeposit = Number((Number(existing.deposit_amount || 0) + Number(additionalDeposit || 0)).toFixed(2));

    const stmts: any[] = [];

    // Book additional dates
    const extensionDates = getDateRangeArray(existing.check_out_date, newCheckOutDate);
    for (const d of extensionDates) {
      stmts.push(
        c.env.DB.prepare('INSERT INTO room_booked_dates (room_id, booked_date, reservation_id) VALUES (?, ?, ?)').bind(existing.room_id, d, existing.id)
      );
    }

    // Update reservation
    stmts.push(
      c.env.DB.prepare(
        `UPDATE reservations
         SET check_out_date = ?, total_nights = ?, subtotal = ?, tax_amount = ?, deposit_amount = ?, total_amount = ?, status = 'extended', updated_at = ?
         WHERE id = ?`
      ).bind(newCheckOutDate, newTotalNights, subtotal, taxAmount, newDeposit, totalAmount, now, existing.id)
    );

    // History
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'extend_stay', ?, ?, ?, ?)`
      ).bind(
        `rh-${crypto.randomUUID()}`,
        existing.id,
        JSON.stringify({ checkOutDate: existing.check_out_date, totalNights: existing.total_nights }),
        JSON.stringify({ newCheckOutDate, newTotalNights, additionalDeposit, specialNotes }),
        callerId,
        now
      )
    );

    await c.env.DB.batch(stmts);

    const updated = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(existing.id).first();

    return c.json({
      success: true,
      message: 'Stay extended successfully',
      data: mapReservation(updated),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to extend stay' } }, 500);
  }
});

// ==========================================
// 50. POST /reservations/:id/upgrade-room — ขออัปเกรดประเภทห้องพัก
// ==========================================
reservations.post('/:id/upgrade-room', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = upgradeRoomSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const { newRoomId, newRoomNumber, newRoomTypeName, newNightlyRate, reason } = parsed.data;

    const existing: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_code = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    if (existing.status === 'cancelled' || existing.status === 'checked_out') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot upgrade room for reservation with status '${existing.status}'`,
          },
        },
        400
      );
    }

    // Check availability of newRoomId
    const overlapQuery = `
      SELECT id, reservation_code, check_in_date, check_out_date
      FROM reservations
      WHERE room_id = ?
        AND id != ?
        AND status IN ('confirmed', 'checked_in', 'extended')
        AND check_in_date < ?
        AND check_out_date > ?
      LIMIT 1
    `;
    const conflicting = await c.env.DB.prepare(overlapQuery).bind(newRoomId, existing.id, existing.check_out_date, existing.check_in_date).first<any>();

    if (conflicting) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ROOM_NOT_AVAILABLE',
            message: `New room ${newRoomNumber} is not available for this period (conflicts with ${conflicting.reservation_code})`,
          },
        },
        409
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const nightlyRate = newNightlyRate !== undefined ? Number(newNightlyRate) : Number(existing.nightly_rate);
    const subtotal = Number((nightlyRate * existing.total_nights).toFixed(2));
    const discountAmount = Number(existing.discount_amount || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

    const stmts: any[] = [];

    // Update room_booked_dates to new room_id
    stmts.push(
      c.env.DB.prepare('UPDATE room_booked_dates SET room_id = ? WHERE reservation_id = ?').bind(newRoomId, existing.id)
    );

    // Update reservation
    stmts.push(
      c.env.DB.prepare(
        `UPDATE reservations
         SET room_id = ?, room_number = ?, room_type_name = ?, nightly_rate = ?, subtotal = ?, tax_amount = ?, total_amount = ?, updated_at = ?
         WHERE id = ?`
      ).bind(newRoomId, newRoomNumber, newRoomTypeName, nightlyRate, subtotal, taxAmount, totalAmount, now, existing.id)
    );

    // History
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'upgrade_room', ?, ?, ?, ?)`
      ).bind(
        `rh-${crypto.randomUUID()}`,
        existing.id,
        JSON.stringify({ roomId: existing.room_id, roomNumber: existing.room_number, nightlyRate: existing.nightly_rate }),
        JSON.stringify({ newRoomId, newRoomNumber, newRoomTypeName, nightlyRate, reason }),
        callerId,
        now
      )
    );

    await c.env.DB.batch(stmts);

    const updated = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(existing.id).first();

    return c.json({
      success: true,
      message: 'Room upgraded successfully',
      data: mapReservation(updated),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to upgrade room' } }, 500);
  }
});

// ==========================================
// 53. GET /reservations/:id/invoice-preview — ดูตัวอย่างบิลล่วงหน้า
// ==========================================
reservations.get('/:id/invoice-preview', async (c) => {
  try {
    const id = c.req.param('id');
    const query = `
      SELECT r.*, g.first_name, g.last_name, g.email as guest_email, g.phone as guest_phone, g.id_card_number, g.nationality, g.address
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.id = ? OR r.reservation_code = ?
    `;
    const res: any = await c.env.DB.prepare(query).bind(id, id).first();

    if (!res) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    const nightlyRate = Number(res.nightly_rate || 0);
    const totalNights = Number(res.total_nights || 1);
    const roomCharge = Number((nightlyRate * totalNights).toFixed(2));
    const discountAmount = Number(res.discount_amount || 0);
    const subtotal = Math.max(0, roomCharge - discountAmount);
    const taxRate = 0.07;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));
    const depositAmount = Number(res.deposit_amount || 0);
    const balanceDue = Math.max(0, Number((totalAmount - depositAmount).toFixed(2)));
    const refundDue = Math.max(0, Number((depositAmount - totalAmount).toFixed(2)));

    const guestFullName = `${res.first_name || ''} ${res.last_name || ''}`.trim() || 'Guest';

    return c.json({
      success: true,
      data: {
        reservationId: res.id,
        reservationCode: res.reservation_code,
        status: res.status,
        guest: {
          id: res.guest_id,
          name: guestFullName,
          email: res.guest_email || null,
          phone: res.guest_phone || null,
          idCardNumber: res.id_card_number || null,
          address: res.address || null,
        },
        room: {
          roomId: res.room_id,
          roomNumber: res.room_number,
          roomTypeName: res.room_type_name,
        },
        stayDetails: {
          checkInDate: res.check_in_date,
          checkOutDate: res.check_out_date,
          actualCheckIn: res.actual_check_in || null,
          actualCheckOut: res.actual_check_out || null,
          totalNights,
          nightlyRate: nightlyRate.toFixed(2),
        },
        // Top-level aliases for direct access
        roomCharges: roomCharge.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        netRoomCharges: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        depositDeducted: depositAmount.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        refundDue: refundDue.toFixed(2),
        financialSummary: {
          currency: 'THB',
          roomCharge: roomCharge.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          subtotal: subtotal.toFixed(2),
          taxRate: '7%',
          taxAmount: taxAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          depositPaid: depositAmount.toFixed(2),
          estimatedBalanceDue: balanceDue.toFixed(2),
          estimatedRefundDue: refundDue.toFixed(2),
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to generate invoice preview' } }, 500);
  }
});

// ==========================================
// 54. POST /reservations/:id/apply-discount — ใช้โค้ดหรือบันทึกส่วนลด
// ==========================================
reservations.post('/:id/apply-discount', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = applyDiscountSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const { discountAmount, discountPercent, discountReason, reason, discountCode } = parsed.data;
    const finalReason = discountReason || reason || discountCode || 'Discount Applied';

    const existing: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_code = ?')
      .bind(id, id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    if (existing.status === 'cancelled' || existing.status === 'checked_out') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot apply discount to reservation with status '${existing.status}'`,
          },
        },
        400
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    const subtotal = Number(existing.subtotal);
    if (discountAmount !== undefined && Number(discountAmount) > subtotal) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DISCOUNT_EXCEEDS_SUBTOTAL',
            message: `Discount amount (${discountAmount}) cannot exceed subtotal (${subtotal})`,
          },
        },
        400
      );
    }

    let calculatedDiscount = 0;
    if (discountPercent !== undefined) {
      calculatedDiscount = Number(((subtotal * discountPercent) / 100).toFixed(2));
    } else if (discountAmount !== undefined) {
      calculatedDiscount = Number(discountAmount);
    }

    // Discount cannot exceed subtotal
    calculatedDiscount = Math.min(subtotal, Math.max(0, calculatedDiscount));

    const taxableAmount = Math.max(0, subtotal - calculatedDiscount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

    const discountNote = `[Discount: ฿${calculatedDiscount.toFixed(2)} - ${finalReason}]`;
    const updatedSpecialRequests = existing.special_requests
      ? `${existing.special_requests} | ${discountNote}`
      : discountNote;

    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE reservations
         SET discount_amount = ?, tax_amount = ?, total_amount = ?, special_requests = ?, updated_at = ?
         WHERE id = ?`
      ).bind(calculatedDiscount, taxAmount, totalAmount, updatedSpecialRequests, now, existing.id),

      c.env.DB.prepare(
        `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
         VALUES (?, ?, 'apply_discount', ?, ?, ?, ?)`
      ).bind(
        `rh-${crypto.randomUUID()}`,
        existing.id,
        JSON.stringify({ discountAmount: existing.discount_amount, totalAmount: existing.total_amount }),
        JSON.stringify({ discountAmount: calculatedDiscount, discountReason: finalReason, newTotalAmount: totalAmount }),
        callerId,
        now
      ),
    ]);

    const updated = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(existing.id).first();
    const mapped = mapReservation(updated);

    return c.json({
      success: true,
      message: 'Discount applied successfully',
      data: {
        ...mapped,
        reservation: mapped,
        appliedDiscount: calculatedDiscount.toFixed(2),
        discountReason: finalReason,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to apply discount' } }, 500);
  }
});

export default reservations;

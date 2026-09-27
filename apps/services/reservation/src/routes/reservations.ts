import { Hono } from 'hono';
import { type Env, mapReservation } from '../types';
import { createReservationSchema, updateReservationSchema } from '../validators/reservation.validator';

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

    // 4. Outbox Event & Audit Trail Payload
    const outboxPayload = {
      eventId: crypto.randomUUID(),
      eventType: 'ReservationCreated',
      timestamp: now,
      reservationId,
      reservationCode,
      guestId,
      guestName: guestNameForOutbox,
      guestEmail: guestEmailForOutbox,
      guestPhone: guestPhoneForOutbox,
      roomId: data.roomId,
      roomNumber,
      roomTypeName,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
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
          status, booking_type, check_in_date, check_out_date,
          num_guests, nightly_rate, total_nights, subtotal, discount_amount, tax_amount, deposit_amount,
          total_amount, special_requests, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        reservationId,
        reservationCode,
        guestId,
        data.roomId,
        roomNumber,
        roomTypeName,
        data.bookingType,
        data.checkInDate,
        data.checkOutDate,
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
    if (error.message && (error.message.includes('room_booked_dates') || error.message.includes('UNIQUE constraint failed'))) {
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

    // 1.1 Update room_booked_dates if room, dates, or status changed
    if (newStatus === 'cancelled') {
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
    if (error.message && (error.message.includes('room_booked_dates') || error.message.includes('UNIQUE constraint failed'))) {
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

export default reservations;

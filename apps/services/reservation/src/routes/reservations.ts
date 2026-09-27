import { Hono } from 'hono';
import { type Env, mapReservation } from '../types';
import { createReservationSchema, updateReservationSchema } from '../validators/reservation.validator';

const reservations = new Hono<{ Bindings: Env }>();

// Helper to get today's date in YYYY-MM-DD
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
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
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

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

    // 1. Resolve or Create Guest
    let guestId = data.guestId;
    let guestRecord: any = null;

    if (guestId) {
      guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(guestId).first();
      if (!guestRecord) {
        return c.json({ success: false, error: { code: 'GUEST_NOT_FOUND', message: `Guest with ID ${guestId} not found` } }, 404);
      }
    } else {
      // Find by phone or email if provided
      if (data.guestPhone) {
        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE phone = ?').bind(data.guestPhone).first();
      }
      if (!guestRecord && data.guestEmail) {
        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE email = ?').bind(data.guestEmail).first();
      }

      if (guestRecord) {
        guestId = guestRecord.id;
      } else {
        // Auto-create guest
        guestId = `gst-${crypto.randomUUID()}`;
        const nameParts = (data.guestName || '').trim().split(' ');
        const firstName = data.firstName || nameParts[0] || 'Guest';
        const lastName = data.lastName || nameParts.slice(1).join(' ') || 'Customer';

        await c.env.DB.prepare(
          `INSERT INTO guests (id, first_name, last_name, email, phone, nationality, total_stays, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'Thai', 0, ?, ?)`
        )
          .bind(guestId, firstName, lastName, data.guestEmail || null, data.guestPhone || null, now, now)
          .run();

        guestRecord = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(guestId).first();
      }
    }

    // 2. Room Overlap Check (Date Range Overlap Prevention)
    // Overlap condition: check_in_date < newCheckOutDate AND check_out_date > newCheckInDate
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

    // 3. Compute Dates, Nights and Financial Totals
    const checkInTime = new Date(data.checkInDate).getTime();
    const checkOutTime = new Date(data.checkOutDate).getTime();
    const calculatedNights = Math.max(1, Math.round((checkOutTime - checkInTime) / (1000 * 3600 * 24)));
    const totalNights = data.totalNights || calculatedNights;

    const nightlyRate = Number(data.nightlyRate);
    const subtotal = Number((nightlyRate * totalNights).toFixed(2));
    const discountAmount = Number(data.discountAmount || 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.07).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));
    const depositAmount = Number(data.depositAmount || 0);

    const reservationId = `res-${crypto.randomUUID()}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reservationCode = `RES-${new Date().getFullYear()}-${randomSuffix}`;
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
      guestName: guestRecord ? `${guestRecord.first_name} ${guestRecord.last_name}`.trim() : data.guestName,
      guestEmail: guestRecord?.email || data.guestEmail,
      guestPhone: guestRecord?.phone || data.guestPhone,
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

    // 5. Atomic Batch Execution (Reservation + History + Outbox Event + Increment Guest Stays)
    const stmtInsertReservation = c.env.DB.prepare(
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
    );

    const stmtInsertHistory = c.env.DB.prepare(
      `INSERT INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at)
       VALUES (?, ?, 'created', NULL, ?, ?, ?)`
    ).bind(`rh-${crypto.randomUUID()}`, reservationId, JSON.stringify(outboxPayload), callerId, now);

    const stmtInsertOutbox = c.env.DB.prepare(
      `INSERT INTO outbox_events (id, event_type, aggregate_id, aggregate_type, payload, status, created_at)
       VALUES (?, 'ReservationCreated', ?, 'Reservation', ?, 'pending', ?)`
    ).bind(`evt-${crypto.randomUUID()}`, reservationId, JSON.stringify(outboxPayload), now);

    const stmtIncrementGuestStays = c.env.DB.prepare(
      'UPDATE guests SET total_stays = total_stays + 1, updated_at = ? WHERE id = ?'
    ).bind(now, guestId);

    await c.env.DB.batch([stmtInsertReservation, stmtInsertHistory, stmtInsertOutbox, stmtIncrementGuestStays]);

    // Fetch and return the newly created reservation with full joins
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

    // Overlap check if room or dates were changed
    if (data.roomId || data.checkInDate || data.checkOutDate) {
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

    // Recalculate financial amounts
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

    const stmtUpdate = c.env.DB.prepare(
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
    );

    const stmtHistory = c.env.DB.prepare(
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
    );

    await c.env.DB.batch([stmtUpdate, stmtHistory]);

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

    if (existing.status === 'checked_in') {
      return c.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_CHECKED_IN',
            message: 'Cannot delete an active checked-in reservation. Please perform check-out first.',
          },
        },
        400
      );
    }

    const now = new Date().toISOString();
    const callerId = c.req.header('x-user-id') || 'system';

    // Mark as cancelled and record in history and outbox
    const stmtCancel = c.env.DB.prepare(
      `UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?`
    ).bind(now, existing.id);

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
      }),
      now
    );

    await c.env.DB.batch([stmtCancel, stmtHistory, stmtOutbox]);

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

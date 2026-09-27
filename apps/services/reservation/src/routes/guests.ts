import { Hono } from 'hono';
import { type Env, mapGuest } from '../types';
import { createGuestSchema, updateGuestSchema } from '../validators/guest.validator';

const guests = new Hono<{ Bindings: Env }>();

// 45. GET /guests — ดึงรายชื่อแขกทั้งหมดในระบบ
guests.get('/', async (c) => {
  try {
    const search = c.req.query('search')?.trim();
    // 2.1 Clamp limit and offset to prevent bypass like ?limit=-1
    const rawLimit = parseInt(c.req.query('limit') || '50', 10);
    const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 100);

    const rawOffset = parseInt(c.req.query('offset') || '0', 10);
    const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    let query = 'SELECT * FROM guests';
    const params: any[] = [];

    if (search) {
      query += ` WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR id_card_number LIKE ?`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = c.env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM guests';
    let countParams: any[] = [];
    if (search) {
      countQuery += ` WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR id_card_number LIKE ?`;
      const term = `%${search}%`;
      countParams.push(term, term, term, term, term);
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const total = countResult?.count || 0;

    return c.json({
      success: true,
      data: (result.results || []).map(mapGuest),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch guests' } }, 500);
  }
});

// 46. GET /guests/:id — ข้อมูลแขกรายบุคคลพร้อมประวัติการเข้าพัก
guests.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const guest = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(id).first();

    if (!guest) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } }, 404);
    }

    // Fetch recent reservations for this guest
    const reservations = await c.env.DB.prepare(
      'SELECT id, reservation_code, room_number, room_type_name, status, check_in_date, check_out_date, total_amount FROM reservations WHERE guest_id = ? ORDER BY check_in_date DESC LIMIT 5'
    )
      .bind(id)
      .all();

    return c.json({
      success: true,
      data: {
        ...mapGuest(guest),
        recentReservations: reservations.results || [],
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to fetch guest details' } }, 500);
  }
});

// 44. POST /guests — บันทึกประวัติแขกใหม่
guests.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createGuestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const guestId = `gst-${crypto.randomUUID()}`;

    // 1.2 Check duplicate phone or idCardNumber if provided
    if (data.phone) {
      const existingPhone = await c.env.DB.prepare('SELECT id FROM guests WHERE phone = ?').bind(data.phone.trim()).first();
      if (existingPhone) {
        return c.json(
          { success: false, error: { code: 'DUPLICATE_PHONE', message: 'A guest with this phone number already exists' } },
          409
        );
      }
    }

    if (data.idCardNumber) {
      const existingIdCard = await c.env.DB.prepare('SELECT id FROM guests WHERE id_card_number = ?')
        .bind(data.idCardNumber.trim())
        .first();
      if (existingIdCard) {
        return c.json(
          { success: false, error: { code: 'DUPLICATE_ID_CARD', message: 'A guest with this ID Card / Passport already exists' } },
          409
        );
      }
    }

    await c.env.DB.prepare(
      `INSERT INTO guests (id, first_name, last_name, email, phone, id_card_number, nationality, address, notes, total_stays, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
      .bind(
        guestId,
        data.firstName.trim(),
        data.lastName.trim(),
        data.email?.trim() || null,
        data.phone?.trim() || null,
        data.idCardNumber?.trim() || null,
        data.nationality?.trim() || 'Thai',
        data.address?.trim() || null,
        data.notes?.trim() || null,
        now,
        now
      )
      .run();

    const created = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(guestId).first();

    return c.json(
      {
        success: true,
        data: mapGuest(created),
        message: 'Guest profile created successfully',
      },
      201
    );
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return c.json(
        { success: false, error: { code: 'DUPLICATE_GUEST', message: 'A guest with this phone or ID card already exists' } },
        409
      );
    }
    return c.json({ success: false, error: { message: error.message || 'Failed to create guest' } }, 500);
  }
});

// 47. PUT /guests/:id — แก้ไขข้อมูลประวัติแขก
guests.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(id).first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } }, 404);
    }

    const body = await c.req.json();
    const parsed = updateGuestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: { message: 'Validation failed', details: parsed.error.format() } }, 400);
    }

    const data = parsed.data;
    const now = new Date().toISOString();

    // 2.2 Check duplicate phone or idCardNumber against OTHER guests
    if (data.phone) {
      const dupPhone = await c.env.DB.prepare('SELECT id FROM guests WHERE phone = ? AND id != ?')
        .bind(data.phone.trim(), id)
        .first();
      if (dupPhone) {
        return c.json(
          { success: false, error: { code: 'DUPLICATE_PHONE', message: 'A guest with this phone number already exists' } },
          409
        );
      }
    }

    if (data.idCardNumber) {
      const dupIdCard = await c.env.DB.prepare('SELECT id FROM guests WHERE id_card_number = ? AND id != ?')
        .bind(data.idCardNumber.trim(), id)
        .first();
      if (dupIdCard) {
        return c.json(
          { success: false, error: { code: 'DUPLICATE_ID_CARD', message: 'A guest with this ID Card / Passport already exists' } },
          409
        );
      }
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.firstName !== undefined) {
      fields.push('first_name = ?');
      values.push(data.firstName.trim());
    }
    if (data.lastName !== undefined) {
      fields.push('last_name = ?');
      values.push(data.lastName.trim());
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email?.trim() || null);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone?.trim() || null);
    }
    if (data.idCardNumber !== undefined) {
      fields.push('id_card_number = ?');
      values.push(data.idCardNumber?.trim() || null);
    }
    if (data.nationality !== undefined) {
      fields.push('nationality = ?');
      values.push(data.nationality?.trim() || null);
    }
    if (data.address !== undefined) {
      fields.push('address = ?');
      values.push(data.address?.trim() || null);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes?.trim() || null);
    }

    if (fields.length === 0) {
      return c.json({ success: true, data: mapGuest(existing), message: 'No changes provided' });
    }

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);
    await c.env.DB.prepare(`UPDATE guests SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

    const updated = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(id).first();

    return c.json({
      success: true,
      data: mapGuest(updated),
      message: 'Guest profile updated successfully',
    });
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return c.json(
        { success: false, error: { code: 'DUPLICATE_GUEST', message: 'A guest with this phone or ID card already exists' } },
        409
      );
    }
    return c.json({ success: false, error: { message: error.message || 'Failed to update guest' } }, 500);
  }
});

// 48. DELETE /guests/:id — ลบข้อมูลแขก
guests.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT * FROM guests WHERE id = ?').bind(id).first();

    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Guest not found' } }, 404);
    }

    // 6.2 Check if ANY reservation exists for this guest to protect foreign key and audit integrity
    const anyRes = await c.env.DB.prepare(
      `SELECT id, reservation_code, status FROM reservations WHERE guest_id = ? LIMIT 1`
    )
      .bind(id)
      .first<any>();

    if (anyRes) {
      return c.json(
        {
          success: false,
          error: {
            code: 'GUEST_HAS_RESERVATIONS',
            message: `Cannot delete guest with reservation history (${anyRes.reservation_code}). Guest record is referenced by bookings.`,
          },
        },
        400
      );
    }

    await c.env.DB.prepare('DELETE FROM guests WHERE id = ?').bind(id).run();

    return c.json({
      success: true,
      data: { id },
      message: 'Guest profile deleted successfully',
    });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message || 'Failed to delete guest' } }, 500);
  }
});

export default guests;

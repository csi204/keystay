import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  roomIssues,
  housekeepingTasks,
  housekeepingStaff,
  outboxEvents,
} from '../db/schema';
import { ReportIssueSchema } from '../validators/housekeeping.validator';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ROOM_INVENTORY_SERVICE?: Fetcher;
  ENVIRONMENT?: string;
}

export const issuesRoute = new Hono<{ Bindings: Env }>();

async function updateRoomInventoryStatus(
  c: any,
  roomId: string,
  status: 'maintenance' | 'available' | 'cleaning',
  changeReason: string,
): Promise<{ ok: boolean; message?: string }> {
  const reqUrl = c.req.url || '';
  const isLocal = reqUrl.includes('127.0.0.1') || reqUrl.includes('localhost');
  const roomInventoryBase = isLocal
    ? 'http://127.0.0.1:8789'
    : 'https://keystay-room-inventory.khetsophon-ain.workers.dev';
  const path = `/rooms/${encodeURIComponent(roomId)}/status`;
  const init: RequestInit = {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      changeReason,
      eventSource: 'housekeeping_issue',
    }),
  };

  try {
    const res = !isLocal && c.env.ROOM_INVENTORY_SERVICE
      ? await c.env.ROOM_INVENTORY_SERVICE.fetch(`http://internal${path}`, init)
      : await fetch(`${roomInventoryBase}${path}`, init);
    if (!res.ok) {
      const errBody: any = await res.json().catch(() => ({}));
      console.warn(`[Housekeeping Issue] Failed to update room ${roomId} to ${status}:`, errBody?.message || res.status);
      return { ok: false, message: errBody?.message || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn(`[Housekeeping Issue] Error calling room-inventory for ${roomId}:`, err?.message || err);
    return { ok: false, message: err?.message || 'Network error' };
  }
}

// ==========================================
// API #69: POST /tasks/:id/report-issue & POST /issues - แจ้งปัญหา/สิ่งของชำรุดในห้องพัก (Cloudflare R2)
// รองรับทั้งแบบระบุ Task ID (API #69) และแบบระบุ Room ID โดยตรง (Scenario UAT-HK04)
// ==========================================
export const reportIssueHandler = async (c: any) => {
  const paramTaskId = c.req.param('id');
  const db = getDb(c.env.DB);

  // 1. Parse request: supports either multipart/form-data or application/json
  const contentType = c.req.header('content-type') || '';
  let payload: any = {};
  let photoFile: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    payload = {
      taskId: paramTaskId || (formData.get('taskId') as string) || (formData.get('task_id') as string) || null,
      roomId: (formData.get('roomId') as string) || (formData.get('room_id') as string),
      roomNumber: (formData.get('roomNumber') as string) || (formData.get('room_number') as string),
      reportedBy: (formData.get('reportedBy') as string) || (formData.get('reported_by') as string),
      issueType: (formData.get('issueType') as string) || (formData.get('issue_type') as string),
      description: formData.get('description') as string,
      severity: formData.get('severity') as string,
      notes: formData.get('notes') as string,
      photoR2Key: (formData.get('photoR2Key') as string) || (formData.get('photo_r2_key') as string),
      affectsAvailability:
        (formData.get('affectsAvailability') as string) ??
        (formData.get('affects_availability') as string),
    };
    photoFile = formData.get('photo') as File | null;
  } else {
    payload = await c.req.json().catch(() => ({}));
    if (paramTaskId) {
      payload.taskId = paramTaskId;
    }
  }

  const targetTaskId = payload.taskId || paramTaskId || null;
  let finalRoomId = payload.roomId || payload.room_id || null;
  let finalRoomNumber = payload.roomNumber || payload.room_number || null;

  // 2. If Task ID is provided, query and verify the task exists
  if (targetTaskId) {
    const task = await db
      .select()
      .from(housekeepingTasks)
      .where(eq(housekeepingTasks.id, targetTaskId))
      .get();

    if (!task) {
      return c.json({ success: false, error: 'NOT_FOUND', message: 'Housekeeping task not found' }, 404);
    }

    if (!finalRoomId) {
      finalRoomId = task.roomId;
    }
    if (!finalRoomNumber) {
      finalRoomNumber = task.roomNumber;
    }

    if (!payload.reportedBy && task.assignedTo) {
      payload.reportedBy = task.assignedTo;
    }
  }

  // Auto-resolve reportedBy if missing
  if (!payload.reportedBy) {
    const callerUserId = c.req.header('x-user-id');
    if (callerUserId) {
      const staffByUser = await db
        .select()
        .from(housekeepingStaff)
        .where(eq(housekeepingStaff.userId, callerUserId))
        .get();
      if (staffByUser) {
        payload.reportedBy = staffByUser.id;
      }
    }
    if (!payload.reportedBy) {
      payload.reportedBy = 'hk-staff-001';
    }
  }

  // 3. Guard: If no Task ID, roomId is mandatory for direct room issue reporting (UAT-HK04)
  if (!finalRoomId) {
    return c.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Either taskId or roomId is required to report an issue',
      },
      400,
    );
  }

  if (!finalRoomNumber) {
    finalRoomNumber = finalRoomId;
  }

  // 4. Handle Cloudflare R2 binary photo upload if provided
  let uploadedR2Key: string | null = null;
  if (photoFile && photoFile.size > 0) {
    const issueIdSnippet = crypto.randomUUID().slice(0, 8);
    const safeName = photoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    uploadedR2Key = `photos/issues/${finalRoomId}-${issueIdSnippet}-${safeName}`;

    if (c.env.KEYSTAY_ASSETS) {
      const fileBuffer = await photoFile.arrayBuffer();
      await c.env.KEYSTAY_ASSETS.put(uploadedR2Key, fileBuffer, {
        httpMetadata: {
          contentType: photoFile.type || 'image/jpeg',
        },
      });
    }
  }

  // 5. Validate DTO with Zod
  const parsed = ReportIssueSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
      400,
    );
  }

  // 6. Verify Reporting Staff Exists
  const staff = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, parsed.data.reportedBy))
    .get();

  if (!staff) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Reporting staff member not found' }, 404);
  }

  const issueId = `iss-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const finalR2Key = uploadedR2Key || parsed.data.photoR2Key || null;

  const newIssue = {
    id: issueId,
    taskId: targetTaskId,
    roomId: finalRoomId,
    reportedBy: staff.id,
    issueType: parsed.data.issueType,
    description: parsed.data.description,
    photoR2Key: finalR2Key,
    severity: parsed.data.severity,
    status: 'open' as const,
    storageLocation: parsed.data.storageLocation || 'Front Desk Counter',
    retentionDays: parsed.data.retentionDays || 7,
    receivedByName: parsed.data.receivedByName || null,
    resolvedAt: null,
    createdAt: now,
  };

  const outboxId = crypto.randomUUID();
  const eventPayload = JSON.stringify({
    eventId: crypto.randomUUID(),
    eventType: 'RoomIssueReported',
    timestamp: now,
    issueId,
    taskId: targetTaskId,
    roomId: finalRoomId,
    roomNumber: finalRoomNumber,
    reportedBy: staff.id,
    reporterName: `${staff.firstName} ${staff.lastName}`,
    issueType: parsed.data.issueType,
    severity: parsed.data.severity,
    description: parsed.data.description,
    photoR2Key: finalR2Key,
  });

  // Atomic insert into room_issues and outbox_events
  await db.batch([
    db.insert(roomIssues).values(newIssue),
    db.insert(outboxEvents).values({
      id: outboxId,
      eventType: 'RoomIssueReported',
      aggregateId: issueId,
      aggregateType: 'RoomIssue',
      payload: eventPayload,
      status: 'pending',
      createdAt: now,
    }),
  ]);

  let roomMaintenanceTriggered = false;
  if (parsed.data.affectsAvailability && finalRoomId && parsed.data.issueType !== 'lost_and_found') {
    const roomUpdate = await updateRoomInventoryStatus(
      c,
      finalRoomId,
      'maintenance',
      `Auto-maintenance from housekeeping issue ${issueId}: ${parsed.data.description}`,
    );
    roomMaintenanceTriggered = roomUpdate.ok;
  }

  return c.json(
    {
      success: true,
      message: 'Room issue reported successfully with Cloudflare R2 reference',
      data: {
        ...newIssue,
        roomNumber: finalRoomNumber,
        reportedByName: `${staff.firstName} ${staff.lastName}`,
        r2Uploaded: Boolean(uploadedR2Key),
        roomMaintenanceTriggered,
      },
    },
    201,
  );
};

issuesRoute.post('/tasks/:id/report-issue', reportIssueHandler);
issuesRoute.post('/:id/report-issue', reportIssueHandler);
issuesRoute.post('/', reportIssueHandler);

issuesRoute.get('/assets/*', async (c) => {
  if (!c.env.KEYSTAY_ASSETS) {
    return c.json({ success: false, error: 'R2 bucket is not configured' }, 503);
  }
  const rawKey = c.req.path.replace(/^\/housekeeping\/issues\/assets\//, '');
  const key = decodeURIComponent(rawKey).replace(/^\/+/, '');
  if (!key || key.includes('..')) {
    return c.json({ success: false, error: 'Invalid asset key' }, 400);
  }
  const obj = await c.env.KEYSTAY_ASSETS.get(key);
  if (!obj) {
    return c.json({ success: false, error: 'Asset not found' }, 404);
  }
  const ext = key.split('.').pop()?.toLowerCase();
  const fallbackType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType || fallbackType);
  headers.set('Cache-Control', 'public, max-age=86400');
  if (obj.httpEtag) headers.set('ETag', obj.httpEtag);
  return new Response(obj.body, { headers });
});

// ==========================================
// Additional Issues Endpoints: GET /issues, GET /issues/:id, PUT /issues/:id/status
// ==========================================
issuesRoute.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const roomId = c.req.query('roomId') || c.req.query('room_id');
  const status = c.req.query('status');
  const severity = c.req.query('severity');
  const issueType = c.req.query('issueType') || c.req.query('issue_type');

  const conditions = [];
  if (roomId) conditions.push(eq(roomIssues.roomId, roomId));
  if (status) conditions.push(eq(roomIssues.status, status as any));
  if (severity) conditions.push(eq(roomIssues.severity, severity as any));
  if (issueType) conditions.push(eq(roomIssues.issueType, issueType as any));

  const query = db
    .select({
      id: roomIssues.id,
      taskId: roomIssues.taskId,
      roomId: roomIssues.roomId,
      reportedBy: roomIssues.reportedBy,
      issueType: roomIssues.issueType,
      description: roomIssues.description,
      photoR2Key: roomIssues.photoR2Key,
      severity: roomIssues.severity,
      status: roomIssues.status,
      storageLocation: roomIssues.storageLocation,
      retentionDays: roomIssues.retentionDays,
      receivedByName: roomIssues.receivedByName,
      resolvedAt: roomIssues.resolvedAt,
      createdAt: roomIssues.createdAt,
      reporterFirstName: housekeepingStaff.firstName,
      reporterLastName: housekeepingStaff.lastName,
    })
    .from(roomIssues)
    .leftJoin(housekeepingStaff, eq(roomIssues.reportedBy, housekeepingStaff.id));

  const issuesList = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(roomIssues.createdAt)).all()
    : await query.orderBy(desc(roomIssues.createdAt)).all();

  return c.json({
    success: true,
    total: issuesList.length,
    data: issuesList.map((i) => ({
      id: i.id,
      taskId: i.taskId,
      roomId: i.roomId,
      issueType: i.issueType,
      description: i.description,
      photoR2Key: i.photoR2Key,
      severity: i.severity,
      status: i.status,
      storageLocation: i.storageLocation,
      retentionDays: i.retentionDays,
      receivedByName: i.receivedByName,
      resolvedAt: i.resolvedAt,
      createdAt: i.createdAt,
      reportedBy: {
        id: i.reportedBy,
        name: `${i.reporterFirstName ?? ''} ${i.reporterLastName ?? ''}`.trim(),
      },
    })),
  });
});

issuesRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);

  const issue = await db
    .select()
    .from(roomIssues)
    .where(eq(roomIssues.id, id))
    .get();

  if (!issue) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room issue not found' }, 404);
  }

  const staff = await db
    .select()
    .from(housekeepingStaff)
    .where(eq(housekeepingStaff.id, issue.reportedBy))
    .get();

  return c.json({
    success: true,
    data: {
      ...issue,
      reporter: staff
        ? {
            id: staff.id,
            name: `${staff.firstName} ${staff.lastName}`,
            phone: staff.phone,
          }
        : null,
    },
  });
});

issuesRoute.put('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const status = body.status;

  if (!status || !['open', 'acknowledged', 'resolved', 'expired_claimed'].includes(status)) {
    return c.json(
      { success: false, error: 'BAD_REQUEST', message: 'Status must be open, acknowledged, resolved, or expired_claimed' },
      400,
    );
  }

  const db = getDb(c.env.DB);
  const existing = await db
    .select()
    .from(roomIssues)
    .where(eq(roomIssues.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room issue not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: any = {
    status,
    resolvedAt: (status === 'resolved' || status === 'expired_claimed') ? now : null,
  };

  if (body.receivedByName || body.received_by_name) {
    updateData.receivedByName = body.receivedByName || body.received_by_name;
  }
  if (body.storageLocation || body.storage_location) {
    updateData.storageLocation = body.storageLocation || body.storage_location;
  }

  await db.update(roomIssues).set(updateData).where(eq(roomIssues.id, id));

  const updated = await db
    .select()
    .from(roomIssues)
    .where(eq(roomIssues.id, id))
    .get();

  let roomReleased = false;
  if (body.releaseRoom === true && existing.roomId) {
    const releaseResult = await updateRoomInventoryStatus(
      c,
      existing.roomId,
      'available',
      `Maintenance approved & resolved by Front Desk (issue ${id})`,
    );
    roomReleased = releaseResult.ok;
  }

  return c.json({ success: true, data: updated, roomReleased });
});

issuesRoute.put('/:id/resolve', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const db = getDb(c.env.DB);
  const existing = await db
    .select()
    .from(roomIssues)
    .where(eq(roomIssues.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Room issue not found' }, 404);
  }

  const now = new Date().toISOString();
  const updateData: any = {
    status: 'resolved',
    resolvedAt: now,
    receivedByName: body.receivedByName || body.received_by_name || 'Front Desk Customer',
  };

  await db.update(roomIssues).set(updateData).where(eq(roomIssues.id, id));
  const updated = await db
    .select()
    .from(roomIssues)
    .where(eq(roomIssues.id, id))
    .get();

  let roomReleased = false;
  if (body.releaseRoom === true && existing.roomId) {
    const releaseResult = await updateRoomInventoryStatus(
      c,
      existing.roomId,
      'available',
      `Maintenance approved & resolved by Front Desk (issue ${id})`,
    );
    roomReleased = releaseResult.ok;
  }

  return c.json({ success: true, data: updated, roomReleased });
});

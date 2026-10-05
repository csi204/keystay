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
  ENVIRONMENT?: string;
}

export const issuesRoute = new Hono<{ Bindings: Env }>();

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

    finalRoomId = task.roomId;
    finalRoomNumber = task.roomNumber;

    if (!payload.reportedBy && task.assignedTo) {
      payload.reportedBy = task.assignedTo;
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

  return c.json(
    {
      success: true,
      message: 'Room issue reported successfully with Cloudflare R2 reference',
      data: {
        ...newIssue,
        roomNumber: finalRoomNumber,
        reportedByName: `${staff.firstName} ${staff.lastName}`,
        r2Uploaded: Boolean(uploadedR2Key),
      },
    },
    201,
  );
};

issuesRoute.post('/tasks/:id/report-issue', reportIssueHandler);
issuesRoute.post('/:id/report-issue', reportIssueHandler);
issuesRoute.post('/', reportIssueHandler);

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

  if (!status || !['open', 'acknowledged', 'resolved'].includes(status)) {
    return c.json(
      { success: false, error: 'BAD_REQUEST', message: 'Status must be open, acknowledged, or resolved' },
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
    resolvedAt: status === 'resolved' ? now : null,
  };

  await db.update(roomIssues).set(updateData).where(eq(roomIssues.id, id));

  const updated = await db
    .select()
    .from(roomIssues)
    .where(eq(roomIssues.id, id))
    .get();

  return c.json({ success: true, data: updated });
});

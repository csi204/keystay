import { Hono } from 'hono';
import { tasksRoute } from './routes/tasks';
import { roomsToCleanRoute } from './routes/rooms-to-clean';
import { staffRoute, staffAssignmentsRoute } from './routes/staff';
import { issuesRoute } from './routes/issues';
import { scheduleRoute } from './routes/schedule';
import { webhooksRoute } from './routes/webhooks';
import { outsourceRoute } from './routes/outsource';
import { taskTemplatesRoute } from './routes/task-templates';
import { amenityRequestsRoute } from './routes/amenity-requests';

export interface Env {
  DB: D1Database;
  KEYSTAY_ASSETS?: R2Bucket;
  ENVIRONMENT?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
  QSTASH_URL?: string;
  QSTASH_TOKEN?: string;
  JWT_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Global Health & Metadata
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'housekeeping',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'housekeeping',
    description: 'Housekeeping & Maintenance Service (Tasks, Staff, Rooms to Clean, R2 Issues, Schedule)',
    version: '1.0.0',
    endpoints: [
      '55. GET /housekeeping/tasks',
      '56. GET /housekeeping/tasks/:id',
      '57. POST /housekeeping/tasks',
      '58. PUT /housekeeping/tasks/:id',
      '59. DELETE /housekeeping/tasks/:id',
      '60. PUT /housekeeping/tasks/:id/assign',
      '61. PUT /housekeeping/tasks/:id/complete',
      '62. GET /housekeeping/rooms-to-clean',
      '63. GET /housekeeping/staff-assignments',
      '64. GET /housekeeping/staff',
      '65. POST /housekeeping/staff',
      '66. PUT /housekeeping/staff/:id',
      '67. GET /housekeeping/staff/:id/tasks',
      '68. PUT /housekeeping/staff/:id/zone',
      '69. POST /housekeeping/tasks/:id/report-issue',
      '70. GET /housekeeping/schedule',
      '101. GET /housekeeping/outsource-contacts',
      '102. GET /housekeeping/outsource-contacts/:id',
      '103. POST /housekeeping/outsource-contacts',
      '104. PUT /housekeeping/outsource-contacts/:id',
      '105. DELETE /housekeeping/outsource-contacts/:id',
    ],
  });
});

// 1. Mount Tasks Routes (APIs #55-#61 & #69)
app.route('/housekeeping/tasks', tasksRoute);
app.route('/tasks', tasksRoute);

// 2. Mount Rooms To Clean Route (API #62)
app.route('/housekeeping/rooms-to-clean', roomsToCleanRoute);
app.route('/rooms-to-clean', roomsToCleanRoute);

// 3. Mount Staff Assignments Route (API #63)
app.route('/housekeeping/staff-assignments', staffAssignmentsRoute);
app.route('/staff-assignments', staffAssignmentsRoute);

// 4. Mount Staff Management Routes (APIs #64-#68)
app.route('/housekeeping/staff', staffRoute);
app.route('/staff', staffRoute);

// 5. Mount Issues Routes (API #69 & Issue Management)
app.route('/housekeeping/issues', issuesRoute);
app.route('/issues', issuesRoute);

// 6. Mount Schedule Routes (API #70)
app.route('/housekeeping/schedule', scheduleRoute);
app.route('/schedule', scheduleRoute);

// 7. Mount Webhook Consumers (QStash Fan-out Subscriber)
app.route('/housekeeping/webhooks', webhooksRoute);
app.route('/webhooks', webhooksRoute);

// 8. Mount Outsource Contacts Routes (APIs #101-#105)
app.route('/housekeeping/outsource-contacts', outsourceRoute);
app.route('/outsource-contacts', outsourceRoute);

// 9. Mount Task Templates Routes (CRUD for Front Desk & Owner)
app.route('/housekeeping/task-templates', taskTemplatesRoute);
app.route('/task-templates', taskTemplatesRoute);

// 10. Mount Amenity Requests Routes (Front Desk <-> Housekeeping Request Flow)
app.route('/housekeeping/amenity-requests', amenityRequestsRoute);
app.route('/amenity-requests', amenityRequestsRoute);

// Global Error Handler
app.onError((err, c) => {
  console.error('[Housekeeping Service Error]:', err);
  return c.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message,
    },
    500,
  );
});

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'NOT_FOUND',
      message: `Endpoint ${c.req.method} ${c.req.path} not found in housekeeping service`,
    },
    404,
  );
});

export default app;
export { outsourceContactsRoute, mapOutsourceContact, type OutsourceContactDTO } from './routes/outsource-contacts';

import { Hono } from 'hono';

const app = new Hono();

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
    description: 'Housekeeping & Maintenance Service (Tasks, Staff, Inspection, R2 Evidence)',
  });
});

export default app;

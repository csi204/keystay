import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'report-analytics',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'report-analytics',
    description: 'Analytics & Reporting Service (KPIs, Occupancy, Revenue Summary)',
  });
});

export default app;

import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'reservation',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'reservation',
    description: 'Reservation & Guest Management Service (Booking, Check-in, Check-out, QStash Fan-out)',
  });
});

export default app;

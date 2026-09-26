import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'room-inventory',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'room-inventory',
    description: 'Room & Inventory Management Service (Rooms, Types, Floors, Amenities, R2 Assets)',
  });
});

export default app;

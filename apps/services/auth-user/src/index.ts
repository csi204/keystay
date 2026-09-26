import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'auth-user',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'auth-user',
    description: 'Authentication & User Management Service',
  });
});

export default app;

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'KEYSTAY API Gateway',
    version: '1.0.0',
    description: 'Reverse Proxy and Central Entry Point for KEYSTAY Hotel Management Services',
  });
});

export default app;

import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'billing',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'billing',
    description: 'Billing & Cashiering Service (Bills, Payments, Invoices, Minibar)',
  });
});

export default app;

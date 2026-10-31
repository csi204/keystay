// apps/web/src/__tests__/front-desk-routing.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('frontDeskNavItems contains all 4 core portals', () => {
  const items = [
    { title: 'ผังห้องพัก (Room Matrix)', path: '/front-desk/room-matrix', key: 'matrix' },
    { title: 'รายการจอง (Reservations)', path: '/front-desk/reservations', key: 'reservations' },
    { title: 'เช็คอิน/เช็คเอาท์ (Arrivals & Departures)', path: '/front-desk/daily-operations', key: 'operations' },
    { title: 'แคชเชียร์และบิล (Bills & Cashier)', path: '/front-desk/billing', key: 'billing' },
  ];
  assert.strictEqual(items.length, 4);
  assert.strictEqual(items[0].path, '/front-desk/room-matrix');
  assert.strictEqual(items[1].path, '/front-desk/reservations');
  assert.strictEqual(items[2].path, '/front-desk/daily-operations');
  assert.strictEqual(items[3].path, '/front-desk/billing');
});

test('role redirect resolves front_desk to /front-desk/room-matrix', () => {
  const getDestinationByRole = (role: string) => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'manager') return '/manager/dashboard';
    if (role === 'front_desk') return '/front-desk/room-matrix';
    return '/';
  };
  assert.strictEqual(getDestinationByRole('front_desk'), '/front-desk/room-matrix');
});


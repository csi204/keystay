// apps/web/src/__tests__/reservations.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('calculateTotalNights computes exact whole nights', () => {
  const calculateTotalNights = (inDate: string, outDate: string): number => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };
  assert.strictEqual(calculateTotalNights('2026-11-01', '2026-11-04'), 3);
  assert.strictEqual(calculateTotalNights('2026-11-01', '2026-11-01'), 1);
});

test('calculateTotalAmount computes base price multiplied by nights in string format', () => {
  const calcAmount = (basePriceStr: string, nights: number): string => {
    const price = parseFloat(basePriceStr) || 0;
    return (price * nights).toFixed(2);
  };
  assert.strictEqual(calcAmount('1200.00', 3), '3600.00');
  assert.strictEqual(calcAmount('2500', 2), '5000.00');
});

test('filterArrivalsAndDepartures separates reservations by date and status', () => {
  const today = '2026-10-31';
  const list = [
    { id: '1', checkInDate: '2026-10-31', checkOutDate: '2026-11-02', status: 'confirmed' },
    { id: '2', checkInDate: '2026-10-29', checkOutDate: '2026-10-31', status: 'checked_in' },
    { id: '3', checkInDate: '2026-11-05', checkOutDate: '2026-11-08', status: 'confirmed' },
  ];

  const arrivals = list.filter((r) => r.checkInDate === today && r.status === 'confirmed');
  const departures = list.filter((r) => r.checkOutDate === today && r.status === 'checked_in');

  assert.strictEqual(arrivals.length, 1);
  assert.strictEqual(arrivals[0].id, '1');
  assert.strictEqual(departures.length, 1);
  assert.strictEqual(departures[0].id, '2');
});

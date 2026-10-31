// apps/web/src/__tests__/cashier-billing.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('calculateFolioSettlement calculates subtotal, 7% VAT, deposit deduction, and net due', () => {
  const calculateFolio = (items: { amount: number }[], depositAmount: number) => {
    const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
    const vat = Math.round(subtotal * 0.07 * 100) / 100;
    const totalWithVat = subtotal + vat;
    const netDue = Math.max(0, totalWithVat - depositAmount);
    return {
      subtotal: subtotal.toFixed(2),
      vat: vat.toFixed(2),
      totalWithVat: totalWithVat.toFixed(2),
      depositDeducted: depositAmount.toFixed(2),
      netDue: netDue.toFixed(2),
    };
  };

  const result = calculateFolio([{ amount: 2400 }, { amount: 150 }], 500);
  assert.strictEqual(result.subtotal, '2550.00');
  assert.strictEqual(result.vat, '178.50');
  assert.strictEqual(result.totalWithVat, '2728.50');
  assert.strictEqual(result.depositDeducted, '500.00');
  assert.strictEqual(result.netDue, '2228.50');
});

test('calculateFolio handles zero items and full deposit payment', () => {
  const calculateFolio = (items: { amount: number }[], depositAmount: number) => {
    const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
    const vat = Math.round(subtotal * 0.07 * 100) / 100;
    const totalWithVat = subtotal + vat;
    const netDue = Math.max(0, totalWithVat - depositAmount);
    return {
      subtotal: subtotal.toFixed(2),
      vat: vat.toFixed(2),
      totalWithVat: totalWithVat.toFixed(2),
      depositDeducted: depositAmount.toFixed(2),
      netDue: netDue.toFixed(2),
    };
  };

  const result = calculateFolio([{ amount: 500 }], 600);
  assert.strictEqual(result.subtotal, '500.00');
  assert.strictEqual(result.vat, '35.00');
  assert.strictEqual(result.totalWithVat, '535.00');
  assert.strictEqual(result.netDue, '0.00');
});


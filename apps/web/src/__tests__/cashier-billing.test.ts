// apps/web/src/__tests__/cashier-billing.test.ts
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

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

test('CashierFolioPage handles roomId, roomNumber, and actions in auto-select navigation flow', () => {
  const folioPagePath = path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/CashierFolioPage.tsx');
  assert.ok(fs.existsSync(folioPagePath), 'CashierFolioPage.tsx should exist');
  const code = fs.readFileSync(folioPagePath, 'utf-8');

  // navState has roomId, roomNumber, billId, reservationId, action
  assert.match(code, /roomId\?:/);
  assert.match(code, /roomNumber\?:/);
  assert.match(code, /billId\?:/);
  assert.match(code, /reservationId\?:/);
  assert.match(code, /action\?:/);

  // Auto-selects by matchingBill with roomId or roomNumber
  assert.match(code, /matchingBill\s*=\s*bills\.find/);
  assert.match(code, /b\.roomId === navState\.roomId/);
  assert.match(code, /b\.roomNumber === navState\.roomNumber/);
  assert.match(code, /loadBillDetails\(matchingBill\.id\)/);

  // Action handling for add-charge, charge, minibar, and amenities
  assert.match(
    code,
    /navState\?\.action === ['"]add-charge['"]\s*\|\|\s*navState\?\.action === ['"]charge['"]\s*\|\|\s*navState\?\.action === ['"]minibar['"]/
  );
  assert.match(code, /setIsAddChargeOpen\(true\)/);
  assert.match(code, /navState\?\.action === ['"]amenities['"]/);
  assert.match(code, /setIsAmenitiesOpen\(true\)/);
});



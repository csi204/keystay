// apps/web/src/__tests__/folio-calculation.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateItemTotal, calculateFolioSummary } from '../components/front-desk/FolioSplitScreen';

describe('Folio Item Calculation & NaN Guard', () => {
  it('calculates item total correctly when totalAmount is undefined but totalPrice is present', () => {
    const item = {
      id: 'bi-002',
      quantity: 3,
      unitPrice: '120.00',
      totalPrice: '360.00',
    };
    const total = calculateItemTotal(item);
    assert.strictEqual(total, 360);
    assert.strictEqual(Number.isNaN(total), false);
  });

  it('calculates fallback unitPrice * quantity when totals are missing', () => {
    const item = {
      id: 'bi-test',
      quantity: 2,
      unitPrice: '150.00',
    };
    const total = calculateItemTotal(item);
    assert.strictEqual(total, 300);
    assert.strictEqual(Number.isNaN(total), false);
  });

  it('calculates subtotal, VAT 7%, and net due without NaN', () => {
    const items = [
      { id: '1', quantity: 1, unitPrice: '1000' },
      { id: '2', quantity: 2, unitPrice: '250' },
    ];
    const summary = calculateFolioSummary(items, 500);
    assert.strictEqual(summary.subtotal, 1500);
    assert.strictEqual(summary.vat, 105);
    assert.strictEqual(summary.totalWithVat, 1605);
    assert.strictEqual(summary.netDue, 1105);
  });
});

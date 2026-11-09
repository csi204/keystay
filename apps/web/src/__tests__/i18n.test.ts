import { describe, it } from 'node:test';
import assert from 'node:assert';
import { th } from '../locales/th';
import { en } from '../locales/en';
import {
  translateKey,
  formatCurrencyHelper,
  formatDateRangeHelper,
  formatDateHelper,
} from '../lib/i18n';

describe('i18n Translation & Formatting Engine', () => {
  it('contains matched keys across TH and EN dictionaries', () => {
    assert.strictEqual(typeof th['nav.roomMatrix'], 'string');
    assert.strictEqual(typeof en['nav.roomMatrix'], 'string');
    assert.strictEqual(th['nav.roomMatrix'], 'ผังห้องพัก');
    assert.strictEqual(en['nav.roomMatrix'], 'Room Matrix');

    // Comprehensive parity check: all keys in th must exist in en and vice versa
    const thKeys = Object.keys(th).sort();
    const enKeys = Object.keys(en).sort();
    assert.deepStrictEqual(
      thKeys,
      enKeys,
      'Translation dictionary keys must match 1:1 across TH and EN'
    );
  });

  it('translates keys with parameter interpolation', () => {
    const textTh = translateKey(th, 'common.nightsCount', { count: 3 });
    const textEn = translateKey(en, 'common.nightsCount', { count: 3 });
    assert.strictEqual(textTh, '3 คืน');
    assert.strictEqual(textEn, '3 nights');
  });

  it('falls back to key when translation is missing', () => {
    assert.strictEqual(translateKey(th, 'nonexistent.key'), 'nonexistent.key');
  });

  it('formats currency consistently based on locale', () => {
    assert.strictEqual(formatCurrencyHelper(3500, 'th'), '฿3,500.00');
    assert.strictEqual(formatCurrencyHelper('120.50', 'en'), '฿120.50');
    // Guard against NaN
    assert.strictEqual(formatCurrencyHelper('invalid', 'th'), '฿0.00');
  });

  it('formats date ranges cleanly without raw ISO strings', () => {
    const rangeTh = formatDateRangeHelper('2026-09-28', '2026-10-02', 4, 'th');
    const rangeEn = formatDateRangeHelper('2026-09-28', '2026-10-02', 4, 'en');
    assert.match(rangeTh, /4 คืน/);
    assert.match(rangeEn, /4 nights/);
  });

  it('handles invalid or missing dates gracefully by returning dash', () => {
    assert.strictEqual(formatDateHelper(null, 'short', 'th'), '—');
    assert.strictEqual(formatDateHelper(undefined, 'short', 'en'), '—');
    assert.strictEqual(formatDateHelper('invalid-date', 'short', 'th'), '—');
    assert.strictEqual(formatDateRangeHelper(null, null, undefined, 'th'), '—');
    assert.strictEqual(formatDateRangeHelper('invalid', 'invalid', 2, 'en'), '—');
  });
});

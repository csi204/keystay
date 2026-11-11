import { describe, it } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import {
  formatDisplayDate,
  parseDisplayDate,
  CustomDatePicker,
} from '../components/common/CustomDatePicker';

describe('CustomDatePicker & Date Formatting Helpers', () => {
  describe('formatDisplayDate', () => {
    it('formats 2026-11-11 in Thai locale to Buddhist Era (พ.ศ.) 11/11/2569', () => {
      const formatted = formatDisplayDate('2026-11-11', 'th');
      assert.strictEqual(formatted, '11/11/2569');
    });

    it('formats 2026-11-11 in English locale to Common Era (ค.ศ.) 11/11/2026', () => {
      const formatted = formatDisplayDate('2026-11-11', 'en');
      assert.strictEqual(formatted, '11/11/2026');
    });

    it('handles leap year 2024-02-29 correctly in Thai locale (29/02/2567)', () => {
      const formatted = formatDisplayDate('2024-02-29', 'th');
      assert.strictEqual(formatted, '29/02/2567');
    });

    it('handles century boundary 2000-01-01 correctly in Thai locale (01/01/2543)', () => {
      const formatted = formatDisplayDate('2000-01-01', 'th');
      assert.strictEqual(formatted, '01/01/2543');
    });

    it('returns empty string for invalid, null, or empty inputs', () => {
      assert.strictEqual(formatDisplayDate('', 'th'), '');
      assert.strictEqual(formatDisplayDate('invalid-date', 'th'), '');
      // @ts-expect-error test invalid types
      assert.strictEqual(formatDisplayDate(null, 'th'), '');
      // @ts-expect-error test invalid types
      assert.strictEqual(formatDisplayDate(undefined, 'en'), '');
    });
  });

  describe('parseDisplayDate', () => {
    it('parses Thai Buddhist Era date 11/11/2569 into ISO 2026-11-11', () => {
      const parsed = parseDisplayDate('11/11/2569', 'th');
      assert.strictEqual(parsed, '2026-11-11');
    });

    it('parses English Common Era date 11/11/2026 into ISO 2026-11-11', () => {
      const parsed = parseDisplayDate('11/11/2026', 'en');
      assert.strictEqual(parsed, '2026-11-11');
    });

    it('correctly accepts Feb 29 on leap year 2567 BE (2024 CE)', () => {
      const parsed = parseDisplayDate('29/02/2567', 'th');
      assert.strictEqual(parsed, '2024-02-29');
    });

    it('rejects Feb 29 on non-leap year 2569 BE (2026 CE)', () => {
      const parsed = parseDisplayDate('29/02/2569', 'th');
      assert.strictEqual(parsed, null);
    });

    it('rejects invalid day 31 in April (31/04/2569)', () => {
      const parsed = parseDisplayDate('31/04/2569', 'th');
      assert.strictEqual(parsed, null);
    });

    it('rejects invalid month numbers like 13 (15/13/2569)', () => {
      const parsed = parseDisplayDate('15/13/2569', 'th');
      assert.strictEqual(parsed, null);
    });

    it('rejects day 0 (00/10/2569)', () => {
      const parsed = parseDisplayDate('00/10/2569', 'th');
      assert.strictEqual(parsed, null);
    });

    it('supports alternate separators like dash and dot', () => {
      assert.strictEqual(parseDisplayDate('11-11-2569', 'th'), '2026-11-11');
      assert.strictEqual(parseDisplayDate('11.11.2569', 'th'), '2026-11-11');
    });

    it('handles CE fallback when entered under Thai locale', () => {
      // If user pastes or types CE year 2026 under Thai locale
      assert.strictEqual(parseDisplayDate('11/11/2026', 'th'), '2026-11-11');
    });

    it('returns null for empty or non-date text', () => {
      assert.strictEqual(parseDisplayDate('', 'th'), null);
      assert.strictEqual(parseDisplayDate('hello world', 'th'), null);
      assert.strictEqual(parseDisplayDate('999/999/999', 'th'), null);
    });
  });

  describe('Component & Exports verification', () => {
    it('exports CustomDatePicker as a valid React component', () => {
      assert.strictEqual(typeof CustomDatePicker, 'function');
      assert.strictEqual(typeof formatDisplayDate, 'function');
      assert.strictEqual(typeof parseDisplayDate, 'function');
    });

    it('round-trips ISO -> formatted -> parsed ISO cleanly', () => {
      const dates = [
        '2026-01-01',
        '2026-02-28',
        '2026-07-15',
        '2026-11-11',
        '2026-12-31',
        '2024-02-29',
      ];

      for (const iso of dates) {
        // Thai locale roundtrip
        const thFormatted = formatDisplayDate(iso, 'th');
        const thParsed = parseDisplayDate(thFormatted, 'th');
        assert.strictEqual(thParsed, iso, `Roundtrip failed for ${iso} in Thai`);

        // English locale roundtrip
        const enFormatted = formatDisplayDate(iso, 'en');
        const enParsed = parseDisplayDate(enFormatted, 'en');
        assert.strictEqual(enParsed, iso, `Roundtrip failed for ${iso} in English`);
      }
    });
  });
});

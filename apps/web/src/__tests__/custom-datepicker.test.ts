import { describe, it } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatDisplayDate,
  parseDisplayDate,
  computePlacement,
  isDateWithinConstraints,
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

  describe('Placement logic (top, bottom, auto)', () => {
    it('computePlacement returns "bottom" when there is sufficient space below', () => {
      const rect = { bottom: 300, top: 260 };
      const placement = computePlacement(rect, 800, 320);
      assert.strictEqual(placement, 'bottom');
    });

    it('computePlacement returns "top" when input is close to viewport bottom', () => {
      const rect = { bottom: 600, top: 560 };
      const placement = computePlacement(rect, 800, 320);
      assert.strictEqual(placement, 'top');
    });

    it('renders popover with placement="top" positioned above input with z-[9999] fixed placement', () => {
      const html = renderToStaticMarkup(
        React.createElement(CustomDatePicker, {
          value: '2026-11-11',
          onChange: () => {},
          placement: 'top',
          defaultOpen: true,
        })
      );
      assert.ok(html.includes('data-placement="top"'), 'Should have data-placement="top"');
      assert.ok(html.includes('fixed'), 'Should contain fixed positioning');
      assert.ok(html.includes('z-[9999]') || html.includes('z-index: 9999'), 'Should contain z-[9999] for high stacking context');
    });

    it('renders popover with placement="bottom" positioned below input with z-[9999] fixed placement', () => {
      const html = renderToStaticMarkup(
        React.createElement(CustomDatePicker, {
          value: '2026-11-11',
          onChange: () => {},
          placement: 'bottom',
          defaultOpen: true,
        })
      );
      assert.ok(html.includes('data-placement="bottom"'), 'Should have data-placement="bottom"');
      assert.ok(html.includes('fixed'), 'Should contain fixed positioning');
      assert.ok(html.includes('z-[9999]') || html.includes('z-index: 9999'), 'Should contain z-[9999]');
    });
  });

  describe('Date constraints (min, max, day-use)', () => {
    it('isDateWithinConstraints enforces min and max bounds', () => {
      assert.strictEqual(isDateWithinConstraints('2026-11-10', '2026-11-11'), false);
      assert.strictEqual(isDateWithinConstraints('2026-11-11', '2026-11-11'), true);
      assert.strictEqual(isDateWithinConstraints('2026-11-12', '2026-11-11'), true);
      assert.strictEqual(isDateWithinConstraints('2026-11-20', '2026-11-11', '2026-11-15'), false);
    });

    it('disables calendar days earlier than min with proper styling', () => {
      const html = renderToStaticMarkup(
        React.createElement(CustomDatePicker, {
          value: '2026-11-15',
          min: '2026-11-15',
          onChange: () => {},
          defaultOpen: true,
        })
      );

      // Check day 14 (disabled)
      const day14Regex = /<button[^>]*data-date="2026-11-14"[^>]*>/;
      const day14Match = html.match(day14Regex);
      assert.ok(day14Match, 'Day 14 button should exist');
      assert.ok(day14Match[0].includes('disabled=""') || day14Match[0].includes('disabled'), 'Day 14 should be disabled');
      assert.ok(
        day14Match[0].includes('text-slate-300 cursor-not-allowed hover:bg-transparent'),
        'Day 14 should have disabled styling'
      );

      // Check day 15 (min date, enabled)
      const day15Regex = /<button[^>]*data-date="2026-11-15"[^>]*>/;
      const day15Match = html.match(day15Regex);
      assert.ok(day15Match, 'Day 15 button should exist');
      assert.ok(!day15Match[0].includes('cursor-not-allowed'), 'Day 15 should not be disabled');
    });

    it('Day-use scenario: min={checkInDate} allows selecting the same day or later', () => {
      const checkInDate = '2026-11-11';
      const html = renderToStaticMarkup(
        React.createElement(CustomDatePicker, {
          value: checkInDate,
          min: checkInDate,
          onChange: () => {},
          defaultOpen: true,
        })
      );

      // Day 11 (same day / day-use checkout) is valid and enabled
      const day11Regex = /<button[^>]*data-date="2026-11-11"[^>]*>/;
      const day11Match = html.match(day11Regex);
      assert.ok(day11Match, 'Day 11 button should exist');
      assert.ok(!day11Match[0].includes('cursor-not-allowed'), 'Day 11 (same day) should be selectable');

      // Day 12 (next day) is valid and enabled
      const day12Regex = /<button[^>]*data-date="2026-11-12"[^>]*>/;
      const day12Match = html.match(day12Regex);
      assert.ok(day12Match, 'Day 12 button should exist');
      assert.ok(!day12Match[0].includes('cursor-not-allowed'), 'Day 12 should be selectable');

      // Day 10 (yesterday) is disabled
      const day10Regex = /<button[^>]*data-date="2026-11-10"[^>]*>/;
      const day10Match = html.match(day10Regex);
      assert.ok(day10Match, 'Day 10 button should exist');
      assert.ok(day10Match[0].includes('cursor-not-allowed'), 'Day 10 should be disabled');
    });

    it('disables the Today (วันนี้) quick-action button when today is earlier than min', () => {
      const html = renderToStaticMarkup(
        React.createElement(CustomDatePicker, {
          value: '2099-01-01',
          min: '2099-01-01',
          onChange: () => {},
          defaultOpen: true,
        })
      );

      // The Today button should have disabled attribute and cursor-not-allowed
      assert.ok(
        html.includes('disabled=""') && html.includes('disabled:cursor-not-allowed'),
        'Today button should be disabled when today < min'
      );
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  PhoneInput,
  NationalIdOrPassportInput,
  isValidPhone,
  isValidThaiId,
  isValidPassport,
} from '../components/common/MaskedInputs';

// File resolver that works regardless of whether cwd is repository root or apps/web
const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

describe('Task 3: Instant On-Blur Inline Validation in Masked Inputs & Booking Modals', () => {
  describe('PhoneInput On-Blur & Length-Aware Inline Validation', () => {
    it('1. Empty field initial render has no error and no red border', () => {
      const html = renderToStaticMarkup(
        React.createElement(PhoneInput, {
          value: '',
          onChange: () => {},
          required: true,
          label: 'เบอร์โทรศัพท์',
        })
      );

      assert.doesNotMatch(html, /เบอร์โทรศัพท์ต้องครบ 10 หลัก/);
      assert.doesNotMatch(html, /border-rose-400/);
      assert.doesNotMatch(html, /dark:border-rose-500/);
    });

    it('2. Blur with partial phone (08123) shows inline error and red border', () => {
      const html = renderToStaticMarkup(
        React.createElement(PhoneInput, {
          value: '08123',
          onChange: () => {},
          touched: true,
          required: true,
          label: 'เบอร์โทรศัพท์',
        })
      );

      assert.match(html, /เบอร์โทรศัพท์ต้องครบ 10 หลัก \(0xx-xxx-xxxx\)/);
      assert.match(html, /border-rose-400/);
      assert.match(html, /dark:border-rose-500/);
      assert.match(html, /text-rose-600/);
    });

    it('3. Typing valid 10 digits (0812345678) clears error immediately', () => {
      const html = renderToStaticMarkup(
        React.createElement(PhoneInput, {
          value: '0812345678',
          onChange: () => {},
          touched: true,
          required: true,
          label: 'เบอร์โทรศัพท์',
        })
      );

      assert.doesNotMatch(html, /เบอร์โทรศัพท์ต้องครบ 10 หลัก/);
      assert.doesNotMatch(html, /border-rose-400/);
      assert.strictEqual(isValidPhone('0812345678'), true);
    });
  });

  describe('NationalIdOrPassportInput On-Blur Inline Validation', () => {
    it('4. Blur with partial Thai ID shows inline error and red border', () => {
      const html = renderToStaticMarkup(
        React.createElement(NationalIdOrPassportInput, {
          type: 'thai_id',
          value: '12345',
          onChange: () => {},
          touched: true,
          required: true,
        })
      );

      assert.match(html, /เลขบัตรประชาชนต้องครบ 13 หลัก \(x-xxxx-xxxxx-xx-x\)/);
      assert.match(html, /border-rose-400/);
      assert.match(html, /dark:border-rose-500/);
      assert.match(html, /text-rose-600/);
    });

    it('5. Valid Thai ID clears error immediately', () => {
      const html = renderToStaticMarkup(
        React.createElement(NationalIdOrPassportInput, {
          type: 'thai_id',
          value: '1234567890123',
          onChange: () => {},
          touched: true,
          required: true,
        })
      );

      assert.doesNotMatch(html, /เลขบัตรประชาชนต้องครบ 13 หลัก/);
      assert.doesNotMatch(html, /border-rose-400/);
      assert.strictEqual(isValidThaiId('1234567890123'), true);
    });

    it('Passport mode: Blur with partial Passport shows inline error, valid clears error', () => {
      const partialHtml = renderToStaticMarkup(
        React.createElement(NationalIdOrPassportInput, {
          type: 'passport',
          value: 'AC123',
          onChange: () => {},
          touched: true,
          required: true,
        })
      );

      assert.match(partialHtml, /หมายเลขหนังสือเดินทางต้องมี 7–9 หลัก/);
      assert.match(partialHtml, /border-rose-400/);
      assert.match(partialHtml, /dark:border-rose-500/);

      const validHtml = renderToStaticMarkup(
        React.createElement(NationalIdOrPassportInput, {
          type: 'passport',
          value: 'AC1234567',
          onChange: () => {},
          touched: true,
          required: true,
        })
      );

      assert.doesNotMatch(validHtml, /หมายเลขหนังสือเดินทางต้องมี 7–9 หลัก/);
      assert.doesNotMatch(validHtml, /border-rose-400/);
      assert.strictEqual(isValidPassport('AC1234567'), true);
    });
  });

  describe('WalkInModal Check-Out Date Instant Inline Validation', () => {
    const walkInPath = resolveFilePath('apps/web/src/components/front-desk/WalkInModal.tsx');
    const walkInCode = fs.readFileSync(walkInPath, 'utf-8');

    it('verifies inline date error when check-out date <= check-in date', () => {
      assert.match(
        walkInCode,
        /checkOutDate\s*<=\s*checkInDate/,
        'WalkInModal must detect checkOutDate <= checkInDate for instant inline error'
      );
      assert.match(
        walkInCode,
        /วันเช็คเอาต์ต้องหลังจากวันเช็คอินอย่างน้อย 1 คืน/,
        'WalkInModal must render inline error with correct Thai spelling (เช็คเอาต์ with ต.เต่า)'
      );
      assert.match(
        walkInCode,
        /AlertCircle/,
        'WalkInModal must render AlertCircle icon for date error'
      );
      assert.match(
        walkInCode,
        /border-rose-400/,
        'WalkInModal must highlight date picker with red border when invalid'
      );
    });

    it('verifies zero raw Unicode emojis and strict Thai orthography in WalkInModal', () => {
      assert.doesNotMatch(walkInCode, /เช็คเอาท์/, 'WalkInModal must not contain non-standard "เช็คเอาท์"');
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
      assert.doesNotMatch(walkInCode, emojiRegex, 'WalkInModal must contain zero raw emojis');
    });
  });

  describe('NewBookingModal Check-Out Date Instant Inline Validation', () => {
    const newBookingPath = resolveFilePath('apps/web/src/components/front-desk/NewBookingModal.tsx');
    const newBookingCode = fs.readFileSync(newBookingPath, 'utf-8');

    it('verifies inline date error when check-out date <= check-in date', () => {
      assert.match(
        newBookingCode,
        /checkOutDate\s*<=\s*checkInDate/,
        'NewBookingModal must detect checkOutDate <= checkInDate for instant inline error'
      );
      assert.match(
        newBookingCode,
        /วันเช็คเอาต์ต้องหลังจากวันเช็คอินอย่างน้อย 1 คืน/,
        'NewBookingModal must render inline error with correct Thai spelling (เช็คเอาต์ with ต.เต่า)'
      );
      assert.match(
        newBookingCode,
        /AlertCircle/,
        'NewBookingModal must render AlertCircle icon for date error'
      );
      assert.match(
        newBookingCode,
        /border-rose-400/,
        'NewBookingModal must highlight date picker with red border when invalid'
      );
    });

    it('verifies zero raw Unicode emojis and strict Thai orthography in NewBookingModal', () => {
      assert.doesNotMatch(newBookingCode, /เช็คเอาท์/, 'NewBookingModal must not contain non-standard "เช็คเอาท์"');
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
      assert.doesNotMatch(newBookingCode, emojiRegex, 'NewBookingModal must contain zero raw emojis');
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  cleanDigits,
  formatPhoneNumber,
  isValidPhone,
  formatThaiId,
  isValidThaiId,
  formatPassport,
  isValidPassport,
  PhoneInput,
  NationalIdOrPassportInput,
} from '../components/common/MaskedInputs';

describe('Task 3: Masked Inputs Component & Strict Validation Formats', () => {
  describe('formatPhoneNumber', () => {
    it('formats a 10-digit number to xxx-xxx-xxxx', () => {
      assert.strictEqual(formatPhoneNumber('0812345678'), '081-234-5678');
    });

    it('strips non-digit characters correctly', () => {
      assert.strictEqual(formatPhoneNumber('081a234b5678'), '081-234-5678');
      assert.strictEqual(formatPhoneNumber('081-234-5678'), '081-234-5678');
      assert.strictEqual(formatPhoneNumber('(081) 234-5678'), '081-234-5678');
    });

    it('caps at 10 digits and ignores extra digits', () => {
      assert.strictEqual(formatPhoneNumber('0812345678999'), '081-234-5678');
      assert.strictEqual(formatPhoneNumber('0812345678000000'), '081-234-5678');
    });

    it('handles partial inputs incrementally as user types', () => {
      assert.strictEqual(formatPhoneNumber(''), '');
      assert.strictEqual(formatPhoneNumber('0'), '0');
      assert.strictEqual(formatPhoneNumber('08'), '08');
      assert.strictEqual(formatPhoneNumber('081'), '081');
      assert.strictEqual(formatPhoneNumber('0812'), '081-2');
      assert.strictEqual(formatPhoneNumber('081234'), '081-234');
      assert.strictEqual(formatPhoneNumber('0812345'), '081-234-5');
      assert.strictEqual(formatPhoneNumber('08123456'), '081-234-56');
      assert.strictEqual(formatPhoneNumber('081234567'), '081-234-567');
      assert.strictEqual(formatPhoneNumber('0812345678'), '081-234-5678');
    });
  });

  describe('formatThaiId', () => {
    it('formats a 13-digit Thai ID to x-xxxx-xxxxx-xx-x', () => {
      assert.strictEqual(formatThaiId('1234567890123'), '1-2345-67890-12-3');
    });

    it('strips non-digit characters correctly', () => {
      assert.strictEqual(formatThaiId('1-2345-67890-12-3'), '1-2345-67890-12-3');
      assert.strictEqual(formatThaiId('1a2345b67890c123'), '1-2345-67890-12-3');
      assert.strictEqual(formatThaiId('1 2345 67890 12 3'), '1-2345-67890-12-3');
    });

    it('caps at 13 digits and ignores extra digits', () => {
      assert.strictEqual(formatThaiId('1234567890123456'), '1-2345-67890-12-3');
      assert.strictEqual(formatThaiId('123456789012399999'), '1-2345-67890-12-3');
    });

    it('handles partial Thai ID inputs incrementally as user types', () => {
      assert.strictEqual(formatThaiId(''), '');
      assert.strictEqual(formatThaiId('1'), '1');
      assert.strictEqual(formatThaiId('12'), '1-2');
      assert.strictEqual(formatThaiId('12345'), '1-2345');
      assert.strictEqual(formatThaiId('123456'), '1-2345-6');
      assert.strictEqual(formatThaiId('1234567890'), '1-2345-67890');
      assert.strictEqual(formatThaiId('12345678901'), '1-2345-67890-1');
      assert.strictEqual(formatThaiId('123456789012'), '1-2345-67890-12');
      assert.strictEqual(formatThaiId('1234567890123'), '1-2345-67890-12-3');
    });
  });

  describe('formatPassport', () => {
    it('formats a passport number: 2 uppercase letters + up to 7 digits', () => {
      assert.strictEqual(formatPassport('ac1234567'), 'AC1234567');
      assert.strictEqual(formatPassport('AC1234567'), 'AC1234567');
    });

    it('enforces 2 uppercase letters and ignores digits typed before the first 2 letters', () => {
      assert.strictEqual(formatPassport('12ac345'), 'AC345');
      assert.strictEqual(formatPassport('a1b2345'), 'AB2345');
    });

    it('caps at 7 digits (9 characters max total)', () => {
      assert.strictEqual(formatPassport('ac123456789'), 'AC1234567');
      assert.strictEqual(formatPassport('AC123456799999'), 'AC1234567');
    });

    it('handles partial inputs as user types', () => {
      assert.strictEqual(formatPassport(''), '');
      assert.strictEqual(formatPassport('a'), 'A');
      assert.strictEqual(formatPassport('ab'), 'AB');
      assert.strictEqual(formatPassport('ab1'), 'AB1');
      assert.strictEqual(formatPassport('ab12'), 'AB12');
      assert.strictEqual(formatPassport('ab12345'), 'AB12345');
      assert.strictEqual(formatPassport('ab1234567'), 'AB1234567');
    });
  });

  describe('cleanDigits', () => {
    it('strips all non-digit characters', () => {
      assert.strictEqual(cleanDigits('081-234-5678'), '0812345678');
      assert.strictEqual(cleanDigits('1-2345-67890-12-3'), '1234567890123');
      assert.strictEqual(cleanDigits('abc 123 !@# 456'), '123456');
      assert.strictEqual(cleanDigits(''), '');
    });
  });

  describe('Validation Helpers', () => {
    describe('isValidPhone', () => {
      it('returns true for 10-digit phone numbers', () => {
        assert.strictEqual(isValidPhone('0812345678'), true);
        assert.strictEqual(isValidPhone('081-234-5678'), true);
        assert.strictEqual(isValidPhone('089-999-8888'), true);
      });

      it('returns false for non-10 digit numbers', () => {
        assert.strictEqual(isValidPhone('081234567'), false); // 9 digits
        assert.strictEqual(isValidPhone('08123456789'), false); // 11 digits
        assert.strictEqual(isValidPhone(''), false);
        assert.strictEqual(isValidPhone('abcdefghij'), false);
      });
    });

    describe('isValidThaiId', () => {
      it('returns true for 13-digit Thai IDs', () => {
        assert.strictEqual(isValidThaiId('1234567890123'), true);
        assert.strictEqual(isValidThaiId('1-2345-67890-12-3'), true);
      });

      it('returns false for invalid lengths', () => {
        assert.strictEqual(isValidThaiId('123456789012'), false); // 12 digits
        assert.strictEqual(isValidThaiId('12345678901234'), false); // 14 digits
        assert.strictEqual(isValidThaiId(''), false);
        assert.strictEqual(isValidThaiId('1-2345-6789'), false);
      });
    });

    describe('isValidPassport', () => {
      it('returns true for 2 letters + 7 digits', () => {
        assert.strictEqual(isValidPassport('AC1234567'), true);
        assert.strictEqual(isValidPassport('ac1234567'), true);
        assert.strictEqual(isValidPassport('AC 1234567'), true);
        assert.strictEqual(isValidPassport('TH9876543'), true);
      });

      it('returns false for invalid patterns', () => {
        assert.strictEqual(isValidPassport('AC123456'), false); // 6 digits
        assert.strictEqual(isValidPassport('AC12345678'), false); // 8 digits
        assert.strictEqual(isValidPassport('A1234567'), false); // 1 letter
        assert.strictEqual(isValidPassport('ABC123456'), false); // 3 letters
        assert.strictEqual(isValidPassport('123456789'), false); // 0 letters
        assert.strictEqual(isValidPassport(''), false);
      });
    });
  });

  describe('React Components Rendering', () => {
    it('PhoneInput renders with Phone icon, font-mono tabular-nums, min-h-[44px], and auto-masking', () => {
      const html = renderToStaticMarkup(
        React.createElement(PhoneInput, {
          value: '0812345678',
          onChange: () => {},
          required: true,
          label: 'เบอร์โทรศัพท์',
        })
      );

      assert.match(html, /081-234-5678/);
      assert.match(html, /min-h-\[44px\]/);
      assert.match(html, /font-mono\s+tabular-nums/);
      assert.match(html, /เบอร์โทรศัพท์/);
      assert.match(html, /text-rose-500/); // Required asterisk
    });

    it('NationalIdOrPassportInput renders segmented pills, Thai ID mode auto-mask, and required indicator', () => {
      const htmlThai = renderToStaticMarkup(
        React.createElement(NationalIdOrPassportInput, {
          value: '1234567890123',
          onChange: () => {},
          type: 'thai_id',
          required: true,
        })
      );

      assert.match(htmlThai, /1-2345-67890-12-3/);
      assert.match(htmlThai, /บัตรประชาชน \(Thai ID\)/);
      assert.match(htmlThai, /พาสปอร์ต \(Passport\)/);
      assert.match(htmlThai, /min-h-\[44px\]/);
      assert.match(htmlThai, /text-rose-500 font-bold ml-1 text-xs select-none/);
    });

    it('NationalIdOrPassportInput renders Passport mode with AC1234567 format', () => {
      const htmlPassport = renderToStaticMarkup(
        React.createElement(NationalIdOrPassportInput, {
          value: 'ac1234567',
          onChange: () => {},
          type: 'passport',
          required: true,
        })
      );

      assert.match(htmlPassport, /AC1234567/);
      assert.match(htmlPassport, /พาสปอร์ต/);
      assert.match(htmlPassport, /min-h-\[44px\]/);
    });
  });
});

// apps/web/src/__tests__/reservations-mapping.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { resolveGuestName } from '../hooks/useReservations';

describe('Reservation Guest Name & Date Presentation', () => {
  it('resolves guest name from nested guest object', () => {
    const rawBackendData = {
      id: 'res-001',
      guestId: 'gst-001',
      guest: {
        id: 'gst-001',
        fullName: 'Sarah Jenkins',
      },
    };
    const name = resolveGuestName(rawBackendData);
    assert.strictEqual(name, 'Sarah Jenkins');
  });

  it('falls back to top-level guestName or default placeholder', () => {
    assert.strictEqual(resolveGuestName({ guestName: 'Somchai Jaidee' }), 'Somchai Jaidee');
    assert.strictEqual(resolveGuestName({}), '—');
  });

  it('handles null, undefined, or empty objects safely', () => {
    assert.strictEqual(resolveGuestName(null as any), '—');
    assert.strictEqual(resolveGuestName(undefined as any), '—');
    assert.strictEqual(resolveGuestName({ guest: null } as any), '—');
    assert.strictEqual(resolveGuestName({ guest: { fullName: '' } } as any), '—');
    assert.strictEqual(resolveGuestName({ guest: { fullName: '   ' } } as any), '—');
    assert.strictEqual(resolveGuestName({ guestName: '   ' } as any), '—');
  });

  it('verifies ReservationsPage uses useI18n, resolveGuestName, and formatDateRange', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/pages/front-desk/ReservationsPage.tsx'),
      'utf-8'
    );
    assert.match(code, /useI18n/);
    assert.match(code, /resolveGuestName/);
    assert.match(code, /formatDateRange/);
    assert.match(code, /res\.bookingNumber/);
    // Ensure generic hardcoded Thai guest label is removed
    assert.doesNotMatch(code, /'แขกผู้เข้าพัก'/);
  });

  it('verifies NewReservationModal uses useI18n and localized keys', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/NewReservationModal.tsx'),
      'utf-8'
    );
    assert.match(code, /useI18n/);
    assert.match(code, /res\.newReservation/);
    assert.match(code, /res\.errorGuestName/);
    assert.match(code, /formatCurrency/);
  });

  it('verifies RapidWalkInModal uses useI18n and localized keys', () => {
    const code = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RapidWalkInModal.tsx'),
      'utf-8'
    );
    assert.match(code, /useI18n/);
    assert.match(code, /res\.rapidWalkIn/);
    assert.match(code, /res\.errorNoRoomWalkIn/);
    assert.match(code, /formatCurrency/);
  });
});

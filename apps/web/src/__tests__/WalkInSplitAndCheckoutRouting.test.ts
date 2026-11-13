import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4: Walk-In Check-In vs New Booking Split & Checkout Operational Routing', () => {
  const roomDetailsModalPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/RoomDetailsModal.tsx'
  );
  const roomMatrixPagePath = path.resolve(
    process.cwd(),
    'apps/web/src/pages/front-desk/RoomMatrixPage.tsx'
  );
  const dailyOperationsPagePath = path.resolve(
    process.cwd(),
    'apps/web/src/pages/front-desk/DailyOperationsPage.tsx'
  );

  it('Requirement 1: RoomDetailsModal differentiates Walk-In immediate check-in vs New Booking', () => {
    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
    const code = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // Props: supports onWalkInCheckIn and bookingMode
    assert.match(
      code,
      /bookingMode\?:\s*['"]walkin['"]\s*\|\s*['"]booking['"]/,
      'RoomDetailsModalProps should declare optional bookingMode prop'
    );
    assert.match(
      code,
      /onWalkInCheckIn\?:\s*\(data:\s*\{[\s\S]*?roomId:\s*string[\s\S]*?\}\)\s*=>\s*Promise/,
      'RoomDetailsModalProps should support onWalkInCheckIn callback'
    );

    // Submission logic: calls onWalkInCheckIn when walkin mode and checkInDate === todayStr
    assert.match(
      code,
      /bookingMode\s*===\s*['"]walkin['"]\s*&&\s*checkInDate\s*===\s*todayStr/,
      'Submission logic must check if flow is walk-in for today'
    );
    assert.match(
      code,
      /onWalkInCheckIn\s*\(|\bonWalkInCheckIn\b/,
      'Submission logic must invoke onWalkInCheckIn for immediate walk-in'
    );

    // Advance booking fallback: calls onSubmitBooking when bookingMode === 'booking' or checkInDate > todayStr
    assert.match(
      code,
      /onSubmitBooking/,
      'Submission logic must invoke onSubmitBooking for advance bookings'
    );

    // Detail mode footer buttons differentiate Walk-In and New Booking
    assert.match(
      code,
      /setBookingMode\(['"]walkin['"]\)/,
      'Quick Walk-In button sets bookingMode to walkin'
    );
    assert.match(
      code,
      /setBookingMode\(['"]booking['"]\)/,
      'New Booking button sets bookingMode to booking'
    );

    // Occupied room checkout triggers checkout action
    assert.match(
      code,
      /onAction.*?\(['"]checkout['"],\s*room\)/,
      'Occupied room footer checkout button must invoke onAction with checkout'
    );

    // Zero raw emojis: verify no unicode emoji pictographs
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const lines = code.split('\n');
    const emojiLines = lines.filter((line) => emojiRegex.test(line));
    assert.strictEqual(
      emojiLines.length,
      0,
      `RoomDetailsModal.tsx must contain zero raw emojis, found: ${emojiLines.join(', ')}`
    );
  });

  it('Requirement 2: RoomMatrixPage routes checkout to Daily Operations departures and wires onWalkInCheckIn', () => {
    assert.ok(fs.existsSync(roomMatrixPagePath), 'RoomMatrixPage.tsx should exist');
    const code = fs.readFileSync(roomMatrixPagePath, 'utf-8');

    // Routing: action === 'checkout' navigates to /front-desk/daily-operations with roomId and action: 'checkout'
    assert.match(
      code,
      /navigate\(['"]\/front-desk\/daily-operations['"],\s*\{\s*state:\s*\{\s*roomId:\s*room\.id,\s*action\s*\}\s*\}\)/,
      'handleRoomAction must navigate to /front-desk/daily-operations when action === checkout'
    );

    // Destructures walkInCheckIn from useReservations
    assert.match(
      code,
      /walkInCheckIn/,
      'RoomMatrixPage must destructure walkInCheckIn from useReservations'
    );

    // Passes onWalkInCheckIn to RoomDetailsModal
    assert.match(
      code,
      /onWalkInCheckIn=\{async\s*\(data\)\s*=>\s*\{[\s\S]*?walkInCheckIn\(data\)[\s\S]*?refreshRooms\(\)[\s\S]*?refreshReservations\(\)/,
      'RoomMatrixPage must wire onWalkInCheckIn to walkInCheckIn and refresh rooms and reservations'
    );
  });

  it('Requirement 3: DailyOperationsPage splits departures into Due Today and Early Checkout / Extended Stays', () => {
    assert.ok(fs.existsSync(dailyOperationsPagePath), 'DailyOperationsPage.tsx should exist');
    const code = fs.readFileSync(dailyOperationsPagePath, 'utf-8');

    // Sub-tab 1: Due today reservations (status === checked_in and checkOutDate <= todayStr)
    assert.match(
      code,
      /r\.status\s*===\s*['"]checked_in['"]\s*&&\s*\(r\.checkOutDate\s*<=\s*todayStr\s*\|\|\s*r\.checkOutDate\s*===\s*todayStr\)/,
      'DailyOperationsPage must filter due today departures where checked_in and checkOutDate <= todayStr'
    );

    // Sub-tab 2: Early Checkout & Extended Stays (status === extended or checked_in with checkOutDate > todayStr)
    assert.match(
      code,
      /r\.status\s*===\s*['"]extended['"]\s*\|\|\s*\(r\.status\s*===\s*['"]checked_in['"]\s*&&\s*r\.checkOutDate\s*>\s*todayStr\)/,
      'DailyOperationsPage must filter early checkout and extended stays'
    );

    // Sub-tab headers with count badges
    assert.match(code, /รอเช็คเอาต์วันนี้/, 'Must display "รอเช็คเอาต์วันนี้" sub-tab');
    assert.match(code, /เช็คเอาต์ก่อนกำหนด \/ ขยายเวลา/, 'Must display "เช็คเอาต์ก่อนกำหนด / ขยายเวลา" sub-tab');
    assert.match(code, /dueTodayDepartures\.length/, 'Must display due today count badge');
    assert.match(code, /earlyOrExtendedDepartures\.length/, 'Must display early / extended count badge');

    // Action buttons in departures table: "ขยายเวลาเข้าพัก" and primary "เช็คเอาต์ & คิดเงิน"
    assert.match(code, /ขยายเวลาเข้าพัก/, 'Must feature "ขยายเวลาเข้าพัก" action');
    assert.match(code, /เช็คเอาต์ & คิดเงิน/, 'Must feature "เช็คเอาต์ & คิดเงิน" primary action');

    // Auto-open CheckOutModal on navigation from router state
    assert.match(
      code,
      /navState\??\.action\s*===\s*['"]checkout['"]/,
      'DailyOperationsPage must check location state for action === checkout'
    );
    assert.match(
      code,
      /setCheckOutTarget\(matchingRes\)/,
      'DailyOperationsPage must set checkOutTarget to auto-open CheckOutModal'
    );
    assert.match(
      code,
      /navigate\(location\.pathname,\s*\{\s*replace:\s*true,\s*state:\s*\{\}\s*\}\)/,
      'DailyOperationsPage must clear router location state once processed'
    );
  });
});

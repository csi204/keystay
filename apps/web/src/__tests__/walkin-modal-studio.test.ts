import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 3: Overhaul WalkInModal to Split 2-Pane Studio Layout with Live Cost Calculator', () => {
  const modalPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/WalkInModal.tsx');
  const rapidModalPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RapidWalkInModal.tsx');

  it('verifies WalkInModal.tsx exists and renders split 2-pane studio container', () => {
    assert.ok(fs.existsSync(modalPath), 'WalkInModal.tsx should exist');
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Studio Container styling
    assert.match(code, /max-w-4xl|max-w-3xl/);
    assert.match(code, /rounded-2xl/);
    assert.match(code, /border-slate-200\/80/);
    assert.match(code, /shadow-2xl/);

    // Split 2-Pane layout
    assert.match(code, /grid-cols-1\s+md:grid-cols-12/);
    assert.match(code, /md:col-span-5/); // Left Pane
    assert.match(code, /md:col-span-7/); // Right Pane
  });

  it('verifies Header has title, UserCheck icon, and min-h-[44px] close button', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    assert.match(code, /เปิดห้องด่วน \(Walk-In Check-In\)/);
    assert.match(code, /UserCheck.*w-5 h-5 text-slate-900/);
    assert.match(code, /strokeWidth=\{1\.75\}/);
    assert.match(code, /min-h-\[44px\]/);
  });

  it('verifies Left Pane showcases room specs with BedDouble, Users, Bath, and ROOM_STATUS_CONFIG pill', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Room status and localization
    assert.match(code, /ROOM_STATUS_CONFIG/);
    assert.match(code, /localizeRoomType/);
    assert.match(code, /localizeAmenity/);

    // Spec microchips
    assert.match(code, /BedDouble.*w-3\.5 h-3\.5/);
    assert.match(code, /Users.*w-3\.5 h-3\.5/);
    assert.match(code, /Bath.*w-3\.5 h-3\.5/);
  });

  it('verifies Live Financial Calculator dynamically calculates stay duration and estimated total due', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Dynamic nights calculation
    assert.match(code, /calculateNights/);
    assert.match(code, /nights \* nightlyRate|nights \* rate/);

    // Financial breakdown items
    assert.match(code, /formatCurrency\(nightlyRate\)\s*\+\s*['"]\/คืน['"]|formatCurrency\(rate\)\s*\+\s*['"]\/คืน['"]/);
    assert.match(code, /roomSubtotal/);
    assert.match(code, /parsedDeposit|depositAmount/);
    assert.match(code, /font-mono font-bold text-emerald-600 text-base sm:text-lg tabular-nums/);
  });

  it('verifies Right Pane collects guest information with proper icons and check-out date constraints', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Guest input fields & components
    assert.match(code, /User.*w-4 h-4 text-slate-400/);
    assert.match(code, /PhoneInput/);
    assert.match(code, /NationalIdOrPassportInput/);
    assert.match(code, /Banknote.*w-4 h-4 text-slate-400/);

    // Min check-out date set to checkInDate / tomorrow and dynamic nights counter chip
    assert.match(code, /min=\{checkInDate\}|min=\{tomorrowStr\}/);
    assert.match(code, /nights.*คืน|nights.*night/);
  });

  it('verifies Payment Method Selector provides interactive visual grid for Cash, QR, Card, and Transfer', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Payment options with distinct icons
    assert.match(code, /paymentOptions/);
    assert.match(code, /Banknote/);
    assert.match(code, /QrCode/);
    assert.match(code, /CreditCard/);
    assert.match(code, /Building2/);

    // Interactive button grid
    assert.match(code, /grid-cols-2\s+sm:grid-cols-4/);
  });

  it('verifies action buttons feature LogIn icon, active scale, and loading spinner', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    assert.match(code, /ยืนยันเปิดห้องพัก Walk-In ทันที/);
    assert.match(code, /LogIn.*w-4 h-4/);
    assert.match(code, /active:scale-\[0\.98\]/);
    assert.match(code, /Loader2.*animate-spin/);
  });

  it('maintains full interface parity and backwards compatibility', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    assert.match(code, /export interface WalkInModalProps/);
    assert.match(code, /export type RapidWalkInModalProps = WalkInModalProps/);
    assert.match(code, /export \{ WalkInModal as RapidWalkInModal \}/);
    assert.match(code, /export default WalkInModal/);

    assert.ok(fs.existsSync(rapidModalPath), 'RapidWalkInModal.tsx should exist for re-export');
    const rapidCode = fs.readFileSync(rapidModalPath, 'utf-8');
    assert.match(rapidCode, /RapidWalkInModal/);
  });

  it('verifies idCardNumber state, input field, and submission in WalkInModal', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // State & validation
    assert.match(code, /const\s+\[idCardNumber,\s*setIdCardNumber\]\s*=\s*useState\(''\)/);
    assert.match(code, /!idCardNumber\.trim\(\)/);
    assert.match(code, /idCardNumber:\s*idCardNumber\.trim\(\)/);
    assert.match(code, /nationalIdOrPassport:\s*idCardNumber\.trim\(\)/);

    // FastBookingFormData interface
    assert.match(code, /export interface FastBookingFormData/);
    assert.match(code, /idCardNumber\?: string/);
    assert.match(code, /nationalIdOrPassport\?: string/);

    // Masked component attributes
    assert.match(code, /NationalIdOrPassportInput/);
    assert.match(code, /value=\{idCardNumber\}/);
    assert.match(code, /onChange=\{setIdCardNumber\}/);
  });

  it('verifies elevated asterisk styling across front-desk modals', () => {
    const walkInCode = fs.readFileSync(modalPath, 'utf-8');
    const roomDetailsCode = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomDetailsModal.tsx'), 'utf-8');
    const checkInCode = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/CheckInModal.tsx'), 'utf-8');
    const extendCode = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/ExtendStayModal.tsx'), 'utf-8');
    const newBookingCode = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/NewBookingModal.tsx'), 'utf-8');

    const elevatedAsteriskPattern = /text-rose-500 font-bold ml-(?:1|0\.5) text-xs select-none/;
    assert.match(walkInCode, elevatedAsteriskPattern);
    assert.match(roomDetailsCode, elevatedAsteriskPattern);
    assert.match(checkInCode, elevatedAsteriskPattern);
    assert.match(extendCode, elevatedAsteriskPattern);
    assert.match(newBookingCode, elevatedAsteriskPattern);
  });
});

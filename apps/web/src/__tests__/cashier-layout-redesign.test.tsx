import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import type { Room, RoomType } from '@keystay/types';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

describe('Task 7: Cashier Page Redesign (2-Column Layout, Remove English Parentheses, Compact Room Note Badges)', () => {
  const cashierFolioPagePath = resolveFilePath('apps/web/src/pages/front-desk/CashierFolioPage.tsx');
  const folioSplitScreenPath = resolveFilePath('apps/web/src/components/front-desk/FolioSplitScreen.tsx');
  const roomCardPath = resolveFilePath('apps/web/src/components/front-desk/RoomCard.tsx');

  it('1. Cashier page title strictly uses "แคชเชียร์และบิล" without English parentheses "(Cashier Hub)"', () => {
    assert.ok(fs.existsSync(cashierFolioPagePath), 'CashierFolioPage.tsx must exist');
    const code = fs.readFileSync(cashierFolioPagePath, 'utf-8');

    // Must NOT contain "(Cashier Hub)" in title
    assert.doesNotMatch(
      code,
      /แคชเชียร์และบิล\s*\(Cashier Hub\)/,
      'CashierFolioPage header title must remove "(Cashier Hub)"'
    );

    // Must strictly be "แคชเชียร์และบิล"
    assert.match(
      code,
      /locale\s*===\s*['"]th['"]\s*\?\s*['"]แคชเชียร์และบิล['"]/,
      'CashierFolioPage header title must be strictly "แคชเชียร์และบิล" in Thai'
    );
  });

  it('2. Cashier layout uses expansive 2-column layout (35% bill selector, 65% wide line items table)', () => {
    const cashierCode = fs.readFileSync(cashierFolioPagePath, 'utf-8');
    const folioCode = fs.readFileSync(folioSplitScreenPath, 'utf-8');

    // CashierFolioPage layout: 35% bill selector, 65% folio details
    assert.match(
      cashierCode,
      /(?:w-\[35%\]|col-span-4|lg:grid-cols-\[35%_65%\]|lg:w-\[35%\]|lg:grid-cols-\[35%_1fr\])/,
      'CashierFolioPage must allocate 35% width for bill selector column'
    );
    assert.match(
      cashierCode,
      /(?:w-\[65%\]|col-span-8|lg:grid-cols-\[35%_65%\]|lg:w-\[65%\]|lg:grid-cols-\[35%_1fr\]|flex-1|min-w-0)/,
      'CashierFolioPage must allocate 65% width for folio details view'
    );

    // FolioSplitScreen line items table has full width
    assert.match(
      folioCode,
      /<table\s+className=["'][^"']*w-full/,
      'FolioSplitScreen line items table must span full width (w-full)'
    );
  });

  it('3. Settlement form is removed from Cashier page; prints invoice, displays Net Due in bottom bar, and adds extra charges only', () => {
    const folioCode = fs.readFileSync(folioSplitScreenPath, 'utf-8');

    // Actions in top right header: Request Amenities & Add Extra Charge
    assert.match(
      folioCode,
      /onRequestAmenities/,
      'FolioSplitScreen header must include onRequestAmenities action'
    );
    assert.match(
      folioCode,
      /onAddCharge/,
      'FolioSplitScreen header must include onAddCharge action'
    );

    // Bottom summary bar displays Net Due and Print Invoice button
    assert.match(
      folioCode,
      /onViewInvoice/,
      'FolioSplitScreen bottom summary bar must provide onViewInvoice print button'
    );
    assert.match(
      folioCode,
      /font-mono.*tabular-nums/,
      'FolioSplitScreen summary figures must use font-mono tabular-nums'
    );

    // In Cashier view, settlement button is NOT shown in active folio UI
    // CashierFolioPage delegates settlement to Checkout in Daily Operations
    assert.match(
      folioCode,
      /showSettlement\s*=\s*false|!showSettlement|hideSettlement/,
      'FolioSplitScreen must support hiding or disabling settlement form for Cashier view'
    );
  });

  it('4. RoomCard notes render as compact chip with max-w-full truncate and FileText icon', async () => {
    assert.ok(fs.existsSync(roomCardPath), 'RoomCard.tsx must exist');
    const roomCardCode = fs.readFileSync(roomCardPath, 'utf-8');

    // Code contains the compact chip structure
    assert.match(
      roomCardCode,
      /inline-flex items-center gap-1 text-\[11px\] bg-amber-50/,
      'RoomCard must include compact amber chip for room notes'
    );
    assert.match(
      roomCardCode,
      /max-w-full truncate/,
      'RoomCard note chip must have max-w-full truncate'
    );
    assert.match(
      roomCardCode,
      /<FileText\s+className=["'][^"']*w-3\s+h-3/,
      'RoomCard note chip must render FileText icon'
    );

    // Dynamic component rendering check with renderToStaticMarkup
    const { RoomCard } = await import('../components/front-desk/RoomCard');

    const mockRoom: Room = {
      id: 'rm-205',
      roomNumber: '205',
      roomTypeId: 'rt-deluxe',
      status: 'occupied',
      floor: '2',
      notes: 'VIP Guest - extra pillows',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockRoomType: RoomType = {
      id: 'rt-deluxe',
      name: 'Deluxe Room',
      basePrice: '2500',
      capacity: 2,
      amenities: ['wifi', 'bath', 'king bed'],
    };

    const html = renderToStaticMarkup(
      <RoomCard
        room={mockRoom}
        roomType={mockRoomType}
        guestName="Khun Somchai"
        checkoutDate="2026-11-15"
        onClick={() => {}}
      />
    );

    // Rendered markup must include compact note chip with truncate
    assert.match(
      html,
      /max-w-full\s+truncate/,
      'Rendered RoomCard for room with notes must include max-w-full truncate chip'
    );
    assert.match(
      html,
      /bg-amber-50/,
      'Rendered RoomCard note chip must have amber background'
    );
    assert.match(
      html,
      /VIP Guest - extra pillows/,
      'Rendered RoomCard note chip must display room notes'
    );
  });
});

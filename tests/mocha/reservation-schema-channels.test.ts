import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

describe('Reservation Schema Migration: Booking Channels, Slips & Amenities', () => {
  let sqliteDb: DatabaseSync;

  beforeEach(() => {
    sqliteDb = new DatabaseSync(':memory:');
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/reservation/schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);
  });

  it('FAIL/VERIFY: reservations table has booking_source and payment_status columns', () => {
    const tableInfo = sqliteDb.prepare("PRAGMA table_info(reservations)").all() as Array<{ name: string }>;
    const columnNames = tableInfo.map((col) => col.name);

    expect(columnNames).to.include('booking_source');
    expect(columnNames).to.include('payment_status');
    expect(columnNames).to.include('payment_slip_url');
    expect(columnNames).to.include('payment_slip_ref');
    expect(columnNames).to.include('payment_verified_at');
    expect(columnNames).to.include('payment_verified_by');
  });

  it('FAIL/VERIFY: reservation_amenity_requests table exists with required fields', () => {
    const tableInfo = sqliteDb.prepare("PRAGMA table_info(reservation_amenity_requests)").all() as Array<{ name: string }>;
    const columnNames = tableInfo.map((col) => col.name);

    expect(columnNames).to.include('id');
    expect(columnNames).to.include('reservation_id');
    expect(columnNames).to.include('amenity_id');
    expect(columnNames).to.include('amenity_name');
    expect(columnNames).to.include('quantity');
    expect(columnNames).to.include('unit_price');
    expect(columnNames).to.include('total_price');
    expect(columnNames).to.include('is_chargeable');
    expect(columnNames).to.include('status');
    expect(columnNames).to.include('billed_to_folio');
  });
});

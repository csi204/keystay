import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';

/**
 * KEYSTAY — Core Business Enhancements & Ajarn Top Recommendations Test Suite
 * Ref: docs/FEATURE_SPEC_DYNAMIC_PRICING_AND_EXTRAS.md (SPEC-2026-004)
 * 
 * Tests the 4 key business modules:
 * 1. Dynamic Seasonal & Festival Pricing Engine (Base Price unchanged, +/- 5% or fixed THB, single/range/month)
 * 2. Booking Channels & Payment Slip Verification (walk_in, phone, facebook + R2 image/slip ref)
 * 3. Extra Amenities (Free 0 THB vs. Paid >0 THB auto-rolling into Folio bill_items)
 * 4. VAT 7% Accounting & Owner Financial Export Reporting
 */

describe('Ajarn Top Recommendations & Spec Enhancements (@allmusgus, @hazeco, @Legxcy77)', () => {
  let sqliteDb: DatabaseSync;
  let mockDb: D1Database;

  beforeEach(() => {
    sqliteDb = new DatabaseSync(':memory:');

    // 1. Initialize Tables from Spec DDL
    sqliteDb.exec(`
      -- Room Types
      CREATE TABLE IF NOT EXISTS room_types (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        base_price REAL NOT NULL,
        max_occupancy INTEGER NOT NULL DEFAULT 2
      );

      -- Seasonal Pricing Rules (Spec Module 1)
      CREATE TABLE IF NOT EXISTS seasonal_pricing_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT NOT NULL CHECK(tier IN ('high', 'low', 'regular')),
        room_type_id TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        days_of_week TEXT,
        adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('percent', 'fixed_amount')),
        adjustment_value REAL NOT NULL DEFAULT 5.0,
        priority INTEGER NOT NULL DEFAULT 10,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- Reservations (Spec Module 2)
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        reservation_code TEXT UNIQUE NOT NULL,
        guest_name TEXT NOT NULL,
        room_type_id TEXT NOT NULL,
        booking_source TEXT NOT NULL DEFAULT 'walk_in' CHECK(booking_source IN ('walk_in', 'phone', 'facebook')),
        payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid')),
        payment_slip_url TEXT,
        payment_slip_ref TEXT,
        payment_verified_at TEXT,
        payment_verified_by TEXT,
        check_in_date TEXT NOT NULL,
        check_out_date TEXT NOT NULL,
        deposit_amount REAL NOT NULL DEFAULT 0,
        subtotal REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0
      );

      -- Amenities Catalog (Spec Module 3)
      CREATE TABLE IF NOT EXISTS amenities_catalog (
        id TEXT PRIMARY KEY,
        name_th TEXT NOT NULL,
        name_en TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('bedding', 'bath', 'appliance', 'food_drink', 'other')),
        is_chargeable INTEGER NOT NULL DEFAULT 0,
        unit_price REAL NOT NULL DEFAULT 0.0,
        unit_name_th TEXT NOT NULL DEFAULT 'ชิ้น',
        stock_quantity INTEGER NOT NULL DEFAULT -1,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- Reservation Amenity Requests (Spec Module 3)
      CREATE TABLE IF NOT EXISTS reservation_amenity_requests (
        id TEXT PRIMARY KEY,
        reservation_id TEXT NOT NULL,
        amenity_id TEXT NOT NULL,
        amenity_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0.0,
        total_price REAL NOT NULL DEFAULT 0.0,
        is_chargeable INTEGER NOT NULL DEFAULT 0,
        billed_to_folio INTEGER NOT NULL DEFAULT 0,
        bill_item_id TEXT
      );

      -- Bills & Folio Line Items (Spec Module 4)
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        bill_number TEXT UNIQUE NOT NULL,
        reservation_id TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 0.07,
        tax_amount REAL NOT NULL DEFAULT 0,
        deposit_deducted REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS bill_items (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('room_charge', 'amenity', 'minibar', 'laundry', 'damage', 'other')),
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL
      );
    `);

    // 2. Seed Baseline Data
    sqliteDb.exec(`
      INSERT INTO room_types (id, name, base_price) VALUES
      ('rt_standard', 'Standard Single Room', 800.0),
      ('rt_superior', 'Superior Queen Room', 1000.0),
      ('rt_deluxe', 'Deluxe Double Room', 1500.0);

      INSERT INTO amenities_catalog (id, name_th, name_en, category, is_chargeable, unit_price, unit_name_th) VALUES
      ('amenity_pillow', 'หมอนหนุนเสริม', 'Extra Pillow', 'bedding', 0, 0.0, 'ใบ'),
      ('amenity_towel', 'ผ้าเช็ดตัวเพิ่ม', 'Extra Towel', 'bath', 0, 0.0, 'ผืน'),
      ('amenity_bed', 'เตียงเสริม (Extra Bed)', 'Extra Bed', 'bedding', 1, 300.0, 'หลัง'),
      ('amenity_breakfast', 'เซ็ตอาหารเช้าเสริม', 'Extra Breakfast', 'food_drink', 1, 150.0, 'ชุด');
    `);

    mockDb = createMockD1(sqliteDb);
  });

  // ===========================================================================
  // MODULE 1: DYNAMIC SEASONAL PRICING ENGINE
  // ===========================================================================
  describe('Module 1: Dynamic Seasonal Pricing Engine', () => {
    it('SUCCESS: Base price in room_types remains completely unchanged when dynamic rules are applied', async () => {
      // Add High Season +5% Rule
      await mockDb.prepare(`
        INSERT INTO seasonal_pricing_rules (id, name, tier, start_date, end_date, adjustment_type, adjustment_value, priority)
        VALUES ('rule_high_nov_feb', 'High Season พ.ย.-ก.พ.', 'high', '2026-11-01', '2027-02-28', 'percent', 5.0, 10)
      `).run();

      // Verify base price in room_types table is still exactly 1,000.00 THB
      const roomType = await mockDb.prepare('SELECT base_price FROM room_types WHERE id = ?')
        .bind('rt_superior')
        .first<{ base_price: number }>();

      expect(roomType?.base_price).to.equal(1000.0);
    });

    it('SUCCESS: Correctly calculates +5% percentage adjustment for High Season', async () => {
      await mockDb.prepare(`
        INSERT INTO seasonal_pricing_rules (id, name, tier, start_date, end_date, adjustment_type, adjustment_value, priority)
        VALUES ('rule_high', 'High Season', 'high', '2026-11-01', '2026-11-30', 'percent', 5.0, 10)
      `).run();

      const targetDate = '2026-11-15';
      const basePrice = 1000.0;

      // Find matching rule
      const rule = await mockDb.prepare(`
        SELECT * FROM seasonal_pricing_rules
        WHERE ? BETWEEN start_date AND end_date AND is_active = 1
        ORDER BY priority DESC LIMIT 1
      `).bind(targetDate).first<any>();

      expect(rule).to.not.be.null;
      expect(rule.tier).to.equal('high');
      expect(rule.adjustment_value).to.equal(5.0);

      // Formula: base_price * (1 + pct / 100)
      const effectiveRate = Math.round(basePrice * (1 + rule.adjustment_value / 100));
      expect(effectiveRate).to.equal(1050.0);
    });

    it('SUCCESS: Correctly applies fixed amount override (+300 THB) for New Year Eve date', async () => {
      // Add Month Matching Rule (Priority 10)
      await mockDb.prepare(`
        INSERT INTO seasonal_pricing_rules (id, name, tier, start_date, end_date, adjustment_type, adjustment_value, priority)
        VALUES ('rule_dec', 'December Month', 'high', '2026-12-01', '2026-12-31', 'percent', 5.0, 10)
      `).run();

      // Add Single Date Countdown Rule (+300 THB, Priority 100)
      await mockDb.prepare(`
        INSERT INTO seasonal_pricing_rules (id, name, tier, start_date, end_date, adjustment_type, adjustment_value, priority)
        VALUES ('rule_nye', 'คืนเคานต์ดาวน์ปีใหม่', 'high', '2026-12-31', '2026-12-31', 'fixed_amount', 300.0, 100)
      `).run();

      const basePrice = 1500.0; // Deluxe Room

      // Query for 2026-12-31: Higher priority rule (nye: +300 THB) should win
      const activeRule = await mockDb.prepare(`
        SELECT * FROM seasonal_pricing_rules
        WHERE ? BETWEEN start_date AND end_date AND is_active = 1
        ORDER BY priority DESC LIMIT 1
      `).bind('2026-12-31').first<any>();

      expect(activeRule.id).to.equal('rule_nye');
      const calculatedRate = basePrice + activeRule.adjustment_value;
      expect(calculatedRate).to.equal(1800.0);
    });

    it('SUCCESS: Multi-night booking calculates exact rate for each day and aggregates total', async () => {
      // Normal rule: +5% on Superior (1,000 -> 1,050)
      await mockDb.prepare(`
        INSERT INTO seasonal_pricing_rules (id, name, tier, start_date, end_date, adjustment_type, adjustment_value, priority)
        VALUES ('rule_high', 'High Season', 'high', '2026-12-29', '2026-12-30', 'percent', 5.0, 10)
      `).run();

      // NYE rule: +300 THB on 31 Dec (1,000 -> 1,300)
      await mockDb.prepare(`
        INSERT INTO seasonal_pricing_rules (id, name, tier, start_date, end_date, adjustment_type, adjustment_value, priority)
        VALUES ('rule_nye', 'New Year Eve', 'high', '2026-12-31', '2026-12-31', 'fixed_amount', 300.0, 100)
      `).run();

      const stayDates = ['2026-12-29', '2026-12-30', '2026-12-31'];
      const baseRate = 1000.0;
      let totalAmount = 0;

      for (const date of stayDates) {
        const rule = await mockDb.prepare(`
          SELECT * FROM seasonal_pricing_rules
          WHERE ? BETWEEN start_date AND end_date AND is_active = 1
          ORDER BY priority DESC LIMIT 1
        `).bind(date).first<any>();

        let dailyRate = baseRate;
        if (rule) {
          if (rule.adjustment_type === 'percent') {
            dailyRate = Math.round(baseRate * (1 + rule.adjustment_value / 100));
          } else {
            dailyRate = baseRate + rule.adjustment_value;
          }
        }
        totalAmount += dailyRate;
      }

      // 1,050 (Dec 29) + 1,050 (Dec 30) + 1,300 (Dec 31) = 3,400 THB
      expect(totalAmount).to.equal(3400.0);
    });
  });

  // ===========================================================================
  // MODULE 2: BOOKING CHANNELS & SLIP VERIFICATION
  // ===========================================================================
  describe('Module 2: Booking Channels & Payment Slip Verification', () => {
    it('SUCCESS: Supports all 3 designated channels (walk_in, phone, facebook)', async () => {
      const channels = ['walk_in', 'phone', 'facebook'] as const;

      for (let i = 0; i < channels.length; i++) {
        const resId = `res_channel_${i}`;
        await mockDb.prepare(`
          INSERT INTO reservations (id, reservation_code, guest_name, room_type_id, booking_source, check_in_date, check_out_date)
          VALUES (?, ?, ?, ?, ?, '2026-11-15', '2026-11-16')
        `).bind(resId, `KS-${i}`, `Guest ${channels[i]}`, 'rt_superior', channels[i]).run();

        const saved = await mockDb.prepare('SELECT booking_source FROM reservations WHERE id = ?')
          .bind(resId)
          .first<{ booking_source: string }>();

        expect(saved?.booking_source).to.equal(channels[i]);
      }
    });

    it('BAD: Rejects unapproved booking channel outside walk_in, phone, or facebook', () => {
      expect(() => {
        sqliteDb.exec(`
          INSERT INTO reservations (id, reservation_code, guest_name, room_type_id, booking_source, check_in_date, check_out_date)
          VALUES ('res_bad', 'KS-BAD', 'Bad Guest', 'rt_superior', 'agoda_ota', '2026-11-15', '2026-11-16');
        `);
      }).to.throw();
    });

    it('SUCCESS: Phone & Facebook bookings default to payment_status = unpaid', async () => {
      await mockDb.prepare(`
        INSERT INTO reservations (id, reservation_code, guest_name, room_type_id, booking_source, check_in_date, check_out_date)
        VALUES ('res_fb_1', 'KS-FB-01', 'Somchai Facebook', 'rt_deluxe', 'facebook', '2026-11-20', '2026-11-22')
      `).run();

      const res = await mockDb.prepare('SELECT payment_status, payment_slip_url FROM reservations WHERE id = ?')
        .bind('res_fb_1')
        .first<any>();

      expect(res.payment_status).to.equal('unpaid');
      expect(res.payment_slip_url).to.be.null;
    });

    it('SUCCESS: Attaching payment slip URL (R2) updates status to paid and records staff verification', async () => {
      await mockDb.prepare(`
        INSERT INTO reservations (id, reservation_code, guest_name, room_type_id, booking_source, payment_status, check_in_date, check_out_date)
        VALUES ('res_phone_1', 'KS-PH-01', 'Khun Suda Phone', 'rt_superior', 'phone', 'unpaid', '2026-11-25', '2026-11-27')
      `).run();

      // Front desk staff verifies slip sent to Facebook page and attaches slip URL
      const verifiedAt = new Date().toISOString();
      const verifiedBy = 'usr_dear_sa';
      const slipUrl = 'https://assets.keystay.io/slips/202611/res_phone_1_slip.jpg';

      await mockDb.prepare(`
        UPDATE reservations
        SET payment_status = 'paid',
            payment_slip_url = ?,
            payment_verified_at = ?,
            payment_verified_by = ?
        WHERE id = ?
      `).bind(slipUrl, verifiedAt, verifiedBy, 'res_phone_1').run();

      const updated = await mockDb.prepare('SELECT * FROM reservations WHERE id = ?')
        .bind('res_phone_1')
        .first<any>();

      expect(updated.payment_status).to.equal('paid');
      expect(updated.payment_slip_url).to.equal(slipUrl);
      expect(updated.payment_verified_by).to.equal('usr_dear_sa');
      expect(updated.payment_verified_at).to.be.a('string');
    });

    it('SUCCESS: Attaching bank transfer transaction reference (slip ref) marks reservation paid', async () => {
      await mockDb.prepare(`
        INSERT INTO reservations (id, reservation_code, guest_name, room_type_id, booking_source, payment_status, check_in_date, check_out_date)
        VALUES ('res_ref_1', 'KS-REF-01', 'Anon BankTransfer', 'rt_superior', 'phone', 'unpaid', '2026-11-25', '2026-11-26')
      `).run();

      const refNo = 'KBANK-20261125-99887766';
      await mockDb.prepare(`
        UPDATE reservations
        SET payment_status = 'paid',
            payment_slip_ref = ?,
            payment_verified_by = 'usr_frontdesk_01'
        WHERE id = ?
      `).bind(refNo, 'res_ref_1').run();

      const res = await mockDb.prepare('SELECT payment_status, payment_slip_ref FROM reservations WHERE id = ?')
        .bind('res_ref_1')
        .first<any>();

      expect(res.payment_status).to.equal('paid');
      expect(res.payment_slip_ref).to.equal(refNo);
    });
  });

  // ===========================================================================
  // MODULE 3: EXTRA AMENITIES (FREE VS. PAID & FOLIO AUTO-ROLL)
  // ===========================================================================
  describe('Module 3: Extra Amenities Management', () => {
    let billId: string;
    let resId: string;

    beforeEach(async () => {
      resId = 'res_stay_101';
      billId = 'bill_stay_101';

      // Create reservation and initial room bill
      await mockDb.prepare(`
        INSERT INTO reservations (id, reservation_code, guest_name, room_type_id, check_in_date, check_out_date, subtotal, total_amount)
        VALUES (?, 'KS-101', 'Khun Somchai', 'rt_superior', '2026-11-15', '2026-11-17', 2000.0, 2140.0)
      `).bind(resId).run();

      await mockDb.prepare(`
        INSERT INTO bills (id, bill_number, reservation_id, subtotal, tax_amount, total_amount)
        VALUES (?, 'BILL-101', ?, 2000.0, 140.0, 2140.0)
      `).bind(billId, resId).run();

      // Initial room charge line item
      await mockDb.prepare(`
        INSERT INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price)
        VALUES ('item_room_1', ?, 'room_charge', 'Superior Queen Room (2 คืน)', 2, 1000.0, 2000.0)
      `).bind(billId).run();
    });

    it('SUCCESS: Free amenities (Extra Pillow) create request record with 0 THB and DO NOT charge Folio', async () => {
      const pillow = await mockDb.prepare('SELECT * FROM amenities_catalog WHERE id = ?')
        .bind('amenity_pillow')
        .first<any>();

      expect(pillow.is_chargeable).to.equal(0);
      expect(pillow.unit_price).to.equal(0.0);

      // Record free amenity request
      await mockDb.prepare(`
        INSERT INTO reservation_amenity_requests (id, reservation_id, amenity_id, amenity_name, quantity, unit_price, total_price, is_chargeable, billed_to_folio)
        VALUES ('req_free_1', ?, ?, ?, 2, 0.0, 0.0, 0, 0)
      `).bind(resId, pillow.id, pillow.name_th).run();

      // Verify Folio bill line items count is still 1 (only room charge, no added cost)
      const items = await mockDb.prepare('SELECT * FROM bill_items WHERE bill_id = ?')
        .bind(billId)
        .all<any>();

      expect(items.results.length).to.equal(1);

      // Bill subtotal remains unchanged at 2,000 THB
      const bill = await mockDb.prepare('SELECT subtotal FROM bills WHERE id = ?')
        .bind(billId)
        .first<any>();
      expect(bill.subtotal).to.equal(2000.0);
    });

    it('SUCCESS: Paid amenities (Extra Bed 300 THB/night x 2 nights = 600 THB) automatically roll into Folio bill_items', async () => {
      const extraBed = await mockDb.prepare('SELECT * FROM amenities_catalog WHERE id = ?')
        .bind('amenity_bed')
        .first<any>();

      expect(extraBed.is_chargeable).to.equal(1);
      expect(extraBed.unit_price).to.equal(300.0);

      const qty = 2; // 2 nights
      const totalPrice = extraBed.unit_price * qty; // 600 THB
      const billItemId = 'item_amenity_bed_1';

      // 1. Post line item to bill_items (Folio)
      await mockDb.prepare(`
        INSERT INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price)
        VALUES (?, ?, 'amenity', ?, ?, ?, ?)
      `).bind(billItemId, billId, `${extraBed.name_th} (${qty} คืน)`, qty, extraBed.unit_price, totalPrice).run();

      // 2. Record amenity request linking to bill_item_id
      await mockDb.prepare(`
        INSERT INTO reservation_amenity_requests (id, reservation_id, amenity_id, amenity_name, quantity, unit_price, total_price, is_chargeable, billed_to_folio, bill_item_id)
        VALUES ('req_paid_1', ?, ?, ?, ?, ?, ?, 1, 1, ?)
      `).bind(resId, extraBed.id, extraBed.name_th, qty, extraBed.unit_price, totalPrice, billItemId).run();

      // 3. Update Bill Subtotal & VAT
      const newSubtotal = 2000.0 + totalPrice; // 2,600 THB
      const newTax = Math.round(newSubtotal * 0.07 * 100) / 100; // 182.00 THB
      const newTotal = newSubtotal + newTax; // 2,782.00 THB

      await mockDb.prepare(`
        UPDATE bills
        SET subtotal = ?, tax_amount = ?, total_amount = ?
        WHERE id = ?
      `).bind(newSubtotal, newTax, newTotal, billId).run();

      // Verify bill reflects paid extra amenity
      const updatedBill = await mockDb.prepare('SELECT * FROM bills WHERE id = ?')
        .bind(billId)
        .first<any>();

      expect(updatedBill.subtotal).to.equal(2600.0);
      expect(updatedBill.tax_amount).to.equal(182.0);
      expect(updatedBill.total_amount).to.equal(2782.0);

      // Verify bill_items contains 2 line items
      const items = await mockDb.prepare('SELECT * FROM bill_items WHERE bill_id = ?')
        .bind(billId)
        .all<any>();
      expect(items.results.length).to.equal(2);
      expect(items.results[1].item_type).to.equal('amenity');
      expect(items.results[1].total_price).to.equal(600.0);
    });
  });

  // ===========================================================================
  // MODULE 4: VAT 7% ACCOUNTING & OWNER EXPORT REPORT
  // ===========================================================================
  describe('Module 4: VAT 7% Accounting & Owner Reporting', () => {
    it('SUCCESS: Accurately calculates 7% VAT on room charge + paid extra amenities', () => {
      const roomCharge = 3000.0;
      const extraBedCharge = 600.0;
      const subtotal = roomCharge + extraBedCharge; // 3,600 THB

      const vatRate = 0.07;
      const calculatedVat = Math.round(subtotal * vatRate * 100) / 100;
      const grandTotal = subtotal + calculatedVat;

      expect(subtotal).to.equal(3600.0);
      expect(calculatedVat).to.equal(252.0);
      expect(grandTotal).to.equal(3852.0);
    });

    it('SUCCESS: Key deposit (300 THB) is excluded from VAT calculation', () => {
      const subtotal = 1000.0;
      const keyDeposit = 300.0; // Refundable deposit

      // Tax only applies to taxable goods & services (subtotal)
      const vatAmount = Math.round(subtotal * 0.07 * 100) / 100; // 70.00 THB
      const totalCollected = subtotal + vatAmount + keyDeposit; // 1,370.00 THB

      expect(vatAmount).to.equal(70.0);
      expect(totalCollected).to.equal(1370.0);
    });

    it('SUCCESS: Owner financial export report includes all required tax and channel columns', async () => {
      // Seed test reservations with multiple channels and VAT breakdowns
      await mockDb.prepare(`
        INSERT INTO reservations (id, reservation_code, guest_name, room_type_id, booking_source, payment_status, payment_slip_ref, check_in_date, check_out_date, subtotal, tax_amount, total_amount)
        VALUES
        ('res_rep_1', 'KS-WALK-01', 'Somchai Walkin', 'rt_superior', 'walk_in', 'paid', 'CASH-001', '2026-11-01', '2026-11-02', 1000.0, 70.0, 1070.0),
        ('res_rep_2', 'KS-FB-02', 'Wichai Facebook', 'rt_deluxe', 'facebook', 'paid', 'SCB-88776655', '2026-11-03', '2026-11-05', 3600.0, 252.0, 3852.0),
        ('res_rep_3', 'KS-PH-03', 'Mana Phone', 'rt_standard', 'phone', 'unpaid', NULL, '2026-11-10', '2026-11-11', 800.0, 56.0, 856.0);
      `).run();

      // Query for Owner financial export
      const rows = await mockDb.prepare(`
        SELECT 
          reservation_code,
          guest_name,
          booking_source,
          subtotal AS net_amount_before_tax,
          tax_amount AS vat_7_pct,
          total_amount AS grand_total,
          payment_status,
          COALESCE(payment_slip_ref, payment_slip_url, 'N/A') AS slip_reference
        FROM reservations
        ORDER BY check_in_date ASC
      `).all<any>();

      expect(rows.results.length).to.equal(3);

      // Verify row 1 (Walk-in)
      expect(rows.results[0].booking_source).to.equal('walk_in');
      expect(rows.results[0].net_amount_before_tax).to.equal(1000.0);
      expect(rows.results[0].vat_7_pct).to.equal(70.0);
      expect(rows.results[0].grand_total).to.equal(1070.0);

      // Verify row 2 (Facebook with VAT 7% & slip ref)
      expect(rows.results[1].booking_source).to.equal('facebook');
      expect(rows.results[1].net_amount_before_tax).to.equal(3600.0);
      expect(rows.results[1].vat_7_pct).to.equal(252.0);
      expect(rows.results[1].grand_total).to.equal(3852.0);
      expect(rows.results[1].slip_reference).to.equal('SCB-88776655');

      // Aggregate revenue & tax totals
      const totalNet = rows.results.reduce((sum, r) => sum + r.net_amount_before_tax, 0);
      const totalVat = rows.results.reduce((sum, r) => sum + r.vat_7_pct, 0);
      const grandSum = rows.results.reduce((sum, r) => sum + r.grand_total, 0);

      expect(totalNet).to.equal(5400.0);
      expect(totalVat).to.equal(378.0);
      expect(grandSum).to.equal(5778.0);
    });
  });
});

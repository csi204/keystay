import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMockD1 } from '../helpers/mock-d1';
import app, { type Env } from '../../services/report-analytics/src/index';

describe('Report & Analytics Service (Khet - @hazeco)', () => {
  let mockDb: D1Database;
  let env: Env;
  let sqliteDb: DatabaseSync;

  beforeEach(() => {
    sqliteDb = new DatabaseSync(':memory:');
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../../services/report-analytics/schema.sql'),
      'utf8'
    );
    sqliteDb.exec(schemaSql);

    // Load initial seed data for realistic reporting calculations
    const seedSql = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/seeds/06_report.sql'),
      'utf8'
    );
    sqliteDb.exec(seedSql);

    mockDb = createMockD1(sqliteDb);
    env = {
      DB: mockDb,
      ENVIRONMENT: 'test',
    };
  });

  describe('Health & Metadata', () => {
    it('SUCCESS: returns 200 with service operational status', async () => {
      const res = await app.request('/health', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.status).to.equal('ok');
      expect(json.service).to.equal('report-analytics');
    });

    it('SUCCESS: returns root endpoint info', async () => {
      const res = await app.request('/', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.endpoints_count).to.equal(14);
    });
  });

  describe('API #97: GET /dashboard/summary', () => {
    it('SUCCESS: returns executive summary with KPIs and MTD performance', async () => {
      const res = await app.request('/dashboard/summary', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('kpi');
      expect(json.data).to.have.property('monthly_mtd');
      expect(json.data.kpi).to.have.property('occupancy_rate');
      expect(json.data.kpi).to.have.property('total_revenue_today');
    });
  });

  describe('API #87: GET /reports/kpis', () => {
    it('SUCCESS: returns high-level KPI cards for executive dashboard', async () => {
      const res = await app.request('/reports/kpis', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('occupancy_rate');
      expect(json.data).to.have.property('adr');
      expect(json.data).to.have.property('revpar');
    });
  });

  describe('API #88: GET /reports/revenue-daily', () => {
    it('SUCCESS: returns daily revenue stats with default limit', async () => {
      const res = await app.request('/reports/revenue-daily', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('trend');
      expect(json.data.trend).to.be.an('array');
      expect(json.data.trend.length).to.be.at.least(1);
    });

    it('SUCCESS: respects query limit parameter', async () => {
      const res = await app.request('/reports/revenue-daily?limit=5', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.data.trend.length).to.be.at.most(5);
      expect(json.data.window_days).to.equal(5);
    });
  });

  describe('Daily Stats: GET /reports/daily-stats', () => {
    it('SUCCESS: returns daily stats with date filtering', async () => {
      const res = await app.request(
        '/reports/daily-stats?startDate=2026-09-01&endDate=2026-09-15',
        { method: 'GET' },
        env
      );
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
      expect(json.filter.startDate).to.equal('2026-09-01');
      expect(json.filter.endDate).to.equal('2026-09-15');
    });
  });

  describe('API #89: GET /reports/revenue-monthly', () => {
    it('SUCCESS: returns monthly revenue history', async () => {
      const res = await app.request('/reports/revenue-monthly', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('history');
      expect(json.data).to.have.property('months_count');
    });

    it('SUCCESS: filters by startMonth and endMonth', async () => {
      const res = await app.request(
        '/reports/revenue-monthly?startMonth=2026-01&endMonth=2026-06',
        { method: 'GET' },
        env
      );
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.filter.startMonth).to.equal('2026-01');
      expect(json.filter.endMonth).to.equal('2026-06');
    });
  });

  describe('API #90: GET /reports/occupancy', () => {
    it('SUCCESS: returns occupancy data points', async () => {
      const res = await app.request('/reports/occupancy?limit=10', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('daily_breakdown');
      expect(json.data.daily_breakdown).to.be.an('array');
      expect(json.data.period_days).to.equal(10);
    });
  });

  describe('API #91: GET /reports/room-performance', () => {
    it('SUCCESS: returns room performance metrics by month', async () => {
      const res = await app.request('/reports/room-performance?month=2026-09', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('month', '2026-09');
      expect(json.data).to.have.property('rooms');
    });
  });

  describe('API #92: GET /reports/cancellations', () => {
    it('SUCCESS: returns cancellation history records', async () => {
      const res = await app.request('/reports/cancellations', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('daily_history');
      expect(json.data.daily_history).to.be.an('array');
    });
  });

  describe('API #93: GET /reports/guest-demographics', () => {
    it('SUCCESS: returns demographics breakdown', async () => {
      const res = await app.request('/reports/guest-demographics?month=2026-09', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('demographics');
    });
  });

  describe('API #94: GET /reports/housekeeping-efficiency', () => {
    it('SUCCESS: returns staff task completion and speed', async () => {
      const res = await app.request('/reports/housekeeping-efficiency', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.have.property('staff_performance');
      expect(json.data.staff_performance).to.be.an('array');
    });
  });

  describe('API #95: POST /reports/refresh', () => {
    it('SUCCESS: triggers manual refresh and writes audit event', async () => {
      const res = await app.request('/reports/refresh?section=kpi', { method: 'POST' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.message).to.include("Section 'kpi' refreshed successfully");
    });
  });

  describe('API #96: GET /reports/audit-logs', () => {
    it('SUCCESS: returns system and event audit logs', async () => {
      const res = await app.request('/reports/audit-logs', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.data).to.be.an('array');
    });
  });

  describe('API #98: GET /reports/export/csv', () => {
    it('SUCCESS: exports daily stats as CSV file format', async () => {
      const res = await app.request('/reports/export/csv?type=daily_stats', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      expect(res.headers.get('content-type')).to.include('text/csv');
      const text = await res.text();
      expect(text).to.include('Date,Total Rooms,Occupied,Available,Occupancy %');
    });

    it('SUCCESS: exports room performance as CSV file format', async () => {
      const res = await app.request('/reports/export/csv?type=room_performance', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      expect(res.headers.get('content-type')).to.include('text/csv');
      const text = await res.text();
      expect(text).to.include('Room Number,Room Type,Month,Total Bookings');
    });
  });

  describe('API #99: GET /reports/export/pdf', () => {
    it('SUCCESS: renders printable HTML report document', async () => {
      const res = await app.request('/reports/export/pdf', { method: 'GET' }, env);
      expect(res.status).to.equal(200);
      expect(res.headers.get('content-type')).to.include('text/html');
      const html = await res.text();
      expect(html).to.include('KEYSTAY Executive Report');
      expect(html).to.include('Month-to-Date Revenue');
    });
  });

  describe('Webhooks & Event Consumer', () => {
    it('SUCCESS: /webhooks/checkout increments totalCheckouts in daily stats', async () => {
      const payload = {
        reservationId: 'res-test-101',
        roomNumber: '101',
        guestName: 'Somchai Jaidee',
        checkedOutAt: new Date().toISOString(),
      };

      const res = await app.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
    });

    it('SUCCESS: /webhooks/bill-paid records revenue and daily stats', async () => {
      const payload = {
        billId: 'bill-test-202',
        reservationId: 'res-test-101',
        roomTypeName: 'Deluxe Suite',
        amountPaid: 4500.0,
        paymentMethod: 'QR_PROMPTPAY',
      };

      const res = await app.request(
        '/webhooks/bill-paid',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.recorded_amount).to.equal(4500.0);
    });

    it('SUCCESS: /webhooks/housekeeping-completed logs housekeeping completion event', async () => {
      const payload = {
        taskId: 'hk-task-888',
        roomId: 'room-102',
        staffId: 'staff-45',
        completedAt: new Date().toISOString(),
      };

      const res = await app.request(
        '/webhooks/housekeeping-completed',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        env
      );

      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
    });

    it('BAD: returns 401 when QSTASH signing key is set but signature is missing', async () => {
      const securedEnv: Env = {
        ...env,
        QSTASH_CURRENT_SIGNING_KEY: 'test-secret-qstash-key',
      };

      const res = await app.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: 'test' }),
        },
        securedEnv
      );

      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
      expect(json.error).to.include('signature');
    });

    it('BAD: returns 401 when QSTASH signing key is set and signature is invalid', async () => {
      const securedEnv: Env = {
        ...env,
        QSTASH_CURRENT_SIGNING_KEY: 'test-secret-qstash-key',
      };

      const res = await app.request(
        '/webhooks/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'upstash-signature': 'totally-invalid-signature',
          },
          body: JSON.stringify({ reservationId: 'test' }),
        },
        securedEnv
      );

      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
    });
  });
});

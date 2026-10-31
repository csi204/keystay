import { describe, it } from 'node:test';
import assert from 'node:assert';
import app, { mapOutsourceContact, OutsourceContactDTO } from '../index';
import { outsourceContactsRoute } from '../routes/outsource-contacts';

describe('Outsource Contacts API & Mapping', () => {
  it('maps database snake_case row to camelCase DTO correctly', () => {
    const row = {
      id: 'out-001',
      name: 'บจก. สยามแอร์เซอร์วิส',
      category: 'air_conditioning',
      service_type: 'ซ่อม/ล้างแอร์ห้องพัก 24 ชม.',
      phone_primary: '089-999-8888',
      phone_secondary: '02-123-4567',
      line_id: '@siamair24',
      is_emergency: 1,
      available_hours: '24 ชั่วโมง',
      price_rate_note: 'เริ่มต้น 500 บาท/เครื่อง',
      rating: 4.9,
      is_active: 1,
    };
    const dto = mapOutsourceContact(row);
    assert.strictEqual(dto.id, 'out-001');
    assert.strictEqual(dto.isEmergency, true);
    assert.strictEqual(dto.phonePrimary, '089-999-8888');
    assert.strictEqual(dto.lineId, '@siamair24');
    assert.strictEqual(dto.category, 'air_conditioning');
    assert.strictEqual(dto.serviceType, 'ซ่อม/ล้างแอร์ห้องพัก 24 ชม.');
    assert.strictEqual(dto.availableHours, '24 ชั่วโมง');
    assert.strictEqual(dto.isActive, true);
  });

  it('handles optional and nullable fields gracefully', () => {
    const row = {
      id: 'out-002',
      name: 'ช่างไฟด่วน 24 ชม.',
      category: 'electrical',
      service_type: 'ระบบไฟฟ้าลัดวงจร ไฟฟ้าดับ',
      phone_primary: '081-234-5678',
      phone_secondary: null,
      line_id: null,
      is_emergency: 1,
      available_hours: '24 ชั่วโมง',
      price_rate_note: null,
      rating: 5.0,
      address: null,
      notes: null,
      is_active: 1,
    };
    const dto = mapOutsourceContact(row);
    assert.strictEqual(dto.id, 'out-002');
    assert.strictEqual(dto.name, 'ช่างไฟด่วน 24 ชม.');
    assert.strictEqual(dto.category, 'electrical');
    assert.strictEqual(dto.phoneSecondary, null);
    assert.strictEqual(dto.lineId, null);
    assert.strictEqual(dto.isEmergency, true);
    assert.strictEqual(dto.priceRateNote, null);
    assert.strictEqual(dto.address, null);
    assert.strictEqual(dto.notes, null);
    assert.strictEqual(dto.isActive, true);
  });

  it('maps inactive and non-emergency contacts properly', () => {
    const row = {
      id: 'out-003',
      name: 'สวนสวย การ์เด้น',
      category: 'gardening',
      service_type: 'ตัดแต่งกิ่งไม้ ตกแต่งสวนรอบอาคาร',
      phone_primary: '085-111-2222',
      is_emergency: 0,
      available_hours: 'จันทร์-ศุกร์ 08:00 - 17:00 น.',
      is_active: 0,
    };
    const dto = mapOutsourceContact(row);
    assert.strictEqual(dto.id, 'out-003');
    assert.strictEqual(dto.isEmergency, false);
    assert.strictEqual(dto.isActive, false);
  });

  it('serves GET /housekeeping/outsource-contacts via Hono app with D1 mock', async () => {
    const rawRow = [
      'out-001', // id
      'บจก. สยามแอร์เซอร์วิส', // name
      'air_conditioning', // category
      'ซ่อม/ล้างแอร์ห้องพัก 24 ชม.', // service_type
      '089-999-8888', // phone_primary
      '02-123-4567', // phone_secondary
      '@siamair24', // line_id
      1, // is_emergency
      '24 ชั่วโมง', // available_hours
      'เริ่มต้น 500 บาท/เครื่อง', // price_rate_note
      4.9, // rating
      'Bangkok', // address
      'ประจำโรงแรม', // notes
      1, // is_active
      null, // created_by
      '2026-10-31T00:00:00.000Z', // created_at
      '2026-10-31T00:00:00.000Z', // updated_at
    ];

    const mockDb = {
      prepare(_query: string) {
        return {
          bind(..._params: any[]) {
            return this;
          },
          async raw() {
            return [rawRow];
          },
          async all() {
            return {
              results: [rawRow],
              success: true,
            };
          },
          async first() {
            return rawRow;
          },
          async run() {
            return { success: true };
          },
        };
      },
    } as unknown as D1Database;

    // Test GET /housekeeping/outsource-contacts
    const res1 = await app.request(
      '/housekeeping/outsource-contacts?category=air_conditioning&is_emergency=1&is_active=1',
      { method: 'GET' },
      { DB: mockDb }
    );
    assert.strictEqual(res1.status, 200);
    const body1 = (await res1.json()) as { success: boolean; total: number; data: OutsourceContactDTO[] };
    assert.strictEqual(body1.success, true);
    assert.strictEqual(body1.total, 1);
    assert.strictEqual(body1.data[0].id, 'out-001');
    assert.strictEqual(body1.data[0].category, 'air_conditioning');
    assert.strictEqual(body1.data[0].isEmergency, true);
    assert.strictEqual(body1.data[0].phonePrimary, '089-999-8888');

    // Test alias mount GET /outsource-contacts
    const res2 = await app.request(
      '/outsource-contacts',
      { method: 'GET' },
      { DB: mockDb }
    );
    assert.strictEqual(res2.status, 200);
    const body2 = (await res2.json()) as { success: boolean; total: number; data: OutsourceContactDTO[] };
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.data[0].id, 'out-001');

    // Test GET /housekeeping/outsource-contacts/:id
    const res3 = await app.request(
      '/housekeeping/outsource-contacts/out-001',
      { method: 'GET' },
      { DB: mockDb }
    );
    assert.strictEqual(res3.status, 200);
    const body3 = (await res3.json()) as { success: boolean; data: OutsourceContactDTO };
    assert.strictEqual(body3.success, true);
    assert.strictEqual(body3.data.id, 'out-001');
  });
});

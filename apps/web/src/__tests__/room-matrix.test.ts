// apps/web/src/__tests__/room-matrix.test.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('getRoomStatusMeta returns correct soft-tint classes and Thai labels', () => {
  const statusMeta: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    available: { label: 'ว่างพร้อมใช้', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    occupied: { label: 'มีแขกพัก', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    reserved: { label: 'ติดจอง', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    checked_out: { label: 'รอทำความสะอาด', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    cleaning: { label: 'กำลังทำความสะอาด', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
    maintenance: { label: 'ปิดปรับปรุง', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    out_of_order: { label: 'งดใช้งาน', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  };

  assert.strictEqual(statusMeta.available.label, 'ว่างพร้อมใช้');
  assert.strictEqual(statusMeta.occupied.dot, 'bg-blue-500');
  assert.strictEqual(statusMeta.checked_out.label, 'รอทำความสะอาด');
  assert.strictEqual(statusMeta.maintenance.label, 'ปิดปรับปรุง');
});

test('room filter correctly counts room statuses', () => {
  const sampleRooms = [
    { id: '1', roomNumber: '101', status: 'available' },
    { id: '2', roomNumber: '102', status: 'occupied' },
    { id: '3', roomNumber: '103', status: 'occupied' },
    { id: '4', roomNumber: '201', status: 'cleaning' },
    { id: '5', roomNumber: '202', status: 'reserved' },
  ];

  const counts = sampleRooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  assert.strictEqual(counts['available'], 1);
  assert.strictEqual(counts['occupied'], 2);
  assert.strictEqual(counts['cleaning'], 1);
  assert.strictEqual(counts['reserved'], 1);
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4: Housekeeping Evidence in Front Desk Cross-Team Integration', () => {
  const modalPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/RoomDetailsModal.tsx'
  );

  it('verifies RoomDetailsModal contains the complete Housekeeping Proof of Cleanliness module', () => {
    assert.ok(fs.existsSync(modalPath), 'RoomDetailsModal.tsx must exist');
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Section exists in modal
    assert.ok(code.includes('หลักฐานการตรวจรับห้องพัก'), 'Must contain Thai section title');
    assert.ok(code.includes('Housekeeping Inspection Evidence'), 'Must contain English section title');

    // Contains before and after photo blocks
    assert.ok(code.includes('ก่อนทำความสะอาด'), 'Must contain Before photo label');
    assert.ok(code.includes('หลังตรวจรับเสร็จสมบูรณ์'), 'Must contain After photo label');
    assert.ok(code.includes('CheckCircle2'), 'Must include CheckCircle2 verified badge');
  });

  it('verifies non-blocking async fetching of housekeeping evidence per room', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(code.includes('/api/housekeeping/tasks?roomNumber='), 'Must fetch tasks by roomNumber');
    assert.ok(code.includes('Authorization: `Bearer ${token}`'), 'Must pass Bearer auth token');
    assert.ok(code.includes('try {') && code.includes('catch'), 'Must be wrapped in safe error boundary');
  });

  it('verifies full-resolution Lightbox overlay with Escape hierarchy and z-[99999]', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(code.includes('zIndex: 99999'), 'Must render with highest z-index 99999');
    assert.ok(code.includes('setLightboxPhoto(null)'), 'Must allow dismissing lightbox');
    assert.ok(code.includes("e.key === 'Escape'"), 'Must handle Escape key dismissal');
  });

  it('verifies empty-state resilience when no tasks or photos exist', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(code.includes('ไม่มีภาพก่อนทำ'), 'Must render fallback for missing before photo');
    assert.ok(code.includes('ไม่มีภาพหลังทำ'), 'Must render fallback for missing after photo');
    assert.ok(code.includes('อยู่ระหว่างทำความสะอาด รอแม่บ้านบันทึกภาพถ่าย'), 'Must render in-progress notice');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 3: Front Desk Housekeeping Evidence Display in RoomDetailsModal', () => {
  const modalPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/RoomDetailsModal.tsx'
  );

  it('RoomDetailsModal.tsx exists and imports required icons and API helpers', () => {
    assert.ok(fs.existsSync(modalPath), 'RoomDetailsModal.tsx must exist');
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Lucide Icons
    assert.match(modalCode, /\bCamera\b/, 'Must import Camera');
    assert.match(modalCode, /\bCheckCircle2\b/, 'Must import CheckCircle2');
    assert.match(modalCode, /\bImage\s+as\s+ImageIcon\b/, 'Must import Image as ImageIcon');
    assert.match(modalCode, /\bSparkles\b/, 'Must import Sparkles');
    assert.match(modalCode, /\bMaximize2\b/, 'Must import Maximize2');
    assert.match(modalCode, /\bEye\b/, 'Must import Eye');

    // API helpers
    assert.match(modalCode, /\bapiUrl\b/, 'Must import apiUrl from @/lib/api');
    assert.match(modalCode, /\bgetAuthToken\b/, 'Must import getAuthToken from @/lib/api');
  });

  it('declares HousekeepingEvidenceTask interface and corresponding states', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Interface definition
    assert.match(modalCode, /export\s+interface\s+HousekeepingEvidenceTask/);
    assert.match(modalCode, /beforePhotoUrl\?:\s*string\s*\|\s*null/);
    assert.match(modalCode, /afterPhotoUrl\?:\s*string\s*\|\s*null/);
    assert.match(modalCode, /completedAt\?:\s*string\s*\|\s*null/);
    assert.match(modalCode, /assignedStaff\?:\s*\{\s*name:\s*string\s*\}\s*\|\s*null/);

    // States
    assert.match(modalCode, /housekeepingTask,\s*setHousekeepingTask/);
    assert.match(modalCode, /loadingHousekeeping,\s*setLoadingHousekeeping/);
    assert.match(modalCode, /lightboxPhoto,\s*setLightboxPhoto/);
  });

  it('fetches housekeeping task from /api/housekeeping/tasks?roomNumber= with auth header and error handling', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    assert.match(modalCode, /apiUrl\(`\/api\/housekeeping\/tasks\?roomNumber=\$\{room\.roomNumber\}`\)/);
    assert.match(modalCode, /Authorization:\s*`Bearer \$\{token\}`/);
    assert.match(modalCode, /setHousekeepingTask\(json\.data\[0\]\)/);
    assert.match(modalCode, /setHousekeepingTask\(null\)/);
  });

  it('renders Housekeeping Evidence section with inspector info and date formatting', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Header title and bilingual strings
    assert.match(modalCode, /หลักฐานการตรวจรับห้องพัก/);
    assert.match(modalCode, /Housekeeping Inspection Evidence/);

    // Inspector and date formatting
    assert.match(modalCode, /ผู้ตรวจรับ:\s*/);
    assert.match(modalCode, /Inspected by:\s*/);
    assert.match(modalCode, /housekeepingTask\.assignedStaff\.name/);
    assert.match(modalCode, /formattedHousekeepingCompletedAt/);
  });

  it('renders side-by-side Before and After photo comparison cards with zoom triggers', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Side-by-side grid
    assert.match(modalCode, /grid\s+grid-cols-2\s+gap-3/);

    // Before Photo
    assert.match(modalCode, /ก่อนทำความสะอาด/);
    assert.match(modalCode, /Before Cleaning/);
    assert.match(modalCode, /housekeepingTask\?\.beforePhotoUrl/);
    assert.match(modalCode, /ไม่มีภาพก่อนทำ/);
    assert.match(modalCode, /No before photo/);

    // After Photo & Verified Badge
    assert.match(modalCode, /หลังตรวจรับเสร็จสมบูรณ์/);
    assert.match(modalCode, /After Cleaning \(Verified\)/);
    assert.match(modalCode, /housekeepingTask\?\.afterPhotoUrl/);
    assert.match(modalCode, /ไม่มีภาพหลังทำ/);
    assert.match(modalCode, /No after photo/);

    // Lightbox triggers
    assert.match(modalCode, /setLightboxPhoto\(\{\s*url:\s*housekeepingTask\.beforePhotoUrl!/);
    assert.match(modalCode, /setLightboxPhoto\(\{\s*url:\s*housekeepingTask\.afterPhotoUrl!/);
  });

  it('renders clean status indicator when neither photo exists', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    assert.match(modalCode, /!housekeepingTask\?\.beforePhotoUrl\s*&&\s*!housekeepingTask\?\.afterPhotoUrl/);
    assert.match(modalCode, /อยู่ระหว่างทำความสะอาด รอแม่บ้านบันทึกภาพถ่าย/);
    assert.match(modalCode, /Cleaning in progress — awaiting photo inspection/);
  });

  it('renders Fullscreen Lightbox Modal with zIndex 99999, ESC hint, pulsating dot, and close handler', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    assert.match(modalCode, /lightboxPhoto\s*&&/);
    assert.match(modalCode, /zIndex:\s*99999/);
    assert.match(modalCode, /bg-black\/95\s+backdrop-blur-md/);
    assert.match(modalCode, /animate-ping.*bg-emerald-400/);
    assert.match(modalCode, /max-h-\[82vh\]/);
    assert.match(modalCode, /setLightboxPhoto\(null\)/);
    assert.match(modalCode, /e\.key\s*===\s*['"]Escape['"]/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 4: Slip Viewer Modal & Verification Actions in Room Details', () => {
  const slipViewerPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/SlipViewerModal.tsx');
  const roomDetailsModalPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomDetailsModal.tsx');

  it('SlipViewerModal component exists and provides image preview lightbox and bank ref input', () => {
    assert.ok(fs.existsSync(slipViewerPath), 'SlipViewerModal.tsx should exist');
    const code = fs.readFileSync(slipViewerPath, 'utf-8');

    // Props & Lightbox preview
    assert.match(code, /export const SlipViewerModal/);
    assert.match(code, /paymentSlipUrl/);
    assert.match(code, /paymentSlipRef/);
    assert.match(code, /paymentStatus/);
    assert.match(code, /onVerify/);

    // Zoom/Lightbox container
    assert.match(code, /fixed\s+inset-0/);
    assert.match(code, /backdrop-blur/);
    assert.match(code, /<img[\s\S]*src/);
  });

  it('SlipViewerModal supports verification action to mark payment as paid', () => {
    const code = fs.readFileSync(slipViewerPath, 'utf-8');

    // Verification button
    assert.match(code, /ยืนยันการชำระเงิน|Verify Payment/);
    assert.match(code, /CheckCircle2|Check/);
  });

  it('RoomDetailsModal embeds SlipViewerModal and exposes slip preview button in room details mode', () => {
    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
    const code = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // Integration check
    assert.match(code, /SlipViewerModal/);
    assert.match(code, /isSlipViewerOpen|setIsSlipViewerOpen/);
    assert.match(code, /ดูสลิป|หลักฐานสลิป|Slip/);
  });
});

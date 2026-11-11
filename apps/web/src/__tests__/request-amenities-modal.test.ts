import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 5: Dedicated Request Amenities Modal & Folio Integration', () => {
  const modalPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RequestAmenitiesModal.tsx');
  const roomDetailsModalPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/RoomDetailsModal.tsx');
  const folioSplitScreenPath = path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FolioSplitScreen.tsx');

  it('RequestAmenitiesModal exists and renders separate Free and Paid amenity presets', () => {
    assert.ok(fs.existsSync(modalPath), 'RequestAmenitiesModal.tsx should exist');
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Free amenities presets & indicator
    assert.match(code, /amenity-pillow|หมอนหนุนเสริม/);
    assert.match(code, /amenity-towel|ผ้าเช็ดตัว/);
    assert.match(code, /แจ้งแม่บ้าน|ไม่ลงบิล|บริการฟรี/);

    // Paid amenities presets & folio notice
    assert.match(code, /amenity-extrabed|เตียงเสริม/);
    assert.match(code, /300/);
    assert.match(code, /ลงบิล Folio|คิดเงิน/);
  });

  it('RequestAmenitiesModal automatically rolls chargeable amenities into folio charges while leaving free items off folio', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Folio dispatch logic
    assert.match(code, /onAddFolioCharge/);
    assert.match(code, /isChargeable/);
  });

  it('RoomDetailsModal exposes Request Amenities button for occupied rooms', () => {
    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
    const code = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // Integration in RoomDetailsModal
    assert.match(code, /RequestAmenitiesModal/);
    assert.match(code, /isAmenitiesModalOpen|setIsAmenitiesModalOpen/);
    assert.match(code, /ขอของใช้เสริม|Amenities/);
  });

  it('FolioSplitScreen provides a button to request amenities directly into the active folio', () => {
    assert.ok(fs.existsSync(folioSplitScreenPath), 'FolioSplitScreen.tsx should exist');
    const code = fs.readFileSync(folioSplitScreenPath, 'utf-8');

    // Integration in FolioSplitScreen
    assert.match(code, /ขอของใช้เสริม|Amenities|onRequestAmenities/);
  });
});

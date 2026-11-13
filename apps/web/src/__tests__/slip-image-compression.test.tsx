import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { compressImageToBase64 } from '../lib/imageCompression';
import { WalkInModal } from '../components/front-desk/WalkInModal';
import { NewBookingModal } from '../components/front-desk/NewBookingModal';
import { SlipViewerModal } from '../components/front-desk/SlipViewerModal';
import { Room } from '@keystay/types';

const resolveFilePath = (subpath: string) => {
  const p1 = path.resolve(process.cwd(), subpath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), subpath.replace(/^apps\/web\//, ''));
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(process.cwd(), 'apps/web', subpath);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

const mockRooms: Room[] = [
  {
    id: 'room-101',
    roomNumber: '101',
    roomTypeId: 'type-std',
    status: 'available',
    floor: 1,
  } as unknown as Room,
];

describe('Task 3: Client-Side Slip Image Compression & Storage', () => {
  const imageCompressionPath = resolveFilePath('apps/web/src/lib/imageCompression.ts');
  const walkInModalPath = resolveFilePath('apps/web/src/components/front-desk/WalkInModal.tsx');
  const newBookingModalPath = resolveFilePath('apps/web/src/components/front-desk/NewBookingModal.tsx');
  const roomDetailsModalPath = resolveFilePath('apps/web/src/components/front-desk/RoomDetailsModal.tsx');
  const slipViewerModalPath = resolveFilePath('apps/web/src/components/front-desk/SlipViewerModal.tsx');

  describe('1. compressImageToBase64 helper', () => {
    it('helper file exists and exports compressImageToBase64', () => {
      assert.ok(fs.existsSync(imageCompressionPath), 'imageCompression.ts should exist');
      assert.strictEqual(typeof compressImageToBase64, 'function');
    });

    it('compresses a mock File and returns a Base64 JPEG data URL', async () => {
      const mockFile = new File(['fake-image-binary-data'], 'slip.jpg', { type: 'image/jpeg' });
      const dataUrl = await compressImageToBase64(mockFile, 1000, 0.75);
      assert.ok(typeof dataUrl === 'string', 'Returned data URL should be a string');
      assert.match(
        dataUrl,
        /^data:image\/jpeg;base64,/,
        'Should produce a valid JPEG Base64 Data URL'
      );
    });
  });

  describe('2. WalkInModal & NewBookingModal slip integration', () => {
    it('WalkInModal source imports compressImageToBase64 and passes paymentSlipUrl in onSubmit', () => {
      assert.ok(fs.existsSync(walkInModalPath), 'WalkInModal.tsx should exist');
      const code = fs.readFileSync(walkInModalPath, 'utf-8');

      assert.match(
        code,
        /compressImageToBase64/,
        'WalkInModal must import and call compressImageToBase64'
      );
      assert.match(
        code,
        /paymentSlipUrl/,
        'WalkInModal must manage paymentSlipUrl state'
      );
      assert.match(
        code,
        /paymentSlipUrl:\s*paymentSlipUrl/,
        'WalkInModal must include paymentSlipUrl in onSubmit payload'
      );
      assert.match(
        code,
        /type=["']file["'][\s\S]*?accept=["']image\/\*["']/,
        'WalkInModal must render an image file input for slip attachment'
      );
    });

    it('NewBookingModal source imports compressImageToBase64 and passes paymentSlipUrl in onSubmit', () => {
      assert.ok(fs.existsSync(newBookingModalPath), 'NewBookingModal.tsx should exist');
      const code = fs.readFileSync(newBookingModalPath, 'utf-8');

      assert.match(
        code,
        /compressImageToBase64/,
        'NewBookingModal must import and call compressImageToBase64'
      );
      assert.match(
        code,
        /paymentSlipUrl:\s*paymentSlipUrl/,
        'NewBookingModal must pass paymentSlipUrl in onSubmit payload'
      );
    });

    it('RoomDetailsModal source imports compressImageToBase64 for slip attachment', () => {
      assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
      const code = fs.readFileSync(roomDetailsModalPath, 'utf-8');

      assert.match(
        code,
        /compressImageToBase64/,
        'RoomDetailsModal must import and call compressImageToBase64'
      );
    });
  });

  describe('3. SlipViewerModal zoom controls and fallback', () => {
    it('SlipViewerModal renders Base64 image and zoom controls when slip URL is present', () => {
      const sampleBase64 = 'data:image/jpeg;base64,samplebase64data';
      const html = renderToStaticMarkup(
        React.createElement(SlipViewerModal, {
          isOpen: true,
          onClose: () => {},
          reservationId: 'res-1',
          reservationCode: 'KS-101',
          guestName: 'Somchai Prasert',
          paymentSlipUrl: sampleBase64,
          paymentSlipRef: 'BBL-123456',
        })
      );

      assert.ok(html.includes('src="data:image/jpeg;base64,samplebase64data"'), 'Should render slip img src');
      assert.match(
        html,
        /ZoomIn|ZoomOut|zoom|ขยาย|ย่อ|100%/i,
        'SlipViewerModal must render zoom controls for image inspection'
      );
    });

    it('SlipViewerModal renders clean fallback placeholder when slip URL is missing', () => {
      const html = renderToStaticMarkup(
        React.createElement(SlipViewerModal, {
          isOpen: true,
          onClose: () => {},
          reservationId: 'res-2',
          reservationCode: 'KS-102',
          guestName: 'Jane Doe',
          paymentSlipUrl: null,
          paymentSlipRef: null,
        })
      );

      assert.ok(
        html.includes('ยังไม่ได้แนบรูปภาพสลิป') || html.includes('No slip image attached yet'),
        'Should display missing slip fallback message'
      );
      assert.ok(html.includes('type="file"'), 'Should display file upload input for missing slip');
    });

    it('SlipViewerModal source code imports zoom icons from lucide-react and implements zoom state', () => {
      const code = fs.readFileSync(slipViewerModalPath, 'utf-8');
      assert.match(code, /ZoomIn/, 'SlipViewerModal must import ZoomIn icon');
      assert.match(code, /ZoomOut/, 'SlipViewerModal must import ZoomOut icon');
      assert.match(code, /zoom|setZoom/, 'SlipViewerModal must manage zoom scale state');
    });
  });

  describe('4. Global Constraints: Thai orthography and raw emojis check', () => {
    it('strictly uses "เช็คเอาต์" (ต.เต่า) and contains zero "เช็คเอาท์" in modified files', () => {
      const filesToCheck = [
        walkInModalPath,
        newBookingModalPath,
        roomDetailsModalPath,
        slipViewerModalPath,
      ];
      for (const filePath of filesToCheck) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          assert.doesNotMatch(
            content,
            /เช็คเอาท์/,
            `File ${filePath} must not contain non-standard "เช็คเอาท์"`
          );
        }
      }
    });

    it('contains zero raw Unicode emojis in modified modal files', () => {
      const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const filesToCheck = [
        walkInModalPath,
        newBookingModalPath,
        roomDetailsModalPath,
        slipViewerModalPath,
      ];
      for (const filePath of filesToCheck) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          assert.doesNotMatch(
            content,
            emojiRegex,
            `File ${filePath} must not contain raw Unicode emojis`
          );
        }
      }
    });
  });
});

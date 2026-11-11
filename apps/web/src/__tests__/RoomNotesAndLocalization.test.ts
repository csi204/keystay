import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Task 2: Fix status.extended Localization & Editable Room Notes', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const thPath = path.resolve(rootDir, 'apps/web/src/locales/th.ts');
  const enPath = path.resolve(rootDir, 'apps/web/src/locales/en.ts');
  const roomDetailsModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/RoomDetailsModal.tsx'
  );
  const roomInventoryRoutePath = path.resolve(
    rootDir,
    'services/room-inventory/src/routes/rooms.ts'
  );
  const roomValidatorPath = path.resolve(
    rootDir,
    'services/room-inventory/src/validators/room.validator.ts'
  );

  it('verifies status.extended localized string exists in th.ts and en.ts', () => {
    assert.strictEqual(
      th['status.extended'],
      'ขยายเวลาพัก',
      "th['status.extended'] should be 'ขยายเวลาพัก'"
    );
    assert.strictEqual(
      en['status.extended'],
      'Extended',
      "en['status.extended'] should be 'Extended'"
    );

    const thContent = fs.readFileSync(thPath, 'utf-8');
    const enContent = fs.readFileSync(enPath, 'utf-8');
    assert.match(thContent, /'status\.extended':\s*'ขยายเวลาพัก'/);
    assert.match(enContent, /'status\.extended':\s*'Extended'/);
  });

  it('verifies RoomDetailsModal imports Pencil, Loader2 and useToast', () => {
    assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
    const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // Lucide icon imports: Pencil and Loader2
    assert.match(modalCode, /\bPencil\b/, 'RoomDetailsModal should import Pencil from lucide-react');
    assert.match(modalCode, /\bLoader2\b/, 'RoomDetailsModal should import Loader2 from lucide-react');

    // Toast context integration
    assert.match(
      modalCode,
      /import\s+.*useToast.*from\s+['"]@\/context\/ToastContext['"]/,
      'RoomDetailsModal should import useToast from @/context/ToastContext'
    );
    assert.match(
      modalCode,
      /useToast\(\)/,
      'RoomDetailsModal should invoke useToast()'
    );
  });

  it('verifies RoomDetailsModal contains state and UI controls for editable room notes', () => {
    const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // State definitions
    assert.match(
      modalCode,
      /isEditingNotes/,
      'RoomDetailsModal should declare isEditingNotes state'
    );
    assert.match(
      modalCode,
      /editedNotes/,
      'RoomDetailsModal should declare editedNotes state'
    );
    assert.match(
      modalCode,
      /isSavingNotes/,
      'RoomDetailsModal should declare isSavingNotes state'
    );

    // Pencil button in notes header
    assert.match(
      modalCode,
      /<Pencil\b/,
      'RoomDetailsModal should render Pencil icon inside an edit button'
    );

    // When not editing: shows notes or fallback message
    assert.match(
      modalCode,
      /ไม่มีบันทึกเพิ่มเติม\s*\/\s*No additional notes/,
      'RoomDetailsModal should render fallback "ไม่มีบันทึกเพิ่มเติม / No additional notes" when empty'
    );

    // When editing: textarea with character count
    assert.match(
      modalCode,
      /<textarea[\s\S]*?value=\{editedNotes\}/,
      'RoomDetailsModal should render textarea bound to editedNotes'
    );
    assert.match(
      modalCode,
      /500/,
      'RoomDetailsModal should show character limit 500 for notes'
    );

    // Action buttons: Cancel and Save
    assert.match(
      modalCode,
      /t\(['"]common\.cancel['"]\)|ยกเลิก/,
      'RoomDetailsModal should have Cancel button'
    );
    assert.match(
      modalCode,
      /t\(['"]common\.save['"]\)|บันทึก/,
      'RoomDetailsModal should have Save button'
    );
  });

  it('verifies RoomDetailsModal calls PATCH /api/rooms/:id/notes, triggers toast and notifies parent onAction', () => {
    const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

    // apiFetch PATCH call
    assert.match(
      modalCode,
      /apiFetch\s*<.*>\s*\(\s*`\/api\/rooms\/\$\{[^}]+\}\/notes`,\s*\{[\s\S]*?method:\s*['"]PATCH['"]/,
      'RoomDetailsModal should call apiFetch with method PATCH to /api/rooms/${room.id}/notes'
    );

    // Toast showSuccess on save
    assert.match(
      modalCode,
      /toast\.showSuccess\(/,
      'RoomDetailsModal should call toast.showSuccess on successful save'
    );

    // Parent refresh notification
    assert.match(
      modalCode,
      /onAction\?\.\(\s*['"]refresh['"]\s*,\s*\{[\s\S]*?notes:/,
      'RoomDetailsModal should call onAction("refresh", { ...room, notes: ... })'
    );
  });

  it('verifies backend services/room-inventory supports PATCH /:id/notes and accepts nullable notes in validator', () => {
    assert.ok(fs.existsSync(roomInventoryRoutePath), 'rooms.ts route should exist');
    assert.ok(fs.existsSync(roomValidatorPath), 'room.validator.ts should exist');

    const routeCode = fs.readFileSync(roomInventoryRoutePath, 'utf-8');
    const validatorCode = fs.readFileSync(roomValidatorPath, 'utf-8');

    // PATCH /:id/notes route
    assert.match(
      routeCode,
      /roomsRoute\.patch\(\s*['"]\/:id\/notes['"]/,
      'roomsRoute should register PATCH /:id/notes'
    );

    // Persist to rooms table
    assert.match(
      routeCode,
      /db\.update\(rooms\)\.set\(\{[\s\S]*?notes:/,
      'roomsRoute PATCH /:id/notes should update notes column in rooms table'
    );

    // Validator allows nullable notes
    assert.match(
      validatorCode,
      /notes:\s*z\.string\(\)\.nullable\(\)\.optional\(\)|notes:\s*z\.string\(\)\.optional\(\)\.nullable\(\)/,
      'UpdateRoomSchema should allow notes to be nullable string or null'
    );
  });
});

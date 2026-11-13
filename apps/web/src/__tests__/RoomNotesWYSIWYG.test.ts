import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { localizeRoomNote, ROOM_NOTES_TH, ROOM_NOTES_EN } from '../lib/localizeMetadata';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('WYSIWYG Room Notes Editing & Localization Persistence', () => {
  const cwd = process.cwd();
  const rootDir =
    cwd.endsWith('apps/web') || cwd.endsWith('apps\\web')
      ? path.resolve(cwd, '../..')
      : cwd;

  const roomDetailsModalPath = path.resolve(
    rootDir,
    'apps/web/src/components/front-desk/RoomDetailsModal.tsx'
  );
  const localizeMetadataPath = path.resolve(
    rootDir,
    'apps/web/src/lib/localizeMetadata.ts'
  );

  describe('1. localizeRoomNote Bidirectional & Custom Text Localization', () => {
    it('translates English seeded notes to Thai', () => {
      assert.strictEqual(localizeRoomNote('Near garden pathway', 'th'), 'ใกล้ทางเดินสวนหย่อม');
      assert.strictEqual(localizeRoomNote('Late check-in guest', 'th'), 'แขกเช็คอินช่วงดึก');
      assert.strictEqual(localizeRoomNote('Priority checkout clean', 'th'), 'ห้องทำความสะอาดเร่งด่วน');
      assert.strictEqual(localizeRoomNote('Ocean front', 'th'), 'ริมชายหาดวิวทะเล');
      assert.strictEqual(localizeRoomNote('Quiet zone', 'th'), 'โซนเงียบสงบ');
    });

    it('translates Thai seeded notes back to English (reverse mapping)', () => {
      assert.strictEqual(localizeRoomNote('ใกล้ทางเดินสวนหย่อม', 'en'), 'Near garden pathway');
      assert.strictEqual(localizeRoomNote('แขกเช็คอินช่วงดึก', 'en'), 'Late check-in guest');
      assert.strictEqual(localizeRoomNote('ห้องทำความสะอาดเร่งด่วน', 'en'), 'Priority checkout clean');
      assert.strictEqual(localizeRoomNote('ริมชายหาดวิวทะเล', 'en'), 'Ocean front');
      assert.strictEqual(localizeRoomNote('โซนเงียบสงบ', 'en'), 'Quiet zone');
    });

    it('preserves Thai notes when active locale is Thai', () => {
      assert.strictEqual(localizeRoomNote('ใกล้ทางเดินสวนหย่อม', 'th'), 'ใกล้ทางเดินสวนหย่อม');
      assert.strictEqual(localizeRoomNote('ริมชายหาดวิวทะเล', 'th'), 'ริมชายหาดวิวทะเล');
      assert.strictEqual(localizeRoomNote('โซนเงียบสงบ', 'th'), 'โซนเงียบสงบ');
    });

    it('preserves English notes when active locale is English', () => {
      assert.strictEqual(localizeRoomNote('Near garden pathway', 'en'), 'Near garden pathway');
      assert.strictEqual(localizeRoomNote('Ocean front', 'en'), 'Ocean front');
      assert.strictEqual(localizeRoomNote('Quiet zone', 'en'), 'Quiet zone');
    });

    it('ensures bidirectional reverse mapping exists for all seeded roomNotes', () => {
      for (const [key, thVal] of Object.entries(th)) {
        if (key.startsWith('roomNotes.')) {
          const rawNote = key.replace('roomNotes.', '');
          // Reverse mapping checks in ROOM_NOTES_EN and ROOM_NOTES_TH
          assert.strictEqual(
            ROOM_NOTES_EN[thVal],
            rawNote,
            `ROOM_NOTES_EN['${thVal}'] must equal '${rawNote}'`
          );
          assert.strictEqual(
            ROOM_NOTES_TH[thVal],
            thVal,
            `ROOM_NOTES_TH['${thVal}'] must equal '${thVal}'`
          );
          // Function calls
          assert.strictEqual(localizeRoomNote(thVal, 'en'), rawNote);
          assert.strictEqual(localizeRoomNote(thVal, 'th'), thVal);
          assert.strictEqual(localizeRoomNote(rawNote, 'th'), thVal);
          assert.strictEqual(localizeRoomNote(rawNote, 'en'), rawNote);
        }
      }
    });

    it('preserves custom notes entered in Thai not found in dictionaries as-is', () => {
      const customThai1 = 'แขกขอเตียงเสริมและหมอนเพิ่ม 2 ใบ';
      const customThai2 = 'ระวังน้ำหยดจากระเบียงชั้นบนช่วงฝนตก';
      assert.strictEqual(localizeRoomNote(customThai1, 'th'), customThai1);
      assert.strictEqual(localizeRoomNote(customThai1, 'en'), customThai1);
      assert.strictEqual(localizeRoomNote(customThai2, 'th'), customThai2);
      assert.strictEqual(localizeRoomNote(customThai2, 'en'), customThai2);
    });

    it('preserves custom notes entered in English not found in dictionaries as-is', () => {
      const customEn1 = 'VIP requested champagne setup before 6 PM';
      const customEn2 = 'Keycard reader replaced on Monday';
      assert.strictEqual(localizeRoomNote(customEn1, 'en'), customEn1);
      assert.strictEqual(localizeRoomNote(customEn1, 'th'), customEn1);
      assert.strictEqual(localizeRoomNote(customEn2, 'en'), customEn2);
      assert.strictEqual(localizeRoomNote(customEn2, 'th'), customEn2);
    });

    it('handles empty, null, and whitespace inputs gracefully', () => {
      assert.strictEqual(localizeRoomNote('', 'th'), '');
      assert.strictEqual(localizeRoomNote('', 'en'), '');
      assert.strictEqual(localizeRoomNote('   ', 'th'), '');
      assert.strictEqual(localizeRoomNote('   ', 'en'), '');
      assert.strictEqual(localizeRoomNote(null, 'th'), '');
      assert.strictEqual(localizeRoomNote(undefined, 'en'), '');
      assert.strictEqual(localizeRoomNote('  Quiet zone  ', 'th'), 'โซนเงียบสงบ');
      assert.strictEqual(localizeRoomNote('  โซนเงียบสงบ  ', 'en'), 'Quiet zone');
    });
  });

  describe('2. RoomDetailsModal WYSIWYG Editing & Initialization', () => {
    it('verifies handleStartEditNotes is implemented and pre-fills editedNotes with localized note', () => {
      assert.ok(fs.existsSync(roomDetailsModalPath), 'RoomDetailsModal.tsx should exist');
      const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

      // Verify handleStartEditNotes declaration
      assert.match(
        modalCode,
        /const\s+handleStartEditNotes\s*=\s*\(\)\s*=>\s*\{/,
        'RoomDetailsModal must define handleStartEditNotes'
      );

      // Verify it uses localizeRoomNote with currentNotes and locale
      assert.match(
        modalCode,
        /const\s+initialText\s*=\s*currentNotes\s*\?\s*localizeRoomNote\(currentNotes,\s*locale\)\s*:\s*['"]['"]/,
        'handleStartEditNotes must compute initialText = currentNotes ? localizeRoomNote(currentNotes, locale) : ""'
      );

      // Verify setEditedNotes and setIsEditingNotes are called
      assert.match(
        modalCode,
        /setEditedNotes\(initialText\)/,
        'handleStartEditNotes must setEditedNotes(initialText)'
      );
      assert.match(
        modalCode,
        /setIsEditingNotes\(true\)/,
        'handleStartEditNotes must setIsEditingNotes(true)'
      );
    });

    it('verifies pencil button replaces inline onClick with handleStartEditNotes', () => {
      const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

      // Edit button has onClick={handleStartEditNotes}
      assert.match(
        modalCode,
        /<button[\s\S]*?onClick=\{handleStartEditNotes\}[\s\S]*?<Pencil/,
        'Pencil edit button must bind onClick={handleStartEditNotes}'
      );

      // Inline onClick={setEditedNotes(currentNotes || '')} should no longer be on edit button
      assert.doesNotMatch(
        modalCode,
        /<button[\s\S]*?onClick=\{\(\)\s*=>\s*\{\s*setEditedNotes\(currentNotes[\s\S]*?<Pencil/,
        'Edit button should not use unlocalized inline onClick'
      );
    });

    it('verifies clean initialization when modal opens or room notes change', () => {
      const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

      // State initialization
      assert.match(
        modalCode,
        /const\s*\[isEditingNotes,\s*setIsEditingNotes\]\s*=\s*useState\(false\)/,
        'isEditingNotes should default to false'
      );

      // Effect updates on room, isOpen, and locale
      assert.match(
        modalCode,
        /useEffect\(\(\)\s*=>\s*\{[\s\S]*?setCurrentNotes\(raw\)[\s\S]*?setEditedNotes\(raw\s*\?\s*localizeRoomNote\(raw,\s*locale\)\s*:\s*['"]['"]\)[\s\S]*?setIsEditingNotes\(false\)[\s\S]*?\}\s*,\s*\[room\?\.id,\s*room\?\.notes,\s*isOpen,\s*locale\]\)/,
        'useEffect must cleanly reset currentNotes, editedNotes, and isEditingNotes when room, isOpen, or locale change'
      );

      // Cancel button resets cleanly
      assert.match(
        modalCode,
        /const\s+handleCancelEditNotes\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setEditedNotes\(currentNotes\s*\?\s*localizeRoomNote\(currentNotes,\s*locale\)\s*:\s*['"]['"]\)[\s\S]*?setIsEditingNotes\(false\)/,
        'handleCancelEditNotes must reset editedNotes using localizeRoomNote'
      );
    });
  });

  describe('3. Saving Room Notes Persistence & Toast', () => {
    it('verifies handleSaveNotes trims and persists the exact note text entered', () => {
      const modalCode = fs.readFileSync(roomDetailsModalPath, 'utf-8');

      // Trimming edited notes
      assert.match(
        modalCode,
        /const\s+trimmedNotes\s*=\s*editedNotes\.trim\(\)\s*\|\|\s*null/,
        'handleSaveNotes must trim edited notes or set to null when empty'
      );

      // PATCH endpoint
      assert.match(
        modalCode,
        /apiFetch\s*<.*>\s*\(\s*`\/api\/rooms\/\$\{room\.id\}\/notes`,\s*\{\s*method:\s*['"]PATCH['"],\s*body:\s*JSON\.stringify\(\{\s*notes:\s*trimmedNotes\s*\}\)/,
        'handleSaveNotes must call PATCH /api/rooms/${room.id}/notes with trimmedNotes'
      );

      // Updates currentNotes with the exact saved string
      assert.match(
        modalCode,
        /setCurrentNotes\(trimmedNotes\)/,
        'handleSaveNotes must update currentNotes with trimmedNotes'
      );

      // Shows success toast
      assert.match(
        modalCode,
        /toast\.showSuccess\(\s*t\(['"]notes\.savedTitle['"]\)\s*\|\|\s*['"]บันทึกสำเร็จ['"],\s*t\(['"]notes\.savedDesc['"]\)\s*\|\|\s*['"]อัปเดตบันทึกห้องพักเรียบร้อยแล้ว['"]\s*\)/,
        'handleSaveNotes must show localized success toast'
      );

      // Notifies parent onAction
      assert.match(
        modalCode,
        /onAction\?\.\(['"]refresh['"],\s*\{\s*\.\.\.room,\s*notes:\s*trimmedNotes,\s*\}\)/,
        'handleSaveNotes must notify onAction with updated notes'
      );
    });

    it('simulates WYSIWYG workflow for Thai and English notes', () => {
      // Scenario A: Seed note in DB is "Ocean front", user is in Thai locale
      const dbNote = 'Ocean front';
      const userLocale: 'th' | 'en' = 'th';

      // 1. Initial display shows localized text
      const displayed = localizeRoomNote(dbNote, userLocale);
      assert.strictEqual(displayed, 'ริมชายหาดวิวทะเล');

      // 2. User clicks edit (handleStartEditNotes) -> pre-fills localized text
      const prefilled = dbNote ? localizeRoomNote(dbNote, userLocale) : '';
      assert.strictEqual(prefilled, 'ริมชายหาดวิวทะเล');

      // 3. User appends custom text and saves
      const edited = `${prefilled} (ใกล้สระว่ายน้ำ)`;
      const savedToDb = edited.trim() || null;
      assert.strictEqual(savedToDb, 'ริมชายหาดวิวทะเล (ใกล้สระว่ายน้ำ)');

      // 4. Persistence round-trip: custom note displays as-is in both locales
      assert.strictEqual(localizeRoomNote(savedToDb, 'th'), 'ริมชายหาดวิวทะเล (ใกล้สระว่ายน้ำ)');
      assert.strictEqual(localizeRoomNote(savedToDb, 'en'), 'ริมชายหาดวิวทะเล (ใกล้สระว่ายน้ำ)');

      // Scenario B: User clears notes entirely
      const clearedInput = '   ';
      const clearedSaved = clearedInput.trim() || null;
      assert.strictEqual(clearedSaved, null);
      assert.strictEqual(localizeRoomNote(clearedSaved, 'th'), '');
    });
  });
});

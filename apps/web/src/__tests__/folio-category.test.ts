import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveFolioCategory,
  FolioCategoryBadge,
  FOLIO_CATEGORY_CONFIG,
  FALLBACK_LABELS,
  FOLIO_CATEGORY_ICONS,
  FolioCategoryKey,
} from '../lib/folioCategory';

describe('Task 3: Folio Category Resolution & Badge Component', () => {
  it('detects category directly from item.category, item.itemType, item.item_type, or item.type', () => {
    // direct item.category
    assert.strictEqual(resolveFolioCategory({ category: 'room' }).key, 'room');
    assert.strictEqual(resolveFolioCategory({ category: 'minibar' }).key, 'minibar');
    assert.strictEqual(resolveFolioCategory({ category: 'service' }).key, 'service');
    assert.strictEqual(resolveFolioCategory({ category: 'laundry' }).key, 'laundry');
    assert.strictEqual(resolveFolioCategory({ category: 'damage' }).key, 'damage');

    // direct item.itemType
    assert.strictEqual(resolveFolioCategory({ itemType: 'minibar' }).key, 'minibar');
    assert.strictEqual(resolveFolioCategory({ itemType: 'room' }).key, 'room');
    assert.strictEqual(resolveFolioCategory({ itemType: 'service' }).key, 'service');

    // direct item.item_type
    assert.strictEqual(resolveFolioCategory({ item_type: 'laundry' }).key, 'laundry');
    assert.strictEqual(resolveFolioCategory({ item_type: 'damage' }).key, 'damage');

    // direct item.type
    assert.strictEqual(resolveFolioCategory({ type: 'room' }).key, 'room');
    assert.strictEqual(resolveFolioCategory({ type: 'service' }).key, 'service');

    // case insensitivity and whitespace handling
    assert.strictEqual(resolveFolioCategory({ category: '  MINIBAR  ' }).key, 'minibar');
    assert.strictEqual(resolveFolioCategory({ category: 'ROOM' }).key, 'room');
  });

  it('correctly maps synonyms such as amenity and amenities to service', () => {
    assert.strictEqual(resolveFolioCategory({ category: 'amenity' }).key, 'service');
    assert.strictEqual(resolveFolioCategory({ itemType: 'amenities' }).key, 'service');
  });

  it('deduces category from description when category is missing, null, undefined, or other', () => {
    // Room keywords: room, night, ห้อง, คืน
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'Room charge' }).key,
      'room'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: 'other', description: 'Deluxe Room (2 nights)' }).key,
      'room'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: null, description: 'ค่าห้องพัก 1 คืน' }).key,
      'room'
    );

    // Minibar keywords: beer, water, coke, minibar, ถั่ว, เบียร์, น้ำดื่ม, เครื่องดื่ม, snack
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'Heineken Beer' }).key,
      'minibar'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: 'other', description: 'Drinking Water bottle' }).key,
      'minibar'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: null, description: 'น้ำดื่มช้าง' }).key,
      'minibar'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'Coke Can 325ml' }).key,
      'minibar'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'ถั่วอบกรอบ snack' }).key,
      'minibar'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'เบียร์สิงห์' }).key,
      'minibar'
    );

    // Service keywords: bed, pillow, towel, เตียง, หมอน, ผ้า, amenity, service, ของใช้
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'Extra Bed' }).key,
      'service'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: 'other', description: 'Extra pillow request' }).key,
      'service'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: null, description: 'เตียงเสริมพร้อมอาหารเช้า' }).key,
      'service'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'ผ้าเช็ดตัวเพิ่ม' }).key,
      'service'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'Additional amenity set' }).key,
      'service'
    );

    // Laundry keywords: laundry, ซัก, รีด
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'Express Laundry Service' }).key,
      'laundry'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: null, description: 'ซักรีดเสื้อเชิ้ต' }).key,
      'laundry'
    );

    // Damage keywords: damage, broken, เสีย, ชดเชย, ปรับ
    assert.strictEqual(
      resolveFolioCategory({ category: undefined, description: 'Broken glass compensation' }).key,
      'damage'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: null, description: 'ค่าปรับคีย์การ์ดสูญหาย' }).key,
      'damage'
    );
    assert.strictEqual(
      resolveFolioCategory({ category: 'other', description: 'Damaged bath towel' }).key,
      'damage'
    );
  });

  it('safely resolves null, undefined, empty, or unclassifiable items without causing category.undefined', () => {
    const unclassifiableItems = [
      null,
      undefined,
      {},
      { category: null },
      { category: undefined },
      { category: 'undefined' },
      { category: 'null' },
      { category: '' },
      { category: 'other', description: '' },
      { category: 'other', description: 'Random unidentified fee' },
    ];

    for (const item of unclassifiableItems) {
      const res = resolveFolioCategory(item);
      assert.ok(res, 'Must return a category info object');
      assert.strictEqual(res.key, 'other', 'Should safely default to other');
      assert.strictEqual(res.labelKey, 'category.other');
      assert.notStrictEqual(res.labelKey, 'category.undefined');
      assert.strictEqual(res.iconName, 'Receipt');
      assert.strictEqual(res.badgeClass, 'bg-slate-100 text-slate-700 border-slate-200');
    }
  });

  it('returns required badgeClass and iconName for each category key', () => {
    const expectedStyles: Record<
      FolioCategoryKey,
      { badgeClass: string; iconName: string; labelKey: string }
    > = {
      room: {
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        iconName: 'BedDouble',
        labelKey: 'category.room',
      },
      minibar: {
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        iconName: 'Coffee',
        labelKey: 'category.minibar',
      },
      service: {
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconName: 'Sparkles',
        labelKey: 'category.service',
      },
      laundry: {
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconName: 'Shirt',
        labelKey: 'category.laundry',
      },
      damage: {
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        iconName: 'AlertTriangle',
        labelKey: 'category.damage',
      },
      other: {
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        iconName: 'Receipt',
        labelKey: 'category.other',
      },
    };

    for (const [key, expected] of Object.entries(expectedStyles) as [
      FolioCategoryKey,
      typeof expectedStyles[FolioCategoryKey],
    ][]) {
      const config = FOLIO_CATEGORY_CONFIG[key];
      assert.strictEqual(config.badgeClass, expected.badgeClass);
      assert.strictEqual(config.iconName, expected.iconName);
      assert.strictEqual(config.labelKey, expected.labelKey);
      assert.ok(FOLIO_CATEGORY_ICONS[config.iconName], `Lucide icon ${config.iconName} must exist`);
      assert.ok(FALLBACK_LABELS[key], `Fallback label for ${key} must exist`);
    }
  });

  it('verifies CheckOutModal embeds FolioCategoryBadge in folio table and eliminates category.undefined', () => {
    const checkOutModalPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/CheckOutModal.tsx'
    );
    const code = fs.readFileSync(checkOutModalPath, 'utf-8');

    // Imports FolioCategoryBadge
    assert.match(code, /import\s+\{[^}]*FolioCategoryBadge[^}]*\}\s+from\s+['"]@\/lib\/folioCategory['"]/);

    // Embeds FolioCategoryBadge
    assert.match(code, /<FolioCategoryBadge\s+item=\{item\}\s*\/>/);

    // Does NOT render legacy `category.${item.category}`
    assert.doesNotMatch(code, /category\.\$\{item\.category\}/);
  });

  it('verifies FolioSplitScreen embeds FolioCategoryBadge in items table column', () => {
    const folioSplitPath = path.resolve(
      process.cwd(),
      'apps/web/src/components/front-desk/FolioSplitScreen.tsx'
    );
    const code = fs.readFileSync(folioSplitPath, 'utf-8');

    // Imports FolioCategoryBadge
    assert.match(
      code,
      /import\s+\{[^}]*FolioCategoryBadge[^}]*\}\s+from\s+['"](?:\.\.\/\.\.\/|@\/)lib\/folioCategory['"]/
    );

    // Embeds FolioCategoryBadge
    assert.match(code, /<FolioCategoryBadge\s+item=\{it\}\s*\/>/);

    // Column header for category exists
    assert.match(code, /<th[^>]*>\{t\('folio\.category'\)\}<\/th>/);
  });
});

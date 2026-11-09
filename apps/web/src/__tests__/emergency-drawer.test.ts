import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { FALLBACK_EMERGENCY_CONTACTS } from '../hooks/useOutsourceContacts';
import { th } from '../locales/th';
import { en } from '../locales/en';

describe('Quick Emergency Contact Drawer (UAT-FD07)', () => {
  it('provides seeded fallback emergency contacts for 24h reliability', () => {
    assert.strictEqual(FALLBACK_EMERGENCY_CONTACTS.length >= 4, true);

    const air = FALLBACK_EMERGENCY_CONTACTS.find((c) => c.category === 'air_conditioning');
    assert.strictEqual(air?.isEmergency, true);
    assert.match(air?.phonePrimary || '', /^08/);

    const plumbing = FALLBACK_EMERGENCY_CONTACTS.find((c) => c.category === 'plumbing');
    assert.strictEqual(plumbing?.isEmergency, true);
    assert.ok(plumbing?.phonePrimary);

    const electrical = FALLBACK_EMERGENCY_CONTACTS.find((c) => c.category === 'electrical');
    assert.strictEqual(electrical?.isEmergency, true);
    assert.ok(electrical?.phonePrimary);

    const locksmith = FALLBACK_EMERGENCY_CONTACTS.find((c) => c.category === 'locksmith');
    assert.strictEqual(locksmith?.isEmergency, true);
    assert.ok(locksmith?.phonePrimary);
  });

  it('incorporates emergency contact button and drawer in FrontDeskLayout', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/FrontDeskLayout.tsx'), 'utf-8');
    assert.match(code, /QuickEmergencyDrawer/);
    assert.match(code, /isEmergencyOpen/);
  });

  it('contains emergency translation keys with 1:1 parity between th and en', () => {
    const requiredKeys = [
      'emergency.buttonTitle',
      'emergency.drawerTitle',
      'emergency.badge24h',
      'emergency.clickToCall',
      'emergency.copyLine',
      'emergency.copied',
      'emergency.categoryAll',
      'emergency.categoryAir',
      'emergency.categoryPlumbing',
      'emergency.categoryElectrical',
      'emergency.categoryLocksmith',
    ];

    for (const key of requiredKeys) {
      assert.ok(th[key], `Missing key in th: ${key}`);
      assert.ok(en[key], `Missing key in en: ${key}`);
    }
  });

  it('verifies QuickEmergencyDrawer implements tel: links and line copying', () => {
    const drawerCode = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/src/components/front-desk/QuickEmergencyDrawer.tsx'), 'utf-8');
    assert.match(drawerCode, /tel:/);
    assert.match(drawerCode, /navigator\.clipboard\.writeText/);
  });
});

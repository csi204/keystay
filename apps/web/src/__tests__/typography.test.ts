import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Design System Typography & Styling', () => {
  it('includes IBM Plex Sans Thai in index.html Google Fonts link', () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/index.html'), 'utf-8');
    assert.match(html, /IBM\+Plex\+Sans\+Thai/);
  });

  it('configures IBM Plex Sans Thai in tailwind.config.ts font family', () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/tailwind.config.ts'), 'utf-8');
    assert.match(config, /IBM Plex Sans Thai/);
  });

  it('configures elevation shadow tokens in tailwind.config.ts', () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/tailwind.config.ts'), 'utf-8');
    assert.match(config, /'elevation-sm'/);
    assert.match(config, /'elevation-md'/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, 'med-pharm-profile-render-helpers.mjs'), 'utf8');

// buildMedPharmNameRow builds the med-pharm-name cell via DOM API (createElement +
// textContent), not an HTML string — the med calendar CSS-truncates it in compact
// mode. Setting `.title` as a DOM property needs no HTML-escaping (it isn't parsed
// as markup), unlike the string-concatenation sites elsewhere in WU10.
describe('buildMedPharmNameRow', () => {
  it('sets .title on the name cell right after .textContent (CSS-truncated med name)', () => {
    const start = src.indexOf('function buildMedPharmNameRow');
    const end = src.indexOf('function', start + 30);
    const fn = src.slice(start, end);
    assert.match(fn, /nameEl\.textContent = group\.med \|\| '';\s*\n\s*nameEl\.title = group\.med \|\| '';/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'cloud-census-collect.mjs'),
  'utf8'
);

describe('cloud-census-collect', () => {
  it('builds entries via patients-modal-commit (not LAN runtime stub)', () => {
    assert.match(src, /patients-modal-commit/);
    assert.match(src, /buildPatientEntry/);
    assert.doesNotMatch(src, /collectPatientEntriesForLanSync/);
  });

  it('applies team scope for non-elevated cloud push', () => {
    assert.match(src, /filterPatientEntriesForLanTeamScope/);
    assert.match(src, /shouldUseElevatedPatientCensus/);
  });
});

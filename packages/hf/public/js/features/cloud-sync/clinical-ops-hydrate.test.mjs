import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'clinical-ops-hydrate.mjs'),
  'utf8'
);

describe('clinical-ops-hydrate', () => {
  it('reloads scopeContext assignments before refreshing the patient list', () => {
    assert.match(src, /fetchClinicalScopeContextFromDb/);
    assert.match(src, /fetchClinicalTeamsFromDb/);
    assert.match(src, /renderPatientList/);
    const scopeIdx = src.indexOf('fetchClinicalScopeContextFromDb');
    const listIdx = src.indexOf('renderPatientList');
    assert.ok(scopeIdx >= 0 && listIdx > scopeIdx);
  });
});

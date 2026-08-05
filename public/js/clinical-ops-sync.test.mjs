import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clinicalOpsMergeHadChanges } from './clinical-ops-sync.mjs';
import * as lanShim from './clinical-ops-lan.mjs';

const dir = dirname(fileURLToPath(import.meta.url));

describe('clinical-ops-sync', () => {
  it('clinicalOpsMergeHadChanges is false for empty or zero stats', () => {
    assert.equal(clinicalOpsMergeHadChanges(null), false);
    assert.equal(clinicalOpsMergeHadChanges({ usersInserted: 0, usersUpdated: 0 }), false);
  });

  it('clinicalOpsMergeHadChanges is true when any counter is positive', () => {
    assert.equal(clinicalOpsMergeHadChanges({ usersUpdated: 1 }), true);
    assert.equal(clinicalOpsMergeHadChanges({ stubsCreated: 2 }), true);
  });

  it('clinical-ops-lan.mjs is a re-export shim of clinical-ops-sync', () => {
    const shimSrc = readFileSync(join(dir, 'clinical-ops-lan.mjs'), 'utf8');
    assert.match(shimSrc, /clinical-ops-sync\.mjs/);
    assert.equal(typeof lanShim.clinicalOpsMergeHadChanges, 'function');
    assert.equal(lanShim.clinicalOpsMergeHadChanges({ usersUpdated: 1 }), true);
  });
});

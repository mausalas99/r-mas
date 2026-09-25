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

  it('scopes the raw patient list before building any per-patient entry (never builds out-of-scope entries)', () => {
    assert.match(src, /scopePatientsForCloudPush/);
    const fnStart = src.indexOf('export async function collectPatientEntriesForCloudPush');
    assert.ok(fnStart > -1, 'collectPatientEntriesForCloudPush not found');
    const fnBody = src.slice(fnStart, fnStart + 300);
    const scopeIdx = fnBody.indexOf('scopePatientsForCloudPush');
    const buildIdx = fnBody.indexOf('buildLocalPatientEntries');
    assert.ok(scopeIdx > -1 && buildIdx > -1, 'expected both calls in collectPatientEntriesForCloudPush');
    assert.ok(scopeIdx < buildIdx, 'scoping must run before building entries');
  });

  it('always pushes a just-admitted local patient even if it does not yet structurally match our own team', () => {
    const fnStart = src.indexOf('function scopePatientsForCloudPush');
    assert.ok(fnStart > -1);
    const fnBody = src.slice(fnStart, fnStart + 900);
    assert.match(fnBody, /isFreshLocalAdmission/);
    assert.match(fnBody, /allowedIds\.has\(p\.id\) \|\| isFreshLocalAdmission\(p\)/);
  });

  it('splits the census by active Filtros so backfill can prioritize what the sidebar shows', () => {
    assert.match(src, /export function scopePatientsForCloudPushSplitByFilters/);
    assert.match(src, /filterPatientsForGuardiaCensus/);
    assert.match(src, /censusFiltersAreActive/);
    // No active filter → everything is priority, nothing deferred.
    assert.match(src, /if \(!censusFiltersAreActive\(\)\) return \{ priority: patients, remaining: \[\] \};/);
  });
});

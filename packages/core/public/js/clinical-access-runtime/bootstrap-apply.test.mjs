import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { applyBootstrapResult } from './bootstrap-apply.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, 'bootstrap-apply.mjs'), 'utf8');

test('refreshBootstrapScopeAndCensus renders from what is on-device right after teams/scope resolve, before the LAN ward pull', () => {
  const start = src.indexOf('async function refreshBootstrapScopeAndCensus');
  const end = src.indexOf('hasElevatedTeamPrivileges', start);
  assert.ok(start >= 0 && end > start);
  const fn = src.slice(start, end);
  assert.match(fn, /refreshClinicalPatientListForScope\(\{\s*allowLanPull:\s*false\s*\}\)/);
});

test('applyBootstrapResult runs the profile chain and the teams/scope chain concurrently, each staying internally ordered', async () => {
  const prevWindow = globalThis.window;
  const prevLocalStorage = globalThis.localStorage;
  const calls = [];
  const store = new Map();
  const mockStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.localStorage = mockStorage;
  globalThis.window = {
    localStorage: mockStorage,
    rplusDb: {
      dbClinicalProfileGet: async ({ userId }) => {
        calls.push('profile');
        return { profile: { rank: 'R2', sala: 's1', clinical_name: 'Doc', is_program_admin: 0 } };
      },
      dbClinicalTeamsList: async () => {
        calls.push('teams');
        return { ok: true, teams: [{ team_id: 'plain' }] };
      },
      dbClinicalScopeContext: async ({ userId }) => {
        calls.push('scope');
        return { ok: true, context: { teams: [{ team_id: 'scoped' }] } };
      },
    },
  };
  clinicalSessionContext.user = null;
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;

  try {
    await applyBootstrapResult({
      user: { userId: 'u1', username: 'doc1', rank: 'R1', isProgramAdmin: false, publicKeyPem: null },
      guardias: [],
      orphans: [],
    });

    // Both chains kick off before either finishes: the first two calls are the
    // first step of each (order-independent between them), not the whole
    // profile chain completing before teams/scope starts.
    assert.deepEqual(new Set(calls.slice(0, 2)), new Set(['profile', 'teams']));
    // Profile row read twice (merge, then refresh) — stays sequential.
    assert.equal(calls.filter((c) => c === 'profile').length, 2);
    // Scope always follows teams — its team list must be the one left standing.
    assert.ok(calls.indexOf('teams') < calls.indexOf('scope'));
    assert.deepEqual(clinicalSessionContext.teams, [{ team_id: 'scoped' }]);
  } finally {
    clinicalSessionContext.user = null;
    clinicalSessionContext.teams = [];
    clinicalSessionContext.scopeContext = null;
    if (prevWindow) globalThis.window = prevWindow;
    else delete globalThis.window;
    if (prevLocalStorage) globalThis.localStorage = prevLocalStorage;
    else delete globalThis.localStorage;
  }
});

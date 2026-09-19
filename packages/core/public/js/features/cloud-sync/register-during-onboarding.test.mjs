import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

describe('registerCloudDuringOnboarding', () => {
  const src = readFileSync(join(dir, 'register-during-onboarding.mjs'), 'utf8');

  it('always pulls from Nube after ensure-turn (not only when revision > 0)', () => {
    assert.match(src, /client\.pull\(roomId,\s*0\)/);
    assert.doesNotMatch(src, /if \(revision > 0\)/);
  });

  it('hydrates teams after cloud pull', () => {
    assert.match(src, /hydrateClinicalTeamsAfterCloudPull/);
  });

  it('persists room snapshot (incl. código) during ensure-turn', () => {
    assert.match(src, /setCloudSyncRoomSnapshot/);
    assert.match(src, /setCloudSyncRoomSnapshot,\s*\n\s*setCloudSyncRevision/);
  });

  it('starts shared Nube runtime (api wired via startSharedNubeRuntime, not bare getApi on cycle)', () => {
    assert.match(src, /startSharedNubeRuntime/);
    assert.doesNotMatch(src, /startCloudSyncRuntime/);
  });
});

describe('clinical-ops-hydrate', () => {
  const src = readFileSync(join(dir, 'clinical-ops-hydrate.mjs'), 'utf8');

  it('refreshes DB teams and dispatches change events', () => {
    assert.match(src, /fetchClinicalTeamsFromDb/);
    assert.match(src, /rpc-clinical-teams-changed/);
    assert.doesNotMatch(src, /rpc-clinical-ops-synced/);
  });
});

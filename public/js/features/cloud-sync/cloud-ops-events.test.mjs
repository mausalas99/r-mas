import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'cloud-ops-events.mjs'), 'utf8');

describe('cloud-ops-events', () => {
  it('wires teams-changed to sala-scoped cloud clinical-ops push when Nube active', () => {
    assert.match(src, /export function wireCloudClinicalOpsSyncEvents/);
    assert.match(src, /isCloudSyncActive/);
    assert.match(src, /rpc-clinical-teams-changed[\s\S]*pushClinicalOpsForSala/);
    assert.match(src, /maybeScheduleCloudSyncPush/);
    assert.match(src, /cloud-hydrate/);
  });

  it('optionally refreshes teams on clinical-ops-synced without LAN panel', () => {
    assert.match(src, /refreshClinicalSessionTeams/);
    assert.doesNotMatch(src, /renderLanPanel/);
    assert.doesNotMatch(src, /pushClinicalOpsLanNow/);
  });
});

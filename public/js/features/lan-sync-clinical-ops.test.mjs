import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const lanSyncSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'lan-sync.mjs'),
  'utf8'
);
const clinicalOpsLanSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../clinical-ops-lan.mjs'),
  'utf8'
);

describe('lan-sync clinical ops', () => {
  it('exports prepareClinicalOpsForLanSync helper', () => {
    assert.match(clinicalOpsLanSrc, /export async function prepareClinicalOpsForLanSync/);
  });

  it('refreshes clinical ops before building LiveSync bundles', () => {
    assert.match(lanSyncSrc, /async function buildLiveSyncBundleEnvelope/);
    assert.match(lanSyncSrc, /await prepareClinicalOpsForLanSync\(\)/);
  });

  it('includes local clinicalOps when merging peer bundles', () => {
    assert.match(lanSyncSrc, /function buildLiveSyncLocalMergeSource/);
    assert.match(lanSyncSrc, /buildLiveSyncLocalMergeSource\(\)/);
  });

  it('pushes clinical ops after joining a room', () => {
    assert.match(lanSyncSrc, /syncLiveSyncAfterRoomJoin[\s\S]*scheduleLiveSyncPush\(\)/);
  });

  it('shows toast when clinical ops merge fails', () => {
    assert.match(lanSyncSrc, /No se pudieron sincronizar equipos ni usuarios LAN/);
  });
});

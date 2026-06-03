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

  it('exports immediate clinical ops push after @usuario registration', () => {
    assert.match(lanSyncSrc, /export async function pushClinicalOpsLanNow/);
  });

  it('mints a fresh LAN ticket when copying iPad or invite links', () => {
    assert.match(lanSyncSrc, /ensureLanPairingForShare\(\{ forceNew: true \}\)/);
  });
});

describe('clinical-profile-lan-sync', () => {
  const profileLanSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../clinical-profile-lan-sync.mjs'),
    'utf8'
  );

  it('gates username register when LAN is configured without a room', () => {
    assert.match(profileLanSrc, /assertLanRoomForUsernameRegister/);
    assert.match(profileLanSrc, /LAN_USERNAME_REGISTER_REQUIRES_ROOM_MSG/);
  });

  it('applies invite URL before username gate', () => {
    assert.match(profileLanSrc, /applyPendingLanInviteFromPage/);
    assert.match(profileLanSrc, /parseLanJoinQuery/);
  });
});

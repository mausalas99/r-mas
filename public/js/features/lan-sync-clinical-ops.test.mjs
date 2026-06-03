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

  it('always attaches fresh clinicalOps on immediate profile push', () => {
    assert.match(lanSyncSrc, /envelope\.clinicalOps = snap/);
    assert.doesNotMatch(lanSyncSrc, /if \(!liveSyncBundleHasPayload\(envelope\)\) \{\s*envelope\.clinicalOps = snap/);
  });

  it('directory refresh uses sticky room membership when active room is empty', () => {
    assert.match(lanSyncSrc, /function ensureEffectiveLiveSyncRoomId/);
    assert.match(lanSyncSrc, /refreshLanClinicalDirectoryFromRoom[\s\S]*ensureEffectiveLiveSyncRoomId/);
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

  it('does not block username register when LAN has no room', () => {
    assert.match(profileLanSrc, /assertLanRoomForUsernameRegister/);
    assert.match(profileLanSrc, /allowed: true/);
    assert.doesNotMatch(profileLanSrc, /allowed: false,\s*lanConfigured: true,\s*code: 'NO_ROOM'/);
  });

  it('applies invite URL before username gate', () => {
    assert.match(profileLanSrc, /applyPendingLanInviteFromPage/);
    assert.match(profileLanSrc, /parseLanJoinQuery/);
  });

  it('resolves LiveSync room from clinical Sala when LAN is available (optional)', () => {
    assert.match(profileLanSrc, /ensureLiveSyncRoomForUsernameRegister/);
    assert.match(profileLanSrc, /resolveLiveSyncRoomIdFromSala\(opts\.sala\)/);
    assert.match(profileLanSrc, /isBenignLanPushSkipCode/);
  });
});

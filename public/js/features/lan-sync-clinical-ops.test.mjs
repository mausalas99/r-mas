import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const lanSyncSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'lan-sync.mjs'), 'utf8');
const lanSyncRoomSrc = readFileSync(join(jsDir, 'lan-sync-room.mjs'), 'utf8');
const lanSyncTransportSrc = readFileSync(join(jsDir, 'lan-sync-transport.mjs'), 'utf8');
const lanSyncPanelSrc = readFileSync(join(jsDir, 'lan-sync-panel.mjs'), 'utf8');
const lanSyncFeatureSrc =
  lanSyncSrc + '\n' + lanSyncRoomSrc + '\n' + lanSyncTransportSrc + '\n' + lanSyncPanelSrc;
const lanSyncPushSrc = readFileSync(join(jsDir, 'lan-sync-push.mjs'), 'utf8');
const lanSyncPushAndFeatureSrc = lanSyncFeatureSrc + '\n' + lanSyncPushSrc;
const clinicalOpsLanSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../clinical-ops-lan.mjs'),
  'utf8'
);

describe('lan-sync clinical ops', () => {
  it('exports prepareClinicalOpsForLanSync helper', () => {
    assert.match(clinicalOpsLanSrc, /export async function prepareClinicalOpsForLanSync/);
  });

  it('refreshes clinical ops before building LiveSync bundles', () => {
    assert.match(lanSyncRoomSrc, /async function buildLiveSyncBundleEnvelope/);
    assert.match(lanSyncRoomSrc, /await prepareClinicalOpsForLanSync\(\)/);
  });

  it('includes local clinicalOps when merging peer bundles', () => {
    assert.match(lanSyncFeatureSrc, /function buildLiveSyncLocalMergeSource/);
    assert.match(lanSyncFeatureSrc, /buildLiveSyncLocalMergeSource\(\)/);
  });

  it('pushes clinical ops after joining a room', () => {
    assert.match(lanSyncRoomSrc, /syncLiveSyncAfterRoomJoin[\s\S]*scheduleLiveSyncPush\(\)/);
  });

  it('shows toast when clinical ops merge fails', () => {
    assert.match(lanSyncSrc, /No se pudieron sincronizar equipos ni usuarios LAN/);
  });

  it('exports immediate clinical ops push after @usuario registration', () => {
    assert.match(lanSyncPushSrc, /export async function pushClinicalOpsLanNow/);
    assert.match(lanSyncSrc, /pushClinicalOpsLanNow/);
  });

  it('always attaches fresh clinicalOps on immediate profile push', () => {
    assert.match(lanSyncPushSrc, /envelope\.clinicalOps = snap/);
    assert.doesNotMatch(
      lanSyncPushSrc,
      /if \(!liveSyncBundleHasPayload\(envelope\)\) \{\s*envelope\.clinicalOps = snap/
    );
  });

  it('directory refresh uses sticky room membership when active room is empty', () => {
    assert.match(lanSyncPushSrc, /export function ensureEffectiveLiveSyncRoomId/);
    assert.match(lanSyncRoomSrc, /refreshLanClinicalDirectoryFromRoom[\s\S]*ensureEffectiveLiveSyncRoomId/);
  });

  it('mints a fresh LAN ticket when copying iPad or invite links', () => {
    assert.match(lanSyncPanelSrc, /ensureLanPairingForShare\(\{ forceNew: true \}\)/);
  });

  it('does not reconnect live WS inside pushClinicalOpsLanNow', () => {
    assert.match(lanSyncPushSrc, /export function sendLiveBundleIfOpen/);
    assert.match(lanSyncPushSrc, /pushedLive = sendLiveBundleIfOpen\(roomId, envelope\)/);
    assert.doesNotMatch(
      lanSyncPushAndFeatureSrc,
      /if \(lanClient\.liveConnected\)[\s\S]{0,120}connectLiveChannel\(roomId\)/
    );
  });

  it('returns structured channels from pushClinicalOpsLanNow', () => {
    assert.match(lanSyncPushSrc, /export function lanPushResult/);
    assert.match(
      lanSyncPushSrc,
      /lanPushResult\(true, undefined, \{ http: !!okHttp, live: pushedLive \}\)/
    );
    assert.match(lanSyncPushSrc, /\/clinical-ops/);
  });

  it('uses HTTP-primary debounced push without WS bundle', () => {
    assert.match(lanSyncPushSrc, /HTTP sync-bundle is authoritative/);
    assert.doesNotMatch(
      lanSyncPushSrc,
      /scheduleLiveSyncPush[\s\S]{0,400}lanClient\.sendLive\(bundle\)/
    );
  });

  it('handles livesync revision hints from peers', () => {
    assert.match(lanSyncPushAndFeatureSrc, /livesync:revision/);
    assert.match(lanSyncPushAndFeatureSrc, /scheduleReconcileFromRevisionHint/);
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

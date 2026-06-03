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
const clinicalTeamsSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'clinical-teams.mjs'),
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

  it('debounced push uses sticky room membership like profile push', () => {
    assert.match(
      lanSyncPushSrc,
      /export function scheduleLiveSyncPush\(\) \{[\s\S]*ensureEffectiveLiveSyncRoomId\(\)/
    );
    assert.doesNotMatch(
      lanSyncPushSrc,
      /export function scheduleLiveSyncPush\(\) \{\s*if \(!activeLiveSyncRoomId\) return;/
    );
  });

  it('revision hints reconcile when room matches membership without active room', () => {
    assert.match(lanSyncPushSrc, /liveSyncRoomIdIsRelevant/);
    assert.match(
      lanSyncPushSrc,
      /scheduleReconcileFromRevisionHint[\s\S]*liveSyncRoomIdIsRelevant/
    );
  });

  it('team changes trigger immediate clinical-ops push not only debounced bundle', () => {
    assert.match(
      lanSyncPanelSrc,
      /rpc-clinical-teams-changed[\s\S]*pushClinicalOpsLanNow/
    );
  });

  it('Mi rotación pulls clinical ops from host before listing teams', () => {
    assert.match(clinicalTeamsSrc, /renderClinicalTeamsPanelInto[\s\S]*pullClinicalOpsFromLanRoom/);
  });

  it('handles livesync revision hints from peers', () => {
    assert.match(lanSyncPushAndFeatureSrc, /livesync:revision/);
    assert.match(lanSyncPushAndFeatureSrc, /scheduleReconcileFromRevisionHint/);
  });

  it('shows conflict drafts in LAN panel after host pin section', () => {
    assert.match(lanSyncPanelSrc, /appendLanConflictDraftsSection/);
    assert.match(lanSyncFeatureSrc, /registerLanSyncPanelRuntime[\s\S]*appendLanConflictDraftsSection/);
  });

  it('waits for live WS before reconcile on boot and join', () => {
    assert.match(lanSyncRoomSrc, /waitForLiveChannelOpen/);
    assert.match(lanSyncRoomSrc, /bootLanRoomMembership[\s\S]*waitForLiveChannelOpen[\s\S]*syncLiveSyncAfterRoomJoin/);
    assert.match(lanSyncRoomSrc, /joinLanRoom[\s\S]*waitForLiveChannelOpen[\s\S]*syncLiveSyncAfterRoomJoin/);
  });

  it('auto-joins sala from settings on boot when membership is absent', () => {
    assert.match(
      lanSyncTransportSrc,
      /initLanClientFromStorage[\s\S]*resolveAutoJoinRoomId[\s\S]*joinLanRoom/
    );
  });

  it('reconnect loop resyncs once per session when live WS already open', () => {
    assert.match(lanSyncRoomSrc, /_liveSyncSessionResyncDone/);
    assert.match(
      lanSyncRoomSrc,
      /liveConnected[\s\S]*_liveSyncSessionResyncDone[\s\S]*syncLiveSyncAfterRoomJoin/
    );
  });

  it('records sync-bundle failures in diagnostics lastErrors', () => {
    assert.match(lanSyncPushSrc, /recordLanSyncError[\s\S]*sync-bundle/);
  });

  it('dedupes room-bundle drafts per sala before saving another', () => {
    assert.match(lanSyncPushSrc, /clearRoomBundleDrafts\(rid\)/);
  });

  it('auto-accepts clinicalOps-only bundle 409 without saving heavy drafts', () => {
    assert.match(lanSyncPushSrc, /acceptServerBundleConflict/);
    assert.match(lanSyncPushSrc, /bundleConflictsAreClinicalOpsOnly/);
    assert.match(lanSyncPushSrc, /pauseBundlePushForRoom/);
    assert.doesNotMatch(
      lanSyncPushSrc,
      /saveDraftConflict\([\s\S]{0,200}localBundle:/
    );
  });

  it('pauses debounced bundle push while cooldown active', () => {
    assert.match(lanSyncPushSrc, /isBundlePushPaused\(roomId\)/);
  });

  it('does not re-enqueue bundle after handled 409', () => {
    assert.match(lanSyncPushSrc, /BUNDLE_PUSH_HANDLED/);
    assert.match(
      lanSyncPushSrc,
      /pushResult !== true[\s\S]*pushResult !== BUNDLE_PUSH_HANDLED[\s\S]*enqueueOutbox/
    );
  });

  it('exports clinical directory refresh for Mi rotación directorio', () => {
    assert.match(lanSyncFeatureSrc, /export[\s\S]*refreshLanClinicalDirectoryFromRoom/);
    assert.match(lanSyncFeatureSrc, /fetchAndApplyClinicalOpsFromHost/);
  });

  it('pushClinicalOpsLanNow does not fall back to pushRoomSyncBundleToHost', () => {
    const start = lanSyncPushSrc.indexOf('export async function pushClinicalOpsLanNow');
    assert.ok(start >= 0);
    const end = lanSyncPushSrc.indexOf('export async function reconcileLiveSyncRoom', start);
    const body = lanSyncPushSrc.slice(start, end);
    assert.doesNotMatch(body, /pushRoomSyncBundleToHost/);
  });

  it('flushLiveSyncOutbox drains clinical_ops and aborts on first failure', () => {
    assert.match(lanSyncPushSrc, /pushClinicalOpsPayloadToHost/);
    assert.match(lanSyncPushSrc, /drainFromIndex/);
    assert.match(lanSyncPushSrc, /reenqueueSlice\(sorted\.slice\(index\)\)/);
  });

  it('clinical-ops 409 returns CONFLICT_RESOLVED success', () => {
    assert.match(lanSyncPushSrc, /CONFLICT_RESOLVED/);
    assert.match(
      lanSyncPushSrc,
      /resolveClinicalOps409[\s\S]*lanPushResult\(true,\s*'CONFLICT_RESOLVED'/
    );
  });

  it('outbox clinical-ops push handles 409 without re-enqueue loop', () => {
    assert.match(lanSyncPushSrc, /resolveClinicalOps409/);
    assert.match(lanSyncPushSrc, /ensureClinicalOpsPushRevision/);
    assert.match(lanSyncPushSrc, /CLINICAL_OPS_HANDLED/);
  });

  it('clinical-ops enqueue returns QUEUED deferred success', () => {
    assert.match(lanSyncPushSrc, /kind:\s*'clinical_ops'/);
    assert.match(lanSyncPushSrc, /lanPushResult\(true,\s*'QUEUED'/);
  });

  it('reconcile wraps fetchAndApplyClinicalOpsFromHost in try/catch', () => {
    assert.match(lanSyncPushSrc, /catch \(_eOps\)/);
    assert.match(lanSyncPushSrc, /fetchAndApplyClinicalOpsFromHost/);
  });

  it('push bridge wires fetchAndApplyClinicalOpsFromHost', () => {
    assert.match(lanSyncFeatureSrc, /registerLanSyncPushBridge\([\s\S]*fetchAndApplyClinicalOpsFromHost/);
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

/**
 * Contract tests: LAN ward-ready features are wired (called), not only defined.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsRoot = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(jsRoot, rel), 'utf8');

const lanSyncFeature = read('features/lan/orchestrator.mjs');
const lanSyncPush = read('features/lan/push.mjs');
const lanSyncRoom = read('features/lan/room.mjs');
const lanSyncPanel = read('features/lan/panel.mjs');
function readClinicalTeamsSources() {
  const dir = join(jsRoot, 'features/clinical-teams');
  return readFileSync(join(dir, 'index.mjs'), 'utf8')
    + '\n'
    + readFileSync(join(dir, 'teams-roster.mjs'), 'utf8')
    + '\n'
    + readFileSync(join(dir, 'teams-invite.mjs'), 'utf8');
}
const clinicalTeams = readClinicalTeamsSources();
const appJs = read('app.js');

describe('LAN module boot wiring', () => {
  it('app.js imports lan-sync windowHandlers', () => {
    assert.match(appJs, /from\s+['"]\.\/features\/lan-sync\.mjs['"]/);
    assert.match(appJs, /lanWindowHandlers|windowHandlers as lanWindowHandlers/);
  });

  it('lan-sync registers push and room bridges before document init', () => {
    const pushIdx = lanSyncFeature.indexOf('registerLanSyncPushBridge({');
    const roomIdx = lanSyncFeature.indexOf('registerLanSyncRoomBridge({');
    const wireIdx = lanSyncFeature.indexOf('registerLanSyncRoomWireHandlers();');
    const initIdx = lanSyncFeature.indexOf('initLanClientFromStorage();');
    assert.ok(pushIdx >= 0 && roomIdx >= 0 && wireIdx >= 0 && initIdx >= 0);
    assert.ok(pushIdx < initIdx, 'push bridge before init');
    assert.ok(roomIdx < initIdx, 'room bridge before init');
    assert.ok(wireIdx < initIdx, 'room wire handlers before init');
  });

  it('push bridge includes fetchAndApplyClinicalOpsFromHost for reconcile', () => {
    const block = lanSyncFeature.slice(
      lanSyncFeature.indexOf('registerLanSyncPushBridge({'),
      lanSyncFeature.indexOf('registerLanSyncRoomWireHandlers();')
    );
    assert.match(block, /fetchAndApplyClinicalOpsFromHost/);
    assert.match(lanSyncPush, /b\.fetchAndApplyClinicalOpsFromHost\(rid\)/);
  });

  it('panel runtime registers conflict drafts append', () => {
    assert.match(lanSyncFeature, /registerLanSyncPanelRuntime/);
    assert.match(lanSyncFeature, /appendLanConflictDraftsSection/);
    assert.match(lanSyncPanel, /appendConflictDrafts\(root\)/);
    assert.match(lanSyncPanel, /runtime\(\)\.appendLanConflictDraftsSection/);
  });
});

describe('LAN event and handler wiring', () => {
  it('revision WS message schedules reconcile', () => {
    assert.match(
      lanSyncRoom,
      /livesync:revision[\s\S]*scheduleReconcileFromRevisionHint/
    );
  });

  it('live connected flushes outbox', () => {
    assert.match(
      lanSyncRoom,
      /lan-live-status[\s\S]*flushLiveSyncOutbox\(activeLiveSyncRoomId\)/
    );
  });

  it('diagnostics retry button flushes outbox', () => {
    assert.match(lanSyncPanel, /Reintentar cola de sincronización/);
    assert.match(lanSyncPanel, /flushLiveSyncOutbox\(rid\)/);
  });

  it('clinical-ops sync events wired at boot and on panel delegate', () => {
    assert.match(lanSyncFeature, /wireClinicalOpsLanSyncEvents\(\)/);
    assert.match(lanSyncPanel, /wireClinicalOpsLanSyncEvents/);
    assert.match(
      lanSyncPanel,
      /rpc-clinical-teams-changed[\s\S]*pushClinicalOpsLanNow/
    );
  });

  it('lan-sync-panel imports syncLiveSyncStatusChrome and resolveLanHostUrlAuto', () => {
    assert.match(
      lanSyncPanel,
      /import\s*\{[\s\S]*?syncLiveSyncStatusChrome[\s\S]*?\}\s*from '\.\/room\.mjs'/
    );
    assert.match(
      lanSyncPanel,
      /import\s*\{[\s\S]*?resolveLanHostUrlAuto[\s\S]*?\}\s*from '\.\/transport\.mjs'/
    );
  });

  it('lan-sync imports refreshClinicalSessionTeams for clinicalOps merge', () => {
    assert.match(
      lanSyncFeature,
      /import\s*\{[\s\S]*?refreshClinicalSessionTeams[\s\S]*?\}\s*from "\.\/panel\.mjs"/
    );
    const applyBlock = lanSyncFeature.slice(
      lanSyncFeature.indexOf('if (merged.clinicalOps && isClinicalOpsLanAvailable())'),
      lanSyncFeature.indexOf('migrateLocalPatientsClinicalSala();', lanSyncFeature.indexOf('if (merged.clinicalOps'))
    );
    assert.match(applyBlock, /refreshClinicalSessionTeams\(\)/);
  });

  it('stampTodosWithEntityVersions uses liveSyncEntityStoreKey not bare todoEntityKey', () => {
    const fnStart = lanSyncFeature.indexOf('function stampTodosWithEntityVersions');
    assert.ok(fnStart >= 0);
    const fnEnd = lanSyncFeature.indexOf('function rememberTodosFromMap', fnStart);
    const body = lanSyncFeature.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 400);
    assert.match(body, /liveSyncEntityStoreKey\('todo'/);
    assert.doesNotMatch(body, /todoEntityKey\(/);
  });

  it('legacy conflict drafts section offers discard all', () => {
    assert.match(lanSyncFeature, /clearAllDraftConflicts/);
    assert.match(lanSyncFeature, /Conflictos antiguos[\s\S]*Descartar todos/);
  });
});

describe('clinical teams LAN publish wiring', () => {
  const publishPaths = [
    'handleLeaveTeamClick',
    'handleDeleteTeamClick',
    'handleEditTeamSubmit',
    'handleAddMemberSubmit',
    'joinTeamById',
    'handleCreateTeamSubmit',
  ];

  for (const fn of publishPaths) {
    it(`${fn} publishes or dispatches teams-changed for LAN`, () => {
      const start = clinicalTeams.indexOf(`async function ${fn}`);
      const alt = clinicalTeams.indexOf(`function ${fn}`);
      const idx = start >= 0 ? start : alt;
      assert.ok(idx >= 0, `missing ${fn}`);
      const end = clinicalTeams.indexOf('\nasync function ', idx + 1);
      const body = clinicalTeams.slice(idx, end > idx ? end : idx + 2500);
      const hasPublish =
        body.includes('publishClinicalTeamsToLan') ||
        body.includes("dispatchEvent(new CustomEvent('rpc-clinical-teams-changed')");
      assert.ok(hasPublish, `${fn} must publishClinicalTeamsToLan or dispatch teams-changed`);
    });
  }

  it('handleMyCycleSubmit publishes membership to LAN', () => {
    const idx = clinicalTeams.indexOf('async function handleMyCycleSubmit');
    assert.ok(idx >= 0);
    const end = clinicalTeams.indexOf('\nasync function resolveTeamIdForInviteInput', idx);
    const body = clinicalTeams.slice(idx, end);
    assert.match(body, /publishClinicalTeamsToLan/);
    assert.match(body, /rpc-clinical-teams-changed/);
  });

  it('leave team button delegates to handleLeaveTeamClick', () => {
    assert.match(clinicalTeams, /clinical-teams-leave-btn/);
    assert.match(
      clinicalTeams,
      /closest\('\.clinical-teams-leave-btn'\)[\s\S]*handleLeaveTeamClick/
    );
    assert.match(clinicalTeams, /wireTeamManageModalDelegation/);
  });

  it('Mi rotación pulls host ops on open', () => {
    assert.match(
      clinicalTeams,
      /renderClinicalTeamsPanelInto[\s\S]*pullClinicalOpsFromLanRoom/
    );
  });
});

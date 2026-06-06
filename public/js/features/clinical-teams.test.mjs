import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterJoinedTeams, CLINICAL_TEAM_SERVICES } from './clinical-teams.mjs';

const featureDir = join(dirname(fileURLToPath(import.meta.url)), 'clinical-teams');
const clinicalTeamsSrc = [
  'shared.mjs',
  'teams-roster.mjs',
  'teams-roster-render.mjs',
  'teams-roster-lan.mjs',
  'teams-roster-interactions.mjs',
  'teams-roster-modal-chrome.mjs',
  'teams-invite.mjs',
  'teams-guardia-bridge.mjs',
  'index.mjs',
]
  .map((name) => readFileSync(join(featureDir, name), 'utf8'))
  .join('\n');

describe('clinical-teams', () => {
  it('filterJoinedTeams returns teams where user is a member', () => {
    const teams = [
      {
        team_id: 't1',
        name: 'A',
        members: [{ user_id: 'u1', username: 'a' }],
      },
      {
        team_id: 't2',
        name: 'B',
        members: [{ user_id: 'u2', username: 'b' }],
      },
      {
        team_id: 't3',
        name: 'C',
        members: [{ user_id: 'u1', username: 'a' }, { user_id: 'u3', username: 'c' }],
      },
    ];
    const joined = filterJoinedTeams(teams, 'u1');
    assert.equal(joined.length, 2);
    assert.deepEqual(
      joined.map((t) => t.team_id),
      ['t1', 't3']
    );
  });

  it('filterJoinedTeams matches LAN username when user_id differs', () => {
    const teams = [
      {
        team_id: 't1',
        members: [{ user_id: 'ghost', username: 'msalas' }],
      },
    ];
    const joined = filterJoinedTeams(teams, { user_id: 'real', username: 'msalas' });
    assert.equal(joined.length, 1);
  });

  it('exports service enum', () => {
    assert.ok(CLINICAL_TEAM_SERVICES.includes('Sala'));
  });

  it('Mi rotación source has no per-team Guardia hoy checkbox', () => {
    assert.equal(clinicalTeamsSrc.includes('clinical-teams-guardia-check'), false);
    assert.equal(clinicalTeamsSrc.includes('Guardia hoy'), false);
    assert.equal(clinicalTeamsSrc.includes('handleGuardiaCheck'), false);
  });

  it('joined team card offers leave team for any member', () => {
    assert.match(clinicalTeamsSrc, /clinical-teams-leave-btn/);
    assert.match(clinicalTeamsSrc, /handleLeaveTeamClick/);
    assert.match(clinicalTeamsSrc, /dbClinicalTeamsMemberRemove/);
  });

  it('handleMyCycleSubmit publishes to LAN after cycle save', () => {
    const idx = clinicalTeamsSrc.indexOf('async function handleMyCycleSubmit');
    assert.ok(idx >= 0);
    const end = clinicalTeamsSrc.indexOf('async function resolveTeamIdForInviteInput', idx);
    const body = clinicalTeamsSrc.slice(idx, end > idx ? end : idx + 1200);
    assert.match(body, /publishClinicalTeamsToLan/);
    assert.match(body, /rpc-clinical-teams-changed/);
  });

  it('renderJoinedTeamCard defines user before cycle edit block', () => {
    const fnStart = clinicalTeamsSrc.indexOf('function renderJoinedTeamCard(team)');
    assert.ok(fnStart >= 0);
    const fnEnd = clinicalTeamsSrc.indexOf('\nfunction renderDirectoryTeamCard', fnStart);
    const fnBody = clinicalTeamsSrc.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 2500);
    assert.match(fnBody, /const user = clinicalSessionContext\.user/);
    assert.match(fnBody, /renderMyCycleEditBlock\(team, user\)/);
  });

  it('Mi rotación opens LAN user directory in separate modal', () => {
    assert.match(clinicalTeamsSrc, /canViewLanUserDirectory/);
    assert.match(clinicalTeamsSrc, /openLanUsersDirectoryModal/);
    assert.match(clinicalTeamsSrc, /clinical-lan-users-backdrop/);
    assert.match(clinicalTeamsSrc, /Abrir directorio de usuarios LAN/);
    assert.match(clinicalTeamsSrc, /getClinicalTeamsPanelHost\(\)[\s\S]*_rpcLanDirOpenDelegated/);
    assert.match(clinicalTeamsSrc, /clinical-lan-directory-open/);
    assert.match(clinicalTeamsSrc, /clinical-lan-rank-group/);
    assert.equal(clinicalTeamsSrc.includes('clinical-teams-section--lan-users'), false);
  });

  it('elevated roster managers get empty team create flow', () => {
    assert.match(clinicalTeamsSrc, /canManageTeamRoster/);
    assert.match(clinicalTeamsSrc, /Crear equipo vacío/);
    assert.match(clinicalTeamsSrc, /clinical-lan-assign-btn/);
    assert.match(clinicalTeamsSrc, /clinical-lan-users-placement/);
    assert.match(clinicalTeamsSrc, /resolveMembershipCycleForUser/);
    assert.match(clinicalTeamsSrc, /rpc-clinical-ops-synced/);
  });

  it('silent Mi rotación refresh skips LAN pull to avoid ops-sync loop', () => {
    assert.match(clinicalTeamsSrc, /skipLanPull/);
    assert.match(clinicalTeamsSrc, /renderClinicalTeamsPanel\(\{ silent: true, skipLanPull: true \}/);
    assert.match(clinicalTeamsSrc, /LAN_CLINICAL_OPS_PULL_MIN_MS/);
    assert.match(clinicalTeamsSrc, /opsSyncedTeamsRefreshTimer/);
  });

  it('elevated roster managers can edit and delete teams', () => {
    assert.match(clinicalTeamsSrc, /clinical-teams-edit-btn/);
    assert.match(clinicalTeamsSrc, /clinical-teams-delete-btn/);
    assert.match(clinicalTeamsSrc, /dbClinicalTeamsUpdate/);
    assert.match(clinicalTeamsSrc, /dbClinicalTeamsArchive/);
    assert.match(clinicalTeamsSrc, /clinical-teams-panel-body/);
    assert.match(clinicalTeamsSrc, /teamManageDelegationRoot/);
  });

  it('program admin checkbox requires access code', () => {
    assert.match(clinicalTeamsSrc, /wireAdminCheckboxGate/);
    assert.match(clinicalTeamsSrc, /verifyAdminAccessCode/);
    assert.match(clinicalTeamsSrc, /clinical-admin-code-backdrop/);
    assert.match(clinicalTeamsSrc, /promptAdminAccessCode/);
    assert.equal(clinicalTeamsSrc.includes('window.prompt('), false);
  });

  it('team join field redirects ⇄ sala links to Conexión guardia', () => {
    assert.match(clinicalTeamsSrc, /isLanSalaInvitePaste/);
    assert.match(clinicalTeamsSrc, /redirectLanInviteFromTeamJoinField/);
    assert.match(clinicalTeamsSrc, /joinLanFromInviteUi/);
  });

  it('LAN directorio preserves collapsed rank groups across background refresh', () => {
    assert.match(clinicalTeamsSrc, /lanDirectoryCollapsedRanks/);
    assert.match(clinicalTeamsSrc, /captureLanDirectoryCollapseState/);
    assert.match(clinicalTeamsSrc, /data-lan-rank-group/);
    assert.match(clinicalTeamsSrc, /isLanRankGroupCollapsed/);
    assert.doesNotMatch(clinicalTeamsSrc, /clinical-lan-rank-group" open>/);
  });

  it('LAN directorio background refresh reads local DB only (no redundant host pull)', () => {
    assert.match(clinicalTeamsSrc, /refreshLanDirectoryUiFromLocalDb/);
    assert.match(clinicalTeamsSrc, /buildLanDirectoryFingerprint/);
    assert.match(clinicalTeamsSrc, /LAN_DIRECTORY_POLL_MS/);
    assert.doesNotMatch(clinicalTeamsSrc, /backgroundRefreshLanUsersDirectory/);
    assert.doesNotMatch(clinicalTeamsSrc, /pullLanDirectoryFromHostBeforeDisplay/);
  });
});

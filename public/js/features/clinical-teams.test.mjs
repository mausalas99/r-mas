import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFeatureSrc } from '../../../scripts/lib/read-feature-src.mjs';
import { filterJoinedTeams, CLINICAL_TEAM_SERVICES } from './clinical-teams.mjs';

const featureDir = join(dirname(fileURLToPath(import.meta.url)), 'clinical-teams');
const clinicalTeamsSrc = readFeatureSrc(featureDir, [
  'shared.mjs',
  'teams-roster.mjs',
  'teams-roster-shell.mjs',
  'teams-roster-manage.mjs',
  'teams-roster-profile.mjs',
  'teams-roster-profile-claim.mjs',
  'teams-roster-profile-persist.mjs',
  'teams-roster-submit.mjs',
  'teams-roster-render.mjs',
  'teams-roster-create.mjs',
  'teams-roster-team-cards.mjs',
  'teams-roster-directory.mjs',
  'teams-roster-panel.mjs',
  'teams-roster-panel-build.mjs',
  'teams-roster-panel-draft.mjs',
  'teams-roster-users.mjs',
  'teams-roster-directory-dom.mjs',
  'teams-roster-directory-render.mjs',
  'teams-roster-directory-filters.mjs',
  'teams-roster-directory-state.mjs',
  'teams-roster-directory-load.mjs',
  'teams-roster-directory-modal.mjs',
  'teams-roster-directory-assign.mjs',
  'teams-roster-directory-wire.mjs',
  'teams-roster-directory-row-html.mjs',
  'teams-roster-interactions.mjs',
  'teams-roster-modal-chrome.mjs',
  'teams-roster-join-handler.mjs',
  'teams-roster-bring-patients.mjs',
  'teams-roster-inherit-gate.mjs',
  'teams-roster-inherit-patients.mjs',
  'teams-roster-inherit-patients-modal.mjs',
  'teams-invite.mjs',
  'teams-guardia-bridge.mjs',
  'index.mjs',
]);

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

  it('Integrantes rows expose Quitar for roster managers', () => {
    assert.match(clinicalTeamsSrc, /clinical-teams-member-remove-btn/);
    assert.match(clinicalTeamsSrc, /handleRemoveMemberClick/);
    assert.match(clinicalTeamsSrc, /dbClinicalUserDelete/);
  });

  it('Mi rotación source has no per-team Guardia hoy checkbox', () => {
    assert.equal(clinicalTeamsSrc.includes('clinical-teams-guardia-check'), false);
    assert.equal(clinicalTeamsSrc.includes('Guardia hoy'), false);
    assert.equal(clinicalTeamsSrc.includes('handleGuardiaCheck'), false);
  });

  it('pullClinicalOpsFromRoom is retired (always false)', () => {
    const idx = clinicalTeamsSrc.indexOf('export async function pullClinicalOpsFromRoom');
    assert.ok(idx >= 0);
    const body = clinicalTeamsSrc.slice(idx, idx + 120);
    assert.match(body, /return false/);
    assert.equal(clinicalTeamsSrc.includes('pullClinicalOpsFromLanRoom'), false);
  });

  it('publishClinicalTeamsAfterChange pulls clinicalOps before LWW push', () => {
    const idx = clinicalTeamsSrc.indexOf('export async function publishClinicalTeamsAfterChange');
    assert.ok(idx >= 0);
    const body = clinicalTeamsSrc.slice(idx, idx + 900);
    assert.match(body, /syncClinicalOpsForSala/);
    assert.doesNotMatch(body, /await pushClinicalOpsForSala\(sala\)/);
  });

  it('joining a team awaits Nube clinicalOps pull-then-push', () => {
    const joinHandlerSrc = readFileSync(join(featureDir, 'teams-roster-join-handler.mjs'), 'utf8');
    const inviteSrc = readFileSync(join(featureDir, 'teams-invite.mjs'), 'utf8');
    assert.match(joinHandlerSrc, /await publishClinicalTeamsAfterChange/);
    assert.doesNotMatch(joinHandlerSrc, /void publishClinicalTeamsAfterChange/);
    assert.match(inviteSrc, /await publishClinicalTeamsAfterChange/);
  });

  it('refreshClinicalOpsDirectory pulls from Nube when cloud sync is active', () => {
    assert.match(clinicalTeamsSrc, /export async function pullClinicalOpsFromCloudRoom/);
    assert.match(clinicalTeamsSrc, /export async function refreshClinicalOpsDirectory/);
    assert.match(clinicalTeamsSrc, /pushClinicalOpsForSalas/);
    assert.match(clinicalTeamsSrc, /export async function publishClinicalTeamsAfterChange/);
    const refreshIdx = clinicalTeamsSrc.indexOf('export async function refreshClinicalOpsDirectory');
    const refreshBody = clinicalTeamsSrc.slice(refreshIdx, refreshIdx + 420);
    assert.match(refreshBody, /getCloudSyncToken\(\)/);
    assert.match(refreshBody, /pullClinicalOpsFromCloudRoom/);
  });

  it('Equipo embed wires team manage clicks on the active panel host', () => {
    const manageSrc = readFileSync(join(featureDir, 'teams-roster-manage.mjs'), 'utf8');
    assert.match(manageSrc, /getClinicalTeamsPanelHost/);
    const interactionsSrc = readFileSync(join(featureDir, 'teams-roster-interactions.mjs'), 'utf8');
    assert.match(interactionsSrc, /wireTeamManageModalDelegation/);
    assert.match(interactionsSrc, /wireRenderedClinicalTeamsPanel/);
  });

  it('joined team card offers leave team for any member', () => {
    assert.match(clinicalTeamsSrc, /clinical-teams-leave-btn/);
    assert.match(clinicalTeamsSrc, /handleLeaveTeamClick/);
    assert.match(clinicalTeamsSrc, /dbClinicalTeamsMemberRemove/);
  });

  it('handleMyCycleSubmit publishes to Nube/LAN after cycle save', () => {
    const idx = clinicalTeamsSrc.indexOf('async function handleMyCycleSubmit');
    assert.ok(idx >= 0);
    const end = clinicalTeamsSrc.indexOf('async function resolveTeamIdForInviteInput', idx);
    const body = clinicalTeamsSrc.slice(idx, end > idx ? end : idx + 1200);
    assert.match(body, /publishClinicalTeamsAfterChange/);
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
    assert.match(clinicalTeamsSrc, /canViewUserDirectory/);
    assert.match(clinicalTeamsSrc, /openDirectoryUsersModal/);
    assert.match(clinicalTeamsSrc, /clinical-directory-users-backdrop/);
    assert.match(clinicalTeamsSrc, /renderDirectoryUsersTopButtonHtml/);
    assert.match(clinicalTeamsSrc, /clinical-teams-top-actions/);
    assert.match(clinicalTeamsSrc, /Directorio LAN/);
    assert.match(clinicalTeamsSrc, /getClinicalTeamsPanelHost\(\)[\s\S]*_rpcLanDirOpenDelegated/);
    assert.match(clinicalTeamsSrc, /clinical-directory-open/);
    assert.match(clinicalTeamsSrc, /clinical-directory-rank-group/);
    assert.equal(clinicalTeamsSrc.includes('clinical-teams-lan-users-entry'), false);
    assert.equal(clinicalTeamsSrc.includes('section.lanUsers'), false);
  });

  it('elevated roster managers get empty team create flow', () => {
    assert.match(clinicalTeamsSrc, /canManageTeamRoster/);
    assert.match(clinicalTeamsSrc, /Crear equipo vacío/);
    assert.match(clinicalTeamsSrc, /clinical-directory-assign-btn/);
    assert.match(clinicalTeamsSrc, /clinical-directory-users-placement/);
    assert.match(clinicalTeamsSrc, /resolveMembershipCycleForUser/);
    assert.match(clinicalTeamsSrc, /rpc-clinical-ops-synced/);
  });

  it('silent Mi rotación refresh skips redundant pull to avoid ops-sync loop', () => {
    assert.match(clinicalTeamsSrc, /skipLanPull/);
    assert.match(clinicalTeamsSrc, /renderClinicalTeamsPanel\(\{ silent: true, skipLanPull: true/);
    assert.match(clinicalTeamsSrc, /isClinicalTeamsPanelUserInteracting/);
    assert.match(clinicalTeamsSrc, /captureClinicalTeamsPanelDraft/);
    assert.match(clinicalTeamsSrc, /restoreClinicalTeamsPanelDraft/);
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
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../styles/pase-board.css'),
      'utf8'
    );
    assert.match(
      css,
      /#clinical-admin-code-backdrop\.modal-backdrop\.clinical-admin-code-backdrop/
    );
    assert.match(css, /z-index:\s*var\(--z-clinical-admin\)/);
  });

  it('team join field redirects ⇄ sala links to Conexión Nube', () => {
    assert.match(clinicalTeamsSrc, /isLanSalaInvitePaste/);
    assert.match(clinicalTeamsSrc, /redirectLanInviteFromTeamJoinField/);
    assert.match(clinicalTeamsSrc, /LiveSync LAN retirado/);
  });

  it('Mi rotación sections and team cards use persisted collapsible blocks', () => {
    assert.match(clinicalTeamsSrc, /renderClinicalTeamsCollapsible/);
    assert.match(clinicalTeamsSrc, /clinical-teams-collapse/);
    assert.match(clinicalTeamsSrc, /data-collapse-key/);
    assert.match(clinicalTeamsSrc, /writeClinicalTeamsCollapseOpen/);
    assert.match(clinicalTeamsSrc, /wireClinicalTeamsCollapsePersistence/);
    assert.match(clinicalTeamsSrc, /section\.joined/);
    assert.match(clinicalTeamsSrc, /section\.directory/);
    assert.match(clinicalTeamsSrc, /card\.\$\{tid\}\.members/);
  });

  it('R4/Admin see Cambiar de rotación at top of Mi rotación', () => {
    assert.match(clinicalTeamsSrc, /buildRotationAdminSectionHtml/);
    assert.match(clinicalTeamsSrc, /Cambiar de rotación/);
    assert.match(clinicalTeamsSrc, /clinical-teams-section--rotation/);
    assert.match(clinicalTeamsSrc, /Iniciar nueva rotación/);
    assert.match(clinicalTeamsSrc, /Calendario de vigencia/);
    assert.equal(clinicalTeamsSrc.includes('Zona avanzada · rotación del programa'), false);
  });

  it('joining a team closes Mi rotación after success', () => {
    const joinHandlerSrc = readFileSync(join(featureDir, 'teams-roster-join-handler.mjs'), 'utf8');
    const inviteSrc = readFileSync(join(featureDir, 'teams-invite.mjs'), 'utf8');
    assert.match(joinHandlerSrc, /closeClinicalTeamsPanel\(\)/);
    assert.match(inviteSrc, /closeClinicalTeamsPanel\(\)/);
  });

  it('joining a team does not auto-open inherit; bring is opt-in on team card', () => {
    const joinHandlerSrc = readFileSync(join(featureDir, 'teams-roster-join-handler.mjs'), 'utf8');
    const inviteSrc = readFileSync(join(featureDir, 'teams-invite.mjs'), 'utf8');
    const submitSrc = readFileSync(join(featureDir, 'teams-roster-submit.mjs'), 'utf8');
    assert.doesNotMatch(joinHandlerSrc, /offerBringPatientsAfterTeamJoin/);
    assert.doesNotMatch(inviteSrc, /offerBringPatientsAfterTeamJoin/);
    assert.doesNotMatch(submitSrc, /offerBringPatientsAfterTeamJoin/);
    assert.match(clinicalTeamsSrc, /listBringableLocalPatients/);
    assert.match(clinicalTeamsSrc, /LAN a Nube/);
    assert.match(clinicalTeamsSrc, /no desaparezcan del censo/);
  });

  it('joined team card offers inherit patients from previous month', () => {
    assert.match(clinicalTeamsSrc, /Heredar pacientes del mes anterior/);
    assert.match(clinicalTeamsSrc, /shouldShowInheritPatientsUi/);
    assert.match(clinicalTeamsSrc, /openInheritPatientsModal/);
    assert.match(clinicalTeamsSrc, /preferredPreviousTeamId/);
    assert.match(clinicalTeamsSrc, /misma sala y ciclo/);
  });

  it('inherit patients modal stacks above Mi rotación backdrop', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../styles/pase-board.css'), 'utf8');
    assert.match(css, /#inherit-patients-backdrop\.modal-backdrop\.open/);
    assert.match(css, /z-index:\s*var\(--z-clinical-directory-users\)/);
  });

  it('LAN directorio preserves collapsed rank groups across background refresh', () => {
    assert.match(clinicalTeamsSrc, /directoryRt\.collapsedRanks/);
    assert.match(clinicalTeamsSrc, /directoryRt\.expandedRanks/);
    assert.match(clinicalTeamsSrc, /shouldRankGroupOpen/);
    assert.match(clinicalTeamsSrc, /captureDirectoryCollapseState/);
    assert.match(clinicalTeamsSrc, /data-lan-rank-group/);
    assert.doesNotMatch(clinicalTeamsSrc, /clinical-directory-rank-group" open>/);
  });

  it('LAN directorio uses compact cards with search and filters', () => {
    assert.match(clinicalTeamsSrc, /clinical-lan-user-card/);
    assert.match(clinicalTeamsSrc, /clinical-directory-toolbar/);
    assert.match(clinicalTeamsSrc, /applyDirectoryFilters/);
    assert.match(clinicalTeamsSrc, /bindDirectoryFilterControls/);
    assert.match(clinicalTeamsSrc, /ensureDirectoryFilterDelegation/);
    assert.match(clinicalTeamsSrc, /clinical-directory-search/);
    assert.match(clinicalTeamsSrc, /clinical-directory-activity-filter/);
    assert.match(clinicalTeamsSrc, /last_activity_at/);
    assert.match(clinicalTeamsSrc, /clinical-lan-user-activity-chip/);
  });

  it('LAN directorio freezes auto-refresh while open (manual Actualizar)', () => {
    assert.match(clinicalTeamsSrc, /directoryRt\.freezeAutoRefresh/);
    assert.match(clinicalTeamsSrc, /refreshDirectoryFromHostUi/);
    assert.match(clinicalTeamsSrc, /clinical-directory-refresh-btn/);
    assert.match(clinicalTeamsSrc, /buildDirectoryFingerprint/);
    assert.doesNotMatch(clinicalTeamsSrc, /rpc-clinical-ops-synced[\s\S]*scheduleDirectory/);
    assert.doesNotMatch(clinicalTeamsSrc, /setInterval[\s\S]*scheduleDirectory/);
  });

  it('skips Equipo UI refresh on cloud-hydrate to avoid flash', () => {
    assert.match(clinicalTeamsSrc, /source === 'cloud-hydrate'/);
    assert.match(clinicalTeamsSrc, /resolveClinicalTeamsScrollHost/);
    assert.match(clinicalTeamsSrc, /connection-dropdown-scroll/);
  });
});

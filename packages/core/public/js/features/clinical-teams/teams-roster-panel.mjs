/** Mi rotación — full panel render orchestration. */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
} from '../../clinical-access-runtime.mjs';
import { hasElevatedTeamPrivileges } from '../../clinical-privileges.mjs';
import {
  syncRotationConfigButton,
  wireNuevaRotacionControl,
  wireRotationConfigOpenControl,
} from '../clinical-rotation.mjs';
import { readRpcSettings } from '../../clinical-settings.mjs';
import {
  getClinicalTeamsPanelHost,
  safeRenderClinicalTeamsPanel,
  setClinicalTeamsPanelError,
} from '../clinical-panel-host.mjs';
import {
  dbApi,
  currentUserId,
  filterJoinedTeams,
} from './shared.mjs';
import { refreshClinicalOpsDirectory } from './teams-guardia-bridge.mjs';
import { wireDirectoryUsersControls } from './teams-roster-users.mjs';
import { renderNewTeamCardHtml } from './teams-roster-create.mjs';
import {
  resolveBrowseSala,
  renderDirectorySectionHtml,
  resolveTeamMemberHintHtml,
} from './teams-roster-directory.mjs';
import { renderJoinedTeamCard } from './teams-roster-team-cards.mjs';
import { isRotationRejoinPending } from '../clinical-rotation-rejoin-modal.mjs';
import {
  resolveDisplayLanHandle,
  resolveClinicalTeamsPanelContext,
  buildClinicalProfileSectionHtml,
  buildProfileLinkRowHtml,
  buildClinicalTeamsConfigSectionHtml,
  buildRotationAdminSectionHtml,
  buildPickTeamsBannerHtml,
  shouldUsePickTeamPanelLayout,
} from './teams-roster-panel-build.mjs';
import {
  captureClinicalTeamsPanelDraft,
  restoreClinicalTeamsPanelDraft,
  isClinicalTeamsPanelUserInteracting,
} from './teams-roster-panel-draft.mjs';

/**
 * @param {{ silent?: boolean, skipLanPull?: boolean }} [opts]
 * — silent: sin pantalla «Cargando…» (actualización en caliente)
 * — skipLanPull: no GET al host (evita bucle con rpc-clinical-ops-synced)
 */
export async function renderClinicalTeamsPanel(opts = {}) {
  const silent = !!opts.silent;
  const skipLanPull = !!opts.skipLanPull || silent;
  if (silent) {
    const host = getClinicalTeamsPanelHost();
    if (!host) return;
    try {
      await renderClinicalTeamsPanelInto(host, {
        skipLanPull,
        preserveDraft: opts.preserveDraft !== false,
      });
    } catch (err) {
      console.error('[Mi rotación]', err);
      setClinicalTeamsPanelError(
        err instanceof Error ? err.message : 'Error al cargar Mi rotación.'
      );
    }
    return;
  }
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderClinicalTeamsPanelInto(host, { skipLanPull: false });
  });
}

export async function tryReconcileTeamMemberships() {
  const userId = currentUserId();
  const user = clinicalSessionContext.user;
  if (!userId || !user) return false;
  let joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  if (joined.length) return false;

  const api = dbApi();
  if (!api || typeof api.dbClinicalMembershipMigrate !== 'function') return false;

  const settings = readRpcSettings();
  const fromUserId = String(settings.clinicalStaleDeviceUserId || '');
  if (!fromUserId || fromUserId === userId) return false;

  const res = await api.dbClinicalMembershipMigrate({ fromUserId, toUserId: userId });
  if (!res?.ok) return false;
  await fetchClinicalTeamsFromDb();
  joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  return joined.length > 0;
}

export { resolveDisplayLanHandle };

async function maybeRefreshClinicalOpsDirectory(skipPull, browseSala, homeSala) {
  if (skipPull) return;
  const ok = await refreshClinicalOpsDirectory({
    timeoutMs: 12000,
    browseSala,
    homeSala,
  });
  const { isClinicalTeamsPanelActive } = await import('./teams-roster-shell.mjs');
  if (!ok || !isClinicalTeamsPanelActive()) return;
  if (isClinicalTeamsPanelUserInteracting()) return;
  void renderClinicalTeamsPanel({ silent: true, skipLanPull: true, preserveDraft: true });
}

/**
 * @param {boolean} embedded true inside ⇄ Conexión, where the profile form
 *   lives in Cuenta; the legacy modal keeps it under «Configuración».
 */
async function resolveClinicalTeamsPanelSections(userId, user, joined, ctx, elevated, embedded) {
  const siblingTeams = Array.isArray(clinicalSessionContext.teams) ? clinicalSessionContext.teams : [];
  const browseSala = resolveBrowseSala(elevated, ctx.sala);
  const lanMemberHint = await resolveTeamMemberHintHtml(joined);
  const mineSection = joined.length
    ? `<section class="clinical-teams-mine">${lanMemberHint}${joined
        .map((team) => renderJoinedTeamCard(team, siblingTeams))
        .join('')}</section>`
    : '';

  // Crear is the primary action only when there is no team to join or be in.
  const { html: directorySection, count: directoryCount } = await renderDirectorySectionHtml({
    userId,
    elevated,
    browseSala,
    homeSala: ctx.sala,
    mineCount: joined.length,
    trailingCard: (count) => renderNewTeamCardHtml({ primary: !count && !joined.length }),
  });
  const pickTeamLayout = shouldUsePickTeamPanelLayout(joined.length, directoryCount, elevated);

  const pickBanner = buildPickTeamsBannerHtml({
    directoryCount,
    sala: browseSala === '__all__' ? ctx.sala : browseSala || ctx.sala,
    elevated,
    rejoinPending: isRotationRejoinPending(),
  });

  const profileSection = buildClinicalProfileSectionHtml(ctx, user);
  return {
    pickTeamLayout,
    pickBanner,
    mineSection,
    directorySection,
    rotationSection: buildRotationAdminSectionHtml(user),
    configSection: embedded ? '' : buildClinicalTeamsConfigSectionHtml(profileSection),
    profileRow: embedded ? buildProfileLinkRowHtml(ctx, user) : '',
  };
}

function renderClinicalTeamsPanelBody(host, sections, hasJoinedTeam) {
  const { pickTeamLayout, pickBanner, mineSection, directorySection, rotationSection, configSection, profileRow } = sections;
  host.classList.toggle('clinical-teams-panel-body--pick-team', pickTeamLayout);
  host.classList.toggle('clinical-teams-panel-body--has-joined', hasJoinedTeam);

  // Rare actions (rotation for R4/admin, profile in the legacy modal) share
  // one «Otras opciones» list, same as the shortcuts sheet.
  const otherOptions = rotationSection || configSection
    ? `
    <section class="clinical-teams-other" aria-labelledby="clinical-teams-other-label">
      <h4 id="clinical-teams-other-label" class="clinical-teams-group-label">Otras opciones</h4>
      <div class="clinical-teams-other-list">
        ${rotationSection}
        ${configSection}
      </div>
    </section>`
    : '';
  // Fixed order so the screen never reshuffles between visits: your team
  // (status card), the sala's teams ending in «¿No ves tu equipo?», rare
  // options, then the link to your profile in Cuenta.
  host.innerHTML = `
    ${pickTeamLayout ? pickBanner : ''}
    ${mineSection}
    ${directorySection}
    ${otherOptions}
    ${profileRow}`;
}

export async function renderClinicalTeamsPanelInto(host, opts = {}) {
  const userId = currentUserId();
  if (!userId) {
    host.innerHTML =
      '<p class="clinical-teams-lead">Activa la sesión clínica para gestionar equipos.</p>';
    return;
  }

  const draft = opts.preserveDraft ? captureClinicalTeamsPanelDraft(host) : null;

  const user = clinicalSessionContext.user || {};
  const preBrowseSala = resolveBrowseSala(hasElevatedTeamPrivileges(user), String(user.sala || ''));
  await maybeRefreshClinicalOpsDirectory(opts.skipLanPull, preBrowseSala, String(user.sala || ''));
  await fetchClinicalTeamsFromDb();
  await tryReconcileTeamMemberships();
  const joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  const ctx = await resolveClinicalTeamsPanelContext(user, joined);
  const elevated = hasElevatedTeamPrivileges(user);

  const embedded = !!host.closest('.cloud-sync-equipo-embed');
  const sections = await resolveClinicalTeamsPanelSections(userId, user, joined, ctx, elevated, embedded);
  renderClinicalTeamsPanelBody(host, sections, joined.length > 0);

  wireDirectoryUsersControls();
  syncRotationConfigButton();
  wireRotationConfigOpenControl(host);
  wireNuevaRotacionControl(host);
  const { wireRenderedClinicalTeamsPanel } = await import('./teams-roster-interactions.mjs');
  wireRenderedClinicalTeamsPanel(elevated);
  restoreClinicalTeamsPanelDraft(host, draft);
}

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
import { wireLanUsersDirectoryControls } from './teams-roster-lan.mjs';
import { renderCreateTeamSectionHtml, renderJoinWithCodeSectionHtml } from './teams-roster-create.mjs';
import {
  resolveBrowseSala,
  renderDirectorySectionHtml,
  resolveLanTeamMemberHintHtml,
} from './teams-roster-directory.mjs';
import { renderJoinedTeamCard } from './teams-roster-team-cards.mjs';
import { isRotationRejoinPending } from '../clinical-rotation-rejoin-modal.mjs';
import {
  resolveDisplayLanHandle,
  resolveClinicalTeamsPanelContext,
  buildClinicalTeamsHandleHint,
  buildClinicalProfileSectionHtml,
  buildJoinedTeamsSectionHtml,
  buildClinicalTeamsConfigSectionHtml,
  buildJoinedTeamsEmptyHtml,
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

  const joinedHtml = joined.length
    ? joined.map((team) => renderJoinedTeamCard(team)).join('')
    : buildJoinedTeamsEmptyHtml(ctx.displayHandle, false);
  const profileSection = buildClinicalProfileSectionHtml(ctx, user);
  const browseSala = resolveBrowseSala(elevated, ctx.sala);
  const joinCodeSection = renderJoinWithCodeSectionHtml();
  const lanMemberHint = await resolveLanTeamMemberHintHtml(joined);
  const { html: directorySection, count: directoryCount } = await renderDirectorySectionHtml({
    userId,
    elevated,
    browseSala,
    homeSala: ctx.sala,
  });

  const pickTeamLayout = shouldUsePickTeamPanelLayout(joined.length, directoryCount, elevated);
  const rejoinPending = isRotationRejoinPending();
  const pickBanner = buildPickTeamsBannerHtml({
    directoryCount,
    sala: browseSala === '__all__' ? ctx.sala : browseSala || ctx.sala,
    elevated,
    rejoinPending,
  });

  const joinedContentHtml = joined.length ? joinedHtml : buildJoinedTeamsEmptyHtml(ctx.displayHandle, pickTeamLayout);
  const joinedSection = buildJoinedTeamsSectionHtml(ctx, joinedContentHtml, lanMemberHint);

  host.classList.toggle('clinical-teams-panel-body--pick-team', pickTeamLayout);

  const createSection = renderCreateTeamSectionHtml();
  const rotationSection = buildRotationAdminSectionHtml(user);
  const configSection = buildClinicalTeamsConfigSectionHtml(profileSection);
  const handleHint = buildClinicalTeamsHandleHint(ctx);

  if (pickTeamLayout) {
    host.innerHTML = `
    ${pickBanner}
    ${directorySection}
    ${handleHint}
    ${joinedSection}
    ${createSection}
    ${joinCodeSection}
    ${configSection}`;
  } else {
    host.innerHTML = `
    ${handleHint}
    ${rotationSection}
    ${createSection}
    ${joinedSection}
    ${directorySection}
    ${joinCodeSection}
    ${configSection}`;
  }

  if (pickTeamLayout) {
    requestAnimationFrame(() => {
      host.querySelector('.clinical-teams-section--directory')?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    });
  }

  wireLanUsersDirectoryControls();
  syncRotationConfigButton();
  wireRotationConfigOpenControl(host);
  wireNuevaRotacionControl(host);
  const { wireRenderedClinicalTeamsPanel } = await import('./teams-roster-interactions.mjs');
  wireRenderedClinicalTeamsPanel(elevated);
  restoreClinicalTeamsPanelDraft(host, draft);
}

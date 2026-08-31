/** Mi rotación — browse/directory section HTML. */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { canViewUserDirectory } from '../../clinical-privileges.mjs';
import { isCloudSala } from '../cloud-sync/sala-allowlist.mjs';
import { getCloudSyncToken } from '../cloud-sync/settings.mjs';
import { isCloudSyncActive } from '../cloud-sync/nube-sync-policy.mjs';
import { dbApi, escapeHtml, escapeAttr, CLINICAL_SALAS, BROWSE_SALA_LS, renderClinicalTeamsCollapsible } from './shared.mjs';
import {
  renderDirectoryTeamCard,
  renderTeamManageBlock,
  renderInheritedPatientsPreview,
} from './teams-roster-team-cards.mjs';

/** Hint when ⇄ is live but roster still shows only you (not rotación nueva). */
export async function resolveTeamMemberHintHtml(joinedTeams) {
  const teams = Array.isArray(joinedTeams) ? joinedTeams : [];
  if (!teams.length) return '';
  const soloTeams = teams.every((team) => {
    const members = Array.isArray(team?.members) ? team.members : [];
    return members.length <= 1;
  });
  if (!soloTeams) return '';
  try {
    if (!isCloudSyncActive()) return '';
    const { getCloudSyncRoomId } = await import('../cloud-sync/settings.mjs');
    const roomId = String(getCloudSyncRoomId() || '').trim();
    if (!roomId) {
      return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">Abre ⇄ y conéctate a <strong>R+ Cloud</strong> en la sala de guardia. Los residentes deben iniciar sesión Nube, unirse a la misma sala y registrar <strong>@usuario</strong> antes de que puedas asignarlos a un equipo.</p>`;
    }
    const canDir = canViewUserDirectory(clinicalSessionContext.user || {});
    if (canDir) {
      return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">Estás en sala Nube pero el directorio aún no lista a otros. Cada Mac debe entrar en ⇄ con R+ Cloud, misma sala y <strong>Guardar perfil</strong> con @usuario; después aparecen aquí y tú los asignas al equipo (no al revés).</p>`;
    }
    return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">En <strong>Integrantes</strong> verás compañeros cuando el admin te asigne a un equipo desde el directorio. Mientras tanto: ⇄ → misma sala Nube, @usuario guardado.</p>`;
  } catch {
    return '';
  }
}

export function resolveBrowseSala(elevated, homeSala) {
  if (!elevated) return homeSala;
  try {
    const stored = localStorage.getItem(BROWSE_SALA_LS);
    if (stored === '__all__') return '__all__';
    if (stored && CLINICAL_SALAS.includes(stored)) return stored;
  } catch (_e) { void _e; }
  if (!homeSala) return '__all__';
  return homeSala;
}

/** @param {boolean} elevated @param {string} browseSala @param {string} homeSala */
function buildDirectoryEmptyMessage(elevated, browseSala, homeSala) {
  const label =
    browseSala === '__all__' ? 'ninguna sala' : escapeHtml(String(browseSala || homeSala));
  const userSala = String(clinicalSessionContext.user?.sala || homeSala || '').trim();
  if (isCloudSala(userSala) && !getCloudSyncToken()) {
    return (
      'Falta sesión Nube. Vuelve al paso anterior y guarda tu perfil con <strong>contraseña Nube</strong>, ' +
      'o inicia sesión en <strong>⇄ Conexión</strong>.'
    );
  }
  if (isCloudSala(userSala) && getCloudSyncToken() && !isCloudSyncActive()) {
    return (
      `Conecta la sala en <strong>⇄ Conexión</strong> para traer equipos de ${label}, ` +
      'o crea uno con el botón de arriba.'
    );
  }
  if (elevated) {
    return `No hay otros equipos en ${label}. Los tuyos aparecen arriba.`;
  }
  return `No hay otros equipos disponibles en ${label}. Pide código a tu R2 o espera asignación en Nube.`;
}

/** @param {boolean} elevated @param {string} browseSala @param {number} count */
function buildDirectorySectionTitle(elevated, browseSala, count = 0) {
  const countLabel = count > 0 ? `${count} equipo${count === 1 ? '' : 's'} · ` : '';
  if (!elevated) {
    return `${countLabel}Equipos disponibles · ${escapeHtml(browseSala)}`;
  }
  if (browseSala === '__all__') {
    return count > 0 ? `${countLabel}Explorar · todas las salas` : 'Explorar · todas las salas';
  }
  return count > 0
    ? `${countLabel}Explorar · ${escapeHtml(browseSala)}`
    : `Explorar · ${escapeHtml(browseSala)}`;
}

/** @param {boolean} elevated @param {number} count */
function buildDirectorySectionDesc(elevated, count) {
  if (count <= 0) return 'Equipos de la sala a los que puedes unirte.';
  if (elevated) {
    return 'Equipos publicados en Nube — asigna residentes o únete si corresponde.';
  }
  return 'Tu R2 o R4 ya publicó estos equipos en Nube. Elige el tuyo y pulsa <strong>Unirme</strong>.';
}

/** @param {boolean} elevated @param {string} browseSala */
function buildDirectoryBrowseControl(elevated, browseSala) {
  if (!elevated) return '';
  return `<label class="clinical-teams-browse-label" for="clinical-browse-sala">Sala</label>
        <select id="clinical-browse-sala" class="profile-input clinical-teams-browse-select" aria-label="Explorar equipos por sala">
          ${CLINICAL_SALAS.map(
            (s) =>
              `<option value="${escapeAttr(s)}" ${browseSala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
          ).join('')}
          <option value="__all__" ${browseSala === '__all__' ? 'selected' : ''}>Todas las salas</option>
        </select>`;
}

/** @param {object} team @param {boolean} elevated @param {object[]} [siblingTeams] this sala's other teams, for the "Hereda de" picker */
function renderDirectoryTeamEntry(team, elevated, siblingTeams = []) {
  const teamId = String(team.team_id || '');
  let joinBtn = '';
  let joinHint = '';
  if (team.joinEligible) {
    joinBtn = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`;
    if (team.joinWarning) joinHint = String(team.joinWarning);
  } else if (team.joinReason) {
    joinHint = String(team.joinReason);
  }
  const manage = elevated ? renderTeamManageBlock(team, siblingTeams) : { actionsHtml: '', editPanelHtml: '' };
  return renderDirectoryTeamCard(team, {
    joinBtnHtml: joinBtn,
    joinHintHtml: joinHint,
    manageHtml: manage.actionsHtml,
    editPanelHtml: manage.editPanelHtml,
    patientsPreviewHtml: renderInheritedPatientsPreview(team, siblingTeams),
  });
}

/**
 * @param {{ userId: string, elevated: boolean, browseSala: string, homeSala: string }} opts
 * @returns {Promise<{ html: string, count: number }>}
 */
export async function renderDirectorySectionHtml(opts) {
  const { userId, elevated, browseSala, homeSala } = opts;
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsListBySala !== 'function') {
    return { html: '', count: 0 };
  }

  const listOpts =
    elevated && browseSala === '__all__'
      ? { sala: '', forUserId: userId, allSalas: true }
      : { sala: browseSala || homeSala, forUserId: userId };

  const res = await api.dbClinicalTeamsListBySala(listOpts);
  const allSalaTeams = res?.ok && Array.isArray(res.teams) ? res.teams : [];
  const directory = allSalaTeams.filter((t) => !t.isMember);
  const browseControl = buildDirectoryBrowseControl(elevated, browseSala);
  const salaLabel = browseSala || homeSala;
  const sectionTitle = buildDirectorySectionTitle(elevated, salaLabel, directory.length);
  const sectionDesc = buildDirectorySectionDesc(elevated, directory.length);
  const sectionIntro = `
        <h4 class="clinical-teams-section-title">${sectionTitle}</h4>
        <p class="clinical-teams-section-desc">${sectionDesc}</p>`;
  const headRow = browseControl
    ? `<div class="clinical-teams-section-head-row clinical-teams-collapse-summary-head">
        <div class="clinical-teams-section-intro">${sectionIntro}</div>
        <div class="clinical-teams-collapse-summary-actions">${browseControl}</div>
      </div>`
    : `<div class="clinical-teams-section-intro">${sectionIntro}</div>`;

  if (!directory.length) {
    const emptyMsg = buildDirectoryEmptyMessage(elevated, browseSala, homeSala);
    return {
      html: `<section class="clinical-teams-section clinical-teams-section--directory">
      ${renderClinicalTeamsCollapsible({
        collapseKey: 'section.directory',
        defaultOpen: true,
        className: 'clinical-teams-collapse--section',
        summaryHtml: headRow,
        bodyHtml: `<p class="clinical-teams-empty">${emptyMsg}</p>`,
      })}
    </section>`,
      count: 0,
    };
  }

  const cards = directory.map((team) => renderDirectoryTeamEntry(team, elevated, allSalaTeams)).join('');

  return {
    html: `
    <section class="clinical-teams-section clinical-teams-section--directory clinical-teams-section--directory-has-teams">
      ${renderClinicalTeamsCollapsible({
        collapseKey: 'section.directory',
        defaultOpen: true,
        className: 'clinical-teams-collapse--section',
        summaryHtml: headRow,
        bodyHtml: `<div class="clinical-teams-list clinical-teams-list--directory">${cards}</div>`,
      })}
    </section>`,
    count: directory.length,
  };
}

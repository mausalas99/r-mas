/** Mi rotación — panel HTML builders extracted from renderClinicalTeamsPanelInto. */
import {
  effectiveClinicalRank,
  hasProgramAdminPrivileges,
  canViewUserDirectory,
  canConfigureRotation,
} from '../../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../../clinical-username.mjs';
import {
  escapeHtml,
  escapeAttr,
  hintHtml,
  CLINICAL_SALAS,
  renderClinicalTeamsCollapsible,
} from './shared.mjs';

export function resolveDisplayLanHandle(user, usernameForInput) {
  const saved = normalizeUsername(user?.username || '');
  if (saved && isValidUsernameFormat(saved)) return saved;
  const draft = normalizeUsername(usernameForInput || '');
  if (draft && isValidUsernameFormat(draft)) return draft;
  return '';
}

export async function resolveClinicalTeamsPanelContext(user, joined) {
  let clientId = '';
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    clientId = String(settings.clientId || '');
  } catch (_e) { void _e; }

  const rawUsername = String(user.username || '');
  const legacyUsername = isLegacyMachineUsername(rawUsername, clientId);
  const { needsClinicalLanProfileGate, ensureLanProfileGateDeviceReset } = await import(
    '../../clinical-settings.mjs'
  );
  settings = ensureLanProfileGateDeviceReset(settings);
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const usernameForInput = profileGatePending
    ? ''
    : legacyUsername
      ? String(settings.clinicalUsername || '').trim()
      : rawUsername;
  const displayHandle = resolveDisplayLanHandle(user, usernameForInput);
  const savedHandle = normalizeUsername(user.username || '');
  const rank = effectiveClinicalRank(user);
  const programAdmin = hasProgramAdminPrivileges(user);
  const canViewDirectoryUsers = canViewUserDirectory(user);
  const sala = String(user.sala || '').trim();

  return {
    legacyUsername,
    profileGatePending,
    usernameForInput,
    displayHandle,
    savedHandle,
    rank,
    programAdmin,
    canViewDirectoryUsers,
    sala,
    joined,
  };
}

/**
 * One «Mi perfil» row inside ⇄ Conexión: who you are, and a link to Cuenta,
 * where the profile form lives. Same markup as the Opciones rows.
 */
export function buildProfileLinkRowHtml(ctx, user) {
  const meta = [
    String(user?.clinical_name || '').trim(),
    ctx.displayHandle ? `@${ctx.displayHandle}` : '',
    ctx.rank,
    ctx.sala,
  ]
    .filter(Boolean)
    .map((p) => escapeHtml(p))
    .join(' · ');
  return `
    <div class="cloud-sync-options-card clinical-teams-profile-link">
      <button type="button" class="cloud-sync-options-row" data-cloud-action="nav-view" data-cloud-view="cuenta">
        <span class="cloud-sync-options-row-text">
          <span class="cloud-sync-options-row-title">Mi perfil</span>
          <span class="cloud-sync-options-row-meta">${meta || 'Nombre, @usuario, rango y sala'}</span>
        </span>
        <span class="cloud-sync-options-row-chevron" aria-hidden="true">›</span>
      </button>
    </div>`;
}

export function buildClinicalProfileSectionHtml(ctx, user) {
  const clinicalName = ctx.profileGatePending ? '' : escapeHtml(user.clinical_name || '');
  const legacyBanner = ctx.legacyUsername
    ? '<p class="clinical-teams-legacy-banner">Registra tu @usuario (obligatorio). Sin esto no apareces en equipos ni entregas.</p>'
    : '';
  const directoryNote = ctx.canViewDirectoryUsers
    ? ''
    : `<p class="clinical-teams-lan-directory-note">El directorio completo de usuarios lo abren <strong>R4</strong>, <strong>Admin</strong> o quien tenga <strong>privilegios de administración</strong>. Al registrar <strong>@usuario</strong> conéctate a <strong>R+ Cloud</strong> en ⇄; R+ publica tu perfil al guardar.</p>`;
  const profileHandleBanner = ctx.displayHandle
    ? `<p class="clinical-teams-profile-handle">Visible en R+ Cloud como <strong>@${escapeHtml(ctx.displayHandle)}</strong></p>`
    : '';

  return `
    <div class="clinical-teams-profile-panel clinical-teams-rank-section">
      <h5 class="clinical-teams-subsection-title">Mi perfil y rango</h5>
      ${legacyBanner}
      ${profileHandleBanner}
      ${directoryNote}
      <form id="clinical-profile-form" class="clinical-teams-create-form" novalidate>
        <div class="field-group">
          <label for="clinical-profile-username">Usuario (@usuario) *</label>
          <input id="clinical-profile-username" type="text" class="profile-input"
            value="${escapeAttr(ctx.usernameForInput)}"
            placeholder="ej. drmendoza" autocomplete="off" spellcheck="false"
            pattern="[a-z][a-z0-9_]{2,31}" required>
          ${hintHtml('@usuario: minúsculas, sin espacios — p. ej. drmendoza. No es tu nombre en guardia.')}
        </div>
        <div class="field-group">
          <label for="clinical-profile-name">Nombre en guardia</label>
          <input id="clinical-profile-name" type="text" class="profile-input" value="${clinicalName}" required>
        </div>
        <div class="field-group">
          <label for="clinical-profile-rank">Rango clínico</label>
          <select id="clinical-profile-rank" class="profile-input">
            ${['R1', 'R2', 'R3', 'R4']
              .map(
                (r) =>
                  `<option value="${r}" ${r === ctx.rank ? 'selected' : ''}>${r}</option>`
              )
              .join('')}
          </select>
          ${hintHtml('Equipos, entregas y alcance clínico.')}
        </div>
        <div class="field-group">
          <label class="clinical-teams-guardia-label">
            <input type="checkbox" id="clinical-profile-admin" ${ctx.programAdmin ? 'checked' : ''}>
            <span>Privilegios de administración</span>
          </label>
          ${hintHtml('Requiere tu código al activar. Acceso total al programa: rotación, censo global y directorio de usuarios.')}
          ${ctx.programAdmin ? '<button type="button" class="wb-btn wb-btn-secondary" id="btn-clinical-admin-code-change">Cambiar código de administración</button>' : ''}
        </div>
        <div class="field-group">
          <label for="clinical-profile-sala">${ctx.programAdmin ? 'Mi sala (rango clínico)' : 'Sala'}</label>
          <select id="clinical-profile-sala" class="profile-input" required>
            <option value="">— Seleccionar —</option>
            ${CLINICAL_SALAS.map(
              (s) =>
                `<option value="${escapeAttr(s)}" ${ctx.sala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
            ).join('')}
          </select>
          ${ctx.programAdmin ? hintHtml('Tu equipo y entregas usan esta sala; abajo puedes explorar otras.') : ''}
        </div>
        <div class="modal-actions clinical-teams-profile-save">
          <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg">Guardar perfil</button>
        </div>
      </form>
    </div>`;
}

/**
 * R4/Admin only, monthly-at-most action — collapsed by default so it doesn't
 * dominate the screen every time (a resident using this panel daily shouldn't
 * see "Cambiar de rotación" before their own team).
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function buildRotationAdminSectionHtml(user) {
  if (!canConfigureRotation(user)) return '';
  return `
    <section class="clinical-teams-section clinical-teams-section--rotation" aria-label="Cambiar de rotación">
      ${renderClinicalTeamsCollapsible({
        collapseKey: 'section.rotation',
        defaultOpen: false,
        className: 'clinical-teams-collapse--section',
        summaryHtml: `
          <h4 class="clinical-teams-section-title">Cambiar de rotación</h4>
          <p class="clinical-teams-section-desc">Mes nuevo o cambio de equipos del servicio.</p>`,
        bodyHtml: `
          <div class="clinical-teams-rotation-card">
            <p class="clinical-teams-section-desc">Archiva equipos activos y limpia guardias del día; los residentes vuelven a crear o unirse.</p>
            <div class="clinical-teams-advanced-rotation-actions">
              <button type="button" id="btn-nueva-rotacion" class="wb-btn wb-btn-secondary clinical-teams-nueva-rotacion-btn">Iniciar nueva rotación…</button>
              <button type="button" id="btn-rotation-config-open" class="wb-btn wb-btn-secondary">Calendario de vigencia…</button>
            </div>
          </div>`,
      })}
    </section>`;
}

export function buildClinicalTeamsConfigSectionHtml(profileSection) {
  return `
    <section class="clinical-teams-section clinical-teams-section--more">
      ${renderClinicalTeamsCollapsible({
        collapseKey: 'section.config',
        defaultOpen: false,
        className: 'clinical-teams-collapse--section',
        summaryHtml: `
          <h4 class="clinical-teams-section-title">Configuración</h4>
          <p class="clinical-teams-section-desc">Perfil clínico y rango.</p>`,
        bodyHtml: profileSection,
      })}
    </section>`;
}

export function buildPickTeamsBannerHtml(opts) {
  const { directoryCount, sala, elevated, rejoinPending } = opts;
  if (directoryCount <= 0) return '';

  const salaLabel = sala ? escapeHtml(sala) : 'tu sala';
  const countLabel = `${directoryCount} equipo${directoryCount === 1 ? '' : 's'}`;

  if (elevated) {
    const lead = rejoinPending
      ? `Nueva rotación: hay <strong>${countLabel}</strong> ya publicados en <strong>${salaLabel}</strong>. Asigna residentes o crea equipos adicionales si hace falta.`
      : `Hay <strong>${countLabel}</strong> en <strong>${salaLabel}</strong> listos para asignar residentes.`;
    return `<div class="clinical-teams-pick-banner clinical-teams-pick-banner--elevated" role="status">${lead}</div>`;
  }

  // Plain case: the list's own description already says «pulsa Unirme».
  if (!rejoinPending) return '';
  const lead = `Nueva rotación: tu R2 o R4 ya publicó <strong>${countLabel}</strong> en <strong>${salaLabel}</strong>. Elige el tuyo abajo — no hace falta crear uno nuevo.`;
  return `<div class="clinical-teams-pick-banner" role="status">${lead}</div>`;
}

/**
 * @param {number} joinedCount
 * @param {number} directoryCount
 * @param {boolean} elevated
 */
export function shouldUsePickTeamPanelLayout(joinedCount, directoryCount, elevated) {
  if (directoryCount <= 0) return false;
  if (joinedCount > 0) return false;
  return !elevated;
}

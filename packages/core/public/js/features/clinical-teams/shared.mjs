/**
 * Mi rotación — self-serve teams and membership.
 */
import {
  clinicalSessionContext,
} from '../../clinical-access-runtime.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { CLINICAL_SALA_VALUES } from '../../../../lib/clinical-salas.mjs';

import { escapeHtml, escapeAttr } from '../../dom-escape.mjs';
export { escapeHtml, escapeAttr };
export const CLINICAL_TEAM_SERVICES = [
  'Sala',
  'Interconsultas',
  'Eme',
  'Torre HU',
  'UX',
  'Área A/Pensionistas',
];

export const CLINICAL_SALAS = CLINICAL_SALA_VALUES;

export const BROWSE_SALA_LS = 'clinical.browseSala';
export const CLINICAL_TEAMS_COLLAPSE_LS_PREFIX = 'rpc.clinicalTeamsCollapse.';

/** @param {string} key @param {boolean} [defaultOpen] */
export function readClinicalTeamsCollapseOpen(key, defaultOpen = true) {
  try {
    const v = localStorage.getItem(CLINICAL_TEAMS_COLLAPSE_LS_PREFIX + key);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch (_e) { void _e; }
  return defaultOpen;
}

/** @param {string} key @param {boolean} open */
export function writeClinicalTeamsCollapseOpen(key, open) {
  try {
    localStorage.setItem(CLINICAL_TEAMS_COLLAPSE_LS_PREFIX + key, open ? '1' : '0');
  } catch (e) { console.warn('[clinical-teams-shared] failed to write ' + CLINICAL_TEAMS_COLLAPSE_LS_PREFIX + key, e); }
}

/**
 * Collapsible block with persisted open state (Mi rotación sections and team cards).
 * `summaryActionsHtml` (form controls, e.g. a sala filter <select>) renders as a sibling of
 * <summary>, never inside it — a <summary> can only contain plain content; nesting a control
 * in it breaks keyboard/screen-reader toggling (and native <details> ignores <summary> unless
 * it is a direct child of <details>, so it cannot be wrapped either).
 * @param {{ collapseKey: string, defaultOpen?: boolean, summaryHtml: string, summaryActionsHtml?: string, bodyHtml: string, className?: string }} opts
 */
export function renderClinicalTeamsCollapsible(opts) {
  const {
    collapseKey,
    defaultOpen = true,
    summaryHtml,
    summaryActionsHtml = '',
    bodyHtml,
    className = '',
  } = opts;
  const open = readClinicalTeamsCollapseOpen(collapseKey, defaultOpen);
  const extraClass = className ? ` ${className}` : '';
  return `
    <details class="clinical-teams-collapse${extraClass}" data-collapse-key="${escapeAttr(collapseKey)}"${open ? ' open' : ''}>
      <summary class="clinical-teams-collapse-summary">${summaryHtml}</summary>${summaryActionsHtml}
      <div class="clinical-teams-collapse-body">${bodyHtml}</div>
    </details>`;
}

/** @type {boolean} */
let adminAccessGrantedThisSession = false;
/** @type {string|null} */
let verifiedAdminAccessCode = null;

export function isAdminAccessGrantedThisSession() {
  return adminAccessGrantedThisSession;
}

export function markAdminAccessGrantedThisSession() {
  adminAccessGrantedThisSession = true;
}

export function rememberAdminAccessCode(code) {
  adminAccessGrantedThisSession = true;
  verifiedAdminAccessCode = code;
}

export function clearAdminAccessGrant() {
  adminAccessGrantedThisSession = false;
  verifiedAdminAccessCode = null;
}

export function getVerifiedAdminAccessCode() {
  return verifiedAdminAccessCode;
}
/** @type {((value: string|null) => void)|null} */
let adminCodePromptResolve = null;
/** @type {'verify'|'setup'|'change'} */
let adminCodeMode = 'verify';

const ADMIN_CODE_MODES = {
  verify: {
    lead: 'Introduce tu código personal para activar acceso de administración.',
    currentLabel: 'Código',
    submit: 'Activar',
  },
  setup: {
    lead: 'Aún no hay código de administración. Crea uno. Te lo pediremos para activar privilegios.',
    currentLabel: '',
    submit: 'Guardar y activar',
  },
  change: {
    lead: 'Cambia el código de administración de este equipo.',
    currentLabel: 'Código actual',
    submit: 'Guardar código',
  },
};

export function adminCodeModalBackdropEl() {
  return document.getElementById('clinical-admin-code-backdrop');
}

function adminCodeField(id) {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? el : null;
}

function showAdminCodeError(text) {
  const err = document.getElementById('clinical-admin-code-error');
  if (!err) return;
  err.textContent = text;
  err.hidden = !text;
}

function closeAdminCodeModal() {
  const bd = adminCodeModalBackdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function openAdminCodeModal(mode) {
  const bd = adminCodeModalBackdropEl();
  const current = adminCodeField('clinical-admin-code-input');
  if (!bd || !current) return Promise.resolve(null);
  adminCodeMode = mode;
  const cfg = ADMIN_CODE_MODES[mode];
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText('clinical-admin-code-lead', cfg.lead);
  setText('clinical-admin-code-input-label', cfg.currentLabel);
  setText('btn-clinical-admin-code-submit', cfg.submit);
  const needsNew = mode !== 'verify';
  const toggle = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.hidden = !show;
  };
  toggle('clinical-admin-code-current-group', mode !== 'setup');
  toggle('clinical-admin-code-new-group', needsNew);
  toggle('clinical-admin-code-confirm-group', needsNew);
  for (const id of ['clinical-admin-code-input', 'clinical-admin-code-new', 'clinical-admin-code-confirm']) {
    const el = adminCodeField(id);
    if (el) el.value = '';
  }
  showAdminCodeError('');
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  (mode === 'setup' ? adminCodeField('clinical-admin-code-new') : current)?.focus();
  return new Promise((resolve) => {
    adminCodePromptResolve = resolve;
  });
}

/**
 * Asks for the admin code and checks it in the main process.
 * No code saved yet → asks the user to create one first.
 * @returns {Promise<string|null>} verified code, or null on cancel.
 */
export async function promptAdminAccessCode() {
  const api = dbApi();
  if (typeof api?.adminCodeStatus !== 'function') {
    toast('Privilegios de administración solo disponibles en la app de escritorio.', 'error');
    return null;
  }
  const status = await api.adminCodeStatus();
  return openAdminCodeModal(status?.isSet ? 'verify' : 'setup');
}

/** Change the saved admin code. Needs the current code. */
export async function openChangeAdminCodeModal() {
  const code = await openAdminCodeModal('change');
  if (code) toast('Código de administración actualizado.', 'success');
  return !!code;
}

function finishAdminCodePrompt(code) {
  closeAdminCodeModal();
  const resolve = adminCodePromptResolve;
  adminCodePromptResolve = null;
  resolve?.(code);
}

function adminCodeValue(id) {
  return String(adminCodeField(id)?.value || '').trim();
}

async function submitAdminCodeVerify(api) {
  const code = adminCodeValue('clinical-admin-code-input');
  const res = await api?.adminCodeVerify?.({ code });
  if (!res?.valid) {
    showAdminCodeError('Código incorrecto.');
    adminCodeField('clinical-admin-code-input')?.focus();
    return;
  }
  finishAdminCodePrompt(code);
}

async function submitAdminCodeSet(api) {
  const next = adminCodeValue('clinical-admin-code-new');
  if (next !== adminCodeValue('clinical-admin-code-confirm')) {
    showAdminCodeError('Los códigos nuevos no coinciden.');
    adminCodeField('clinical-admin-code-confirm')?.focus();
    return;
  }
  const currentCode =
    adminCodeMode === 'change' ? adminCodeValue('clinical-admin-code-input') : undefined;
  const res = await api?.adminCodeSet?.({ userId: currentUserId(), currentCode, newCode: next });
  if (!res?.ok) {
    showAdminCodeError(res?.error || 'No se pudo guardar el código.');
    return;
  }
  finishAdminCodePrompt(next);
}

function submitAdminCodeModal() {
  const api = dbApi();
  return adminCodeMode === 'verify' ? submitAdminCodeVerify(api) : submitAdminCodeSet(api);
}

export function cancelAdminCodeModal() {
  finishAdminCodePrompt(null);
}

export function wireAdminCodeModalControls() {
  const bd = adminCodeModalBackdropEl();
  if (bd && !bd._rpcAdminCodeBackdropWired) {
    bd._rpcAdminCodeBackdropWired = true;
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) cancelAdminCodeModal();
    });
  }

  const form = document.getElementById('clinical-admin-code-form');
  if (form && !form._rpcAdminCodeFormWired) {
    form._rpcAdminCodeFormWired = true;
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      void submitAdminCodeModal();
    });
  }

  const cancelBtn = document.getElementById('btn-clinical-admin-code-cancel');
  if (cancelBtn && !cancelBtn._rpcAdminCodeCancelWired) {
    cancelBtn._rpcAdminCodeCancelWired = true;
    cancelBtn.addEventListener('click', () => cancelAdminCodeModal());
  }

  const closeBtn = document.getElementById('btn-clinical-admin-code-close');
  if (closeBtn && !closeBtn._rpcAdminCodeCloseWired) {
    closeBtn._rpcAdminCodeCloseWired = true;
    closeBtn.addEventListener('click', () => cancelAdminCodeModal());
  }
}

export function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

import { showToast } from '../../ui-toast.mjs';

export function toast(msg, type = 'info') {
  showToast(msg, type);
}

/** @param {string[]|undefined|null} warnings */
export function toastTeamWarnings(warnings) {
  const first = Array.isArray(warnings) ? String(warnings[0] || '').trim() : '';
  if (first) toast(first, 'warn');
}

export function hintHtml(text) {
  return `<p class="clinical-teams-hint">${escapeHtml(text)}</p>`;
}

export function currentUserId() {
  return String(clinicalSessionContext.user?.user_id || '');
}


export function filterJoinedTeams(teams, userOrUserId, usernameHint) {
  let uid = '';
  let handle = '';
  if (userOrUserId && typeof userOrUserId === 'object') {
    uid = String(userOrUserId.user_id || '');
    handle = normalizeUsername(userOrUserId.username || '');
  } else {
    uid = String(userOrUserId || '');
    handle = normalizeUsername(usernameHint || '');
  }
  if (!uid && !handle) return [];
  return (teams || []).filter((team) =>
    (team.members || []).some((m) => {
      if (uid && String(m.user_id) === uid) return true;
      if (handle && normalizeUsername(m.username || '') === handle) return true;
      return false;
    })
  );
}

/** @param {object} team @param {{ user_id?: string, username?: string }} user */
export function isUserTeamMember(team, user) {
  const uid = String(user?.user_id || '');
  const handle = normalizeUsername(user?.username || '');
  return (team.members || []).some((m) => {
    if (uid && String(m.user_id) === uid) return true;
    if (handle && normalizeUsername(m.username || '') === handle) return true;
    return false;
  });
}

/**
 * Header ⇄ wifi icon — mirrors Conexión chip / runtime status — and its
 * quick-look popover (board «Nube C · vista rápida desde el icono»).
 */
/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

const HEADER_MODIFIERS = ['idle', 'live', 'syncing', 'degraded', 'local', 'offline'];

/**
 * @param {CloudSyncStatus | string} status
 * @param {'ws' | 'poll' | 'offline' | string} [transport]
 */
export function cloudHeaderSyncModifier(status, transport) {
  const key = String(status || 'idle');
  const mode = String(transport || 'poll');
  if (key === 'syncing') return 'syncing';
  // No contact at all is its own shape (a red square), not just another amber.
  if (key === 'error' || key === 'offline') return 'offline';
  if (key === 'pending' || key === 'reconnecting') return 'degraded';
  if (key === 'idle' && mode === 'ws') return 'live';
  if (key === 'idle' && mode === 'poll') return 'local';
  return 'idle';
}

/** Words for the icon's label, the popover title and screen readers. */
const HEADER_STATE_WORDS = {
  idle: 'Todo al día',
  syncing: 'Enviando…',
  pending: 'Cambios en espera',
  reconnecting: 'Reconectando',
  offline: 'Sin conexión Nube',
  error: 'Hay un problema con Nube',
};

/** @param {string} status */
export function cloudHeaderStateWords(status) {
  return HEADER_STATE_WORDS[status] || HEADER_STATE_WORDS.idle;
}

/** @param {HTMLElement} btn @returns {HTMLElement} */
function ensureBadge(btn) {
  let badge = btn.querySelector('.livesync-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'livesync-badge';
    badge.setAttribute('aria-hidden', 'true');
    btn.appendChild(badge);
  }
  return badge;
}

/**
 * @param {CloudSyncStatus | string} status
 * @param {'ws' | 'poll' | 'offline' | string} [transport]
 * @param {number} [pending] queued changes; shown on the icon while not «al día»
 */
export function applyHeaderTeamSyncVisual(status, transport, pending = 0) {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  const mod = cloudHeaderSyncModifier(status, transport);
  HEADER_MODIFIERS.forEach(function (name) {
    btn.classList.remove('btn-livesync-header--' + name);
  });
  btn.classList.add('btn-livesync-header--' + mod);
  const count = mod === 'degraded' || mod === 'offline' ? Number(pending) || 0 : 0;
  const badge = ensureBadge(btn);
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden = count === 0;
  const words = cloudHeaderStateWords(String(status || 'idle'));
  // The static i18n label («Abrir conexión LAN…») would overwrite the state on a locale pass.
  btn.removeAttribute('data-i18n-aria-label');
  btn.removeAttribute('data-i18n-title');
  btn.setAttribute('aria-label', 'Nube: ' + words + (count ? ' · ' + count + ' en espera' : ''));
  btn.title = 'Nube · ' + words;
  if (isNubePopoverOpen()) void refreshNubePopover();
}

// ── Popover ───────────────────────────────────────────────────────────

const POPOVER_ID = 'nube-popover';

export function isNubePopoverOpen() {
  const pop = typeof document !== 'undefined' ? document.getElementById(POPOVER_ID) : null;
  return !!(pop && !pop.hidden);
}

async function readPopoverState() {
  const [snap, diag, runtimeMod, html, settings] = await Promise.all([
    import('./cloud-sync-status-snapshot.mjs'),
    import('./cloud-sync-diagnostics.mjs'),
    import('./panel-conexion-runtime.mjs'),
    import('./panel-conexion-html.mjs'),
    import('./settings.mjs'),
  ]);
  const live = snap.resolveCloudConexionChipStatus();
  return {
    status: live.status,
    room: settings.getCloudSyncRoomSnapshot(),
    pending: runtimeMod.getSharedNubeOutbox()?.list?.()?.length || 0,
    lastPushAt: diag.getLastCloudPushAt(),
    lastPullAt: diag.getLastCloudPullAt(),
    formatMonth: html.formatTurnMonth,
    renderHtml: html.nubePopoverHtml,
    runtime: runtimeMod.getSharedNubeRuntime(),
  };
}

export async function refreshNubePopover() {
  const pop = document.getElementById(POPOVER_ID);
  if (!pop) return;
  const state = await readPopoverState();
  const html = state.renderHtml({ ...state, stateWords: cloudHeaderStateWords, modifier: cloudHeaderSyncModifier });
  // Same markup → leave it (keeps keyboard focus on the button).
  if (pop._nubeHtml !== html) {
    pop.innerHTML = html;
    pop._nubeHtml = html;
  }
}

/** Below the icon, right edges aligned, kept inside the window. @param {HTMLElement} pop @param {HTMLElement} btn */
function placePopover(pop, btn) {
  const r = btn.getBoundingClientRect();
  const right = Math.max(12, window.innerWidth - r.right);
  pop.style.top = Math.round(r.bottom + 8) + 'px';
  pop.style.right = Math.round(right) + 'px';
}

/** @param {boolean} [restoreFocus] */
export function closeNubePopover(restoreFocus = false) {
  const pop = document.getElementById(POPOVER_ID);
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  const btn = document.getElementById('btn-header-team-sync');
  btn?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) btn?.focus();
}

/** @param {MouseEvent} ev */
function onOutsidePointer(ev) {
  const pop = document.getElementById(POPOVER_ID);
  const btn = document.getElementById('btn-header-team-sync');
  const t = /** @type {Node} */ (ev.target);
  if (pop && !pop.contains(t) && !btn?.contains(t)) closeNubePopover();
}

/** @param {KeyboardEvent} ev */
function onPopoverKey(ev) {
  if (ev.key === 'Escape' && isNubePopoverOpen()) {
    ev.stopPropagation();
    closeNubePopover(true);
  }
}

/** @param {{ openPanel: () => void }} actions */
function ensurePopover(actions) {
  let pop = document.getElementById(POPOVER_ID);
  if (pop) return pop;
  pop = document.createElement('div');
  pop.id = POPOVER_ID;
  pop.className = 'nube-popover';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Estado de Nube');
  pop.hidden = true;
  pop.addEventListener('click', function (ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-nube-pop]') : null;
    if (!btn) return;
    const what = btn.getAttribute('data-nube-pop');
    if (what === 'open-panel') {
      closeNubePopover();
      actions.openPanel();
    } else if (what === 'sync') {
      /** @type {HTMLButtonElement} */ (btn).disabled = true;
      void readPopoverState()
        .then((s) => s.runtime?.syncCycle?.())
        .catch(() => {})
        .finally(() => void refreshNubePopover());
    }
  });
  document.body.appendChild(pop);
  document.addEventListener('pointerdown', onOutsidePointer, true);
  document.addEventListener('keydown', onPopoverKey, true);
  window.addEventListener('resize', () => closeNubePopover());
  return pop;
}

/**
 * Toggle the quick-look popover under the header icon.
 * @param {{ openPanel: () => void }} actions
 */
export async function toggleNubePopover(actions) {
  if (isNubePopoverOpen()) {
    closeNubePopover(true);
    return;
  }
  const btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  const pop = ensurePopover(actions);
  await refreshNubePopover();
  placePopover(pop, btn);
  pop.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  pop.querySelector('[data-nube-pop="sync"]')?.focus();
}

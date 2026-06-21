/**
 * LAN ⇄ dropdown chrome (scroll, expand state, in-place refresh) — extracted from panel.mjs.
 */
import { LAN_SYNC_DIAG_OPEN_KEY } from './panel-diagnostics.mjs';
import {
  LAN_INVITE_MOBILE_OPEN_KEY,
  LAN_INVITE_SALA_OPEN_KEY,
} from './panel-invite-join.mjs';
import { isLanSessionConfiguredForRest } from './transport.mjs';
import { lanHubStatusCopy } from './panel-hub-status.mjs';
import {
  wireLanLwwToastPref,
  syncLanLwwOverwriteToastPrefUi,
} from './panel-known-sessions.mjs';

export function isLanConnectionDropdownOpen() {
  var dd = document.getElementById('connection-dropdown');
  return !!(dd && dd.classList.contains('open'));
}

function getConnectionDropdownScrollEl() {
  return document.getElementById('connection-dropdown');
}

export function captureConnectionDropdownScrollTop() {
  var dd = getConnectionDropdownScrollEl();
  if (!dd || !dd.classList.contains('open')) return 0;
  return dd.scrollTop;
}

export function restoreConnectionDropdownScrollTop(scrollTop) {
  var dd = getConnectionDropdownScrollEl();
  if (!dd || !dd.classList.contains('open')) return;
  var top = Math.max(0, Number(scrollTop) || 0);
  function apply() {
    if (dd.scrollHeight > 0) dd.scrollTop = Math.min(top, dd.scrollHeight - dd.clientHeight);
  }
  apply();
  requestAnimationFrame(function () {
    apply();
    requestAnimationFrame(apply);
  });
  setTimeout(apply, 0);
  setTimeout(apply, 50);
}

/** @param {{ force?: boolean } | undefined} [opts] */
export function normalizeLanPanelRenderOpts(opts) {
  if (opts && typeof opts === 'object') return { force: !!opts.force };
  return { force: false };
}

export function captureLanPanelExpandState(root) {
  var state = {
    syncDiagnostics: false,
    inviteMobile: false,
    inviteSala: false,
  };
  try {
    if (sessionStorage.getItem(LAN_SYNC_DIAG_OPEN_KEY) === '1') state.syncDiagnostics = true;
    if (sessionStorage.getItem(LAN_INVITE_MOBILE_OPEN_KEY) === '1') state.inviteMobile = true;
    if (sessionStorage.getItem(LAN_INVITE_SALA_OPEN_KEY) === '1') state.inviteSala = true;
  } catch (_e) { void _e; }
  if (!root) return state;
  var diag = root.querySelector('.lan-sync-diagnostics-panel');
  if (diag && diag.open) state.syncDiagnostics = true;
  var mobile = root.querySelector('.lan-invite-collapsible--mobile');
  if (mobile && mobile.open) state.inviteMobile = true;
  var sala = root.querySelector('.lan-invite-collapsible--sala');
  if (sala && sala.open) state.inviteSala = true;
  return state;
}

export function restoreLanPanelExpandState(root, state) {
  if (!root || !state) return;
  var diag = root.querySelector('.lan-sync-diagnostics-panel');
  if (diag && state.syncDiagnostics) diag.open = true;
  var mobile = root.querySelector('.lan-invite-collapsible--mobile');
  if (mobile && state.inviteMobile) mobile.open = true;
  var sala = root.querySelector('.lan-invite-collapsible--sala');
  if (sala && state.inviteSala) sala.open = true;
}

function lanPanelHasBuiltChrome(root) {
  return !!(root && root.querySelector('.lan-hub-status-card'));
}

function lanPanelNeedsFullRebuild(root, runtime) {
  if (!lanPanelHasBuiltChrome(root)) return true;
  if (runtime().isMobileWeb() || isLanSessionConfiguredForRest()) return false;
  if (!root.querySelector('#lan-input-invite-link')) return true;
  if (!root.querySelector('[data-lan-shift-pin-client]')) return true;
  return false;
}

function refreshHubStatusCard(statusCard, hubStatus, esc) {
  var connected = !!hubStatus.connected;
  var line =
    String(hubStatus.line || '').trim() ||
    (connected
      ? 'Conectado a la red del hospital'
      : 'Sin red — buscando anfitrión en la Wi‑Fi del hospital…');
  var lineEl = statusCard.querySelector('.lan-hub-status-line');
  if (lineEl) {
    lineEl.innerHTML =
      (connected
        ? '<span class="lan-hub-status-dot lan-hub-status-dot--online"></span> '
        : '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span> ') +
      esc(line);
  }
  var hints = statusCard.querySelectorAll('.lan-connect-card-hint');
  var hintText = String(hubStatus.hint || '').trim();
  if (hintText) {
    if (hints.length) hints[0].textContent = hintText;
    else {
      var hintEl = document.createElement('p');
      hintEl.className = 'lan-connect-card-hint';
      hintEl.style.marginTop = '6px';
      hintEl.textContent = hintText;
      statusCard.appendChild(hintEl);
    }
  } else if (hints.length) hints[0].remove();
}

function setConnectionDropdownOpen(open, deps) {
  var dd = document.getElementById('connection-dropdown');
  var bg = document.getElementById('connection-dropdown-backdrop');
  var syncBtn = document.getElementById('btn-header-team-sync');
  if (!dd) return;
  if (open) {
    deps.runtime().closeSettingsDropdown();
    dd.classList.add('open');
    if (bg) bg.classList.add('open');
    if (syncBtn) syncBtn.setAttribute('aria-expanded', 'true');
    deps.wireLanPanelDelegation();
    wireLanLwwToastPref();
    syncLanLwwOverwriteToastPrefUi();
    deps.resumeAutoHostDetectAndReconnect();
    deps.renderLanPanel({ force: true });
    window.setTimeout(function () {
      deps.focusLanShiftPinInput();
    }, 120);
    return;
  }
  dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
  if (syncBtn) syncBtn.setAttribute('aria-expanded', 'false');
}

/** @param {{
 *   runtime: () => object,
 *   esc: (s: string) => string,
 *   renderLanPanel: (opts?: object) => void,
 *   refreshLanSyncDiagnosticsInPlace: () => Promise<void>,
 *   renderLanPreflightUx: (root: HTMLElement) => Promise<unknown>,
 *   wireLanPanelDelegation: () => void,
 *   resumeAutoHostDetectAndReconnect: () => void,
 *   focusLanShiftPinInput: () => boolean,
 * }} deps */
export function createPanelConnectionChrome(deps) {
  async function refreshLanPanelChromeInPlace() {
    if (!isLanConnectionDropdownOpen()) return;
    var root = document.getElementById('lan-connection-panel-root');
    if (!root) return;
    var scrollTop = captureConnectionDropdownScrollTop();
    var statusCard = root.querySelector('.lan-hub-status-card');
    if (statusCard) refreshHubStatusCard(statusCard, lanHubStatusCopy(), deps.esc);
    await deps.refreshLanSyncDiagnosticsInPlace();
    await deps.renderLanPreflightUx(root);
    restoreConnectionDropdownScrollTop(scrollTop);
  }

  function requestRenderLanPanelAfterScan() {
    if (!isLanConnectionDropdownOpen()) return;
    void refreshLanPanelChromeInPlace();
  }

  function closeConnectionDropdown() {
    setConnectionDropdownOpen(false, deps);
  }

  function openConnectionDropdown() {
    setConnectionDropdownOpen(true, deps);
  }

  function toggleConnectionDropdown(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    var dd = document.getElementById('connection-dropdown');
    if (!dd) return;
    if (dd.classList.contains('open')) closeConnectionDropdown();
    else openConnectionDropdown();
  }

  function openTeamSyncFromHeader() {
    openConnectionDropdown();
  }

  return {
    lanPanelHasBuiltChrome,
    lanPanelNeedsFullRebuild: function (root) {
      return lanPanelNeedsFullRebuild(root, deps.runtime);
    },
    refreshLanPanelChromeInPlace,
    requestRenderLanPanelAfterScan,
    closeConnectionDropdown,
    openConnectionDropdown,
    toggleConnectionDropdown,
    openTeamSyncFromHeader,
  };
}

/**
 * LAN ⇄ modal chrome (scroll, expand state, in-place refresh) — extracted from panel.mjs.
 */
import { closeModalAnimated } from '../../ui-motion.mjs';
import { LAN_SYNC_DIAG_OPEN_KEY } from './panel-diagnostics.mjs';
import {
  LAN_INVITE_MOBILE_OPEN_KEY,
  LAN_INVITE_SALA_OPEN_KEY,
} from './panel-invite-join.mjs';
import { isLanSessionConfiguredForRest } from './transport.mjs';
import { isLanSkipShiftPin } from '../../lan-shift-pin-bypass.mjs';
import { lanHubStatusCopy, shouldOmitLanHubStatusHint } from './panel-hub-status.mjs';
import {
  wireLanLwwToastPref,
  syncLanLwwOverwriteToastPrefUi,
} from './panel-known-sessions.mjs';
import { shouldShowNubePanel, shouldUseNubeNotLan } from '../cloud-sync/lan-override.mjs';
import { shouldHidePrimaryLanChrome } from '../cloud-sync/panel-session-gate.mjs';
import { getUserSala } from './panel-clinical-context.mjs';
import { isCloudMobileClient } from '../cloud-mobile/origin.mjs';

export function isLanConnectionDropdownOpen() {
  var bg = document.getElementById('connection-dropdown-backdrop');
  return !!(bg && bg.classList.contains('open'));
}

function getConnectionDropdownScrollEl() {
  return (
    document.getElementById('connection-dropdown-scroll') ||
    document.getElementById('connection-dropdown')
  );
}

let connectionModalChromeWired = false;

function wireConnectionModalChromeOnce(closeConnectionDropdown) {
  if (connectionModalChromeWired) return;
  connectionModalChromeWired = true;
  document.getElementById('btn-connection-dropdown-close')?.addEventListener('click', () => {
    closeConnectionDropdown();
  });
  var bg = document.getElementById('connection-dropdown-backdrop');
  bg?.addEventListener('click', (ev) => {
    if (ev.target === bg) closeConnectionDropdown();
  });
}

export function captureConnectionDropdownScrollTop() {
  var dd = getConnectionDropdownScrollEl();
  if (!dd || !isLanConnectionDropdownOpen()) return 0;
  return dd.scrollTop;
}

export function restoreConnectionDropdownScrollTop(scrollTop) {
  var dd = getConnectionDropdownScrollEl();
  if (!dd || !isLanConnectionDropdownOpen()) return;
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
    roomsPanel: false,
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
  var rooms = root.querySelector('.lan-rooms-panel');
  if (rooms && rooms.open) state.roomsPanel = true;
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
  var rooms = root.querySelector('.lan-rooms-panel');
  if (rooms && state.roomsPanel) rooms.open = true;
}

function lanPanelHasBuiltChrome(root) {
  return !!(
    root &&
    (root.querySelector('.cloud-sync-conexion') ||
      root.querySelector('.lan-connection-hero__status') ||
      root.querySelector('.lan-hub-status-card'))
  );
}

function lanPanelNeedsFullRebuild(root, runtime) {
  if (!lanPanelHasBuiltChrome(root)) return true;
  // Nube (Sala/Torre): never tear down for LAN invite/PIN heuristics — that caused flash.
  if (root.querySelector('.cloud-sync-conexion')) return false;
  if (runtime().isMobileWeb() || isLanSessionConfiguredForRest()) return false;
  if (!root.querySelector('#lan-input-invite-link')) return true;
  if (!isLanSkipShiftPin() && !root.querySelector('[data-lan-shift-pin-client]')) return true;
  return false;
}

function refreshHubStatusCard(statusCard, hubStatus, esc) {
  var hero = statusCard.closest('.lan-connection-hero') || statusCard.parentElement;
  if (!hero) return;

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

  statusCard
    .querySelectorAll('.lan-connect-card-hint, .lan-connection-hero__hint')
    .forEach(function (el) {
      el.remove();
    });

  var hintText = String(hubStatus.hint || '').trim();
  var showHint = hintText && !shouldOmitLanHubStatusHint(hubStatus);
  var hintEl = hero.querySelector('.lan-connection-hero__hint');
  if (showHint) {
    if (!hintEl) {
      hintEl = document.createElement('p');
      hintEl.className = 'lan-connection-hero__hint lan-connect-card-hint';
      var pinBlock = hero.querySelector('.lan-connection-hero__pin');
      if (pinBlock) hero.insertBefore(hintEl, pinBlock);
      else hero.appendChild(hintEl);
    }
    hintEl.textContent = hintText;
  } else if (hintEl) {
    hintEl.remove();
  }
}

function findHubStatusRefreshTarget(root) {
  return (
    root.querySelector('.lan-connection-hero__status') ||
    root.querySelector('.lan-hub-status-card')
  );
}

/**
 * Opening ⇄ with chrome already mounted must not wipe/rebuild (Nube lag).
 * @param {HTMLElement | null} root
 * @param {() => object} runtime
 */
export function shouldForceRebuildOnConnectionOpen(root, runtime) {
  return lanPanelNeedsFullRebuild(root, runtime);
}

/** @param {object} deps */
function syncHostDetectForOpen(deps, nubeActive) {
  if (nubeActive) {
    if (typeof deps.stopLanAutoDiscovery === 'function') deps.stopLanAutoDiscovery();
    return;
  }
  deps.resumeAutoHostDetectAndReconnect();
}

/** @param {object} deps */
function maybeKickLanPinConnect(deps) {
  if (!isLanSkipShiftPin()) {
    window.setTimeout(function () {
      deps.focusLanShiftPinInput();
    }, 120);
    return;
  }
  if (isLanSessionConfiguredForRest()) return;
  void import('../../lan-shift-pin-connect.mjs')
    .then(function (m) {
      return m.tryEasyLanShiftPinConnect({ silent: true, force: true, skipCooldown: true });
    })
    .then(function (result) {
      if (result && result.ok) deps.renderLanPanel({ force: true });
    });
}

/** @param {HTMLElement | null} dd @param {HTMLElement | null} bg @param {HTMLElement | null} syncBtn @param {object} deps */
function openConnectionDropdownUi(dd, bg, syncBtn, deps) {
  deps.runtime().closeSettingsDropdown();
  wireConnectionModalChromeOnce(function () {
    setConnectionDropdownOpen(false, deps);
  });
  if (bg) {
    bg.classList.add('open');
    bg.setAttribute('aria-hidden', 'false');
  }
  if (dd) dd.classList.add('open');
  document.body.classList.add('connection-dropdown-open');
  if (syncBtn) syncBtn.setAttribute('aria-expanded', 'true');
  // Nube salas: Conexión uses cloud click handlers — do not mount LAN panel delegation.
  if (!shouldShowNubePanel(getUserSala())) {
    deps.wireLanPanelDelegation();
  }
  wireLanLwwToastPref();
  syncLanLwwOverwriteToastPrefUi();
  var nubeActive = shouldUseNubeNotLan(getUserSala()) || shouldShowNubePanel(getUserSala());
  syncHostDetectForOpen(deps, nubeActive);
  var root = document.getElementById('lan-connection-panel-root');
  deps.renderLanPanel({ force: shouldForceRebuildOnConnectionOpen(root, deps.runtime) });
  if (!nubeActive) maybeKickLanPinConnect(deps);
}

function setConnectionDropdownOpen(open, deps) {
  var dd = document.getElementById('connection-dropdown');
  var bg = document.getElementById('connection-dropdown-backdrop');
  var syncBtn = document.getElementById('btn-header-team-sync');
  if (!dd && !bg) return;

  function finishClose() {
    if (dd) dd.classList.remove('open');
    if (syncBtn) syncBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('connection-dropdown-open');
  }

  if (open) {
    openConnectionDropdownUi(dd, bg, syncBtn, deps);
    return;
  }

  if (bg) {
    closeModalAnimated(bg, finishClose);
  } else {
    finishClose();
  }
}

/** @param {{
 *   runtime: () => object,
 *   esc: (s: string) => string,
 *   renderLanPanel: (opts?: object) => void,
 *   refreshLanSyncDiagnosticsInPlace: () => Promise<void>,
 *   renderLanPreflightUx: (root: HTMLElement) => Promise<unknown>,
 *   wireLanPanelDelegation: () => void,
 *   resumeAutoHostDetectAndReconnect: () => void,
 *   stopLanAutoDiscovery?: () => void,
 *   focusLanShiftPinInput: () => boolean,
 * }} deps */
export function createPanelConnectionChrome(deps) {
  async function refreshLanPanelChromeInPlace() {
    if (!isLanConnectionDropdownOpen()) return;
    var root = document.getElementById('lan-connection-panel-root');
    if (!root) return;
    var scrollTop = captureConnectionDropdownScrollTop();
    var cloudSala = shouldShowNubePanel(getUserSala());
    if (shouldHidePrimaryLanChrome({ cloudSala })) {
      root.querySelectorAll('.lan-connection-hero').forEach(function (el) {
        el.hidden = true;
      });
      root.querySelectorAll('#lan-conflict-drafts-card, .lan-preflight-row').forEach(function (el) {
        el.hidden = true;
      });
    } else {
      var statusCard = findHubStatusRefreshTarget(root);
      if (statusCard) refreshHubStatusCard(statusCard, lanHubStatusCopy(), deps.esc);
    }
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
    if (isCloudMobileClient()) {
      const msg =
        'R+ Móvil usa la nube automáticamente. Si no ves pacientes, deja R+ abierto en el Mac del turno y recarga.';
      deps.runtime().showToast?.(msg, 'info');
      return;
    }
    setConnectionDropdownOpen(true, deps);
  }

  function toggleConnectionDropdown(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (isLanConnectionDropdownOpen()) closeConnectionDropdown();
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

import { hasProgramAdminPrivileges, effectiveClinicalRank } from '../../clinical-privileges.mjs';
import { getSessionAdminKey } from './panel-admin-helpers.mjs';
import {
  buildAdminShellHtml,
  mutacionesShellHtml,
  mutationsRoomOptionsHtml,
  peligroHtml,
  usuariosShellHtml,
} from './panel-admin-html.mjs';
import { loadAdminResumen, loadAdminSalas } from './panel-admin-data.mjs';
import { createAdminClickHandler } from './panel-admin-actions.mjs';

/**
 * Admin shell visibility.
 * Elevated clinical users always see it; any Nube session can open it to enter
 * SYNC_ADMIN_KEY (Free pilot bootstrap) — API still gates mutations.
 * @param {{ rank?: string, is_program_admin?: number|boolean, user_id?: string, username?: string }|null|undefined} user
 * @param {{ hasCloudSession?: boolean }} [opts]
 */
export function canAccessCloudAdmin(user, opts = {}) {
  if (opts.hasCloudSession) return true;
  if (!user) return false;
  return hasProgramAdminPrivileges(user) || effectiveClinicalRank(user) === 'R4';
}

/** @returns {boolean} */
function shouldShowAdminBootstrap() {
  return !getSessionAdminKey();
}

/**
 * @param {HTMLElement} root
 * @param {string} tabId
 */
function selectAdminTab(root, tabId) {
  const next = String(tabId || 'resumen').trim() || 'resumen';
  root.querySelectorAll('[data-admin-tab]').forEach(function (btn) {
    const active = btn.getAttribute('data-admin-tab') === next;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  root.querySelectorAll('[data-admin-section]').forEach(function (panel) {
    panel.hidden = panel.getAttribute('data-admin-section') !== next;
  });
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   toast?: (msg: string, kind?: string) => void,
 * }} deps
 */
export function mountCloudAdminPanel(host, deps) {
  const toast = deps.toast || function () {};
  /** @type {Array<{ id: string, code?: string, sala?: string }>} */
  const roomsCache = [];
  /** @type {string | null} */
  let openRoomDetailId = null;

  const root = document.createElement('div');
  root.className = 'cloud-sync-admin';
  root.innerHTML = buildAdminShellHtml(shouldShowAdminBootstrap());
  host.appendChild(root);

  const keyInput = root.querySelector('[data-admin-key-input]');
  const savedKey = getSessionAdminKey();
  if (keyInput instanceof HTMLInputElement && savedKey) {
    keyInput.value = savedKey;
  }

  const peligroEl = root.querySelector('[data-admin-peligro]');
  if (peligroEl) peligroEl.innerHTML = peligroHtml();
  const mutEl = root.querySelector('[data-admin-mutaciones]');
  if (mutEl) mutEl.innerHTML = mutacionesShellHtml();
  const usersEl = root.querySelector('[data-admin-usuarios]');
  if (usersEl) usersEl.innerHTML = usuariosShellHtml();

  function updateMutacionesRoomSelect() {
    const sel = root.querySelector('[data-admin-mutations-room]');
    if (!(sel instanceof HTMLSelectElement)) return;
    const prev = sel.value;
    sel.innerHTML = mutationsRoomOptionsHtml(roomsCache);
    if (prev) sel.value = prev;
  }

  const clickDeps = {
    root,
    getApi: deps.getApi,
    toast,
    roomsCache,
    get openRoomDetailId() {
      return openRoomDetailId;
    },
    setOpenRoomDetailId(id) {
      openRoomDetailId = id;
    },
    updateMutacionesRoomSelect,
  };

  const onAdminAction = createAdminClickHandler(clickDeps);
  root.addEventListener('click', function (ev) {
    const tabBtn = ev.target instanceof Element ? ev.target.closest('[data-admin-tab]') : null;
    if (tabBtn) {
      const tabId = tabBtn.getAttribute('data-admin-tab');
      if (tabId) selectAdminTab(root, tabId);
      return;
    }
    onAdminAction(ev);
  });

  const salasCtx = {
    roomsCache,
    get openRoomDetailId() {
      return openRoomDetailId;
    },
    updateMutacionesRoomSelect,
    loadRoomDetail: () => Promise.resolve(),
  };

  selectAdminTab(root, 'resumen');
  void loadAdminResumen(root, deps.getApi);
  void loadAdminSalas(root, deps.getApi, salasCtx);

  return {
    root,
    refresh() {
      void loadAdminResumen(root, deps.getApi);
      void loadAdminSalas(root, deps.getApi, salasCtx);
    },
  };
}

export { getSessionAdminKey, setSessionAdminKey } from './panel-admin-helpers.mjs';

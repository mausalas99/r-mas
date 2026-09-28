import { hasProgramAdminPrivileges, effectiveClinicalRank } from '../../clinical-privileges.mjs';
import { getSessionAdminKey } from './panel-admin-helpers.mjs';
import {
  applyAdminSalasFilters,
  buildAdminShellHtml,
  mutacionesShellHtml,
  mutationsRoomOptionsHtml,
  peligroHtml,
  applyNetworkCensusFilters,
  setSelectAllVisibleNetwork,
  updateNetworkBulkBarVisibility,
} from './panel-admin-html.mjs';
import { loadAdminResumen, loadAdminSalas, loadAdminNetworkCensus, loadAdminMutations } from './panel-admin-data.mjs';
import { createAdminClickHandler } from './panel-admin-actions.mjs';
import { equiposShellHtml } from './panel-admin-equipos-html.mjs';
import { wireCloudEquiposPanel } from './panel-admin-equipos-actions.mjs';

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

/** @param {HTMLElement} root @param {string} tabId */
function selectAdminTab(root, tabId) {
  const raw = String(tabId || 'resumen').trim() || 'resumen';
  const next = raw === 'usuarios' ? 'equipos' : raw;
  root.querySelectorAll('[role="tab"][data-admin-tab]').forEach(function (btn) {
    const active = btn.getAttribute('data-admin-tab') === next;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  root.querySelectorAll('[data-admin-section]').forEach(function (panel) {
    panel.hidden = panel.getAttribute('data-admin-section') !== next;
  });
}

/** @param {HTMLElement} root */
function mountAdminPanelSections(root) {
  const peligroEl = root.querySelector('[data-admin-peligro]');
  if (peligroEl) peligroEl.innerHTML = peligroHtml();
  const mutEl = root.querySelector('[data-admin-mutaciones]');
  if (mutEl) mutEl.innerHTML = mutacionesShellHtml();
  const equiposEl = root.querySelector('[data-admin-equipos]');
  if (equiposEl) equiposEl.innerHTML = equiposShellHtml();
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   toast?: (msg: string, kind?: string) => void,
 *   getCloudSyncRoomId?: () => string,
 *   renderConnected?: (room: object) => void,
 *   setCloudSyncRoomSnapshot?: (room: object) => void,
 *   setCloudSyncRoomId?: (id: string) => void,
 *   setCloudSyncRevision?: (rev: number) => void,
 * }} deps  outer Conexión deps — passed through so "Red" can switch this
 *   device's active room (see joinRoomByCode in panel-conexion-handlers.mjs).
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
  if (keyInput instanceof HTMLInputElement && savedKey) keyInput.value = savedKey;

  mountAdminPanelSections(root);
  const equiposPanel = wireCloudEquiposPanel(root, { getApi: deps.getApi, toast });

  function updateRoomSelects() {
    const prevMut = (() => {
      const sel = root.querySelector('[data-admin-mutations-room]');
      return sel instanceof HTMLSelectElement ? sel.value : '';
    })();
    const prevPel = (() => {
      const sel = root.querySelector('[data-admin-peligro-room]');
      return sel instanceof HTMLSelectElement ? sel.value : '';
    })();
    const opts = mutationsRoomOptionsHtml(roomsCache);
    root.querySelectorAll('[data-admin-mutations-room], [data-admin-peligro-room]').forEach(function (el) {
      if (!(el instanceof HTMLSelectElement)) return;
      const keep = el.hasAttribute('data-admin-mutations-room') ? prevMut : prevPel;
      el.innerHTML = opts;
      if (keep) el.value = keep;
    });
    // Registro starts on this device's sala (or the first one), no «Cargar» click.
    const mut = root.querySelector('[data-admin-mutations-room]');
    if (mut instanceof HTMLSelectElement && !mut.value && roomsCache.length) {
      const mine = deps.getCloudSyncRoomId?.() || '';
      mut.value = roomsCache.some((r) => r.id === mine) ? mine : String(roomsCache[0].id);
    }
  }

  function loadMutacionesIfEmpty() {
    const list = root.querySelector('[data-admin-mutations-list]');
    const sel = root.querySelector('[data-admin-mutations-room]');
    if (list && !list.textContent.trim() && sel instanceof HTMLSelectElement && sel.value) {
      void loadAdminMutations(root, deps.getApi, toast);
    }
  }

  const clickDeps = {
    root,
    getApi: deps.getApi,
    toast,
    roomsCache,
    equiposPanel,
    outerDeps: deps,
    get openRoomDetailId() {
      return openRoomDetailId;
    },
    setOpenRoomDetailId(id) {
      openRoomDetailId = id;
    },
    updateMutacionesRoomSelect: updateRoomSelects,
  };

  root.addEventListener('click', function (ev) {
    const tabBtn = ev.target instanceof Element ? ev.target.closest('[data-admin-tab]') : null;
    if (tabBtn) {
      const tabId = tabBtn.getAttribute('data-admin-tab');
      if (tabId) {
        selectAdminTab(root, tabId);
        const resolved = tabId === 'usuarios' ? 'equipos' : tabId;
        if (resolved === 'equipos') void equiposPanel.refresh();
        if (resolved === 'mutaciones') loadMutacionesIfEmpty();
      }
      return;
    }
    createAdminClickHandler(clickDeps)(ev);
  });

  root.addEventListener('input', function (ev) {
    if (!(ev.target instanceof Element)) return;
    if (ev.target.matches('[data-admin-salas-search]')) applyAdminSalasFilters(root);
    else if (ev.target.matches('[data-network-filter="q"]')) applyNetworkCensusFilters(root);
  });

  root.addEventListener('change', function (ev) {
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) return;
    if (target.matches('[data-admin-mutations-room]')) {
      void loadAdminMutations(root, deps.getApi, toast);
      return;
    }
    if (target.matches('[data-admin-salas-month]')) {
      applyAdminSalasFilters(root);
      return;
    }
    if (target.closest('[data-network-filter]')) {
      applyNetworkCensusFilters(root);
      return;
    }
    if (target.matches('[data-network-select-all]') && target instanceof HTMLInputElement) {
      setSelectAllVisibleNetwork(root, target.checked);
      updateNetworkBulkBarVisibility(root);
      return;
    }
    if (target.closest('[data-network-select]')) {
      updateNetworkBulkBarVisibility(root);
    }
  });

  const salasCtx = {
    roomsCache,
    get openRoomDetailId() {
      return openRoomDetailId;
    },
    updateMutacionesRoomSelect: updateRoomSelects,
    loadRoomDetail: () => Promise.resolve(),
  };

  selectAdminTab(root, 'resumen');
  void loadAdminResumen(root, deps.getApi);
  void loadAdminSalas(root, deps.getApi, salasCtx);
  void loadAdminNetworkCensus(root, deps);

  return {
    root,
    refresh() {
      void loadAdminResumen(root, deps.getApi);
      void loadAdminSalas(root, deps.getApi, salasCtx);
      void loadAdminNetworkCensus(root, deps);
    },
  };
}

export { getSessionAdminKey, setSessionAdminKey } from './panel-admin-helpers.mjs';

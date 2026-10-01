/** Settings gear panel: centered modal (como ⇄ / Mi rotación). */
import { isClinicalLocalOnlyMode, readRpcSettings, readFeatureHintsEnabled } from '../../clinical-settings.mjs';
import { isMobileWeb } from '../../mobile-web.mjs';
import { closeModalAnimated } from '../../ui-motion.mjs';
import { closeConnectionDropdown, openConnectionDropdown } from '../cloud-sync/panel-chrome.mjs';
import { getIdleLockStatus } from '../platform/offline.mjs';
import { isDbMode } from '../../db-storage-bridge.mjs';
import { getSettingsHelpRuntime } from './runtime.mjs';

let settingsModalChromeWired = false;
let settingsSplitPaneWired = false;

export function isSettingsDropdownOpen() {
  var bg = document.getElementById('settings-dropdown-backdrop');
  return !!(bg && bg.classList.contains('open'));
}

function syncSettingsDropdownA11y(open) {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd) return;
  dd.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (bg) bg.setAttribute('aria-hidden', open ? 'false' : 'true');
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function focusSettingsDropdownEntry() {
  var activeNav = document.querySelector('.settings-nav-item.is-active');
  if (activeNav && typeof activeNav.focus === 'function') {
    activeNav.focus();
    return;
  }
  var host =
    document.getElementById('settings-panels') ||
    document.getElementById('settings-dropdown-scroll') ||
    document.getElementById('settings-dropdown');
  if (!host) return;
  var target =
    host.querySelector('.btn-settings-help-primary') ||
    host.querySelector('button, summary, [href], input, select, textarea');
  if (target && typeof target.focus === 'function') target.focus();
}

function isSettingsPanelEmpty(panel) {
  if (!panel) return true;
  var body = panel.querySelector(':scope > .settings-acc-body') || panel;
  var clone = body.cloneNode(true);
  clone.querySelectorAll('[hidden], [style*="display: none"], [style*="display:none"]').forEach(function (el) {
    el.remove();
  });
  var text = String(clone.textContent || '').replace(/\s+/g, '').trim();
  if (text) return false;
  return !clone.querySelector(
    'input, button, select, textarea, img, video, canvas, iframe, [role="button"]'
  );
}

export function syncSettingsNavVisibility() {
  var activeHidden = false;
  document.querySelectorAll('.settings-panel').forEach(function (panel) {
    var empty = isSettingsPanelEmpty(panel);
    var hidden = panel.style.display === 'none' || empty;
    if (empty) {
      panel.hidden = true;
      panel.classList.remove('is-active');
    }
    var btn = document.getElementById('settings-nav-' + panel.id);
    if (!btn) return;
    btn.hidden = hidden;
    if (hidden && btn.classList.contains('is-active')) {
      btn.classList.remove('is-active');
      btn.removeAttribute('aria-current');
      activeHidden = true;
    }
  });
  if (activeHidden) {
    var fallback = document.querySelector('.settings-nav-item[data-settings-target]:not([hidden])');
    if (fallback) showSettingsPanel(fallback.getAttribute('data-settings-target'));
  }
}

export function showSettingsPanel(panelId) {
  if (!panelId) return;
  initSettingsSplitPane();
  var target = document.getElementById(panelId);
  if (!target || target.style.display === 'none' || isSettingsPanelEmpty(target)) return;
  var found = false;
  document.querySelectorAll('.settings-panel').forEach(function (panel) {
    var active = panel.id === panelId;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
    if (active) found = true;
  });
  document.querySelectorAll('.settings-nav-item[data-settings-target]').forEach(function (btn) {
    var active = btn.getAttribute('data-settings-target') === panelId && !btn.hidden;
    btn.classList.toggle('is-active', active);
    if (active) btn.setAttribute('aria-current', 'true');
    else btn.removeAttribute('aria-current');
    if (active) found = true;
  });
  if (!found) return;
  var panels = document.getElementById('settings-panels');
  if (panels) panels.scrollTop = 0;
  if (panelId === 'settings-accordion-updates') {
    document.dispatchEvent(new CustomEvent('rpc-settings-updates-panel-shown'));
  }
  syncSettingsStatusCards();
  var hintsCb = document.getElementById('settings-feature-hints');
  if (hintsCb) hintsCb.checked = readFeatureHintsEnabled() === true;
}

function demoteDetailsToPanel(det) {
  var panel = document.createElement('div');
  Array.from(det.attributes).forEach(function (attr) {
    if (attr.name === 'open') return;
    panel.setAttribute(attr.name, attr.value);
  });
  while (det.firstChild) {
    panel.appendChild(det.firstChild);
  }
  det.replaceWith(panel);
  return panel;
}

const SETTINGS_ICON_PATHS = {
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  apariencia: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  respaldos: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  laboratorio: '<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  documentos: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  plantillas: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  seguridad: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  aplicacion: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>',
  nube: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
  peligro: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
};

function settingsIconSvg(key) {
  var path = SETTINGS_ICON_PATHS[key];
  if (!path) return '';
  return (
    '<svg class="settings-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    path +
    '</svg>'
  );
}

/** One side-menu button for a section (board «Ajustes A»). */
function buildSettingsNavItem(panelId, label, iconKey) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'settings-nav-item';
  btn.id = 'settings-nav-' + panelId;
  btn.setAttribute('data-settings-target', panelId);
  btn.setAttribute('aria-controls', panelId);
  btn.innerHTML = settingsIconSvg(iconKey) + '<span></span>';
  btn.querySelector('span').textContent = label;
  if (iconKey === 'peligro') btn.classList.add('settings-nav-item--danger');
  return btn;
}

/** «Nube y equipo ↗» — not a section: opens the Nube panel. */
function buildNubeNavLink() {
  var link = document.createElement('button');
  link.type = 'button';
  link.className = 'settings-nav-item settings-nav-link';
  link.innerHTML = settingsIconSvg('nube') + '<span>Nube y equipo ↗</span>';
  link.addEventListener('click', function () {
    closeSettingsDropdown();
    openConnectionDropdown();
  });
  return link;
}

/** Turns one <details> section into a panel + its menu item (with group label / bottom pin). */
function addSettingsSection(det, index, nav, panels) {
  var summary = det.querySelector(':scope > summary');
  var label = summary ? summary.textContent.trim() : 'Sección';
  var panelId = det.id || 'settings-panel-' + index;
  if (!det.id) det.id = panelId;
  var group = det.getAttribute('data-settings-group');
  var pinned = det.getAttribute('data-settings-pin') === 'bottom';
  if (pinned) {
    if (!nav.querySelector('.settings-nav-link')) nav.appendChild(buildNubeNavLink());
    var spacer = document.createElement('span');
    spacer.className = 'settings-nav-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    nav.appendChild(spacer);
  } else if (group) {
    var groupLabel = document.createElement('p');
    groupLabel.className = 'settings-nav-group';
    groupLabel.textContent = group;
    nav.appendChild(groupLabel);
  }
  nav.appendChild(buildSettingsNavItem(panelId, label, det.getAttribute('data-settings-icon') || ''));
  if (summary) summary.remove();
  var panel = demoteDetailsToPanel(det);
  panel.classList.add('settings-panel');
  if (panel.classList.contains('settings-accordion--full')) panel.classList.add('settings-panel--wide');
  var title = document.createElement('h4');
  title.className = 'settings-panel-title';
  title.textContent = label;
  panel.insertBefore(title, panel.firstChild);
  panels.appendChild(panel);
  return panel;
}

function initSettingsSplitPane() {
  if (settingsSplitPaneWired) {
    syncSettingsNavVisibility();
    return;
  }
  var grid = document.querySelector('.settings-accordion-grid');
  if (!grid) return;
  settingsSplitPaneWired = true;

  var items = Array.from(grid.querySelectorAll(':scope > .settings-accordion'));
  if (!items.length) return;

  var split = document.createElement('div');
  split.className = 'settings-split';

  // A plain nav of buttons, not a tablist: it also holds group labels and the
  // Nube link, and has no arrow-key roving. aria-current marks the open section.
  var nav = document.createElement('nav');
  nav.className = 'settings-nav';
  nav.id = 'settings-nav';
  nav.setAttribute('aria-label', 'Secciones de ajustes');

  var panels = document.createElement('div');
  panels.className = 'settings-panels';
  panels.id = 'settings-panels';

  var initialId = '';
  items.forEach(function (det, index) {
    var panel = addSettingsSection(det, index, nav, panels);
    if (!initialId && panel.style.display !== 'none' && !isSettingsPanelEmpty(panel)) initialId = panel.id;
  });
  if (!nav.querySelector('.settings-nav-link')) nav.appendChild(buildNubeNavLink());

  split.appendChild(nav);
  split.appendChild(panels);
  grid.replaceWith(split);

  nav.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.settings-nav-item[data-settings-target]');
    if (!btn || btn.hidden) return;
    showSettingsPanel(btn.getAttribute('data-settings-target'));
  });
  // «Ir a Respaldos primero» and similar in-panel jumps.
  panels.addEventListener('click', function (ev) {
    var jump = ev.target.closest('[data-settings-goto]');
    if (jump) showSettingsPanel(jump.getAttribute('data-settings-goto'));
  });

  syncSettingsNavVisibility();
  showSettingsPanel(initialId);
}

/** «hace 2 h» for an epoch ms. */
function agoLabel(ms) {
  if (!ms) return '';
  var mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return 'hace ' + mins + ' min';
  var h = Math.floor(mins / 60);
  if (h < 48) return 'hace ' + h + ' h';
  return 'hace ' + Math.floor(h / 24) + ' días';
}

function readAutoBackupStatus() {
  try {
    var raw = JSON.parse(localStorage.getItem('rpc-auto-backup-settings') || '{}');
    return {
      frequency: raw.frequency === 'daily' || raw.frequency === 'weekly' ? raw.frequency : 'off',
      retention: [3, 7, 14].indexOf(Number(raw.retention)) >= 0 ? Number(raw.retention) : 7,
      lastRunAt: Number(raw.lastRunAt) || 0,
    };
  } catch {
    return { frequency: 'off', retention: 7, lastRunAt: 0 };
  }
}

/** Respaldos card: when the last backup ran and what auto-backup does. */
function syncBackupStatusCard() {
  var card = document.querySelector('[data-settings-backup-status]');
  if (!card) return;
  var st = readAutoBackupStatus();
  var title = card.querySelector('[data-settings-backup-title]');
  var sub = card.querySelector('[data-settings-backup-sub]');
  var stale = !st.lastRunAt || Date.now() - st.lastRunAt > 8 * 24 * 3600000;
  if (title) title.textContent = st.lastRunAt ? 'Respaldado ' + agoLabel(st.lastRunAt) : 'Sin respaldos todavía';
  if (sub) {
    sub.textContent =
      st.frequency === 'off'
        ? 'Auto-respaldo desactivado · Descargas'
        : 'Auto-respaldo ' + (st.frequency === 'daily' ? 'diario' : 'semanal') + ' · se guardan ' + st.retention + ' archivos · Descargas';
  }
  card.querySelector('.settings-status-icon')?.setAttribute('data-state', stale ? 'warn' : 'ok');
}

/** Seguridad card: lock time and PIN. */
function syncSecurityStatusCard() {
  var sub = document.querySelector('[data-settings-security-sub]');
  if (!sub) return;
  var st = getIdleLockStatus();
  sub.textContent =
    (st.minutes ? 'Se bloquea tras ' + st.minutes + ' min sin uso' : 'Sin bloqueo automático') +
    ' · ' +
    (st.hasPin ? 'PIN activo' : 'Sin PIN');
  document
    .querySelector('[data-settings-security-status] .settings-status-icon')
    ?.setAttribute('data-state', st.hasPin && st.minutes ? 'ok' : 'warn');
}

/** Aplicación card: channel in words. */
function syncAppStatusCard() {
  var sub = document.querySelector('[data-settings-app-sub]');
  if (!sub) return;
  var sel = document.getElementById('rpc-update-channel');
  var channel = sel && sel.value === 'beta' ? 'Pre-releases' : 'Estable';
  sub.textContent = 'Canal ' + channel + '. Tus datos locales no se tocan al actualizar.';
}

export function syncSettingsStatusCards() {
  var db = isDbMode();
  document.querySelectorAll('#settings-dropdown [data-settings-db-only]').forEach(function (el) {
    el.hidden = !db;
  });
  var secTitle = document.querySelector('[data-settings-security-title]');
  if (secTitle) secTitle.textContent = db ? 'Datos cifrados en este equipo' : 'Bloqueo de este equipo';
  syncBackupStatusCard();
  syncSecurityStatusCard();
  syncAppStatusCard();
}

function foldDiacritics(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function navItemSearchText(btn, panelId) {
  var panel = document.getElementById(panelId);
  var bits = [btn.textContent];
  if (panel) {
    panel.querySelectorAll('.settings-card__title, .settings-form-label').forEach(function (el) {
      bits.push(el.textContent);
    });
  }
  return foldDiacritics(bits.join(' '));
}

/** Filters the Ajustes sidebar by section name and setting name (accent-insensitive). */
export function filterSettingsNav(query) {
  initSettingsSplitPane();
  var q = foldDiacritics(query).trim();
  var items = Array.from(document.querySelectorAll('.settings-nav-item[data-settings-target]'));
  if (!q) {
    items.forEach(function (btn) {
      btn.hidden = false;
    });
    syncSettingsNavVisibility();
    return;
  }
  var firstMatchId = '';
  items.forEach(function (btn) {
    var panelId = btn.getAttribute('data-settings-target');
    var matches = navItemSearchText(btn, panelId).indexOf(q) !== -1;
    btn.hidden = !matches;
    if (matches && !firstMatchId) firstMatchId = panelId;
  });
  if (firstMatchId) showSettingsPanel(firstMatchId);
}

function wireSettingsModalChromeOnce() {
  if (settingsModalChromeWired) return;
  settingsModalChromeWired = true;
  document.getElementById('btn-settings-dropdown-close')?.addEventListener('click', () => {
    closeSettingsDropdown();
  });
  var bg = document.getElementById('settings-dropdown-backdrop');
  bg?.addEventListener('click', (ev) => {
    if (ev.target === bg) closeSettingsDropdown();
  });
}

function finishCloseSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  if (dd) dd.classList.remove('open');
  document.body.classList.remove('settings-dropdown-open');
  syncSettingsDropdownA11y(false);
  var trigger = document.getElementById('btn-open-settings');
  if (trigger && typeof trigger.focus === 'function') trigger.focus();
}

export function toggleSettingsSection() {
  toggleSettingsDropdown();
}

export function toggleSettingsDropdown() {
  if (isMobileWeb()) return;
  if (isSettingsDropdownOpen()) {
    closeSettingsDropdown();
    return;
  }
  closeConnectionDropdown();
  wireSettingsModalChromeOnce();
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd || !bg) return;
  bg.classList.add('open');
  dd.classList.add('open');
  document.body.classList.add('settings-dropdown-open');
  syncSettingsDropdownA11y(true);
  getSettingsHelpRuntime().syncPreimportBackupUi();
  getSettingsHelpRuntime().syncSettingsLanHostDiskSection();
  void import('../clinical-sync-mode-settings.mjs')
    .then((m) => {
      if (typeof m.syncClinicalSyncModeSettingsUi === 'function') {
        m.syncClinicalSyncModeSettingsUi();
      }
    })
    .catch(() => {});
  initSettingsSplitPane();
  syncSettingsNavVisibility();
  syncSettingsStatusCards();
  var searchInput = document.getElementById('settings-search-input');
  if (searchInput && searchInput.value) {
    searchInput.value = '';
    filterSettingsNav('');
  }
  var scrollHost = document.getElementById('settings-dropdown-scroll');
  if (scrollHost) scrollHost.scrollTop = 0;
  var activePanel = document.querySelector('.settings-panel.is-active');
  if (activePanel && activePanel.id === 'settings-accordion-updates') {
    document.dispatchEvent(new CustomEvent('rpc-settings-updates-panel-shown'));
  }
  focusSettingsDropdownEntry();
}

export function closeSettingsDropdown() {
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (bg && bg.classList.contains('open')) {
    closeModalAnimated(bg, finishCloseSettingsDropdown);
    return;
  }
  finishCloseSettingsDropdown();
}

/** Abre Ajustes en Respaldos. */
export function expandSettingsAccordionBackupSync() {
  if (!isSettingsDropdownOpen()) toggleSettingsDropdown();
  showSettingsPanel('settings-accordion-backup-sync');
}

export function syncTeamSyncHeaderButton() {
  var btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    btn.style.display = 'none';
    return;
  }
  var desktop = !!(window.electronAPI && typeof window.electronAPI.getAppVersion === 'function');
  btn.style.display = desktop || isMobileWeb() ? 'flex' : 'none';
}

export function ensureSettingsDropdownOpen() {
  if (!isSettingsDropdownOpen()) toggleSettingsDropdown();
}

/** Opens Ajustes on one section (e.g. Perfil from «Mi perfil»). */
export function openSettingsPanel(panelId) {
  if (!isSettingsDropdownOpen()) toggleSettingsDropdown();
  showSettingsPanel(panelId);
}

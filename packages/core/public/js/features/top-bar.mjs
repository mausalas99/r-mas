/**
 * One top bar (nav redesign, owner pick 2026-09-28, board 7): brand · area
 * pill · the active area's flat row of tabs · actions. Desktop only.
 *
 * The area tablist becomes the pill's menu (four areas, fixed order, keys 1-4)
 * and each area's row is moved (not copied) into <header>, so every id,
 * handler and aria role stays the same. A moved bar is
 * shown only while its old owner (patient view, lab shell, med shell) is
 * visible — one MutationObserver keeps that true for every code path that
 * shows or hides those owners.
 */
import { isMobileWeb } from '../mobile-web.mjs';
import { wireGlide } from './nav-glide.mjs';

var L2_BARS = [
  // [selector of the bar, its area panel, the element that used to contain it]
  ['#patient-expediente-classic > .exp-expediente-nav', 'appcontent-nota', 'patient-view'],
  ['#lab-inner-nav', 'appcontent-lab', 'appcontent-lab'],
  ['#med-subview-tabs-bar', 'appcontent-med', 'med-active-shell'],
];

/** Area tab selected (panel not aria-hidden) and the old container is shown. */
function ownerVisible(m) {
  if (m.panel.getAttribute('aria-hidden') === 'true' || m.panel.classList.contains('app-tab-panel-hidden')) return false;
  if (typeof m.owner.checkVisibility === 'function') return m.owner.checkVisibility();
  return m.owner.getClientRects().length > 0;
}

export function mountTopBar() {
  if (isMobileWeb()) return;
  var header = document.querySelector('body > header');
  var tablist = document.getElementById('app-main-tablist');
  if (!header || !tablist || header.querySelector('.topbar-nav')) return;
  var nav = document.createElement('div');
  nav.className = 'topbar-nav';
  var slot = document.createElement('div');
  slot.className = 'topbar-l2';
  nav.append(buildAreaPill(tablist), slot);
  header.insertBefore(nav, header.querySelector('.header-right'));
  document.documentElement.classList.add('rpc-topbar');

  var moved = [];
  L2_BARS.forEach(function (pair) {
    var bar = document.querySelector(pair[0]);
    var panel = document.getElementById(pair[1]);
    var owner = document.getElementById(pair[2]);
    if (!bar || !panel || !owner) return;
    slot.appendChild(bar);
    wireGlide(bar.querySelector('#exp-group-row') || bar);
    moved.push({ bar: bar, panel: panel, owner: owner });
  });

  var queued = false;
  function sync() {
    queued = false;
    moved.forEach(function (m) {
      m.bar.classList.toggle('topbar-l2-off', !ownerVisible(m));
    });
  }
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }
  var root = document.getElementById('main-area');
  if (root && typeof MutationObserver === 'function') {
    new MutationObserver(queue).observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'hidden', 'class', 'aria-hidden'],
    });
  }
  sync();
  var row = slot.querySelector('#exp-group-row');
  if (row) makeRoom(header, row);
}

var AREA_ORDER = ['nota', 'lab', 'med', 'agenda'];

/**
 * Area pill: shows the current area; hover, focus or click opens the four
 * areas in fixed order. Keys 1-4 jump while focus is in the pill. The existing
 * #app-main-tablist is the menu, so its ids and click handlers do not change.
 */
function buildAreaPill(tablist) {
  var wrap = document.createElement('div');
  wrap.className = 'topbar-area';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'topbar-area-btn';
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  wrap.append(btn, tablist);
  function sync() {
    AREA_ORDER.forEach(function (id, i) {
      var tab = document.getElementById('apptab-' + id);
      if (tab && tab.dataset.key !== String(i + 1)) tab.dataset.key = String(i + 1);
    });
    var active = tablist.querySelector('.app-tab[aria-selected="true"]') || tablist.querySelector('.app-tab.active');
    var label = active && active.querySelector('.app-tab-label');
    var name = label ? label.textContent.trim() : '';
    btn.textContent = name;
    btn.setAttribute('aria-label', 'Área: ' + name);
  }
  function close() {
    wrap.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }
  btn.addEventListener('click', function () {
    var open = wrap.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  // A pick (mouse or key) folds the menu again, even if keyboard focus had opened it.
  tablist.addEventListener('click', function (e) {
    close();
    if (e.detail && wrap.contains(document.activeElement)) document.activeElement.blur();
  });
  wrap.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      close();
      btn.focus();
      return;
    }
    var id = AREA_ORDER[Number(e.key) - 1];
    var tab = id && !e.metaKey && !e.ctrlKey && !e.altKey && document.getElementById('apptab-' + id);
    if (!tab) return;
    e.preventDefault();
    tab.click();
    btn.focus();
  });
  document.addEventListener('pointerdown', function (e) { if (!wrap.contains(e.target)) close(); }, true);
  if (typeof MutationObserver === 'function') {
    new MutationObserver(sync).observe(tablist, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'], childList: true, characterData: true });
  }
  sync();
  return wrap;
}

// Room for every tab: Atajos + Aprender become one «Ayuda» menu and tab
// labels shorten below 1440 px. Censo and the mode switcher stay in the
// header (owner 2026-09-28, board 7).
var SHORT = {
  'Estado actual': 'Estado',
  Eventualidades: 'Eventual.',
  Medicamentos: 'Meds',
  'Nota de evolución': 'Nota',
  Indicaciones: 'Indic.',
  Interconsulta: 'IC',
};
function makeRoom(header, row) {
  buildHelpMenu(header);
  arrangeSidebar();

  /**
   * Short labels below 1440 px, or when a group has 4+ sections
   * (Interconsulta), full name in the tooltip. The mode switcher, when it
   * has to stay in the header (no list on screen), shows «IC».
   */
  function labels() {
    var most = 0;
    row.querySelectorAll('.exp-group-pill').forEach(function (el) { most = Math.max(most, el.querySelectorAll('.exp-group-section').length); });
    var short = innerWidth < 1440 || most >= 4;
    var seg = document.getElementById('header-mode-seg');
    var segInHeader = !!seg && header.contains(seg);
    var els = Array.prototype.slice.call(row.querySelectorAll('.exp-group-section, .exp-group-name'));
    if (seg) els = els.concat(Array.prototype.slice.call(seg.querySelectorAll('.header-mode-seg-btn')));
    els.forEach(function (el) {
      if (!el.dataset.full) el.dataset.full = el.textContent;
      var on = el.classList.contains('header-mode-seg-btn') ? segInHeader : short;
      var want = on && SHORT[el.dataset.full] ? SHORT[el.dataset.full] : el.dataset.full;
      if (el.textContent !== want) el.textContent = want;
      if (want !== el.dataset.full) el.setAttribute('aria-label', el.dataset.full);
      else if (el.getAttribute('aria-label') === el.dataset.full) el.removeAttribute('aria-label');
      if (!el.classList.contains('header-mode-seg-btn')) {
        if (want !== el.dataset.full) el.title = el.dataset.full;
        else if (el.title === el.dataset.full) el.removeAttribute('title');
      }
    });
  }
  var queued = false;
  function refresh() {
    queued = false;
    labels();
  }
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }
  // Views show and hide by attribute too (board ↔ patient, sidebar ↔ cards).
  if (typeof MutationObserver === 'function') {
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'aria-hidden'] });
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(queue).observe(row);
  addEventListener('resize', queue);

  refresh();
}

/**
 * Sidebar head, owner pick 2026-09-28 (board «A · Dos filas»): row 1 is the
 * hide toggle, Censo and «+ Agregar»; row 2 is the search with Filtros inside
 * it, the cards toggle and «Seleccionar varios».
 */
function arrangeSidebar() {
  var search = document.querySelector('#patient-sidebar .patient-search-wrap');
  if (!search) return;
  var input = document.getElementById('patient-search');
  if (input) input.placeholder = 'Buscar';
  ['patient-filters-anchor', 'btn-patient-bulk-select'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) search.appendChild(el);
  });
}

/** One «Ayuda» icon with a small click-open menu for Atajos and Aprender R+. */
function buildHelpMenu(header) {
  var wrap = document.createElement('div');
  wrap.className = 'topbar-help';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-header-icon ui-pressable topbar-help-btn';
  btn.title = 'Ayuda';
  btn.setAttribute('aria-label', 'Ayuda');
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17h.01"/></svg>';
  var menu = document.createElement('div');
  menu.className = 'topbar-help-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  [['btn-header-shortcuts', 'Atajos de teclado'], ['btn-open-learn', 'Aprender R+']].forEach(function (pair) {
    var item = document.createElement('button');
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.textContent = pair[1];
    item.addEventListener('click', function () {
      close();
      var orig = document.getElementById(pair[0]);
      if (orig) orig.click();
    });
    menu.appendChild(item);
  });
  function close() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }
  btn.addEventListener('click', function () {
    menu.hidden = !menu.hidden;
    btn.setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('pointerdown', function (e) { if (!wrap.contains(e.target)) close(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
  wrap.append(btn, menu);
  var util = header.querySelector('.header-util-cluster');
  var settings = document.getElementById('btn-open-settings');
  if (util) util.insertBefore(wrap, settings && settings.parentNode === util ? settings : null);
}

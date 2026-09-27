/**
 * One 48 px top bar (Nav-G / E2, owner pick 2026-09-27): brand · level-1 area
 * tabs · divider · the active area's level-2 bar · actions. Desktop only.
 *
 * The level-1 tablist and each area's level-2 bar are moved (not copied) into
 * <header>, so every id, handler and aria role stays the same. A moved bar is
 * shown only while its old owner (patient view, lab shell, med shell) is
 * visible — one MutationObserver keeps that true for every code path that
 * shows or hides those owners.
 */
import { isMobileWeb } from '../mobile-web.mjs';

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
  var sep = document.createElement('span');
  sep.className = 'topbar-sep';
  sep.setAttribute('aria-hidden', 'true');
  var slot = document.createElement('div');
  slot.className = 'topbar-l2';
  nav.append(tablist, sep, slot);
  header.insertBefore(nav, header.querySelector('.header-right'));
  document.documentElement.classList.add('rpc-topbar');

  var moved = [];
  L2_BARS.forEach(function (pair) {
    var bar = document.querySelector(pair[0]);
    var panel = document.getElementById(pair[1]);
    var owner = document.getElementById(pair[2]);
    if (!bar || !panel || !owner) return;
    slot.appendChild(bar);
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
  if (row) makeRoom(header, row, tablist);
}

// Room for every level-2 pill (owner pick 2026-09-27, «Una pastilla»): the
// area tabs fold into one pill that grows on hover or keyboard focus (CSS),
// Atajos + Aprender become one «Ayuda» menu, Censo and the mode switcher
// leave the header, and pill labels shorten below 1440 px.
var SHORT = {
  'Estado actual': 'Estado',
  Eventualidades: 'Eventual.',
  Medicamentos: 'Meds',
  'Nota de evolución': 'Nota',
  Indicaciones: 'Indic.',
  Interconsulta: 'IC',
};
/** On screen and not under another view (the sidebar can sit behind the interconsulta page). */
function visible(el) {
  if (!el || el.closest('[hidden]')) return false;
  var r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  var hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 10));
  return !!hit && (el.contains(hit) || !!hit.closest('.toast-stack, .fh-layer'));
}

function makeRoom(header, row, tablist) {
  var moves = ['btn-export-censo-header', 'header-mode-seg'].map(function (id) {
    var el = document.getElementById(id);
    return el && { el: el, parent: el.parentNode, next: el.nextSibling };
  }).filter(Boolean);
  buildHelpMenu(header);

  // Sidebar list view: one extra row in its header for the moved items.
  var sideRow = document.createElement('div');
  sideRow.className = 'topbar-listhead';
  var sideHead = document.querySelector('#patient-sidebar .sidebar-header');
  if (sideHead) sideHead.appendChild(sideRow);

  /**
   * Censo goes to the patient list head; the mode switcher next to
   * «Mi rotación» when that bar shows, else the list head. Card view, the
   * interconsulta board and the sidebar each have their own head; no list on
   * screen → back to the header, so the switcher is never out of reach.
   */
  function place() {
    if (document.querySelector('.modal-backdrop.open')) return; // a dialog covers every head: keep the last spot
    var heads = ['.sv-home-head .sv-home-actions', '.ic-board-header', '#patient-sidebar .topbar-listhead'];
    moves.forEach(function (m) {
      var target = null;
      var list = m.el.id === 'header-mode-seg' ? ['#clinical-context-bar'].concat(heads) : heads;
      for (var i = 0; i < list.length && !target; i++) {
        var el = document.querySelector(list[i]);
        // The sidebar row is empty until an item lands in it: judge its header instead.
        if (el && visible(el === sideRow ? sideHead : el)) target = el;
      }
      if (target) {
        // Board and card heads: after their own buttons, so «+ Agregar» stays first.
        var first = target.id === 'clinical-context-bar' || target === sideRow;
        if (m.el.parentNode !== target) target.insertBefore(m.el, first ? target.firstChild : null);
      } else if (m.el.parentNode !== m.parent) {
        m.parent.insertBefore(m.el, m.next && m.next.parentNode === m.parent ? m.next : null);
      }
    });
  }
  /**
   * Short labels below 1440 px, or when a group has 4+ sections
   * (Interconsulta), full name in the tooltip. The mode switcher, when it
   * has to stay in the header (no list on screen), shows «IC».
   */
  function labels() {
    var most = 0;
    row.querySelectorAll('.exp-group-sections-inner').forEach(function (el) { most = Math.max(most, el.children.length); });
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
  // A mouse pick folds the area pill again, even if keyboard focus had opened it.
  tablist.addEventListener('click', function (e) {
    if (e.detail && tablist.contains(document.activeElement)) document.activeElement.blur();
  });
  var queued = false;
  function refresh() {
    queued = false;
    place();
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

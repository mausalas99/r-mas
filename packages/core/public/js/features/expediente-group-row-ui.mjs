/**
 * Renders the flat section row (#exp-group-row) from the pure model: one tab
 * per section, groups only as thin dividers. Wide windows only — CSS hides it
 * <1100px and shows the classic two-level bars instead, which stay fully
 * synced by the existing code paths.
 * Selection goes through the existing window globals (switchConsolidatedTab /
 * switchInnerTab) so behavior is identical to the classic bars.
 */
import { buildGroupRowModel } from '../expediente-group-row.mjs';
import { updateExpPendientesTabBadge } from './todos-list-render.mjs';

var resyncWired = false;

export function usesGroupedExpedienteRow() {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('rpc-mobile-web')) {
    return true;
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(min-width: 1100px)').matches;
  }
  return false;
}

function rowEl() {
  return document.getElementById('exp-group-row');
}

export function renderExpedienteGroupRow(activeGranular, settings) {
  var row = rowEl();
  if (!row) return;
  if (!row._pointerWired) {
    row._pointerWired = true;
    row.setAttribute('role', 'tablist');
    row.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      var tabs = Array.prototype.slice.call(row.querySelectorAll('[role="tab"]'));
      var idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      ev.preventDefault();
      var next = tabs[(idx + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      if (next) next.focus();
    });
  }
  var model = buildGroupRowModel(activeGranular || 'todo', settings || {});
  row.textContent = '';
  // Flat row (nav redesign, board 7): every section is a tab; a group is only a thin divider.
  function tab(cls, label, active, onPick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls + (active ? ' is-active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.textContent = label;
    btn.addEventListener('click', onPick);
    return btn;
  }
  model.forEach(function (group, i) {
    if (i > 0) {
      var div = document.createElement('span');
      div.className = 'exp-group-div';
      div.setAttribute('role', 'presentation');
      row.appendChild(div);
    }
    var pill = document.createElement('div');
    pill.className = 'exp-group-pill' + (group.active ? ' is-active' : '') + (group.leaf ? ' exp-group-pill--leaf' : '');
    pill.dataset.group = group.id;
    pill.setAttribute('role', 'presentation');
    if (group.leaf) {
      var name = tab('exp-group-name', group.label, group.active, function () {
        if (group.granularTarget) {
          if (typeof window.switchInnerTab === 'function') window.switchInnerTab(group.granularTarget);
        } else if (typeof window.switchConsolidatedTab === 'function') {
          window.switchConsolidatedTab(group.id);
        }
      });
      pill.appendChild(name);
      if (group.granularTarget === 'todo') {
        var badge = document.createElement('span');
        badge.className = 'wb-pendientes-tab-badge exp-group-pendientes-badge';
        badge.id = 'exp-pendientes-badge';
        badge.hidden = true;
        name.appendChild(badge);
      }
    }
    group.sections.forEach(function (section) {
      var btn = tab('exp-group-section', section.label, section.active, function () {
        if (typeof window.switchInnerTab === 'function') window.switchInnerTab(section.id);
      });
      btn.dataset.section = section.id;
      pill.appendChild(btn);
    });
    row.appendChild(pill);
  });
  updateExpPendientesTabBadge();
}

/** Re-sync classic bars/indicator when crossing the grouped-row breakpoint. */
export function wireGroupRowBreakpointResync(syncFn) {
  if (resyncWired || typeof window.matchMedia !== 'function') return;
  resyncWired = true;
  var mq = window.matchMedia('(min-width: 1100px)');
  var handler = function () {
    if (typeof syncFn === 'function') syncFn();
  };
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
  else if (typeof mq.addListener === 'function') mq.addListener(handler);
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('rpc-mobile-web')) {
    handler();
  }
}

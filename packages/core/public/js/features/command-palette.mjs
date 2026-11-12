/**
 * ⌘K command palette: fuzzy jump + shift actions.
 * Keyboard-first glass overlay. Executes via existing globals/functions.
 * Heavy lab features load on demand (no static boot import).
 */
import { getPatients } from '../app-state.mjs';
import { buildPaletteItems, rankPalette } from '../command-palette-model.mjs';
import { isMobileWeb } from '../mobile-web.mjs';
import { selectPatient } from './patients.mjs';
import { shellToggleSettingsDropdown } from '../app-shell-lazy-panels.mjs';
import { drawPaletteList, groupOf } from './command-palette-view.jsx';

var ctx = null;
var dom = null;
var results = [];
var selectedIndex = 0;

export function setCommandPaletteContext(c) {
  ctx = c;
}

function settings() {
  return ctx && typeof ctx.getSettings === 'function' ? ctx.getSettings() : {};
}

function callWin(name, arg) {
  var fn = typeof window !== 'undefined' ? window[name] : null;
  if (typeof fn !== 'function') return false;
  if (arguments.length > 1) fn(arg);
  else fn();
  return true;
}

/** Dynamic import: lab panel is heavy; avoid boot-graph debt. */
function ensureLabsThen(exportName) {
  if (callWin(exportName)) return;
  void import('../lazy-feature-routes.mjs')
    .then(function (routes) {
      return routes.ensureLabsLoaded();
    })
    .then(function (mod) {
      if (mod && typeof mod[exportName] === 'function') {
        mod[exportName]();
        return;
      }
      callWin(exportName);
    });
}

function focusTodoInput() {
  requestAnimationFrame(function () {
    var el = document.getElementById('todo-input');
    if (el && typeof el.focus === 'function') el.focus();
  });
}

function goExpedienteSection(section) {
  if (typeof window.switchAppTab === 'function') window.switchAppTab('nota');
  if (typeof window.switchInnerTab === 'function') window.switchInnerTab(section);
}

var ACTION_HANDLERS = {
  'procesar-some': function () {
    void import('./paste-smart.mjs').then(function (mod) {
      mod.procesarSomeFromClipboard();
    });
  },
  'lab-repo-batch': function () {
    ensureLabsThen('openLabRepoBatchModal');
  },
  'lab-manual-entry': function () {
    ensureLabsThen('openLabManualEntryModal');
  },
  'open-lab': function () {
    callWin('switchAppTab', 'lab');
  },
  'open-eventualidades': function () {
    goExpedienteSection('eventualidades');
  },
  'open-ea': function () {
    goExpedienteSection('estadoActual');
  },
  'export-note': function () {
    callWin('quickExportCurrentPatient');
  },
  'new-pendiente': function () {
    goExpedienteSection('todo');
    focusTodoInput();
  },
  'copy-labs': function () {
    ensureLabsThen('copiarLabsAlPortapapeles');
  },
  'open-inicio-turno': function () {
    void import('./inicio-turno/inicio-turno-panel.mjs').then(function (mod) {
      mod.openInicioTurnoPanel();
    });
  },
  'open-settings': function () {
    shellToggleSettingsDropdown();
  },
};

function executeAction(item) {
  var id = item && item.actionId;
  var handler = id && ACTION_HANDLERS[id];
  if (handler) handler();
}

function ensureDom() {
  if (dom) return dom;
  var backdrop = document.createElement('div');
  backdrop.className = 'cmdk-backdrop';
  backdrop.hidden = true;
  backdrop.addEventListener('click', closeCommandPalette);

  var panel = document.createElement('div');
  panel.className = 'cmdk';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Ir a sección, paciente o acción');

  var input = document.createElement('input');
  input.className = 'cmdk-input';
  input.type = 'text';
  input.placeholder = 'Ir a… o acción (ej. “exportar”, “labs”)';
  input.setAttribute('aria-label', 'Buscar sección, paciente o acción');

  var list = document.createElement('ul');
  list.className = 'cmdk-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Resultados');
  list.tabIndex = 0;

  input.addEventListener('input', function () {
    renderResults(input.value);
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      moveSelection(1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      moveSelection(-1);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (results[selectedIndex]) executeItem(results[selectedIndex]);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      closeCommandPalette();
    }
  });

  panel.appendChild(input);
  panel.appendChild(list);
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  dom = { backdrop: backdrop, panel: panel, input: input, list: list };
  return dom;
}

function moveSelection(delta) {
  if (!results.length) return;
  selectedIndex = (selectedIndex + delta + results.length) % results.length;
  syncSelection();
}

function syncSelection() {
  if (!dom) return;
  var rows = dom.list.querySelectorAll('.cmdk-item');
  Array.prototype.forEach.call(rows, function (li, i) {
    li.classList.toggle('is-selected', i === selectedIndex);
    li.setAttribute('aria-selected', i === selectedIndex ? 'true' : 'false');
  });
  var sel = rows[selectedIndex];
  if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
}

function renderResults(query) {
  var d = ensureDom();
  var items = buildPaletteItems(settings(), getPatients());
  // Sort by group first so on-screen order and arrow-key index match.
  results = rankPalette(query, items, 12).sort(function (a, b) {
    return groupOf(a) - groupOf(b);
  });
  selectedIndex = 0;
  drawPaletteList(d.list, {
    items: results,
    selected: 0,
    query: query,
    onHover: function (i) {
      if (selectedIndex === i) return;
      selectedIndex = i;
      syncSelection();
    },
    onPick: executeItem,
  });
}

function executeItem(item) {
  closeCommandPalette();
  if (item.kind === 'action') {
    executeAction(item);
    return;
  }
  if (item.kind === 'app-tab') {
    if (typeof window.switchAppTab === 'function') window.switchAppTab(item.tab);
    return;
  }
  if (item.kind === 'section') {
    if (typeof window.switchInnerTab === 'function') window.switchInnerTab(item.section);
    return;
  }
  if (item.kind === 'patient') {
    selectPatient(item.patientId);
    return;
  }
  if (item.kind === 'patient-section') {
    selectPatient(item.patientId);
    if (typeof window.switchInnerTab === 'function') window.switchInnerTab(item.section);
  }
}

export function openCommandPalette() {
  if (isMobileWeb()) return;
  var d = ensureDom();
  d.backdrop.hidden = false;
  d.panel.hidden = false;
  d.input.value = '';
  renderResults('');
  d.input.focus();
}

export function closeCommandPalette() {
  if (!dom) return;
  var d = dom;
  d.input.blur();
  d.backdrop.hidden = true;
  d.panel.hidden = true;
}

export var windowHandlers = {
  openCommandPalette: openCommandPalette,
  closeCommandPalette: closeCommandPalette,
};

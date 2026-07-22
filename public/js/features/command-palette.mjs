/**
 * ⌘K command palette: fuzzy jump + shift actions.
 * Keyboard-first glass overlay. Executes via existing globals/functions.
 * Heavy lab features load on demand (no static boot import).
 */
import { patients } from '../app-state.mjs';
import { buildPaletteItems, rankPalette } from '../command-palette-model.mjs';
import { selectPatient } from './patients.mjs';
import { cancelOverlayClose, closeOverlayAnimated } from '../ui-motion.mjs';

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

function executeAction(item) {
  var id = item && item.actionId;
  if (id === 'procesar-some') {
    void import('./paste-smart.mjs').then(function (mod) {
      mod.procesarSomeFromClipboard();
    });
    return;
  }
  if (id === 'doc-queue') {
    callWin('openDocQueuePanel');
    return;
  }
  if (id === 'entrega-prep') {
    callWin('openEntregaPrepPanel');
    return;
  }
  if (id === 'lab-repo-batch') {
    ensureLabsThen('openLabRepoBatchModal');
    return;
  }
  if (id === 'open-lab') {
    if (!callWin('openPaseSectionInNormal', 'labs')) callWin('switchAppTab', 'lab');
    return;
  }
  if (id === 'open-eventualidades') {
    goExpedienteSection('eventualidades');
    return;
  }
  if (id === 'open-ea') {
    goExpedienteSection('estadoActual');
    return;
  }
  if (id === 'export-note') {
    callWin('quickExportCurrentPatient');
    return;
  }
  if (id === 'new-pendiente') {
    if (!callWin('openPaseSectionInNormal', 'pendientes')) goExpedienteSection('todo');
    focusTodoInput();
    return;
  }
  if (id === 'copy-labs') {
    ensureLabsThen('copiarLabsAlPortapapeles');
    return;
  }
  if (id === 'open-pase') {
    callWin('setUiDensity', 'pase');
  }
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
  input.placeholder = 'Ir a… o acción (ej. “exportar”, “labs”, “pase”)';
  input.setAttribute('aria-label', 'Buscar sección, paciente o acción');

  var list = document.createElement('ul');
  list.className = 'cmdk-list';
  list.setAttribute('role', 'listbox');

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
  Array.prototype.forEach.call(dom.list.children, function (li, i) {
    li.classList.toggle('is-selected', i === selectedIndex);
    li.setAttribute('aria-selected', i === selectedIndex ? 'true' : 'false');
  });
  var sel = dom.list.children[selectedIndex];
  if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
}

function renderResults(query) {
  var d = ensureDom();
  var items = buildPaletteItems(settings(), patients);
  results = rankPalette(query, items, 12);
  selectedIndex = 0;
  d.list.textContent = '';
  results.forEach(function (item, i) {
    var li = document.createElement('li');
    li.className =
      'cmdk-item' +
      (item.kind === 'action' ? ' cmdk-item--action' : '') +
      (i === 0 ? ' is-selected' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    var label = document.createElement('span');
    label.className = 'cmdk-item-label';
    label.textContent = item.label;
    var hint = document.createElement('span');
    hint.className = 'cmdk-item-hint';
    hint.textContent = item.hint || '';
    li.appendChild(label);
    li.appendChild(hint);
    li.addEventListener('click', function () {
      executeItem(item);
    });
    d.list.appendChild(li);
  });
  if (!results.length) {
    var empty = document.createElement('li');
    empty.className = 'cmdk-empty';
    empty.setAttribute('role', 'status');
    if (String(query || '').trim()) {
      empty.innerHTML =
        '<span class="empty-state-title">Sin coincidencias</span>' +
        '<span class="empty-state-lead">Prueba con una acción (exportar, labs), el nombre del paciente o una sección.</span>';
    } else {
      empty.innerHTML =
        '<span class="empty-state-title">Atajos del workbench</span>' +
        '<span class="empty-state-lead">Escribe para buscar acciones, pacientes o secciones del expediente.</span>';
    }
    d.list.appendChild(empty);
  }
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
  var d = ensureDom();
  cancelOverlayClose(d.backdrop, { panelEl: d.panel });
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
  closeOverlayAnimated(
    d.backdrop,
    function () {
      d.backdrop.hidden = true;
      d.panel.hidden = true;
    },
    { panelEl: d.panel }
  );
}

export var windowHandlers = {
  openCommandPalette: openCommandPalette,
  closeCommandPalette: closeCommandPalette,
};

/**
 * Consolidated expediente tabs (Sala + Interconsulta; granular fallback unused).
 */
import { isModeSala } from './mode-features.mjs';

export const GRANULAR_TABS = [
  'datos',
  'notas',
  'indica',
  'tend',
  'cult',
  'listado',
  'todo',
  'manejo',
  'recetaHu',
];

export const CONSOLIDATED_TABS = ['paciente', 'clinico', 'resultados', 'salida'];

export const CLINICO_SECTIONS_ALL = ['notas', 'indica', 'manejo'];
export const CLINICO_SECTIONS_SALA = ['manejo'];
export const RESULTADOS_SECTIONS = ['tend', 'cult'];

/** @deprecated use getClinicoSections(settings) */
export const CLINICO_SECTIONS = CLINICO_SECTIONS_ALL;

const DATOS_COLLAPSE_LS = 'rpc-exp-datos-open';

const GRANULAR_PANE_ORDER = [
  'datos',
  'notas',
  'indica',
  'tend',
  'cult',
  'listado',
  'todo',
  'manejo',
  'recetaHu',
];

let layoutMode = null;

function granularToConsolidatedMap(settings) {
  var sala = isModeSala(settings);
  return {
    datos: { tab: 'paciente', section: null },
    todo: { tab: 'paciente', section: null },
    notas: { tab: 'clinico', section: 'notas' },
    indica: { tab: 'clinico', section: 'indica' },
    manejo: { tab: 'clinico', section: 'manejo' },
    tend: { tab: 'resultados', section: 'tend' },
    cult: { tab: 'resultados', section: 'cult' },
    recetaHu: { tab: 'salida', section: null },
    listado: { tab: sala ? 'salida' : 'paciente', section: null },
  };
}

function paneMountSpec(granularTab, settings) {
  var sala = isModeSala(settings);
  var map = {
    datos: { composite: 'paciente', selector: '.exp-datos-mount' },
    todo: { composite: 'paciente', selector: '.exp-pendientes-mount' },
    notas: { composite: 'clinico', selector: '.exp-segment-body--clinico' },
    indica: { composite: 'clinico', selector: '.exp-segment-body--clinico' },
    manejo: { composite: 'clinico', selector: '.exp-segment-body--clinico' },
    tend: { composite: 'resultados', selector: '.exp-segment-body--resultados' },
    cult: { composite: 'resultados', selector: '.exp-segment-body--resultados' },
    listado: sala ? { composite: 'salida', selector: '.exp-salida-mount' } : { composite: null, selector: null },
    recetaHu: sala ? { composite: null, selector: null } : { composite: 'salida', selector: '.exp-salida-mount' },
  };
  return map[granularTab] || null;
}

export function getClinicoSections(settings) {
  return isModeSala(settings) ? CLINICO_SECTIONS_SALA : CLINICO_SECTIONS_ALL;
}

export function useConsolidatedExpedienteTabs(_settings) {
  return true;
}

export function resolveConsolidatedTarget(granularTab, settings) {
  var map = granularToConsolidatedMap(settings || {});
  return map[granularTab] || { tab: 'paciente', section: null };
}

export function consolidatedTabForGranular(granularTab, settings) {
  return resolveConsolidatedTarget(granularTab, settings).tab;
}

export function migrateGranularInner(granularTab, settings) {
  if (!granularTab) return 'todo';
  var map = granularToConsolidatedMap(settings || {});
  if (map[granularTab]) {
    if (isModeSala(settings) && (granularTab === 'notas' || granularTab === 'indica')) return 'manejo';
    if (isModeSala(settings) && granularTab === 'recetaHu') return 'listado';
    if (!isModeSala(settings) && granularTab === 'listado') return 'todo';
    return granularTab;
  }
  return 'todo';
}

export function defaultGranularForConsolidatedTab(compositeTab, settings) {
  var sala = isModeSala(settings);
  var defaults = {
    paciente: 'todo',
    clinico: sala ? 'manejo' : 'notas',
    resultados: 'tend',
    salida: sala ? 'listado' : 'recetaHu',
  };
  return defaults[compositeTab] || 'todo';
}

export function consolidatedInnerTabButtonId(tab, settings) {
  if (CONSOLIDATED_TABS.includes(tab)) return 'itab-' + tab;
  return 'itab-' + consolidatedTabForGranular(tab, settings);
}

export function isDatosCollapseOpen() {
  var el = document.getElementById('exp-datos-collapse');
  return !!(el && el.open);
}

export function setDatosCollapseOpen(open, persist) {
  var el = document.getElementById('exp-datos-collapse');
  if (!el) return;
  el.open = !!open;
  if (persist !== false) {
    try {
      localStorage.setItem(DATOS_COLLAPSE_LS, open ? '1' : '0');
    } catch (_e) {
      /* ignore */
    }
  }
}

export function restoreDatosCollapsePreference() {
  var el = document.getElementById('exp-datos-collapse');
  if (!el) return;
  try {
    el.open = localStorage.getItem(DATOS_COLLAPSE_LS) === '1';
  } catch (_e) {
    el.open = false;
  }
}

export function wireDatosCollapsePersistence() {
  var el = document.getElementById('exp-datos-collapse');
  if (!el || el._expDatosWired) return;
  el._expDatosWired = true;
  el.addEventListener('toggle', function () {
    setDatosCollapseOpen(el.open, true);
  });
}

function paneEl(granularTab) {
  return document.getElementById('itab-content-' + granularTab);
}

function hostEl() {
  return document.getElementById('expediente-panes-host');
}

function compositeEl(name) {
  return document.getElementById('itab-content-' + name);
}

function mountPaneInComposite(granularTab, settings) {
  var pane = paneEl(granularTab);
  var spec = paneMountSpec(granularTab, settings);
  if (!pane || !spec || !spec.composite) return;
  var composite = compositeEl(spec.composite);
  if (!composite) return;
  var mount = composite.querySelector(spec.selector);
  if (mount && pane.parentElement !== mount) mount.appendChild(pane);
  pane.classList.remove('tab-content');
  pane.classList.add('exp-segment-panel');
}

function mountGranularFlat() {
  var host = hostEl();
  if (!host) return;
  GRANULAR_PANE_ORDER.forEach(function (tab) {
    var pane = paneEl(tab);
    if (!pane) return;
    pane.classList.add('tab-content');
    pane.classList.remove('exp-segment-panel', 'active');
    if (pane.parentElement !== host) host.appendChild(pane);
  });
  CONSOLIDATED_TABS.forEach(function (tab) {
    var composite = compositeEl(tab);
    if (composite) composite.classList.remove('active');
  });
}

function mountConsolidatedNested(settings) {
  GRANULAR_PANE_ORDER.forEach(function (tab) {
    mountPaneInComposite(tab, settings);
  });
  CONSOLIDATED_TABS.forEach(function (tab) {
    var composite = compositeEl(tab);
    if (composite) composite.classList.add('tab-content', 'exp-composite-pane');
  });
}

export function syncConsolidatedSegmentBarVisibility(settings) {
  var sala = isModeSala(settings);
  var clinicoBar = document.getElementById('exp-segment-clinico');
  if (clinicoBar) {
    clinicoBar.style.display = sala ? 'none' : '';
    ['notas', 'indica'].forEach(function (section) {
      var btn = clinicoBar.querySelector('[data-exp-segment="' + section + '"]');
      if (btn) btn.style.display = sala ? 'none' : '';
    });
  }
}

export function applyExpedientePaneLayout(consolidated, settings) {
  var sala = isModeSala(settings);
  var next = consolidated ? (sala ? 'consolidated-sala' : 'consolidated-inter') : 'granular';
  if (layoutMode === next) return;
  layoutMode = next;
  if (consolidated) {
    mountConsolidatedNested(settings || {});
    restoreDatosCollapsePreference();
    wireDatosCollapsePersistence();
    syncConsolidatedSegmentBarVisibility(settings || {});
  } else {
    mountGranularFlat();
  }
}

export function resetExpedientePaneLayoutCache() {
  layoutMode = null;
}

export function syncConsolidatedSegmentBars(granularTab, settings) {
  var target = resolveConsolidatedTarget(granularTab, settings);
  var sections = getClinicoSections(settings);
  var clinicoBar = document.getElementById('exp-segment-clinico');
  if (clinicoBar) {
    sections.forEach(function (section) {
      var btn = clinicoBar.querySelector('[data-exp-segment="' + section + '"]');
      if (btn) btn.classList.toggle('active', target.tab === 'clinico' && target.section === section);
    });
  }
  var resBar = document.getElementById('exp-segment-resultados');
  if (resBar) {
    RESULTADOS_SECTIONS.forEach(function (section) {
      var btn = resBar.querySelector('[data-exp-segment="' + section + '"]');
      if (btn) btn.classList.toggle('active', target.tab === 'resultados' && target.section === section);
    });
  }
}

export function syncConsolidatedPaneVisibility(granularTab, settings) {
  var target = resolveConsolidatedTarget(granularTab, settings);
  CONSOLIDATED_TABS.forEach(function (tab) {
    var composite = compositeEl(tab);
    if (composite) composite.classList.toggle('active', tab === target.tab);
  });
  getClinicoSections(settings).forEach(function (section) {
    var pane = paneEl(section);
    if (pane) {
      pane.classList.toggle('active', target.tab === 'clinico' && target.section === section);
    }
  });
  RESULTADOS_SECTIONS.forEach(function (section) {
    var pane = paneEl(section);
    if (pane) {
      pane.classList.toggle('active', target.tab === 'resultados' && target.section === section);
    }
  });
  var datosPane = paneEl('datos');
  var todoPane = paneEl('todo');
  var recetaPane = paneEl('recetaHu');
  var listadoPane = paneEl('listado');
  if (datosPane) datosPane.classList.toggle('active', target.tab === 'paciente');
  if (todoPane) todoPane.classList.toggle('active', target.tab === 'paciente');
  if (recetaPane) recetaPane.classList.toggle('active', target.tab === 'salida' && granularTab === 'recetaHu');
  if (listadoPane) listadoPane.classList.toggle('active', target.tab === 'salida' && granularTab === 'listado');
  if (granularTab === 'datos') setDatosCollapseOpen(true, true);
}

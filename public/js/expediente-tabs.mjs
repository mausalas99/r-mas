/**
 * Consolidated expediente tabs (Sala + Interconsulta; granular fallback unused).
 */
import { isModeSala } from './mode-features.mjs';
import { isClinicoAccessHidden } from './clinico-access.mjs';

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

export const CONSOLIDATED_TABS_SALA = ['paciente', 'clinico', 'estadoActual', 'resultados', 'salida'];
export const CONSOLIDATED_TABS_INTER = ['paciente', 'clinico', 'resultados', 'salida'];

/** @deprecated alias of CONSOLIDATED_TABS_INTER for backward compatibility */
export const CONSOLIDATED_TABS = CONSOLIDATED_TABS_INTER;

const CLINICO_GRANULAR_TABS = ['notas', 'indica', 'manejo'];
export const COMPOSITE_PANE_IDS = ['paciente', 'clinico', 'estadoActual', 'resultados', 'salida'];

/** @deprecated use isManejoSectionHidden — hideClinicoTab ahora solo oculta Manejo (compat). */
export function isClinicoTabHidden(settings) {
  return isManejoSectionHidden(settings) && isModeSala(settings);
}

/** Interconsulta: oculta segmento Manejo; mantiene Nota + Indicaciones en Clínico. */
export function isManejoSectionHidden(settings) {
  return isClinicoAccessHidden(settings);
}

export function isClinicoCompositeVisible(settings) {
  if (!isModeSala(settings)) return true;
  return !isManejoSectionHidden(settings);
}

export function getConsolidatedTabs(settings) {
  var tabs = isModeSala(settings) ? CONSOLIDATED_TABS_SALA.slice() : CONSOLIDATED_TABS_INTER.slice();
  if (!isClinicoCompositeVisible(settings)) {
    return tabs.filter(function (tab) {
      return tab !== 'clinico';
    });
  }
  return tabs;
}

export const CLINICO_SECTIONS_ALL = ['notas', 'indica', 'manejo'];
export const CLINICO_SECTIONS_SALA = ['manejo'];
export const RESULTADOS_SECTIONS = ['tend', 'cult'];
export const SALIDA_SECTIONS_SALA = ['listado', 'recetaHu'];

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
  'estadoActual',
  'recetaHu',
];

let layoutMode = null;

function granularToConsolidatedMap(settings) {
  var sala = isModeSala(settings);
  var map = {
    datos: { tab: 'paciente', section: null },
    todo: { tab: 'paciente', section: null },
    notas: { tab: 'clinico', section: 'notas' },
    indica: { tab: 'clinico', section: 'indica' },
    manejo: { tab: 'clinico', section: 'manejo' },
    tend: { tab: 'resultados', section: 'tend' },
    cult: { tab: 'resultados', section: 'cult' },
    recetaHu: { tab: 'salida', section: sala ? 'recetaHu' : null },
    listado: { tab: sala ? 'salida' : 'paciente', section: sala ? 'listado' : null },
  };
  if (sala) map.estadoActual = { tab: 'estadoActual', section: null };
  return map;
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
    listado: sala ? { composite: 'salida', selector: '.exp-segment-body--salida' } : { composite: null, selector: null },
    recetaHu: { composite: 'salida', selector: '.exp-segment-body--salida' },
    estadoActual: { composite: null, selector: null },
  };
  return map[granularTab] || null;
}

export function getClinicoSections(settings) {
  if (isModeSala(settings)) {
    return isManejoSectionHidden(settings) ? [] : CLINICO_SECTIONS_SALA;
  }
  if (isManejoSectionHidden(settings)) {
    return ['notas', 'indica'];
  }
  return CLINICO_SECTIONS_ALL;
}

export function getSalidaSections(settings) {
  return isModeSala(settings) ? SALIDA_SECTIONS_SALA : [];
}

export function useConsolidatedExpedienteTabs(_settings) {
  return true;
}

export function resolveConsolidatedTarget(granularTab, settings) {
  if (isManejoSectionHidden(settings) && granularTab === 'manejo') {
    return isModeSala(settings)
      ? { tab: 'paciente', section: null }
      : { tab: 'clinico', section: 'notas' };
  }
  var map = granularToConsolidatedMap(settings || {});
  return map[granularTab] || { tab: 'paciente', section: null };
}

export function consolidatedTabForGranular(granularTab, settings) {
  if (isManejoSectionHidden(settings) && granularTab === 'manejo') {
    return isModeSala(settings) ? 'paciente' : 'clinico';
  }
  return resolveConsolidatedTarget(granularTab, settings).tab;
}

export function migrateGranularInner(granularTab, settings) {
  if (!granularTab) return 'todo';
  if (granularTab === 'estadoActual' && !isModeSala(settings)) return 'todo';
  if (isManejoSectionHidden(settings) && granularTab === 'manejo') {
    return isModeSala(settings) ? 'todo' : 'notas';
  }
  var map = granularToConsolidatedMap(settings || {});
  if (map[granularTab]) {
    if (isModeSala(settings) && (granularTab === 'notas' || granularTab === 'indica')) return 'manejo';
    if (!isModeSala(settings) && granularTab === 'listado') return 'todo';
    return granularTab;
  }
  return 'todo';
}

export function defaultGranularForConsolidatedTab(compositeTab, settings) {
  var sala = isModeSala(settings);
  var clinicoDefault = 'notas';
  if (sala) clinicoDefault = isManejoSectionHidden(settings) ? 'todo' : 'manejo';
  var defaults = {
    paciente: 'todo',
    clinico: clinicoDefault,
    estadoActual: 'estadoActual',
    resultados: 'tend',
    salida: sala ? 'listado' : 'recetaHu',
  };
  return defaults[compositeTab] || 'todo';
}

export function consolidatedInnerTabButtonId(tab, settings) {
  var tabs = getConsolidatedTabs(settings || {});
  if (tabs.includes(tab)) return 'itab-' + tab;
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
  CONSOLIDATED_TABS_SALA.forEach(function (tab) {
    var composite = compositeEl(tab);
    if (composite) composite.classList.remove('active');
  });
}

function mountConsolidatedNested(settings) {
  GRANULAR_PANE_ORDER.forEach(function (tab) {
    mountPaneInComposite(tab, settings);
  });
  getConsolidatedTabs(settings || {}).forEach(function (tab) {
    var composite = compositeEl(tab);
    if (composite) composite.classList.add('tab-content', 'exp-composite-pane');
  });
}

export function syncConsolidatedSegmentBarVisibility(settings) {
  var sala = isModeSala(settings);
  var hideManejo = isManejoSectionHidden(settings);
  var clinicoBar = document.getElementById('exp-segment-clinico');
  if (clinicoBar) {
    clinicoBar.style.display = sala || !isClinicoCompositeVisible(settings) ? 'none' : '';
    ['notas', 'indica', 'manejo'].forEach(function (section) {
      var btn = clinicoBar.querySelector('[data-exp-segment="' + section + '"]');
      if (!btn) return;
      if (section === 'manejo') {
        btn.style.display = hideManejo ? 'none' : sala ? 'none' : '';
      } else {
        btn.style.display = sala ? 'none' : '';
      }
    });
  }
  var salidaBar = document.getElementById('exp-segment-salida');
  if (salidaBar) salidaBar.style.display = sala ? '' : 'none';
  var estadoActualTab = document.getElementById('itab-estadoActual');
  if (estadoActualTab) estadoActualTab.style.display = sala ? '' : 'none';
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

  function syncBar(barEl, sectionIds, compositeTab) {
    if (!barEl) return;
    sectionIds.forEach(function (section) {
      var btn = barEl.querySelector('[data-exp-segment="' + section + '"]');
      if (!btn) return;
      var on = target.tab === compositeTab && target.section === section;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    });
  }

  syncBar(document.getElementById('exp-segment-clinico'), sections, 'clinico');
  syncBar(document.getElementById('exp-segment-resultados'), RESULTADOS_SECTIONS, 'resultados');
  syncBar(document.getElementById('exp-segment-salida'), getSalidaSections(settings), 'salida');
}

export function getConsolidatedCompositeState(granularTab, settings) {
  var target = resolveConsolidatedTarget(granularTab, settings);
  var visibleTabs = getConsolidatedTabs(settings || {});
  /** @type {Record<string, { visible: boolean, active: boolean }>} */
  var state = {};
  COMPOSITE_PANE_IDS.forEach(function (tab) {
    var visible = visibleTabs.indexOf(tab) >= 0;
    state[tab] = { visible: visible, active: visible && tab === target.tab };
  });
  return state;
}

export function syncConsolidatedPaneVisibility(granularTab, settings) {
  var target = resolveConsolidatedTarget(granularTab, settings);
  var compositeState = getConsolidatedCompositeState(granularTab, settings);
  COMPOSITE_PANE_IDS.forEach(function (tab) {
    var composite = compositeEl(tab);
    if (!composite) return;
    var pane = compositeState[tab];
    composite.hidden = !pane.visible;
    composite.classList.toggle('active', pane.active);
  });
  CLINICO_GRANULAR_TABS.forEach(function (section) {
    var pane = paneEl(section);
    if (!pane) return;
    var allowed = getClinicoSections(settings).indexOf(section) >= 0;
    pane.classList.toggle(
      'active',
      allowed && target.tab === 'clinico' && target.section === section
    );
  });
  RESULTADOS_SECTIONS.forEach(function (section) {
    var pane = paneEl(section);
    if (pane) {
      pane.classList.toggle('active', target.tab === 'resultados' && target.section === section);
    }
  });
  var datosPane = paneEl('datos');
  var todoPane = paneEl('todo');
  var salidaSections = getSalidaSections(settings);
  if (salidaSections.length) {
    salidaSections.forEach(function (section) {
      var pane = paneEl(section);
      if (pane) pane.classList.toggle('active', target.tab === 'salida' && target.section === section);
    });
  } else {
    var recetaPane = paneEl('recetaHu');
    if (recetaPane) recetaPane.classList.toggle('active', target.tab === 'salida' && granularTab === 'recetaHu');
  }
  if (datosPane) datosPane.classList.toggle('active', target.tab === 'paciente');
  if (todoPane) todoPane.classList.toggle('active', target.tab === 'paciente');
  if (granularTab === 'datos') setDatosCollapseOpen(true, true);
}

/**
 * Consolidated expediente tabs (Sala + Interconsulta; granular fallback unused).
 */
import { isModeSala } from './mode-features.mjs';
import { isMobileWeb } from './mobile-web.mjs';

export const GRANULAR_TABS = [
  'datos',
  'notas',
  'indica',
  'historia',
  'tend',
  'cult',
  'listado',
  'todo',
  'vpo',
  'recetaHu',
];

export const CONSOLIDATED_TABS_SALA = ['paciente', 'clinico', 'resultados', 'salida'];
export const CONSOLIDATED_TABS_INTER = ['paciente', 'clinico', 'resultados', 'salida'];

/** @deprecated alias of CONSOLIDATED_TABS_INTER for backward compatibility */
export const CONSOLIDATED_TABS = CONSOLIDATED_TABS_INTER;

const CLINICO_GRANULAR_TABS = [
  'notas',
  'indica',
  'historia',
  'estadoActual',
  'eventualidades',
  'vpo',
];
export const COMPOSITE_PANE_IDS = ['paciente', 'clinico', 'resultados', 'salida'];

/** @deprecated Manejo eliminado — siempre oculto. */
export function isClinicoTabHidden(settings) {
  return isModeSala(settings);
}

/** @deprecated Manejo eliminado — siempre oculto. */
export function isManejoSectionHidden(_settings) {
  return true;
}

export function isClinicoCompositeVisible(settings) {
  if (!isModeSala(settings)) return true;
  // Sala: Clínico always hosts Historia ingreso; Manejo is optional via segment bar.
  return true;
}

export function getConsolidatedTabs(settings) {
  var tabs = isModeSala(settings) ? CONSOLIDATED_TABS_SALA.slice() : CONSOLIDATED_TABS_INTER.slice();
  if (!isClinicoCompositeVisible(settings)) {
    tabs = tabs.filter(function (tab) {
      return tab !== 'clinico';
    });
  }
  if (isMobileWeb()) {
    tabs = tabs.filter(function (tab) {
      return tab !== 'salida';
    });
  }
  return tabs;
}

export const CLINICO_SECTIONS_ALL = ['notas', 'indica', 'historia', 'vpo'];
export const CLINICO_SECTIONS_SALA = ['estadoActual', 'historia', 'eventualidades'];
export const RESULTADOS_SECTIONS = ['tend', 'cult'];
export const SALIDA_SECTIONS_SALA = ['listado', 'vpo', 'recetaHu'];

/** @deprecated use getClinicoSections(settings) */
export const CLINICO_SECTIONS = CLINICO_SECTIONS_ALL;

const DATOS_COLLAPSE_LS = 'rpc-exp-datos-open';

const GRANULAR_PANE_ORDER = [
  'datos',
  'notas',
  'indica',
  'historia',
  'tend',
  'cult',
  'listado',
  'todo',
  'vpo',
  'estadoActual',
  'eventualidades',
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
    historia: { tab: 'clinico', section: 'historia' },
    tend: { tab: 'resultados', section: 'tend' },
    cult: { tab: 'resultados', section: 'cult' },
    recetaHu: { tab: 'salida', section: sala ? 'recetaHu' : null },
    listado: { tab: sala ? 'salida' : 'paciente', section: sala ? 'listado' : null },
    vpo: sala ? { tab: 'salida', section: 'vpo' } : { tab: 'clinico', section: 'vpo' },
  };
  if (sala) {
    map.estadoActual = { tab: 'clinico', section: 'estadoActual' };
    map.eventualidades = { tab: 'clinico', section: 'eventualidades' };
  }
  return map;
}

function paneMountSpec(granularTab, settings) {
  var sala = isModeSala(settings);
  if (granularTab === 'vpo') {
    return sala
      ? { composite: 'salida', selector: '.exp-segment-body--salida' }
      : { composite: 'clinico', selector: '.exp-segment-body--clinico' };
  }
  var map = {
    datos: { composite: 'paciente', selector: '.exp-datos-mount' },
    todo: { composite: 'paciente', selector: '.exp-pendientes-mount' },
    notas: { composite: 'clinico', selector: '.exp-segment-body--clinico' },
    indica: { composite: 'clinico', selector: '.exp-segment-body--clinico' },
    historia: { composite: 'clinico', selector: '.exp-segment-body--clinico' },
    tend: { composite: 'resultados', selector: '.exp-segment-body--resultados' },
    cult: { composite: 'resultados', selector: '.exp-segment-body--resultados' },
    listado: sala ? { composite: 'salida', selector: '.exp-segment-body--salida' } : { composite: null, selector: null },
    recetaHu: { composite: 'salida', selector: '.exp-segment-body--salida' },
    estadoActual: sala
      ? { composite: 'clinico', selector: '.exp-segment-body--clinico' }
      : { composite: null, selector: null },
    eventualidades: sala
      ? { composite: 'clinico', selector: '.exp-segment-body--clinico' }
      : { composite: null, selector: null },
  };
  return map[granularTab] || null;
}

export function getClinicoSections(settings) {
  if (isModeSala(settings)) {
    return ['estadoActual', 'historia', 'eventualidades'];
  }
  return ['notas', 'indica', 'vpo'];
}

export function getSalidaSections(settings) {
  if (isMobileWeb()) return [];
  return isModeSala(settings) ? SALIDA_SECTIONS_SALA : [];
}

export function useConsolidatedExpedienteTabs(_settings) {
  return true;
}

export function resolveConsolidatedTarget(granularTab, settings) {
  if (granularTab === 'manejo') {
    return isModeSala(settings)
      ? { tab: 'paciente', section: null }
      : { tab: 'clinico', section: 'notas' };
  }
  var map = granularToConsolidatedMap(settings || {});
  var target = map[granularTab] || { tab: 'paciente', section: null };
  if (isMobileWeb() && target.tab === 'salida') {
    if (!isModeSala(settings) && granularTab === 'vpo') {
      return { tab: 'clinico', section: 'vpo' };
    }
    return isModeSala(settings)
      ? { tab: 'clinico', section: 'historia' }
      : { tab: 'paciente', section: null };
  }
  return target;
}

export function consolidatedTabForGranular(granularTab, settings) {
  if (granularTab === 'manejo') {
    return isModeSala(settings) ? 'paciente' : 'clinico';
  }
  return resolveConsolidatedTarget(granularTab, settings).tab;
}

export function migrateGranularInner(granularTab, settings) {
  if (!granularTab) return 'todo';
  if (granularTab === 'estadoActual' && !isModeSala(settings)) return 'todo';
  if (granularTab === 'manejo') {
    return isModeSala(settings) ? 'todo' : 'notas';
  }
  var map = granularToConsolidatedMap(settings || {});
  if (map[granularTab]) {
    if (isMobileWeb()) {
      if (granularTab === 'listado' || granularTab === 'recetaHu') {
        return isModeSala(settings) ? 'historia' : 'todo';
      }
      if (isModeSala(settings) && granularTab === 'vpo') return 'historia';
    }
    if (isModeSala(settings) && (granularTab === 'notas' || granularTab === 'indica')) return 'historia';
    if (!isModeSala(settings) && granularTab === 'listado') return 'todo';
    return granularTab;
  }
  return 'todo';
}

export function defaultGranularForConsolidatedTab(compositeTab, settings) {
  var sala = isModeSala(settings);
  var clinicoDefault = 'notas';
  if (sala) clinicoDefault = 'estadoActual';
  var defaults = {
    paciente: 'todo',
    clinico: clinicoDefault,
    resultados: 'tend',
    salida: isMobileWeb()
      ? sala
        ? 'historia'
        : 'todo'
      : sala
        ? 'listado'
        : 'recetaHu',
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

/** Scroll del formulario en el panel Paciente (details no acota bien con flex). */
export function syncPacienteDatosLayoutMode() {
  var pane = document.getElementById('itab-content-paciente');
  var el = document.getElementById('exp-datos-collapse');
  if (!pane) return;
  pane.classList.toggle('exp-paciente-datos-open', !!(el && el.open));
}

export function setDatosCollapseOpen(open, persist) {
  var el = document.getElementById('exp-datos-collapse');
  if (!el) return;
  el.open = !!open;
  syncPacienteDatosLayoutMode();
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
  syncPacienteDatosLayoutMode();
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
  var clinicoBar = document.getElementById('exp-segment-clinico');
  if (clinicoBar) {
    clinicoBar.style.display = !isClinicoCompositeVisible(settings) ? 'none' : '';
    ['notas', 'indica', 'historia', 'estadoActual', 'eventualidades', 'vpo'].forEach(
      function (section) {
        var btn = clinicoBar.querySelector('[data-exp-segment="' + section + '"]');
        if (!btn) return;
        if (section === 'historia') {
          btn.style.display = sala ? '' : 'none';
        } else if (section === 'estadoActual' || section === 'eventualidades') {
          btn.style.display = sala ? '' : 'none';
        } else if (section === 'vpo') {
          btn.style.display = sala ? 'none' : '';
        } else {
          btn.style.display = sala ? 'none' : '';
        }
      }
    );
  }
  var salidaBar = document.getElementById('exp-segment-salida');
  if (salidaBar) {
    salidaBar.style.display = sala && getSalidaSections(settings).length ? '' : 'none';
    var vpoSalidaBtn = salidaBar.querySelector('[data-exp-segment="vpo"]');
    if (vpoSalidaBtn) vpoSalidaBtn.style.display = sala ? '' : 'none';
  }
  var estadoActualTab = document.getElementById('itab-estadoActual');
  if (estadoActualTab) estadoActualTab.style.display = 'none';
}

export function applyExpedientePaneLayout(consolidated, settings) {
  var sala = isModeSala(settings);
  if (consolidated) {
    syncConsolidatedSegmentBarVisibility(settings || {});
  }
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

  var driveBtn = document.getElementById('btn-drive-import');
  if (driveBtn) {
    driveBtn.style.display = isModeSala(settings) ? '' : 'none';
  }
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
    var onClinico = target.tab === 'clinico' && target.section === section;
    var onSalida = target.tab === 'salida' && target.section === section && section === 'vpo';
    pane.classList.toggle('active', allowed && (onClinico || onSalida));
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

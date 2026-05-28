/**
 * Pestaña Manejo — orquestador (Electrolitos + Guía clínica).
 */
import { patients } from '../app-state.mjs';
import {
  createManejoGuiaContext,
  openManejoAtbDrug as openManejoAtbDrugNav,
  openManejoPathology as openManejoPathologyNav,
} from './manejo-guia-context.mjs';
import {
  registerManejoElectrolitosRuntime,
  renderManejoElectrolitos,
} from './manejo-electrolitos.mjs';
import {
  openManejoProtocolEditorModal as openProtoEditor,
  registerManejoProtoEditorRuntime,
} from './manejo-proto-editor.mjs';
import {
  appendManejoSomeOrderArticle,
  buildManejoCalcDrawer,
  buildProtocolDetailPanel,
  configureManejoProtoDetail,
  findProtocolEntryById,
  getAllManejoProtocols,
  registerManejoProtoDetailRuntime,
} from './manejo-proto-detail.mjs';
import {
  buildInsulinPumpReferencePanel,
  buildManejoProtoFilterMenu,
  buildManejoProtoSegmentChip,
  buildManejoProtoSegmentGroup,
  buildManejoProtoToggleChip,
  buildManejoSearchInput,
  categoryLabelFor,
  configureManejoProtoToolbar,
  filterProtocolEntries,
  getProtoCategoryFilter,
  getProtoExtraFilters,
  setProtoCategoryFilter,
  setProtoExtraFilters,
} from './manejo-proto-toolbar.mjs';
import {
  buildPathologyCadEhhBlock,
  configureManejoCadAda,
  registerManejoCadAdaRuntime,
} from './manejo-cad-ada-ui.mjs';
import {
  buildIndicationChips,
  buildKvBlock,
  createManejoSomeUi,
  isManejoSomeCopyUiEnabled,
} from './manejo-some-ui.mjs';
import { renderManejoGuia } from './manejo-guia.mjs';
import {
  migrateLegacyManejoSubtab,
  navigateGuia,
} from './manejo-guia-state.mjs';
import {
  applyAtbFamilyFilter,
  atbFamilyCssClass,
  ATB_RIS_FILTER_META,
  buildAtbReadingPanel,
  buildGuiaAtbCultureBanner,
  classifyAtbForIsolate,
  clearAtbHintFilter,
  clearAtbRisFilter,
  configureManejoAtbReadingPanel,
  drugMatchesAtbHint,
  drugMatchesAtbRisFilter,
  familyHintForAtb,
  familyLabelForAtb,
  findAtbDrugById,
  getAtbDrugs,
  getAtbFamilies,
  getAtbFamilyFilter,
  getAtbHintFilter,
  getAtbPatientContext,
  getAtbRisFilter,
  registerManejoAtbUiRuntime,
  setAtbHintFilter,
  setAtbSelectedId,
  syncManejoAtbRisChipFilterUi,
  toggleAtbRisFilter,
  wireManejoAtbRisChipFilters,
} from './manejo-atb-ui.mjs';
import { syncSubTabBarIndicator } from '../ui-tab-motion.mjs';
import { scheduleAfterPaint } from '../deferred-work.mjs';

var _manejoShellPatientId = null;

const MANEJO_SUBTABS = [
  { id: 'electrolitos', label: 'Electrolitos' },
  { id: 'guia', label: 'Guía clínica' },
];

const MANEJO_SUBTAB_KEY = 'manejoSubtab';

function buildManejoDisclaimerBar() {
  var bar = document.createElement('div');
  bar.className = 'manejo-disclaimer-bar';
  bar.setAttribute('role', 'note');
  var title = document.createElement('strong');
  title.className = 'manejo-disclaimer-bar-title';
  title.textContent = 'Orientación clínica de apoyo';
  var text = document.createElement('p');
  text.className = 'manejo-disclaimer-bar-text';
  text.textContent =
    'Las sugerencias de manejo son recomendaciones orientativas y no sustituyen el juicio clínico. ' +
    'Cada paciente debe valorarse de forma individual conforme a su contexto, comorbilidades y protocolos institucionales vigentes.';
  bar.appendChild(title);
  bar.appendChild(text);
  return bar;
}

function getActiveManejoSubtab() {
  try {
    var s = sessionStorage.getItem(MANEJO_SUBTAB_KEY);
    if (s === 'protocolos') s = 'infusiones';
    if (s === 'cad-ehh') s = 'patologias';
    if (migrateLegacyManejoSubtab(s)) return 'guia';
    if (MANEJO_SUBTABS.some(function (t) { return t.id === s; })) return s;
  } catch (_e) {}
  return 'electrolitos';
}

function setActiveManejoSubtab(id) {
  try {
    var legacyMode = migrateLegacyManejoSubtab(id);
    if (legacyMode) {
      sessionStorage.setItem(MANEJO_SUBTAB_KEY, 'guia');
      navigateGuia({ mode: legacyMode, view: 'indice' });
      return;
    }
    sessionStorage.setItem(MANEJO_SUBTAB_KEY, id);
  } catch (_e2) {}
}

/** @type {{
 *   getActiveId(): string|null,
 *   ensureParsedLabHistory(id: string): unknown[],
 *   saveState(): void,
 *   showToast(msg: string, type?: string): void,
 *   emitLiveSyncTodoUpsert(id: string, row: unknown): void,
 *   refreshAllTodoUIs(): void,
 * }} */
var rt = {
  getActiveId() {
    return null;
  },
  ensureParsedLabHistory() {
    return [];
  },
  saveState() {},
  showToast() {},
  emitLiveSyncTodoUpsert() {},
  refreshAllTodoUIs() {},
};

export function registerManejoRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
  registerManejoElectrolitosRuntime(partial);
  registerManejoProtoEditorRuntime(partial);
  registerManejoProtoDetailRuntime(partial);
  registerManejoCadAdaRuntime(partial);
  registerManejoAtbUiRuntime({
    ensureParsedLabHistory: function (pid) {
      return rt.ensureParsedLabHistory(pid);
    },
  });
}

function aid() {
  return rt.getActiveId();
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyToClipboard(txt) {
  var t = String(txt || '');
  var done = rt.showToast
    ? function () {
        rt.showToast('Copiado', 'success');
      }
    : function () {};

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(t).then(done).catch(fallbackExec);
    }
  } catch (_e) {}

  fallbackExec();

  function fallbackExec() {
    try {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (__e) {}
  }
}

function attachCopy(btn, getter) {
  btn.addEventListener('click', function () {
    copyToClipboard(getter());
  });
}

var _manejoSomeUi = createManejoSomeUi({ attachCopy: attachCopy });
var buildSomeOrderArticle = _manejoSomeUi.buildSomeOrderArticle;

function findPatient(pid) {
  return patients.find(function (p) {
    return String(p.id) === String(pid);
  });
}

function buildManejoGuiaContext() {
  return createManejoGuiaContext({
    buildKvBlock: buildKvBlock,
    buildManejoSearchInput: buildManejoSearchInput,
    buildProtocolDetailPanel: buildProtocolDetailPanel,
    findProtocolEntryById: findProtocolEntryById,
    getAllProtocols: getAllManejoProtocols,
    filterProtocolEntries: filterProtocolEntries,
    getProtoCategoryFilter: getProtoCategoryFilter,
    setProtoCategoryFilter: setProtoCategoryFilter,
    getProtoExtraFilters: getProtoExtraFilters,
    setProtoExtraFilters: setProtoExtraFilters,
    buildInsulinPumpReferencePanel: buildInsulinPumpReferencePanel,
    openManejoProtocolEditorModal: openManejoProtocolEditorModal,
    buildManejoProtoFilterMenu: buildManejoProtoFilterMenu,
    buildManejoProtoSegmentChip: buildManejoProtoSegmentChip,
    buildManejoProtoSegmentGroup: buildManejoProtoSegmentGroup,
    buildManejoProtoToggleChip: buildManejoProtoToggleChip,
    categoryLabelFor: categoryLabelFor,
    setActiveManejoSubtab: setActiveManejoSubtab,
    renderManejo: manejoRerender,
    rerender: manejoRerender,
    navigateGuia: navigateGuia,
    buildPathologyCadEhhBlock: buildPathologyCadEhhBlock,
    openAtbDrug: openManejoAtbDrug,
    getAtbPatientContext: getAtbPatientContext,
    findAtbDrugById: findAtbDrugById,
    classifyAtbForIsolate: classifyAtbForIsolate,
    buildAtbReadingPanel: buildAtbReadingPanel,
    buildGuiaAtbCultureBanner: buildGuiaAtbCultureBanner,
    getAtbFamilyFilter: getAtbFamilyFilter,
    applyAtbFamilyFilter: applyAtbFamilyFilter,
    getAtbHintFilter: getAtbHintFilter,
    clearAtbHintFilter: clearAtbHintFilter,
    setAtbHintFilter: setAtbHintFilter,
    getAtbRisFilter: getAtbRisFilter,
    toggleAtbRisFilter: toggleAtbRisFilter,
    clearAtbRisFilter: clearAtbRisFilter,
    drugMatchesAtbRisFilter: drugMatchesAtbRisFilter,
    drugMatchesAtbHint: drugMatchesAtbHint,
    familyLabelForAtb: familyLabelForAtb,
    familyHintForAtb: familyHintForAtb,
    atbFamilyCssClass: atbFamilyCssClass,
    buildIndicationChips: buildIndicationChips,
    getAtbDrugs: getAtbDrugs,
    getAtbFamilies: getAtbFamilies,
    atbRisFilterMeta: ATB_RIS_FILTER_META,
    wireManejoAtbRisChipFilters: wireManejoAtbRisChipFilters,
    syncManejoAtbRisChipFilterUi: syncManejoAtbRisChipFilterUi,
  });
}

function renderActiveManejoSubpanel(panel, subtabId, pid, patient) {
  if (subtabId === 'electrolitos') {
    renderManejoElectrolitos(panel, pid, patient, {
      esc: esc,
      buildKvBlock: buildKvBlock,
      buildSomeOrderArticle: buildSomeOrderArticle,
      isManejoSomeCopyUiEnabled: isManejoSomeCopyUiEnabled,
    });
  } else if (subtabId === 'guia') {
    renderManejoGuia(panel, {
      pid: pid,
      patient: patient,
      ui: buildManejoGuiaContext(),
      rerender: manejoRerender,
    });
  }
}

function syncManejoSubtabChrome(activeId) {
  var nav = document.querySelector('#manejo-container .manejo-subtabs');
  if (!nav) return;
  nav.querySelectorAll('.manejo-subtab').forEach(function (btn) {
    var id = btn.getAttribute('data-subtab');
    var on = id === activeId;
    btn.classList.toggle('manejo-subtab--active', on);
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    btn.tabIndex = on ? 0 : -1;
  });
  MANEJO_SUBTABS.forEach(function (tab) {
    var panel = document.getElementById('manejo-subpanel-' + tab.id);
    if (panel) panel.hidden = tab.id !== activeId;
  });
  syncSubTabBarIndicator(nav);
}

function ensureManejoShell(container, pid, activeId) {
  if (_manejoShellPatientId !== pid || !container.querySelector('.manejo-subtabs')) {
    return null;
  }
  syncManejoSubtabChrome(activeId);
  return document.getElementById('manejo-subpanel-' + activeId);
}

function buildManejoShell(container, pid, activeId) {
  while (container.firstChild) container.removeChild(container.firstChild);

  var nav = document.createElement('nav');
  nav.className = 'manejo-subtabs rpc-subtab-bar';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Secciones de manejo');

  var panelsWrap = document.createElement('div');
  panelsWrap.className = 'manejo-subpanels';

  MANEJO_SUBTABS.forEach(function (tab) {
    var isActive = tab.id === activeId;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'manejo-subtab rpc-subtab' + (isActive ? ' manejo-subtab--active active' : '');
    btn.textContent = tab.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('aria-controls', 'manejo-subpanel-' + tab.id);
    btn.tabIndex = isActive ? 0 : -1;
    btn.setAttribute('data-subtab', tab.id);
    btn.addEventListener('click', function () {
      if (getActiveManejoSubtab() === tab.id) return;
      setActiveManejoSubtab(tab.id);
      renderManejo();
    });
    nav.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'manejo-subpanel';
    panel.id = 'manejo-subpanel-' + tab.id;
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = !isActive;
    panelsWrap.appendChild(panel);
  });

  container.appendChild(buildManejoDisclaimerBar());
  container.appendChild(nav);
  container.appendChild(panelsWrap);
  _manejoShellPatientId = pid;
  syncManejoSubtabChrome(activeId);
  return document.getElementById('manejo-subpanel-' + activeId);
}

export function invalidateManejoShell() {
  _manejoShellPatientId = null;
}

export function renderManejo(opts) {
  opts = opts || {};
  var onReady = typeof opts.onReady === 'function' ? opts.onReady : null;
  var container = document.getElementById('manejo-container');
  if (!container) {
    if (onReady) onReady();
    return;
  }

  var pid = aid();
  var patient = pid ? findPatient(pid) : null;
  var activeId = getActiveManejoSubtab();

  var activePanel = ensureManejoShell(container, pid, activeId);
  if (!activePanel) {
    activePanel = buildManejoShell(container, pid, activeId);
  }
  if (activePanel) {
    if (activeId === 'guia') {
      var guiaHost = activePanel.querySelector('.manejo-guia-host');
      if (guiaHost) {
        guiaHost.innerHTML = '<p class="manejo-hint manejo-loading">Cargando…</p>';
      } else {
        activePanel.innerHTML = '<p class="manejo-hint manejo-loading">Cargando…</p>';
      }
    } else {
      activePanel.innerHTML = '<p class="manejo-hint manejo-loading">Cargando…</p>';
    }
  }

  var paintSubpanel = function () {
    if (!activePanel) {
      if (onReady) onReady();
      return;
    }
    if (activeId !== 'guia') {
      activePanel.innerHTML = '';
    }
    renderActiveManejoSubpanel(activePanel, activeId, pid, patient);
    if (onReady) onReady();
  };

  if (opts.syncHeavy) {
    paintSubpanel();
    return;
  }

  scheduleAfterPaint(paintSubpanel);
}

/** Re-render in-tab without deferring paint (keeps filter/mode clicks responsive). */
export function manejoRerender() {
  renderManejo({ syncHeavy: true });
}

function openManejoProtocolEditorModal(opts) {
  openProtoEditor(opts, {
    renderManejo: manejoRerender,
    setProtoCategoryFilter: setProtoCategoryFilter,
  });
}

function openManejoPathology(pathologyId) {
  openManejoPathologyNav(pathologyId, { renderManejo: manejoRerender });
}

function openManejoAtbDrug(drugId) {
  openManejoAtbDrugNav(drugId, {
    renderManejo: manejoRerender,
    setAtbSelectedId: setAtbSelectedId,
  });
}

function wireManejoExtractedModules() {
  configureManejoProtoToolbar({ attachCopy: attachCopy, copyToClipboard: copyToClipboard });
  configureManejoCadAda({ attachCopy: attachCopy });
  configureManejoProtoDetail({
    onOpenPathology: openManejoPathology,
    appendManejoSomeOrderArticle: function (parent, orderOrGetter, index) {
      if (!isManejoSomeCopyUiEnabled() || !parent) return;
      parent.appendChild(buildSomeOrderArticle(orderOrGetter, index == null ? 0 : index));
    },
    attachCopy: attachCopy,
  });
  configureManejoAtbReadingPanel({
    buildManejoCalcDrawer: buildManejoCalcDrawer,
    appendManejoSomeOrderArticle: appendManejoSomeOrderArticle,
    isManejoSomeCopyUiEnabled: isManejoSomeCopyUiEnabled,
    renderManejo: manejoRerender,
  });
}

wireManejoExtractedModules();

export const manejoWindowHandlers = {
  renderManejo,
  manejoRerender,
};

export { openGuiaPatologia, openGuiaInfusion, openGuiaAtb } from './manejo-guia-nav.mjs';

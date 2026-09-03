/**
 * Main app tab switching (Lab / Nota / Med / Agenda) and tablist a11y.
 */
import { isGuardiaMode } from './chrome.mjs';
import { resumeLabBulkPreviewModalIfSuspended } from './lab-bulk-preview-modal.mjs';
import { refreshEaCopyFabVisibility } from './estado-actual-panel.mjs';
import {
  ensureChartsLoaded,
  ensureGuardiaBoardLoaded,
  ensureLabsLoaded,
  hideLabPanelLoadingSkeleton,
  showLabPanelLoadingSkeleton,
} from '../lazy-feature-routes.mjs';
import {
  hideAppTabPanel,
  showAppTabPanel,
  syncAppTabIndicator,
} from '../ui-tab-motion.mjs';
import { migrateGranularInner } from '../expediente-tabs.mjs';
import { innerAfterLeavingLab, syncLabInnerVisibility } from './patient-dashboard/lab-inner.mjs';
import { closePatientDatosModal } from '../patient-datos-modal.mjs';
import { closeMedRecetaPasteModal } from './medications-paste-modal.mjs';
import { syncHeaderContext } from './header-context.mjs';
import { cancelDeferredIdleWork, scheduleAfterPaint } from '../deferred-work.mjs';
import { rt } from './app-tabs-runtime.mjs';
import {
  cancelExpedienteWarm,
  granularMountIsEmpty,
  isInnerTabContentFresh,
  renderGranularInnerTab,
  syncInnerTabVisualOnly,
} from './expediente-inner-cache.mjs';
import { isMobileWeb, normalizeMobileAppTab } from '../mobile-web.mjs';

var APP_TAB_ROWS = [
  ['lab', 'apptab-lab', 'appcontent-lab', 'appTab.lab'],
  ['nota', 'apptab-nota', 'appcontent-nota', 'appTab.nota'],
  ['med', 'apptab-med', 'appcontent-med', 'appTab.med'],
  ['agenda', 'apptab-agenda', 'appcontent-agenda', 'appTab.agenda'],
];

function refreshExpedienteOnNotaAppTabEnter() {
  scheduleAfterPaint(function () {
    if (rt.getActiveAppTab() !== 'nota') return;
    var settings = rt.getSettings();
    var inner = innerAfterLeavingLab(migrateGranularInner(rt.getActiveInner() || 'resumen', settings));
    if (inner !== rt.getActiveInner()) rt.setActiveInner(inner);
    syncInnerTabVisualOnly();
    if (granularMountIsEmpty(inner) || !isInnerTabContentFresh(inner, settings)) {
      renderGranularInnerTab(inner, granularMountIsEmpty(inner) ? { force: true } : undefined);
    } else if (inner === 'estadoActual') {
      refreshEaCopyFabVisibility();
    }
  });
}

function getAppTabDom() {
  return {
    apptabLab: document.getElementById('apptab-lab'),
    apptabNota: document.getElementById('apptab-nota'),
    apptabMed: document.getElementById('apptab-med'),
    apptabAgenda: document.getElementById('apptab-agenda'),
    appcontentLab: document.getElementById('appcontent-lab'),
    appcontentMed: document.getElementById('appcontent-med'),
    appcontentNota: document.getElementById('appcontent-nota'),
    appcontentAgenda: document.getElementById('appcontent-agenda'),
    guardiaRoot: document.getElementById('appcontent-guardia'),
  };
}

function syncAppTabButtonStates(tab, dom) {
  if (dom.apptabLab) dom.apptabLab.classList.toggle('active', tab === 'lab');
  if (dom.apptabNota) dom.apptabNota.classList.toggle('active', tab === 'nota');
  if (dom.apptabMed) dom.apptabMed.classList.toggle('active', tab === 'med');
  if (dom.apptabAgenda) dom.apptabAgenda.classList.toggle('active', tab === 'agenda');
  syncAppTabIndicator(tab);
}

function layoutGuardiaAppTab(dom) {
  var standardPanels = [dom.appcontentLab, dom.appcontentMed, dom.appcontentNota, dom.appcontentAgenda];
  standardPanels.forEach(function (p) {
    hideAppTabPanel(p);
  });
  if (dom.guardiaRoot) {
    showAppTabPanel(dom.guardiaRoot, false);
    dom.guardiaRoot.style.display = 'flex';
    dom.guardiaRoot.style.flexDirection = 'column';
    dom.guardiaRoot.style.flex = '1';
    dom.guardiaRoot.style.minHeight = '0';
    dom.guardiaRoot.style.overflow = 'hidden';
  }
  void ensureGuardiaBoardLoaded().then(function (mod) {
    mod.renderGuardiaBoard(rt.getSettings());
  });
}

function showStandardPanelForTab(dom, tab) {
  var pairs = [
    ['lab', dom.appcontentLab],
    ['med', dom.appcontentMed],
    ['nota', dom.appcontentNota],
    ['agenda', dom.appcontentAgenda],
  ];
  pairs.forEach(function (pair) {
    var panel = pair[1];
    if (!panel) return;
    if (tab === pair[0]) showAppTabPanel(panel, true);
    else hideAppTabPanel(panel);
  });
}

function enterLabStandardTab() {
  closePatientDatosModal();
  showLabPanelLoadingSkeleton();
  void ensureLabsLoaded()
    .then(function (mod) {
      hideLabPanelLoadingSkeleton();
      if (rt.getActiveAppTab() !== 'lab') return;
      scheduleAfterPaint(function () {
        if (rt.getActiveAppTab() === 'lab') rt.renderLabHistoryPanel();
      });
      mod.syncLabCopyFab(mod.labOutputHasCopyableContent());
    })
    .catch(function (err) {
      hideLabPanelLoadingSkeleton();
      console.error('ensureLabsLoaded failed:', err && err.message);
      rt.showToast('No se pudo cargar Laboratorio. Reintenta o reinicia la app.', 'error');
    });
}

function scheduleStandardTabSideEffects(tab) {
  if (tab === 'lab') enterLabStandardTab();
  if (tab === 'med') {
    scheduleAfterPaint(function () {
      if (rt.getActiveAppTab() === 'med') rt.renderMedRecetaPanel();
    });
  }
  if (tab === 'agenda') {
    scheduleAfterPaint(function () {
      if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
    });
  }
  if (tab === 'nota' && rt.getActiveInner() === 'tend') {
    scheduleAfterPaint(function () {
      if (rt.getActiveAppTab() === 'nota' && rt.getActiveInner() === 'tend') {
        void ensureChartsLoaded().then(function (mods) {
          mods.tendencias.renderTendencias();
        });
      }
    });
  }
}

function layoutStandardAppTab(dom, tab) {
  if (dom.guardiaRoot) hideAppTabPanel(dom.guardiaRoot);
  showStandardPanelForTab(dom, tab);
  scheduleStandardTabSideEffects(tab);
  if (tab === 'lab') syncLabInnerVisibility();
}

function syncLabCopyFabVisibility(tab) {
  if (tab === 'lab') {
    void ensureLabsLoaded().then(function (mod) {
      if (rt.getActiveAppTab() !== 'lab') return;
      mod.syncLabCopyFab(mod.labOutputHasCopyableContent());
    });
    return;
  }
  var labCopyFab = document.getElementById('lab-copy-fab');
  if (labCopyFab) {
    labCopyFab.setAttribute('hidden', '');
    labCopyFab.style.display = 'none';
    labCopyFab.setAttribute('aria-hidden', 'true');
  }
  document.documentElement.classList.remove('lab-copy-fab-active');
}

function schedulePostAppTabSwitch(tab, prevAppTab) {
  var deferredTab = tab;
  if (tab === 'med' || prevAppTab === 'med') {
    rt.syncWorkContextChrome();
  }
  scheduleAfterPaint(function () {
    if (rt.getActiveAppTab() !== deferredTab) return;
    syncAppTabIndicator(deferredTab);
    if (deferredTab !== 'nota' && deferredTab !== 'med' && prevAppTab !== 'med') {
      rt.syncWorkContextChrome();
    }
    if (deferredTab === 'lab') resumeLabBulkPreviewModalIfSuspended();
  });
}

function hideStandardTabA11y(rows) {
  rows.forEach(function (r) {
    var b = document.getElementById(r[1]);
    var p = document.getElementById(r[2]);
    if (b) {
      b.setAttribute('aria-hidden', 'true');
      b.setAttribute('tabindex', '-1');
    }
    if (p) {
      p.setAttribute('role', 'tabpanel');
      p.removeAttribute('aria-label');
      p.setAttribute('aria-labelledby', r[1]);
      p.setAttribute('aria-hidden', 'true');
    }
  });
}

function syncSpecialRootA11y(rootId, role, label, visible) {
  var root = document.getElementById(rootId);
  if (!root) return;
  if (role) {
    root.setAttribute('role', role);
    root.setAttribute('aria-label', label);
    root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    return;
  }
  root.removeAttribute('role');
  root.removeAttribute('aria-label');
  root.setAttribute('aria-hidden', 'true');
}

function syncGuardiaTabA11y(list, rows) {
  if (list) list.setAttribute('aria-hidden', 'true');
  hideStandardTabA11y(rows);
  syncSpecialRootA11y(
    'appcontent-guardia',
    'region',
    'Modo Guardia — censo de pacientes',
    true
  );
}

function syncNormalTabA11y(tab, list, rows) {
  syncSpecialRootA11y('appcontent-guardia', null, null, false);
  if (list) list.removeAttribute('aria-hidden');
  rows.forEach(function (r) {
    var b = document.getElementById(r[1]);
    var p = document.getElementById(r[2]);
    var sel = tab === r[0];
    if (b) {
      b.removeAttribute('aria-hidden');
      b.setAttribute('aria-selected', sel ? 'true' : 'false');
      b.tabIndex = sel ? 0 : -1;
    }
    if (p) {
      p.setAttribute('role', 'tabpanel');
      p.removeAttribute('aria-label');
      p.setAttribute('aria-labelledby', r[1]);
      p.setAttribute('aria-hidden', sel ? 'false' : 'true');
    }
  });
}

function isAppTabNavKey(key) {
  return (
    key === 'ArrowRight' ||
    key === 'ArrowLeft' ||
    key === 'ArrowDown' ||
    key === 'ArrowUp' ||
    key === 'Home' ||
    key === 'End'
  );
}

function nextAppTabFromKey(curIndex, key, orderLen) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (curIndex + 1) % orderLen;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (curIndex - 1 + orderLen) % orderLen;
  if (key === 'Home') return 0;
  if (key === 'End') return orderLen - 1;
  return -1;
}

export function switchAppTab(tab) {
  if (tab === 'lan') tab = 'lab';
  if (isMobileWeb()) tab = normalizeMobileAppTab(tab);
  if (tab !== 'med') closeMedRecetaPasteModal();
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  var prevAppTab = rt.getActiveAppTab();
  rt.setActiveAppTab(tab);
  if (tab === 'nota' && prevAppTab !== 'nota') {
    refreshExpedienteOnNotaAppTabEnter();
  }
  var dom = getAppTabDom();
  syncMainAppTabA11y(tab);
  syncAppTabButtonStates(tab, dom);
  if (isGuardiaMode()) layoutGuardiaAppTab(dom);
  else layoutStandardAppTab(dom, tab);

  syncLabCopyFabVisibility(tab);
  refreshEaCopyFabVisibility();
  if (tab === 'med') rt.setMedTabAttention(false);
  syncHeaderContext(rt);
  schedulePostAppTabSwitch(tab, prevAppTab);
}

export function syncMainAppTabA11y(tab) {
  if (tab === 'lan') tab = 'lab';
  var list = document.getElementById('app-main-tablist');
  if (isGuardiaMode()) {
    syncGuardiaTabA11y(list, APP_TAB_ROWS);
    return;
  }
  syncNormalTabA11y(tab, list, APP_TAB_ROWS);
}

if (typeof document !== 'undefined') {
(function setupMainAppTabKeyboard() {
  var list = document.getElementById('app-main-tablist');
  if (!list) return;
  var order = isMobileWeb() ? ['nota', 'lab'] : ['nota', 'lab', 'med', 'agenda'];
  list.addEventListener('keydown', function (e) {
    if (!isAppTabNavKey(e.key)) return;
    var cur = rt.getActiveAppTab() === 'lan' ? 'lab' : rt.getActiveAppTab();
    var i = order.indexOf(cur);
    if (i < 0) i = 0;
    var next = nextAppTabFromKey(i, e.key, order.length);
    if (next < 0) return;
    e.preventDefault();
    var t = order[next];
    switchAppTab(t);
    var btn = document.getElementById('apptab-' + t);
    if (btn) btn.focus();
  });
})();
}

import { prefersReducedMotion } from './ui-motion.mjs';

var resizeTimer = null;
var indicatorsReady = false;

function isTabVisible(tabEl) {
  if (!tabEl) return false;
  if (tabEl.offsetParent !== null) return true;
  var style = window.getComputedStyle(tabEl);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function ensureTabBarIndicator(barEl) {
  if (!barEl) return null;
  var pill = barEl.querySelector(':scope > .tab-bar-indicator');
  if (pill) return pill;
  pill = document.createElement('span');
  pill.className = 'tab-bar-indicator';
  pill.setAttribute('aria-hidden', 'true');
  barEl.insertBefore(pill, barEl.firstChild);
  return pill;
}

export function syncTabBarIndicator(barEl, tabEl) {
  if (!barEl || !tabEl || !isTabVisible(tabEl)) {
    var pillHide = barEl && barEl.querySelector(':scope > .tab-bar-indicator');
    if (pillHide) pillHide.style.opacity = '0';
    return;
  }
  var pill = ensureTabBarIndicator(barEl);
  if (!pill) return;
  var barRect = barEl.getBoundingClientRect();
  var tabRect = tabEl.getBoundingClientRect();
  pill.style.width = Math.max(0, tabRect.width) + 'px';
  pill.style.transform = 'translateX(' + Math.max(0, tabRect.left - barRect.left) + 'px)';
  pill.style.opacity = '1';
}

export function syncAppTabIndicator(tab) {
  if (tab === 'lan') tab = 'lab';
  var bar = document.getElementById('app-main-tablist');
  var btn = document.getElementById('apptab-' + tab);
  syncTabBarIndicator(bar, btn);
}

export function innerTabButtonId(tab, opts) {
  opts = opts || {};
  if (opts.consolidated) {
    if (tab === 'recetaHu') return 'itab-salida';
    if (tab === 'datos' || tab === 'todo') return 'itab-paciente';
    if (tab === 'notas' || tab === 'indica' || tab === 'manejo') return 'itab-clinico';
    if (tab === 'tend' || tab === 'cult') return 'itab-resultados';
    if (tab === 'paciente' || tab === 'clinico' || tab === 'resultados' || tab === 'salida') {
      return 'itab-' + tab;
    }
    return 'itab-paciente';
  }
  if (tab === 'recetaHu') return 'itab-receta-hu';
  return 'itab-' + tab;
}

export function syncInnerTabIndicator(tab, opts) {
  opts = opts || {};
  var bar = document.querySelector('.inner-tab-bar');
  var btn = document.getElementById(innerTabButtonId(tab, opts));
  syncTabBarIndicator(bar, btn);
}

export function animateTabPanelEnter(panelEl) {
  if (!panelEl || prefersReducedMotion()) return;
  panelEl.classList.remove('tab-panel-enter');
  void panelEl.offsetWidth;
  panelEl.classList.add('tab-panel-enter');
  function onEnd(ev) {
    if (ev.animationName !== 'rpc-tab-panel-in') return;
    panelEl.removeEventListener('animationend', onEnd);
    panelEl.classList.remove('tab-panel-enter');
  }
  panelEl.addEventListener('animationend', onEnd);
}

export function showAppTabPanel(panelEl, animate) {
  if (!panelEl) return;
  panelEl.style.display = 'flex';
  panelEl.style.flex = '1';
  panelEl.style.overflow = 'hidden';
  panelEl.style.minHeight = '0';
  if (animate) animateTabPanelEnter(panelEl);
}

export function hideAppTabPanel(panelEl) {
  if (!panelEl) return;
  panelEl.style.display = 'none';
  panelEl.classList.remove('tab-panel-enter');
}

function scheduleIndicatorSync() {
  syncAppTabIndicator(getActiveAppTabFromDom());
  if (isConsolidatedExpedienteTabsVisible()) {
    var bar = document.querySelector('.inner-tab-bar');
    var conTabs = document.querySelectorAll('.exp-consolidated-tab');
    for (var i = 0; i < conTabs.length; i++) {
      if (conTabs[i].classList.contains('active')) {
        syncTabBarIndicator(bar, conTabs[i]);
        return;
      }
    }
  }
  syncInnerTabIndicator(getActiveInnerTabFromDom());
}

function getActiveAppTabFromDom() {
  var tabs = ['lab', 'nota', 'med', 'agenda'];
  for (var i = 0; i < tabs.length; i++) {
    var btn = document.getElementById('apptab-' + tabs[i]);
    if (btn && btn.classList.contains('active')) return tabs[i];
  }
  return 'lab';
}

function isConsolidatedExpedienteTabsVisible() {
  var first = document.querySelector('.exp-consolidated-tab');
  return !!(first && first.style.display !== 'none');
}

function getActiveInnerTabFromDom() {
  if (isConsolidatedExpedienteTabsVisible()) {
    var conTabs = document.querySelectorAll('.exp-consolidated-tab');
    for (var c = 0; c < conTabs.length; c++) {
      if (conTabs[c].classList.contains('active')) return conTabs[c].id.replace(/^itab-/, '');
    }
  }
  var ids = ['datos', 'notas', 'indica', 'tend', 'cult', 'listado', 'todo', 'manejo', 'recetaHu'];
  for (var i = 0; i < ids.length; i++) {
    var btn = document.getElementById(innerTabButtonId(ids[i]));
    if (btn && btn.classList.contains('active')) return ids[i];
  }
  return 'todo';
}

export function initTabBarMotion() {
  if (indicatorsReady) {
    scheduleIndicatorSync();
    return;
  }
  ensureTabBarIndicator(document.getElementById('app-main-tablist'));
  ensureTabBarIndicator(document.querySelector('.inner-tab-bar'));
  document.documentElement.classList.add('tab-bar-indicators-ready');
  indicatorsReady = true;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scheduleIndicatorSync, 100);
  });
  requestAnimationFrame(function () {
    requestAnimationFrame(scheduleIndicatorSync);
  });
}

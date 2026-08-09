/**
 * Synchronous first-run onboarding shell — runs before app.bundle.mjs loads.
 * Step 1 (sync mode) only reads localStorage; no SQLCipher / clinical bootstrap.
 * Defers the heavy app bundle until the user picks a mode so clicks stay responsive.
 */
(function () {
  'use strict';

  var MAIN_ID = 'clinical-onboarding-main';
  var ACTIVE_CLASS = 'clinical-onboarding-active';

  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    } catch (_e) {
      return {};
    }
  }

  function isDbMode() {
    return !!(
      typeof window !== 'undefined' &&
      window.electronAPI &&
      typeof window.electronAPI.dbClinicalLoadAll === 'function'
    );
  }

  function hasRememberMeCloudToken() {
    try {
      return !!String(localStorage.getItem('rpc-cloud-sync-token') || '').trim();
    } catch (_e) {
      return false;
    }
  }

  function needsEarlySyncModeChoice() {
    if (!isDbMode()) return false;
    if (window.__RPC_MOBILE_WEB__ || window.__RPC_CLOUD_MOBILE__) return false;
    var settings = readSettings();
    if (settings.clinicalRegistered === true) return false;
    if (settings.clinicalLocalOnly === true || settings.clinicalLocalOnly === false) return false;
    if (settings.clinicalOnboardingExistingAccount === true) return false;
    if (hasRememberMeCloudToken()) return false;
    return true;
  }

  function buildSyncModeBodyHtml() {
    return (
      '<div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">' +
      '<button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--primary" data-sync-mode="nube">' +
      '<span class="clinical-onboard-mode-card-head">' +
      '<span class="clinical-onboard-mode-card-title">Guardia con R+ Cloud</span>' +
      '</span>' +
      '<span class="clinical-onboard-mode-card-desc">Crea tu @usuario, elige rotación y sincroniza censo y equipos por <strong>Nube</strong>.</span>' +
      '</button>' +
      '<button type="button" class="clinical-onboard-mode-card" data-sync-mode="existing">' +
      '<span class="clinical-onboard-mode-card-head">' +
      '<span class="clinical-onboard-mode-card-title">Ya tengo cuenta</span>' +
      '</span>' +
      '<span class="clinical-onboard-mode-card-desc">Inicia sesión en Nube, recuerda este dispositivo y restaura tu censo y <strong>Mi rotación</strong>.</span>' +
      '</button>' +
      '<button type="button" class="clinical-onboard-mode-card" data-sync-mode="local">' +
      '<span class="clinical-onboard-mode-card-head">' +
      '<span class="clinical-onboard-mode-card-title">Solo este equipo</span>' +
      '</span>' +
      '<span class="clinical-onboard-mode-card-desc">Sin Nube: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>' +
      '</button>' +
      '</div>'
    );
  }

  function buildStageHtml() {
    return (
      '<div class="clinical-onboarding-stage">' +
      '<div class="clinical-onboarding-stage-inner">' +
      '<div class="clinical-onboarding-progress" aria-label="Progreso del registro">' +
      '<span class="is-active" title="Modo" aria-label="Modo">1</span>' +
      '<span title="Perfil" aria-label="Perfil">2</span>' +
      '<span title="Equipo" aria-label="Equipo">3</span>' +
      '</div>' +
      '<h3 class="clinical-onboarding-title">¿Cómo usarás R+?</h3>' +
      '<div class="clinical-onboarding-lead">' +
      '<p>Elige cómo usarás R+ en este equipo. Con Nube creas cuenta o entras si ya tienes una; en solo equipo trabajas sin sincronizar.</p>' +
      '</div>' +
      buildSyncModeBodyHtml() +
      '</div></div>'
    );
  }

  function persistSyncModeChoice(mode) {
    var settings = readSettings();
    if (mode === 'local') {
      settings.clinicalLocalOnly = true;
      delete settings.clinicalOnboardingExistingAccount;
    } else if (mode === 'nube') {
      settings.clinicalLocalOnly = false;
      delete settings.clinicalOnboardingExistingAccount;
    } else if (mode === 'existing') {
      settings.clinicalOnboardingExistingAccount = true;
      settings.clinicalLocalOnly = false;
    } else {
      return;
    }
    try {
      localStorage.setItem('rpc-settings', JSON.stringify(settings));
    } catch (_e) {
      void _e;
    }
    window.__RPC_EARLY_SYNC_MODE_CHOSEN__ = mode;
  }

  function showPreparingHost(host) {
    host.innerHTML = buildBootLoadingHtml('Preparando R+', 'Iniciando R+…');
    if (window.__rpcOnboardingBootProgress && typeof window.__rpcOnboardingBootProgress.start === 'function') {
      window.__rpcOnboardingBootProgress.start(host);
    }
  }

  function buildBootLoadingHtml(title, message) {
    return (
      '<div class="clinical-onboarding-stage"><div class="clinical-onboarding-stage-inner">' +
      '<h3 class="clinical-onboarding-title">' +
      title +
      '</h3>' +
      '<div class="clinical-onboard-boot-loader" role="status" aria-live="polite" aria-busy="true">' +
      '<div class="clinical-onboard-boot-loader-row">' +
      '<span class="clinical-onboard-boot-spinner" aria-hidden="true"></span>' +
      '<p class="clinical-onboarding-status clinical-onboard-boot-progress-label">' +
      message +
      '</p></div>' +
      '<div class="clinical-onboard-boot-progress-track" aria-hidden="true">' +
      '<div class="clinical-onboard-boot-progress-bar" style="width:3%"></div>' +
      '</div></div></div></div>'
    );
  }

  function appendScript(src, onDone) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () {
      if (typeof onDone === 'function') onDone();
    };
    s.onerror = function () {
      if (typeof onDone === 'function') onDone();
    };
    document.head.appendChild(s);
  }

  function injectAppBundle() {
    if (window.__RPC_APP_BUNDLE_REQUESTED__) return;
    window.__RPC_APP_BUNDLE_REQUESTED__ = true;
    var mod = document.createElement('script');
    mod.type = 'module';
    mod.src = '/js/app.bundle.mjs';
    document.head.appendChild(mod);
  }

  function loadAppScripts() {
    if (window.__RPC_APP_SCRIPTS_LOADING__ || window.__RPC_APP_SCRIPTS_LOADED__) return;
    window.__RPC_APP_SCRIPTS_LOADING__ = true;
    appendScript('/vendor/sortable.min.js', function () {
      appendScript('/vendor/chart.umd.min.js', function () {
        window.__RPC_APP_SCRIPTS_LOADED__ = true;
        injectAppBundle();
      });
    });
  }

  function scheduleAppScriptsLoad() {
    if (window.__RPC_APP_SCRIPTS_SCHEDULED__) return;
    window.__RPC_APP_SCRIPTS_SCHEDULED__ = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        loadAppScripts();
      });
      return;
    }
    setTimeout(loadAppScripts, 0);
  }

  function wireEarlySyncModeClicks(host) {
    if (!host || host._rpcEarlySyncModeWired) return;
    host._rpcEarlySyncModeWired = true;
    host.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('[data-sync-mode]') : null;
      if (!btn) return;
      ev.preventDefault();
      persistSyncModeChoice(String(btn.getAttribute('data-sync-mode') || ''));
      showPreparingHost(host);
      scheduleAppScriptsLoad();
    });
  }

  function mountEarlySyncModeOnboarding() {
    if (!needsEarlySyncModeChoice()) return false;
    var main = document.getElementById('main-area');
    if (!main) return false;

    var host = document.getElementById(MAIN_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = MAIN_ID;
      host.className = 'clinical-onboarding-main';
      host.setAttribute('role', 'region');
      host.setAttribute('aria-label', 'Configura tu rotación');
      main.prepend(host);
    }

    document.documentElement.classList.add(ACTIVE_CLASS);
    if (!host.querySelector('.clinical-onboard-mode-grid')) {
      host.innerHTML = buildStageHtml();
    }
    wireEarlySyncModeClicks(host);
    window.__RPC_EARLY_ONBOARDING_MOUNTED__ = true;
    window.__RPC_DEFER_APP_BUNDLE__ = true;
    return true;
  }

  window.rpcMountEarlySyncModeOnboardingIfNeeded = mountEarlySyncModeOnboarding;
  window.rpcNeedsEarlySyncModeChoice = needsEarlySyncModeChoice;
  window.rpcLoadDeferredAppScripts = scheduleAppScriptsLoad;

  if (!mountEarlySyncModeOnboarding()) {
    scheduleAppScriptsLoad();
  }
})();

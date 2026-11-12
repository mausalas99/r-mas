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
    } catch {
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
      if (String(localStorage.getItem('rpc-cloud-sync-token') || '').trim()) return true;
      var api = window.electronAPI;
      if (api && typeof api.cloudSyncRememberGetSync === 'function') {
        var snap = api.cloudSyncRememberGetSync();
        return !!(snap && String(snap.token || '').trim());
      }
      return false;
    } catch {
      return false;
    }
  }

  function needsEarlySyncModeChoice() {
    if (!isDbMode()) return false;
    if (window.__RPC_MOBILE_WEB__ || window.__RPC_CLOUD_MOBILE__) return false;
    if (window.__RPC_OFFLINE_ONLY__) {
      persistSyncModeChoice('local');
      return false;
    }
    var settings = readSettings();
    if (settings.clinicalRegistered === true) return false;
    if (settings.clinicalLocalOnly === true || settings.clinicalLocalOnly === false) return false;
    if (settings.clinicalOnboardingExistingAccount === true) return false;
    if (hasRememberMeCloudToken()) return false;
    return true;
  }

  // DOM builders (no innerHTML). Keep in sync with features/clinical-onboarding-shell.mjs and
  // features/clinical-onboarding-view.jsx. This file is a classic script that runs before the
  // bundle, so it cannot import the Preact view.
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, kids, ns) {
    var n = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) {
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function svgEl(tag, attrs, kids) {
    return el(tag, attrs, kids, SVG_NS);
  }

  function svgIcon(cls, size, shapes) {
    return svgEl(
      'svg',
      {
        class: cls,
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
      },
      shapes.map(function (s) {
        return svgEl(s[0], s[1]);
      })
    );
  }

  function modeCard(mode, shapes, title, descKids, primary) {
    return el(
      'button',
      {
        type: 'button',
        class: 'clinical-onboard-mode-card' + (primary ? ' clinical-onboard-mode-card--primary' : ''),
        'data-sync-mode': mode,
      },
      [
        el('span', { class: 'clinical-onboard-mode-card-icon-wrap' }, [
          svgIcon('clinical-onboard-mode-card-icon', '22', shapes),
        ]),
        el('span', { class: 'clinical-onboard-mode-card-head' }, [
          el('span', { class: 'clinical-onboard-mode-card-title' }, [title]),
          el('span', { class: 'clinical-onboard-mode-card-desc' }, descKids),
        ]),
        svgIcon('clinical-onboard-mode-card-chevron', '18', [['path', { d: 'm9 18 6-6-6-6' }]]),
      ]
    );
  }

  function buildSyncModeBody() {
    return el('div', { class: 'clinical-onboard-mode-grid', role: 'group', 'aria-label': 'Modo de uso' }, [
      modeCard(
        'nube',
        [['path', { d: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' }]],
        'Guardia con R+ Cloud',
        [
          'Crea tu @usuario, elige rotación y sincroniza censo y equipos por ',
          el('strong', {}, ['Nube']),
          '.',
        ],
        true
      ),
      modeCard(
        'existing',
        [
          ['path', { d: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4' }],
          ['polyline', { points: '10 17 15 12 10 7' }],
          ['line', { x1: '15', y1: '12', x2: '3', y2: '12' }],
        ],
        'Ya tengo cuenta',
        [
          'Inicia sesión en Nube, recuerda este dispositivo y restaura tu censo y ',
          el('strong', {}, ['Mi rotación']),
          '.',
        ]
      ),
      modeCard(
        'local',
        [
          ['rect', { x: '2', y: '3', width: '20', height: '14', rx: '2' }],
          ['path', { d: 'M8 21h8' }],
          ['path', { d: 'M12 17v4' }],
        ],
        'Solo este equipo',
        ['Sin Nube: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.']
      ),
    ]);
  }

  function buildStage() {
    var track = el('span', { class: 'clinical-onboarding-progress-track' }, [
      el('span', { class: 'is-active' }),
      el('span', { class: '' }),
      el('span', { class: '' }),
    ]);
    return el('div', { class: 'clinical-onboarding-stage' }, [
      el('div', { class: 'clinical-onboarding-stage-inner' }, [
        el(
          'div',
          {
            class: 'clinical-onboarding-progress',
            role: 'progressbar',
            'aria-label': 'Progreso del registro',
            'aria-valuemin': '1',
            'aria-valuemax': '3',
            'aria-valuenow': '1',
          },
          [el('span', { class: 'clinical-onboarding-progress-label' }, ['Paso 1 de 3 · Modo']), track]
        ),
        el('h3', { class: 'clinical-onboarding-title' }, ['¿Cómo usarás R+?']),
        el('div', { class: 'clinical-onboarding-lead' }, [
          el('p', {}, [
            'Elige cómo usarás R+ en este equipo. Con Nube creas cuenta o entras si ya tienes una; en solo equipo trabajas sin sincronizar.',
          ]),
        ]),
        buildSyncModeBody(),
      ]),
    ]);
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
    } catch (e) {
      console.warn("[clinical-onboarding-early-boot] failed to write rpc-settings", e);
    }
    window.__RPC_EARLY_SYNC_MODE_CHOSEN__ = mode;
  }

  function showPreparingHost(host) {
    host.replaceChildren(buildBootLoading('Preparando R+', 'Iniciando R+…'));
    if (window.__rpcOnboardingBootProgress && typeof window.__rpcOnboardingBootProgress.start === 'function') {
      window.__rpcOnboardingBootProgress.start(host);
    }
  }

  function buildBootLoading(title, message) {
    return el('div', { class: 'clinical-onboarding-stage' }, [
      el('div', { class: 'clinical-onboarding-stage-inner' }, [
        el('h3', { class: 'clinical-onboarding-title' }, [title]),
        el('div', { class: 'clinical-onboard-boot-loader', role: 'status', 'aria-live': 'polite', 'aria-busy': 'true' }, [
          el('div', { class: 'clinical-onboard-boot-loader-row' }, [
            el('span', { class: 'clinical-onboard-boot-spinner', 'aria-hidden': 'true' }),
            el('p', { class: 'clinical-onboarding-status clinical-onboard-boot-progress-label' }, [message]),
          ]),
          el('div', { class: 'clinical-onboard-boot-progress-track', 'aria-hidden': 'true' }, [
            el('div', { class: 'clinical-onboard-boot-progress-bar', style: 'width:3%' }),
          ]),
        ]),
      ]),
    ]);
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
    // The module bundle is the long pole — request it first.
    injectAppBundle();
    var pending = 3;
    function done() {
      pending -= 1;
      if (pending === 0) window.__RPC_APP_SCRIPTS_LOADED__ = true;
    }
    appendScript('/vendor/sortable.min.js', done);
    appendScript('/vendor/chart.umd.min.js', done);
    appendScript('/vendor/feel.js', done);
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
      host.replaceChildren(buildStage());
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

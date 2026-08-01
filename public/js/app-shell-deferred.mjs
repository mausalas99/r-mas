/**
 * Deferred shell initialization (idle callback / setTimeout).
 * Cold features load via dynamic import() inside idle callbacks — keep this
 * module free of static imports of heavy feature panels.
 */
import { isMobileWeb } from './mobile-web.mjs';
import {
  refreshDocQueueBadgeFromShell,
  refreshEntregaPrepBadgeFromShell,
  refreshCultivoQueueBadgeFromShell,
} from './app-shell-lazy-panels.mjs';

function importLazyRoutes() {
  return import('./lazy-feature-routes.mjs');
}

function _rpcDeferInit(fn) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(
      function () {
        try {
          fn();
        } catch (e) {
          console.error('deferInit error:', e && e.message);
        }
      },
      { timeout: 1500 }
    );
  } else {
    setTimeout(function () {
      try {
        fn();
      } catch (e) {
        console.error('deferInit error:', e && e.message);
      }
    }, 200);
  }
}

/** Expose clinical handoff entry points on window.appShell. */
export function installClinicalAppShell() {
  if (typeof window === 'undefined') return;
  window.appShell = window.appShell || {};
  void importLazyRoutes()
    .then(function (routes) {
      return routes.ensureEntregaLoaded();
    })
    .then(function (mod) {
      window.appShell.openEntregaModal = mod.openEntregaModal;
    });
}

function deferMobileWebBoot_() {
  void import('./app-shell-mobile-boot.mjs').then(function (mod) {
    return mod.initMobileWebBoot();
  });
}

/** @param {(msg: string, type?: string) => void} _showToast */
export function scheduleDeferredShellInits(_showToast) {
  _rpcDeferInit(installClinicalAppShell);
  _rpcDeferInit(function () {
    void import('./features/paste-smart.mjs').then(function (mod) {
      mod.initPasteSmart();
    });
  });
  _rpcDeferInit(refreshDocQueueBadgeFromShell);
  _rpcDeferInit(refreshEntregaPrepBadgeFromShell);
  _rpcDeferInit(refreshCultivoQueueBadgeFromShell);
  _rpcDeferInit(function () {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        refreshDocQueueBadgeFromShell();
        refreshEntregaPrepBadgeFromShell();
        refreshCultivoQueueBadgeFromShell();
      }
    });
  });
  _rpcDeferInit(function () {
    void importLazyRoutes()
      .then(function (routes) {
        return routes.ensurePlatformLoaded();
      })
      .then(function (mod) {
        mod.initGoalGFeatures();
      });
  });
  _rpcDeferInit(function () {
    void importLazyRoutes()
      .then(function (routes) {
        return routes.ensureSettingsHelpLoaded();
      })
      .then(function (mod) {
        mod.initGuidedTourGate();
      });
  });
  if (isMobileWeb()) {
    deferMobileWebBoot_();
  } else {
    _rpcDeferInit(deferMobileWebBoot_);
  }
  _rpcDeferInit(function () {
    void importLazyRoutes()
      .then(function (routes) {
        return routes.ensurePlatformLoaded();
      })
      .then(function (mod) {
        mod.initRpcServerHealthWatch();
        mod.initIdleLockFeature();
      });
  });
}

/** @param {(msg: string, type?: string) => void} showToast */
export function scheduleDeferredUiInits(showToast) {
  _rpcDeferInit(function () {
    void import('./features/productivity.mjs').then(function (mod) {
      mod.initProductivityKeyboardShortcuts();
    });
  });
  _rpcDeferInit(function () {
    void import('./app-shell-keyboard.mjs').then(function (mod) {
      mod.initShellKeyboardShortcuts(showToast);
    });
  });
}

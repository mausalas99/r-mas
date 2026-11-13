/**
 * Deferred shell initialization (idle callback / setTimeout).
 * Cold features load via dynamic import() inside idle callbacks — keep this
 * module free of static imports of heavy feature panels.
 */
import { isMobileWeb } from './mobile-web.mjs';

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

/** Warm the Entrega chunk so the first open is instant. */
export function installClinicalAppShell() {
  if (typeof window === 'undefined') return;
  void importLazyRoutes().then(function (routes) {
    return routes.ensureEntregaLoaded();
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
  // Shell shortcuts: wire as soon as shell boots (no second idle defer — sala/EA forms keep focus in inputs).
  void import('./app-shell-keyboard.mjs').then(function (mod) {
    mod.initShellKeyboardShortcuts(showToast);
    mod.initModalInert();
  });
  void import('./keyboard-shortcuts-nudge.mjs').then(function (mod) {
    mod.initKeyboardShortcutsNudge(showToast);
  });
  _rpcDeferInit(function () {
    void import('./feature-hints.mjs').then(function (mod) {
      mod.initFeatureHints();
    });
  });
}

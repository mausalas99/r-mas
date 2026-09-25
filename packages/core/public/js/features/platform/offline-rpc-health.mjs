/** RPC server health polling, offline banner, and pending-jobs pill. */
import {
  canGenerateDocumentsOffline,
  shouldShowLocalServerOfflineBanner,
} from '../../document-export-client.mjs';
import { getPlatformRuntime } from './runtime.mjs';

const rt = getPlatformRuntime();

var pendingJobs = 0;
var rpcOffline = false;

function setRpcOfflineVisible(show) {
  var b = document.getElementById('rpc-offline-banner');
  if (!b) return;
  var visible = shouldShowLocalServerOfflineBanner(show);
  b.classList.toggle('visible', visible);
  if (!visible) {
    b.hidden = true;
    b.setAttribute('aria-hidden', 'true');
  } else {
    b.hidden = false;
    b.removeAttribute('aria-hidden');
  }
}

function renderPendingJobsPill() {
  try {
    var pill = document.getElementById('pending-jobs-pill');
    if (!pill) return;
    if (pendingJobs > 0) {
      pill.textContent = 'Procesando (' + pendingJobs + ')';
      pill.classList.add('visible');
    } else {
      pill.textContent = '';
      pill.classList.remove('visible');
    }
  } catch (e) {
    console.error('renderPendingJobsPill error:', e && e.message);
  }
}

function incrementPendingJobs() {
  pendingJobs += 1;
  renderPendingJobsPill();
}

function decrementPendingJobs() {
  pendingJobs = Math.max(0, pendingJobs - 1);
  renderPendingJobsPill();
}

function syncDocExportButtonOfflineState(btn) {
  if (!btn) return;
  if (rpcOffline && !canGenerateDocumentsOffline()) {
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
    btn.dataset.rpcOffline = '1';
    return;
  }
  if (btn.dataset.rpcOffline) delete btn.dataset.rpcOffline;
  if (!btn.classList.contains('loading')) {
    btn.disabled = false;
    btn.removeAttribute('aria-disabled');
  }
}

function syncOfflineButtonStates() {
  try {
    var exportButtons = document.querySelectorAll('.rpc-doc-export, #censo-export-confirm');
    exportButtons.forEach(function (b) {
      syncDocExportButtonOfflineState(b);
    });
  } catch (e) {
    console.error('syncOfflineButtonStates error:', e && e.message);
  }
}

function setRpcOffline(offline) {
  var prev = rpcOffline;
  rpcOffline = !!offline;
  setRpcOfflineVisible(rpcOffline);
  syncOfflineButtonStates();
  // Desktop IPC: no banner/toast — local :3738 health is not the doc path.
  if (canGenerateDocumentsOffline()) return;
  if (!prev && rpcOffline) {
    try { rt.showToast('Sin conexión con el servidor local. Generación de documentos desactivada.', 'error'); } catch (_e) { void _e; }
  } else if (prev && !rpcOffline) {
    try { rt.showToast('Servidor local reconectado.', 'success'); } catch (_e) { void _e; }
  }
}

function isRpcOffline() { return rpcOffline; }

function isCloudMobileSurface() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__RPC_CLOUD_MOBILE__) return true;
    if (
      typeof document !== 'undefined' &&
      document.documentElement &&
      (document.documentElement.dataset.cloudMobile === '1' ||
        document.documentElement.classList.contains('rpc-cloud-mobile'))
    ) {
      return true;
    }
  } catch (_e) {
    void _e;
  }
  return false;
}

function checkRpcServerHealth() {
  if (isCloudMobileSurface()) {
    try {
      rpcOffline = false;
      setRpcOfflineVisible(false);
      var offlineBanner = document.getElementById('rpc-offline-banner');
      if (offlineBanner) {
        offlineBanner.hidden = true;
        offlineBanner.classList.remove('visible');
      }
      var lanBanner = document.getElementById('lan-connection-banner');
      if (lanBanner) lanBanner.hidden = true;
    } catch (_e) {
      void _e;
    }
    return;
  }
  // app://rplus desktop: docs via IPC; /health is not served by the custom scheme.
  if (canGenerateDocumentsOffline()) {
    setRpcOffline(false);
    return;
  }
  try {
    fetch('/health', { method: 'GET', cache: 'no-store' })
      .then(function(r) {
        if (r.status === 429) return;
        if (!r.ok) throw new Error('bad status');
        return r.json();
      })
      .then(function(j) {
        if (j === undefined) return;
        try {
          if (!j || !j.ok) throw new Error('bad payload');
          setRpcOffline(false);
        } catch (e) {
          setRpcOffline(true);
          console.error('health payload error:', e && e.message);
        }
      })
      .catch(function() {
        try { setRpcOffline(true); } catch (e) { console.error('setRpcOffline error:', e && e.message); }
      });
  } catch (e) {
    console.error('checkRpcServerHealth crashed:', e && e.message);
    try { setRpcOffline(true); } catch (_e) { void _e; }
  }
}

function initRpcServerHealthWatch() {
  if (isCloudMobileSurface()) {
    checkRpcServerHealth();
    return;
  }
  if (canGenerateDocumentsOffline()) {
    checkRpcServerHealth();
    return;
  }
  checkRpcServerHealth();
  setInterval(checkRpcServerHealth, 15000);
}

export {
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  isRpcOffline,
  setRpcOffline,
  checkRpcServerHealth,
  initRpcServerHealthWatch,
};

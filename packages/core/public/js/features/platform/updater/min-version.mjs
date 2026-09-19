/** Minimum supported version gate and blocking modal. */
import { setAsyncButtonLoading } from '../../../ui-motion.mjs';
import { fetchMinVersionPayload } from '../../../min-version-fetch.mjs';
import { buildManualInstallerUrl, pickMacArch } from '../../../../../lib/update-downgrade.mjs';
import { RELEASES_LATEST_URL, updaterState } from './state.mjs';
import { compareSemver } from './version-compare.mjs';

/**
 * @param {string} version
 * @param {string} platform
 * @param {string} arch
 */
function resolveDownloadUrl(version, platform, arch) {
  try {
    return buildManualInstallerUrl(version, platform, arch);
  } catch (_e) {
    return RELEASES_LATEST_URL;
  }
}

/** Human-readable label for the direct download button. */
function downloadLabel(platform, arch) {
  if (platform === 'darwin') {
    return pickMacArch(arch) === 'arm64'
      ? 'Descargar — Mac Apple Silicon'
      : 'Descargar — Mac Intel';
  }
  if (platform === 'win32') return 'Descargar — Windows';
  return 'Descargar desde GitHub';
}

function openUrl(url) {
  if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
    window.electronAPI.openExternal(url);
  } else {
    try { window.open(url, '_blank'); } catch (_e) { void _e; }
  }
}

function showMinVersionBlockingModal(current, minVersion, message, platformInfo) {
  var bd = document.getElementById('min-version-backdrop');
  if (!bd) return;
  var meta = document.getElementById('min-version-meta');
  var msg = document.getElementById('min-version-message');
  if (msg && message) msg.textContent = String(message);
  if (meta) {
    meta.textContent = 'Versión actual: v' + current + ' · Mínima soportada: v' + minVersion;
  }

  var platform = platformInfo && platformInfo.platform;
  var arch = platformInfo && platformInfo.arch;
  var directUrl = platform
    ? resolveDownloadUrl(minVersion, platform, arch || 'x64')
    : null;

  var checkBtn = document.getElementById('min-version-check-btn');
  var relBtn = document.getElementById('min-version-releases-btn');

  if (checkBtn) {
    checkBtn.onclick = function () {
      if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
        setAsyncButtonLoading(checkBtn, true, { loadingText: 'Buscando…' });
        try { window.electronAPI.checkForUpdates(); } catch (_e) { void _e; }
      } else {
        openUrl(directUrl || RELEASES_LATEST_URL);
      }
    };
  }

  if (relBtn) {
    if (directUrl) {
      relBtn.textContent = downloadLabel(platform, arch || 'x64');
      relBtn.onclick = function () { openUrl(directUrl); };
    } else {
      relBtn.onclick = function () { openUrl(RELEASES_LATEST_URL); };
    }
  }

  // Cierra otros modales para evitar interferencia; este gate es bloqueante.
  var snoozed = document.getElementById('update-modal-backdrop');
  if (snoozed) { snoozed.style.display = 'none'; snoozed.setAttribute('aria-hidden', 'true'); }
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  if (!updaterState.minVersionGateKeydownBound) {
    updaterState.minVersionGateKeydownBound = true;
    document.addEventListener('keydown', function (e) {
      var active = document.getElementById('min-version-backdrop');
      if (!active || !active.classList.contains('open')) return;
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }
}

function checkMinVersionGate() {
  if (typeof fetch !== 'function') return;
  var api = window.electronAPI || null;
  var currentVersionPromise = (api && typeof api.getAppVersion === 'function')
    ? api.getAppVersion().catch(function () { return null; })
    : Promise.resolve(null);
  var platformPromise = (api && typeof api.getPlatform === 'function')
    ? api.getPlatform().catch(function () { return null; })
    : Promise.resolve(null);
  var archPromise = (api && typeof api.getArch === 'function')
    ? api.getArch().catch(function () { return null; })
    : Promise.resolve(null);
  var payloadPromise = fetchMinVersionPayload().catch(function () { return null; });

  Promise.all([currentVersionPromise, payloadPromise, platformPromise, archPromise])
    .then(function (res) {
      var currentVersion = res[0];
      var payload = res[1];
      var platform = res[2];
      var arch = res[3];
      if (!currentVersion || !payload || typeof payload !== 'object' || !payload.minVersion) return;
      if (compareSemver(currentVersion, payload.minVersion) < 0) {
        var platformInfo = platform ? { platform: platform, arch: arch || 'x64' } : null;
        showMinVersionBlockingModal(currentVersion, payload.minVersion, payload.message, platformInfo);
      }
    }).catch(function () {});
}

export { showMinVersionBlockingModal, checkMinVersionGate };

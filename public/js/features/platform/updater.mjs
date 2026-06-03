/** Auto-updater modal UI, channels, telemetry, min-version gate. */
import { formatProgressLine } from '../../update-helpers.mjs';
import {
  initStableDowngradeSettings,
  openSettingsDowngradeSection,
} from '../../stable-downgrade-ui.mjs';
import { fetchMinVersionPayload } from '../../min-version-fetch.mjs';
import { setAsyncButtonLoading } from '../../ui-motion.mjs';
import { formatCuratedReleaseNotesPlain } from '../settings-help/release-notes.mjs';
import { getPlatformRuntime } from './runtime.mjs';

const rt = getPlatformRuntime();

function resetUpdateCheckButtons() {
  ['settings-check-updates-btn', 'settings-repair-update-btn', 'min-version-check-btn'].forEach(
    function (id) {
      setAsyncButtonLoading(document.getElementById(id), false);
    }
  );
}

/**
 * Re-descarga e instala la build publicada del tag de la versión instalada (mismo número en GitHub).
 * Útil tras subir un fix sin bump: reemplaza el binario sin borrar userData.
 */
function checkForRepairUpdate() {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.reinstallCurrentRelease !== 'function'
  ) {
    rt.showToast('Las actualizaciones automáticas solo están en la app de escritorio.', 'error');
    return;
  }
  pendingRepairUpdateCheck = true;
  try {
    if (typeof window.electronAPI.resetUpdateFeed === 'function') {
      window.electronAPI.resetUpdateFeed();
    }
  } catch (_e) {}
  setUpdateChannel('estable');
  syncUpdateChannelUI();
  if (typeof window.electronAPI.setUpdateChannel === 'function') {
    try {
      window.electronAPI.setUpdateChannel('estable');
    } catch (_e) {}
  }
  setAsyncButtonLoading(document.getElementById('settings-repair-update-btn'), true, {
    loadingText: 'Buscando…',
  });
  var versionLabel = 'actual';
  if (typeof window.electronAPI.getAppVersion === 'function') {
    window.electronAPI.getAppVersion().then(function (v) {
      if (v) versionLabel = 'v' + v;
    }).catch(function () {});
  }
  rt.showToast(
    'Reinstalando ' + versionLabel + ' desde GitHub (canal Estable). No borra tus datos.',
    'info'
  );
  setTimeout(function () {
    try {
      window.electronAPI.reinstallCurrentRelease();
    } catch (_e) {}
  }, 150);
}

function syncRepairUpdateButtonLabel() {
  var btn = document.getElementById('settings-repair-update-btn');
  if (!btn || !window.electronAPI || typeof window.electronAPI.getAppVersion !== 'function') return;
  window.electronAPI.getAppVersion().then(function (v) {
    if (v) btn.textContent = 'Reinstalar versión actual (v' + v + ')…';
  }).catch(function () {});
}

function checkForAppUpdates() {
  if (!window.electronAPI || typeof window.electronAPI.checkForUpdates !== 'function') {
    rt.showToast('Las actualizaciones automáticas solo están en la app de escritorio.', 'error');
    return;
  }
  if (typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(getUpdateChannel()); } catch (_e) {}
  }
  setAsyncButtonLoading(document.getElementById('settings-check-updates-btn'), true, {
    loadingText: 'Buscando…',
  });
  setTimeout(function () {
    try { window.electronAPI.checkForUpdates(); } catch (_e) {}
  }, 150);
}


// ── Auto-updater UI (modal) ───────────────────────────────────────
var UPDATE_SNOOZE_KEY = 'rplus-update-snooze-until';
var UPDATE_DISMISS_VER_KEY = 'rplus-update-dismiss-version';
var UPDATE_TELEMETRY_URL = 'https://example.invalid/r-plus-update';
var RELEASES_LATEST_URL = 'https://github.com/mausalas99/r-mas/releases/latest';
var pendingUpdaterTargetVersion = null;
var pendingUpdaterIsPrerelease = false;
var pendingDowngradeVersion = null;
var pendingRepairUpdateCheck = false;
/** @type {'upgrade' | 'downgrade'} */
var updateModalMode = 'upgrade';
var minVersionGateKeydownBound = false;

function getUpdateChannel() {
  var s = rt.getSettings();
  var raw = String((s && s.updateChannel) || 'estable').toLowerCase();
  return raw === 'beta' ? 'beta' : 'estable';
}

function setUpdateChannel(channel) {
  var normalized = String(channel || '').toLowerCase() === 'beta' ? 'beta' : 'estable';
  var previous = getUpdateChannel();
  var s = rt.getSettings();
  s.updateChannel = normalized;
  localStorage.setItem('rpc-settings', JSON.stringify(s));
  syncUpdateChannelUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(normalized); } catch (_e) {}
  }
  if (previous !== normalized) {
    rt.showToast(
      normalized === 'beta'
        ? 'Canal pre-releases activado: recibirás borradores de GitHub.'
        : 'Canal estable activado.',
      'success'
    );
    if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
      setTimeout(function () {
        try { window.electronAPI.checkForUpdates(); } catch (_e) {}
      }, 250);
    }
  }
}

function syncUpdateModalChannelPill(isPrerelease) {
  var pill = document.getElementById('update-modal-channel-pill');
  if (pill) pill.style.display = isPrerelease ? 'inline-block' : 'none';
}

function syncUpdateChannelUI() {
  syncRepairUpdateButtonLabel();
  var sel = document.getElementById('rpc-update-channel');
  if (sel) sel.value = getUpdateChannel();
  syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
  if (typeof syncTeamSyncHeaderButton === 'function') rt.syncTeamSyncHeaderButton();
}

/** Tras 3.2.1 estable: quien tenía canal pre-releases vuelve a Estable (una sola vez). */
function migrateUpdateChannelToStableDefault() {
  var key = 'rpc-update-channel-stable-default-v321';
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  if (getUpdateChannel() !== 'beta') return;
  var s = rt.getSettings();
  s.updateChannel = 'estable';
  localStorage.setItem('rpc-settings', JSON.stringify(s));
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel('estable'); } catch (_e) {}
    if (typeof window.electronAPI.checkForUpdates === 'function') {
      setTimeout(function () {
        try { window.electronAPI.checkForUpdates(); } catch (_e) {}
      }, 300);
    }
  }
}

function getUpdateTelemetryEnabled() {
  var s = rt.getSettings();
  return !!(s && s.updateTelemetryEnabled);
}

function setUpdateTelemetryEnabled(enabled) {
  var value = !!enabled;
  var s = rt.getSettings();
  s.updateTelemetryEnabled = value;
  localStorage.setItem('rpc-settings', JSON.stringify(s));
  syncUpdateTelemetryUI();
  rt.showToast(value ? 'Telemetría de actualización activada.' : 'Telemetría desactivada.', 'success');
}

function syncUpdateTelemetryUI() {
  var cb = document.getElementById('rpc-update-telemetry-toggle');
  if (cb) cb.checked = getUpdateTelemetryEnabled();
}

function syncHardwareAccelerationUI() {
  var acc = document.getElementById('settings-accordion-performance');
  var cb = document.getElementById('settings-hardware-acceleration');
  if (!acc || !cb) return;
  var api = window.electronAPI;
  if (!api || typeof api.getPerformancePrefs !== 'function') {
    acc.style.display = 'none';
    return;
  }
  acc.style.display = '';
  api
    .getPerformancePrefs()
    .then(function (prefs) {
      cb.checked = !!(prefs && prefs.hardwareAcceleration);
    })
    .catch(function () {
      cb.checked = false;
    });
}

function onHardwareAccelerationChange(enabled) {
  var api = window.electronAPI;
  if (!api || typeof api.setHardwareAcceleration !== 'function') {
    rt.showToast('Solo disponible en la aplicación de escritorio.', 'error');
    syncHardwareAccelerationUI();
    return;
  }
  api
    .setHardwareAcceleration(!!enabled)
    .then(function () {
      rt.showToast('Reinicia R+ para aplicar la aceleración por hardware.', 'info');
    })
    .catch(function () {
      rt.showToast('No se pudo guardar la preferencia.', 'error');
      syncHardwareAccelerationUI();
    });
}

function resolvePlatformForTelemetry() {
  if (window.electronAPI && typeof window.electronAPI.getPlatform === 'function') {
    return window.electronAPI.getPlatform().catch(function () { return 'unknown'; });
  }
  return Promise.resolve('web');
}

function sendUpdateTelemetry(result, versionHint) {
  if (!getUpdateTelemetryEnabled()) return;
  if (typeof fetch !== 'function') return;
  var normalizedResult = result === 'success' ? 'success' : 'fail';
  var versionPromise = versionHint
    ? Promise.resolve(versionHint)
    : (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function'
        ? window.electronAPI.getAppVersion().catch(function () { return 'dev'; })
        : Promise.resolve('dev'));
  Promise.all([resolvePlatformForTelemetry(), versionPromise]).then(function (vals) {
    var payload = {
      version: String(vals[1] || 'unknown'),
      result: normalizedResult,
      platform: String(vals[0] || 'unknown'),
    };
    try {
      fetch(UPDATE_TELEMETRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: 'no-cors',
      }).catch(function () {});
    } catch (_e) {}
  }).catch(function () {});
}

function compareSemver(a, b) {
  function parse(v) {
    var m = String(v == null ? '' : v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-.+].*)?$/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }
  var pa = parse(a); var pb = parse(b);
  if (!pa || !pb) return 0;
  for (var i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function showMinVersionBlockingModal(current, minVersion, message) {
  var bd = document.getElementById('min-version-backdrop');
  if (!bd) return;
  var meta = document.getElementById('min-version-meta');
  var msg = document.getElementById('min-version-message');
  if (msg && message) msg.textContent = String(message);
  if (meta) {
    meta.textContent = 'Versión actual: v' + current + ' · Mínima soportada: v' + minVersion;
  }
  var checkBtn = document.getElementById('min-version-check-btn');
  var relBtn = document.getElementById('min-version-releases-btn');
  if (checkBtn) {
    checkBtn.onclick = function () {
      if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
        setAsyncButtonLoading(checkBtn, true, { loadingText: 'Buscando…' });
        try { window.electronAPI.checkForUpdates(); } catch (_e) {}
      } else if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(RELEASES_LATEST_URL);
      }
    };
  }
  if (relBtn) {
    relBtn.onclick = function () {
      if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(RELEASES_LATEST_URL);
      } else {
        try { window.open(RELEASES_LATEST_URL, '_blank'); } catch (_e) {}
      }
    };
  }
  // Cierra otros modales para evitar interferencia; este gate es bloqueante.
  var snoozed = document.getElementById('update-modal-backdrop');
  if (snoozed) { snoozed.style.display = 'none'; snoozed.setAttribute('aria-hidden', 'true'); }
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  if (!minVersionGateKeydownBound) {
    minVersionGateKeydownBound = true;
    document.addEventListener('keydown', function (e) {
      var active = document.getElementById('min-version-backdrop');
      if (!active || !active.classList.contains('open')) return;
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }
}

function checkMinVersionGate() {
  if (typeof fetch !== 'function') return;
  var currentVersionPromise = (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function')
    ? window.electronAPI.getAppVersion().catch(function () { return null; })
    : Promise.resolve(null);
  var payloadPromise = fetchMinVersionPayload().catch(function () {
    return null;
  });
  Promise.all([currentVersionPromise, payloadPromise]).then(function (res) {
    var currentVersion = res[0];
    var payload = res[1];
    if (!currentVersion || !payload || typeof payload !== 'object' || !payload.minVersion) return;
    if (compareSemver(currentVersion, payload.minVersion) < 0) {
      showMinVersionBlockingModal(currentVersion, payload.minVersion, payload.message);
    }
  }).catch(function () {});
}

var nativeRecoveryModalShown = false;

function showNativeRuntimeRecoveryModal(status) {
  if (nativeRecoveryModalShown || !status || status.ok) return;
  nativeRecoveryModalShown = true;
  var msg =
    (status.userMessage || status.message || 'R+ no pudo cargar un componente nativo.') +
    (status.detail ? '\n\n' + status.detail : '');
  resetUpdateModalPanels();
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = 'Problema de instalación';
  }
  var notes = document.getElementById('update-modal-notes');
  if (notes) notes.textContent = msg;
  var state = document.getElementById('update-modal-state');
  if (state) {
    state.textContent =
      'Usa Ajustes → Reinstalar versión actual, Restaurar versión estable, o descarga el instalador desde GitHub Releases.';
  }
  var wrap = document.getElementById('update-modal-progress-wrap');
  if (wrap) wrap.style.display = 'none';
  var pill = document.getElementById('update-modal-version-pill');
  if (pill) pill.style.display = 'none';
  var err = document.getElementById('update-modal-error');
  if (err) err.style.display = 'none';
  var actions = document.getElementById('update-modal-actions-primary');
  var sec = document.getElementById('update-modal-actions-secondary');
  if (actions) {
    actions.innerHTML = '';
    var settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn-primary';
    settingsBtn.textContent = 'Abrir restaurar versión estable…';
    settingsBtn.onclick = function () {
      hideUpdateModal();
      openSettingsDowngradeSection();
    };
    actions.appendChild(settingsBtn);
    var ghBtn = document.createElement('button');
    ghBtn.className = 'btn-secondary';
    ghBtn.textContent = 'Ver releases en GitHub';
    ghBtn.onclick = function () {
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal('https://github.com/mausalas99/r-mas/releases');
      }
    };
    actions.appendChild(ghBtn);
  }
  if (sec) {
    sec.innerHTML = '';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.textContent = 'Continuar de todos modos';
    closeBtn.onclick = function () { hideUpdateModal(); };
    sec.appendChild(closeBtn);
  }
  showUpdateModal();
}

function checkNativeRuntimeOnBoot() {
  if (!window.electronAPI || typeof window.electronAPI.getNativeRuntimeStatus !== 'function') {
    return;
  }
  window.electronAPI
    .getNativeRuntimeStatus()
    .then(function (status) {
      if (!status || status.ok) return;
      showNativeRuntimeRecoveryModal(status);
    })
    .catch(function () {});
}

function initUpdateChannelAndGate() {
  migrateUpdateChannelToStableDefault();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(getUpdateChannel()); } catch (_e) {}
  }
  initStableDowngradeSettings({
    showToast: rt.showToast.bind(rt),
    confirmDowngrade: confirmDowngrade,
  });
  setTimeout(checkNativeRuntimeOnBoot, 800);
  // Min-version gate: pequeño retraso para no estorbar el render inicial.
  setTimeout(function () { checkMinVersionGate(); }, 1200);
}

function confirmDowngrade(version, entry) {
  var summary = entry && entry.summary ? entry.summary : '';
  var ok = window.confirm(
    'Restaurar R+ a v' + version + '?\n\n' + summary +
      '\n\nLa app se reiniciará. Tus pacientes y ajustes locales se conservan.'
  );
  if (!ok) return;
  pendingDowngradeVersion = version;
  updateModalMode = 'downgrade';
  resetUpdateModalPanels();
  showUpdateModal();
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild) title.firstChild.textContent = 'Restaurando versión estable';
  if (window.electronAPI && window.electronAPI.downgradeToStable) {
    window.electronAPI.downgradeToStable(version);
  }
}

function renderDowngradeFallback(payload) {
  updateModalMode = 'upgrade';
  pendingDowngradeVersion = null;
  resetUpdateCheckButtons();
  renderUpdateError(
    (payload && payload.message ? payload.message : 'No se pudo descargar la versión.') +
      ' Puedes abrir el instalador en GitHub.'
  );
  var actions = document.getElementById('update-modal-actions-primary');
  if (actions && payload && (payload.manualUrl || payload.version)) {
    var openBtn = document.createElement('button');
    openBtn.className = 'btn-primary';
    openBtn.textContent = 'Abrir instalador en GitHub';
    openBtn.onclick = function () {
      if (window.electronAPI && window.electronAPI.openDowngradeInstaller) {
        window.electronAPI.openDowngradeInstaller(payload.version);
      } else if (window.electronAPI && window.electronAPI.openExternal && payload.manualUrl) {
        window.electronAPI.openExternal(payload.manualUrl);
      }
    };
    actions.innerHTML = '';
    actions.appendChild(openBtn);
  }
  if (window.electronAPI && window.electronAPI.resetUpdateFeed) {
    window.electronAPI.resetUpdateFeed();
  }
}

function getUpdateSnoozeUntil() {
  var raw = localStorage.getItem(UPDATE_SNOOZE_KEY);
  var n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function setUpdateSnooze(hours) {
  var h = hours || 24;
  localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + h * 3600000));
}

function isSnoozeActiveForVersion(version) {
  var dismissed = localStorage.getItem(UPDATE_DISMISS_VER_KEY);
  if (dismissed !== version) return false;
  return Date.now() < getUpdateSnoozeUntil();
}

function markDismissedVersion(version) {
  localStorage.setItem(UPDATE_DISMISS_VER_KEY, version || '');
  setUpdateSnooze(24);
}

function showUpdateModal() {
  var el = document.getElementById('update-modal-backdrop');
  if (!el) return;
  el.style.display = 'flex';
  el.setAttribute('aria-hidden', 'false');
  var modal = document.getElementById('update-modal');
  if (modal) setTimeout(function() { try { modal.focus(); } catch (_e) {} }, 50);
}

export function hideUpdateModal() {
  if (updateModalMode === 'downgrade' && window.electronAPI && window.electronAPI.resetUpdateFeed) {
    try { window.electronAPI.resetUpdateFeed(); } catch (_e) {}
  }
  updateModalMode = 'upgrade';
  pendingDowngradeVersion = null;
  var el = document.getElementById('update-modal-backdrop');
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

function resetUpdateModalPanels() {
  var err = document.getElementById('update-modal-error');
  var wrap = document.getElementById('update-modal-progress-wrap');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  if (wrap) wrap.style.display = 'block';
}

/** Convierte notas de release (HTML o texto) a texto plano para el modal; evita mostrar etiquetas crudas. */
function stripHtmlToPlainText(html) {
  if (html == null || html === '') return '';
  var raw = String(html).trim();
  if (!raw) return '';
  try {
    var doc = new DOMParser().parseFromString(raw, 'text/html');
    var t = (doc.body && doc.body.textContent) ? doc.body.textContent : '';
    t = t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
    if (t) return t;
  } catch (_e) { /* fallback below */ }
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderUpdateError(msg) {
  resetUpdateModalPanels();
  var box = document.getElementById('update-modal-error');
  var state = document.getElementById('update-modal-state');
  var wrap = document.getElementById('update-modal-progress-wrap');
  var label = document.getElementById('update-modal-progress-label');
  var pill = document.getElementById('update-modal-version-pill');
  var notes = document.getElementById('update-modal-notes');
  if (box) { box.style.display = 'block'; box.textContent = msg || 'Error desconocido'; }
  if (state) state.textContent = '';
  if (wrap) wrap.style.display = 'none';
  if (label) label.textContent = '';
  if (pill) pill.style.display = 'none';
  if (notes) notes.textContent = '';
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = 'Actualizaciones';
  }
  var actions = document.getElementById('update-modal-actions-primary');
  var sec = document.getElementById('update-modal-actions-secondary');
  if (actions) {
    actions.innerHTML = '';
    var retry = document.createElement('button');
    retry.className = 'btn-primary';
    retry.textContent = 'Reintentar';
    retry.onclick = function() {
      resetUpdateModalPanels();
      if (window.electronAPI && window.electronAPI.checkForUpdates) window.electronAPI.checkForUpdates();
      hideUpdateModal();
    };
    actions.appendChild(retry);
  }
  if (sec) sec.innerHTML = '';
  showUpdateModal();
}

function installUpdate() {
  if (window.electronAPI) window.electronAPI.installUpdate();
}

if (typeof window !== 'undefined' && window.electronAPI) {
  window.electronAPI.onUpdateAvailable(function(payload) {
    try {
      resetUpdateCheckButtons();
      var version = (payload && payload.version) ? payload.version : String(payload || '');
      var rawNotes = (payload && payload.releaseNotes != null) ? String(payload.releaseNotes) : '';
      var releaseNotes = formatCuratedReleaseNotesPlain(version);
      if (!releaseNotes) releaseNotes = stripHtmlToPlainText(rawNotes);
      pendingUpdaterTargetVersion = version;
      pendingUpdaterIsPrerelease = !!(payload && payload.prerelease);
      var isDowngrade = updateModalMode === 'downgrade';
      var isRepair = pendingRepairUpdateCheck;
      if (isRepair) pendingRepairUpdateCheck = false;
      if (!isDowngrade && !isRepair && isSnoozeActiveForVersion(version)) return;
      resetUpdateModalPanels();
      var title = document.getElementById('update-modal-title');
      if (title && title.firstChild && title.firstChild.nodeType === 3) {
        title.firstChild.textContent = isDowngrade
          ? 'Restaurando versión estable'
          : isRepair
            ? 'Actualización de reparación'
            : 'Nueva versión';
      }
      var pill = document.getElementById('update-modal-version-pill');
      if (pill) {
        pill.textContent = 'v' + version;
        pill.style.display = 'inline-block';
      }
      syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
      var notes = document.getElementById('update-modal-notes');
      if (notes) notes.textContent = releaseNotes;
      var state = document.getElementById('update-modal-state');
      if (state) state.textContent = 'Conectando… La descarga comenzará en breve.';
      var fill = document.getElementById('update-modal-progress-fill');
      if (fill) fill.style.width = '0%';
      var label = document.getElementById('update-modal-progress-label');
      if (label) label.textContent = '';
      var actions = document.getElementById('update-modal-actions-primary');
      if (actions) {
        actions.innerHTML = '';
        if (!isDowngrade) {
          var later = document.createElement('button');
          later.className = 'btn-secondary';
          later.textContent = 'Más tarde';
          later.onclick = function() {
            markDismissedVersion(version);
            hideUpdateModal();
          };
          actions.appendChild(later);
        }
      }
      var sec = document.getElementById('update-modal-actions-secondary');
      if (sec) {
        sec.innerHTML = '';
        if (!isDowngrade) {
          var link = document.createElement('button');
          link.type = 'button';
          link.className = 'btn-link';
          link.textContent = 'Ver notas en GitHub';
          link.onclick = function() {
            if (window.electronAPI && window.electronAPI.openExternal) {
              window.electronAPI.openExternal('https://github.com/mausalas99/r-mas/releases');
            }
          };
          sec.appendChild(link);
        }
      }
      showUpdateModal();
    } catch (e) {
      console.error('onUpdateAvailable callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateProgress(function(payload) {
    try {
      var pct = typeof payload === 'number' ? payload : (payload && payload.percent != null ? payload.percent : 0);
      var transferred = payload && payload.transferred;
      var total = payload && payload.total;
      var bps = payload && payload.bytesPerSecond;
      if (pendingUpdaterTargetVersion && updateModalMode !== 'downgrade' &&
          isSnoozeActiveForVersion(pendingUpdaterTargetVersion)) return;
      resetUpdateModalPanels();
      syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
      var state = document.getElementById('update-modal-state');
      if (state) state.textContent = 'Descargando…';
      var fill = document.getElementById('update-modal-progress-fill');
      if (fill) fill.style.width = pct + '%';
      var label = document.getElementById('update-modal-progress-label');
      if (label) {
        if (transferred != null && total != null) {
          label.textContent = formatProgressLine({
            transferred: transferred,
            total: total,
            bytesPerSecond: bps,
          });
        } else {
          label.textContent = 'Progreso: ' + pct + '%';
        }
      }
      showUpdateModal();
    } catch (e) {
      console.error('onUpdateProgress callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateReady(function(payload) {
    try {
      var version = (payload && payload.version) ? payload.version : String(payload || '');
      var isDowngrade = updateModalMode === 'downgrade';
      try { sendUpdateTelemetry('success', version); } catch (_te) {}
      if (!isDowngrade && isSnoozeActiveForVersion(version)) return;
      resetUpdateModalPanels();
      syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
      var state = document.getElementById('update-modal-state');
      if (state) {
        state.textContent = isDowngrade
          ? 'Listo para restaurar. R+ se reiniciará en la versión seleccionada.'
          : 'Listo para instalar. También se instalará al cerrar la aplicación si eliges esperar.';
      }
      var fill = document.getElementById('update-modal-progress-fill');
      if (fill) fill.style.width = '100%';
      var label = document.getElementById('update-modal-progress-label');
      if (label) label.textContent = 'Descarga completa.';
      var actions = document.getElementById('update-modal-actions-primary');
      if (actions) {
        actions.innerHTML = '';
        var go = document.createElement('button');
        go.className = 'btn-primary';
        go.textContent = isDowngrade ? 'Restaurar y reiniciar' : 'Instalar y reiniciar';
        go.onclick = function() {
          updateModalMode = 'upgrade';
          pendingDowngradeVersion = null;
          installUpdate();
        };
        actions.appendChild(go);
        if (!isDowngrade) {
          var later = document.createElement('button');
          later.className = 'btn-secondary';
          later.textContent = 'Instalar al cerrar';
          later.onclick = function() { hideUpdateModal(); };
          actions.appendChild(later);
        }
      }
      var sec = document.getElementById('update-modal-actions-secondary');
      if (sec) sec.innerHTML = '';
      showUpdateModal();
    } catch (e) {
      console.error('onUpdateReady callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateNotAvailable(function(payload) {
    try {
      resetUpdateCheckButtons();
      var wasRepair = pendingRepairUpdateCheck;
      pendingRepairUpdateCheck = false;
      pendingUpdaterTargetVersion = null;
      pendingUpdaterIsPrerelease = false;
      syncUpdateModalChannelPill(false);
      if (wasRepair || (payload && payload.reinstallFailed)) {
        var v = payload && payload.version ? String(payload.version) : '';
        var detail = payload && payload.detail ? String(payload.detail) : '';
        var msg =
          'No se encontró en GitHub una build reinstalable' +
          (v ? ' para v' + v : '') +
          '. Publica o actualiza el release en GitHub (latest-mac.yml / latest.yml e instaladores) y vuelve a intentar.';
        if (detail) msg += ' Detalle: ' + detail;
        msg += ' También puedes usar «Abrir instalador en GitHub» en Restaurar versión estable.';
        rt.showToast(msg, 'error');
      } else {
        rt.showToast('R+ está actualizado.', 'success');
      }
    } catch (e) {
      console.error('onUpdateNotAvailable callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateError(function(msg) {
    try {
      resetUpdateCheckButtons();
      try { sendUpdateTelemetry('fail'); } catch (_te) {}
      renderUpdateError(msg);
    } catch (e) {
      console.error('onUpdateError callback error:', e && e.message);
    }
  });

  if (window.electronAPI.onDowngradeFailed) {
    window.electronAPI.onDowngradeFailed(function(payload) {
      try {
        resetUpdateCheckButtons();
        renderDowngradeFallback(payload);
      } catch (e) {
        console.error('onDowngradeFailed callback error:', e && e.message);
      }
    });
  }
}

export {
  getUpdateChannel,
  setUpdateChannel,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  syncHardwareAccelerationUI,
  onHardwareAccelerationChange,
  initUpdateChannelAndGate,
  getUpdateTelemetryEnabled,
  setUpdateTelemetryEnabled,
  installUpdate,
  checkForAppUpdates,
  checkForRepairUpdate,
  compareSemver,
  checkMinVersionGate,
  migrateUpdateChannelToStableDefault,
};

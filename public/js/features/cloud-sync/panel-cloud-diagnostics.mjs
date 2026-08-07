/**
 * Nube sync diagnostics UI — Conexión → Opciones → Diagnóstico Nube.
 */
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { cloudSyncTransportLabel } from './panel-conexion-html.mjs';
import {
  formatCloudDiagnosticsReport,
  getCloudSyncDiagnostics,
  redactCloudSecrets,
} from './cloud-sync-diagnostics.mjs';
import { getCloudSyncRoomSnapshot, getCloudSyncSettings } from './settings.mjs';
import { isCloudSyncActive } from './nube-sync-policy.mjs';
import { isCloudMutateBridgeConfigured } from './mutate-bridge.mjs';
import { patients } from '../../app-state.mjs';
import { getSharedNubeOutbox, getSharedNubeRuntime } from './panel-conexion-runtime.mjs';

function readCloudDiagnosticsRuntime() {
  const runtime = getSharedNubeRuntime();
  const outbox = getSharedNubeOutbox();
  return {
    status: runtime?.getStatus?.() || 'idle',
    detail: runtime?.getDetail?.() || '',
    transport: runtime?.getTransportState?.() || 'poll',
    runtimeActive: !!runtime,
    outboxEntries: outbox?.list?.() || [],
  };
}

function readCloudDiagnosticsSettings() {
  const settings = getCloudSyncSettings();
  return {
    online: typeof navigator !== 'undefined' ? navigator.onLine : null,
    bridgeConfigured: isCloudMutateBridgeConfigured(),
    cloudActive: isCloudSyncActive(),
    baseUrl: settings.baseUrl,
    tokenPresent: !!settings.token,
    roomId: settings.roomId,
    revision: settings.revision,
    roomSnapshot: getCloudSyncRoomSnapshot(),
    localPatientCount: Array.isArray(patients) ? patients.length : 0,
  };
}

/**
 * @param {{
 *   toast?: (msg: string, kind?: string) => void,
 * }} [deps]
 */
function buildCloudDiagnosticsDeps(deps) {
  return {
    ...readCloudDiagnosticsRuntime(),
    ...readCloudDiagnosticsSettings(),
    toast: typeof deps?.toast === 'function' ? deps.toast : function () {},
  };
}

function updateDiagnosticsOutboxBadge(host, diag) {
  const badge = host.querySelector('[data-cloud-outbox-badge]');
  if (!badge) return;
  const n = Number(diag.outbox?.count || 0);
  if (n > 0) {
    badge.hidden = false;
    badge.textContent = n + ' pendiente' + (n !== 1 ? 's' : '');
    return;
  }
  badge.hidden = true;
  badge.textContent = '';
}

function buildDiagnosticsStatusParts(diag) {
  const transport = String(diag.transport || 'poll');
  const transportKey = transport === 'ws' || transport === 'offline' ? transport : 'poll';
  return [
    'Estado: ' + String(diag.status || '—'),
    'Transporte: ' + cloudSyncTransportLabel(transportKey),
    diag.detail ? String(diag.detail) : '',
    diag.outbox?.count ? diag.outbox.count + ' en cola' : 'cola vacía',
    diag.lastWsError ? 'WS error: ' + diag.lastWsError : '',
    diag.lastWsClose ? 'WS close: ' + diag.lastWsClose : '',
    diag.lastWsUrl ? 'WS url: ' + redactCloudSecrets(diag.lastWsUrl) : '',
    diag.lastWsSignalAt ? 'última señal WS: ' + diag.lastWsSignalAt : '',
  ].filter(Boolean);
}

function updateDiagnosticsStatusLine(host, diag) {
  const statusLine = host.querySelector('[data-cloud-diag-status]');
  if (!statusLine) return;
  statusLine.textContent = buildDiagnosticsStatusParts(diag).join(' · ');
}

/** @param {HTMLElement} host */
function renderCloudDiagnosticsReport(host, deps) {
  const diagDeps = buildCloudDiagnosticsDeps(deps);
  const diag = getCloudSyncDiagnostics(diagDeps);
  const report = formatCloudDiagnosticsReport(diag);
  const pre = host.querySelector('.cloud-sync-diagnostics-pre');
  if (pre) pre.textContent = report;
  updateDiagnosticsOutboxBadge(host, diag);
  updateDiagnosticsStatusLine(host, diag);
  return { diagDeps, diag, report };
}

function createDiagnosticsButton(label, marginTop) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cloud-sync-btn cloud-sync-btn--ghost';
  btn.style.width = '100%';
  if (marginTop) btn.style.marginTop = marginTop;
  btn.textContent = label;
  return btn;
}

function wireDiagnosticsRetryButton(retryBtn, host, deps) {
  retryBtn.onclick = function () {
    const runtime = getSharedNubeRuntime();
    if (!runtime) {
      deps?.toast?.('Runtime Nube inactivo. Reconecta en Conexión.', 'warn');
      return;
    }
    void runtime
      .flushOutbox()
      .then(function () {
        return runtime.syncCycle();
      })
      .then(function () {
        deps?.toast?.('Cola Nube reintentada. Revisa el informe.', 'info');
        refreshCloudSyncDiagnostics(host, deps);
      })
      .catch(function () {
        deps?.toast?.('Falló el reintento. Revisa el informe.', 'error');
        refreshCloudSyncDiagnostics(host, deps);
      });
  };
}

function wireDiagnosticsSyncButton(syncBtn, host, deps) {
  syncBtn.onclick = function () {
    const runtime = getSharedNubeRuntime();
    if (!runtime) {
      deps?.toast?.('Runtime Nube inactivo. Reconecta en Conexión.', 'warn');
      return;
    }
    void runtime.syncCycle().then(function () {
      deps?.toast?.('Ciclo Nube ejecutado.', 'info');
      refreshCloudSyncDiagnostics(host, deps);
    });
  };
}

/**
 * @param {HTMLElement | null} host
 * @param {{ toast?: (msg: string, kind?: string) => void }} [deps]
 */
export function mountCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  host.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'cloud-sync-diagnostics';

  const statusLine = document.createElement('p');
  statusLine.className = 'cloud-sync-hint';
  statusLine.setAttribute('data-cloud-diag-status', '1');
  wrap.appendChild(statusLine);

  const badge = document.createElement('span');
  badge.className = 'cloud-sync-outbox-badge';
  badge.setAttribute('data-cloud-outbox-badge', '1');
  badge.hidden = true;
  badge.style.cssText =
    'display:inline-block;margin:0 0 8px;font-size:11px;background:#f59e0b;color:#fff;padding:2px 8px;border-radius:10px;';
  wrap.appendChild(badge);

  const reportPre = document.createElement('pre');
  reportPre.className = 'cloud-sync-diagnostics-pre lan-sync-diagnostics-pre';
  wrap.appendChild(reportPre);

  const copyBtn = createDiagnosticsButton('Copiar informe');
  copyBtn.onclick = function () {
    const built = renderCloudDiagnosticsReport(host, deps);
    void copyToClipboardSafe(built.report).then(function (ok) {
      deps?.toast?.(
        ok ? 'Informe Nube copiado (tokens redactados).' : 'No se pudo copiar el informe.',
        ok ? 'success' : 'error'
      );
    });
  };
  wrap.appendChild(copyBtn);

  const retryBtn = createDiagnosticsButton('Reintentar cola Nube', '6px');
  wireDiagnosticsRetryButton(retryBtn, host, deps);
  wrap.appendChild(retryBtn);

  const syncBtn = createDiagnosticsButton('Forzar sincronización', '6px');
  wireDiagnosticsSyncButton(syncBtn, host, deps);
  wrap.appendChild(syncBtn);

  host.appendChild(wrap);
  renderCloudDiagnosticsReport(host, deps);
}

/**
 * @param {HTMLElement | null} host
 * @param {{ toast?: (msg: string, kind?: string) => void }} [deps]
 */
export function refreshCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  if (!host.querySelector('.cloud-sync-diagnostics')) {
    mountCloudSyncDiagnostics(host, deps);
    return;
  }
  renderCloudDiagnosticsReport(host, deps);
}

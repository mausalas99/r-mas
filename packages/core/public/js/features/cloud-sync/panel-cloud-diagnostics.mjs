/**
 * Nube sync diagnostics UI — Conexión → Opciones → Diagnóstico Nube (dashboard).
 */
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { buildCloudDiagnosticsHumanView } from './cloud-sync-diagnostics-human.mjs';
import { renderCloudNubeDashboardHtml } from './panel-cloud-diagnostics-html.mjs';
import {
  formatCloudDiagnosticsReport,
  getCloudSyncDiagnostics,
} from './cloud-sync-diagnostics.mjs';
import { getCloudSyncRoomSnapshot, getCloudSyncSettings } from './settings.mjs';
import { isCloudSyncActive } from './nube-sync-policy.mjs';
import { isCloudMutateBridgeConfigured } from './mutate-bridge.mjs';
import { getSyncablePatients } from '../../app-state.mjs';
import { getSharedNubeOutbox, getSharedNubeRuntime } from './panel-conexion-runtime.mjs';
import { showCloudNubeFixModal } from './cloud-nube-fix-guides.mjs';
import { pruneLabSidecarsFromOutbox } from './outbox-lab.mjs';
import { CLOUD_OUTBOX_CHANGED_EVENT } from './cloud-outbox-events.mjs';

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
    localPatientCount: Array.isArray(getSyncablePatients()) ? getSyncablePatients().length : 0,
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

/**
 * @param {ReturnType<typeof buildCloudDiagnosticsHumanView>} view
 */
function updateDashboardPanel(host, view) {
  const panel = host.querySelector('[data-cloud-diag-dashboard]');
  if (!panel) return;
  panel.innerHTML = renderCloudNubeDashboardHtml(view);
}

/** @param {HTMLElement} host */
function renderCloudDiagnosticsReport(host, deps) {
  const diagDeps = buildCloudDiagnosticsDeps(deps);
  const diag = getCloudSyncDiagnostics(diagDeps);
  const view = buildCloudDiagnosticsHumanView(diag);
  const report = formatCloudDiagnosticsReport(diag);
  const pre = host.querySelector('.cloud-sync-diagnostics-pre');
  if (pre) pre.textContent = report;
  updateDashboardPanel(host, view);
  return { diagDeps, diag, view, report };
}

function createDiagnosticsButton(label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cloud-sync-btn cloud-sync-btn--ghost';
  btn.style.width = '100%';
  btn.textContent = label;
  return btn;
}

function runDiagnosticsRetry(host, deps) {
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
      deps?.toast?.('Cola Nube reintentada.', 'info');
      refreshCloudSyncDiagnostics(host, deps);
    })
    .catch(function () {
      deps?.toast?.('Falló el reintento. Revisa el dashboard.', 'error');
      refreshCloudSyncDiagnostics(host, deps);
    });
}

function runDiagnosticsSync(host, deps) {
  const runtime = getSharedNubeRuntime();
  if (!runtime) {
    deps?.toast?.('Runtime Nube inactivo. Reconecta en Conexión.', 'warn');
    return;
  }
  void runtime.syncCycle().then(function () {
    deps?.toast?.('Ciclo Nube ejecutado.', 'info');
    refreshCloudSyncDiagnostics(host, deps);
  });
}

function runDiagnosticsRepairTeamSalas(host, deps) {
  void import('./cloud-census-sala-push.mjs').then(function (mod) {
    return mod.repairCensusSalasFromTeamAssignments({
      actorId: undefined,
    });
  }).then(function (result) {
    if (!result?.ok) {
      deps?.toast?.('Nube inactiva o sin token.', 'warn');
      refreshCloudSyncDiagnostics(host, deps);
      return;
    }
    const parts = [];
    if (result.stamped > 0) parts.push(`${result.stamped} sala(s) local actualizada(s)`);
    if (result.mirrored > 0) parts.push(`${result.mirrored} expediente(s) reempujado(s)`);
    deps?.toast?.(
      parts.length ? parts.join(' · ') : 'Nada pendiente — censo ya alineado con equipos.',
      parts.length ? 'success' : 'info'
    );
    refreshCloudSyncDiagnostics(host, deps);
  }).catch(function () {
    deps?.toast?.('Falló el reempuje de censo.', 'error');
    refreshCloudSyncDiagnostics(host, deps);
  });
}

function runDiagnosticsPruneLabs(host, deps) {
  const outbox = getSharedNubeOutbox();
  if (!outbox) {
    deps?.toast?.('Runtime Nube inactivo. Reconecta en Conexión.', 'warn');
    return;
  }
  const result = pruneLabSidecarsFromOutbox(outbox);
  const runtime = getSharedNubeRuntime();
  runtime?.refreshIdleStatus?.();
  if (result.removedOps > 0) {
    deps?.toast?.(
      'Se descartaron ' + result.removedOps + ' lab' + (result.removedOps !== 1 ? 's' : '') + ' de la cola.',
      'info'
    );
  } else {
    deps?.toast?.('No había labs pendientes en la cola.', 'info');
  }
  refreshCloudSyncDiagnostics(host, deps);
}

function wireDashboardActions(host, deps) {
  const panel = host.querySelector('[data-cloud-diag-dashboard]');
  if (!panel || panel.dataset.wired === '1') return;
  panel.dataset.wired = '1';
  panel.addEventListener('click', function (ev) {
    const target = ev.target;
    if (!target || typeof target.closest !== 'function') return;

    const fixBtn = target.closest('[data-cloud-diag-fix]');
    if (fixBtn && panel.contains(fixBtn)) {
      const fixId = fixBtn.getAttribute('data-cloud-diag-fix');
      if (fixId) showCloudNubeFixModal(fixId);
      return;
    }

    const pipe = target.closest('[data-cloud-diag-pipe-fix]');
    if (pipe && panel.contains(pipe)) {
      const fixId = pipe.getAttribute('data-cloud-diag-pipe-fix');
      if (fixId) showCloudNubeFixModal(fixId);
      return;
    }

    const btn = target.closest('[data-cloud-diag-action]');
    if (!btn || !panel.contains(btn)) return;
    const action = btn.getAttribute('data-cloud-diag-action');
    if (action === 'retry') runDiagnosticsRetry(host, deps);
    else if (action === 'sync') runDiagnosticsSync(host, deps);
    else if (action === 'repair-team-salas') runDiagnosticsRepairTeamSalas(host, deps);
    else if (action === 'prune-labs') runDiagnosticsPruneLabs(host, deps);
  });
}

/** Live pendientes while Diagnóstico Nube is open (outbox drains without status flips). */
function wireDiagnosticsLiveRefresh(host, deps) {
  if (!host || host.dataset.diagLiveWired === '1') return;
  host.dataset.diagLiveWired = '1';
  let debounceTimer = null;
  let pollTimer = null;

  function refreshIfMounted() {
    if (!host.isConnected || !host.querySelector('.cloud-sync-diagnostics')) return;
    refreshCloudSyncDiagnostics(host, deps);
  }

  function scheduleRefresh() {
    if (debounceTimer) return;
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      refreshIfMounted();
    }, 200);
  }

  document.addEventListener(CLOUD_OUTBOX_CHANGED_EVENT, scheduleRefresh);
  pollTimer = setInterval(refreshIfMounted, 1500);

  host._rpcDiagLiveCleanup = function () {
    document.removeEventListener(CLOUD_OUTBOX_CHANGED_EVENT, scheduleRefresh);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    delete host._rpcDiagLiveCleanup;
    delete host.dataset.diagLiveWired;
  };
}

/**
 * @param {HTMLElement | null} host
 */
export function stopCloudSyncDiagnosticsLiveRefresh(host) {
  if (host && typeof host._rpcDiagLiveCleanup === 'function') {
    host._rpcDiagLiveCleanup();
  }
}

/**
 * @param {HTMLElement | null} host
 * @param {{ toast?: (msg: string, kind?: string) => void }} [deps]
 */
export function mountCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  stopCloudSyncDiagnosticsLiveRefresh(host);
  host.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'cloud-sync-diagnostics';

  const dashboardPanel = document.createElement('div');
  dashboardPanel.className = 'cloud-sync-diag-dashboard-host';
  dashboardPanel.setAttribute('data-cloud-diag-dashboard', '1');
  wrap.appendChild(dashboardPanel);

  const technical = document.createElement('details');
  technical.className = 'cloud-sync-diag-technical';
  const technicalSummary = document.createElement('summary');
  technicalSummary.textContent = 'Informe técnico (soporte)';
  technical.appendChild(technicalSummary);
  const reportPre = document.createElement('pre');
  reportPre.className = 'cloud-sync-diagnostics-pre';
  technical.appendChild(reportPre);
  wrap.appendChild(technical);

  const copyBtn = createDiagnosticsButton('Copiar informe técnico');
  copyBtn.style.marginTop = '6px';
  copyBtn.onclick = function () {
    const built = renderCloudDiagnosticsReport(host, deps);
    void copyToClipboardSafe(built.report).then(function (ok) {
      deps?.toast?.(
        ok ? 'Informe técnico copiado (tokens redactados).' : 'No se pudo copiar el informe.',
        ok ? 'success' : 'error'
      );
    });
  };
  wrap.appendChild(copyBtn);

  host.appendChild(wrap);
  wireDashboardActions(host, deps);
  wireDiagnosticsLiveRefresh(host, deps);
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
  wireDiagnosticsLiveRefresh(host, deps);
  renderCloudDiagnosticsReport(host, deps);
}

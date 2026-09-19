/**
 * Dashboard HTML for Diagnóstico Nube — matches Conexión inset groups.
 */
import { esc } from '../../dom-escape.mjs';

/**
 * @param {string} displayStatusKey
 * @param {string} verdictLevel
 */
function statusChipClass(displayStatusKey, verdictLevel) {
  const key = String(displayStatusKey || '');
  if (key === 'error' || verdictLevel === 'error') return 'is-error';
  if (key === 'syncing' || verdictLevel === 'info') return 'is-syncing';
  if (key === 'pending' || key === 'offline' || verdictLevel === 'warn') return 'is-pending';
  return 'is-idle';
}

/**
 * @param {{ fixId?: string, severity?: string, title?: string, detail?: string, hint?: string }} item
 */
function renderClickableAlert(item) {
  const fixId = String(item.fixId || 'generic_sync_error');
  let html =
    '<button type="button" class="cloud-sync-inset-row cloud-sync-inset-row--nav cloud-nube-dash-alert" data-cloud-diag-fix="' +
    esc(fixId) +
    '" data-severity="' +
    esc(String(item.severity || 'warn')) +
    '">' +
    '<span class="cloud-nube-dash-alert-body">' +
    '<span class="cloud-nube-dash-alert-title">' +
    esc(String(item.title || 'Problema')) +
    '</span>' +
    '<span class="cloud-nube-dash-alert-detail">' +
    esc(String(item.detail || '')) +
    '</span>';
  if (item.hint) {
    html += '<span class="cloud-nube-dash-alert-hint">' + esc(String(item.hint)) + '</span>';
  }
  html +=
    '<span class="cloud-nube-dash-alert-cta">Cómo arreglar</span>' +
    '</span>' +
    '<span class="cloud-sync-options-row-chevron" aria-hidden="true">›</span></button>';
  return html;
}

function renderDashHead(v, verdict, chipClass) {
  let html =
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-head">' +
    '<div class="cloud-nube-dash-head-main">' +
    '<span class="cloud-sync-status-chip cloud-nube-dash-chip ' +
    esc(chipClass) +
    '">' +
    esc(verdict.headline) +
    '</span>';

  if (v.roomLabel) {
    html += '<span class="cloud-nube-dash-room">' + esc(v.roomLabel) + '</span>';
  }
  html += '</div>';
  if (verdict.subline) {
    html += '<p class="cloud-nube-dash-subline">' + esc(verdict.subline) + '</p>';
  }
  html += '</div>';
  return html;
}

function renderDashTiles(tiles) {
  if (!Array.isArray(tiles) || tiles.length === 0) return '';
  return tiles
    .map(function (tile) {
      const dd =
        esc(tile.value) + (tile.hint ? '<span class="cloud-nube-dash-kv-muted"> · ' + esc(tile.hint) + '</span>' : '');
      return (
        '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-kv" data-status="' +
        esc(tile.status) +
        '">' +
        '<dt>' +
        esc(tile.label) +
        '</dt><dd>' +
        dd +
        '</dd></div>'
      );
    })
    .join('');
}

function renderDashPipeline(pipeline) {
  if (!Array.isArray(pipeline) || pipeline.length === 0) return '';
  let html = '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-pipeline-wrap">';
  html += '<span class="cloud-nube-dash-pipeline-label">Conexión</span>';
  html += '<div class="cloud-nube-dash-pipeline">';
  pipeline.forEach(function (step) {
    const pipeFix =
      step.label === 'Sync' && (step.state === 'error' || step.state === 'warn')
        ? ' data-cloud-diag-pipe-fix="sync_not_active"'
        : '';
    html +=
      '<span class="cloud-nube-dash-pipe" data-state="' +
      esc(step.state) +
      '"' +
      pipeFix +
      '><span class="cloud-nube-dash-pipe-dot" aria-hidden="true"></span>' +
      '<span class="cloud-nube-dash-pipe-text">' +
      esc(step.label) +
      '<small>' +
      esc(step.detail) +
      '</small></span></span>';
  });
  html += '</div></div>';
  return html;
}

function renderDashOutboxBreakdown(outboxBreakdown) {
  if (!Array.isArray(outboxBreakdown) || outboxBreakdown.length === 0) return '';
  let html = '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-outbox-head">Cola por tipo</div>';
  outboxBreakdown.forEach(function (row) {
    html +=
      '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-outbox-row">' +
      '<dt>' +
      esc(row.label) +
      '</dt><dd><span class="cloud-nube-dash-outbox-track" aria-hidden="true">' +
      '<span class="cloud-nube-dash-outbox-bar" style="width:' +
      String(row.share) +
      '%"></span></span> ' +
      esc(String(row.count)) +
      '</dd></div>';
  });
  return html;
}

function renderDashToxicOutbox(toxicOutbox) {
  if (!Array.isArray(toxicOutbox) || toxicOutbox.length === 0) return '';
  let html =
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-toxic-head">Lotes pesados en cola</div>';
  toxicOutbox.forEach(function (row) {
    html +=
      '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-toxic-row" data-status="error">' +
      '<dt>' +
      esc(String(row.clientMutationId || 'push')) +
      '</dt><dd>' +
      esc(String(row.opCount || 0) + ' ops · ~' + String(row.totalLabel || '') + (row.maxOpPath ? ' · ' + row.maxOpPath : '')) +
      '</dd></div>';
  });
  return html;
}

function renderDashAlerts(issues, recentErrors) {
  const hasAlerts =
    (Array.isArray(issues) && issues.length > 0) || (Array.isArray(recentErrors) && recentErrors.length > 0);
  if (!hasAlerts) return '';

  let html = '<div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-alerts-card">';
  html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-alerts-head">Problemas detectados</div>';

  if (Array.isArray(issues) && issues.length > 0) {
    issues.forEach(function (issue) {
      html += renderClickableAlert(issue);
    });
  }

  if (Array.isArray(recentErrors) && recentErrors.length > 0) {
    recentErrors.forEach(function (entry) {
      html += renderClickableAlert({
        fixId: entry.fixId,
        severity: 'error',
        title: entry.op + ' · ' + entry.at,
        detail: entry.explain,
        hint: entry.code ? 'Código: ' + entry.code : '',
      });
    });
  }

  html += '</div>';
  return html;
}

function renderDashActions() {
  return (
    '<div class="cloud-nube-dash-actions">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="repair-team-salas">Reempujar censo a salas de equipo</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="retry">Reintentar cola</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="sync">Forzar sync</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-diag-action="prune-labs">Descartar labs en cola</button>' +
    '</div></div>'
  );
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics-human.mjs').buildCloudDiagnosticsHumanView>} view
 */
export function renderCloudNubeDashboardHtml(view) {
  const v = view && typeof view === 'object' ? view : {};
  const verdict = v.verdict || { level: 'ok', headline: '—', subline: '' };
  const chipClass = statusChipClass(v.displayStatusKey || v.statusKey, verdict.level);

  let html = '<div class="cloud-nube-dashboard">' + '<div class="cloud-sync-inset-group cloud-nube-dash-card">';
  html += renderDashHead(v, verdict, chipClass);
  html += renderDashTiles(v.tiles);
  html += renderDashPipeline(v.pipeline);
  html += renderDashOutboxBreakdown(v.outboxBreakdown);
  html += renderDashToxicOutbox(v.toxicOutbox);
  html += '</div>';

  html += renderDashAlerts(v.issues, v.recentErrors);
  html += renderDashActions();

  return html;
}

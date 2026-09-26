/**
 * Diagnóstico Nube (board «Nube B · algo falla»): a hero that says what is
 * wrong and what is safe, the Internet → Sesión → Sala → En vivo chain, what
 * waits to be sent, numbered steps, and repair tools in plain words.
 */
import { esc } from '../../dom-escape.mjs';
import { pipelineChainHtml } from './panel-conexion-html.mjs';

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

function renderDashToxicOutbox(toxicOutbox) {
  if (!Array.isArray(toxicOutbox) || toxicOutbox.length === 0) return '';
  let html =
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-toxic-head">Lotes pesados en cola</div>';
  html += '<dl class="cloud-nube-dash-kv-list">';
  toxicOutbox.forEach(function (row) {
    html +=
      '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-toxic-row" data-status="error">' +
      '<dt>' +
      esc(String(row.clientMutationId || 'push')) +
      '</dt><dd>' +
      esc(String(row.opCount || 0) + ' ops · ~' + String(row.totalLabel || '') + (row.maxOpPath ? ' · ' + row.maxOpPath : '')) +
      '</dd></div>';
  });
  return html + '</dl>';
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

const HERO_ICON = {
  ok: '<path d="m5 12 5 5 9-10"/>',
  info: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
  warn: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5h.01"/>',
};

/** @param {{ level: string, headline: string, subline: string }} verdict @param {Array} chain */
function renderDashHero(verdict, chain) {
  const level = HERO_ICON[verdict.level] ? verdict.level : 'ok';
  const ok = level === 'ok' || level === 'info';
  const action = ok
    ? '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-hero-sync" data-cloud-diag-action="sync">Sincronizar ahora</button>'
    : '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-hero-sync" data-cloud-diag-action="retry">Reintentar ahora</button>';
  return (
    '<div class="cloud-nube-dash-hero" data-level="' + esc(level) + '">' +
    '<div class="cloud-sync-hero">' +
    '<div class="cloud-sync-hero-icon" data-state="' + esc(level) + '">' +
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    HERO_ICON[level] +
    '</svg></div>' +
    '<div class="cloud-sync-hero-text"><p class="cloud-sync-hero-title">' + esc(verdict.headline) + '</p>' +
    (verdict.subline ? '<p class="cloud-sync-hero-sub">' + esc(verdict.subline) + '</p>' : '') +
    '</div>' + action + '</div>' +
    pipelineChainHtml(chain) +
    '</div>'
  );
}

/** @param {string} kind */
function capitalize(kind) {
  const s = String(kind || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** «En espera de envío»: count by kind and how long the oldest waits. @param {object} v */
function renderDashWaiting(v) {
  const count = Number(v.outboxCount) || 0;
  let html =
    '<div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-waiting">' +
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-card-head">' +
    '<span class="cloud-nube-dash-label">En espera de envío</span>' +
    '<span class="cloud-nube-dash-count">' + (count ? count + (count === 1 ? ' cambio' : ' cambios') : 'Nada') + '</span></div>';
  // dt/dd rows need a dl parent (axe dlitem); .cloud-nube-dash-kv-list keeps the row layout.
  const rows = (v.outboxBreakdown || []).map(function (row) {
    return '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv cloud-nube-dash-outbox-row"><dt>' +
      esc(capitalize(row.label)) + '</dt><dd>' + esc(String(row.count)) + '</dd></div>';
  });
  if (rows.length) html += '<dl class="cloud-nube-dash-kv-list">' + rows.join('') + '</dl>';
  html += renderDashToxicOutbox(v.toxicOutbox);
  const foot = count
    ? v.oldestWait ? 'El más antiguo espera desde ' + v.oldestWait + '.' : ''
    : 'Todo lo que cambiaste ya está en Nube.';
  if (foot) html += '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-foot">' + esc(foot) + '</div>';
  return html + '</div>';
}

/** Numbered «Qué puedes hacer», only when something is off. @param {{ level: string }} verdict */
function renderDashSteps(verdict) {
  if (verdict.level === 'ok' || verdict.level === 'info') return '';
  const step = (n, title, body, extra = '') =>
    '<div class="cloud-nube-dash-step"><span class="cloud-nube-dash-step-num" aria-hidden="true">' + n + '</span>' +
    '<span class="cloud-nube-dash-step-text"><b>' + esc(title) + '</b><span>' + esc(body) + '</span></span>' + extra + '</div>';
  return (
    '<div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-steps">' +
    '<div class="cloud-nube-dash-label">Qué puedes hacer</div>' +
    step(1, 'Espera un momento', 'Casi siempre vuelve solo en menos de un minuto.') +
    step(2, 'Pulsa Reintentar ahora', 'Envía lo que está en espera y vuelve a descargar.') +
    step(3, '¿Sigue así en 5 min?', 'Copia el informe y mándalo a soporte.',
      '<button type="button" class="cloud-sync-btn" data-cloud-diag-action="copy-report">Copiar informe</button>') +
    '</div>'
  );
}

/** @param {string} action @param {string} title @param {string} body @param {string} label @param {boolean} [danger] */
function toolRow(action, title, body, label, danger = false) {
  return (
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-tool">' +
    '<span class="cloud-sync-options-entry-text"><span class="cloud-nube-dash-tool-title">' + esc(title) + '</span>' +
    '<span class="cloud-sync-status-display">' + esc(body) + '</span></span>' +
    '<button type="button" class="cloud-sync-btn' + (danger ? ' cloud-sync-btn--danger' : '') +
    '" data-cloud-diag-action="' + esc(action) + '">' + esc(label) + '</button></div>'
  );
}

/** «Herramientas de reparación» + the one-line technical summary. @param {object} v */
function renderDashTools(v) {
  const labs = Number(v.labsQueued) || 0;
  return (
    '<div class="cloud-sync-inset-group cloud-nube-dash-card cloud-nube-dash-tools">' +
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-card-head">' +
    '<span class="cloud-nube-dash-label">Herramientas de reparación</span></div>' +
    toolRow('sync', 'Forzar sync', 'Descarga y envía todo otra vez.', 'Forzar') +
    toolRow('repair-team-salas', 'Reenviar censo a salas de equipo', 'Úsalo si un compañero no ve a un paciente.', 'Reenviar') +
    (labs
      ? toolRow('prune-labs', 'Descartar labs en espera',
        'Borra ' + labs + (labs === 1 ? ' lab' : ' labs') + ' sin enviar. No se puede deshacer.', 'Descartar…', true)
      : '') +
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-nube-dash-tech">' + esc(v.techLine || '') + '</div>' +
    '</div>'
  );
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics-human.mjs').buildCloudDiagnosticsHumanView>} view
 */
export function renderCloudNubeDashboardHtml(view) {
  const v = view && typeof view === 'object' ? view : {};
  const verdict = v.verdict || { level: 'ok', headline: '—', subline: '' };
  return (
    '<div class="cloud-nube-dashboard" data-level="' + esc(verdict.level) + '">' +
    renderDashHero(verdict, v.chain || []) +
    renderDashWaiting(v) +
    renderDashSteps(verdict) +
    renderDashAlerts(v.issues, v.recentErrors) +
    renderDashTools(v) +
    '</div>'
  );
}

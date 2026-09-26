/** Human-readable Nube sync diagnostics — verdict, facts, and issue explanations. */

export {
  parseWsClose,
  explainWsCloseCode,
  explainCloudErrorCode,
  humanizeCloudSyncError,
  cloudDiagTransportLabel,
  formatCloudDiagWhen,
} from './cloud-sync-diagnostics-human-format.mjs';

import { parseWsClose, formatCloudDiagWhen } from './cloud-sync-diagnostics-human-format.mjs';
import {
  buildRecentErrorRows,
  buildToxicOutboxRows,
  buildIssues,
  buildToxicOutboxSummary,
} from './cloud-sync-diagnostics-human-issues.mjs';
import {
  formatRoomLabel,
  buildFacts,
  buildVerdict,
  buildTiles,
  buildPipeline,
  buildDisplayStatusKey,
  buildOutboxBreakdown,
  buildLiveTileFields,
} from './cloud-sync-diagnostics-human-sections.mjs';

/**
 * Board «Nube B» chain: Internet, Sesión, Sala from the pipeline, then the
 * live channel (the pipeline's 4th step is «Sync», which the hero already says).
 * @param {Array<{ label: string, state: string, detail: string }>} pipeline
 * @param {{ liveStatus: string, liveValue: string }} live
 * @param {string} [sala] «Sala 1» — the month is not needed here
 */
function buildChain(pipeline, live, sala) {
  const liveDetail = live.liveStatus === 'ok' ? 'Conectado' : live.liveValue;
  const [internet, sesion, salaStep] = pipeline;
  const salaDetail = salaStep.state === 'ok' && sala ? { ...salaStep, detail: sala } : salaStep;
  return [internet, sesion, salaDetail, { label: 'En vivo', state: live.liveStatus, detail: liveDetail }];
}

/** «hace 4 min» for the oldest queued push, '' when nothing waits. @param {object} d @param {number} now */
function oldestWaitLabel(d, now) {
  const times = (d.outbox?.entries || []).map((e) => Number(e.enqueuedAt) || 0).filter(Boolean);
  if (!times.length) return '';
  return formatCloudDiagWhen(new Date(Math.min(...times)).toISOString(), now);
}

/** «Rev. 13516 local · descarga ahora · envío hace 1 min · 50 pacientes locales» @param {object} d @param {number} now */
function techLine(d, now) {
  const rev = Number.isFinite(Number(d.revision)) ? Number(d.revision) : 0;
  const patients = Number(d.localPatientCount) || 0;
  return [
    'Rev. ' + rev + ' local',
    'descarga ' + formatCloudDiagWhen(d.lastPullAt, now),
    'envío ' + formatCloudDiagWhen(d.lastPushAt, now),
    patients + ' pacientes locales',
  ].join(' · ');
}

/**
 * @param {ReturnType<typeof import('./cloud-sync-diagnostics.mjs').getCloudSyncDiagnostics>} diag
 * @param {number} [nowMs]
 */
export function buildCloudDiagnosticsHumanView(diag, nowMs) {
  const d = diag && typeof diag === 'object' ? diag : {};
  const now = Number(nowMs) || Date.now();
  const status = String(d.status || 'unknown');
  const transport = String(d.transport || 'poll');
  const outboxCount = Number(d.outbox?.count || 0);
  const wsClose = parseWsClose(d.lastWsClose);
  const roomLabel = formatRoomLabel(d.roomSnapshot, String(d.roomId || ''));

  const recentErrors = buildRecentErrorRows(d, now);
  const toxicRows = buildToxicOutboxRows(d);
  const issues = buildIssues(d, now, status, transport, wsClose, recentErrors, outboxCount, toxicRows);
  const verdict = buildVerdict(status, transport, issues, recentErrors);

  const facts = buildFacts(d, now, status, transport, outboxCount, roomLabel);
  const tiles = buildTiles(d, now, transport, wsClose, outboxCount, status, recentErrors);
  const pipeline = buildPipeline(d, status, roomLabel, recentErrors);
  const displayStatusKey = buildDisplayStatusKey(status, issues, recentErrors);
  const outboxBreakdown = buildOutboxBreakdown(d, outboxCount);
  const toxicOutbox = buildToxicOutboxSummary(toxicRows);
  const chain = buildChain(pipeline, buildLiveTileFields(d, transport, wsClose), String(d.roomSnapshot?.sala || '').trim());

  return {
    verdict,
    statusKey: status,
    displayStatusKey,
    roomLabel,
    facts,
    tiles,
    pipeline,
    outboxBreakdown,
    toxicOutbox,
    issues,
    recentErrors,
    chain,
    outboxCount,
    oldestWait: oldestWaitLabel(d, now),
    labsQueued: Number(d.outbox?.byKind?.labs) || 0,
    techLine: techLine(d, now),
  };
}

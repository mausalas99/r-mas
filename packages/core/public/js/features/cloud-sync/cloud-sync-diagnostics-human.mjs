/** Human-readable Nube sync diagnostics — verdict, facts, and issue explanations. */

export {
  parseWsClose,
  explainWsCloseCode,
  explainCloudErrorCode,
  humanizeCloudSyncError,
  cloudDiagTransportLabel,
  formatCloudDiagWhen,
} from './cloud-sync-diagnostics-human-format.mjs';

import { parseWsClose } from './cloud-sync-diagnostics-human-format.mjs';
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
} from './cloud-sync-diagnostics-human-sections.mjs';

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
  };
}

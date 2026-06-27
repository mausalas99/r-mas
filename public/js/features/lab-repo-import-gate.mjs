import { buildBulkLabPreview } from '../lab-bulk-paste.mjs';

export function buildLabRepoBulkText(studies) {
  return (studies || [])
    .map(function (s) {
      return String(s.text || '').trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * @param {{
 *   blocks: import('../lab-bulk-paste.mjs').BulkBlockPreview[],
 *   fetchErrors: { folio: string, message: string }[],
 *   requestedRegistro: string,
 *   activePatientRegistro: string,
 *   activePatientId: string | null,
 * }} ctx
 */
export function shouldSilentImportLabRepo(ctx) {
  if (ctx.fetchErrors && ctx.fetchErrors.length) {
    return { silent: false, reason: 'fetch-errors' };
  }
  if (!ctx.blocks.length) {
    return { silent: false, reason: 'no-blocks' };
  }
  var bad = ctx.blocks.filter(function (b) {
    return b.status !== 'ok' || !b.canProcess || !b.okReportCount;
  });
  if (bad.length) {
    return { silent: false, reason: 'block-issues' };
  }
  if (
    ctx.activePatientId &&
    ctx.activePatientRegistro &&
    ctx.requestedRegistro &&
    ctx.activePatientRegistro.trim() !== ctx.requestedRegistro.trim()
  ) {
    return { silent: false, reason: 'registro-mismatch' };
  }
  return { silent: true, reason: 'ok' };
}

export function buildLabRepoPreviewBlocks(studies, findPatientByRegistro) {
  var text = buildLabRepoBulkText(studies);
  return buildBulkLabPreview(text, { findPatientByRegistro: findPatientByRegistro });
}

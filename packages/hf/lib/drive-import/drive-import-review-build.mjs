import { isDuplicateDriveLabSet } from './merge-drive-labs.mjs';
import { summarizeLabPanels } from './format-drive-import-preview-sections.mjs';
/**
 * @param {import('./parse-drive-document.mjs').parseDriveDocument extends (...args: any) => infer R ? R : never} parsed
 * @param {boolean} createNew
 * @returns {import('./drive-import-review.mjs').DriveImportReviewStep[]}
 */
export function buildHcReviewSteps(parsed, createNew) {
  /** @type {import('./drive-import-review.mjs').DriveImportReviewStep[]} */
  const steps = [];

  if (createNew && parsed.header && (parsed.header.nombre || parsed.header.registro)) {
    steps.push({
      kind: 'header',
      label: 'Datos del paciente (nuevo)',
      include: true,
      header: Object.assign({}, parsed.header),
    });
  }

  return steps;
}

/**
 * @param {import('./parse-drive-document.mjs').parseDriveDocument extends (...args: any) => infer R ? R : never} parsed
 * @param {Array<{ fecha?: string, hora?: string, resLabs?: string[] }>} existingLabs
 * @returns {import('./drive-import-review.mjs').DriveImportReviewStep | null}
 */
export function buildLabsReviewStep(parsed, existingLabs) {
  const allLabSets =
    (parsed.laboratorios.allSets && parsed.laboratorios.allSets.length
      ? parsed.laboratorios.allSets
      : parsed.laboratorios.sets) || [];
  if (!allLabSets.length) return null;

  let dupCount = 0;
  const sets = allLabSets.map(function (set) {
    const isDuplicate = (existingLabs || []).some(function (ex) {
      return isDuplicateDriveLabSet(ex, set);
    });
    if (isDuplicate) dupCount += 1;
    const panels = summarizeLabPanels(set.resLabs);
    return {
      fecha: set.fecha || '',
      hora: set.hora || '',
      resLabs: set.resLabs || [],
      sourceText: set.sourceText,
      bhExtras: set.bhExtras,
      include: !isDuplicate,
      isDuplicate: isDuplicate,
      summary: (set.fecha || '?') + ' — ' + panels,
    };
  });
  const newCount = sets.length - dupCount;
  let label = 'Laboratorios (' + sets.length + ' fecha' + (sets.length === 1 ? '' : 's') + ')';
  if (dupCount && newCount) {
    label += ' · ' + newCount + ' nueva' + (newCount === 1 ? '' : 's') + ', ' + dupCount + ' en historial';
  } else if (dupCount && !newCount) {
    label += ' · todas en historial';
  }
  return { kind: 'labs', label: label, sets: sets };
}

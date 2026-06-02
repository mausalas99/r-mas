import { filterNewEventualidades } from './merge-eventualidades.mjs';
import { isDuplicateDriveLabSet } from './merge-drive-labs.mjs';
import { listHcPatchSectionKeys } from './map-universal-hc.mjs';
import {
  HC_SECTION_LABELS,
  hcPatchValueToEditText,
  editTextToHcPatchValue,
} from './drive-import-hc-edit.mjs';

/**
 * @typedef {'hc' | 'eventos' | 'labs' | 'header'} DriveImportReviewStepKind
 */

/**
 * @typedef {object} DriveImportHcReviewStep
 * @property {'hc'} kind
 * @property {string} key
 * @property {string} label
 * @property {boolean} include
 * @property {string} editText
 * @property {unknown} originalValue
 */

/**
 * @typedef {object} DriveImportEventosReviewStep
 * @property {'eventos'} kind
 * @property {string} label
 * @property {Array<{ at: string, text: string, include: boolean }>} entries
 */

/**
 * @typedef {object} DriveImportLabsReviewStep
 * @property {'labs'} kind
 * @property {string} label
 * @property {Array<{ fecha: string, hora: string, resLabs: string[], sourceText?: string, bhExtras?: object, include: boolean, summary: string, isDuplicate?: boolean }>} sets
 */

/**
 * @typedef {object} DriveImportHeaderReviewStep
 * @property {'header'} kind
 * @property {string} label
 * @property {boolean} include
 * @property {{ nombre?: string, registro?: string, edad?: string, cama?: string, sexo?: string }} header
 */

/**
 * @typedef {DriveImportHcReviewStep | DriveImportEventosReviewStep | DriveImportLabsReviewStep | DriveImportHeaderReviewStep} DriveImportReviewStep
 */

/**
 * @param {string[]} resLabs
 * @returns {string}
 */
function summarizeLabPanels(resLabs) {
  const panels = [];
  (resLabs || []).forEach(function (chunk) {
    const first = String(chunk || '').split('\n')[0].trim();
    const tok = first.split(/\s+/)[0].replace(':', '');
    if (tok && panels.indexOf(tok) === -1) panels.push(tok);
  });
  return panels.length ? panels.join(', ') : 'sin paneles';
}

/**
 * @param {import('./parse-drive-document.mjs').parseDriveDocument extends (...args: any) => infer R ? R : never} parsed
 * @param {{
 *   applyMode?: 'fill' | 'replace' | 'eventos',
 *   existingEventualidades?: Array<{ at?: string, text?: string }>,
 *   existingLabHistory?: Array<{ fecha?: string, hora?: string, resLabs?: string[] }>,
 *   createNew?: boolean,
 * }} opts
 * @returns {DriveImportReviewStep[]}
 */
export function buildDriveImportReviewSteps(parsed, opts) {
  opts = opts || {};
  const mode = opts.applyMode || 'fill';
  /** @type {DriveImportReviewStep[]} */
  const steps = [];

  if (opts.createNew && parsed.header && (parsed.header.nombre || parsed.header.registro)) {
    steps.push({
      kind: 'header',
      label: 'Datos del paciente (nuevo)',
      include: true,
      header: Object.assign({}, parsed.header),
    });
  }

  if (mode !== 'eventos') {
    listHcPatchSectionKeys(parsed.hcPatch || {}).forEach(function (key) {
      const value = parsed.hcPatch[key];
      steps.push({
        kind: 'hc',
        key: key,
        label: HC_SECTION_LABELS[key] || key,
        include: true,
        editText: hcPatchValueToEditText(key, value),
        originalValue: value,
      });
    });
  }

  const allEv = parsed.eventualidades.entries || [];
  const evFiltered = filterNewEventualidades(opts.existingEventualidades || [], allEv);
  const evNew = evFiltered.toAdd || [];
  if (evNew.length) {
    steps.push({
      kind: 'eventos',
      label: 'Eventualidades (' + evNew.length + ' nueva' + (evNew.length === 1 ? '' : 's') + ')',
      entries: evNew.map(function (entry) {
        return { at: entry.at, text: entry.text, include: true };
      }),
    });
  }

  const allLabSets =
    (parsed.laboratorios.allSets && parsed.laboratorios.allSets.length
      ? parsed.laboratorios.allSets
      : parsed.laboratorios.sets) || [];
  const existingLabs = opts.existingLabHistory || [];
  if (allLabSets.length) {
    let dupCount = 0;
    const sets = allLabSets.map(function (set) {
      const isDuplicate = existingLabs.some(function (ex) {
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
    steps.push({
      kind: 'labs',
      label: label,
      sets: sets,
    });
  }

  return steps;
}

/**
 * @param {DriveImportReviewStep} step
 * @param {{ include?: boolean, editText?: string, entries?: Array<{ include?: boolean, text?: string }>, sets?: Array<{ include?: boolean }> }} patch
 */
export function patchReviewStep(step, patch) {
  if (step.kind === 'hc') {
    if (patch.include != null) step.include = !!patch.include;
    if (patch.editText != null) step.editText = patch.editText;
    return;
  }
  if (step.kind === 'header' && patch.include != null) {
    step.include = !!patch.include;
    return;
  }
  if (step.kind === 'eventos' && patch.entries) {
    patch.entries.forEach(function (row, idx) {
      if (!step.entries[idx]) return;
      if (row.include != null) step.entries[idx].include = !!row.include;
      if (row.text != null) step.entries[idx].text = row.text;
    });
    return;
  }
  if (step.kind === 'labs' && patch.sets) {
    patch.sets.forEach(function (row, idx) {
      if (!step.sets[idx]) return;
      if (row.include != null) step.sets[idx].include = !!row.include;
    });
  }
}

/**
 * @param {import('./parse-drive-document.mjs').parseDriveDocument extends (...args: any) => infer R ? R : never} parsed
 * @param {DriveImportReviewStep[]} steps
 * @param {{ createNew?: boolean }} [opts]
 * @returns {typeof parsed}
 */
export function applyReviewStepsToParsed(parsed, steps, opts) {
  opts = opts || {};
  const out = Object.assign({}, parsed, {
    hcPatch: Object.assign({}, parsed.hcPatch || {}),
    eventualidades: {
      entries: (parsed.eventualidades.entries || []).slice(),
      skippedEstimate: parsed.eventualidades.skippedEstimate,
    },
    laboratorios: Object.assign({}, parsed.laboratorios, {
      sets: (parsed.laboratorios.sets || []).slice(),
    }),
    header: Object.assign({}, parsed.header || {}),
  });

  steps.forEach(function (step) {
    if (step.kind === 'header') {
      if (opts.createNew && step.include) out.header = Object.assign({}, step.header);
      return;
    }
    if (step.kind === 'hc') {
      if (!step.include) {
        delete out.hcPatch[step.key];
        return;
      }
      out.hcPatch[step.key] = editTextToHcPatchValue(step.key, step.editText, step.originalValue);
      return;
    }
    if (step.kind === 'eventos') {
      out.eventualidades.entries = step.entries
        .filter(function (e) {
          return e.include && String(e.text || '').trim();
        })
        .map(function (e) {
          return { at: e.at, text: String(e.text).trim() };
        });
      return;
    }
    if (step.kind === 'labs') {
      out.laboratorios.sets = step.sets
        .filter(function (s) {
          return s.include && s.resLabs && s.resLabs.length;
        })
        .map(function (s) {
          return {
            fecha: s.fecha,
            hora: s.hora,
            resLabs: s.resLabs,
            sourceText: s.sourceText,
            bhExtras: s.bhExtras,
          };
        });
    }
  });

  return out;
}

/**
 * @param {DriveImportReviewStep} step
 * @returns {string}
 */
export function reviewStepHint(step) {
  if (step.kind === 'hc') {
    return 'Edita el texto si hace falta. Desmarca «Incluir» para omitir esta sección en la importación.';
  }
  if (step.kind === 'header') {
    return 'Estos datos se usarán al crear el paciente nuevo.';
  }
  if (step.kind === 'eventos') {
    return 'Marca o desmarca cada nota. Puedes corregir el texto antes de importar.';
  }
  if (step.kind === 'labs') {
    return 'Marca las fechas que quieras agregar. Las que ya están en el historial vienen desmarcadas.';
  }
  return '';
}

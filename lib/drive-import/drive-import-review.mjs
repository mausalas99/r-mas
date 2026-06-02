import { filterNewEventualidades } from './merge-eventualidades.mjs';
import { isDuplicateDriveLabSet } from './merge-drive-labs.mjs';
import { mapUniversalHc } from './map-universal-hc.mjs';
import { listDriveHcReviewSections } from './drive-hc-sections.mjs';
import {
  HC_SECTION_LABELS,
  hcPatchValueToEditText,
  editTextToHcPatchValue,
} from './drive-import-hc-edit.mjs';
import {
  buildHcStructuredSuggestions,
  applyStructuredSuggestionsToHcPatch,
} from './hc-structured-extract.mjs';
import { filterFichaDriveText } from './filter-ficha-patient-fields.mjs';

/**
 * @typedef {'hc' | 'eventos' | 'labs' | 'header'} DriveImportReviewStepKind
 */

/**
 * @typedef {object} DriveImportHcReviewStep
 * @property {'hc'} kind
 * @property {string} [key]
 * @property {string} [driveSectionKey]
 * @property {string} label
 * @property {boolean} include
 * @property {string} editText
 * @property {unknown} [originalValue]
 * @property {import('./hc-structured-extract.mjs').HcStructuredSuggestion[]} [structuredSuggestions]
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
 * @param {string} sectionKey
 * @param {string} text
 * @returns {import('./hc-structured-extract.mjs').HcStructuredSuggestion[]}
 */
function suggestionsForSection(sectionKey, text) {
  return buildHcStructuredSuggestions(sectionKey, String(text || '').trim());
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
    const driveRows = listDriveHcReviewSections(parsed.driveSections || {});
    if (driveRows.length) {
      driveRows.forEach(function (row) {
        const editText =
          row.sectionKey === 'ficha' ? filterFichaDriveText(row.text) : row.text;
        steps.push({
          kind: 'hc',
          driveSectionKey: row.sectionKey,
          label: row.label,
          include: true,
          editText: editText,
          structuredSuggestions: suggestionsForSection(row.sectionKey, row.text),
        });
      });
    } else {
      Object.keys(parsed.hcPatch || {})
        .filter(function (key) {
          return !String(key).startsWith('_');
        })
        .forEach(function (key) {
          const value = parsed.hcPatch[key];
          if (value == null) return;
          steps.push({
            kind: 'hc',
            key: key,
            label: HC_SECTION_LABELS[key] || key,
            include: true,
            editText: hcPatchValueToEditText(key, value),
            originalValue: value,
            structuredSuggestions: suggestionsForSection(key, hcPatchValueToEditText(key, value)),
          });
        });
    }
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
 * @param {{ include?: boolean, editText?: string, entries?: Array<{ include?: boolean, text?: string }>, sets?: Array<{ include?: boolean }>, structuredSuggestions?: Array<{ include?: boolean }> }} patch
 */
export function patchReviewStep(step, patch) {
  if (step.kind === 'hc') {
    if (patch.include != null) step.include = !!patch.include;
    if (patch.editText != null) step.editText = patch.editText;
    if (patch.structuredSuggestions && step.structuredSuggestions) {
      patch.structuredSuggestions.forEach(function (row, idx) {
        if (!step.structuredSuggestions[idx]) return;
        if (row.include != null) step.structuredSuggestions[idx].include = !!row.include;
      });
    }
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
    driveSections: Object.assign({}, parsed.driveSections || {}),
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
      if (step.driveSectionKey) {
        if (step.include) {
          const raw = String(step.editText || '').trim();
          out.driveSections[step.driveSectionKey] =
            step.driveSectionKey === 'ficha' ? filterFichaDriveText(raw) : raw;
        } else {
          delete out.driveSections[step.driveSectionKey];
        }
        return;
      }
      if (!step.include) {
        if (step.key) delete out.hcPatch[step.key];
        return;
      }
      if (step.key) {
        out.hcPatch[step.key] = editTextToHcPatchValue(step.key, step.editText, step.originalValue);
      }
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

  const usedDriveSections = steps.some(function (step) {
    return step.kind === 'hc' && step.driveSectionKey;
  });
  if (usedDriveSections) {
    out.hcPatch = mapUniversalHc({ sections: out.driveSections }) || {};
    const sexo = out.hcPatch._sexo;
    if (sexo) delete out.hcPatch._sexo;
    if (sexo && out.header) out.header.sexo = out.header.sexo || sexo;
  }

  /** @type {import('./hc-structured-extract.mjs').HcStructuredSuggestion[]} */
  const acceptedSuggestions = [];
  steps.forEach(function (step) {
    if (step.kind !== 'hc' || !step.include || !step.structuredSuggestions) return;
    step.structuredSuggestions.forEach(function (s) {
      if (s.include) acceptedSuggestions.push(s);
    });
  });
  if (acceptedSuggestions.length) {
    out.hcPatch = applyStructuredSuggestionsToHcPatch(out.hcPatch || {}, acceptedSuggestions);
  }

  return out;
}

/**
 * @param {DriveImportReviewStep} step
 * @returns {string}
 */
export function reviewStepHint(step) {
  if (step.kind === 'hc') {
    if (step.driveSectionKey === 'ficha' || step.key === 'identificacion') {
      return 'Registro, diagnósticos y otros datos del expediente se omiten; ya están en Datos del paciente. Edita el resto si hace falta.';
    }
    if (step.structuredSuggestions && step.structuredSuggestions.length) {
      return 'Marca los campos estructurados que quieras completar (casillas, medicamentos, alergias, etc.). El texto libre se importa abajo.';
    }
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

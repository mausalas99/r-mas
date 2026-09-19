import { splitDocumentSections } from './segment.mjs';
import { parsePipeHeader, parseFichaIdentificacion, mergeHeader } from './parse-header.mjs';
import { mapUniversalHc } from './map-universal-hc.mjs';
import { inferDocumentYearFromText } from './eventualidad-dates.mjs';
import {
  parseDriveLaboratorios,
  extractLaboratoriosBody,
} from './parse-drive-labs.mjs';
import { filterNewDriveLabSets } from './merge-drive-labs.mjs';
import { formatDriveImportPreview } from './format-drive-import-preview.mjs';

/**
 * @param {string} rawText
 * @param {{
 *   existingLabHistory?: Array<{ fecha?: string, hora?: string, resLabs?: string[] }>,
 *   applyMode?: 'fill' | 'replace',
 * }} [opts]
 */
function collectDriveDocumentWarnings(split, labParsed, labBody) {
  const warnings = split.warnings.slice();
  warnings.push(...labParsed.warnings);
  if (labBody && !labParsed.sets.length) {
    warnings.push('Sección LABORATORIOS sin bloques de fecha reconocibles.');
  }
  return warnings;
}

export function parseDriveDocument(rawText, opts) {
  opts = opts || {};
  const split = splitDocumentSections(rawText);
  const pipe = parsePipeHeader(split.headerLines);
  const ficha = parseFichaIdentificacion(split.sections.ficha || '');
  const header = mergeHeader(pipe, ficha);
  const doc = { sections: split.sections, headerLines: split.headerLines };

  let hcPatch = mapUniversalHc(doc) || {};
  const sexo = hcPatch._sexo;
  if (sexo) delete hcPatch._sexo;
  if (sexo && !header.sexo) header.sexo = sexo;

  const documentYear = inferDocumentYearFromText(rawText);

  const labBody = extractLaboratoriosBody(rawText, split.sections.laboratorios || '');
  const labParsed = parseDriveLaboratorios(labBody, { documentYear });
  const labFiltered = filterNewDriveLabSets(opts.existingLabHistory || [], labParsed.sets);

  const warnings = collectDriveDocumentWarnings(split, labParsed, labBody);

  const result = {
    header,
    driveSections: Object.assign({}, split.sections),
    hcPatch,
    laboratorios: {
      sets: labFiltered.sets,
      allSets: labParsed.sets,
      skippedEstimate: labFiltered.skipped,
    },
    warnings,
  };

  result.previewText = formatDriveImportPreview(result, {
    applyMode: opts.applyMode,
  });
  return result;
}

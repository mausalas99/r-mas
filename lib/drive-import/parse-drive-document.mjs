import { splitDocumentSections } from './segment.mjs';
import { parsePipeHeader, parseFichaIdentificacion, mergeHeader } from './parse-header.mjs';
import { detectProfile, getProfile, listProfiles } from './registry.mjs';
import { mapSectionsToEventualidades } from './map-to-eventualidades.mjs';
import { inferDocumentYearFromText } from './eventualidad-dates.mjs';
import { filterNewEventualidades } from './merge-eventualidades.mjs';

export { listProfiles };

/**
 * @param {ReturnType<typeof parseDriveDocument>} parsed
 * @returns {string}
 */
export function formatDriveImportPreview(parsed) {
  const lines = [];
  lines.push('Perfil: ' + parsed.profileLabel + ' (' + parsed.profileId + ')');
  if (parsed.header?.nombre) {
    lines.push(
      'Paciente: ' +
        parsed.header.nombre +
        (parsed.header.registro ? ' · Reg ' + parsed.header.registro : '') +
        (parsed.header.cama ? ' · Cama ' + parsed.header.cama : ''),
    );
  }
  const hcKeys = Object.keys(parsed.hcPatch || {}).filter((k) => !String(k).startsWith('_'));
  lines.push('HC: ' + (hcKeys.length ? hcKeys.join(', ') : 'sin cambios detectados'));
  lines.push(
    'Eventualidades: ' +
      parsed.eventualidades.entries.length +
      ' detectadas' +
      (parsed.eventualidades.skippedEstimate
        ? ' · ~' + parsed.eventualidades.skippedEstimate + ' posibles duplicados'
        : ''),
  );
  if (parsed.warnings.length) {
    lines.push('');
    lines.push('Advertencias:');
    parsed.warnings.forEach((w) => lines.push('• ' + w));
  }
  return lines.join('\n');
}

/**
 * @param {string} rawText
 * @param {string} [profileIdOverride]
 * @param {{ existingEventualidades?: Array<{ at?: string, text?: string }> }} [opts]
 */
export function parseDriveDocument(rawText, profileIdOverride, opts) {
  opts = opts || {};
  const split = splitDocumentSections(rawText);
  const pipe = parsePipeHeader(split.headerLines);
  const ficha = parseFichaIdentificacion(split.sections.ficha || '');
  const header = mergeHeader(pipe, ficha);
  const detected = detectProfile(split.sections, pipe);
  const profileId = profileIdOverride || detected.profileId;
  const profile = getProfile(profileId);
  const doc = { sections: split.sections, headerLines: split.headerLines };
  let hcPatch = profile.mapHc(doc) || {};
  const sexo = hcPatch._sexo;
  if (sexo) delete hcPatch._sexo;
  if (sexo && !header.sexo) header.sexo = sexo;

  const documentYear = inferDocumentYearFromText(rawText);
  let evBlocks = split.eventualidadesBlocks;
  if (profileId === 'drive-eventos-only-v1' && !evBlocks.length) {
    evBlocks = [String(rawText || '').trim()];
  }
  const { entries, warnings: evWarn } = mapSectionsToEventualidades({
    eventualidadesBlocks: evBlocks,
    referenceYear: documentYear,
    documentYear,
  });

  const { skipped } = filterNewEventualidades(opts.existingEventualidades || [], entries);

  /** @type {string[]} */
  const warnings = split.warnings.slice();
  if (profileId === 'drive-fragment-v1') {
    warnings.push('No se reconoció un formato con confianza; revisa el perfil manualmente.');
  }
  if (!split.eventualidadesBlocks.length) {
    warnings.push('No se encontró sección EVENTUALIDADES.');
  }
  warnings.push(...evWarn);

  const result = {
    profileId,
    profileLabel: profile.label,
    detected,
    header,
    hcPatch,
    eventualidades: {
      entries,
      skippedEstimate: skipped,
    },
    warnings,
  };

  result.previewText = formatDriveImportPreview(result);
  return result;
}

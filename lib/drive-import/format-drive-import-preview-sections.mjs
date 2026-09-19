import { summarizeHcValue } from './summarize-hc-value.mjs';
import { listHcPatchSectionKeys } from './map-universal-hc.mjs';
import { HC_SECTION_LABELS } from './drive-import-hc-edit.mjs';

/**
 * @param {string[]} resLabs
 * @returns {string}
 */
export function summarizeLabPanels(resLabs) {
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
 * @param {'fill' | 'replace'} mode
 * @param {string[]} lines
 */
export function appendHcPreviewSection(parsed, mode, lines) {
  const hcKeys = listHcPatchSectionKeys(parsed.hcPatch || {});
  lines.push('Historia clínica');
  if (!hcKeys.length) {
    lines.push('  Sin secciones detectadas en el pegado');
  } else {
    const modeLabel =
      mode === 'replace'
        ? 'Reemplazará secciones presentes en el documento'
        : 'Completará solo campos vacíos en HC';
    lines.push('  ' + modeLabel);
    hcKeys.forEach(function (key) {
      const label = HC_SECTION_LABELS[key] || key;
      lines.push('  • ' + label + ': ' + summarizeHcValue(parsed.hcPatch[key]));
    });
  }
  lines.push('');
}

/**
 * @param {import('./parse-drive-document.mjs').parseDriveDocument extends (...args: any) => infer R ? R : never} parsed
 * @param {string[]} lines
 */
export function appendLabsPreviewSection(parsed, lines) {
  const labAll = parsed.laboratorios.allSets || parsed.laboratorios.sets || [];
  const labNew = parsed.laboratorios.sets || [];
  const labSkipped = parsed.laboratorios.skippedEstimate || 0;

  lines.push('Laboratorios');
  if (!labAll.length) {
    lines.push('  Ningún bloque con fecha detectado');
  } else {
    lines.push(
      '  ' +
        labNew.length +
        ' fecha' +
        (labNew.length === 1 ? '' : 's') +
        ' a agregar al historial' +
        (labSkipped ? ' · ' + labSkipped + ' duplicada' + (labSkipped === 1 ? '' : 's') + ' omitida' + (labSkipped === 1 ? '' : 's') : ''),
    );
    labNew.slice(0, 10).forEach(function (set, idx) {
      lines.push(
        '  ' +
          (idx + 1) +
          '. ' +
          (set.fecha || '?') +
          ' — ' +
          summarizeLabPanels(set.resLabs),
      );
    });
    if (labNew.length > 10) {
      lines.push('  … y ' + (labNew.length - 10) + ' fechas más');
    }
  }
  lines.push('');
}

/**
 * ⌘⇧C (fuera de la pestaña estado actual) — copia al portapapeles los
 * laboratorios del día más reciente de todos los pacientes fijados (equipo del turno).
 */
import { getPatients, getLabHistory } from '../../clinical-read-model.mjs';
import { formatLabsForCensoCompact } from '../../censo-labs-format.mjs';
import { formatPatientNameForCenso } from '../../censo-build.mjs';
import { copyTableText } from '../../tend-export.mjs';

export function buildTeamLabsCopyText() {
  var pinned = getPatients().filter(function (p) {
    return p && p.pinned;
  });

  var blocks = [];
  pinned.forEach(function (p) {
    var lines = formatLabsForCensoCompact(getLabHistory(p.id) || []);
    if (!lines.length) return;
    blocks.push(formatPatientNameForCenso(p.nombre) + '\n' + lines.join('\n'));
  });

  return { text: blocks.join('\n\n'), patientCount: pinned.length, labCount: blocks.length };
}

/** @param {(msg: string, type?: string) => void} showToast */
export function copyTeamLabsForToday(showToast) {
  var built = buildTeamLabsCopyText();
  if (!built.text) {
    showToast('No hay laboratorios de hoy en los pacientes fijados.', 'info');
    return;
  }
  copyTableText(built.text, function (ok) {
    showToast(
      ok
        ? 'Laboratorios copiados (' + built.labCount + ' de ' + built.patientCount + ' fijados).'
        : 'No se pudo copiar los laboratorios.',
      ok ? 'success' : 'error'
    );
  });
}

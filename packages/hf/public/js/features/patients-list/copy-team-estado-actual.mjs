/**
 * ⌘⇧C (estado actual tab) — copia al portapapeles el estado actual
 * de todos los pacientes fijados (equipo del turno).
 */
import { getPatients } from '../../clinical-read-model.mjs';
import { getEstadoActualTextForPatient } from '../estado-actual-panel-clinico.mjs';
import { formatPatientNameForCenso } from '../../censo-build.mjs';
import { copyTableText } from '../../tend-export.mjs';

export function buildTeamEstadoActualCopyText() {
  var pinned = getPatients().filter(function (p) {
    return p && p.pinned;
  });

  var blocks = [];
  pinned.forEach(function (p) {
    var text = getEstadoActualTextForPatient(p);
    if (!text) return;
    blocks.push(formatPatientNameForCenso(p.nombre) + '\n' + text);
  });

  return { text: blocks.join('\n\n'), patientCount: pinned.length, estadoCount: blocks.length };
}

/** @param {(msg: string, type?: string) => void} showToast */
export function copyTeamEstadoActualForToday(showToast) {
  var built = buildTeamEstadoActualCopyText();
  if (!built.text) {
    showToast('No hay estado actual en los pacientes fijados.', 'info');
    return;
  }
  copyTableText(built.text, function (ok) {
    showToast(
      ok
        ? 'Estado actual copiado (' + built.estadoCount + ' de ' + built.patientCount + ' fijados).'
        : 'No se pudo copiar el estado actual.',
      ok ? 'success' : 'error'
    );
  });
}

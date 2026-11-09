/**
 * ⌘⇧C en la pestaña Cultivos — copia todos los cultivos (positivos y negativos)
 * de los pacientes fijados.
 */
import { getPatients, getLabHistory } from '../../clinical-read-model.mjs';
import { formatPatientNameForCenso } from '../../censo-build.mjs';
import { copyTableText } from '../../tend-export.mjs';
import { splitResLabsByTipo } from '../../cultivo-block-core.mjs';
import { formatCultivoCondensedForCopy } from '../../labs-cultivo-atb.mjs';
import { sortLabHistoryChronological } from '../../tend-core.mjs';

/** Texto condensado de todos los cultivos de un historial, sin repetidos. */
export function cultivosTextFromHistory(history) {
  var seen = Object.create(null);
  var out = [];
  sortLabHistoryChronological(history || []).forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    splitResLabsByTipo(set.resLabs).cultivo.forEach(function (chunk) {
      String(chunk || '')
        .split(/\n\n+/)
        .forEach(function (sec) {
          var t = formatCultivoCondensedForCopy(sec, '');
          if (!t || seen[t]) return;
          seen[t] = true;
          out.push(t);
        });
    });
  });
  return out.join('\n');
}

export function buildTeamCultivosCopyText() {
  var pinned = getPatients().filter(function (p) {
    return p && p.pinned && !p.archived;
  });
  var blocks = [];
  pinned.forEach(function (p) {
    var t = cultivosTextFromHistory(getLabHistory(p.id));
    if (t) blocks.push(formatPatientNameForCenso(p.nombre) + '\n' + t);
  });
  return { text: blocks.join('\n\n'), patientCount: pinned.length, cultivoCount: blocks.length };
}

/** @param {(msg: string, type?: string) => void} showToast */
export function copyTeamCultivos(showToast) {
  var built = buildTeamCultivosCopyText();
  if (!built.text) {
    showToast('No hay cultivos en los pacientes fijados.', 'info');
    return;
  }
  copyTableText(built.text, function (ok) {
    showToast(
      ok
        ? 'Cultivos copiados (' + built.cultivoCount + ' de ' + built.patientCount + ' fijados).'
        : 'No se pudo copiar los cultivos.',
      ok ? 'success' : 'error'
    );
  });
}

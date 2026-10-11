import { MED_FIELD_KEYS } from './estado-actual-data-constants.mjs';
import { emptyEstadoClinico, emptyPendienteReceta } from '../../../lib/monitoreo-merge.mjs';

export { emptyEstadoClinico, emptyPendienteReceta };

/**
 * Historial rows minus delete markers ({ id, recordedAt, deleted: true, savedAt }).
 * Markers stay stored so the union merge spreads the delete; readers skip them.
 * @param {unknown} historial
 * @returns {any[]}
 */
export function liveHistorial(historial) {
  return (Array.isArray(historial) ? historial : []).filter(function (r) {
    return !(r && typeof r === 'object' && /** @type {any} */ (r).deleted === true);
  });
}

/** @returns {typeof emptyMonitoreo extends (...a: infer R) => infer V ? V : never} */
export function emptyMonitoreo() {
  /** @type {Record<string, boolean>} */
  var confirmado = { dieta: false };
  for (var mk of MED_FIELD_KEYS) {
    confirmado[mk] = false;
  }
  return {
    estadoClinico: emptyEstadoClinico(),
    confirmado,
    pendienteReceta: emptyPendienteReceta(),
    historial: [],
    textoGuardado: { text: '', savedAt: null },
    bombaInsulinaAlgoritmo: null,
  };
}

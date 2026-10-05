import { MED_FIELD_KEYS } from './estado-actual-data-constants.mjs';

/** @returns {typeof emptyEstadoClinico extends (...a: infer R) => infer V ? V : never} */
export function emptyEstadoClinico() {
  return {
    four: '',
    esferas: '',
    analgesia: '',
    antiemeticos: '',
    sedacion: '',
    antiepilepticos: '',
    antiparkinsonianos: '',
    antidotos: '',
    viaAerea: '',
    abx: '',
    transfusiones: '',
    antihta: '',
    diureticos: '',
    antitromboticos: '',
    anticoagulacion: '',
    antiarritmicos: '',
    estatinas: '',
    vasop: '',
    nm: '',
    soporte: '',
    soporteLitros: '',
    soporteFlujoLmin: '',
    soporteFio2: '',
    vmModo: '',
    vmPeep: '',
    vmVt: '',
    vmFlujo: '',
    vmPmeseta: '',
    vmPsoporte: '',
    pao2: '',
    tempContext: '',
    dieta: '',
    kcalKg: '',
    kcal: '',
    proteinG: '',
    pesoRef: '',
  };
}

/** @returns {Record<string, string>} */
export function emptyPendienteReceta() {
  /** @type {Record<string, string>} */
  const o = {};
  for (var k of Object.keys(emptyEstadoClinico())) {
    o[k] = '';
  }
  return o;
}

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

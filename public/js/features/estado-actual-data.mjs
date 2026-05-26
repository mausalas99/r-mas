/** @typedef {{ text: string, savedAt: string | null }} TextoGuardado */
/** @typedef {{ id: string, recordedAt: string, vitals?: Record<string, unknown>, glucometrias?: Array<{ value?: unknown, time?: string }>, io?: { ing?: unknown, egr?: unknown }, alteredAt?: Record<string, string> }} MedicionHistorial */

export const MED_FIELD_KEYS = /** @type {const} */ (['analgesia', 'abx', 'antihta', 'vasop']);

/** @returns {typeof emptyEstadoClinico extends (...a: infer R) => infer V ? V : never} */
export function emptyEstadoClinico() {
  return {
    four: '',
    esferas: '',
    analgesia: '',
    abx: '',
    antihta: '',
    vasop: '',
    soporte: '',
    tempContext: '',
    dieta: '',
    kcalKg: '',
    kcal: '',
    pesoRef: '',
  };
}

/** @returns {Record<string, string>} */
function emptyPendienteReceta() {
  /** @type {Record<string, string>} */
  const o = {};
  for (var k of Object.keys(emptyEstadoClinico())) {
    o[k] = '';
  }
  return o;
}

/** @returns {typeof emptyMonitoreo extends (...a: infer R) => infer V ? V : never} */
export function emptyMonitoreo() {
  /** @type {Record<string, boolean>} */
  var confirmado = {};
  for (var mk of MED_FIELD_KEYS) {
    confirmado[mk] = false;
  }
  return {
    estadoClinico: emptyEstadoClinico(),
    confirmado,
    pendienteReceta: emptyPendienteReceta(),
    historial: [],
    textoGuardado: { text: '', savedAt: null },
  };
}

/** @type {readonly string[]} */
const VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat', 'peso'];

/**
 * @param {unknown} v
 */
function hasIoNumber(v) {
  return v != null && v !== '';
}

/**
 * Compare ISO timestamps as strings (lex works for canonical ISO UTC); null sorts old.
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {number}
 */
function compareSavedAt(a, b) {
  if ((a == null || a === '') && (b == null || b === '')) return 0;
  if (a == null || a === '') return -1;
  if (b == null || b === '') return 1;
  return String(a).localeCompare(String(b));
}

/**
 * @param {unknown} patient
 */
export function ensureMonitoreo(patient) {
  if (!patient || typeof patient !== 'object') return patient;
  if (!/** @type {any} */ (patient).monitoreo) {
    /** @type {any} */ (patient).monitoreo = emptyMonitoreo();
  }
  return patient;
}

/**
 * Migra legacy `patient.estadoActual` a `patient.monitoreo.textoGuardado` y elimina la clave legacy.
 * @param {unknown} patient
 * @returns {boolean} true si cambió algo que conviene persistir (merge o eliminación de legacy)
 */
export function migratePatientMonitoreo(patient) {
  if (!patient || typeof patient !== 'object') return false;
  /** @type {any} */
  var p = patient;
  ensureMonitoreo(p);
  var leg = p.estadoActual;
  var hadLegacyKey = Object.prototype.hasOwnProperty.call(p, 'estadoActual');
  if (!leg || typeof leg !== 'object') {
    delete p.estadoActual;
    return hadLegacyKey;
  }
  var tg = p.monitoreo.textoGuardado;
  var legText = typeof leg.text === 'string' ? leg.text : leg.text != null ? String(leg.text) : '';
  var legSaved = leg.savedAt != null ? String(leg.savedAt) : null;
  if (compareSavedAt(legSaved, tg.savedAt) > 0) {
    tg.text = legText;
    tg.savedAt = legSaved;
  } else if ((!tg.text || tg.text === '') && !(tg.savedAt != null && String(tg.savedAt).length > 0) && legText) {
    tg.text = legText;
    tg.savedAt = legSaved != null ? legSaved : tg.savedAt;
  }
  delete p.estadoActual;
  return true;
}

/**
 * Copia modelo de monitoreo / legacy estadoActual desde un snapshot JSON hacia `target`, luego normaliza en sitio.
 * No muta `source`. Devuelve true si hubo que persistir cambios locales (migrate).
 * @param {unknown} target
 * @param {unknown} source
 */
export function mergePatientMonitoreoFromImported(target, source) {
  if (!target || typeof target !== 'object') return false;
  if (!source || typeof source !== 'object') return migratePatientMonitoreo(target);
  /** @type {any} */
  var s = source;
  /** @type {any} */
  var t = target;
  try {
    if ('monitoreo' in s && s.monitoreo != null && typeof s.monitoreo === 'object') {
      t.monitoreo = JSON.parse(JSON.stringify(s.monitoreo));
    }
    if ('estadoActual' in s && s.estadoActual != null && typeof s.estadoActual === 'object') {
      t.estadoActual = JSON.parse(JSON.stringify(s.estadoActual));
    }
  } catch (_e) {}
  return migratePatientMonitoreo(target);
}

/**
 * @param {unknown} medicion
 */
export function medicionHasCoreData(medicion) {
  if (!medicion || typeof medicion !== 'object') return false;
  /** @type {any} */
  var m = medicion;
  /** @type {Record<string, unknown>} */
  var vit = m.vitals && typeof m.vitals === 'object' ? m.vitals : {};
  for (var vk of VITAL_KEYS) {
    var vv = vit[vk];
    if (vv != null && vv !== '') return true;
  }
  var glus = Array.isArray(m.glucometrias) ? m.glucometrias : [];
  for (var i = 0; i < glus.length; i++) {
    var g = glus[i];
    if (!g || typeof g !== 'object') continue;
    var val = /** @type {any} */ (g).value;
    if (val != null && val !== '') return true;
  }
  var io = m.io && typeof m.io === 'object' ? /** @type {any} */ (m.io) : {};
  return hasIoNumber(io.ing) || hasIoNumber(io.egr);
}

/**
 * Sort historial by recordedAt ascending.
 * @param {unknown[]} historial
 */
function historialSortedAsc(historial) {
  return historial.slice().sort(function (a, b) {
    var ra = typeof a === 'object' && a && 'recordedAt' in a ? String(/** @type {any} */ (a).recordedAt) : '';
    var rb = typeof b === 'object' && b && 'recordedAt' in b ? String(/** @type {any} */ (b).recordedAt) : '';
    return ra.localeCompare(rb);
  });
}

/**
 * @param {unknown} monitoreoLike
 */
export function deriveSnapshot(monitoreoLike) {
  var emptyVitals = {};
  var emptyAltered = {};
  for (var zk of VITAL_KEYS) {
    emptyVitals[zk] = null;
  }
  var snap = {
    vitals: emptyVitals,
    alteredAt: emptyAltered,
    glucometrias: /** @type {Array<{ value?: unknown, time?: string }>} */ ([]),
    io: /** @type {{ ing: null | unknown, egr: null | unknown }} */ ({ ing: null, egr: null }),
  };

  /** @type {any} */
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);

  /** @type {typeof snap.vitals} */
  var vitals = {};
  for (var v0 of VITAL_KEYS) vitals[v0] = null;
  /** @type {Record<string, string>} */
  var alteredAt = {};

  for (var iRow = 0; iRow < sortedAsc.length; iRow++) {
    var row = sortedAsc[iRow];
    if (!row || typeof row !== 'object') continue;
    var rv = /** @type {any} */ (row).vitals && typeof /** @type {any} */ (row).vitals === 'object' ? /** @type {any} */ (row).vitals : {};
    var rowAlt =
      /** @type {any} */ (row).alteredAt && typeof /** @type {any} */ (row).alteredAt === 'object'
        ? /** @type {Record<string, string>} */ (/** @type {any} */ (row).alteredAt)
        : {};
    for (var vk of VITAL_KEYS) {
      var val = rv[vk];
      if (val != null && val !== '') {
        vitals[vk] = val;
        if (rowAlt && rowAlt[vk] != null && String(rowAlt[vk]).length > 0) {
          alteredAt[vk] = String(rowAlt[vk]);
        } else {
          delete alteredAt[vk];
        }
      }
    }
  }

  /** @type {Array<{ value?: unknown, time?: string }>} */
  var gluChosen = [];
  for (var j = sortedAsc.length - 1; j >= 0; j--) {
    var r2 = sortedAsc[j];
    if (!r2 || typeof r2 !== 'object') continue;
    var garr = Array.isArray(/** @type {any} */ (r2).glucometrias) ? /** @type {any} */ (r2).glucometrias : [];
    var nonempty = /** @type {typeof gluChosen} */ ([]);
    for (var gg of garr) {
      if (!gg || typeof gg !== 'object') continue;
      if (/** @type {any} */ (gg).value != null && /** @type {any} */ (gg).value !== '') nonempty.push(gg);
    }
    if (nonempty.length > 0) {
      gluChosen = nonempty;
      break;
    }
  }

  var ingSeen = /** @type {null | unknown} */ (null);
  var egrSeen = /** @type {null | unknown} */ (null);
  for (var k2 = sortedAsc.length - 1; k2 >= 0; k2--) {
    var rIo = sortedAsc[k2];
    if (!rIo || typeof rIo !== 'object') continue;
    var ioObj =
      /** @type {any} */ (rIo).io && typeof /** @type {any} */ (rIo).io === 'object'
        ? /** @type {any} */ (/** @type {any} */ (rIo).io)
        : {};
    if (egrSeen === null && hasIoNumber(ioObj.egr)) egrSeen = ioObj.egr;
    if (ingSeen === null && hasIoNumber(ioObj.ing)) ingSeen = ioObj.ing;
    if (ingSeen !== null && egrSeen !== null) break;
  }

  snap.vitals = vitals;
  snap.alteredAt = alteredAt;
  snap.glucometrias = gluChosen.slice();
  snap.io = { ing: ingSeen, egr: egrSeen };
  return snap;
}

/**
 * @param {unknown} monitoreoLike
 */
export function balanceTurno(monitoreoLike) {
  /** @type {any} */
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  for (var i = sortedAsc.length - 1; i >= 0; i--) {
    var row = sortedAsc[i];
    if (!row || typeof row !== 'object') continue;
    var io =
      /** @type {any} */ (row).io && typeof /** @type {any} */ (row).io === 'object'
        ? /** @type {{ ing?: unknown, egr?: unknown }} */ (/** @type {any} */ (row).io)
        : {};
    if (!hasIoNumber(io.ing) || !hasIoNumber(io.egr)) continue;
    return Number(io.ing) - Number(io.egr);
  }
  return NaN;
}

/**
 * @param {unknown} monitoreoLike
 */
export function balanceGlobalHistorico(monitoreoLike) {
  /** @type {any} */
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  var sum = 0;
  var any = false;
  for (var i = 0; i < sortedAsc.length; i++) {
    var row = sortedAsc[i];
    if (!row || typeof row !== 'object') continue;
    var io =
      /** @type {any} */ (row).io && typeof /** @type {any} */ (row).io === 'object'
        ? /** @type {{ ing?: unknown, egr?: unknown }} */ (/** @type {any} */ (row).io)
        : {};
    if (!hasIoNumber(io.ing) || !hasIoNumber(io.egr)) continue;
    sum += Number(io.ing) - Number(io.egr);
    any = true;
  }
  return any ? sum : NaN;
}

/**
 * @param {unknown} patientOrMonitoreo
 * @returns {any}
 */
function resolveMonitoreoContainer(patientOrMonitoreo) {
  /** @type {any} */
  var tgt = patientOrMonitoreo;
  if (!tgt || typeof tgt !== 'object') return null;
  if (Array.isArray(tgt.historial)) return tgt;
  if (tgt.monitoreo && typeof tgt.monitoreo === 'object' && Array.isArray(tgt.monitoreo.historial))
    return tgt.monitoreo;
  tgt.monitoreo = emptyMonitoreo();
  return tgt.monitoreo;
}

/**
 * @param {unknown} patientOrMonitoreo
 * @param {MedicionHistorial | unknown} medicion
 */
export function appendMedicion(patientOrMonitoreo, medicion) {
  if (!medicionHasCoreData(medicion)) return { ok: false, error: 'empty' };
  /** @type {any} */
  var mon = resolveMonitoreoContainer(patientOrMonitoreo);
  if (!mon) return { ok: false, error: 'empty' };
  mon.historial.push(structuredClone(/** @type {object} */ (medicion)));
  return { ok: true };
}

/**
 * @param {unknown} patientOrMonitoreo
 * @param {string} id
 */
export function removeMedicion(patientOrMonitoreo, id) {
  /** @type {any} */
  var mon = resolveMonitoreoContainer(patientOrMonitoreo);
  if (!mon || !Array.isArray(mon.historial)) return;
  mon.historial = mon.historial.filter(function (row) {
    return row && typeof row === 'object' && /** @type {any} */ (row).id !== id;
  });
}

/**
 * @param {unknown} localIn
 * @param {unknown} remoteIn
 */
export function mergeMonitoreo(localIn, remoteIn) {
  var local = /** @type {any} */ (structuredClone(localIn));
  var remote = /** @type {any} */ (structuredClone(remoteIn));

  var lHist = Array.isArray(local?.historial) ? local.historial : [];
  var rHist = Array.isArray(remote?.historial) ? remote.historial : [];
  /** @type {any} */
  var result = /** @type {any} */ (structuredClone(localIn));
  result.historial = structuredClone((rHist.length > lHist.length ? remote : local).historial || []);

  var locT = result.textoGuardado || { text: '', savedAt: null };
  var remT = remote.textoGuardado || { text: '', savedAt: null };
  result.textoGuardado =
    compareSavedAt(remT.savedAt, locT.savedAt) > 0
      ? structuredClone(remT)
      : structuredClone(locT);

  /** @type {any} */
  var resEco = result.estadoClinico || emptyEstadoClinico();
  /** @type {any} */
  var resCf = result.confirmado || {};

  /** @type {any} */
  var remEco = remote.estadoClinico || emptyEstadoClinico();
  /** @type {any} */
  var remCf = remote.confirmado || {};

  for (var mk of MED_FIELD_KEYS) {
    if (remCf[mk] && !resCf[mk]) {
      resEco[mk] = remEco[mk];
      resCf[mk] = true;
    }
  }
  result.estadoClinico = resEco;
  result.confirmado = resCf;

  return result;
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseWeightKg(raw) {
  if (raw == null || raw === '') return null;
  var n = Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Peso para cálculo dietético: datos del paciente → último SV → pesoRef.
 * @param {{ patientPeso?: unknown, snapshotPeso?: unknown, pesoRef?: unknown }} [opts]
 * @returns {number | null}
 */
export function resolveDietWeightKg(opts) {
  opts = opts || {};
  return (
    parseWeightKg(opts.patientPeso) ??
    parseWeightKg(opts.snapshotPeso) ??
    parseWeightKg(opts.pesoRef)
  );
}

/**
 * @param {unknown} kcalKg
 * @param {number | null} weightKg
 * @returns {number | null}
 */
export function computeDietKcalTotal(kcalKg, weightKg) {
  var k = Number(kcalKg);
  if (!Number.isFinite(k) || k <= 0 || weightKg == null) return null;
  return Math.round(k * weightKg);
}

/**
 * Actualiza estadoClinico.kcal cuando hay kcal/kg y peso válidos.
 * @param {Record<string, unknown> | null | undefined} estadoClinico
 * @param {number | null} weightKg
 * @returns {boolean}
 */
export function syncDietKcalFromWeight(estadoClinico, weightKg) {
  if (!estadoClinico || typeof estadoClinico !== 'object' || weightKg == null) return false;
  var total = computeDietKcalTotal(estadoClinico.kcalKg, weightKg);
  if (total == null) return false;
  estadoClinico.kcal = String(total);
  return true;
}

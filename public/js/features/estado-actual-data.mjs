/** @typedef {{ text: string, savedAt: string | null }} TextoGuardado */
/** @typedef {{ kind: 'diuresis' | 'drain' | 'gastrostomy' | 'nephro', label: string, value: number | string }} IoEgresoPart */
/** @typedef {{ id: string, recordedAt: string, vitals?: Record<string, unknown>, vitalSeries?: Record<string, Array<{ value?: number, time?: string }>>, glucometrias?: Array<{ value?: unknown, time?: string, altered?: boolean, rescueUnits?: number, postRescueValue?: number }>, bombaInsulina?: Array<{ value?: unknown, units?: unknown, time?: string }>, io?: { ing?: unknown, egr?: unknown, egrParts?: IoEgresoPart[], evac?: unknown }, alteredAt?: Record<string, string> }} MedicionHistorial */

import {
  isIoNumericValue as isIoNumericValueIo,
  ioDiuresisForBalance,
  ioNumericEgressTotal,
  computeIoBalanceFromIngEgr,
} from './estado-actual-io.mjs';
import { getVitalExtraStorageKey, VITAL_BASE_KEYS } from './estado-actual-vital-extras.mjs';
import { vitalSeriesFromMedicion } from './estado-actual-vital-series.mjs';

export const MED_FIELD_KEYS = /** @type {const} */ ([
  'analgesia',
  'abx',
  'antihta',
  'diureticos',
  'antitromboticos',
  'vasop',
  'nm',
]);

/**
 * Revision string for panel/tab cache invalidation (historial + estado clínico + receta).
 * @param {unknown} monitoreoLike
 * @param {string | null | undefined} activeId
 * @param {Record<string, { items?: Array<{ id?: string, suspendido?: boolean }> }>} [medRecetaByPatient]
 * @returns {string}
 */
export function buildEaMonitoreoRevision(monitoreoLike, activeId, medRecetaByPatient) {
  /** @type {any} */
  var m = monitoreoLike || {};
  var h = Array.isArray(m.historial) ? m.historial.length : 0;
  var parts = ['h' + h];
  for (var i = 0; i < Math.min(4, h); i += 1) {
    var row = m.historial[i];
    parts.push(String(row && row.id ? row.id : '') + '@' + String(row && row.recordedAt ? row.recordedAt : ''));
  }
  var tg = m.textoGuardado && m.textoGuardado.savedAt != null ? String(m.textoGuardado.savedAt) : '';
  parts.push('t' + tg);
  var ec = m.estadoClinico && typeof m.estadoClinico === 'object' ? m.estadoClinico : {};
  var pend = m.pendienteReceta && typeof m.pendienteReceta === 'object' ? m.pendienteReceta : {};
  var conf = m.confirmado && typeof m.confirmado === 'object' ? m.confirmado : {};
  parts.push(
    String(ec.four || ''),
    String(ec.esferas || ''),
    String(ec.soporte || ''),
    String(ec.dieta || ''),
    String(ec.kcalKg || ''),
    String(ec.kcal || ''),
    String(ec.proteinG || '')
  );
  for (var k of MED_FIELD_KEYS) {
    parts.push(String(ec[k] || ''), String(pend[k] || ''), conf[k] ? '1' : '0');
  }
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  parts.push('f' + String(block && block.fechaActualizacion ? block.fechaActualizacion : ''));
  var now = new Date();
  parts.push(
    'cal' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  );
  parts.push('r' + items.length);
  for (var j = 0; j < Math.min(4, items.length); j += 1) {
    var it = items[j];
    parts.push(String(it && it.id ? it.id : '') + (it && it.suspendido ? 's' : 'a'));
  }
  return parts.join(':');
}

/** @returns {typeof emptyEstadoClinico extends (...a: infer R) => infer V ? V : never} */
export function emptyEstadoClinico() {
  return {
    four: '',
    esferas: '',
    analgesia: '',
    abx: '',
    antihta: '',
    diureticos: '',
    antitromboticos: '',
    vasop: '',
    nm: '',
    soporte: '',
    tempContext: '',
    dieta: '',
    kcalKg: '',
    kcal: '',
    proteinG: '',
    pesoRef: '',
  };
}

function backfillEstadoClinico(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  var template = emptyEstadoClinico();
  var ec = monitoreo.estadoClinico;
  if (!ec || typeof ec !== 'object') {
    monitoreo.estadoClinico = Object.assign({}, template);
  } else {
    Object.keys(template).forEach(function (k) {
      if (ec[k] == null) ec[k] = template[k];
    });
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = emptyPendienteReceta();
  } else {
    Object.keys(template).forEach(function (k) {
      if (monitoreo.pendienteReceta[k] == null) monitoreo.pendienteReceta[k] = '';
    });
  }
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
const VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/**
 * @param {unknown} v
 */
function hasIoNumber(v) {
  return v != null && v !== '';
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isIoNumericValue(v) {
  return isIoNumericValueIo(v);
}

/**
 * Egresos: cc numéricos o «NC» (sin cambio).
 * @param {unknown} raw
 * @returns {number | string | null}
 */
export function parseIoEgresoField(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  if (/^nc$/i.test(s)) return 'NC';
  var n = Number(s);
  return Number.isFinite(n) ? n : s;
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
  backfillEstadoClinico(/** @type {any} */ (patient).monitoreo);
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
  for (var ek = 0; ek < VITAL_BASE_KEYS.length; ek++) {
    var extraKey = getVitalExtraStorageKey(VITAL_BASE_KEYS[ek]);
    if (vit[extraKey] != null && vit[extraKey] !== '') return true;
  }
  var vs = m.vitalSeries;
  if (vs && typeof vs === 'object') {
    for (var vk2 in vs) {
      if (Array.isArray(vs[vk2]) && vs[vk2].length) return true;
    }
  }
  var bombas = Array.isArray(m.bombaInsulina) ? m.bombaInsulina : [];
  for (var bi = 0; bi < bombas.length; bi++) {
    var b = bombas[bi];
    if (b && typeof b === 'object' && /** @type {any} */ (b).value != null && /** @type {any} */ (b).value !== '') {
      return true;
    }
  }
  var glus = Array.isArray(m.glucometrias) ? m.glucometrias : [];
  for (var i = 0; i < glus.length; i++) {
    var g = glus[i];
    if (!g || typeof g !== 'object') continue;
    var val = /** @type {any} */ (g).value;
    if (val != null && val !== '') return true;
  }
  var io = m.io && typeof m.io === 'object' ? /** @type {any} */ (m.io) : {};
  if (hasIoNumber(io.ing)) return true;
  if (ioNumericEgressTotal(io) != null) return true;
  if (ioDiuresisForBalance(io) != null && ioDiuresisForBalance(io) !== '') return true;
  if (Array.isArray(io.egrParts) && io.egrParts.length) return true;
  if (io.evac != null && io.evac !== '') return true;
  return hasIoNumber(io.egr);
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
    for (var ex = 0; ex < VITAL_BASE_KEYS.length; ex++) {
      var baseK = VITAL_BASE_KEYS[ex];
      var extraK = getVitalExtraStorageKey(baseK);
      var extraVal = rv[extraK];
      if (extraVal != null && extraVal !== '') {
        vitals[extraK] = extraVal;
        if (rowAlt && rowAlt[extraK] != null && String(rowAlt[extraK]).length > 0) {
          alteredAt[extraK] = String(rowAlt[extraK]);
        } else {
          delete alteredAt[extraK];
        }
      }
    }
  }

  /** @type {Array<{ value?: unknown, time?: string }>} */
  var gluChosen = [];
  /** @type {Array<{ value: number, units: number, time?: string }>} */
  var bombaChosen = [];
  for (var j = sortedAsc.length - 1; j >= 0; j--) {
    var r2 = sortedAsc[j];
    if (!r2 || typeof r2 !== 'object') continue;
    var barr = Array.isArray(/** @type {any} */ (r2).bombaInsulina) ? /** @type {any} */ (r2).bombaInsulina : [];
    if (barr.length) {
      bombaChosen = barr
        .map(function (e) {
          if (!e || typeof e !== 'object') return null;
          var v = Number(/** @type {any} */ (e).value);
          var u = Number(/** @type {any} */ (e).units);
          if (!Number.isFinite(v)) return null;
          return {
            value: v,
            units: Number.isFinite(u) ? u : 0,
            time: /** @type {any} */ (e).time != null ? String(/** @type {any} */ (e).time) : undefined,
          };
        })
        .filter(Boolean);
      gluChosen = [];
      break;
    }
    var garr = Array.isArray(/** @type {any} */ (r2).glucometrias) ? /** @type {any} */ (r2).glucometrias : [];
    var nonempty = /** @type {typeof gluChosen} */ ([]);
    for (var gg of garr) {
      if (!gg || typeof gg !== 'object') continue;
      if (/** @type {any} */ (gg).value != null && /** @type {any} */ (gg).value !== '') nonempty.push(gg);
    }
    if (nonempty.length > 0) {
      gluChosen = nonempty;
      bombaChosen = [];
      break;
    }
  }

  var ingSeen = /** @type {null | unknown} */ (null);
  var egrSeen = /** @type {null | unknown} */ (null);
  /** @type {IoEgresoPart[] | null} */
  var egrPartsSeen = null;
  var evacSeen = /** @type {null | unknown} */ (null);
  for (var k2 = sortedAsc.length - 1; k2 >= 0; k2--) {
    var rIo = sortedAsc[k2];
    if (!rIo || typeof rIo !== 'object') continue;
    var ioObj =
      /** @type {any} */ (rIo).io && typeof /** @type {any} */ (rIo).io === 'object'
        ? /** @type {any} */ (/** @type {any} */ (rIo).io)
        : {};
    if (egrPartsSeen === null && Array.isArray(ioObj.egrParts) && ioObj.egrParts.length) {
      egrPartsSeen = ioObj.egrParts.slice();
      egrSeen = ioNumericEgressTotal(ioObj) ?? ioDiuresisForBalance(ioObj);
    }
    if (egrSeen === null && ioObj.egr != null && ioObj.egr !== '') egrSeen = ioObj.egr;
    if (evacSeen === null && ioObj.evac != null && ioObj.evac !== '') evacSeen = ioObj.evac;
    if (ingSeen === null && hasIoNumber(ioObj.ing)) ingSeen = ioObj.ing;
    if (ingSeen !== null && (egrSeen !== null || egrPartsSeen) && evacSeen !== null) break;
  }

  /** @type {Record<string, Array<{ value: number, time?: string }>>} */
  var vitalSeries = {};
  for (var si = sortedAsc.length - 1; si >= 0; si--) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== 'object') continue;
    var fromRow = vitalSeriesFromMedicion(srow);
    VITAL_BASE_KEYS.forEach(function (bk) {
      if (!vitalSeries[bk]) vitalSeries[bk] = [];
      var list = fromRow[bk] || [];
      for (var ri = 0; ri < list.length; ri++) {
        var rd = list[ri];
        var dup = vitalSeries[bk].some(function (x) {
          return x.value === rd.value && (x.time || '') === (rd.time || '');
        });
        if (!dup) vitalSeries[bk].push(rd);
      }
    });
  }

  snap.vitals = vitals;
  snap.alteredAt = alteredAt;
  snap.vitalSeries = vitalSeries;
  snap.glucometrias = gluChosen.slice();
  snap.bombaInsulina = bombaChosen;
  /** @type {{ ing: null | unknown, egr: null | unknown, egrParts?: IoEgresoPart[], evac?: unknown }} */
  var snapIo = { ing: ingSeen, egr: egrSeen };
  if (egrPartsSeen) snapIo.egrParts = egrPartsSeen;
  if (evacSeen !== null) snapIo.evac = evacSeen;
  snap.io = snapIo;
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
        ? /** @type {any} */ (/** @type {any} */ (row).io)
        : {};
    var bal = computeIoBalanceFromIngEgr(io.ing, io);
    if (!Number.isFinite(bal)) continue;
    return bal;
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
        ? /** @type {any} */ (/** @type {any} */ (row).io)
        : {};
    var bal = computeIoBalanceFromIngEgr(io.ing, io);
    if (!Number.isFinite(bal)) continue;
    sum += bal;
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
  if (!medicion || typeof medicion !== 'object') return { ok: false, error: 'empty' };
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
 * Peso para cálculo dietético: solo datos del paciente (o pesoRef legacy en monitoreo).
 * @param {{ patientPeso?: unknown, pesoRef?: unknown }} [opts]
 * @returns {number | null}
 */
export function resolveDietWeightKg(opts) {
  opts = opts || {};
  return parseWeightKg(opts.patientPeso) ?? parseWeightKg(opts.pesoRef);
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
 * @param {unknown} kcalTotal
 * @param {number | null} weightKg
 * @returns {number | null}
 */
export function computeDietKcalKgFromTotal(kcalTotal, weightKg) {
  var t = Number(kcalTotal);
  if (!Number.isFinite(t) || t <= 0 || weightKg == null || weightKg <= 0) return null;
  return Math.round((t / weightKg) * 10) / 10;
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

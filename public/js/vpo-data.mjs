import {
  getProcedureById,
  suggestAhaClinicoFromAsa,
} from './vpo-lookups.mjs';
import {
  parseDiagnosticosText,
  formatDiagnosticosCopy,
  applyDiagnosticosInference,
} from './vpo-dx-inference.mjs';

export const DURACION_OPCIONES = [
  { key: 'le2', label: '≤ 2 horas', hours: 2 },
  { key: '2to3', label: '2–3 horas', hours: 2.5 },
  { key: 'gt3', label: '> 3 horas', hours: 4 },
];
import { sortLabHistoryChronological } from './tend-core.mjs';
import { getRenalLabContext } from './manejo-atb-renal.mjs';

export const DEFAULT_EKG_TEXT =
  'ELECTROCARDIOGRAMA DE 12 DERIVACIONES, RITMO SINUSAL, EJE ELÉCTRICO NORMAL (ENTRE 0 Y 90 GRADOS), FC ___ LPM, ONDA P PRESENTE Y DE MORFOLOGÍA NORMAL, INTERVALO PR CONSERVADO (120-200 MS), COMPLEJO QRS DE DURACIÓN NORMAL (<120 MS), SIN SUPRA O INFRA DESNIVELES DEL SEGMENTO ST, ONDAS T SIMÉTRICAS SIN INVERSIONES, INTERVALO QTC DENTRO DE PARÁMETROS NORMALES. SIN DATOS DE BLOQUEO, HIPERTROFIA, ISQUEMIA O NECROSIS.';

export const DEFAULT_RX_TEXT =
  'RADIOGRAFÍA DE TÓRAX AP, SIN ROTACIÓN, ADECUADA PENETRACIÓN, TEJIDOS BLANDOS SIN ALTERACIONES, MARCO ÓSEO ÍNTEGRO, CAMPOS PULMONARES SIN REDISTRIBUCIÓN DE FLUJO, ÁNGULOS CARDIOFRÉNICOS Y COSTODIAFRAGMÁTICOS LIBRES, ÍNDICE CARDIOTORÁCICO <50% SIN CARDIOMEGALIA, SILUETA MEDIASTINAL NORMAL, TRÁQUEA CENTRAL. SIN INFILTRADOS, DERRAME PLEURAL, CONSOLIDACIONES NI MASAS.';

export function emptyVpoState() {
  return {
    edad: '',
    creatinina: '',
    hemoglobina: '',
    spo2: '',
    duracionCirugiaHoras: '',
    duracionCirugiaKey: '',
    asaKey: '',
    functionalKey: 'independent',
    procedureId: '',
    rcri: {
      cardiopatiaIsquemica: false,
      insuficienciaCardiaca: false,
      evc: false,
      dmInsulina: false,
      cirugiaAltoRiesgo: false,
      urgente: false,
    },
    ariscat: {
      infeccionRespiratoriaUltimoMes: false,
      incisionKey: 'peripheral',
      cirugiaMayor45Min: false,
      urgente: false,
    },
    caprini: {
      imcMayor25: false,
      insuficienciaVenosa: false,
      reposoMovilidadReducida: false,
      antecedenteEvc: false,
      trombofilia: false,
      esteroideCronico: false,
      artritisInflamatoria: false,
    },
    ahaClinico: '',
    ahaQuirurgico: '',
    ekgText: DEFAULT_EKG_TEXT,
    rxText: DEFAULT_RX_TEXT,
    diagnosticosText: '',
    diagnosticosList: /** @type {string[]} */ ([]),
    diagnosticosTouched: false,
    asaFromDiagnosticos: false,
    valoracionIntro: 'SE REALIZA VALORACIÓN PREOPERATORIA. SE OTORGA RIESGO QUIRÚRGICO:',
    farmacos: [],
    fcLpm: '',
    lastLabApplied: null,
    lastFcApplied: '',
  };
}

/** @param {Record<string, object>} map @param {string} patientId */
export function ensureVpoState(map, patientId) {
  if (!patientId) return emptyVpoState();
  if (!map[patientId]) map[patientId] = emptyVpoState();
  ensureDiagnosticosList(map[patientId]);
  return map[patientId];
}

/** @param {object} state */
export function ensureDiagnosticosList(state) {
  if (!state) return;
  if (!Array.isArray(state.diagnosticosList)) state.diagnosticosList = [];
  if (!state.diagnosticosList.length && state.diagnosticosText) {
    state.diagnosticosList = parseDiagnosticosText(state.diagnosticosText);
  }
  if (!state.diagnosticosList.length) state.diagnosticosList = [''];
  state.diagnosticosText = formatDiagnosticosCopy(
    state.diagnosticosList.filter(function (d) {
      return String(d || '').trim();
    })
  );
}

/**
 * @param {object} state
 * @param {string[]} list
 */
export function setDiagnosticosList(state, list) {
  var cleaned = (list || [])
    .map(function (d) {
      return String(d || '').trim().toUpperCase();
    })
    .filter(Boolean);
  state.diagnosticosList = cleaned.length ? cleaned.concat(['']) : [''];
  applyDiagnosticosInference(state);
  syncAhaFields(state);
}

/** @param {object} state @param {string} procedureId */
export function applyProcedureSelection(state, procedureId) {
  var proc = getProcedureById(procedureId);
  state.procedureId = procedureId || '';
  if (!proc) return;
  state.ahaQuirurgico = proc.ahaQuirurgico;
  state.rcri.cirugiaAltoRiesgo = !!proc.rcriHighRisk;
  state.ariscat.incisionKey = proc.ariscatIncisionKey;
}

/** @param {object} state @param {string} asaKey */
export function applyAsaSuggestion(state, asaKey) {
  state.asaKey = asaKey || '';
  syncAhaFields(state);
}

/** Recalcula AHA clínico (ASA) y quirúrgico (procedimiento). @param {object} state */
export function syncAhaFields(state) {
  if (state.asaKey) state.ahaClinico = suggestAhaClinicoFromAsa(state.asaKey);
  var proc = getProcedureById(state.procedureId);
  if (proc) state.ahaQuirurgico = proc.ahaQuirurgico;
}

/** @param {string} key */
export function duracionKeyToHours(key) {
  var o = DURACION_OPCIONES.find(function (d) {
    return d.key === key;
  });
  return o ? o.hours : null;
}

/** @param {string|number} hours */
export function duracionHoursToKey(hours) {
  var h = typeof hours === 'number' ? hours : parseFloat(String(hours || '').replace(',', '.'));
  if (!Number.isFinite(h)) return '';
  if (h <= 2) return 'le2';
  if (h <= 3) return '2to3';
  return 'gt3';
}

/** @param {object} state */
export function ensureDuracionKey(state) {
  if (state.duracionCirugiaKey) {
    var h = duracionKeyToHours(state.duracionCirugiaKey);
    if (h != null) state.duracionCirugiaHoras = String(h);
    return;
  }
  if (state.duracionCirugiaHoras) {
    state.duracionCirugiaKey = duracionHoursToKey(state.duracionCirugiaHoras);
  }
}

/** @param {object} state @param {string} key */
export function applyDuracionKey(state, key) {
  state.duracionCirugiaKey = key || '';
  var h = duracionKeyToHours(key);
  state.duracionCirugiaHoras = h != null ? String(h) : '';
}

/**
 * FC y SpO₂ del monitoreo: último turno con valor; si falta en el turno actual, turno anterior.
 * @param {unknown} monitoreoLike
 * @returns {{ fc: string, sat: string }}
 */
export function getVitalsFromMonitoreo(monitoreoLike) {
  /** @type {any} */
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial.slice() : [];
  hist.sort(function (a, b) {
    var ra = a && typeof a === 'object' && 'recordedAt' in a ? String(/** @type {any} */ (a).recordedAt) : '';
    var rb = b && typeof b === 'object' && 'recordedAt' in b ? String(/** @type {any} */ (b).recordedAt) : '';
    return rb.localeCompare(ra);
  });

  function pick(key) {
    for (var i = 0; i < hist.length; i++) {
      var row = hist[i];
      if (!row || typeof row !== 'object') continue;
      var rv =
        /** @type {any} */ (row).vitals && typeof /** @type {any} */ (row).vitals === 'object'
          ? /** @type {any} */ (row).vitals
          : {};
      var val = rv[key];
      if (val != null && val !== '') return String(val).trim();
    }
    return '';
  }

  return { fc: pick('fc'), sat: pick('sat') };
}

/** @param {object} state @param {object|null} patient */
export function applyVitalsFromMonitoreo(state, patient) {
  if (!patient || !patient.monitoreo) return false;
  var v = getVitalsFromMonitoreo(patient.monitoreo);
  var ok = false;
  if (v.fc) {
    state.fcLpm = v.fc;
    state.lastFcApplied = v.fc;
    ok = true;
  }
  if (v.sat) {
    state.spo2 = v.sat;
    ok = true;
  }
  return ok;
}

/** Horas efectivas para calculadora ARISCAT. @param {object} state */
export function effectiveDuracionHoras(state) {
  ensureDuracionKey(state);
  var fromKey = duracionKeyToHours(state.duracionCirugiaKey);
  if (fromKey != null) return fromKey;
  var h = parseFloat(String(state.duracionCirugiaHoras || '').replace(',', '.'));
  return Number.isFinite(h) ? h : null;
}

/**
 * @param {object} state
 * @param {Array<{ id: string, nombreRaw: string, suspendido?: boolean }>} medItems
 * @param {(nombre: string) => { sugerencia: string, notaEditable: string }} suggestFn
 */
export function mergeFarmacosFromMedReceta(state, medItems, suggestFn) {
  if (!state.farmacos) state.farmacos = [];
  var existing = new Set(state.farmacos.map((f) => f.sourceMedId).filter(Boolean));
  (medItems || []).forEach(function (it) {
    if (!it || it.suspendido) return;
    if (existing.has(it.id)) return;
    var sug = suggestFn(it.nombreRaw || '');
    state.farmacos.push({
      sourceMedId: it.id,
      nombreDisplay: it.nombreRaw || '',
      sugerencia: sug.sugerencia,
      notaEditable: sug.notaEditable,
      addedAt: new Date().toISOString(),
    });
    existing.add(it.id);
  });
}

/** @param {string[]} diagnosticos */
export function buildDiagnosticosFromNota(diagnosticos) {
  var lines = (diagnosticos || [])
    .map(function (d) {
      return String(d || '').trim().toUpperCase();
    })
    .filter(Boolean);
  return formatDiagnosticosCopy(lines);
}

/** @param {object} state @param {string[]} notaDx */
export function importDiagnosticosFromNota(state, notaDx) {
  var lines = (notaDx || [])
    .map(function (d) {
      return String(d || '').trim().toUpperCase();
    })
    .filter(Boolean);
  if (!lines.length) return false;
  setDiagnosticosList(state, lines);
  state.diagnosticosTouched = true;
  return true;
}

/** @param {object} state @param {string} pasteText */
export function importDiagnosticosFromPaste(state, pasteText) {
  var parsed = parseDiagnosticosText(pasteText);
  if (!parsed.length) return false;
  setDiagnosticosList(state, parsed);
  state.diagnosticosTouched = true;
  return true;
}

/**
 * @param {Array<object>|undefined} labHistoryPatient
 * @param {object|null} patient
 */
export function getLatestLabValues(labHistoryPatient, patient) {
  var hist = Array.isArray(labHistoryPatient) ? labHistoryPatient : [];
  var latest = sortLabHistoryChronological(hist)[0] || null;
  if (!latest) return null;
  var renal = getRenalLabContext(latest, patient);
  var pb = latest.parsedBySection || {};
  var flat = latest.parsed || {};
  function pick(key) {
    if (pb.QS && pb.QS[key] != null) return pb.QS[key];
    if (flat[key] != null) return flat[key];
    return null;
  }
  var hb = pick('Hb') != null ? pick('Hb') : pick('Hemoglobina');
  return {
    fecha: latest.fecha || '',
    creatinina: renal && renal.creatinineMgDl != null ? renal.creatinineMgDl : pick('Cr'),
    hemoglobina: hb,
  };
}

/** @param {object} state @param {{ creatinina?: *, hemoglobina?: *, fecha?: string }} vals */
export function applyLabValues(state, vals) {
  if (vals.creatinina != null && vals.creatinina !== '') state.creatinina = String(vals.creatinina);
  if (vals.hemoglobina != null && vals.hemoglobina !== '') state.hemoglobina = String(vals.hemoglobina);
  state.lastLabApplied = { fecha: vals.fecha || '', creatinina: state.creatinina, hemoglobina: state.hemoglobina };
}

export function applyFcFromNote(state, fc) {
  var v = String(fc || '').trim();
  if (!v) return;
  state.fcLpm = v;
  state.lastFcApplied = v;
}

/** Rellena SpO₂/FC vacíos desde monitoreo sin sobrescribir edición manual. @param {object} state @param {object|null} patient */
export function autofillVitalsFromMonitoreoIfEmpty(state, patient) {
  if (!patient || !patient.monitoreo) return;
  var v = getVitalsFromMonitoreo(patient.monitoreo);
  if (!String(state.spo2 || '').trim() && v.sat) state.spo2 = v.sat;
  if (!String(state.fcLpm || '').trim() && v.fc) {
    state.fcLpm = v.fc;
    state.lastFcApplied = v.fc;
  }
}

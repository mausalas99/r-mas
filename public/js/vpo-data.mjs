import {
  getProcedureById,
  suggestAhaClinicoFromAsa,
  ARISCAT_INCISION_POINTS,
} from './vpo-lookups.mjs';
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
    diagnosticosTouched: false,
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
  return map[patientId];
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
  if (!state.ahaClinico || state.ahaClinico === suggestAhaClinicoFromAsa(state.asaKey)) {
    state.ahaClinico = suggestAhaClinicoFromAsa(asaKey);
  }
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
  var lines = (diagnosticos || []).map(function (d) {
    return String(d || '').trim();
  }).filter(Boolean);
  return lines.map(function (d, i) {
    return i + 1 + '. ' + d;
  }).join('\n');
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

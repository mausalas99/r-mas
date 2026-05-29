import {
  GUPTA_INTERCEPT,
  getAsaByKey,
  getFunctionalByKey,
  getProcedureById,
  creatinineGuptaCoef,
  ARISCAT_INCISION_POINTS,
} from './vpo-lookups.mjs';

function num(v) {
  var n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function computeRcriPoints(rcri) {
  var r = rcri || {};
  var pts = 0;
  if (r.cardiopatiaIsquemica) pts += 1;
  if (r.insuficienciaCardiaca) pts += 1;
  if (r.evc) pts += 1;
  if (r.dmInsulina) pts += 1;
  if (r.cirugiaAltoRiesgo) pts += 1;
  return pts;
}

function rcriRiskLabel(points) {
  if (points <= 0) return { label: 'bajo (<1%)', pctClass: '0.5%' };
  if (points === 1) return { label: 'bajo-intermedio', pctClass: '~6%' };
  if (points === 2) return { label: 'intermedio', pctClass: '~10%' };
  return { label: 'alto', pctClass: '~15%' };
}

function ariscatAgePoints(edad) {
  var a = num(edad);
  if (a == null) return 0;
  if (a <= 50) return 0;
  if (a <= 80) return 3;
  return 16;
}

function ariscatSpo2Points(spo2) {
  var s = num(spo2);
  if (s == null) return 0;
  if (s >= 96) return 0;
  if (s >= 91) return 8;
  return 24;
}

function ariscatDurationPoints(hours) {
  var h = num(hours);
  if (h == null) return 0;
  if (h <= 2) return 0;
  if (h <= 3) return 16;
  return 23;
}

function ariscatRiskLabel(points) {
  if (points < 26) return { riskLabel: 'Bajo', detailPct: '~1.6%' };
  if (points <= 44) return { riskLabel: 'Intermedio', detailPct: '~13.3%' };
  return { riskLabel: 'Alto', detailPct: '~42.1%' };
}

function capriniPoints(input) {
  var c = input.caprini || {};
  var pts = 0;
  var edad = num(input.edad);
  if (edad != null && edad >= 75) pts += 3;
  if (c.imcMayor25) pts += 1;
  if (c.insuficienciaVenosa) pts += 1;
  if (c.reposoMovilidadReducida) pts += 2;
  if (c.antecedenteEvc) pts += 1;
  if (c.trombofilia) pts += 2;
  if (c.esteroideCronico) pts += 1;
  if (c.artritisInflamatoria) pts += 1;
  return pts;
}

function capriniRiskLabel(points) {
  if (points <= 2) return 'Bajo';
  if (points <= 4) return 'Moderado';
  if (points <= 7) return 'Alto';
  return 'Muy alto';
}

function guptaInterpretation(micaPercent) {
  var p = micaPercent * 100;
  if (p < 1) return 'Bajo (<1%)';
  if (p < 2) return 'Intermedio bajo (1-1.9%)';
  return 'Alto (≥2%)';
}

/**
 * @param {object} input
 */
export function computeVpoScores(input) {
  var asa = getAsaByKey(input.asaKey || '');
  var functional = getFunctionalByKey(input.functionalKey || 'independent');
  var procedure = getProcedureById(input.procedureId || '');

  var rcriPts = computeRcriPoints(input.rcri);
  var rcriMeta = rcriRiskLabel(rcriPts);

  var ariscat = input.ariscat || {};
  var ariscatPts = 0;
  ariscatPts += ariscatAgePoints(input.edad);
  ariscatPts += ariscatSpo2Points(input.spo2);
  if (ariscat.infeccionRespiratoriaUltimoMes) ariscatPts += 17;
  var hb = num(input.hemoglobina);
  if (hb != null && hb <= 10) ariscatPts += 11;
  var incKey = ariscat.incisionKey || 'peripheral';
  ariscatPts += ARISCAT_INCISION_POINTS[incKey] || 0;
  ariscatPts += ariscatDurationPoints(input.duracionCirugiaHoras);
  if (ariscat.urgente) ariscatPts += 8;
  var ariscatMeta = ariscatRiskLabel(ariscatPts);

  var capPts = capriniPoints(input);

  var guptaLinear = GUPTA_INTERCEPT;
  if (asa) guptaLinear += asa.guptaCoef;
  if (functional) guptaLinear += functional.guptaCoef;
  if (procedure) guptaLinear += procedure.guptaCoef;
  guptaLinear += creatinineGuptaCoef(input.creatinina);
  var micaPercent = 1 / (1 + Math.exp(-guptaLinear));

  return {
    asaClass: asa ? asa.asaClass : '',
    rcri: {
      points: rcriPts,
      riskLabel: rcriMeta.label,
      pctClass: rcriMeta.pctClass,
    },
    gupta: {
      linear: guptaLinear,
      micaPercent: micaPercent,
      interpretation: guptaInterpretation(micaPercent),
    },
    ariscat: {
      points: ariscatPts,
      riskLabel: ariscatMeta.riskLabel,
      detailPct: ariscatMeta.detailPct,
    },
    caprini: {
      points: capPts,
      riskLabel: capriniRiskLabel(capPts),
    },
    procedure: procedure
      ? { ahaQuirurgico: procedure.ahaQuirurgico, rcriHighRisk: procedure.rcriHighRisk }
      : null,
  };
}

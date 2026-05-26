/** Contexto renal ATB desde QS (eTFG / creatinina) del historial de laboratorio. */

import { ageYearsFromLabDemographics, computeEgfrCkdEpi2021Creatinine } from './labs.js';

function numOrNull(v) {
  if (v == null || v === '') return null;
  var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\*/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function pickQs(pb, key, flat) {
  var sec = pb && pb.QS;
  if (sec && sec[key] != null) return numOrNull(sec[key]);
  if (flat && flat[key] != null) return numOrNull(flat[key]);
  return null;
}

/**
 * @param {{ parsed?: object, parsedBySection?: object, fecha?: string, edad?: string, edadUnidad?: string, sexo?: string }|null} latestLabSet
 * @param {{ edad?: string, sexo?: string }|null} patient
 */
export function getRenalLabContext(latestLabSet, patient) {
  if (!latestLabSet) return null;
  var pb = latestLabSet.parsedBySection || {};
  var flat = latestLabSet.parsed || {};
  var cr = pickQs(pb, 'Cr', flat);
  var egfr = pickQs(pb, 'eTFG', flat);
  var source = 'lab';

  if (egfr == null && cr != null) {
    var ageRaw =
      (patient && patient.edad) ||
      latestLabSet.edad ||
      (latestLabSet.patientCtx && latestLabSet.patientCtx.edad);
    var ageUnit =
      (patient && patient.edadUnidad) ||
      latestLabSet.edadUnidad ||
      (latestLabSet.patientCtx && latestLabSet.patientCtx.edadUnidad) ||
      'años';
    var sexo =
      (patient && patient.sexo) ||
      latestLabSet.sexo ||
      (latestLabSet.patientCtx && latestLabSet.patientCtx.sexo);
    var ageY = ageYearsFromLabDemographics(ageRaw, ageUnit);
    if (ageY != null && ageY >= 18 && (sexo === 'M' || sexo === 'F')) {
      var computed = computeEgfrCkdEpi2021Creatinine(cr, ageY, sexo === 'F');
      if (computed != null) {
        egfr = Math.round(computed);
        source = 'computed';
      }
    }
  }

  if (egfr == null && cr == null) return null;

  return {
    egfr: egfr != null ? Math.round(egfr) : null,
    creatinineMgDl: cr,
    fecha: String(latestLabSet.fecha || '').trim(),
    source: source,
  };
}

/** @param {string} text */
export function parseRenalBands(text) {
  var bands = [];
  var src = String(text || '');
  if (!src.trim()) return bands;

  var rangeRe = /(?:ClCr|eTFG|TFG)\s*(\d+)\s*[–-]\s*(\d+)\s*[:：]?\s*([^;]+)/gi;
  var m;
  while ((m = rangeRe.exec(src))) {
    bands.push({
      kind: 'range',
      min: Number(m[1]),
      max: Number(m[2]),
      text: m[3].trim(),
    });
  }

  var ltRe = /(?:ClCr|eTFG|TFG)\s*[<≤]\s*(\d+)\s*[:：]?\s*([^;]+)/gi;
  while ((m = ltRe.exec(src))) {
    bands.push({
      kind: 'lt',
      threshold: Number(m[1]),
      text: m[2].trim(),
    });
  }

  var singleRe = /(?:ClCr|eTFG|TFG)\s*(\d+)\s*[:：]\s*([^;]+)/gi;
  while ((m = singleRe.exec(src))) {
    var n = Number(m[1]);
    var dup = bands.some(function (b) {
      return (
        (b.kind === 'lt' && b.threshold === n) ||
        (b.kind === 'range' && b.min <= n && b.max >= n)
      );
    });
    if (!dup) {
      bands.push({
        kind: 'lte',
        threshold: n,
        text: m[2].trim(),
      });
    }
  }

  return bands;
}

/** @param {number} egfr @param {ReturnType<typeof parseRenalBands>} bands */
export function matchRenalBand(egfr, bands) {
  if (egfr == null || !bands.length) return null;

  var rangeHit = null;
  bands.forEach(function (b) {
    if (b.kind !== 'range') return;
    if (egfr >= b.min && egfr <= b.max) rangeHit = b;
  });
  if (rangeHit) return rangeHit;

  var ltHits = bands
    .filter(function (b) {
      if (b.kind === 'lt') return egfr < b.threshold;
      if (b.kind === 'lte') return egfr <= b.threshold;
      return false;
    })
    .sort(function (a, b) {
      return (a.threshold || 0) - (b.threshold || 0);
    });
  if (ltHits.length) return ltHits[0];

  return null;
}

/**
 * @param {{ renalNote?: string, adultDose?: string }} drug
 * @param {ReturnType<typeof getRenalLabContext>|null} renalCtx
 */
export function resolveAtbRenalGuidance(drug, renalCtx) {
  if (!renalCtx || renalCtx.egfr == null) {
    return {
      hasEgfr: false,
      summaryLine: '',
      adjustment: '',
      severity: 'none',
      someComment: '',
    };
  }

  var egfr = renalCtx.egfr;
  var note = String((drug && drug.renalNote) || '').trim();
  var parts = [];
  parts.push('eTFG ' + egfr + ' mL/min/1.73m²');
  if (renalCtx.creatinineMgDl != null) {
    parts.push('Cr ' + renalCtx.creatinineMgDl + ' mg/dL');
  }
  if (renalCtx.fecha) parts.push('lab ' + renalCtx.fecha);
  var summaryLine = parts.join(' · ');

  if (/no requiere ajuste renal/i.test(note) && egfr >= 60) {
    return {
      hasEgfr: true,
      summaryLine: summaryLine,
      adjustment: 'Sin ajuste renal habitual con eTFG actual.',
      severity: 'none',
      someComment: 'eTFG ' + egfr + ' — sin ajuste renal habitual',
    };
  }

  var band = matchRenalBand(egfr, parseRenalBands(note));
  if (band) {
    var severity = egfr < 30 ? 'adjust' : 'caution';
    return {
      hasEgfr: true,
      summaryLine: summaryLine,
      adjustment: band.text,
      severity: severity,
      someComment: 'eTFG ' + egfr + ': ' + band.text,
    };
  }

  if (note && egfr < 60) {
    return {
      hasEgfr: true,
      summaryLine: summaryLine,
      adjustment: note,
      severity: egfr < 30 ? 'adjust' : 'caution',
      someComment: 'eTFG ' + egfr + ' — ' + note,
    };
  }

  return {
    hasEgfr: true,
    summaryLine: summaryLine,
    adjustment: '',
    severity: 'none',
    someComment: 'eTFG ' + egfr,
  };
}

/**
 * @param {{ name?: string, route?: string, adultDose?: string, renalNote?: string }} drug
 * @param {object|null} calcResult
 * @param {ReturnType<typeof getRenalLabContext>|null} renalCtx
 */
export function drugToSomeOrderAtb(drug, calcResult, renalCtx, drugToSomeOrderFn) {
  var order = drugToSomeOrderFn(drug, calcResult);
  var guidance = resolveAtbRenalGuidance(drug, renalCtx);
  if (guidance.someComment) {
    order.comments = [order.comments, guidance.someComment].filter(Boolean).join('; ');
  }
  return order;
}

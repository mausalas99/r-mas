import { evaluateSafetyRules } from '../../lib/clinical-safety-rules/evaluate.mjs';
import { isHistoriaClinicaSafetyHidden } from './clinical-product-policy.mjs';
import { getRenalLabContext } from './manejo-atb-renal.mjs';

/** @param {unknown} patient */
function patientAgeYears(patient) {
  if (!patient) return null;
  var raw = patient.edad;
  if (raw == null || raw === '') return null;
  var n = parseInt(String(raw).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>|null|undefined} data
 * @param {{ appConditions?: Record<string, string> }} [catalogs]
 */
export function buildAppTextForSafety(data, catalogs) {
  var src = data || {};
  var appConditions = (catalogs && catalogs.appConditions) || {};
  var app = src.app;
  if (typeof app === 'string') return app;
  if (!app || typeof app !== 'object') return '';
  var parts = [];
  if (Array.isArray(app.medicamentosActuales)) {
    app.medicamentosActuales.forEach(function (m) {
      if (!m || typeof m !== 'object') return;
      var bits = [m.medication, m.route, m.dosage, m.frequency]
        .map(function (x) {
          return x != null && String(x).trim() ? String(x).trim() : '';
        })
        .filter(Boolean);
      if (bits.length) parts.push(bits.join(' '));
    });
  } else if (app.medicamentosActuales) {
    parts.push(String(app.medicamentosActuales));
  }
  if (app.descripcionDetallada) parts.push(String(app.descripcionDetallada));
  var conditions = Array.isArray(app.conditions) ? app.conditions : [];
  for (var i = 0; i < conditions.length; i++) {
    var id = conditions[i];
    var label = appConditions[id] || id;
    if (label) parts.push(String(label));
  }
  return parts.join('\n');
}

/**
 * @param {Record<string, unknown>|null|undefined} data
 */
export function buildPeeaTextForSafety(data) {
  var src = data || {};
  var pad =
    src.padecimientoActual != null && src.padecimientoActual !== ''
      ? String(src.padecimientoActual)
      : '';
  var neg =
    src.datosNegados != null && src.datosNegados !== '' ? String(src.datosNegados) : '';
  if (pad || neg) return [pad, neg].filter(Boolean).join('\n');
  if (src.peea != null && src.peea !== '') return String(src.peea);
  return '';
}

function resolveScanTexts(opts) {
  var data = opts.data;
  var hasData = data != null && typeof data === 'object';
  var appText =
    opts.appText != null && opts.appText !== ''
      ? String(opts.appText)
      : hasData
        ? buildAppTextForSafety(data, opts.catalogs)
        : '';
  var peeaText =
    opts.peeaText != null && opts.peeaText !== ''
      ? String(opts.peeaText)
      : hasData
        ? buildPeeaTextForSafety(data)
        : '';
  return { appText, peeaText };
}

/**
 * @param {{
 *   data?: Record<string, unknown>,
 *   catalogs?: { appConditions?: Record<string, string> },
 *   appText?: string,
 *   peeaText?: string,
 *   patient?: { sexo?: string, edad?: string },
 *   latestLabSet?: object|null,
 * }} opts
 */
export function scanHistoriaClinicaSafety(opts) {
  var patient = opts.patient || {};
  var texts = resolveScanTexts(opts || {});
  var renal = getRenalLabContext(opts.latestLabSet || null, patient);
  var labContext = renal
    ? {
        egfr: renal.egfr,
        creatinineMgDl: renal.creatinineMgDl,
        fecha: renal.fecha,
        setId: opts.latestLabSet && opts.latestLabSet.id ? String(opts.latestLabSet.id) : '',
        source: renal.source,
      }
    : null;

  if (isHistoriaClinicaSafetyHidden()) {
    return { rules: [], labContext };
  }

  var fired = evaluateSafetyRules({
    appText: texts.appText,
    peeaText: texts.peeaText,
    renal: labContext,
    patient: { sexo: patient.sexo, edadYears: patientAgeYears(patient) },
  });

  return { rules: fired, labContext };
}

/**
 * @param {Array<{ id: string }>} fired
 * @param {Array<{ ruleId: string, acknowledged: boolean }>} acknowledgements
 */
export function pendingSafetyAcknowledgements(fired, acknowledgements) {
  var ackSet = new Set(
    (acknowledgements || []).filter(function (a) {
      return a && a.acknowledged && a.ruleId;
    }).map(function (a) {
      return a.ruleId;
    })
  );
  return (fired || []).filter(function (r) {
    return r && r.id && !ackSet.has(r.id);
  });
}

/**
 * @param {Array<{ id: string, severity?: string, message?: string }>} fired
 * @param {object|null} labContext
 * @param {boolean} acknowledged
 */
export function buildSafetyAuditEntries(fired, labContext, acknowledged) {
  return (fired || []).map(function (r) {
    return {
      ruleId: r.id,
      severity: r.severity || 'high',
      acknowledged: !!acknowledged,
      message: r.message || r.title || '',
      labContext: labContext || undefined,
    };
  });
}

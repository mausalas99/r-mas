/**
 * Motor de manejo electrolítico (adultos) — valores derivados de laboratorio + datos paciente.
 * Ver docs/superpowers/specs/2026-05-25-manejo-electrolitos-gasometria-design.md
 */

import { ClinicalSafetyError, planStandardKClBags } from './clinical-safety.mjs';

/** @typedef {{ medication: string, route: string, doseValue: number|string, doseUnit: string, dilution: string, frequency: string, infusionRateMlHr: number|null|string, comments: string, requiresDilution?: boolean }} SomeOrderLike */

/** @typedef {{ electrolyte: string, direction: 'hypo'|'hyper', value: number|null, unit: string, interpretation: string, severity: string, formula: string, formulaResult: string|null, suggestedDose: string, route: string, monitoring: string, alerts: string[], clinicalNotes: string[], someOrders: SomeOrderLike[], ruleId: string }} ElectrolyteRow */

const MED_KCL =
  'CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)';
const MED_NACL_HYPERT =
  'CLORURO DE SODIO HIPERT. 17.7 % SOL INY 10 ML (+)';
const MED_CA_GLUC =
  'GLUCONATO DE CALCIO 10% SOL INY';
const MED_MG_SO4 =
  'SULFATO DE MAGNESIO 50% SOL INY';
const MED_PHOS_K =
  'FOSFATO DE POTASIO 20 MEQ SOL INY 10 ML (+)';
const MED_PHOS_NA = 'FOSFATO DE SODIO SOL INY';
const MED_INSULIN =
  'INSULINA REGULAR';
const MED_D50 =
  'DEXTROSA 50% SOL INY';
const MED_SALBUTAMOL =
  'SALBUTAMOL';

const NACL_EFFECTIVE_3_MEQ_PER_ML = 0.513;
/** 17.7% ≈ 5.9× concentración efectiva ~3% (17.7/3). */
const NACL_HYPERT_TO_EFFECTIVE3_RATIO = 17.7 / 3;

/** mL de solución final ~3% eq. desde déficit mEq. */
function mlEffective3FromDeficitMeq(defNaMeq) {
  return defNaMeq > 0 ? defNaMeq / NACL_EFFECTIVE_3_MEQ_PER_ML : 0;
}

/** mL de hipertónico 17.7% para equivaler a volFinal mL ~3%. */
export function mlHypertonic177FromEffective3(mlEffective3) {
  if (mlEffective3 == null || !Number.isFinite(mlEffective3) || mlEffective3 <= 0) return 0;
  return mlEffective3 / NACL_HYPERT_TO_EFFECTIVE3_RATIO;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** @param {number} ml177 @param {number} volFinalMl */
function hypertonic177DilutionText(ml177, volFinalMl) {
  var diluent = Math.max(0, Math.round(volFinalMl - ml177));
  return (
    ' DILUIR ' +
    round1(ml177) +
    ' ML HIPERT. 17.7% EN ' +
    diluent +
    ' ML NACL AL 0.9% (~' +
    Math.round(volFinalMl) +
    ' ML FINAL ~3% EQ.)'
  );
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\*/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function pickSection(pb, section, key, parsedFlat) {
  var sec = pb && pb[section];
  if (sec && sec[key] != null) return numOrNull(sec[key]);
  if (parsedFlat && parsedFlat[key] != null) return numOrNull(parsedFlat[key]);
  return null;
}

function pickGlu(pb, parsedFlat) {
  return (
    pickSection(pb, 'QS', 'Glu', parsedFlat) ??
    pickSection(pb, 'GASES', 'GLU', parsedFlat) ??
    pickSection(pb, 'GASES', 'Glu', parsedFlat)
  );
}

function pickAlb(pb, parsedFlat) {
  return (
    pickSection(pb, 'PFHs', 'Alb', parsedFlat) ??
    pickSection(pb, 'QS', 'Alb', parsedFlat) ??
    pickSection(pb, 'BH', 'Alb', parsedFlat)
  );
}

export function toSomeUpper(s) {
  if (s == null || s === '') return '';
  return String(s).trim().toUpperCase();
}

/** @param {SomeOrderLike} order */
export function formatSomeBlock(order) {
  var o = order || {};
  var rateRaw = o.infusionRateMlHr;
  var rateStr = '';
  if (
    rateRaw !== null &&
    rateRaw !== undefined &&
    rateRaw !== '' &&
    !(typeof rateRaw === 'number' && !Number.isFinite(rateRaw))
  ) {
    var rateText = String(rateRaw).trim();
    rateStr = /mcg\/min|mg\/min|u\/min|u\/kg\/h/i.test(rateText)
      ? toSomeUpper(rateText)
      : toSomeUpper(rateText + ' CC/HR');
  }
  var dosePart =
    String(o.doseValue != null ? o.doseValue : '').trim() +
    (o.doseUnit ? ' ' + String(o.doseUnit).trim() : '');
  return (
    'MEDICAMENTO: ' +
    toSomeUpper(o.medication || '') +
    '\n' +
    'DOSIS: ' +
    toSomeUpper(dosePart.trim()) +
    '\n' +
    'VIA: ' +
    toSomeUpper(o.route || '') +
    '\n' +
    'DILUCION: ' +
    toSomeUpper(o.dilution || '') +
    '\n' +
    'FRECUENCIA: ' +
    toSomeUpper(o.frequency || '') +
    '\n' +
    'VELOCIDAD DE INFUSION: ' +
    rateStr +
    '\n' +
    'COMENTARIOS ADICIONALES: ' +
    toSomeUpper(o.comments || '')
  );
}

export function parsePatientWeightKg(patient) {
  if (!patient) return null;
  var n = numOrNull(patient.peso);
  return n != null && n > 0 ? n : null;
}

/** @returns {boolean} */
export function isCentralAccess(viaAcceso) {
  return String(viaAcceso || '').trim().toLowerCase() === 'cvc';
}

/** Periférica / PICC / vacío: mismos límites que EV periférica. */
export function kLimitsForAccess(viaAcceso) {
  if (isCentralAccess(viaAcceso)) return { maxConcMeqPerL: 80, maxMeqPerHr: 40 };
  return { maxConcMeqPerL: 40, maxMeqPerHr: 10 };
}

function accessRouteLabel(viaAcceso) {
  return isCentralAccess(viaAcceso) ? 'central (CVC)' : 'periférica / PICC';
}

/**
 * Texto breve para tarjeta UI: dosis + dilución + velocidad (sin "según institución").
 * @param {SomeOrderLike|null|undefined} order
 * @param {{ accessLabel?: string, meqPerHr?: number|null, extra?: string }} [opts]
 */
export function formatSuggestedDoseFromOrder(order, opts) {
  opts = opts || {};
  if (!order) return opts.extra || '';
  var parts = [];
  var dose = String(order.doseValue != null ? order.doseValue : '').trim();
  if (dose && order.doseUnit) parts.push(dose + ' ' + String(order.doseUnit).trim());
  if (order.dilution) parts.push('Dilución: ' + order.dilution);
  if (opts.accessLabel) parts.push('Acceso ' + opts.accessLabel);
  if (opts.meqPerHr != null && Number.isFinite(opts.meqPerHr)) {
    parts.push('Vel. reposición: ~' + opts.meqPerHr + ' mEq/h máx');
  }
  var rate = order.infusionRateMlHr;
  if (rate != null && rate !== '' && Number.isFinite(Number(rate))) {
    parts.push('Vel. infusión: ~' + Math.round(Number(rate)) + ' mL/h');
  } else if (rate != null && rate !== '') {
    parts.push('Vel. infusión: ' + rate);
  }
  if (opts.extra) parts.push(opts.extra);
  return parts.join(' · ');
}

export function tbwFactor(patient) {
  if (!patient) return 0.6;
  var s = String(patient.sexo || '').trim().toUpperCase();
  return s === 'F' ? 0.5 : 0.6;
}

/** Calcio total corregido (mg/dL) por albúmina (g/dL). */
export function correctedCalcium(ca, alb) {
  var caN = numOrNull(ca);
  var albN = numOrNull(alb);
  if (caN == null || albN == null || !Number.isFinite(caN) || !Number.isFinite(albN)) return null;
  var v = caN + 0.8 * (4.0 - albN);
  return Math.round(v * 100) / 100;
}

function kHypoSeverity(k) {
  if (k == null || !Number.isFinite(k)) return null;
  if (k < 2.5) return 'grave';
  if (k < 3.0) return 'moderada';
  if (k < 3.5) return 'leve';
  return null;
}

function kHyperSeverity(k) {
  if (k == null || !Number.isFinite(k)) return null;
  if (k >= 6.5) return 'emergencia';
  if (k >= 6.0) return 'moderada';
  if (k >= 5.5) return 'leve';
  return null;
}

function naHypoSeverity(na) {
  if (na == null || !Number.isFinite(na)) return null;
  if (na >= 134) return null;
  if (na < 125) return 'grave';
  return 'moderada';
}

function naHyperSeverity(na) {
  if (na == null || !Number.isFinite(na)) return null;
  if (na <= 145) return null;
  if (na <= 150) return 'leve';
  if (na <= 160) return 'moderada';
  return 'grave';
}

function mgHypoSeverity(mg) {
  if (mg == null || !Number.isFinite(mg)) return null;
  if (mg < 1.0) return 'grave';
  if (mg < 1.5) return 'moderada';
  return null;
}

/** Fósforo (ESC clave `F`), mg/dL */
function phosHypoSeverity(pMgDl) {
  if (pMgDl == null || !Number.isFinite(pMgDl)) return null;
  if (pMgDl < 1.0) return 'grave';
  if (pMgDl < 2.0) return 'moderada';
  return null;
}

/** @param {number} bagMeq @param {number} bagVol @param {number} maxConc @param {number} bagIndex @param {number} bagCount */
function kHypoDilutionText(bagMeq, bagVol, maxConc, bagIndex, bagCount) {
  var suffix =
    bagCount > 1 ? ' (BOLSA ' + bagIndex + '/' + bagCount + ')' : '';
  return (
    bagVol +
    ' ML SOL SALINA AL 0.9% (' +
    Math.round(bagMeq * 10) / 10 +
    ' MEQ / ' +
    bagVol +
    ' ML; CONC. ≤' +
    maxConc +
    ' MEQ/L)' +
    suffix
  );
}

/** @param {{ volMl: number, meq: number }} bag @param {number} idx @param {number} count */
function kOrderFromBag(bag, idx, count, maxConc, routeLabel, mEqPerHrRaw, totalMeq) {
  return {
    medication: MED_KCL,
    route: routeLabel,
    doseValue: Math.round(bag.meq * 10) / 10,
    doseUnit: 'MEQ',
    dilution: kHypoDilutionText(bag.meq, bag.volMl, maxConc, idx + 1, count),
    infusionRateMlHr: Math.round((mEqPerHrRaw / totalMeq) * bag.volMl),
    requiresDilution: true,
  };
}

/**
 * @returns {{ orders: SomeOrderLike[], volMl: number, mEqPerHr: number }}
 */
function buildKHypoOrders(mEqChosen, limits, etaLow, routeLabel) {
  var maxConc = limits.maxConcMeqPerL;
  var plan = planStandardKClBags(mEqChosen, maxConc);
  var bags = plan.bags;

  var mEqPerHrRaw = etaLow ? Math.min(limits.maxMeqPerHr, 10) : limits.maxMeqPerHr;
  if (etaLow && mEqPerHrRaw > 10) mEqPerHrRaw = 10;

  var volMl = 0;
  for (var v = 0; v < bags.length; v += 1) volMl += bags[v].volMl;

  var orders = bags.map(function (bag, idx) {
    return kOrderFromBag(bag, idx, bags.length, maxConc, routeLabel, mEqPerHrRaw, mEqChosen);
  });

  return { orders: orders, volMl: volMl, mEqPerHr: mEqPerHrRaw };
}

/**
 * @param {'grave'|'moderada'} phs
 * @param {number} mmLo
 * @param {number} mmHi
 * @param {number|null} kVal
 * @returns {{ orders: SomeOrderLike[], mmTarget: number, mmolPerHr: number, usePotassium: boolean }}
 */
function buildPhosHypoOrders(phs, mmLo, mmHi, kVal) {
  var usePotassium = !(kVal != null && kVal >= 4.0);
  var mmTarget =
    phs === 'grave'
      ? Math.min(mmHi, 30)
      : Math.max(mmLo, Math.round(((mmLo + mmHi) / 2) * 10) / 10);
  var volMl = phs === 'grave' ? 500 : 250;
  var hours = phs === 'grave' ? 8 : 10;
  var mmolPerHr = Math.round((mmTarget / hours) * 10) / 10;
  var med = usePotassium ? MED_PHOS_K : MED_PHOS_NA;

  return {
    orders: [
      {
        medication: med,
        route: 'INTRAVENOSA',
        doseValue: mmTarget,
        doseUnit: 'MMOL P',
        dilution: volMl + ' ML SOL SALINA AL 0.9% EN ' + hours + ' H',
        infusionRateMlHr: Math.round((mmolPerHr / mmTarget) * volMl),
        requiresDilution: true,
      },
    ],
    mmTarget: mmTarget,
    mmolPerHr: mmolPerHr,
    usePotassium: usePotassium,
  };
}

/** @param {'grave'|'moderada'} severity @param {number|null} mlEffective3 */
function buildNaHypoSomeOrders(severity, mlEffective3) {
  if (severity === 'grave') {
    var volFinalLow = 100;
    var volFinalHigh = 150;
    var ml177Low = Math.round(mlHypertonic177FromEffective3(volFinalLow));
    var ml177High = Math.round(mlHypertonic177FromEffective3(volFinalHigh));
    return [
      {
        medication: MED_NACL_HYPERT,
        route: 'INTRAVENOSA',
        doseValue: String(ml177Low) + '–' + String(ml177High),
        doseUnit: 'ML',
        dilution:
          hypertonic177DilutionText(ml177Low, volFinalLow) +
          ' O ' +
          hypertonic177DilutionText(ml177High, volFinalHigh) +
          '; BOLUS 10–20 MIN',
        infusionRateMlHr: 600,
        requiresDilution: true,
      },
    ];
  }

  var volFinal = 150;
  var ml177 = 20;
  if (mlEffective3 != null && mlEffective3 > 0 && mlEffective3 <= 150) {
    volFinal = Math.max(100, Math.round(mlEffective3));
    ml177 = Math.max(10, Math.round(mlHypertonic177FromEffective3(volFinal)));
  }

  return [
    {
      medication: MED_NACL_HYPERT,
      route: 'INTRAVENOSA',
      doseValue: ml177,
      doseUnit: 'ML',
      dilution: hypertonic177DilutionText(ml177, volFinal),
      infusionRateMlHr: 300,
      requiresDilution: true,
    },
  ];
}

/**
 * @param {{
 *   parsedBySection?: Record<string, Record<string, number|string>>,
 *   parsed?: Record<string, number|string>,
 *   patient?: { peso?: string|number, sexo?: string, viaAcceso?: string },
 *   refsBySection?: unknown,
 *   labSetId?: string,
 *   labFecha?: string,
 * }} ctx
 */
export function evaluateElectrolyteManejo(ctx) {
  ctx = ctx || {};
  var pb = ctx.parsedBySection || {};
  var flat = ctx.parsed || {};
  var patient = ctx.patient || {};

  /** @type ElectrolyteRow[] */
  var rows = [];
  /** @type string[] */
  var crossAlerts = [];

  var w = parsePatientWeightKg(patient);
  var fTbw = tbwFactor(patient);
  var limits = kLimitsForAccess(patient.viaAcceso);
  var routeIv = 'INTRAVENOSA';
  var eTFG = pickSection(pb, 'QS', 'eTFG', flat);
  var etaLow = eTFG != null && eTFG < 30;

  var kVal = pickSection(pb, 'ESC', 'K', flat);
  var naVal = pickSection(pb, 'ESC', 'Na', flat);
  var caVal = pickSection(pb, 'ESC', 'Ca', flat);
  var albVal = pickAlb(pb, flat);
  var cc = correctedCalcium(caVal, albVal);
  var mgVal = pickSection(pb, 'ESC', 'Mg', flat);
  var pMgDl = pickSection(pb, 'ESC', 'F', flat);

  var glu = pickGlu(pb, flat);

  /** @type {string[]} */
  var kHypoAlerts = [];
  /** @type {string[]} */
  var mgAlerts = [];

  /** K hipokalemia */
  var ks = kHypoSeverity(kVal);
  if (ks) {
    if (etaLow)
      kHypoAlerts.push('IRC (eTFG <30): considerar −50% dosis K inicial y vigilancia estrecha');
    var defStr = null;
    var defEq = null;
    if (w != null && kVal != null) {
      defEq = (4.0 - kVal) * w * 0.4;
      defStr =
        Math.round(defEq * 10) / 10 +
        ' mEq estimados (formula (4−K)×peso×0.4)';
    }

    var mEqBase =
      ks === 'grave'
        ? 40
        : ks === 'moderada'
          ? 30
          : 25;
    if (etaLow) mEqBase = Math.round((mEqBase * 0.5) / 5) * 5;

    var mEqUse = Math.max(10, Math.min(mEqBase, etaLow ? 20 : 40));

    /** @type {{ orders: SomeOrderLike[], volMl: number, mEqPerHr: number }} */
    var kPack;
    try {
      kPack = buildKHypoOrders(mEqUse, limits, etaLow, routeIv);
    } catch (planErr) {
      if (planErr instanceof ClinicalSafetyError) {
        kHypoAlerts.push('Reposición K+ no calculada: ' + planErr.message);
        kPack = { orders: [], volMl: 0, mEqPerHr: 0 };
      } else {
        throw planErr;
      }
    }
    var someKs = kPack.orders;
    var kOrder = someKs[0];

    rows.push({
      electrolyte: 'K',
      direction: 'hypo',
      value: kVal,
      unit: 'mEq/L',
      interpretation: 'HIPOPOTASEMIA ' + ks.toUpperCase(),
      severity: ks,
      formula: defEq != null ? '(4−K)×peso×0.4' : '',
      formulaResult: defStr,
      suggestedDose: kOrder
        ? formatSuggestedDoseFromOrder(kOrder, {
            accessLabel: accessRouteLabel(patient.viaAcceso),
            meqPerHr: kPack.mEqPerHr,
          })
        : '',
      route: routeIv,
      monitoring: 'Ionograma y ECG si procede; repetir K en 4–6 h.',
      alerts: kHypoAlerts.concat(),
      clinicalNotes: ks === 'grave' ? ['Evitar dex en hipo K grave.', 'Preferir bomba IV.'] : [],
      someOrders: someKs,
      ruleId: 'k-hypo-' + ks,
    });
  }

  var khyp = ks;

  /** K hipercalemia emergencia */
  var khypS = kHyperSeverity(kVal);
  if (khypS === 'emergencia') {
    /** @type SomeOrderLike[] */
    var em = [];

    em.push({
      medication: MED_CA_GLUC,
      route: routeIv,
      doseValue: '10–20',
      doseUnit: 'ML',
      dilution:
        glu != null && glu >= 250
          ? 'BOLO IV 2–5 MIN (REPETIBLE SI ALTERACION DE ECG)'
          : 'BOLO IV 2–5 MIN',
      infusionRateMlHr: 120,
      requiresDilution: false,
    });

    em.push({
      medication: MED_INSULIN,
      route: routeIv,
      doseValue: 10,
      doseUnit: 'U',
      dilution:
        glu != null && glu < 250 ? 'MAS DEXTROSA 50% SI GLU <250 MG/DL' : 'REVISAR GLUCEMIA',
      infusionRateMlHr: 'SEGUN BOMBA / PROTOCOLO',
      requiresDilution: false,
    });

    if (glu != null && glu < 250) {
      em.push({
        medication: MED_D50,
        route: routeIv,
        doseValue: 50,
        doseUnit: 'ML',
        dilution:
          'TRAS INSULINA; MONITORIZAR GLUCEMIA C/30–60 MIN X 4–6 H',
        infusionRateMlHr: null,
        requiresDilution: false,
      });
    }

    em.push({
      medication: MED_SALBUTAMOL,
      route: 'NEBULIZACION',
      doseValue: '10–20',
      doseUnit: 'MG',
      dilution: 'EN 4 ML SS AL 0.9% (NEBULIZADO)',
      infusionRateMlHr: null,
      requiresDilution: false,
    });

    rows.push({
      electrolyte: 'K',
      direction: 'hyper',
      value: kVal,
      unit: 'mEq/L',
      interpretation: 'HIPERPOTASEMIA GRAVE / URGENCIA',
      severity: 'emergencia',
      formula: '',
      formulaResult: glu != null ? 'Glucosa concurrente ' + glu + ' mg/dL' : null,
      suggestedDose: 'Secuencia estabilización membrana + desplazo K intracelular',
      route: routeIv,
      monitoring: 'K cada 2 h; ECG; glucometría recurrente.',
      alerts: ['Kayexalate no recomendado en esta guía v1.', 'Valorar dialisis si refractario.'],
      clinicalNotes:
        glu == null ? ['Registrar glucosa QS/gasometria para regimen insulina + dextrosa.'] : [],
      someOrders: em,
      ruleId: 'k-hyper-emergencia',
    });
  }

  /** Na hiponatremia — volumen/deficit texto */
  var ns = naHypoSeverity(naVal);
  if (ns && w != null) {
    var tbwTot = fTbw * w;
    var defNaMeq = tbwTot * (140 - naVal);
    var mlEffective3 = mlEffective3FromDeficitMeq(defNaMeq);
    var ml177 = mlHypertonic177FromEffective3(mlEffective3);
    rows.push({
      electrolyte: 'Na',
      direction: 'hypo',
      value: naVal,
      unit: 'mEq/L',
      interpretation: 'HIPONATREMIA ' + ns.toUpperCase(),
      severity: ns,
      formula:
        'TBW×(140−Na); vol. final ~3% eq.≈mEq÷' +
        String(NACL_EFFECTIVE_3_MEQ_PER_ML) +
        '; mL 17.7%=vol÷' +
        round1(NACL_HYPERT_TO_EFFECTIVE3_RATIO),
      formulaResult:
        'Deficit ~' +
        round1(defNaMeq) +
        ' mEq; ~' +
        round1(mlEffective3) +
        ' mL final ~3% eq.; hipert. 17.7% ~' +
        round1(ml177) +
        ' mL (diluir en SS 0.9%)',
      suggestedDose:
        ns === 'grave'
          ? 'Hipert. 17.7% diluido a ~100–150 mL final ~3% eq.; bolo IV 10–20 min si sintomático grave'
          : 'Hipert. 17.7% p. ej. 20 mL + 130 mL NaCl 0.9% (~150 mL ~3% eq.) en ~30 min; gradual (<10 mEq/L/24 h)',
      route: routeIv,
      monitoring: 'Na cada 4–8 h inicialmente; neurologico.',
      alerts: [],
      clinicalNotes:
        ns === 'grave'
          ? [
              'Sin NaCl al 3% en vademecum HU: preparar con hipert. 17.7% + dilución a ~3% equivalente.',
              'No corregir >10 mEq/L/24 h salvo urgencia neurologica dirigida.',
              'Valorar causa (SIADH, etc.).',
            ]
          : [
              'Sin NaCl al 3% en vademecum HU: diluir hipert. 17.7% en NaCl 0.9% hasta ~3% equivalente.',
              'Respetar tasas maximas recomendadas.',
            ],
      someOrders: buildNaHypoSomeOrders(ns, mlEffective3),
      ruleId: 'na-hypo-' + ns,
    });
  } else if (ns && w == null) {
    rows.push({
      electrolyte: 'Na',
      direction: 'hypo',
      value: naVal,
      unit: 'mEq/L',
      interpretation: 'HIPONATREMIA — FALTA PESO PARA TBW/DEFICIT',
      severity: ns,
      formula:
        'TBW×(140−Na); vol. ~3% eq.≈mEq÷' +
        NACL_EFFECTIVE_3_MEQ_PER_ML +
        '; mL 17.7%=vol÷' +
        round1(NACL_HYPERT_TO_EFFECTIVE3_RATIO),
      formulaResult: null,
      suggestedDose: '',
      route: '',
      monitoring: '',
      alerts: [],
      clinicalNotes: ['Indicar peso en datos del paciente para estimar déficit hidrosodio.'],
      someOrders: [],
      ruleId: 'na-hypo-no-weight',
    });
  }

  /** Na hiper */
  var nhs = naHyperSeverity(naVal);
  if (nhs && w != null) {
    var tbwTot2 = fTbw * w;
    var fwd = tbwTot2 * (naVal / 140 - 1);
    rows.push({
      electrolyte: 'Na',
      direction: 'hyper',
      value: naVal,
      unit: 'mEq/L',
      interpretation: 'HIPERNATREMIA ' + nhs.toUpperCase(),
      severity: nhs,
      formula: 'Agua libre deficit (L)=TBW×((Na/140)−1); TBW=F×peso',
      formulaResult:
        (fwd > 0 ? '~' + Math.round(fwd * 1000) / 1000 + ' L aprox.' : 'Marginal por formula') +
        '; TBW usado ~' +
        Math.round(tbwTot2 * 10) / 10 +
        ' L',
      suggestedDose: 'Corregir despacio (<10–12 mEq/L/24 h); D5W o hipotonica segun contexto volumen.',
      route: routeIv,
      monitoring: 'Na y estado de volumen frecuentes.',
      alerts: [],
      clinicalNotes:
        fwd > 0
          ? ['Hipovolemico puede requerir fase isotonica inicial; hipervolemico: diureticos, etc.']
          : [],
      someOrders: [],
      ruleId: 'na-hyper-' + nhs,
    });
  }

  /** Mg hipo */
  var mags = mgHypoSeverity(mgVal);
  if (mags) {
    var gMgEq = mags === 'grave' ? 24 : 20;
    if (etaLow) gMgEq = Math.round(gMgEq * 0.5);

    mgAlerts = mgAlerts.concat();
    if (etaLow)
      mgAlerts.push('IRC (eTFG <30): dosis Mg reducida 50%; monitoreo neuromuscular acentuado');

    var volMg = mags === 'grave' ? 250 : 500;
    var mgMeq = gMgEq;
    var mgHours = mags === 'grave' ? 0.5 : 6;
    var mgMlHr =
      mags === 'grave'
        ? Math.round(volMg / 0.5)
        : Math.round(volMg / mgHours);

    var mgOrder = {
      medication: MED_MG_SO4,
      route: routeIv,
      doseValue: mgMeq,
      doseUnit: 'MEQ Mg (~' + Math.round(mgMeq / 4) + ' mL MgSO4 50%)',
      dilution:
        volMg +
        ' ML SOL SALINA AL 0.9%' +
        (mags === 'grave' ? ' EN 15–60 MIN' : ' EN 4–8 H'),
      infusionRateMlHr: mgMlHr,
      requiresDilution: true,
    };

    rows.push({
      electrolyte: 'Mg',
      direction: 'hypo',
      value: mgVal,
      unit: 'mg/dL',
      interpretation: 'HIPOMAGNESEMIA ' + mags.toUpperCase(),
      severity: mags,
      formula: etaLow ? 'Dosis Mg ajustada a eTFG' : '',
      formulaResult: etaLow ? '−50% por eTFG <30' : null,
      suggestedDose: formatSuggestedDoseFromOrder(mgOrder, {
        accessLabel: accessRouteLabel(patient.viaAcceso),
      }),
      route: routeIv,
      monitoring: 'Reflejos/PFR; Mg serico y K asociados.',
      alerts: mgAlerts,
      clinicalNotes: [],
      someOrders: [mgOrder],
      ruleId: 'mg-hypo-' + mags,
    });
  }

  /** P / fosforo hipo — mmol/kg 0.16–0.32 */
  var phs = phosHypoSeverity(pMgDl);
  if (phs && w != null) {
    var mmLo = Math.round(w * 0.16 * 10) / 10;
    var mmHi = Math.round(w * 0.32 * 10) / 10;

    var phPack = !etaLow ? buildPhosHypoOrders(phs, mmLo, mmHi, kVal) : null;
    var phOrder = phPack && phPack.orders[0] ? phPack.orders[0] : null;
    var phSuggested = etaLow
      ? 'IRC (eTFG <30): evitar fosfato IV; si imprescindible: ≤' +
        Math.round(mmLo * 0.5 * 10) / 10 +
        ' mmol en 250 mL SS 0.9%, ≤4 mmol/h, monitor Ca/Mg/K'
      : formatSuggestedDoseFromOrder(phOrder, {
          extra: phPack && !phPack.usePotassium ? 'Usar fosfato de sodio (K ≥4 mEq/L)' : null,
        });

    rows.push({
      electrolyte: 'P',
      direction: 'hypo',
      value: pMgDl,
      unit: 'mg/dL',
      interpretation: 'HIPOFOSFATEMIA ' + phs.toUpperCase(),
      severity: phs,
      formula: '0.16–0.32 mmol/kg IV (grave-moderado; max 90 mmol/dia)',
      formulaResult: '~' + mmLo + '–' + mmHi + ' mmol para peso corporal actual',
      suggestedDose: phSuggested,
      route: routeIv,
      monitoring: 'Ca ionico / total; Mg; K funcion renal.',
      alerts: etaLow ? ['IRC: evitar o extremar precauciones con P IV.'] : [],
      clinicalNotes:
        kVal != null && kVal < 3.8 && phPack && phPack.usePotassium
          ? ['Fosfato de potasio aporta K+; vigilar hipocalcemia antes de iniciar.']
          : [],
      someOrders: phPack ? phPack.orders : [],
      ruleId: 'p-hypo-' + phs,
    });
  }

  /** Ca corregido hipo (<8.5) */
  if (caVal != null && cc != null && cc < 8.5) {
    var caOrder = {
      medication: MED_CA_GLUC,
      route: routeIv,
      doseValue: cc < 7.5 ? '20' : '10–20',
      doseUnit: 'ML (1–2 G)',
      dilution: 'IV DIRECTO O DILUIDO EN 50–100 ML D5W/SS 0.9%',
      infusionRateMlHr: cc < 7.5 ? 200 : 100,
      requiresDilution: false,
    };

    rows.push({
      electrolyte: 'Ca',
      direction: 'hypo',
      value: cc,
      unit: 'mg/dL (corr.)',
      interpretation: 'HIPOCALCAMIA FUNCION CALCIO CORREGIDO (<8.5)',
      severity: cc < 7.5 ? 'grave' : 'moderada',
      formula: 'Ca total + 0.8×(4−Alb)',
      formulaResult: String(cc),
      suggestedDose:
        formatSuggestedDoseFromOrder(caOrder) + ' · Administrar en 10–20 min con monitor ECG',
      route: routeIv,
      monitoring: 'ECG si sintomatico; Ca total/ionizado seriados.',
      alerts: [],
      clinicalNotes:
        albVal == null ? ['Alb faltante impide corroboracion; interpretar ionograma/clinica.'] : [],
      someOrders: [caOrder],
      ruleId: 'ca-hypo-corrected',
    });
  }

  /** Alertas cruzadas */
  if (khyp && mags != null && kVal != null && kVal < 3.5 && mgVal != null && mgVal < 1.5) {
    crossAlerts.push('Corregir magnesio antes del potasio (K refractario con hipomagnesemia)');
  }

  var caLow = cc != null && cc < 8.5 && caVal != null;
  var pLow = phs != null;
  if (caLow && pLow) {
    crossAlerts.push('Normalizar calcio antes de fosforo IV (riesgo tetania)');
  }

  var hasAlterations = rows.some(function (r) {
    return (
      ['K', 'Na', 'Mg', 'P', 'Ca'].indexOf(String(r.electrolyte)) >= 0 && r.direction
    );
  });

  return { rows: rows, crossAlerts: crossAlerts, hasAlterations: hasAlterations };
}

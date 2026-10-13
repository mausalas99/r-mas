/** VPO scales computed from published coefficients. Procedure ids match PROCEDURES in vpo-lookups.mjs. */

const logistic = (x) => 1 / (1 + Math.exp(-x));
const pct = (p) => Math.round(p * 1000) / 10;

/** Gupta per procedure category: [respiratory failure, pneumonia, MICA]. */
const GUPTA_PROC = {
  'gupta-anorectal': [-1.353, -0.847, -0.16],
  'gupta-aortic': [1.0781, 0.7178, 1.6],
  'gupta-bariatric': [-1.0112, -0.6282, -0.25],
  'gupta-brain': [0.7336, 0.6841, 1.4],
  'gupta-breast': [-2.6462, -2.3318, -1.61],
  'gupta-cardiac': [0.2744, 0.1382, 1.01],
  'gupta-ent': [0.106, -0.3665, 0.71],
  'gupta-foregut-hpb': [0.9694, 1.066, 1.39],
  'gupta-gallbladder-appendix': [-0.5668, -0.3951, 0.59],
  'gupta-hernia': [0, 0, 0],
  'gupta-intestinal': [0.5737, 0.6169, 1.14],
  'gupta-neck-thyroid': [-0.5271, -0.0872, 0.18],
  'gupta-ob-gyn': [-1.2431, -0.4101, 0.76],
  'gupta-orthopedic': [-0.8577, -0.5415, 0.8],
  'gupta-abdomen-other': [0.2416, 0.4021, 1.13],
  'gupta-peripheral-vascular': [-0.2389, -0.4519, 0.86],
  'gupta-skin': [-0.3206, -0.5075, 0.54],
  'gupta-spine': [-0.522, -0.5672, 0.21],
  'gupta-thoracic': [0.6715, 0.8901, 0.4],
  'gupta-vein': [-2.008, -1.476, -1.09],
  'gupta-urology': [0.3093, 0.1076, -0.26],
};

/** ASA I..V and functional status: [respiratory failure, pneumonia, MICA]. */
const GUPTA_ASA = {
  1: [-3.5265, -3.0225, -5.17],
  2: [-2.0008, -1.6057, -3.29],
  3: [-0.6201, -0.4915, -1.92],
  4: [0.2441, 0.0123, -0.95],
  5: [0, 0, 0],
};
const GUPTA_FUNC = {
  independent: [0, 0, 0],
  'partially-dependent': [0.7678, 0.7653, 0.65],
  'totally-dependent': [1.4046, 0.94, 1.03],
};
/** Sepsis: none | sirs | sepsis | shock. */
const GUPTA_SEPSIS = {
  none: [-0.784, -0.7641],
  sirs: [0, 0],
  sepsis: [0.2752, -0.0842],
  shock: [0.9035, 0.1048],
};

/**
 * @param {{ asa: number, functional: string, sepsis: string, emergency: boolean, procedureId: string }} i
 * @returns {number|null} % risk, or null when an input is unknown
 */
export function guptaRespiratoryFailure(i) {
  var proc = GUPTA_PROC[i.procedureId], asa = GUPTA_ASA[i.asa], fn = GUPTA_FUNC[i.functional], sep = GUPTA_SEPSIS[i.sepsis];
  if (!proc || !asa || !fn || !sep) return null;
  return pct(logistic(-1.7397 + proc[0] + asa[0] + fn[0] + sep[0] + (i.emergency ? 0 : -0.5739)));
}

/**
 * @param {{ age: number, copd: boolean, asa: number, functional: string, sepsis: string, smoker: boolean, procedureId: string }} i
 * @returns {number|null} % risk, or null when an input is unknown
 */
export function guptaPneumonia(i) {
  var proc = GUPTA_PROC[i.procedureId], asa = GUPTA_ASA[i.asa], fn = GUPTA_FUNC[i.functional], sep = GUPTA_SEPSIS[i.sepsis];
  if (!proc || !asa || !fn || !sep || !Number.isFinite(i.age)) return null;
  var x = -2.8977 + 0.0144 * i.age + proc[1] + asa[1] + fn[1] + sep[1] + (i.copd ? 0 : -0.4553) + (i.smoker ? 0 : -0.4306);
  return pct(logistic(x));
}

/**
 * Gupta MICA: intra/postoperative MI or cardiac arrest, % at 30 days.
 * @param {{ age: number, asa: number, functional: string, creatinine: number|null, procedureId: string }} i creatinine in mg/dL, null = unknown
 * @returns {number|null}
 */
export function guptaMica(i) {
  var proc = GUPTA_PROC[i.procedureId], asa = GUPTA_ASA[i.asa], fn = GUPTA_FUNC[i.functional];
  if (!proc || !asa || !fn || !Number.isFinite(i.age)) return null;
  var cr = i.creatinine == null || !Number.isFinite(i.creatinine) ? -0.1 : i.creatinine > 1.5 ? 0.61 : 0;
  return pct(logistic(-5.25 + 0.02 * i.age + proc[2] + asa[2] + fn[2] + cr));
}

/** Caprini 2005 category by total points. */
export function capriniCategory(points) {
  if (points >= 9) return 'Riesgo más alto';
  if (points >= 5) return 'Riesgo alto';
  if (points >= 3) return 'Riesgo moderado';
  if (points >= 1) return 'Riesgo bajo';
  return 'Riesgo mínimo';
}

/** AUB-HAS2: six yes/no items, 1 point each. Risk of death, MI or stroke. */
const AUB_RISK = [0.3, 1.6, 5.6, 11, 17.5];

/**
 * @param {{ age: number, hb: number, heartDisease: boolean, anginaOrDyspnea: boolean, vascularSurgery: boolean, emergency: boolean }} i
 * @returns {{ points: number, riskPct: number }|null}
 */
export function aubHas2(i) {
  if (!Number.isFinite(i.age) || !Number.isFinite(i.hb)) return null;
  var points = [i.age >= 75, i.hb < 12, i.heartDisease, i.anginaOrDyspnea, i.vascularSurgery, i.emergency].filter(Boolean).length;
  return { points: points, riskPct: AUB_RISK[Math.min(points, 4)] };
}

/**
 * AHA/ACC perioperative cardiovascular risk: elevated when any supplied calculator crosses its cutoff
 * (RCRI >1 point, Gupta MICA >1%, AUB-HAS2 >=2 points). Omit a calculator to leave it out.
 * @param {{ rcriPoints?: number, micaPct?: number|null, aubPoints?: number }} i
 * @returns {'Bajo'|'Elevado'}
 */
export function ahaCvRisk(i) {
  var elevated = i.rcriPoints > 1 || i.micaPct > 1 || i.aubPoints >= 2;
  return elevated ? 'Elevado' : 'Bajo';
}

const spo2Points = (v) => (v <= 90 ? 24 : v <= 95 ? 8 : 0);

/**
 * ARISCAT (Canet 2010). Band rates are the derivation-cohort figures.
 * @param {{ age: number, spo2: number, respInfection: boolean, anemia: boolean, incision: 'peripheral'|'upperAbdominal'|'intrathoracic', hours: number, emergency: boolean }} i
 * @returns {{ points: number, group: 'Bajo'|'Intermedio'|'Alto', pct: number }|null}
 */
export function ariscat(i) {
  if (!Number.isFinite(i.age) || !Number.isFinite(i.spo2) || !Number.isFinite(i.hours)) return null;
  var incision = { peripheral: 0, upperAbdominal: 15, intrathoracic: 24 }[i.incision];
  if (incision == null) return null;
  var points =
    (i.age > 80 ? 16 : i.age > 50 ? 3 : 0) +
    spo2Points(i.spo2) +
    (i.respInfection ? 17 : 0) +
    (i.anemia ? 11 : 0) +
    incision +
    (i.hours > 3 ? 23 : i.hours >= 2 ? 16 : 0) +
    (i.emergency ? 8 : 0);
  var band = points >= 45 ? ['Alto', 42.1] : points >= 26 ? ['Intermedio', 13.3] : ['Bajo', 1.6];
  return { points: points, group: band[0], pct: band[1] };
}

/** RCRI (Lee 1999): six criteria, 1 point each. Percents are the pooled derivation + validation rates. */
export function rcri(i) {
  var points = [i.highRiskSurgery, i.ischemicHeart, i.heartFailure, i.cerebrovascular, i.insulin, i.creatinine > 2].filter(Boolean).length;
  return { points: points, cls: ['I', 'II', 'III', 'IV'][Math.min(points, 3)], pct: [0.5, 1.1, 5, 10][Math.min(points, 3)] };
}

/** AHA/ACC 2024/2026 Figure 1: any one of these prompts team-based consultation at any calculated risk. */
export const AHA_RISK_MODIFIERS = [
  'Valvulopatía severa',
  'Hipertensión pulmonar severa',
  'Cardiopatía congénita de riesgo elevado',
  'Stent coronario o CABG previo',
  'EVC reciente',
  'Dispositivo cardiaco implantable (marcapasos o DAI)',
  'Fragilidad',
];

const count = (flags) => flags.filter(Boolean).length;

/**
 * STOP-Bang (Chung 2008, 2012), three tiers. A score of 3–4 becomes high with 2+ STOP items plus male, BMI >35 or neck >=40 cm.
 * @param {{ snoring: boolean, tired: boolean, observed: boolean, pressure: boolean, bmi35: boolean, age: number, neck40: boolean, male: boolean }} i
 * @returns {{ points: number, risk: 'Bajo'|'Intermedio'|'Alto' }|null}
 */
export function stopBang(i) {
  if (!Number.isFinite(i.age)) return null;
  var stop = count([i.snoring, i.tired, i.observed, i.pressure]);
  var points = stop + count([i.bmi35, i.age > 50, i.neck40, i.male]);
  var upgrade = stop >= 2 && (i.male || i.bmi35 || i.neck40);
  return { points: points, risk: points >= 5 || upgrade ? 'Alto' : points >= 3 ? 'Intermedio' : 'Bajo' };
}

/** HAS-BLED major bleeding %/year (Lip 2011), index = points 0..5. */
const BLED_PCT = [0.9, 3.4, 4.1, 5.8, 8.9, 9.1];

/**
 * HAS-BLED (Pisters 2010), one point each.
 * @param {{ htn: boolean, renal: boolean, liver: boolean, stroke: boolean, bleeding: boolean, labileInr: boolean, age: number, drugs: boolean, alcohol: boolean }} i
 * @returns {{ points: number, risk: 'Bajo'|'Moderado'|'Alto'|'Muy alto', pct: number|null }|null}
 */
export function hasBled(i) {
  if (!Number.isFinite(i.age)) return null;
  var points = count([i.htn, i.renal, i.liver, i.stroke, i.bleeding, i.labileInr, i.age > 65, i.drugs, i.alcohol]);
  var risk = points > 5 ? 'Muy alto' : points >= 3 ? 'Alto' : points === 2 ? 'Moderado' : 'Bajo';
  return { points: points, risk: risk, pct: BLED_PCT[points] == null ? null : BLED_PCT[points] };
}

/** CHA2DS2-VASc ischemic stroke %/year without anticoagulation (Friberg 2012), index = points 0..9. */
const CHADS_PCT = [0.2, 0.6, 2.2, 3.2, 4.8, 7.2, 9.7, 11.2, 10.8, 12.2];

/**
 * CHA2DS2-VASc (Lip 2010).
 * @param {{ hf: boolean, htn: boolean, age: number, dm: boolean, stroke: boolean, vascular: boolean, female: boolean }} i
 * @returns {{ points: number, strokePct: number }|null}
 */
export function cha2ds2Vasc(i) {
  if (!Number.isFinite(i.age)) return null;
  var points = count([i.hf, i.htn, i.dm, i.vascular, i.female]) + (i.stroke ? 2 : 0) + (i.age >= 75 ? 2 : i.age >= 65 ? 1 : 0);
  return { points: points, strokePct: CHADS_PCT[points] };
}

/**
 * Padua prediction score (Barbar 2010). 4 or more = high VTE risk in medical inpatients.
 * @param {{ cancer: boolean, priorVte: boolean, immobile: boolean, thrombophilia: boolean, recentSurgery: boolean, age: number, failure: boolean, acuteMiStroke: boolean, infection: boolean, obesity: boolean, hormonal: boolean }} i
 * @returns {{ points: number, high: boolean }|null}
 */
export function padua(i) {
  if (!Number.isFinite(i.age)) return null;
  var points = 3 * count([i.cancer, i.priorVte, i.immobile, i.thrombophilia]) + 2 * count([i.recentSurgery]) +
    count([i.age >= 70, i.failure, i.acuteMiStroke, i.infection, i.obesity, i.hormonal]);
  return { points: points, high: points >= 4 };
}

const afAtLeast = (i, n) => i.af != null && i.af >= n;
const vteBetween = (i, lo, hi) => i.vteMonthsAgo != null && i.vteMonthsAgo >= lo && i.vteMonthsAgo <= hi;
const hasIndication = (i) => !!(i.valve || i.af != null || i.vteMonthsAgo != null || i.vteRecurrent);
/** [normal, with raised bleeding risk] */
const BRIDGE_BY_TIER = { Alto: ['HBPM', 'Individualizar'], Moderado: ['Individualizar', 'Sin puente'], Bajo: ['Sin puente', 'Sin puente'] };
const TIER_HIGH = [
  [(i) => i.valve === 'mitral' && i.valveRisk, 'PRÓTESIS MITRAL CON FACTORES DE RIESGO DE EVC'],
  [(i) => i.valve === 'cagedDisc', 'PRÓTESIS DE BOLA O DISCO BASCULANTE'],
  [(i) => i.strokeRecent, 'EVC O AIT EN LOS ÚLTIMOS 3 MESES'],
  [(i) => afAtLeast(i, 7), 'CHA₂DS₂-VASc ≥7'],
  [(i) => i.rheumatic, 'VALVULOPATÍA REUMÁTICA'],
  [(i) => vteBetween(i, 0, 2.99), 'TEV EN LOS ÚLTIMOS 3 MESES'],
  [(i) => i.thrombophiliaSevere, 'TROMBOFILIA SEVERA'],
  [(i) => i.cancerHighVte, 'CÁNCER ACTIVO CON ALTO RIESGO DE TEV'],
];
const TIER_MODERATE = [
  [(i) => i.valve === 'mitral', 'PRÓTESIS MITRAL'],
  [(i) => i.valve === 'bileaflet' && i.valveRisk, 'PRÓTESIS AÓRTICA BIVALVA CON FACTORES DE RIESGO DE EVC'],
  [(i) => afAtLeast(i, 5), 'CHA₂DS₂-VASc 5–6'],
  [(i) => vteBetween(i, 3, 12), 'TEV HACE 3–12 MESES'],
  [(i) => i.vteRecurrent, 'TEV RECURRENTE'],
  [(i) => i.thrombophilia, 'TROMBOFILIA NO SEVERA'],
  [(i) => i.cancer, 'CÁNCER ACTIVO O RECIENTE'],
];

/**
 * Thrombotic risk tier for warfarin bridging (CHEST 2022 Table 1, Douketis; AF tiers as ACC 2017).
 * `valve`: 'mitral' | 'cagedDisc' (caged-ball or tilting-disc, any position) | 'bileaflet' (aortic) | null.
 * `af`: CHA2DS2-VASc points when the patient has AF, else null. `vteMonthsAgo`: months since the last VTE, null if none.
 * `bridge`: 'HBPM' (high), 'Individualizar' (moderate), 'Sin puente' (low). Raised bleeding risk lowers it one step.
 * @param {{ valve?: string|null, valveRisk?: boolean, af?: number|null, strokeRecent?: boolean, rheumatic?: boolean, vteMonthsAgo?: number|null, vteRecurrent?: boolean, thrombophiliaSevere?: boolean, thrombophilia?: boolean, cancer?: boolean, cancerHighVte?: boolean, bleedHigh?: boolean }} i
 * @returns {{ tier: 'Alto'|'Moderado'|'Bajo', bridge: 'HBPM'|'Individualizar'|'Sin puente', reasons: string[] }|null} null when no indication is given
 */
export function thromboticTier(i) {
  var high = TIER_HIGH.filter((r) => r[0](i)).map((r) => r[1]);
  var moderate = TIER_MODERATE.filter((r) => r[0](i)).map((r) => r[1]);
  if (!high.length && !moderate.length && !hasIndication(i)) return null;
  var tier = high.length ? 'Alto' : moderate.length ? 'Moderado' : 'Bajo';
  return { tier: tier, bridge: BRIDGE_BY_TIER[tier][i.bleedHigh ? 1 : 0], reasons: high.concat(moderate) };
}

/**
 * Cockcroft-Gault creatinine clearance in mL/min, rounded. Age in years, weight kg, creatinine mg/dL.
 * @param {{ age: number, weight: number, scr: number, female: boolean }} i
 * @returns {number|null}
 */
export function cockcroftGault(i) {
  if (![i.age, i.weight, i.scr].every((v) => Number.isFinite(v) && v > 0)) return null;
  return Math.round(((140 - i.age) * i.weight) / (72 * i.scr) * (i.female ? 0.85 : 1));
}

/** Lowest CrCl (mL/min) PAUSE enrolled, per drug. */
const PAUSE_MIN_CRCL = { apixaban: 25, rivaroxaban: 30, dabigatran: 30 };

/**
 * PAUSE DOAC interruption (Douketis, JAMA Intern Med 2019). Day 0 = surgery. Neuraxial anesthesia counts as high bleed risk.
 * Edoxaban was not studied; it takes the rivaroxaban schedule. Dabigatran needs `crcl`.
 * @param {{ drug: 'apixaban'|'rivaroxaban'|'dabigatran'|'edoxaban', crcl?: number|null, highBleedRisk?: boolean, neuraxial?: boolean }} i
 * @returns {{ stopDay: number, restartDay: string, high: boolean, studied: boolean, belowPauseCrcl: boolean }|null}
 */
export function pauseSchedule(i) {
  if (!['apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban'].includes(i.drug)) return null;
  var crcl = Number.isFinite(i.crcl) ? i.crcl : null;
  if (i.drug === 'dabigatran' && crcl == null) return null;
  var high = !!(i.highBleedRisk || i.neuraxial);
  var slow = i.drug === 'dabigatran' && crcl < 50;
  return {
    stopDay: -(slow ? 3 : 2) - (high ? (slow ? 2 : 1) : 0),
    restartDay: high ? '+2 a +3' : '+1',
    high: high,
    studied: i.drug !== 'edoxaban',
    belowPauseCrcl: crcl != null && PAUSE_MIN_CRCL[i.drug] != null && crcl < PAUSE_MIN_CRCL[i.drug],
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const band = (v, lo, hi) => (v < lo ? 1 : v <= hi ? 2 : 3);

/**
 * Child-Pugh (Pugh 1973). Bilirubin mg/dL, albumin g/dL; ascites and encephalopathy are 1 (none), 2 (slight / grade 1-2), 3 (moderate / grade 3-4).
 * @param {{ bili: number, alb: number, inr: number, ascites: number, encephalopathy: number }} i
 * @returns {{ points: number, cls: 'A'|'B'|'C' }}
 */
export function childPugh(i) {
  var albumin = i.alb > 3.5 ? 1 : i.alb >= 2.8 ? 2 : 3;
  var points = band(i.bili, 2, 3) + albumin + band(i.inr, 1.7, 2.3) + i.ascites + i.encephalopathy;
  return { points: points, cls: points <= 6 ? 'A' : points <= 9 ? 'B' : 'C' };
}

/**
 * MELD (Kamath 2001), MELD-Na (OPTN 2016) and MELD 3.0 (Kim 2021). Creatinine, bilirubin mg/dL, albumin g/dL, sodium mmol/L.
 * @param {{ cr: number, bili: number, inr: number, na: number, alb: number, female: boolean, dialysis: boolean }} i
 * @returns {{ meld: number, meldNa: number, meld3: number, survival90: number }}
 */
export function meld(i) {
  var bili = Math.max(1, i.bili), inr = Math.max(1, i.inr);
  var cr = i.dialysis ? 4 : clamp(i.cr, 1, 4);
  var original = Math.round(10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bili) + 1.12 * Math.log(inr) + 0.643));
  var na = clamp(i.na, 125, 137);
  var meldNa = original > 11 ? Math.round(original + 1.32 * (137 - na) - 0.033 * original * (137 - na)) : original;
  var cr3 = i.dialysis ? 3 : clamp(i.cr, 1, 3);
  var alb = clamp(i.alb, 1.5, 3.5);
  var meld3 = Math.round(
    (i.female ? 1.33 : 0) + 4.56 * Math.log(bili) + 0.82 * (137 - na) - 0.24 * (137 - na) * Math.log(bili) +
      9.09 * Math.log(inr) + 11.14 * Math.log(cr3) + 1.85 * (3.5 - alb) - 1.83 * (3.5 - alb) * Math.log(cr3) + 6
  );
  return { meld: original, meldNa: meldNa, meld3: meld3, survival90: pct(Math.pow(0.946, Math.exp(0.17698 * meld3 - 3.56))) };
}

/**
 * NRS-2002 (Kondrup 2003). Pre-screen: any yes goes to the final score = nutrition (0-3) + disease severity (0-3) + 1 if age >= 70.
 * @param {{ prescreen: boolean, nutrition: number, severity: number, age: number }} i
 * @returns {{ screened: boolean, points: number, atRisk: boolean }}
 */
export function nrs2002(i) {
  var points = i.nutrition + i.severity + (i.age >= 70 ? 1 : 0);
  return { screened: i.prescreen, points: points, atRisk: i.prescreen && points >= 3 };
}

/** AWOL delirium rate by points in the derivation cohort (Douglas 2013). Score 4 had 10 patients in all: no estimate. */
const AWOL_PCT = [0, 5, 15, 26, null];

/**
 * AWOL delirium screen (Douglas 2013), derived in medical inpatients. One point each.
 * @param {{ age: number, worldWrong: boolean, disoriented: boolean, ill: boolean }} i
 * @returns {{ points: number, derivationPct: number|null, elevated: boolean }}
 */
export function awol(i) {
  var points = count([i.age >= 80, i.worldWrong, i.disoriented, i.ill]);
  return { points: points, derivationPct: AWOL_PCT[points], elevated: points >= 2 };
}

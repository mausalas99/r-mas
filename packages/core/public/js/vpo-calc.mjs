/** VPO calculators: autofill from R+ data and text lines for each scale. Pure, no DOM. */
import { getAsaByKey, getProcedureById } from './vpo-lookups.mjs';
import { ESC_PROCEDURES, ESC_TIER_PCT, getEscProcedure } from './vpo-esc-risk.mjs';
import { getLatestLabValues } from './vpo-data.mjs';
import { sortLabHistoryChronological } from './tend-core.mjs';
import {
  AHA_RISK_MODIFIERS,
  ahaCvRisk,
  ariscat,
  aubHas2,
  capriniCategory,
  guptaMica,
  guptaPneumonia,
  guptaRespiratoryFailure,
  cha2ds2Vasc,
  childPugh,
  cockcroftGault,
  hasBled,
  meld,
  awol,
  nrs2002,
  padua,
  pauseSchedule,
  rcri,
  stopBang,
  thromboticTier,
} from './vpo-scores.mjs';

export const PROCEDURE_ES = {
  'gupta-anorectal': 'Anorrectal',
  'gupta-aortic': 'Aórtica',
  'gupta-bariatric': 'Bariátrica',
  'gupta-brain': 'Cerebro',
  'gupta-breast': 'Mama',
  'gupta-cardiac': 'Cardiaca',
  'gupta-ent': 'ORL (excepto tiroides/paratiroides)',
  'gupta-foregut-hpb': 'Gástrica, esofágica o hepatopancreatobiliar',
  'gupta-gallbladder-appendix': 'Vesícula, apéndice, suprarrenal o bazo',
  'gupta-hernia': 'Hernia (ventral, inguinal, femoral)',
  'gupta-intestinal': 'Intestinal',
  'gupta-neck-thyroid': 'Cuello (tiroides/paratiroides)',
  'gupta-ob-gyn': 'Ginecoobstétrica',
  'gupta-orthopedic': 'Ortopédica y extremidad no vascular',
  'gupta-abdomen-other': 'Otra abdominal',
  'gupta-peripheral-vascular': 'Vascular periférica',
  'gupta-skin': 'Piel',
  'gupta-spine': 'Columna',
  'gupta-thoracic': 'Torácica no esofágica',
  'gupta-vein': 'Venosa',
  'gupta-urology': 'Urología',
};

/** Yes/no calculator inputs stored in state.calc, in display order. */
export const CALC_FLAGS = [
  ['emergency', 'Urgencia'],
  ['copd', 'EPOC'],
  ['smoker', 'Tabaquismo (último año)'],
  ['respInfection', 'Infección respiratoria (último mes)'],
  ['ischemic', 'Cardiopatía isquémica'],
  ['hf', 'Insuficiencia cardiaca'],
  ['cva', 'EVC o AIT'],
  ['insulin', 'Insulina'],
  ['heartDisease', 'Cardiopatía (IAM, ICC, FA, valvulopatía)'],
  ['anginaDyspnea', 'Angina o disnea'],
  ['malignancy', 'Neoplasia actual o previa'],
  ['arthroplasty', 'Artroplastia mayor de miembro inferior'],
  ['otherCaprini', 'Caprini: IMC >25, EII, IAM agudo, EPOC u otro'],
];

/** Inputs for the optional scales (STOP-Bang, HAS-BLED, CHA2DS2-VASc, Padua), grouped per scale. */
export const OPTIONAL_SCALES = [
  { key: 'stopbang', label: 'STOP-Bang', flags: [['snoring', 'Ronquido fuerte'], ['tired', 'Cansancio diurno'], ['observedApnea', 'Apnea observada'], ['htn', 'Hipertensión'], ['bmi35', 'IMC >35'], ['neck40', 'Cuello ≥40 cm']] },
  { key: 'hasbled', label: 'HAS-BLED', flags: [['htnUncontrolled', 'HTA no controlada (PAS >160)'], ['dialysis', 'Diálisis o trasplante renal'], ['liver', 'Cirrosis o hepatopatía severa'], ['bleeding', 'Sangrado mayor previo'], ['labileInr', 'INR lábil'], ['antiplatelets', 'Antiagregantes o AINE'], ['alcohol', '≥8 bebidas por semana']] },
  { key: 'chads', label: 'CHA₂DS₂-VASc', flags: [['dm', 'Diabetes'], ['vascular', 'Enfermedad vascular (IAM, EAP, placa aórtica)']] },
  {
    key: 'liver',
    label: 'Child-Pugh y MELD',
    numbers: [['bili', 'Bilirrubina total (mg/dL)'], ['alb', 'Albúmina (g/dL)'], ['inr', 'INR'], ['na', 'Sodio (mmol/L)']],
    selects: [
      ['ascites', 'Ascitis', [['1', 'Ausente'], ['2', 'Leve'], ['3', 'Moderada']]],
      ['encephalopathy', 'Encefalopatía', [['1', 'Ninguna'], ['2', 'Grado 1–2'], ['3', 'Grado 3–4']]],
    ],
    flags: [['dialysis', 'Diálisis (2 o más veces por semana)']],
    buttons: [['childpugh', 'Calcular Child-Pugh'], ['meld', 'Calcular MELD']],
  },
  {
    key: 'esc',
    label: 'Riesgo quirúrgico ESC 2022',
    selects: [['escProcedure', 'Procedimiento', ESC_PROCEDURES.map((p) => [p.id, p.label])]],
    flags: [],
    buttons: [['escSurg', 'Ver riesgo ESC']],
  },
  {
    key: 'nrs',
    label: 'NRS-2002',
    selects: [
      ['nrsNutrition', 'Estado nutricional', [['0', 'Normal'], ['1', 'Pérdida >5% en 3 meses o ingesta 50–75%'], ['2', 'Pérdida >5% en 2 meses, IMC 18.5–20.5 con mal estado general, o ingesta 25–50%'], ['3', 'Pérdida >5% en 1 mes, IMC <18.5 con mal estado general, o ingesta 0–25%']]],
      ['nrsSeverity', 'Gravedad de la enfermedad', [['0', 'Requerimientos normales'], ['1', 'Fractura de cadera, enfermedad crónica con complicación aguda'], ['2', 'Cirugía abdominal mayor, EVC, neumonía severa, neoplasia hematológica'], ['3', 'TCE, trasplante de médula, UCI con APACHE II >10']]],
    ],
    flags: [['nrsBmi', 'IMC <20.5'], ['nrsWeight', 'Pérdida de peso en 3 meses'], ['nrsIntake', 'Menor ingesta la última semana'], ['nrsIll', 'Enfermedad grave (por ejemplo UCI)']],
  },
  {
    key: 'awol',
    label: 'AWOL (tamizaje de delirio)',
    flags: [['awolWorld', 'No deletrea WORLD al revés'], ['awolDisoriented', 'No orientado en lugar'], ['awolIll', 'Enfermedad moderada, severa o moribunda según enfermería']],
  },
  {
    key: 'bridging',
    label: 'Puente de anticoagulación',
    numbers: [['peso', 'Peso (kg)']],
    selects: [
      ['anticoag', 'Anticoagulante', [['vka', 'Warfarina o acenocumarol'], ['apixaban', 'Apixabán'], ['rivaroxaban', 'Rivaroxabán'], ['dabigatran', 'Dabigatrán'], ['edoxaban', 'Edoxabán']]],
      ['valveType', 'Válvula mecánica', [['mitral', 'Mitral'], ['cagedDisc', 'Aórtica de bola o disco basculante'], ['bileaflet', 'Aórtica bivalva']]],
      ['vteWhen', 'Último TEV', [['lt3', 'Hace menos de 3 meses'], ['3to12', 'Hace 3–12 meses'], ['gt12', 'Hace más de 12 meses']]],
    ],
    flags: [['af', 'Fibrilación auricular'], ['strokeRecent', 'EVC o AIT en los últimos 3 meses'], ['rheumatic', 'Valvulopatía reumática'], ['valveThrombosis', 'Trombosis valvular previa'], ['vteRecurrent', 'TEV recurrente'], ['thrombSevere', 'Trombofilia severa (proteína C o S, antitrombina, antifosfolípidos)'], ['cancerHighVte', 'Cáncer activo con alto riesgo de TEV'], ['bleedSurgHigh', 'Cirugía de alto riesgo de sangrado'], ['neuraxial', 'Anestesia neuraxial']],
  },
  { key: 'padua', label: 'Padua', flags: [['thrombophilia', 'Trombofilia'], ['hxVte', 'TEV previo'], ['recentSurgery', 'Trauma o cirugía último mes'], ['respFailure', 'Insuficiencia respiratoria'], ['acuteMiStroke', 'IAM o EVC isquémico agudo'], ['infection', 'Infección aguda o reumatológica'], ['obesity30', 'IMC ≥30'], ['hormonal', 'Tratamiento hormonal']] },
];

/** AHA/ACC modifiers: checkbox keys in state.calc, same order as AHA_RISK_MODIFIERS. */
export const MODIFIER_KEYS = ['modValve', 'modPH', 'modCHD', 'modStent', 'modStroke', 'modCied', 'modFrail'];

const ASA_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
const FUNC_ES = { independent: 'INDEPENDIENTE', 'partially-dependent': 'PARCIALMENTE DEPENDIENTE', 'totally-dependent': 'TOTALMENTE DEPENDIENTE' };

const num = (v) => {
  var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const fold = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Diagnosis text patterns that switch a flag on. Folded: upper case, no accents. */
const DX_RULES = {
  copd: /\b(EPOC|COPD|ENFISEMA|BRONQUITIS CRONICA)\b/,
  smoker: /TABAQUISMO|FUMADOR/,
  ischemic: /ISQUEMIC|\bIAM\b|INFARTO|CORONARI|ANGINA|\bSICA\b|\bSCA\b/,
  hf: /INSUFICIENCIA CARDIACA|\bICC\b|MIOCARDIOPATIA/,
  cva: /\bEVC\b|\bACV\b|ICTUS|\bAIT\b|ENFERMEDAD CEREBROVASCULAR|ISQUEMIA CEREBRAL/,
  insulin: /INSULINO ?REQUIRIENTE|DM.*INSULINA/,
  heartDisease: /INFARTO|\bIAM\b|ANGIOPLAST|CABG|REVASCULARIZ|INSUFICIENCIA CARDIACA|\bICC\b|FIBRILACION|\bFA\b|VALVULOPATIA|ESTENOSIS (AORTICA|MITRAL)|CARDIOPATIA ISQUEMICA/,
  anginaDyspnea: /ANGINA|DISNEA/,
  malignancy: /CANCER|\bCA\b|CARCINOMA|NEOPLASIA|TUMOR|LINFOMA|LEUCEMIA|MIELOMA|MELANOMA|ADENOCARCINOMA/,
  otherCaprini: /\bEPOC\b|CROHN|COLITIS ULCERATIVA|\bIAM\b|INFARTO AGUDO/,
  modStent: /\bSTENT\b|CABG|REVASCULARIZACION|ANGIOPLASTIA/,
  modStroke: /EVC RECIENTE|ACV RECIENTE|ICTUS RECIENTE/,
  modCied: /MARCAPASOS|\bDAI\b|\bCDI\b|DESFIBRILADOR/,
  modValve: /ESTENOSIS AORTICA SEVERA|VALVULOPATIA SEVERA|ESTENOSIS MITRAL SEVERA/,
  modPH: /HIPERTENSION PULMONAR SEVERA/,
  modCHD: /CARDIOPATIA CONGENITA/,
  htn: /HIPERTENSION|\bHTA\b|\bHAS\b/,
  dm: /DIABETES|\bDM\b|\bDM ?[12]\b/,
  vascular: /INFARTO|\bIAM\b|ENFERMEDAD ARTERIAL PERIFERICA|\bEAP\b/,
  liver: /CIRROSIS|HEPATOPATIA/,
  af: /FIBRILACION AURICULAR|\bFA\b/,
  rheumatic: /REUMATIC/,
  hxVte: /\bTVP\b|\bTEP\b|TROMBOEMBOLI|TROMBOSIS VENOSA/,
  thrombophilia: /TROMBOFILIA|ANTIFOSFOLIPIDO|FACTOR V LEIDEN/,
  dialysis: /HEMODIALISIS|DIALISIS|TRASPLANTE RENAL/,
  bleeding: /HEMORRAGIA|SANGRADO (DIGESTIVO|MAYOR)|\bHDA\b/,
  alcohol: /ALCOHOLISMO|ETILISMO/,
  respFailure: /INSUFICIENCIA RESPIRATORIA/,
};
const ANTIPLATELET_DRUG = /ASPIRINA|\bAAS\b|CLOPIDOGREL|TICAGRELOR|PRASUGREL|IBUPROFENO|NAPROXENO|KETOROLACO|DICLOFENACO|AINE/;
const ANTICOAG_DRUGS = [
  ['vka', /WARFARINA|ACENOCUMAROL/],
  ['apixaban', /APIXABAN/],
  ['rivaroxaban', /RIVAROXABAN/],
  ['dabigatran', /DABIGATRAN/],
  ['edoxaban', /EDOXABAN/],
];
const INSULIN_DRUG = /INSULINA|GLARGINA|DETEMIR|DEGLUDEC|NPH|LISPRO|ASPARTA|GLULISINA/;

/** First numeric value for a lab key in the newest study, any section. */
function latestLabNumber(labHistory, key) {
  var latest = sortLabHistoryChronological(Array.isArray(labHistory) ? labHistory : [])[0];
  if (!latest) return null;
  var sections = Object.values(latest.parsedBySection || {}).concat([latest.parsed || {}]);
  for (var i = 0; i < sections.length; i++) {
    var n = num(sections[i] && sections[i][key]);
    if (n != null) return n;
  }
  return null;
}

/** Labs the calculators use, from the newest study: [state or calc field, lab key]. */
const LAB_FIELDS = [['bili', 'BT'], ['alb', 'Alb'], ['inr', 'INR'], ['na', 'Na']];

/** Creatinine and hemoglobin from the latest labs, only where the VPO form is empty. */
function autofillLabs(state, labHistory, filled, set) {
  var labs = getLatestLabValues(labHistory || [], null);
  if (labs) {
    [['creatinina', labs.creatinina], ['hemoglobina', labs.hemoglobina]].forEach(function (p) {
      if (String(state[p[0]] || '').trim() || p[1] == null) return;
      state[p[0]] = String(p[1]);
      filled.push(p[0]);
    });
  }
  LAB_FIELDS.forEach(function (f) {
    var v = latestLabNumber(labHistory, f[1]);
    if (v != null && !String((state.calc || {})[f[0]] || '').trim()) set(f[0], String(v));
  });
}

/** Set the anticoagulant when the drug list names exactly one class. */
function autofillAnticoag(drugs, set) {
  var hit = ANTICOAG_DRUGS.filter((d) => d[1].test(drugs));
  if (hit.length === 1) set('anticoag', hit[0][0]);
}

/**
 * Fill calculator inputs from what R+ stores. Never overwrites a value the user set (state.calc.touched).
 * @param {object} state VPO state, mutated
 * @param {{ labHistory?: object[] }} [ctx]
 * @returns {string[]} keys filled
 */
export function autofillCalc(state, ctx) {
  var calc = (state.calc = state.calc && typeof state.calc === 'object' ? state.calc : {});
  var touched = (calc.touched = calc.touched || {});
  var filled = [];
  var set = (k, v) => {
    if (touched[k] || calc[k] === v) return;
    calc[k] = v;
    filled.push(k);
  };

  var dx = fold((state.diagnosticosList || []).join(' | '));
  Object.keys(DX_RULES).forEach((k) => DX_RULES[k].test(dx) && set(k, true));
  var drugs = fold((state.farmacos || []).map((f) => f.nombreDisplay).join(' | '));
  if (INSULIN_DRUG.test(drugs)) set('insulin', true);
  if (ANTIPLATELET_DRUG.test(drugs)) set('antiplatelets', true);
  autofillAnticoag(drugs, set);
  var sex = fold(ctx && ctx.patient && ctx.patient.sexo).charAt(0);
  if (sex === 'M' || sex === 'F') set('sex', sex);
  if (/\bCHOQUE SEPTICO\b/.test(dx)) set('sepsis', 'shock');
  else if (/\bSEPSIS\b/.test(dx)) set('sepsis', 'sepsis');
  autofillLabs(state, ctx && ctx.labHistory, filled, set);
  return filled;
}

const VASCULAR = ['gupta-aortic', 'gupta-peripheral-vascular'];

function capriniPoints(i) {
  if (i.age == null) return null;
  var surgery = i.arthroplasty ? 5 : i.hours != null && i.hours * 60 > 45 ? 2 : 1;
  var age = i.age >= 75 ? 3 : i.age >= 61 ? 2 : i.age >= 41 ? 1 : 0;
  return age + surgery + i.recent + i.venous + i.mobility + (i.other ? 1 : 0) + (i.malignancy ? 2 : 0);
}

const CAPRINI_ADVICE = (p) =>
  p >= 5 ? 'SE RECOMIENDA HBPM O HNF MÁS PROFILAXIS MECÁNICA.' : p >= 1 ? 'PROFILAXIS MECÁNICA.' : 'DEAMBULACIÓN TEMPRANA.';

const plural = (n) => n + (n === 1 ? ' PUNTO' : ' PUNTOS');

/** Parsed inputs shared by every scale. */
function calcContext(state) {
  var c = state.calc || {};
  var asaClass = (getAsaByKey(state.asaKey) || {}).asaClass;
  var proc = getProcedureById(state.procedureId);
  var ctx = {
    c: c,
    asaClass: asaClass,
    asa: asaClass ? ASA_NUM[asaClass] : null,
    proc: proc,
    procedureId: state.procedureId,
    age: num(state.edad),
    hours: num(state.duracionCirugiaHoras),
    spo2: num(state.spo2),
    hb: num(state.hemoglobina),
    cr: num(state.creatinina),
    functional: state.functionalKey || 'independent',
    sepsis: c.sepsis || 'none',
    ahaSurgical: state.ahaQuirurgico,
  };
  ctx.vascular = VASCULAR.indexOf(state.procedureId) >= 0;
  return ctx;
}

const need = (pairs) => pairs.filter((p) => !p[0]).map((p) => p[1]);

/** Each line is { text } or { missing: [...] }. */
function lineOf(missing, text) {
  return missing.length ? { missing: missing } : { text: text() };
}

function cardiacLines(x) {
  var c = x.c;
  var rcriRes = x.proc
    ? rcri({ highRiskSurgery: x.proc.rcriHighRisk, ischemicHeart: c.ischemic, heartFailure: c.hf, cerebrovascular: c.cva, insulin: c.insulin, creatinine: x.cr })
    : null;
  var mica = x.proc && x.asa && x.age != null ? guptaMica({ age: x.age, asa: x.asa, functional: x.functional, creatinine: x.cr, procedureId: x.procedureId }) : null;
  var aub = x.proc && x.age != null && x.hb != null
    ? aubHas2({ age: x.age, hb: x.hb, heartDisease: !!c.heartDisease, anginaOrDyspnea: !!c.anginaDyspnea, vascularSurgery: x.vascular, emergency: !!c.emergency })
    : null;
  var mods = AHA_RISK_MODIFIERS.filter((_, i) => c[MODIFIER_KEYS[i]] || (i === 6 && num(c.cfs) >= 5));
  return {
    ahaSurg: lineOf(need([[x.proc, 'cirugía']]), () => String(x.proc.ahaQuirurgico).toUpperCase()),
    ahaCv: lineOf(need([[rcriRes, 'cirugía'], [mica != null, 'edad, cirugía y ASA']]), () =>
      ahaCvRisk({ rcriPoints: rcriRes.points, micaPct: mica, aubPoints: aub ? aub.points : undefined }) === 'Bajo' ? 'BAJO — MACE <1%' : 'ELEVADO — MACE ≥1%'
    ),
    ahaMod: lineOf([], () => (mods.length ? mods.join(', ').toUpperCase() : 'NINGUNO')),
    rcri: lineOf(need([[rcriRes, 'cirugía']]), () =>
      plural(rcriRes.points) + '. CLASE ' + rcriRes.cls + '. ' + rcriRes.pct + '% DE IAM, EDEMA PULMONAR, FV O PARO CARDIACO, O BAV COMPLETO.'
    ),
    gupta: lineOf(need([[x.proc, 'cirugía'], [x.asa, 'ASA'], [x.age != null, 'edad']]), () => mica + '% DE IAM O PARO CARDIACO INTRAOPERATORIO O A 30 DÍAS.'),
    aub: lineOf(need([[x.proc, 'cirugía'], [x.age != null, 'edad'], [x.hb != null, 'hemoglobina']]), () =>
      plural(aub.points) + '. RIESGO ' + (aub.points >= 4 ? 'ALTO' : aub.points >= 2 ? 'INTERMEDIO' : 'BAJO') + '. ' + aub.riskPct + '% DE MUERTE, IAM O EVC A 30 DÍAS.'
    ),
  };
}

function pulmonaryLines(x) {
  var c = x.c;
  var ar = x.proc && x.age != null && x.spo2 != null && x.hours != null
    ? ariscat({ age: x.age, spo2: x.spo2, respInfection: !!c.respInfection, anemia: x.hb != null && x.hb <= 10, incision: x.proc.ariscatIncisionKey, hours: x.hours, emergency: !!c.emergency })
    : null;
  var gup = { age: x.age, asa: x.asa, functional: x.functional, sepsis: x.sepsis, emergency: !!c.emergency, copd: !!c.copd, smoker: !!c.smoker, procedureId: x.procedureId };
  var base = [[x.proc, 'cirugía'], [x.asa, 'ASA']];
  return {
    ariscat: lineOf(need([[x.proc, 'cirugía'], [x.age != null, 'edad'], [x.spo2 != null, 'SpO₂'], [x.hours != null, 'duración']]), () =>
      ar.points + ' PUNTOS. RIESGO ' + ar.group.toUpperCase() + ' DE COMPLICACIONES PULMONARES — ' + ar.pct + '% (TASA DE LA COHORTE ORIGINAL).'
    ),
    guptaResp: lineOf(need(base), () => guptaRespiratoryFailure(gup) + '% DE VM >48 H O REINTUBACIÓN NO PLANEADA A 30 DÍAS.'),
    guptaPneu: lineOf(need(base.concat([[x.age != null, 'edad']])), () => guptaPneumonia(gup) + '% DE NEUMONÍA POSTOPERATORIA.'),
  };
}

function generalLines(x) {
  var c = x.c;
  var cap = capriniPoints({
    age: x.age,
    hours: x.hours,
    arthroplasty: c.arthroplasty,
    recent: num(c.caprRecent) || 0,
    venous: num(c.caprVenous) || 0,
    mobility: num(c.caprMobility) || 0,
    other: c.otherCaprini,
    malignancy: c.malignancy,
  });
  return {
    mets: lineOf(need([[c.mets, 'METs']]), () => (c.mets === 'ge4' ? '≥4 METS' : '<4 METS')),
    abvd: lineOf([], () => FUNC_ES[x.functional] || ''),
    cfs: lineOf(need([[c.cfs, 'CFS']]), () => 'CFS ' + c.cfs + '. ' + (num(c.cfs) >= 5 ? 'FRÁGIL.' : 'NO FRÁGIL.')),
    asa: lineOf(need([[x.asaClass, 'ASA']]), () => 'ASA ' + x.asaClass),
    caprini: lineOf(need([[cap != null, 'edad']]), () => plural(cap) + '. ' + capriniCategory(cap).toUpperCase() + '. ' + CAPRINI_ADVICE(cap)),
  };
}

const LIVER_NAMES = { bili: 'bilirrubina', alb: 'albúmina', inr: 'INR', na: 'sodio', ascites: 'ascitis', encephalopathy: 'encefalopatía', sex: 'sexo' };
const liverMissing = (c, keys) => keys.filter((k) => num(c[k]) == null && !(k === 'sex' && (c.sex === 'M' || c.sex === 'F'))).map((k) => LIVER_NAMES[k]);

/** Numeric liver inputs; assumes liverMissing() found nothing. */
function liverInputs(x) {
  var c = x.c;
  return {
    bili: num(c.bili), alb: num(c.alb), inr: num(c.inr), na: num(c.na), cr: x.cr == null ? 1 : x.cr,
    ascites: num(c.ascites), encephalopathy: num(c.encephalopathy), female: c.sex === 'F', dialysis: !!c.dialysis,
  };
}

function nrsInputs(x) {
  var c = x.c;
  return {
    prescreen: !!(c.nrsBmi || c.nrsWeight || c.nrsIntake || c.nrsIll),
    nutrition: num(c.nrsNutrition),
    severity: num(c.nrsSeverity),
    age: x.age,
  };
}

const VKA_BRIDGE_ES = { HBPM: 'PUENTE CON HBPM.', Individualizar: 'PUENTE A CRITERIO CLÍNICO.', 'Sin puente': 'SIN PUENTE.' };
const DOAC_ES = { apixaban: 'APIXABÁN', rivaroxaban: 'RIVAROXABÁN', dabigatran: 'DABIGATRÁN', edoxaban: 'EDOXABÁN' };
const VTE_MONTHS = { lt3: 1, '3to12': 6, gt12: 24 };

/** Warfarin or acenocoumarol: thrombotic tier and bridge advice. */
function vkaLine(x, sexKnown, chads) {
  var c = x.c;
  var af = !!c.af;
  var missing = af ? need([[x.age != null, 'edad'], [sexKnown, 'sexo']]) : [];
  var bleedHigh = !!c.bleeding || !!c.antiplatelets;
  var strokeRisk = [af, c.cva, c.htn, c.dm, c.hf, x.age >= 75, c.rheumatic, c.valveThrombosis].some(Boolean);
  var r = missing.length ? null : thromboticTier({
    valve: c.valveType || null, valveRisk: strokeRisk, af: af ? chads.points : null, strokeRecent: !!c.strokeRecent, rheumatic: !!c.rheumatic,
    vteMonthsAgo: c.vteWhen in VTE_MONTHS ? VTE_MONTHS[c.vteWhen] : null, vteRecurrent: !!c.vteRecurrent, thrombophiliaSevere: !!c.thrombSevere,
    thrombophilia: !!c.thrombophilia, cancer: !!c.malignancy, cancerHighVte: !!c.cancerHighVte, bleedHigh: bleedHigh,
  });
  if (!missing.length && !r) missing = ['indicación (válvula, FA o TEV)'];
  return lineOf(missing, () => 'BRIDGING: TIER ' + r.tier.toUpperCase() + '. ' + VKA_BRIDGE_ES[r.bridge] + ' ' +
    (r.reasons.length ? r.reasons.join(', ') : 'SIN FACTORES DE RIESGO MAYORES') + '.' + (bleedHigh ? ' RIESGO DE SANGRADO ELEVADO.' : ''));
}

/** DOAC: PAUSE stop and restart days, no bridge. */
function doacLine(x, sexKnown) {
  var c = x.c;
  var drug = c.anticoag;
  var weight = num(c.peso);
  var crcl = cockcroftGault({ age: x.age, weight: weight, scr: x.cr, female: c.sex === 'F' });
  if (!sexKnown) crcl = null;
  var res = pauseSchedule({ drug: drug, crcl: crcl, highBleedRisk: !!c.bleedSurgHigh, neuraxial: !!c.neuraxial });
  var missing = drug === 'dabigatran' && crcl == null ? need([[x.age != null, 'edad'], [weight, 'peso'], [x.cr != null, 'creatinina'], [sexKnown, 'sexo']]) : [];
  return lineOf(missing, () => DOAC_ES[drug] + ': ÚLTIMA DOSIS DÍA ' + res.stopDay + '. REINICIAR DÍA ' + res.restartDay.toUpperCase() + '. SIN PUENTE.' +
    (c.neuraxial ? ' ANESTESIA NEURAXIAL CUENTA COMO ALTO RIESGO DE SANGRADO.' : '') +
    (res.studied ? '' : ' NO ESTUDIADO EN PAUSE, SE USA EL ESQUEMA DE RIVAROXABÁN.') +
    (res.belowPauseCrcl ? ' CrCl ' + crcl + ' ML/MIN: PAUSE EXCLUYÓ CrCl <' + (drug === 'apixaban' ? 25 : 30) + '.' : ''));
}

/** Anticoagulation bridging, by anticoagulant class. */
function bridgingLine(x, sexKnown, chads) {
  if (!x.c.anticoag) return { missing: ['anticoagulante'] };
  return x.c.anticoag === 'vka' ? vkaLine(x, sexKnown, chads) : doacLine(x, sexKnown);
}

/** Optional scales: only computed when the user asks for that one scale. */
function optionalLines(x) {
  var c = x.c;
  var sexKnown = c.sex === 'M' || c.sex === 'F';
  var stop = x.age != null && sexKnown
    ? stopBang({ snoring: !!c.snoring, tired: !!c.tired, observed: !!c.observedApnea, pressure: !!c.htn, bmi35: !!c.bmi35, age: x.age, neck40: !!c.neck40, male: c.sex === 'M' })
    : null;
  var bled = x.age != null
    ? hasBled({ htn: !!c.htnUncontrolled, renal: !!c.dialysis || (x.cr != null && x.cr > 2.26), liver: !!c.liver, stroke: !!c.cva, bleeding: !!c.bleeding, labileInr: !!c.labileInr, age: x.age, drugs: !!c.antiplatelets, alcohol: !!c.alcohol })
    : null;
  var chads = x.age != null && sexKnown
    ? cha2ds2Vasc({ hf: !!c.hf, htn: !!c.htn, age: x.age, dm: !!c.dm, stroke: !!c.cva, vascular: !!c.vascular || !!c.ischemic, female: c.sex === 'F' })
    : null;
  var pad = x.age != null
    ? padua({ cancer: !!c.malignancy, priorVte: !!c.hxVte, immobile: num(c.caprMobility) >= 1, thrombophilia: !!c.thrombophilia, recentSurgery: !!c.recentSurgery, age: x.age, failure: !!c.hf || !!c.respFailure, acuteMiStroke: !!c.acuteMiStroke, infection: !!c.infection, obesity: !!c.obesity30, hormonal: !!c.hormonal })
    : null;
  var liver = liverInputs(x);
  var bridging = bridgingLine(x, sexKnown, chads);
  var nrs = nrsInputs(x);
  var esc = getEscProcedure(c.escProcedure);
  return {
    escSurg: lineOf(need([[esc, 'procedimiento ESC']]), () =>
      esc.tier.toUpperCase() + '. ' + ESC_TIER_PCT[esc.tier] + ' DE MUERTE CV, IAM O EVC A 30 DÍAS POR LA CIRUGÍA (' + esc.label.toUpperCase() + ').'
    ),
    nrs: lineOf(need([[nrs.nutrition != null, 'estado nutricional'], [nrs.severity != null, 'gravedad'], [x.age != null, 'edad']]), () => {
      var r = nrs2002(nrs);
      if (!r.screened) return 'TAMIZAJE INICIAL NEGATIVO. REPETIR CADA SEMANA.';
      return plural(r.points) + '. ' + (r.atRisk ? 'EN RIESGO NUTRICIONAL, INICIAR PLAN DE NUTRICIÓN.' : 'SIN RIESGO NUTRICIONAL, REPETIR CADA SEMANA.');
    }),
    awol: lineOf(need([[x.age != null, 'edad']]), () => {
      var a = awol({ age: x.age, worldWrong: !!c.awolWorld, disoriented: !!c.awolDisoriented, ill: !!c.awolIll });
      return plural(a.points) + '. TAMIZAJE ' + (a.elevated ? 'POSITIVO' : 'NEGATIVO') + ' DE DELIRIO' +
        (a.derivationPct == null ? '. ESTIMACIÓN NO CONFIABLE.' : ' (' + a.derivationPct + '% EN LA COHORTE DE DERIVACIÓN).');
    }),
    childpugh: lineOf(liverMissing(c, ['bili', 'alb', 'inr', 'ascites', 'encephalopathy']), () => {
      var cp = childPugh(liver);
      return plural(cp.points) + '. CLASE ' + cp.cls + '.';
    }),
    meld: lineOf(liverMissing(c, ['bili', 'inr', 'na', 'alb', 'sex']).concat(x.cr == null && !c.dialysis ? ['creatinina'] : []), () => {
      var m = meld(liver);
      return 'MELD 3.0: ' + m.meld3 + ' (SUPERVIVENCIA A 90 DÍAS ' + m.survival90 + '%). MELD-NA: ' + m.meldNa + '. MELD: ' + m.meld + '.';
    }),
    stopbang: lineOf(need([[x.age != null, 'edad'], [sexKnown, 'sexo']]), () => plural(stop.points) + '. RIESGO ' + stop.risk.toUpperCase() + ' DE SAOS.'),
    hasbled: lineOf(need([[x.age != null, 'edad']]), () =>
      plural(bled.points) + '. RIESGO ' + bled.risk.toUpperCase() + '.' + (bled.pct == null ? '' : ' ' + bled.pct + '% DE SANGRADO MAYOR AL AÑO.')
    ),
    chads: lineOf(need([[x.age != null, 'edad'], [sexKnown, 'sexo']]), () => plural(chads.points) + '. ' + chads.strokePct + '% DE EVC ISQUÉMICO AL AÑO SIN ANTICOAGULACIÓN.'),
    bridging: bridging,
    padua: lineOf(need([[x.age != null, 'edad']]), () =>
      plural(pad.points) + '. ' + (pad.high ? 'RIESGO ALTO DE TEV, SE INDICA PROFILAXIS FARMACOLÓGICA.' : 'RIESGO BAJO DE TEV.')
    ),
  };
}

/**
 * One text line per scale. A scale that lacks inputs returns `missing` instead of text.
 * @param {object} state VPO state
 * @returns {Record<string, { text?: string, missing?: string[] }>}
 */
export function buildScaleLines(state) {
  var x = calcContext(state);
  return Object.assign({}, generalLines(x), cardiacLines(x), pulmonaryLines(x), optionalLines(x));
}

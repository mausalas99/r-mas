/**
 * Pure model: estado clínico glance (plan-of-care KPIs + SOAP buckets).
 */
import { EA_MED_FIELD_LABELS } from '../estado-actual-med-ui.mjs';

const SOAP_LABEL_OVERRIDES = {
  diureticos: 'Diuréticos',
  antihta: 'Antihipertensivos',
  antitromboticos: 'Tromboprofilaxis',
  nm: 'NM',
};

const SOAP_HUE = {
  analgesia: 12,
  antiemeticos: 32,
  sedacion: 230,
  antiepilepticos: 200,
  antiparkinsonianos: 145,
  antidotos: 18,
  viaAerea: 195,
  vasop: 8,
  antihta: 245,
  antitromboticos: 200,
  anticoagulacion: 25,
  antiarritmicos: 350,
  diureticos: 200,
  estatinas: 145,
  abx: 168,
  transfusiones: 8,
  nm: 52,
};

const KEEP_CAPS_RE = /^(ASA|AAS|NPH|NPT|NM|UTI|ORL|VO|IV|IM|SC|BH|QS|LCR|KCL)$/i;

function hasText(value) {
  return value != null && String(value).trim() !== '';
}

function soapLabel(key) {
  if (SOAP_LABEL_OVERRIDES[key]) return SOAP_LABEL_OVERRIDES[key];
  return EA_MED_FIELD_LABELS[key] || key;
}

function buildSoporteValue(soporte, soporteLitros) {
  const base = String(soporte).trim();
  if (hasText(soporteLitros)) {
    return `${base} ${String(soporteLitros).trim()} L`;
  }
  return base;
}

const DOSE_CUT_RE =
  /\s+\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:MCG|MG|G|ML|UI|U|MEQ)(?:\/H)?\b/i;
const VIA_CUT_RE = /\s+\b(?:VO|IV|IM|SC|SL|NEB|INH|EV|C\/\d|CADA|DIA|DÍA|EN CASO|PRN|SOS)\b/i;
const FORM_CUT_RE =
  /\s+\b(?:SOLUCI[OÓ]N(?:ES)?|SUSPENSI[OÓ]N(?:ES)?|TABLETAS?|COMPRIMIDOS?|C[AÁ]PSULAS?|AMPOLLETAS?|INYECTABLE)\b.*$/i;

const PARTICLE_RE = /^(de|del|la|el|los|las|en|y|o|u|a)$/i;

function prettyMedWord(word) {
  if (!word) return '';
  if (PARTICLE_RE.test(word)) return word.toLowerCase();
  if (KEEP_CAPS_RE.test(word)) return word.toUpperCase();
  if (/[a-z]/.test(word) && /[A-Z]/.test(word) && word.length > 3) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function prettyPhrase(raw) {
  return String(raw || '')
    .split(/([-\s/]+)/)
    .map((tok) => (/^[-\s/]+$/.test(tok) ? tok : prettyMedWord(tok)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasHypertonicNacl(raw) {
  const s = String(raw || '');
  if (!/cloruro\s+de\s+sodio|\bnacl\b/i.test(s)) return '';
  if (!/hipert|17\s*[.,]?\s*7\s*%/i.test(s)) return '';
  return 'Hiperton';
}

/** Drug name only from a SOAP / receta fragment (dose, via, PRN stripped). */
export function glanceMedName(raw) {
  let s = String(raw || '').replace(/\s+\/\/.*$/, '').trim();
  if (!s) return '';
  const nacl = aliasHypertonicNacl(s);
  if (nacl) return nacl;
  if (s.includes(':')) s = s.slice(0, s.indexOf(':')).trim() || s;
  const doseAt = s.search(DOSE_CUT_RE);
  if (doseAt > 0) s = s.slice(0, doseAt);
  const viaAt = s.search(VIA_CUT_RE);
  if (viaAt > 0) s = s.slice(0, viaAt);
  s = s.replace(FORM_CUT_RE, '').trim() || String(raw).trim();
  return prettyPhrase(s);
}

function nonEmptyItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => glanceMedName(item)).filter(Boolean);
}

const BASAL_INSULIN_RE = /\b(glargina|lantus|toujeo|degludec|tresiba|detemir|levemir|nph|basal)\b/i;
const RAPIDA_INSULIN_RE = /\b(r[aá]pida|lispro|aspart|glulisina|regular|preprandial|novorapid|humalog|apidra|fiasp)\b/i;

function summarizeInsulinPlan(items) {
  const list = Array.isArray(items) ? items : [];
  const basal = list.filter((item) => BASAL_INSULIN_RE.test(item));
  const rapida = list.filter((item) => RAPIDA_INSULIN_RE.test(item));
  if (!basal.length || !rapida.length) return list;
  const rest = list.filter(
    (item) => !BASAL_INSULIN_RE.test(item) && !RAPIDA_INSULIN_RE.test(item),
  );
  return ['Plan Basal Bolo', ...rest];
}

function buildSoapBuckets(soap) {
  if (!soap || typeof soap !== 'object') return [];
  const buckets = [];
  for (const [key, items] of Object.entries(soap)) {
    const list = key === 'nm' ? summarizeInsulinPlan(nonEmptyItems(items)) : nonEmptyItems(items);
    if (!list.length) continue;
    buckets.push({
      label: soapLabel(key),
      items: list,
      hue: SOAP_HUE[key] || 220,
    });
  }
  return buckets;
}

/**
 * @param {{
 *   soporte?: string,
 *   soporteLitros?: string,
 *   dieta?: string,
 *   bombaOn?: boolean,
 *   bombaRate?: string,
 *   pafi?: number | null,
 *   soap?: Record<string, string[]>,
 * }} input
 * @returns {{ kpis: Array<{ label: string, value: string }>, soap: Array<{ label: string, items: string[] }> }}
 */
export function buildEaGlance(input) {
  const kpis = [];
  const {
    soporte,
    soporteLitros,
    dieta,
    bombaOn,
    bombaRate,
    pafi,
    soap,
  } = input ?? {};

  if (hasText(soporte)) {
    kpis.push({ label: 'Soporte', value: buildSoporteValue(soporte, soporteLitros) });
  }
  if (typeof pafi === 'number' && Number.isFinite(pafi)) {
    kpis.push({ label: 'PaFi', value: String(pafi) });
  }
  if (hasText(dieta)) {
    kpis.push({ label: 'Dieta', value: prettyPhrase(String(dieta).trim()) });
  }
  if (bombaOn === true) {
    kpis.push({
      label: 'Bomba',
      value: hasText(bombaRate) ? String(bombaRate).trim() : '',
    });
  }

  return { kpis, soap: buildSoapBuckets(soap) };
}

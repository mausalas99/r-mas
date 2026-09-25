/**
 * Pure model: estado clínico glance (plan-of-care KPIs + SOAP zones).
 */

const SOAP_ZONES = [
  {
    letter: 'N',
    subtitle: 'Neuro',
    keys: ['analgesia', 'antiemeticos', 'sedacion', 'antiepilepticos', 'antiparkinsonianos', 'antidotos'],
  },
  { letter: 'V', subtitle: 'Vía aérea', keys: ['viaAerea'] },
  {
    letter: 'HD',
    subtitle: 'Hemo',
    keys: [
      'vasop',
      'antihta',
      'antitromboticos',
      'anticoagulacion',
      'antiarritmicos',
      'diureticos',
      'diuretico',
      'estatinas',
    ],
  },
  { letter: 'HI', subtitle: 'Infeccioso', keys: ['abx', 'transfusiones'] },
  { letter: 'NM', subtitle: 'Soporte', keys: ['nm'] },
];

const SOAP_COL_LETTERS = [
  ['N', 'V'],
  ['HD'],
  ['HI', 'NM'],
];

const KEEP_CAPS_RE = /^(ASA|AAS|NPH|NPT|NM|UTI|ORL|VO|IV|IM|SC|BH|QS|LCR|KCL)$/i;

function hasText(value) {
  return value != null && String(value).trim() !== '';
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
const FORM_WORD =
  '(?:SOLUCI[OÓ]N(?:ES)?|SUSPENSI[OÓ]N(?:ES)?|TABLETAS?|COMPRIMIDOS?|C[AÁ]PSULAS?|AMPOLLETAS?|INYECTABLE|SOBRES?)';
const GLUED_COUNT_FORM_RE = new RegExp('\\s+\\d+(?:[.,]\\d+)?' + FORM_WORD + '\\b.*$', 'i');
const COUNT_FORM_RE = new RegExp('\\s+\\d+(?:[.,]\\d+)?\\s+' + FORM_WORD + '\\b.*$', 'i');
const FORM_CUT_RE = new RegExp('\\s+' + FORM_WORD + '\\b.*$', 'i');

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
  s = s.replace(GLUED_COUNT_FORM_RE, '').trim() || s;
  s = s.replace(COUNT_FORM_RE, '').trim() || s;
  s = s.replace(FORM_CUT_RE, '').trim() || s;
  return prettyPhrase(s);
}

/**
 * Compact ronda token. Empty when the default (VO / c/24 h) is enough.
 * @returns {{ text: string, emphasis: boolean }}
 */
export function glanceMedToken(raw) {
  const s = String(raw || '');
  const dia = s.match(/\bD[IÍ]A\s*(\d+)/i);
  if (dia) return { text: 'día ' + dia[1], emphasis: true };
  if (/\b(PRN|SOS|EN CASO)\b/i.test(s)) return { text: 'PRN', emphasis: false };
  const rate = s.match(/(\d+(?:[.,]\d+)?)\s*mcg\s*\/\s*kg\s*\/\s*min/i);
  if (rate) return { text: rate[1].replace(',', '.'), emphasis: true };
  const freq = s.match(/\bC\/\s*(\d+)\s*H/i) || s.match(/\bCADA\s+(\d+)\s+HORAS?/i);
  if (freq && freq[1] !== '24') {
    const n = Number(freq[1]);
    return { text: 'c/' + freq[1] + ' h', emphasis: n <= 12 };
  }
  if (/\bNEB(?:ULIZAR)?\b/i.test(s)) return { text: 'NEB', emphasis: false };
  if (/\b(?:IV|EV|INTRAVENOS)/i.test(s) && !/\bVO\b/i.test(s) && !/\bORAL\b/i.test(s)) {
    return { text: 'IV', emphasis: false };
  }
  const ui = s.match(/\b(\d+)\s*UI\b/i);
  if (ui && /insulina/i.test(s)) return { text: ui[1] + ' UI', emphasis: false };
  return { text: '', emphasis: false };
}

function glanceMedItem(raw) {
  const name = glanceMedName(raw);
  if (!name) return null;
  return { name, token: '', emphasis: false };
}

function dedupeItems(items) {
  const seen = new Set();
  const out = [];
  (items || []).forEach((item) => {
    if (!item || !item.name) return;
    const key = item.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

const BASAL_INSULIN_RE = /\b(glargina|lantus|toujeo|degludec|tresiba|detemir|levemir|nph|basal)\b/i;
const RAPIDA_INSULIN_RE = /\b(r[aá]pida|lispro|aspart|glulisina|regular|preprandial|novorapid|humalog|apidra|fiasp)\b/i;

function summarizeNmItems(rawLines) {
  const basal = [];
  const rapida = [];
  const rest = [];
  (rawLines || []).forEach((raw) => {
    const item = glanceMedItem(raw);
    if (!item) return;
    if (BASAL_INSULIN_RE.test(raw) || BASAL_INSULIN_RE.test(item.name)) basal.push({ raw, item });
    else if (RAPIDA_INSULIN_RE.test(raw) || RAPIDA_INSULIN_RE.test(item.name)) rapida.push({ raw, item });
    else rest.push(item);
  });
  if (!basal.length || !rapida.length) {
    return dedupeItems([...basal.map((b) => b.item), ...rapida.map((r) => r.item), ...rest]);
  }
  return [{ name: 'Plan Basal Bolo', token: '', emphasis: false }, ...dedupeItems(rest)];
}

function itemsFromRawList(rawList, isNm) {
  const raw = (Array.isArray(rawList) ? rawList : []).map((line) => String(line)).filter(hasText);
  if (isNm) return summarizeNmItems(raw);
  return dedupeItems(raw.map(glanceMedItem));
}

function buildSoapZones(soap) {
  if (!soap || typeof soap !== 'object') return [];
  const zones = [];
  SOAP_ZONES.forEach((def) => {
    const raw = [];
    def.keys.forEach((key) => {
      const list = soap[key];
      if (Array.isArray(list)) raw.push(...list);
    });
    const items = itemsFromRawList(raw, def.letter === 'NM');
    if (!items.length) return;
    zones.push({ letter: def.letter, subtitle: def.subtitle, items });
  });
  return zones;
}

/**
 * Stable 3-slot pack: N+V | HD | HI+NM. Empty slots omitted.
 * @param {Array<{ letter?: string }>} zones
 * @returns {Array<Array>}
 */
export function packSoapCols(zones) {
  const byLetter = Object.create(null);
  (zones || []).forEach((zone) => {
    if (zone && zone.letter) byLetter[zone.letter] = zone;
  });
  return SOAP_COL_LETTERS.map((letters) => letters.map((letter) => byLetter[letter]).filter(Boolean)).filter(
    (col) => col.length,
  );
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
 * @returns {{ kpis: Array<{ label: string, value: string }>, soap: Array<{ letter: string, subtitle: string, items: Array<{ name: string, token: string, emphasis: boolean }> }> }}
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

  return { kpis, soap: buildSoapZones(soap) };
}

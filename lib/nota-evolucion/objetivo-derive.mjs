/**
 * Objetivo (SOAP "O") — derivación pura por zona corporal, a partir de los
 * signos vitales y laboratorio del día. El residente NO teclea este bloque;
 * lo revisa y confirma. Ningún valor se inventa: una zona sin datos reales
 * simplemente no aparece.
 *
 * Zonas (mismo esquema clínico que la Plantilla SOAP existente):
 *   N  — Neurológico
 *   V  — Ventilatorio
 *   HD — Hemodinámico
 *   HI — Infeccioso / Térmico
 *   NM — Nutricional / Metabólico
 */

/** @typedef {{ key: string, label: string, unit: string }} VitalDef */

/** @type {Record<string, VitalDef>} */
const VITAL_DEFS = {
  fr: { key: 'fr', label: 'FR', unit: 'rpm' },
  sat: { key: 'sat', label: 'SatO2', unit: '%' },
  tas: { key: 'tas', label: 'TAS', unit: 'mmHg' },
  tad: { key: 'tad', label: 'TAD', unit: 'mmHg' },
  fc: { key: 'fc', label: 'FC', unit: 'lpm' },
  temp: { key: 'temp', label: 'Temperatura', unit: '°C' },
};

/** Rangos normales — mismos umbrales que public/js/features/estado-actual-ranges.mjs */
export const VITAL_RANGES = {
  tas: { min: 90, max: 140 },
  tad: { min: 60, max: 90 },
  fc: { min: 60, max: 100 },
  fr: { min: 12, max: 20 },
  temp: { min: 36.0, max: 37.5 },
  sat: { min: 94, max: Infinity },
};

/**
 * Zonas y qué vitales/glucometrías les corresponden. Los labs se asocian por
 * palabra clave (ver ZONE_LAB_KEYWORDS) porque el nombre de campo de
 * laboratorio varía según el panel capturado.
 * @type {Array<{ id: string, label: string, vitalKeys: string[] }>}
 */
export const OBJETIVO_ZONES = [
  { id: 'N', label: 'Neurológico', vitalKeys: [] },
  { id: 'V', label: 'Ventilatorio', vitalKeys: ['fr', 'sat'] },
  { id: 'HD', label: 'Hemodinámico', vitalKeys: ['tas', 'tad', 'fc'] },
  { id: 'HI', label: 'Infeccioso / Térmico', vitalKeys: ['temp'] },
  { id: 'NM', label: 'Nutricional / Metabólico', vitalKeys: [] },
];

/** @type {Record<string, string[]>} */
export const ZONE_LAB_KEYWORDS = {
  N: ['sodio', 'na', 'amonio'],
  V: ['po2', 'pco2', 'saturacion', 'gasometria'],
  HD: ['hemoglobina', 'hb', 'hematocrito', 'hto', 'troponina', 'bnp'],
  HI: ['leucocitos', 'leucos', 'pcr', 'procalcitonina', 'neutrofilos'],
  NM: ['glucosa', 'glu', 'potasio', 'k', 'creatinina', 'cr', 'bun', 'urea'],
};

/**
 * @param {unknown} raw
 * @returns {number|null}
 */
function toNumberOrNull(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string} key
 * @param {unknown} raw
 */
export function isVitalOutOfRange(key, raw) {
  const n = toNumberOrNull(raw);
  if (n == null) return false;
  const r = VITAL_RANGES[key];
  if (!r) return false;
  return n < r.min || n > r.max;
}

/**
 * @param {{ value?: unknown, min?: unknown, max?: unknown, altered?: boolean }} lab
 * @returns {boolean}
 */
export function isLabOutOfRange(lab) {
  if (!lab || typeof lab !== 'object') return false;
  // Some real lab sources (the paste-parsed "*" convention used throughout
  // the rest of the app) already know a value is altered but don't carry a
  // numeric reference range alongside it. Trust that pre-computed flag when
  // present instead of silently reporting "in range" for lack of min/max.
  if (typeof lab.altered === 'boolean') return lab.altered;
  const v = toNumberOrNull(lab.value);
  const min = toNumberOrNull(lab.min);
  const max = toNumberOrNull(lab.max);
  if (v == null || min == null || max == null) return false;
  return v < min || v > max;
}

/**
 * Formats a vital reading as a display item.
 * @param {string} key
 * @param {unknown} raw
 * @returns {{ text: string, altered: boolean }|null}
 */
function vitalItem(key, raw) {
  const n = toNumberOrNull(raw);
  if (n == null) return null;
  const def = VITAL_DEFS[key];
  if (!def) return null;
  return {
    text: `${def.label} ${n}${def.unit ? ' ' + def.unit : ''}`,
    altered: isVitalOutOfRange(key, raw),
  };
}

/**
 * @param {string} zoneId
 * @param {Array<{ key?: string, label?: string, value?: unknown, unit?: string, min?: unknown, max?: unknown }>} labs
 * @returns {Array<{ text: string, altered: boolean }>}
 */
/**
 * @param {{ key?: string, label?: string, value?: unknown, unit?: string, min?: unknown, max?: unknown }} lab
 * @param {string[]} keywords
 * @returns {{ text: string, altered: boolean }|null}
 */
function labItemForZone(lab, keywords) {
  if (!lab || typeof lab !== 'object') return null;
  const key = String(lab.key || lab.label || '').toLowerCase();
  if (!key || !keywords.some((kw) => key.includes(kw))) return null;
  const value = lab.value == null || lab.value === '' ? null : lab.value;
  if (value == null) return null;
  const label = String(lab.label || lab.key || '').trim();
  const unit = lab.unit ? ' ' + String(lab.unit) : '';
  return { text: `${label} ${value}${unit}`, altered: isLabOutOfRange(lab) };
}

/**
 * @param {string} zoneId
 * @param {Array<{ key?: string, label?: string, value?: unknown, unit?: string, min?: unknown, max?: unknown }>} labs
 * @returns {Array<{ text: string, altered: boolean }>}
 */
function labItemsForZone(zoneId, labs) {
  const keywords = ZONE_LAB_KEYWORDS[zoneId] || [];
  if (!Array.isArray(labs) || !labs.length || !keywords.length) return [];
  const items = [];
  for (const lab of labs) {
    const item = labItemForZone(lab, keywords);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Pure derivation: given today's vitals + labs, build per-zone Objetivo
 * content. Zones without real data are omitted (never invented).
 *
 * @param {{
 *   vitals?: Record<string, unknown>|null,
 *   labs?: Array<{ key?: string, label?: string, value?: unknown, unit?: string, min?: unknown, max?: unknown }>|null,
 * }} input
 * @returns {{
 *   zones: Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }>,
 *   hasAnyData: boolean,
 * }}
 */
export function deriveObjetivoZones(input) {
  const vitals = input && input.vitals && typeof input.vitals === 'object' ? input.vitals : {};
  const labs = input && Array.isArray(input.labs) ? input.labs : [];
  const zones = [];
  for (const zoneDef of OBJETIVO_ZONES) {
    /** @type {Array<{ text: string, altered: boolean }>} */
    const items = [];
    for (const vKey of zoneDef.vitalKeys) {
      const item = vitalItem(vKey, vitals[vKey]);
      if (item) items.push(item);
    }
    items.push(...labItemsForZone(zoneDef.id, labs));
    if (items.length) {
      zones.push({ id: zoneDef.id, label: zoneDef.label, items });
    }
  }
  return { zones, hasAnyData: zones.length > 0 };
}

/**
 * Renders the derived zones as plain text (one line per zone), matching the
 * existing SOAP-text convention. Out-of-range values get a trailing `*`.
 * @param {Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }>} zones
 * @returns {string}
 */
export function buildObjetivoText(zones) {
  if (!Array.isArray(zones) || !zones.length) return '';
  return zones
    .map((zone) => {
      const body = zone.items
        .map((item) => item.text + (item.altered ? '*' : ''))
        .join(', ');
      return `${zone.id}: ${body}`;
    })
    .join('\n');
}

/**
 * Builds the signed/confirmed snapshot object to persist once the resident
 * reviews and accepts the derived Objetivo. Follows the same
 * `{ ...data, savedAt }` convention as `patient.monitoreo.textoGuardado`
 * (see public/js/features/soap-estado.mjs).
 * @param {{ vitals?: Record<string, unknown>|null, labs?: unknown[]|null }} input
 * @param {{ now?: () => Date }} [options]
 * @returns {{ zones: Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }>, text: string, confirmedAt: string }}
 */
export function buildObjetivoSnapshot(input, options) {
  const now = options && typeof options.now === 'function' ? options.now : () => new Date();
  const { zones } = deriveObjetivoZones(input);
  return {
    zones,
    text: buildObjetivoText(zones),
    confirmedAt: now().toISOString(),
  };
}

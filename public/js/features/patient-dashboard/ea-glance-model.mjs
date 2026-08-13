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

function nonEmptyItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item).trim()).filter(Boolean);
}

function buildSoapBuckets(soap) {
  if (!soap || typeof soap !== 'object') return [];
  const buckets = [];
  for (const [key, items] of Object.entries(soap)) {
    const list = nonEmptyItems(items);
    if (!list.length) continue;
    buckets.push({ label: soapLabel(key), items: list });
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
    kpis.push({ label: 'Dieta', value: String(dieta).trim() });
  }
  if (bombaOn === true) {
    kpis.push({
      label: 'Bomba',
      value: hasText(bombaRate) ? String(bombaRate).trim() : '',
    });
  }

  return { kpis, soap: buildSoapBuckets(soap) };
}

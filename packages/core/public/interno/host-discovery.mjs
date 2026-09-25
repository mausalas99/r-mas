/**
 * Interno MIP is Nube-only. API base is the page origin (Worker /interno).
 */

/** @type {Record<string, string>} */
const SLUG_TO_SALA = {
  'sala-1': 'Sala 1',
  'sala-2': 'Sala 2',
  'sala-e': 'Sala E',
  'torre-hu': 'Torre HU',
  'area-a-pensionistas': 'Área A/Pensionistas',
  interconsultas: 'Interconsultas',
  ux: 'UX',
  eme: 'Eme',
  '1': 'Sala 1',
  '2': 'Sala 2',
  e: 'Sala E',
};

/** @returns {boolean} */
export function isCloudInternoShell() {
  return typeof globalThis !== 'undefined' && !!globalThis.__RPC_CLOUD_INTERNO__;
}

/** @returns {Promise<string>} */
export async function resolveInternoApiBase() {
  const origin = typeof window !== 'undefined' ? window.location : null;
  if (!origin) return '';
  return String(origin.origin || '').replace(/\/+$/, '');
}

/** @param {string} path */
export function parseInternoPath(path) {
  const m = String(path || '').match(/\/interno\/([^/?#]+)/i);
  if (!m) return '';
  const slug = m[1].toLowerCase();
  return SLUG_TO_SALA[slug] ? slug : '';
}

/** @param {string} slug */
export function salaKeyFromSlug(slug) {
  return SLUG_TO_SALA[String(slug || '').toLowerCase()] || '';
}

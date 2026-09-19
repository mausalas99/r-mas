import { CLINICAL_SALA_VALUES, clinicalSalaRoomSlug } from '../../../../lib/clinical-salas.mjs';
import { normalizeCloudSala, isCloudSala } from '../sala-allowlist.js';

/** @type {Map<string, string>} */
const SLUG_TO_SALA = new Map();

for (const sala of CLINICAL_SALA_VALUES) {
  const slug = clinicalSalaRoomSlug(sala);
  if (slug) SLUG_TO_SALA.set(slug, sala);
}

// Short aliases used in legacy QR/bookmarks.
SLUG_TO_SALA.set('1', 'Sala 1');
SLUG_TO_SALA.set('2', 'Sala 2');
SLUG_TO_SALA.set('e', 'Sala E');

/** @param {unknown} slug */
export function salaFromSlug(slug) {
  const key = String(slug || '').trim().toLowerCase();
  return SLUG_TO_SALA.get(key) || '';
}

/** @param {unknown} raw */
export function normalizeInternoSala(raw) {
  const normalized = normalizeCloudSala(raw);
  return isCloudSala(normalized) ? normalized : '';
}

/** @param {unknown} sala */
export function slugFromSala(sala) {
  return clinicalSalaRoomSlug(String(sala || '').trim());
}

export { CLINICAL_SALA_VALUES };

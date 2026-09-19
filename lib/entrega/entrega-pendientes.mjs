import {
  emptyPendientesDoc,
  normalizePendientesLegacyArray,
  normalizePendientesV2,
} from './entrega-pendientes-parse.mjs';

/** @param {string|object|null|undefined} raw */
export function normalizePendientesJson(raw) {
  if (raw == null || raw === '') return emptyPendientesDoc();
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return emptyPendientesDoc();
  }
  if (parsed && parsed.version === 2 && Array.isArray(parsed.items)) {
    return normalizePendientesV2(parsed);
  }
  if (Array.isArray(parsed)) {
    return normalizePendientesLegacyArray(parsed);
  }
  return emptyPendientesDoc();
}

/** @param {object} doc */
export function serializePendientesJson(doc) {
  return JSON.stringify(normalizePendientesJson(doc));
}

/** R+ HF is a single-rotation cardiology unit — one team, one sala. */
export const CLOUD_SALAS = Object.freeze(['Unidad IC']);

/** @param {unknown} raw */
export function normalizeCloudSala(raw) {
  const s = String(raw || '').trim();
  const key = s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (key === 'unidad ic' || key === 'unidad-ic' || key === 'ic') return 'Unidad IC';
  return s;
}

/** @param {unknown} raw */
export function isCloudSala(raw) {
  return CLOUD_SALAS.includes(normalizeCloudSala(raw));
}

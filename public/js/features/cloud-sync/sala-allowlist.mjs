/** Keep in sync with cloud/sync-worker/src/sala-allowlist.js */
/** R+ HF is a single-rotation cardiology unit — one team, one sala. */
export const CLOUD_SALAS = Object.freeze(['Unidad IC']);

/** @param {unknown} raw */
export function normalizeCloudSala(raw) {
  const s = String(raw || '').trim();
  const key = s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (key === 'unidad ic' || key === 'unidad-ic' || key === 'ic') return 'Unidad IC';
  return s;
}

/**
 * Ward label for Conexión chrome (UI).
 * @param {unknown} clinicalRaw — from settings / session
 * @param {unknown} [roomSala] — room.sala from API
 * @returns {string}
 */
export function displayCloudSalaLabel(clinicalRaw, roomSala) {
  const clinical = String(clinicalRaw || '').trim();
  if (clinical) {
    const n = normalizeCloudSala(clinical);
    if (CLOUD_SALAS.includes(n)) return n;
    return clinical;
  }
  const room = String(roomSala || '').trim();
  return room || '—';
}

/** @param {unknown} raw */
export function isCloudSala(raw) {
  return CLOUD_SALAS.includes(normalizeCloudSala(raw));
}

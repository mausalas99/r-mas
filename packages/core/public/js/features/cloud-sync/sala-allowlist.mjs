/** Keep in sync with cloud/sync-worker/src/sala-allowlist.js */
export const CLOUD_SALAS = Object.freeze([
  'Sala 1',
  'Sala 2',
  'Sala E',
  'Torre HU',
  'Interconsultas',
  'UX',
  'Eme',
  'Área A/Pensionistas',
]);

/** @param {unknown} raw */
export function normalizeCloudSala(raw) {
  const s = String(raw || '').trim();
  const key = s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const salaUnit = key.match(/^sala\s*([12e])$/);
  if (salaUnit) {
    const unit = salaUnit[1] === 'e' ? 'E' : salaUnit[1];
    return `Sala ${unit}`;
  }
  if (key === 'torre' || key === 'torre hu' || key === 'torre-hu' || key === 'torrehu') {
    return 'Torre HU';
  }
  if (key.includes('interconsult')) return 'Interconsultas';
  if (key === 'ux') return 'UX';
  if (key === 'eme') return 'Eme';
  if (key.includes('area a') || key.includes('pension')) return 'Área A/Pensionistas';
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

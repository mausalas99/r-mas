/** Keep in sync with cloud/sync-worker/src/sala-allowlist.js */
export const CLOUD_SALAS = Object.freeze(['Sala', 'Torre HU']);
export const LAN_ONLY_SALAS = Object.freeze([
  'Interconsultas',
  'UX',
  'Eme',
  'Área A/Pensionistas',
]);

/** @param {unknown} raw */
export function normalizeCloudSala(raw) {
  const s = String(raw || '').trim();
  const key = s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (key === 'sala' || /^sala\s*[12e]$/i.test(s)) return 'Sala';
  if (key === 'torre hu' || key === 'torre-hu' || key === 'torrehu') return 'Torre HU';
  if (key.includes('interconsult')) return 'Interconsultas';
  if (key === 'ux') return 'UX';
  if (key === 'eme') return 'Eme';
  if (key.includes('area a') || key.includes('pension')) return 'Área A/Pensionistas';
  return s;
}

/**
 * Ward label for Conexión chrome (UI). Keeps "Sala 1" / "Sala 2" / "Sala E"
 * instead of collapsing to the cloud bucket "Sala".
 * @param {unknown} clinicalRaw — from settings / session
 * @param {unknown} [roomSala] — room.sala from API (often the bucket)
 * @returns {string}
 */
export function displayCloudSalaLabel(clinicalRaw, roomSala) {
  const clinical = String(clinicalRaw || '').trim();
  if (clinical) {
    const m = clinical.match(/^sala\s*([12e])$/i);
    if (m) {
      const unit = m[1].toLowerCase() === 'e' ? 'E' : m[1];
      return 'Sala ' + unit;
    }
    const n = normalizeCloudSala(clinical);
    if (n === 'Torre HU') return 'Torre HU';
    if (n !== 'Sala') return n;
    return clinical;
  }
  const room = String(roomSala || '').trim();
  if (room && room !== 'Sala') return room;
  return room || 'Sala';
}

/** @param {unknown} raw */
export function isCloudSala(raw) {
  return CLOUD_SALAS.includes(normalizeCloudSala(raw));
}

/** @param {unknown} raw */
export function isLanOnlySala(raw) {
  return LAN_ONLY_SALAS.includes(normalizeCloudSala(raw));
}

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

/** @param {unknown} raw */
export function isCloudSala(raw) {
  return CLOUD_SALAS.includes(normalizeCloudSala(raw));
}

/** @param {unknown} raw */
export function isLanOnlySala(raw) {
  return LAN_ONLY_SALAS.includes(normalizeCloudSala(raw));
}

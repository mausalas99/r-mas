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

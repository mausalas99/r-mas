export const EQUIPOS_DEVICE_TYPES = ['lumify', 'ekg', 'ultrasound'];

export const EQUIPOS_ROTACIONES = [
  'Sala 1',
  'Sala 2',
  'Sala E',
  'Torre HU',
  'Área A/Pensionistas',
  'Interconsultas',
  'UX',
  'Eme',
];

/** @param {string} deviceType */
export function normalizeEquiposDeviceType(deviceType) {
  const d = String(deviceType || '').trim().toLowerCase();
  return EQUIPOS_DEVICE_TYPES.includes(d) ? d : '';
}

/** @param {string} rotation */
export function normalizeEquiposRotation(rotation) {
  const r = String(rotation || '').trim();
  return EQUIPOS_ROTACIONES.includes(r) ? r : '';
}

/** @param {string} name */
export function normalizeReporterName(name) {
  const n = String(name || '').trim();
  if (n.length < 2 || n.length > 80) return '';
  return n;
}

export function newEquiposId() {
  return crypto.randomUUID();
}

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

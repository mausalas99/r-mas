import crypto from 'node:crypto';
import { CLINICAL_SALA_VALUES } from '../clinical-salas.mjs';

export const EQUIPOS_DEVICE_TYPES = ['lumify', 'ekg', 'ultrasound'];

export const EQUIPOS_DEVICE_LABELS = {
  lumify: 'Lumify',
  ekg: 'EKG',
  ultrasound: 'Ultrasonido',
};

/** @param {string} deviceType */
export function normalizeEquiposDeviceType(deviceType) {
  const d = String(deviceType || '').trim().toLowerCase();
  return EQUIPOS_DEVICE_TYPES.includes(d) ? d : '';
}

/** @param {string} rotation */
export function normalizeEquiposRotation(rotation) {
  const r = String(rotation || '').trim();
  return CLINICAL_SALA_VALUES.includes(r) ? r : '';
}

/** @param {string} name */
export function normalizeReporterName(name) {
  const n = String(name || '').trim();
  if (n.length < 2 || n.length > 80) return '';
  return n;
}

/** @param {string} [deviceType] */
export function normalizePurgeTarget(deviceType) {
  const d = String(deviceType || 'all').trim().toLowerCase();
  if (d === 'all') return 'all';
  return normalizeEquiposDeviceType(d) || '';
}

export function newEquiposId() {
  return crypto.randomUUID();
}

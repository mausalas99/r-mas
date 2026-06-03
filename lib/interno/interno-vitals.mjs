import crypto from 'node:crypto';
import { appendMedicion, medicionHasCoreData } from '../../public/js/features/estado-actual-data.mjs';
import { buildAlteredAtDefaults } from '../../public/js/features/estado-actual-ranges.mjs';

export const GLU_RANGE = { min: 70, max: 180 };

/** @param {unknown} raw */
export function isGluAltered(raw) {
  if (raw == null || String(raw).trim() === '') return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  return n < GLU_RANGE.min || n > GLU_RANGE.max;
}

/**
 * @param {{
 *   vitals?: Record<string, unknown>,
 *   glucometrias?: Array<{ value?: unknown, time?: string }>,
 *   reporterName?: string,
 *   sala?: string,
 * }} payload
 */
export function buildInternoMedicion(payload) {
  const vitals = payload?.vitals && typeof payload.vitals === 'object' ? payload.vitals : {};
  const glucometrias = Array.isArray(payload?.glucometrias)
    ? payload.glucometrias
        .map((g) => ({
          value: g?.value != null && g.value !== '' ? Number(g.value) : null,
          time: g?.time ? String(g.time) : '',
        }))
        .filter((g) => g.value != null && Number.isFinite(g.value))
    : [];

  const now = new Date();
  const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const alteredAt = buildAlteredAtDefaults(vitals, timeLabel);

  for (const g of glucometrias) {
    if (isGluAltered(g.value)) {
      alteredAt.glu = g.time || timeLabel;
      break;
    }
  }

  const sala = String(payload?.sala || '').trim();
  const name = String(payload?.reporterName || '').trim();
  const recordedBy = {
    kind: 'interno',
    sala: sala || undefined,
    name: name || (sala ? `Interno ${sala}` : 'Interno'),
  };

  /** @type {import('../../public/js/features/estado-actual-data.mjs').MedicionHistorial} */
  const medicion = {
    id: crypto.randomUUID(),
    recordedAt: now.toISOString(),
    vitals,
    glucometrias,
    alteredAt,
    recordedBy,
  };

  if (!medicionHasCoreData(medicion)) {
    return { ok: false, error: 'empty' };
  }

  return { ok: true, medicion, hasAlterations: Object.keys(alteredAt).length > 0 };
}

/**
 * @param {object} patient
 * @param {object} medicion
 */
export function applyInternoMedicionToPatient(patient, medicion) {
  const result = appendMedicion(patient, medicion);
  if (!result.ok) return result;
  if (!patient.monitoreo) patient.monitoreo = { historial: [] };
  return { ok: true, patient };
}

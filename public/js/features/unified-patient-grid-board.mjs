/**
 * High-density Guardia census grid with elevated team partitioning.
 */
import { calcVitalsBanner } from '../../../lib/interno/vitals-banner.mjs';
import { vitalsBannerForGuardia } from './unified-patient-grid-chip-html.mjs';

export { calcVitalsBanner, vitalsBannerForGuardia };

export const R4_FOLLOWUP_PIN_LABEL = 'Interconsultas — Seguimiento';

/** @param {Array<{ interconsult_type?: string, interconsult_status?: string }>} patients */
export function filterR4FollowUpPinPatients(patients) {
  return patients.filter(
    (p) => p.interconsult_type === 'Follow-up' && p.interconsult_status !== 'Resolved'
  );
}

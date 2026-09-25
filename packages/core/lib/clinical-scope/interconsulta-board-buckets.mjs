import { toMillis } from './shared.mjs';

function readConsultInfo(patient) {
  const info = patient && patient.consultInfo;
  if (!info || typeof info !== 'object') return { followUpStatus: '' };
  return { followUpStatus: String(info.followUpStatus || '') };
}

function isCreatedToday(patient, now) {
  const created = toMillis(patient && patient.created_at);
  if (Number.isNaN(created)) return false;
  const ref = now instanceof Date ? now : new Date();
  const createdDate = new Date(created);
  return (
    createdDate.getFullYear() === ref.getFullYear() &&
    createdDate.getMonth() === ref.getMonth() &&
    createdDate.getDate() === ref.getDate()
  );
}

/**
 * Classifies an interconsulta patient into a team-board bucket.
 * @param {object} patient
 * @param {{isGuardiaTeam?: boolean, now?: Date}} [opts]
 * @returns {'preop'|'pendientes'|'under'|'archivado'}
 */
export function classifyInterconsultaBoardBucket(patient, opts) {
  const { isGuardiaTeam = false, now } = opts || {};
  if (!patient) return 'pendientes';

  if (String(patient.interconsult_status || '') === 'Resolved') return 'archivado';
  if (String(patient.interconsult_type || '') === 'Under') return 'under';

  if (isGuardiaTeam) {
    if (String(patient.interconsult_type || '') === 'Ephemeral_VPO') return 'preop';
    const { followUpStatus } = readConsultInfo(patient);
    if (followUpStatus === 'pendiente' && isCreatedToday(patient, now)) return 'preop';
  }

  return 'pendientes';
}

import { normalizeServiceKey } from './shared.mjs';

/** @param {string} serviceOrArea */
export function extractSalaLetter(serviceOrArea) {
  const raw = String(serviceOrArea || '').trim();
  const match = raw.match(/Sala\s*([A-F])/i);
  if (match) return match[1].toUpperCase();
  const lone = raw.match(/^([A-F])$/i);
  return lone ? lone[1].toUpperCase() : '';
}

/** @param {{ service?: string, sub_area?: string, sub_area_fraction?: string, name?: string }} teamOrPatient */
export function salaLetterForTeamOrArea(teamOrPatient) {
  const frac = String(teamOrPatient?.sub_area_fraction || '').trim();
  const bare = frac.replace(/[0-9]+$/, '').toUpperCase();
  if (bare && /^[A-F]$/.test(bare)) return bare;
  const fromName = extractSalaLetter(teamOrPatient?.name || '');
  if (fromName) return fromName;
  return extractSalaLetter(teamOrPatient?.sub_area || teamOrPatient?.service || '');
}

/** @param {string} letter */
function salaLabelFromLetter(letter) {
  if (letter === '1') return 'Sala 1';
  if (letter === '2') return 'Sala 2';
  if (letter === 'E') return 'Sala E';
  return '';
}

/** @param {string} svc */
function salaLabelFromServiceKey(svc) {
  if (svc.includes('torre hu')) return 'Torre HU';
  if (svc.includes('area a') || svc.includes('pension')) return 'Área A/Pensionistas';
  return '';
}

/** @param {{ sala?: string, servicio?: string, service?: string, area?: string, sub_area?: string }} patient */
function inferPatientSala(patient) {
  const source = patient?.servicio || patient?.service || patient?.area || patient?.sub_area || '';
  const fromLetter = salaLabelFromLetter(extractSalaLetter(source));
  if (fromLetter) return fromLetter;
  return salaLabelFromServiceKey(normalizeServiceKey(patient?.servicio || patient?.service || ''));
}

/** @param {{ sala?: string, servicio?: string, service?: string, area?: string, sub_area?: string }} patient */
export function resolvePatientSala(patient) {
  const explicit = String(patient?.sala || '').trim();
  return explicit || inferPatientSala(patient);
}

/** @param {object} patient @param {string} userSala */
export function patientInUserSala(patient, userSala) {
  const ps = resolvePatientSala(patient);
  return ps !== '' && ps === String(userSala || '').trim();
}

/** @param {object[]|null|undefined} teams @param {string} teamId */
function findClinicalTeamById(teams, teamId) {
  const id = String(teamId || '').trim();
  if (!id) return null;
  return (teams || []).find((t) => String(t?.team_id || '') === id) || null;
}

/**
 * Tag a new chart row with clinical sala for census/LAN scope.
 * Team sala wins over creator profile sala (e.g. off-call UX assigning Interconsultas).
 * @param {Record<string, unknown>} patient
 * @param {{ sala?: string|null|undefined }|null|undefined} user
 * @param {{ team?: object|null, teamId?: string, teams?: object[] }|null|undefined} [opts]
 */
export function stampPatientClinicalSala(patient, user, opts) {
  if (!patient || typeof patient !== 'object') return patient;
  const team =
    opts?.team ||
    findClinicalTeamById(opts?.teams, opts?.teamId) ||
    null;
  const teamSala = String(team?.sala || '').trim();
  if (teamSala) {
    patient.sala = teamSala;
    return patient;
  }
  const profileSala = String(user?.sala || '').trim();
  if (profileSala) {
    patient.sala = profileSala;
    return patient;
  }
  const inferred = resolvePatientSala(patient);
  if (inferred) patient.sala = inferred;
  return patient;
}

/**
 * Backfill explicit sala on legacy charts (idempotent).
 * @param {object[]|null|undefined} patients
 * @param {{ sala?: string|null|undefined }|null|undefined} user
 * @returns {number}
 */
export function migratePatientsClinicalSala(patients, user) {
  if (!Array.isArray(patients) || !user) return 0;
  let migrated = 0;
  for (const patient of patients) {
    if (!patient || typeof patient !== 'object' || patient.isDemo) continue;
    if (String(patient.sala || '').trim()) continue;
    stampPatientClinicalSala(patient, user);
    if (String(patient.sala || '').trim()) migrated += 1;
  }
  return migrated;
}

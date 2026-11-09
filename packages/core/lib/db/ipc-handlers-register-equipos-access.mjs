import { getClinicalProfile } from './clinical-access-db.mjs';
import { canManageInternoQr } from './clinical-privileges.mjs';

function assertEquiposAdmin(db, userId) {
  const profile = getClinicalProfile(db, String(userId || ''));
  if (!canManageInternoQr(profile)) {
    throw new Error('Sin permisos para gestionar equipos.');
  }
  return profile;
}

export { assertEquiposAdmin };

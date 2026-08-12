import { OFF_CALL_INTERCONSULTAS_SERVICES } from '../clinical-team-composition.mjs';
import { normalizeServiceKey } from './shared.mjs';
import { isOnCallToday } from './cycle-letters.mjs';

export function isInterconsultasPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey(patient.service || patient.servicio || '');
  const sub = normalizeServiceKey(patient.sub_area || patient.area || '');
  if (svc.includes('interconsult') || sub.includes('interconsult')) return true;
  const ic = String(patient.interconsult_type || 'None');
  return ic !== 'None' && ic !== '';
}

export function userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now) {
  const uid = String(userId || '');
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    if (!OFF_CALL_INTERCONSULTAS_SERVICES.has(svc)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return !isOnCallToday(team, rank, now);
  });
}

export function userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now) {
  const uid = String(userId || '');
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    if (!svc.includes('interconsult')) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return isOnCallToday(team, rank, now);
  });
}

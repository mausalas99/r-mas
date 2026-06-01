/**
 * Acceso a la guía clínica (Manejo): oculta por defecto hasta desbloqueo explícito.
 */

import { isClinicoUnlockDisabled } from './clinical-product-policy.mjs';

export const CLINICO_UNLOCK_PHRASE = 'entiendo, usare mi criterio clincio';

const R3_EXTENDED_SERVICES = new Set(['torre hu', 'eme', 'ux']);

/** @param {unknown} text */
export function normalizeClinicoUnlockPhrase(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** @param {unknown} text */
export function matchesClinicoUnlockPhrase(text) {
  return (
    normalizeClinicoUnlockPhrase(text) ===
    normalizeClinicoUnlockPhrase(CLINICO_UNLOCK_PHRASE)
  );
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function isClinicoUnlocked(settings) {
  if (!settings || typeof settings !== 'object') return false;
  if (settings.clinicoUnlocked) return true;
  if (settings.hideManejoSection === false && !settings.hideClinicoTab) return true;
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function isClinicoAccessHidden(settings) {
  if (!isClinicoUnlocked(settings)) return true;
  if (!settings) return true;
  return !!(settings.hideManejoSection || settings.hideClinicoTab);
}

/** @type {null|(() => void)} */
var _unlockSuccessCb = null;

export function openClinicoUnlockModal(onSuccess) {
  if (isClinicoUnlockDisabled()) return;
  var backdrop = document.getElementById('clinico-unlock-backdrop');
  var input = document.getElementById('clinico-unlock-input');
  var err = document.getElementById('clinico-unlock-error');
  if (!backdrop || !input) {
    if (typeof onSuccess === 'function') onSuccess();
    return;
  }
  _unlockSuccessCb = typeof onSuccess === 'function' ? onSuccess : null;
  input.value = '';
  if (err) {
    err.textContent = '';
    err.hidden = true;
  }
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  window.setTimeout(function () {
    input.focus();
  }, 40);
}

export function closeClinicoUnlockModal() {
  var backdrop = document.getElementById('clinico-unlock-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  _unlockSuccessCb = null;
}

export function confirmClinicoUnlock() {
  if (isClinicoUnlockDisabled()) return;
  var input = document.getElementById('clinico-unlock-input');
  var err = document.getElementById('clinico-unlock-error');
  if (!input) return;
  if (!matchesClinicoUnlockPhrase(input.value)) {
    if (err) {
      err.textContent =
        'Escribe exactamente: «' + CLINICO_UNLOCK_PHRASE + '» (sin comillas).';
      err.hidden = false;
    }
    input.focus();
    input.select();
    return;
  }
  var cb = _unlockSuccessCb;
  closeClinicoUnlockModal();
  if (cb) cb();
}

export const clinicoAccessWindowHandlers = {
  openClinicoUnlockModal,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
};

/** @param {unknown} value */
function normalizeServiceKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

const CYCLE_CONFIGS = {
  sala_r2: { letters: ['A','B','C','D','E','F'], length: 6 },
  sala_r1: { letters: ['A1','B1','C1','D1','A2','B2','C2','D2'], length: 8 },
  default: { letters: ['A','B','C','D'], length: 4 },
};

export function getCycleConfig(service, rank) {
  const svc = normalizeServiceKey(service);
  if (svc.includes('sala')) {
    if (rank === 'R2') return CYCLE_CONFIGS.sala_r2;
    if (rank === 'R1') return CYCLE_CONFIGS.sala_r1;
  }
  return CYCLE_CONFIGS.default;
}

export function letterIndexForTeam(team, rank) {
  const frac = String(team?.sub_area_fraction || '').trim().toUpperCase();
  if (!frac) return -1;
  const cfg = getCycleConfig(team?.service, rank);
  return cfg.letters.indexOf(frac);
}

export function isOnCallToday(team, rank, now) {
  const idx = letterIndexForTeam(team, rank);
  if (idx === -1) return false;
  const cfg = getCycleConfig(team?.service, rank);
  const d = now instanceof Date ? now : new Date(String(now));
  const dayOfMonth = d.getDate();
  return (dayOfMonth - 1) % cfg.length === idx;
}

/** @param {Date|string|undefined} value @param {string|undefined} [fallbackIso] */
function toMillis(value, fallbackIso) {
  if (value instanceof Date) return value.getTime();
  if (value != null && value !== '') return new Date(String(value)).getTime();
  if (fallbackIso) return new Date(String(fallbackIso)).getTime();
  return NaN;
}

/**
 * @param {{ preview_start_at?: string, effective_at?: string }|null|undefined} cycle
 * @param {Date|string|undefined} now
 */
export function isIncomingPreviewWindow(cycle, now) {
  if (!cycle?.preview_start_at || !cycle?.effective_at) return false;
  const t = toMillis(now);
  const start = toMillis(cycle.preview_start_at);
  const end = toMillis(cycle.effective_at);
  if (!Number.isFinite(t) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return t >= start && t < end;
}

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
  // Strip numeric sub-index for R1 (e.g., "A1" -> "A")
  const bare = frac.replace(/[0-9]+$/, '').toUpperCase();
  if (bare && /^[A-F]$/.test(bare)) return bare;
  const fromName = extractSalaLetter(teamOrPatient?.name || '');
  if (fromName) return fromName;
  return extractSalaLetter(teamOrPatient?.sub_area || teamOrPatient?.service || '');
}

/**
 * @param {{ id?: string, service?: string, sub_area?: string, interconsult_type?: string }|null|undefined} patient
 */
export function isR4MacroPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey(patient.service);
  const sub = normalizeServiceKey(patient.sub_area);
  if (svc.includes('sala') || sub.includes('sala')) return true;
  if (svc.includes('interconsult') || sub.includes('interconsult')) return true;
  const ic = String(patient.interconsult_type || 'None');
  return ic !== 'None';
}

/**
 * @param {{ id?: string, service?: string, sub_area?: string }|null|undefined} patient
 * @param {{ service?: string, sub_area_fraction?: string, name?: string }} team
 */
export function patientMatchesTeam(patient, team) {
  if (!patient || !team) return false;
  const patientSvc = normalizeServiceKey(patient.service);
  const teamSvc = normalizeServiceKey(team.service);
  if (patientSvc !== teamSvc && !(patientSvc.includes('sala') && teamSvc.includes('sala'))) {
    if (teamSvc.includes('sala') && (patientSvc.includes('sala') || extractSalaLetter(patient.service))) {
      // allow Sala patient vs Sala team
    } else if (patientSvc !== teamSvc) {
      return false;
    }
  }
  const frac = String(team.sub_area_fraction || '').trim();
  if (!frac) return true;
  const letter = frac.toUpperCase();
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (patientLetter && patientLetter === letter) return true;
  const hay = `${patient.service || ''} ${patient.sub_area || ''}`;
  return hay.toUpperCase().includes(letter);
}

/** @param {object[]} teams @param {string} userId */
export function getJoinedTeams(teams, userId) {
  const uid = String(userId || '');
  if (!uid) return [];
  return (teams || []).filter((team) =>
    (team.members || []).some((m) => String(m.user_id) === uid)
  );
}

/**
 * Checks if a patient is assigned to any of the user's teams.
 * @param {string} patientId
 * @param {object[]} assignments — from patient_team_assignment
 * @param {Set<string>} joinedTeamIds
 */
export function patientAssignedToTeam(patientId, assignments, joinedTeamIds) {
  const pid = String(patientId || '');
  return (assignments || []).some(
    (a) => String(a.patient_id) === pid && joinedTeamIds.has(String(a.team_id))
  );
}

/**
 * Checks if the patient was handed off to this user via active_guardias.
 * @param {string} patientId
 * @param {string} userId
 * @param {object[]} guardias
 */
export function patientCoveredByGuardia(patientId, userId, guardias) {
  const uid = String(userId || '');
  return (guardias || []).some(
    (g) => String(g.patient_id) === String(patientId) && String(g.covering_user_id) === uid
  );
}

/** @param {string} userId @param {{ covering_user_id?: string }}|null|undefined activeGuardia */
export function isActiveGuardiaCoveringUser(userId, activeGuardia) {
  if (!activeGuardia || !userId) return false;
  return String(activeGuardia.covering_user_id || '') === String(userId);
}

/**
 * @param {Array<{ team_id?: string, user_id?: string }>} salaGuardiaToday
 * @param {object[]} teams
 * @param {string} salaLetter
 */
export function hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, salaLetter) {
  const letter = String(salaLetter || '').toUpperCase();
  if (!letter) return false;
  const salaTeams = (teams || []).filter(
    (t) => normalizeServiceKey(t.service).includes('sala') && salaLetterForTeamOrArea(t) === letter
  );
  if (!salaTeams.length) return false;
  const declared = new Set(
    (salaGuardiaToday || []).map((row) => String(row.team_id || ''))
  );
  return salaTeams.some((t) => declared.has(String(t.team_id || '')));
}

/**
 * @param {Array<{ team_id?: string, user_id?: string }>} salaGuardiaToday
 * @param {object[]} teams
 * @param {string} userId
 * @param {Date|string|number} now
 */
export function computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, userId, now) {
  const uid = String(userId || '');
  if (!uid) return false;
  const d = now instanceof Date ? now : new Date(String(now));
  const r2Cfg = CYCLE_CONFIGS.sala_r2;
  const hasDeficitLetter = r2Cfg.letters.some(
    (letter) => !hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, letter)
  );
  if (!hasDeficitLetter) return false;
  return (teams || []).some((team) => {
    if (!normalizeServiceKey(team.service).includes('sala')) return false;
    if (!isOnCallToday(team, 'R2', d)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return (salaGuardiaToday || []).some(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
  });
}

/**
 * Returns the R1(s) on call for a given Sala today.
 * @param {object[]} teams — all teams (each with sala, sub_area_fraction, members)
 * @param {string} sala — "Sala 1" | "Sala 2" | "Sala E"
 * @param {Date|string} now
 * @returns {{ team_id: string, user_id: string }[]} — on-call R1s
 */
export function salaOnCallR1(teams, sala, now) {
  const d = now instanceof Date ? now : new Date(String(now));
  return (teams || [])
    .filter((t) => t.sala === sala)
    .filter((t) => isOnCallToday(t, 'R1', d))
    .flatMap((t) =>
      (t.members || [])
        .filter((m) => m.rank === 'R1')
        .map((m) => ({ team_id: t.team_id, user_id: m.user_id }))
    );
}

/**
 * Returns the R2(s) on call across all Salas today.
 * @param {object[]} teams
 * @param {Date|string} now
 * @returns {{ team_id: string, user_id: string }[]}
 */
export function salaOnCallR2(teams, now) {
  const d = now instanceof Date ? now : new Date(String(now));
  const r2Teams = (teams || []).filter((t) => isOnCallToday(t, 'R2', d));
  return r2Teams.flatMap((t) =>
    (t.members || [])
      .filter((m) => m.rank === 'R2')
      .map((m) => ({ team_id: t.team_id, user_id: m.user_id }))
  );
}

/**
 * Returns the actual on-call user for a team, respecting guardia overrides.
 * @param {object} team — with guardia_today field { user_id: string }
 * @returns {string|null} — user_id of the declared guardia, or null
 */
export function teamGuardiaOverride(team) {
  return team?.guardia_today?.user_id || null;
}

/**
 * @param {string} userId
 * @param {{ id?: string, service?: string, sub_area?: string }} patient
 * @param {object[]} joinedTeams
 * @param {Array<{ team_id?: string, user_id?: string }>} salaGuardiaToday
 * @param {object[]} teams
 * @param {Date} now
 */
export function canR2SalaAbcdefDeficitWrite(userId, patient, joinedTeams, salaGuardiaToday, teams, now) {
  if (!normalizeServiceKey(patient?.service).includes('sala') && !extractSalaLetter(patient?.service || '')) {
    return false;
  }
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (!patientLetter) return false;
  if (hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, patientLetter)) return false;

  const uid = String(userId || '');
  return joinedTeams.some((team) => {
    if (!normalizeServiceKey(team.service).includes('sala')) return false;
    if (!isOnCallToday(team, 'R2', now)) return false;
    const declared = (salaGuardiaToday || []).find(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
    return !!declared;
  });
}

/**
 * @param {{ user_id?: string, rank?: string, sala?: string }|null|undefined} currentUser
 * @param {{ id?: string, service?: string, sub_area?: string, interconsult_type?: string, sala?: string }|null|undefined} targetPatient
 * @param {{ covering_user_id?: string, source_team_id?: string }|null|undefined} activeGuardia
 * @param {{
 *   teams?: object[],
 *   guardias?: object[],
 *   cycle?: object|null,
 *   assignments?: object[],
 *   salaGuardiaToday?: object[],
 *   guardiaMode?: boolean,
 *   now?: string|Date,
 * }|null|undefined} [context]
 */
export function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  const ctx = context && typeof context === 'object' ? context : {};
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const guardias = Array.isArray(ctx.guardias) ? ctx.guardias : [];
  const cycle = ctx.cycle ?? null;
  const guardiaMode = !!ctx.guardiaMode;
  const now =
    ctx.now != null
      ? ctx.now instanceof Date
        ? ctx.now
        : new Date(String(ctx.now))
      : new Date();
  const userId = String(currentUser?.user_id || '');
  const rank = String(currentUser?.rank || '');
  const patientId = String(targetPatient?.id || '');
  const userSala = String(currentUser?.sala || '');

  const deny = (reasoning, extra = {}) => ({
    readable: false,
    writable: false,
    reasoning,
    audit: { userId: currentUser?.user_id, rank: currentUser?.rank, patientId: targetPatient?.id, timestamp: now.toISOString() },
    ...extra,
  });

  const allow = (reasoning, readable = true, writable = true, extra = {}) => ({
    readable,
    writable,
    reasoning,
    audit: { userId: currentUser?.user_id, rank: currentUser?.rank, patientId: targetPatient?.id, timestamp: now.toISOString() },
    ...extra,
  });

  if (!currentUser?.user_id || !targetPatient?.id) {
    return deny('Usuario o paciente no identificado');
  }

  if (rank === 'Admin') {
    return allow('Admin: acceso completo');
  }

  if (isActiveGuardiaCoveringUser(userId, activeGuardia)) {
    return allow('Guardia activa: cobertura asignada');
  }

  if (isIncomingPreviewWindow(cycle, now)) {
    const incoming = assignments.find((a) => String(a.patient_id) === patientId);
    if (incoming) {
      const effectiveMs = toMillis(incoming.effective_at);
      const nowMs = toMillis(now);
      if (Number.isFinite(effectiveMs) && Number.isFinite(nowMs) && nowMs < effectiveMs) {
        return allow(
          'Vista previa Incoming: lectura permitida hasta vigencia',
          true,
          false,
          { incomingPreview: true }
        );
      }
    }
  }

  const joinedTeams = getJoinedTeams(teams, userId);
  const joinedTeamIds = new Set(joinedTeams.map((t) => String(t.team_id)));

  if (guardiaMode) {
    if (rank === 'R1') {
      const patientSala = targetPatient?.sala || '';
      if (patientSala && patientSala === userSala) {
        return allow('Modo Guardia R1: visibilidad de Sala completa', true, false);
      }
      return deny('Modo Guardia R1: fuera de mi Sala');
    }

    if (rank === 'R2') {
      if (patientCoveredByGuardia(patientId, userId, guardias)) {
        return allow('Modo Guardia R2: paciente entregado', true, false);
      }
      return deny('Modo Guardia R2: sin entrega recibida');
    }

    if (rank === 'R4') {
      const svc = normalizeServiceKey(targetPatient?.service);
      if (svc.includes('sala') || svc.includes('torre')) {
        return allow('Modo Guardia R4: cobertura Sala + Torre', true, false);
      }
      return deny('Modo Guardia R4: fuera de dominio');
    }

    return deny('Modo Guardia: rango sin cobertura');
  }

  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds)) {
    return allow('Paciente del equipo');
  }

  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow('Paciente entregado (handoff)');
  }

  return deny('Fuera de alcance — sin equipo ni handoff');
}

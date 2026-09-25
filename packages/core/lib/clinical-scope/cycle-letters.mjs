import {
  clinicalServiceForSala,
  clinicalSalaUsesAbcOnlyRotation,
} from '../clinical-salas.mjs';
import { normalizeServiceKey, toMillis } from './shared.mjs';
import { teamForMemberCycle } from './team-membership.mjs';

const CYCLE_CONFIGS = {
  sala_r2: { letters: ['A', 'B', 'C', 'D', 'E', 'F'], length: 6 },
  sala_r1: { letters: ['A1', 'B1', 'C1', 'D1', 'A2', 'B2', 'C2', 'D2'], length: 8 },
  default: { letters: ['A', 'B', 'C', 'D'], length: 4 },
};

/** Sala ward teams only — not Torre HU / Área A (shared ABCD across ranks). */
export function isSalaWardService(service) {
  return normalizeServiceKey(service) === 'sala';
}

/**
 * Sala R1 primera/segunda línea picker — only Sala 1/2/E ward teams.
 * @param {string} [service]
 * @param {string} [sala]
 */
export function usesSalaR1LinePicker(service, sala) {
  if (clinicalSalaUsesAbcOnlyRotation(sala)) return false;
  const mapped = clinicalServiceForSala(sala);
  const svc = String(service || mapped || 'Sala').trim();
  return isSalaWardService(svc);
}

/**
 * Cycle letters for UI pickers (create / join / LAN assign).
 * @param {string} service
 * @param {string} rank
 */
export function getCycleLetterOptionsForRank(service, rank) {
  const r = String(rank || 'R1');
  if (isSalaWardService(service) && r === 'R2') {
    return getCycleLettersForTeamCreate(service, 'R2');
  }
  if (isSalaWardService(service) && r === 'R1') {
    return [
      ...getCycleLettersForTeamCreate(service, 'R1', 0),
      ...getCycleLettersForTeamCreate(service, 'R1', 1),
    ];
  }
  return getCycleLettersForTeamCreate(service, r);
}

export function getCycleConfig(service, rank) {
  if (isSalaWardService(service)) {
    if (rank === 'R2') return CYCLE_CONFIGS.sala_r2;
    if (rank === 'R1') return CYCLE_CONFIGS.sala_r1;
  }
  return CYCLE_CONFIGS.default;
}

/**
 * Letters offered when creating a team — depends on creator rank, not a single team-wide slot.
 * Sala R1: first half A1–D1 (R1 primera línea) or second half A2–D2 (R1 segunda línea).
 *
 * @param {string} service
 * @param {string} rank
 * @param {0|1} [r1LineIndex]
 */
export function getCycleLettersForTeamCreate(service, rank, r1LineIndex = 0) {
  const cfg = getCycleConfig(service, rank);
  if (rank === 'R1' && isSalaWardService(service)) {
    const half = Math.floor(cfg.letters.length / 2);
    return r1LineIndex === 1 ? cfg.letters.slice(half) : cfg.letters.slice(0, half);
  }
  return cfg.letters;
}

/**
 * @param {string} service
 * @param {string} rank
 * @param {0|1} [r1LineIndex]
 */
export function getCycleFieldMetaForTeamCreate(service, rank, r1LineIndex = 0) {
  if (isSalaWardService(service) && rank === 'R2') {
    return {
      label: 'Tu letra de ciclo (R2)',
      hint: 'Cada equipo de sala tiene tres puestos: R2 (A–F), R1 primera línea (A1–D1) y R1 segunda línea (A2–D2). Como R2 eliges tu letra A–F.',
    };
  }
  if (isSalaWardService(service) && rank === 'R1') {
    const line = r1LineIndex === 1 ? 'segunda línea (A2–D2)' : 'primera línea (A1–D1)';
    return {
      label: `Tu subciclo R1 · ${line}`,
      hint: 'No es la posición del equipo completo: cada R1 lleva su subciclo (A1–D1 o A2–D2) dentro del mismo equipo de sala.',
    };
  }
  return {
    label: 'Posición en ciclo',
    hint: 'Letra de rotación para este servicio.',
  };
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

/** Active cycle letter for a service/rank on a calendar day (day-of-month anchor). */
export function activeCycleLetterForDate(service, rank, now) {
  const cfg = getCycleConfig(service, rank);
  const d = now instanceof Date ? now : new Date(String(now));
  const idx = (d.getDate() - 1) % cfg.length;
  return cfg.letters[idx] || '';
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

/**
 * R1 Sala: each member carries sub_area_fraction (A1–D2); R2/other ranks use team letter.
 *
 * @param {object} member
 * @param {object} team
 * @param {string} rank
 * @param {Date|string|number} now
 */
export function isMemberOnCallToday(member, team, rank, now) {
  if (!member || !team) return false;
  const r = String(rank || member.rank || '').trim();
  if (!r) return false;
  const uid = String(member.user_id || '');
  const scoped =
    isSalaWardService(team.service) && r === 'R1' && uid
      ? teamForMemberCycle(team, uid)
      : team;
  return isOnCallToday(scoped, r, now);
}

/** True when any member at rank is on cycle today (R1 Sala checks per-member subcycles). */
export function isTeamRankOnCallToday(team, rank, now) {
  if (!team) return false;
  const r = String(rank || '').trim();
  if (isSalaWardService(team.service) && r === 'R1') {
    return (team.members || []).some(
      (m) => String(m.rank) === 'R1' && isMemberOnCallToday(m, team, 'R1', now)
    );
  }
  return isOnCallToday(team, r, now);
}

/**
 * Default cycle letter when joining/creating membership without explicit pick.
 *
 * @param {{ service?: string, members?: object[], sub_area_fraction?: string }} team
 * @param {string} userRank
 */
export function inferMembershipCycleForJoin(team, userRank) {
  const rank = String(userRank || 'R1');
  if (!isSalaWardService(team?.service)) {
    const letters = getCycleLettersForTeamCreate(team?.service, rank);
    return letters[0] || 'A';
  }
  if (rank === 'R2') {
    return getCycleLettersForTeamCreate('Sala', 'R2')[0] || 'A';
  }
  const used = new Set(
    (team?.members || [])
      .filter((m) => String(m?.rank) === 'R1')
      .map((m) => String(m?.sub_area_fraction || '').trim())
      .filter(Boolean)
  );
  for (const letter of getCycleLettersForTeamCreate('Sala', 'R1', 0)) {
    if (!used.has(letter)) return letter;
  }
  for (const letter of getCycleLettersForTeamCreate('Sala', 'R1', 1)) {
    if (!used.has(letter)) return letter;
  }
  return 'A1';
}

/**
 * Prefer a member's saved subcycle; otherwise suggest the next free slot.
 *
 * @param {{ service?: string, members?: object[], sub_area_fraction?: string }|null|undefined} team
 * @param {string} userId
 * @param {string} userRank
 */
export function resolveMembershipCycleForUser(team, userId, userRank) {
  const uid = String(userId || '').trim();
  if (uid && team) {
    const member = (team.members || []).find((m) => String(m.user_id || '') === uid);
    const existing = String(member?.sub_area_fraction || '').trim();
    if (existing) return existing;
  }
  return inferMembershipCycleForJoin(team || {}, userRank);
}

export function formatMemberCycleLabel(member) {
  const frac = String(member?.sub_area_fraction || '').trim();
  if (!frac) return '';
  const rank = String(member?.rank || '').trim();
  // Sala R1 subcycles (A1–D2) — letter shape wins.
  if (/^[A-D][12]$/i.test(frac)) return `Subciclo R1 · ${frac.toUpperCase()}`;
  // Prefer explicit rank so Inters/UX/Eme R3 is not labeled "Ciclo R2".
  if (rank === 'R1') return `Subciclo R1 · ${frac}`;
  if (rank === 'R2') return `Ciclo R2 · ${frac}`;
  if (rank === 'R3') return `Ciclo R3 · ${frac}`;
  if (rank === 'R4') return `Ciclo R4 · ${frac}`;
  if (/^[A-F]$/i.test(frac)) return `Ciclo R2 · ${frac}`;
  return `Ciclo · ${frac}`;
}

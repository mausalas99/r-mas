/** Mi rotación — panel props builders extracted from renderClinicalTeamsPanelInto. */
import { readRpcSettings } from '../../clinical-settings.mjs';
import {
  effectiveClinicalRank,
  hasProgramAdminPrivileges,
  canViewUserDirectory,
  canConfigureRotation,
} from '../../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../../clinical-username.mjs';
import {
  CLINICAL_SALAS,
  readClinicalTeamsCollapseOpen,
} from './shared.mjs';

export function resolveDisplayLanHandle(user, usernameForInput) {
  const saved = normalizeUsername(user?.username || '');
  if (saved && isValidUsernameFormat(saved)) return saved;
  const draft = normalizeUsername(usernameForInput || '');
  if (draft && isValidUsernameFormat(draft)) return draft;
  return '';
}

export async function resolveClinicalTeamsPanelContext(user, joined) {
  let clientId = '';
  let settings = {};
  try {
    settings = readRpcSettings();
    clientId = String(settings.clientId || '');
  } catch (_e) { void _e; }

  const rawUsername = String(user.username || '');
  const legacyUsername = isLegacyMachineUsername(rawUsername, clientId);
  const { needsClinicalLanProfileGate, ensureLanProfileGateDeviceReset } = await import(
    '../../clinical-settings.mjs'
  );
  settings = ensureLanProfileGateDeviceReset(settings);
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const usernameForInput = profileGatePending
    ? ''
    : legacyUsername
      ? String(settings.clinicalUsername || '').trim()
      : rawUsername;
  const displayHandle = resolveDisplayLanHandle(user, usernameForInput);
  const savedHandle = normalizeUsername(user.username || '');
  const rank = effectiveClinicalRank(user);
  const programAdmin = hasProgramAdminPrivileges(user);
  const canViewDirectoryUsers = canViewUserDirectory(user);
  const sala = String(user.sala || '').trim();

  return {
    legacyUsername,
    profileGatePending,
    usernameForInput,
    displayHandle,
    savedHandle,
    rank,
    programAdmin,
    canViewDirectoryUsers,
    sala,
    joined,
  };
}

/** «Mi perfil y rango» (legacy modal) props, drawn by ProfileSection in teams-roster-panel-view.jsx. */
export function profileSectionProps(ctx, user) {
  return {
    legacyUsername: ctx.legacyUsername,
    displayHandle: ctx.displayHandle,
    directoryNote: !ctx.canViewDirectoryUsers,
    usernameForInput: ctx.usernameForInput,
    clinicalName: ctx.profileGatePending ? '' : String(user.clinical_name || ''),
    rank: ctx.rank,
    // R1–R3 cannot promote themselves: only an R4 or an Admin grants R4.
    ranks: ctx.rank === 'R4' || ctx.programAdmin ? ['R1', 'R2', 'R3', 'R4'] : ['R1', 'R2', 'R3'],
    programAdmin: ctx.programAdmin,
    sala: ctx.sala,
    salas: CLINICAL_SALAS,
  };
}

export const PERFIL_SALA_COLLAPSE_KEY = 'perfil.sala';
const SALA_CONFIRMED_LS = 'rpc.perfilSalaConfirmedMonth';
const monthKey = () => new Date().toISOString().slice(0, 7);

/** The 1st-of-month «Confirma tu sala» prompt is answered once a sala is saved that month. */
export function isSalaConfirmedThisMonth() {
  try {
    return localStorage.getItem(SALA_CONFIRMED_LS) === monthKey();
  } catch {
    return false;
  }
}

export function markSalaConfirmedThisMonth() {
  try {
    localStorage.setItem(SALA_CONFIRMED_LS, monthKey());
  } catch (_e) { void _e; }
}

/**
 * Mi perfil: Sala chips props (drawn by perfil-clinical-view.jsx). A tap saves the profile and moves the
 * Nube room (see profile submit). `now` is the clock, passed in so tests need no real date.
 */
export function perfilSalaProps(ctx, now = new Date()) {
  // After «Iniciar nueva rotación» every sala is unset. The first user to join the
  // new sala's Nube room becomes its owner and holds the room key (room-dek.mjs),
  // so the pick is asked for loudly: open, whatever the saved collapse state says.
  const pick = !ctx.sala;
  const newMonth = !pick && now.getDate() === 1 && !isSalaConfirmedThisMonth();
  const open = pick || newMonth || readClinicalTeamsCollapseOpen(PERFIL_SALA_COLLAPSE_KEY, true);
  return {
    sala: ctx.sala,
    salas: CLINICAL_SALAS,
    collapseKey: PERFIL_SALA_COLLAPSE_KEY,
    open,
    hint: pick ? 'pick' : newMonth ? 'newMonth' : '',
  };
}

/** Mi perfil: the account form props, the same cards the rest of the window uses. */
export function perfilAccountProps(ctx, user) {
  return {
    legacyUsername: ctx.legacyUsername,
    usernameForInput: ctx.usernameForInput,
    clinicalName: ctx.profileGatePending ? '' : String(user.clinical_name || ''),
    rank: ctx.rank,
    // R1–R3 cannot promote themselves: only an R4 or an Admin grants R4.
    ranks: ctx.rank === 'R4' || ctx.programAdmin ? ['R1', 'R2', 'R3', 'R4'] : ['R1', 'R2', 'R3'],
    programAdmin: ctx.programAdmin,
    directoryNote: !ctx.canViewDirectoryUsers,
  };
}

/**
 * Open state of the collapsed «Otras opciones» sections (R4/Admin rotation, legacy-modal configuration).
 * Collapsed by default so a resident using this panel daily doesn't see «Cambiar de rotación» before their team.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function otherOptionsProps(user, embedded) {
  return {
    rotation: canConfigureRotation(user) ? { open: readClinicalTeamsCollapseOpen('section.rotation', false) } : null,
    config: embedded ? null : { open: readClinicalTeamsCollapseOpen('section.config', false) },
  };
}

/**
 * @param {number} joinedCount
 * @param {number} directoryCount
 * @param {boolean} elevated
 */
export function shouldUsePickTeamPanelLayout(joinedCount, directoryCount, elevated) {
  if (directoryCount <= 0) return false;
  if (joinedCount > 0) return false;
  return !elevated;
}

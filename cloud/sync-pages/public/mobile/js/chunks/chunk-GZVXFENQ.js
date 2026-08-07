import {
  clinicalSalaUsesAbcOnlyRotation,
  clinicalServiceForSala
} from "/mobile/js/chunks/chunk-QPJXCZUR.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/clinico-access-scope/guardia-r1.mjs
function evaluateGuardiaR1(ctx) {
  const {
    rank,
    userId,
    userSala,
    patientId,
    targetPatient,
    joinedTeams,
    joinedTeamIds,
    assignments,
    guardias,
    enforceTeamPatientScope,
    onCallGuardiaReceiver,
    now,
    allow,
    deny
  } = ctx;
  if (rank !== "R1") return null;
  if (onCallGuardiaReceiver) {
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow("Modo Guardia R1: paciente entregado", true, false);
    }
    return deny("Modo Guardia R1: sin entrega recibida");
  }
  if (enforceTeamPatientScope) {
    if (patientInJoinedTeamScope(
      targetPatient,
      joinedTeams,
      assignments,
      joinedTeamIds,
      userId,
      now,
      { strictTeamFilter: true }
    )) {
      return allow("Modo Guardia R1: paciente de mi equipo", true, false);
    }
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow("Modo Guardia R1: paciente entregado", true, false);
    }
    return deny("Modo Guardia R1: fuera de mi equipo");
  }
  const patientSala = targetPatient?.sala || "";
  if (patientSala && patientSala === userSala) {
    return allow("Modo Guardia R1: visibilidad de Sala completa", true, false);
  }
  return deny("Modo Guardia R1: fuera de mi Sala");
}

// public/js/clinico-access-scope/guardia-r2.mjs
function evaluateGuardiaR2(ctx) {
  const { rank, userId, patientId, guardias, allow, deny } = ctx;
  if (rank !== "R2") return null;
  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow("Modo Guardia R2: paciente entregado", true, false);
  }
  return deny("Modo Guardia R2: sin entrega recibida");
}

// public/js/clinico-access-scope/guardia-r4.mjs
function evaluateGuardiaR4(ctx) {
  const { rank, targetPatient, allow, deny } = ctx;
  if (rank !== "R4") return null;
  const svc = normalizeServiceKey(targetPatient?.service);
  if (svc.includes("sala") || svc.includes("torre")) {
    return allow("Modo Guardia R4: cobertura Sala + Torre", true, false);
  }
  return deny("Modo Guardia R4: fuera de dominio");
}

// public/js/clinico-access-scope/guardia-fallback.mjs
function evaluateGuardiaFallback(ctx) {
  const { rank, deny } = ctx;
  if (rank === "R1" || rank === "R2" || rank === "R4") return null;
  return deny("Modo Guardia: rango sin cobertura");
}

// public/js/clinico-access-scope/team-scope-r4.mjs
function evaluateTeamScopeR4(ctx) {
  const { rank, enforceTeamPatientScope, allow } = ctx;
  if (!enforceTeamPatientScope && rank === "R4") {
    return allow("R4: acceso global");
  }
  return null;
}

// public/js/clinico-access-scope/team-scope-entrega-r1.mjs
function evaluateTeamScopeEntregaR1(ctx) {
  const {
    rank,
    entregaPhaseActive,
    enforceTeamPatientScope,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    userSala,
    now,
    allow,
    deny
  } = ctx;
  if (!entregaPhaseActive || rank !== "R1") return null;
  if (enforceTeamPatientScope) {
    if (patientInJoinedTeamScope(
      targetPatient,
      joinedTeams,
      assignments,
      joinedTeamIds,
      userId,
      now,
      { strictTeamFilter: true }
    )) {
      return allow("Fase entrega R1: paciente de mi equipo", true, false);
    }
    return deny("Fase entrega R1: fuera de mi equipo");
  }
  if (patientInUserSala(targetPatient, userSala)) {
    return allow("Fase entrega R1: censo de sala", true, false);
  }
  return deny("Fase entrega R1: fuera de mi sala");
}

// public/js/clinico-access-scope/team-scope-r1.mjs
function evaluateTeamScopeR1(ctx) {
  const {
    rank,
    strictTeamFilter,
    enforceTeamPatientScope,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    patientId,
    userSala,
    guardias,
    now,
    allow,
    deny
  } = ctx;
  if (rank !== "R1") return null;
  if (strictTeamFilter) {
    if (patientInJoinedTeamScope(
      targetPatient,
      joinedTeams,
      assignments,
      joinedTeamIds,
      userId,
      now,
      { strictTeamFilter: true }
    )) {
      return allow("R1: paciente de mi equipo");
    }
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow("R1: paciente entregado");
    }
    return deny("R1: fuera de mi equipo");
  }
  if (!enforceTeamPatientScope && patientInUserSala(targetPatient, userSala)) {
    return allow("R1: paciente en mi sala");
  }
  return deny("R1: fuera de mi sala");
}

// public/js/clinico-access-scope/team-scope-r2.mjs
function evaluateTeamScopeR2(ctx) {
  const {
    rank,
    patientId,
    userId,
    guardias,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    strictTeamFilter,
    enforceTeamPatientScope,
    userSala,
    now,
    allow,
    deny
  } = ctx;
  if (rank !== "R2") return null;
  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow("R2: paciente entregado");
  }
  if (patientInJoinedTeamScope(
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    now,
    { strictTeamFilter }
  )) {
    return allow("R2: paciente de mi equipo");
  }
  if (!strictTeamFilter && !enforceTeamPatientScope && patientInUserSala(targetPatient, userSala)) {
    return allow("R2: paciente en mi sala");
  }
  return deny("R2: sin equipo ni entrega");
}

// public/js/clinico-access-scope/team-scope-r3.mjs
function evaluateTeamScopeR3(ctx) {
  const {
    rank,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    patientId,
    strictTeamFilter,
    currentUser,
    now,
    allow,
    deny
  } = ctx;
  if (rank !== "R3") return null;
  if (patientInJoinedTeamScope(
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    now,
    { strictTeamFilter }
  )) {
    return allow("R3: paciente de mi equipo");
  }
  if (!strictTeamFilter && !patientHasExplicitTeamAssignment(patientId, assignments) && r3ExtendedStructuralAccess(currentUser, targetPatient, joinedTeams)) {
    return allow("R3: servicio extendido");
  }
  return deny("R3: fuera de alcance");
}

// public/js/clinico-access-scope/team-scope-tail.mjs
function evaluateTeamScopeTail(ctx) {
  const { patientId, assignments, joinedTeamIds, now, userId, guardias, allow, deny } = ctx;
  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds, now)) {
    return allow("Paciente del equipo (asignaci\xF3n)");
  }
  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow("Paciente entregado (handoff)");
  }
  return deny("Fuera de alcance");
}

// public/js/clinico-access-scope/team-scope.mjs
var TEAM_SCOPE_EVALUATORS = [
  evaluateTeamScopeR4,
  evaluateTeamScopeEntregaR1,
  evaluateTeamScopeR1,
  evaluateTeamScopeR2,
  evaluateTeamScopeR3
];
function evaluateTeamScope(ctx) {
  for (const evaluate of TEAM_SCOPE_EVALUATORS) {
    const result = evaluate(ctx);
    if (result != null) return result;
  }
  return evaluateTeamScopeTail(ctx);
}

// public/js/clinico-access-scope/scope-utils.mjs
function toMillis(value, fallbackIso) {
  if (value instanceof Date) return value.getTime();
  if (value != null && value !== "") return new Date(String(value)).getTime();
  if (fallbackIso) return new Date(String(fallbackIso)).getTime();
  return NaN;
}

// public/js/clinico-access-scope/preamble.mjs
function evaluateScopeIdentity(ctx) {
  const { currentUser, targetPatient, deny } = ctx;
  if (!currentUser?.user_id || !targetPatient?.id) {
    return deny("Usuario o paciente no identificado");
  }
  return null;
}
function evaluateScopeAdmin(ctx) {
  const { currentUser, rank, enforceTeamPatientScope, allow } = ctx;
  if (!enforceTeamPatientScope && (currentUser.is_program_admin === 1 || currentUser.is_program_admin === true || rank === "Admin")) {
    return allow("Privilegios admin: acceso completo");
  }
  return null;
}
function evaluateScopeActiveGuardia(ctx) {
  const { userId, activeGuardia, allow } = ctx;
  if (isActiveGuardiaCoveringUser(userId, activeGuardia)) {
    return allow("Guardia activa: cobertura asignada");
  }
  return null;
}
function evaluateScopeIncomingPreview(ctx) {
  const { patientId, assignments, cycle, now, allow } = ctx;
  if (!isIncomingPreviewWindow(cycle, now)) return null;
  const incoming = assignments.find((a) => String(a.patient_id) === patientId);
  if (!incoming) return null;
  const effectiveMs = toMillis(incoming.effective_at);
  const nowMs = toMillis(now);
  if (Number.isFinite(effectiveMs) && Number.isFinite(nowMs) && nowMs < effectiveMs) {
    return allow(
      "Vista previa Incoming: lectura permitida hasta vigencia",
      true,
      false,
      { incomingPreview: true }
    );
  }
  return null;
}
function evaluateScopeInterconsultas(ctx) {
  const { targetPatient, userId, joinedTeams, rank, now, allow } = ctx;
  if (!isInterconsultasPatient(targetPatient)) return null;
  if (userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now)) {
    return allow("Off-call UX/Eme: censo Interconsultas");
  }
  if (userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now)) {
    return allow("Interconsultas de guardia: censo del d\xEDa");
  }
  return null;
}
var SCOPE_PREAMBLE_EVALUATORS = [
  evaluateScopeIdentity,
  evaluateScopeAdmin,
  evaluateScopeActiveGuardia,
  evaluateScopeIncomingPreview
];

// public/js/clinico-access-shared.mjs
function normalizeServiceKey(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
function toMillis2(value, fallbackIso) {
  if (value instanceof Date) return value.getTime();
  if (value != null && value !== "") return new Date(String(value)).getTime();
  if (fallbackIso) return new Date(String(fallbackIso)).getTime();
  return NaN;
}

// public/js/clinico-access-cycle.mjs
var CYCLE_CONFIGS = {
  sala_r2: { letters: ["A", "B", "C", "D", "E", "F"], length: 6 },
  sala_r1: { letters: ["A1", "B1", "C1", "D1", "A2", "B2", "C2", "D2"], length: 8 },
  default: { letters: ["A", "B", "C", "D"], length: 4 }
};
function isSalaWardService(service) {
  return normalizeServiceKey(service) === "sala";
}
function usesSalaR1LinePicker(service, sala) {
  if (clinicalSalaUsesAbcOnlyRotation(sala)) return false;
  const mapped = clinicalServiceForSala(sala);
  const svc = String(service || mapped || "Sala").trim();
  return isSalaWardService(svc);
}
function getCycleLetterOptionsForRank(service, rank) {
  const r = String(rank || "R1");
  if (isSalaWardService(service) && r === "R2") {
    return getCycleLettersForTeamCreate(service, "R2");
  }
  if (isSalaWardService(service) && r === "R1") {
    return [
      ...getCycleLettersForTeamCreate(service, "R1", 0),
      ...getCycleLettersForTeamCreate(service, "R1", 1)
    ];
  }
  return getCycleLettersForTeamCreate(service, r);
}
function getCycleConfig(service, rank) {
  if (isSalaWardService(service)) {
    if (rank === "R2") return CYCLE_CONFIGS.sala_r2;
    if (rank === "R1") return CYCLE_CONFIGS.sala_r1;
  }
  return CYCLE_CONFIGS.default;
}
function getCycleLettersForTeamCreate(service, rank, r1LineIndex = 0) {
  const cfg = getCycleConfig(service, rank);
  if (rank === "R1" && isSalaWardService(service)) {
    const half = Math.floor(cfg.letters.length / 2);
    return r1LineIndex === 1 ? cfg.letters.slice(half) : cfg.letters.slice(0, half);
  }
  return cfg.letters;
}
function getCycleFieldMetaForTeamCreate(service, rank, r1LineIndex = 0) {
  if (isSalaWardService(service) && rank === "R2") {
    return {
      label: "Tu letra de ciclo (R2)",
      hint: "Cada equipo de sala tiene tres puestos: R2 (A\u2013F), R1 primera l\xEDnea (A1\u2013D1) y R1 segunda l\xEDnea (A2\u2013D2). Como R2 eliges tu letra A\u2013F."
    };
  }
  if (isSalaWardService(service) && rank === "R1") {
    const line = r1LineIndex === 1 ? "segunda l\xEDnea (A2\u2013D2)" : "primera l\xEDnea (A1\u2013D1)";
    return {
      label: `Tu subciclo R1 \xB7 ${line}`,
      hint: "No es la posici\xF3n del equipo completo: cada R1 lleva su subciclo (A1\u2013D1 o A2\u2013D2) dentro del mismo equipo de sala."
    };
  }
  return {
    label: "Posici\xF3n en ciclo",
    hint: "Letra de rotaci\xF3n para este servicio."
  };
}
function letterIndexForTeam(team, rank) {
  const frac = String(team?.sub_area_fraction || "").trim().toUpperCase();
  if (!frac) return -1;
  const cfg = getCycleConfig(team?.service, rank);
  return cfg.letters.indexOf(frac);
}
function isOnCallToday(team, rank, now) {
  const idx = letterIndexForTeam(team, rank);
  if (idx === -1) return false;
  const cfg = getCycleConfig(team?.service, rank);
  const d = now instanceof Date ? now : new Date(String(now));
  const dayOfMonth = d.getDate();
  return (dayOfMonth - 1) % cfg.length === idx;
}
function activeCycleLetterForDate(service, rank, now) {
  const cfg = getCycleConfig(service, rank);
  const d = now instanceof Date ? now : new Date(String(now));
  const idx = (d.getDate() - 1) % cfg.length;
  return cfg.letters[idx] || "";
}
function isIncomingPreviewWindow(cycle, now) {
  if (!cycle?.preview_start_at || !cycle?.effective_at) return false;
  const t = toMillis2(now);
  const start = toMillis2(cycle.preview_start_at);
  const end = toMillis2(cycle.effective_at);
  if (!Number.isFinite(t) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return t >= start && t < end;
}

// lib/clinical-team-composition.mjs
function normalizeServiceKey2(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
var TEAM_COMPOSITION_BY_SERVICE = {};
function getTeamCompositionLimits(service) {
  const key = normalizeServiceKey2(service);
  return TEAM_COMPOSITION_BY_SERVICE[key] || null;
}
var OFF_CALL_INTERCONSULTAS_SERVICES = /* @__PURE__ */ new Set(["ux", "eme"]);
function validateTeamRankSlot(_service, _rank, _members) {
  return null;
}
function serviceUsesStructuredComposition(service) {
  return getTeamCompositionLimits(service) != null;
}

// public/js/clinico-access-patient.mjs
function extractSalaLetter(serviceOrArea) {
  const raw = String(serviceOrArea || "").trim();
  const match = raw.match(/Sala\s*([A-F])/i);
  if (match) return match[1].toUpperCase();
  const lone = raw.match(/^([A-F])$/i);
  return lone ? lone[1].toUpperCase() : "";
}
function salaLetterForTeamOrArea(teamOrPatient) {
  const frac = String(teamOrPatient?.sub_area_fraction || "").trim();
  const bare = frac.replace(/[0-9]+$/, "").toUpperCase();
  if (bare && /^[A-F]$/.test(bare)) return bare;
  const fromName = extractSalaLetter(teamOrPatient?.name || "");
  if (fromName) return fromName;
  return extractSalaLetter(teamOrPatient?.sub_area || teamOrPatient?.service || "");
}
function salaLabelFromLetter(letter) {
  if (letter === "1") return "Sala 1";
  if (letter === "2") return "Sala 2";
  if (letter === "E") return "Sala E";
  return "";
}
function salaLabelFromServiceKey(svc) {
  if (svc.includes("torre hu")) return "Torre HU";
  if (svc.includes("area a") || svc.includes("pension")) return "\xC1rea A/Pensionistas";
  return "";
}
function inferPatientSala(patient) {
  const source = patient?.servicio || patient?.service || patient?.area || patient?.sub_area || "";
  const fromLetter = salaLabelFromLetter(extractSalaLetter(source));
  if (fromLetter) return fromLetter;
  return salaLabelFromServiceKey(normalizeServiceKey(patient?.servicio || patient?.service || ""));
}
function resolvePatientSala(patient) {
  const explicit = String(patient?.sala || "").trim();
  return explicit || inferPatientSala(patient);
}
function patientInUserSala(patient, userSala) {
  const ps = resolvePatientSala(patient);
  return ps !== "" && ps === String(userSala || "").trim();
}
function isInterconsultasPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey(patient.service || patient.servicio || "");
  const sub = normalizeServiceKey(patient.sub_area || patient.area || "");
  if (svc.includes("interconsult") || sub.includes("interconsult")) return true;
  const ic = String(patient.interconsult_type || "None");
  return ic !== "None" && ic !== "";
}
function userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now) {
  const uid = String(userId || "");
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    if (!OFF_CALL_INTERCONSULTAS_SERVICES.has(svc)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return !isOnCallToday(team, rank, now);
  });
}
function userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now) {
  const uid = String(userId || "");
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    if (!svc.includes("interconsult")) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return isOnCallToday(team, rank, now);
  });
}
function findClinicalTeamById(teams, teamId) {
  const id = String(teamId || "").trim();
  if (!id) return null;
  return (teams || []).find((t) => String(t?.team_id || "") === id) || null;
}
function stampPatientClinicalSala(patient, user, opts) {
  if (!patient || typeof patient !== "object") return patient;
  const team = opts?.team || findClinicalTeamById(opts?.teams, opts?.teamId) || null;
  const teamSala = String(team?.sala || "").trim();
  if (teamSala) {
    patient.sala = teamSala;
    return patient;
  }
  const profileSala = String(user?.sala || "").trim();
  if (profileSala) {
    patient.sala = profileSala;
    return patient;
  }
  const inferred = resolvePatientSala(patient);
  if (inferred) patient.sala = inferred;
  return patient;
}
function migratePatientsClinicalSala(patients, user) {
  if (!Array.isArray(patients) || !user) return 0;
  let migrated = 0;
  for (const patient of patients) {
    if (!patient || typeof patient !== "object" || patient.isDemo) continue;
    if (String(patient.sala || "").trim()) continue;
    stampPatientClinicalSala(patient, user);
    if (String(patient.sala || "").trim()) migrated += 1;
  }
  return migrated;
}

// public/js/clinico-access-teams.mjs
var R3_EXTENDED_SERVICES = /* @__PURE__ */ new Set(["torre hu", "eme", "ux"]);
function patientServiceMatchesTeam(patientSvc, teamSvc, patient) {
  if (patientSvc === teamSvc) return true;
  if (patientSvc.includes("sala") && teamSvc.includes("sala")) return true;
  if (teamSvc.includes("sala") && (patientSvc.includes("sala") || extractSalaLetter(patient.service))) {
    return true;
  }
  return false;
}
function patientMatchesTeam(patient, team) {
  if (!patient || !team) return false;
  const patientSvc = normalizeServiceKey(patient.service);
  const teamSvc = normalizeServiceKey(team.service);
  if (!patientServiceMatchesTeam(patientSvc, teamSvc, patient)) return false;
  const frac = String(team.sub_area_fraction || "").trim();
  if (!frac) return true;
  const letter = frac.toUpperCase();
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (patientLetter && patientLetter === letter) return true;
  const hay = `${patient.service || ""} ${patient.sub_area || ""}`;
  if (new RegExp("(?:^|\\s)" + letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)", "i").test(hay)) return true;
  return false;
}
function getJoinedTeamsForUser(teams, userOrUserId, usernameHint) {
  let uid = "";
  let handle = "";
  if (userOrUserId && typeof userOrUserId === "object") {
    uid = String(userOrUserId.user_id || "");
    handle = normalizeUsername(String(userOrUserId.username || ""));
  } else {
    uid = String(userOrUserId || "");
    handle = normalizeUsername(usernameHint || "");
  }
  if (!uid && !handle) return [];
  return (teams || []).filter(
    (team) => (team.members || []).some((m) => {
      if (uid && String(m.user_id) === uid) return true;
      if (handle && normalizeUsername(m.username || "") === handle) return true;
      return false;
    })
  );
}
function getJoinedTeams(teams, userId) {
  return getJoinedTeamsForUser(teams, userId);
}
function userHasJoinedClinicalTeams(teams, userId) {
  return getJoinedTeams(teams, userId).length > 0;
}
function patientHasExplicitTeamAssignment(patientId, assignments) {
  const pid = String(patientId || "");
  return (assignments || []).some((a) => String(a.patient_id) === pid);
}
function resolvePatientTeamIdFromAssignments(patientId, assignments, now) {
  const pid = String(patientId || "");
  const nowMs = toMillis2(now != null ? now : /* @__PURE__ */ new Date());
  let best = null;
  let bestMs = -Infinity;
  let bestCreatedMs = -Infinity;
  for (const row of assignments || []) {
    if (String(row?.patient_id || "") !== pid) continue;
    const effMs = toMillis2(row.effective_at);
    if (!Number.isFinite(effMs) || effMs > nowMs) continue;
    const createdMs = toMillis2(row.created_at, row.effective_at);
    if (effMs > bestMs || effMs === bestMs && createdMs >= bestCreatedMs) {
      bestMs = effMs;
      bestCreatedMs = createdMs;
      best = String(row.team_id || "");
    }
  }
  return best || "";
}
function patientAssignedToTeam(patientId, assignments, joinedTeamIds, now) {
  const teamId = resolvePatientTeamIdFromAssignments(patientId, assignments, now);
  return !!(teamId && joinedTeamIds.has(teamId));
}
function patientInJoinedTeamScope(patient, joinedTeams, assignments, joinedTeamIds, userId, now, opts) {
  const patientId = String(patient?.id || "");
  const strictTeamFilter = opts?.strictTeamFilter === true;
  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds, now)) return true;
  if (strictTeamFilter || patientHasExplicitTeamAssignment(patientId, assignments)) return false;
  return patientMatchesAnyJoinedTeam(patient, joinedTeams, userId);
}
function patientCoveredByGuardia(patientId, userId, guardias) {
  const uid = String(userId || "");
  return (guardias || []).some(
    (g) => String(g.patient_id) === String(patientId) && String(g.covering_user_id) === uid
  );
}
function isActiveGuardiaCoveringUser(userId, activeGuardia) {
  if (!activeGuardia || !userId) return false;
  return String(activeGuardia.covering_user_id || "") === String(userId);
}
function teamForMemberCycle(team, userId) {
  if (!team || !userId) return team;
  const member = (team.members || []).find((m) => String(m.user_id) === String(userId));
  const frac = String(member?.sub_area_fraction || "").trim();
  if (!frac) {
    if (String(member?.rank || "") === "R2") {
      const teamFrac = String(team.sub_area_fraction || "").trim();
      if (teamFrac) return { ...team, sub_area_fraction: teamFrac };
    }
    return team;
  }
  return { ...team, sub_area_fraction: frac };
}
function isMemberOnCallToday(member, team, rank, now) {
  if (!member || !team) return false;
  const r = String(rank || member.rank || "").trim();
  if (!r) return false;
  const uid = String(member.user_id || "");
  const scoped = isSalaWardService(team.service) && r === "R1" && uid ? teamForMemberCycle(team, uid) : team;
  return isOnCallToday(scoped, r, now);
}
function isTeamRankOnCallToday(team, rank, now) {
  if (!team) return false;
  const r = String(rank || "").trim();
  if (isSalaWardService(team.service) && r === "R1") {
    return (team.members || []).some(
      (m) => String(m.rank) === "R1" && isMemberOnCallToday(m, team, "R1", now)
    );
  }
  return isOnCallToday(team, r, now);
}
function inferMembershipCycleForJoin(team, userRank) {
  const rank = String(userRank || "R1");
  if (!isSalaWardService(team?.service)) {
    const letters = getCycleLettersForTeamCreate(team?.service, rank);
    return letters[0] || "A";
  }
  if (rank === "R2") {
    return getCycleLettersForTeamCreate("Sala", "R2")[0] || "A";
  }
  const used = new Set(
    (team?.members || []).filter((m) => String(m?.rank) === "R1").map((m) => String(m?.sub_area_fraction || "").trim()).filter(Boolean)
  );
  for (const letter of getCycleLettersForTeamCreate("Sala", "R1", 0)) {
    if (!used.has(letter)) return letter;
  }
  for (const letter of getCycleLettersForTeamCreate("Sala", "R1", 1)) {
    if (!used.has(letter)) return letter;
  }
  return "A1";
}
function resolveMembershipCycleForUser(team, userId, userRank) {
  const uid = String(userId || "").trim();
  if (uid && team) {
    const member = (team.members || []).find((m) => String(m.user_id || "") === uid);
    const existing = String(member?.sub_area_fraction || "").trim();
    if (existing) return existing;
  }
  return inferMembershipCycleForJoin(team || {}, userRank);
}
function formatMemberCycleLabel(member) {
  const frac = String(member?.sub_area_fraction || "").trim();
  if (!frac) return "";
  const rank = String(member?.rank || "").trim();
  if (/^[A-D][12]$/i.test(frac)) return `Subciclo R1 \xB7 ${frac.toUpperCase()}`;
  if (rank === "R1") return `Subciclo R1 \xB7 ${frac}`;
  if (rank === "R2") return `Ciclo R2 \xB7 ${frac}`;
  if (rank === "R3") return `Ciclo R3 \xB7 ${frac}`;
  if (rank === "R4") return `Ciclo R4 \xB7 ${frac}`;
  if (/^[A-F]$/i.test(frac)) return `Ciclo R2 \xB7 ${frac}`;
  return `Ciclo \xB7 ${frac}`;
}
function patientMatchesAnyJoinedTeam(patient, joinedTeams, userId) {
  const mapped = {
    id: patient?.id,
    service: String(patient?.service || patient?.servicio || ""),
    sub_area: String(patient?.sub_area || patient?.area || ""),
    interconsult_type: patient?.interconsult_type,
    sala: patient?.sala
  };
  return (joinedTeams || []).some((team) => {
    const scoped = userId ? teamForMemberCycle(team, userId) : team;
    return patientMatchesTeam(mapped, scoped);
  });
}
function r3ExtendedStructuralAccess(user, patient, joinedTeams) {
  const uid = String(user?.user_id || "");
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    const isExtended = [...R3_EXTENDED_SERVICES].some((s) => svc.includes(s));
    if (!isExtended) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return patientMatchesTeam(
      {
        id: patient?.id,
        service: String(patient?.service || patient?.servicio || ""),
        sub_area: String(patient?.sub_area || patient?.area || "")
      },
      team
    );
  });
}

// public/js/clinico-access-scope/shared.mjs
function makeAllowDeny(currentUser, targetPatient, now) {
  const deny = (reasoning, extra = {}) => ({
    readable: false,
    writable: false,
    reasoning,
    audit: { userId: currentUser?.user_id, rank: currentUser?.rank, patientId: targetPatient?.id, timestamp: now.toISOString() },
    ...extra
  });
  const allow = (reasoning, readable = true, writable = true, extra = {}) => ({
    readable,
    writable,
    reasoning,
    audit: { userId: currentUser?.user_id, rank: currentUser?.rank, patientId: targetPatient?.id, timestamp: now.toISOString() },
    ...extra
  });
  return { allow, deny };
}

// public/js/clinico-access-scope/scope-context.mjs
function resolveScopeNow(ctxNow) {
  if (ctxNow == null) return /* @__PURE__ */ new Date();
  if (ctxNow instanceof Date) return ctxNow;
  return new Date(String(ctxNow));
}
function buildScopeContext(currentUser, targetPatient, activeGuardia, context) {
  const ctx = context && typeof context === "object" ? context : {};
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const guardias = Array.isArray(ctx.guardias) ? ctx.guardias : [];
  const cycle = ctx.cycle ?? null;
  const guardiaMode = !!ctx.guardiaMode;
  const now = resolveScopeNow(ctx.now);
  const userId = String(currentUser?.user_id || "");
  const rank = String(currentUser?.rank || "");
  const patientId = String(targetPatient?.id || "");
  const userSala = String(currentUser?.sala || "");
  const enforceTeamPatientScope = !!ctx.enforceTeamPatientScope;
  const { allow, deny } = makeAllowDeny(currentUser, targetPatient, now);
  return {
    teams,
    assignments,
    guardias,
    cycle,
    guardiaMode,
    now,
    userId,
    rank,
    patientId,
    userSala,
    enforceTeamPatientScope,
    allow,
    deny,
    scopeCtx: {
      currentUser,
      targetPatient,
      activeGuardia,
      rank,
      userId,
      patientId,
      userSala,
      assignments,
      cycle,
      guardias,
      enforceTeamPatientScope,
      entregaPhaseActive: !!ctx.entregaPhaseActive,
      onCallGuardiaReceiver: ctx.onCallGuardiaReceiver,
      now,
      allow,
      deny
    }
  };
}
function attachJoinedTeamScope(built, userId) {
  const { teams, scopeCtx, enforceTeamPatientScope } = built;
  const currentUser = scopeCtx.currentUser;
  const joinedTeams = getJoinedTeamsForUser(teams, currentUser || userId);
  const joinedTeamIds = new Set(joinedTeams.map((t) => String(t.team_id)));
  const strictTeamFilter = enforceTeamPatientScope ? true : joinedTeams.length > 0;
  Object.assign(scopeCtx, { joinedTeams, joinedTeamIds, strictTeamFilter });
  return scopeCtx;
}

// public/js/clinico-access-scope/evaluate-clinical-scope.mjs
var GUARDIA_SCOPE_EVALUATORS = [
  evaluateGuardiaR1,
  evaluateGuardiaR2,
  evaluateGuardiaR4,
  evaluateGuardiaFallback
];
function runEvaluateClinicalScope(currentUser, targetPatient, activeGuardia, context) {
  const built = buildScopeContext(currentUser, targetPatient, activeGuardia, context);
  const { scopeCtx, guardiaMode } = built;
  for (const evaluate of SCOPE_PREAMBLE_EVALUATORS) {
    const result = evaluate(scopeCtx);
    if (result != null) return result;
  }
  attachJoinedTeamScope(built, built.userId);
  const interconsultasResult = evaluateScopeInterconsultas(scopeCtx);
  if (interconsultasResult != null) return interconsultasResult;
  if (guardiaMode) {
    for (const evaluate of GUARDIA_SCOPE_EVALUATORS) {
      const result = evaluate(scopeCtx);
      if (result != null) return result;
    }
  }
  return evaluateTeamScope(scopeCtx);
}

// public/js/clinico-access-unlock.mjs
var CLINICO_UNLOCK_PHRASE = "entiendo, usare mi criterio clincio";
function normalizeClinicoUnlockPhrase(text) {
  return String(text || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
function matchesClinicoUnlockPhrase(text) {
  return normalizeClinicoUnlockPhrase(text) === normalizeClinicoUnlockPhrase(CLINICO_UNLOCK_PHRASE);
}
function isClinicoUnlocked(settings) {
  if (!settings || typeof settings !== "object") return false;
  if (settings.clinicoUnlocked) return true;
  if (settings.hideManejoSection === false && !settings.hideClinicoTab) return true;
  return false;
}
function isClinicoAccessHidden(settings) {
  if (!isClinicoUnlocked(settings)) return true;
  if (!settings) return true;
  return !!(settings.hideManejoSection || settings.hideClinicoTab);
}
var _unlockSuccessCb = null;
function openClinicoUnlockModal(onSuccess) {
  if (typeof onSuccess === "function") onSuccess();
}
function closeClinicoUnlockModal() {
  var backdrop = document.getElementById("clinico-unlock-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  _unlockSuccessCb = null;
}
function confirmClinicoUnlock() {
  var cb = _unlockSuccessCb;
  closeClinicoUnlockModal();
  if (cb) cb();
}
var clinicoAccessWindowHandlers = {
  openClinicoUnlockModal,
  closeClinicoUnlockModal,
  confirmClinicoUnlock
};

// public/js/clinico-access-guardia.mjs
var R4_GUARDIA_SECTOR_ORDER = ["Sala A", "Sala B", "Eme", "Torre HU"];
function resolveR4SalaSectorLabel(svcKey, subKey, service, subArea, hay) {
  if (!svcKey.includes("sala") && !subKey.includes("sala")) return "";
  const letter = salaLetterForTeamOrArea({ service, sub_area: subArea, name: hay });
  if (letter === "A") return "Sala A";
  if (letter === "B") return "Sala B";
  if (/sala\s*a\b/i.test(hay)) return "Sala A";
  if (/sala\s*b\b/i.test(hay)) return "Sala B";
  return "";
}
function resolveR4GuardiaSectorLabel(patient) {
  if (!patient) return "";
  const service = String(patient.service || patient.servicio || "").trim();
  const subArea = String(patient.sub_area || patient.area || "").trim();
  const hay = `${service} ${subArea}`.trim();
  const svcKey = normalizeServiceKey(service);
  const subKey = normalizeServiceKey(subArea);
  for (const sector of R4_GUARDIA_SECTOR_ORDER) {
    if (service === sector || subArea === sector) return sector;
  }
  if (svcKey.includes("torre hu") || subKey.includes("torre hu")) return "Torre HU";
  if (svcKey.includes("eme") || subKey.includes("eme") || svcKey === "urgencias") return "Eme";
  return resolveR4SalaSectorLabel(svcKey, subKey, service, subArea, hay);
}
function isR4MacroPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey(patient.service);
  const sub = normalizeServiceKey(patient.sub_area);
  if (svc.includes("sala") || sub.includes("sala")) return true;
  if (svc.includes("interconsult") || sub.includes("interconsult")) return true;
  const ic = String(patient.interconsult_type || "None");
  return ic !== "None";
}
function hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, salaLetter) {
  const letter = String(salaLetter || "").toUpperCase();
  if (!letter) return false;
  const salaTeams = (teams || []).filter(
    (t) => normalizeServiceKey(t.service).includes("sala") && salaLetterForTeamOrArea(t) === letter
  );
  if (!salaTeams.length) return false;
  const declared = new Set(
    (salaGuardiaToday || []).map((row) => String(row.team_id || ""))
  );
  return salaTeams.some((t) => declared.has(String(t.team_id || "")));
}
function computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, userId, now) {
  const uid = String(userId || "");
  if (!uid) return false;
  const d = now instanceof Date ? now : new Date(String(now));
  const r2Cfg = getCycleConfig("Sala", "R2");
  const hasDeficitLetter = r2Cfg.letters.some(
    (letter) => !hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, letter)
  );
  if (!hasDeficitLetter) return false;
  return (teams || []).some((team) => {
    if (!normalizeServiceKey(team.service).includes("sala")) return false;
    if (!isOnCallToday(team, "R2", d)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return (salaGuardiaToday || []).some(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
  });
}
function collectSalaOnCallR1ForTeam(team, d, salaGuardiaToday) {
  const teamId = String(team.team_id || "");
  if (!teamId) return [];
  const declared = (salaGuardiaToday || []).find((g) => String(g.team_id) === teamId)?.user_id || team?.guardia_today?.user_id || "";
  if (declared) return [{ team_id: teamId, user_id: String(declared) }];
  const result = [];
  for (const m of team.members || []) {
    if (m.rank !== "R1" || !m.user_id) continue;
    if (!isMemberOnCallToday(m, team, "R1", d)) continue;
    result.push({ team_id: teamId, user_id: String(m.user_id) });
  }
  return result;
}
function salaOnCallR1(teams, sala, now, salaGuardiaToday = []) {
  const d = now instanceof Date ? now : new Date(String(now));
  const result = [];
  for (const team of (teams || []).filter((t) => t.sala === sala)) {
    result.push(...collectSalaOnCallR1ForTeam(team, d, salaGuardiaToday));
  }
  return result;
}
function userIsOnGuardiaCallToday(userId, rank, teams, now, salaGuardiaToday = []) {
  const uid = String(userId || "");
  if (!uid) return false;
  const d = now instanceof Date ? now : new Date(String(now));
  const r = String(rank || "");
  if (r === "R2") {
    return (teams || []).some((team) => {
      if (!isOnCallToday(team, "R2", d)) return false;
      return (team.members || []).some(
        (m) => m.rank === "R2" && String(m.user_id || "") === uid
      );
    });
  }
  if (r === "R1") {
    const joined = getJoinedTeams(teams, uid);
    const salas = new Set(
      joined.map((t) => String(t.sala || "").trim()).filter(Boolean)
    );
    for (const sala of salas) {
      const onCall = salaOnCallR1(teams, sala, d, salaGuardiaToday);
      if (onCall.some((row) => String(row.user_id || "") === uid)) return true;
    }
  }
  return false;
}
function userIsOnCallForLanHost(userId, rank, teams, now = /* @__PURE__ */ new Date(), salaGuardiaToday = []) {
  const uid = String(userId || "");
  if (!uid) return false;
  const d = now instanceof Date ? now : new Date(String(now));
  const r = String(rank || "").trim();
  if (userIsOnGuardiaCallToday(uid, r, teams, d, salaGuardiaToday)) return true;
  const joined = getJoinedTeams(teams, uid);
  if (userOnCallForInterconsultasTeam(uid, joined, r, d)) return true;
  return joined.some((team) => {
    const member = (team.members || []).find(
      (m) => String(m.user_id || "") === uid && String(m.rank || "").trim() === r
    );
    if (!member) return false;
    return isMemberOnCallToday(member, team, r, d);
  });
}
function salaOnCallR2(teams, now) {
  const d = now instanceof Date ? now : new Date(String(now));
  const r2Teams = (teams || []).filter((t) => isOnCallToday(t, "R2", d));
  return r2Teams.flatMap(
    (t) => (t.members || []).filter((m) => m.rank === "R2").map((m) => ({ team_id: t.team_id, user_id: m.user_id }))
  );
}
function teamGuardiaOverride(team) {
  return team?.guardia_today?.user_id || null;
}
function canR2SalaAbcdefDeficitWrite(userId, patient, joinedTeams, salaGuardiaToday, teams, now) {
  if (!normalizeServiceKey(patient?.service).includes("sala") && !extractSalaLetter(patient?.service || "")) {
    return false;
  }
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (!patientLetter) return false;
  if (hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, patientLetter)) return false;
  const uid = String(userId || "");
  return joinedTeams.some((team) => {
    if (!normalizeServiceKey(team.service).includes("sala")) return false;
    if (!isOnCallToday(team, "R2", now)) return false;
    const declared = (salaGuardiaToday || []).find(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
    return !!declared;
  });
}

// public/js/clinico-access-entrega.mjs
var ENTREGA_PHASE_LS_KEY = "guardia.entregaPhase";
function readEntregaPhaseActive(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(ENTREGA_PHASE_LS_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    return !!(o && o.active);
  } catch {
    return false;
  }
}

// public/js/clinico-access.mjs
var TEMP_DISABLE_TEAM_BASED_FILTERING = false;
function isPatientReadableInClinicalScope(user, patient, activeGuardia = null, context = null) {
  if (TEMP_DISABLE_TEAM_BASED_FILTERING) return true;
  const scope = evaluateClinicalScope(user, patient, activeGuardia, context);
  return scope.readable === true;
}
function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  return runEvaluateClinicalScope(currentUser, targetPatient, activeGuardia, context);
}

export {
  normalizeServiceKey,
  isSalaWardService,
  usesSalaR1LinePicker,
  getCycleLetterOptionsForRank,
  getCycleConfig,
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  letterIndexForTeam,
  isOnCallToday,
  activeCycleLetterForDate,
  isIncomingPreviewWindow,
  getTeamCompositionLimits,
  validateTeamRankSlot,
  serviceUsesStructuredComposition,
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
  patientMatchesTeam,
  getJoinedTeamsForUser,
  getJoinedTeams,
  userHasJoinedClinicalTeams,
  patientHasExplicitTeamAssignment,
  resolvePatientTeamIdFromAssignments,
  patientAssignedToTeam,
  patientInJoinedTeamScope,
  patientCoveredByGuardia,
  isActiveGuardiaCoveringUser,
  teamForMemberCycle,
  isMemberOnCallToday,
  isTeamRankOnCallToday,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
  patientMatchesAnyJoinedTeam,
  r3ExtendedStructuralAccess,
  CLINICO_UNLOCK_PHRASE,
  normalizeClinicoUnlockPhrase,
  matchesClinicoUnlockPhrase,
  isClinicoUnlocked,
  isClinicoAccessHidden,
  openClinicoUnlockModal,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  clinicoAccessWindowHandlers,
  R4_GUARDIA_SECTOR_ORDER,
  resolveR4GuardiaSectorLabel,
  isR4MacroPatient,
  hasSalaGuardiaDeclaredForLetter,
  computeSalaAbcdefDeficitWrite,
  salaOnCallR1,
  userIsOnGuardiaCallToday,
  userIsOnCallForLanHost,
  salaOnCallR2,
  teamGuardiaOverride,
  canR2SalaAbcdefDeficitWrite,
  ENTREGA_PHASE_LS_KEY,
  readEntregaPhaseActive,
  TEMP_DISABLE_TEAM_BASED_FILTERING,
  isPatientReadableInClinicalScope,
  evaluateClinicalScope
};
//# sourceMappingURL=/js/chunks/chunk-GZVXFENQ.js.map

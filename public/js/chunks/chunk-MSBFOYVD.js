// lib/clinical-salas.mjs
var CLINICAL_SALA_VALUES = [
  "Sala 1",
  "Sala 2",
  "Sala E",
  "Torre HU",
  "\xC1rea A/Pensionistas",
  "Interconsultas",
  "UX",
  "Eme"
];
function normalizeSalaKey(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function clinicalServiceForSala(sala) {
  const key = normalizeSalaKey(sala);
  if (key === "torre hu") return "Torre HU";
  if (key === "area a/pensionistas") return "\xC1rea A/Pensionistas";
  if (key === "interconsultas") return "Interconsultas";
  if (key === "ux") return "UX";
  if (key === "eme" || key === "emergencias" || key === "urgent care") return "Eme";
  if (key === "sala 1" || key === "sala 2" || key === "sala e") return "Sala";
  return "";
}
function clinicalSalaUsesAbcOnlyRotation(sala) {
  const mapped = clinicalServiceForSala(sala);
  return mapped !== "" && mapped !== "Sala";
}
function clinicalSalaRoomSlug(sala) {
  const s = String(sala || "").trim();
  if (s === "Sala 1") return "sala-1";
  if (s === "Sala 2") return "sala-2";
  if (s === "Sala E") return "sala-e";
  if (s === "Torre HU") return "torre-hu";
  if (s === "\xC1rea A/Pensionistas") return "area-a-pensionistas";
  if (s === "Interconsultas") return "interconsultas";
  if (s === "UX") return "ux";
  if (s === "Eme") return "eme";
  return "";
}

// lib/clinical-team-composition.mjs
function normalizeServiceKey(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
var TEAM_COMPOSITION_BY_SERVICE = {
  interconsultas: { r1: 1, r2: 1, r3: 2 },
  ux: { r1: 1, r2: 1, r3: 1 },
  eme: { r1: 1, r2: 0, r3: 1 }
};
function getTeamCompositionLimits(service) {
  const key = normalizeServiceKey(service);
  return TEAM_COMPOSITION_BY_SERVICE[key] || null;
}
var OFF_CALL_INTERCONSULTAS_SERVICES = /* @__PURE__ */ new Set(["ux", "eme"]);
function validateTeamRankSlot(service, rank, members) {
  const limits = getTeamCompositionLimits(service);
  if (!limits) return null;
  const r = String(rank || "").trim().toUpperCase();
  const slotKey = r.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(limits, slotKey)) return null;
  const max = limits[slotKey];
  if (max === 0) {
    return `${r} no participa en equipos de ${String(service || "").trim()}.`;
  }
  const count = (members || []).filter((m) => String(m?.rank || "").toUpperCase() === r).length;
  if (count >= max) {
    return `El equipo ya tiene ${max} ${r} (m\xE1ximo para este servicio).`;
  }
  return null;
}
function serviceUsesStructuredComposition(service) {
  return getTeamCompositionLimits(service) != null;
}

// public/js/clinico-access.mjs
var CLINICO_UNLOCK_PHRASE = "entiendo, usare mi criterio clincio";
var R3_EXTENDED_SERVICES = /* @__PURE__ */ new Set(["torre hu", "eme", "ux"]);
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
function normalizeServiceKey2(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
var CYCLE_CONFIGS = {
  sala_r2: { letters: ["A", "B", "C", "D", "E", "F"], length: 6 },
  sala_r1: { letters: ["A1", "B1", "C1", "D1", "A2", "B2", "C2", "D2"], length: 8 },
  default: { letters: ["A", "B", "C", "D"], length: 4 }
};
function isSalaWardService(service) {
  return normalizeServiceKey2(service) === "sala";
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
function toMillis(value, fallbackIso) {
  if (value instanceof Date) return value.getTime();
  if (value != null && value !== "") return new Date(String(value)).getTime();
  if (fallbackIso) return new Date(String(fallbackIso)).getTime();
  return NaN;
}
function isIncomingPreviewWindow(cycle, now) {
  if (!cycle?.preview_start_at || !cycle?.effective_at) return false;
  const t = toMillis(now);
  const start = toMillis(cycle.preview_start_at);
  const end = toMillis(cycle.effective_at);
  if (!Number.isFinite(t) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return t >= start && t < end;
}
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
var R4_GUARDIA_SECTOR_ORDER = ["Sala A", "Sala B", "Eme", "Torre HU"];
function resolveR4GuardiaSectorLabel(patient) {
  if (!patient) return "";
  const service = String(patient.service || patient.servicio || "").trim();
  const subArea = String(patient.sub_area || patient.area || "").trim();
  const hay = `${service} ${subArea}`.trim();
  const svcKey = normalizeServiceKey2(service);
  const subKey = normalizeServiceKey2(subArea);
  for (const sector of R4_GUARDIA_SECTOR_ORDER) {
    if (service === sector || subArea === sector) return sector;
  }
  if (svcKey.includes("torre hu") || subKey.includes("torre hu")) return "Torre HU";
  if (svcKey.includes("eme") || subKey.includes("eme") || svcKey === "urgencias") return "Eme";
  if (svcKey.includes("sala") || subKey.includes("sala")) {
    const letter = salaLetterForTeamOrArea({ service, sub_area: subArea, name: hay });
    if (letter === "A") return "Sala A";
    if (letter === "B") return "Sala B";
    if (/sala\s*a\b/i.test(hay)) return "Sala A";
    if (/sala\s*b\b/i.test(hay)) return "Sala B";
  }
  return "";
}
function isR4MacroPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey2(patient.service);
  const sub = normalizeServiceKey2(patient.sub_area);
  if (svc.includes("sala") || sub.includes("sala")) return true;
  if (svc.includes("interconsult") || sub.includes("interconsult")) return true;
  const ic = String(patient.interconsult_type || "None");
  return ic !== "None";
}
function patientMatchesTeam(patient, team) {
  if (!patient || !team) return false;
  const patientSvc = normalizeServiceKey2(patient.service);
  const teamSvc = normalizeServiceKey2(team.service);
  if (patientSvc !== teamSvc && !(patientSvc.includes("sala") && teamSvc.includes("sala"))) {
    if (teamSvc.includes("sala") && (patientSvc.includes("sala") || extractSalaLetter(patient.service))) {
    } else if (patientSvc !== teamSvc) {
      return false;
    }
  }
  const frac = String(team.sub_area_fraction || "").trim();
  if (!frac) return true;
  const letter = frac.toUpperCase();
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (patientLetter && patientLetter === letter) return true;
  const hay = `${patient.service || ""} ${patient.sub_area || ""}`;
  return hay.toUpperCase().includes(letter);
}
function getJoinedTeams(teams, userId) {
  const uid = String(userId || "");
  if (!uid) return [];
  return (teams || []).filter(
    (team) => (team.members || []).some((m) => String(m.user_id) === uid)
  );
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
  const nowMs = toMillis(now != null ? now : /* @__PURE__ */ new Date());
  let best = null;
  let bestMs = -Infinity;
  let bestCreatedMs = -Infinity;
  for (const row of assignments || []) {
    if (String(row?.patient_id || "") !== pid) continue;
    const effMs = toMillis(row.effective_at);
    if (!Number.isFinite(effMs) || effMs > nowMs) continue;
    const createdMs = toMillis(row.created_at, row.effective_at);
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
function hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, salaLetter) {
  const letter = String(salaLetter || "").toUpperCase();
  if (!letter) return false;
  const salaTeams = (teams || []).filter(
    (t) => normalizeServiceKey2(t.service).includes("sala") && salaLetterForTeamOrArea(t) === letter
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
  const r2Cfg = CYCLE_CONFIGS.sala_r2;
  const hasDeficitLetter = r2Cfg.letters.some(
    (letter) => !hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, letter)
  );
  if (!hasDeficitLetter) return false;
  return (teams || []).some((team) => {
    if (!normalizeServiceKey2(team.service).includes("sala")) return false;
    if (!isOnCallToday(team, "R2", d)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return (salaGuardiaToday || []).some(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
  });
}
function salaOnCallR1(teams, sala, now, salaGuardiaToday = []) {
  const d = now instanceof Date ? now : new Date(String(now));
  const result = [];
  for (const team of (teams || []).filter((t) => t.sala === sala)) {
    const teamId = String(team.team_id || "");
    if (!teamId) continue;
    const declared = (salaGuardiaToday || []).find((g) => String(g.team_id) === teamId)?.user_id || team?.guardia_today?.user_id || "";
    if (declared) {
      result.push({ team_id: teamId, user_id: String(declared) });
      continue;
    }
    if (!isOnCallToday(team, "R1", d)) continue;
    for (const m of team.members || []) {
      if (m.rank === "R1" && m.user_id) {
        result.push({ team_id: teamId, user_id: String(m.user_id) });
      }
    }
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
    if (!isOnCallToday(team, r, d)) return false;
    return (team.members || []).some(
      (m) => String(m.user_id || "") === uid && String(m.rank || "").trim() === r
    );
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
function resolvePatientSala(patient) {
  const explicit = String(patient?.sala || "").trim();
  if (explicit) return explicit;
  const letter = extractSalaLetter(
    patient?.servicio || patient?.service || patient?.area || patient?.sub_area || ""
  );
  if (letter === "1") return "Sala 1";
  if (letter === "2") return "Sala 2";
  if (letter === "E") return "Sala E";
  const svc = normalizeServiceKey2(patient?.servicio || patient?.service || "");
  if (svc.includes("torre hu")) return "Torre HU";
  if (svc.includes("area a") || svc.includes("pension")) return "\xC1rea A/Pensionistas";
  return "";
}
function patientInUserSala(patient, userSala) {
  const ps = resolvePatientSala(patient);
  return ps !== "" && ps === String(userSala || "").trim();
}
function isInterconsultasPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey2(patient.service || patient.servicio || "");
  const sub = normalizeServiceKey2(patient.sub_area || patient.area || "");
  if (svc.includes("interconsult") || sub.includes("interconsult")) return true;
  const ic = String(patient.interconsult_type || "None");
  return ic !== "None" && ic !== "";
}
function userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now) {
  const uid = String(userId || "");
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey2(team?.service);
    if (!OFF_CALL_INTERCONSULTAS_SERVICES.has(svc)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return !isOnCallToday(team, rank, now);
  });
}
function userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now) {
  const uid = String(userId || "");
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey2(team?.service);
    if (!svc.includes("interconsult")) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return isOnCallToday(team, rank, now);
  });
}
var ENTREGA_PHASE_LS_KEY = "guardia.entregaPhase";
function readEntregaPhaseActive(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(ENTREGA_PHASE_LS_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    return !!(o && o.active);
  } catch (_e) {
    return false;
  }
}
function stampPatientClinicalSala(patient, user) {
  if (!patient || typeof patient !== "object") return patient;
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
  const rank = String(member?.rank || "");
  if (rank === "R2" || /^[A-F]$/i.test(frac)) return `Ciclo R2 \xB7 ${frac}`;
  if (rank === "R1" || /[12]$/i.test(frac)) return `Subciclo R1 \xB7 ${frac}`;
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
    const svc = normalizeServiceKey2(team?.service);
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
function isPatientReadableInClinicalScope(user, patient, activeGuardia = null, context = null) {
  const scope = evaluateClinicalScope(user, patient, activeGuardia, context);
  return scope.readable === true;
}
function canR2SalaAbcdefDeficitWrite(userId, patient, joinedTeams, salaGuardiaToday, teams, now) {
  if (!normalizeServiceKey2(patient?.service).includes("sala") && !extractSalaLetter(patient?.service || "")) {
    return false;
  }
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (!patientLetter) return false;
  if (hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, patientLetter)) return false;
  const uid = String(userId || "");
  return joinedTeams.some((team) => {
    if (!normalizeServiceKey2(team.service).includes("sala")) return false;
    if (!isOnCallToday(team, "R2", now)) return false;
    const declared = (salaGuardiaToday || []).find(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
    return !!declared;
  });
}
function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  const ctx = context && typeof context === "object" ? context : {};
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const guardias = Array.isArray(ctx.guardias) ? ctx.guardias : [];
  const cycle = ctx.cycle ?? null;
  const guardiaMode = !!ctx.guardiaMode;
  const now = ctx.now != null ? ctx.now instanceof Date ? ctx.now : new Date(String(ctx.now)) : /* @__PURE__ */ new Date();
  const userId = String(currentUser?.user_id || "");
  const rank = String(currentUser?.rank || "");
  const patientId = String(targetPatient?.id || "");
  const userSala = String(currentUser?.sala || "");
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
  if (!currentUser?.user_id || !targetPatient?.id) {
    return deny("Usuario o paciente no identificado");
  }
  if (currentUser.is_program_admin === 1 || currentUser.is_program_admin === true || rank === "Admin") {
    return allow("Privilegios admin: acceso completo");
  }
  if (isActiveGuardiaCoveringUser(userId, activeGuardia)) {
    return allow("Guardia activa: cobertura asignada");
  }
  if (isIncomingPreviewWindow(cycle, now)) {
    const incoming = assignments.find((a) => String(a.patient_id) === patientId);
    if (incoming) {
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
    }
  }
  const joinedTeams = getJoinedTeams(teams, userId);
  const joinedTeamIds = new Set(joinedTeams.map((t) => String(t.team_id)));
  const strictTeamFilter = userHasJoinedClinicalTeams(teams, userId);
  if (isInterconsultasPatient(targetPatient)) {
    if (userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now)) {
      return allow("Off-call UX/Eme: censo Interconsultas");
    }
    if (userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now)) {
      return allow("Interconsultas de guardia: censo del d\xEDa");
    }
  }
  if (guardiaMode) {
    if (rank === "R1") {
      if (ctx.onCallGuardiaReceiver) {
        if (patientCoveredByGuardia(patientId, userId, guardias)) {
          return allow("Modo Guardia R1: paciente entregado", true, false);
        }
        return deny("Modo Guardia R1: sin entrega recibida");
      }
      const patientSala = targetPatient?.sala || "";
      if (patientSala && patientSala === userSala) {
        return allow("Modo Guardia R1: visibilidad de Sala completa", true, false);
      }
      return deny("Modo Guardia R1: fuera de mi Sala");
    }
    if (rank === "R2") {
      if (patientCoveredByGuardia(patientId, userId, guardias)) {
        return allow("Modo Guardia R2: paciente entregado", true, false);
      }
      return deny("Modo Guardia R2: sin entrega recibida");
    }
    if (rank === "R4") {
      const svc = normalizeServiceKey2(targetPatient?.service);
      if (svc.includes("sala") || svc.includes("torre")) {
        return allow("Modo Guardia R4: cobertura Sala + Torre", true, false);
      }
      return deny("Modo Guardia R4: fuera de dominio");
    }
    return deny("Modo Guardia: rango sin cobertura");
  }
  if (rank === "R4") {
    return allow("R4: acceso global");
  }
  const entregaPhaseActive = !!ctx.entregaPhaseActive;
  if (entregaPhaseActive && rank === "R1") {
    if (patientInUserSala(targetPatient, userSala)) {
      return allow("Fase entrega R1: censo de sala", true, false);
    }
    return deny("Fase entrega R1: fuera de mi sala");
  }
  if (rank === "R1") {
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
    if (patientInUserSala(targetPatient, userSala)) {
      return allow("R1: paciente en mi sala");
    }
    return deny("R1: fuera de mi sala");
  }
  if (rank === "R2") {
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
    if (!strictTeamFilter && patientInUserSala(targetPatient, userSala)) {
      return allow("R2: paciente en mi sala");
    }
    return deny("R2: sin equipo ni entrega");
  }
  if (rank === "R3") {
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
  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds, now)) {
    return allow("Paciente del equipo (asignaci\xF3n)");
  }
  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow("Paciente entregado (handoff)");
  }
  return deny("Fuera de alcance");
}

export {
  CLINICAL_SALA_VALUES,
  clinicalServiceForSala,
  clinicalSalaRoomSlug,
  getTeamCompositionLimits,
  validateTeamRankSlot,
  serviceUsesStructuredComposition,
  CLINICO_UNLOCK_PHRASE,
  normalizeClinicoUnlockPhrase,
  matchesClinicoUnlockPhrase,
  isClinicoUnlocked,
  isClinicoAccessHidden,
  openClinicoUnlockModal,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  clinicoAccessWindowHandlers,
  isSalaWardService,
  usesSalaR1LinePicker,
  getCycleLetterOptionsForRank,
  getCycleConfig,
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  letterIndexForTeam,
  isOnCallToday,
  isIncomingPreviewWindow,
  extractSalaLetter,
  salaLetterForTeamOrArea,
  R4_GUARDIA_SECTOR_ORDER,
  resolveR4GuardiaSectorLabel,
  isR4MacroPatient,
  patientMatchesTeam,
  getJoinedTeams,
  userHasJoinedClinicalTeams,
  patientHasExplicitTeamAssignment,
  resolvePatientTeamIdFromAssignments,
  patientAssignedToTeam,
  patientInJoinedTeamScope,
  patientCoveredByGuardia,
  isActiveGuardiaCoveringUser,
  hasSalaGuardiaDeclaredForLetter,
  computeSalaAbcdefDeficitWrite,
  salaOnCallR1,
  userIsOnGuardiaCallToday,
  userIsOnCallForLanHost,
  salaOnCallR2,
  teamGuardiaOverride,
  resolvePatientSala,
  patientInUserSala,
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
  ENTREGA_PHASE_LS_KEY,
  readEntregaPhaseActive,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
  teamForMemberCycle,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
  patientMatchesAnyJoinedTeam,
  r3ExtendedStructuralAccess,
  isPatientReadableInClinicalScope,
  canR2SalaAbcdefDeficitWrite,
  evaluateClinicalScope
};
//# sourceMappingURL=/js/chunks/chunk-MSBFOYVD.js.map

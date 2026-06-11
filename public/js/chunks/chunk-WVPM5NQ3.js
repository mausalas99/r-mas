import {
  needsTeamOnboarding
} from "/js/chunks/chunk-Y7BWWFTD.js";
import {
  assignableTeamsForUser,
  getActiveLiveSyncRoomId,
  getClinicalScopeContextForEvaluate,
  hasElevatedTeamPrivileges,
  purgeLanPatientFromHost,
  readPatientRegistrationTeamId,
  rememberPatientDeleteTombstone,
  removePatientLocally
} from "/js/chunks/chunk-RU6FBRCV.js";
import {
  patients,
  saveState
} from "/js/chunks/chunk-P72QNDDG.js";
import {
  clinicalSessionContext
} from "/js/chunks/chunk-ONPLOPU5.js";
import {
  patientHasExplicitTeamAssignment
} from "/js/chunks/chunk-IYRQG3WP.js";

// public/js/patient-delete-sync.mjs
var DEFAULT_FLUSH_MS = 3e4;
var pending = /* @__PURE__ */ new Map();
function stagePatientDelete(patientId, patient, onCommit, delayMs) {
  const pid = String(patientId || "").trim();
  if (!pid || !patient || typeof onCommit !== "function") return;
  cancelStagedPatientDelete(pid);
  const delay = delayMs != null ? delayMs : DEFAULT_FLUSH_MS;
  const entry = {
    patient: { ...patient },
    timeoutId: null,
    onCommit
  };
  entry.timeoutId = setTimeout(function() {
    flushOne(pid);
  }, delay);
  pending.set(pid, entry);
}
function cancelStagedPatientDelete(patientId) {
  const pid = String(patientId || "").trim();
  const entry = pending.get(pid);
  if (!entry) return;
  if (entry.timeoutId) clearTimeout(entry.timeoutId);
  pending.delete(pid);
}
function flushOne(patientId) {
  const pid = String(patientId || "").trim();
  const entry = pending.get(pid);
  if (!entry) return;
  if (entry.timeoutId) clearTimeout(entry.timeoutId);
  pending.delete(pid);
  try {
    entry.onCommit(entry.patient);
  } catch (_e) {
  }
}

// lib/patient-teamless-policy.mjs
var TEAMLESS_PATIENT_TTL_MS = 24 * 60 * 60 * 1e3;
var TOUR_DEMO_IDS = /* @__PURE__ */ new Set(["demo-onboarding", "demo-onboarding-2"]);
function teamlessPatientExpiresAtMs(registeredAt) {
  const raw = String(registeredAt || "").trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  if (!Number.isFinite(ms)) return null;
  return ms + TEAMLESS_PATIENT_TTL_MS;
}
function isDemoPatient(patient) {
  if (!patient) return true;
  if (patient.isDemo) return true;
  const id = String(patient.id || "");
  return id.indexOf("demo-") === 0 || TOUR_DEMO_IDS.has(id);
}
function isTeamlessPatientExpired(patient, assignments, nowIso) {
  if (!patient || isDemoPatient(patient)) return false;
  if (patientHasExplicitTeamAssignment(String(patient.id || ""), assignments || [])) return false;
  const expiresAt = teamlessPatientExpiresAtMs(patient.registeredAt);
  if (expiresAt == null) return false;
  const nowMs = new Date(nowIso || (/* @__PURE__ */ new Date()).toISOString()).getTime();
  return Number.isFinite(nowMs) && nowMs >= expiresAt;
}
function selectExpiredTeamlessPatients(patientList, ctx) {
  const assignments = Array.isArray(ctx?.assignments) ? ctx.assignments : [];
  const guardias = Array.isArray(ctx?.guardias) ? ctx.guardias : [];
  const activeGuardiaIds = new Set(
    guardias.filter((g) => g && !g.resolved_at && !g.resolvedAt).map((g) => String(g.patient_id || g.patientId || "")).filter(Boolean)
  );
  const nowIso = ctx?.now || (/* @__PURE__ */ new Date()).toISOString();
  return (patientList || []).filter(function(patient) {
    const pid = String(patient?.id || "");
    if (!pid || activeGuardiaIds.has(pid)) return false;
    return isTeamlessPatientExpired(patient, assignments, nowIso);
  });
}

// public/js/patient-teamless-policy.mjs
var CLEANUP_INTERVAL_MS = 30 * 60 * 1e3;
var TEAM_ONBOARDING_PROMPT_KEY = "rpc-teamless-reg-prompted";
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function shouldWarnTeamlessPatientSave() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id || hasElevatedTeamPrivileges(user)) return false;
  if (!assignableTeamsForUser(user).length) return true;
  return !readPatientRegistrationTeamId();
}
function removeTeamlessPatientLocally(patient) {
  const id = String(patient?.id || "").trim();
  if (!id || !removePatientLocally(id)) return false;
  if (getActiveLiveSyncRoomId()) {
    rememberPatientDeleteTombstone(patient);
    void purgeLanPatientFromHost(id);
    stagePatientDelete(id, patient, function() {
      import("/js/chunks/lan-mutation-registry-GQE3VYCW.js").then(function(m) {
        m.lanMutationRegistry.dispatchLanMutation("patient-fields", id);
      });
    });
  }
  return true;
}
var cleanupInFlight = null;
var cleanupTimer = null;
async function purgeExpiredTeamlessPatients(options) {
  if (cleanupInFlight) return cleanupInFlight;
  const opts = options || {};
  cleanupInFlight = (async function() {
    const ctx = getClinicalScopeContextForEvaluate();
    const expired = selectExpiredTeamlessPatients(patients, {
      assignments: ctx.assignments || [],
      guardias: clinicalSessionContext.guardias || [],
      now: ctx.now
    });
    if (!expired.length) return { removed: 0 };
    let removed = 0;
    for (const patient of expired) {
      if (removeTeamlessPatientLocally(patient)) removed += 1;
    }
    if (removed > 0) {
      saveState({ immediate: true });
      if (!opts.silent) {
        try {
          const shell = await import("/js/chunks/app-shell-JOABSPVF.js");
          if (typeof shell.showToast === "function") {
            const label = removed === 1 ? "1 paciente sin equipo eliminado (m\xE1s de 24 h)" : removed + " pacientes sin equipo eliminados (m\xE1s de 24 h)";
            shell.showToast(label, "info");
          }
        } catch (_e) {
        }
      }
      try {
        const mod = await import("/js/chunks/patients-WTWGLCDQ.js");
        if (typeof mod.renderPatientList === "function") mod.renderPatientList();
      } catch (_e) {
      }
    }
    return { removed };
  })().finally(function() {
    cleanupInFlight = null;
  });
  return cleanupInFlight;
}
function wireTeamlessPatientCleanup() {
  if (typeof document === "undefined" || document._teamlessPatientCleanupWired) return;
  document._teamlessPatientCleanupWired = true;
  void purgeExpiredTeamlessPatients({ silent: true });
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = setInterval(function() {
    void purgeExpiredTeamlessPatients({ silent: true });
  }, CLEANUP_INTERVAL_MS);
  document.addEventListener("rpc-patient-team-assigned", function() {
    void purgeExpiredTeamlessPatients({ silent: true });
  });
  document.addEventListener("rpc-clinical-ops-synced", function() {
    void purgeExpiredTeamlessPatients({ silent: true });
  });
}
function openBackdropModal(id, html) {
  const prev = document.getElementById(id);
  if (prev) prev.remove();
  const backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = id;
  backdrop.innerHTML = html;
  document.body.appendChild(backdrop);
  return backdrop;
}
function maybePromptTeamOnboardingForRegistration() {
  if (typeof document === "undefined" || typeof sessionStorage === "undefined") return;
  if (!needsTeamOnboarding()) return;
  if (sessionStorage.getItem(TEAM_ONBOARDING_PROMPT_KEY) === "1") return;
  sessionStorage.setItem(TEAM_ONBOARDING_PROMPT_KEY, "1");
  const backdrop = openBackdropModal(
    "teamless-reg-onboard-backdrop",
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="teamless-reg-onboard-title"><h3 id="teamless-reg-onboard-title">\xDAnete a un equipo</h3><p>Para registrar pacientes en la red \u21C4 necesitas crear o unirte a un equipo en tu \xE1rea (Mi rotaci\xF3n).</p><p>Si registras un paciente sin equipo, el expediente se <strong>eliminar\xE1 autom\xE1ticamente en 24 horas</strong>.</p><div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;margin-top:16px;"><button type="button" class="btn-cancel" id="teamless-reg-onboard-later">Registrar igual</button><button type="button" class="btn-conflict-primary" id="teamless-reg-onboard-join">Ir a Mi rotaci\xF3n</button></div></div>'
  );
  const close = function() {
    backdrop.remove();
  };
  backdrop.querySelector("#teamless-reg-onboard-later").onclick = close;
  backdrop.querySelector("#teamless-reg-onboard-join").onclick = function() {
    close();
    void openMiRotacionFromPolicy();
  };
}
async function openMiRotacionFromPolicy() {
  try {
    const { openClinicalTeamsPanel } = await import("/js/chunks/teams-roster-5RRGM43J.js");
    await openClinicalTeamsPanel({ skipProfileGate: true });
    return;
  } catch (_e) {
  }
  try {
    const { openMiRotacion } = await import("./clinical-rotation-entry.mjs");
    await openMiRotacion();
  } catch (_e) {
  }
}
function confirmTeamlessPatientSave(onConfirm) {
  if (typeof document === "undefined") {
    onConfirm();
    return;
  }
  const user = clinicalSessionContext.user;
  const hasTeams = assignableTeamsForUser(user).length > 0;
  const title = hasTeams ? "Paciente sin equipo" : "Sin equipo en tu rotaci\xF3n";
  const body = hasTeams ? "No seleccionaste un equipo. El paciente se eliminar\xE1 autom\xE1ticamente en <strong>24 horas</strong> si no lo asignas a un equipo." : "No perteneces a ning\xFAn equipo. El paciente se eliminar\xE1 autom\xE1ticamente en <strong>24 horas</strong> si no te unes a un equipo y lo asignas.";
  const backdrop = openBackdropModal(
    "teamless-save-backdrop",
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="teamless-save-title"><h3 id="teamless-save-title">' + esc(title) + "</h3><p>" + body + '</p><div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;margin-top:16px;"><button type="button" class="btn-cancel" id="teamless-save-cancel">Cancelar</button><button type="button" class="btn-conflict-primary" id="teamless-save-confirm">Guardar de todas formas</button></div></div>'
  );
  backdrop.querySelector("#teamless-save-cancel").onclick = function() {
    backdrop.remove();
  };
  backdrop.querySelector("#teamless-save-confirm").onclick = function() {
    backdrop.remove();
    onConfirm();
  };
}
function syncPatientRegistrationTeamPolicyUi() {
  if (typeof document === "undefined") return;
  const banner = document.getElementById("m-team-no-team-banner");
  const hint = document.getElementById("m-team-hint");
  const user = clinicalSessionContext.user;
  const elevated = hasElevatedTeamPrivileges(user);
  const teams = assignableTeamsForUser(user);
  const ttlHint = "Los pacientes sin equipo asignado se eliminan autom\xE1ticamente despu\xE9s de 24 horas.";
  if (banner) {
    banner.style.display = !elevated && !teams.length ? "" : "none";
  }
  if (hint) {
    hint.textContent = elevated ? "Asigna al equipo que cubrir\xE1 el caso en \u21C4." : teams.length ? ttlHint + " Asigna al equipo que cubrir\xE1 el caso en \u21C4." : ttlHint;
  }
}

export {
  stagePatientDelete,
  TEAMLESS_PATIENT_TTL_MS,
  selectExpiredTeamlessPatients,
  shouldWarnTeamlessPatientSave,
  purgeExpiredTeamlessPatients,
  wireTeamlessPatientCleanup,
  maybePromptTeamOnboardingForRegistration,
  confirmTeamlessPatientSave,
  syncPatientRegistrationTeamPolicyUi
};
//# sourceMappingURL=/js/chunks/chunk-WVPM5NQ3.js.map

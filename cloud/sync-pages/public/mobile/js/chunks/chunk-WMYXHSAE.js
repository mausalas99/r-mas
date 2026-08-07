import {
  needsClinicalOnboarding,
  needsTeamOnboarding,
  needsTeamOnboardingStep
} from "/mobile/js/chunks/chunk-VHAGBDAV.js";
import {
  filterJoinedTeams,
  hasElevatedTeamPrivileges,
  syncGuardiaRotationToolbar
} from "/mobile/js/chunks/chunk-FHDPZLZP.js";
import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-PD77VH7Y.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-LQTSNMET.js";
import {
  clinicalSessionContext,
  isDbMode
} from "/mobile/js/chunks/chunk-NMJNQQZG.js";

// public/js/features/clinical-context-bar.mjs
function clinicalContextBarEl() {
  return document.getElementById("clinical-context-bar");
}
function syncClinicalContextBarVisibility() {
  const bar = clinicalContextBarEl();
  if (!bar) return;
  const rotation = document.getElementById("clinical-rotation-section");
  const filtersMount = document.getElementById("clinical-census-filters-mount");
  const hasRotation = rotation && !rotation.hidden && !isGuardiaMode();
  const hasFilters = filtersMount && !filtersMount.hidden && !!document.getElementById("clinical-census-filters");
  bar.hidden = !(hasRotation || hasFilters);
}

// public/js/features/clinical-rotation-entry-status.mjs
function buildEntryStatusEarly() {
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    return { primary: "Solo este equipo", sub: "Ajeno a medicina interna \xB7 sin R+ Cloud", pending: false };
  }
  if (needsClinicalOnboarding()) {
    return {
      primary: "Configura tu rotaci\xF3n",
      sub: "@usuario, rango y sala \u2014 equipos despu\xE9s en Mi rotaci\xF3n",
      pending: true
    };
  }
  const user = clinicalSessionContext.user;
  if (!user?.user_id) {
    return { primary: "Mi rotaci\xF3n", sub: "Completa la configuraci\xF3n inicial abajo", pending: true };
  }
  return null;
}
function buildEntryStatusPrimary(user) {
  const handle = normalizeUsername(user.username || "");
  const rank = String(user.rank || "").trim();
  const sala = String(user.sala || "").trim();
  const parts = [];
  if (handle) parts.push("@" + handle);
  if (rank) parts.push(rank);
  if (sala) parts.push(sala);
  return parts.length ? parts.join(" \xB7 ") : "Mi rotaci\xF3n";
}
function buildEntryStatusSub(user, teams) {
  const name = String(user.clinical_name || "").trim();
  if (hasElevatedTeamPrivileges(user)) {
    return name || "Supervisi\xF3n de rotaciones \u2014 sin equipo requerido";
  }
  if (teams.length === 1) return "Equipo: " + String(teams[0].name || "\u2014");
  if (teams.length > 1) return teams.length + " equipos";
  if (needsTeamOnboarding()) return "Sin equipo \u2014 abre para buscar en tu sala o unirte";
  return name || "Equipos, entregas y perfil cl\xEDnico";
}
function buildClinicalRotationEntryStatus() {
  const early = buildEntryStatusEarly();
  if (early) return early;
  const user = clinicalSessionContext.user;
  const teams = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  const pending = needsTeamOnboardingStep();
  return {
    primary: buildEntryStatusPrimary(user),
    sub: buildEntryStatusSub(user, teams),
    pending
  };
}

// public/js/features/clinical-rotation-entry.mjs
var entryControlsWired = false;
async function openMiRotacion() {
  if (!isDbMode()) {
    if (typeof window.showToast === "function") {
      window.showToast("Mi rotaci\xF3n requiere la base de datos cl\xEDnica.", "info");
    }
    return;
  }
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    if (typeof window.showToast === "function") {
      window.showToast(
        "Mi rotaci\xF3n no est\xE1 disponible en modo solo este equipo (ajeno a medicina interna).",
        "info"
      );
    }
    return;
  }
  const { openClinicalTeamsPanel } = await import("/mobile/js/chunks/teams-roster-YA5DDHZ5.js");
  await openClinicalTeamsPanel();
  syncClinicalRotationEntryChrome();
}
function buildEntryStatus() {
  return buildClinicalRotationEntryStatus();
}
function syncClinicalRotationEntryChrome() {
  const rotationSection = document.getElementById("clinical-rotation-section");
  const show = isDbMode() && !isClinicalLocalOnlyMode(readRpcSettings()) && !isGuardiaMode();
  if (rotationSection) rotationSection.hidden = !show;
  if (!show) {
    syncGuardiaRotationToolbar();
    syncClinicalContextBarVisibility();
    return;
  }
  const status = buildEntryStatus();
  const entryBtn = document.getElementById("btn-sidebar-mi-rotacion");
  const entryPrimary = document.getElementById("clinical-rotation-entry-primary");
  const entrySub = document.getElementById("clinical-rotation-entry-sub");
  if (entryBtn) {
    entryBtn.classList.toggle("is-pending", status.pending);
    const base = status.pending ? "Completa rango y rotaci\xF3n (sala)" : "@usuario, equipos y entregas";
    entryBtn.setAttribute("title", `${base} \u2014 ${status.primary}: ${status.sub}`);
  }
  if (entryPrimary) entryPrimary.textContent = status.primary;
  if (entrySub) entrySub.textContent = status.sub;
  syncGuardiaRotationToolbar();
  syncClinicalContextBarVisibility();
}
function wireClinicalRotationEntryControls() {
  if (entryControlsWired) return;
  entryControlsWired = true;
  const bind = (id) => {
    const el = document.getElementById(id);
    if (!el || el._rpcMiRotacionWired) return;
    el._rpcMiRotacionWired = true;
    el.addEventListener("click", () => void openMiRotacion());
  };
  bind("btn-sidebar-mi-rotacion");
  if (typeof document !== "undefined") {
    document.addEventListener("rpc-clinical-teams-changed", () => {
      syncClinicalRotationEntryChrome();
    });
    document.addEventListener("rpc-clinical-ops-synced", () => {
      syncClinicalRotationEntryChrome();
    });
  }
}
var windowHandlers = {
  openMiRotacion
};

export {
  syncClinicalContextBarVisibility,
  openMiRotacion,
  syncClinicalRotationEntryChrome,
  wireClinicalRotationEntryControls,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-WMYXHSAE.js.map

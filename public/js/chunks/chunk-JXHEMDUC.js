import {
  needsClinicalOnboarding,
  needsTeamOnboarding
} from "/js/chunks/chunk-7ELSLVKZ.js";
import {
  clinicalSessionContext,
  filterJoinedTeams,
  normalizeUsername
} from "/js/chunks/chunk-G5SG4DMR.js";
import {
  isDbMode
} from "/js/chunks/chunk-NWJJI23U.js";

// public/js/features/clinical-context-bar.mjs
function clinicalContextBarEl() {
  return document.getElementById("clinical-context-bar");
}
function syncClinicalContextBarVisibility() {
  const bar = clinicalContextBarEl();
  if (!bar) return;
  const rotation = document.getElementById("clinical-rotation-section");
  const filtersMount = document.getElementById("clinical-census-filters-mount");
  const hasRotation = rotation && !rotation.hidden;
  const hasFilters = filtersMount && !filtersMount.hidden && !!document.getElementById("clinical-census-filters");
  bar.hidden = !(hasRotation || hasFilters);
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
  if (needsClinicalOnboarding()) {
    const mainMod = await import("/js/chunks/clinical-onboarding-main-RHODXE7Y.js");
    if (!mainMod.focusMainClinicalOnboarding()) await mainMod.showMainClinicalOnboarding();
    return;
  }
  const { openClinicalTeamsPanel } = await import("/js/chunks/clinical-teams-HML5RWZ6.js");
  await openClinicalTeamsPanel();
}
function buildEntryStatus() {
  if (needsClinicalOnboarding()) {
    return {
      primary: "Configura tu rotaci\xF3n",
      sub: "Usuario LAN, rango y sala \u2014 equipos despu\xE9s en Mi rotaci\xF3n",
      pending: true
    };
  }
  const user = clinicalSessionContext.user;
  if (!user?.user_id) {
    return {
      primary: "Mi rotaci\xF3n",
      sub: "Desbloquea la base de datos para continuar",
      pending: true
    };
  }
  const handle = normalizeUsername(user.username || "");
  const rank = String(user.rank || "").trim();
  const sala = String(user.sala || "").trim();
  const name = String(user.clinical_name || "").trim();
  const teams = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  const parts = [];
  if (handle) parts.push(`@${handle}`);
  if (rank) parts.push(rank);
  if (sala) parts.push(sala);
  const primary = parts.length ? parts.join(" \xB7 ") : "Mi rotaci\xF3n";
  let sub = name || "Equipos, entregas y perfil cl\xEDnico";
  if (teams.length === 1) sub = `Equipo: ${String(teams[0].name || "\u2014")}`;
  else if (teams.length > 1) sub = `${teams.length} equipos`;
  else if (needsTeamOnboarding()) sub = "Sin equipo \u2014 abre para buscar en tu sala o unirte";
  return { primary, sub, pending: false };
}
function syncClinicalRotationEntryChrome() {
  const rotationSection = document.getElementById("clinical-rotation-section");
  const show = isDbMode();
  if (rotationSection) rotationSection.hidden = !show;
  if (!show) {
    syncClinicalContextBarVisibility();
    return;
  }
  const status = buildEntryStatus();
  const entryBtn = document.getElementById("btn-sidebar-mi-rotacion");
  const entryPrimary = document.getElementById("clinical-rotation-entry-primary");
  const entrySub = document.getElementById("clinical-rotation-entry-sub");
  if (entryBtn) {
    entryBtn.classList.toggle("is-pending", status.pending);
    const base = status.pending ? "Completa rango y rotaci\xF3n (sala)" : "Usuario LAN, equipos y entregas";
    entryBtn.setAttribute("title", `${base} \u2014 ${status.primary}: ${status.sub}`);
  }
  if (entryPrimary) entryPrimary.textContent = status.primary;
  if (entrySub) entrySub.textContent = status.sub;
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
//# sourceMappingURL=/js/chunks/chunk-JXHEMDUC.js.map

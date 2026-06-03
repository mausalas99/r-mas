import {
  prefillRegistrationFromUrlParams
} from "/js/chunks/chunk-WAEO3FME.js";
import {
  syncClinicalRotationEntryChrome
} from "/js/chunks/chunk-JXHEMDUC.js";
import {
  needsClinicalOnboarding,
  renderOnboardingPanelInto
} from "/js/chunks/chunk-7ELSLVKZ.js";
import {
  ensureClinicalPanelSession
} from "/js/chunks/chunk-G5SG4DMR.js";
import "/js/chunks/chunk-NWJJI23U.js";
import "/js/chunks/chunk-ZYO74J2K.js";

// public/js/features/clinical-onboarding-main.mjs
var CLINICAL_ONBOARDING_MAIN_ID = "clinical-onboarding-main";
var CLINICAL_ONBOARDING_ACTIVE_CLASS = "clinical-onboarding-active";
var teamsChangedListenerWired = false;
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function getClinicalOnboardingMainHost() {
  return document.getElementById(CLINICAL_ONBOARDING_MAIN_ID);
}
function isMainClinicalOnboardingActive() {
  return document.documentElement.classList.contains(CLINICAL_ONBOARDING_ACTIVE_CLASS);
}
function wireTeamsChangedListenerOnce() {
  if (teamsChangedListenerWired || typeof document === "undefined") return;
  teamsChangedListenerWired = true;
  document.addEventListener("rpc-clinical-teams-changed", () => {
    void refreshMainClinicalOnboardingIfNeeded();
  });
}
function hideMainClinicalOnboarding() {
  document.documentElement.classList.remove(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  const host = getClinicalOnboardingMainHost();
  if (host) host.remove();
  syncClinicalRotationEntryChrome();
}
function focusMainClinicalOnboarding() {
  const host = getClinicalOnboardingMainHost();
  if (!host) return false;
  host.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return true;
}
async function showMainClinicalOnboarding() {
  wireTeamsChangedListenerOnce();
  if (!needsClinicalOnboarding()) {
    hideMainClinicalOnboarding();
    return;
  }
  const main = document.getElementById("main-area");
  if (!main) return;
  let host = getClinicalOnboardingMainHost();
  if (!host) {
    host = document.createElement("div");
    host.id = CLINICAL_ONBOARDING_MAIN_ID;
    host.className = "clinical-onboarding-main";
    host.setAttribute("role", "region");
    host.setAttribute("aria-label", "Configura tu rotaci\xF3n");
    main.prepend(host);
  }
  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Desbloquea la base de datos para configurar tu rotaci\xF3n.</p></div>`;
    return;
  }
  host.innerHTML = '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Cargando\u2026</p></div>';
  const card = host.querySelector(".clinical-onboarding-card");
  try {
    await renderOnboardingPanelInto(card || host);
    prefillRegistrationFromUrlParams();
    syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : "Error al cargar.")}</p></div>`;
  }
}
async function refreshMainClinicalOnboardingIfNeeded() {
  if (needsClinicalOnboarding()) await showMainClinicalOnboarding();
  else hideMainClinicalOnboarding();
}
export {
  CLINICAL_ONBOARDING_ACTIVE_CLASS,
  CLINICAL_ONBOARDING_MAIN_ID,
  focusMainClinicalOnboarding,
  getClinicalOnboardingMainHost,
  hideMainClinicalOnboarding,
  isMainClinicalOnboardingActive,
  refreshMainClinicalOnboardingIfNeeded,
  showMainClinicalOnboarding
};
//# sourceMappingURL=/js/chunks/clinical-onboarding-main-RHODXE7Y.js.map

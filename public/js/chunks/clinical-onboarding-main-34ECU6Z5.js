import {
  prefillRegistrationFromUrlParams
} from "/js/chunks/chunk-WAEO3FME.js";
import {
  needsClinicalOnboarding,
  renderOnboardingPanelInto
} from "/js/chunks/chunk-4LSVKF2K.js";
import {
  ensureClinicalPanelSession
} from "/js/chunks/chunk-Q2FBCRTM.js";
import {
  isSqlcipherNativeReady
} from "/js/chunks/chunk-K7IRW6AZ.js";
import "/js/chunks/chunk-UXASVKZ4.js";
import "/js/chunks/chunk-K6QXHWFW.js";
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
  void import("/js/chunks/clinical-rotation-entry-U4VCMXHS.js").then((m) => m.syncClinicalRotationEntryChrome());
}
async function describeOnboardingSessionBlock() {
  if (typeof window === "undefined") {
    return "Desbloquea la base de datos para configurar tu rotaci\xF3n.";
  }
  const api = window.rplusDb || window.electronAPI;
  if (!api || typeof api.dbStatus !== "function") {
    return "Desbloquea la base de datos para configurar tu rotaci\xF3n.";
  }
  try {
    const status = await api.dbStatus();
    if (status && !isSqlcipherNativeReady(status)) {
      return "Esta instalaci\xF3n de R+ no carg\xF3 el m\xF3dulo de base de datos (SQLCipher). Reinstala desde GitHub o usa Ajustes \u2192 Aplicaci\xF3n \u2192 Reinstalar versi\xF3n actual.";
    }
    if (status && status.state === "unlocked") {
      return "La base ya est\xE1 abierta, pero la sesi\xF3n cl\xEDnica no inici\xF3. Cierra R+ por completo (incluida la bandeja) y vuelve a abrir; si persiste, reinstala la misma versi\xF3n desde GitHub.";
    }
  } catch (_e) {
  }
  return "Desbloquea la base de datos para configurar tu rotaci\xF3n.";
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
    const lead = await describeOnboardingSessionBlock();
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-teams-lead">${escapeHtml(lead)}</p></div>`;
    return;
  }
  host.innerHTML = '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Cargando\u2026</p></div>';
  const card = host.querySelector(".clinical-onboarding-card");
  try {
    await renderOnboardingPanelInto(card || host);
    prefillRegistrationFromUrlParams();
    const rot = await import("/js/chunks/clinical-rotation-entry-U4VCMXHS.js");
    rot.syncClinicalRotationEntryChrome();
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
  describeOnboardingSessionBlock,
  focusMainClinicalOnboarding,
  getClinicalOnboardingMainHost,
  hideMainClinicalOnboarding,
  isMainClinicalOnboardingActive,
  refreshMainClinicalOnboardingIfNeeded,
  showMainClinicalOnboarding
};
//# sourceMappingURL=/js/chunks/clinical-onboarding-main-34ECU6Z5.js.map

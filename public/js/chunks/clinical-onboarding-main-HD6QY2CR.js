import {
  prefillRegistrationFromUrlParams
} from "/js/chunks/chunk-IF6VWOX3.js";
import {
  needsClinicalOnboarding,
  needsClinicalSyncModeChoice,
  renderOnboardingPanelInto,
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions
} from "/js/chunks/chunk-YSBQGKLT.js";
import {
  ensureClinicalPanelSession
} from "/js/chunks/chunk-7EOVDVXB.js";
import {
  ensureClinicalDbUnlocked,
  isSqlcipherNativeReady
} from "/js/chunks/chunk-3KDKMEHW.js";
import "/js/chunks/chunk-57EQFKXN.js";
import {
  isDbMode
} from "/js/chunks/chunk-K6QXHWFW.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/js/chunks/chunk-2VGC7OB3.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-EF5DJBFN.js";
import "/js/chunks/chunk-OPJSETWU.js";

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
  void import("/js/chunks/clinical-rotation-entry-QC3AOWWJ.js").then((m) => m.syncClinicalRotationEntryChrome());
}
async function readClinicalDbGateKind() {
  if (typeof window === "undefined" || !isDbMode()) return "no_api";
  const api = window.rplusDb || window.electronAPI;
  if (!api || typeof api.dbStatus !== "function") return "no_api";
  try {
    const status = await api.dbStatus();
    if (status && !isSqlcipherNativeReady(status)) return "native_blocked";
    if (status && status.state === "unlocked") return "unlocked";
    if (status && status.state) return "locked";
    return "unknown";
  } catch (_e) {
    return "unknown";
  }
}
async function describeOnboardingSessionBlock() {
  if (typeof window === "undefined") {
    return "Abre la base de datos local de R+ para continuar. No necesitas red LAN ni \u21C4.";
  }
  const gate = await readClinicalDbGateKind();
  if (gate === "native_blocked") {
    return "Esta instalaci\xF3n de R+ no carg\xF3 el m\xF3dulo de base de datos (SQLCipher). Reinstala desde GitHub o usa Ajustes \u2192 Aplicaci\xF3n \u2192 Reinstalar versi\xF3n actual.";
  }
  if (gate === "unlocked") {
    return "La base local ya est\xE1 abierta, pero la sesi\xF3n cl\xEDnica no inici\xF3. Pulsa Reintentar abajo o cierra R+ por completo (incluida la bandeja) y vuelve a abrir.";
  }
  if (gate === "locked") {
    return "R+ est\xE1 preparando el almacenamiento local de este equipo. Pulsa Reintentar en unos segundos; no necesitas red LAN ni \u21C4.";
  }
  if (gate === "no_api") {
    return "R+ no detect\xF3 el acceso a la base local. Reinicia la aplicaci\xF3n.";
  }
  return "Abre la base de datos local de R+ para continuar. No necesitas red LAN ni \u21C4.";
}
async function buildOnboardingSessionBlockHtml() {
  const lead = await describeOnboardingSessionBlock();
  const gate = await readClinicalDbGateKind();
  const actions = gate === "native_blocked" ? "" : `<div class="modal-actions clinical-onboard-session-actions"><button type="button" class="btn-save" id="clinical-onboard-retry-session-btn">Reintentar</button></div>`;
  return `<div class="clinical-onboarding-card"><p class="clinical-teams-lead">${escapeHtml(lead)}</p>${actions}</div>`;
}
function wireOnboardingSessionRecoveryOnce(host) {
  if (!host || host._rpcSessionRecoveryWired) return;
  host._rpcSessionRecoveryWired = true;
  host.addEventListener("click", (ev) => {
    const retryBtn = ev.target.closest("#clinical-onboard-retry-session-btn");
    if (retryBtn) void showMainClinicalOnboarding();
  });
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
    host.setAttribute(
      "aria-label",
      isClinicalLocalOnlyMode(readRpcSettings()) ? "Configura tu perfil local" : "Configura tu rotaci\xF3n"
    );
    main.prepend(host);
  }
  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    wireSyncModeOnboardingInteractions();
    return;
  }
  host.innerHTML = '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Preparando almacenamiento local\u2026</p></div>';
  const dbReady = await ensureClinicalDbUnlocked();
  if (!dbReady.unlocked) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }
  let sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    await ensureClinicalDbUnlocked();
    sessionOk = await ensureClinicalPanelSession();
  }
  if (!sessionOk) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }
  host.innerHTML = '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Cargando\u2026</p></div>';
  const card = host.querySelector(".clinical-onboarding-card");
  try {
    await renderOnboardingPanelInto(card || host);
    prefillRegistrationFromUrlParams();
    const rot = await import("/js/chunks/clinical-rotation-entry-QC3AOWWJ.js");
    rot.syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : "Error al cargar.")}</p></div>`;
  }
}
async function syncChromeAfterOnboardingChange() {
  try {
    const rot = await import("/js/chunks/clinical-rotation-entry-QC3AOWWJ.js");
    if (typeof rot.syncClinicalRotationEntryChrome === "function") rot.syncClinicalRotationEntryChrome();
  } catch (_e) {
  }
  try {
    const settings = await import("/js/chunks/settings-dropdown-BD2JHRGC.js");
    if (typeof settings.syncTeamSyncHeaderButton === "function") {
      settings.syncTeamSyncHeaderButton();
    }
  } catch (_e) {
  }
}
async function refreshMainClinicalOnboardingIfNeeded() {
  if (needsClinicalOnboarding()) await showMainClinicalOnboarding();
  else hideMainClinicalOnboarding();
  await syncChromeAfterOnboardingChange();
}
export {
  CLINICAL_ONBOARDING_ACTIVE_CLASS,
  CLINICAL_ONBOARDING_MAIN_ID,
  buildOnboardingSessionBlockHtml,
  describeOnboardingSessionBlock,
  focusMainClinicalOnboarding,
  getClinicalOnboardingMainHost,
  hideMainClinicalOnboarding,
  isMainClinicalOnboardingActive,
  readClinicalDbGateKind,
  refreshMainClinicalOnboardingIfNeeded,
  showMainClinicalOnboarding
};
//# sourceMappingURL=/js/chunks/clinical-onboarding-main-HD6QY2CR.js.map

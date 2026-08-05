import {
  prefillRegistrationFromUrlParams,
  wireClinicalRegistrationForm
} from "/mobile/js/chunks/chunk-SCSVSR4P.js";
import {
  buildOnboardingStageHtml,
  needsClinicalOnboarding,
  needsClinicalSyncModeChoice,
  renderOnboardingPanelInto,
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions
} from "/mobile/js/chunks/chunk-OSPRJYRJ.js";
import {
  ensureClinicalPanelSession
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import {
  ensureClinicalDbUnlocked,
  isSqlcipherNativeReady
} from "/mobile/js/chunks/chunk-YREK4H2V.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/mobile/js/chunks/chunk-3566DTDN.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/features/clinical-onboarding-main.mjs
var CLINICAL_ONBOARDING_MAIN_ID = "clinical-onboarding-main";
var CLINICAL_ONBOARDING_ACTIVE_CLASS = "clinical-onboarding-active";
var teamsChangedListenerWired = false;
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
  void import("/mobile/js/chunks/clinical-rotation-entry-4KEGZ3XZ.js").then((m) => m.syncClinicalRotationEntryChrome());
  void import("/mobile/js/chunks/tour-engine-KVN5B6L3.js").then((m) => {
    if (typeof m.tryShowPostRegistrationEducationIfNeeded === "function") {
      void m.tryShowPostRegistrationEducationIfNeeded();
    }
  });
  void import("/mobile/js/chunks/learn-hub-Y5DT67WL.js").then((m) => {
    if (typeof m.syncLearnAprenderChrome === "function") m.syncLearnAprenderChrome();
  });
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
  } catch {
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
  return buildOnboardingStageHtml({
    title: "Sesi\xF3n cl\xEDnica",
    leadHtml: `<p>${escapeHtml(lead)}</p>`,
    bodyHtml: actions
  });
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
  void import("/mobile/js/chunks/learn-hub-Y5DT67WL.js").then((m) => {
    if (typeof m.syncLearnAprenderChrome === "function") m.syncLearnAprenderChrome();
  });
  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    wireSyncModeOnboardingInteractions();
    return;
  }
  host.innerHTML = buildOnboardingStageHtml({
    title: "Preparando R+",
    leadHtml: '<p class="clinical-onboarding-status">Preparando almacenamiento local\u2026</p>',
    bodyHtml: ""
  });
  const dbReady = await ensureClinicalDbUnlocked();
  if (!dbReady.unlocked) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }
  try {
    const { flushPendingClinicalOpsLanSnapshot } = await import("/mobile/js/chunks/clinical-ops-lan-6VF6JT3W.js");
    const flushed = await flushPendingClinicalOpsLanSnapshot();
    if (flushed.changed) {
      document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
    }
  } catch (_e) {
    void _e;
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
  host.innerHTML = buildOnboardingStageHtml({
    title: "Preparando R+",
    leadHtml: '<p class="clinical-onboarding-status">Cargando\u2026</p>',
    bodyHtml: ""
  });
  try {
    await renderOnboardingPanelInto(host);
    prefillRegistrationFromUrlParams();
    wireClinicalRegistrationForm();
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-4KEGZ3XZ.js");
    rot.syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : "Error al cargar.")}</p>`;
  }
}
async function syncChromeAfterOnboardingChange() {
  try {
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-4KEGZ3XZ.js");
    if (typeof rot.syncClinicalRotationEntryChrome === "function") rot.syncClinicalRotationEntryChrome();
  } catch (_e) {
    void _e;
  }
  try {
    const settings = await import("/mobile/js/chunks/settings-dropdown-B7UCU6M4.js");
    if (typeof settings.syncTeamSyncHeaderButton === "function") {
      settings.syncTeamSyncHeaderButton();
    }
  } catch (_e) {
    void _e;
  }
}
async function refreshMainClinicalOnboardingIfNeeded() {
  if (needsClinicalOnboarding()) await showMainClinicalOnboarding();
  else hideMainClinicalOnboarding();
  await syncChromeAfterOnboardingChange();
}

export {
  CLINICAL_ONBOARDING_MAIN_ID,
  CLINICAL_ONBOARDING_ACTIVE_CLASS,
  getClinicalOnboardingMainHost,
  isMainClinicalOnboardingActive,
  hideMainClinicalOnboarding,
  readClinicalDbGateKind,
  describeOnboardingSessionBlock,
  buildOnboardingSessionBlockHtml,
  wireOnboardingSessionRecoveryOnce,
  focusMainClinicalOnboarding,
  showMainClinicalOnboarding,
  refreshMainClinicalOnboardingIfNeeded
};
//# sourceMappingURL=/js/chunks/chunk-BKJ6JOGZ.js.map

import {
  renderOnboardingPanelInto
} from "/mobile/js/chunks/chunk-CXGRGIWW.js";
import {
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions
} from "/mobile/js/chunks/chunk-3S6SZ3HX.js";
import {
  buildOnboardingBootLoadingHtml,
  buildOnboardingStageHtml
} from "/mobile/js/chunks/chunk-JAVEC37I.js";
import {
  prefillRegistrationFromUrlParams,
  wireClinicalRegistrationForm
} from "/mobile/js/chunks/chunk-2YMPGWAM.js";
import {
  ensureClinicalPanelSession,
  needsClinicalSyncModeChoice,
  needsOnboardingShell,
  needsProfileOnboarding,
  needsTeamOnboardingStep
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";
import {
  ensureClinicalDbUnlocked,
  isSqlcipherNativeReady
} from "/mobile/js/chunks/chunk-7PD6YGL2.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-QGV722W2.js";

// public/js/features/clinical-onboarding-boot-progress.mjs
var BOOT_ROTATE_MESSAGES = [
  "Iniciando R+\u2026",
  "Cargando interfaz\u2026",
  "Preparando almacenamiento local\u2026",
  "Un momento m\xE1s\u2026"
];
var BOOT_FINAL_MESSAGE = "Casi listo\u2026";
var BOOT_ROTATE_MS = 4200;
function resolveBootProgressScope(root) {
  if (!root) return null;
  if (root instanceof Element && root.classList.contains("clinical-onboard-boot-loader")) return root;
  if (root instanceof Element || root instanceof DocumentFragment) {
    const found = root.querySelector(".clinical-onboard-boot-loader");
    if (found) return found;
  }
  return null;
}
function readBootProgress(bar) {
  const raw = parseFloat(String(bar.style.width || "0").replace("%", ""));
  return Number.isFinite(raw) ? raw : 3;
}
function pickRotatingMessage(elapsedMs) {
  const elapsed = Math.max(0, elapsedMs);
  const idx = Math.floor(elapsed / BOOT_ROTATE_MS) % BOOT_ROTATE_MESSAGES.length;
  return BOOT_ROTATE_MESSAGES[idx];
}
function syncRotatingLabel(scope, label, elapsedMs) {
  if (!label || scope._rpcBootMessageLocked) return;
  const next = pickRotatingMessage(elapsedMs);
  if (label.textContent !== next) label.textContent = next;
}
function lockBootFinalMessage(scope, label) {
  scope._rpcBootMessageLocked = true;
  if (label) label.textContent = BOOT_FINAL_MESSAGE;
}
function stopOnboardingBootProgress(root) {
  const scope = resolveBootProgressScope(root);
  if (!scope) return;
  scope._rpcBootMessageLocked = true;
  if (scope._rpcBootProgressRaf) {
    cancelAnimationFrame(scope._rpcBootProgressRaf);
    scope._rpcBootProgressRaf = null;
  }
}
function startOnboardingBootProgress(root) {
  const scope = resolveBootProgressScope(root);
  if (!scope) return () => {
  };
  const bar = scope.querySelector(".clinical-onboard-boot-progress-bar");
  const label = scope.querySelector(".clinical-onboard-boot-progress-label");
  if (!bar || !label) return () => {
  };
  if (scope._rpcBootProgressRaf) {
    return () => stopOnboardingBootProgress(scope);
  }
  scope._rpcBootMessageLocked = false;
  if (!scope._rpcBootStartedAt) scope._rpcBootStartedAt = performance.now();
  bar.classList.remove("is-indeterminate");
  let progress = readBootProgress(bar);
  if (progress < 3) progress = 3;
  bar.style.width = `${progress.toFixed(2)}%`;
  syncRotatingLabel(scope, label, performance.now() - scope._rpcBootStartedAt);
  let lastTs = 0;
  function tick(ts) {
    if (!scope.isConnected) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;
    const cap = 94;
    const remaining = Math.max(0, cap - progress);
    const speed = 8e-3 + remaining / cap * 0.045;
    progress = Math.min(cap, progress + speed * dt);
    bar.style.width = `${progress.toFixed(2)}%`;
    syncRotatingLabel(scope, label, performance.now() - scope._rpcBootStartedAt);
    scope._rpcBootProgressRaf = requestAnimationFrame(tick);
  }
  scope._rpcBootProgressRaf = requestAnimationFrame(tick);
  return () => stopOnboardingBootProgress(scope);
}
function animateOnboardingBootComplete(root, message = "Listo") {
  const scope = resolveBootProgressScope(root);
  if (!scope) return Promise.resolve();
  const bar = scope.querySelector(".clinical-onboard-boot-progress-bar");
  const label = scope.querySelector(".clinical-onboard-boot-progress-label");
  if (!bar) return Promise.resolve();
  lockBootFinalMessage(scope, label);
  if (scope._rpcBootProgressRaf) {
    cancelAnimationFrame(scope._rpcBootProgressRaf);
    scope._rpcBootProgressRaf = null;
  }
  bar.classList.remove("is-indeterminate");
  const from = readBootProgress(bar);
  const duration = Math.max(380, Math.min(720, 520 + (100 - from) * 4));
  const doneText = message;
  return new Promise((resolve) => {
    const t0 = performance.now();
    function frame(now) {
      if (!scope.isConnected) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 2.4;
      const value = from + (100 - from) * eased;
      bar.style.width = `${value.toFixed(2)}%`;
      if (label) label.textContent = t < 0.82 ? BOOT_FINAL_MESSAGE : doneText;
      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }
      bar.style.width = "100%";
      if (label) label.textContent = doneText;
      window.setTimeout(resolve, 140);
    }
    requestAnimationFrame(frame);
  });
}

// public/js/features/clinical-onboarding-main.mjs
var CLINICAL_ONBOARDING_MAIN_ID = "clinical-onboarding-main";
var CLINICAL_ONBOARDING_ACTIVE_CLASS = "clinical-onboarding-active";
var teamsChangedListenerWired = false;
var showMainClinicalOnboardingInflight = null;
var bootProgressStopper = null;
function ensureOnboardingBootLoading(host, opts = {}) {
  const hasLoader = host.querySelector(".clinical-onboard-boot-loader");
  if (!hasLoader) {
    stopOnboardingBootProgress(host);
    if (bootProgressStopper) {
      bootProgressStopper();
      bootProgressStopper = null;
    }
    host.innerHTML = buildOnboardingBootLoadingHtml(opts);
    bootProgressStopper = startOnboardingBootProgress(host);
    return;
  }
  if (!bootProgressStopper) {
    bootProgressStopper = startOnboardingBootProgress(host);
  }
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
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("rpc-clinical-onboarding-finished"));
  }
  void import("/mobile/js/chunks/clinical-rotation-entry-M5SNTRLZ.js").then((m) => m.syncClinicalRotationEntryChrome());
  void import("/mobile/js/chunks/tour-engine-TICS2NGG.js").then((m) => {
    if (typeof m.tryShowPostRegistrationEducationIfNeeded === "function") {
      void m.tryShowPostRegistrationEducationIfNeeded();
    }
  });
  void import("/mobile/js/chunks/learn-hub-BWAQVDU3.js").then((m) => {
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
    return "Abre la base de datos local de R+ para continuar. No necesitas R+ Cloud ni \u21C4.";
  }
  const gate = await readClinicalDbGateKind();
  if (gate === "native_blocked") {
    return "Esta instalaci\xF3n de R+ no carg\xF3 el m\xF3dulo de base de datos (SQLCipher). Reinstala desde GitHub o usa Ajustes \u2192 Aplicaci\xF3n \u2192 Reinstalar versi\xF3n actual.";
  }
  if (gate === "unlocked") {
    return "La base local ya est\xE1 abierta, pero la sesi\xF3n cl\xEDnica no inici\xF3. Pulsa Reintentar abajo o cierra R+ por completo (incluida la bandeja) y vuelve a abrir.";
  }
  if (gate === "locked") {
    return "R+ est\xE1 preparando el almacenamiento local de este equipo. Pulsa Reintentar en unos segundos; no necesitas R+ Cloud ni \u21C4.";
  }
  if (gate === "no_api") {
    return "R+ no detect\xF3 el acceso a la base local. Reinicia la aplicaci\xF3n.";
  }
  return "Abre la base de datos local de R+ para continuar. No necesitas R+ Cloud ni \u21C4.";
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
function ensureOnboardingMainHost() {
  const main = document.getElementById("main-area");
  if (!main) return null;
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
  return host;
}
function mountSyncModeChoiceOnboarding(host) {
  renderSyncModeChoicePanel(host);
  wireSyncModeOnboardingInteractions();
  void import("/mobile/js/chunks/learn-hub-BWAQVDU3.js").then((m) => {
    if (typeof m.syncLearnAprenderChrome === "function") m.syncLearnAprenderChrome();
  });
}
function showEarlySyncModeOnboardingIfNeeded() {
  if (typeof document === "undefined" || !isDbMode()) return false;
  if (!needsClinicalSyncModeChoice()) return false;
  wireTeamsChangedListenerOnce();
  const host = ensureOnboardingMainHost();
  if (!host) return false;
  if (typeof window !== "undefined" && window.__RPC_EARLY_SYNC_MODE_CHOSEN__) {
    const chosen = window.__RPC_EARLY_SYNC_MODE_CHOSEN__;
    delete window.__RPC_EARLY_SYNC_MODE_CHOSEN__;
    void refreshMainClinicalOnboardingIfNeeded();
    void chosen;
    return true;
  }
  if (host.querySelector(".clinical-onboard-mode-grid")) {
    wireSyncModeOnboardingInteractions();
    return true;
  }
  mountSyncModeChoiceOnboarding(host);
  return true;
}
async function refreshTeamOnboardingShellOnly() {
  if (!needsTeamOnboardingStep()) {
    hideMainClinicalOnboarding();
    return;
  }
  const main = document.getElementById("main-area");
  if (!main) return;
  let host = getClinicalOnboardingMainHost();
  if (!host) {
    await showMainClinicalOnboarding();
    return;
  }
  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  if (host.querySelector("[data-team-onboard-open]")) return;
  const { renderTeamOnboardingInto, wireTeamOnboardingInteractions } = await import("/mobile/js/chunks/clinical-onboarding-team-ZD2SPYYJ.js");
  renderTeamOnboardingInto(host, { skipCloudSync: true });
  wireTeamOnboardingInteractions(host);
}
async function showMainClinicalOnboarding() {
  if (showMainClinicalOnboardingInflight) return showMainClinicalOnboardingInflight;
  showMainClinicalOnboardingInflight = showMainClinicalOnboardingBody().finally(() => {
    showMainClinicalOnboardingInflight = null;
  });
  return showMainClinicalOnboardingInflight;
}
async function reloadClinicalTeamsBeforeGate() {
  try {
    const { fetchClinicalTeamsFromDb } = await import("/mobile/js/chunks/clinical-access-runtime-7PNW7XFE.js");
    await fetchClinicalTeamsFromDb();
  } catch {
  }
}
async function resumeStoredCloudTokenIfPresent() {
  try {
    const { getCloudSyncToken } = await import("/mobile/js/chunks/settings-JOYOHYNE.js");
    if (!getCloudSyncToken()) return;
    const { tryResumeOnboardingFromStoredCloudToken } = await import("/mobile/js/chunks/clinical-onboarding-existing-login-ARGPURQA.js");
    await tryResumeOnboardingFromStoredCloudToken();
    await reloadClinicalTeamsBeforeGate();
  } catch {
  }
}
async function ensureOnboardingDbUnlockedAndFlushed(host) {
  ensureOnboardingBootLoading(host, {
    title: "Preparando R+",
    message: "Preparando almacenamiento local\u2026"
  });
  const dbReady = await ensureClinicalDbUnlocked();
  if (!dbReady.unlocked) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return false;
  }
  try {
    const { flushPendingClinicalOpsSnapshot } = await import("/mobile/js/chunks/clinical-ops-sync-S3XOKAM6.js");
    const flushed = await flushPendingClinicalOpsSnapshot();
    if (flushed.changed) {
      document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
    }
  } catch (_e) {
    void _e;
  }
  return true;
}
async function ensureOnboardingPanelSession(host) {
  let sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    await ensureClinicalDbUnlocked();
    sessionOk = await ensureClinicalPanelSession();
  }
  if (!sessionOk) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return false;
  }
  return true;
}
async function renderOnboardingRegistrationForm(host) {
  ensureOnboardingBootLoading(host, {
    title: "Preparando R+",
    message: "Cargando formulario\u2026",
    stepperIndex: 2
  });
  try {
    stopOnboardingBootProgress(host);
    if (bootProgressStopper) {
      bootProgressStopper();
      bootProgressStopper = null;
    }
    await animateOnboardingBootComplete(host, "Listo");
    await renderOnboardingPanelInto(host);
    prefillRegistrationFromUrlParams();
    wireClinicalRegistrationForm();
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-M5SNTRLZ.js");
    rot.syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : "Error al cargar.")}</p>`;
  }
}
async function showMainClinicalOnboardingBody() {
  wireTeamsChangedListenerOnce();
  if (needsClinicalSyncModeChoice()) {
    const host2 = ensureOnboardingMainHost();
    if (host2) mountSyncModeChoiceOnboarding(host2);
    return;
  }
  await reloadClinicalTeamsBeforeGate();
  await resumeStoredCloudTokenIfPresent();
  if (!needsOnboardingShell()) {
    hideMainClinicalOnboarding();
    return;
  }
  const host = ensureOnboardingMainHost();
  if (!host) return;
  if (!await ensureOnboardingDbUnlockedAndFlushed(host)) return;
  if (!await ensureOnboardingPanelSession(host)) return;
  await renderOnboardingRegistrationForm(host);
}
async function syncChromeAfterOnboardingChange() {
  try {
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-M5SNTRLZ.js");
    if (typeof rot.syncClinicalRotationEntryChrome === "function") rot.syncClinicalRotationEntryChrome();
  } catch (_e) {
    void _e;
  }
  try {
    const settings = await import("/mobile/js/chunks/settings-dropdown-KB74A445.js");
    if (typeof settings.syncTeamSyncHeaderButton === "function") {
      settings.syncTeamSyncHeaderButton();
    }
  } catch (_e) {
    void _e;
  }
}
async function refreshMainClinicalOnboardingIfNeeded() {
  try {
    const { fetchClinicalTeamsFromDb } = await import("/mobile/js/chunks/clinical-access-runtime-7PNW7XFE.js");
    await fetchClinicalTeamsFromDb();
  } catch {
  }
  if (!needsOnboardingShell()) {
    hideMainClinicalOnboarding();
    await syncChromeAfterOnboardingChange();
    return;
  }
  if (!needsProfileOnboarding() && needsTeamOnboardingStep()) {
    await refreshTeamOnboardingShellOnly();
    await syncChromeAfterOnboardingChange();
    return;
  }
  await showMainClinicalOnboarding();
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
  showEarlySyncModeOnboardingIfNeeded,
  refreshTeamOnboardingShellOnly,
  showMainClinicalOnboarding,
  refreshMainClinicalOnboardingIfNeeded
};
//# sourceMappingURL=/js/chunks/chunk-RJF23Y2T.js.map

import {
  isLanSkipShiftPin,
  renderOnboardingPanelInto,
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions
} from "/mobile/js/chunks/chunk-J6VINJP7.js";
import {
  needsClinicalSyncModeChoice,
  needsOnboardingShell,
  needsProfileOnboarding,
  needsTeamOnboardingStep
} from "/mobile/js/chunks/chunk-GNLW4YFR.js";
import {
  buildOnboardingStageHtml
} from "/mobile/js/chunks/chunk-FGKC3QPA.js";
import {
  ensureClinicalPanelSession,
  resumeClinicalIdentityByUsername
} from "/mobile/js/chunks/chunk-QQOJTZU6.js";
import {
  ensureClinicalDbUnlocked,
  isSqlcipherNativeReady
} from "/mobile/js/chunks/chunk-LTZPVWLE.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-QWJHEGH4.js";
import {
  ensureLanProfileGateDeviceReset,
  isClinicalLocalOnlyMode,
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import {
  isValidUsernameFormat,
  normalizeUsername
} from "/mobile/js/chunks/chunk-LQTSNMET.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-GRJDNRYE.js";

// public/js/features/clinical-registration-submit.mjs
var RANKS = ["R1", "R2", "R3", "R4", "Admin"];
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function resumeBoundUsername_(username, settings, clientId) {
  var resumeRes = await resumeClinicalIdentityByUsername(username, settings, clientId);
  if (!resumeRes?.ok) {
    throw new Error(resumeRes?.error || "Ese @usuario ya est\xE1 en uso.");
  }
  return String(resumeRes.userId || "");
}
async function claimUsernameIfMismatch_(api, clientId, userId, username, safeRank, settings) {
  void safeRank;
  var claimRes = await api.dbClinicalUsernameClaim({ userId, username });
  if (claimRes?.ok) return userId;
  var errMsg = String(claimRes?.error || "");
  if (!/ya está en uso/i.test(errMsg)) {
    throw new Error(errMsg || "No se pudo registrar el @usuario.");
  }
  return resumeBoundUsername_(username, settings, clientId);
}
async function upsertClinicalProfile_(api, userId, name, safeRank, sala) {
  if (typeof api.dbClinicalProfileUpsert !== "function") return;
  var profileRes = await api.dbClinicalProfileUpsert({
    userId,
    clinicalName: name,
    rank: safeRank,
    sala: sala || null
  });
  if (!profileRes?.ok) {
    throw new Error(profileRes?.error || "No se guard\xF3 el perfil cl\xEDnico.");
  }
}
async function bootstrapClinicalUser_({ clientId, username, safeRank, settings, api, name, sala }) {
  var boot = await api.dbClinicalAccessBootstrap({
    clientId,
    rank: safeRank,
    preferredUserId: String(settings.clinicalUserId || ""),
    preferredUsername: username
  });
  var userId = String(boot?.user?.userId || "");
  if (!userId || boot?.ok === false) {
    throw new Error(boot?.error || "No se pudo iniciar la sesi\xF3n cl\xEDnica.");
  }
  var bootHandle = normalizeUsername(boot?.user?.username || "");
  if (bootHandle !== username && typeof api.dbClinicalUsernameClaim === "function") {
    userId = await claimUsernameIfMismatch_(api, clientId, userId, username, safeRank, settings);
  }
  await upsertClinicalProfile_(api, userId, name, safeRank, sala);
  return userId;
}
function readRegistrationFormFields_() {
  return {
    usernameRaw: String(document.getElementById("clinical-reg-username")?.value || "").trim(),
    name: String(document.getElementById("clinical-reg-name")?.value || "").trim(),
    rank: String(document.getElementById("clinical-reg-rank")?.value || "R1"),
    sala: String(document.getElementById("clinical-reg-sala")?.value || "").trim(),
    shiftPin: String(document.getElementById("clinical-reg-shift-pin")?.value || "").trim()
  };
}
function validateRegistrationFields_(fields, errEl) {
  var username = normalizeUsername(fields.usernameRaw);
  if (!isValidUsernameFormat(username)) {
    if (errEl) {
      errEl.textContent = "Usuario inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.";
      errEl.hidden = false;
    }
    return null;
  }
  if (!fields.name) {
    if (errEl) {
      errEl.textContent = "Escribe tu nombre en guardia.";
      errEl.hidden = false;
    }
    return null;
  }
  return { username, safeRank: RANKS.includes(fields.rank) ? fields.rank : "R1" };
}
async function connectShiftPinIfNeeded_(_shiftPin, _sala, _runtime) {
}
function readRpcSettingsFromStorage_() {
  try {
    return JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch {
    return {};
  }
}
function showRegistrationError_(errEl, message) {
  if (!errEl) return;
  errEl.textContent = message;
  errEl.hidden = false;
}
async function persistClinicalUserFromApi_(api, clientId, username, safeRank, settings, name, sala) {
  if (!api || typeof api.dbClinicalAccessBootstrap !== "function") {
    return String(settings.clinicalUserId || "");
  }
  return bootstrapClinicalUser_({ clientId, username, safeRank, settings, api, name, sala });
}
function resolvePendingRegistration_(deps) {
  var pendingResolve2 = deps.getPendingResolve ? deps.getPendingResolve() : null;
  if (pendingResolve2) {
    if (deps.setPendingResolve) deps.setPendingResolve(null);
    pendingResolve2(true);
  }
  if (deps.onResolved) deps.onResolved(true);
}
function maybePersistMobilePairing_() {
}
async function handleClinicalRegistrationSubmit(deps) {
  var errEl = document.getElementById("clinical-reg-error");
  var fields = readRegistrationFormFields_();
  var validated = validateRegistrationFields_(fields, errEl);
  if (!validated) return;
  var username = validated.username;
  var safeRank = validated.safeRank;
  var name = fields.name;
  var sala = fields.sala;
  var settings = readRpcSettingsFromStorage_();
  var clientId = resolveClinicalClientId(settings);
  if (!clientId) {
    showRegistrationError_(errEl, "No se encontr\xF3 el identificador del dispositivo. Reinicia R+.");
    return;
  }
  if (!settings.clientId) {
    persistClinicalUserBinding({ userId: String(settings.clinicalUserId || "") });
    settings = readRpcSettingsFromStorage_();
  }
  var {
    assertLanRoomForUsernameRegister,
    flushClinicalProfileToLan,
    LAN_PROFILE_PUSH_FAILED_MSG,
    isBenignLanPushSkipCode,
    notifyLanProfilePushResult
  } = await import("/mobile/js/chunks/clinical-profile-cloud-stubs-GF7A2CZZ.js");
  var lanRoom = await assertLanRoomForUsernameRegister({ sala });
  try {
    var savedUserId = await persistClinicalUserFromApi_(
      dbApi(),
      clientId,
      username,
      safeRank,
      settings,
      name,
      sala
    );
    persistClinicalUserBinding({
      userId: savedUserId,
      username,
      displayName: name,
      rank: safeRank,
      sala: sala || "",
      registered: true,
      lanProfileGateComplete: true
    });
  } catch (err) {
    showRegistrationError_(errEl, err?.message || "Error al guardar el registro.");
    return;
  }
  if (errEl) errEl.hidden = true;
  const { refreshClinicalUserProfile } = await import("/mobile/js/chunks/clinical-access-runtime-SR4BGCT5.js");
  await refreshClinicalUserProfile();
  deps.closeModal();
  maybePersistMobilePairing_();
  resolvePendingRegistration_(deps);
  try {
    const { refreshMainClinicalOnboardingIfNeeded: refreshMainClinicalOnboardingIfNeeded2 } = await import("/mobile/js/chunks/clinical-onboarding-main-6UO2PEEB.js");
    await refreshMainClinicalOnboardingIfNeeded2();
  } catch {
  }
  void (async () => {
    await connectShiftPinIfNeeded_(fields.shiftPin, sala, deps.runtime);
    var lanPush = await flushClinicalProfileToLan({ sala, roomId: lanRoom.roomId });
    notifyLanProfilePushResult(lanPush, (msg, kind) => deps.runtime.showToast(msg, kind));
    if (!lanPush.ok && !isBenignLanPushSkipCode(lanPush.code) && !(lanPush.channels && lanPush.channels.outbox)) {
      deps.runtime.showToast(LAN_PROFILE_PUSH_FAILED_MSG, "warning");
    }
  })();
}

// public/js/features/clinical-registration.mjs
var pendingResolve = null;
function applyPrefillPair(regId, onboardId, value) {
  if (!value) return;
  const regEl = document.getElementById(regId);
  const onboardEl = document.getElementById(onboardId);
  if (regEl) regEl.value = value;
  if (onboardEl) onboardEl.value = value;
}
function prefillRegistrationFromUrlParams() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const user = params.get("user") || "";
  const name = params.get("name") || "";
  const rank = params.get("rank") || "";
  const sala = params.get("sala") || "";
  const shiftPin = params.get("pin") || params.get("shiftPin") || "";
  if (!user && !name && !rank && !sala && !shiftPin) return;
  applyPrefillPair("clinical-reg-username", "onboard-username", user);
  applyPrefillPair("clinical-reg-name", "onboard-clinical-name", name);
  applyPrefillPair("clinical-reg-rank", "onboard-rank", rank);
  applyPrefillPair("clinical-reg-sala", "onboard-sala", sala);
  applyPrefillPair("clinical-reg-shift-pin", "onboard-shift-pin", shiftPin);
}
function backdropEl() {
  return document.getElementById("clinical-registration-backdrop");
}
function registrationRuntimeToast(msg, kind) {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, kind);
  }
}
function wireRegistrationFormOnce() {
  const form = document.getElementById("clinical-registration-form");
  if (!form || form._rpcClinicalRegWired) return;
  form._rpcClinicalRegWired = true;
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    void handleClinicalRegistrationSubmit({
      runtime: { showToast: registrationRuntimeToast },
      closeModal: closeClinicalRegistrationModal,
      getPendingResolve: () => pendingResolve,
      setPendingResolve: (fn) => {
        pendingResolve = fn;
      }
    });
  });
}
function openClinicalRegistrationModal() {
  wireRegistrationFormOnce();
  ensureLanProfileGateDeviceReset(readRpcSettings());
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  const gatePending = needsClinicalLanProfileGate(readRpcSettings());
  const pairs = [
    ["clinical-reg-username", "onboard-username"],
    ["clinical-reg-name", "onboard-clinical-name"]
  ];
  if (gatePending) {
    for (const [regId, onboardId] of pairs) {
      const regEl = document.getElementById(regId);
      const onboardEl = document.getElementById(onboardId);
      if (regEl) regEl.value = "";
      if (onboardEl) onboardEl.value = "";
    }
  }
  const usernameInput = document.getElementById("clinical-reg-username");
  const shiftPinGroup = document.getElementById("clinical-reg-shift-pin")?.closest(".field-group");
  if (shiftPinGroup) shiftPinGroup.hidden = isLanSkipShiftPin();
  if (usernameInput) usernameInput.focus();
}
function wireClinicalRegistrationForm() {
  wireRegistrationFormOnce();
}
function closeClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  closeModalAnimated(bd);
}
var windowHandlers = {
  openClinicalRegistrationModal,
  closeClinicalRegistrationModal,
  submitClinicalRegistration(ev) {
    if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
    const form = document.getElementById("clinical-registration-form");
    if (form) form.requestSubmit();
  }
};

// public/js/features/clinical-onboarding-main.mjs
var CLINICAL_ONBOARDING_MAIN_ID = "clinical-onboarding-main";
var CLINICAL_ONBOARDING_ACTIVE_CLASS = "clinical-onboarding-active";
var teamsChangedListenerWired = false;
var showMainClinicalOnboardingInflight = null;
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
  void import("/mobile/js/chunks/clinical-rotation-entry-QSY6PLN3.js").then((m) => m.syncClinicalRotationEntryChrome());
  void import("/mobile/js/chunks/tour-engine-IEWS2GUE.js").then((m) => {
    if (typeof m.tryShowPostRegistrationEducationIfNeeded === "function") {
      void m.tryShowPostRegistrationEducationIfNeeded();
    }
  });
  void import("/mobile/js/chunks/learn-hub-S2TD64RW.js").then((m) => {
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
  const { renderTeamOnboardingInto, wireTeamOnboardingInteractions } = await import("/mobile/js/chunks/clinical-onboarding-team-BJDUHXQB.js");
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
async function showMainClinicalOnboardingBody() {
  wireTeamsChangedListenerOnce();
  try {
    const { fetchClinicalTeamsFromDb } = await import("/mobile/js/chunks/clinical-access-runtime-SR4BGCT5.js");
    await fetchClinicalTeamsFromDb();
  } catch {
  }
  if (!needsOnboardingShell()) {
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
  void import("/mobile/js/chunks/learn-hub-S2TD64RW.js").then((m) => {
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
    const { flushPendingClinicalOpsLanSnapshot } = await import("/mobile/js/chunks/clinical-ops-lan-TZ4PXVEU.js");
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
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-QSY6PLN3.js");
    rot.syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : "Error al cargar.")}</p>`;
  }
}
async function syncChromeAfterOnboardingChange() {
  try {
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-QSY6PLN3.js");
    if (typeof rot.syncClinicalRotationEntryChrome === "function") rot.syncClinicalRotationEntryChrome();
  } catch (_e) {
    void _e;
  }
  try {
    const settings = await import("/mobile/js/chunks/settings-dropdown-JLUDVC3V.js");
    if (typeof settings.syncTeamSyncHeaderButton === "function") {
      settings.syncTeamSyncHeaderButton();
    }
  } catch (_e) {
    void _e;
  }
}
async function refreshMainClinicalOnboardingIfNeeded() {
  try {
    const { fetchClinicalTeamsFromDb } = await import("/mobile/js/chunks/clinical-access-runtime-SR4BGCT5.js");
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
  windowHandlers,
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
  refreshTeamOnboardingShellOnly,
  showMainClinicalOnboarding,
  refreshMainClinicalOnboardingIfNeeded
};
//# sourceMappingURL=/js/chunks/chunk-4FVV5X45.js.map

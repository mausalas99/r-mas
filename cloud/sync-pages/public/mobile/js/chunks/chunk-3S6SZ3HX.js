import {
  buildOnboardingStageHtml,
  buildSyncModeChoiceBodyHtml
} from "/mobile/js/chunks/chunk-JAVEC37I.js";
import {
  bridgeCloudIdentityToLocal
} from "/mobile/js/chunks/chunk-HABESGMS.js";
import {
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-PZSHDWKY.js";
import {
  applyCloudPullResult
} from "/mobile/js/chunks/chunk-DABJ4IMO.js";
import {
  showRecoveryCodeModal
} from "/mobile/js/chunks/chunk-YR5I2T5V.js";
import {
  hydrateClinicalTeamsAfterCloudPull
} from "/mobile/js/chunks/chunk-456TKLHV.js";
import {
  ensureTurnRoom
} from "/mobile/js/chunks/chunk-ZH6BOXJG.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-HO6KACGO.js";
import {
  CLINICAL_SALAS,
  getClientId,
  hasPersistedClinicalProfile,
  lookupClinicalUserByUsername,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";
import {
  isClinicalExistingAccountPath,
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId,
  setClinicalExistingAccountPath,
  setClinicalSyncModeLocalOnly
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-FLCMQPNP.js";
import {
  escapeAttr,
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  isCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncRemember,
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision,
  setCloudSyncRoomId,
  setCloudSyncRoomSnapshot,
  setCloudSyncToken
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/clinical-onboarding-sync-mode.mjs
function localOnlyUsernameForUserId(userId) {
  const tail = String(userId || "").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-10) || "device";
  return `local_${tail}`.slice(0, 32);
}
function renderSyncModeChoicePanel(host) {
  host.innerHTML = buildOnboardingStageHtml({
    title: "\xBFC\xF3mo usar\xE1s R+?",
    leadHtml: "<p>Elige c\xF3mo usar\xE1s R+ en este equipo. Con Nube creas cuenta o entras si ya tienes una; en solo equipo trabajas sin sincronizar.</p>",
    bodyHtml: buildSyncModeChoiceBodyHtml(),
    stepperIndex: 1
  });
}
async function refreshOnboardingHost() {
  const { refreshMainClinicalOnboardingIfNeeded } = await import("/mobile/js/chunks/clinical-onboarding-main-JGMTC5M4.js");
  await refreshMainClinicalOnboardingIfNeeded();
}
async function handleSyncModeChoice(mode) {
  if (mode === "local") {
    setClinicalExistingAccountPath(false);
    setClinicalSyncModeLocalOnly(true);
  } else if (mode === "nube" || mode === "lan") {
    setClinicalExistingAccountPath(false);
    setClinicalSyncModeLocalOnly(false);
  } else if (mode === "existing") {
    setClinicalExistingAccountPath(true);
  } else {
    return;
  }
  await refreshOnboardingHost();
}
async function handleSyncModeBack() {
  const settings = readRpcSettings();
  delete settings.clinicalLocalOnly;
  delete settings.clinicalOnboardingExistingAccount;
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settings));
  } catch (_e) {
    void _e;
  }
  await refreshOnboardingHost();
}
function wireSyncModeOnboardingInteractions() {
  const modeHost = document.querySelector(".clinical-onboard-mode-grid");
  if (modeHost && !modeHost._rpcModeWired) {
    modeHost._rpcModeWired = true;
    modeHost.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-sync-mode]");
      if (!btn) return;
      void handleSyncModeChoice(String(btn.getAttribute("data-sync-mode") || ""));
    });
  }
}
var ONBOARDING_MODE_BACK_BUTTON_IDS = [
  "clinical-onboard-mode-back-btn",
  "clinical-onboard-existing-back-btn"
];
function wireOnboardingModeBackButtons() {
  for (const id of ONBOARDING_MODE_BACK_BUTTON_IDS) {
    const backBtn = document.getElementById(id);
    if (!backBtn || backBtn._rpcModeBackWired) continue;
    backBtn._rpcModeBackWired = true;
    backBtn.addEventListener("click", () => void handleSyncModeBack());
  }
}

// public/js/features/cloud-sync/register-during-onboarding.mjs
function createApi() {
  return createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken
  });
}
async function registerCloudDuringOnboarding(opts) {
  const password = String(opts.password || "");
  if (!isCloudSala(opts.sala)) return { ok: true };
  if (password.length < 10) {
    return { ok: false, error: "Contrase\xF1a nube: m\xEDnimo 10 caracteres." };
  }
  const toast = typeof opts.toast === "function" ? opts.toast : () => {
  };
  const setStatus = typeof opts.setStatus === "function" ? opts.setStatus : () => {
  };
  const chosenUser = {
    username: opts.username,
    displayName: opts.displayName,
    sala: opts.sala
  };
  const client = createApi();
  setStatus(opts.mode === "login" ? "Iniciando sesi\xF3n nube\u2026" : "Creando cuenta nube\u2026");
  try {
    await authAndBridge(client, opts.mode, chosenUser, password, !!opts.remember);
    return completeCloudOnboardingSync({
      username: chosenUser.username,
      displayName: chosenUser.displayName,
      sala: chosenUser.sala,
      toast,
      setStatus
    });
  } catch (err) {
    const msg = err?.data?.message || err?.message || "Error de Nube";
    setStatus(msg);
    return { ok: false, error: msg };
  }
}
async function loginCloudDuringOnboarding(opts) {
  const password = String(opts.password || "");
  if (password.length < 10) {
    return { ok: false, error: "Contrase\xF1a nube: m\xEDnimo 10 caracteres." };
  }
  const setStatus = typeof opts.setStatus === "function" ? opts.setStatus : () => {
  };
  const client = createApi();
  setStatus("Iniciando sesi\xF3n nube\u2026");
  try {
    const data = await client.login({ username: opts.username, password });
    setCloudSyncToken(data.token, { remember: !!opts.remember });
    const cloudUser = data.user || {};
    const displayName = String(cloudUser.displayName || "").trim();
    setStatus("Sesi\xF3n nube iniciada.");
    return {
      ok: true,
      displayName,
      rank: String(cloudUser.rank || "").trim() || void 0
    };
  } catch (err) {
    const msg = err?.data?.message || err?.message || "Error de Nube";
    setStatus(msg);
    return { ok: false, error: msg };
  }
}
async function completeCloudOnboardingSync(opts) {
  const toast = typeof opts.toast === "function" ? opts.toast : () => {
  };
  const setStatus = typeof opts.setStatus === "function" ? opts.setStatus : () => {
  };
  const chosenUser = {
    username: opts.username,
    displayName: opts.displayName,
    sala: opts.sala
  };
  const client = createApi();
  try {
    setStatus("Uni\xE9ndote a la sala de turno\u2026");
    const roomId = await joinTurnRoom(client, chosenUser, toast, setStatus);
    if (!roomId) return { ok: false, error: "No se pudo asegurar la sala nube." };
    await pullOrSeed(client, roomId, setStatus);
    startCloudPushAndRuntime(chosenUser);
    await scheduleOptionalPush();
    setStatus("Nube lista.");
    toast("Nube sincronizada.", "success");
    return { ok: true };
  } catch (err) {
    const msg = err?.data?.message || err?.message || "Error de Nube";
    setStatus(msg);
    return { ok: false, error: msg };
  }
}
async function authAndBridge(client, mode, chosenUser, password, remember = false) {
  const body = {
    username: chosenUser.username,
    password,
    displayName: chosenUser.displayName
  };
  const data = mode === "login" ? await client.login(body) : await client.register(body);
  setCloudSyncToken(data.token, { remember });
  if (data.recoveryCode) await showRecoveryCodeModal({ code: data.recoveryCode });
  await bridgeCloudIdentityToLocal({
    username: chosenUser.username,
    displayName: chosenUser.displayName
  });
}
async function joinTurnRoom(client, chosenUser, toast, setStatus) {
  const room = await ensureTurnRoom({
    api: client,
    getSala: () => chosenUser.sala,
    getToken: getCloudSyncToken,
    setCloudSyncRoomId,
    setCloudSyncRoomSnapshot,
    setCloudSyncRevision,
    onConnected: () => setCloudRoomConnected(true),
    toast
  });
  const roomId = getCloudSyncRoomId() || room?.id;
  if (!roomId) {
    setStatus("Sin sala de turno.");
    toast("No se pudo asegurar la sala nube.", "error");
    return "";
  }
  return roomId;
}
async function pullOrSeed(client, roomId, setStatus) {
  setStatus("Sincronizando equipos y censo\u2026");
  const pull = await client.pull(roomId, 0);
  await applyCloudPullResult(pull);
  if (pull?.revision != null) setCloudSyncRevision(Number(pull.revision) || 0);
  await hydrateClinicalTeamsAfterCloudPull();
  if (Number(getCloudSyncRevision() || 0) > 0) {
    setStatus("Sincronizado con la sala nube.");
    return;
  }
  setStatus("Sala lista \u2014 crea o \xFAnete a un equipo en Mi rotaci\xF3n.");
}
function startCloudPushAndRuntime() {
  startSharedNubeRuntime({
    getApi: createApi,
    getCloudSyncRoomId,
    getCloudSyncToken,
    getCloudSyncRevision,
    setCloudSyncRevision,
    onStatus: function() {
    }
  });
}
async function scheduleOptionalPush() {
  try {
    const { scheduleCloudSyncPush } = await import("/mobile/js/chunks/mutate-bridge-KCVUIRYA.js");
    scheduleCloudSyncPush();
  } catch {
  }
}

// public/js/features/clinical-onboarding-existing-login.mjs
function buildSalaOptionsHtml(prefilledSala) {
  return CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}" ${prefilledSala === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("");
}
function needsExistingAccountLogin(settings = readRpcSettings(), user = clinicalSessionContext.user) {
  if (!isClinicalExistingAccountPath(settings)) return false;
  return !hasPersistedClinicalProfile(settings, user);
}
function buildExistingAccountLoginBodyHtml(settings = readRpcSettings()) {
  const prefilledSala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || "");
  const prefilledUser = normalizeUsername(
    String(settings.clinicalUsername || clinicalSessionContext.user?.username || "")
  );
  const rememberChecked = getCloudSyncRemember();
  return `
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-existing-login-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <div class="field-group">
            <label for="onboard-existing-username">Usuario (@usuario) *</label>
            <input id="onboard-existing-username" type="text" class="profile-input" placeholder="ej. drmendoza"
              value="${escapeAttr(prefilledUser)}" required autocomplete="username" spellcheck="false">
          </div>
          <div class="field-group">
            <label for="onboard-existing-password">Contrase\xF1a Nube *</label>
            <input id="onboard-existing-password" type="password" class="profile-input"
              required autocomplete="current-password" minlength="10">
          </div>
          <label class="cloud-sync-remember clinical-onboard-remember">
            <input type="checkbox" id="onboard-existing-remember" data-onboard-existing-remember${rememberChecked ? " checked" : ""} />
            Recu\xE9rdame en este dispositivo
          </label>
          <p class="clinical-teams-hint">Mantiene la sesi\xF3n Nube al reiniciar R+. No uses esto en una Mac compartida.</p>
          <div class="field-group">
            <label for="onboard-existing-sala">Rotaci\xF3n *</label>
            <select id="onboard-existing-sala" class="profile-input" required>
              <option value="">\u2014 Seleccionar \u2014</option>
              ${buildSalaOptionsHtml(prefilledSala)}
            </select>
            <p class="clinical-teams-hint">Necesaria para unirte a la sala de turno en Nube (${escapeHtml(getCloudSyncUrl())}).</p>
          </div>
          <p id="onboard-existing-status" class="clinical-teams-hint" aria-live="polite"></p>
          <p id="onboard-existing-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Entrar y sincronizar</button>
            <button type="button" id="clinical-onboard-existing-back-btn" class="btn-med-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>`;
}
function renderExistingAccountLoginPanel(host, settings = readRpcSettings()) {
  host.innerHTML = buildOnboardingStageHtml({
    title: "Inicia sesi\xF3n en Nube",
    leadHtml: "<p>Entra con tu @usuario y contrase\xF1a de R+ Cloud. Sincronizaremos equipos y censo del turno en este equipo.</p>",
    stepperIndex: 2,
    bodyHtml: buildExistingAccountLoginBodyHtml(settings)
  });
}
function showExistingLoginError(errEl, message) {
  if (!errEl) return;
  errEl.textContent = message;
  errEl.hidden = false;
}
function readExistingLoginFields() {
  const rememberEl = document.getElementById("onboard-existing-remember");
  return {
    username: normalizeUsername(String(document.getElementById("onboard-existing-username")?.value || "")),
    password: String(document.getElementById("onboard-existing-password")?.value || ""),
    sala: String(document.getElementById("onboard-existing-sala")?.value || "").trim(),
    remember: !!(rememberEl && /** @type {HTMLInputElement} */
    rememberEl.checked)
  };
}
async function tryResumeLocalIdentity(username, settings) {
  try {
    const existing = await lookupClinicalUserByUsername(username);
    if (!existing?.user_id) return settings;
    const resumed = await resumeClinicalIdentityByUsername(username, settings, getClientId());
    if (resumed.ok) return readRpcSettings();
  } catch {
  }
  return settings;
}
async function finishExistingAccountProfile(ctx) {
  let settings = readRpcSettings();
  settings = await tryResumeLocalIdentity(ctx.username, settings);
  await bridgeCloudIdentityToLocal({
    username: ctx.username,
    displayName: ctx.displayName,
    rank: ctx.rank || clinicalSessionContext.user?.rank || "R1",
    sala: ctx.sala
  });
  persistClinicalUserBinding({
    userId: clinicalSessionContext.user?.user_id,
    username: ctx.username,
    displayName: ctx.displayName,
    rank: ctx.rank || clinicalSessionContext.user?.rank || "R1",
    sala: ctx.sala,
    registered: true,
    lanProfileGateComplete: true
  });
  setClinicalExistingAccountPath(false);
  const syncOut = await completeCloudOnboardingSync({
    username: ctx.username,
    displayName: ctx.displayName,
    sala: ctx.sala,
    toast: ctx.toast,
    setStatus: ctx.setStatus
  });
  if (!syncOut.ok) return syncOut;
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  return { ok: true };
}
function validateExistingLoginFields(fields, errEl) {
  if (!isValidUsernameFormat(fields.username)) {
    showExistingLoginError(errEl, "Usuario inv\xE1lido: min\xFAsculas, 3\u201332 caracteres, p. ej. drmendoza.");
    return false;
  }
  if (!fields.password) {
    showExistingLoginError(errEl, "Ingresa tu contrase\xF1a de Nube.");
    return false;
  }
  if (!fields.sala) {
    showExistingLoginError(errEl, "Selecciona tu rotaci\xF3n.");
    return false;
  }
  if (!isCloudSala(fields.sala)) {
    showExistingLoginError(errEl, "La rotaci\xF3n elegida no usa Nube. Elige Sala o Torre HU.");
    return false;
  }
  return true;
}
async function runExistingAccountLogin(fields, { errEl, toast, setStatus }) {
  const loginOut = await loginCloudDuringOnboarding({
    username: fields.username,
    password: fields.password,
    remember: fields.remember,
    setStatus
  });
  if (!loginOut.ok) {
    showExistingLoginError(errEl, loginOut.error || "No se pudo iniciar sesi\xF3n.");
    return false;
  }
  const displayName = String(loginOut.displayName || clinicalSessionContext.user?.clinical_name || "").trim() || fields.username;
  const rank = String(loginOut.rank || clinicalSessionContext.user?.rank || "R1");
  const finishOut = await finishExistingAccountProfile({
    username: fields.username,
    displayName,
    sala: fields.sala,
    rank,
    toast,
    setStatus
  });
  if (!finishOut.ok) {
    showExistingLoginError(errEl, finishOut.error || "No se pudo sincronizar.");
    return false;
  }
  toast(
    fields.remember ? "Sesi\xF3n iniciada y sincronizada (se recordar\xE1 en este dispositivo)." : "Sesi\xF3n iniciada y sincronizada.",
    "success"
  );
  return true;
}
async function handleExistingAccountLoginSubmit(ev) {
  ev.preventDefault();
  const errEl = document.getElementById("onboard-existing-error");
  const statusEl = document.getElementById("onboard-existing-status");
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
    if (errEl) errEl.hidden = true;
  };
  const toast = (msg, kind = "info") => {
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(msg, kind);
    }
  };
  const fields = readExistingLoginFields();
  if (!validateExistingLoginFields(fields, errEl)) return;
  const submitBtn = ev.target?.querySelector?.('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  try {
    const ok = await runExistingAccountLogin(fields, { errEl, toast, setStatus });
    if (!ok) return;
    const { refreshMainClinicalOnboardingIfNeeded } = await import("/mobile/js/chunks/clinical-onboarding-main-JGMTC5M4.js");
    await refreshMainClinicalOnboardingIfNeeded();
  } catch (err) {
    showExistingLoginError(errEl, err instanceof Error ? err.message : "Error al iniciar sesi\xF3n.");
  } finally {
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}
function readStoredCloudTokenIdentity(settings) {
  return {
    clientId: resolveClinicalClientId(settings),
    username: normalizeUsername(
      String(settings.clinicalUsername || clinicalSessionContext.user?.username || "")
    ),
    displayName: String(
      settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ""
    ).trim(),
    rank: String(settings.clinicalRank || clinicalSessionContext.user?.rank || "R1")
  };
}
async function resolveStoredCloudTokenHandle(identity) {
  const isInvalid = !isValidUsernameFormat(identity.username) || isLegacyMachineUsername(identity.username, identity.clientId);
  if (!isInvalid) return identity;
  try {
    const client = createCloudSyncApi({ getBaseUrl: getCloudSyncUrl, getToken: getCloudSyncToken });
    const data = await client.me();
    const cloudUser = data?.user || {};
    const cloudHandle = normalizeUsername(String(cloudUser.username || ""));
    if (!isValidUsernameFormat(cloudHandle)) return null;
    return {
      ...identity,
      username: cloudHandle,
      displayName: identity.displayName || String(cloudUser.displayName || "").trim()
    };
  } catch {
    return null;
  }
}
async function tryResumeOnboardingFromStoredCloudToken() {
  const token = getCloudSyncToken();
  if (!token) return false;
  const settings = readRpcSettings();
  const sala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || "").trim();
  if (!isCloudSala(sala)) return false;
  let identity = await resolveStoredCloudTokenHandle(readStoredCloudTokenIdentity(settings));
  if (!identity || !isValidUsernameFormat(identity.username)) return false;
  const out = await finishExistingAccountProfile({
    username: identity.username,
    displayName: identity.displayName || identity.username,
    sala,
    rank: identity.rank,
    toast: () => {
    },
    setStatus: () => {
    }
  });
  if (!out.ok) return false;
  const { refreshMainClinicalOnboardingIfNeeded } = await import("/mobile/js/chunks/clinical-onboarding-main-JGMTC5M4.js");
  await refreshMainClinicalOnboardingIfNeeded();
  return true;
}
async function tryCompleteExistingAccountFromStoredSession() {
  const settings = readRpcSettings();
  if (!needsExistingAccountLogin(settings) && !getCloudSyncToken()) return false;
  return tryResumeOnboardingFromStoredCloudToken();
}
function wireExistingAccountLoginInteractions() {
  const form = document.getElementById("clinical-onboard-existing-login-form");
  if (form && !form._rpcExistingLoginWired) {
    form._rpcExistingLoginWired = true;
    form.addEventListener("submit", (ev) => void handleExistingAccountLoginSubmit(ev));
  }
  wireOnboardingModeBackButtons();
  const switchBtn = document.getElementById("clinical-onboard-switch-existing-btn");
  if (switchBtn && !switchBtn._rpcSwitchExistingWired) {
    switchBtn._rpcSwitchExistingWired = true;
    switchBtn.addEventListener("click", () => {
      setClinicalExistingAccountPath(true);
      void import("/mobile/js/chunks/clinical-onboarding-main-JGMTC5M4.js").then((m) => m.refreshMainClinicalOnboardingIfNeeded());
    });
  }
}

export {
  localOnlyUsernameForUserId,
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions,
  wireOnboardingModeBackButtons,
  registerCloudDuringOnboarding,
  needsExistingAccountLogin,
  buildExistingAccountLoginBodyHtml,
  renderExistingAccountLoginPanel,
  finishExistingAccountProfile,
  handleExistingAccountLoginSubmit,
  tryResumeOnboardingFromStoredCloudToken,
  tryCompleteExistingAccountFromStoredSession,
  wireExistingAccountLoginInteractions
};
//# sourceMappingURL=/js/chunks/chunk-3S6SZ3HX.js.map

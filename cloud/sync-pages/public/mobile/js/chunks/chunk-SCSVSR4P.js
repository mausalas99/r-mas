import {
  persistLanClientConfig
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import {
  isLanSkipShiftPin
} from "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-VTSC3E5H.js";
import {
  ensureLanProfileGateDeviceReset,
  isClinicalLocalOnlyMode,
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-3566DTDN.js";
import {
  isValidUsernameFormat,
  normalizeUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/features/clinical-registration-submit.mjs
var RANKS = ["R1", "R2", "R3", "R4", "Admin"];
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function retryBootstrapWithUsername_(api, clientId, username, safeRank, settings) {
  var retry = await api.dbClinicalAccessBootstrap({
    clientId,
    rank: safeRank,
    preferredUsername: username,
    preferredUserId: String(settings.clinicalUserId || "")
  });
  var userId = String(retry?.user?.userId || "");
  if (!retry?.ok || normalizeUsername(retry?.user?.username || "") !== username) {
    throw new Error("El usuario LAN ya est\xE1 en uso.");
  }
  return userId;
}
async function claimUsernameIfMismatch_(api, clientId, userId, username, safeRank, settings) {
  var claimRes = await api.dbClinicalUsernameClaim({ userId, username });
  if (claimRes?.ok) return userId;
  var errMsg = String(claimRes?.error || "");
  if (!/ya está en uso/i.test(errMsg)) {
    throw new Error(errMsg || "No se pudo registrar el usuario LAN.");
  }
  return retryBootstrapWithUsername_(api, clientId, username, safeRank, settings);
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
      errEl.textContent = "Usuario LAN inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.";
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
async function connectShiftPinIfNeeded_(shiftPin, sala, _runtime) {
  if (isClinicalLocalOnlyMode()) return;
  if (isLanSkipShiftPin()) {
    var { tryEasyLanShiftPinConnect } = await import("/mobile/js/chunks/lan-shift-pin-connect-FXDJ6TCU.js");
    await tryEasyLanShiftPinConnect({ sala, force: true });
    return;
  }
  if (!shiftPin) return;
  var { connectLanWithShiftPin } = await import("/mobile/js/chunks/lan-shift-pin-connect-FXDJ6TCU.js");
  var connected = await connectLanWithShiftPin(shiftPin, { sala });
  if (!connected && typeof window.showToast === "function") {
    window.showToast(
      "No se encontr\xF3 anfitri\xF3n con ese PIN. Puedes intentarlo en \u21C4 (Wi\u2011Fi) o Mi rotaci\xF3n \u2192 Conectar al turno.",
      "warning"
    );
  }
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
  var params = new URLSearchParams(window.location.search);
  var host = params.get("host") || "";
  var code = params.get("code") || "";
  if (!host || !code) return;
  try {
    persistLanClientConfig(host, code);
  } catch (_e) {
    void _e;
  }
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
  } = await import("/mobile/js/chunks/clinical-profile-lan-sync-PTQG2ATM.js");
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
  const { refreshClinicalUserProfile } = await import("/mobile/js/chunks/clinical-access-runtime-D353YS2C.js");
  await refreshClinicalUserProfile();
  deps.closeModal();
  maybePersistMobilePairing_();
  resolvePendingRegistration_(deps);
  try {
    const { refreshMainClinicalOnboardingIfNeeded } = await import("/mobile/js/chunks/clinical-onboarding-main-LFHEK3VY.js");
    await refreshMainClinicalOnboardingIfNeeded();
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

export {
  prefillRegistrationFromUrlParams,
  wireClinicalRegistrationForm,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-SCSVSR4P.js.map

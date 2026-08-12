import {
  userHasJoinedTeam
} from "/mobile/js/chunks/chunk-YFQZYSTX.js";
import {
  bridgeCloudIdentityToLocal
} from "/mobile/js/chunks/chunk-NGYHUPLR.js";
import {
  isCutoverPending
} from "/mobile/js/chunks/chunk-NIWULNNS.js";
import {
  showRecoveryCodeModal
} from "/mobile/js/chunks/chunk-YR5I2T5V.js";
import {
  isValidUsernameFormat,
  normalizeUsername
} from "/mobile/js/chunks/chunk-4RTTJZJK.js";
import {
  hydrateClinicalTeamsAfterCloudPull
} from "/mobile/js/chunks/chunk-CZEKXCNB.js";
import {
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";

// public/js/features/cloud-sync/panel-session-gate.mjs
function shouldShowNubePostAuthChrome(token) {
  return Boolean(token && String(token).trim());
}
function shouldForcePanelRebuildOnAuthChange(prevToken, nextToken) {
  return shouldShowNubePostAuthChrome(prevToken) !== shouldShowNubePostAuthChrome(nextToken);
}

// public/js/features/cloud-sync/panel-conexion-handlers.mjs
function rebuildPanelOnAuthChange(deps, prevToken) {
  if (shouldForcePanelRebuildOnAuthChange(prevToken, deps.getCloudSyncToken())) {
    deps.renderLanPanel?.({ force: true });
    return true;
  }
  return false;
}
var REGENERATE_CONFIRM = "\xBFRegenerar c\xF3digo? El anterior deja de funcionar.";
async function maybeShowRecoveryCodeModal(data) {
  const code = String(data?.recoveryCode || "").trim();
  if (code) await showRecoveryCodeModal({ code });
}
function readRegisterForm(section) {
  const user = section.querySelector("[data-cloud-reg-user]");
  const pass = section.querySelector("[data-cloud-reg-pass]");
  const display = section.querySelector("[data-cloud-reg-display]");
  return {
    username: normalizeUsername(String(user?.value || "")),
    displayName: String(display?.value || "").trim(),
    password: String(pass?.value || "")
  };
}
function validateRegisterForm(form, toast) {
  if (!isValidUsernameFormat(form.username)) {
    toast("Usuario inv\xE1lido: min\xFAsculas, sin espacios, 3\u201332 caracteres.", "error");
    return false;
  }
  if (!form.displayName) {
    toast("Ingresa tu nombre en guardia.", "error");
    return false;
  }
  if (!form.password) {
    toast("Ingresa una contrase\xF1a.", "error");
    return false;
  }
  return true;
}
function toastRegisterError(err, toast) {
  const msg = err?.data?.message || err?.message || "No se pudo registrar.";
  toast(/not found/i.test(msg) ? "URL nube incorrecta o vac\xEDa. Revisa Avanzado \u2192 URL del servicio." : msg, "error");
}
async function afterAuthSuccess(deps, user) {
  deps.setCloudUser({ username: user?.username || "", displayName: user?.displayName || "" });
  await Promise.all([
    bridgeCloudIdentityToLocal({
      username: deps.getCloudUser().username,
      displayName: deps.getCloudUser().displayName
    }),
    deps.tryAutoEnsureTurnRoom()
  ]);
  await hydrateClinicalTeamsAfterCloudPull();
  if (!isCutoverPending() && !userHasJoinedTeam()) {
    void deps.handleOpenRotation();
  }
}
async function handleRegister(deps) {
  await deps.saveUrlFromUi();
  const form = readRegisterForm(deps.section);
  if (!validateRegisterForm(form, deps.toast)) return;
  try {
    const data = await deps.getApi().register(form);
    const prevToken = deps.getCloudSyncToken();
    deps.setCloudSyncToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, data.user || form);
    deps.toast("Cuenta creada. Sesi\xF3n nube iniciada.", "success");
    if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderAfterAuth();
  } catch (err) {
    toastRegisterError(err, deps.toast);
  }
}
function readLoginForm(section) {
  const user = section.querySelector("[data-cloud-login-user]");
  const pass = section.querySelector("[data-cloud-login-pass]");
  const remember = section.querySelector("[data-cloud-login-remember]");
  return {
    username: normalizeUsername(String(user?.value || "")),
    password: String(pass?.value || ""),
    remember: !!(remember && /** @type {HTMLInputElement} */
    remember.checked)
  };
}
function persistCloudRoom(deps, room) {
  if (typeof deps.setCloudSyncRoomSnapshot === "function") {
    deps.setCloudSyncRoomSnapshot(room);
    return;
  }
  deps.setCloudSyncRoomId(room.id);
  deps.setCloudSyncRevision(Number(room.revision) || 0);
}
async function handleLogin(deps) {
  await deps.saveUrlFromUi();
  const form = readLoginForm(deps.section);
  if (!form.username || !form.password) {
    deps.toast("Usuario y contrase\xF1a requeridos.", "error");
    return;
  }
  try {
    const data = await deps.getApi().login({
      username: form.username,
      password: form.password
    });
    const prevToken = deps.getCloudSyncToken();
    deps.setCloudSyncToken(data.token, { remember: form.remember });
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, data.user || { username: form.username });
    deps.toast(
      form.remember ? "Sesi\xF3n nube iniciada (se recordar\xE1 en este dispositivo)." : "Sesi\xF3n nube iniciada.",
      "success"
    );
    if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderAfterAuth();
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo iniciar sesi\xF3n.", "error");
  }
}
function readRecoverForm(section) {
  const user = section.querySelector("[data-cloud-recover-user]");
  const code = section.querySelector("[data-cloud-recover-code]");
  const pass = section.querySelector("[data-cloud-recover-pass]");
  const pass2 = section.querySelector("[data-cloud-recover-pass2]");
  return {
    username: normalizeUsername(String(user?.value || "")),
    recoveryCode: String(code?.value || "").trim(),
    password: String(pass?.value || ""),
    password2: String(pass2?.value || "")
  };
}
async function handleRecover(deps) {
  await deps.saveUrlFromUi();
  const form = readRecoverForm(deps.section);
  if (!form.username || !form.recoveryCode) {
    deps.toast("Usuario y c\xF3digo de recuperaci\xF3n requeridos.", "error");
    return;
  }
  if (form.password.length < 10) {
    deps.toast("Contrase\xF1a: m\xEDnimo 10 caracteres.", "error");
    return;
  }
  if (form.password !== form.password2) {
    deps.toast("Las contrase\xF1as no coinciden.", "error");
    return;
  }
  try {
    const data = await deps.getApi().recover({
      username: form.username,
      recoveryCode: form.recoveryCode,
      newPassword: form.password
    });
    const prevToken = deps.getCloudSyncToken();
    deps.setCloudSyncToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, data.user || { username: form.username });
    deps.toast("Cuenta recuperada. Sesi\xF3n nube iniciada.", "success");
    if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderAfterAuth();
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo recuperar la cuenta.", "error");
  }
}
async function handleRegenerateRecovery(deps) {
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    if (!window.confirm(REGENERATE_CONFIRM)) return;
  }
  try {
    const data = await deps.getApi().regenerateRecovery();
    await maybeShowRecoveryCodeModal(data);
    deps.toast("C\xF3digo de recuperaci\xF3n regenerado.", "success");
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo regenerar el c\xF3digo.", "error");
  }
}
async function handleCreateRoom(deps) {
  await deps.saveUrlFromUi();
  if (!deps.getCloudSyncToken()) {
    deps.toast("Inicia sesi\xF3n primero.", "error");
    return;
  }
  const nameInput = deps.section.querySelector("[data-cloud-room-name]");
  const name = String(nameInput?.value || "").trim() || "Turno " + deps.normalizedSala;
  try {
    const data = await deps.getApi().createRoom({ name, sala: deps.normalizedSala });
    const room = data.room;
    persistCloudRoom(deps, room);
    deps.renderConnected(room);
    deps.toast("Sala creada: " + room.code, "success");
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo crear la sala.", "error");
  }
}
async function handleJoinRoom(deps) {
  await deps.saveUrlFromUi();
  if (!deps.getCloudSyncToken()) {
    deps.toast("Inicia sesi\xF3n primero.", "error");
    return;
  }
  const codeInput = deps.section.querySelector("[data-cloud-join-code]");
  const code = String(codeInput?.value || "").trim();
  if (!code) {
    deps.toast("Ingresa el c\xF3digo de sala.", "error");
    return;
  }
  try {
    const data = await deps.getApi().joinRoom({ code });
    const room = data.room;
    persistCloudRoom(deps, room);
    deps.renderConnected(room);
    deps.toast("Unido a la sala " + room.code + ".", "success");
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo unir a la sala.", "error");
  }
}
async function handleLeaveRoom(deps) {
  const roomId = deps.getCloudSyncRoomId();
  deps.stopRuntime();
  try {
    if (roomId) await deps.getApi().leaveRoom(roomId);
  } catch {
  }
  deps.clearCloudSyncSession();
  deps.onCloudRoomChange?.(false);
  deps.toast("Saliste de la sala en la nube.", "info");
  deps.renderDisconnected();
}
async function handleLogout(deps) {
  const prevToken = deps.getCloudSyncToken();
  deps.stopRuntime();
  try {
    await deps.getApi().logout();
  } catch {
  }
  deps.clearCloudSyncSession();
  deps.setCloudUser(null);
  deps.onCloudRoomChange?.(false);
  if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderDisconnected();
}
async function handleOpenRotation(toast) {
  try {
    const { openConexionEquipoPanel } = await import("/mobile/js/chunks/panel-equipo-nav-VRK33UQS.js");
    await openConexionEquipoPanel({ toast });
  } catch {
    toast("No se pudo abrir equipos.", "error");
  }
}
function renderAfterAuth(deps) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId) {
    const snap = typeof deps.getCloudSyncRoomSnapshot === "function" ? deps.getCloudSyncRoomSnapshot() : null;
    deps.renderConnected({
      id: roomId,
      revision: deps.getCloudSyncRevision(),
      sala: snap?.sala || normalizeCloudSala(deps.getUserSala()),
      code: snap?.code || "",
      turnKey: snap?.turnKey || "",
      name: snap?.name || ""
    });
  } else {
    deps.renderDisconnected();
  }
}

export {
  readRegisterForm,
  validateRegisterForm,
  toastRegisterError,
  handleRegister,
  readLoginForm,
  handleLogin,
  handleRecover,
  handleRegenerateRecovery,
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleLogout,
  handleOpenRotation,
  renderAfterAuth
};
//# sourceMappingURL=/js/chunks/chunk-SETBJ5JD.js.map

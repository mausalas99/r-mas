import {
  userHasJoinedTeam
} from "/mobile/js/chunks/chunk-KLATWUL3.js";
import {
  isCutoverPending
} from "/mobile/js/chunks/chunk-36QQC646.js";
import {
  bridgeCloudIdentityToLocal
} from "/mobile/js/chunks/chunk-HABESGMS.js";
import {
  getCloudSyncClientId
} from "/mobile/js/chunks/chunk-3LRZJZK5.js";
import {
  showRecoveryCodeModal
} from "/mobile/js/chunks/chunk-YR5I2T5V.js";
import {
  hydrateClinicalTeamsAfterCloudPull
} from "/mobile/js/chunks/chunk-RLSWVEU2.js";
import {
  isEncryptedContentPath,
  listContentFieldEntries
} from "/mobile/js/chunks/chunk-O5BLBOGB.js";
import {
  DEK_EVENTS,
  NUBE_E2EE_ENABLED,
  auditDekEvent,
  clearRoomDekCache,
  ensureRoomDek,
  exportCachedDeksForPersistence,
  getCachedRoomDek,
  isEncryptedEnvelope,
  loadRoomDek
} from "/mobile/js/chunks/chunk-PVAHDYTI.js";
import {
  pushCloudOpsDirect
} from "/mobile/js/chunks/chunk-7GCA7ASC.js";
import {
  showConfirmDialog
} from "/mobile/js/chunks/chunk-CBI7THZ4.js";
import {
  isValidUsernameFormat,
  normalizeUsername
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  setStoredRoomDeks
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/cloud-sync/panel-session-gate.mjs
function shouldShowNubePostAuthChrome(token) {
  return Boolean(token && String(token).trim());
}
function shouldForcePanelRebuildOnAuthChange(prevToken, nextToken) {
  return shouldShowNubePostAuthChrome(prevToken) !== shouldShowNubePostAuthChrome(nextToken);
}

// public/js/features/cloud-sync/room-dek-migrate.mjs
function bumpTimestamp(iso) {
  const t = new Date(String(iso || "")).getTime();
  if (!Number.isFinite(t)) return String(iso || "");
  return new Date(t + 1).toISOString();
}
function foldOpsToLatestByPath(ops) {
  const out = {};
  for (const op of Array.isArray(ops) ? ops : []) {
    if (!op || typeof op.path !== "string" || !op.path) continue;
    out[op.path] = { value: op.value, updatedAt: String(op.updatedAt || ""), actorId: String(op.actorId || "") };
  }
  return out;
}
function foldStateToLatestByPath(state) {
  const out = {};
  for (const { path, value } of listContentFieldEntries(state)) {
    const version = state.entityVersions?.[path];
    if (!version) continue;
    out[path] = { value, updatedAt: String(version.updatedAt || ""), actorId: String(version.actorId || "") };
  }
  return out;
}
function buildReencryptOps(byPath, actorId) {
  const ops = [];
  for (const [path, entry] of Object.entries(byPath)) {
    if (!isEncryptedContentPath(path)) continue;
    if (isEncryptedEnvelope(entry.value)) continue;
    if (!entry.updatedAt) continue;
    ops.push({ path, value: entry.value, updatedAt: bumpTimestamp(entry.updatedAt), actorId });
  }
  return ops;
}
function groupOpsByEntity(ops) {
  const groups = /* @__PURE__ */ new Map();
  for (const op of ops) {
    const key = op.path.split("/").slice(0, 2).join("/");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(op);
  }
  return groups;
}
async function sweepRoomForPlaintextContent(api, roomId, actorId) {
  const data = await api.pull(roomId, 0);
  const byPath = data?.state ? foldStateToLatestByPath(data.state) : foldOpsToLatestByPath(data?.ops);
  const ops = buildReencryptOps(byPath, actorId);
  if (!ops.length) return { swept: 0, failed: 0 };
  const revisionRef = { current: Number(data?.revision) || 0 };
  let swept = 0;
  let failed = 0;
  for (const [entityKey, entityOps] of groupOpsByEntity(ops)) {
    const ok = await pushEntityOps(api, roomId, entityKey, entityOps, revisionRef);
    if (ok) swept += entityOps.length;
    else failed += 1;
  }
  return { swept, failed };
}
async function pushEntityOps(api, roomId, entityKey, entityOps, revisionRef) {
  try {
    await pushCloudOpsDirect(
      api,
      roomId,
      entityOps,
      () => revisionRef.current,
      (next) => {
        revisionRef.current = next;
      }
    );
    return true;
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, {
      roomId,
      phase: "backfill-sweep",
      entity: entityKey,
      message: String(err?.message || err)
    });
    return false;
  }
}
async function countRemainingPlaintext(api, roomId) {
  const data = await api.pull(roomId, 0);
  const byPath = data?.state ? foldStateToLatestByPath(data.state) : foldOpsToLatestByPath(data?.ops);
  let count = 0;
  for (const [path, entry] of Object.entries(byPath)) {
    if (isEncryptedContentPath(path) && !isEncryptedEnvelope(entry.value)) count += 1;
  }
  return count;
}
async function backfillRoomEncryption(api, room, actorId) {
  const roomId = String(room?.id || "");
  const roomCode = String(room?.code || "");
  if (!roomId || room?.role !== "owner") return null;
  const dek = getCachedRoomDek(roomId) || await loadRoomDek(api, roomId, roomCode).catch(() => null) || await ensureRoomDek(api, roomId, roomCode).catch(() => null);
  if (!dek) return null;
  return sweepAndVerify(api, roomId, actorId);
}
async function sweepAndVerify(api, roomId, actorId) {
  try {
    const result = await sweepRoomForPlaintextContent(api, roomId, actorId);
    const remaining = await countRemainingPlaintext(api, roomId).catch(() => -1);
    await auditDekEvent(DEK_EVENTS.BACKFILL_SWEPT, { roomId, swept: result.swept, failed: result.failed, remaining });
    return { ...result, remaining };
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, {
      roomId,
      phase: "backfill-sweep",
      message: String(err?.message || err)
    });
    return null;
  }
}

// public/js/features/cloud-sync/panel-conexion-handlers.mjs
async function persistRoomDeks() {
  setStoredRoomDeks(await exportCachedDeksForPersistence());
}
function resolveRememberFromSection(section, selector, deps) {
  const el = section?.querySelector?.(selector);
  if (el instanceof HTMLInputElement) return !!el.checked;
  if (typeof deps?.getCloudSyncRemember === "function") return !!deps.getCloudSyncRemember();
  return true;
}
function rebuildPanelOnAuthChange(deps, prevToken) {
  if (shouldForcePanelRebuildOnAuthChange(prevToken, deps.getCloudSyncToken())) {
    deps.renderLanPanel?.({ force: true });
  }
}
var REGENERATE_CONFIRM = "\xBFRegenerar c\xF3digo? El anterior deja de funcionar.";
async function maybeShowRecoveryCodeModal(data) {
  const code = String(data?.recoveryCode || "").trim();
  if (code) await showRecoveryCodeModal({ code });
}
function enterCloudSession(deps, token, remember, prevToken) {
  const t = String(token || "").trim();
  if (!t) {
    const err = new Error("El servidor no devolvi\xF3 sesi\xF3n.");
    err.data = { message: err.message };
    throw err;
  }
  deps.setCloudSyncToken(t, { remember });
  rebuildPanelOnAuthChange(deps, prevToken);
  deps.renderAfterAuth();
}
async function finishCloudAuthProfile(deps, data, user) {
  try {
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, user);
  } catch (postErr) {
    deps.toast?.(
      postErr?.data?.message || postErr?.message || "Sesi\xF3n iniciada; no se pudo completar el perfil.",
      "error"
    );
  }
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
  const [, room] = await Promise.all([
    bridgeCloudIdentityToLocal({
      username: deps.getCloudUser().username,
      displayName: deps.getCloudUser().displayName
    }),
    deps.tryAutoEnsureTurnRoom()
  ]);
  if (room?.id && NUBE_E2EE_ENABLED) {
    void backfillRoomEncryption(deps.getApi(), room, getCloudSyncClientId()).then(
      (result) => {
        if (result && (result.failed > 0 || result.remaining !== 0)) {
          deps.toast("Sala " + (room.code || room.id) + ": algunos datos a\xFAn no est\xE1n protegidos. Reintenta m\xE1s tarde.", "error");
        }
        return persistRoomDeks();
      },
      () => {
      }
    );
  }
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
    enterCloudSession(
      deps,
      data.token,
      resolveRememberFromSection(deps.section, "[data-cloud-reg-remember]", deps),
      prevToken
    );
    deps.toast("Cuenta creada. Sesi\xF3n nube iniciada.", "success");
    await finishCloudAuthProfile(deps, data, data.user || form);
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
    enterCloudSession(deps, data.token, form.remember, prevToken);
    deps.toast(
      form.remember ? "Sesi\xF3n nube iniciada (se recordar\xE1 en este dispositivo)." : "Sesi\xF3n nube iniciada.",
      "success"
    );
    await finishCloudAuthProfile(deps, data, data.user || { username: form.username });
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
    enterCloudSession(
      deps,
      data.token,
      resolveRememberFromSection(deps.section, "[data-cloud-login-remember]", deps),
      prevToken
    );
    deps.toast("Cuenta recuperada. Sesi\xF3n nube iniciada.", "success");
    await finishCloudAuthProfile(deps, data, data.user || { username: form.username });
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || "No se pudo recuperar la cuenta.", "error");
  }
}
async function handleRegenerateRecovery(deps) {
  const ok = await showConfirmDialog({
    id: "cloud-sync-regenerate-recovery-confirm",
    title: "Regenerar c\xF3digo",
    question: REGENERATE_CONFIRM,
    confirmLabel: "Regenerar",
    cancelLabel: "Cancelar"
  });
  if (!ok) return;
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
    const dekOk = NUBE_E2EE_ENABLED ? await ensureRoomDek(deps.getApi(), room.id, room.code).then(() => true).catch(() => false) : false;
    await persistRoomDeks();
    deps.renderConnected(room);
    deps.toast(
      dekOk || !NUBE_E2EE_ENABLED ? "Sala creada: " + room.code : "Sala creada: " + room.code + " (sin cifrado \u2014 reintenta desde \u21C4 si es necesario).",
      dekOk || !NUBE_E2EE_ENABLED ? "success" : "error"
    );
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
    try {
      await loadRoomDek(deps.getApi(), room.id, room.code);
      await persistRoomDeks();
    } catch {
      deps.toast("Unido, pero no se pudo cargar la llave de cifrado de la sala.", "error");
    }
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
  if (typeof deps.setCloudSyncRoomSnapshot === "function") {
    deps.setCloudSyncRoomSnapshot(null);
  } else {
    deps.setCloudSyncRoomId("");
    deps.setCloudSyncRevision(0);
  }
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
  clearRoomDekCache();
  deps.clearCloudSyncSession();
  deps.setCloudUser(null);
  deps.onCloudRoomChange?.(false);
  rebuildPanelOnAuthChange(deps, prevToken);
  deps.renderDisconnected();
}
async function handleOpenRotation(toast) {
  try {
    const { openConexionEquipoPanel } = await import("/mobile/js/chunks/panel-equipo-nav-VBQSPJUJ.js");
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
//# sourceMappingURL=/js/chunks/chunk-DY2MYEUJ.js.map

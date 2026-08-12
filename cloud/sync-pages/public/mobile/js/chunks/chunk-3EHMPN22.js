import {
  readLoginForm,
  readRegisterForm,
  toastRegisterError,
  validateRegisterForm
} from "/mobile/js/chunks/chunk-SETBJ5JD.js";
import {
  wireCloudAuthTabs
} from "/mobile/js/chunks/chunk-YFQZYSTX.js";
import {
  notifyIfCloudMobileCensusEmpty,
  resolveCloudMobileActiveRoom,
  showCloudMobileEmptyCensusBanner
} from "/mobile/js/chunks/chunk-RAAF5FZF.js";
import {
  startCloudMobileRuntime
} from "/mobile/js/chunks/chunk-ZWJ4QQMV.js";
import {
  applyCloudMobileInviteSearch,
  clearCloudMobileJoinHints,
  persistCloudMobilePairingFromRoom,
  readCloudMobileJoinCode,
  readCloudMobileJoinSala,
  readCloudMobileJoinUser,
  restoreCloudMobilePairingFromStorage,
  setCloudMobileToken
} from "/mobile/js/chunks/chunk-R5OJQNBZ.js";
import {
  buildCloudMobileBookmarkUrl
} from "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  bridgeCloudIdentityToLocal
} from "/mobile/js/chunks/chunk-NGYHUPLR.js";
import {
  syncMobileBarebonesChrome
} from "/mobile/js/chunks/chunk-WTQUTVWF.js";
import {
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  normalizeUsername,
  persistClinicalUserBinding
} from "/mobile/js/chunks/chunk-4RTTJZJK.js";
import {
  isCloudMobileClient
} from "/mobile/js/chunks/chunk-V25HP6NK.js";
import {
  showToast
} from "/mobile/js/chunks/chunk-ZCN4RDXQ.js";
import {
  clearWebSessionClinicalMemory
} from "/mobile/js/chunks/chunk-3MF5KBNS.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-KYGE5G3V.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  installSessionClinicalWipeOnExit,
  wipeSessionClinicalStorage
} from "/mobile/js/chunks/chunk-XKV6IPP7.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  getCloudSyncRoomId,
  getCloudSyncRoomSnapshot,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision,
  setCloudSyncRoomSnapshot,
  setCloudSyncUrl
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";

// public/js/features/cloud-mobile/boot-timeout.mjs
var CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS = 12e3;
function withCloudMobileBootTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise(function(_resolve, reject) {
      setTimeout(function() {
        reject(new Error(label || "cloud_mobile_boot_timeout"));
      }, ms);
    })
  ]);
}

// public/js/features/cloud-mobile/login-ui.mjs
function resolveApiBaseUrl() {
  try {
    if (typeof location !== "undefined" && location.origin) {
      return String(location.origin).replace(/\/+$/, "");
    }
  } catch {
  }
  return getCloudSyncUrl();
}
function createApi() {
  return createCloudSyncApi({
    getBaseUrl: resolveApiBaseUrl,
    getToken: getCloudSyncToken
  });
}
function toast(msg, kind) {
  try {
    window.showToast?.(msg, kind);
  } catch {
  }
}
async function maybeShowRecoveryCodeModal(data) {
  const code = String(data?.recoveryCode || "").trim();
  if (!code) return;
  try {
    const { showRecoveryCodeModal } = await import("/mobile/js/chunks/recovery-modal-AMMB7Z44.js");
    await showRecoveryCodeModal({ code });
  } catch {
  }
}
function rewriteCloudMobileBookmarkUrl(user) {
  try {
    if (typeof location === "undefined" || !location.origin) return;
    const next = buildCloudMobileBookmarkUrl({
      baseUrl: location.origin,
      user: user || readCloudMobileJoinUser(),
      auth: getCloudSyncToken() || void 0
    });
    if (!next) return;
    const path = next.replace(location.origin, "");
    history.replaceState(null, "", path || next);
  } catch {
  }
}
function dismissCloudMobileGate(gate) {
  gate.hidden = true;
  gate.innerHTML = "";
  document.body.classList.remove("rpc-cloud-mobile-gated");
}
function authBodyHtml(prefilledUser) {
  const userVal = prefilledUser ? ' value="' + esc(prefilledUser) + '"' : "";
  return '<div class="cloud-sync-tabs" role="tablist" aria-label="Cuenta Nube"><button type="button" class="cloud-sync-tab is-active" role="tab" aria-selected="true" data-cloud-tab="login">Entrar</button><button type="button" class="cloud-sync-tab" role="tab" aria-selected="false" data-cloud-tab="register">Crear cuenta</button></div><div class="cloud-sync-tab-panels"><div class="cloud-sync-tab-panel" data-cloud-tab-panel="login" role="tabpanel"><div class="cloud-sync-field"><label>Usuario (@usuario)</label><input type="text" class="profile-input" data-cloud-login-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false"' + userVal + ' /></div><div class="cloud-sync-field"><label>Contrase\xF1a</label><input type="password" class="profile-input" data-cloud-login-pass autocomplete="current-password" /></div><button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="login">Entrar</button></div><div class="cloud-sync-tab-panel" data-cloud-tab-panel="register" role="tabpanel" hidden><div class="cloud-sync-field"><label>Usuario (@usuario)</label><input type="text" class="profile-input" data-cloud-reg-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false"' + userVal + ' /><p class="cloud-sync-hint">' + CLINICAL_LAN_USERNAME_HINT_HTML + '</p></div><div class="cloud-sync-field"><label>Nombre en guardia</label><input type="text" class="profile-input" data-cloud-reg-display autocomplete="name" placeholder="ej. Dr. Mendoza" /><p class="cloud-sync-hint">' + CLINICAL_LAN_DISPLAY_NAME_HINT_HTML + '</p></div><div class="cloud-sync-field"><label>Contrase\xF1a</label><input type="password" class="profile-input" data-cloud-reg-pass autocomplete="new-password" /></div><button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="register">Crear cuenta</button></div></div>';
}
function joinBodyHtml(prefilledCode) {
  const value = prefilledCode ? ' value="' + esc(prefilledCode) + '"' : "";
  return '<p class="cloud-sync-lead">Ingresa el c\xF3digo que comparti\xF3 el equipo en escritorio.</p><div class="cloud-sync-field"><label>C\xF3digo de sala</label><input type="text" class="profile-input" data-cloud-join-code placeholder="ABC123"' + value + ' /></div><button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="join-room">Unirse al turno</button>';
}
function renderShell(section, mode, prefilled) {
  const body = mode === "join" ? joinBodyHtml(prefilled || "") : authBodyHtml(prefilled || readCloudMobileJoinUser());
  const title = mode === "join" ? "Unirse al turno" : "R+ M\xF3vil \xB7 Nube";
  const sub = mode === "join" ? "Sesi\xF3n iniciada \u2014 une tu iPad al turno." : "Inicia sesi\xF3n para sincronizar el censo.";
  section.innerHTML = '<div class="rpc-cloud-mobile-modal__head"><h4 id="rpc-cloud-mobile-modal-title" class="rpc-cloud-mobile-modal__title">' + esc(title) + '</h4><p class="rpc-cloud-mobile-modal__sub">' + esc(sub) + '</p></div><div class="rpc-cloud-mobile-modal__body">' + body + "</div>";
  if (mode === "auth") wireCloudAuthTabs(section);
}
function wireShellActions(section, onConnected) {
  if (section.dataset.cloudMobileWired === "1") return;
  section.dataset.cloudMobileWired = "1";
  section.addEventListener("click", function(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest("[data-cloud-action]") : null;
    if (!btn || !section.contains(btn)) return;
    const action = btn.getAttribute("data-cloud-action");
    if (action === "login") void handleLogin(section, onConnected);
    else if (action === "register") void handleRegister(section, onConnected);
    else if (action === "join-room") void handleJoinRoom(section, onConnected);
  });
}
async function joinCloudMobileRoomByCode(code, onConnected) {
  const trimmed = String(code || "").trim();
  if (!trimmed) return false;
  if (!getCloudSyncToken()) return false;
  try {
    const data = await createApi().joinRoom({ code: trimmed });
    const room = data.room;
    setCloudSyncRoomSnapshot(room);
    persistCloudMobilePairingFromRoom(room);
    rewriteCloudMobileBookmarkUrl();
    toast("Unido a la sala " + room.code + ".", "success");
    onConnected();
    return true;
  } catch (err) {
    toast(err?.data?.message || err?.message || "No se pudo unir a la sala.", "error");
    return false;
  }
}
async function continueAfterAuth(onConnected) {
  const room = await resolveCloudMobileActiveRoom();
  if (room?.id) {
    onConnected();
    return;
  }
  const code = readCloudMobileJoinCode();
  if (code) {
    const ok = await joinCloudMobileRoomByCode(code, onConnected);
    if (ok) return;
  }
}
async function handleLogin(section, onConnected) {
  const form = readLoginForm(section);
  if (!form.username || !form.password) {
    toast("Usuario y contrase\xF1a requeridos.", "error");
    return;
  }
  try {
    const data = await createApi().login({
      username: form.username,
      password: form.password
    });
    setCloudMobileToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await bridgeCloudIdentityToLocal(data.user || { username: form.username });
    toast("Sesi\xF3n nube iniciada.", "success");
    await continueAfterAuth(onConnected);
    if (!getCloudSyncRoomId()) {
      renderShell(section, "join", readCloudMobileJoinCode());
    }
  } catch (err) {
    toast(err?.data?.message || err?.message || "No se pudo iniciar sesi\xF3n.", "error");
  }
}
async function handleRegister(section, onConnected) {
  const form = readRegisterForm(section);
  if (!validateRegisterForm(form, toast)) return;
  try {
    const data = await createApi().register(form);
    setCloudMobileToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await bridgeCloudIdentityToLocal(data.user || form);
    toast("Cuenta creada. Sesi\xF3n nube iniciada.", "success");
    await continueAfterAuth(onConnected);
    if (!getCloudSyncRoomId()) {
      renderShell(section, "join", readCloudMobileJoinCode());
    }
  } catch (err) {
    toastRegisterError(err, toast);
  }
}
async function handleJoinRoom(section, onConnected) {
  if (!getCloudSyncToken()) {
    toast("Inicia sesi\xF3n primero.", "error");
    renderShell(section, "auth");
    return;
  }
  const codeInput = section.querySelector("[data-cloud-join-code]");
  const code = String(codeInput?.value || "").trim();
  if (!code) {
    toast("Ingresa el c\xF3digo de sala.", "error");
    return;
  }
  await joinCloudMobileRoomByCode(code, onConnected);
}
function mountCloudMobileLoginShell(root, { onConnected }) {
  document.body.classList.add("rpc-cloud-mobile-gated");
  root.hidden = false;
  const section = document.createElement("section");
  section.className = "rpc-cloud-mobile-modal material-solid-elevated ui-overlay-dialog";
  section.setAttribute("role", "dialog");
  section.setAttribute("aria-modal", "true");
  section.setAttribute("aria-labelledby", "rpc-cloud-mobile-modal-title");
  root.replaceChildren(section);
  if (getCloudSyncToken() && !getCloudSyncRoomId()) {
    wireShellActions(section, onConnected);
    section.innerHTML = '<div class="rpc-cloud-mobile-modal__head"><h4 class="rpc-cloud-mobile-modal__title">R+ M\xF3vil</h4><p class="rpc-cloud-mobile-modal__sub">Buscando tu sala nube\u2026</p></div><div class="rpc-cloud-mobile-modal__body rpc-cloud-mobile-modal__body--center"><span class="rpc-cloud-mobile-spinner" aria-hidden="true"></span></div>';
    void withCloudMobileBootTimeout(
      resolveCloudMobileActiveRoom(),
      CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS,
      "room_resolve_timeout"
    ).then(function(room) {
      if (room?.id) {
        onConnected();
        return;
      }
      renderShell(section, "join", readCloudMobileJoinCode());
      const code = readCloudMobileJoinCode();
      if (code) {
        void joinCloudMobileRoomByCode(code, onConnected).then(function(ok) {
          if (!ok && !getCloudSyncRoomId()) {
            renderShell(section, "join", code);
          }
        });
      }
    }).catch(function() {
      toast("No se pudo contactar la nube. Revisa la red e intenta de nuevo.", "error");
      renderShell(section, "join", readCloudMobileJoinCode());
    });
    return;
  }
  renderShell(section, "auth", readCloudMobileJoinUser());
  wireShellActions(section, onConnected);
}

// public/js/features/cloud-mobile/hydrate-identity.mjs
function applyCloudMobileSalaFromRoom(seeded) {
  const sala = String(
    getCloudSyncRoomSnapshot()?.sala || readCloudMobileJoinSala() || ""
  ).trim();
  if (!sala || !seeded) return seeded;
  seeded.sala = sala;
  clinicalSessionContext.user = seeded;
  persistClinicalUserBinding({
    sala,
    registered: true,
    lanProfileGateComplete: true,
    userId: seeded.user_id,
    username: seeded.username || void 0,
    displayName: seeded.clinical_name || void 0
  });
  return seeded;
}
function buildCloudMobileSeedUser(cloudUser) {
  const username = normalizeUsername(
    String(cloudUser?.username || readCloudMobileJoinUser() || "").replace(/^@+/, "")
  );
  const displayName = String(cloudUser?.displayName || "").trim();
  if (!username && !cloudUser?.id) return null;
  return {
    user_id: username || String(cloudUser?.id || "cloud-mobile"),
    username: username || null,
    rank: "R1",
    sala: null,
    clinical_name: displayName || null,
    is_program_admin: 0
  };
}
function seedCloudMobileClinicalUser(cloudUser) {
  const seeded = buildCloudMobileSeedUser(cloudUser);
  if (!seeded) return null;
  clinicalSessionContext.user = seeded;
  persistClinicalUserBinding({
    userId: seeded.user_id,
    username: seeded.username || void 0,
    displayName: seeded.clinical_name || void 0,
    registered: true,
    lanProfileGateComplete: true
  });
  return applyCloudMobileSalaFromRoom(seeded);
}
async function hydrateCloudMobileIdentity(api) {
  const client = api || createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken
  });
  if (!getCloudSyncToken()) {
    seedCloudMobileClinicalUser({ username: readCloudMobileJoinUser() });
    return null;
  }
  try {
    const data = await client.me();
    const user = data?.user || null;
    seedCloudMobileClinicalUser(user);
    if (user?.username) {
      await bridgeCloudIdentityToLocal({
        username: user.username,
        displayName: user.displayName || ""
      });
    }
    return user;
  } catch {
    seedCloudMobileClinicalUser({ username: readCloudMobileJoinUser() });
    return null;
  }
}

// public/js/features/cloud-mobile/boot.mjs
var _cloudMobileBootStarted = false;
function closeConnectionDropdown() {
  try {
    document.getElementById("connection-dropdown-backdrop")?.classList.remove("open");
    document.getElementById("connection-dropdown")?.classList.remove("open");
    document.body.classList.remove("connection-dropdown-open");
  } catch {
  }
}
function ensureCloudMobileGate() {
  const gate = document.getElementById("rpc-cloud-mobile-gate") || document.createElement("div");
  gate.id = "rpc-cloud-mobile-gate";
  gate.className = "rpc-cloud-mobile-gate ui-overlay-scrim";
  gate.setAttribute("aria-live", "polite");
  if (!gate.parentElement) document.body.appendChild(gate);
  return gate;
}
function createCloudMobileToast() {
  return (msg, kind) => {
    try {
      showToast(msg, kind);
    } catch {
    }
  };
}
async function runCloudMobilePostConnect(gateEl, toast2) {
  dismissCloudMobileGate(gateEl);
  rewriteCloudMobileBookmarkUrl(readCloudMobileJoinUser());
  clearCloudMobileJoinHints();
  try {
    await hydrateCloudMobileIdentity();
  } catch {
  }
  setCloudSyncRevision(0);
  const runtime = startCloudMobileRuntime({
    onStatus(_status, _detail) {
    },
    toast: toast2
  });
  try {
    await runtime?.syncCycle?.();
    try {
      const sala = String(getCloudSyncRoomSnapshot()?.sala || "").trim();
      if (sala) {
        const { pullClinicalOpsForSala } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-FWUW5UL4.js");
        await pullClinicalOpsForSala(sala, { since: 0 });
      }
    } catch {
    }
    try {
      const access = await import("/mobile/js/chunks/clinical-access-runtime-MMQJFJHY.js");
      if (typeof access.finalizeMobileLanPatientCensus === "function") {
        await access.finalizeMobileLanPatientCensus();
      }
    } catch {
    }
    await notifyIfCloudMobileCensusEmpty(toast2);
    showCloudMobileEmptyCensusBanner();
    try {
      const patientsMod = await import("/mobile/js/chunks/patients-KIGDHYKA.js");
      patientsMod.renderPatientList();
      const { refreshMobileLabReferencePanel } = await import("/mobile/js/chunks/mobile-web-ZMCGUH7X.js");
      refreshMobileLabReferencePanel();
    } catch {
    }
  } catch {
    toast2("No se pudo sincronizar con la nube. Revisa la red e intenta de nuevo.", "error");
  }
  document.dispatchEvent(new CustomEvent("rpc-cloud-mobile-ready"));
}
function isCloudMobileBoot() {
  return isCloudMobileClient();
}
function suppressCloudMobileLocalServerAlerts() {
  try {
    document.documentElement.dataset.cloudMobile = "1";
    document.documentElement.classList.add("rpc-cloud-mobile");
  } catch {
  }
  try {
    const offline = document.getElementById("rpc-offline-banner");
    if (offline) {
      offline.classList.remove("visible");
      offline.hidden = true;
      offline.setAttribute("aria-hidden", "true");
    }
    const lan = document.getElementById("lan-connection-banner");
    if (lan) {
      lan.hidden = true;
      lan.setAttribute("aria-hidden", "true");
    }
  } catch {
  }
}
async function initCloudMobileBoot() {
  if (_cloudMobileBootStarted) return;
  if (!isCloudMobileBoot()) return;
  _cloudMobileBootStarted = true;
  if (typeof location !== "undefined" && location.origin) {
    setCloudSyncUrl(location.origin);
  }
  suppressCloudMobileLocalServerAlerts();
  closeConnectionDropdown();
  applyCloudMobileInviteSearch(typeof location !== "undefined" ? location.search : "");
  restoreCloudMobilePairingFromStorage();
  installSessionClinicalWipeOnExit();
  wipeSessionClinicalStorage({ includeLanSession: false });
  clearWebSessionClinicalMemory();
  setCloudSyncRevision(0);
  syncMobileBarebonesChrome();
  try {
    document.title = "R+ M\xF3vil";
  } catch {
  }
  const gate = ensureCloudMobileGate();
  const toast2 = createCloudMobileToast();
  const onConnected = () => {
    void runCloudMobilePostConnect(gate, toast2);
  };
  try {
    dismissCloudMobileGate(gate);
    try {
      if (typeof globalThis !== "undefined") globalThis.__RPC_CLOUD_MOBILE_BUNDLE_BOOTED__ = true;
    } catch {
    }
    if (getCloudSyncToken()) {
      let room = null;
      try {
        room = await withCloudMobileBootTimeout(
          resolveCloudMobileActiveRoom(),
          CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS,
          "room_resolve_timeout"
        );
      } catch {
        toast2("No se pudo contactar la nube. Revisa la red e intenta de nuevo.", "error");
        mountCloudMobileLoginShell(gate, { onConnected });
        return;
      }
      if (room?.id) {
        void runCloudMobilePostConnect(gate, toast2);
        return;
      }
    }
    mountCloudMobileLoginShell(gate, { onConnected });
  } catch (err) {
    console.error("[R+ M\xF3vil] boot error:", err);
    dismissCloudMobileGate(gate);
    toast2("No se pudo iniciar R+ M\xF3vil. Recarga la p\xE1gina.", "error");
    mountCloudMobileLoginShell(gate, { onConnected });
  }
}

export {
  isCloudMobileBoot,
  suppressCloudMobileLocalServerAlerts,
  initCloudMobileBoot
};
//# sourceMappingURL=/js/chunks/chunk-3EHMPN22.js.map

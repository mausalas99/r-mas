import {
  readLoginForm,
  readRegisterForm,
  toastRegisterError,
  validateRegisterForm
} from "/mobile/js/chunks/chunk-SZ64GLKF.js";
import {
  createMemoryOutbox
} from "/mobile/js/chunks/chunk-65TYIGXN.js";
import {
  applyCloudMobileInviteSearch,
  clearCloudMobileJoinHints,
  notifyIfCloudMobileCensusEmpty,
  persistCloudMobilePairingFromRoom,
  readCloudMobileJoinCode,
  readCloudMobileJoinSala,
  readCloudMobileJoinUser,
  resolveCloudMobileActiveRoom,
  restoreCloudMobilePairingFromStorage,
  setCloudMobileToken,
  showCloudMobileEmptyCensusBanner
} from "/mobile/js/chunks/chunk-MDXTWGDL.js";
import {
  bridgeCloudIdentityToLocal
} from "/mobile/js/chunks/chunk-DIIIXM6H.js";
import "/mobile/js/chunks/chunk-OPIWDF7L.js";
import {
  applyCloudPullResult,
  startCloudSyncRuntime,
  stopCloudSyncRuntime
} from "/mobile/js/chunks/chunk-MJCSL5KX.js";
import "/mobile/js/chunks/chunk-ZOXS3A7B.js";
import "/mobile/js/chunks/chunk-IQKLEOVL.js";
import "/mobile/js/chunks/chunk-AZX47ZAL.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-7R6RY2VN.js";
import {
  isCloudMobileClient,
  wireCloudAuthTabs
} from "/mobile/js/chunks/chunk-V7RKRU36.js";
import "/mobile/js/chunks/chunk-I7TKUVLA.js";
import "/mobile/js/chunks/chunk-OZWIHN57.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-RI6AP5AE.js";
import {
  configureCloudMutateBridge
} from "/mobile/js/chunks/chunk-WWZFTPFJ.js";
import "/mobile/js/chunks/chunk-L2AHBXEQ.js";
import "/mobile/js/chunks/chunk-YAV7LD7W.js";
import "/mobile/js/chunks/chunk-FQRMD6ZB.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import {
  buildCloudMobileBookmarkUrl
} from "/mobile/js/chunks/chunk-MI3IWYVD.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-DVAK5LQO.js";
import {
  clearWebSessionClinicalMemory
} from "/mobile/js/chunks/chunk-NFDNC4E2.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import {
  esc
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-DYX4ICUP.js";
import {
  isMobileWeb,
  syncMobileBarebonesChrome
} from "/mobile/js/chunks/chunk-IVC2VWFL.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-7V3KAWVG.js";
import "/mobile/js/chunks/chunk-VQEQYC4S.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-5X65DZ36.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-SI7XDBY4.js";
import "/mobile/js/chunks/chunk-MWVG4DXC.js";
import "/mobile/js/chunks/chunk-I4NFL7CB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-CR432C3M.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import {
  installSessionClinicalWipeOnExit,
  wipeSessionClinicalStorage
} from "/mobile/js/chunks/chunk-JSBTNZIE.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-IIOGZLID.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import {
  showToast
} from "/mobile/js/chunks/chunk-R6TRWWWV.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-73TLMPZ4.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import {
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  persistClinicalUserBinding
} from "/mobile/js/chunks/chunk-6WZSBH4P.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import "/mobile/js/chunks/chunk-AETSFPDT.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncRoomSnapshot,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision,
  setCloudSyncRoomSnapshot,
  setCloudSyncUrl
} from "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-GZVXFENQ.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";

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
    const { showRecoveryCodeModal } = await import("/mobile/js/chunks/recovery-modal-4D427XYP.js");
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
function showCloudMobileConnecting(gate) {
  document.body.classList.add("rpc-cloud-mobile-gated");
  gate.hidden = false;
  gate.innerHTML = '<div class="rpc-cloud-mobile-modal material-solid-elevated ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="rpc-cloud-mobile-modal-title"><div class="rpc-cloud-mobile-modal__head"><h4 id="rpc-cloud-mobile-modal-title" class="rpc-cloud-mobile-modal__title">R+ M\xF3vil</h4><p class="rpc-cloud-mobile-modal__sub">Conectando al turno\u2026</p></div><div class="rpc-cloud-mobile-modal__body rpc-cloud-mobile-modal__body--center"><span class="rpc-cloud-mobile-spinner" aria-hidden="true"></span></div></div>';
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
    void resolveCloudMobileActiveRoom().then(function(room) {
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
    });
    return;
  }
  renderShell(section, "auth", readCloudMobileJoinUser());
  wireShellActions(section, onConnected);
}

// public/js/features/cloud-mobile/mutation-gate.mjs
var ALLOWED = [
  /^entries\/[^/]+\/monitoreo$/,
  /^entries\/[^/]+\/estadoActual$/,
  /^entries\/[^/]+\/note$/,
  /^entries\/[^/]+\/indicaciones$/,
  /^todos\/[^/]+$/
];
function isAllowedCloudMobilePath(path) {
  const p = String(path || "").trim();
  if (!p) return false;
  return ALLOWED.some((re) => re.test(p));
}
function filterOpsForCloudMobile(ops) {
  if (!Array.isArray(ops)) return [];
  return ops.filter((op) => {
    if (!op || typeof op !== "object") return false;
    const row = op;
    return isAllowedCloudMobilePath(String(row.path || ""));
  });
}

// public/js/features/cloud-mobile/runtime.mjs
var _runtime = null;
async function refreshCloudMobileCensusUi() {
  try {
    const access = await import("/mobile/js/chunks/clinical-access-runtime-AE6KBGJD.js");
    if (typeof access.finalizeMobileLanPatientCensus === "function") {
      await access.finalizeMobileLanPatientCensus();
    }
  } catch {
  }
}
function startCloudMobileRuntime({ onStatus, toast: toast2 }) {
  stopCloudMobileRuntime();
  const roomId = getCloudSyncRoomId();
  const token = getCloudSyncToken();
  if (!roomId || !token) return null;
  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken
  });
  const outbox = createMemoryOutbox();
  const wrappedOutbox = {
    enqueue(item) {
      const ops = filterOpsForCloudMobile(item?.ops || []);
      if (!ops.length) return;
      outbox.enqueue({ ...item, ops });
    },
    list: outbox.list,
    remove: outbox.remove,
    clear: outbox.clear
  };
  const runtime = startCloudSyncRuntime({
    api,
    outbox: wrappedOutbox,
    getRoomId: getCloudSyncRoomId,
    getRevision: getCloudSyncRevision,
    setRevision: setCloudSyncRevision,
    onStatus,
    pollMobile: true,
    applyPullResult: async (result) => {
      try {
        await applyCloudPullResult(result);
        await refreshCloudMobileCensusUi();
        try {
          const { showCloudMobileEmptyCensusBanner: showCloudMobileEmptyCensusBanner2 } = await import("/mobile/js/chunks/resolve-active-room-COHOGB7P.js");
          showCloudMobileEmptyCensusBanner2();
          const patientsMod = await import("/mobile/js/chunks/patients-DT4CP2TY.js");
          patientsMod.renderPatientList();
        } catch {
        }
      } catch {
        toast2?.("No se pudieron aplicar los cambios de la nube.", "error");
      }
    }
  });
  configureCloudMutateBridge({
    outbox: wrappedOutbox,
    getRevision: getCloudSyncRevision,
    flush: () => runtime?.flushOutbox(),
    getActorId: () => String(
      clinicalSessionContext.user?.user_id || clinicalSessionContext.user?.username || "mobile"
    )
  });
  void runtime.syncCycle();
  _runtime = runtime;
  return runtime;
}
function stopCloudMobileRuntime() {
  stopCloudSyncRuntime();
  _runtime = null;
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
        const { pullClinicalOpsForSala } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-OIZMGMMD.js");
        await pullClinicalOpsForSala(sala, { since: 0 });
      }
    } catch {
    }
    try {
      const access = await import("/mobile/js/chunks/clinical-access-runtime-AE6KBGJD.js");
      if (typeof access.finalizeMobileLanPatientCensus === "function") {
        await access.finalizeMobileLanPatientCensus();
      }
    } catch {
    }
    await notifyIfCloudMobileCensusEmpty(toast2);
    showCloudMobileEmptyCensusBanner();
    try {
      const patientsMod = await import("/mobile/js/chunks/patients-DT4CP2TY.js");
      patientsMod.renderPatientList();
    } catch {
    }
  } catch {
    toast2("No se pudo sincronizar con la nube. Revisa la red e intenta de nuevo.", "error");
  }
  document.dispatchEvent(new CustomEvent("rpc-cloud-mobile-ready"));
}
function isCloudMobileBoot() {
  return isCloudMobileClient() && isMobileWeb();
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
  if (getCloudSyncToken()) {
    showCloudMobileConnecting(gate);
    const room = await resolveCloudMobileActiveRoom();
    if (room?.id) {
      await runCloudMobilePostConnect(gate, toast2);
      return;
    }
  }
  mountCloudMobileLoginShell(gate, { onConnected });
}
export {
  initCloudMobileBoot,
  isCloudMobileBoot,
  suppressCloudMobileLocalServerAlerts
};
//# sourceMappingURL=/js/chunks/boot-AMIS6KN4.js.map

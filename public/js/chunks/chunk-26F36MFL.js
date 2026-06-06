import {
  CLINICAL_SALAS,
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  filterJoinedTeams,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername,
  safeRenderClinicalTeamsPanel
} from "/js/chunks/chunk-N7JQFGRQ.js";
import {
  isDbMode
} from "/js/chunks/chunk-K6QXHWFW.js";
import {
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  CLINICAL_LAN_PROFILE_GATE_LEAD_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  bundledWardShiftPin,
  ensureLanProfileGateDeviceReset,
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  isLegacyMachineUsername,
  isLocalOnlyPlaceholderUsername,
  isValidUsernameFormat,
  needsClinicalLanProfileGate,
  normalizeUsername,
  persistClinicalUserBinding,
  readRpcSettings,
  setClinicalSyncModeLocalOnly
} from "/js/chunks/chunk-2VRIL4MF.js";

// public/js/features/clinical-onboarding-shell.mjs
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function buildOnboardingStageHtml({ title, leadHtml, bodyHtml }) {
  return `
    <div class="clinical-onboarding-stage">
      <div class="clinical-onboarding-stage-inner">
        <h3 class="clinical-onboarding-title">${escapeHtml(title)}</h3>
        <div class="clinical-onboarding-lead">${leadHtml}</div>
        ${bodyHtml}
      </div>
    </div>`;
}
var MODE_LAN_ICON = `<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>`;
var MODE_LOCAL_ICON = `<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`;
function buildSyncModeChoiceBodyHtml() {
  return `
        <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
          <button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--primary" data-sync-mode="lan">
            <span class="clinical-onboard-mode-card-head">
              ${MODE_LAN_ICON}
              <span class="clinical-onboard-mode-card-title">Guardia en red (LAN)</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Usuario @usuario, sala, sincronizaci\xF3n en vivo con el equipo y <strong>Mi rotaci\xF3n</strong>.</span>
          </button>
          <button type="button" class="clinical-onboard-mode-card" data-sync-mode="local">
            <span class="clinical-onboard-mode-card-head">
              ${MODE_LOCAL_ICON}
              <span class="clinical-onboard-mode-card-title">Solo este equipo</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Sin LAN ni LiveSync: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>
          </button>
        </div>`;
}

// public/js/features/clinical-onboarding-sync-mode.mjs
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function escapeHtml2(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml2(s).replace(/"/g, "&quot;");
}
function localOnlyUsernameForUserId(userId) {
  const tail = String(userId || "").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-10) || "device";
  return `local_${tail}`.slice(0, 32);
}
function renderSyncModeChoicePanel(host) {
  host.innerHTML = buildOnboardingStageHtml({
    title: "\xBFC\xF3mo usar\xE1s R+?",
    leadHtml: "<p>Elige antes de configurar tu perfil. La elecci\xF3n queda guardada en este equipo.</p>",
    bodyHtml: buildSyncModeChoiceBodyHtml()
  });
}
function renderLocalOnlyProfilePanel(host, settings) {
  const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || "R1");
  const prefilledName = String(
    settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ""
  );
  host.innerHTML = buildOnboardingStageHtml({
    title: "Perfil local",
    leadHtml: "<p>R+ no usar\xE1 red de guardia. Solo necesitamos c\xF3mo firmar notas y documentos en esta Mac.</p>",
    bodyHtml: `
      <div class="clinical-onboard-form-shell clinical-onboard-form-shell--narrow">
        <form id="clinical-onboard-local-form" class="clinical-teams-create-form clinical-onboard-form clinical-onboard-form--local">
          <div class="field-group">
            <label for="onboard-local-name">Tu nombre en notas *</label>
            <input id="onboard-local-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${escapeAttr(prefilledName)}" required autocomplete="name">
          </div>
          <div class="field-group">
            <label for="onboard-local-rank">Rango (opcional)</label>
            <select id="onboard-local-rank" class="profile-input">
              <option value="R1" ${rank === "R1" ? "selected" : ""}>R1</option>
              <option value="R2" ${rank === "R2" ? "selected" : ""}>R2</option>
              <option value="R3" ${rank === "R3" ? "selected" : ""}>R3</option>
              <option value="R4" ${rank === "R4" ? "selected" : ""}>R4</option>
            </select>
          </div>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Continuar sin LAN</button>
            <button type="button" id="clinical-onboard-back-mode" class="btn-med-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>`
  });
}
async function refreshOnboardingHost() {
  const { refreshMainClinicalOnboardingIfNeeded } = await import("/js/chunks/clinical-onboarding-main-HGOKWVF5.js");
  await refreshMainClinicalOnboardingIfNeeded();
}
async function handleSyncModeChoice(mode) {
  if (mode === "local") setClinicalSyncModeLocalOnly(true);
  else if (mode === "lan") setClinicalSyncModeLocalOnly(false);
  else return;
  await refreshOnboardingHost();
}
async function handleSyncModeBack() {
  const settings = readRpcSettings();
  delete settings.clinicalLocalOnly;
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settings));
  } catch (_e) {
  }
  await refreshOnboardingHost();
}
async function handleLocalOnlyProfileSubmit(ev) {
  ev.preventDefault();
  const name = String(document.getElementById("onboard-local-name")?.value || "").trim();
  const rank = String(document.getElementById("onboard-local-rank")?.value || "R1");
  const errEl = document.getElementById("onboard-error");
  if (!name) {
    if (errEl) {
      errEl.textContent = "Escribe c\xF3mo quieres aparecer en notas y documentos.";
      errEl.hidden = false;
    }
    return;
  }
  const api = dbApi();
  const sessionUserId = String(clinicalSessionContext.user?.user_id || "");
  if (!sessionUserId || !api) {
    toast("Sesi\xF3n cl\xEDnica no disponible.", "error");
    return;
  }
  const localHandle = localOnlyUsernameForUserId(sessionUserId);
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || "");
  if (currentHandle !== localHandle && typeof api.dbClinicalUsernameClaim === "function") {
    const claimRes = await api.dbClinicalUsernameClaim({
      userId: sessionUserId,
      username: localHandle
    });
    if (!claimRes?.ok && !/ya está en uso/i.test(String(claimRes?.error || ""))) {
      if (errEl) {
        errEl.textContent = claimRes?.error || "No se pudo guardar el perfil local.";
        errEl.hidden = false;
      }
      return;
    }
    if (claimRes?.ok && clinicalSessionContext.user) {
      clinicalSessionContext.user.username = localHandle;
    }
  }
  if (typeof api.dbClinicalProfileUpsert === "function") {
    const profileRes = await api.dbClinicalProfileUpsert({
      userId: sessionUserId,
      clinicalName: name,
      rank,
      sala: null,
      isProgramAdmin: false
    });
    if (!profileRes?.ok) {
      if (errEl) {
        errEl.textContent = profileRes?.error || "No se guard\xF3 el perfil.";
        errEl.hidden = false;
      }
      return;
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.rank = rank;
      clinicalSessionContext.user.clinical_name = name;
      clinicalSessionContext.user.sala = null;
      clinicalSessionContext.user.is_program_admin = 0;
    }
  }
  persistClinicalUserBinding({
    userId: sessionUserId,
    username: localHandle,
    displayName: name,
    rank,
    sala: "",
    registered: true,
    lanProfileGateComplete: true,
    isProgramAdmin: false
  });
  setClinicalSyncModeLocalOnly(true);
  if (errEl) errEl.hidden = true;
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  toast("Listo. R+ queda solo en este equipo, sin sincronizaci\xF3n LAN.", "success");
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
  const localForm = document.getElementById("clinical-onboard-local-form");
  if (localForm && !localForm._rpcLocalWired) {
    localForm._rpcLocalWired = true;
    localForm.addEventListener("submit", (ev) => void handleLocalOnlyProfileSubmit(ev));
  }
  const backModeBtn = document.getElementById("clinical-onboard-back-mode");
  if (backModeBtn && !backModeBtn._rpcBackModeWired) {
    backModeBtn._rpcBackModeWired = true;
    backModeBtn.addEventListener("click", () => void handleSyncModeBack());
  }
}

// public/js/features/clinical-onboarding.mjs
function dbApi2() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast2(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function getClientId() {
  try {
    const settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    return String(settings.clientId || "");
  } catch (_e) {
    return "";
  }
}
function needsUsernameClaim() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return true;
  if (isLegacyMachineUsername(user.username, getClientId())) return true;
  try {
    const settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    const cached = String(settings.clinicalUsername || "").trim();
    if (cached && !isValidUsernameFormat(normalizeUsername(cached))) return true;
    if (cached && isLegacyMachineUsername(user.username, getClientId())) return true;
  } catch (_e) {
  }
  const handle = normalizeUsername(user.username || "");
  return !isValidUsernameFormat(handle);
}
function needsTeamOnboarding() {
  if (!clinicalSessionContext.user?.user_id) return true;
  const teams = clinicalSessionContext.teams || [];
  return filterJoinedTeams(teams, clinicalSessionContext.user).length === 0;
}
function needsClinicalSyncModeChoice() {
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  if (settings.clinicalRegistered === true) return false;
  if (isClinicalSyncModeChosen(settings)) return false;
  return true;
}
function needsProfileOnboarding() {
  if (!isDbMode()) return false;
  if (!clinicalSessionContext.user?.user_id) return true;
  if (needsClinicalSyncModeChoice()) return true;
  const settings = readRpcSettings();
  if (isClinicalLocalOnlyMode(settings)) {
    if (settings.clinicalRegistered !== true) return true;
    const name2 = String(clinicalSessionContext.user?.clinical_name || "").trim();
    return !name2;
  }
  if (needsClinicalLanProfileGate(settings)) return true;
  if (isLocalOnlyPlaceholderUsername(clinicalSessionContext.user?.username)) return true;
  if (needsUsernameClaim()) return true;
  const name = String(clinicalSessionContext.user?.clinical_name || "").trim();
  if (!name) return true;
  const sala = String(clinicalSessionContext.user?.sala || "").trim();
  if (!sala) return true;
  return false;
}
function needsClinicalOnboarding() {
  return needsProfileOnboarding();
}
function escapeHtml3(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr2(s) {
  return escapeHtml3(s).replace(/"/g, "&quot;");
}
async function handleUsernameStepSubmit(ev) {
  ev.preventDefault();
  const username = normalizeUsername(
    String(document.getElementById("onboard-username")?.value || "")
  );
  const name = String(document.getElementById("onboard-clinical-name")?.value || "").trim();
  let rank = String(document.getElementById("onboard-rank")?.value || "R1");
  const sala = String(document.getElementById("onboard-sala")?.value || "").trim();
  const errEl = document.getElementById("onboard-error");
  if (!isValidUsernameFormat(username)) {
    if (errEl) {
      errEl.textContent = "Usuario LAN inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _), p. ej. drmendoza \u2014 no tu nombre en guardia.";
      errEl.hidden = false;
    }
    return;
  }
  if (!name) {
    if (errEl) {
      errEl.textContent = "Escribe tu nombre en guardia.";
      errEl.hidden = false;
    }
    return;
  }
  let settings = readRpcSettings();
  let sessionUserId = String(clinicalSessionContext.user?.user_id || "");
  const api = dbApi2();
  if (!sessionUserId || !api) {
    toast2("Sesi\xF3n cl\xEDnica no disponible.", "error");
    return;
  }
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || "");
  const needsClaim = currentHandle !== username;
  if (needsClaim) {
    const { assertLanRoomForUsernameRegister } = await import("/js/chunks/clinical-profile-lan-sync-UFU7GJY3.js");
    await assertLanRoomForUsernameRegister({ sala });
  }
  if (needsClaim && typeof api.dbClinicalUsernameClaim === "function") {
    const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username });
    if (!claimRes?.ok) {
      const errMsg = String(claimRes?.error || "");
      if (/ya está en uso/i.test(errMsg)) {
        const cached = normalizeUsername(String(settings.clinicalUsername || ""));
        const autoResume = cached === username;
        const resume = autoResume || window.confirm(
          `El usuario @${username} ya est\xE1 registrado en esta base de datos.

\xBFRecuperar tu cuenta en este dispositivo?`
        );
        if (resume) {
          const resumeRes = await resumeClinicalIdentityByUsername(
            username,
            settings,
            getClientId()
          );
          if (!resumeRes.ok) {
            if (errEl) {
              errEl.textContent = resumeRes.error || errMsg;
              errEl.hidden = false;
            }
            return;
          }
          sessionUserId = String(clinicalSessionContext.user?.user_id || "");
          settings = readRpcSettings();
        } else {
          if (errEl) {
            errEl.textContent = errMsg;
            errEl.hidden = false;
          }
          return;
        }
      } else {
        if (errEl) {
          errEl.textContent = errMsg || "No se pudo registrar el usuario.";
          errEl.hidden = false;
        }
        return;
      }
    } else if (clinicalSessionContext.user) {
      clinicalSessionContext.user.username = username;
    }
  }
  if (typeof api.dbClinicalProfileUpsert === "function") {
    const profileRes = await api.dbClinicalProfileUpsert({
      userId: sessionUserId,
      clinicalName: name,
      rank,
      sala: sala || null,
      isProgramAdmin: false
    });
    if (!profileRes?.ok) {
      if (errEl) {
        errEl.textContent = profileRes?.error || "No se guard\xF3 el perfil.";
        errEl.hidden = false;
      }
      return;
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.rank = rank;
      clinicalSessionContext.user.clinical_name = name;
      clinicalSessionContext.user.sala = sala || null;
      clinicalSessionContext.user.is_program_admin = 0;
    }
  }
  persistClinicalUserBinding({
    userId: sessionUserId,
    username,
    displayName: name,
    rank,
    sala: sala || "",
    registered: true,
    lanProfileGateComplete: true,
    isProgramAdmin: false
  });
  const shiftPin = String(document.getElementById("onboard-shift-pin")?.value || "").trim();
  if (shiftPin && !isClinicalLocalOnlyMode()) {
    const { connectLanWithShiftPin } = await import("/js/chunks/lan-shift-pin-connect-5PFKCDE4.js");
    const connected = await connectLanWithShiftPin(shiftPin, { sala });
    if (!connected) {
      toast2(
        "No se encontr\xF3 anfitri\xF3n con ese PIN del turno. Revisa Wi\u2011Fi o pide un PIN nuevo al R4.",
        "warning"
      );
    }
  }
  if (errEl) errEl.hidden = true;
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  const {
    flushClinicalProfileToLan,
    LAN_PROFILE_PUSH_FAILED_MSG,
    LAN_PROFILE_NEEDS_CONNECT_MSG,
    isBenignLanPushSkipCode,
    isLanProfileNeedsConnectCode,
    notifyLanProfilePushResult
  } = await import("/js/chunks/clinical-profile-lan-sync-UFU7GJY3.js");
  const lanPush = await flushClinicalProfileToLan({
    sala: sala || clinicalSessionContext.user?.sala
  });
  notifyLanProfilePushResult(lanPush, toast2);
  const localOnly = isClinicalLocalOnlyMode();
  if (!localOnly && !lanPush.ok && isLanProfileNeedsConnectCode(lanPush.code)) {
    toast2(LAN_PROFILE_NEEDS_CONNECT_MSG, "info");
    const rot = await import("/js/chunks/clinical-rotation-entry-TNO55QPG.js");
    rot.syncClinicalRotationEntryChrome();
    const { refreshMainClinicalOnboardingIfNeeded: refreshMainClinicalOnboardingIfNeeded2 } = await import("/js/chunks/clinical-onboarding-main-HGOKWVF5.js");
    await refreshMainClinicalOnboardingIfNeeded2();
    return;
  }
  if (!lanPush.ok && !isBenignLanPushSkipCode(lanPush.code) && !(lanPush.channels && lanPush.channels.outbox)) {
    toast2(LAN_PROFILE_PUSH_FAILED_MSG, "warning");
  } else if (lanPush.ok && needsClaim) {
    toast2("Perfil guardado y @usuario publicado en la sala \u21C4.", "success");
  } else {
    toast2(
      "Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.",
      "success"
    );
  }
  const { refreshMainClinicalOnboardingIfNeeded } = await import("/js/chunks/clinical-onboarding-main-HGOKWVF5.js");
  await refreshMainClinicalOnboardingIfNeeded();
}
async function handleResumeIdentityClick() {
  const username = normalizeUsername(
    String(document.getElementById("onboard-username")?.value || "")
  );
  const errEl = document.getElementById("onboard-error");
  const resumeBtn = document.getElementById("clinical-onboard-resume-btn");
  if (!isValidUsernameFormat(username)) {
    if (errEl) {
      errEl.textContent = "Escribe tu usuario LAN para recuperarlo.";
      errEl.hidden = false;
    }
    return;
  }
  if (resumeBtn instanceof HTMLButtonElement) {
    resumeBtn.disabled = true;
    resumeBtn.textContent = "Recuperando\u2026";
  }
  const settings = readRpcSettings();
  try {
    const resumeRes = await resumeClinicalIdentityByUsername(
      username,
      settings,
      getClientId()
    );
    if (!resumeRes.ok) {
      if (errEl) {
        errEl.textContent = resumeRes.error || "No se pudo recuperar la cuenta.";
        errEl.hidden = false;
      }
      return;
    }
    if (errEl) errEl.hidden = true;
    toast2("Cuenta recuperada.", "success");
    await refreshClinicalUserProfile();
    if (!needsUsernameClaim()) {
      const { refreshMainClinicalOnboardingIfNeeded: refreshMainClinicalOnboardingIfNeeded2 } = await import("/js/chunks/clinical-onboarding-main-HGOKWVF5.js");
      await refreshMainClinicalOnboardingIfNeeded2();
      return;
    }
    toast2("Completa tu perfil y pulsa Continuar.", "info");
    const { refreshMainClinicalOnboardingIfNeeded } = await import("/js/chunks/clinical-onboarding-main-HGOKWVF5.js");
    await refreshMainClinicalOnboardingIfNeeded();
  } finally {
    if (resumeBtn instanceof HTMLButtonElement) {
      resumeBtn.disabled = false;
      resumeBtn.textContent = "Recuperar mi usuario";
    }
  }
}
async function wireOnboardingInteractions() {
  wireSyncModeOnboardingInteractions();
  const form = document.getElementById("clinical-onboard-username-form");
  if (form && !form._rpcOnboardWired) {
    form._rpcOnboardWired = true;
    form.addEventListener("submit", (ev) => void handleUsernameStepSubmit(ev));
  }
  const resumeBtn = document.getElementById("clinical-onboard-resume-btn");
  if (resumeBtn && !resumeBtn._rpcResumeWired) {
    resumeBtn._rpcResumeWired = true;
    resumeBtn.addEventListener("click", () => void handleResumeIdentityClick());
  }
}
async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderOnboardingPanelInto(host);
  });
}
async function renderOnboardingPanelInto(host) {
  const userId = String(clinicalSessionContext.user?.user_id || "");
  if (!userId) {
    if (needsClinicalSyncModeChoice()) {
      renderSyncModeChoicePanel(host);
      await wireOnboardingInteractions();
      return;
    }
    const { buildOnboardingSessionBlockHtml } = await import("/js/chunks/clinical-onboarding-main-HGOKWVF5.js");
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    return;
  }
  await fetchClinicalTeamsFromDb();
  let settings = ensureLanProfileGateDeviceReset(readRpcSettings());
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const cachedUsername = profileGatePending ? "" : normalizeUsername(String(settings.clinicalUsername || ""));
  if (!profileGatePending && needsUsernameClaim() && cachedUsername && isValidUsernameFormat(cachedUsername)) {
    try {
      await resumeClinicalIdentityByUsername(cachedUsername, settings, getClientId());
      await refreshClinicalUserProfile();
      settings = readRpcSettings();
    } catch (_e) {
    }
  }
  if (!needsProfileOnboarding()) {
    const { hideMainClinicalOnboarding } = await import("/js/chunks/clinical-onboarding-main-HGOKWVF5.js");
    hideMainClinicalOnboarding();
    if (host.closest("#clinical-teams-panel-body")) {
      const { renderClinicalTeamsPanel } = await import("/js/chunks/clinical-teams-QWHJMA3X.js");
      await renderClinicalTeamsPanel();
    }
    return;
  }
  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    await wireOnboardingInteractions();
    return;
  }
  if (isClinicalLocalOnlyMode(settings)) {
    renderLocalOnlyProfilePanel(host, settings);
    await wireOnboardingInteractions();
    return;
  }
  {
    const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || "R1");
    const prefilledName = profileGatePending ? "" : String(settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || "");
    const prefilledSala = String(
      settings.clinicalSala || clinicalSessionContext.user?.sala || ""
    );
    const prefilledShiftPin = bundledWardShiftPin();
    const gateLead = profileGatePending ? `<p class="clinical-onboard-gate-lead">${CLINICAL_LAN_PROFILE_GATE_LEAD_HTML}</p>` : "<p>Confirma tu usuario LAN, nombre en guardia, rango y rotaci\xF3n. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>";
    host.innerHTML = buildOnboardingStageHtml({
      title: "Configura tu rotaci\xF3n",
      leadHtml: gateLead,
      bodyHtml: `
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <div class="field-group">
            <label for="onboard-username">Usuario LAN (@usuario) *</label>
            <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
              value="${escapeAttr2(cachedUsername)}" required autocomplete="off" spellcheck="false">
            <p class="clinical-teams-hint">${CLINICAL_LAN_USERNAME_HINT_HTML}</p>
          </div>
          <div class="field-group">
            <label for="onboard-clinical-name">Nombre en guardia *</label>
            <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${escapeAttr2(prefilledName)}" required autocomplete="name">
            <p class="clinical-teams-hint">${CLINICAL_LAN_DISPLAY_NAME_HINT_HTML}</p>
          </div>
          <div class="field-group">
            <label for="onboard-rank">Rango</label>
            <select id="onboard-rank" class="profile-input">
              <option value="R1" ${rank === "R1" ? "selected" : ""}>R1</option>
              <option value="R2" ${rank === "R2" ? "selected" : ""}>R2</option>
              <option value="R3" ${rank === "R3" ? "selected" : ""}>R3</option>
              <option value="R4" ${rank === "R4" ? "selected" : ""}>R4</option>
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-sala">Rotaci\xF3n *</label>
            <select id="onboard-sala" class="profile-input" required>
              <option value="">\u2014 Seleccionar \u2014</option>
              ${CLINICAL_SALAS.map(
        (s) => `<option value="${escapeAttr2(s)}" ${prefilledSala === s ? "selected" : ""}>${escapeHtml3(s)}</option>`
      ).join("")}
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-shift-pin">PIN del turno (\u21C4)</label>
            <input id="onboard-shift-pin" type="text" class="profile-input" inputmode="numeric"
              pattern="[0-9]{6}" maxlength="6" placeholder="6 d\xEDgitos del anfitri\xF3n" autocomplete="off"
              value="${escapeAttr2(prefilledShiftPin)}">
            <p class="clinical-teams-hint">6 d\xEDgitos del anfitri\xF3n (\u21C4). R+ conecta solo; si cambias de Wi\u2011Fi, vuelve a usar el mismo PIN.</p>
          </div>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Guardar perfil</button>
            <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
          </div>
        </form>
      </div>`
    });
    await wireOnboardingInteractions();
  }
}

export {
  buildOnboardingStageHtml,
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions,
  needsUsernameClaim,
  needsTeamOnboarding,
  needsClinicalSyncModeChoice,
  needsProfileOnboarding,
  needsClinicalOnboarding,
  renderOnboardingPanel,
  renderOnboardingPanelInto
};
//# sourceMappingURL=/js/chunks/chunk-26F36MFL.js.map

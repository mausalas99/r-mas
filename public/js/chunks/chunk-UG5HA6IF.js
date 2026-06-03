import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  filterJoinedTeams,
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername,
  safeRenderClinicalTeamsPanel
} from "./chunk-PHT2PF6H.js";
import {
  isDbMode
} from "./chunk-KO7MM5UR.js";
import {
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
  readRpcSettings
} from "./chunk-YXT3MYSD.js";

// public/js/features/clinical-onboarding.mjs
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast(msg, type = "info") {
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
function needsProfileOnboarding() {
  if (!isDbMode()) return false;
  if (!clinicalSessionContext.user?.user_id) return true;
  if (needsClinicalLanProfileGate(readRpcSettings())) return true;
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
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
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
      errEl.textContent = "Usuario inv\xE1lido (3\u201332 caracteres, min\xFAsculas).";
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
  const api = dbApi();
  if (!sessionUserId || !api) {
    toast("Sesi\xF3n cl\xEDnica no disponible.", "error");
    return;
  }
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || "");
  const needsClaim = currentHandle !== username;
  if (needsClaim) {
    const { assertLanRoomForUsernameRegister } = await import("./clinical-profile-lan-sync-DTH4T3IJ.js");
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
  if (errEl) errEl.hidden = true;
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  const {
    flushClinicalProfileToLan,
    LAN_PROFILE_PUSH_FAILED_MSG,
    isBenignLanPushSkipCode,
    notifyLanProfilePushResult
  } = await import("./clinical-profile-lan-sync-DTH4T3IJ.js");
  const lanPush = await flushClinicalProfileToLan();
  notifyLanProfilePushResult(lanPush, toast);
  if (!lanPush.ok && !isBenignLanPushSkipCode(lanPush.code) && !(lanPush.channels && lanPush.channels.outbox)) {
    toast(LAN_PROFILE_PUSH_FAILED_MSG, "warning");
  } else if (lanPush.ok && needsClaim) {
    toast("Perfil guardado y @usuario publicado en la sala \u21C4.", "success");
  } else {
    toast(
      "Perfil guardado. Abre Mi rotaci\xF3n cuando quieras buscar equipos o crear el tuyo.",
      "success"
    );
  }
  const { refreshMainClinicalOnboardingIfNeeded } = await import("./clinical-onboarding-main-U6VVNAB5.js");
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
    toast("Cuenta recuperada.", "success");
    await refreshClinicalUserProfile();
    if (!needsUsernameClaim()) {
      const { refreshMainClinicalOnboardingIfNeeded: refreshMainClinicalOnboardingIfNeeded2 } = await import("./clinical-onboarding-main-U6VVNAB5.js");
      await refreshMainClinicalOnboardingIfNeeded2();
      return;
    }
    toast("Completa tu perfil y pulsa Continuar.", "info");
    const { refreshMainClinicalOnboardingIfNeeded } = await import("./clinical-onboarding-main-U6VVNAB5.js");
    await refreshMainClinicalOnboardingIfNeeded();
  } finally {
    if (resumeBtn instanceof HTMLButtonElement) {
      resumeBtn.disabled = false;
      resumeBtn.textContent = "Recuperar mi usuario";
    }
  }
}
async function wireOnboardingInteractions() {
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
    host.innerHTML = '<p class="clinical-teams-lead">Activa la sesi\xF3n cl\xEDnica para continuar.</p>';
    return;
  }
  await fetchClinicalTeamsFromDb();
  let settings = readRpcSettings();
  const cachedUsername = normalizeUsername(String(settings.clinicalUsername || ""));
  if (!needsClinicalLanProfileGate(settings) && needsUsernameClaim() && cachedUsername && isValidUsernameFormat(cachedUsername)) {
    try {
      await resumeClinicalIdentityByUsername(cachedUsername, settings, getClientId());
      await refreshClinicalUserProfile();
      settings = readRpcSettings();
    } catch (_e) {
    }
  }
  if (!needsProfileOnboarding()) {
    const { hideMainClinicalOnboarding } = await import("./clinical-onboarding-main-U6VVNAB5.js");
    hideMainClinicalOnboarding();
    if (host.closest("#clinical-teams-panel-body")) {
      const { renderClinicalTeamsPanel } = await import("./clinical-teams-C7U4OBQQ.js");
      await renderClinicalTeamsPanel();
    }
    return;
  }
  {
    const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || "R1");
    const prefilledName = String(
      settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ""
    );
    const prefilledSala = String(
      settings.clinicalSala || clinicalSessionContext.user?.sala || ""
    );
    host.innerHTML = `
      <h3 class="clinical-onboarding-title">Configura tu rotaci\xF3n</h3>
      <h4 class="clinical-teams-section-title">Rango y rotaci\xF3n</h4>
      <p class="clinical-teams-lead">Confirma tu <strong>usuario LAN</strong>, nombre en guardia, rango y sala para aparecer en el directorio y que el admin pueda asignarte a equipos. Es obligatorio tras actualizar a 5.5.7. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>
      <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form">
        <div class="field-group">
          <label for="onboard-username">Usuario LAN *</label>
          <input id="onboard-username" type="text" class="profile-input" placeholder="mgarcia"
            value="${escapeAttr(cachedUsername || "")}" required>
        </div>
        <div class="field-group">
          <label for="onboard-clinical-name">Nombre en guardia *</label>
          <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="Dr. P\xE9rez"
            value="${escapeAttr(prefilledName)}" required>
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
          <label for="onboard-sala">Sala *</label>
          <select id="onboard-sala" class="profile-input" required>
            <option value="">\u2014 Seleccionar \u2014</option>
            <option value="Sala 1" ${prefilledSala === "Sala 1" ? "selected" : ""}>Sala 1</option>
            <option value="Sala 2" ${prefilledSala === "Sala 2" ? "selected" : ""}>Sala 2</option>
            <option value="Sala E" ${prefilledSala === "Sala E" ? "selected" : ""}>Sala E</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Guardar perfil</button>
          <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
        </div>
      </form>`;
    await wireOnboardingInteractions();
  }
}

export {
  needsUsernameClaim,
  needsTeamOnboarding,
  needsProfileOnboarding,
  needsClinicalOnboarding,
  renderOnboardingPanel,
  renderOnboardingPanelInto
};
//# sourceMappingURL=chunk-UG5HA6IF.js.map

import {
  loadCutoverSnapshot,
  shouldShowCutoverWizard
} from "/mobile/js/chunks/chunk-64GPJDUL.js";
import {
  isCutoverDone,
  isCutoverPending,
  setCutoverFlag
} from "/mobile/js/chunks/chunk-36QQC646.js";
import {
  localOnlyUsernameForUserId,
  needsExistingAccountLogin,
  registerCloudDuringOnboarding,
  renderExistingAccountLoginPanel,
  renderSyncModeChoicePanel,
  tryResumeOnboardingFromStoredCloudToken,
  wireExistingAccountLoginInteractions,
  wireOnboardingModeBackButtons,
  wireSyncModeOnboardingInteractions
} from "/mobile/js/chunks/chunk-DIWOGDCA.js";
import {
  buildOnboardingStageHtml
} from "/mobile/js/chunks/chunk-JAVEC37I.js";
import {
  isLanSkipShiftPin
} from "/mobile/js/chunks/chunk-2DZ4BCVC.js";
import {
  CLINICAL_SALAS,
  clearCloudSalaUpgradePending,
  fetchClinicalTeamsFromDb,
  getClientId,
  isCloudSalaUpgradePending,
  lookupClinicalUserByUsername,
  needsClinicalSyncModeChoice,
  needsLocalOnlyProfile,
  needsProfileOnboarding,
  needsTeamOnboardingStep,
  needsUsernameClaim,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import {
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  CLINICAL_LAN_PROFILE_GATE_LEAD_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  ensureLanProfileGateDeviceReset,
  isClinicalLocalOnlyMode,
  isLegacyMachineUsername,
  isValidUsernameFormat,
  needsClinicalLanProfileGate,
  normalizeUsername,
  persistClinicalUserBinding,
  readRpcSettings,
  setClinicalSyncModeLocalOnly,
  shouldClaimClinicalUsername
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  escapeAttr,
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  isCloudSala,
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncToken,
  getCloudSyncUrl
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/clinical-onboarding-nube.mjs
function shouldShowNubePasswordField(sala) {
  return isCloudSala(sala);
}
function buildCutoverPickerHtml() {
  if (!isCutoverPending()) return "";
  const snap = loadCutoverSnapshot();
  const users = Array.isArray(snap?.users) ? snap.users : [];
  if (!users.length) {
    return '<p class="clinical-teams-hint clinical-onboard-cutover-hint">No hab\xEDa usuarios guardados en la captura. Crea uno nuevo abajo.</p>';
  }
  const items = users.map((u) => {
    const un = escapeAttr(u.username || "");
    return '<li><button type="button" class="cloud-sync-cutover-pick clinical-onboard-cutover-pick" data-onboard-pick-user="' + un + '" data-display="' + escapeAttr(u.displayName || "") + '" data-rank="' + escapeAttr(u.rank || "R1") + '" data-sala="' + escapeAttr(u.sala || "") + '"><span class="cloud-sync-cutover-pick-user">@' + escapeHtml(u.username || "") + '</span><span class="cloud-sync-cutover-pick-meta">' + escapeHtml(u.displayName || "\u2014") + " \xB7 " + escapeHtml(u.rank || "") + " \xB7 " + escapeHtml(u.sala || "") + "</span></button></li>";
  }).join("");
  return '<div class="clinical-onboard-cutover-block"><p class="clinical-onboard-cutover-lead">Usuarios anteriores en este equipo \u2014 pulsa uno para rellenarlo:</p><ul class="cloud-sync-cutover-list clinical-onboard-cutover-list">' + items + "</ul></div>";
}
function buildNubePasswordFieldHtml(prefilledSala) {
  const show = shouldShowNubePasswordField(prefilledSala);
  const upgrade = isCloudSalaUpgradePending();
  return '<div class="field-group clinical-onboard-nube-field" id="onboard-nube-field" ' + (show ? "" : "hidden") + '><label for="onboard-nube-password">Contrase\xF1a Nube *</label><input id="onboard-nube-password" type="password" class="profile-input" autocomplete="new-password" minlength="10" ' + (show ? "required" : "") + ' placeholder="m\xEDn. 10 caracteres"><p class="clinical-teams-hint">' + (upgrade ? "Tu rotaci\xF3n ahora es Sala/Torre: crea tu cuenta Nube con esta contrase\xF1a (misma @usuario)." : "Obligatoria en <strong>Sala</strong> / <strong>Torre HU</strong>. URL: ") + (upgrade ? "" : escapeHtml(getCloudSyncUrl())) + '</p><p id="onboard-nube-status" class="clinical-teams-hint" aria-live="polite"></p></div>';
}
function syncOnboardingNubeVisibility(root = document) {
  const salaEl = root.querySelector?.("#onboard-sala") || document.getElementById("onboard-sala");
  const nube = root.querySelector?.("#onboard-nube-field") || document.getElementById("onboard-nube-field");
  const pinGroup = document.getElementById("onboard-shift-pin")?.closest(".field-group");
  const sala = normalizeCloudSala(salaEl?.value || "");
  const cloud = isCloudSala(sala);
  if (nube) {
    nube.hidden = !cloud;
    const pass = nube.querySelector("#onboard-nube-password");
    if (pass) {
      if (cloud) pass.setAttribute("required", "");
      else pass.removeAttribute("required");
    }
  }
  if (pinGroup) pinGroup.hidden = cloud;
}
function readOnboardingNubeFields(root = document) {
  const pass = root.querySelector?.("#onboard-nube-password") || document.getElementById("onboard-nube-password");
  return {
    password: String(pass?.value || ""),
    mode: "register"
  };
}
function applyOnboardPickUser(btn) {
  if (!(btn instanceof HTMLElement)) return;
  const username = btn.getAttribute("data-onboard-pick-user") || "";
  const display = btn.getAttribute("data-display") || "";
  const rank = btn.getAttribute("data-rank") || "R1";
  const sala = btn.getAttribute("data-sala") || "";
  const u = document.getElementById("onboard-username");
  const n = document.getElementById("onboard-clinical-name");
  const r = document.getElementById("onboard-rank");
  const s = document.getElementById("onboard-sala");
  if (u) u.value = username;
  if (n) n.value = display;
  if (r && rank) r.value = rank;
  if (s && sala) {
    const opt = [...s.options].find((o) => o.value === sala || o.value.includes(sala.split(" ")[0]));
    if (opt) s.value = opt.value;
    else if ([...s.options].some((o) => o.value === sala)) s.value = sala;
  }
  syncOnboardingNubeVisibility();
}

// public/js/features/cloud-sync/cutover-claim.mjs
async function defaultAssignPatientToTeam(patientId, teamId) {
  const { assignPatientToTeamClinical } = await import("/mobile/js/chunks/patient-team-assign-ui-DCHDU4JB.js");
  return assignPatientToTeamClinical(patientId, teamId);
}
async function claimPatientsToTeam(patientIds, teamId, deps = {}) {
  const tid = String(teamId || "").trim();
  const assign = typeof deps.assign === "function" ? deps.assign : defaultAssignPatientToTeam;
  const errors = [];
  let claimed = 0;
  if (!tid) return { claimed: 0, errors: ["Sin equipo"] };
  for (const rawId of patientIds || []) {
    const pid = String(rawId || "").trim();
    if (!pid) continue;
    try {
      const res = await assign(pid, tid);
      if (res && res.ok === false) errors.push(pid);
      else if (res === false) errors.push(pid);
      else claimed += 1;
    } catch (err) {
      errors.push(pid + ": " + (err?.message || "error"));
    }
  }
  return { claimed, errors };
}
function filterSnapshotPatients(snapshot, filter = {}) {
  const patients = Array.isArray(snapshot?.patients) ? snapshot.patients : [];
  const username = String(filter.username || "").trim().toLowerCase();
  const teamId = String(filter.teamId || "").trim();
  return patients.filter((p) => {
    if (teamId && String(p.teamId || "") === teamId) return true;
    if (username && String(p.ownerUsername || "").toLowerCase() === username) return true;
    if (!username && !teamId) return true;
    if (username && !teamId) {
      const teams = Array.isArray(snapshot?.teams) ? snapshot.teams : [];
      const myTeams = new Set(
        teams.filter((t) => (t.memberUsernames || []).includes(username)).map((t) => t.teamId)
      );
      return myTeams.has(String(p.teamId || ""));
    }
    return false;
  });
}

// public/js/features/clinical-onboarding-cloud-finish.mjs
async function finishOnboardingCloudAndCutover(ctx) {
  const sala = ctx.sala;
  const needsCloud = isCloudSala(sala) || isCloudSalaUpgradePending();
  if (needsCloud && isCloudSala(sala)) {
    const { password, mode } = readOnboardingNubeFields();
    const statusEl = document.getElementById("onboard-nube-status");
    const setStatus = (t) => {
      if (statusEl) statusEl.textContent = t;
    };
    const out = await registerCloudDuringOnboarding({
      mode,
      username: ctx.username,
      displayName: ctx.name,
      sala,
      password,
      // Desktop onboarding is personal-device by default (same as Recuérdame).
      remember: true,
      toast: ctx.toast,
      setStatus
    });
    if (!out.ok) {
      ctx.showError(out.error || "No se pudo conectar Nube.");
      return false;
    }
  }
  if (isCutoverPending()) {
    await claimCutoverPatients(ctx.username, ctx.toast);
    setCutoverFlag("done");
  }
  clearCloudSalaUpgradePending();
  return true;
}
async function claimCutoverPatients(username, toast2) {
  const snap = loadCutoverSnapshot();
  if (!snap) return;
  const patients = filterSnapshotPatients(snap, { username });
  const byTeam = /* @__PURE__ */ new Map();
  for (const p of patients) {
    const tid = String(p.teamId || "").trim();
    if (!tid) continue;
    if (!byTeam.has(tid)) byTeam.set(tid, []);
    byTeam.get(tid).push(p.id);
  }
  let claimed = 0;
  for (const [teamId, ids] of byTeam) {
    const out = await claimPatientsToTeam(ids, teamId);
    claimed += out.claimed;
  }
  if (claimed > 0) toast2("Pacientes reclamados: " + claimed, "success");
}

// public/js/features/clinical-onboarding-local-submit.mjs
var DEFAULT_LOCAL_ONLY_DISPLAY_NAME = "Usuario R+";
function defaultLocalOnlyDisplayName(user = clinicalSessionContext.user) {
  const existing = String(user?.clinical_name || "").trim();
  return existing || DEFAULT_LOCAL_ONLY_DISPLAY_NAME;
}
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function showLocalOnlyError(errEl, msg) {
  if (!errEl) return;
  errEl.textContent = msg;
  errEl.hidden = false;
}
function applyClaimToSession(localHandle) {
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.username = localHandle;
  }
}
async function claimLocalOnlyUsername(sessionUserId, localHandle) {
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || "");
  if (currentHandle === localHandle) return { ok: true };
  const api = dbApi();
  if (!api || typeof api.dbClinicalUsernameClaim !== "function") return { ok: true };
  const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username: localHandle });
  const claimFailed = !claimRes?.ok && !/ya está en uso/i.test(String(claimRes?.error || ""));
  if (claimFailed) {
    return { ok: false, error: claimRes?.error || "No se pudo guardar el perfil local." };
  }
  if (claimRes?.ok) applyClaimToSession(localHandle);
  return { ok: true };
}
async function upsertLocalOnlyProfile(sessionUserId, name, rank) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalProfileUpsert !== "function") return { ok: true };
  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: name,
    rank,
    sala: null,
    isProgramAdmin: false
  });
  if (!profileRes?.ok) {
    return { ok: false, error: profileRes?.error || "No se guard\xF3 el perfil." };
  }
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.rank = rank;
    clinicalSessionContext.user.clinical_name = name;
    clinicalSessionContext.user.sala = null;
    clinicalSessionContext.user.is_program_admin = 0;
  }
  return { ok: true };
}
function persistLocalOnlyBinding(sessionUserId, localHandle, name, rank) {
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
}
async function submitLocalOnlyProfile(name, rank, errEl) {
  const api = dbApi();
  const sessionUserId = String(clinicalSessionContext.user?.user_id || "");
  if (!sessionUserId || !api) return { ok: false, error: "Sesi\xF3n cl\xEDnica no disponible." };
  const localHandle = localOnlyUsernameForUserId(sessionUserId);
  const claim = await claimLocalOnlyUsername(sessionUserId, localHandle);
  if (!claim.ok) {
    showLocalOnlyError(errEl, claim.error || "No se pudo guardar el perfil local.");
    return { ok: false };
  }
  const profile = await upsertLocalOnlyProfile(sessionUserId, name, rank);
  if (!profile.ok) {
    showLocalOnlyError(errEl, profile.error || "No se guard\xF3 el perfil.");
    return { ok: false };
  }
  persistLocalOnlyBinding(sessionUserId, localHandle, name, rank);
  if (errEl) errEl.hidden = true;
  await refreshClinicalUserProfile();
  return { ok: true };
}

// public/js/features/clinical-onboarding-handlers.mjs
function dbApi2() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function readUsernameFormFields() {
  return {
    username: normalizeUsername(String(document.getElementById("onboard-username")?.value || "")),
    name: String(document.getElementById("onboard-clinical-name")?.value || "").trim(),
    rank: String(document.getElementById("onboard-rank")?.value || "R1"),
    sala: String(document.getElementById("onboard-sala")?.value || "").trim(),
    shiftPin: String(document.getElementById("onboard-shift-pin")?.value || "").trim()
  };
}
function showOnboardError(errEl, message) {
  if (!errEl) return;
  errEl.textContent = message;
  errEl.hidden = false;
}
function validateUsernameForm(fields, errEl) {
  if (!isValidUsernameFormat(fields.username)) {
    showOnboardError(
      errEl,
      "Usuario inv\xE1lido. Usa 3\u201332 letras min\xFAsculas (a-z, 0-9, _). p. ej. drmendoza \u2014 no tu nombre en guardia."
    );
    return false;
  }
  if (!fields.name) {
    showOnboardError(errEl, "Escribe tu nombre en guardia.");
    return false;
  }
  if (!fields.sala) {
    showOnboardError(errEl, "Selecciona tu rotaci\xF3n.");
    return false;
  }
  return true;
}
async function tryResumeExistingUsername(username, settings, errEl, errMsg) {
  const resumeRes = await resumeClinicalIdentityByUsername(username, settings, getClientId());
  if (!resumeRes.ok) {
    showOnboardError(errEl, resumeRes.error || errMsg);
    return { ok: false };
  }
  return { ok: true, settings: readRpcSettings(), sessionUserId: String(clinicalSessionContext.user?.user_id || "") };
}
async function claimUsernameIfNeeded(api, sessionUserId, username, sala, settings, errEl) {
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || "");
  const needsClaim = shouldClaimClinicalUsername(currentHandle, username, getClientId());
  if (!needsClaim) return { ok: true, needsClaim: false, sessionUserId, settings };
  const { assertRoomForUsernameRegister } = await import("/mobile/js/chunks/clinical-profile-cloud-stubs-LE2FYXR3.js");
  await assertRoomForUsernameRegister({ sala });
  if (typeof api.dbClinicalUsernameClaim !== "function") {
    return { ok: true, needsClaim: false, sessionUserId, settings };
  }
  const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username });
  if (claimRes?.ok) {
    if (clinicalSessionContext.user) clinicalSessionContext.user.username = username;
    return { ok: true, needsClaim: true, sessionUserId, settings };
  }
  const errMsg = String(claimRes?.error || "");
  if (/ya está en uso/i.test(errMsg)) {
    const resumed = await tryResumeExistingUsername(username, settings, errEl, errMsg);
    if (!resumed.ok) return { ok: false, needsClaim: false, sessionUserId, settings };
    return {
      ok: true,
      needsClaim: false,
      sessionUserId: resumed.sessionUserId,
      settings: resumed.settings
    };
  }
  showOnboardError(errEl, errMsg || "No se pudo registrar el usuario.");
  return { ok: false, needsClaim: false, sessionUserId, settings };
}
async function upsertClinicalProfile(api, sessionUserId, fields, errEl) {
  if (typeof api.dbClinicalProfileUpsert !== "function") return true;
  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: fields.name,
    rank: fields.rank,
    sala: fields.sala || null,
    isProgramAdmin: false
  });
  if (!profileRes?.ok) {
    showOnboardError(errEl, profileRes?.error || "No se guard\xF3 el perfil.");
    return false;
  }
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.rank = fields.rank;
    clinicalSessionContext.user.clinical_name = fields.name;
    clinicalSessionContext.user.sala = fields.sala || null;
    clinicalSessionContext.user.is_program_admin = 0;
  }
  return true;
}
async function connectShiftPinIfProvided(_shiftPin, _sala) {
}
async function pushProfileToLanAndNotify(sala, needsClaim) {
  const {
    flushClinicalProfileToCloud,
    PROFILE_PUSH_FAILED_MSG,
    PROFILE_NEEDS_CONNECT_MSG,
    isBenignPushSkipCode,
    isProfileNeedsConnectCode,
    notifyProfilePushResult
  } = await import("/mobile/js/chunks/clinical-profile-cloud-stubs-LE2FYXR3.js");
  const lanPush = await flushClinicalProfileToCloud({
    sala: sala || clinicalSessionContext.user?.sala
  });
  notifyProfilePushResult(lanPush, toast);
  const localOnly = isClinicalLocalOnlyMode();
  if (!localOnly && !lanPush.ok && isProfileNeedsConnectCode(lanPush.code)) {
    toast(PROFILE_NEEDS_CONNECT_MSG, "info");
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-4QY3QSUG.js");
    rot.syncClinicalRotationEntryChrome();
    return;
  }
  if (!lanPush.ok && !isBenignPushSkipCode(lanPush.code) && !(lanPush.channels && lanPush.channels.outbox)) {
    toast(PROFILE_PUSH_FAILED_MSG, "warning");
  } else if (lanPush.ok && needsClaim) {
    toast("@usuario publicado en la sala \u21C4.", "success");
  }
}
async function finishRegistrationLanSideEffects(fields, needsClaim) {
  try {
    if (isCloudSala(fields.sala)) return;
    await connectShiftPinIfProvided(fields.shiftPin, fields.sala);
    await pushProfileToLanAndNotify(fields.sala, needsClaim);
  } catch {
  }
}
async function handleUsernameStepSubmit(ev) {
  ev.preventDefault();
  const fields = readUsernameFormFields();
  const errEl = document.getElementById("onboard-error");
  if (!validateUsernameForm(fields, errEl)) return;
  let settings = readRpcSettings();
  let sessionUserId = String(clinicalSessionContext.user?.user_id || "");
  const api = dbApi2();
  if (!sessionUserId || !api) {
    toast("Sesi\xF3n cl\xEDnica no disponible.", "error");
    return;
  }
  try {
    const claimResult = await claimUsernameIfNeeded(
      api,
      sessionUserId,
      fields.username,
      fields.sala,
      settings,
      errEl
    );
    if (!claimResult.ok) return;
    sessionUserId = claimResult.sessionUserId;
    settings = claimResult.settings;
    const saved = await upsertClinicalProfile(api, sessionUserId, fields, errEl);
    if (!saved) return;
    persistClinicalUserBinding({
      userId: sessionUserId,
      username: fields.username,
      displayName: fields.name,
      rank: fields.rank,
      sala: fields.sala || "",
      registered: true,
      lanProfileGateComplete: true,
      isProgramAdmin: false
    });
    if (errEl) errEl.hidden = true;
    const cloudOk = await finishOnboardingCloudAndCutover({
      username: fields.username,
      name: fields.name,
      sala: fields.sala,
      toast,
      showError: (msg) => showOnboardError(errEl, msg)
    });
    if (!cloudOk) return;
    await refreshClinicalUserProfile();
    document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
    const { refreshMainClinicalOnboardingIfNeeded } = await import("/mobile/js/chunks/clinical-onboarding-main-RTQEC5VT.js");
    await refreshMainClinicalOnboardingIfNeeded();
    toast("Perfil guardado.", "success");
    void finishRegistrationLanSideEffects(fields, claimResult.needsClaim);
  } catch (err) {
    showOnboardError(errEl, err instanceof Error ? err.message : "Error al guardar el perfil.");
  }
}
function applyResumedProfileToSession(name, rank, sala) {
  if (!clinicalSessionContext.user) return;
  clinicalSessionContext.user.rank = rank;
  clinicalSessionContext.user.clinical_name = name;
  clinicalSessionContext.user.sala = sala;
  clinicalSessionContext.user.is_program_admin = 0;
}
function readResumedFormFields() {
  return {
    name: String(document.getElementById("onboard-clinical-name")?.value || "").trim(),
    rank: String(document.getElementById("onboard-rank")?.value || "R1"),
    sala: String(document.getElementById("onboard-sala")?.value || "").trim()
  };
}
async function saveResumedProfileIfComplete(api, sessionUserId, username, errEl) {
  const fields = readResumedFormFields();
  if (!sessionUserId || !fields.name || !fields.sala) return true;
  if (!api?.dbClinicalProfileUpsert) return true;
  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: fields.name,
    rank: fields.rank,
    sala: fields.sala,
    isProgramAdmin: false
  });
  if (!profileRes?.ok) {
    showOnboardError(errEl, profileRes?.error || "No se guard\xF3 el perfil.");
    return false;
  }
  applyResumedProfileToSession(fields.name, fields.rank, fields.sala);
  persistClinicalUserBinding({
    userId: sessionUserId,
    username,
    displayName: fields.name,
    rank: fields.rank,
    sala: fields.sala,
    registered: true,
    lanProfileGateComplete: true,
    isProgramAdmin: false
  });
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  return true;
}
async function handleResumeIdentityClick() {
  const username = normalizeUsername(String(document.getElementById("onboard-username")?.value || ""));
  const errEl = document.getElementById("onboard-error");
  const resumeBtn = document.getElementById("clinical-onboard-resume-btn");
  if (!isValidUsernameFormat(username)) {
    showOnboardError(errEl, "Escribe tu @usuario para recuperarlo.");
    return;
  }
  const existing = await lookupClinicalUserByUsername(username);
  if (!existing?.user_id) {
    showOnboardError(
      errEl,
      `No encontramos @${username} en esta base de datos. Para registrarte, completa el formulario y pulsa Guardar perfil.`
    );
    return;
  }
  if (resumeBtn instanceof HTMLButtonElement) {
    resumeBtn.disabled = true;
    resumeBtn.textContent = "Recuperando\u2026";
  }
  const settings = readRpcSettings();
  try {
    const resumeRes = await resumeClinicalIdentityByUsername(username, settings, getClientId());
    if (!resumeRes.ok) {
      showOnboardError(errEl, resumeRes.error || "No se pudo recuperar la cuenta.");
      return;
    }
    if (errEl) errEl.hidden = true;
    toast("Cuenta recuperada.", "success");
    await refreshClinicalUserProfile();
    const sessionUserId = String(clinicalSessionContext.user?.user_id || "");
    const api = dbApi2();
    const saved = await saveResumedProfileIfComplete(api, sessionUserId, username, errEl);
    if (!saved) return;
    const { refreshMainClinicalOnboardingIfNeeded } = await import("/mobile/js/chunks/clinical-onboarding-main-RTQEC5VT.js");
    await refreshMainClinicalOnboardingIfNeeded();
    if (needsProfileOnboarding()) {
      toast("Completa tu perfil y pulsa Guardar perfil.", "info");
    }
  } finally {
    if (resumeBtn instanceof HTMLButtonElement) {
      resumeBtn.disabled = false;
      resumeBtn.textContent = "Recuperar mi usuario";
    }
  }
}
async function handleLocalOnlyConfirmClick() {
  const confirmBtn = document.getElementById("clinical-onboard-local-confirm-btn");
  const errEl = document.getElementById("onboard-local-only-error");
  if (confirmBtn instanceof HTMLButtonElement) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Preparando\u2026";
  }
  const settings = readRpcSettings();
  const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || "R1");
  try {
    const result = await submitLocalOnlyProfile(defaultLocalOnlyDisplayName(), rank, errEl);
    if (!result.ok) return;
    toast("Listo. R+ queda solo en este equipo, sin R+ Cloud.", "success");
    const { refreshMainClinicalOnboardingIfNeeded } = await import("/mobile/js/chunks/clinical-onboarding-main-RTQEC5VT.js");
    await refreshMainClinicalOnboardingIfNeeded();
  } finally {
    if (confirmBtn instanceof HTMLButtonElement) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Entrar a R+";
    }
  }
}
async function wireOnboardingInteractions() {
  wireSyncModeOnboardingInteractions();
  wireExistingAccountLoginInteractions();
  wireOnboardingModeBackButtons();
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
  const localConfirmBtn = document.getElementById("clinical-onboard-local-confirm-btn");
  if (localConfirmBtn && !localConfirmBtn._rpcLocalConfirmWired) {
    localConfirmBtn._rpcLocalConfirmWired = true;
    localConfirmBtn.addEventListener("click", () => void handleLocalOnlyConfirmClick());
  }
  wireOnboardingNubeExtras();
}
function wireOnboardingNubeExtras() {
  const sala = document.getElementById("onboard-sala");
  if (sala && !sala._rpcNubeSalaWired) {
    sala._rpcNubeSalaWired = true;
    sala.addEventListener("change", () => syncOnboardingNubeVisibility());
  }
  const shell = document.querySelector(".clinical-onboard-form-shell");
  if (shell && !shell._rpcCutoverPickWired) {
    shell._rpcCutoverPickWired = true;
    shell.addEventListener("click", (ev) => {
      const t = ev.target instanceof Element ? ev.target : null;
      const btn = t?.closest?.("[data-onboard-pick-user]");
      if (btn) applyOnboardPickUser(btn);
    });
  }
  syncOnboardingNubeVisibility();
}

// public/js/features/clinical-onboarding-render.mjs
async function tryAutoResumeCachedUsername(settings) {
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const cachedUsername = profileGatePending ? "" : normalizeUsername(String(settings.clinicalUsername || ""));
  if (profileGatePending || !needsUsernameClaim() || !cachedUsername || !isValidUsernameFormat(cachedUsername)) {
    return settings;
  }
  try {
    const existing = await lookupClinicalUserByUsername(cachedUsername);
    if (existing?.user_id) {
      await resumeClinicalIdentityByUsername(cachedUsername, settings, getClientId());
      await refreshClinicalUserProfile();
      return readRpcSettings();
    }
  } catch {
  }
  return settings;
}
async function renderCompletedOnboarding(host) {
  if (needsTeamOnboardingStep()) {
    const { renderTeamOnboardingInto, wireTeamOnboardingInteractions } = await import("/mobile/js/chunks/clinical-onboarding-team-GFSAT3UJ.js");
    renderTeamOnboardingInto(host);
    wireTeamOnboardingInteractions(host);
    return;
  }
  const { hideMainClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-main-RTQEC5VT.js");
  hideMainClinicalOnboarding();
  if (host.closest("#clinical-teams-panel-body")) {
    const { renderClinicalTeamsPanel } = await import("/mobile/js/chunks/clinical-teams-FW5USC45.js");
    await renderClinicalTeamsPanel();
  }
}
function buildRankOptionsHtml(rank) {
  return ["R1", "R2", "R3", "R4"].map((r) => `<option value="${r}" ${rank === r ? "selected" : ""}>${r}</option>`).join("");
}
function buildSalaOptionsHtml(prefilledSala) {
  return CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}" ${prefilledSala === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("");
}
function resolveOnboardUsernamePrefill(settings) {
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const sessionUsername = normalizeUsername(clinicalSessionContext.user?.username || "");
  if (!profileGatePending) {
    return normalizeUsername(String(settings.clinicalUsername || ""));
  }
  if (isValidUsernameFormat(sessionUsername) && !isLegacyMachineUsername(sessionUsername, getClientId())) {
    return sessionUsername;
  }
  return "";
}
function buildLanProfileFormBody(settings) {
  const cachedUsername = resolveOnboardUsernamePrefill(settings);
  const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || "R1");
  const prefilledName = String(
    settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ""
  );
  const prefilledSala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || "");
  const prefilledShiftPin = "";
  const shiftPinFieldHtml = isLanSkipShiftPin() ? "" : `
          <div class="field-group">
            <label for="onboard-shift-pin">PIN del turno (\u21C4)</label>
            <input id="onboard-shift-pin" type="text" class="profile-input" inputmode="numeric"
              pattern="[0-9]{6}" maxlength="6" placeholder="6 d\xEDgitos del anfitri\xF3n" autocomplete="off"
              value="${escapeAttr(prefilledShiftPin)}">
            <p class="clinical-teams-hint">6 d\xEDgitos del anfitri\xF3n (\u21C4). R+ conecta solo; si cambias de Wi\u2011Fi, vuelve a usar el mismo PIN.</p>
          </div>`;
  return `
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          ${buildCutoverPickerHtml()}
          <div class="field-group">
            <label for="onboard-username">Usuario (@usuario) *</label>
            <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
              value="${escapeAttr(cachedUsername)}" required autocomplete="off" spellcheck="false">
            <p class="clinical-teams-hint">${CLINICAL_LAN_USERNAME_HINT_HTML}</p>
          </div>
          <div class="field-group">
            <label for="onboard-clinical-name">Nombre en guardia *</label>
            <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${escapeAttr(prefilledName)}" required autocomplete="name">
            <p class="clinical-teams-hint">${CLINICAL_LAN_DISPLAY_NAME_HINT_HTML}</p>
          </div>
          <div class="field-group">
            <label for="onboard-rank">Rango</label>
            <select id="onboard-rank" class="profile-input">
              ${buildRankOptionsHtml(rank)}
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-sala">Rotaci\xF3n *</label>
            <select id="onboard-sala" class="profile-input" required>
              <option value="">\u2014 Seleccionar \u2014</option>
              ${buildSalaOptionsHtml(prefilledSala)}
            </select>
          </div>
          ${buildNubePasswordFieldHtml(prefilledSala)}
          ${shiftPinFieldHtml}
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Guardar perfil</button>
            <button type="button" id="clinical-onboard-switch-existing-btn" class="btn-med-secondary">Ya tengo cuenta Nube</button>
            <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
            <button type="button" id="clinical-onboard-mode-back-btn" class="btn-med-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>`;
}
function renderLocalOnlyConfirmPanel(host) {
  host.innerHTML = buildOnboardingStageHtml({
    title: "Solo este equipo",
    leadHtml: "<p>Los expedientes y notas quedan solo en esta Mac. Sin Nube, rotaciones ni sala compartida.</p>",
    stepperIndex: 2,
    bodyHtml: `
      <p id="onboard-local-only-error" class="clinical-registration-error" hidden></p>
      <div class="modal-actions clinical-onboard-form-actions">
        <button type="button" class="btn-save" id="clinical-onboard-local-confirm-btn">Entrar a R+</button>
        <button type="button" id="clinical-onboard-mode-back-btn" class="btn-med-secondary">Cambiar modo</button>
      </div>`
  });
}
function renderLanProfileForm(host, settings) {
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const cutover = shouldShowCutoverWizard({
    cutoverDone: isCutoverDone(),
    cutoverPending: isCutoverPending()
  });
  const salaUpgrade = isCloudSalaUpgradePending(settings);
  let gateLead;
  if (profileGatePending || cutover) {
    gateLead = `<p class="clinical-onboard-gate-lead">${CLINICAL_LAN_PROFILE_GATE_LEAD_HTML}</p>`;
  } else if (salaUpgrade) {
    gateLead = '<p class="clinical-onboard-gate-lead">Pasaste a <strong>Sala</strong> o <strong>Torre HU</strong>. Completa el perfil y registra tu <strong>contrase\xF1a de Nube</strong> para sincronizar el turno.</p>';
  } else {
    gateLead = "<p>Confirma tu @usuario de R+ Cloud, nombre en guardia, rango y rotaci\xF3n. Para equipos, abre <strong>Mi rotaci\xF3n</strong> despu\xE9s.</p>";
  }
  const title = profileGatePending || cutover ? "Confirma tu perfil" : salaUpgrade ? "Conectar Nube" : "Configura tu rotaci\xF3n";
  host.innerHTML = buildOnboardingStageHtml({
    title,
    leadHtml: gateLead,
    stepperIndex: 2,
    bodyHtml: buildLanProfileFormBody(settings)
  });
  syncOnboardingNubeVisibility(host);
}
async function renderNoSessionOnboarding(host) {
  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    await wireOnboardingInteractions();
    return;
  }
  const { buildOnboardingSessionBlockHtml } = await import("/mobile/js/chunks/clinical-onboarding-main-RTQEC5VT.js");
  host.innerHTML = await buildOnboardingSessionBlockHtml();
}
async function renderOnboardingPanelInto(host) {
  const userId = String(clinicalSessionContext.user?.user_id || "");
  if (!userId) {
    await renderNoSessionOnboarding(host);
    return;
  }
  await fetchClinicalTeamsFromDb();
  let settings = ensureLanProfileGateDeviceReset(readRpcSettings());
  settings = await tryAutoResumeCachedUsername(settings);
  if (!needsProfileOnboarding()) {
    await renderCompletedOnboarding(host);
    return;
  }
  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    await wireOnboardingInteractions();
    return;
  }
  if (needsExistingAccountLogin(settings)) {
    const resumed = await tryResumeOnboardingFromStoredCloudToken();
    if (resumed) return;
    renderExistingAccountLoginPanel(host, settings);
    wireExistingAccountLoginInteractions();
    return;
  }
  if (getCloudSyncToken()) {
    const resumed = await tryResumeOnboardingFromStoredCloudToken();
    if (resumed) return;
  }
  if (isClinicalLocalOnlyMode(settings)) {
    if (!needsLocalOnlyProfile(settings)) {
      await renderCompletedOnboarding(host);
      return;
    }
    renderLocalOnlyConfirmPanel(host);
    await wireOnboardingInteractions();
    return;
  }
  renderLanProfileForm(host, settings);
  await wireOnboardingInteractions();
}

export {
  renderOnboardingPanelInto
};
//# sourceMappingURL=/js/chunks/chunk-O6PRRCV3.js.map

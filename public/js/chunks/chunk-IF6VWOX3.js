import {
  ensureLanProfileGateDeviceReset,
  needsClinicalLanProfileGate,
  readRpcSettings
} from "/js/chunks/chunk-2VGC7OB3.js";

// public/js/features/clinical-registration.mjs
function prefillRegistrationFromUrlParams() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const user = params.get("user") || "";
  const name = params.get("name") || "";
  const rank = params.get("rank") || "";
  const sala = params.get("sala") || "";
  if (!user && !name && !rank && !sala) return;
  const pairs = [
    ["clinical-reg-username", "onboard-username", user],
    ["clinical-reg-name", "onboard-clinical-name", name],
    ["clinical-reg-rank", "onboard-rank", rank],
    ["clinical-reg-sala", "onboard-sala", sala]
  ];
  for (const [regId, onboardId, value] of pairs) {
    if (!value) continue;
    const regEl = document.getElementById(regId);
    const onboardEl = document.getElementById(onboardId);
    if (regEl) regEl.value = value;
    if (onboardEl) onboardEl.value = value;
  }
}
function backdropEl() {
  return document.getElementById("clinical-registration-backdrop");
}
function openClinicalRegistrationModal() {
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
  if (usernameInput) usernameInput.focus();
}
function closeClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
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
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-IF6VWOX3.js.map

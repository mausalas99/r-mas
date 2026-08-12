import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WTQUTVWF.js";
import {
  CURRICULUM_VERSION,
  isValidStepForBranch,
  migrateTourStepId
} from "/mobile/js/chunks/chunk-YQDSERQQ.js";
import {
  GUIDED_TOUR_LS_KEY,
  tourState
} from "/mobile/js/chunks/chunk-4SRKXA7H.js";

// public/js/onboarding-progress.mjs
var GUIDED_TOUR_PROGRESS_LS_KEY = "rpc-guided-tour-progress";
function loadTourProgress(storage = localStorage) {
  try {
    const raw = storage.getItem(GUIDED_TOUR_PROGRESS_LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.stepId || !p.branch) return null;
    const branch = p.branch === "guardia-v7" ? "guardia-v7" : p.branch === "quick-route" ? "quick-route" : p.branch === "interconsulta" ? "interconsulta" : "sala";
    const stepId = migrateTourStepId(p.stepId, branch);
    if (!isValidStepForBranch(stepId, branch, "base")) return null;
    return { ...p, branch, stepId, mode: "base" };
  } catch {
    return null;
  }
}
function saveTourProgress(payload, storage = localStorage) {
  const branch = payload.branch === "guardia-v7" ? "guardia-v7" : payload.branch === "quick-route" ? "quick-route" : payload.branch === "interconsulta" ? "interconsulta" : "sala";
  const body = {
    branch,
    track: payload.track || branch,
    stepId: payload.stepId,
    chapterId: payload.chapterId || null,
    moduleOnly: !!payload.moduleOnly,
    mode: "base",
    curriculumVersion: CURRICULUM_VERSION,
    updatedAt: Date.now()
  };
  storage.setItem(GUIDED_TOUR_PROGRESS_LS_KEY, JSON.stringify(body));
}
function clearTourProgress(storage = localStorage) {
  try {
    storage.removeItem(GUIDED_TOUR_PROGRESS_LS_KEY);
  } catch (_e) {
    void _e;
  }
}

// public/js/features/settings-help/bridges.mjs
var settingsHelpBridge = {
  closeReleaseNotes() {
  },
  closeQuickHelp() {
  },
  syncLearnHubContinueVisibility() {
  }
};

// public/js/features/settings-help/tour-intro.mjs
function parseSemverCoreParts(versionLabel) {
  var s = normalizeTourVersionLabel(versionLabel);
  if (s === "dev") return null;
  var core = s.split("-")[0].split("+")[0];
  var parts = core.split(".");
  var nums = [];
  for (var i = 0; i < parts.length; i++) {
    var n = parseInt(parts[i], 10);
    if (isNaN(n)) return null;
    nums.push(n);
  }
  return nums.length ? nums : null;
}
function compareSemverNumericArrays(a, b) {
  var len = Math.max(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var ai = a[i] || 0;
    var bi = b[i] || 0;
    if (ai !== bi) return ai > bi ? 1 : -1;
  }
  return 0;
}
function shouldShowGuidedTourIntro(currentVersion, storedDoneVersionRaw) {
  var cur = normalizeTourVersionLabel(currentVersion);
  if (storedDoneVersionRaw == null || String(storedDoneVersionRaw).trim() === "") return true;
  var done = String(storedDoneVersionRaw).trim();
  if (cur === done) return false;
  var pc = parseSemverCoreParts(cur);
  var pd = parseSemverCoreParts(done);
  if (pc && pd) return compareSemverNumericArrays(pc, pd) > 0;
  return cur !== done;
}
function resolveAppVersionForTour() {
  if (window.electronAPI && typeof window.electronAPI.getAppVersion === "function") {
    return window.electronAPI.getAppVersion().catch(function() {
      return "dev";
    });
  }
  return Promise.resolve("dev");
}
function normalizeTourVersionLabel(v) {
  var s = String(v == null ? "" : v).trim();
  return s || "dev";
}
function tryShowGuidedTourIntroIfNeeded() {
  void import("/mobile/js/chunks/tour-intro-education-WGXXPND5.js").then((mod) => {
    if (typeof mod.tryShowPostRegistrationEducationIfNeeded === "function") {
      void mod.tryShowPostRegistrationEducationIfNeeded();
    }
  });
}
function initGuidedTourGate() {
  if (isMobileWeb()) return;
  void import("/mobile/js/chunks/learn-hub-PI37F32T.js").then(function(hub) {
    if (typeof hub.syncLearnAprenderChrome === "function") hub.syncLearnAprenderChrome();
  });
  resolveAppVersionForTour().then(function(v) {
    window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
    void import("/mobile/js/chunks/tour-intro-education-WGXXPND5.js").then((mod) => {
      if (typeof mod.tryShowPostRegistrationEducationIfNeeded === "function") {
        void mod.tryShowPostRegistrationEducationIfNeeded();
      }
    });
  }).catch(function() {
    window.__RPC_APP_VERSION__ = "dev";
    void import("/mobile/js/chunks/tour-intro-education-WGXXPND5.js").then((mod) => {
      if (typeof mod.tryShowPostRegistrationEducationIfNeeded === "function") {
        void mod.tryShowPostRegistrationEducationIfNeeded();
      }
    });
  });
}
function showTourIntroModal() {
  var el = document.getElementById("onboarding-intro-backdrop");
  if (!el) return;
  try {
    settingsHelpBridge.closeReleaseNotes();
  } catch (_e) {
    void _e;
  }
  var ver = normalizeTourVersionLabel(window.__RPC_APP_VERSION__);
  var h2 = document.getElementById("intro-modal-title");
  if (h2) h2.textContent = ver && ver !== "dev" ? "R+ \xB7 versi\xF3n " + ver : "Bienvenido a R+";
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
}
function openTutorialIntroFromSettings() {
  return resolveAppVersionForTour().then(function(v) {
    window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
    return import("/mobile/js/chunks/learn-hub-PI37F32T.js").then((hub) => {
      if (typeof hub.openLearnHub === "function") hub.openLearnHub({ focusTrack: "fundamentos" });
    });
  }).catch(function() {
    window.__RPC_APP_VERSION__ = "dev";
    return import("/mobile/js/chunks/learn-hub-PI37F32T.js").then((hub) => {
      if (typeof hub.openLearnHub === "function") hub.openLearnHub({ focusTrack: "fundamentos" });
    });
  });
}
function hideTourIntroModal() {
  var el = document.getElementById("onboarding-intro-backdrop");
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
}
function markGuidedTourVersionDone() {
  try {
    localStorage.setItem(GUIDED_TOUR_LS_KEY, normalizeTourVersionLabel(window.__RPC_APP_VERSION__));
  } catch (_e) {
    void _e;
  }
}
function guidedTourIntroSkip() {
  markGuidedTourVersionDone();
  hideTourIntroModal();
}
function launchGuidedTourBranch(branch) {
  hideTourIntroModal();
  tourState.guidedTourMode = "base";
  void import("/mobile/js/chunks/tour-flow-UMUMOHW4.js").then((mod) => {
    if (typeof mod.startOnboarding === "function") mod.startOnboarding(branch);
  });
}
function guidedTourIntroChooseSala() {
  launchGuidedTourBranch("sala");
}
function guidedTourIntroChooseInterconsulta() {
  launchGuidedTourBranch("interconsulta");
}
function syncLearnHubContinueVisibility() {
  var btn = document.getElementById("btn-learn-continue");
  if (btn) {
    var p = loadTourProgress();
    btn.style.display = p && !tourState.guidedTourActive ? "" : "none";
  }
  var hubBd = document.getElementById("learn-hub-backdrop");
  if (hubBd && hubBd.classList.contains("open")) {
    void import("/mobile/js/chunks/learn-hub-PI37F32T.js").then(function(hub) {
      if (typeof hub.renderLearnHubBody === "function") hub.renderLearnHubBody("guardia-v7");
    });
  }
}

// public/js/features/settings-help/tour-intro-education.mjs
function shouldDeferGuidedTourForRegistration() {
  try {
    var settingsRaw = localStorage.getItem("rpc-settings");
    var settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    if (settings && settings.clinicalRegistered !== true) return true;
    if (settings && settings.clinicalLocalOnly !== true && settings.clinicalLocalOnly !== false) {
      return true;
    }
    if (document.documentElement.classList.contains("clinical-onboarding-active")) return true;
  } catch (_e) {
    void _e;
  }
  return false;
}
async function tryShowPostRegistrationEducationIfNeeded() {
  if (isMobileWeb() || shouldDeferGuidedTourForRegistration()) return;
  const { needsClinicalOnboarding, needsTeamOnboardingStep } = await import("/mobile/js/chunks/clinical-onboarding-RR5E3AJQ.js");
  if (needsClinicalOnboarding()) return;
  if (needsTeamOnboardingStep()) return;
  const cur = normalizeTourVersionLabel(window.__RPC_APP_VERSION__);
  const prev = normalizeTourVersionLabel(window.__RPC_PREV_APP_VERSION__ || "");
  let stored = "";
  try {
    stored = localStorage.getItem(GUIDED_TOUR_LS_KEY) || "";
  } catch (_ls) {
    void _ls;
  }
  const { isGuardiaV7TrackComplete } = await import("/mobile/js/chunks/guardia-v7-progress-LHCGX7S7.js");
  const { shouldOfferGuardiaV7Education, shouldShowFundamentosTourIntro } = await import("/mobile/js/chunks/guardia-v7-gating-HBE5TIHB.js");
  if (shouldOfferGuardiaV7Education({
    prevVersion: prev,
    curVersion: cur,
    needsOnboarding: false,
    trackComplete: isGuardiaV7TrackComplete()
  })) {
    const { maybeShowGuardiaV7UpgradeCard } = await import("/mobile/js/chunks/guardia-v7-upgrade-card-2KJSTD33.js");
    maybeShowGuardiaV7UpgradeCard({ delayMs: 2e3 });
    return;
  }
  if (shouldShowFundamentosTourIntro({ curVersion: cur, storedDoneVersion: stored, needsOnboarding: false })) {
    markGuidedTourVersionDone();
    setTimeout(() => {
      void import("/mobile/js/chunks/learn-hub-PI37F32T.js").then((hub) => {
        if (typeof hub.openLearnHub === "function") hub.openLearnHub({ focusTrack: "fundamentos" });
      });
    }, 80);
  }
}

export {
  settingsHelpBridge,
  loadTourProgress,
  saveTourProgress,
  clearTourProgress,
  tryShowPostRegistrationEducationIfNeeded,
  parseSemverCoreParts,
  compareSemverNumericArrays,
  shouldShowGuidedTourIntro,
  resolveAppVersionForTour,
  normalizeTourVersionLabel,
  tryShowGuidedTourIntroIfNeeded,
  initGuidedTourGate,
  showTourIntroModal,
  openTutorialIntroFromSettings,
  hideTourIntroModal,
  markGuidedTourVersionDone,
  guidedTourIntroSkip,
  guidedTourIntroChooseSala,
  guidedTourIntroChooseInterconsulta,
  syncLearnHubContinueVisibility
};
//# sourceMappingURL=/js/chunks/chunk-EQKSFX4S.js.map

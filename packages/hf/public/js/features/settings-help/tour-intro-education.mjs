/** Post-registration education: Fundamentos learn hub intro on version bump. */
import { isMobileWeb } from '../../mobile-web.mjs';
import { GUIDED_TOUR_LS_KEY } from './tour-state.mjs';
import { markGuidedTourVersionDone, normalizeTourVersionLabel } from './tour-intro.mjs';

function parseSemverCoreParts(versionLabel) {
  const s = String(versionLabel == null ? '' : versionLabel).trim() || 'dev';
  if (s === 'dev') return null;
  const core = s.split('-')[0].split('+')[0];
  const parts = core.split('.');
  const nums = [];
  for (let i = 0; i < parts.length; i++) {
    const n = parseInt(parts[i], 10);
    if (Number.isNaN(n)) return null;
    nums.push(n);
  }
  return nums.length ? nums : null;
}

function compareSemverNumericArrays(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] || 0;
    const bi = b[i] || 0;
    if (ai !== bi) return ai > bi ? 1 : -1;
  }
  return 0;
}

/** True when `curVersion` is newer than the last version the tour intro was marked done for. */
function shouldShowFundamentosTourIntro(curVersion, storedDoneVersionRaw) {
  const cur = String(curVersion == null ? '' : curVersion).trim() || 'dev';
  if (storedDoneVersionRaw == null || String(storedDoneVersionRaw).trim() === '') return true;
  const done = String(storedDoneVersionRaw).trim();
  if (cur === done) return false;
  const pc = parseSemverCoreParts(cur);
  const pd = parseSemverCoreParts(done);
  if (pc && pd) return compareSemverNumericArrays(pc, pd) > 0;
  return cur !== done;
}

function shouldDeferGuidedTourForRegistration() {
  try {
    var settingsRaw = localStorage.getItem('rpc-settings');
    var settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    if (settings && settings.clinicalRegistered !== true) return true;
    if (settings && settings.clinicalLocalOnly !== true && settings.clinicalLocalOnly !== false) {
      return true;
    }
    if (document.documentElement.classList.contains('clinical-onboarding-active')) return true;
  } catch (_e) { void _e; }
  return false;
}

export async function tryShowPostRegistrationEducationIfNeeded() {
  if (isMobileWeb() || shouldDeferGuidedTourForRegistration()) return;
  const { needsClinicalOnboarding, needsTeamOnboardingStep } = await import('../clinical-onboarding.mjs');
  if (needsClinicalOnboarding()) return;
  if (needsTeamOnboardingStep()) return;

  const cur = normalizeTourVersionLabel(window.__RPC_APP_VERSION__);
  let stored = '';
  try {
    stored = localStorage.getItem(GUIDED_TOUR_LS_KEY) || '';
  } catch (_ls) { void _ls; }

  if (shouldShowFundamentosTourIntro(cur, stored)) {
    markGuidedTourVersionDone();
    setTimeout(() => {
      void import('./learn-hub.mjs').then((hub) => {
        if (typeof hub.openLearnHub === 'function') hub.openLearnHub({ focusTrack: 'fundamentos' });
      });
    }, 80);
  }
}

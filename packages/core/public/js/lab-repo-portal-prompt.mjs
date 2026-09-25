/**
 * Lab portal base URL — read the local setting here; the address itself
 * never ships in this repo. Main process falls back to env
 * `RPLUS_LAB_PORTAL_URL` when this is empty (lib/lab-repo/lab-repo-fetch.mjs).
 * When neither is set, the portal callers route here instead of hitting
 * the network.
 */
import { readRpcSettings } from './clinical-settings.mjs';

export const LAB_REPO_MISSING_PORTAL_URL_CODE = 'lab-repo-missing-portal-url';
export const LAB_PORTAL_URL_MISSING_MESSAGE =
  'Falta la dirección del portal de laboratorio — pégala en Ajustes → Laboratorio.';

/** @returns {string} */
export function getLabPortalUrlSetting() {
  return String(readRpcSettings()?.labPortalUrl || '').trim();
}

/** @param {string} [message] */
export function isLabRepoMissingPortalUrlError(message) {
  return String(message || '').indexOf(LAB_REPO_MISSING_PORTAL_URL_CODE) !== -1;
}

/** Opens Ajustes scrolled to the lab portal field and focuses it. */
export function promptForLabPortalUrl() {
  return import('./features/settings-help/settings-dropdown.mjs').then(function (mod) {
    mod.ensureSettingsDropdownOpen();
    mod.showSettingsPanel('settings-accordion-laboratorio');
    var el = document.getElementById('settings-lab-portal-url');
    if (!el) return;
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
    if (typeof el.focus === 'function') el.focus();
  });
}

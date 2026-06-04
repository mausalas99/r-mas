/** Settings gear dropdown: a11y, focus, team-sync header button. */
import { isClinicalLocalOnlyMode, readRpcSettings } from '../../clinical-settings.mjs';
import { isMobileWeb } from '../../mobile-web.mjs';
import { closeConnectionDropdown } from '../lan-sync.mjs';
import { getSettingsHelpRuntime } from './runtime.mjs';

export function toggleSettingsSection() {
  toggleSettingsDropdown();
}

function syncSettingsDropdownA11y(open) {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd) return;
  dd.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (bg) bg.setAttribute('aria-hidden', open ? 'false' : 'true');
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function focusSettingsDropdownEntry() {
  var dd = document.getElementById('settings-dropdown');
  if (!dd) return;
  var target =
    dd.querySelector('.btn-settings-help-primary') ||
    dd.querySelector('button, summary, [href], input, select, textarea');
  if (target && typeof target.focus === 'function') target.focus();
}

export function toggleSettingsDropdown() {
  if (isMobileWeb()) return;
  closeConnectionDropdown();
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd) return;
  var open = dd.classList.contains('open');
  var nextOpen = !open;
  dd.classList.toggle('open', nextOpen);
  if (bg) bg.classList.toggle('open', nextOpen);
  syncSettingsDropdownA11y(nextOpen);
  if (nextOpen) {
    getSettingsHelpRuntime().syncPreimportBackupUi();
    getSettingsHelpRuntime().syncSettingsLanHostDiskSection();
    void import('../clinical-sync-mode-settings.mjs')
      .then((m) => {
        if (typeof m.syncClinicalSyncModeSettingsUi === 'function') {
          m.syncClinicalSyncModeSettingsUi();
        }
      })
      .catch(() => {});
    focusSettingsDropdownEntry();
  }
}

export function closeSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  var trigger = document.getElementById('btn-open-settings');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
  syncSettingsDropdownA11y(false);
  if (trigger && typeof trigger.focus === 'function') trigger.focus();
}

/** Abre el desplegable y la sección «Respaldos, sync y recuperación». */
export function expandSettingsAccordionBackupSync() {
  var det = document.getElementById('settings-accordion-backup-sync');
  if (det) det.open = true;
}

export function syncTeamSyncHeaderButton() {
  var btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    btn.style.display = 'none';
    return;
  }
  var desktop = !!(window.electronAPI && typeof window.electronAPI.getAppVersion === 'function');
  btn.style.display = desktop || isMobileWeb() ? 'flex' : 'none';
}

export function ensureSettingsDropdownOpen() {
  var dd = document.getElementById('settings-dropdown');
  if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
}

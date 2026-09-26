// Boot-time safety guard for the isolated UI test mode (R_PLUS_UI_TEST_MODE=1).
// Pure function so it's testable without booting Electron — see main.js caller.
const path = require('path');

const REAL_WORKER_HOSTNAME = 'rplus-sync.rmas-workersdev.workers.dev';

/**
 * @param {{ uiTestMode: boolean, cloudSyncUrl: string, userDataPath: string, defaultUserDataPath: string }} opts
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function checkUiTestModeBoot({ uiTestMode, cloudSyncUrl, userDataPath, defaultUserDataPath }) {
  if (!uiTestMode) return { ok: true };

  const reasons = [];
  const url = String(cloudSyncUrl || '').trim();
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = '';
  }
  const isLocalMock = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocalMock || hostname === REAL_WORKER_HOSTNAME) {
    reasons.push(
      `cloud sync URL must be a local mock server (localhost), got ${url || '(unset)'}`
    );
  }

  const resolvedUserData = path.resolve(String(userDataPath || ''));
  const resolvedDefault = path.resolve(String(defaultUserDataPath || ''));
  if (!resolvedUserData || resolvedUserData === resolvedDefault) {
    reasons.push(`userData path must not be the app's real default (${resolvedDefault})`);
  }

  if (reasons.length) {
    return { ok: false, reason: 'R_PLUS_UI_TEST_MODE refused to boot: ' + reasons.join('; ') };
  }
  return { ok: true };
}

module.exports = { checkUiTestModeBoot, REAL_WORKER_HOSTNAME };

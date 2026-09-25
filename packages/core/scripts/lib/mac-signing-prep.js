/**
 * Preparación de firma Mac para publish sin TTY (consola Release o CI).
 * Lee RELEASE_KEYCHAIN_* y variables APPLE_* / CSC_* del entorno.
 *
 * electron-builder rejects CSC_NAME that starts with "Developer ID Application:".
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const DEFAULT_KEYCHAIN = path.join(os.homedir(), 'Library/Keychains/login.keychain-db');
const CSC_NAME_PREFIX = /^Developer ID Application:\s*/i;

const DEFAULT_APPLE_ID = 'djsalas99@gmail.com';
const DEFAULT_APPLE_TEAM_ID = 'N78U9QC783';
const NOTARIZE_KEYCHAIN_SERVICE = 'rplus-notarize';

function shellQuote(arg) {
  if (process.platform === 'win32') {
    return `"${String(arg).replace(/"/g, '""')}"`;
  }
  return `'${String(arg).replace(/'/g, `'\\''`)}'`;
}

function normalizeCscName(name) {
  return String(name || '').replace(CSC_NAME_PREFIX, '').trim();
}

function applyCscName(env) {
  const e = env || process.env;
  if (e.CSC_NAME == null || e.CSC_NAME === '') return;
  e.CSC_NAME = normalizeCscName(e.CSC_NAME);
}

function unlockMacKeychainFromEnv(env) {
  if (process.platform !== 'darwin') return false;
  const pw = String((env || process.env).RELEASE_KEYCHAIN_PASSWORD || '').trim();
  if (!pw) return false;
  const kc =
    String((env || process.env).RELEASE_KEYCHAIN_PATH || '').trim() || DEFAULT_KEYCHAIN;
  if (!fs.existsSync(kc)) {
    throw new Error(`No se encontró el llavero: ${kc}`);
  }
  execSync(`security unlock-keychain -p ${shellQuote(pw)} ${shellQuote(kc)}`, {
    stdio: 'pipe',
  });
  try {
    execSync(
      `security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k ${shellQuote(pw)} ${shellQuote(kc)}`,
      { stdio: 'pipe' }
    );
  } catch (_e) { /* ignored */ }
  try {
    execSync(`security set-keychain-settings -t 3600 -l ${shellQuote(kc)}`, { stdio: 'pipe' });
  } catch (_e) { /* ignored */ }
  return true;
}

function readKeychainPassword(account, service) {
  try {
    const out = execSync(
      `security find-generic-password -a ${shellQuote(account)} -s ${shellQuote(service)} -w`,
      { stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return String(out).trim();
  } catch (_e) {
    return '';
  }
}

/**
 * Fills in Apple ID / Team ID with this project's known values, and pulls the
 * app-specific password from the macOS login keychain, so `npm run release:publish`
 * doesn't need APPLE_* exported by hand every time. Never overrides an explicit env var.
 */
function applyAppleDefaults(env) {
  const e = env || process.env;
  if (!String(e.APPLE_ID || '').trim()) e.APPLE_ID = DEFAULT_APPLE_ID;
  if (!String(e.APPLE_TEAM_ID || '').trim()) e.APPLE_TEAM_ID = DEFAULT_APPLE_TEAM_ID;
  if (!String(e.APPLE_APP_SPECIFIC_PASSWORD || '').trim() && process.platform === 'darwin') {
    const pw = readKeychainPassword(e.APPLE_ID, NOTARIZE_KEYCHAIN_SERVICE);
    if (pw) e.APPLE_APP_SPECIFIC_PASSWORD = pw;
  }
}

function prepareMacSigning(env) {
  const e = env || process.env;
  applyCscName(e);
  if (process.platform !== 'darwin') return { unlocked: false };
  applyAppleDefaults(e);
  const unlocked = unlockMacKeychainFromEnv(e);
  const signed =
    !!String(e.CSC_LINK || '').trim() ||
    String(e.CSC_IDENTITY_AUTO_DISCOVERY || '').toLowerCase() !== 'false' ||
    !!String(e.CSC_NAME || '').trim();
  const notarize =
    e.RELEASE_SKIP_NOTARIZE !== '1' &&
    !!String(e.APPLE_ID || '').trim() &&
    !!String(e.APPLE_APP_SPECIFIC_PASSWORD || '').trim() &&
    !!String(e.APPLE_TEAM_ID || '').trim();
  return { unlocked, signed, notarize };
}

module.exports = {
  prepareMacSigning,
  unlockMacKeychainFromEnv,
  normalizeCscName,
  applyCscName,
  applyAppleDefaults,
  NOTARIZE_KEYCHAIN_SERVICE,
  DEFAULT_APPLE_ID,
  DEFAULT_APPLE_TEAM_ID,
};

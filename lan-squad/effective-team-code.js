'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { hashTeamCode } = require('./team-code.js');

const WEAK_EXACT = new Set(['1234']);
const LEGACY_RANDOM_TEAM_CODE_RE = /^[a-f0-9]{32}$/i;
const MIN_TOKEN_LEN = 32;

function generateSecureLanToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isWeakLanToken(token) {
  const t = String(token || '').trim();
  if (!t || t.length < MIN_TOKEN_LEN) return true;
  if (WEAK_EXACT.has(t)) return true;
  if (LEGACY_RANDOM_TEAM_CODE_RE.test(t)) return true;
  return false;
}

function atomicWriteTeamCode(filePath, token) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, token + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

function rehashLanHostState(hostStatePath, plainToken) {
  if (!hostStatePath || !fs.existsSync(hostStatePath)) return { updated: false };
  const raw = fs.readFileSync(hostStatePath, 'utf8');
  const state = JSON.parse(raw);
  state.teamCodeHash = hashTeamCode(plainToken);
  const dir = path.dirname(hostStatePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${hostStatePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
  fs.renameSync(tmp, hostStatePath);
  return { updated: true };
}

function bootstrapLanTeamCode({ userDataPath, hostStatePath }) {
  const filePath = path.join(userDataPath, 'lan-team-code.txt');
  let token = '';
  let source = 'file';
  let requiresMigrationNotice = false;
  let rotated = false;

  if (process.env.R_PLUS_LAN_TEAM_CODE) {
    token = String(process.env.R_PLUS_LAN_TEAM_CODE).trim();
    if (isWeakLanToken(token)) {
      const err = new Error(
        'R_PLUS_LAN_TEAM_CODE is too weak (min 32 chars, not 1234/legacy 32-hex). Refusing to start.'
      );
      err.code = 'LAN_WEAK_ENV_TOKEN';
      throw err;
    }
    source = 'env';
  } else if (fs.existsSync(filePath)) {
    token = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1)[0].trim();
    if (isWeakLanToken(token)) {
      token = generateSecureLanToken();
      atomicWriteTeamCode(filePath, token);
      requiresMigrationNotice = true;
      rotated = true;
    }
  } else {
    token = generateSecureLanToken();
    atomicWriteTeamCode(filePath, token);
    source = 'created';
  }

  if (!token) {
    const err = new Error('Could not establish secure LAN team token');
    err.code = 'LAN_NO_TOKEN';
    throw err;
  }

  if (rotated) rehashLanHostState(hostStatePath, token);

  return { token, source, requiresMigrationNotice };
}

/** Read token from disk only (IPC); never returns weak or default fallbacks. */
function readLanTeamCodeFile({ userDataPath }) {
  const filePath = path.join(String(userDataPath || ''), 'lan-team-code.txt');
  try {
    if (!fs.existsSync(filePath)) return { ok: false, error: 'no_token_file' };
    const code = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1)[0].trim();
    if (!code || isWeakLanToken(code)) return { ok: false, error: 'weak_or_missing_token' };
    return { ok: true, code, source: 'file' };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : 'read_failed' };
  }
}

module.exports = {
  bootstrapLanTeamCode,
  rehashLanHostState,
  isWeakLanToken,
  generateSecureLanToken,
  readLanTeamCodeFile,
  LEGACY_RANDOM_TEAM_CODE_RE,
};

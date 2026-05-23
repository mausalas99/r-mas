'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LAN_TEAM_CODE = '1234';
/** Tokens opacos generados en versiones anteriores (32 hex). */
const LEGACY_RANDOM_TEAM_CODE_RE = /^[a-f0-9]{32}$/i;

function teamCodePathFor(userDataPath) {
  return path.join(String(userDataPath || ''), 'lan-team-code.txt');
}

function hostStatePathFor(userDataPath) {
  return path.join(String(userDataPath || ''), 'lan-squad-host-state.json');
}

/**
 * Instalaciones antiguas guardaron un token aleatorio opaco; la UI y los enlaces usan 1234.
 * Reescribe a 1234 y borra host-state para evitar HTTP 500 / 401 sin intervención manual.
 * @param {{ userDataPath: string }} opts
 * @returns {{ migrated: boolean, from?: string, to?: string, reason?: string }}
 */
function migratePlugAndPlayTeamCode(opts) {
  const userDataPath = opts && opts.userDataPath ? String(opts.userDataPath) : '';
  if (!userDataPath) return { migrated: false };

  const filePath = teamCodePathFor(userDataPath);
  try {
    if (!fs.existsSync(filePath)) return { migrated: false };
    const firstLine = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1)[0].trim();
    if (!LEGACY_RANDOM_TEAM_CODE_RE.test(firstLine)) return { migrated: false };
    fs.writeFileSync(filePath, DEFAULT_LAN_TEAM_CODE + '\n', 'utf8');
    const hostPath = hostStatePathFor(userDataPath);
    try {
      if (fs.existsSync(hostPath)) fs.unlinkSync(hostPath);
    } catch (_e) {
      /* host-state opcional */
    }
    return { migrated: true, from: firstLine, to: DEFAULT_LAN_TEAM_CODE, reason: 'legacy-random' };
  } catch (_e) {
    return { migrated: false };
  }
}

/**
 * Persiste lan-team-code.txt si aún no existe.
 * - Archivo existente o R_PLUS_LAN_TEAM_CODE: no escribe.
 * - Instalación nueva: 1234 (mismo valor que los enlaces de invitación).
 * @param {{ userDataPath: string }} opts
 * @returns {{ created: boolean, code?: string, source?: string }}
 */
function ensureLanTeamCodeFile(opts) {
  const userDataPath = opts && opts.userDataPath ? String(opts.userDataPath) : '';
  if (!userDataPath) return { created: false };

  const filePath = teamCodePathFor(userDataPath);
  try {
    if (fs.existsSync(filePath)) return { created: false };
  } catch (_e) {
    return { created: false };
  }

  if (process.env.R_PLUS_LAN_TEAM_CODE) {
    return { created: false };
  }

  try {
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(filePath, DEFAULT_LAN_TEAM_CODE + '\n', 'utf8');
    return { created: true, code: DEFAULT_LAN_TEAM_CODE, source: 'default-file' };
  } catch (_e) {
    return { created: false };
  }
}

/**
 * Misma regla que server.js al arrancar: archivo lan-team-code.txt (primera línea no vacía)
 * gana sobre R_PLUS_LAN_TEAM_CODE y el default (1234).
 * @param {{ userDataPath: string }} opts
 * @returns {{ code: string, source: 'file'|'env'|'default' }}
 */
function readEffectiveLanTeamCode(opts) {
  const userDataPath = opts && opts.userDataPath ? String(opts.userDataPath) : '';
  try {
    if (userDataPath) {
      const filePath = teamCodePathFor(userDataPath);
      if (fs.existsSync(filePath)) {
        const firstLine = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1)[0].trim();
        if (firstLine) return { code: firstLine, source: 'file' };
      }
    }
  } catch (_e) {
    /* keep env/default */
  }
  if (process.env.R_PLUS_LAN_TEAM_CODE) {
    return { code: String(process.env.R_PLUS_LAN_TEAM_CODE), source: 'env' };
  }
  return { code: DEFAULT_LAN_TEAM_CODE, source: 'default' };
}

module.exports = {
  readEffectiveLanTeamCode,
  ensureLanTeamCodeFile,
  migratePlugAndPlayTeamCode,
  DEFAULT_LAN_TEAM_CODE,
  LEGACY_RANDOM_TEAM_CODE_RE,
};

'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LAN_TEAM_CODE = '1234';

/**
 * Misma regla que server.js al arrancar: archivo lan-team-code.txt (primera línea no vacía)
 * gana sobre R_PLUS_LAN_TEAM_CODE y el default (1234).
 * @param {{ userDataPath: string }} opts
 * @returns {{ code: string, source: 'file'|'env'|'default' }}
 */
function readEffectiveLanTeamCode(opts) {
  const userDataPath = opts && opts.userDataPath ? String(opts.userDataPath) : '';
  let code = process.env.R_PLUS_LAN_TEAM_CODE || DEFAULT_LAN_TEAM_CODE;
  try {
    if (userDataPath) {
      const teamCodePath = path.join(userDataPath, 'lan-team-code.txt');
      if (fs.existsSync(teamCodePath)) {
        const firstLine = fs.readFileSync(teamCodePath, 'utf8').split(/\r?\n/, 1)[0].trim();
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

module.exports = { readEffectiveLanTeamCode, DEFAULT_LAN_TEAM_CODE };

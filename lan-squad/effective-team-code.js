'use strict';
const fs = require('node:fs');
const path = require('node:path');

/**
 * Misma regla que server.js al arrancar: archivo lan-team-code.txt (primera línea no vacía)
 * gana sobre R_PLUS_LAN_TEAM_CODE y el default change-me-in-profile.
 * @param {{ userDataPath: string }} opts
 * @returns {{ code: string, source: 'file'|'env'|'default' }}
 */
function readEffectiveLanTeamCode(opts) {
  const userDataPath = opts && opts.userDataPath ? String(opts.userDataPath) : '';
  let code = process.env.R_PLUS_LAN_TEAM_CODE || 'change-me-in-profile';
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
  return { code: 'change-me-in-profile', source: 'default' };
}

module.exports = { readEffectiveLanTeamCode };

'use strict';
const fs = require('fs');
const path = require('path');

function metaFilePath(userDataPath) {
  return path.join(String(userDataPath || ''), 'lan-host-clinical-meta.json');
}

/**
 * @param {string} userDataPath
 * @returns {{ rank: string, isProgramAdmin: boolean, startedAt: number, updatedAt: string }}
 */
function readHostClinicalMeta(userDataPath) {
  const fallback = { rank: 'R1', isProgramAdmin: false, startedAt: 0, updatedAt: '' };
  try {
    const raw = fs.readFileSync(metaFilePath(userDataPath), 'utf8');
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return fallback;
    return {
      rank: String(o.rank || 'R1').trim() || 'R1',
      isProgramAdmin: !!(o.isProgramAdmin || o.is_program_admin),
      startedAt: Number(o.startedAt) || 0,
      updatedAt: String(o.updatedAt || ''),
    };
  } catch (_e) {
    return fallback;
  }
}

/**
 * @param {string} userDataPath
 * @param {{ rank?: string, isProgramAdmin?: boolean }} payload
 */
function writeHostClinicalMeta(userDataPath, payload) {
  const prev = readHostClinicalMeta(userDataPath);
  const now = Date.now();
  const body = {
    rank: String(payload?.rank || 'R1').trim() || 'R1',
    isProgramAdmin: !!(payload?.isProgramAdmin || payload?.is_program_admin),
    startedAt: prev.startedAt > 0 ? prev.startedAt : now,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(metaFilePath(userDataPath), JSON.stringify(body), 'utf8');
  return body;
}

/** Stamp startedAt when the LAN server process starts (stable until meta file cleared). */
function ensureHostStartedAt(userDataPath) {
  return writeHostClinicalMeta(userDataPath, readHostClinicalMeta(userDataPath));
}

module.exports = {
  readHostClinicalMeta,
  writeHostClinicalMeta,
  ensureHostStartedAt,
  metaFilePath,
};

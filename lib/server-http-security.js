'use strict';

const { verifyTeamCode } = require('../lan-squad/team-code.js');

function normalizeClientIp(raw) {
  const ip = String(raw || '').trim();
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

/** @param {import('http').IncomingMessage} req */
function getRequestClientIp(req) {
  return normalizeClientIp(req.socket && req.socket.remoteAddress);
}

/** @param {string} ip */
function isLoopbackClientIp(ip) {
  return ip === '127.0.0.1' || ip === '::1';
}

/**
 * @param {() => { teamCodeHash?: string }} getHostState
 */
function createLanTokenVerifier(getHostState) {
  return function verifyLanBearerToken(token) {
    if (!token || typeof getHostState !== 'function') return false;
    try {
      const st = getHostState();
      return verifyTeamCode(String(token), st && st.teamCodeHash);
    } catch {
      return false;
    }
  };
}

/**
 * Document generation must come from the Electron shell (loopback) or an authenticated LAN client.
 * @param {() => { teamCodeHash?: string }} getHostState
 */
function createDocumentExportAuthMiddleware(getHostState) {
  const verifyLanBearer = createLanTokenVerifier(getHostState);
  return function documentExportAuth(req, res, next) {
    const ip = getRequestClientIp(req);
    if (isLoopbackClientIp(ip)) return next();
    const header = req.get('authorization') || '';
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
    const token = match ? match[1] : '';
    if (verifyLanBearer(token)) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

module.exports = {
  getRequestClientIp,
  isLoopbackClientIp,
  createLanTokenVerifier,
  createDocumentExportAuthMiddleware,
};

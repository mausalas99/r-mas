/**
 * LAN transport DI wiring (esbuild may duplicate transport across chunks).
 */
/** @type {{ runtime?: object, renderLanPanel?: () => void, joinLanRoom?: Function, resolveAutoJoinRoomId?: Function, openConnectionDropdown?: Function, bootLanRoomMembership?: Function } | null} */
let transportDeps = null;

/** @type {Promise<void> | null} */
var transportDepsWirePromise = null;

/** Literal key — esbuild may duplicate transport.mjs across chunks (see push.mjs / room.mjs). */
function lanSyncTransportDepsGlobal() {
  return globalThis['__LAN_SYNC_TRANSPORT_DEPS__'];
}

function setLanSyncTransportDepsGlobal(value) {
  globalThis['__LAN_SYNC_TRANSPORT_DEPS__'] = value;
}

export function registerLanSyncTransportDeps(deps) {
  transportDeps = deps && typeof deps === 'object' ? deps : null;
  if (transportDeps && typeof globalThis !== 'undefined') {
    setLanSyncTransportDepsGlobal(transportDeps);
  }
}

/**
 * Ensures orchestrator boot wiring ran (esbuild may load transport before registerLanSyncTransportDeps).
 * @returns {Promise<void>}
 */
export function ensureLanSyncTransportDepsWired() {
  if (transportDeps) return Promise.resolve();
  if (typeof globalThis !== 'undefined') {
    var cached = lanSyncTransportDepsGlobal();
    if (cached && typeof cached === 'object') {
      transportDeps = cached;
      return Promise.resolve();
    }
  }
  if (!transportDepsWirePromise) {
    transportDepsWirePromise = import('./orchestrator.mjs').then(function () {
      if (!transportDeps && typeof globalThis !== 'undefined') {
        var g = lanSyncTransportDepsGlobal();
        if (g && typeof g === 'object') transportDeps = g;
      }
    });
  }
  return transportDepsWirePromise;
}

export function deps() {
  if (!transportDeps && typeof globalThis !== 'undefined') {
    var cached = lanSyncTransportDepsGlobal();
    if (cached && typeof cached === 'object') transportDeps = cached;
  }
  if (!transportDeps) throw new Error('lan-sync-transport: registerLanSyncTransportDeps() not called');
  return transportDeps;
}

export function runtime() {
  return deps().runtime || { showToast() {} };
}

export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

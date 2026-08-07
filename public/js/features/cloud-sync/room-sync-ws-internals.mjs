import { noteCloudSyncWsLifecycle } from './cloud-sync-diagnostics.mjs';

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const SIGNAL_DEBOUNCE_MS = 300;

/** @typedef {'ws' | 'poll' | 'offline'} CloudSyncTransport */

/**
 * @param {{
 *   getBaseUrl: () => string,
 *   getToken: () => string,
 *   getRoomId: () => string,
 *   getRevision: () => number,
 *   onRevisionHint?: (revision: number) => void,
 * }} deps
 */
export function buildRoomLiveWsUrl(deps) {
  const base = String(deps.getBaseUrl() || '')
    .replace(/\/$/, '')
    .replace(/^http/i, 'ws');
  const roomId = String(deps.getRoomId() || '').trim();
  const token = String(deps.getToken() || '').trim();
  if (!base || !roomId || !token) return '';
  const revision = Number(deps.getRevision() || 0);
  const q = new URLSearchParams({
    access_token: token,
    revision: String(Number.isFinite(revision) ? revision : 0),
  });
  return `${base}/api/sync/v1/rooms/${encodeURIComponent(roomId)}/live?${q}`;
}

/**
 * @param {{
 *   getRevision: () => number,
 *   onRevisionHint?: (revision: number) => void,
 * }} deps
 */
export function createRoomWsSignalQueue(deps) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let signalTimer = null;
  let pendingRevision = 0;

  function flushSignal() {
    signalTimer = null;
    const rev = pendingRevision;
    pendingRevision = 0;
    if (!rev) return;
    const local = Number(deps.getRevision() || 0);
    if (rev > local) deps.onRevisionHint?.(rev);
  }

  function queueRevisionSignal(revision) {
    const rev = Number(revision);
    if (!Number.isFinite(rev) || rev <= 0) return;
    pendingRevision = Math.max(pendingRevision, rev);
    if (signalTimer) return;
    signalTimer = setTimeout(flushSignal, SIGNAL_DEBOUNCE_MS);
  }

  function handleMessage(raw) {
    try {
      const msg = JSON.parse(String(raw));
      const type = String(msg?.type || '');
      const rev = Number(msg?.revision);
      if (!Number.isFinite(rev) || rev <= 0) return;
      if (type === 'revision') {
        queueRevisionSignal(rev);
        return;
      }
      if (type === 'hello') {
        const local = Number(deps.getRevision() || 0);
        if (rev > local) queueRevisionSignal(rev);
      }
    } catch {
      /* ignore */
    }
  }

  function clear() {
    if (signalTimer) {
      clearTimeout(signalTimer);
      signalTimer = null;
    }
    pendingRevision = 0;
  }

  return { handleMessage, clear };
}

/**
 * @param {{
 *   wsRef: { current: WebSocket | null },
 *   signal: ReturnType<typeof createRoomWsSignalQueue>,
 *   scheduleReconnect: () => void,
 *   onOpen: () => void,
 * }} ctx
 * @param {string} url
 */
function wireRoomLiveSocket(ctx, url) {
  const redactedUrl = url.replace(/access_token=[^&]+/, 'access_token=***');
  try {
    ctx.wsRef.current = new WebSocket(url);
    noteCloudSyncWsLifecycle({ url: redactedUrl });
  } catch (err) {
    noteCloudSyncWsLifecycle({
      url,
      message: err && typeof err === 'object' ? String(err.message || err) : 'WebSocket constructor failed',
    });
    ctx.scheduleReconnect();
    return;
  }

  const ws = ctx.wsRef.current;
  ws.onopen = function () {
    ctx.onOpen();
    noteCloudSyncWsLifecycle({ url: redactedUrl });
  };
  ws.onmessage = function (ev) {
    ctx.signal.handleMessage(ev.data);
  };
  ws.onclose = function (ev) {
    ctx.wsRef.current = null;
    noteCloudSyncWsLifecycle({
      code: ev?.code,
      reason: String(ev?.reason || ''),
    });
    ctx.scheduleReconnect();
  };
  ws.onerror = function () {
    noteCloudSyncWsLifecycle({ message: 'WebSocket error' });
  };
}

/** @param {CloudSyncTransport} transport */
function readRoomWsTransportState(transport) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  return transport;
}

/**
 * @param {{
 *   wsRef: { current: WebSocket | null },
 *   reconnectTimer: { current: ReturnType<typeof setTimeout> | null },
 *   stopped: { current: boolean },
 *   reconnectDelay: { current: number },
 *   transport: { current: CloudSyncTransport },
 *   signal: ReturnType<typeof createRoomWsSignalQueue>,
 *   setTransport: (next: CloudSyncTransport) => void,
 * }} state
 * @param {ReturnType<typeof createRoomWsSignalQueue> extends infer _ ? Parameters<typeof buildRoomLiveWsUrl>[0] : never} deps
 */
function roomWsClearReconnect(state) {
  if (state.reconnectTimer.current != null) {
    clearTimeout(state.reconnectTimer.current);
    state.reconnectTimer.current = null;
  }
}

function roomWsCloseSocket(state) {
  if (!state.wsRef.current) return;
  try {
    state.wsRef.current.close();
  } catch {
    /* ignore */
  }
  state.wsRef.current = null;
}

function roomWsConnect(state, deps) {
  if (state.stopped.current || typeof WebSocket === 'undefined') return;
  const url = buildRoomLiveWsUrl(deps);
  if (!url) return;
  roomWsCloseSocket(state);
  wireRoomLiveSocket(
    {
      wsRef: state.wsRef,
      signal: state.signal,
      scheduleReconnect: function () {
        roomWsScheduleReconnect(state, deps);
      },
      onOpen: function () {
        state.reconnectDelay.current = RECONNECT_MIN_MS;
        state.setTransport('ws');
      },
    },
    url
  );
}

function roomWsScheduleReconnect(state, deps) {
  if (state.stopped.current) return;
  state.setTransport('poll');
  roomWsClearReconnect(state);
  state.reconnectTimer.current = setTimeout(function () {
    state.reconnectTimer.current = null;
    roomWsConnect(state, deps);
  }, state.reconnectDelay.current);
  state.reconnectDelay.current = Math.min(
    RECONNECT_MAX_MS,
    Math.floor(state.reconnectDelay.current * 1.5)
  );
}

/**
 * @param {{
 *   getBaseUrl: () => string,
 *   getToken: () => string,
 *   getRoomId: () => string,
 *   getRevision: () => number,
 *   onRevisionHint?: (revision: number) => void,
 *   onTransportChange?: (transport: CloudSyncTransport) => void,
 * }} deps
 */
export function createRoomWsController(deps) {
  const wsRef = { current: /** @type {WebSocket | null} */ (null) };
  const reconnectTimer = { current: /** @type {ReturnType<typeof setTimeout> | null} */ (null) };
  const stopped = { current: false };
  const reconnectDelay = { current: RECONNECT_MIN_MS };
  const transport = { current: /** @type {CloudSyncTransport} */ ('poll') };
  const signal = createRoomWsSignalQueue(deps);

  function setTransport(next) {
    if (transport.current === next) return;
    transport.current = next;
    deps.onTransportChange?.(next);
  }

  const state = {
    wsRef,
    reconnectTimer,
    stopped,
    reconnectDelay,
    transport,
    signal,
    setTransport,
  };

  function getTransportState() {
    return readRoomWsTransportState(transport.current);
  }

  function armConnect() {
    reconnectDelay.current = RECONNECT_MIN_MS;
    roomWsConnect(state, deps);
  }

  function haltSocket(clearSignal) {
    roomWsClearReconnect(state);
    if (clearSignal) signal.clear();
    roomWsCloseSocket(state);
    setTransport('poll');
  }

  return {
    start() {
      stopped.current = false;
      armConnect();
    },
    stop() {
      stopped.current = true;
      haltSocket(true);
    },
    pause() {
      haltSocket(false);
    },
    resume() {
      if (!stopped.current) armConnect();
    },
    getTransportState,
  };
}

export { RECONNECT_MIN_MS, RECONNECT_MAX_MS };

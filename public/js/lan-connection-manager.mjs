/**
 * LanConnectionManager — transparent WS → SSE → HTTP-poll fallback.
 *
 * Mirrors LanClient's EventTarget events (lan-patch, lan-live, lan-status,
 * lan-live-status) so panel.mjs / orchestrator.mjs need no handler rewrites.
 *
 * State machine:
 *   WS (default) → SSE (≥3 consecutive WS sync failures)
 *   SSE → POLL   (SSE connect fails × 2)
 *   * → WS       (WS connects successfully)
 */

const POLL_INTERVAL_MS = 15_000;
const WS_FAIL_THRESHOLD = 3;
const SSE_FAIL_THRESHOLD = 2;

/**
 * @param {{ lanClient: object, sseClientFactory: () => object }} opts
 */
export function createLanConnectionManager({ lanClient, sseClientFactory }) {
  let _transport = 'ws';
  let _hostUrl = '';
  let _teamCode = '';
  let _wsFailCount = 0;
  let _sseFailCount = 0;
  let _sseClient = null;
  let _sseRetryTimer = null;
  let _pollTimer = null;
  const _eventListeners = new Map();

  function _emit(event, detail) {
    const cbs = _eventListeners.get(event) || [];
    cbs.forEach((cb) => { try { cb({ detail }); } catch (_e) {} });
  }

  function addEventListener(event, cb) {
    if (!_eventListeners.has(event)) _eventListeners.set(event, []);
    _eventListeners.get(event).push(cb);
    lanClient.addEventListener(event, cb);
  }

  function getTransport() { return _transport; }

  function _transitionToSse() {
    if (_transport === 'sse') return;
    _transport = 'sse';
    _connectSse();
  }

  function _transitionToPoll() {
    if (_transport === 'poll') return;
    _transport = 'poll';
    _stopSse();
    _startPoll();
  }

  function _transitionToWs() {
    _transport = 'ws';
    _wsFailCount = 0;
    _sseFailCount = 0;
    _stopSse();
    _stopPoll();
  }

  async function _connectSse() {
    _stopSse();
    _sseClient = sseClientFactory();
    try {
      await _sseClient.connect(_hostUrl, _teamCode, 'sync', (ev) => {
        _emit('lan-patch', ev);
      });
    } catch (_e) {
      _sseFailCount++;
      if (_sseFailCount >= SSE_FAIL_THRESHOLD) {
        _transitionToPoll();
      } else {
        _sseRetryTimer = setTimeout(_connectSse, 2000);
        if (typeof _sseRetryTimer.unref === 'function') _sseRetryTimer.unref();
      }
    }
  }

  function _stopSse() {
    if (_sseRetryTimer) { clearTimeout(_sseRetryTimer); _sseRetryTimer = null; }
    if (_sseClient) { try { _sseClient.disconnect(); } catch (_e) {} _sseClient = null; }
  }

  function _startPoll() {
    _stopPoll();
    _pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${_hostUrl}/api/lan/v1/health`, {
          headers: { Authorization: `Bearer ${_teamCode}` },
        });
        if (res.ok) {
          const data = await res.json();
          _emit('lan-patch', { type: 'livesync:poll', ...data });
        }
      } catch (_e) {}
    }, POLL_INTERVAL_MS);
    if (typeof _pollTimer.unref === 'function') _pollTimer.unref();
  }

  function _stopPoll() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  lanClient.addEventListener('lan-status', ({ detail }) => {
    if (!detail) return;
    if (detail.connected) {
      _transitionToWs();
    } else if (detail.channel === 'sync') {
      _wsFailCount++;
      if (_transport === 'ws' && _wsFailCount >= WS_FAIL_THRESHOLD) {
        _transitionToSse();
      }
    }
  });

  function connect(hostUrl, teamCode) {
    _hostUrl = String(hostUrl || '');
    _teamCode = String(teamCode || '');
    lanClient.configure({ hostUrl: _hostUrl, teamCode: _teamCode });
    lanClient.connectSyncChannel();
  }

  function disconnect() {
    lanClient.disconnect();
    _stopSse();
    _stopPoll();
    _transport = 'ws';
    _wsFailCount = 0;
    _sseFailCount = 0;
  }

  function _simulateSseFailure() {
    _sseFailCount++;
    if (_sseFailCount >= SSE_FAIL_THRESHOLD) _transitionToPoll();
  }

  return { connect, disconnect, addEventListener, getTransport, _simulateSseFailure };
}

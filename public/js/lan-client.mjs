export function parseWsPayload(s) {
  try {
    return JSON.parse(String(s));
  } catch {
    return null;
  }
}

export class LanClient extends EventTarget {
  constructor() {
    super();
    this._ws = null;
    this._cfg = null;
    this._connected = false;
  }

  get connected() {
    return this._connected;
  }

  configure(cfg) {
    this._cfg = cfg;
  }

  baseUrl() {
    const c = this._cfg;
    if (!c || !c.hostUrl) return '';
    return String(c.hostUrl).replace(/\/$/, '');
  }

  async fetch(path, opts = {}) {
    const url = `${this.baseUrl()}${path}`;
    const team = this._cfg ? String(this._cfg.teamCode ?? '') : '';
    const headers = {
      ...(opts.headers || {}),
      'X-Lan-Team-Code': team,
    };
    return fetch(url, { ...opts, headers });
  }

  /** WebSocket de presencia / notificaciones LAN (pacientes, etc.); no es el relay `live:*` de salas. */
  connectSyncChannel() {
    this._openWs('sync');
  }

  connectLiveChannel(roomId) {
    this._openWs('live:' + encodeURIComponent(roomId));
  }

  _openWs(channel) {
    if (this._ws) {
      try {
        this._ws.close();
      } catch (_e) {
        /* ignore */
      }
    }
    const base = this.baseUrl().replace(/^http/, 'ws');
    const code = encodeURIComponent(this._cfg.teamCode || '');
    const u = `${base}/api/lan/v1/ws?code=${code}&channel=${encodeURIComponent(channel)}`;
    this._ws = new WebSocket(u);
    this._ws.onopen = () => {
      this._connected = true;
      this.dispatchEvent(new CustomEvent('lan-status', { detail: { connected: true } }));
    };
    this._ws.onclose = () => {
      this._connected = false;
      this.dispatchEvent(new CustomEvent('lan-status', { detail: { connected: false } }));
    };
    this._ws.onmessage = (ev) => {
      const data = parseWsPayload(ev.data);
      if (data) this.dispatchEvent(new CustomEvent('lan-patch', { detail: data }));
    };
  }

  disconnect() {
    if (this._ws) {
      try {
        this._ws.close();
      } catch (_e) {
        /* ignore */
      }
      this._ws = null;
    }
    this._connected = false;
  }
}

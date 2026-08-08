import { DurableObject } from 'cloudflare:workers';

/**
 * Per-room WebSocket hub — fans out revision hints after HTTP push (no PHI on wire).
 */
export class RoomSyncHub extends DurableObject {
  /** @type {number} */
  lastRevision = 0;

  /**
   * @param {{ revision: number, at?: string }} payload
   */
  broadcastRevision(payload) {
    const rev = Number(payload?.revision);
    if (!Number.isFinite(rev) || rev <= 0) return;
    this.lastRevision = Math.max(this.lastRevision, rev);
    const msg = JSON.stringify({
      type: 'revision',
      revision: rev,
      at: payload?.at || new Date().toISOString(),
    });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(msg);
      } catch {
        /* closed */
      }
    }
  }

  /** @param {Request} request */
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/notify' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      this.broadcastRevision(body);
      return Response.json({ ok: true });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const hinted = Number(
      request.headers.get('X-Room-Revision') || url.searchParams.get('revision') || 0
    );
    if (Number.isFinite(hinted) && hinted > 0) {
      this.lastRevision = Math.max(this.lastRevision, hinted);
    }

    server.send(
      JSON.stringify({
        type: 'hello',
        revision: this.lastRevision,
      })
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  /** @param {WebSocket} _ws @param {string | ArrayBuffer} message */
  async webSocketMessage(_ws, message) {
    const text =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    try {
      const data = JSON.parse(text);
      if (data?.type === 'ping') {
        _ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      /* ignore */
    }
  }
}

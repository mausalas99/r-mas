# LAN Networking Substrate — Design Spec

**Date:** 2026-06-07  
**Status:** Approved — ready for implementation planning  
**Scope:** Ten features re-architecting R+ LAN discovery, connectivity, and diagnostics for multi-subnet hospital Wi-Fi environments.

---

## Problem Statement

The current LAN layer has three compounding weaknesses in clinical settings:

1. **Discovery is IP-scan-only.** The `/24` brute-force scan (concurrency 6) is too slow on large subnets and fails entirely when peers are on different VLANs without mDNS or multicast hints.
2. **Host identity is IP-based.** A Wi-Fi roam changes the host IP, triggering a full rescan and reconnect cycle — disruptive mid-shift.
3. **Connection is WS-only.** Hospital proxies that block WebSocket upgrades produce "host is up but app feels broken" failures with no fallback.

Layered on top: the diagnostic panel is hidden in a `<details>` disclosure, outbox depth is invisible to users during offline phases, and QR codes carry no ward-identity verification — two hospitals with overlapping `192.168.x.x` guest ranges can produce accidental cross-ward joins.

---

## Approach: Host Registry with Layered Transports

**Core principle:** introduce `lan-host-registry.mjs` as a single in-memory mediator keyed by *fingerprint* (`clientId:startedAt`), not IP. All discovery paths write into it; all reconnect paths read from it. The registry decouples discovery from connection.

This avoids a full `transport.mjs` rewrite — existing call sites are consumers of the registry rather than owners of ad-hoc storage keys.

---

## Section A — Host Registry

### A1 — `HostRecord` shape

```js
const SOURCE_WEIGHT = {
  heartbeat:    5,
  mdns:         4,
  health_poll:  3,
  udp:          2,
  scan:         1,
};

/**
 * @typedef {Object} HostRecord
 * @property {string}  fingerprint   — "${clientId}:${startedAt}"
 * @property {string}  clientId      — stable across IP changes
 * @property {number}  startedAt     — epoch ms; changes only on host restart
 * @property {string}  currentUrl    — mutable: http://IP:3738
 * @property {string}  rank          — 'R4' | 'R3' | 'R2' | 'R1'
 * @property {boolean} dbUnlocked
 * @property {boolean} shiftPinActive
 * @property {number}  rttMs
 * @property {number}  lastSeenAt    — Date.now() at last write
 * @property {keyof SOURCE_WEIGHT} source
 */
```

`startedAt` in the fingerprint is the critical detail: it differentiates a host that changed IP (same `startedAt`) from one that restarted (new `startedAt`). The registry evicts the old fingerprint on restart and treats the host as a new peer.

### A2 — `lan-host-registry.mjs` API

**New file:** `public/js/lan-host-registry.mjs`  
**Imports:** `lan-host-subnet-discovery.mjs` only (leaf — no circular risk).

```
upsertHost(record)         — write or update by fingerprint
                             URL update: overwrite only if incoming source weight
                             ≥ existing source weight OR lastSeenAt is more recent
                             within the same source tier.
findByFingerprint(fp)      — HostRecord | null
findByUrl(url)             — HostRecord | null (reverse lookup)
listHosts()                — HostRecord[] (non-evicted)
evictStale(maxAgeMs=90000) — removes entries not seen within window
getPinnedFingerprint()     — reads localStorage 'rplus.lan.pinnedFingerprint'
setPinnedFingerprint(fp)   — writes localStorage
clearPinnedFingerprint()   — removes localStorage key
```

**Eviction:** orchestrator calls `evictStale()` every 30 s (aligned with heartbeat period).

**Persistence:** registry is in-memory only. The *pinned fingerprint* is persisted to `localStorage` (`rplus.lan.pinnedFingerprint`). The pinned URL is still maintained separately in `rplus.lan.pinnedHostUrl` for backward compat with `lan-host-pin.mjs`.

### A3 — Integration with existing storage

`lan-surrogate-host.mjs` `recordLivePeer` becomes a thin shim:

```js
export function recordLivePeer(clientId, meta) {
  // existing localStorage write preserved for compat
  // ...existing code...
  // NEW: also upsert into registry if fingerprint available
  if (meta && meta.startedAt) {
    registry.upsertHost({
      fingerprint: `${clientId}:${meta.startedAt}`,
      clientId, startedAt: meta.startedAt,
      currentUrl: meta.hostUrl,
      source: 'heartbeat',
      lastSeenAt: Date.now(),
    });
  }
}
```

No API breakage, no file deletions. Registry supersedes storage as authority; shim keeps existing consumers working.

`transport.mjs` reads pinned host from registry at join time, writes fingerprint after `/health` confirms identity (Section C1). No structural change to transport logic.

---

## Section B — Discovery Aggregation

### B1 — mDNS / Bonjour (`_rplus._tcp`)

**New dependency:** `bonjour-service` (pure JS, no native bindings, no `asarUnpack` needed).

**New file:** `lan-squad/lan-mdns-service.js` (CommonJS)

Advertises on host startup:
```
type:  _rplus._tcp
port:  3738
TXT:   { clientId, startedAt, rank, teamHash }
```

`teamHash = sha256(teamCode).slice(0, 8)` — ward identity token, never exposes the bearer. Same token used in QR URLs (Section E) and UDP beacon (B2), making it a consistent ward-identity signal across all discovery channels.

Browses `_rplus._tcp` continuously. On `service-up`, emits discovered peer via callback. `main.js` receives it and calls `safeSendToRenderer('lan:mdns-peers', [peer])`.

**`main.js` wiring:**
```js
const lanMdnsService = createLanMdnsService({ clientId, startedAt, rank, teamHash });
lanMdnsService.start();
// In lanNetworkWatch callback:
lanMdnsService.restart(payload.candidateBaseUrl); // re-advertise on NIC change
```

**Renderer (new `preload.js` channel):**
```js
onLanMdnsPeers: (cb) => ipcRenderer.on('lan:mdns-peers', (_e, peers) => cb(peers))
```

`orchestrator.mjs` subscribes at boot, feeds each peer into the registry with `source: 'mdns'`. Subnet scan is not triggered if registry already has a host matching the pinned fingerprint.

**Cross-subnet limitation:** mDNS multicast is suppressed at VLAN boundaries. On multi-VLAN networks, mDNS covers same-subnet peers only. The subnet HTTP scan remains the cross-VLAN fallback and is not removed.

### B2 — UDP Multicast Beacon (port 3739)

**New file:** `lan-squad/lan-udp-beacon.js` (CommonJS, Node `dgram`, no new deps)

Multicast group: `239.255.42.1` (private range, avoids collision with mDNS `224.0.0.251` and SSDP `239.255.255.250`).

**Listen side** (always-on when app runs):
- Joins multicast group on port 3739
- On receiving `{ type: 'rplus-discover' }`: responds unicast to sender with `{ type: 'rplus-beacon', port: 3738, clientId, startedAt, rank, teamHash }`
- Team code is never transmitted over UDP

**Discover side** (on-demand):
- Sends `{ type: 'rplus-discover' }` to `239.255.42.1:3739`
- Collects unicast replies for 500 ms, returns array of beacon records

**`main.js` wiring:**
```js
const udpBeacon = createUdpBeacon({ clientId, startedAt, rank, teamHash, port: 3739 });
udpBeacon.startListening();
ipcMain.handle('lan-udp-discover', async () => udpBeacon.discover(500));
```

**New `preload.js` channel:**
```js
lanUdpDiscover: () => ipcRenderer.invoke('lan-udp-discover')
```

**Renderer — concurrent discovery:**
```js
const [udpHosts, scannedHosts] = await Promise.all([
  window.electronAPI.lanUdpDiscover(),
  discoverLanHostsOnAllLocalSubnetsViaBeacon(ownBaseUrl),
]);
[...udpHosts, ...scannedHosts].forEach(h =>
  registry.upsertHost({ ...h, source: h._fromUdp ? 'udp' : 'scan', lastSeenAt: Date.now() })
);
```

UDP resolves first (< 500 ms); subnet scan fills cross-subnet hosts as it completes. Both write into the same registry — no sequential dependency.

### B3 — Fingerprint-Based Roam (no full rescan)

**Modified file:** `public/js/lan-network-roam.mjs`

New exported function: `applyLanNetworkRoamingWithFingerprint(payload, registry)`

Roam decision tree:
```
1. pinnedFp = registry.getPinnedFingerprint()
   → if pinnedFp is set:
       record = registry.findByFingerprint(pinnedFp)
       → if record && record.currentUrl !== savedHostUrl:
           ping(record.currentUrl, teamCode)  ← validates currentUrl is reachable
             → success: return { shortcut: true, newUrl: record.currentUrl }
             → fail: return { shortcut: false }  (stale entry; mDNS/heartbeat will update)
       → if no record: return { shortcut: false }
2. existing applyLanNetworkRoaming(payload) — clears stale pin, preps for rescan
```

**`lan-network-change.mjs`** replaces the `applyLanNetworkRoaming(payload)` call:
```js
const result = await applyLanNetworkRoamingWithFingerprint(payload, registry);
if (result.shortcut) {
  await persistLanClientConfig(result.newUrl, teamCode); // transport.mjs, already imported
  return; // skip restartLanDiscoveryAfterNetworkChange()
}
applyLanNetworkRoaming(payload);
await restartLanDiscoveryAfterNetworkChange();
```

This keeps `lan-network-roam.mjs` as a leaf module — it imports only `storage.js`, `runtime.mjs`, `lan-host-pin.mjs`, and `lan-host-subnet-discovery.mjs`. The call to `persistLanClientConfig` stays in `lan-network-change.mjs`, which already imports `transport.mjs`.

**Why the ping is required:** mDNS re-advertisement after NIC change may be delayed by up to ~1 s. If the registry still holds a stale IP at roam time, the ping miss falls through to the normal rescan path — correct behavior.

### B4 — Exponential Backoff on Shift-PIN Scan

**Modified file:** `public/js/lan-shift-pin-connect.mjs`

```js
const BACKOFF_STEPS_MS = [12_000, 30_000, 60_000, 120_000];
let _easyConnectFailCount = 0;
let _lastEasyConnectAttemptMs = 0;

function easyConnectCooldownMs() {
  return BACKOFF_STEPS_MS[Math.min(_easyConnectFailCount, BACKOFF_STEPS_MS.length - 1)];
}
```

`lan-shift-pin-connect.mjs` exports `resetShiftPinBackoff()`. `_easyConnectFailCount` resets to `0` when:
- Successful join
- Explicit user tap (bypasses cooldown on demand)
- `lan-network-changed` fires — `lan-network-change.mjs` calls `resetShiftPinBackoff()` at start of `handleLanNetworkChanged`
- `lanNetworkProfile` transitions out of `offline`

While `lanNetworkProfile.getNetworkProfile() === 'offline'`, skip scan attempt entirely and return early without incrementing fail count ("guard paused" — saves battery/CPU).

---

## Section C — Health Endpoint + Pre-flight Row

### C1 — `GET /api/lan/v1/health` (unauthenticated)

**Modified file:** `lan-squad/host-router.js`

New route, parallel to `/beacon`:
```json
{
  "lan": true,
  "dbUnlocked": true,
  "shiftPinActive": true,
  "hostRank": "R4",
  "clientId": "lc_abc123",
  "startedAt": 1717800000000,
  "revision": 418
}
```

Sources within `host-router.js`:
- `dbUnlocked` — `getState().dbUnlocked` (already tracked in `host-store.js`)
- `shiftPinActive` — `shift-pin-store.js` `isShiftPinActive()`
- `clientId`, `startedAt` — `host-clinical-meta.js` `getHostClinicalMeta()`
- `revision` — `getState().revision`

**Registry integration:** `transport.mjs` calls `/health` once after a successful join (replaces the current post-join `/ping` call). On success:
1. Writes `rplus.lan.pinnedFingerprint = ${clientId}:${startedAt}` to `localStorage`
2. Calls `registry.upsertHost({ ...healthData, currentUrl: hostUrl, source: 'health_poll', rttMs })`

This makes `/health` the authoritative fingerprint source — clients only pin a host that is authenticated and active, preventing accidental binding to a host in a transition state.

### C2 — Pre-flight Checklist Row in ⇄ Panel

**Modified file:** `public/js/features/lan/panel.mjs`

New function `renderLanPreflightRow(root, preflight)` (≤ 60 lines), renders an always-visible one-line status strip above the connect CTA. The strip collapses to RTT-badge-only when phase is `live`.

Indicators (colored dot + label):

| Ping RTT | Bearer | Subnet | DB | Can host |
|---|---|---|---|---|
| 42 ms ✓ | valid ✓ | ✓ | unlocked ✓ | no (R3) |

Data sources (all already assembled in `buildLanSyncDiagnosticsDeps()` or the registry):
- **RTT** — `HostRecord.rttMs` (updated on each ping / heartbeat)
- **Bearer validity** — HTTP status from last `/health` call (200 = valid, 401 = invalid)
- **Subnet match** — `isHostOnCurrentSubnets(hostUrl, currentPrefixes)` (already in `lan-host-subnet-discovery.mjs`)
- **DB unlocked** — `HostRecord.dbUnlocked` (from `/health`; shown as "anfitrión bloqueado" when false, distinguishing "host down" from "host locked")
- **Can host** — `canLocalMacBeLanHost()` (already available)

No additional HTTP requests — data arrives via the registry, which is updated by heartbeats (D) and health polls (C1).

**Debug copy:** `shift+click` on the row calls:
```js
navigator.clipboard.writeText(
  JSON.stringify(registry.findByFingerprint(registry.getPinnedFingerprint()), null, 2)
);
```

---

## Section D — Host Heartbeat (`livesync:hello`)

**Modified file:** `lan-squad/host-router.js`

Timer started after `attachWsHub` wiring, or in `server.js` startup:
```js
const HEARTBEAT_INTERVAL_MS = 30_000;
setInterval(() => {
  broadcast('sync', {
    type: 'livesync:hello',
    clientId, startedAt, revision,
    rank, dbUnlocked, shiftPinActive,
  });
}, HEARTBEAT_INTERVAL_MS);
```

Broadcast fans out to both the WS hub `sync` room and SSE `sync` clients (Section F). Receiving the same heartbeat on both WS and SSE during a transport transition is safe — the registry fingerprint upsert is idempotent.

**Client side** (`panel.mjs` / `orchestrator.mjs`):
```js
if (data.type === 'livesync:hello') {
  registry.upsertHost({
    ...data,
    currentUrl: lanHostUrl(),
    source: 'heartbeat',
    lastSeenAt: Date.now(),
  });
  // If offline phase but WS/SSE just delivered this → peer is reachable → trigger reconnect
  if (getRoomSyncPhase(roomId) === RoomSyncPhase.offline) {
    triggerReconnect();
  }
}
```

The heartbeat replaces the need for subnet scans when the client is already connected to the correct Wi-Fi — the host announces itself rather than requiring clients to search.

---

## Section E — QR Team Fingerprint

**Modified file:** `public/js/lan-join-link.mjs`

`buildTeamHash(teamCode)`:
- Renderer: `SubtleCrypto.digest('SHA-256', encoded)` → hex slice `[0, 8]`
- Node/tests: `crypto.createHash('sha256').update(teamCode).digest('hex').slice(0, 8)`

`buildLanJoinUrls()` and `buildPermanentMobileJoinUrl()` append `&th=${teamHash}` to all generated join URLs.

**Verification on join** (`lan-shift-pin-connect.mjs`, ticket join path in `transport.mjs`):
```js
const urlTeamHash = new URL(joinUrl).searchParams.get('th');
if (urlTeamHash && computedTeamHash !== urlTeamHash) {
  showToast('Este enlace es de otra sala o servicio. Verifica con el anfitrión.', 'warn');
  return; // abort — do not exchange PIN
}
```

**Backward compatibility:** if `th` is absent (old QR, legacy URLs), join proceeds normally. The check is opt-in.

---

## Section F — Graceful WS Fallback (`LanConnectionManager`)

### F1 — `lan-sse-client.mjs` (renderer, fetch-based)

**New file:** `public/js/lan-sse-client.mjs`

Uses `fetch()` + `ReadableStream` — not `EventSource` — because `EventSource` cannot set custom headers. Electron's Chromium renderer supports async iteration over response body streams.

```js
export class LanSseClient {
  _ctrl = null;

  async connect(baseUrl, teamCode, channel, onEvent, signal) {
    this._ctrl = new AbortController();
    const combinedSignal = anyAborted([this._ctrl.signal, signal]);
    const res = await fetch(
      `${baseUrl}/api/lan/v1/sse?channel=${encodeURIComponent(channel)}`,
      { headers: { Authorization: `Bearer ${teamCode}` }, signal: combinedSignal }
    );
    if (!res.ok || !res.body) throw new Error('sse_connect_failed');
    for await (const line of readEventStreamLines(res.body)) {
      const ev = parseSseLine(line); // parses 'data: {...}\n\n'
      if (ev) onEvent(ev);
    }
  }

  disconnect() { this._ctrl?.abort(); }
}
```

### F2 — `lan-connection-manager.mjs` (renderer)

**New file:** `public/js/lan-connection-manager.mjs` (≤ 150 lines)

State machine:

```
WS (default)
  → SSE  : LanClient syncConnectAttempt ≥ 3 consecutive failures
SSE
  → POLL : SSE connect fails or drops × 2
POLL (last resort — HTTP GET /health every 15 s)
  → WS   : next user-initiated reconnect or lan-network-changed
Any state → WS : WS connects successfully (recovery)
```

Exposes the same `EventTarget` events as `LanClient` (`lan-patch`, `lan-live`, `lan-status`, `lan-live-status`) so `panel.mjs` switches from listening on `lanClient` to `connectionManager` with a single import change — no event handler rewrites.

`connect(hostUrl, teamCode)` starts the WS path. On WS failure detection it silently promotes to SSE; on SSE failure it silently promotes to HTTP poll. The active transport is tracked in `_transport: 'ws' | 'sse' | 'poll'` — surfaced in the pre-flight row (Section C2) as a small badge: "WS" / "SSE" / "HTTP poll".

### F3 — `lan-sse-hub.js` (server, Express router)

**New file:** `lan-squad/lan-sse-hub.js` (CommonJS)

```js
function createSseHub() {
  const clients = new Map(); // res → { channel, send }

  function attachSseRouter(router, { getState }) {
    router.get('/sse', createBearerAuthMiddleware(getState), (req, res) => {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control':  'no-cache',
        'Connection':     'keep-alive',
        'X-Accel-Buffering': 'no', // nginx proxy: disable buffering
      });
      res.flushHeaders();
      const channel = String(req.query.channel || 'sync');
      const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
      const keepAlive = setInterval(() => res.write(':\n\n'), 20_000);
      clients.set(res, { channel, send });
      req.on('close', () => { clearInterval(keepAlive); clients.delete(res); });
    });
  }

  function broadcast(channel, obj) {
    for (const [, client] of clients) {
      if (client.channel === channel) {
        try { client.send(obj); } catch (_e) {}
      }
    }
  }

  return { attachSseRouter, broadcast };
}
```

`host-router.js` `broadcastLiveRevision` is extended to call `sseBroadcast(channel, obj)` in addition to the WS `broadcast`. Heartbeat timer calls `sseHub.broadcast('sync', helloPayload)` alongside WS broadcast.

`X-Accel-Buffering: no` disables nginx response buffering — required for SSE to flow through common hospital reverse proxies.

### F4 — Timing alignment

| Signal | Period | Channel |
|---|---|---|
| Host heartbeat | 30 s | WS sync + SSE sync |
| SSE keep-alive `:\n\n` | 20 s | SSE only (proxy prevention) |
| HTTP poll fallback | 15 s | HTTP GET `/health` |
| Registry eviction | 90 s | In-memory (orchestrator tick) |
| Shift-PIN backoff max | 120 s | Renderer |

The SSE keep-alive (20 s) is shorter than the heartbeat (30 s) by design — the keep-alive prevents proxy timeouts so the heartbeat is not the first packet the proxy sees after a long gap.

---

## Section G — Outbox Depth Badge

**Modified file:** `public/js/features/lan/panel.mjs`

`outboxCount` is already computed in `buildLanSyncDiagnosticsDeps()` (line 1527). When `phase === 'offline'` or `phase === 'queued'`, render a badge next to the ⇄ status indicator:

```
⇄  QUEUED  [3 pendientes]
```

The badge uses the existing `outboxCount` value — no new data fetching. It is removed (or shows "0") when the connection transitions back to `live`.

---

## File Inventory

### New files

| File | Layer | Section |
|---|---|---|
| `public/js/lan-host-registry.mjs` | renderer | A |
| `lan-squad/lan-mdns-service.js` | main/node | B1 |
| `lan-squad/lan-udp-beacon.js` | main/node | B2 |
| `public/js/lan-sse-client.mjs` | renderer | F1 |
| `public/js/lan-connection-manager.mjs` | renderer | F2 |
| `lan-squad/lan-sse-hub.js` | server | F3 |

### Modified files

| File | Change | Section |
|---|---|---|
| `public/js/lan-network-roam.mjs` | fingerprint roam shortcut | B3 |
| `public/js/lan-shift-pin-connect.mjs` | exponential backoff + `resetShiftPinBackoff()` export | B4 |
| `public/js/lan-network-change.mjs` | fingerprint roam caller + `resetShiftPinBackoff` call | B3, B4 |
| `lan-squad/host-router.js` | `/health` route + heartbeat timer + SSE broadcast | C1, D, F3 |
| `public/js/lan-join-link.mjs` | `teamHash` in QR URLs | E |
| `public/js/features/lan/panel.mjs` | pre-flight row + outbox badge + debug copy | C2, G |
| `public/js/lan-surrogate-host.mjs` | `recordLivePeer` shim to registry | A3 |
| `main.js` | mDNS + UDP beacon IPC wiring | B1, B2 |
| `preload.js` | `onLanMdnsPeers`, `lanUdpDiscover` channels | B1, B2 |
| `package.json` | add `bonjour-service` dependency | B1 |

---

## Constraints & Non-Goals

- **No transport.mjs restructure.** It reads from the registry instead of ad-hoc storage; its internal pairing logic is unchanged.
- **No new SQLCipher schema.** Registry is in-memory; no persistence beyond the pinned fingerprint in localStorage.
- **No WS protocol changes.** SSE is additive; the WS auth handshake and room model are untouched.
- **No mobile/interno scope.** These changes apply to the Electron desktop app only. Mobile join URLs gain `th` param but the verification is desktop-only for now.
- **mDNS is a fast-path hint, not a replacement.** The subnet HTTP scan remains for cross-VLAN discovery.
- **bonjour-service adds no native rebuild.** Pure JS; existing `electron-rebuild` pipeline is not affected.

---

## Open Questions (resolved)

| Question | Resolution |
|---|---|
| WS + SSE double heartbeat | Safe — registry upsert is idempotent by fingerprint |
| SSE auth (EventSource can't set headers) | Use `fetch()` + `ReadableStream` — Electron Chromium supports it |
| bonjour-service native rebuild? | No — pure JS, no `.node` file |
| Cross-subnet mDNS | Not expected to work — explicitly documented as same-VLAN only |
| teamHash collision risk (8 hex chars) | 1-in-4B chance with honest ward codes; acceptable for a soft UI warning |

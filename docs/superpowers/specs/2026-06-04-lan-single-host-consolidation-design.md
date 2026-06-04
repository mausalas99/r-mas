# LAN Single-Host Consolidation — Design

**Date:** 2026-06-04
**Status:** Approved — implementation plan:
`docs/superpowers/plans/2026-06-04-lan-single-host-consolidation.md`
**Scope:** Merge the local working-tree LAN host-election work with the cloud branch
`origin/cursor/lan-single-host-discovery-bd80`, then extend it into automatic **host
consolidation** so a ward never stays split across multiple R+ LAN servers.

---

## 1. Problem

When several Macs each run plug-and-play LAN host mode (or two people both hit
"Activar servidor"), the guardia ends up on **multiple isolated servers**. Clients
split across hosts, the shared directorio never converges, and live sync silently
diverges. Two parallel fixes exist:

- **Local (uncommitted working tree on `main`):** disk-backed host clinical meta,
  `GET /host-rank` with `isProgramAdmin`, rank policy modules
  (`lan-host-rank.mjs`, `lan-host-rank-policy.mjs`), thin subnet scanner, auto-join
  via `tryAutoJoinPreferredLanHost`.
- **Cloud (`origin/cursor/lan-single-host-discovery-bd80`, commit `c554e66`):** richer
  subnet discovery (`lan-host-discovery.mjs`), in-memory `POST /host-advertise` +
  `GET /host-rank`, confirm-based UX (`lanHubStatusCopy`, promote guard, split-brain
  warnings).

This design takes the **best of both** and adds consolidation: the higher-priority
host absorbs the loser's **clients and data**, not just flipping one Mac to client.

---

## 2. Goals / Non-goals

**Goals**
- One authoritative LAN host per ward subnet, chosen by clinical rank.
- Higher rank wins; equal rank broken deterministically by earliest start.
- Winner absorbs loser's data (bundle merge via existing LWW) and clients (WS redirect).
- Human checkpoint (confirm) before a host-eligible user yields; silent for R1–R3.
- Reuse existing rails (bundle push, conflict-resolver, WS hub) — no new merge engine.

**Non-goals (YAGNI)**
- Server-to-server gossip / leader election without the renderer.
- mDNS/Bonjour or cross-subnet discovery.
- Automatic un-pinning of a pinned host.
- Headless (window-closed) consolidation.

---

## 3. Architecture

Single source of truth for host identity is the disk file
`lan-host-clinical-meta.json`. The renderer syncs it via IPC; the embedded server
reads it for `GET /host-rank`. Cloud's in-memory `POST /host-advertise` is dropped.

All election + consolidation logic lives in the **renderer** (Approach A). The host
server stays "dumb": it serves `GET /host-rank` (now with `startedAt`),
`PUT /sync-bundle` (exists), and relays the existing `livesync:host-handoff` event
over the existing WS hub (the same message surrogate-promotion already uses).

### 3.1 Module layout

| Module | Role | Origin |
|--------|------|--------|
| `lan-squad/host-clinical-meta.js` | read/write `{rank, isProgramAdmin, startedAt, updatedAt}` on disk; stamp `startedAt` once | local (kept) |
| `lan-squad/host-router.js` | `GET /host-rank` → meta **+ `startedAt`**; `PUT /sync-bundle`; WS relay of existing `livesync:host-handoff` | merge |
| `public/js/lan-host-rank.mjs` | priority math, `prefersLanHosting`, `shouldAutoJoinPeerAsClient`, `shouldDeferToPeerHost`, `pickPreferredLanPeerHost`, **`resolveHostElection`** (new) | local + new fn |
| `public/js/lan-host-rank-policy.mjs` | session/settings → meta, IPC sync (`syncLanHostClinicalMetaToDisk`) | local (kept) |
| `public/js/lan-host-subnet-discovery.mjs` | **consolidated** discovery: cloud probing quality (candidate-IP seed, loopback/same-machine guards, dual ping+`/ping`), returns a **ranked list** | merge |
| `public/js/lan-host-consolidation.mjs` | **Pure DI core:** `runConsolidateIntoHost`, `pushBundleToHostUrl` (testable in `node --test` without browser deps) | new |
| `public/js/features/lan/transport.mjs` | `tryAutoJoinPreferredLanHost`, `joinRemoteLanHostAsClient`; **thin re-exports** of `consolidateIntoHost` / `pushBundleToHostUrl` wiring browser + room/push | local + wire |
| `public/js/features/lan/panel.mjs` | `lanHubStatusCopy`, promote `confirm`, split-brain warnings, diagnostics hint, scan loop | cloud UX + local |

**Deleted:** cloud `public/js/lan-host-discovery.mjs` (helpers folded into
`lan-host-subnet-discovery.mjs`), cloud in-renderer `shouldSupersede`, and the
`POST /host-advertise` route.

---

## 4. Election & consolidation

### 4.1 `startedAt`

When a Mac becomes/confirms host, `host-clinical-meta.js` stamps `startedAt` (epoch
ms) once and keeps it stable until the server process restarts. `GET /host-rank`
returns `{ rank, isProgramAdmin, startedAt }`.

### 4.2 `resolveHostElection(self, peer)` (pure)

Returns `'self' | 'peer' | 'tie-self' | 'tie-peer'`:

1. Compare `lanHostPriority` (admin=1000, R4=4, R3=3, R2=2, R1=1). Higher wins.
2. Equal priority → earlier `startedAt` wins.
3. `startedAt` equal/missing → lexicographic host URL (final deterministic fallback).
   A missing `startedAt` is treated as "later" so a properly-stamped host wins ties.

### 4.3 Decision matrix (peer host discovered)

| Self | Election result | Action |
|------|-----------------|--------|
| Not host-eligible (R1–R3, no admin) | peer wins | **silent** auto-join as client |
| Host-eligible (R4/admin) | peer strictly higher | **confirm** → on yes, `consolidateIntoHost(peer)` |
| Host-eligible | equal, peer earlier (`tie-peer`) | **confirm** → on yes, `consolidateIntoHost(peer)` |
| Either | self wins / `tie-self` | stay host; if peer also hosting → **warn** (split-brain toast + diagnostics hint) |

### 4.4 `consolidateIntoHost(winnerUrl, teamCode)` (loser runs this)

**Implementation note:** The orchestration lives in `public/js/lan-host-consolidation.mjs`
(dependency-injected `runConsolidateIntoHost`) so `node --test` can assert push-before-handoff
ordering without importing browser-coupled `transport.mjs` deps. `transport.mjs` keeps the
public `consolidateIntoHost` / `pushBundleToHostUrl` names as thin wiring into room/push/LAN
client.

Reuses the existing surrogate-promotion machinery (`livesync:host-handoff`,
`pushRoomSyncBundleToHost`) so no new WS message type or merge code is introduced.

1. Build the room bundle (`buildLiveSyncBundleEnvelope`) and push it to the winner via a
   new helper **`pushBundleToHostUrl(winnerUrl, teamCode, roomId, envelope)`** (direct
   authed `PUT /rooms/:id/sync-bundle` to the winner *without* changing the persistent
   host config yet, so our live channel to our own hub stays open). Winner's **LWW
   conflict-resolver merges**. Require 2xx.
2. On success, broadcast `livesync:host-handoff { newHostUrl: winnerUrl, reason:
   'consolidate-rank' }` on our own hub (clients are still connected to us) → existing
   `room.mjs` handler reconnects them to the winner.
3. Switch self to client: `applyLanHostUrlSwitch(winnerUrl, …)`, `saveLanUiRole('client')`,
   `persistLanClientConfig(winnerUrl, teamCode)`, `rememberPrimaryHostUrl(winnerUrl)`,
   reconnect live channel to the winner.
4. Toast: "Servidores combinados — ahora conectado al anfitrión del turno."

**Ordering is atomic:** the bundle push must return 2xx **before** the handoff broadcast
or any role switch. Never hand clients off to a host we could not sync to. If push fails,
abort: stay host, no handoff, no role switch.

**Clients receiving `livesync:host-handoff`:** the existing handler persists `newHostUrl`
and calls `tryReconnectLanToHostUrl` when in remote-join mode. If the target is
unreachable, existing re-discovery applies (no hard failure).

---

## 5. Scan loop, boot & UX

### 5.1 Boot — `initLanHostPlugAndPlay`

1. `syncLanHostClinicalMetaToDisk()` (stamp identity).
2. If not pinned: discover subnet hosts → `pickPreferredLanPeerHost` → §4.3 matrix.
3. If we remain host → `ensureLanElectronHostReady()` (start server, stamp `startedAt`).
4. A pinned host (`getPinnedHostUrl`) always wins — never auto-yield from a pin; warn
   only if a higher peer appears.

### 5.2 Scan loop (cloud 2-step cadence)

- Every **5s**: cheap pass over WS live peers (`listLivePeerHostUrls`) → §4.3 matrix.
- Every **25s** (throttled, *even when WS peers exist*): full subnet sweep → merge into
  peer list → §4.3 matrix. Catches split-brain formed *after* WS joins the wrong room.
- Skip sweeps when in remote-join client mode and already connected to the elected
  winner (no churn once consolidated).

### 5.3 Promote guard — `promoteThisMacToLanHost`

Before starting a second server, subnet-scan; if another host exists, `confirm()`
("Ya hay un servidor R+ activo en X…"). `skipOtherHostCheck` bypasses for the
legitimate suplente case.

### 5.4 UX surfaces (cloud, Spanish copy)

- `lanHubStatusCopy()` — "Sin red — buscando anfitrión…" / "Conectado al anfitrión del
  turno" / "Esta Mac es el servidor del turno".
- Split-brain toast (one-time per session) + diagnostics hint when
  `wsLive && peerHostCount === 0`.
- "Unirme al anfitrión de otra Mac" section open by default.

---

## 6. Error handling & edge cases

- **Bundle push fails** during consolidation → abort yield, stay host, toast "No se
  pudo combinar con el anfitrión; sigues como servidor." No data loss, no half-migration.
- **Redirect target unreachable** for a client → keep current connection, fall back to
  re-discovery.
- **Re-entrancy guard:** a `_consolidating` flag + already-handled-URL set prevents two
  timers racing the same yield.
- **Confirm declined** by a host-eligible user → stay host, suppress repeat confirms for
  that peer for a cooldown (avoid nagging every 25s).
- **Pinned host** never yields (warn only). Consolidation *into* this Mac (we are the
  winner) is unaffected.
- **Three+ hosts:** `pickPreferredLanPeerHost` returns the single best; everyone
  converges over successive sweeps.
- **Two equal hosts started same ms** → URL tiebreak guarantees both pick the same
  winner (no mutual yield / ping-pong).
- **Non-Electron / mobile clients:** discovery + consolidation are desktop-only; mobile
  just follows `livesync:host-handoff`.

---

## 7. Test plan (`node --test`)

- `public/js/lan-host-rank.test.mjs`: extend with `resolveHostElection` — higher rank,
  admin > R4, equal-rank earlier `startedAt`, URL fallback, missing `startedAt`.
- `public/js/lan-host-subnet-discovery.test.mjs`: keep guards (no team code / not private
  IP / bad URL); add same-machine/loopback exclusion from the returned list.
- `lan-squad/host-router.test.js`: `GET /host-rank` returns `startedAt`; assert
  `host-advertise` route is gone (404).
- `lan-squad/host-clinical-meta.test.js`: `startedAt` stamped once and stable across reads.
- New `public/js/lan-host-consolidation.test.mjs`: `consolidateIntoHost` calls
  `pushBundleToHostUrl` and only emits `livesync:host-handoff` after a 2xx push
  (push-before-handoff ordering); push failure aborts yield (no handoff, no role switch);
  declined confirm keeps host. `pushBundleToHostUrl` targets the winner URL (not the
  current config) and returns false on non-2xx.

---

## 8. Debt / budgets

Keep each touched file within Tier-1 budgets (≤15 cyclomatic, ≤80 lines/fn, ≤600
lines/file). Election/tiebreak as small pure functions in `lan-host-rank.mjs`;
consolidation orchestration in `lan-host-consolidation.mjs` (DI), thin wiring in
`transport.mjs`. Logic moves **out** of
`panel.mjs` rather than growing it. No new static boot imports — discovery and
consolidation use existing modules or dynamic `import()` where already established.

---

## 9. Related

- `docs/superpowers/specs/2026-06-03-lan-ward-ready-remediation-design.md`
- `docs/superpowers/specs/2026-06-03-lan-sync-improvements-design.md`
- `docs/superpowers/specs/2026-06-03-lan-conflict-lww-design.md`
- Cloud branch: `origin/cursor/lan-single-host-discovery-bd80` (commit `c554e66`)

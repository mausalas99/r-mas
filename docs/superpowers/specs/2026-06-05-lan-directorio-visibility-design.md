# LAN Directorio Visibility — Root Cause & Remediation Design

**Date:** 2026-06-05
**Status:** Approved — §6.A chosen (Task 0: client offline / empty trace → `NO_LAN`). §5.1 + §5.3 + §5.2 + §6.A implemented.
**Scope:** Why clinical-ops directorio visibility (peers seeing each other's @usuario / roster in guardia, censo, entregas) is broken for **all** users on the LAN, and the minimal remediation. Does **not** change hub-and-spoke topology, SQLCipher local-first model, or the team-code security boundary.

## Related work

| Document | Relationship |
|----------|----------------|
| [`2026-06-03-lan-sync-improvements-design.md`](2026-06-03-lan-sync-improvements-design.md) | clinicalOps tables, HTTP-primary push, modular `features/lan/*` |
| [`2026-06-04-lan-single-host-consolidation-design.md`](2026-06-04-lan-single-host-consolidation-design.md) | `tryAutoJoinPreferredLanHost`, subnet discovery, host election |
| [`2026-06-01-lan-teams-decoupled-design.md`](2026-06-01-lan-teams-decoupled-design.md) | `clinical_users` directorio, set merge + tombstones |
| Release **6.6.8** (`79be237`) | "directorio LAN sync" — union host clinicalOps on read, persist roster from sync-bundle, push/pull on register + sala join |
| Release **6.6.9** (`6c4f92b`) | Windows SQLCipher prebuild only — **contained no visibility fix** |
| Release **6.6.4** (`onboarding-local-first`) | sync-mode (LAN vs solo equipo) selectable **before** DB session — enables LAN-only hosting with a locked clinical DB |

## Problem statement

After 6.6.8 shipped the "directorio LAN sync" fix, **no user sees any other user** in the LAN directorio (guardia roster, censo scope, entrega targets). 6.6.9 only added the Windows build fix, so the regression persists. Field report: "visibility hasn't been fixed for any users in 6.6.9; Windows fixes worked."

## Evidence (host `clinicalOpsTrace`)

Captured from the **host** Mac (`http://10.0.57.52:3738`, `roomId: sala-2`, `phase: live`, `wsLive: true`, `peerHostCount: 0`):

```
export → { usersExported: 1, teamMembership: 1 }            (repeated)
get    → { roomId: sala-2, httpStatus: 200, incomingUsers: 1, ok: true }
merge  → { incomingUsers: 1, usersInserted: 0, usersUpdated: 1, ... }
push   → { roomId: sala-2, code: "ok", usersExported: 1, http: true, live: true }
lastErrors: []
```

**Reading:** every boundary only ever sees **1 user** — the host's own. `usersInserted: 0` on every merge means the host never *learns* a peer. The host bundle for `sala-2` contains exactly one `clinical_user`. There is no trace of any peer ever contributing a roster.

Two independent defects explain this.

---

## Root cause A — sync-bundle push wipes the host roster

### Mechanism

There are two client → host write paths for `clinicalOps`:

1. `pushClinicalOpsLanNow` → `PUT /rooms/:id/clinical-ops` — explicitly carries the roster snapshot.
2. `scheduleLiveSyncPush` (debounced, on any edit) → `PUT /rooms/:id/sync-bundle` — carries the **whole** envelope.

`hostBundlePutBodyFromEnvelope` (`public/js/host-bundle-bases.mjs:90`) **always** emits a `clinicalOps` key, defaulting to `null` when the local cache is empty:

```js
clinicalOps: envelope.clinicalOps != null ? envelope.clinicalOps : null,
```

On the host, `mergeBundlePut` (`lan-squad/bundle-merge.js`) treated a present-but-null `clinicalOps` as an intentional **delete**:

```js
if ('clinicalOps' in base) {              // always true — key always present
  const incomingOps = …;                   // null when cache empty
  if (!incomingOps) {
    bundle.clinicalOps = base.clinicalOps === null ? null : bundle.clinicalOps;  // ← WIPE
  } …
}
```

The same pattern existed in `host-store.js#putRoomClinicalOps`.

### Why it collapses to exactly 1 user

- **Host DB unlocked:** `getRoomSyncBundle → refreshBundleClinicalOpsCacheIfStale` re-exports from SQLCipher on every read and unions it back, so the wipe **self-heals** and the bug is masked.
- **Host DB locked** (LAN-only / local-first host, enabled by 6.6.4): `getGlobalClinicalDbManager()` returns null, the DB paths are no-ops, and the **in-memory bundle is the only copy**. Each routine sync-bundle push wipes it to `null`; the next `/clinical-ops` PUT repopulates it with just that one pusher's own roster (each peer exports only itself). Net steady state: **one user**, matching the trace.

### Conclusion

A routine sync-bundle push must **never** delete the cumulative roster. `clinicalOps: null` from this path means "no roster in this envelope," not "clear the directorio." There is no code path that intentionally clears the roster wholesale, so preserve-on-null is always correct.

---

## Root cause B — clients never become "push-eligible" in LAN mode

This is the dominant field cause: the host never receives a peer roster at all because **no client ever pushes**.

### Mechanism

A client only pushes once it has BOTH:
1. a stored **host URL + team code** (`isLanSessionConfiguredForRest()` true), and
2. a **joined sala** (`ensureEffectiveLiveSyncRoomId()` non-empty).

Selecting "Guardia en red (LAN)" in onboarding (`clinical-onboarding-sync-mode.mjs#handleSyncModeChoice`) only sets `clinicalLocalOnly = false`. It does **not** obtain a team code, connect to a host, or join a sala. Consequently:

- On @usuario registration, `flushClinicalProfileToLan` → returns **`NO_LAN`** when not configured for REST. `NO_LAN`/`NO_ROOM` are classified **benign** (`isBenignLanPushSkipCode`), so no error is shown and the user gets a **"Perfil guardado" success** toast — a false-positive.
- Auto-discovery (`tryAutoJoinPreferredLanHost` / `initLanHostPlugAndPlay`) cannot help a first-time client: it bails when there is no team code in config (`getLanTeamCodeFromConfig()`), is **Electron-desktop only** (`isLanElectronDesktop()`), and requires `isClinicalRankConfiguredForLan()`. The team code is the shared secret, normally delivered via an **invite link**; without it, subnet discovery never runs.
- `bootLanRoomMembership` only **resumes** an existing membership + config; it returns early when either is absent. It performs no discovery.

### Diagnostic blind spot (made this hard to see)

`pushClinicalOpsLanNow` recorded a `push` trace only on success and on `NO_ROOM`. `NO_CLINICAL_OPS`, `NO_SNAPSHOT`, and `NO_LAN` returned **silently**, so a non-pushing client's `clinicalOpsTrace` showed no push attempt at all — indistinguishable from "never tried."

---

## Design principles (unchanged)

- **Local-first / hub-and-spoke** preserved; no mesh, no CRDT.
- **Team code is a security boundary** — a client must not auto-join a host without possessing the team code (invite link, or being the host).
- **Domain merge** for `clinical_users` (set merge + tombstones) preserved.
- **No silent success** for actions that did not take effect.
- **Debt:** no increase in `scripts/metrics/baseline.json`; changes are localized to existing LAN modules.

---

## §5 Remediation

### 5.1 Host: never wipe roster on null clinicalOps — **IMPLEMENTED**

`lan-squad/bundle-merge.js` and `lan-squad/host-store.js#putRoomClinicalOps`: only assign `bundle.clinicalOps` when an incoming roster object is present; union with `mergeClinicalOpsSnapshotsData(serverOps, incomingOps)` when both exist; otherwise leave the server roster untouched.

```js
if (incomingOps) {
  bundle.clinicalOps = serverOps
    ? mergeClinicalOpsSnapshotsData(serverOps, incomingOps)
    : incomingOps;
}
```

### 5.2 Client (optional defense): don't emit null clinicalOps — **PROPOSED**

`hostBundlePutBodyFromEnvelope`: omit the `clinicalOps` key entirely when there is no snapshot, so `'clinicalOps' in base` is false and version accounting is untouched. Redundant after 5.1 but removes needless revision churn. Low priority.

### 5.3 Diagnostics: trace every push skip — **IMPLEMENTED**

`public/js/features/lan/push.mjs#pushClinicalOpsLanNowBody`: record a `push` trace with `code` for `NO_CLINICAL_OPS`, `NO_SNAPSHOT`, `NO_LAN`, `NO_ROOM` (in addition to success/`CONFLICT_RESOLVED`/`QUEUED`). A client's status JSON now shows the exact blocking gate.

### 5.4 Confirm the dominant client gate — **REQUIRED BEFORE §6**

Collect `clinicalOpsTrace` from a **client** Mac that selected LAN mode and read the latest `push.code`:

| `push.code` | Meaning | Targeted fix |
|---|---|---|
| `NO_LAN` | no host URL + team code (never connected / no invite) | §6.A connect UX |
| `NO_ROOM` | connected but no sala joined | §6.B auto-join resolved sala |
| `NO_SNAPSHOT` | clinical DB locked / no exportable @usuario | §6.C require unlock before LAN push |
| `NO_CLINICAL_OPS` | DB IPC unavailable | environment/install issue |
| (no `push` entry) | join flow `syncLiveSyncAfterRoomJoin` not running | separate investigation |

### §6 Functional fix (decision required)

Pick based on §5.4 evidence. These are mutually compatible; ship the one matching the observed gate first.

#### 6.A — Honest connect UX for `NO_LAN` — **CHOSEN (Task 0 evidence: client offline, no hostUrl, empty trace → NO_LAN)**

- After LAN-mode registration, when `flushClinicalProfileToLan` returns `NO_LAN`/`NO_ROOM`, **do not** show "Perfil guardado" success. Show an actionable state: "Perfil guardado en esta Mac. Para aparecer en la guardia, conéctate a la sala del equipo: pega el enlace de invitación o escanea el anfitrión."
- Surface a persistent CTA in the onboarding / `clinical-rotation-entry` chrome (not only a transient toast) that opens the ⇄ connect panel.
- No change to the team-code boundary — the user still supplies the invite.
- Files: `public/js/features/clinical-onboarding.mjs`, `public/js/clinical-profile-lan-sync.mjs`, `public/js/features/clinical-rotation-entry.mjs`.

#### 6.B — Auto-join resolved sala for `NO_ROOM`

- When configured for REST but no membership, resolve the sala from profile/settings/invite (`resolveRoomIdForUsernameRegister`) and call `joinLanRoom` once (guarded by the existing `rpc-lan-auto-join-confirmed-*` session flag to avoid wrong-sala joins). The existing push-on-join then fires.
- Files: `public/js/clinical-profile-lan-sync.mjs`, `public/js/features/lan/room.mjs`.

#### 6.C — Require unlock before LAN push for `NO_SNAPSHOT`

- If a host runs LAN-only with a **locked** clinical DB, its directorio cannot self-heal (root cause A) and it contributes no identity. Either (i) require the host's DB unlocked before it serves clinicalOps, or (ii) accept locked-host serving but rely entirely on §5.1 to keep the in-memory roster. Decide host policy explicitly.
- Files: `lan-squad/host-store.js`, host onboarding gate.

---

## §7 Acceptance criteria

1. **Host roster survives bundle churn (locked DB):** with the host DB locked, two peers PUT distinct rosters, then a routine sync-bundle push with `clinicalOps: null` arrives → `GET /clinical-ops` still returns both users. *(Covered by new test, see §8.)*
2. **Two-Mac round trip:** host + 1 client, client selects LAN mode and connects via invite → host `get` shows `incomingUsers ≥ 2`; client merge shows `usersInserted ≥ 1`; each Mac's guardia roster lists the other's @usuario.
3. **No false success:** a LAN-mode client that is not connected does **not** show "Perfil guardado" success; it shows a connect CTA. *(After §6.A.)*
4. **Diagnostics:** a non-pushing client's `clinicalOpsTrace` contains a `push` entry with the precise `code`.
5. **No regression:** existing LAN tests green; `scripts/metrics/baseline.json` total score not increased.

## §8 Test plan

- `lan-squad/host-store-clinical-ops-db.test.js` — **added:** "sync-bundle push with empty clinicalOps must not wipe host roster (locked DB host)" (fails before §5.1, passes after).
- `lan-squad/bundle-merge.test.js` — assert null/absent `clinicalOps` preserves `serverOps`.
- `public/js/features/lan-sync-clinical-ops.test.mjs` — assert `pushClinicalOpsLanNow` records a `push` trace for each skip code (§5.3).
- For §6.A/B: source-contract tests in `clinical-profile-lan-sync.test.mjs` / onboarding tests asserting non-benign messaging / single guarded auto-join.

## §9 Current state

- **Implemented:** §5.1 (host wipe fix + regression test), §5.2 (omit null clinicalOps from bundle body), §5.3 (push skip diagnostics + flush early trace), §6.A (connect UX + rotation CTA).
- **Not implemented:** §6.B (auto-join sala — not indicated by Task 0), §6.C (locked-host policy — not indicated by Task 0).

## §10 Files

| File | Change | Status |
|------|--------|--------|
| `lan-squad/bundle-merge.js` | preserve roster on null `clinicalOps` | done |
| `lan-squad/host-store.js` | same in `putRoomClinicalOps` | done |
| `lan-squad/host-store-clinical-ops-db.test.js` | locked-host no-wipe test | done |
| `public/js/features/lan/push.mjs` | trace all push skip codes | done |
| `public/js/host-bundle-bases.mjs` | omit null `clinicalOps` key (5.2) | done |
| `public/js/features/clinical-onboarding.mjs` | honest connect messaging (6.A) | done |
| `public/js/clinical-profile-lan-sync.mjs` | connect CTA / early push trace (6.A) | done |
| `public/js/features/clinical-rotation-entry.mjs` | persistent connect CTA (6.A) | done |

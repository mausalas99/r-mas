# 10 · Nube: how cloud sync works

> **You'll learn:** what runs on Cloudflare, what a "room" is, how an edit on one laptop shows up on another laptop and a phone, how conflicts are resolved, how room encryption works, and what the recent "D1 overload" commits were about.
>
> **Prereqs:** [06](./06-labs-to-word.md) (lab sets), [09](./09-storage-and-security.md) (DEK, wrapping, KDF)

---

## The mental model in four sentences

1. Each **ward (sala) gets one shared room per calendar month** on a Cloudflare Worker.
2. Every edit becomes a small **op** — *"set path X to value Y at time T, by actor A"* — queued in a local **outbox** and **pushed** to the room.
3. The Worker applies ops with **last-writer-wins** and bumps the room's **revision** counter; other devices **pull** "everything since revision N" (and get a nudge over a WebSocket so they don't have to wait for the next poll).
4. Clinical content is **encrypted on the device** with a room key before it leaves; name, bed and service stay readable so the server can show a census board.

LAN sync ("LiveSync", `lan-squad/`) was retired in 8.0.5 — Nube replaced it.

---

## 1. What runs in the cloud

All under `packages/core/cloud/` (root symlink: `cloud/`).

| Worker | Folder | Job | Storage |
|---|---|---|---|
| **`rplus-sync`** | `sync-worker/` | Nube clinical sync + serves the R+ Móvil and Interno web apps | **D1** (`rplus-sync`, SQL migrations `schema/001…014`) + one **Durable Object** class `RoomSyncHub` |
| **`rmas-lista-de-espera`** | `equipos-worker/` | **Equipment** loan queue (Lumify / EKG / ultrasound): checkout, waitlist, Web Push, photos | D1 `rplus-equipos` + R2 photos |
| update feed | `update-worker/` | App update manifests ([11](./11-releases-and-updates.md)) | — |
| landing | `landing/` | Marketing site source | — |

> ⚠️ **"Equipos" means two different things.** The `equipos-worker` is about *devices*. Clinical *teams* (who's on which team) travel inside the `clinicalOps` blob in a sala room.

**Cloudflare vocabulary:** a **Worker** is a small JS server running at Cloudflare's edge. **D1** is Cloudflare's hosted SQLite. A **Durable Object** is a single-instance mini-server addressable by ID — here, one per room, used purely as a WebSocket relay (it stores nothing). `wrangler.toml` is the Worker's config.

### Server entry points (`sync-worker/src/`)
- `routes.js` — router; everything under `/api/sync/v1` (auth, rooms, admin), interno under `/api/interno/v1`. Requests are also version-gated by app version / client kind.
- `rooms.js` — create, join, `ensure-turn`, `/:id/mutations` (**push**), `/:id/pull` (**pull**), `/:id/live` (WebSocket), `/:id/dek*` (room key).
- `sync.js` — the push/pull engine. `lww.js` — merge rules.
- `sala-allowlist.js` — `CLOUD_SALAS`: Sala 1, Sala 2, Sala E, Torre HU, Interconsultas, UX, Eme, Área A/Pensionistas, UCI, PostQx, Subespecialidad.

---

## 2. Rooms

- `POST /rooms/ensure-turn {sala}` looks up the room for `(sala, turn_key = "YYYY-MM")` in Mexico City time. Exists → you join as **member**. Doesn't → you create it and become **owner**.
- Each room has a **6-character join code** and a **revision** counter that goes up by one per committed push.
- Why monthly? Decision log 2026-08-05: room code = calendar month, so the room rolls over with rotations rather than daily turns.

---

## 3. One sync cycle, laptop A → laptop B + phone

```
Laptop A                       Worker (rplus-sync)                 Laptop B / phone
────────                       ───────────────────                 ────────────────
save note
 └► op {path:"entries/<pid>/note", value, updatedAt, actorId}
 └► outbox (+ mirrored to local DB)
 ⏱ 120 ms coalesce
 └► encrypt value with room DEK
 └► POST /rooms/<id>/mutations ──►  check session + membership
     {clientMutationId,             load room state (skip lab tables
      baseRevision, ops}             if no lab ops)
                                    apply ops (LWW)
                                    ONE D1 batch, gated on
                                      revision = expected:
                                      insert ops, revision N→N+1,
                                      write changed rows
                     ◄── {revision:N+1, needPull}
 drop acked ops                     waitUntil → Durable Object
                                         └── broadcast {revision, ops} ──► WebSocket
                                                                          decrypt, apply,
                                                                          advance if N+1 is
                                                                          the next revision
                                                                          (else pull)
```

If the socket was down or the ops were > 32 KB, the device's normal poll fetches `GET /pull?since=N`.

### Client code map (`public/js/features/cloud-sync/`)
| Step | File |
|---|---|
| Edit → op, enqueue | `mutate-bridge.mjs` |
| Outbox (merged per path; mirrored to SQLite `cloud_outbox` so a crash doesn't lose it) | `outbox.mjs`, `outbox-sqlcipher.mjs` |
| Timing constants | `cloud-sync-timing.mjs` |
| The loop: pending ops → push then pull; otherwise pull then push; hidden window → push only | `sync-runtime-cycle.mjs` |
| Push retry on `revision_stale` (100–200 ms jitter); pull with key retry | `sync-runtime-pull-push.mjs` |
| Apply a pull (snapshot or ops) | `pull-apply.mjs` |
| Encrypt/decrypt on the wire | `cloud-sync-crypto-wire.mjs`, `crypto.mjs` |

### Poll intervals (`cloud-sync-timing.mjs`)
| | WebSocket up | WebSocket down |
|---|---|---|
| Desktop idle | 90 s | 8 s |
| Desktop active | 15 s | 3 s |
| Mobile | 15 s | 5 s |

Errors back off 30 s → 5 min (2 min for overload), with a cheap `/ping` every ~10 s to resume quickly.

---

## 4. Conflicts: last-writer-wins (LWW)

Every op carries `updatedAt` and `actorId`. The server keeps `entityVersions[path] = {updatedAt, actorId}` and accepts an op only if it's newer (`isNewerVersion` in `lww.js`; `actorId` breaks ties).

Plain LWW would lose data in a few places, so there are special merges:

- **`clinicalOps`** (teams, users, assignments, guardias): the **client merges** it into SQLite tables in phases (`lib/db/clinical-ops-sync-merge.mjs`) and always **pulls before it pushes**. On an encrypted room the Worker can't read it, so it just replaces the whole value. Only legacy plaintext rooms get a server merge (`clinical-ops-lww.js`), and that unions teams, users, assignments and memberships by id but overwrites guardias. Decision log 2026-08-14: a join push must not wipe assignments the sender hasn't pulled yet. Details are in [08](./08-team-layer.md#7-how-clinicalops-is-stored-and-synced).
- **`monitoreo`**: merged field by field; history rows by id; deletes are markers.
- **Deletes** in general are **tombstones** — markers, not removals — so a stale device can't resurrect a deleted record.

---

## 5. How the room state is stored (and the D1 overload fixes)

The room is split across D1 rows ("**shards**") so one push doesn't rewrite the world:

| Table | Holds |
|---|---|
| `room_state` | core blob (entries index, todos, agenda, clinicalOps…) |
| `room_state_patients` | one row per patient |
| `room_state_lab_sets` | one row per **lab set** (with a `revision` column) |
| `room_state_labs` | frozen legacy per-patient lab rows |
| `mutations` | the last ~100 revisions of ops (the incremental tail) |

### Pull: ops or snapshot?
If you're ≤ 100 revisions and ≤ 256 KB behind → you get the **ops**. Otherwise → a **snapshot** (whole state). `mobile=1` limits labs to a 3-day window — except culture sets, which are kept (commit `132c689`).

### The October 2026 overload fixes (good examples of reading commits)
| Commit | Problem | Fix |
|---|---|---|
| `e0a0957` *Read only touched patients' lab shards on push* | every push read all lab rows | read only shards of patients the ops touch (≤ 90 ids — D1 bound-parameter cap); no lab ops → skip lab tables |
| `3ceb565` *Send only new lab sets on a catch-up pull* | snapshots re-sent every lab set | client sends `labsHave=<ids>`; server returns only sets with `revision > since` for those patients |
| `4bed50f` *List held patients on catch-up pulls* | client didn't say what it had | client fills `labsHave` (only when holding ≤ 300 patients) |
| `0ea04bc` *Skip the encryption sweep when the room is keyed* | every owner reconnect pulled the whole room twice to re-encrypt | skip when the device has the key and no plaintext was seen; at most once per 10 min |

---

## 6. Encryption: two layers

```
   device                                            Worker / D1
┌─────────────────────────┐                   ┌──────────────────────────┐
│ value ─AES-GCM(DEK)─► ct │ ── HTTPS ──────► │ ct ─AES-GCM(WORKER_DATA_ │
│                         │                   │       KEY)─► stored blob  │
└─────────────────────────┘                   └──────────────────────────┘
  Layer 2: end-to-end                           Layer 1: at rest (server can undo)
  (server can't read)
```

**Layer 1 — at rest, by the server.** `sync-worker/src/crypto-at-rest.js` encrypts each stored blob with the Worker secret `WORKER_DATA_KEY` (AES-256-GCM). The Worker itself can decrypt this.

**Layer 2 — end-to-end, by the client** (`features/cloud-sync/crypto.mjs`, `room-dek.mjs`):
- A random AES-256 **room DEK** encrypts clinical content.
- The DEK is **wrapped** with a key derived (PBKDF2 + per-room salt) from the room's **join code**. The server stores only the wrapped DEK, so anyone with the code can unwrap it; the server alone can't.
- **Encrypted whole:** `note`, `indicaciones`, `historiaClinica`, `eventualidades`, `monitoreo`, `medReceta`, `vpo`, `listadoProblemas`, `medPharmProfile`, lab sidecars, `todos`, `clinicalOps`.
- **Encrypted per field:** `registro` (plus a one-way fingerprint `registroFp` so the server can detect a re-admit), `diagnosticosList`, `diagnosticosText`.
- **Plaintext:** `nombre`, `cama`, `servicio` — the Interno board and admin census read these server-side.
- A room with no DEK yet round-trips plaintext (no blocking).

**Key management operations**
| Operation | What it does |
|---|---|
| **Owner key** (`ensureOwnerRoomKey`) | owner's device creates the DEK if missing, then **backfills** — re-pushes old plaintext as ciphertext |
| **Rotate code** (`/admin/rooms/:id/rotate-code`) | new join code + DEK re-wrapped under it, saved atomically |
| **Admin rescue wrap** | a second DEK copy wrapped to the admin's ECDH public key ([09](./09-storage-and-security.md)) |
| **Recuérdame** | unwrapped DEK cached on the device only; never sent to the server |

> 📝 **Docs drift:** `sync-worker/README.md` still says "HTTP push/pull only (no WebSockets)" and "plaintext JSON, not E2EE", and decision-log row 2026-08-14 says "Nube V1 crypto: D1 plaintext, not E2EE". The code since ~2026-09-18 has WebSockets, at-rest encryption, and client E2EE for content. See [13 · Open questions](./13-open-questions-and-doc-drift.md).

---

## 7. Phones

| Client | Who | Build | How it connects |
|---|---|---|---|
| **R+ Móvil** | residents | `npm run build:cloud-mobile` → `cloud/sync-pages/public/mobile` | same rooms, `pollMobile`, live WebSocket |
| **Interno MIP** | medical interns | `npm run build:cloud-interno` → `/interno/` | R4/admin enables the sala in ⇄ Conexión and shares a QR `/interno/{sala}?t=token`; intern records vitals (`recordedBy: interno`) via `/api/interno/v1/board` + `/vitals` |

Interno phones get a **narrow subkey** `HKDF(DEK, "rplus-interno-v1")`, delivered only in the URL fragment `#k=…` (fragments are never sent to servers). Desktop locks `clinicalOps` and `entries/{id}/monitoreo` with that subkey (`cloud-sync-crypto-wire.mjs`), so the phone can open them; everything else stays under the DEK. See `docs/features/feat-interno-mip-nube.md`.

---

## 8. Guardia / entrega (handoff)

Teams, rotations, `active_guardias`, `team_guardia_today` ride inside **`clinicalOps`** (`lib/db/clinical-ops-sync-export.mjs`), merged locally by `lib/db/clinical-ops-sync-merge-*.mjs`. That's how an entrega (an `active_guardias` row) made on one laptop reaches the next shift. Full walkthrough in [08](./08-team-layer.md).

---

## Glossary for this page

- **Op / mutation** — one "set this path to this value" change.
- **Outbox** — local queue of ops not yet acknowledged.
- **Push / pull** — send ops / fetch ops since revision N.
- **Revision** — the room's change counter.
- **Snapshot** — full room state, sent when you're far behind.
- **LWW** — last-writer-wins by `updatedAt`.
- **Tombstone** — a deletion marker.
- **Shard** — one D1 row holding a slice of the room (one patient, one lab set).
- **`labsHave`** — "patients I already hold", so the server can skip their old labs.
- **DEK / wrapped DEK** — room key / room key locked under the join code.
- **Durable Object** — Cloudflare single-instance object; here a per-room WebSocket relay.

## Check yourself

1. Two residents edit the same note offline; both come back online. Whose wins?
2. Why doesn't plain LWW work for team assignments?
3. Can Cloudflare (or anyone with D1 access + `WORKER_DATA_KEY`) read a patient's note? Their name?
4. A phone was offline for two days. Ops or snapshot?

<details><summary>Answers</summary>

1. The later `updatedAt` (ties → `actorId`). The whole note value is one op, so it's whole-value LWW.
2. A device that hasn't pulled recent assignments would overwrite them with its stale list. The fix is to merge before pushing: the client pulls, merges into its tables (assignments are an append-only union), then pushes.
3. Note: no, if the room has a DEK (it's E2E ciphertext). Name: yes — `nombre`/`cama`/`servicio` are plaintext under only the server-side layer.
4. Almost certainly a snapshot (> 100 revisions behind), with labs trimmed by `labsHave`/the mobile 3-day window.
</details>

**Next:** [11 · Releases & updates →](./11-releases-and-updates.md)

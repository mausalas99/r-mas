# R+ Native Migration Plan — Electron → Swift (macOS) + WinUI 3 (Windows), Shared Rust Core

**Date:** 2026-06-11 (rev 4: full detailed edition — per-component migration guides,
UI replication strategy, complete surface inventories)
**Status:** Proposed
**Supersedes:** all previous migration attempts and revs 1–3 of this document
**Decision record:** rev 1 chose shared-Rust-core + SwiftUI + WinUI 3; rev 2 explored
a Rust/Slint Windows shell (rejected — custom-drawn widgets can't deliver the native
Fluent look); rev 3 confirmed WinUI 3 + C#; rev 4 expands every section to
implementation depth.

---

## Part I — Strategy

### 1. Goal and the one architectural truth

Replace Electron with native apps on both platforms while maintaining one codebase.
Those two requirements can only coexist one way:

> **A shared, portable Rust core owns ~75–80% of the code (data model, storage,
> crypto, lab parsing, clinical text, doc generation, LAN sync, and per-screen
> view-state logic). Each platform gets a thin native UI shell: SwiftUI on macOS,
> WinUI 3 (C#) on Windows. The shells contain layout and platform services only —
> zero business logic, zero screen logic beyond rendering.**

There is no technology that gives you literally one Swift codebase rendering native
UI on Windows at production quality (The Browser Company tried with Arc and
retreated). "Same codebase" means: every line of business logic *and screen
behavior* is written once in the core; only the view rendering is per-platform.

### 2. Why previous attempts failed, and the structural guardrails

Migrations of this size die the same four deaths. Each gets a structural
countermeasure, not a promise:

1. **Big-bang rewrite** — nothing ships until everything works; parity and
   motivation decay. → Every ported module ships to real users **inside Electron
   via napi-rs** within days of being written (§4). The native shells are built
   last, against an already-battle-tested core.
2. **Silent behavior drift** — the rewrite "mostly" matches and clinical users find
   the differences. → Golden-master parity harness (§5). The existing ~200
   `node --test` suites become language-neutral JSON fixtures; a Rust port must
   pass them byte-for-byte before its JS twin is deleted.
3. **Sync protocol fork** — native peers can't talk to Electron peers during the
   transition, so adoption stalls. → The LAN wire protocol is frozen as a written
   contract (§14) and `scripts/lan-virtual-peer.mjs` becomes a cross-implementation
   conformance suite. Mixed Electron/native wards are a hard requirement.
4. **UI rewrite swamp** — 80+ feature panels rewritten twice with no order or exit
   criteria. → Three defenses: (a) screen *logic* lives in core view-models, so a
   shell screen is layout + bindings only; (b) UI ports in 7 fixed clusters with
   per-screen parity checklists (§11); (c) explicit scope cuts are decided up front
   (§12), not discovered mid-swamp.

### 3. Rejected alternatives (recorded so we don't re-litigate)

- **Swift on Windows + swift-winrt:** toolchain immature, debugging story poor, one
  company-sized public failure. Rejected.
- **Rust UI shell on Windows (Slint/egui — rev 2):** one language end-to-end, no C#
  binding. Rejected because custom-drawn widgets can never deliver native Fluent
  (Mica, system accent, native menus, Narrator). Documented as plan-D.
- **Kotlin Multiplatform + Compose Desktop:** non-native look on desktop, Swift
  interop consumer-only, C# interop nonexistent. Rejected.
- **Tauri:** keeps the web UI; smallest effort but fails the native-UI goal. Named
  fallback if the dual-UI cost proves unaffordable at the Phase 5 gate.
- **Avalonia (C#):** plan-B for the Windows shell specifically — ~90% Fluent look,
  saner tooling than WinUI 3, identical `uniffi-bindgen-cs` binding, so a swap
  strands no core work. Phase 0 produces the WinUI-vs-Avalonia verdict.

---

## Part II — Current system inventory (what we are actually migrating)

Measured 2026-06-11 at v7.3.3:

| Surface | Size | Notes |
|---|---|---|
| Renderer JS (`public/js`) | ~548 non-test source files | Heavily modularized `.mjs`, large pure-logic share |
| Styles (`public/styles`) | 26 files, **23,176 lines CSS** | Token-driven (`base.css` custom properties, `workbench-tokens.css`) |
| Main process (`main.js`) | 1,111 lines | Window mgmt, updater, LAN boot, IPC |
| Preload bridge (`preload.js`) | 338 lines, ~60 `electronAPI` methods | Full inventory in §13 |
| Local server (`server.js`) | 473 lines Express | Doc generation + LAN host mount + interno mobile web |
| Sync engine (`lan-squad/`) | ~50 modules + tests | Host store, LWW, WS/SSE/mDNS/UDP, sharded persistence |
| Storage (`lib/db/`) | ~25 modules | SQLCipher (better-sqlite3-multiple-ciphers), argon2, forensic audit chain, outbox, v10–v14 migrations |
| Domain libs (`lib/`) | historia-clinica, entrega, interno, drive-import, doc-generators | Pure logic, well tested |
| Native deps | SQLCipher, argon2 | The only two binary deps — both have first-class Rust equivalents |
| Doc templates | `template*.docx`, `templates/` | Data, not code — carried over as-is |
| Python runtime (`python-runtime/`) | vestigial | No references from `server.js`/`main.js`; delete in Phase 0 |

Three load-bearing observations:

1. **The renderer is already split into portable logic vs DOM code.** Files like
   `labs-*.mjs`, `censo-*.mjs`, `tend-core.mjs`, `estado-actual-parser.mjs` are
   pure functions with tests; files like `*-panel.mjs`, `*-modal.mjs`, `*-ui.mjs`
   are DOM. The port boundary largely already exists.
2. **Charts are already behind an adapter** (`estado-actual-charts-chartjs.mjs` is
   separate from `estado-actual-charts-series.mjs`). Series math ports to core;
   only the adapter is rewritten per platform.
3. **A golden-capture tool already exists** (`scripts/capture-procesar-labs-goldens.mjs`).
   The parity-harness approach is an extension of something proven in this repo,
   not a new invention.

---

## Part III — Target architecture

### 4. Process and threading model

**Today (Electron):** renderer (Chromium) ↔ preload IPC ↔ main process (Node) which
hosts Express + lan-squad + SQLCipher + updater. Mobile interno clients connect to
Express over LAN.

**Target (both platforms):** one native process.

```
┌────────────────────────────────────────────────────────────┐
│ Native app process                                         │
│                                                            │
│  UI thread: SwiftUI views / WinUI XAML                     │
│     │  bind ViewState records      ▲ observe events        │
│     ▼                              │                       │
│  rplus-api (UniFFI boundary) ──────┘                       │
│     │                                                      │
│  Core runtime (Rust, background threads):                  │
│   • tokio multi-thread runtime (sync server, mDNS, tasks)  │
│   • storage actor thread (all SQLite access serialized)    │
│   • compute pool (parsing, doc generation)                 │
│   • EventBus (topics: patients, labs, sync, update, db)    │
│                                                            │
│  Embedded HTTP server (axum) — LAN sync host + interno     │
│  mobile web client (replaces Express wholesale)            │
└────────────────────────────────────────────────────────────┘
```

Threading rules (enforced by `rplus-api` design, not discipline):

- Every UniFFI function is either **sub-millisecond synchronous** (reads of cached
  ViewState) or **async** (UniFFI async / callback-completed). Nothing on the UI
  thread ever waits on SQLite, the network, or a parser.
- All SQLite access goes through one storage actor (a thread owning the
  connection, fed by an mpsc channel). This mirrors today's single-main-process
  access pattern and sidesteps SQLCipher threading questions entirely.
- Shells register one `EventObserver` callback interface at startup; the core
  marshals events to it from any thread; the shell trampolines to its UI thread
  (`MainActor` / `DispatcherQueue`).

### 5. The strangler pipeline (how every core module ships)

For *every* core module, in order:

1. **Fixture capture** — generate golden fixtures from the module's existing JS
   tests (`scripts/export-golden-fixtures.mjs`, §15).
2. **Port** to its Rust crate; pass fixtures byte-for-byte.
3. **Bridge** through `bindings/node` (napi-rs); a runtime flag
   (`R_PLUS_NATIVE_<MODULE>=1`, surfaced in Settings → Diagnóstico) swaps the JS
   implementation for the Rust one inside the shipping Electron app.
4. **Ship** an Electron release with the flag default-on. Real clinical usage
   validates the port. Keep the JS path one release as an emergency flag-off.
5. **Delete** the JS implementation the following release. The bundle shrinks; the
   fixture suite remains as the permanent regression net.

By the time the SwiftUI shell renders its first screen, every function it calls
has been in production for weeks under Electron. The shells carry **UI risk only**.

### 6. Repository layout (monorepo, same repo)

```
R+/
  core/                          # Rust workspace — THE shared codebase
    Cargo.toml                   # workspace members below
    crates/
      rplus-model/               # M1
      rplus-storage/             # M2
      rplus-labs/                # M3
      rplus-clinical/            # M4
      rplus-docs/                # M5
      rplus-sync/                # M6
      rplus-api/                 # M7 — the only crate UniFFI exposes
    bindings/
      node/                      # napi-rs (Electron, transitional)
      swift/                     # generated UniFFI Swift package (SPM)
      csharp/                    # generated uniffi-bindgen-cs package (NuGet)
    fixtures/                    # golden masters, one dir per module
  apps/
    electron/                    # current app moved here; shrinks every release
    macos/                       # Xcode project; SwiftUI; SPM dep on bindings/swift
    windows/                     # WinUI 3 (Windows App SDK) C# solution
    interno-web/                 # the mobile interno client (survives as web, §11.9)
  docs/contracts/
    lan-protocol.md              # §14 — frozen wire contract
    storage-format.md            # §9  — SQLCipher params + schema contract
    viewstate-api.md             # §10 — screen-by-screen ViewState/Action catalog
```

---

## Part IV — The shared core: per-crate migration guides

Each guide covers: what it is today → Rust design → porting procedure → parity
strategy → gotchas. Port order: M1 → M3 → M4 → M5 → M2 → M6 (purest and
best-tested first; storage and sync after the fixture factory is mature).

### 7. M1 `rplus-model` — entities, canonical JSON, validation

**Today:** `lib/db/schema.mjs` (table shapes), `lib/db/canonical-json.mjs`
(deterministic serialization used by the audit chain and sync), entity keys
(`lan-squad/entity-keys.js`), `public/js/patient-validation.*`, the patient/lab/
historia-clinica object shapes implicit in `app-state.mjs` and `storage.js`.

**Rust design:**

- `serde`-derived structs for every entity: `Patient`, `LabSet`, `LabValue`,
  `LabHistory`, `HistoriaClinica` (with its sub-panels: AHF, APNP, APP, género,
  toxicomanías), `Eventualidad`, `Pendiente`, `Indicaciones`, `Receta`, `Nota`,
  `User`, `Team`, `TeamMembership`, `GuardiaState`, `RotationCycle`,
  `EntregaTemplate`, `Sala`. These structs are the single source of truth; UniFFI
  records are generated from them, and SQL rows and wire payloads deserialize into
  them.
- `canonical_json(value) -> String` — **must replicate ECMAScript semantics
  exactly**: key ordering as implemented in `canonical-json.mjs`, and crucially
  ECMA-262 `Number::toString` float formatting (use the `ryu`-based shortest-round-
  trip algorithm, which matches V8). The forensic audit chain and LWW hashing both
  depend on byte-identical output; this function is ported *first* and fuzzed
  against Node (property test: random JSON → both implementations → assert equal).
- Versioned-entity envelope (`versioned-mutation` semantics: `{entity, key,
  version, actor, ts, patch}`) as a generic `Versioned<T>`.

**Porting procedure:** transcribe shapes from `schema.mjs` + the validation tests;
generate fixtures from `canonical-json.test.mjs`, `patient-validation.test.mjs`,
`entity-keys.test.js`, `versioned-mutation.test.mjs`.

**Gotchas:** JS `undefined` vs `null` vs absent-key distinctions — audit which the
canonical serializer and sync merge actually distinguish, and encode that in serde
attributes (`skip_serializing_if`) deliberately. Dates: everything that crosses a
boundary is ISO-8601 strings already; keep strings in the model, parse at use sites.

### 8. M3 `rplus-labs` — lab parsing and trends *(the pilot crate)*

**Today:** ~25 parser modules — `labs-bh-extended`, `labs-gases` + `gaso-extended`,
`labs-coag`, `labs-ego-plt-cit`, `labs-heces`, `labs-frotis`, `labs-cultivo`,
`labs-citoquimico-liquidos`, `labs-pct`, `labs-egfr`, `labs-some-detect/-table`,
`labs-differential-manual`, `labs-diff-coag`, `labs-fecha-hora`,
`labs-bh-trend-parse`, `labs-trend-order`, `labs-procesar-characterization` —
plus `tend-core.mjs` (trend series), `lab-history-set/-cache/-repair/-auto-store-core`,
and `lab-bulk-paste`.

**Rust design:** one module per panel mirroring today's file layout 1:1 (reviewable
diffs beat clever refactors during a port). Input: raw pasted `&str`. Output:
`LabSet { fecha, hora, values: Vec<LabValue>, panel: PanelKind, flags }`. Trend
functions take `&[LabSet]` → `TrendSeries`. Everything pure; no I/O.

**Porting procedure:** this crate pilots the whole pipeline (Phase 0 ports BH
alone). `capture-procesar-labs-goldens.mjs` already harvests real-world paste
inputs — extend it to dump every existing test input *plus* the captured goldens
into `core/fixtures/labs/`. Port one parser at a time; each lands behind the napi
flag and ships.

**Parity:** byte-identical structured output via canonical JSON. Spanish-locale
quirks (decimal commas, `10^3/µL` unit spellings, accented panel headers) are
exactly what the goldens encode — do not "clean up" parser behavior during the
port; file desired fixes as post-migration issues.

### 9. M2 `rplus-storage` — SQLCipher, crypto, audit, migrations

**Today:** `lib/db/` — `db-manager.mjs` (open/unlock/lifecycle), `crypto.mjs` +
`clinical-crypto.mjs` (argon2 KDF, blob encryption), `clinical-blobs.mjs` +
`clinical-blob-keys.mjs` (patient clinical data stored as **encrypted blobs** in
`clinical_blob`), `clinical-access-db.mjs`/`clinical-privileges.mjs`/
`clinical-username.mjs` (users/teams/roles), `audit-hooks.mjs` +
`forensic-audit.mjs` (hash-chained `forensic_audit_chain`), `lan-sync-outbox.mjs`,
`schema.mjs` with versioned migrations (v10→v14 visible), `migrate-from-legacy.mjs`,
`db-path.mjs`, `native-load.mjs`. Tables include: `app_meta`, `clinical_blob`,
`lan_host_state`, `forensic_audit_chain`, `users`, `teams`, `team_membership`,
`active_guardias`, `rotation_cycles`, `patient_team_assignment`,
`team_guardia_today`, `sala_interno_access`, `entrega_template_user/team`,
`lan_sync_outbox`, `lan_host_meta`, `lan_room_bundles`, `lan_bundle_entries`,
`lan_lab_sets`, `lan_lab_set_order`.

**Rust design:**

- `rusqlite` with the `sqlcipher` feature (bundled SQLCipher, pinned version).
- **Storage actor:** one thread owns the `Connection`; commands arrive on a
  channel; results return via oneshot. Public API is async. WAL/journal settings
  copied verbatim from `db-manager.mjs`.
- Crypto: `argon2` crate (RustCrypto — same algorithm family as `@node-rs/argon2`;
  pin identical params: variant, memory, iterations, parallelism, salt handling).
  Blob cipher: port `clinical-crypto.mjs` byte-compatibly — extract its exact
  primitive/nonce/AAD layout into `docs/contracts/storage-format.md` *first*, then
  implement against decrypt-known-vector fixtures.
- Audit chain: port `forensic-audit.mjs` verify/append/export; depends on M1
  canonical JSON being byte-perfect (this is why M1 ships first).
- Migrations: same `schema_version` numbering continues — native code must open a
  v14 file written by Electron and vice versa during the entire transition.

**The critical contract — `docs/contracts/storage-format.md`:** SQLCipher cipher
settings (`cipher_compatibility`, KDF iterations, page size, HMAC algorithm — read
them out of the current better-sqlite3-multiple-ciphers config and **pin them
explicitly with PRAGMAs on both sides**; defaults differ between builds and
mismatch = "file is not a database" in the field), argon2 params, blob crypto
layout, schema version policy.

**Parity:** beyond fixtures, a CI cross-implementation test: Node writes a DB
(unlock, save clinical blobs, append audit entries) → Rust opens, verifies chain,
reads blobs → mutates → Node re-opens and verifies. Run both directions on every
core PR from Phase 1 onward.

**Renderer-side storage:** `public/js/storage.js` (807 lines) is the renderer's
persistence layer with quota handling. Phase 4 includes an audit of what still
lives only in `localStorage` (prefs, drafts, caches) and moves anything
load-bearing into SQLCipher (`app_meta` or new tables). **Exit rule: after Phase
4, localStorage is cache-only and may be deleted without data loss.** That makes
the native cutover file-copy-free: the native app opens the same `.db` in the same
data dir; no LevelDB scraping, no import wizard.

### 10. M4 `rplus-clinical` — clinical text, censo, domain logic

**Today:** `censo-*.mjs` (build, header/labs/meds/pendientes/signos/cultivo
formatters, table columns, preview), `lib/historia-clinica/*` (compile-narrative,
clinical-text, defaults, genero-options, toxicomanias, migrate-legacy),
`lib/entrega/*` (pendientes, vitals-plan), `lib/interno/*` (pendientes, scope,
vitals), `lib/drive-import/*` (segment, parse-header, parse-drive-document/-labs,
map-to-eventualidades, map-universal-hc, merge-*), `estado-actual-{parser, text,
ranges, data, meds, parse-variants, registro-defaults}`, `med-receta-core`,
`med-pharm-*-core`, `receta-hu-core`, `vpo-lookups/-text`,
`listado-problemas-core`, `lib/patient-priority-sort` + `patient-bed-sort`,
`age-calc`, `todos-priority`, `quick-output`.

**Rust design:** sub-modules mirroring today's files. All deterministic
string-builders and pure transforms. No surprises — this is the largest but most
mechanical crate.

**Gotchas:** Spanish text generation must be byte-identical — date formatting
(`es-MX` month/day names), `toLocaleString` number grouping, uppercase rules
(`historia-clinica-uppercase`), pluralization. Do **not** reach for `icu`; port the
exact formatting helpers the JS uses (they're small and the fixtures will reject
anything else). `age-calc` edge cases (leap years, "días/meses/años" thresholds)
are already tested — free fixtures.

### 11. M5 `rplus-docs` — document generation

**Today:** `lib/doc-generators/{shared,note,listado,indicaciones}.js`,
`generate-censo.js` (with layout tests), `generate-receta-hu.js`,
`lib/doc-export-{service,http,audit}.js`, `lib/output-dir-policy.js`. Mechanism:
fill Word templates (`template.docx`, `template_listado.docx`,
`template_indicaciones.docx`, `templates/`) via `jszip` + XML string assembly;
PDF via `pdf-lib` where used. Served through `/generate*` routes and the
`generateDocument` IPC.

**Rust design:** `zip` crate to open templates, `quick-xml` to manipulate
`word/document.xml` — port `shared.js`'s helpers (run/paragraph builders, table
row stamping, placeholder substitution) as a small internal "docx-write" module
rather than adopting a heavyweight docx crate (the JS proves a small one
suffices). PDF: `lopdf` (closest to pdf-lib's primitive-level model). Templates
remain data files bundled as app resources on both platforms.

**Parity:** binary docx fixtures: unzip both outputs, canonicalize XML
(pretty-print, stable attribute order), diff `document.xml` and any touched parts.
The existing `generate-censo.layout.test.js` cases convert directly.

**Output policy:** `output-dir-policy` logic (approved-dir validation, fallbacks)
ports to core; the *dialog* and the *security-scoped persistence* are shell
concerns (§17: macOS security-scoped bookmarks, Windows `FutureAccessList` or
plain path persistence for unpackaged).

### 12. M6 `rplus-sync` — the LAN sync engine

**Today — host side (`lan-squad/`):** `host-router.js` (Express routes),
`auth-router.js` (team code → `auth/exchange`, `auth/shift-pin` +
`/regenerate`, `auth/tickets`, `auth/ward-host-hints`; bearer auth middleware),
`host-store.js` + `host-state-cache.js` + `host-clinical-meta.js`,
`bundle-merge.js`, `conflict-resolver.js` + `lww-utils.js` (last-writer-wins with
versioned mutations), `delta-paths/-resolver.js`, `command-registry/-resolver.js`,
`write-queue.js`, `ws-hub.js`, `lan-sse-hub.js`, `lan-mdns-service.js`
(bonjour-service), `lan-udp-beacon.js`, `lan-network-watch.js`, `audit-log.js`,
`redact-secrets.js`, `ticket-store.js`, `team-code.js` / `effective-team-code.js`,
`persistence/` (commit-barrier, sharded-host-persistence, lab-sidecar,
sqlite-host-repositories), `migrate-host-state.js`, `atomic-json.js`.
**Client side (`public/js`):** `lan-client`, `lan-connection-manager`,
`lan-sse-client`, `live-sync-{room,membership,outbox}`, `draft-conflict-store`,
`versioned-mutation`, `lan-patient-merge`, `lan-merge-registry`,
`lan-host-{pin,rank,registry,subnet-discovery,consolidation}`,
`lan-network-roam`, `lan-shift-pin-connect`, `host-bundle-bases`, plus the
`features/lan/` orchestrator/room/push/transport/runtime.
**Routes (frozen contract):** `/health`, `/ping`, `/host-status`, `/host-rank`,
`/beacon`, `/join`, `/join/:ticketId`, `/rooms`, `/rooms/:id`,
`/rooms/:id/{commands,delta,deltas,flush,sync-bundle,clinical-ops}`, `/patients`,
`/patients/:id`, `/patients/:id/{fields,indicaciones,nota,lab-history/upsert-set}`,
`/patients/:patientId/historia-clinica`, `/auth/*`, `/qr.svg`, plus interno
(`/board`, `/vitals`) and doc routes (`/generate*`).

**Rust design:** one crate, two halves sharing all types:

- `sync::host` — an `axum` server (replaces Express + `ws` + SSE wholesale):
  routers mapped 1:1 from the route list above; `tokio-tungstenite` WS hub;
  SSE via axum's native support; `mdns-sd` for advertise/browse (same service
  type string as bonjour-service registers today); UDP beacon on the same port
  with the same payload; rate limiting via `tower` middleware mirroring
  `express-rate-limit` settings; the security headers from
  `lib/server-http-security.js` ported as a `tower` layer; `redact-secrets`
  ported for log hygiene. Persistence reuses M2's storage actor (the
  `lan_host_*` / `lan_room_bundles` / `lan_lab_sets` tables and the lab sidecar
  pattern), with the commit-barrier semantics preserved.
- `sync::client` — connection manager state machine (discover → rank → join →
  room/SSE/WS lifecycle → roam on network change), outbox drainer, LWW merge,
  draft-conflict store. Network-change notifications come from the shells
  (`NWPathMonitor` on macOS, `NetworkInformation.NetworkStatusChanged` on
  Windows) through a single `network_changed()` core API.
- `sync::protocol` — every wire type as serde structs; **this module *is* the
  contract**; `docs/contracts/lan-protocol.md` is generated-from/checked-against
  it (schema snapshots in fixtures).

**Election & roles:** host-rank/pin/consolidation logic ports as-is; an app
instance can be host, guest, or both-capable, exactly as today.

**Parity:** three layers — (1) unit fixtures from the ~30 lan-squad test files
(LWW edge cases, bundle merge, delta resolution, team-code/ticket auth); (2)
**conformance matrix** in CI: `scripts/lan-virtual-peer.mjs` runs against the Rust
host, and a new thin Rust virtual peer runs against the JS host — JS↔JS, JS↔Rust,
Rust↔JS, Rust↔Rust for join/push/merge/conflict/roam scenarios; (3) a real-ward
mixed soak (≥2 weeks) before the JS engine is deleted.

**Gotchas:** clock-skew handling in LWW (port the exact tolerance rules from
`lww-utils`); SSE keep-alive/retry timing (mobile interno clients depend on it);
mDNS TXT record contents must match or old clients won't pair with new hosts;
bearer-token formats must round-trip (an Electron guest must authenticate against
a Rust host with a token minted by a JS host yesterday).

### 13. M7 `rplus-api` — the UniFFI façade and the ViewState pattern

This crate is the answer to "how do we keep two UIs from drifting." It is the only
crate the shells see, and it exposes three things:

**1. ViewState records + Actions, per screen.** Every screen's *behavior* lives in
core; the shells render and forward intents:

```rust
// Sketch — patient list
#[derive(uniffi::Record)]
pub struct PatientListState {
    pub rows: Vec<PatientRowVm>,      // pre-formatted: display name, bed label,
    pub filter: CensusFilter,         //   priority badge, pendientes count, etc.
    pub section_counts: Vec<SectionCount>,
    pub selected_id: Option<String>,
}
#[derive(uniffi::Enum)]
pub enum PatientListAction {
    Select { id: String },
    SetFilter { filter: CensusFilter },
    Reorder { from: u32, to: u32 },
    QuickAction { id: String, kind: QuickActionKind },
}
// Shells call: api.dispatch(Action) ; observe via EventObserver
```

Rules: ViewState fields are **display-ready** (formatted strings, resolved colors
as semantic tokens, sorted rows) — if a shell ever contains an `if` about domain
data, that logic moves down into core. Hot, high-frequency screens get typed
records; the long tail may use a JSON-string ViewState to keep the UniFFI surface
small (decided per screen in `docs/contracts/viewstate-api.md`, which catalogs
every screen's State + Actions and is the shared spec both shells implement).

**2. The EventBus observer.**

```rust
#[uniffi::export(callback_interface)]
pub trait EventObserver: Send + Sync {
    fn on_event(&self, topic: Topic, payload_json: String);
    fn on_state_changed(&self, screen: ScreenId);
}
```

Topics: `Patients`, `Labs`, `Sync` (peer joined/left, conflict toast, merge
applied), `Db` (locked/unlocked), `Update`, `Docs`. This single mechanism replaces
today's DOM `CustomEvent`s, IPC push events (`onLanNetworkChanged`,
`onUpdateProgress`, …), and SSE-client fan-out inside the renderer.

**3. Lifecycle + services:** `start(config)`, `unlock(passphrase) -> UnlockResult`,
`lock()`, `shutdown()`, doc generation (`generate_censo(opts) -> DocumentBytes`),
QR rendering (`qr_svg(payload) -> String` — `qrcode` crate replaces
`qrcode-generator`), diagnostics snapshots (replacing `lan-sync-diagnostics`).

**Transitional napi bridge:** `bindings/node` exposes the same functions to
Electron. During Phases 2–5 the renderer progressively calls core through preload
instead of local JS — meaning the ViewState pattern itself gets debugged under
Electron before any native shell consumes it.

---

## Part V — The native shells: full UI replication guide

### 14. Design-language translation strategy

The current UI is a custom premium dark design (the 2026-06 Premium UI overhaul):
token-driven CSS (`--surface`, `--border`, `--action`, `--text`/`--text-muted`,
`--density-space`/`--density-font`, `--radius-{md,lg,xl,pill}`, `--shadow-md`,
`--ease-out`/`--dur-normal`, lab-chip colors, etc. — `base.css` +
`workbench-tokens.css`). The decision from rev 3: **shells translate this design
into platform idioms; they do not pixel-clone the web app.**

Concretely:

- **Design-token bridge.** A small build step (`scripts/export-design-tokens.mjs`)
  parses the CSS custom properties into `design-tokens.json`. From it, codegen
  emits: a Swift `Theme` struct (colors as dynamic light/dark `Color`s, spacing,
  radii, durations) and a WinUI `ResourceDictionary` (theme-aware brushes,
  thicknesses, corner radii). Semantic names survive (`Surface`, `Action`,
  `TextMuted`, `LabChipBg`…); raw values differ where platform conventions demand
  (e.g., Windows uses Mica behind `Surface`; macOS uses material/vibrancy where
  appropriate).
- **What is preserved:** information architecture, terminology (Spanish labels
  verbatim — they come from core ViewState anyway), color semantics (priority,
  lab abnormality flags, sync status), density options, dark/light behavior,
  keyboard shortcuts, every workflow's step sequence.
- **What is translated, not copied:** widget chrome (Fluent buttons/NavigationView
  on Windows; AppKit-flavored SwiftUI on macOS), motion (platform animation
  systems honoring `motion.css` intent and the existing reduced-motion preference
  — `ui-motion.mjs`'s modes map to `Reduce Motion` / `Settings.AnimationsEnabled`),
  modal presentation (sheets vs `ContentDialog`).
- **Parity instrument:** for each screen, a side-by-side screenshot review against
  the Electron app is part of the cluster checklist (§16) — judged on "same
  information, same hierarchy, same affordances," not pixel equality.

### 15. Shell anatomy and control mapping

App skeleton per platform:

| Concern | Today | SwiftUI (macOS) | WinUI 3 (Windows) |
|---|---|---|---|
| App shell / nav | tab bar + sidebar (`app-shell.mjs`, `sidebar.css`, `chrome.mjs`) | `NavigationSplitView` (sidebar = patients/sections) + top-level scene per tab | `NavigationView` (left pane) + Mica window; `TabView`-style top areas where the web app uses inner tabs |
| Window chrome | frameless tweaks (`getWindowChromeFlags`) | standard titlebar, unified toolbar | `AppWindow` + custom titlebar w/ Mica |
| Inner tabs (Expediente, etc.) | `expediente-tabs` | `Picker(.segmented)` / custom tab strip | `SelectorBar` / `TabView` |
| Patient list (virtualized, incremental) | `patient-list-incremental.mjs`, `unified-patient-grid-board` | `List`/`Table` (lazy by default) | `ListView`/`ItemsView` (UI virtualization built-in) |
| Drag reorder | SortableJS | `.onMove` / custom drop delegates | `CanReorderItems` + drag events |
| Modals (~all in `partials/modals/root.html`) | DOM modals | `.sheet` / `.popover` / panels | `ContentDialog` / `Flyout` |
| Command palette (`cmdk.css`, `command-palette.mjs`) | overlay + fuzzy match | floating panel + `@FocusState`; fuzzy match **stays in core** (`fuzzy-match` ports to M7) | custom popup + `AutoSuggestBox`-style list; same core matcher |
| Toasts (LWW conflict, sync) | DOM toasts | bottom-trailing overlay stack | `InfoBar` / `TeachingTip` |
| Forms (historia clínica panels, registro) | long form DOM | `Form`/`Section` with grouped styling | `StackPanel` + CommunityToolkit `SettingsCard`-style groups |
| Lab chips / badges | styled spans | `Capsule` views w/ semantic colors | custom `Border`-based chip control (one reusable control) |
| Date/time pickers (`rpc-date-picker.css`) | custom picker | native `DatePicker` | native `CalendarDatePicker`/`TimePicker` |
| Tables (censo preview, SOME tables) | HTML tables | `Table` (macOS 13+) | `ItemsView`/`DataGrid` (CommunityToolkit) |
| QR (interno join) | `qrcode-generator` + `/qr.svg` | core renders SVG/PNG bytes → `Image` | same → `Image` |
| Clipboard, open-external | IPC | `NSPasteboard`, `NSWorkspace` | `Clipboard`, `Launcher` |
| Keyboard shortcuts (palette, presentation mode) | DOM handlers | `.keyboardShortcut` + menu commands | `KeyboardAccelerator` |
| Onboarding/tour | `tour-*` runtime | **re-scoped** (§16, C7): native "first run" checklist, not a spotlight tour engine | same |

### 16. Charts

Series computation (`estado-actual-charts-series.mjs`, `tend-core.mjs`, ranges,
reference bands) is already separated from the Chart.js adapter — it ports to core
(M3/M4) and both shells receive **identical, render-ready series**: points,
y-domain, reference-band rectangles, threshold lines, axis tick labels
(pre-formatted strings from core so number formatting can't drift).

- **macOS:** Swift Charts — `LineMark`/`PointMark` + `RectangleMark` for reference
  bands; sparkline grid = `LazyVGrid` of mini-charts; detail view = full chart in
  a sheet with scrubbing (`chartOverlay` + drag gesture for the value cursor).
- **Windows:** LiveCharts2 (WinUI target) — `LineSeries` + `RectangularSection`
  for bands; same sparkline-grid/detail-modal structure. Plan-B: ScottPlot 5.
- Visual parity bar: "equivalent, not identical" — but **numbers, units, ranges,
  and abnormality coloring are core-supplied and therefore exactly identical.**
- Export-to-image (used in sesion-ingreso send flows): `ImageRenderer` on macOS,
  `RenderTargetBitmap` on Windows, normalized to the same pixel size from core
  layout hints.

### 17. UI feature clusters — screen-by-screen port inventory

A cluster is "done" when a clinician can run that workflow end-to-end natively.
Every screen gets an entry in `docs/contracts/viewstate-api.md` *before* either
shell builds it.

**C1 — Shell, unlock, session** (`db-unlock`, `session-manager`, `chrome`,
`header-context`, `settings-help` core pages, `clinical-sync-mode-settings`,
performance prefs): app window + nav, DB unlock screen (passphrase + recovery +
auto-unlock), session/role context bar, settings surface. *This cluster also
proves the EventObserver plumbing and theme bridge.*

**C2 — Patients & Expediente** (`patients`, `patients-clinical-filter`,
`patient-list-incremental`, `expediente`, `expediente-tabs`,
`expediente-group-row`, `clinical-registration`, `historia-clinica-*` panels,
`eventualidades-panel`, `listado-problemas`): patient CRUD, census list w/
filters + virtualization + reorder, expediente inner tabs, the full historia
clínica form set, eventualidades timeline.

**C3 — Labs** (`lab-panel`, `labs.js` runtime, `lab-bulk-paste` +
`lab-bulk-preview-modal`, `lab-some-tables-modal`, `lab-history-batch-copy`,
`tendencias` + `tend-prefs`): paste-and-parse flow with live preview, panel
chips, history management, Tendencias sparkline grid + detail charts.

**C4 — Estado Actual** (`estado-actual-panel`, `-data`, `-med-ui`, `-meds`,
`-registro-modal`, `-paste-modal`, `-charts-*`, `-vital-series`,
`-glu-rescue`, `soap-estado`): vitals/meds dashboard, registro entry, EA
charts (the chart-heavy cluster), SOAP estado integration.

**C5 — Documents & outputs** (`censo-*` UI, `notes-indicaciones`, `receta-hu`,
`med-receta`, `vpo-panel`, `quick-output`, `document-export-client`,
`sesion-ingreso-*-send-modal`, `drive-import-modal` + `-apply`): every generate/
export flow wired to M5, output-dir picking (§19), drive import wizard.

**C6 — Clinical ops** (`guardia-board`, `guardia-*`, `pase-board`,
`clinical-entrega` + `entrega-*`, `clinical-teams` + roster, `clinical-rotation*`,
`agenda`, `todos`, `productivity`, `unified-patient-grid-board`,
`clinical-census-filters-*`, `pase`/`guardia` phase bars, `profile` +
`med-pharm-profile-panel`): the ward-workflow boards. Largest cluster; split into
C6a (guardia/pase/entrega) and C6b (teams/rotation/agenda/todos/profile).

**C7 — Sync UI & long tail** (`lan-hub-panel-shell`, `features/lan/*` panels +
host dashboard, `clinical-conflict-viewer`, `interno-qr-panel`,
`clinical-onboarding-*`, `learn-hub`, `settings-help` remainder, update UI):
LAN hub (host/join/QR/status/diagnostics), conflict viewer, onboarding.
**Scope cuts decided now:** the spotlight tour engine (`tour-*`, ~15 modules) is
replaced by a lightweight native first-run checklist + the learn hub; pitch-demo
sandbox (`tour-pitch-demo-*`) is retained **Electron-only** until sunset, then
re-evaluated; `mobile-web` renderer paths remain web (§18).

**Per-screen Definition of Done (the cluster checklist template):**
1. ViewState + Actions cataloged in `viewstate-api.md`; core controller has tests.
2. Screen renders from ViewState only (code review gate: no domain logic in shell).
3. All Actions wired; optimistic updates where today's UI has them.
4. Events (sync pushes, conflict toasts) reflected live.
5. Keyboard shortcuts + focus order + VoiceOver/Narrator labels.
6. Dark/light + density variants verified.
7. Side-by-side screenshot review vs Electron signed off.
8. Spanish copy verified verbatim (sourced from core).

### 18. The interno mobile web client survives

Phones/tablets of internos join over LAN via QR and use a **web** board
(`/board`, `/vitals`, `manifest.webmanifest`, `mobile.css`/`mobile-surfaces.css`,
`lib/interno/*`). This is the right architecture for unmanaged guest devices and
is **not** part of the native migration: the interno web client moves to
`apps/interno-web/`, gets bundled as static resources into both native apps, and
is served by the axum server in M6 exactly as Express serves it today. Its JS must
only keep using the frozen wire protocol. (This also bounds the migration: the
desktop renderer dies; the mobile web surface deliberately lives on.)

### 19. Platform services (per shell, thin by design)

| Service | Today (IPC) | macOS | Windows |
|---|---|---|---|
| Auto-update | electron-updater + custom stable/downgrade catalog (`update-downgrade`, `stable-versions-catalog`, `min-version.json`, channels) | **Sparkle 2**: appcast per channel; downgrade-to-stable = pinned appcast item; `min-version` enforcement in-app at boot | **Velopack**: channels via separate feeds; same in-app min-version/downgrade logic, which **ports to core** (it's catalog policy, not platform code) |
| Update UI | banner + progress (`onUpdate*`) | core `Update` topic events → banner | same |
| Output directory approval | `selectOutputDir`/`setApprovedOutputDir` + `output-dir-policy` | `NSOpenPanel` + **security-scoped bookmark** persisted; policy checks in core | `FolderPicker` + persisted path (`FutureAccessList` if packaged) |
| Save/export docs | `saveExportedDocument`, doc-export audit | write via bookmark; audit entry through core | write; audit through core |
| Keychain (team code, bearer, db auto-unlock secret) | files/safeStorage | Keychain Services | DPAPI / Credential Manager |
| Clipboard | `writeClipboardText` | `NSPasteboard` | `Clipboard` |
| Open external / user-data folder | `openExternal`, `openUserDataFolder` | `NSWorkspace` | `Launcher` |
| Network change events | `onLanNetworkChanged` (main watches) | `NWPathMonitor` → `core.network_changed()` | `NetworkInformation` → same |
| Single instance, relaunch | Electron APIs | `NSRunningApplication` checks / login item | named mutex / `AppInstance` |
| Window state, full screen/presentation | `getWindowChromeFlags`, presentation shortcut | scene persistence + `presentationMode` | `AppWindow` persistence |
| Hardware-accel pref (`performance.json`) | GPU toggle workaround | **obsolete** — native rendering; delete pathway | obsolete |

### 20. The IPC surface replacement map

Every `electronAPI.*` method (preload.js, ~60 methods) gets a disposition. By
group (full per-method table maintained alongside `viewstate-api.md`):

- **Updates** (`onUpdateAvailable/Progress/Ready/NotAvailable/Error`,
  `installUpdate`, `checkForUpdates`, `reinstallCurrentRelease`,
  `downgradeToStable`, `resetUpdateFeed`, `setUpdateChannel`,
  `onDowngradeFailed`, `openDowngradeInstaller`, `getAppVersion`) → shell
  updater (Sparkle/Velopack) + core update-policy module + `Update` events.
- **DB** (`dbStatus`, `dbUnlock`, `dbAutoUnlock`, `dbUnlockRecovery`, `dbLock`,
  `dbMigrationProbe`, `dbClinicalLoadAll/SaveAll`, `dbAuditVerify/Export`,
  `dbBackupExportJson`, …) → direct `rplus-api` calls (M2). `dbClinicalLoadAll/
  SaveAll` disappear as a *pattern* — native screens read ViewState instead of
  bulk-loading blobs into renderer memory.
- **LAN** (`ensureLanServerReady`, `syncLanHostClinicalMeta`,
  `writeLanHostTeamCode`, `getLanCandidateBaseUrl`, `getLanSubnetPrefixes`,
  `onLanNetworkChanged`, `onLanMdnsPeers`, `lanUdpDiscover`,
  `resetLanSquadHostState`, `getLanEffectiveTeamCode`, `lanGuestWriteBearer`,
  `getLanGuestBearer`, `lanWardHost*`, `onInternoHostSync`, dev-peer helpers) →
  M6 client/host APIs + `Sync` events; secrets via §19 keychain row.
- **Docs/output** (`generateDocument`, `saveExportedDocument`, `selectOutputDir`,
  `setApprovedOutputDir`) → M5 + shell file services.
- **Misc** (`openExternal`, `writeClipboardText`, `relaunchApp`, `getPlatform`,
  `getUserDataPath`, `openUserDataFolder`, `sendToSesionIngreso`,
  `getWindowChromeFlags`, `getPerformancePrefs`, `setHardwareAcceleration`,
  `getNativeRuntimeStatus`, `isSoftwareRender`) → shell services; the GPU/
  software-render/native-runtime-probe family is **obsolete by construction**.

---

## Part VI — Contracts, testing, release engineering

### 21. Frozen contracts

1. **`docs/contracts/lan-protocol.md`** — the route list in §12, WS frame schemas,
   SSE event names + retry semantics, mDNS service type + TXT records, UDP beacon
   payload, auth flows (team code exchange, shift-pin lifecycle + regenerate,
   ticket join, bearer format + expiry), LWW/versioned-mutation semantics incl.
   clock-skew tolerance, bundle/delta formats, protocol version advertisement.
   Written from the JS while it's authoritative (Phase 1), then checked against
   `sync::protocol` serde types via schema-snapshot fixtures.
2. **`docs/contracts/storage-format.md`** — SQLCipher PRAGMAs pinned on both
   implementations, argon2 params, clinical-blob crypto layout, audit-chain hash
   recipe, schema version policy ("native and Electron must both open vN and vN+1
   throughout the transition").
3. **`docs/contracts/viewstate-api.md`** — every screen's ViewState/Actions; the
   single spec both shells implement; doubles as the UI parity checklist source.

### 22. Test strategy (full pyramid)

- **Golden fixtures** (`core/fixtures/`): generated by
  `scripts/export-golden-fixtures.mjs` from existing test inputs + the procesar
  goldens; consumed by per-crate Rust harnesses. Rule: **no JS module deleted
  until its Rust port passes 100% of its fixtures and has shipped default-on in
  one Electron release.**
- **Property tests:** canonical JSON vs Node (random JSON round-trips), LWW merge
  commutativity/idempotence cases, parser fuzzing (never panic on arbitrary paste).
- **Cross-implementation storage tests:** Node↔Rust DB file round-trips incl.
  audit-chain verification (§9), both directions, every core PR.
- **Sync conformance matrix:** virtual peers, 4 host/client combinations,
  scenarios: discover, join (pin + ticket), push, bundle merge, conflict, flush,
  roam, host consolidation (§12).
- **Core controller tests:** ViewState reducers tested in Rust (the bulk of "UI
  testing" moves here, runs on every PR, platform-free).
- **Shell tests:** thin — XCUITest / WinAppDriver smoke per cluster (launch,
  unlock, one happy path per screen); screenshot diffs per cluster sign-off.
- **Existing policy honored:** targeted tests only in dev (per repo policy);
  CI runs full suites.

### 23. Build, packaging, release pipeline

- **CI matrix** (GitHub Actions): `macos-14` (cargo test + fixtures + UniFFI
  swift gen + xcodebuild + notarization on tags) and `windows-2022` (cargo test +
  uniffi-bindgen-cs + msbuild/WinUI + Velopack pack + signing on tags); a Linux
  job runs core tests + conformance matrix cheaply on every PR.
- **Release tooling:** `scripts/release.js` grows three artifact lanes during
  transition — electron-builder (existing), Sparkle appcast XML, Velopack feed —
  publishing to the same GitHub Releases. `stable-versions.json` /
  `min-version.json` catalogs are kept and consumed by the core update-policy
  module on all three runtimes.
- **App size/footprint win to advertise:** Electron+Chromium+Node (~250 MB
  installed, ~500 MB RSS idle) → native shell + core (~15–30 MB installed); worth
  measuring at Phase 6/7 exits for the release notes.
- **Signing:** macOS Developer ID + notarization (already in place for Electron);
  Windows code-signing cert (already required today) reused for MSIX/Velopack.

---

## Part VII — Phases

Solo-maintainer pacing; phases overlap deliberately. Every phase leaves the
product strictly better even if the plan stops there.

**Phase 0 — Walking skeleton (kill/go gate)** ~2–3 wks
Workspace + `rplus-labs` with the BH parser only. Bind three ways: napi→Electron
(flag), UniFFI→Swift 1-screen app, UniFFI→C# 1-screen WinUI 3 app. The WinUI spike
includes a real patient-style form (Spanish text entry) + virtualized list — that
surfaces WinUI rough edges while swapping to Avalonia is still free. Delete
`python-runtime/` from the repo and packaging.
*Exit:* same bytes from all three hosts; WinUI-vs-Avalonia verdict recorded;
toolchain pain assessed honestly. **Miserable ⇒ stop, take Tauri fallback.**

**Phase 1 — Fixture factory + contracts** ~2 wks (overlaps P0)
`export-golden-fixtures.mjs`; fixtures for M3/M4 generated; `lan-protocol.md` and
`storage-format.md` written from the JS source of truth; cross-impl DB test rig.
*Exit:* fixtures + cross-impl tests in CI; contracts reviewed.

**Phase 2 — Pure-logic core (M1, M3, M4)** ~6–10 wks
Canonical JSON first (with the V8 float-formatting proof), then parsers
one-by-one, then clinical text. Each lands flag-on in a 7.4.x Electron release.
*Exit:* all M1/M3/M4 JS deleted; production Electron runs Rust logic.

**Phase 3 — Documents (M5)** ~3–4 wks
Docx-write module, binary-diff fixtures, generators ported, doc-export audit
through core.
*Exit:* JS doc generators deleted; `/generate*` served by core via napi.

**Phase 4 — Storage (M2)** ~4–6 wks
Storage actor behind existing IPC names; crypto vectors; audit-chain parity;
localStorage audit ("cache-only" exit rule, §9); one release dual-path.
*Exit:* Electron persists exclusively through Rust storage.

**Phase 5 — Sync (M6)** ~6–8 wks
`sync::protocol` types checked against contract; host (axum) + client state
machine; conformance matrix green; interno web served by axum; Express + `ws` +
bonjour retired from Electron.
*Exit:* mixed JS/Rust rooms stable in a real ward ≥2 weeks. **Gate: core is 100%
Rust under Electron — reconfirm appetite for dual-UI cost before proceeding.**

**Phase 6 — macOS shell** ~10–14 wks
`viewstate-api.md` per cluster → core controllers → SwiftUI clusters C1→C7, beta
per cluster (same DB file ⇒ users run Electron and native side-by-side, switching
freely). Sparkle wired by C1.
*Exit:* clinicians complete a full guardia day natively; per-screen DoD (§17) met
for all clusters; Electron-mac enters maintenance.

**Phase 7 — Windows shell** ~8–12 wks
Same cluster order; controllers, ViewState catalog, and parity checklists already
exist from Phase 6, so this is mostly XAML + bindings. Velopack wired by C1.
*Exit:* same bar on Windows.

**Phase 8 — Sunset** ~2 wks
Final Electron release = migration prompt; update manifests point to native
installers; electron-builder lane archived; `apps/electron` deleted one stable
release later. Post-migration backlog opened (parser cleanups deferred in §8,
tour re-evaluation, pitch-demo decision).

**Total: ~10–14 months** at sustainable part-time pace. Stopping after any phase
strands nothing: P2–P5 alone yield a faster, smaller, memory-safer Electron app
with frozen protocol docs and a permanent regression net.

---

## Part VIII — Risk register

| Risk | Sev | Mitigation |
|---|---|---|
| SQLCipher param mismatch bricks field DBs | **H** | storage-format contract; PRAGMAs pinned explicitly both sides; cross-impl open tests both directions on every PR from Phase 1 |
| Canonical-JSON float formatting diverges (audit chain + LWW break silently) | **H** | M1 ports first; ECMA-262 number algorithm; property-fuzz vs Node in CI |
| Sync semantics drift (LWW edges, clock skew, SSE timing) | **H** | protocol contract + 4-way conformance matrix + 2-week mixed-ward soak gate |
| Solo-maintainer burnout / stall | **H** | strangler design: every phase ships standalone value; explicit gates at P0 and P5 grant permission to stop or pivot (Tauri) without sunk-cost loss |
| WinUI 3 rough edges (they exist) | M | Phase 0 spike is a *real* form+list; Avalonia plan-B costs only XAML, zero core |
| `uniffi-bindgen-cs` lags upstream UniFFI | M | pin UniFFI per release train; `rplus-api` surface changes rarely after Phase 2 |
| Dual UI drift (mac ships what Windows lacks) | M | logic structurally lives in core controllers; `viewstate-api.md` is the shared spec; any shell PR containing domain logic is bounced down to core |
| ViewState pattern too chatty over FFI | M | typed records for hot screens, JSON for long tail; debugged under Electron via napi during P2–P5, long before shells depend on it |
| Chart visual parity disappoints users | L–M | numbers/ranges/colors identical by construction (core-supplied); per-cluster screenshot sign-off; "equivalent not identical" set as the bar up front |
| Spanish copy/locale regressions | L | all user-visible strings originate in core; fixtures encode exact bytes |
| Interno mobile clients break against Rust host | M | they speak the frozen protocol; conformance matrix includes an SSE mobile-profile scenario; keep-alive timings copied from Express config |
| docx output rejected by Word despite XML diff passing | L | open-in-Word smoke (manual per release during P3) + xmllint validation of OOXML schemas in CI |

---

## Part IX — Immediate next actions

1. Phase 0 spike: `core/` workspace; port `labs-bh-extended` behind napi flag;
   SwiftUI + WinUI 1-screen hosts; WinUI form/list probe.
2. `scripts/export-golden-fixtures.mjs` against the labs test suite, seeded from
   `capture-procesar-labs-goldens.mjs`.
3. Remove `python-runtime/` from repo + packaging after a final reference grep.
4. Draft `docs/contracts/lan-protocol.md` and `docs/contracts/storage-format.md`
   from the JS implementations while they are authoritative.
5. Read the exact SQLCipher/argon2/blob-crypto parameters out of
   `lib/db/{db-manager,crypto,clinical-crypto}.mjs` into the storage contract —
   this is the single highest-risk unknown and costs one afternoon to retire.

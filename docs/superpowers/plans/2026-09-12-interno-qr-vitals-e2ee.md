# Bring back Interno QR vital-signs sync (E2EE-compatible)

## Context

Interno let hospital interns scan a QR code to see their sala's patient board on
their phone and submit vital signs from there. It was disabled server-side
(`cloud/sync-worker/src/interno/routes.js` returns 503 for `/board` and
`/vitals`) when Nube shipped client-side E2EE (8.2.8), because the old design
built the board and applied vitals **server-side**, reading `clinicalOps`
(team/guardia assignment) and `monitoreo` (vitals) — both of which are now
ciphertext the Worker cannot read. This was a deliberate, documented stopgap
(`docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md` Stage 0 items 3-4;
`docs/core/15-security.md`), with the fix already decided as "redesign to do
the lookup on-device instead of server-side" — not done yet.

Goal: re-enable Interno without ever giving the Worker (or anyone who
compromises it) the ability to read vitals or team-assignment data — matching
the same client-E2EE bar the rest of Nube already meets.

Two design calls the user already made:
- The phone gets a **narrow key**, not the full room key: a subkey derived
  from the room DEK, scoped to only vitals + team data. A leaked/stolen
  Interno QR then exposes vitals and team assignment only — never notes,
  labs, or the rest of the chart.
- The phone can enter vitals for **any patient in the sala's room** (checked
  by the Worker in plaintext — patient id exists in the room), not only
  patients formally handed off to the on-call intern (today's stricter
  check, which required reading now-encrypted team data). Slightly looser
  than today, but still bounded to one sala/room — not a new exposure
  category.

## Architecture

**Board and vitals-building move from the Worker to the phone.** The Worker
becomes a relay: it still gates access (sala token, unchanged) and does
identity/plaintext-field work it already does, but stops trying to decrypt or
interpret vitals/team-assignment content. The phone decrypts what it needs
with the narrow subkey and runs the *same* board-building and vitals-merge
code that used to run on the Worker — moved, not rewritten, since
`lib/interno/interno-board.mjs`, `lib/interno/interno-scope.mjs`,
`lib/entrega/entrega-pendientes.mjs`, `lib/entrega/entrega-vitals-plan.mjs`,
`lib/interno/vitals-banner.mjs`, and `lib/patient-bed-sort.mjs` are already
plain browser-safe JS with no Node dependency (confirmed by tracing every
import). None of these read `note`/`indicaciones`/`historiaClinica`/labs —
only `clinicalOps` and `monitoreo` — so the subkey's scope (those two fields
only) is sufficient.

```
Desktop (has room DEK)
  → derive Interno subkey = HKDF(roomDEK, "rplus-interno-v1")
  → QR = https://.../interno/<sala>?t=<sala-token>#k=<subkey>
                                      ^^^^^^^^^^^^^^ sent to Worker
                                                       ^^^^^^^^^ URL fragment,
                                                       never sent over HTTP

Phone scans QR
  → GET /board  → Worker relays: plaintext identity fields (unchanged) +
                   raw ciphertext envelopes for clinicalOps and each
                   patient's monitoreo (Worker never decrypts)
  → phone decrypts clinicalOps + monitoreo with the subkey (crypto.mjs's
     decryptValue, already exists)
  → phone runs buildInternoScopeFromClinicalOps / resolveInternoBoardPatients /
     buildInternoBoardDto locally (same functions, moved from Worker to phone)
  → phone renders board (interno-app.mjs UI logic is unchanged)

Phone submits vitals
  → decrypts current monitoreo, applies medición via buildInternoMedicion /
     applyInternoMedicionToPatient (same functions, moved), re-encrypts the
     new monitoreo value with the subkey
  → POST /vitals with the ciphertext envelope (not raw numbers)
  → Worker applies it as an opaque LWW replace — cloud/sync-worker/src/lww.js
     already does this for any enc:1 monitoreo value (setMonitoreoField,
     confirmed at lww.js:156-172), so no Worker crypto-handling code is new
```

Dropped from the vitals-submit flow: the old `touchGuardiaVitalsCheck` bump
of `clinicalOps.active_guardias[].last_vitals_check` (Worker can no longer
touch encrypted `clinicalOps`, and that field turns out to already be dead —
`touchActiveGuardiaVitalsCheck`, the desktop-side equivalent, has zero
callers today). Interno's own overdue/due-soon calc in
`lib/interno/interno-board.mjs` should read the latest
`monitoreo.historial[].recordedAt` instead — a working replacement for
something that was already non-functional, not a regression.

## Files to change

**Cloud Worker** (`cloud/sync-worker/src/interno/`)
- `routes.js` — remove the disabled-503 block, re-wire real handlers.
- `board.js` — replace `readInternoBoard`'s DTO-building with a thin relay
  (patient entries as-is, `clinicalOps` envelope as-is). Simplify
  `assertInternoPatientOnBoard`/`boardIncludesPatient` to a plaintext check:
  patient id exists in the room's entries (per the user's chosen looser
  scope) instead of "is on the decrypted board."
- `vitals.js` — accept an already-encrypted `monitoreo` envelope in the
  request body instead of building one from raw numbers; drop the
  `clinicalOps` mutation branch entirely.
- `vitals-medicion.js` — delete; it's a near-duplicate of
  `lib/interno/interno-vitals.mjs`, which the phone will import directly.

**Shared lib**
- `lib/interno/interno-vitals.mjs` — drop the unused `import crypto from
  'node:crypto'` (line 1); `crypto.randomUUID()` already resolves off the
  global in both Node and browsers, so this was blocking phone reuse for no
  reason.

**Phone PWA** (`cloud/sync-pages/public/interno/interno-app.mjs`)
- Read the subkey from `location.hash` (`#k=...`) alongside the existing
  `?t=` token read.
- Import `lib/interno/interno-board.mjs`, `interno-scope.mjs`,
  `interno-vitals.mjs`, `lib/entrega/entrega-pendientes.mjs`,
  `entrega-vitals-plan.mjs`, `lib/patient-bed-sort.mjs`, and
  `public/js/features/cloud-sync/crypto.mjs` (`decryptValue`/`encryptValue`/
  `importDekRaw`/`isEncryptedEnvelope` — all already exist).
- Board render: decrypt `clinicalOps` + each patient's `monitoreo`, then call
  the moved board-assembly functions locally instead of trusting a
  server-built DTO.
- Vitals submit: decrypt current `monitoreo`, apply the medición locally,
  re-encrypt, send the envelope instead of raw numbers.

**Desktop** (new UI — none of this exists today; there's no current caller
of the sala-token IPC handlers `lib/db/ipc-handlers-register-interno.mjs`
exposes)
- `public/js/features/cloud-sync/crypto.mjs` — add `deriveInternoSubkey(dek)`
  using `crypto.subtle.deriveKey` with HKDF (native Web Crypto, no new
  dependency) and info string `"rplus-interno-v1"`.
- New small panel to generate/show the QR: reuse the existing
  `public/js/interno-qr-render.mjs` (canvas/SVG QR renderer, already built,
  currently only used by the unrelated iPad-invite flow) and the existing
  IPC calls (`db:interno-access-list/-rotate/-set-active`, gated by
  `canManageInternoQr`) to build the `?t=<token>#k=<subkey>` URL. If the room
  has no cached DEK yet (owner hasn't logged in on the new build since
  E2EE shipped), show "esperando a que el dueño de la sala conecte" rather
  than trying to force key creation — `ensureRoomDek` is owner-only and 403s
  for anyone else, so don't call it from this panel.
- Wire an entry point for this panel (likely near the guardia board's admin
  controls — follow the pattern of the closest existing Nube admin panel,
  e.g. `panel-mobile-invite.mjs`'s own settings entry, for where to hang the
  menu item).

## Suggested build order (mirrors the E2EE deploy plan's own staging)

1. Worker: `board.js`/`vitals.js`/`routes.js` rewrite + `lww.js` already
   covers the apply path — test with a hand-built ciphertext envelope before
   any phone code exists.
2. Phone: `interno-app.mjs` decrypt/assemble/submit logic, tested against the
   Stage-1 Worker with a manually-crafted `#k=` fragment.
3. Desktop: subkey derivation + QR panel, wiring the two together end to end.

## Verification

- `npm run test:one` on the touched `cloud/sync-worker/src/interno/*.test.js`
  and any new/updated colocated tests for `interno-app.mjs` and
  `crypto.mjs`'s new `deriveInternoSubkey`.
- Manual end-to-end: create a test sala, generate the QR from the desktop
  build, scan it (or paste the URL) on a phone/second browser, confirm the
  board renders only from decrypted data, submit a vitals entry, confirm it
  shows up on the desktop guardia board after a Nube pull, and confirm a D1
  query on the room shows the pushed `monitoreo` value as `{"enc":1,...}`
  ciphertext, not plaintext numbers.
- Confirm an old/stale QR (previous subkey, before a hypothetical future
  re-derivation) fails to decrypt cleanly rather than silently showing
  garbage as real data — decrypt errors should show a clear reconnect
  prompt, not a blank or wrong board.

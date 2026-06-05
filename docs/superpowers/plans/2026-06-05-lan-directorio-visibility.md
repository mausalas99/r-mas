# LAN Directorio Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Follow TDD: write the failing test, confirm it fails, implement, confirm it passes.

**Goal:** Restore LAN directorio visibility so every Mac sees every other registered @usuario in guardia / censo / entregas. Fix the host-side roster wipe, add push diagnostics, and (gated on evidence) make LAN-mode clients actually connect and push.

**Spec:** [`docs/superpowers/specs/2026-06-05-lan-directorio-visibility-design.md`](../specs/2026-06-05-lan-directorio-visibility-design.md)

**Tech Stack:** Node `node:test`; Express LAN host (`lan-squad/`, CommonJS); renderer ESM (`public/js/**/*.mjs`) bundled via `npm run build:ui`; Electron IPC. CommonJS host files need **no** bundle rebuild; renderer changes do.

**Key constraint:** The **team code is a security boundary** — no auto-join without the team code (invite link or being host). Do not weaken this.

---

## Phasing

- **Phase 1 (no decision needed):** Tasks 1–3 — host wipe fix, diagnostics, optional client defense. Tasks 1–2 already implemented on `main`.
- **Phase 2 (evidence-gated):** Task 0 selects exactly one of Tasks 4 / 5 / 6 based on the observed client `push.code`. Do **not** implement all three blindly.

## File map

| File | Action | Task |
|------|--------|------|
| `lan-squad/bundle-merge.js` | Modify — preserve roster on null `clinicalOps` | 1 (done) |
| `lan-squad/host-store.js` | Modify — same in `putRoomClinicalOps` | 1 (done) |
| `lan-squad/host-store-clinical-ops-db.test.js` | Add — locked-host no-wipe test | 1 (done) |
| `lan-squad/bundle-merge.test.js` | Modify — null/absent `clinicalOps` preserves server | 1 |
| `public/js/features/lan/push.mjs` | Modify — trace all push skip codes | 2 (done) |
| `public/js/features/lan-sync-clinical-ops.test.mjs` | Modify — assert skip-code traces | 2 |
| `public/js/host-bundle-bases.mjs` | Modify — omit null `clinicalOps` key | 3 |
| `public/js/features/clinical-onboarding.mjs` | Modify — honest connect messaging | 4 |
| `public/js/clinical-profile-lan-sync.mjs` | Modify — connect CTA / guarded auto-join | 4 / 5 |
| `public/js/features/clinical-rotation-entry.mjs` | Modify — persistent connect CTA | 4 |
| `public/js/features/lan/room.mjs` | Modify — guarded auto-join resolved sala | 5 |
| `lan-squad/host-store.js` + host onboarding gate | Modify — locked-host policy | 6 |
| `package.json` | Modify — register new tests | as needed |
| `.cursor/rules/project-context.mdc` | Modify — changelog on commit | final |

---

### Task 0: Confirm the dominant client gate (REQUIRED before Phase 2)

**No code.** Collect `clinicalOpsTrace` from a **client** Mac that selected LAN mode (status JSON now includes skip-code `push` entries after Task 2).

- [ ] **Step 1:** Read the latest `push` entry's `code` on ≥1 client.
- [ ] **Step 2:** Map to the fix and proceed with exactly that task:

| `push.code` | Implement |
|---|---|
| `NO_LAN` | Task 4 |
| `NO_ROOM` | Task 5 |
| `NO_SNAPSHOT` | Task 6 |
| `NO_CLINICAL_OPS` | environment/install issue — stop, report |
| no `push` entry | join flow not running — separate investigation, stop |

---

### Task 1: Host never wipes roster on null clinicalOps — **DONE**

**Files:** `lan-squad/bundle-merge.js`, `lan-squad/host-store.js`, `lan-squad/host-store-clinical-ops-db.test.js`

- [x] **Step 1:** Add failing test "sync-bundle push with empty clinicalOps must not wipe host roster (locked DB host)" — locked DB mock, two peers PUT distinct rosters, then a sync-bundle PUT with `clinicalOps: null`; assert both users survive a subsequent `getRoomSyncBundle`.
- [x] **Step 2:** Run — confirmed FAIL ("doctor_a must survive…").
- [x] **Step 3:** Fix `mergeBundlePut` (`bundle-merge.js`) and `putRoomClinicalOps` (`host-store.js`): assign `bundle.clinicalOps` only when an incoming roster object is present; union via `mergeClinicalOpsSnapshotsData(serverOps, incomingOps)` when both exist; otherwise leave server roster untouched.
- [x] **Step 4:** Run — PASS; `bundle-merge.test.js` (6) and `host-router.test.js` (14) green.
- [ ] **Step 5 (remaining):** Add an explicit `bundle-merge.test.js` case asserting `clinicalOps: null` **and** absent `clinicalOps` both preserve `serverOps` (lock the contract independently of the store).

### Task 2: Trace every push skip code — **DONE (renderer; verify test)**

**Files:** `public/js/features/lan/push.mjs`, `public/js/features/lan-sync-clinical-ops.test.mjs`

- [x] **Step 1:** In `pushClinicalOpsLanNowBody`, record a `push` trace with `code` for `NO_CLINICAL_OPS`, `NO_SNAPSHOT`, `NO_LAN`, `NO_ROOM` (success/`CONFLICT_RESOLVED`/`QUEUED` already traced). Include `usersExported` where a snapshot exists.
- [x] **Step 2:** `npm run build:ui` (renderer change).
- [ ] **Step 3 (remaining):** Add a source-contract assertion in `lan-sync-clinical-ops.test.mjs` that each early-return path calls `recordClinicalOpsTrace('push', …)` with the matching code (string-match on source, consistent with existing tests in that file).
- [x] **Step 4:** LAN suites green (47 tests).

### Task 3: Client defense — omit null `clinicalOps` from bundle body (optional)

**Files:** `public/js/host-bundle-bases.mjs`

- [ ] **Step 1:** Failing/source test: `hostBundlePutBodyFromEnvelope` output omits the `clinicalOps` key when the envelope has no snapshot (so `'clinicalOps' in body === false`).
- [ ] **Step 2:** Implement — only set `clinicalOps` when `envelope.clinicalOps` is a non-null object.
- [ ] **Step 3:** Verify `buildBaseEntityVersionsForEnvelope` / `collectKeysFromEnvelope` unaffected (they already skip non-object clinicalOps).
- [ ] **Step 4:** `npm run build:ui`; re-run LAN suites.

> Redundant with Task 1 but removes needless revision churn. Low priority; safe.

---

## Phase 2 — exactly one of the following, per Task 0

### Task 4: Honest connect UX for `NO_LAN` (spec §6.A)

**Files:** `public/js/features/clinical-onboarding.mjs`, `public/js/clinical-profile-lan-sync.mjs`, `public/js/features/clinical-rotation-entry.mjs`

- [ ] **Step 1 (test):** In onboarding tests, assert that when LAN mode is active (`clinicalLocalOnly === false`) and `flushClinicalProfileToLan` returns `NO_LAN`/`NO_ROOM`, the registration handler does **not** emit the plain "Perfil guardado" success and instead emits the connect-needed message.
- [ ] **Step 2:** Add `LAN_PROFILE_NEEDS_CONNECT_MSG` to `clinical-profile-lan-sync.mjs` (Spanish: "Perfil guardado en esta Mac. Para aparecer en la guardia, conéctate a la sala del equipo: pega el enlace de invitación o escanea el anfitrión.").
- [ ] **Step 3:** In `clinical-onboarding.mjs#handleRegistrationSubmit`, branch: if not local-only and push code ∈ {`NO_LAN`,`NO_ROOM`}, show the connect message (info/warning, not success) and keep onboarding visible.
- [ ] **Step 4:** In `clinical-rotation-entry.mjs`, render a persistent CTA ("Conéctate a la sala") that opens the ⇄ connect panel when LAN mode is on but `isLanSessionConfiguredForRest()` is false.
- [ ] **Step 5:** `npm run build:ui`; run onboarding + LAN suites.
- [ ] **Step 6 (manual):** 2-Mac check — client follows the CTA, pastes invite, joins → host `get` shows `incomingUsers ≥ 2`.

### Task 5: Guarded auto-join resolved sala for `NO_ROOM` (spec §6.B)

**Files:** `public/js/clinical-profile-lan-sync.mjs`, `public/js/features/lan/room.mjs`

- [ ] **Step 1 (test):** Assert that when configured for REST, no membership, and a resolvable sala, registration triggers a single `joinLanRoom`, guarded by the existing `rpc-lan-auto-join-confirmed-*` session flag (no wrong-sala loop).
- [ ] **Step 2:** In `flushClinicalProfileToLan`, when `ensureEffectiveLiveSyncRoomId()` is empty but `resolveRoomIdForUsernameRegister` yields a sala and REST is configured, remember membership and call `joinLanRoom(resolved)` once (respecting the confirm flag).
- [ ] **Step 3:** Ensure `syncLiveSyncAfterRoomJoin` fires the existing push.
- [ ] **Step 4:** `npm run build:ui`; run LAN suites.
- [ ] **Step 5 (manual):** 2-Mac check.

### Task 6: Locked-host policy for `NO_SNAPSHOT` (spec §6.C)

**Files:** `lan-squad/host-store.js`, host onboarding gate

- [ ] **Step 1 (decision):** Choose (i) require host clinical DB **unlocked** before it serves clinicalOps, or (ii) allow locked-host serving and rely on Task 1's in-memory persistence. Record the decision in the spec §6.C.
- [ ] **Step 2 (test):** Encode the chosen policy (e.g., a locked host returns its persisted in-memory roster across bundle churn — already covered by Task 1 — and/or onboarding blocks LAN hosting until unlock).
- [ ] **Step 3:** Implement the gate/messaging.
- [ ] **Step 4:** Run host + onboarding suites.

---

## Verification (before claiming done)

- [ ] `node --test lan-squad/host-store-clinical-ops-db.test.js lan-squad/bundle-merge.test.js lan-squad/host-router.test.js` (host).
- [ ] `node --test public/js/features/lan-sync-clinical-ops.test.mjs public/js/lan-sync-bundle-push.test.mjs public/js/lan-sync-diagnostics.test.mjs` (renderer LAN).
- [ ] `npm run build:ui` clean for any renderer change.
- [ ] `npm run metrics` (if wired) — `totalScore` not increased vs `scripts/metrics/baseline.json`.
- [ ] Acceptance criteria §7 of the spec met, including the 2-Mac round trip (criterion 2).

## Changelog (on commit)

Prepend to `.cursor/rules/project-context.mdc`:

```markdown
- **2026-06-05** `lan-directorio-visibility`: host no longer wipes roster on null sync-bundle clinicalOps; push skip-codes traced; LAN-mode clients get connect CTA / guarded auto-join; `lan-squad/bundle-merge.js`, `host-store.js`, `features/lan/push.mjs`.
```

## Open items

- Task 0 evidence selects Task 4 vs 5 vs 6.
- Whether to keep already-applied Task 1/2 changes or revert to a clean tree pending review (per user direction).
- Task 6 host-policy decision (i vs ii).

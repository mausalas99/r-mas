---
type: "core"
name: "Claude Code Handoff"
status: "done"
description: "Tendencias table-hide checkboxes fixed (2026-08-29) — real cause was full localStorage, not the UI. See top section. Older job below: update-feed Worker (GitHub first, GitLab fallback), done."
---

# Handoff — Tendencias hide checkboxes silently doing nothing (localStorage full) — DONE, one manual step left per install

**Date:** 2026-08-29
**From:** Claude Code (Sonnet)
**To:** next session
**Branch:** `main`, uncommitted changes present (see `git status`)

## What was wrong

In the Tendencias group table modal (Biometría hemática etc.), the checkboxes that hide a column or row did nothing when clicked — no error, no visual change, nothing saved.

Real cause: `pushUndoSnapshot` (`public/js/features/productivity.mjs`) deep-copies the entire clinical state — every patient, note, indicación, lab history entry, med receta, med catalog — into `localStorage` under `rpc-undo-stack` on every undo-able action, capped only by count (5 snapshots), never by size. On the owner's real install that key alone had grown to 44 MB, blowing past the browser's per-origin `localStorage` quota. Every `localStorage.setItem` after that point failed with `QuotaExceededError`, and every call site wrapped that write in an empty `try { } catch { }` — so the failure was completely silent, for what was likely months, until the owner happened to need a feature (hiding a table column) that depended on one of those writes.

Two wrong theories were tried and reported as fixed before this was found — see `PLAN.md`'s `## decisions` (2026-08-29, claude) and `MISTAKES.md`'s two 2026-08-29 entries for the full trail. Do not repeat: (1) telling the owner to restart the app for a "click does nothing" bug without checking the DOM/console first, (2) presenting a code-reading-only theory as a confirmed fix before the owner verifies it live.

## What's fixed in code (done, committed to working tree, not yet git-committed)

- `public/js/features/productivity.mjs` — `saveUndoStack` (now exported) shrinks the stack (drops oldest snapshots, then clears the key) instead of failing when `localStorage.setItem` throws, and logs a `console.warn` every time it has to. New test: `public/js/features/productivity-undo-quota.test.mjs`, registered in `package.json`.
- `public/js/tend-prefs.mjs` — `writeJson`'s catch now logs instead of swallowing.
- `public/styles/workbench-kit.css` — `.wb-scrim` now has `pointer-events: none` when closed (`--open` re-enables it). This was the first (wrong) theory's fix; kept because it's a real, harmless hardening of a full-viewport overlay, not because it was the actual bug.
- `scripts/verify/tend-group-table-hide.mjs` and `tend-group-table-hide-narrow.mjs` — were silently useless: both used `element.click()` / `elementFromPoint(...).click()`, a JS-level dispatch that bypasses real hit-testing and pointer-events, so they always "passed" even while the real click path was broken. Now use `page.mouse.click(x, y)`, a real pointer event. Any future "does a click work" verify script must do the same.
- `npm run build:ui` has been run after every source change above — the built app already has the fix.

## What's NOT done — one thing needed from the owner, one optional follow-up

1. **The owner must run one command once per affected install** to clear the existing 44 MB of bloat (the code fix prevents it from recurring, but doesn't retroactively shrink what's already stored): open DevTools (⌥⌘I), Console tab, run:
   ```js
   localStorage.removeItem('rpc-undo-stack')
   ```
   Confirm with the owner this was done and the checkboxes now work before considering this closed.
2. **Not done, optional, out of scope for this fix:** ~115 other `localStorage.setItem` call sites in this repo were not audited for the same empty-`catch`-swallows-the-error pattern. Any one of them could be silently failing the same way right now. A future session could grep `localStorage.setItem` across `public/js` and check each call site's error handling. Not started — do not assume it's been checked.

## Verify before trusting this section

Do not re-litigate the root cause without checking current code first — `saveUndoStack`/`writeJson` as described above, and the two verify scripts, are the ground truth. If this section and the code ever disagree, trust the code (see `MISTAKES.md`'s doc-drift entries for why).

---

# Handoff — update feed (GitHub lock) — DONE

Worker, `lib/update-feed.mjs`/`.js`, `main.js` wiring, and worker-first `min-version`/`stable-versions` fetchers were already built and committed in `b895b96f` ("chore(release): prepare 8.1.4"), before this session started. 32/32 related tests pass (`npm run test:one -- cloud/update-worker/src/feed.test.mjs cloud/update-worker/src/index.test.mjs lib/update-feed.test.mjs public/js/min-version-fetch.test.mjs public/js/stable-downgrade-ui.test.mjs main-update-feed.test.mjs`). See spec acceptance checklist for details.

**Date:** 2026-08-15  
**From:** Cursor (Grok 4.6)  
**To:** Claude Code  
**Branch:** `main` (local 8.1.4; `origin/main` may match)  
**Worktree:** `/Users/mauriciosalas/R+`

---

## Start Claude Code

```bash
cd /Users/mauriciosalas/R+
claude --model sonnet --effort medium
```

First prompt (paste once):

```
Read CLAUDE.md and docs/core/20-claude-code-handoff.md only.
Then read docs/superpowers/specs/2026-08-15-update-feed-worker-design.md.
Do not read the docs hub or project-context yet.
UI bugs, Nube crypto, and graph-memory tests are closed. Do not reopen them.
Task: implement the update-feed Worker + UPDATE_FEED_MODE per the spec.
GitHub first. GitLab fallback. Easy revert = upload to GitHub; do not drop the Worker.
Do not change the baked-in feed inside the already-built 8.1.4 dist.
Do not create a second GitHub account.
```

Plan a hard task: new session `claude --agent ceo-fable --effort high` (or `/model fable` then `/plan`). Then `/clear` and execute on Sonnet.

---

## Active plans

| Plan | Path |
|------|------|
| **Update feed Worker (this job)** | `docs/superpowers/specs/2026-08-15-update-feed-worker-design.md` |
| Biometric unlock (Touch ID + Windows Hello) | `docs/superpowers/plans/2026-08-25-biometric-unlock.md` — **built 2026-08-25, then reverted same day by user request.** Touch ID worked on Mac, but local testing surfaced that the dev DB was never passphrase-encrypted (no onboarding entry point in Settings to turn encryption on after first run — separate gap, not fixed). Windows Hello was never shippable (only known wrapper is abandoned since 2019). User decided to drop the feature rather than chase the encryption-setup gap first. All Touch ID code surgically removed 2026-08-25 (main.js, ipc-handlers*.mjs, preload.js, db-unlock-*.mjs, root.html, tests) — 35/35 tests pass, `build:ui` clean. Do not restart this without first deciding how users turn on local DB encryption post-onboarding. |
| Interconsulta team board redesign | `docs/superpowers/plans/2026-08-25-interconsulta-team-board.md` — **approved 2026-08-25, not started.** Replaces the interconsulta sidebar (Fijados/Nuevas/En seguimiento/Archivados) with a 4-team board (guardia/postguardia/activo×2), Preop-Nuevas-hoy/Pendientes/Under buckets per lane, manual "Terminar guardia y repartir pacientes" rollover. IC-mode only, does not touch sala. |
| Interconsulta board demo, seeded on the main app | `docs/superpowers/plans/2026-08-25-interconsulta-demo-on-main-app.md` — **done 2026-08-25.** Built `public/js/features/interconsulta-demo-toggle.mjs`: ⌥⌘⇧I (`window.toggleInterconsultaDemo`) merges 12 demo patients + 4 demo teams into the real `getPatients()`/`clinicalSessionContext` (never replaces), hidden from local persistence via the existing `setPersistPatientsResolver` isDemo filter. Closed the cloud-sync gap flagged in the plan doc: added `getSyncablePatients()` to `app-state.mjs` and swapped every `getPatients()` read in `public/js/features/cloud-sync/*.mjs` to it, so demo patients never reach a push or pull match. Deleted the old verify-script-only files (`tour-ic-demo-seed.mjs`, `scripts/verify/interconsulta-demo-seed.mjs`) — superseded. Tests added: `public/js/features/interconsulta-demo-toggle.test.mjs`. |
| Boot speed and debt (teal shell) | `docs/superpowers/plans/2026-08-22-boot-speed-debt.md` + `docs/superpowers/plans/2026-08-23-boot-debt-phase2-phase3a.md` — **Phase 1 (08-22), Phase 2 (08-23), Phase 3 Stage A (08-23) all done.** Phase 2 fixed the `score.mjs` scanner bug; `metrics:check` totalScore 400 → 304 (both fixes now committed on main: `97b6ed8d`, `0a51977c`). Phase 3 Stage A (metafile graph analysis, no code changes): gate failed — 0 exclusive eager bytes would leave the bundle by cutting the 5 files' direct edges, because `profile-formats.mjs`/`profile-prefs.mjs` still import them directly. Stopped, as the gate specifies. **Stage B now planned** — see row below. |
| Boot debt Phase 3 Stage B (profile-chain decoupling) | `docs/superpowers/plans/2026-08-23-boot-debt-phase3-stage-b.md` — **Stage B.0 gate passed, Stage B.1 shipped 2026-08-23 (commit `10a24fa7`). Stage B.2 blocked, not attempted — user decided 2026-08-23: stop here, do not scope the app-tabs.mjs/expediente-navigation.mjs split.** B.1: the 4 profile/medications files now resolve tab-switch functions via the existing `globalThis` window-handler pattern instead of static imports — 12 new tests (medications-actions, profile-app-mode, profile-formats, profile-prefs, resolve-global-fn), all passing (this row said 18 until corrected 2026-08-25). **B.2 (as scoped) cannot deliver any savings**: `app-tabs.mjs`/`expediente-navigation.mjs` must stay eager+synchronous (they hold the two calls that paint frame one) and they themselves import `app-tabs-runtime.mjs`/`expediente-inner-cache.mjs` internally — so making `app.js`/`app-runtimes.mjs`'s own edges lazy changes nothing. The only way to actually shrink the bundle now is splitting `app-tabs.mjs`/`expediente-navigation.mjs` internals (small eager core + deferred rest) — a materially bigger, riskier change to the code driving every tab switch, not attempted, needs explicit sign-off before starting. `bootGraphDebt = 200` stays accepted debt. Also scopes Step 9 (tab-level code split) as a distinct future follow-on, not started. |
| Shard room_state.labSidecars (D1 2MB row cap fix) | `docs/superpowers/plans/2026-08-21-shard-room-state-labs.md` — **built + tested 2026-08-21.** Fixes real prod `D1_ERROR: string or blob too big: SQLITE_TOOBIG`. Yesterday's payload-cap raise (`a488d032`) fixed app-level rejection but not D1's own 2MB hard row cap — room_state stored the whole room as one blob. New `room_state_labs` table (`schema/008-shard-room-state-labs.sql`) shards `labSidecars` one row per patient; core `room_state` row keeps everything else. Read shape unchanged for every consumer (client included) — `sync.js loadRoomState()` reassembles transparently, legacy rooms self-migrate on next write. `interno/room-resolve.js` and `pase-labs.js` deduped onto the same reader instead of hand-rolling their own SQL. New per-shard hard cap `QUOTAS.labShardMaxBytes` (1.9MB) turns any future overflow into a clean `payload_too_large` instead of a raw D1 crash. 77/77 sync-worker tests pass (`npm run test:one -- cloud/sync-worker/src/sync-room-state-shard.test.mjs cloud/sync-worker/src/mutation-guard.test.mjs cloud/sync-worker/src/crypto-at-rest.test.js cloud/sync-worker/src/admin.test.js cloud/sync-worker/src/interno/routes.test.js cloud/sync-worker/src/pase-labs.test.js cloud/sync-worker/src/rooms.test.js cloud/sync-worker/src/lww.test.js cloud/sync-worker/src/mobile-lab-window.test.js`). Not yet deployed — needs `npm run db:migrate:remote` inside `cloud/sync-worker` before the code ships (local migrate hit a pre-existing, unrelated stale `.wrangler` local-D1 cache — verified migration 008 applies cleanly standalone via `sqlite3`). |
| Mixed-expediente lab guard (patient safety) | `docs/superpowers/plans/2026-08-20-mixed-expediente-lab-guard.md` — **built + tested 2026-08-20.** Lab paste with 2+ distinct expediente bases in one block now blocks entirely (`canProcess:false`, nothing saved), shows a Spanish toast naming both expedientes, keeps raw text in `#lab-input`. Covers main paste (`lab-panel-parse.mjs`), paste-anywhere (`paste-smart-model.mjs`/`paste-smart.mjs`), and repo-import/stub-admit (inherit via `canProcess`/status gates, unchanged). Same-patient variants (`1087426` vs `1087426-2`) still pass via base-registro normalization. Follow-on same day: "Actualizar labs" (`lab-repo-batch-import.mjs`/`lab-repo-import.mjs`) now passes `{ replaceOnMatch: true }` through `finalizeBulkLabPaste` → `storeBulkLabBlocks` → `upsertLabHistory`, so a re-fetched set at the exact same fecha+hora fully replaces the stored set instead of merging/accumulating rows — closes the dedup gap and means a correction actually corrects instead of appending. Scoped strictly to `matchKind:'datetime'` (exact-time match); complementary same-day merges (Biometría + Química arriving at different times, same study) are untouched. Normal manual paste keeps the old merge behavior (no `opts` passed). `npm run metrics:check` fails but pre-existing (374→384 before this session's changes even; whole-repo debt, not from this fix). |
| Nube client-encryption compliance review | `docs/superpowers/plans/2026-08-14-nube-client-encryption-compliance.md` |
| Nube E2EE implementation | `docs/superpowers/plans/2026-08-17-nube-e2ee.md` — **built + tested 2026-08-17, by explicit user request overriding the "do not start" below. NOT DEPLOYED.** Content fields (notes/labs/indicaciones/monitoreo/clinicalOps) encrypt client-side; patient identity (name/bed/service) stays plaintext — Interno redesign deferred. Password iteration versioning (schema/007) also built, not deployed. See `docs/core/15-security.md` "Deploy status". Before deploying: resolve the personal-Cloudflare-account + no-DPA gaps in the compliance review above, and re-verify PBKDF2 iteration values against a real D1 migration — the 2026-08-14 incident that broke Nube login for two days was exactly this kind of change. |
| Nube E2EE — existing-room backfill | `docs/superpowers/plans/2026-08-17-nube-e2ee-existing-room-backfill.md` — **implemented, confirmed in code 2026-08-25** (this row was stale — said "not yet implemented" while `room-dek-migrate.mjs: sweepRoomForPlaintextContent` already shipped it). Closes the gap where the above only encrypts NEW rooms. Owner's device auto-generates + backfills the DEK and re-encrypts already-stored plaintext content on next login, one entity (patient/lab/todo) at a time so one oversized row can't block the rest. Still gated behind `NUBE_E2EE_ENABLED = false` in `room-dek.mjs` along with the rest of Stage 0 — see the deploy-plan row below. |
| Nube E2EE — deploy plan | `docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md` — **planned 2026-08-23, not started.** Three-stage rollout (Worker deploy → canary room → cohort app update) to move the built-and-tested client E2EE from repo to production without repeating the 2026-08-14 login outage. Confirmed same day: production `room_state` is already whole-row encrypted via shared `WORKER_DATA_KEY` (not client E2EE — Cloudflare still holds the key). Go/no-go checklist and rollback steps inside; see also `docs/core/15-security.md` "Deploy status" (corrected same day — it previously said prod was plaintext). **2026-08-24 update:** 8.2.0 switched the room key from password-derived to room-code-derived (see release commits), and the Worker now rejects any pre-8.2.0 client at login/register *and* on every `/rooms` request (`auth-util.js` `assertNubeAppVersion`, `routes.js`) — the old-vs-new key-mismatch risk this plan flagged is closed. Stage 0 items 2–4, 6–7 confirmed done in code; item 1 (per-member password wrap) was superseded by the room-code design, not built as originally specced. Stage A itself (local `wrangler dev` rehearsal) has **not** been run yet — handoff for that is `docs/superpowers/plans/2026-08-24-stage-a-local-rehearsal-handoff.md`. |
| Nube E2EE blind-relay spec | `docs/nube-e2ee-blind-relay-spec.md` — **draft, not built, not adopted.** Bigger alternative redesign (server never sees any metadata, merge moves client-side). Explicitly shelved in favor of the two rows above — do not implement unless the user revisits this decision. |
| Startup lag optimization | `docs/superpowers/plans/2026-08-15-startup-lag-optimization.md` — **Steps 0-8 shipped** (verified 2026-08-23: `bootMark()` instrumentation, non-blocking DB unlock, eager-bundle budget guard all present in `main.js`/`app-boot-imports.test.mjs`). Step 9 (tab split) folded into the 2026-08-23 boot-debt doc above — **do not start Step 9 from this doc**, read the row above instead. |
| Teal workbench UI redesign | `docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md` — **phase 1 shipped 2026-08-17, pendientes vencido + empty-state follow-up also shipped 2026-08-17.** New design handoff replaces Hybrid H / Warm instrument as source of truth (teal accent, not ink). Tokens + fonts + animations + docs done. Pilot screen (`patient-dashboard/`) now has: vencido (overdue) row styling on the Pendientes card, and a dashed-border box style for the shared empty-state copy. Counters band is confirmed out of scope for this screen (it's a Guardia/Pase pattern) — moved to roadmap items 2/3. Superseded for all remaining scope by the row below. |
| Teal workbench — full rollout to 8.1.6 | `docs/superpowers/plans/2026-08-19-teal-workbench-full-rollout.md` — **superseded by events, corrected 2026-08-25.** This row said "not yet executed, blocks 8.1.6 ship" and cited ~152 uncommitted files — both stale: `git tag` shows v8.1.6 through v8.2.1 have all shipped, and `git status` now shows 49 modified/untracked files, none of them teal-workbench remediation (that work is committed — see the full-fidelity row below). Whatever remains open in this plan's 5 decisions (D1–D5) needs a fresh read against current code before treating it as still-blocking; do not assume the 2026-08-19 framing still applies. |
| Labs token cleanup | `docs/superpowers/plans/2026-08-17-labs-token-cleanup.md` — **shipped 2026-08-17; corrected 2026-08-25.** Dead hex fallbacks in `lab.css` cleaned up (done, no visual change). This row previously said trend arrows were "pushed back to a future plan" needing a design decision — that's stale: `public/js/features/lab-trend-arrows.mjs` exists, is wired into `lab-panel-output-helpers.mjs`, and has its own test file. Someone built it without updating this row; treat trend arrows as shipped, not pending. |
| Guardia census table | `docs/superpowers/plans/2026-08-17-guardia-census-table.md` — **shipped 2026-08-17.** Roadmap item 2 ("Guardia"). Card-chip census grid replaced with a Cama/Paciente/Alterados/Pendiente/Estado table (`guardia-census-table.mjs`), vencido/abierto/listo status, Signos + Pendientes counters wired to real census-wide data. Scoped down from the full 6-section mockup: Ingresos counter + 4 right-column panels (Signos recibidos, Pendientes vencidos, Ingresos, Eventualidades, Movimientos) need new data (admission-date schema field, movements tracking) — not built, own future plan. EN CURSO status dropped (no in-progress flag in the todo model). |
| Pilot screen — remove card boxes | `docs/superpowers/plans/2026-08-17-pilot-remove-card-boxes.md` — **shipped 2026-08-17.** Found by directly comparing the running app's dark Resumen screen against mockup `1b` (mockup wants no boxes, single-column reading layout for Signos vitales + Labs). CSS-only change in `patient-dashboard.css`: dropped the `.card` background/border-radius, stacked `.bento.vitals-labs` into one column. `.bento.rest` and `.bento.meds-band` already matched the mockup, untouched. Labs card's internal content shape (envio-grouped vs. mockup's fuera-de-rango/en-rango split) is a separate future plan, not part of this pass. |
| Teal workbench — full fidelity | `docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md` — **remediation done, committed (corrected 2026-08-25** — this row said "IN REMEDIATION" and pointed at a now-removed stale handoff section). The plan file's own REMEDIATION section has the real, current punch list — every item marked fixed/closed/dropped-by-user with its own verification. Read that file directly. |

---

## Teal workbench full-fidelity remediation — resolved, superseded 2026-08-25

The two "SESSION HANDOFF — 2026-08-18" sections that used to live here (a mid-work snapshot: 152 uncommitted files, no punch list yet, DEMO PÉREZ fixture broken) are gone as of 2026-08-25 — verified stale against current code (see `MISTAKES.md`'s 2026-08-25 entry on doc drift). Current state: `git status` shows only 49 modified/untracked files, none of them this remediation — that work is committed. The plan file itself (`docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md`, REMEDIATION section) is accurate and kept current — it has a full punch list with each item marked FIXED/closed/dropped-by-user, each citing its own commit-day verification. Read that file directly for real status; do not rely on a duplicate summary here — that duplication is exactly what let this handoff doc go stale for a week. The `scripts/verify/screenshot.mjs` tool described in the old sections still exists and works the same way if a future screen needs the same kind of visual verification.

---

## What happened (do not re-investigate)

| When | Fact |
|------|------|
| 2026-08-14 morning | `v8.1.3` GitHub Release existed and was Latest |
| ~11h before lock | Failed login `189.175.111.234` Monterrey |
| ~9h before evening | GitHub staff: `user.suspend` → password randomized → revoke all OAuth (CLI, Cursor, Copilot, …) → `user.unsuspend` |
| Email | Standard “suspicious login / force password reset”. Mentions infostealer as a common cause. Not a ToS/malware-in-Releases letter |
| After lock | Releases page empty. **Tags remain** (`v8.1.4` … `v8.0.8`). Unauthenticated `github.com/mausalas99/r-mas` **404** (private or hidden) |
| This machine `gh` | Keyring token was dead; Mauricio re-authed and added SSH `SHA256:aYBWi+4xbr5okYzL0desqwOiBCoLFUqC2U1B417xsX0` |
| Local scan | No AMOS/Atomic persistence. No AV. Only old `curl\|sh` was June FCC installer. Not a proof of clean — Malwarebytes still recommended |
| Support | Ticket open (`djsalas99@gmail.com`). First reply was **intake template** (asked username/email again). Saturday unsuspend possible, not likely |
| GitLab | Public project under **rmas-group1** / slug **rmas**. Release **8.1.4** notes exist. Web UI cannot upload binaries — use `glab release upload` |

`scripts/release.js` does **not** delete other Releases. This machine’s `gh` could not have wiped them (token invalid). Staff lock + missing Release objects; tags are git and stayed.

---

## What still works locally

All 8.1.4 artifacts are in `/Users/mauriciosalas/R+/dist`. Upload **these** names (GitHub or GitLab):

- `R+-8.1.4-Mac-Apple-Silicon.dmg`
- `R+-8.1.4-Mac-Intel.dmg`
- `R+-8.1.4-Windows.exe`
- `R+-8.1.4-autoupdate-mac-arm64.zip` + `.blockmap`
- `R+-8.1.4-autoupdate-mac-x64.zip` + `.blockmap`
- `R+-8.1.4-x64.exe` + `.blockmap`
- `latest-mac.yml` (points at `autoupdate-mac-*` zips)
- `latest.yml`
- Notes: `GITHUB_RELEASE_NOTES_8.1.4.md`

Do **not** upload `R+-8.1.4-arm64.dmg`, `*-x64.dmg`, `*-arm64.zip`, `*-x64.zip`, or `*.dmg.blockmap`.

GitHub tag already exists: **`v8.1.4`**. Recreate the Release on that tag. Do not make a new tag.

---

## Constraints (hard)

1. **Old apps** (8.1.2 / 8.1.3 / 8.1.4 already installed) only check `mausalas99/r-mas`. GitLab and the Worker do not reach them until they install a new build **or** GitHub Releases are public again.
2. Do **not** open a second GitHub account.
3. Do **not** put the feed Worker on `cloud/sync-worker` (Nube / PHI rooms).
4. Do **not** proxy 140 MB zips through Cloudflare.
5. Do **not** put a GitHub PAT in the Worker.
6. Dual Electron providers: **no**. One generic URL → Worker. Worker fails over.
7. This weekend residents get the Silicon DMG **by hand**. Auto-update of old copies waits for GitHub.

---

## Implement (this session)

Spec is the contract: `docs/superpowers/specs/2026-08-15-update-feed-worker-design.md`.

1. `cloud/update-worker/` — probe GitHub then GitLab; rewrite yml URLs to absolute; `/health`.
2. `lib/update-feed.mjs` — `UPDATE_FEED_MODE = 'worker' | 'github'` and `UPDATE_WORKER_URL`. Default for **new** builds: `worker`.
3. Wire default `setFeedURL` in `main.js` from that module. Leave downgrade generic-on-GitHub until GitHub is back unless the spec’s optional step is cheap.
4. Point `min-version-fetch.mjs` and `STABLE_VERSIONS_RAW_URL` at the Worker first.
5. Tests via `npm run test:one`. Register new `*.test.mjs` in `package.json` `scripts.test`.
6. Do not run full `npm test`. Do not `build:ui` unless you edit `public/js`.
7. Do not publish. Do not `gh release`. Do not refresh metrics baseline.

**Revert path (document in code comment + README of the Worker):**

```
GitHub public again
  → upload v8.1.4 assets to existing tag
  → old apps update
  → Worker /health using=github
  → optional later: UPDATE_FEED_MODE=github
```

---

## CSS design consistency (2026-08-22 cosmetic pass)

New CSS must use tokens from `public/tokens.css` (`--radius-*`, spacing, color), not hardcoded hex/radius/spacing values. `scripts/spacing-ratchet.mjs`, wired into `npm run metrics:check`, counts hardcoded `padding`/`margin` px values in `public/styles/*.css` and fails the build if that count grows above baseline — it does not convert existing values, only blocks new debt. Icons remain a known deferred gap: 65+ hand-rolled inline SVGs with no shared icon library, not fixed in this pass — revisit only if a future feature needs new icons.

## Closed (do not reopen)

- Paciente Resumen pills, hide-sidebar, ⌘1/⌘E/⌘T, census Filtros
- Nube V1 crypto (plaintext D1 accepted)
- Graph-memory pipeline (landed 2026-08-14). Do not ingest PHI. Do not add it to the Electron app
- Mac App Store as a weekend ship
- Changing 8.1.4 dist feed

## Dirty / local (do not fold into this commit unless they are the feed work)

`min-version.json`, `scripts/write-release-yml.js`, `scripts/graph-memory/`, `.mcp.json.example` may be dirty. Only stage files you change for the Worker + feed module.

---

## Test plan

```bash
npm run test:one -- cloud/update-worker/src/feed.test.mjs
npm run test:one -- lib/update-feed.test.mjs
# plus any colocated test you add
```

Pass: GitHub 200 → yml uses GitHub absolute URLs. GitHub 404 + GitLab 200 → GitLab URLs. Both fail → 502. `UPDATE_FEED_MODE=github` does not call the Worker.

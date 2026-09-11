---
type: "core"
name: "Claude Code Handoff"
status: "active"
description: "codebase-reduction: committed and merged to main 2026-09-06 (verified). Older jobs below."
---

# Handoff — codebase reduction (2026-09-03) — DONE, committed and merged 2026-09-06

**CORRECTED 2026-09-06:** this section previously said "staged, no commit." Verified false — `chore/codebase-reduction` has 3 commits (`126e5c66`, `0beb9590`, `e541de1a`), clean working tree, and is already merged into `main` (45 commits back). Nothing left to commit here. See `MISTAKES.md` 2026-09-06 entry for why this went stale.

**From:** Cursor (this worktree pass) + Claude (overnight fold3 / test glob)  
**Path:** `/Users/mauriciosalas/R+/.worktrees/codebase-reduction`  
**Branch:** `chore/codebase-reduction` (from `4e537c37`), merged to `main`

Owner decisions (do not reopen):

- Keep **DEMO PÉREZ** (pitch/tour). Not a delete.
- **ABG extendida** = gasometría interp dialog only. AG/cAG stay. Still in tree, hidden.
- **No `:3738` / `server.js`.** LiveSync stays dead. R+ Móvil never used the Mac host. Interno/Equipos are Nube origin only.
- Paid Workers are live. Do not treat HTTP pull as a Free-tier lock.
- Username: **two copies + parity test**. Re-export or symlink of `lib/db/clinical-username.mjs` → eager files 112→113. Do not raise the boot file cap.

## What landed

| Slice | What |
|-------|------|
| Build output | gitignore `cloud/sync-pages/public`, `cloud/equipos-pages/public`, `public/index.html`. Workers `predeploy`/`predev` rebuild. |
| Dead code | Unused scripts, demos/mocks, conflict fossils, LAN retire runners. |
| Ratchets | File-length ratchet **gone**. Caps that only go down: tracked LOC, module count, eager boot. CI: `build-output-ignored`, `no-duplicate-files`, structure pinning. |
| LAN ward | Deleted `server.js`, `lib/interno/interno-router*`, `host-store-db*`, `lib/equipos/equipos-router*`, photo-purge. Unwired `main.js` / `preload.js`. Doc export is IPC. |
| Cutover | 7.9 wizard + `clinical-79-cutover` IPC gone. Onboarding = Nube register only. |
| Interno/Equipos leftover | `host-discovery` is page origin. No subnet probe, no Mac IP form. |
| Username | `public/js/clinical-username.mjs` is a real file (not a symlink). Parity in `clinical-username.test.mjs`. |
| Labs refs | Catalog reads `DEFAULT_*` from `labs.js`. Extras stay in `tendencias-constants.mjs`. |
| Docs | Living docs (README, `docs/core/00,01,02,08,15,16`, `docs/api`) no longer claim `:3738`. Code map is `docs/core/21-code-map.md`; `.cursor/rules/project-context.mdc` is a **symlink** to it. |
| Tests (Claude) | `npm test` uses **quoted globs** (Node 24 treats a bare dir as a file). Old 685-path manifest is gone. 14 tests the manifest never ran were fixed (export format, highlights, admitted-today local day). |
| Fold3 (Claude, partial) | Folded med-receta, lab-panel, tend-group, panel-admin, clinical-teams, tendencias. Claimed module count 1135→1112. |

Eager boot cap: **3,430,001 B / 112 files** (`public/js/app-boot-imports.test.mjs`). History: `scripts/metrics/eager-boot-changelog.md`.

## Not done / red — CORRECTED 2026-09-06: item 1 resolved (see top of section), items 2-4 not re-checked, verify against current code before trusting

1. ~~No commit. Owner must say commit.~~ Done — committed and merged to `main`.
2. **`{#shrink-fold3}` still `[~]`** — `estado-actual` (~88 files, cycles) and `lazy-feature-routes` not folded.
3. **`npm run metrics:check` LOC gate is red.** `baseline.json` has `trackedLoc: 334853`. Fold3 left measured ~335619. `baseline.json` is **not** a silent refresh — owner must approve, or pay the lines down. `moduleCount` baseline is 1305 (different count than the 1112 PLAN note).
4. Full `npm test` was not the daily loop. Use `npm run test:one -- path`. Quoted-glob `npm test` is for CI/release.

## Do not

- Raise `EAGER_BOOT_BUDGET_FILES` or `EAGER_BOOT_BUDGET_BYTES`.
- Point renderer files at `lib/db/clinical-username.mjs`.
- Sweep CSS by `lan-` prefix. Keep `.equipos-qr-compact-*`.
- Bring back `server.js` or LAN LiveSync.
- Mix this worktree with the main dirty tree.
- Claim Nube content fields are plaintext on the server. `NUBE_E2EE_ENABLED = true` since commit `1a6c146f` (2026-08-31, released 8.2.8) — content fields (notes/labs/indicaciones/monitoreo/clinicalOps) encrypt client-side for any user on 8.2.1+. Identity fields (name/bed/service) still stay readable on the server; that part is unchanged.

## Next

Already committed and merged — nothing to pick here. If fold3 leftover (`estado-actual` / `lazy-feature-routes`) still matters, scope it as a fresh task against current `main`, not against this stale worktree section.

Plan: `PLAN.md` `{#shrink}`. Overnight notes are `{#shrink-test-glob}` and `{#shrink-fold3}`.

---

# Handoff — Mac auto-update cert swap — DONE, published (verified 2026-09-06: v8.2.6 and v8.2.7 both released 2026-08-30/31, five versions have shipped since, current Latest is v8.3.2)

**Date:** 2026-08-30
**From:** Claude Code (Fable plan, Sonnet build)
**Branch:** `main`, uncommitted (alongside older uncommitted Tendencias work — see `git status`)

## Problem and decision

CORRECTED 2026-08-30 after auditing the real published zips — the earlier premise "old cert through 8.2.5" was wrong. Actual history: **≤8.1.3** = old free cert `Apple Development: djsalas99@gmail.com (VAXFST8D9H)` + old appId (those releases' Mac assets no longer exist on GitHub); **8.1.4–8.1.5 = NEW Developer ID cert (`N78U9QC783`) but still the OLD appId `com.hospitaluniversitario.rplusclinical`** (dropped in 8.1.6, commit `9a250b74`); **8.1.6+** = new cert + new appId `com.rmas.rplusclinical`. Squirrel.Mac validates an update against the running app's designated requirement, which pins the bundle identifier AND the signing identity — so the appId change strands 8.1.4/8.1.5 exactly like the cert change strands ≤8.1.3. No "Hospital Universitario" certificate ever existed in this keychain (checked, including expired) — that recollection was the old appId. Owner confirmed 2026-08-30: the stuck users are on **8.1.4/8.1.5**, so the 8.2.6 bridge ships with the OLD appId + the normal NEW cert, notarized, **Mac-only publish** (Windows must never see an appId change — NSIS would treat it as a different app). ≤8.1.3 stragglers, if any, rely on the min-version blocking screen. Owner decisions (both via AskUserQuestion, recorded in `PLAN.md ## decisions`): quiet swap over screen-only; first-open-dialog skip accepted (no browser download → no quarantine; target notarized).

## Built + tested this session (uncommitted)

- `lib/mac-quiet-swap.mjs` + `lib/mac-quiet-swap.test.mjs` (19 pass, registered in `package.json scripts.test`). Active only on a packaged darwin app whose own `TeamIdentifier` differs from `N78U9QC783` OR whose bundle `Identifier` differs from `com.rmas.rplusclinical` — covers both stuck families, makes the old-appId 8.2.6 bridge itself active, inert in 8.2.7+ builds and dev. Staged and installed-copy verification require team AND app id. Flow: download hardcoded `https://github.com/mausalas99/r-mas/releases/download/v8.2.7/R+-8.2.7-autoupdate-mac-{arm64,x64}.zip` via Electron `net` (follows redirects, sets no quarantine xattr) → `ditto -x -k` unzip → REQUIRED gates `codesign --verify --deep --strict` + `TeamIdentifier=N78U9QC783` (`spctl --assess` and `xattr -cr` run log-only, never gate) → rename current `.app` to `.app.pre-swap` → `ditto`-copy staged app in → re-verify → `shell.trashItem` the pre-swap copy (recoverable, never `rm`). Any failure after the rename restores the old app; every failure is silent + logged; one attempt per launch; staging dir under `userData/quiet-swap` cleaned either way.
- **Deliberate deviation from the earlier sketch: no forced relaunch.** A mid-session relaunch could interrupt clinical work; the running process keeps its open file handles and the user simply gets 8.2.7 on their next manual launch.
- `main.js`: `scheduleUpdateCheck()` no-ops while the swap is active (single choke point for boot/manual/downgrade/reinstall checks); `app.whenReady` runs the activation gate then a 30s-delayed `runQuietSwap`; `quietSwapDownload` helper uses the already-imported `net`. `main-update-feed.test.mjs` 4 pass, `main-lan-boot.test.mjs` 10 pass, `scripts/lib/electron-pack-files.test.js` 10 pass (`build.files` already ships `lib/**/*.mjs`).
- `lib/admin-rescue-key.mjs`: `ensureAdminKeyPair` now regenerates the keypair when the stored wrap fails to decrypt WHILE `safeStorage.isEncryptionAvailable()` is true (the cert swap invalidates the Keychain wrap). Decrypt failure while the Keychain is merely unavailable returns the existing record untouched — never destroys a still-recoverable key. `lib/admin-rescue-key.test.mjs` 7 pass (3 new).

## Publish sequence (owner's machine only — needs both certs in the login keychain + Apple credentials)

AppId mechanics (supersedes the earlier CSC_NAME instruction — no signing env needed, both builds use the default new cert + notarization): the bridge must be accepted by 8.1.4/8.1.5's updater, so `package.json` `build.appId` is flipped to `com.hospitaluniversitario.rplusclinical` for the 8.2.6 release commit and restored to `com.rmas.rplusclinical` for 8.2.7. Both flips are part of Claude's "get X ready" prep. The swap's staged-app verification refuses any 8.2.7 that accidentally kept the old appId.

1. Release-checklist prep for 8.2.6 (appId flip, bump, notes, highlights, full test pass), then:
   `npm run release:publish -- --yes --mac-only` (Windows must skip 8.2.6).
   It becomes Latest; stuck 8.1.4/8.1.5 installs accept it (same team, same appId), and its quiet swap installs 8.2.7 once those assets exist — a 404 before then just retries next launch. Up-to-date Macs (new appId) reject 8.2.6 harmlessly and wait on 8.2.5.
2. Release-checklist prep for 8.2.7 (appId restored), then: `npm run release:publish -- --yes`.
3. IMMEDIATELY after (GitHub auto-marks the newest release Latest, and stuck installs must keep landing on 8.2.6 first):
   `gh release edit v8.2.7 --repo mausalas99/r-mas --latest=false`
   `gh release edit v8.2.6 --repo mausalas99/r-mas --latest`
4. After a few days' soak: `gh release edit v8.2.7 --repo mausalas99/r-mas --latest`, and optionally raise `public/min-version.json` to `8.2.7` as the backstop screen (covers ≤8.1.3 and anyone the swap missed). Do NOT raise min-version before v8.2.7's assets are live — it would block every running install behind a download that 404s.

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

## What's fixed in code (done, committed `0717f524`, staged for 8.2.5)

- `public/js/features/productivity.mjs` — `saveUndoStack` (now exported) shrinks the stack (drops oldest snapshots, then clears the key) instead of failing when `localStorage.setItem` throws, and logs a `console.warn` every time it has to; an empty stack now clears the key silently instead of logging a false quota warning. New `healUndoStackQuota()` runs this same shrink logic once on every app boot (`initProductivityKeyboardShortcuts`), so installs with pre-existing bloat self-heal on first launch of 8.2.5 — no owner action needed. Tests: `public/js/features/productivity-undo-quota.test.mjs`, registered in `package.json`.
- `public/js/tend-prefs.mjs` — `writeJson`'s catch now logs instead of swallowing.
- `public/styles/workbench-kit.css` — `.wb-scrim` now has `pointer-events: none` when closed (`--open` re-enables it). This was the first (wrong) theory's fix; kept because it's a real, harmless hardening of a full-viewport overlay, not because it was the actual bug.
- The old `scripts/verify/tend-group-table-hide*.mjs` click scripts were silently useless (`element.click()` bypasses hit-testing). They are gone; do not recreate that pattern.
- `npm run build:ui` has been run after every source change above — the built app already has the fix.

## What's NOT done — one optional follow-up (no manual step needed anymore)

The manual `localStorage.removeItem('rpc-undo-stack')` DevTools step once listed here is gone: `initProductivityKeyboardShortcuts` now calls `healUndoStackQuota()` on every app boot, which re-saves the existing undo stack through the same shrink-then-clear logic `saveUndoStack` already had — so any install still carrying old bloat cleans itself up automatically the first time it opens 8.2.5. No owner action required.

**Not done, optional, out of scope for this fix:** ~115 other `localStorage.setItem` call sites in this repo were not audited for the same empty-`catch`-swallows-the-error pattern. Any one of them could be silently failing the same way right now. A future session could grep `localStorage.setItem` across `public/js` and check each call site's error handling. Not started — do not assume it's been checked.

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
| Admin / Equipo / Mi Perfil UI cleanup | `docs/superpowers/plans/2026-09-10-admin-equipo-perfil-ui-cleanup.md` — **done, 2026-09-10.** Owner reported all 4 screens (Admin→Usuarios, Admin→Red, Equipo, Mi Perfil) as unclear/messy after several past tries. Root cause: these screens were never part of the Teal workbench mockup redesign — they only inherited tokens/colors, never a real layout pass. Fixed all 4: Usuarios/Red rows now use an identity+meta line with a merged "⋯" overflow menu and a selection-gated bulk bar (owner approved this pattern mid-session over the plan's original `wb-row` idea); Equipo's rare rotation-admin section is now collapsed by default and section order is fixed across all render states; Mi Perfil regrouped into 2 cards ("Cómo trabajo", "Firma y formatos") reusing the existing `.profile-block`/`.profile-subblock` classes. Markup + CSS only, no field ids or handlers changed. Verified: `build:ui` clean, all colocated tests pass, visually checked light + dark in the running app. Equipo got 2 more rounds after this: (1) joined-team card's Integrantes/Mi ciclo sub-panels now collapse by default (new `.members2`/`.cycle2` localStorage keys, since the old keys were already stuck open for real users) and the current sala is now a quick inline `<select>` next to `@usuario` instead of buried in the bottom Configuración accordion. (2) the joined-team section box no longer stretches to the full panel width when it holds just 1-2 cards — it now hugs its content (`justify-self: start`), fixed in both CSS scopes this feature has (`#clinical-teams-backdrop` in `pase-board.css` for the popup entry point, `.cloud-sync-equipo-embed` in `cloud-sync.css` for the Ajustes→Cuenta y equipo entry point — the two are separate, parallel scopes for the same shared JS render). Sala quick-select's save round-trip could not be exercised end-to-end via computer-use (native `<select>` popups aren't reliably scriptable), but the wiring (`wireQuickSalaControl` → `handleProfileFormSubmit`) is covered by `teams-roster-panel-build.test.mjs`. (3) Owner asked to go further: no separate "Mis equipos" section at all — your own team card now renders as the first card inside the same Explorar grid (`renderDirectorySectionHtml`'s new `leadingCardsHtml`/`leadingCount` params, wired from `teams-roster-panel.mjs`), so the grid just has however many cards there are, yours first, no leftover column. Removed the now-dead has-joined grid-column overrides in both CSS scopes. New test: `teams-roster-directory.test.mjs`. (4) After the merge, your own team's card was much taller than the others because its Mi ciclo/Invitar sub-panels were already open from stale localStorage. Wrapped all of that card's extra content (Integrantes, Mi ciclo, herencia, Salir, Invitar) in one new collapsible defaulting closed (`card.${teamId}.details` key, fresh key since old keys don't apply here), so the card now matches the compact directory cards by default. New test in `teams-roster-team-cards.test.mjs`. Verified visually in the running app. (5) Owner flagged 3 more visual snags in one pass: the Detalles-del-equipo card's inner Mi ciclo / Invitar boxes had sharp square corners once nested inside the new toggle's padded body (added `border-radius: var(--radius-control)` to `.clinical-teams-my-cycle-box`/`.clinical-teams-invite-box` in `pase-board.css`) — verified visually. Admin → Red's 3 filter `<select>`s stacked into 3 rows instead of 1 because `.profile-input` sets `width:100%` inside a flex-wrap row (`cloud-sync.css` `.cloud-sync-admin-red-filters select` now gets `flex: 1 1 160px; width: auto;`) — not visually re-checked live (needs admin promotion this session lacked), verified by CSS mechanics only. Ajustes → Conexión → Eliminaciones pendientes had zero CSS (raw `<ul>` bullet, label+actor run together, raw ISO timestamp) — rebuilt with the existing `.cloud-sync-inset-group`/`.cloud-sync-inset-row` + `.cloud-sync-options-row-text/-title/-meta` row pattern already used elsewhere in this same panel, and reused `formatCloudDiagWhen` for the timestamp instead of a raw ISO string — verified visually. (6) Committed 2026-09-11 as part of 8.3.4 prep (commit `96f9bc9b`): the edit panel gained a staged-rotation toggle (this rotation vs next), wired through `clinical-access-teams-core.mjs`/`ipc-handlers-register-teams.mjs`. All destructive actions (Eliminar/Quitar) across teams roster, entrega procedures, and guardia orphan entregas now use a `.btn-med-secondary--danger` style. Fixed a real bug found while finishing this pass: a raw `wireFocusTrap` confirm dialog opened on top of a registry-tracked modal caused an infinite `focusin` loop (`RangeError: Maximum call stack size exceeded`) — `modal-dismiss.mjs` now tracks a stack of raw traps and every registry focus handler defers to the topmost one. Also fixed a complexity-ratchet regression this pass introduced (`renderMembersBlock` 16 > max 15) by hoisting a repeated ternary into one variable. Tests pass, `build:ui`/`metrics:check` clean; not re-verified live in the running app this pass (verified by test + build only). |
| Labs: DEPCR section + corrected reticulocyte count (RetC) | No plan doc — small, done directly. **Committed 2026-09-11 (`79ddad6f`), part of 8.3.4 prep.** Lab section detection (`labs-display.mjs`, `tend-core.mjs`, `cultivo-block-core.mjs`, `labs-some-table-*`) now recognizes `DEPCR` (depuración de creatinina de 24h) as its own section instead of folding it into QS urine chemistry. New `public/js/labs-reticulocito-corregido.mjs`: RetC = Ret × Hto/45, regenerativa at RetC ≥ 2. `lab-bulk-paste.mjs`/`lab-history-auto-store-core.mjs` carry the new section/field through paste and stored history. Tests pass (`labs-reticulocito-corregido.test.mjs` + updated `labs-bh-extended`/`labs-ego-plt-cit`/`labs-gases`/`labs-some-table` tests), `build:ui`/`metrics:check` clean. **Bug found + fixed 2026-09-11 (uncommitted):** owner reported RetC kept reappearing on every later BH set instead of showing once. Root cause: `collectPriorBhValuesFromHistory` (`labs-default-refs.mjs`) scanned the whole lab history and let an older entry overwrite a newer one, so once one set had a real Ret value, every later Hto-only set re-borrowed it and recomputed RetC forever. Fixed to stop at the single closest BH set in history — if that nearest set doesn't carry the missing field, no borrow, no RetC shown, no chaining further back. New test in `labs-default-refs.test.mjs` (9/9 pass), `build:ui` clean. Not committed yet. |
| New patients stopped syncing to peers (Nube room 50-patient cap) | **Root cause found + fixed 2026-09-09, reproduced live against a local `wrangler dev` worker.** Owner report: "I'm adding patients but users can't see them" on 8.3.2. Nube rooms are one per sala per CALENDAR MONTH (`cloud/sync-worker/src/turn-key.js` `defaultTurnKey` returns `YYYY-MM`; changed from daily to monthly in commit `d9c08c6f`, 2026-08-05). `QUOTAS.maxLivePatients` was still `50` — the value sized for daily rooms. Once a sala's monthly room held 50 patient entries, `cloud/sync-worker/src/lww.js` (`setEntryField` / `upsertEntryStub` / `setMonitoreoField`) threw `QuotaExceededError` for every NEW patient id. Edits to already-present patients kept working (the `idx >= 0` branch skips the quota check), so only newly admitted patients vanished — exactly what the owner saw. Worse, the failure was invisible: `applyOps` returns the rejection inside an HTTP **200** body (`rejected: [{ op, reason: 'quota_exceeded' }]`), and nothing on the client read it. `sync-runtime-pull-push.mjs` `flushOutboxItem` called `outbox.remove()` on any 200; `cloud-push-direct.mjs` `pushCloudOpsDirect` counted only `reason === 'stale'`. Same silent-swallow family as the 2026-08-29 `localStorage` `QuotaExceededError` entry in MISTAKES.md. Live proof: with the room at 50, push #51 returned HTTP 200 with `rejected: [{reason:'quota_exceeded'}]` and the peer's pull never contained the patient. Below the cap, the same push applied and the peer received `nombre`/`cama` correctly — no second, name-specific bug. Fix, 3 files: `cloud/sync-worker/src/quotas.js` — `maxLivePatients` 50 → 300 (runaway guard only; the real size ceiling is `storageSoftBytes`/`storageHardBytes`, enforced independently in `sync.js`, and lab sets are sharded out of `room_state`). `public/js/features/cloud-sync/cloud-push-direct.mjs` — new exported `recordRejectedCloudOps(result)` reads `result.rejected` and records a Conexión diagnostic per reason (keeps the existing `stale_rejected` code/wording, adds every other reason such as `quota_exceeded`); `pushCloudOpsDirect` now uses it. `public/js/features/cloud-sync/sync-runtime-pull-push.mjs` — `pushWithStaleRetry` calls the same helper, so the outbox path can no longer drop a rejected op unlogged. Tests: `public/js/features/cloud-sync/cloud-push-direct.test.mjs` (+1) and `public/js/features/cloud-sync/sync-runtime-cycle-flush.test.mjs` (+1). `cloud/sync-worker/src/lww.test.js` already asserts the cap via the `QUOTAS.maxLivePatients` constant, so it needed no change. Verified live after the fix: the same already-full `Sala 1 2026-09` room accepted patient 51 (`applied: 1`, `rejected: []`) and user B's pull returned the new patient's `nombre`. **Deployed 2026-09-09** — owner ran `wrangler deploy` in `cloud/sync-worker`. The cap fix is live; the backlog self-heals with no manual step (the debounced census bundle re-emits `entries/<id>/fields` for every local patient on every push cycle, and the Worker has no `entityVersions` row for the previously rejected ones, so they apply on the next push). **Client-side diagnostic change committed 2026-09-09 (`28b9331e`), part of the 8.3.3 bump — reaches users once 8.3.3 publishes.** Not changed, worth watching: rooms still accumulate for a whole calendar month with no archival, so the count grows all month; 300 is headroom, not a design fix. Nothing prunes `state.entries` except an explicit delete (tombstone). |
| Network census view (admin, cross-area) | `docs/superpowers/plans/2026-09-08-network-census-view.md` — **built 2026-09-08, not yet manually verified against a live Nube deployment.** "Red" tab in the Cloud Admin panel lists every patient across all 8 sala rooms, with filters for área/equipo/estado, a Cuarto column, and an Archivar/Restaurar action per row — archive pushes `entries/{id}/fields` directly to the patient's own room (plaintext census field, no room switch needed; `entries/{id}/fields` was already confirmed outside `isEncryptedContentPath`). "Abrir expediente" still switches this device's active room and opens the chart. New/extended this pass: `network-census.mjs` (+test, now also carries each room's `clinicalOps` for the team filter), `panel-admin-html.mjs` (`redCensusHtml` + new `applyNetworkCensusFilters`, both +test), `panel-admin-helpers.mjs` (`adminTableHtml` gained an optional `rowAttrs`), `panel-admin-actions.mjs` (`handleArchiveNetworkPatient`, +test), `panel-admin.mjs` (filter `change` listener), `cloud-sync.css`. All relevant tests pass, `build:ui` and `metrics:check` clean. **Fixed 2026-09-08 after live testing:** "Abrir expediente" threw `deps.renderConnected is not a function` — `mountAdminShell` (`panel-conexion-bootstrap.mjs`) spread a base `deps` that never carried `renderConnected` (it only ever existed on the `ui` object built in `panel-conexion.mjs`, one level up). Fixed by threading `renderConnected`/`renderDisconnected` into `mountAdminShell` explicitly from `panel-conexion.mjs`; +2 tests in `panel-conexion-bootstrap.test.mjs`. Filters/Cuarto/Archivar confirmed working live per the attached screenshot. Still needs: live click-through of "Abrir expediente" after this fix. **Added 2026-09-08:** a permanent "Eliminar" action, shown only on already-archived rows — pushes a `tombstones/{id}` op directly to that patient's own room (same op family as `enqueueCloudPatientDelete`, plaintext, scoped to one room), so a patient who moved areas (e.g. Urgencias → hospitalización) can be re-admitted fresh elsewhere. `handleDeleteNetworkPatient` in `panel-admin-actions.mjs` (+2 tests), `redCensusHtml` gained the conditional button (+1 test). **Also fixed 2026-09-08:** the confirm dialog for every admin action (rotate code, delete user, archive, delete, …) rendered behind the Administración modal — `confirmAction` (`panel-admin-helpers.mjs`) never passed the `--stacked` z-index variant; `showConfirmDialog` (`ui-approval-card.mjs`) now takes a `stacked` option and `confirmAction` always sets it, since Administración is always the nested-modal case (+1 test). **Also added 2026-09-08: multiselect.** Checkbox per row + "select all visible" (respects the area/team/status filters — hidden rows are never selected) + two bulk buttons, "Archivar seleccionados" and "Eliminar seleccionados" (the latter silently skips any selected-but-still-active row, so "select all" can never delete an active patient). Archive/delete logic was factored into shared `archiveOneNetworkPatient`/`deleteOneNetworkPatient` so the single-row and bulk paths share one implementation. New: `listSelectedNetworkPatients`/`setSelectAllVisibleNetwork` in `panel-admin-html.mjs`, `handleBulkArchiveNetwork`/`handleBulkDeleteNetwork` in `panel-admin-actions.mjs` (+6 tests total across both files). All tests pass (31 in the Red-tab/admin files alone), build/metrics clean. Still needs a live-account try of: multiselect + both bulk buttons, and confirming the dialog now shows on top. **Also fixed 2026-09-08: slow load.** `fetchNetworkCensus` swept all 8 salas one at a time (each 2-3 HTTP round trips), so load time was roughly 8x one sala's. Changed to `Promise.all` over the 8 salas — independent rooms, no ordering requirement, and no rate limit on join/DEK/pull endpoints (only pushes are rate-limited). Output order is unaffected (`Promise.all` preserves input order). +1 timing test proving the sweep no longer runs sequentially. Tests pass, build/metrics clean; still needs a live timing check. **Also fixed 2026-09-08: foreign "Pendiente" reminders.** User reported toast reminders for patients not in their own sidebar. Root cause: "Abrir expediente" merges the target room's *entire* pulled state (`applyCloudPullResult({needSnapshot:true, state})`) — every patient's entry AND every patient's todos, not just the one clicked — into this device's local storage; `todos-reminder-scheduler.mjs` then fires reminders for any patient with local todos, regardless of sidebar visibility. Fixed by adding `scopeCloudStateToPatient(state, patientId)` (new file `scope-cloud-state-to-patient.mjs`, pure function, +5 tests) which trims the pulled state to just the opened patient's entry/todos/agenda/labSidecars/tombstones before merging; `handleSwitchNetworkRoom` now applies the scoped state instead of the raw one (+1 wiring test). Does not change the "switch active room" mechanic itself, only what gets merged locally. **User confirmed wanting the leftover cleaned up, so added:** `removeForeignPatientsMergedByRedTabBugOnce()` in `app-runtimes.mjs`, a self-flagging one-time boot step (localStorage flag `rpc-cleanup-foreign-red-tab-patients-2026-09-08`) that removes the two named patients from the report (MELISSA DENIS SEGURA GUERRERO, MARIA GUILLERMINA GARCIA FLORES) via the existing local-only `removePatientLocally` — no cloud tombstone pushed, since they still belong to their real room. Exact-name matching logic pulled into a pure, tested helper `patient-name-cleanup-once.mjs` (+4 tests) since `app-runtimes.mjs` itself has no colocated test (full boot import graph). Tests pass (20 total across the fix), build/metrics clean; takes effect on this device's next launch. **Also fixed 2026-09-08: still slow after the `Promise.all` fix.** Owner reported the Red tab still took forever live. Root cause: parallel or not, the client was still making 24 network round trips (8 salas × join+DEK-fetch+pull) to a real Cloudflare Worker — parallelizing them didn't remove the trips, only overlapped them. Replaced with one new admin-only endpoint, `GET /admin/network-census` (`admin.js` `handleNetworkCensus`), which reads all 8 rooms' state locally inside the Worker (8 D1 reads, no network) and returns them in a single response, each with its wrapped DEK attached; the client (`network-census.mjs`, rewritten) now just unwraps and decrypts locally — `unwrapAndCacheRoomDek` split out of `room-dek.mjs`'s `loadRoomDek` for this. The old per-sala `joinRoom` calls are gone entirely, so `restoreHomeRoom`/the active-room-pointer dance is gone too (this device's own room is never touched by a census fetch now). That join sweep was also secretly load-bearing: `archiveOneNetworkPatient`/`deleteOneNetworkPatient` relied on it to make this device a room member before pushing. Fixed at the root instead of re-adding a join: `requireMember` in `sync.js` now lets an admin push/pull ANY room without a `room_members` row (same rule admin.js already applied to reads), via a new shared `admin-roles.js` (`ADMIN_ROLES`, avoids a sync.js↔admin.js import cycle). New tests: `admin-network-census.test.mjs` (6), `sync-require-member.test.mjs` (5), `network-census.test.mjs` rewritten (5) — 93 total across the touched files, all pass; build/metrics clean. **Deployed 2026-09-08** — owner ran `wrangler deploy` (confirmed live, version `b10400d9`, verified via a direct `curl` to `/admin/network-census` returning the expected 403 without credentials). Owner reported it still felt slow after the deploy. Root cause of the *remaining* slowness: `decryptRoomStateFromPull` (`cloud-sync-crypto-wire.mjs`) decrypted every content field one at a time (`for...await`) — harmless when network round trips dominated, but once those were cut to one request, this sequential per-field AES-GCM decrypt became the visible cost, worst for the census pull since it decrypts 8 whole rooms' worth of fields in one call. Changed `decryptEntryContentFields`, `decryptLabSidecars`, `decryptTodos`, and the top-level `decryptRoomStateFromPull` to run every field's decrypt via `Promise.all` instead of one at a time — same result, no ordering dependency between fields. Tests pass (14 in the touched files), build/metrics clean. **This needs the R+ app window reloaded (or relaunched)** to pick up the new bundle — Electron doesn't hot-reload `public/js`; the client fix from the entry above already needed this too. Owner reported it was still slow after reloading, and described the actual symptom for the first time: it doesn't finish, and closing/reopening the window is what "shows them" (the patient list). That's not a speed complaint, that's a hang. Found it: `lib/cloud-sync-ipc-fetch.cjs`'s `cloudSyncNetFetch` — every Nube HTTP call on desktop goes through this (Electron main-process `net.fetch` via IPC, `cloud-sync-fetch`) — had **no timeout at all**. The non-Electron browser-fetch path (`api-transport.mjs`) already had `AbortSignal.timeout(15_000)`; this one never did. A dropped or stalled connection to the Worker (more likely now that one request does 8 rooms' worth of work) would hang the `await` forever with no error and no way out except killing the window — exactly what was reported. Added `AbortSignal.timeout(20_000)` to the `net.fetch` call, converts a timeout/abort into a clean `cloud_sync_timeout` error instead of an indefinite hang; `api-client.mjs`'s `httpErrorFromResponse` maps that specific code to a plain Spanish message ("La Nube no respondió a tiempo. Intenta de nuevo.") instead of showing the raw code. New tests: `cloud-sync-ipc-fetch.test.cjs` (+3), `api-client.test.mjs` (+2, also pins that every other error message is untouched). Build/metrics clean. **This is a main-process file (`lib/`, loaded by `main.js`) — needs a full quit-and-reopen of the app, not just a window reload**, to take effect. Separately flagged (not fixed, out of scope for this fix): `httpErrorFromResponse`'s existing precedence, `data.error || data.message`, shows the machine code instead of the server's actual Spanish `message` for every OTHER error too (e.g. `missing_url` shows literally "missing_url") — pre-existing, wider blast radius, left alone here. **Found the real cause 2026-09-08, live, via `wrangler tail`.** Owner reported it took 3 window-reopens to see the list. Watched a real attempt with `wrangler tail`: the `/admin/network-census` call itself returned `Ok`, but the log was flooded with `D1_ERROR: D1 DB is overloaded. Requests queued for too long` — hitting OTHER devices' ordinary `/pull` and `/mutations` calls too, not just this endpoint, at the exact moment of the attempt. Root cause: `handleNetworkCensus` fired all 8 rooms' `loadRoomState` via `Promise.all` — `loadRoomState` is up to 3 D1 queries per room, so one admin click burst up to 24 concurrent D1 queries from a single request, on top of whatever real hospital traffic was already hitting the same shared D1 database. That burst was enough to tip D1 into its own queue-overload error for everyone, not just the admin. Fixed: `handleNetworkCensus` now loops the 8 salas sequentially (one `loadRoomState` in flight at a time) instead of `Promise.all`. This is Worker-to-D1, not a network round trip to the client, so going sequential costs a few tens of ms — irrelevant next to the 24-round-trips-over-the-internet problem this endpoint already fixed — while removing this endpoint's contribution to D1 overload spikes. Tests pass (21 in the touched files), metrics clean; no `build:ui` needed (server-only file). **Not yet deployed** — needs another `wrangler deploy` in `cloud/sync-worker`. Still needs: live confirmation after that deploy, and a note that the D1-overload errors seen for OTHER devices' plain `/pull`/`/mutations` calls in the same tail window suggest the shared D1 database may be running close to its concurrency ceiling in general at peak hours, independent of this feature — worth watching if other slowness reports come in. |
| Pay down pre-existing complexity debt to zero | `docs/superpowers/plans/2026-09-06-complexity-debt-handoff.md` — **handoff only, not started.** 15 `complexity`-rule violations, all predating 8.3.2, listed with file:line. `scripts/metrics/baseline.json` `totalScore` was raised to 225 (owner-approved) to unblock the 8.3.2 commit; this plan pays it back down to 0 and lowers the baseline again. |
| **Codebase reduction (637k → ~219k tracked lines)** | `docs/superpowers/plans/2026-09-02-codebase-reduction.md` (local, gitignored) — **executed 2026-09-02 on branch `chore/codebase-reduction`, committed and merged to `main` (verified 2026-09-06, corrects the "uncommitted" note this row used to carry).** Build mirrors + `public/index.html` gitignored (predeploy hooks rebuild them), dead code + LAN ward server + 7.9 cutover wizard deleted, file-length ratchet replaced by total-LOC + module-count ratchets, tests discovered by glob, code map tracked at `docs/core/21-code-map.md`. Status per task in `PLAN.md` `{#shrink}`. |
| **Update feed Worker (this job)** | `docs/superpowers/specs/2026-08-15-update-feed-worker-design.md` |
| Procedure/study parsing → Pendientes, hemodialysis UF → balance | `docs/superpowers/plans/2026-09-05-procedure-parsing-and-uf-balance.md` — **All slices done, verified 2026-09-06.** Slice 1 (2026-09-05): ESTUDIOS/PROCEDIMIENTO become Pendientes on paste. Slices 2-3 shipped in commit `8958df13` (2026-09-06, prep 8.3.2): hemodialysis "no fue hoy" reminder button in estado actual registro, and balance hídrico now split by turno (T1/T2/T3) plus a quantifiable-other-sources section (ultrafiltrado, drenaje, toracocentesis, custom). |
| Tablas Dinámicas (combined lab table builder) | `docs/superpowers/plans/2026-08-30-combined-lab-table.md` — **done, owner-confirmed 2026-09-06** (this row previously flagged "not yet manually verified" — owner has since used it). Standalone "Tablas Dinámicas" button in the Tendencias panel's top toolbar opens a dedicated, chart-free modal (`tend-dynamic-table-modal.mjs`) where analytes from any lab section can be searched and added into one table. Reuses the per-study table engine via a reserved pseudo section key so persistence (extras, hidden rows/cols, day-mode) comes free from existing `tend-prefs.mjs` functions. The per-study "Gráfica del estudio" modal was reverted back to single-section only (first pass had embedded the picker there; owner asked for it separate). Tests pass (38/38), `build:ui` clean. |
| Biometric unlock (Touch ID + Windows Hello) | `docs/superpowers/plans/2026-08-25-biometric-unlock.md` — **built 2026-08-25, then reverted same day by user request.** Touch ID worked on Mac, but local testing surfaced that the dev DB was never passphrase-encrypted (no onboarding entry point in Settings to turn encryption on after first run — separate gap, not fixed). Windows Hello was never shippable (only known wrapper is abandoned since 2019). User decided to drop the feature rather than chase the encryption-setup gap first. All Touch ID code surgically removed 2026-08-25 (main.js, ipc-handlers*.mjs, preload.js, db-unlock-*.mjs, root.html, tests) — 35/35 tests pass, `build:ui` clean. Do not restart this without first deciding how users turn on local DB encryption post-onboarding. |
| Interconsulta team board redesign | `docs/superpowers/plans/2026-08-25-interconsulta-team-board.md` — **shipped, verified 2026-09-06** (this row previously said "approved, not started" — stale; `public/js/features/interconsulta-team-board.mjs` is built, committed, and wired into `interconsulta-mode-chrome.mjs`, with a follow-up fix commit restoring the add-patient button). |
| Interconsulta board demo, seeded on the main app | `docs/superpowers/plans/2026-08-25-interconsulta-demo-on-main-app.md` — **done 2026-08-25.** Built `public/js/features/interconsulta-demo-toggle.mjs`: ⌥⌘⇧I (`window.toggleInterconsultaDemo`) merges 12 demo patients + 4 demo teams into the real `getPatients()`/`clinicalSessionContext` (never replaces), hidden from local persistence via the existing `setPersistPatientsResolver` isDemo filter. Closed the cloud-sync gap flagged in the plan doc: added `getSyncablePatients()` to `app-state.mjs` and swapped every `getPatients()` read in `public/js/features/cloud-sync/*.mjs` to it, so demo patients never reach a push or pull match. Deleted the old verify-script-only files (`tour-ic-demo-seed.mjs`, `scripts/verify/interconsulta-demo-seed.mjs`) — superseded. Tests added: `public/js/features/interconsulta-demo-toggle.test.mjs`. |
| Boot speed and debt (teal shell) | `docs/superpowers/plans/2026-08-22-boot-speed-debt.md` + `docs/superpowers/plans/2026-08-23-boot-debt-phase2-phase3a.md` — **Phase 1 (08-22), Phase 2 (08-23), Phase 3 Stage A (08-23) all done.** Phase 2 fixed the `score.mjs` scanner bug; `metrics:check` totalScore 400 → 304 (both fixes now committed on main: `97b6ed8d`, `0a51977c`). Phase 3 Stage A (metafile graph analysis, no code changes): gate failed — 0 exclusive eager bytes would leave the bundle by cutting the 5 files' direct edges, because `profile-formats.mjs`/`profile-prefs.mjs` still import them directly. Stopped, as the gate specifies. **Stage B now planned** — see row below. |
| Boot debt Phase 3 Stage B (profile-chain decoupling) | `docs/superpowers/plans/2026-08-23-boot-debt-phase3-stage-b.md` — **Stage B.0 gate passed, Stage B.1 shipped 2026-08-23 (commit `10a24fa7`). Stage B.2 blocked, not attempted — user decided 2026-08-23: stop here, do not scope the app-tabs.mjs/expediente-navigation.mjs split.** B.1: the 4 profile/medications files now resolve tab-switch functions via the existing `globalThis` window-handler pattern instead of static imports — 12 new tests (medications-actions, profile-app-mode, profile-formats, profile-prefs, resolve-global-fn), all passing (this row said 18 until corrected 2026-08-25). **B.2 (as scoped) cannot deliver any savings**: `app-tabs.mjs`/`expediente-navigation.mjs` must stay eager+synchronous (they hold the two calls that paint frame one) and they themselves import `app-tabs-runtime.mjs`/`expediente-inner-cache.mjs` internally — so making `app.js`/`app-runtimes.mjs`'s own edges lazy changes nothing. The only way to actually shrink the bundle now is splitting `app-tabs.mjs`/`expediente-navigation.mjs` internals (small eager core + deferred rest) — a materially bigger, riskier change to the code driving every tab switch, not attempted, needs explicit sign-off before starting. `bootGraphDebt = 200` stays accepted debt. Also scopes Step 9 (tab-level code split) as a distinct future follow-on, not started. |
| Shard room_state.labSidecars (D1 2MB row cap fix) | `docs/superpowers/plans/2026-08-21-shard-room-state-labs.md` — **built + tested 2026-08-21.** Fixes real prod `D1_ERROR: string or blob too big: SQLITE_TOOBIG`. Yesterday's payload-cap raise (`a488d032`) fixed app-level rejection but not D1's own 2MB hard row cap — room_state stored the whole room as one blob. New `room_state_labs` table (`schema/008-shard-room-state-labs.sql`) shards `labSidecars` one row per patient; core `room_state` row keeps everything else. Read shape unchanged for every consumer (client included) — `sync.js loadRoomState()` reassembles transparently, legacy rooms self-migrate on next write. `interno/room-resolve.js` and `pase-labs.js` deduped onto the same reader instead of hand-rolling their own SQL. New per-shard hard cap `QUOTAS.labShardMaxBytes` (1.9MB) turns any future overflow into a clean `payload_too_large` instead of a raw D1 crash. 77/77 sync-worker tests pass (`npm run test:one -- cloud/sync-worker/src/sync-room-state-shard.test.mjs cloud/sync-worker/src/mutation-guard.test.mjs cloud/sync-worker/src/crypto-at-rest.test.js cloud/sync-worker/src/admin.test.js cloud/sync-worker/src/interno/routes.test.js cloud/sync-worker/src/pase-labs.test.js cloud/sync-worker/src/rooms.test.js cloud/sync-worker/src/lww.test.js cloud/sync-worker/src/mobile-lab-window.test.js`). Not yet deployed — needs `npm run db:migrate:remote` inside `cloud/sync-worker` before the code ships (local migrate hit a pre-existing, unrelated stale `.wrangler` local-D1 cache — verified migration 008 applies cleanly standalone via `sqlite3`). |
| Mixed-expediente lab guard (patient safety) | `docs/superpowers/plans/2026-08-20-mixed-expediente-lab-guard.md` — **built + tested 2026-08-20.** Lab paste with 2+ distinct expediente bases in one block now blocks entirely (`canProcess:false`, nothing saved), shows a Spanish toast naming both expedientes, keeps raw text in `#lab-input`. Covers main paste (`lab-panel-parse.mjs`), paste-anywhere (`paste-smart-model.mjs`/`paste-smart.mjs`), and repo-import/stub-admit (inherit via `canProcess`/status gates, unchanged). Same-patient variants (`1087426` vs `1087426-2`) still pass via base-registro normalization. Follow-on same day: "Actualizar labs" (`lab-repo-batch-import.mjs`/`lab-repo-import.mjs`) now passes `{ replaceOnMatch: true }` through `finalizeBulkLabPaste` → `storeBulkLabBlocks` → `upsertLabHistory`, so a re-fetched set at the exact same fecha+hora fully replaces the stored set instead of merging/accumulating rows — closes the dedup gap and means a correction actually corrects instead of appending. Scoped strictly to `matchKind:'datetime'` (exact-time match); complementary same-day merges (Biometría + Química arriving at different times, same study) are untouched. Normal manual paste keeps the old merge behavior (no `opts` passed). `npm run metrics:check` fails but pre-existing (374→384 before this session's changes even; whole-repo debt, not from this fix). |
| Nube client-encryption compliance review | `docs/superpowers/plans/2026-08-14-nube-client-encryption-compliance.md` |
| Nube E2EE implementation | **CORRECTION 2026-09-05: this whole row and the two below are stale. `NUBE_E2EE_ENABLED = true` since commit `1a6c146f`, released in 8.2.8 (2026-08-31). It is live, not "not deployed."** `docs/superpowers/plans/2026-08-17-nube-e2ee.md` — **built + tested 2026-08-17, by explicit user request overriding the "do not start" below.** Content fields (notes/labs/indicaciones/monitoreo/clinicalOps) encrypt client-side; patient identity (name/bed/service) stays plaintext — Interno redesign deferred. Password iteration versioning (schema/007) also built, not deployed. See `docs/core/15-security.md` "Deploy status". Before deploying: resolve the personal-Cloudflare-account + no-DPA gaps in the compliance review above, and re-verify PBKDF2 iteration values against a real D1 migration — the 2026-08-14 incident that broke Nube login for two days was exactly this kind of change. |
| Nube E2EE — existing-room backfill | `docs/superpowers/plans/2026-08-17-nube-e2ee-existing-room-backfill.md` — **implemented, confirmed in code 2026-08-25** (this row was stale — said "not yet implemented" while `room-dek-migrate.mjs: sweepRoomForPlaintextContent` already shipped it). Closes the gap where the above only encrypts NEW rooms. Owner's device auto-generates + backfills the DEK and re-encrypts already-stored plaintext content on next login, one entity (patient/lab/todo) at a time so one oversized row can't block the rest. Still gated behind `NUBE_E2EE_ENABLED = false` in `room-dek.mjs` along with the rest of Stage 0 — see the deploy-plan row below. |
| Nube E2EE — deploy plan | `docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md` — **planned 2026-08-23, not started.** Three-stage rollout (Worker deploy → canary room → cohort app update) to move the built-and-tested client E2EE from repo to production without repeating the 2026-08-14 login outage. Confirmed same day: production `room_state` is already whole-row encrypted via shared `WORKER_DATA_KEY` (not client E2EE — Cloudflare still holds the key). Go/no-go checklist and rollback steps inside; see also `docs/core/15-security.md` "Deploy status" (corrected same day — it previously said prod was plaintext). **2026-08-24 update:** 8.2.0 switched the room key from password-derived to room-code-derived (see release commits), and the Worker now rejects any pre-8.2.0 client at login/register *and* on every `/rooms` request (`auth-util.js` `assertNubeAppVersion`, `routes.js`) — the old-vs-new key-mismatch risk this plan flagged is closed. Stage 0 items 2–4, 6–7 confirmed done in code; item 1 (per-member password wrap) was superseded by the room-code design, not built as originally specced. Stage A itself (local `wrangler dev` rehearsal) has **not** been run yet — handoff for that is `docs/superpowers/plans/2026-08-24-stage-a-local-rehearsal-handoff.md`. |
| Nube E2EE blind-relay spec | **Idea only, spec file never written, not built, not adopted.** Bigger alternative redesign (server never sees any metadata, merge moves client-side). Explicitly shelved in favor of the two rows above — do not implement unless the user revisits this decision. |
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

New CSS must use tokens from `public/tokens.css` (`--radius-*`, spacing, color), not hardcoded hex/radius/spacing values. `scripts/spacing-ratchet.mjs` (2026-09-03: removed — it never blocked a real value, only forced a baseline bump most releases; see PLAN.md `#shrink-guardrails`) used to count hardcoded `padding`/`margin` px values in `public/styles/*.css` and fail the build if that count grew. Icons remain a known deferred gap: 65+ hand-rolled inline SVGs with no shared icon library, not fixed in this pass — revisit only if a future feature needs new icons.

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

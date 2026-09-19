# Make sync feel instant and the app lighter on old devices

Date: 2026-09-16
Owner: unassigned — implementable by `lead-dev` (Sonnet) item by item
Source: four codebase audits (2026-09-16). Findings re-verified against the code before this plan was written.

Scope: seven audit findings. **Six are worth doing (all size S). One is cut** — its premise did not survive verification (see `{#monitoreo-clone}`).

No clinical PHI anywhere in this plan or in any test it asks for. All fixtures are synthetic.

---

## decisions

Recorded before implementation, per AGENTS.md.

1. **Item 3 swaps the proposed fix.** The audit asked for a throttle/debounce plus a cached `Intl` formatter. The platform already solves it: `matchMedia().addEventListener('change')` fires only when the breakpoint is crossed, not on every resize tick. That is a one-line swap that beats a throttle and needs no formatter cache. Taking the platform rung.
2. **Item 4 does NOT narrow the observer target.** The audit asked to narrow `MutationObserver` to the modal root. Narrowing this observer risks breaking the focus trap for dynamically injected modals — an accessibility regression in a closed area. We coalesce the callback instead and keep the same observation scope.
3. **Item 6 adds no loading indicator.** The 3s wait is near-dead code (proven below), so the fix removes the wait rather than decorating it. Building a spinner for a wait that no longer exists is scaffolding.
4. **Item 7 is cut from the batch.** Both of the audit's stated reasons for it are factually wrong. Keeping the clone.
5. **Item 2 ships as three commits, not one.** The working tree holds three unrelated changes.

---

## Make cloud sync feel instant {#sync-instant}

files: [public/js/features/cloud-sync/**]

- [ ] Encrypt and decrypt a batch of sync ops all at once instead of one at a time {#parallel-crypto}
      tech: `public/js/features/cloud-sync/cloud-sync-crypto-wire.mjs` — replace the serial `for...await` loops in `encryptOpsForPush()` (lines 44-55) and `decryptOpsFromPull()` (lines 62-73) with `Promise.all(ops.map(...))`.
      from: agent
      effort: S
      impact: push is bounded at 16 ops per chunk (`CLOUD_CWND_MAX_OPS`, `cloud-sync-timing.mjs:170`), so the push win is small and free; the real win is the pull side, where a backlog drain can carry hundreds of ops (the pacer comment cites a 319-op backlog) and today pays one serial await per op. The audits gave no measured millisecond number for this item — do not invent one.

  **Current shape.** Both functions build an `out` array by `push`-ing inside a `for (const op of ops)` loop, `await`-ing `encryptValue` / `maybeDecrypt` one op at a time. Each op is independent; no op reads another op's result.

  **Proposed diff shape.** Keep the guard clauses and the per-op branch exactly as they are; only the iteration changes:

  ```js
  export async function encryptOpsForPush(dek, ops) {
    if (!dek || !Array.isArray(ops)) return ops;
    return Promise.all(
      ops.map(async (op) =>
        op && typeof op === 'object' && isEncryptedContentPath(op.path)
          ? { ...op, value: await encryptValue(dek, op.value) }
          : op
      )
    );
  }
  ```

  `decryptOpsFromPull` gets the identical treatment, keeping its `isEncryptedEnvelope(op.value)` branch and its `maybeDecrypt` call. Preserve the existing JSDoc and the `/** @type {any} */` casts — this file is type-checked.

  **Why it is safe.**
  - *Ordering is preserved by construction.* `Promise.all` resolves to results in input-iterable order regardless of settle order, so the question of whether downstream relies on op order does not need answering — the output array is index-for-index identical to today's. The only consumer is `public/js/features/cloud-sync/api-client.mjs`: line 105 (`data.ops = await decryptOpsFromPull(dek, data.ops)`) and line 116 (`ops: await encryptOpsForPush(dek, body.ops)`). Both reassign the array whole.
  - *The pattern is already in this file.* `decryptRoomStateFromPull` (lines 175-196) and its three helpers already use unbounded `Promise.all` over every entry, lab sidecar and todo in a room — and its own comment says this is deliberate for the 8-room admin census pull. The new fan-out is strictly smaller than what already ships.
  - *Fan-out is bounded on push.* `createDrainPacer` caps a push chunk at `CLOUD_CWND_MAX_OPS = 16`, so at most 16 concurrent AES-GCM calls.
  - *Error semantics hold.* `decryptOpsFromPull` cannot reject — `maybeDecrypt` swallows failures per field by design. `encryptOpsForPush` can: today the first throw aborts before later ops start, with `Promise.all` all calls launch and the first rejection still propagates out of `push()`. Same error surfaces to the caller, and `Promise.all` absorbs the siblings so there is no unhandled rejection.

  **Test that must pass:** `npm run test:one -- public/js/features/cloud-sync/cloud-sync-crypto-wire.test.mjs` — all three existing cases in `describe('encryptOpsForPush / decryptOpsFromPull')` must pass **unchanged**. They already assert per-index results (`encrypted[0]`, `encrypted[1]`, `decrypted[0]`), which is exactly the ordering guarantee at risk. Do not edit that test file; if it needs editing, the change is wrong.

  **RISK — closed area.** CLAUDE.md declares "Nube crypto" closed. This file is Nube crypto. The change alters no crypto: same `encryptValue`/`decryptValue` calls, same arguments, same envelopes, same order, same key handling — only the scheduling of independent calls. **Confirm with the user before starting this item.** See "Open questions", Q1.

- [ ] Land the sync-responsiveness work already sitting in the working tree {#land-pending}
      tech: review and commit the uncommitted changes to `cloud-sync-timing.mjs`, `pull-apply.mjs`, `panel-conexion-bootstrap.mjs`, `panel-conexion-views.mjs`, and the deletion of `remote-patient-delete-confirm.mjs`.
      from: agent
      effort: S
      impact: `CLOUD_PUSH_FIRST_MS` 600 → 0 removes a 600ms delay before the first push of every edit burst; the remote-delete removal drops 608 lines and one modal from the pull path.

  **Current state of the working tree.** Verified 2026-09-16. It holds **three unrelated changes**, not one:

  | Group | Files | What it is |
  |---|---|---|
  | A — sync responsiveness | `cloud-sync-timing.mjs`, `pull-apply.mjs` (+`.test.mjs`), `panel-conexion-bootstrap.mjs`, `panel-conexion-views.mjs` (+`.test.mjs` deleted), `remote-patient-delete-confirm.mjs` (+`.test.mjs`) deleted | the intended item |
  | B — unrelated | `public/js/features/workbench/undo-toast.mjs` (+`.test.mjs`) | adds an auto-dismiss timer to the undo toast |
  | C — unrelated | `stable-versions.json` | marks 8.3.8 recommended, demotes 8.3.7 — leftover from the 8.3.8 release; commit `f8406de9` shipped only `dist/latest*.yml` and missed this file |

  **Correction to the brief: commit as three changes, not one.** Group C belongs to the already-published 8.3.8 release and should go out on its own so the release record stays readable. Group B is a behaviour change with its own test update and no relation to sync.

  **What the Group A diff actually does** (read before committing):
  - `cloud-sync-timing.mjs`: `CLOUD_PUSH_FIRST_MS` 600 → 0, with a comment. Nothing else in the module changes.
  - `pull-apply.mjs`: `applyCloudTombstones` loses its `entityVersions` parameter and now applies every tombstone that passes `shouldApplyCloudTombstone` directly, instead of partitioning into silent-vs-confirm and scheduling a modal. The `resolveCloudActorId` import goes too.
  - `panel-conexion-bootstrap.mjs` / `panel-conexion-views.mjs`: drop the `review-remote-delete` click action and the pending-deletes row.
  - **Behaviour change to eyeball, not just a perf change:** a remote patient deletion made by another user now applies locally with no confirmation prompt. Confirm that is the intended product decision before committing — it is the one part of this group that is not purely internal.

  **Test that must pass:** `npm run test:one -- public/js/features/cloud-sync/pull-apply.test.mjs`. The new case `applies every eligible tombstone directly, with no pending-confirm notification` is already written and asserts the removal. Also run `npm run test:one -- public/js/features/workbench/undo-toast.test.mjs` before committing Group B.

  Then `npm run build:ui` (renderer sources changed) and `npm run metrics:check` before merge.

  **The working tree is live — re-check it before you start.** The table above was taken at 2026-09-16 and is already stale: a concurrent session added `public/js/features/todos-list-render.mjs`, `public/js/ui-motion.mjs` (+`.test.mjs`), `public/styles/motion.css` (a fourth, motion-related group), plus a `typescript: 6.0.3` entry under `overrides` in `package.json` with a regenerated `package-lock.json`, and a one-line edit to `docs/core/20-claude-code-handoff.md`. Run `git status` yourself and re-derive the grouping at execution time. The rule to carry forward is the rule, not the table: **one commit per unrelated concern.** Ask the user about any group you cannot attribute — do not sweep unknown work into the sync commit.

---

## Make the app lighter on old devices {#lowend}

files: [public/js/app.js, public/js/modal-dismiss.mjs, public/js/features/settings-help/tour-step-actions.mjs]

- [ ] Stop recomputing the header date on every resize tick {#header-date-resize}
      tech: `public/js/app.js:524` — replace the `resize` listener with a `matchMedia('(max-width: 920px)')` `change` listener.
      from: agent
      effort: S
      impact: removes two `toLocaleDateString('es-MX', …)` calls plus a `matchMedia()` construction per resize frame (≈60/s while dragging a window) and turns them into two per session.

  **Current shape.** `app.js:521-525` calls `syncHeaderTodayDate()` once, then wires `window.addEventListener('resize', syncHeaderTodayDate)` behind a `window._rpcHeaderDateResizeWired` guard. `syncHeaderTodayDate` (`app.js:373-392`) builds two `toLocaleDateString('es-MX', …)` strings — the expensive part — then calls `window.matchMedia('(max-width: 920px)').matches` and picks one of the two.

  **Proposed fix.** The only thing resize can change here is which side of the 920px breakpoint we are on. Listen for that directly:

  ```js
  if (!window._rpcHeaderDateResizeWired && typeof window.matchMedia === 'function') {
    window._rpcHeaderDateResizeWired = true;
    window.matchMedia('(max-width: 920px)').addEventListener('change', syncHeaderTodayDate);
  }
  ```

  Leave `syncHeaderTodayDate` itself untouched. **No throttle and no cached `Intl.DateTimeFormat` are needed** — the handler now runs on breakpoint crossings only, so there is nothing left to amortise. This is the swap recorded in decision 1.

  **Why it is safe.** `syncHeaderTodayDate` has exactly three references, all in `app.js` (definition at 373, direct call at 521, listener at 524) — no other module imports it. The direct call at line 521 still does the initial paint, which matters because a `change` listener does not fire on load. Behaviour at the breakpoint is identical. The date text does not refresh at midnight today either (it only refreshed if the user happened to resize), so nothing regresses. Keep the `typeof window.matchMedia === 'function'` guard: `syncHeaderTodayDate` already guards it, so some target lacks it.

  **Test:** `public/js/app.js` has no colocated test and is not a covered file, so none is required by `.claude/rules/tests-with-code.md`. Verify live: run the app, drag the window across 920px both ways, confirm the header date switches between the long and compact forms and that the `title` tooltip still holds the long form.

  **RISK — mild, closed area.** Header chrome is UI. This is a listener swap with no visual change, but note it when reporting.

- [ ] Stop re-running the focus-trap check once per DOM mutation {#focus-trap-coalesce}
      tech: `public/js/modal-dismiss.mjs:288-294` — coalesce the `MutationObserver` callback into one `requestAnimationFrame` per burst. Do **not** narrow the observed target.
      from: agent
      effort: S
      impact: collapses a burst of N mutation records during a modal open/close into a single `syncFocusTrap()` run. Lower than the audit implied — see the correction below.

  **Correction to the audit.** The brief says the observer uses "default options (`{attributes:true, subtree:true}`)". It does not. The real call is:

  ```js
  new MutationObserver(syncFocusTrap).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'aria-hidden'],
  });
  ```

  The `attributeFilter` is already there, so the callback only fires for three attributes, not for every attribute change on the page. The remaining cost is that one modal open can still flip several of those attributes and fire `syncFocusTrap` several times in the same frame.

  **What the callback needs.** `syncFocusTrap` (lines 222-243) re-reads `layer.isOpen()` across the whole `layers` registry, pops the focus stack for anything that closed, and steals focus for a newly topmost panel. It reads **state, not the mutation records** — it never inspects the `MutationRecord` argument. So running it once per frame instead of once per record produces the same result.

  **Proposed fix.** Inside `init()`, wrap the callback:

  ```js
  var trapFrame = 0;
  new MutationObserver(function () {
    if (trapFrame) return;
    trapFrame = requestAnimationFrame(function () {
      trapFrame = 0;
      syncFocusTrap();
    });
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden'] });
  ```

  **Why NOT to narrow the target** (decision 2). Each registered layer exposes `backdropEl()` as a *lazy* getter — `resolvePanel()` calls it on demand because modals are injected into the DOM after registration. Observing a fixed list of backdrop elements at `init()` time would silently miss every modal created later, and the failure mode is a dialog with no focus trap: a keyboard and screen-reader regression, in the closed "UI bugs" area. Narrowing to `#main-area` has the same defect — modals render outside it. The coalescing version keeps the exact observation scope and cannot change which layers are tracked.

  **Why it is safe.** The nine tests in `public/js/modal-dismiss.test.mjs` all drive the trap through `reg.checkFocusTrap()` (the exported alias of `syncFocusTrap`, see the registry return at lines 305-312) and never construct a `MutationObserver` or call `init()`. Deferring the *observer* path by one frame is therefore invisible to the suite. At runtime a one-frame (~16ms) delay before focus moves into a newly opened modal is below perception and matches modal entry animation anyway.

  **Test that must pass:** `npm run test:one -- public/js/modal-dismiss.test.mjs` — all nine unchanged. Then verify live: open Ajustes, open a confirm dialog on top of it, press Escape, and confirm focus returns to the right place each time.

  **RISK — closed area.** Focus trapping is accessibility and UI. Confirm with the user before starting. If the answer is "leave it closed", this item is the cheapest of the seven to drop: with `attributeFilter` already in place, its remaining cost is small. See Q2.

- [ ] Slow the onboarding-tour poll and let the real events drive it {#tour-poll}
      tech: `public/js/features/settings-help/tour-step-actions.mjs:302` — raise the `setInterval` from 300ms to 800ms and add `input` + `change` to the listeners already wired in `armTourActionPoll`.
      from: agent
      effort: S
      impact: 3.3 timer wakeups per second → 1.25, for the whole time the guided tour is on a step that waits for a user action.

  **Current shape.** `armTourActionPoll()` (lines 299-308) runs only when `tourState.guidedTourActive && stepRequiresUserAction(tourState.tourStepId)`. It starts `setInterval(syncTourActionNextButton, 300)` **and** already registers `click` and `toggle` capture listeners that call the same function. `clearTourActionPoll()` (lines 287-297) tears all of it down.

  **Why the poll cannot simply be deleted.** `syncTourActionNextButton` (lines 345-354) runs five checks. Three are already covered by the existing listeners — `syncConnectionTourNext` and `syncGuardiaToggleTourNext` react to clicks, `syncMobileInviteTourNext` reacts to a `<details>` `toggle`. Two are not:
  - `syncServicioDefaultTourNext` reads `rt.getSettings().defaultServicio`, which the user **types**. Typing fires `input`/`change`, never `click`.
  - `isMobileInviteExpandedForTour` also returns true when a `canvas` appears inside `.cloud-mobile-invite-qr-host`. That canvas is drawn asynchronously after the QR renders, with no event to hook.

  **Proposed fix.** Both halves, in the same edit:

  ```js
  tourState.tourActionPollTimer = setInterval(syncTourActionNextButton, 800);
  tourState.tourActionClickHandler = function () { syncTourActionNextButton(); };
  ['click', 'toggle', 'input', 'change'].forEach(function (evt) {
    document.addEventListener(evt, tourState.tourActionClickHandler, true);
  });
  ```

  Mirror the list in `clearTourActionPoll()` so every listener is removed — the existing teardown removes `click` and `toggle` explicitly and must stay symmetric, or the tour leaks listeners across steps.

  The added `input`/`change` listeners are what make 800ms safe: without them, the `servicio_default` step would take up to 800ms to enable "Siguiente" after the user finishes typing. With them it stays instant, and the slower poll is only a backstop for the async QR canvas.

  **Why it is safe.** `armTourActionPoll` / `clearTourActionPoll` are the only writers of `tourState.tourActionPollTimer` and `tourState.tourActionClickHandler`. `syncTourActionNextButton` is idempotent — every branch only calls `enableTourNextButton`, which sets `display`, `disabled` and `textContent` to fixed values. Firing it more often from more event types cannot produce a different end state. The whole mechanism is gated on `tourState.guidedTourActive`, so nothing runs outside the tour.

  **Test:** no colocated test exists for `tour-step-actions.mjs`. `public/js/tour-targets.test.mjs` covers `stepRequiresUserAction`, which this change does not touch — run it as a regression check: `npm run test:one -- public/js/tour-targets.test.mjs`. Verify live: start the guided tour, reach the `servicio_default` step, type a servicio, confirm "Siguiente" enables immediately; reach `gv7_mobile_link`, expand the invite, confirm it enables within ~1s.

  **RISK — mild, closed area.** The onboarding tour is UI. Behaviour is unchanged for the user; only the timer rate moves.

- [ ] Cut the three-second blank wait before the app paints {#boot-db-wait}
      tech: `public/js/app.js:206` — reduce the readiness loop from 60 iterations to 10 (3s → 500ms ceiling). No loading indicator.
      from: agent
      effort: S
      impact: removes up to 2.5s of dead wait before DOM boot in the degraded case. In a normal Electron desktop boot the loop already exits on iteration 0 — see below.

  **Current shape.** `app.js:204-223`:

  ```js
  const appStateReady = (async function loadClinicalStateOnBoot() {
    if (isElectronDesktopShell() && !isDbMode()) {
      for (let i = 0; i < 60 && !isDbMode(); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    …
  ```

  The audit's claim that this gates DOM boot is **correct**: `app.js:351` defines `runtimesReady = appStateReady.then(…)`, and `runDomBoot()` at line 506 waits on `runtimesReady` before calling `runDomBootAfterState()`, which is what mounts the shell, renders the patient list and paints the header.

  **The key fact the audit missed.** `isDbMode()` (`public/js/db-storage-bridge.mjs:39-45`) is a pure capability probe: `window.electronAPI && typeof window.electronAPI.dbClinicalLoadAll === 'function'`. `electronAPI` is exposed by a single **synchronous** top-level `contextBridge.exposeInMainWorld('electronAPI', { … })` at `preload.js:3`, with `dbClinicalLoadAll` inside that same object literal at `preload.js:150`. There is no conditional and no deferred exposure, and preload runs to completion before any renderer script. So in a real Electron desktop renderer `isDbMode()` is already true when line 206 runs and the loop never iterates.

  The loop can only spin in a shell that *looks* like Electron to `isElectronDesktopShell()` — via the `/\bElectron\//` user-agent test or `window.__RPC_ELECTRON_DESKTOP__` — but has no working preload. In that case it burns the full 3s and then falls through: `isDbMode()` is still false, `isWebClinicalClient()` returns false (because `isElectronDesktopShell()` is true), so it lands on `initAppState()` — the same place it would have reached immediately. The 3s buys nothing.

  **Proposed fix.** One number:

  ```js
  // preload exposes electronAPI synchronously, so this normally exits on i=0;
  // short budget only covers a slow/failed preload before falling back.
  for (let i = 0; i < 10 && !isDbMode(); i += 1) {
  ```

  **No loading indicator** (decision 3). The fix removes the stall rather than masking it; a spinner would be UI built for a wait that no longer exists, and it would mean touching the closed UI area for no gain. If a future measurement shows the remaining 500ms is visible, `window.__rpcOnboardingBootProgress` already exists at `public/js/clinical-onboarding-boot-progress.js` and is the thing to reuse — do not write a new one.

  **Why it is safe.** The loop's exit condition is unchanged; only the ceiling moves. The success path (preload present) is bit-for-bit identical because the loop does not execute. The degraded path reaches the same `initAppState()` fallback 2.5s sooner. `ensureClinicalDbUnlocked()` (`public/js/features/db-unlock-boot.mjs:82`) and the `loadClinicalStateFromDb()` error handling at `app.js:241-247` are untouched, so a genuinely locked or failed DB still shows its toast through `describeClinicalDbBootFailure`.

  **Test:** `public/js/app.js` has no colocated test and is not covered. Verify live on the Electron app: cold boot, confirm the shell paints and the patient list renders as before. Per the standing rule, confirm on screen in the running app — not from a build alone. If the app was rebuilt, clear `Cache`, `Code Cache` and `GPUCache` under the `r-plus` userData dir before judging.

---

## Cut from this batch

- [ ] ~~Shrink the monitoring snapshot taken on patient save~~ — **CUT. Do not implement.** {#monitoreo-clone}
      tech: `public/js/features/patients-modal-commit.mjs:372-374`, `structuredClone(patient.monitoreo)` in `buildPatientEntry`.
      from: agent
      effort: S (if it were done)
      impact: ~0. Keeping the clone.

  **Both premises in the finding are false.** Verified 2026-09-16:

  1. *"on every patient save"* — no. `buildPatientEntry` is **not on the save path**. Patient edits mutate the live object in `getPatients()` and call `persistClinicalState()` directly. `buildPatientEntry` runs only on cloud push (`cloud-census-collect.mjs:60-63`, `cloud-census-sala-push.mjs:145`) and on export/backup (`export-backup.mjs:70`, `export-patients-selection.mjs:11`, `sync-crypto.mjs:73`).
  2. *"for the undo feature"* — no. There is no patient-snapshot undo in the codebase. `public/js/features/workbench/undo-toast.mjs` is a toast with a callback; it stores no snapshot. Git history points the same way: the clone entered in `62770314` (2026-05-26, "R+ 6.2.0 — Estado Actual estructurado — monitoreo en Sala") — the release that *introduced* monitoreo. It is a defensive copy written alongside the feature, not a fix for an observed bug.

  **Why keeping it is right.** The clone stops a live patient's `monitoreo` object from being aliased into an export or push payload. None of the five callers mutates it today, but this is a data-integrity guard on clinical data, and CLAUDE.md's "never cut" list covers exactly that. The upside for removing it is close to zero anyway: on the push path the very next step is `fitMonitoreoToQuota` (`public/js/features/cloud-sync/cloud-op-slim.mjs:129-151`), which JSON-serialises the whole object to measure it — strictly more expensive than the clone it would replace. The cost is dominated by work that stays either way.

  **The real issue underneath, for a different plan.** `monitoreo.historial` (`public/js/features/estado-actual-data-model.mjs:56-70`) is an **unbounded array** locally. `fitMonitoreoToQuota` trims only the cloud payload, at a 150KB cap, and returns a new object — it never trims the patient. On a long-lived local DB that array grows without limit, which is a genuine old-device problem. That is new scope, not a fix to this line. See Q3.

---

## Open questions for the CEO reviewer

**Q1 — `{#parallel-crypto}` touches a closed area. Blocking.**
CLAUDE.md declares "Nube crypto" closed, and `cloud-sync-crypto-wire.mjs` is Nube crypto. The change alters no cryptographic behaviour — identical calls, arguments, envelopes, key handling and output order — it only stops awaiting independent calls one at a time. Needed: confirm this counts as a distinct perf change rather than reopening the closed issue. Without that confirmation, do not start item `{#parallel-crypto}`.

**Q2 — `{#focus-trap-coalesce}` touches the closed UI/accessibility area. Blocking, and the cheapest item to drop.**
The audit overstated the cost (an `attributeFilter` is already in place), and the safe fix is a one-frame coalesce with no scope change. If reopening the area is unwelcome, dropping this item loses the least of the six.

**Q3 — `monitoreo.historial` grows without a local cap. Not scheduled.**
Surfaced while disproving item 7. Only the cloud payload is trimmed; the local array is unbounded. Worth its own plan if old-device memory is a real complaint — flagging, not scheduling.

**Q4 — the no-confirmation remote delete in `{#land-pending}` is a product decision, not a perf one.**
After the pending diff lands, a patient deleted by another user disappears locally with no prompt. Confirm that is intended before committing Group A.

**Q5 — three unrelated change groups are sitting uncommitted.**
The brief described item 2 as one commit. It is three (sync work, undo-toast auto-dismiss, and the `stable-versions.json` leftover from the 8.3.8 release that commit `f8406de9` missed). Confirm the three-commit split, and confirm the undo-toast change is wanted at all — it is not part of this perf batch.

---

## Order of work

All six live items are independent and size S. Suggested order — unblocked and lowest-risk first:

1. `{#land-pending}` — already written, just needs review and three commits.
2. `{#boot-db-wait}` — one number, biggest perceived win.
3. `{#header-date-resize}` — one line.
4. `{#tour-poll}` — one function.
5. `{#parallel-crypto}` — after Q1 is answered.
6. `{#focus-trap-coalesce}` — after Q2 is answered.

Renderer sources change in every item, so `npm run build:ui` after each, and `npm run metrics:check` before merge. Use `npm run test:one -- <path>` only; never the full suite.

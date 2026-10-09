# 3 · Shared state & how features talk

> **You'll learn:** where the patient record lives while the app runs, what happens on every edit (two separate save paths), how data pulled from Nube reaches the screen, what happens when you click another patient, and the ten or so mechanisms features use to reach each other. This chapter explains why R+ code looks the way it does.
>
> **Prereqs:** [02](./02-how-the-app-is-built.md) (renderer, IPC, `data-onclick`, runtime `ctx`)

---

## The mental model

1. There is **one big in-memory record** (`app-state.mjs`). Features read it with getters that return **live objects**, and they change it **in place**.
2. After changing it, a feature asks for **two independent things**: a local save (`persistClinicalState()`) and, if Nube is on, a cloud push (`scheduleCloudSyncPush()`). Nothing does both for you.
3. Data coming *in* from Nube is written into the same in-memory record, and then specific render functions are **called directly**. There is no global "state changed" event that re-renders the app.
4. Features find each other through a shared **runtime context** (`rt`), **window handlers**, a few **DOM events**, and **lazy imports**.

```
                      ┌────────────── app-state.mjs ──────────────┐
  feature code ──────►│ patients · notes · indicaciones · labHistory│◄────── pull-apply.mjs
  getNotes()[pid].x=v │ medReceta · listado · vpo · …  (live refs)  │  applyLanPatientEntries
                      └────────────────────────────────────────────┘
        │                                    │
        │ persistClinicalState()             │ scheduleCloudSyncPush()
        ▼  (400 ms debounce)                 ▼
  IPC 'db:clinical-command'          mutate-bridge → outbox → POST /mutations
  → SQLite clinical_blob             (re-reads memory, builds ops)
```

---

## 1. Three layers that hold state

| Layer | File | Returns | Who uses it |
|---|---|---|---|
| **Working copy** | `public/js/app-state.mjs` | **live references**: `getNotes()` gives you the actual object | almost every feature (112 importers) |
| **Read model** | `public/js/clinical-read-model.mjs` | **copies** (`structuredClone`) plus a subscribe API | fed by persist echoes and eventualidades; its `subscribeClinicalReadModel()` has **no subscribers** today |
| **Storage cache** | `storage.js`, `storage/storage-core.mjs`, `db-storage-bridge.mjs` | raw blobs from SQLite (desktop) or localStorage (legacy/web) | boot hydrate, save |

**Blob keys**, the same name on every layer:

| App field | SQLite `clinical_blob.blob_key` | Legacy localStorage key |
|---|---|---|
| patients | `patients` | `rpc-patients` |
| notes | `notes` | `rpc-notes` |
| indicaciones | `indicaciones` | `rpc-indicaciones` |
| labHistory | `labHistory` | `rpc-labHistory` |
| medRecetaByPatient | `medRecetaByPatient` | `rpc-medRecetaByPatient` |
| listadoProblemas | `listadoProblemas` | `rpc-listado-problemas` |
| vpoByPatient | `vpoByPatient` | `rpc-vpoByPatient` |
| medPharmProfileByPatient | `medPharmProfileByPatient` | `rpc-medPharmProfileByPatient` |
| medCatalog | `medCatalog` | `rpc-medCatalog` |
| todos | `todos` | `rpc-todos` |
| scheduledProcedures | `scheduledProcedures` | `rpc-scheduled-procedures` |

The mapping lives in `db-storage-bridge.mjs` (`APP_FIELD_TO_BLOB`) and must match `lib/db/clinical-blob-keys.mjs`, which is another pair that has to be kept in step.

> 💡 **The selected patient is not in app-state.** It's a plain `var activeId` in `app.js`, reachable only via `rt.getActiveId()` / `rt.setActiveId()`. The last choice is remembered in localStorage `rpc-last-patient-id`.

---

## 2. Boot: from disk to the first patient on screen

`app.js`, in order:

1. **`loadClinicalStateOnBoot()`** waits up to about 500 ms for the preload, then, on desktop:
   1. `ensureClinicalDbUnlocked()`
   2. `bootHydrateFromDb()` (`app-state.mjs`): IPC `db:clinical-load-all` → blob cache → `initAppState()` copies blobs into memory and **runs data migrations** (monitoreo shape, sala stamping, lab-history repair, removing automatic lab interpretations). If a migration changed anything, it saves immediately.
   3. `hydrateClinicalRepoIntoReadModel()`. This is a **second** `db:clinical-load-all`, this time for the read model.
   4. Legacy localStorage sweep, and flushing any pending team (clinicalOps) snapshot.
2. **`registerAllFeatureRuntimes()` + `runInitialFeatureBoot()`** (`app-runtimes.mjs`).
3. **DOM boot:** top bar → settings → `renderPatientList()` → **`selectDefaultPatientAndLoadLabs()`**. The pick order (`patients-default-id.mjs`) is: active → last selected → pinned (*fijado*) → first non-archived.
4. **Only then** the slower steps: onboarding gates, clinical access runtime, teams, join URL, then `autostartCloudSyncIfConfigured`.

Step 3 coming before step 4 is deliberate. Decision log 2026-08-13: *"Cold boot selects a census patient immediately after local hydrate … do not wait for clinical-access / Nube boot steps."*

---

## 3. The write path: two saves, independent of each other

### Local save: `persistClinicalState(opts)` (`clinical-repo-persist.mjs`)

- **Debounce:** 400 ms, unless `{ immediate: true }`. Immediate calls coalesce: if a save is already running, one follow-up runs after it.
- **Domains:** `opts.domains` limits what's saved, and pending domains **merge**, so a later "patients only" save can't cancel a pending full save.
- **Desktop:** `executeClinicalCommand({ type: 'clinical.persistSnapshot', … })` → IPC **`db:clinical-command`** → main runs it in a transaction and also records a **change log** entry. Then the snapshot is echoed into the read model.
- **Fallbacks:** `flushPersistClinicalState()` on `beforeunload` / tab hidden, and `scheduleIdleClinicalPersist()` (a full save after 8 s idle).
- **Used by 70 modules.**

A few blobs bypass it: `storage.saveTodos`, `saveMedCatalog` and `saveScheduledProcedures` write directly via `writeClinicalBlob()` → IPC **`db:clinical-save-all`**.

### Cloud push: `scheduleCloudSyncPush()` (`features/cloud-sync/mutate-bridge.mjs`)

- Does nothing unless Nube is active and the bridge is configured (`configureCloudMutateBridge` in `panel-conexion-runtime.mjs`).
- Arms one timer, then `pushCloudBundleOps()` **re-reads memory** (`collectPatientEntriesForCloudPush`) and turns it into ops (`mapBundleEnvelopeToOps`), split by sala → outbox → flush (`syncCycle`). See [10](./10-nube-sync.md).
- Some entities have their own enqueue function: `enqueueCloudTodoUpsert/Delete`, `enqueueCloudAgendaUpsert/Delete`, `enqueueCloudPatientAdmit/Delete`, `enqueueCloudLabSidecarsForPatient`, `enqueueCloudClinicalOpsValue`.
- **About 28 modules call it.**

### A third, newer path: the projector
Eventualidades (`features/eventualidades-render.mjs` → `persistEventualidades()`) runs a clinical command, then `drainClinicalSyncProjector()` reads the **change log** written by main and turns unsynced changes into Nube ops. If that fails, it falls back to `scheduleCloudSyncPush()`. This looks like where the code is heading: one command that both saves and feeds sync.

### Worked example: editing a census field
`app-shell-patient-update.mjs` → `updatePatient(field, next)`:

```js
p[field] = next;                 // 1. mutate the live object
stampCensoFieldsClock(p, field); // 2. record when this field changed (for LWW)
persistClinicalState();          // 3. local save (debounced)
renderPatientList();             // 4. repaint the sidebar
syncWorkContextChrome();         // 5. repaint header context
scheduleCloudSyncPush();         // 6. cloud push
```

> ⚠️ **The trap:** forget step 3 and the edit is lost on restart. Forget step 6 and the edit never leaves this laptop, with no error in either case. When you add a feature that edits clinical data, copy this six-step shape.

---

## 4. The read path: Nube data reaching the screen

`features/cloud-sync/pull-apply.mjs` → `applyCloudPullResult(result)`:

1. **Snapshot or ops?** `applyCloudState(state)` for a full snapshot, or `applyCloudOps(ops)` → fold (`pull-apply-state.mjs`) → `applyFoldedCloudPull`.
2. Both paths: apply clinicalOps (teams), then **`applyLanPatientEntries`** (`features/sync-apply/patient-entries.mjs`, an old name from the LAN days) mutates app-state in place. Then todos, agenda, tombstones, orphan-todo pruning.
3. If anything changed: `persistClinicalState({ domains: ['patients'] })`. Pulled data is saved locally too.
4. **The UI is refreshed by direct calls**, not events:
   - `refreshSidebarAfterCloudPull()` → `renderPatientList({ silent: true })`
   - `refreshActivePatientChartAfterCloudPull()` → `refreshActivePatientViewIfOpen()`, which **skips the repaint while you're typing** in the chart and re-arms on `focusout`.
5. **Freshness keys** stop needless repaints: `innerTabRenderCacheKey()` (`features/expediente-inner-cache.mjs`) mixes patient id, lab-history revision, EA revision and `updatedAt` stamps, and an unchanged tab isn't redrawn.

---

## 5. What happens when you click another patient

`selectPatient(id)` in `features/patients-select.mjs`. The fast part runs immediately and the heavy part 120 ms later:

| Phase | Step | Why |
|---|---|---|
| **Now** | `stashPatientDraftsOnChange(prev)` | keep half-typed med/VPO input for the previous patient |
| | `invalidateInnerTabRenderCache()` | |
| | `setActiveId(id)` + `writeLastSelectedPatientId(id)` | |
| | `dropOtherPatientsLabOutput()` | never show patient A's parsed labs on patient B |
| | highlight in sidebar, show chart shell, EA button, header context | instant feedback |
| **+120 ms** (`scheduleTrailing`, re-deferred while input is pending) | `refreshExpedienteAfterPatientSelect()` → render the active inner tab | the expensive part |
| | lab history / med panel if those tabs are open | |
| | `refreshTendenciasOrCultivosPanel()` | |
| | scroll the census card into view, silent update check, save | |

The 120 ms delay plus `navigator.scheduling.isInputPending()` let you hold J/K to flip through patients quickly without the app rendering every chart along the way.

---

## 6. The connection mechanisms

| Mechanism | How it works | Example |
|---|---|---|
| **Live state getters** | `app-state.mjs` returns mutable refs | `getNotes()[pid].estudios = …` |
| **Local persist** | `persistClinicalState()` → `db:clinical-command` | every editor |
| **Nube push** | `scheduleCloudSyncPush()` → outbox | `touchDoc()` in notes-indicaciones |
| **Projector drain** | main's change log → ops | eventualidades |
| **Runtime context `rt`** | `registerXRuntime(ctx)` does `Object.assign(rt, ctx)`; call `rt.fn()` | labs call `rt.selectPatient(match.id)` when a paste belongs to another patient; meds call `rt.navigateToEstadoActualPanel()` |
| **Lazy proxies** | ctx entries that forward once the module loads | `labsRuntimeProxies.renderLabHistoryPanel` |
| **Window handlers** | `data-onclick="fn"` → `window.fn` | `procesarReporte` |
| **Late-bound bridge** | stub object filled in later, to break import cycles | `patientsBridge.selectPatient` |
| **Dynamic import + call** | `await import(...)` then call | pull-apply → `renderPatientList` |
| **DOM CustomEvents** | `document.dispatchEvent(new CustomEvent('rpc-…'))` | `rpc-clinical-teams-changed` (26 senders, 9 listeners), `rpc-clinical-ops-synced`, `rpc-cloud-outbox-changed`, `rpc-clinical-onboarding-finished` |
| **Revision keys / listeners** | skip work unless a counter moved | `bumpLabHistoryRevision` → dashboard |
| **⌘K palette** | ranked items → `selectPatient` / `switchAppTab` / action handlers | `command-palette-model.mjs` |
| **Keyboard shell** | capture-phase keydown; Electron menu shortcuts arrive as `shell-shortcut` IPC | ⌘1…, ⌘K, ⌘⇧C, `[` `]` |

### Why so many?
They were added at different times for different reasons. `rt` replaced importing app.js internals. Window handlers exist because of the CSP. Lazy proxies keep the boot bundle small (there's an **eager-boot file budget** enforced by `metrics:check`). DOM events are used where many unrelated listeners care, mostly around teams. Knowing which one a feature uses tells you where to look when it breaks.

### Loose ends found while mapping
- `rpc-app-tab-changed` is dispatched (`features/app-tabs.mjs`) but nothing listens.
- `rpc-interno-vitals-synced` is listened for (EA panel, guardia board) but nothing in the repo dispatches it.
- `subscribeClinicalReadModel()` has no subscribers.
- Boot reads the whole DB twice (`ensureStorageHydrated` and `hydrateClinicalRepoIntoReadModel`).

These are listed in [13](./13-open-questions-and-doc-drift.md).

---

## Check yourself

1. You add a new field "alergias" to the patient and edit it in a form. List the calls your save handler needs.
2. A colleague's Nube edit arrives while you're typing in the note. What protects your typing?
3. Why does `selectPatient` call `dropOtherPatientsLabOutput()` before anything else renders?
4. You need the census to update when teams change. Which mechanism would you hook into?

<details><summary>Answers</summary>

1. Mutate the live patient, stamp the field clock (for LWW), `persistClinicalState()`, re-render what shows it, `scheduleCloudSyncPush()`. You also need to make sure the cloud mapping includes the field.
2. `refreshActivePatientViewIfOpen()` skips the repaint while a field in `#patient-view` has focus and retries on `focusout`.
3. Patient safety: parsed lab output must never appear under the wrong patient.
4. The `rpc-clinical-teams-changed` / `rpc-clinical-ops-synced` DOM events.
</details>

**Next:** [04 · The feature map →](./04-feature-map.md)

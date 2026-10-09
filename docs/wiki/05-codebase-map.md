# 5 · The codebase map

> **You'll learn:** how R+'s ~1,200 source files group into areas, which areas lean on which (measured from real `import` statements, not guessed), the hub files almost everything depends on, the three ways code crosses a runtime boundary, and how to trace a dependency yourself.
>
> **Prereqs:** [02](./02-how-the-app-is-built.md) (main / preload / renderer), [03](./03-shared-state-and-wiring.md) (shared state)

---

## How this map was made

A script read every `.mjs` / `.js` / `.cjs` file under `packages/core/public/js`, `packages/core/lib`, the three Workers in `packages/core/cloud/`, `packages/im` and `packages/shared-signing`. It skipped tests, bundles and vendor code, which leaves **1,205 files**. It resolved every `import`, `export … from`, dynamic `import()` and `require()` to a real file, then grouped files into **23 areas by path and file name**. For example, `estado-*`, `ea-*` and `monitoreo*` are *Estado actual*, and `cloud-sync/` is *Nube sync*.

Result: **1,680 imports cross from one area into another**, along 180 distinct area-to-area paths.

> ⚠️ Grouping by file name is a heuristic. A few files land in a neighbouring area (for example, `notes-indicaciones.mjs` is the main notes UI, but a lot of note logic sits under labs and Estado actual). Treat the counts as "how tangled", not as exact ownership. The script lives with the wiki skill (`.claude/skills/codebase-wiki/artifact/import_graph.py`), so you can re-run it after big refactors.

---

## The layers

```
┌──────────────────────────── RENDERER (Chromium page) ─────────────────────────────┐
│  Feature areas: Labs · Tendencias · Estado actual · Medications · Notes · Census   │
│  Expediente · Pendientes · Teams & guardia · Interconsultas · Profile/settings     │
│  Nube sync · Phones · Updates UI                                                    │
│        │ import                                                                     │
│        ▼                                                                            │
│  Renderer core:  Storage & state   Access & identity   App shell & platform        │
└──────────┬───────────────────────────────────────────────────────┬────────────────┘
           │ IPC (window.electronAPI, ~140 call sites)              │ HTTPS + WebSocket
           ▼                                                        ▼
┌──────── NODE (Electron main) ────────┐                ┌──── CLOUDFLARE WORKERS ────┐
│ Electron main · Local DB · Doc gens   │                │ Nube Worker · Equipos Worker│
│ Updates & signing                     │                │ update-worker               │
└──────────┬────────────────────────────┘                └──────────┬─────────────────┘
           │ import                                                   │ import
           ▼                                                          ▼
   ┌──────────────────── Shared logic (lib/) — imported by all three ───────────────────┐
   │ clinical-salas · entrega/* · clinical-scope/* · interno/* · lab-mobile-history-window │
   └─────────────────────────────────────────────────────────────────────────────────────┘
```

There are three ways code reaches across a boundary:

| Boundary | Mechanism | Example |
|---|---|---|
| Renderer → Node | **IPC only.** The renderer never imports Node files that touch disk; it calls `window.electronAPI.*`. | `db:clinical-command`, `generate-document` |
| Renderer ↔ Cloud | **HTTPS + WebSocket** to the Worker | `POST /rooms/:id/mutations` |
| Everyone → `lib/` | **Plain `import`** of pure modules with no Node or DOM dependencies | `lib/clinical-salas.mjs` is imported by the renderer (10×), by Node, and by the sync Worker (`interno/sala-slug.js`) |

`lib/` is the only code that runs in **all three places**: laptop UI, Electron main, and Cloudflare's edge. A change there can break any of the three, which is why most of the repo's unit tests live in `lib/`.

---

## The areas

| Area | Files | Out | In | What it is |
|---|---:|---:|---:|---|
| App shell & platform | 73 | 189 | **314** | boot (`app.js`, `app-shell*.mjs`), `app-runtimes.mjs`, lazy routes, ⌘K palette, toasts, modals, workbench UI kit, `dom-escape.mjs`, offline/audit |
| Access & identity | 38 | 50 | **252** | who you are and what you may see: `clinical-access-runtime.mjs`, `clinical-privileges.mjs`, `clinico-access.mjs`, `clinical-session-context.mjs`, `clinical-username.mjs` |
| Storage & state | 55 | 78 | 169 | `app-state.mjs` (the in-memory record), `storage.js`, `db-storage-bridge.mjs`, `clinical-repo-*`, backup import/export |
| Census & patients | 82 | 193 | 162 | sidebar list, filters, `features/patients.mjs`, patient dashboard / Resumen, unified grid, census PDF build |
| Nube sync | 124 | 185 | 120 | `features/cloud-sync/` (outbox, mutate bridge, pull/apply, crypto, ⇄ panel), `sync-apply/` |
| Labs & cultivos | 112 | 79 | 92 | paste and parse, lab sets, cultivos, lab diagrams (Gamble) |
| Estado actual | 72 | 88 | 76 | monitoreo, vitals, glucose, I/O, EA charts and parser |
| Medications | 62 | 61 | 79 | receta, catalog, SOAP destinations, VPO, potassium / antidiabetic / Stanford detectors |
| Teams & guardia | 78 | **273** | 65 | teams, guardia, entrega, Inicio de turno |
| Profile, settings & help | 95 | 199 | 64 | onboarding, Ajustes, Learn Hub, feature hints, release notes |
| Tendencias | 31 | 41 | 39 | `tend-core.mjs` and trend charts |
| Phones (Móvil/Interno) | 11 | 17 | 36 | `cloud-mobile/`, interno and equipos clients |
| Expediente | 13 | 71 | 29 | historia clínica, listado de problemas |
| Notes & documents | 12 | 20 | 22 | note / indicaciones forms, document export client, output folder |
| Pendientes & agenda | 17 | 20 | 18 | todos, reminders, procedure agenda |
| Interconsultas | 4 | 34 | 8 | consult mode |
| Shared logic (lib) | 118 | 13 | 101 | pure modules shared across runtimes |
| Local DB (Node) | 99 | 16 | 17 | `lib/db/` (schema, migrations, IPC handlers), `lib/clinical-repo/` |
| Doc generators (Node) | 12 | 7 | 2 | `lib/doc-generators/`, `generate-censo.js` |
| Updates & signing | 32 | 11 | 15 | updater UI, `lib/update-*`, `packages/shared-signing`, update-worker |
| Electron main | 6 | 25 | 0 | `packages/im/main.js`, `preload.js`, protocol helpers |
| Nube Worker | 45 | 4 | 0 | `cloud/sync-worker/src` |
| Equipos Worker | 14 | 6 | 0 | `cloud/equipos-worker/src` |

*Out* counts the imports this area makes into other areas; *In* counts the imports other areas make into it.

### How to read the shape
- **High *In*, low *Out*** means a foundation that many areas build on: App shell, Access & identity, Storage & state, `lib/`. Changes here ripple outward, so be careful.
- **High *Out*, low *In*** means an integrator that pulls many things together: Teams & guardia (273 out, 65 in), Profile/settings (onboarding touches everything), Census.
- **Both high** means a crossroads: Census & patients and Nube sync. Most "how did this break?" stories run through these two.
- **Workers and Electron main have *In* = 0.** Nothing imports them; they are entry points.

---

## Who imports whom: the full matrix

In the artifact, this is an interactive heatmap: rows are the importing area, columns are the imported area, and darker means more imports. Hover a cell for the count. In Markdown, the next table lists the strongest cells.

<!-- MAP:imports -->

## The strongest connections

| Imports | From → To | Why |
|---:|---|---|
| 95 | Teams & guardia → Access & identity | every guardia and team view checks scope and privileges |
| 62 | Nube sync → Access & identity | sync decides which patients to push or show by team and sala |
| 50 | Teams & guardia → App shell | UI kit, modals, toasts |
| 42 | Census & patients → App shell | |
| 41 | **Estado actual → Medications** | EA groups meds by body system and destination (SOAP) |
| 34 | Profile, settings & help → Access & identity | onboarding sets the identity |
| 31 | Teams & guardia → Census & patients | guardia census table, team patient lists |
| 31 | Teams & guardia → Nube sync | team changes are synced in `clinicalOps` |
| 27 | Teams & guardia → Shared logic | `lib/entrega/*`, `lib/clinical-scope/*` |
| 25 | Census & patients → Access & identity | |
| 23 | **Labs → Tendencias** | lab sets feed trend charts |
| 21 | Census & patients → Labs | census Laboratorios column |
| 21 | Nube sync → Census & patients | pulled patients land in the census |
| 16 | Census & patients → Estado actual | census Signos / I-O columns |
| 13 | Medications → Estado actual | |
| 11 | Tendencias → Labs | |

---

## Hub files: the ones to know by name

These are the files with the most importers. If you understand these 15, you can read most features.

| Importers | File (`public/js/…`) | What it gives you |
|---:|---|---|
| 112 | `app-state.mjs` | **the in-memory patient record:** `getPatients`, `setPatients`, `getNotes`, … (see [03](./03-shared-state-and-wiring.md)) |
| 106 | `dom-escape.mjs` | `escHtml` / `escAttr`, 30 lines that keep patient names from becoming HTML injection |
| 82 | `clinical-access-runtime.mjs` | wires access control into the running app (guardia grid, session) |
| 45 | `clinical-privileges.mjs` | "should this device filter by team?" rules; a **mirror of `lib/db/clinical-privileges.mjs`** |
| 44 | `tend-core.mjs` | lab-history date normalization and section eligibility, used well beyond the trend charts |
| 44 | `features/cloud-sync/mutate-bridge.mjs` | `enqueueCloudMutation`: every synced edit goes through here |
| 42 | `clinical-settings.mjs` | device ↔ user binding, feature-hint flags |
| 41 | `clinical-session-context.mjs` | the shared session bag (user, guardias, teams, scope); a leaf module with no imports, to avoid import cycles |
| 38 | `features/cloud-sync/settings.mjs` | Worker URL, remembered room |
| 34 | `ui-motion.mjs` | springs, row exits, reduced-motion check |
| 33 | `storage.js` | the persistence barrel |
| 31 | `features/estado-actual-data.mjs` | monitoreo data model and migrations |
| 30 | `features/clinical-teams/shared.mjs` | team services, sala list for the UI |
| 29 | `db-storage-bridge.mjs` | app field → `clinical_blob` key; `hydrateStorageCache` at boot |
| 28 | `features/patients.mjs` | patient list, add/save, delete, ronda navigation |

---

## Hidden connections: mirrored and repeated code

Some connections don't show up as imports, because the same rule is **written twice**:

| Rule | Copies | Risk |
|---|---|---|
| Who can see which patients | `lib/db/clinical-privileges.mjs` and `public/js/clinical-privileges.mjs` ("Renderer mirror") | UI and DB disagree about access |
| Username format | `lib/db/clinical-username.mjs` and `public/js/clinical-username.mjs` ("keep the two in step") | registration accepted in one place, rejected in the other |
| The list of salas | `lib/clinical-salas.mjs` (app + DB CHECK), `cloud/sync-worker/src/sala-allowlist.js` (Nube gate), plus a DB migration | a sala exists locally but Nube refuses it |

### Worked example: adding a sala touches every layer
Commit `d529b9e` (*Add UCI, PostQx and Subespecialidad salas*) is a good map of the codebase in one diff:

```
lib/clinical-salas.mjs                       ← shared list + room slugs (all runtimes)
lib/db/schema-migrate-v30-rotacion-sala.mjs  ← widen the sala CHECK (Local DB)
lib/db/schema-primitives.mjs                 ← SCHEMA_VERSION 29 → 31
cloud/sync-worker/src/sala-allowlist.js      ← Nube Worker accepts the new rooms
public/js/features/clinical-onboarding-*.mjs ← UI: «Otra rotación» picker
public/js/early-boot-flags.js                ← boot budget (metrics gate)
```

If you ever add a sala, a team service or a synced field, expect to touch **shared lib + DB migration + Worker + UI**.

---

## Trace it yourself

| Question | Command |
|---|---|
| Who imports this file? | `grep -rn "clinical-privileges.mjs" packages/core --include=*.mjs \| grep import` |
| What does this file import? | `grep -n "^import" packages/core/public/js/app-state.mjs` |
| Where is this IPC channel handled? | `grep -rn "'db:clinical-command'" packages/` |
| Which Worker route serves this? | `grep -n "mutations" packages/core/cloud/sync-worker/src/rooms.js` |
| Is there a guard rule? | `.dependency-cruiser-boundaries.cjs`, `scripts/ci/*.mjs` |

## Check yourself

1. Which area would you expect a change to break most widely: Interconsultas or Access & identity? Why?
2. Why can't a feature in `public/js/features/` import `lib/db/db-manager.mjs` directly?
3. You add a new sala. Name three areas you'll touch.

<details><summary>Answers</summary>

1. Access & identity: 252 imports come into it from other areas. Interconsultas has 8.
2. The renderer has no Node; the DB lives in main and is reached over IPC (`db:*` channels).
3. Shared logic (`lib/clinical-salas.mjs`), Local DB (a migration that widens the CHECK), the Nube Worker (`sala-allowlist.js`), and UI (the onboarding picker).
</details>

**Next:** [06 · From pasted labs to a Word note →](./06-labs-to-word.md)

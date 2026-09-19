# Modo Guardia — esfuerzo / pronóstico / nota de guardia + census cards

Planned by ceo-fable on 2026-09-12. Owner approved: save + build.

## Goal

The on-call R1 sets, per patient in the guardia census: esfuerzo terapéutico (3 values), pronóstico (2 values), and a short nota de guardia. Values persist in the patient JSON blob (SQLCipher via `patient.upsert`), sync through Nube like any other census field, and show as icon badges + note line on a new per-patient card list.

## Constraints

- Zero new modules. `scripts/metrics/report.json` shows `moduleCount` 1255 vs cap 1257 and `trackedLoc` 347918 vs cap 348800. A new `.mjs` + its `.test.mjs` would hit the module cap. All code goes into existing files.
- `npm run metrics:check` also runs eslint on changed Tier-1 files with `--max-warnings 0`; `complexity` max 15, `sonarjs/cognitive-complexity` max 20. Keep new functions small.
- Do not touch `public/js/censo-*.mjs` or `stable-versions.json` (modified in the working tree by other work).
- Do not revert the already-fixed copy in `guardia-patient-action-sheet.mjs:109` ("visible para equipo mañana").
- No changes to `guardia-fin-turno-*`. No schema migration.
- Spanish UI copy. Synthetic patients only for manual checks.

## Verified facts (do not re-derive)

1. Persistence: `lib/clinical-repo/index.mjs:26` routes `{ type: 'patient.upsert', patient }` to `runPatientUpsertCommand` → `applyPatientUpsert` (`lib/clinical-repo/transforms/patients.mjs:10`) which **replaces** the row with `{ ...patient, id }` (full replace, not merge). Blob is `JSON.stringify` — new top-level keys survive. No UI caller of `patient.upsert` exists yet; this is the first.
2. Renderer bus: `executeClinicalCommand(command, meta)` in `public/js/clinical-repo-client.mjs:62`; `canExecuteClinicalCommand()` at line 23. Retry pattern for `patient_not_found` is in `executeEventualidadesCommandWithRetry` (`eventualidades-render.mjs:343`).
3. Nube propagation works without extra code: `pickCensusFields` (`lib/clinical-repo/sync/op-encoder-shared.mjs:25` and `public/js/features/cloud-sync/mutate-bridge-ops.mjs:47`) is a **skip-list** (`historiaClinica,id,monitoreo,eventualidades`), so new keys ride on `entries/{id}/fields`. Pull side `buildPatientFromCloudEntry` (`cloud-sync/pull-apply-state.mjs:23`) spreads all `fields` into the patient. **The LWW clock for that op is `patient.lanUpdatedAt`** (`op-encoder-patient.mjs:52`, `mutate-bridge-ops.mjs:23`) — the save must bump it or the change can lose LWW.
4. No field collisions: `guardiaEsfuerzo`, `guardiaPronostico`, `guardiaNota`, `esfuerzo`, `pronostico` have zero hits in `public/js` and `lib`.
5. Diagnóstico source: `enrichPatientForGuardiaCard` (`public/js/features/guardia-board-chrome.mjs:261`) already computes `dxText` = `diagnosticosTextForCenso(p.diagnosticosList, { max: 2 }) || p.diagnosticosText || p.motivo || 'Sin diagnóstico registrado'`, uppercased. The census table receives these enriched objects. The action sheet receives only `patientId`/`patientLabel` from `guardia-board-render.mjs:193` — pass `dxText` through the same opts. No new dx field.
6. Enriched objects are a subset (`mapPatientForGuardiaGrid` + explicit pass-through at `guardia-board-chrome.mjs:294-309`). The three new fields must be added to that pass-through or cards will never see them.
7. R1 vs R4 grouping discrepancy — resolved: `resolveGuardiaGridRank` (`guardia-board-chrome.mjs:50`) returns `'R4'` for rank R4 **or any program admin** (`hasElevatedTeamPrivileges`). `guardiaCensusBodyHtml` (`guardia-census-table.mjs:190`) groups only for `'R4'`. So a plain R1 sees a flat list today; the owner's production screenshot comes from an account that resolves to `'R4'` (admin flag or R4/Admin rank). On desktop every rank already sees the full sala census narrowed by Filtros (`filterPatientsForGuardiaCensus` → `shouldUseDesktopCensusWithFilters`), so an R1 already sees several teams' patients, just ungrouped. Decision: group by team for **all ranks**; keep the R4 "seguimiento" pin section R4-only.
8. CSS bundling: `scripts/build-ui.mjs` concatenates the `<link rel="stylesheet" href="/styles/...">` tags from `public/index.src.html` into `public/styles/app.bundle.css`. `pase-board.css` (line 116) and `modals.css` (line 128) are both linked. `.gct-cell-*` classes have **no CSS rules anywhere** today (only `.gct-divider` in `pase-board.css:32`). Row motion classes `.row-enter/.row-exit` (`motion.css:509,533`) are element-agnostic.
9. `mountGuardiaCensusTable` diffing and click wiring select `.wb-row[data-wb-row-id]` (lines 286, 307, 312). Cards must keep `data-wb-row-id`; selectors change to `[data-wb-row-id]`.
10. Tests run under Electron Node via `npm run test:one`; DOM-guarded tests skip. `package.json` `scripts.test` already globs `public/**/*.test.*js` — no manifest edit needed. `.cursor/rules/tests-with-code.mdc`: update colocated tests in the same turn, run `test:one` before `build:ui`.

## Chosen approach

- Data: three top-level patient properties. Normalizers + option tables + badge HTML + card HTML live in `guardia-census-table.mjs` (rendering side). Save function + sheet controls live in `guardia-patient-action-sheet.mjs` (write side, imports the option tables from the census table module; no cycle).
- Save = `patient.upsert` with a merged copy, retry on `patient_not_found` via `clinical.persistSnapshot` (patients only), then mutate the live app-state object, `_applyPatientPatch`, `scheduleCloudSyncPush()`. Fallback when IPC is absent: `persistClinicalState({ immediate: true })`. Skipped: the change_log projector drain (`scheduleEventualidadesSyncDrain`) — the bundle push already carries the fields with the fresh `lanUpdatedAt` clock; a later backlog drain re-emits an idempotent op. Add `// ponytail:` note.
- UI refresh after save: `guardia-board-render.mjs` passes `onMarksSaved: () => renderGuardiaBoard(settings)` into the sheet; the board re-enriches and remounts; existing row diffing keeps unchanged cards from re-animating. Picker buttons flip `aria-pressed` in place; the sheet stays open.

## Data contract

```js
// guardia-census-table.mjs (exported)
export const GUARDIA_ESFUERZO_OPTIONS = [
  { id: 'full', icon: '🍪', label: 'Reanimar' },
  { id: 'show', icon: '🎭', label: 'Show' },
  { id: 'no',   icon: '🚫', label: 'No reanimar' },
];
export const GUARDIA_PRONOSTICO_OPTIONS = [
  { id: 'good', icon: '🙂', label: 'Bueno' },
  { id: 'bad',  icon: '🙁', label: 'Malo' },
];
export const GUARDIA_NOTA_MAX = 200;

export function normalizeGuardiaEsfuerzo(raw)   // 'full'|'show'|'no' or null
export function normalizeGuardiaPronostico(raw) // 'good'|'bad' or null
export function normalizeGuardiaNota(raw)       // String, collapse whitespace, trim, slice(0, 200); '' when empty. Case kept as typed.
export function normalizeGuardiaMarksPatch(patch) // only keys present in patch, each normalized: { guardiaEsfuerzo?, guardiaPronostico?, guardiaNota? }
```

Style: same shape as `normalizeGuardiaVitalsFrequency` (`lib/db/clinical-access-guardia.mjs:9-14`) — `const v = String(raw || ''); return OPTIONS.some((o) => o.id === v) ? v : null;`.

Patient fields: `guardiaEsfuerzo`, `guardiaPronostico`, `guardiaNota`. Unset = `null` / `''`. Clicking the active picker button again sets `null` (the only "clear" affordance).

## Files to touch (8 files, 0 new)

| # | File | Owner |
|---|------|-------|
| 1 | `public/js/features/guardia-census-table.mjs` | Lead |
| 2 | `public/js/features/guardia-census-table.test.mjs` | Lead |
| 3 | `public/js/features/guardia-patient-action-sheet.mjs` | Lead |
| 4 | `public/js/features/guardia-patient-action-sheet.test.mjs` | Lead |
| 5 | `public/js/features/guardia-board-chrome.mjs` (+ its `.test.mjs`) | Dev |
| 6 | `public/js/features/guardia-board-render.mjs` | Dev |
| 7 | `public/styles/pase-board.css` | Dev |
| 8 | `public/styles/modals.css` | Dev |

Lead and Dev sets do not overlap — run in parallel directly in the main working tree (no worktree needed, files are disjoint).

## Task list

**Step 0 (Lead, first).** Run `node scripts/metrics/run.mjs` and note headroom vs `scripts/metrics/baseline.json` (`trackedLoc` 348800, `moduleCount` 1257). Confirm zero new files is still required.

**Step 1 (Lead) — `guardia-census-table.mjs`: cards.**

Keep unchanged: `alteradosForPatient`, `patientPendientes`, `guardiaPatientStatus`, `admissionDateForPatient`, `isPatientAdmittedToday`, `bedLabel`, `alteradosCellHtml`, `pendienteCellHtml`, `dividerHtml`, `guardiaCensusSummaryLine`, `guardiaCensusFilterChips`, `applyGuardiaCensusFilter`, `sortPatientsByPriorityThenBed` usage, filter chips.

Replace:
- `buildGuardiaCensusTableRowHtml(p)` → `buildGuardiaCensusCardHtml(p)` (exported; delete the old export). Markup contract:
  ```html
  <div class="gct-card [gct-card--alert]" data-wb-row-id="…" role="button" tabindex="0">
    <div class="gct-card__head">
      <span class="gct-cell-bed">214-B · 2</span>
      <span class="gct-cell-name">PÉREZ GARCÍA, JUAN</span>
      <span class="gct-card__marks">…badges…</span>
      <span class="wb-status wb-status--vencido">VENCIDO</span>   <!-- buildStatusLabelHtml, unchanged -->
    </div>
    <div class="gct-card__nota">SV c/4h</div>          <!-- only when normalizeGuardiaNota(p.guardiaNota) is non-empty -->
    <div class="gct-card__dx">NAC + EPOC</div>          <!-- only when p.dxText is non-empty -->
    <div class="gct-card__meta">[alteradosCellHtml] [pendienteCellHtml]</div>
  </div>
  ```
  `gct-card--alert` when status is `vencido` (replaces `wb-row--alert`). Escape everything with `escHtml`/`escAttr` from `../dom-escape.mjs`.
- `batchRowsHtml` → maps `buildGuardiaCensusCardHtml`.
- `guardiaCensusBodyHtml`: remove `if (userRank !== 'R4') return batchRowsHtml(...)`. Keep the follow-up pin block behind `if (userRank === 'R4')`. Team groups for all ranks.
- `buildGuardiaCensusTableHtml`: drop `buildColumnHeadHtml(...)` and the `colhead` in the output. Keep `wb-table-card guardia-census-table` wrapper, header with chips, `wb-table-body`, summary line.
- `mountGuardiaCensusTable`: change the three `'.wb-row[data-wb-row-id]'` selectors to `'[data-wb-row-id]'`.
- Remove `GUARDIA_TABLE_GRID`, the `buildColumnHeadHtml` and `buildRowHtml` imports. Keep `buildTableCardHeaderHtml`, `buildSummaryLineHtml`.

Add (exported): the option tables, `GUARDIA_NOTA_MAX`, the four normalizers, and
```js
export function buildGuardiaMarksBadgesHtml(p)
// -> one <span class="gct-mark" title="Esfuerzo: Show" aria-label="Esfuerzo: Show">🎭</span> per set mark
//    (esfuerzo first, then pronóstico); '' when both unset/invalid.
```

Update `guardia-census-table.test.mjs`:
- Replace the `buildGuardiaCensusTableRowHtml` describe with `buildGuardiaCensusCardHtml`: keeps the bed/name/SatO₂/pendiente/VENCIDO assertions, asserts `gct-card--alert` and `data-wb-row-id="p1"`; keep the "sin toma" case; **delete** the two grid-template tests (`92px 1fr…`, `--wb-grid`). Add: badges render with titles when marks are set; no `gct-mark` when unset or invalid (`guardiaEsfuerzo: 'zzz'`); `gct-card__nota` present only when `guardiaNota` non-empty; `gct-card__dx` shows `dxText`.
- `buildGuardiaCensusTableHtml`: the first test drops `wb-table-colhead` and the `Cama.*Paciente…` regex; assert the colhead is **absent**. Change "groups R4 by team" to also assert `gct-divider` for `'R1'` with `{ teams: [], assignments: [] }`.
- Normalizer describe: valid ids pass through; unknown/undefined → `null`; nota trims, collapses spaces, caps at 200; `normalizeGuardiaMarksPatch({ guardiaEsfuerzo: 'no' })` returns only that key.
- Mount tests: selectors `.wb-row[data-wb-row-id=…]` → `.gct-card[data-wb-row-id=…]` (they are DOM-guarded and skip under `test:one`; edit anyway).
- Run `npm run test:one -- public/js/features/guardia-census-table.test.mjs`.

**Step 2 (Dev) — `guardia-board-chrome.mjs` pass-through.** After line 309 (`fiuxFecha: p.fiuxFecha,`) add:
```js
    guardiaEsfuerzo: p.guardiaEsfuerzo,
    guardiaPronostico: p.guardiaPronostico,
    guardiaNota: p.guardiaNota,
```
In `guardia-board-chrome.test.mjs`, inside `describe('enrichPatientForGuardiaCard')` (line 93), add one case asserting the three fields survive enrichment. Run `npm run test:one -- public/js/features/guardia-board-chrome.test.mjs`.

**Step 3 (Dev) — `guardia-board-render.mjs`.** At lines 193-196 extend the call:
```js
openGuardiaPatientActionSheet({
  patientId,
  patientLabel: row?.name ? String(row.name) : undefined,
  dxText: row?.dxText ? String(row.dxText) : '',
  onMarksSaved: () => renderGuardiaBoard(settings),
});
```
(`renderGuardiaBoard` is a hoisted function in the same file; `settings` is already in `wireGuardiaGridBoard` scope.)

**Step 4 (Dev) — CSS.**
`pase-board.css`, insert after line 45 (`.wb-table-body .gct-divider:first-child {…}`):
```css
/* Guardia census — tarjetas por paciente (Modo Guardia) */
.gct-card {
  display: grid;
  gap: 4px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--divider);
  font: var(--type-wb-row);
  color: var(--color-ink);
  cursor: pointer;
  transition: background var(--dur-fast, 140ms) var(--ease-out);
}
.gct-card:hover { background: color-mix(in oklab, var(--color-ink) 3%, transparent); }
.gct-card--alert,
.gct-card--alert:hover { background: var(--color-danger-tint); }
.gct-card__head { display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: baseline; }
.gct-cell-name { font-weight: 600; }
.gct-card__marks { display: inline-flex; gap: 4px; font-size: 14px; line-height: 1; }
.gct-card__nota { font-style: italic; color: var(--color-ink-muted); }
.gct-card__dx { color: var(--color-ink-muted); text-transform: uppercase; }
.gct-card__meta { display: flex; flex-wrap: wrap; gap: 8px; }
.gct-cell-muted { color: var(--color-ink-muted); }
.gct-cell-alert { color: var(--color-danger-deep); }
.gct-cell-warn { color: var(--color-warn); }
```
`modals.css`, insert after line 2761 (`.guardia-patient-action-textarea {…}`):
```css
.guardia-patient-action-dx { margin: 0; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; }
.guardia-marks-group { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.guardia-marks-group__label { flex-basis: 100%; font-size: 0.78rem; color: var(--text-muted); }
.guardia-marks-btn {
  padding: 6px 10px; border: 1px solid var(--border); border-radius: 999px;
  background: var(--surface); font: inherit; cursor: pointer;
}
.guardia-marks-btn[aria-pressed="true"] {
  border-color: var(--color-accent);
  background: color-mix(in oklab, var(--color-accent) 12%, var(--surface));
  font-weight: 600;
}
.guardia-marks-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
```
All tokens used already appear in `workbench-kit.css` / the existing sheet block. No raw hex (file header rule).

**Step 5 (Lead) — `guardia-patient-action-sheet.mjs`: controls + save.**

Imports to add: `getPatients, persistClinicalState` from `../app-state.mjs` (`getPatients` already imported); `canExecuteClinicalCommand, executeClinicalCommand` from `../clinical-repo-client.mjs`; `_applyPatientPatch` from `../clinical-read-model.mjs`; `scheduleCloudSyncPush` from `./cloud-sync/mutate-bridge.mjs`; `GUARDIA_ESFUERZO_OPTIONS, GUARDIA_PRONOSTICO_OPTIONS, GUARDIA_NOTA_MAX, normalizeGuardiaMarksPatch, normalizeGuardiaNota` from `./guardia-census-table.mjs`.

Thread a context object instead of `(patientId, patientLabel)`: `ctx = { patientId, patientLabel, dxText, onMarksSaved }`. `openGuardiaPatientActionSheet(opts)` builds it, stores it in module-level `let _sheetCtx = null`, and calls `renderMenuStep(ctx)`. `renderEventualidadStep(ctx)` and its "Volver" button pass `ctx` back. `closeGuardiaPatientActionSheet` calls `flushPendingGuardiaNota()` **before** `body.innerHTML = ''`, then sets `_sheetCtx = null`.

Exported pure builder (tested):
```js
export function buildGuardiaMarksControlsHtml(patient, dxText)
```
Returns, in this order: `<p class="guardia-patient-action-dx">` (only when `dxText`), the esfuerzo group, the pronóstico group, the nota field:
```html
<div class="guardia-marks-group" role="group" aria-label="Esfuerzo terapéutico" data-mark="guardiaEsfuerzo">
  <span class="guardia-marks-group__label">Esfuerzo terapéutico</span>
  <button type="button" class="guardia-marks-btn" data-value="full" aria-pressed="false">🍪 Reanimar</button>
  <button type="button" class="guardia-marks-btn" data-value="show" aria-pressed="true">🎭 Show</button>
  <button type="button" class="guardia-marks-btn" data-value="no" aria-pressed="false">🚫 No reanimar</button>
</div>
<div class="guardia-marks-group" role="group" aria-label="Pronóstico" data-mark="guardiaPronostico">…🙂 Bueno / 🙁 Malo…</div>
<div class="field-group guardia-patient-action-field">
  <label for="guardia-marks-nota">Nota de guardia</label>
  <textarea id="guardia-marks-nota" class="profile-input guardia-patient-action-textarea" rows="2" maxlength="200" placeholder="SV c/4h, vigilar T/A post procedimiento…">SV c/4h</textarea>
</div>
```
`aria-pressed="true"` only on the button whose `data-value` equals the patient's current normalized value. Textarea content = `escHtml(normalizeGuardiaNota(patient.guardiaNota))`. Do **not** call `wireUppercaseTextarea` on it (case kept as typed).

`renderMenuStep(ctx)`: keep the existing lead `<p>` and the existing `guardia-patient-action-list` markup **verbatim**; insert `buildGuardiaMarksControlsHtml(findPatient(ctx.patientId), ctx.dxText)` between the lead paragraph and the action list. Wiring:
- Each `.guardia-marks-btn` click: `mark = group.dataset.mark`, `value = btn.dataset.value`, `patient = findPatient(ctx.patientId)` (re-fetch at click time; a Nube pull can swap objects), `next = patient[mark] === value ? null : value`; `await saveGuardiaMarks(patient, { [mark]: next })`; on ok set `aria-pressed` on the siblings (`true` only for `next`), call `ctx.onMarksSaved?.()`; on fail `toast('No se pudo guardar.', 'error')`.
- Textarea: on `change` and on Ctrl/Cmd+Enter → `saveGuardiaNotaFromInput(ctx)`: compares `normalizeGuardiaNota(input.value)` with `normalizeGuardiaNota(patient.guardiaNota)`; if different, `saveGuardiaMarks(patient, { guardiaNota: input.value })`, then `ctx.onMarksSaved?.()`. Same function is what `flushPendingGuardiaNota()` calls on close (uses `_sheetCtx`; no-op when the textarea is absent or unchanged).
- No success toast (badge change is the feedback). Failure toast only.

Exported save function (tested):
```js
export async function saveGuardiaMarks(patient, patch) {
  if (!patient || !patient.id) return { ok: false, reason: 'no-patient' };
  const next = normalizeGuardiaMarksPatch(patch);
  if (!Object.keys(next).length) return { ok: false, reason: 'empty' };
  next.lanUpdatedAt = new Date().toISOString(); // Nube LWW clock for entries/{id}/fields
  const merged = { ...patient, ...next, id: String(patient.id) };
  if (!canExecuteClinicalCommand()) {
    Object.assign(patient, next);
    _applyPatientPatch(patient.id, next, patient, { source: 'guardia-marks' });
    await persistClinicalState({ immediate: true, source: 'guardia-marks' });
    scheduleCloudSyncPush();
    return { ok: true, via: 'snapshot' };
  }
  const cmd = { type: 'patient.upsert', patient: merged };
  const meta = { source: 'ui', echoSnapshot: false };
  let res = await executeClinicalCommand(cmd, meta);
  if (res && !res.ok && res.error === 'patient_not_found') {
    // Census can land in RAM via Nube before the SQLCipher blob catches up (same as eventualidades-render.mjs:343).
    await executeClinicalCommand(
      { type: 'clinical.persistSnapshot', patients: getPatients() },
      { source: 'guardia-marks-retry', echoSnapshot: false }
    );
    res = await executeClinicalCommand(cmd, meta);
  }
  if (!res || !res.ok) return { ok: false, reason: (res && res.error) || 'repo_failed' };
  Object.assign(patient, next);
  _applyPatientPatch(patient.id, next, patient, { source: 'guardia-marks' });
  // ponytail: bundle push carries the fields with the fresh clock; change_log row drains later (idempotent). Add projector drain only if Nube lag is observed.
  scheduleCloudSyncPush();
  return { ok: true, via: 'clinical-repo', changeId: res.changeId || null };
}
```
Split the IPC branch into a helper if eslint complexity complains.

Update `guardia-patient-action-sheet.test.mjs`:
- `buildGuardiaMarksControlsHtml({ guardiaEsfuerzo: 'show', guardiaPronostico: null, guardiaNota: 'SV c/4h' }, 'NAC + EPOC')`: exactly one `aria-pressed="true"`, on `data-value="show"`; no pressed button in the pronóstico group; dx paragraph contains `NAC + EPOC`; textarea contains `SV c/4h`; `maxlength="200"`. With `dxText: ''` the dx paragraph is absent.
- `saveGuardiaMarks` (copy the stub style from `public/js/clinical-repo-persist.test.mjs:51-77`): set `globalThis.localStorage = memoryStore()` and `globalThis.window = { localStorage, electronAPI: { dbClinicalCommand: async (payload) => { commands.push(payload); return { ok: true, changeId: 'c1' }; } } }` in `beforeEach`; restore in `afterEach`.
  - Payload shape: `commands[0].command.type === 'patient.upsert'`, `.command.patient.id === 'p1'`, `.guardiaEsfuerzo === 'no'`, `.guardiaNota === 'SV c/4h'` (from `'  SV   c/4h '`), `.command.patient.nombre` still present (full object), `.meta.echoSnapshot === false`. After the call the live patient has the fields and a `lanUpdatedAt`.
  - Invalid value: `{ guardiaEsfuerzo: 'zzz' }` → payload carries `guardiaEsfuerzo: null`.
  - Empty patch `{}` → `{ ok: false, reason: 'empty' }`, no command sent.
  - Retry: first response `{ ok: false, error: 'patient_not_found' }` → `commands` types are `['patient.upsert', 'clinical.persistSnapshot', 'patient.upsert']`.
  - Failure: response `{ ok: false, error: 'boom' }` → `{ ok: false }` and the live patient is **not** mutated.
- Run `npm run test:one -- public/js/features/guardia-patient-action-sheet.test.mjs`.

**Step 6 (Lead) — integrate and verify.**
1. `npm run build:ui`.
2. Manual check in the running `npm start` Electron (target the R+ process, not "R+ Cardio"; clear `Cache`/`Code Cache`/`GPUCache` under the r-plus userData dir if the bundle looks stale). Use a synthetic patient: set esfuerzo → badge appears on the card with no reload; toggle it off → badge gone; type a note, click Cancelar → note line shows on the card; restart the app → values still there.
3. `npm run metrics:check` (LOC and module caps, eslint on changed files).
4. Update the row in `docs/core/20-claude-code-handoff.md` (Active plans table) in the same turn. Owner commits (no attribution trailers).

## Estimate

8 files edited, 0 created. Roughly +260 / −45 lines including tests and CSS — inside the ~880-line LOC headroom at the last report; Lead re-measures in Step 0.

## Decisions the owner already confirmed (defaults used, matches prior mockup approval)

1. Team grouping for all ranks (R1 included); R4 pin section stays R4-only.
2. ~~Alterados line stays on the card (`gct-card__meta`).~~ **Superseded 2026-09-13** — see Revision below.
3. Note save triggers: blur/change, Ctrl/Cmd+Enter, and flush on close (including Cancelar/Escape/backdrop).
4. Note max 200 chars, case kept as typed (not forced uppercase like eventualidades).
5. Sheet layout order: dx → esfuerzo → pronóstico → nota → existing two action buttons.
6. Censo PDF (`censo-build*.mjs`) does not print the marks — out of scope for this plan.

## Revision (2026-09-13) — card redesigned for at-a-glance scanning

Owner asked for a genuine visual redesign of the census board (not this plan's original card), approved through 5 rounds of visual mockup iteration before any code was written. This supersedes decision 2 and the card markup in Step 1 above (the option tables, normalizers, and `buildGuardiaMarksBadgesHtml`-style risk detection from this plan are kept; only the card's visible layout changed):

- Card is now two rows, fixed 44px height: (1) a colored status dot with a letter (L/C/A/V) instead of the trailing `wb-status` text label, bed·room, name, and small round mark chips (gray, red-tinted only when `esfuerzo === 'no'` or `pronostico === 'bad'`); (2) an always-present task line (bold, first overdue-or-open pendiente text, empty when none) — no dx line, no nota line, no alterados line on the card. Cards sit in a `.gct-grid` (`repeat(auto-fill, minmax(176px,1fr))`) per team instead of a single-column list. A legend row (dot colors + "🚫/🙁 en rojo = riesgo") sits above the census body.
- `guardiaNota` is now write-only from the card's point of view (still set from the action sheet, shown nowhere on the card) — the owner was told this in the same turn as the change.
- `alteradosForPatient`/`patientPendientes` stay (used by the filter-chip count and the closing summary line); only the card's own rendering of them was dropped.
- Verified live in the running `npm start` Electron build against real census data (33 patients, 5 teams) — matches the approved mockup.

## Revision 2 (2026-09-13) — top bar removed, cards enlarged, meds-table-style auto-fit

Owner reviewed a screenshot of the live board and asked to drop the "Toma de signos / Pendientes / Ingresos / Censo: todos" toolbar above the census, make the cards bigger, and make the grid shrink to fit one screen the way `med-admin-panel.mjs`'s `fitMedAdminRows` does for the medicamentos table.

- Removed `#guardia-metrics-panel` (the counters band + the `btn-guardia-mode-toggle` "Censo: todos" filter switch) from `app-body.html`. That switch was the only UI entry point for the "solo entregados" filter — it now permanently defaults to showing everyone (`guardiaMode: false`), same as most accounts already saw by default.
- Card height is now a CSS var (`--gct-card-h`, default 68px, up from the fixed 44px in the revision above); `.gct-grid` columns widened 176px→208px; dot/chip sizes and card font bumped up to match.
- `guardia-census-table.mjs` gained `fitGuardiaCards`/`wireGuardiaCardsResize`, the same overflow-shrink pattern as `fitMedAdminRows`: find the nearest scrolling ancestor, shrink `--gct-card-h` by `overflow / cardCount`, re-run via `ResizeObserver`, floor at 40px.
- Verified live: bar gone, cards bigger, a 26-patient/4-team census fit on one screen with no scroll, click-to-open behavior unchanged.

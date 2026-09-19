# Plan: block lab pastes that mix two patients

## Goal

When one paste holds reports with 2+ different expediente numbers in the same contiguous block, R+ must save nothing, tell the user in Spanish, and keep the raw text so the user can split and re-paste.

## What the code does today (verified)

- Pipeline: `#lab-input` textarea → `procesarReporte()` (`public/js/features/lab-panel-parse.mjs:65`) → `buildBulkLabPreview()` (`public/js/lab-bulk-paste.mjs:239`) → split by `--- PACIENTE ---` (line 49), then by `^Expediente:` (line 78) → `parseReportChunk()` → store via `storeBulkLabBlocks()` (`public/js/features/lab-panel-workbench-store.mjs:311`).
- A partial check exists: status `'mixed-expediente'` at `lab-bulk-paste.mjs:184`. It is not safe:
  1. It fires only when **both** expedientes match census patients (`countCensusMatchedExpedientes`, line 168). A mixed paste where patient 2 is not in the census passes with no warning.
  2. `canProcess` (line 231) ignores the status. The preview modal lets the user confirm, and the primary patient's reports save.
  3. `filterUsableReportsForPatient` (line 150) silently drops the other patient's reports. Silent drop of clinical data is itself a risk.
- `buildBulkLabPreview` has 4 production callers: main paste (`lab-panel-parse.mjs:69`), smart paste (`paste-smart-model.mjs:200`), lab-repo import (`lab-repo-import-gate.mjs:47`), tour. The fix must live in the model so all callers inherit it.
- `#lab-input` is cleared only inside finalize (`lab-panel-workbench.mjs:40`). An early abort keeps the raw text.
- Silent-merge risk confirmed independently: `extractLabExpedienteFromReport()` (`public/js/labs-procesar.mjs:12`) uses `.match()` and returns only the FIRST `Expediente:` match. If `splitSomeReportsInBlock()` (`lab-bulk-paste.mjs:74`, regex `/(?=^\s*Expediente\s*:)/im`) fails to split two patients' text cleanly, both patients' data gets parsed and stored under one expediente with no warning at all.

## Constraints

- Do not break the legitimate multi-patient bulk flow: blocks separated by `--- PACIENTE ---`, one expediente each, must still work. Mixing is only 2+ distinct expedientes **inside one block**.
- Do not false-positive on the same patient written two ways. `findPatientByRegistro` (`patients-modal-commit.mjs:396`) treats `1087426` and `1087426-2` as the same patient (base match, `registroBase_`, line 388). The mixed-detector must use the same normalization.
- Detection signal stays the `Expediente:` header only (already extracted by `extractLabExpedienteFromReport`, from `okReports` only, so garbage chunks do not count).

## Chosen approach

1. **Model (`lab-bulk-paste.mjs`)**: 2+ distinct normalized expedientes in one block → `'mixed-expediente'`, always (delete the census-only gate at lines 167-184). `canProcess:false`, `usableReports` empty, `setsAfterMerge:0`. Add `mixedExpedienteWarning(blocks)` → Spanish message naming the expedientes found, or `null`.
2. **Abort point (`lab-panel-parse.mjs`)**: right after `buildBulkLabPreview` (line 69), before stub-admit / preview modal / finalize: if any block is mixed, `rt.showToast(msg, 'error')` and `return`. Textarea stays intact. Example copy: "El texto tiene 2 expedientes: A y B. Puede tener datos de otro paciente. No se guardó nada. Separa los reportes y pega de nuevo."
3. **Other surfaces** (inherit `canProcess:false`; add the message):
   - `paste-smart-model.mjs`: blocked plan kind with the same message.
   - `lab-repo-import-gate.mjs`: verify fallback preview cannot save; verify user sees the safety label.
   - `lab-bulk-stub-admit.mjs`: must not auto-create a stub patient from a mixed block.
   - `lab-panel-workbench-store.mjs`: one-line defense guard — skip any block with status `'mixed-expediente'`.

## Tests (colocated, `npm run test:one`, Electron Node)

`public/js/lab-bulk-paste.test.mjs` (extend):
1. Two reports, two distinct expedientes, both in census → mixed, `canProcess:false`, `okReportCount:0`.
2. Second expediente NOT in census → still mixed (new behavior, was previously silently dropped).
3. Same expediente repeated in two headers → `ok` (regression).
4. `1087426` + `1087426-2` resolving to one patient → NOT mixed (false-positive guard).
5. Two blocks split by `--- PACIENTE ---`, one expediente each → both `ok` (bulk flow intact).
6. `mixedExpedienteWarning` returns Spanish message with both numbers.

Plus: `paste-smart-model` test (mixed → blocked plan), stub-admit test (mixed block creates no stub).

## Rollout risk / edge cases

- Same-patient double reference: covered by base-registro normalization.
- Mixed data with NO second `Expediente:` header: not detectable by this signal — known limitation, follow-up not in scope.
- Repo import: portal fetches containing another patient's study now hard-block instead of importing the primary — correct, but more warnings.
- History re-parse (`buildMergedPayloadFromGroup`) is same-patient only, so safe; confirm `lab-history-some-reparse.test.mjs` stays green.
- `cultivo-queue-refresh.mjs:128` consumes this model too — verify it surfaces the warning if it parses portal text.

## Smallest file set

- `public/js/lab-bulk-paste.mjs` + `.test.mjs`
- `public/js/features/lab-panel-parse.mjs`
- `public/js/features/paste-smart-model.mjs` + test
- `public/js/features/lab-bulk-stub-admit.mjs` + test
- `public/js/features/lab-panel-workbench-store.mjs` (guard line)
- Verify-only: `lab-bulk-preview-modal.mjs`, `lab-repo-import-gate.mjs`, `cultivo-queue-refresh.mjs`

## Ordered tasks

1. `lab-bulk-paste.mjs`: normalized distinct-expediente detection, status always `mixed-expediente` on 2+, `canProcess:false`, `mixedExpedienteWarning()`, status label.
2. `lab-panel-parse.mjs`: abort in `procesarReporte` with Spanish toast, before stub-admit/preview/finalize.
3. `paste-smart-model.mjs`: blocked plan kind + message.
4. `lab-bulk-stub-admit.mjs`: skip mixed blocks. `lab-panel-workbench-store.mjs`: guard line.
5. Verify preview modal, repo-import gate, cultivo-queue-refresh paths cannot save a mixed block.
6. `npm run build:ui`, then `npm run metrics:check`.
7. Write all test cases above in the same turn as the behavior change. Run `npm run test:one` on each touched test file, plus `lab-history-some-reparse.test.mjs` and tour tests.

**Stop condition**: all new tests green, mixed paste shows the warning with both expediente numbers, nothing is written to `getLabHistory()`, raw text remains in `#lab-input`.

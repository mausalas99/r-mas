# Importación desde Google Drive — HC y Eventualidades

> **For implementation:** After this spec is approved in review, use **superpowers:writing-plans** to produce the task-by-task implementation plan. Do not start coding from this document alone.

**Date:** 2026-06-02  
**Status:** Approved in brainstorming (2026-06-02) — pending file review before implementation plan  
**Related specs:**
- `docs/superpowers/specs/2026-05-31-historia-clinica-institutional-format-design.md`
- `docs/superpowers/specs/2026-05-30-static-clinical-history-design.md`

---

## Problem statement

Clinical teams maintain ward documents in **Google Docs/Drive** (single long note per patient: header, historia clínica, daily eventualidades, estado actual). R+ already has structured **Historia Clínica** and **Eventualidades** panels, but migration is manual retyping. There is no paste parser or import modal for Drive-style text.

**Goal:** A **Clínico** modal to paste clipboard content copied from Drive, auto-detect the writing format, preview mapped data, and apply to the active patient or create a new patient — focusing v1 on **HC + eventualidades** only.

---

## Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Workflow | **C:** Active patient **or** create new patient from paste |
| v1 scope | **A:** HC + eventualidades only; pipe header used only when creating patient |
| Apply behavior | **C** default + **D** user choice: fill empty HC / replace HC / eventualidades only |
| Eventualidades | Append only; dedupe by `isoDate + normalized text prefix` |
| Format modes | **C:** Auto-detect + manual override; preview recalculates on change |
| Input | **A:** Clipboard paste only (no file, no Drive API) |
| Entry point | **A:** Single button on **Clínico** expediente bar |

---

## Non-goals (v1)

- Estado actual import (N/V/HD/HI/NM blocks)
- Patient diagnósticos list from `DX:` section
- Labs, medications → receta, JSON patient import changes
- Google Drive OAuth, `.txt` file picker
- Eventualidades in Interconsulta mode
- NLP or fuzzy diagnosis extraction

**Future (v2+):** patient demographics + DX (scope B), estado actual (scope C), declarative profile JSON, team default profile in settings.

---

## Architecture

### New modules

| Module | Role |
|--------|------|
| `lib/drive-import/registry.mjs` | Profile registry + `detectProfile(text)` |
| `lib/drive-import/normalize.mjs` | Text normalization |
| `lib/drive-import/segment.mjs` | Section splitting (HC, eventualidades, exclusions) |
| `lib/drive-import/parse-header.mjs` | Pipe header `cama \| nombre \| edad \| registro \| dx` |
| `lib/drive-import/profiles/drive-pipe-hc-v1.mjs` | Andrés-style HC mapping |
| `lib/drive-import/profiles/drive-ficha-hc-v1.mjs` | Víctor-style ficha + APNP/APPP |
| `lib/drive-import/profiles/drive-eventos-only-v1.mjs` | Eventualidades-only fragments |
| `lib/drive-import/profiles/drive-fragment-v1.mjs` | Low-confidence fallback |
| `lib/drive-import/map-to-hc.mjs` | Section → partial `HistoriaClinicaData` |
| `lib/drive-import/map-to-eventualidades.mjs` | Dated blocks → `{ at, text }[]` |
| `lib/drive-import/parse-drive-document.mjs` | Orchestrator: text → parse result + warnings |
| `public/js/features/drive-import-modal.mjs` | Modal UI, apply, undo snapshot |
| `public/js/features/drive-import-modal.test.mjs` | Integration with fixtures |
| `lib/drive-import/fixtures/*.txt` | Golden samples from real Drive docs |

### UI entry

- Button **Importar desde Drive** on Clínico expediente chrome (`pase-board.mjs` or consolidated clinico header partial).
- Modal markup in `public/partials/` or inline in existing modals region in `app-body.html` (follow `ea-paste-backdrop` pattern).

### Flow

```
paste → normalize → detectProfile → segment → map HC? + map eventualidades → preview
  → user confirms mode → create patient OR apply to active → persist HC (versioned) + eventualidades
```

---

## Format profiles (v1)

| ID | UI label | Detection signals |
|----|----------|-------------------|
| `drive-pipe-hc-v1` | Guardia — encabezado \| y HC clásica | Line 1 `^\d+-\d+\s*\|`; `DX:`, `PEEA`, `HISTORIA CLÍNICA` with `ORIGEN:`; no `FICHA DE IDENTIFICACIÓN` |
| `drive-ficha-hc-v1` | Guardia — ficha + APNP/APPP | Pipe header + `FICHA DE IDENTIFICACIÓN` + `NOMBRE:`; `ANTECEDENTES PERSONALES NO PATOLÓGICOS` / `PATOLÓGICOS`; optional `FIUX`, `INTERROGATORIO` |
| `drive-eventos-only-v1` | Solo eventualidades | No HC block; ≥2 date lines `dd/mm`; little content before first date |
| `drive-fragment-v1` | Fragmento (revisar) | Below threshold for others |

**Auto-detect:** each profile returns `score` 0–100; winner if `score ≥ 40`; tie-break specificity: `ficha` > `pipe` > `eventos-only` > `fragment`. User can override in modal; preview re-parses on change.

### Reference documents (fixtures)

1. **Pipe HC** — single doc with `DX:`, flat `HISTORIA CLÍNICA`, `PEEA`, long `EVENTUALIDADES` with repeated daily boilerplate.
2. **Ficha HC** — `FIUX`, `FICHA DE IDENTIFICACIÓN`, split APNP, `PADECIMIENTO ACTUAL / PEEA`, `EVENTUALIDADES EN ESTE INTERNAMIENTO` (short bullets) + `EVENTUALIDADES` (long).
3. **Eventos short** — lines like `02/06` + bullet lines without boilerplate.
4. **Eventos long only** — dated paragraphs without pipe header (paste fragment).

---

## Segmentation

### Section headers (case-insensitive, line-based)

**HC / admission:** `HISTORIA CLÍNICA`, `FICHA DE IDENTIFICACIÓN`, `ANTECEDENTES HEREDOFAMILIARES`, `ANTECEDENTES PERSONALES`, `ANTECEDENTES PERSONALES NO PATOLÓGICOS`, `ANTECEDENTES PERSONALES PATOLÓGICOS`, `PADECIMIENTO ACTUAL`, `PEEA`, `INTERROGATORIO`, `DX:`, `MOTIVO DE CONSULTA`, `SIGNOS VITALES`, `MEDICAMENTOS`, etc.

**Eventualidades:** `EVENTUALIDADES`, `EVENTUALIDADES EN ESTE INTERNAMIENTO`

**Explicitly excluded from import (v1):** `ESTADO ACTUAL` and lines starting with `N:`, `V:`, `HD:`, `HI:`, `NM:` (monitoreo blocks stay in Drive until estado-actual import exists).

**Multiple eventualidades sections:** merge into one list, sort by date descending before preview and append.

### Pipe header regex

```text
^(\d+-\d+)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*AÑOS\s*\|\s*([\d-]+)\s*\|\s*(.+)$
```

Output: `{ cama, nombre, edad, registro, resumenDx }` for **create patient** only.

If `FICHA DE IDENTIFICACIÓN` has `NOMBRE:` / `EDAD:` / `SEXO:`, prefer ficha over pipe on conflict.

---

## HC mapping

### `drive-pipe-hc-v1`

| Drive section | R+ field |
|---------------|----------|
| `HISTORIA CLÍNICA` key:value lines | `identificacion.*` |
| `MOTIVO DE CONSULTA` | `motivoConsulta` |
| `SIGNOS VITALES DE TRIAGE` | `signosVitalesIngreso` |
| `ANTECEDENTES PERSONALES` | `apnp` (string fields) |
| `ANTECEDENTES HEREDOFAMILIARES` | `ahf.descripcionDetallada` / `entries` best-effort |
| ECD, meds, quirúrgicos, internamientos | `app` (structured where possible; remainder `descripcionDetallada`) |
| `PEEA` | `padecimientoActual` |
| `DX:` numbered list | **Not imported** in v1; show in preview as informational |

### `drive-ficha-hc-v1`

| Drive section | R+ field |
|---------------|----------|
| `FICHA DE IDENTIFICACIÓN` | `identificacion` + sex for new patient |
| `ANTECEDENTES PERSONALES NO PATOLÓGICOS` | `apnp` |
| `ANTECEDENTES PERSONALES PATOLÓGICOS` | `app` |
| `PADECIMIENTO ACTUAL / PEEA` | `padecimientoActual` |
| `PENDIENTES` | Append to `padecimientoActual` only if empty and mode allows |
| Long interconsulta / imaging reports | `app.descripcionDetallada` if no dedicated field |

### `drive-eventos-only-v1`

- `hcPatch = {}`; preview states “No se detectó HC”.

---

## Eventualidades extraction

### Entry start

Line matching date at line start:

- `d/m`, `d/m/yy`, `d/m/yyyy` (also tolerate `dd.mm.yy`)

### Year inference when year omitted

1. `FIUX:` or `FECHA DE INGRESO` with year in document
2. Else year from most recent dated line that includes year in same paste
3. If inferred month > current month in calendar year → use previous year

### Content modes

- **Short:** bullet lines or plain lines until next date (internamiento block)
- **Long:** full paragraph until next date (including “PACIENTE … CURSANDO DÍA N…” boilerplate — store full text in v1)

### Deduplication

```text
key = isoDate(at) + '|' + normalize(text).slice(0, 160)
```

Skip if key exists in existing `patient.eventualidades.entries` or earlier in same import batch. Preview shows count skipped.

### Persist

- Use `appendEventualidad` from `eventualidades-panel.mjs` (or shared helper extracted to `lib/` if needed for tests).
- Never delete existing entries in v1.

---

## Modal UX

### Layout

- **Left:** large textarea, character count
- **Center:** profile selector (auto + manual); apply mode (only when patient active):
  - **Completar vacíos en HC** (default)
  - **Reemplazar HC importable**
  - **Solo eventualidades**
- **Right:** scrollable preview (profile confidence, patient inferred, HC sections, eventualidades counts, warnings)

### CTAs

| Context | Primary CTA |
|---------|-------------|
| No active patient | **Crear paciente e importar** |
| Active patient | **Aplicar a [nombre]** |

Secondary (active patient): link **Crear otro paciente** (collapsed).

### Guards

- Disable apply if empty text or fatal parse error
- **Replace HC:** `confirm()` listing sections to overwrite
- Registro mismatch vs active patient: warning banner + extra confirm (non-blocking)
- `pushUndoSnapshot('Importar desde Drive')` before apply

### Success

- Toast: `HC actualizada · N eventualidades nuevas · M duplicadas omitidas`
- Navigate to **Historia clínica** if HC patched; else **Eventualidades**
- `addAuditEntry('drive-import', ...)`

---

## Persistence

### Historia clínica

- Use existing `createMutationBuilder('historiaClinica', patientId)`, `normalizeData`, `defaultHistoriaClinicaData`.
- **Fill empty:** per-section merge; assign only if destination string is empty after trim (or default interrogado with no user content — treat as empty).
- **Replace:** overwrite sections present in patch; omit untouched sections.
- Apply `applyClinicalHistoryUppercase` on save (same as panel).
- LAN: same versioned PUT path as manual HC edit.

### Create patient

1. `generatePatientId()`, `patients.unshift`
2. Fields: `nombre`, `edad`, `sexo`, `cama`, `registro`, optional `servicio`/`area` from sala context
3. Initialize HC + eventualidades in one `saveState`
4. `selectPatient(newId)`, open Clínico

---

## Apply modes summary

| Mode | HC | Eventualidades |
|------|-----|----------------|
| Completar vacíos (default) | Merge into empty fields only | Append new, dedupe |
| Reemplazar HC | Overwrite mapped sections | Append new, dedupe |
| Solo eventualidades | No change | Append new, dedupe |

---

## Error handling

| Case | Behavior |
|------|----------|
| Profile `fragment` | Strong warning; allow apply if dates found |
| Unmapped HC section | Ignore; list under “No mapeado” in preview |
| Unparseable date | Use today ISO + warning on that entry |
| `ESTADO ACTUAL` in paste | Warning “no se importará”; exclude from eventualidades |

---

## Testing

### Unit tests (`node --test`)

- `lib/drive-import/*.test.mjs` per profile using fixtures
- Assert: `profileId`, HC field samples, eventualidades count, no entries from `ESTADO ACTUAL` blocks
- Dedup: same paste twice → second apply skips duplicates

### Manual QA

1. Paste Andrés doc on empty patient → fill HC + many eventualidades
2. Paste Víctor doc → ficha fields populated
3. Paste short eventualidades only → 0 HC, events added
4. Active patient registro mismatch → warning shown
5. Replace HC mode → confirm dialog; sections overwritten
6. Create patient without active selection → new patient selected

---

## Files to touch (implementation hint)

| Area | Files |
|------|-------|
| Parser lib | `lib/drive-import/**` |
| Modal | `public/js/features/drive-import-modal.mjs`, partial HTML, CSS in existing clinical styles |
| Wire-up | `pase-board.mjs`, `app-runtimes.mjs` (`registerDriveImportRuntime`) |
| Bundle | `npm run build:ui` |

---

## Open questions (none blocking v1)

- Whether to extract `appendEventualidad` to `lib/` for parser tests without DOM (prefer small shared module).
- Team default profile in settings (deferred v2).

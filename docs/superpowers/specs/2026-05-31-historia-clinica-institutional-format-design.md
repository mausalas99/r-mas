# Historia Clínica — formato institucional y navegación Sala

> **For implementation:** After this spec is approved in review, use **superpowers:writing-plans** to produce the task-by-task implementation plan. Do not start coding from this document alone.

**Date:** 2026-05-31  
**Status:** Approved (2026-05-31) — includes fast-fill + coherent read-view requirements.  
**Supersedes (partial):** UI/data shape sections of `docs/superpowers/specs/2026-05-30-static-clinical-history-design.md` (LAN sync, safety catalog, lab anchor, audit, and ConflictResolver remain authoritative unless contradicted here).

**Reference inputs:**

- Paper template: `HC format.pdf` (encabezado, ficha, AHF, APNP, APP, motivo, PEEA vitals/labs).
- Institutional web form (screenshots 2026-05-31): checklist + “Negado” / “Ninguno” shortcuts, descripción detallada, IPAS por sistemas, antecedentes sexuales/género, padecimiento al ingreso en paso 2.

**Related specs:**

- `docs/superpowers/specs/2026-05-30-static-clinical-history-design.md` — entity versioning, lab hybrid C, safety audit, archive
- `docs/superpowers/specs/2026-05-30-lan-host-concurrency-design.md`
- `docs/superpowers/specs/2026-05-30-clinical-calculator-safety-design.md`

---

## Problem statement

R+ has a first-pass **Historia ingreso** panel (five textareas) that does not match the institution’s real **Historia Clínica** workflow (structured antecedents, checklists, IPAS, stepwise completion). Navigation in **modo Sala** splits **Estado actual** as a top-level tab while **Eventualidades** does not exist. **Interconsulta** incorrectly exposes Historia. Labels say “Historia ingreso” instead of **Historia Clínica**.

## Goals

- [ ] **Historia Clínica** UI mirrors institutional flow (checklists, Negado/Ninguno, stepper, IPAS blocks) adapted to R+ design tokens.
- [ ] **Sala — Clínico** segment order: **Historia Clínica → Estado actual → Eventualidades → Manejo**; default segment on open: Historia Clínica.
- [ ] **Sala:** remove top-level **Estado actual** tab; mount existing estado-actual panel inside Clínico.
- [ ] **Interconsulta:** **no** Historia Clínica, Estado actual segment, or Eventualidades; Clínico keeps Nota / Indicaciones / VPO / Manejo.
- [ ] Rename all user-facing copy to **Historia Clínica**.
- [ ] New **Eventualidades** panel under Clínico (Sala only).
- [ ] Preserve: `historiaClinica` versioned entity, LAN PUT/GET, APP safety rules, lab anchor, audit_log, discharge archive.
- [ ] **Fast fill:** defaults **interrogado y negado** where applicable; prefill patient; keyboard-friendly stepper; progress preserved between sessions.
- [ ] **Coherent read view:** when HC is complete (or not editing), one scrollable **lectura** layout that reads like a finished historia — not a disabled form.

## Non-goals (v1)

- Pixel-perfect clone of external purple multi-page site.
- PDF/Word export matching hospital letterhead.
- NLP on free text.
- Eventualidades in Interconsulta or inside `historiaClinica` JSON.
- Server-side safety rule evaluation (unchanged: client evaluates).
- Duplicating **daily** Estado actual (N/V/HD/HI/NM) inside Historia Clínica — admission narrative only in HC.

---

## Terminology

| Term | Meaning |
|------|---------|
| **Historia Clínica (HC)** | Versioned admission snapshot per patient (`historiaClinica` entity). |
| **Padecimiento al ingreso** | Large narrative in HC step 2 (`padecimientoActual`) — frozen at admission. |
| **Estado actual (tab)** | Existing `estado-actual-panel.mjs` — ongoing SOAP/monitoreo, not the HC narrative. |
| **Eventualidades** | Per-patient log of incidents during hospitalization (new). |
| **IPAS** | Interrogatorio por aparatos y sistemas — checklist blocks per system. |
| **Interrogado y negado** | Default for any block that supports it (IPAS, género, etc.); user only edits when something is positive/relevant. |
| **Ninguno** | APNP-only quick action to clear lifestyle fields. |

---

## Navigation architecture

### Top-level expediente tabs

| Mode | Tabs |
|------|------|
| **Sala** | `paciente`, `clinico`, `resultados`, `salida` |
| **Interconsulta** | `paciente`, `clinico`, `resultados`, `salida` |

**Remove** `estadoActual` from `CONSOLIDATED_TABS_SALA`.

### Clínico segment bar

| Segment id | Label (UI) | Sala | Interconsulta |
|------------|------------|------|----------------|
| `historia` | Historia Clínica | visible | **hidden** |
| `estadoActual` | Estado actual | visible (hosts `exp-pane-estado-actual`) | hidden |
| `eventualidades` | Eventualidades | visible | hidden |
| `manejo` | Manejo | visible (unless `hideManejoSection`) | visible (unless hidden) |
| `notas` | Nota de evolución | hidden | visible |
| `indica` | Indicaciones | hidden | visible |
| `vpo` | VPO | hidden (VPO under Salida in Sala) | visible |

**`getClinicoSections(settings)`:**

- Sala: `['historia', 'estadoActual', 'eventualidades', 'manejo']` (filter `manejo` when hidden).
- Interconsulta: unchanged `['notas', 'indica', 'vpo', 'manejo']` (no `historia`).

**Defaults:**

- `defaultGranularForConsolidatedTab('clinico', sala)` → `'historia'`.
- `migrateGranularInner('estadoActual', sala)` → `'estadoActual'` (still valid as **segment**, not top tab).
- `resolveConsolidatedTarget('estadoActual', sala)` → `{ tab: 'clinico', section: 'estadoActual' }`.

### Files to update (navigation)

| File | Change |
|------|--------|
| `public/js/expediente-tabs.mjs` | Tabs, sections, maps, visibility sync |
| `public/js/expediente-tabs.test.mjs` | Sala/Inter expectations |
| `public/partials/layout/app-body.html` | Segment buttons, pane mounts, labels |
| `public/index.html` | Mirror if duplicated |
| `public/js/features/pase-board.mjs` | Render routing for `eventualidades`, EA mount |
| `public/js/features/patients-tab-preserve.test.mjs` | Inner tab preservation |
| `public/js/tour-targets.mjs` | Copy if references Historia ingreso |

---

## Historia Clínica — UX (institutional pattern → R+)

### Pattern

**In-tab stepper** (3 steps) inside segment **Historia Clínica** — same information architecture as institutional pages 1–2, without external chrome.

| Step | Title | Content |
|------|-------|---------|
| **1** | Identificación y antecedentes | Ficha/identificación, motivo de consulta, APNP, APP (checklists + detalle), AHF (checklist + detalle) |
| **2** | Padecimiento e IPAS | Antecedentes por género, antecedentes sexuales, padecimiento al ingreso, datos negados, IPAS cards |
| **3** | Ingreso y labs | Signos vitales al ingreso, laboratorios de ingreso (anchor), save/review |

**Controls:** step indicator in panel header; **Anterior** / **Siguiente**; on last step **Guardar** uses existing versioned save + safety gate.

**Panel modes (desktop):**

| Mode | When | UI |
|------|------|-----|
| **Lectura** | Default after save; `editMode: false` | Compiled narrative (see § Coherent read view) — single scroll, section headings, prose |
| **Edición** | User clicks **Editar historia** | 3-step stepper + form controls |

Mobile: **Lectura** summary only (compiled text teaser + “Abrir en desktop para editar” if incomplete).

**Edit mode:** toggles Edición ↔ Lectura; saving returns to Lectura.

### Fast fill (speed + ease)

| Mechanism | Behavior |
|-----------|----------|
| **Prefill** | Patient demographics → identificación / encabezado on create |
| **Default interrogado y negado** | On **create**, every block that supports it starts with `negado: true`, empty checks, descripcion = `Interrogado y negado` (see § Defaults). User only changes blocks with relevant findings. |
| **Reset to negado** | Optional per-block control (re-apply default if user cleared by mistake); not required on first fill. |
| **IPAS — Negar todos** | Step 2: re-applies default to **all** IPAS systems (same as initial create state) |
| **Step progress** | `meta.lastStep` restored when reopening Edición |
| **Step completeness** | Stepper shows dot/check when step meets minimum (motivo non-empty; step 2 padecimiento or all IPAS negado; step 3 labs confirmed) |
| **Keyboard** | Logical tab order within step; focus first field on step change; `Ctrl+Enter` / toolbar **Siguiente** |
| **No dead ends** | Siguiente always available; validation blocking only on **Guardar** (labs confirm, safety ack) |

### Coherent read view

**Module:** `lib/historia-clinica/compile-narrative.mjs` (pure, tested).

**Input:** `HistoriaClinicaData` + catalogs (condition labels).

**Output:** ordered sections for render:

```ts
type CompiledHcSection = { id: string; title: string; body: string };
// e.g. { title: "Motivo de consulta", body: "Sangrado por traqueostomía..." }
```

**Rules:**

1. **Omit empty** subsections; never print “undefined”.
2. **Checklists → prose:** selected APP/AHF conditions as comma-separated labels; if only Negado, print `Negados` or stored descripcion.
3. **IPAS:** one paragraph per system: `General: interrogado y negado.` or list positive findings + detalle.
4. **Order matches clinical reading flow:** Identificación → Motivo → APNP → APP → AHF → Género → Sexual → Padecimiento → Datos negados → IPAS (collapsed summary optional if all negado: `IPAS: interrogado y negado en todos los sistemas`) → Signos vitales → Laboratorios (fecha + eTFG/Cr line from anchor).
5. **Lectura UI:** `hc-read-view` — `card` per compiled section; monospace only for labs block; **Copiar historia** builds plain text from same compiler (reuse `navigator.clipboard` pattern from estado actual / notas).

**Why separate compiler:** single source for on-screen lectura, clipboard, and future PDF export.

**Reusable UI blocks:**

```ts
// ChecklistBlock — APP/AHF (pathology pick-list); IPAS + género (interrogado y negado default)
{
  options: { id, label }[],
  selectedIds: string[],
  detailText: string,
  negado?: boolean,
  defaultMode?: 'interrogado_y_negado' | 'empty',  // IPAS, género: former
  quickActions?: ['reset_negado' | 'ninguno'],
}
```

### Defaults — “interrogado y negado”

**Canonical string:** `Interrogado y negado` (store in `lib/historia-clinica/defaults.mjs` as `HC_INTERROGADO_NEGADO`).

**On new Historia Clínica (`defaultHistoriaClinicaData`):**

| Block | Initial state |
|-------|----------------|
| **Each IPAS system** (all ids in catalog) | `{ checks: [], descripcion: HC_INTERROGADO_NEGADO, negado: true }` |
| **Género** | same |
| **Datos relevantes negados** | `HC_INTERROGADO_NEGADO` (or expanded institutional symptom list ending in “interrogado y negado” — v1: single constant) |
| **Sexual** (fields that are “negado” in form) | `portadorVih: 'negado'`, ETS text `NEGADAS` / negado per catalog defaults |
| **APP / AHF** | **Not** auto-negado — empty checklist + empty descripcion until user documents pathology |
| **APNP** | Empty fields (optional **Ninguno** sets “Negado” per field if user prefers; not default on create) |

**When user checks a positive finding:** clear `negado` on that block (or set `negado: false`), set `detailText` to findings; selected checklist ids as needed.

**Compiler:** if `negado === true` and no checks, render `Interrogado y negado` (not blank).

- **Reset to negado:** per-block — restore default row (clear checks, `negado: true`, descripcion constant).
- **Ninguno:** APNP-only — clear lifestyle fields.

### Step 1 field list (minimum v1)

**Identificación:** informante, lugarNacimiento, ocupacionActual, ocupacionAnterior, escolaridad, estadoCivil, religion (+ prefill nombre/edad/registro/dx/cama from patient where available).

**Motivo de consulta:** single line (prominent).

**APNP:** tabaquismo, alcoholismo, toxicomanias, tatuajes, deportesPasatiemposMascotas, dieta + **Ninguno**.

**APP:**

- Checklist: parotiditis, tuberculosis, hipertension, diabetes, otro, … (catalog in `lib/historia-clinica/catalogs/app-conditions.json`).
- descripcionDetallada, hospitalizacionesPrevias, transfusiones, traumaticos, inmunizaciones, medicamentosActuales, alergias.

**AHF:**

- Checklist: diabetes, hipertension, neoplasia, … (`catalogs/ahf-conditions.json`).
- descripcionDetallada (family member lines).

### Step 2 field list (minimum v1)

**Género:** checklist — **defaults to interrogado y negado**; user edits only if positive.

**Sexual:** structured fields; negation-friendly fields default to negado / NEGADAS; user fills IVS etc. when relevant.

**Padecimiento al ingreso:** `padecimientoActual` (textarea) — admission narrative only (empty until user writes).

**Datos relevantes negados:** defaults to `Interrogado y negado`; user replaces when documenting specific negated symptoms.

**IPAS:** `ipas: Record<systemId, ChecklistBlock>` — **v1 ship:** `general`, `tegumentos` (+ catalog for more). **Every system pre-seeded interrogado y negado** on create; user opens only systems with positives.

### Step 3

- **Signos vitales al ingreso:** string or keyed object (v1 string acceptable; parser reuse from `estado-actual-parser` deferred).
- **Labs:** unchanged from 2026-05-30 spec (lookback, confirm, `labAnchor`, `labsAtAdmission`, Re-sincronizar).

---

## Historia Clínica — data model

### Entity

Unchanged: `entityType: historiaClinica`, key `hc:{patientId}`, bundle entity, version + ConflictResolver.

### Document shape (`data`)

```ts
type HistoriaClinicaData = {
  patientId: string;
  createdAt: string;
  updatedAt: string;
  editMode: boolean;
  labLookbackHours: number;
  labAnchor: LabAnchor | null;
  labsAtAdmission: LabsAtAdmission | null;
  meta: {
    admissionConfirmedLabs?: boolean;
    lastStep?: number;  // UI hint only; not authoritative for merge
    createdByClientId?: string;
  };

  identificacion: {
    informante?: string;
    lugarNacimiento?: string;
    ocupacionActual?: string;
    ocupacionAnterior?: string;
    escolaridad?: string;
    estadoCivil?: string;
    religion?: string;
    // encabezado prefill mirrors
    cama?: string;
    registro?: string;
    dx?: string;
  };

  motivoConsulta: string;

  apnp: {
    tabaquismo?: string;
    alcoholismo?: string;
    toxicomanias?: string;
    tatuajes?: string;
    deportesPasatiemposMascotas?: string;
    dieta?: string;
  };

  app: {
    conditions: string[];       // checklist ids
    descripcionDetallada: string;
    hospitalizacionesPrevias: string;
    transfusiones?: string;
    traumaticos?: string;
    inmunizaciones?: string;
    medicamentosActuales: string;
    alergias?: string;
  };

  ahf: {
    conditions: string[];
    descripcionDetallada: string;
  };

  genero: { checks: string[]; descripcion: string; negado?: boolean };
  sexual: {
    ivsEdad?: string;
    preferencias?: string;
    parejas?: string;
    portadorVih?: 'si' | 'no' | 'negado';
    fechaDxVih?: string;
    ets?: string;
  };

  padecimientoActual: string;
  datosNegados: string;
  ipas: Record<string, { checks: string[]; descripcion: string; negado?: boolean }>;

  signosVitalesIngreso: string;
};
```

**Removed:** top-level flat `ficha`, `ahf`, `app`, `apnp`, `peea` strings.

### `changedKeys` (section-level merge)

| Key | Maps to |
|-----|---------|
| `identificacion` | `identificacion` |
| `motivoConsulta` | `motivoConsulta` |
| `apnp` | `apnp` |
| `app` | `app` |
| `ahf` | `ahf` |
| `genero` | `genero` |
| `sexual` | `sexual` |
| `padecimientoActual` | `padecimientoActual` |
| `datosNegados` | `datosNegados` |
| `ipas` | `ipas` (whole object v1 — avoid per-system merge complexity) |
| `signosVitalesIngreso` | `signosVitalesIngreso` |
| `labsAtAdmission` | labs fields |
| `labAnchor` | `labAnchor` |
| `meta` | `meta` |

### Migration from legacy flat shape

On load (client + optional host migrate hook):

1. If `data.ficha` / `data.app` etc. exist (legacy), map into `identificacion` + `app.descripcionDetallada` / `padecimientoActual` as best-effort.
2. Drop legacy keys after migration in memory before save.
3. One-time unit test with fixture from current panel default.

### Prefill (Sala, create)

From `patients[]` active record: nombre → identificacion; edad, sexo; cama; registro; diagnosticos → dx; defaults for `labLookbackHours` from settings.

---

## Clinical safety (unchanged engine, new text source)

- **Scan target:** concatenate for normalization:
  - `app.medicamentosActuales`
  - `app.descripcionDetallada`
  - labels of selected `app.conditions` from catalog
- **PEEA predicates:** use `padecimientoActual` + `datosNegados` where rules need `peea` context (replace old `peea` field).
- **APNP:** no drug rules (unchanged).
- **Audit / acknowledge:** unchanged from 2026-05-30 spec.

---

## Eventualidades (new)

### Placement

Clínico segment `eventualidades`, Sala only, between Estado actual and Manejo.

### Data (v1)

**Option A (recommended):** patient-scoped field on host patient record:

```ts
patient.eventualidades: {
  entries: Array<{
    id: string;
    at: string;      // ISO
    text: string;
    clientId?: string;
  }>;
}
```

Version via existing patient PUT + `changedKeys: ['eventualidades']` if patient entity is versioned; else append-only with LWW on `entries` array (implementation plan must verify patient mutation path).

**Option B:** separate entity `eventualidades:{patientId}` — use if patient PUT cannot carry array cleanly.

### UI

- List newest-first.
- Add row: textarea + “Agregar”.
- Edit/delete own entries optional v1.1.

### LAN

- Broadcast on save if patient sync includes field; document in plan.

---

## HTTP / schema

- Update `lan-squad/schemas/historia-clinica-mutation.json` (or `historia-clinica-validate.js`) for nested shape.
- Reject legacy flat keys on PUT after migration period (400 with hint) — or accept and normalize server-side once.

---

## Testing strategy

| Area | Tests |
|------|--------|
| `expediente-tabs` | Sala tabs without top EA; clinico sections order; Inter has no historia |
| `historia-clinica-panel` | Step navigation, Negado sets text, migration fixture |
| `catalogs` | APP/AHF/IPAS option ids stable |
| `evaluate.mjs` / safety | Scan uses concatenated APP text |
| `host-router` | Nested schema valid PUT; 409 same-section |
| Eventualidades | Add entry, list order |

---

## Implementation order (suggested)

1. Navigation + labels + tests (`expediente-tabs`, HTML segments, EA mount under clinico).
2. Eventualidades panel (minimal list + patient field).
3. HC catalogs + data model + migration.
4. HC UI stepper + ChecklistBlock components.
5. Wire safety text source + schema validation.
6. Manual QA: Sala walkthrough, Inter consulta regression.

---

## Resolved decisions

| Question | Decision |
|----------|----------|
| HC scope | Admission ingreso including padecimiento + IPAS; not daily EA template |
| UI metaphor | 3-step in-tab stepper + R+ cards (adapted from institutional web form) |
| Interconsulta HC | Hidden |
| Sala Clínico order | HC → EA → Eventualidades → Manejo |
| Manejo | Fourth segment (option A) |
| Label | Historia Clínica |
| Eventualidades | New segment; not in HC entity |
| Approach | Hybrid checklist + structured fields (not 5 textareas) |
| Interrogado y negado | **Default** on create for all blocks that support it; edit only when relevant |
| APP/AHF | No auto-negado (pathology documented explicitly) |

---

## Spec self-review (2026-05-31)

- [x] No TBD placeholders; IPAS additional systems explicitly phased via catalog file.
- [x] Consistent with prior LAN/safety/archive spec; navigation changes explicit.
- [x] Admission vs daily Estado actual distinction explicit to avoid duplicate narratives.
- [x] Scope includes navigation + HC redesign + Eventualidades v1 — large; implementation plan may split into two plans (nav/eventualidades vs HC form) if needed.
- [x] Eventualidades storage documents Option A vs B for plan author to resolve against `host-store` patient mutations.

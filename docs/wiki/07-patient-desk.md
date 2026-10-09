# 7 · The patient desk: Estado actual, meds, pendientes, census

> **You'll learn:** how the parts of the desk beyond labs work: Estado actual (vitals, glucose, I/O, meds by body system), the medication pipeline from a SOME receta to the SOAP line, pendientes and reminders, the agenda, the census and its PDF, the Resumen glance, and every clinical calculation R+ performs.
>
> **Prereqs:** [03](./03-shared-state-and-wiring.md) (live state, persist + push), [06](./06-labs-to-word.md) (labs)

Paths: `js/` = `packages/core/public/js/`, `feat/` = `js/features/`.

---

## How the desk fits together

```
 SOME receta paste ──► Medications (medReceta) ──"Llevar a SOAP"──► Estado actual: pendienteReceta
                              │                                           │ confirm per field
                              │ abx items                                 ▼
                              ▼                                    estadoClinico (confirmed meds)
                         Census ATB / Meds                                 │
                                                                           │
 EA paste / form ──► monitoreo.historial (mediciones) ──deriveSnapshot()──►│
                              │                                           ▼
                              ├──► Census Signos / I-E-B          buildEstadoActualText()
                              ├──► Guardia "Alterados", Inicio de turno     │ N / V / HD / HI / NM lines
                              └──► Resumen glance                           ▼
                                                              «Traer de Estado actual» → note.evolucion
 Receta ESTUDIOS rows ──► Pendientes (todos) ──► census Pend., reminders, handoff
 Agenda modal ──► scheduledProcedures ──► week view
```

---

## 1. Estado actual (EA): the daily monitoring record

### The data lives on the patient
`patient.monitoreo` (`feat/estado-actual-data-model.mjs` → `emptyMonitoreo()`):

| Field | Holds |
|---|---|
| `historial[]` | **mediciones**: one row per recording (vitals, glucose, I/O) |
| `estadoClinico` | the "current state": FOUR score, orientation (esferas), 17 med fields, ventilation (soporte, FiO₂, VM settings, PaO₂), diet and kcal |
| `pendienteReceta` | med text proposed from the receta, waiting for confirmation |
| `confirmado` | which med fields the clinician confirmed |
| `textoGuardado` | the last pasted EA text |

The 17 med fields (`MED_FIELD_KEYS`, `feat/estado-actual-data-constants.mjs`): analgesia, antiemeticos, sedacion, antiepilepticos, antiparkinsonianos, antidotos, viaAerea, vasop, antihta, antitromboticos, anticoagulacion, antiarritmicos, diureticos, estatinas, abx, transfusiones, nm.

### One medición
Built by `parseFormMedicion()` (`feat/estado-actual-panel-actions.mjs`):

- `id`, **`recordedAt`** (the clinical time, editable) and **`savedAt`** (the real clock, used by sync)
- `vitals`, `vitalSeries` (several readings per vital per turn, **max 4**), `alteredAt`
- `glucometrias[{value, time, altered, rescueUnits, postRescueValue}]`, or `bombaInsulina[]` for an insulin pump
- `io {ing, egr, egrParts, evac, ingTurnos[3], egrTurnos[3], eventos}`

`registrarEstadoActualMedicion()` saves **against the patient the form was opened for**, not whoever is active by the time you hit save. This is a patient-safety guard. It then calls `persistClinicalState` + `scheduleCloudSyncPush` (the usual pair from [03](./03-shared-state-and-wiring.md)).

### The snapshot is derived, never stored
`deriveSnapshot()` (`feat/estado-actual-data.mjs`) sorts the live historial and computes the current vitals, glucose, I/O, temperature peak and BP pairs on demand. Every consumer (census, guardia, Resumen, note text) calls it, so they can't disagree about "current vitals".

### The paste parser
`parseEstadoActualPaste(raw)` (`feat/estado-actual-parser.mjs`) accepts lines in any order: `T°`, `FC`, `FR`, `TA`, `SAT` (with support hints), `DXT` (`120`, `120@07:00`, `120 (07:00)`), `I`, `E`, `EVAC`. A `B` (balance) line is **ignored on purpose**, because R+ calculates the balance. If no line matches, it falls back to scanning inline patterns.

### What counts as "altered"
`feat/estado-actual-ranges.mjs`:

| Vital | Normal range |
|---|---|
| TAS | 90–140 |
| TAD | 60–90 |
| FC | 60–100 |
| FR | 12–20 |
| Temp | 36.0–37.5 (fever peak ≥ 38) |
| Sat | ≥ 94 |
| Glucose | 70–180 |

`isVitalKeyAltered(key, raw)` (commit `7d44e43`) is the single check used by the EA charts, the guardia census *Alterados* column and Inicio de turno. Before that commit, any reading with a time was marked altered.

### I/O balance
`feat/estado-actual-io.mjs`: balance = intake − **all numeric egress parts** (diuresis, drains, gastrostomy, nephrostomy, UF). `balanceTurno()` uses the latest row with a balance; `balanceGlobalHistorico()` sums all rows. Turn events include HD, transfusion, volume load and the **furosemide challenge** (≥ 200 mL in 2 h = *respondedor*).

The I/O charts (`buildDailyBalanceSeries`, the per-turn series) use the same egress total (`ioNumericEgressTotal`), so the chart and the turn balance agree for patients with drains.

### From EA to the note's N / V / HD / HI / NM lines
`buildEstadoActualText()` → `assembleSoapLines()` (`feat/estado-actual-text-build.mjs`):

| Line | Built from |
|---|---|
| **N** (neuro) | FOUR x/16, orientation, analgesia/antipyretics, antiemetics, sedation, antiepileptics… |
| **V** (ventilatory) | FR, SatO₂, support clause (+ calculations), airway meds |
| **HD** (hemodynamic) | label, TA, FC, vasopressors, antihypertensives, thromboprophylaxis ("NINGUNO" if none), anticoagulation… |
| **HI** (infectious) | FEBRIL/AFEBRIL, temperature peak (if ≥ 38, ≤ 5 days old), antibiotics, transfusions |
| **NM** (nutrition/metabolic) | diet + kcal/protein, I/O clause, glucometrías, insulin pump or rescue clause |

HD label: `resolveHemodynamicLabel(v, vasop)` returns **`¿INESTABLE?`** when `isHemodynamicallyUnstable()` (`estado-actual-ranges.mjs`) flags low TA, abnormal FC or any confirmed vasopressor, and **`ESTABLE`** otherwise. R+ flags; the doctor confirms or edits the word in the note. The legacy SOAP modal (`soap-estado.mjs`) uses the same function.

### Worked example: «Traer de Estado actual»
1. The note's button (`data-onclick="estadoActualEnviarANota"`) → `commitEstadoActualToNote()`.
2. `buildNotePatchFromEstadoActual()` (`note-from-estado-actual.mjs`) → `{ evolucion: <full EA text>, vitals: {ta, fr, fc, temp, peso} }` from `deriveSnapshot`.
3. If Evolución already has text → a **replace confirmation** dialog.
4. Vitals fill **only empty** note fields and never overwrite what the clinician typed.
5. Stamp, persist, push, navigate to Notas.

### How EA syncs (field-wise, not whole-value)
`mergeMonitoreo()` (`feat/estado-actual-data-merge.mjs`):

- `historial`: **union by row id**; if both sides have a row, the newer `savedAt` wins. Deletes are markers (`{id, deleted:true}`), so a delete spreads instead of being resurrected.
- Scalars (FOUR, esferas, soporte…): LWW on `estadoClinicoUpdatedAt`, and **an empty side never clobbers a filled one**.
- Confirmed meds: a remote confirmation fills an unconfirmed local field.

The Worker has its **own copy** of this merge (`cloud/sync-worker/src/monitoreo-lww.js`), and the copies have drifted:

| | Client | Worker |
|---|---|---|
| Med fields merged | 17 | **12**: missing vasop, anticoagulacion, antiarritmicos, estatinas, nm |
| Historial winner | `savedAt` | `recordedAt` only |
| `manualMeds` union | yes | no |

---

## 2. Medications

### The receta store
`medRecetaByPatient[pid] = { items[], dietas[], pasteRaw, fechaActualizacion }`. Each item carries `nombreRaw`, `dosisRaw`, `frecuenciaRaw`, `viaRaw`, `suspendido`, `soapCatOverride`, `diaTratamiento`. `js/med-receta-core.mjs` is a barrel over parse (`parseIndicacionesPaste` for the SOME block), catalog, diet, format, IV/oral and SOAP.

### Where does a drug go? (`classifyMedicationSoapCategory`, `js/med-receta-soap.mjs`)
Checked in order; first match wins:

1. **Aspirin by dose:** ≤ 160 mg → antithrombotic, otherwise analgesia
2. Racemic / inhaled epinephrine → airway
3. **Your catalog tokens** (`medCatalog`, a per-user overlay)
4. Name heuristics (antibiotics first, by prefix)
5. The **SOME catalog** (`med-receta-soap-some-map.mjs`)
6. Otherwise `otros`, which **must** be assigned by hand before «Llevar a SOAP» is allowed

A manual override (`soapCatOverride`) always wins. Excluded from SOAP: suspended items, nutrition, support/O₂, plain IV fluids (Hartmann, Ringer, NaCl 0.9 %, D5/D10), D50, and PRN meds that aren't analgesia (insulin rescues excepted).

Decision-log rules (2026-08-13) live in this code: paracetamol/metamizol = analgesia + antipyretic; buprenorphine = analgesia only; the SOME catalog expands EA destinations, **not** Manejo filters; potassium bags may be mixed (KCl + KPO₄).

### Worked example: receta → EA
1. Paste the SOME block → `medications-receta-processing.mjs` parses it.
2. Rows under ESTUDIOS / PROCEDIMIENTO **become pendientes** (`addPendientesFromParsedReceta`); imaging pairs are merged and duplicates skipped.
3. Tick "SOAP" on items → «Llevar a SOAP» (`mediLlevarASOAP`) → `bucketsFromRecetaItems` → `applyRecetaProposalForce` → EA opens with **proposals** in `pendienteReceta`.
4. The clinician **confirms each field** (`confirmMedField`), which moves it into `estadoClinico`. Nothing is applied without confirmation (decision log: Manejo automático retired, human-in-the-loop).

Separately, «Añadir a tratamiento» appends egreso-format lines to the note's *tratamiento*.

### Other medication tools
| Tool | What it does | Where |
|---|---|---|
| **Perfil farmacoterapéutico** | monthly grid of each drug × day (given / not given), adherence stats | `js/med-pharm-profile-core.mjs` |
| **Potassium replacement** | detects IV K salts (KCl / KPO₄ / K acetate), totals mEq, finds the carrier bag, derives the duration | `js/potassium-repos-detect.mjs` |
| **Antibiotics → census** | abx items → census *ATB* column as `NAME / Día N` (day advanced from the receta date) | `js/censo-meds-format.mjs` |
| **VPO** (preoperative assessment) | vitals from monitoreo, drugs from the receta, latest labs; risk scale results are **typed in** (no RCRI/Gupta computation found) | `js/vpo-data.mjs`, `vpo-lookups.mjs` |

---

## 3. Pendientes and agenda

### A pendiente
`{ id, text, completed, priority: alta|media|baja, createdAt, updatedAt, createdBy?, dueDate?, reminderAt?, completedAt/By?, inProgress?, handoffAcknowledgedAt? }`, stored per patient under `todos` (`feat/todos-mutations.mjs`).

- **Status buckets** (`js/todos-due.mjs`): vencido · hoy · próximo · sin fecha · listo.
- **Handoff pendientes** (`js/todos-handoff.mjs`): open, unacknowledged and **created by someone else**. These are what "nothing lost at handoff" means in code.
- **Census column** (`js/censo-pendientes-format.mjs`): up to 3 open items from the **highest non-empty priority**.

### Reminders (`js/todos-reminder-scheduler.mjs`)
- Only `reminderAt` triggers a reminder; a due date alone never does.
- One `setTimeout` per `pid:todoId`; a session "fired" set stops repeats.
- Skips patients that no longer exist (`isKnownPatient`), and `pruneOrphanTodos()` runs at boot and after every Nube pull (decision log 2026-08-13: stale reminders for deleted charts).

### Agenda
`scheduledProcedures`: `{ id:'proc-…', patientId, procedure, location, materialApproved, anesthesiaScheduled, start }`. The week view (`js/procedure-agenda-week.mjs`) starts on Monday and runs 06:00–22:00; every event is drawn as a 2-hour block, with overlaps split into lanes. Synced with `enqueueCloudAgendaUpsert`.

---

## 4. The census

> 💡 **Vocabulary trap:** in R+ copy, **"alta" means *admitting* a patient to the census** («+ Agregar da de alta»), not discharge. Removing a patient is **Archivar** or **Eliminar ×**.

### Sidebar
- Sections: archived > **Fijados** (pinned) > active (`feat/patients.mjs` `patientSectionKey`).
- Filters: sala / team / service (`feat/clinical-census-filters-state.mjs`).
- **Incompletos**: cuarto, cama or servicio missing (`js/patient-admission-incomplete.mjs`). Onboarding teaches "complete the card" early because documents need these fields.

### Worked example: deleting a patient
1. The × only shows if `canDeletePatientChart()` (`js/patient-delete-auth.mjs`) allows it: local-only mode, R4/Admin, or a patient on your team.
2. `deletePatient()` → undo snapshot → `commitPatientDeletes()`:
   - `removePatientLocally()` clears **every per-patient map** (notes, indicaciones, labHistory, medReceta, pharm profile, VPO, listado, todos, agenda) and reschedules reminders;
   - a **tombstone** is remembered and `enqueueCloudPatientDelete()` is queued.
3. On the Worker, `applyTombstone` (`lww.js`) removes the entry, wipes its lab/todo/agenda sidecars, and stores the tombstone under `registroFp` (the one-way chart-number fingerprint).

### The census PDF: where each column comes from
`js/censo-export.mjs` → `buildCensusPayload()` (non-archived, sorted by bed) → IPC → `renderCensusPdf()` in `generate-censo.js` (pdf-lib).

| Column | Source |
|---|---|
| Paciente | name + registro, age, dates, IC, team |
| Dx | `diagnosticosTextForCenso` |
| ATB / Meds | receta (see above), max 6 lines |
| Signos / I-E-B | `deriveSnapshot` + `balanceTurno`, or parsed `textoGuardado` |
| Labs | `formatLabsForCensoCompact` |
| Accesos | `formatAccesosForCenso` |
| Cultivos | `formatCultivosForCenso` |
| Pend. | top-priority open pendientes |

Columns that are empty for every patient are hidden.

---

## 5. Resumen (the patient glance)

`feat/patient-dashboard/dashboard-mount.mjs` → `buildDashboardModel()`: identity, current vitals (`deriveSnapshot`), access devices with day counts, labs glance, EA glance, up to 30 open pendientes. The EA glance (`ea-glance-model.mjs`) shows KPIs (support, PaFi, diet, pump) and packs the SOAP zones into three columns: **N+V | HD | HI+NM**. It's the only subscriber to the lab-history revision listener (see [03](./03-shared-state-and-wiring.md)).

---

## 6. Every clinical calculation

R+ **calculates and flags; it never interprets** (vision anti-goal). The calculations:

| Calculation | Where | Formula / threshold |
|---|---|---|
| eTFG | `js/labs-egfr.mjs` `computeEgfrCkdEpi2021Creatinine` | CKD-EPI 2021, race-free, age 18–120 |
| BUN/Cr | `js/labs-chemistry.mjs` | 1 decimal |
| Corrected calcium | `js/labs-calcium-corrected.mjs` | Ca + 0.8 × (4 − Alb); flag outside 8.5–10.5 |
| Anion gap | `js/labs-anion-gap.mjs` | Na − (Cl + HCO₃), flag outside 8–12; albumin-corrected; urinary AG |
| Delta-delta | `js/labs-gaso-section.mjs`, `gaso-extended-steps.mjs` | (AG − 12) / (24 − HCO₃) |
| Corrected reticulocytes | `js/labs-reticulocito-corregido.mjs` | Ret × Hto / 45; ≥ 2 % regenerative |
| Acid-base compensation | `js/gaso-extended-steps.mjs` | Winter 1.5 × HCO₃ + 8; respiratory 0.1 / 0.4 per Δ |
| A-a gradient, P/F | `js/gaso-extended-steps.mjs` | FiO₂ × 713 − PaCO₂ / 0.8 − PaO₂; expected age/4 + 4 |
| Ventilatory | `feat/estado-actual-ventilatorio.mjs` | PaFi, SpO₂/FiO₂, driving pressure, ROX, Vt mL/kg, Tobin; ARDS severity < 100 / < 200 / ≤ 300 |
| Diet kcal | `feat/estado-actual-data.mjs` | kcal total ↔ kcal/kg |
| Troponin delta % | `js/labs-troponin.mjs` | hs normal ≤ 34 ng/L |
| Potassium mEq | `js/potassium-repos-detect.mjs` | sum across K salts |
| Furosemide challenge | `feat/estado-actual-io.mjs` | ≥ 200 mL / 2 h |

---

## Check yourself

1. Two residents record vitals for the same patient at the same time on different laptops. Does one overwrite the other?
2. A resident types "B: +500" in an EA paste. What happens to it?
3. Why does `registrarEstadoActualMedicion` keep the patient id from when the form opened?
4. Where would you change which drug goes to "HI" in the SOAP picker without touching code?
5. A patient on norepinephrine at TAS 80: what does the generated HD line start with today?

<details><summary>Answers</summary>

1. No. Each medición is its own row with its own `id`; historial merges as a union.
2. Ignored. R+ computes balance from intake and egress.
3. So switching patients while the form is open can't write vitals into the wrong chart.
4. The per-user medication catalog (`medCatalog` soapTokens), which is checked before name heuristics.
5. `HD: ¿INESTABLE?`: the vasopressor (and TAS 80) trip `isHemodynamicallyUnstable()`, and the doctor confirms the word.
</details>

**Next:** [08 · The team layer →](./08-team-layer.md)

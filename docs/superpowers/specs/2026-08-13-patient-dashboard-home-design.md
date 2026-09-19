# Patient dashboard home (glance)

**Date:** 2026-08-13  
**Status:** Locked (including EA KPIs 2×2).  
**Clickable mock (SoT visual):** [docs/mocks/patient-dashboard-nav.html](../../mocks/patient-dashboard-nav.html)  
**Plan:** [../plans/2026-08-13-patient-dashboard-home.md](../plans/2026-08-13-patient-dashboard-home.md)

Selecting a patient opens a **one-viewport glance**, not Laboratorio paste. North star still applies: TTD / `.docx` stay in Clínico → Nota and ⌘K. Paste-anywhere / ⌘K still ingest into Laboratorio.

**Ideal user:** R1/R2 on 24h guardia. UI copy: Spanish.

---

## Locked decisions

### Navigation

```
Paciente | Laboratorio | Manejo | Agenda
   └── Resumen | Clínico | Salida
                 └── Labs | Tendencias | Cultivos
```

- Top tab **Paciente** replaces the Expediente label. Internal id stays `nota`. Default `activeAppTab = 'nota'` (today it is `'lab'` in `public/js/app.js`).
- Paciente inner (always visible): **Resumen | Clínico | Salida**. Default = Resumen (the bento).
- **Resultados moved under Laboratorio.** Inner: Labs | Tendencias | Cultivos.
- **Pendientes** is not a fifth pill. Widget → full list as a child of Resumen + “Volver al resumen.” Identity name → datos modal.
- Unify Pase “Resumen de ronda” with this dashboard (one home).
- **No “Generar nota”** on the glance.
- Header trailing CTA: **Actualizar labs** (`btn-med-secondary` → `openLabRepoBatchModal()`). Keep the same button on Laboratorio → Labs.
- Paste SOME stays secondary (collapsed). Paste-smart still `switchAppTab('lab')`.
- Keyboard / ⌘K: inner cycle depends on the top tab. `appTab.nota` copy = Paciente.
- Hybrid H: solid workbench, tokens only, no glass on modules, no tab-enter animation.

### Identity header

- **Do not repeat** cama / sala (already in census sidebar: `Cama 12 · Sala 1`).
- Keep: name (opens datos), **edad · sexo**, dx chips.
- **Servicios interconsultantes** module under dx chips.

### Servicios interconsultantes

Patients can be followed by other specialties that consult MI/Sala.

- **Sala is not a consulting service** — it is a hospital location and an internal-medicine rotation. Never in the IC catalog.
- Add via **+ Agregar** catalog; assigned chips toggle off.
- **Color palette A only (by category, 3 tints).** Palette B (per-specialty rainbow) was prototyped and **rejected**. Do not ship an A/B switcher.

| Category | Hue | Examples |
|----------|-----|----------|
| Médicas | `h: 245` índigo | Cardiología, Nefrología, Endocrinología, … |
| Quirúrgicas | `h: 168` teal | Cirugía general, Urología, … |
| Soporte | `h: 52` ocre | UTI, Nutrición clínica, … |

**v1 catalog** (ids are stable; persist these strings):

- Médicas: `card` Cardiología, `nef` Nefrología, `endo` Endocrinología, `inf` Infectología, `neumo` Neumología, `gastro` Gastroenterología, `hema` Hematología, `onco` Oncología, `reuma` Reumatología, `neuro` Neurología, `derma` Dermatología, `geri` Geriatría, `psiq` Psiquiatría
- Quirúrgicas: `cxgen` Cirugía general, `cxct` Cirugía cardiotorácica, `ncx` Neurocirugía, `uro` Urología, `tyo` Traumatología, `cxvas` Cirugía vascular, `orl` ORL, `oft` Oftalmología, `gine` Ginecología
- Soporte: `uti` UTI, `nutri` Nutrición clínica, `rehab` Rehabilitación, `algo` Algología, `pali` Cuidados paliativos

Persist as `interconsultServiceIds: string[]` on the existing patient JSON (no schema bump). Receta HU has a smaller consult-service list in `public/js/receta-hu-core.mjs` (`DEFAULT_RECETA_HU_CONSULT_SERVICES`) — do not reuse or merge those lists.

### Labs of the day

- Unit = **calendar day**; each envío stays **individual** (07:14 BH ≠ 14:20 gaso ≠ 18:05 BH). Do not merge hours.
- Reuse `groupLabHistoryByDay` in `public/js/lab-history-format.mjs`.
- Cultivos stay on Laboratorio → Cultivos.

**Two densities:**

- **Bento:** alteraciones only (red `*` chips like `.lab-value-altered`). Group by **study type inside one card per envío** (hora on the card; BH / QS / ESC / PFH / Gaso inside).
- **Laboratorio → Labs:** complete reports in current compact line style (`pase-lab-line`); every envío of the day stacked.

**Labs layout (do not reopen):**

- Dense envío (several study types, e.g. 07:14) takes a **full row**.
- Sparse envíos share the next row.
- Leftover width is absorbed by **chips growing** (`flex: 1 1 auto`), not empty card chrome and not an empty strip beside hug-boxes.
- Labs module **hugs vertical content**. Remaining viewport height belongs to Estado clínico / Eventualidades / Pendientes.
- **PaFi is not a lab analyte.** It is PaO₂/FiO₂ computed in EA (`estado-actual-ventilatorio.mjs`) when arterial gaso + FiO₂ exist. If missing, omit the chip — do not reserve a slot. Gaso bento chips = actual alteraciones (e.g. pH*, PaO₂*).

### Estado clínico bento

- **Do not duplicate vitals** (T/A, FC, FR, Temp, SatO₂, Glu, I/O live only in Signos vitales).
- KPIs from EA plan of care, not the monitor: Soporte, PaFi (if computable), Dieta, Bomba (if the pump is on). FOUR / esferas only if not at ceiling.
- **KPI chips are a 2×2 grid** (`grid-template-columns: 1fr 1fr`). Not 3+1. Omit empty chips; do not pad to four.
- SOAP med buckets with the same labels as EA (Diuréticos, Antihipertensivos, Tromboprofilaxis, NM).
- Click opens Clínico → EA.

### Fill the window (Resumen)

Resumen is a **viewport-filling glance**, not a scrolling document. Identity + vitals + labs hug their content; **Estado clínico / Eventualidades / Pendientes stretch** to the remaining height. Type and padding scale with the content well (`clamp` + container `cqi`/`cqh`). Deep views (Clínico, Labs completos, Pendientes list) may scroll.

Layout C (single column) is the narrow-window fallback only.

```
Identity (nombre → datos; edad/sexo; dx chips; servicios IC)     Actualizar labs
Signos vitales (full width)
Labs del día — alteraciones, one card per envío (hug height)
Estado clínico (2×2 KPIs + SOAP) | Eventualidades (last 3) | Pendientes (last 3 + overdue)
```

### Related (already shipped)

Silent update checks on boot / Actualizar labs / patient select (`public/js/features/platform/updater/silent-check.mjs`). Not part of this dashboard; do not regress `checkFeedback`.

---

## Click map

| Surface | Goes to |
|---------|---------|
| Name | Datos modal |
| IC chip / + Agregar | Catalog modal (palette A) |
| Vitals card | Clínico → EA (registro / snapshot) |
| Labs envío / “Reportes completos” | Laboratorio → Labs (that envío selected; rest of the day stays visible) |
| Estado clínico / Abrir EA | Clínico → EA |
| Eventualidades | Clínico → Eventualidades |
| Pendientes widget | Resumen child: full todos + “Volver al resumen” |

Paste-smart / Procesar SOME / ⌘K ingest → Laboratorio → Labs (unchanged).

---

## Out of scope

Manejo, Agenda, Guardia board, Pase census board chrome, Interno mobile, embedding `#lab-input` / full EA editor / tendencias grid on home, Receta HU consult-service list, schema bump.

---

## Implementation notes

- New renderer domain: `public/js/features/patient-dashboard/` + `public/styles/patient-dashboard.css`.
- Nav: `public/partials/layout/app-body.html` tab order/labels; `public/js/features/chrome.mjs` `appTab.nota` = Paciente; `activeAppTab` default `'nota'`.
- Inner: `expediente-tabs.mjs` / `expediente-group-row.mjs` — Resumen replaces Paciente leaf; Resultados → Lab inner.
- `patients-select.mjs` `handleLabTabAfterPatientChange` still stays on Lab if already there; **do not** force Lab on normal select.
- Unify `patients-round.mjs` ronda overview with this dashboard.
- Tests colocated; `npm run test:one` before `build:ui`; new `*.test.mjs` registered in `package.json` `scripts.test`.

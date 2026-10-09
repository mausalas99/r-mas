# 6 · From pasted labs to a Word note

> **You'll learn:** how a blob of SOME lab text becomes structured lab sets, how `*` marks get added, how the note's *Estudios* section is rebuilt, and the surprisingly low-tech way the `.docx` is filled.
>
> **Prereqs:** [02 · How the app is built](./02-how-the-app-is-built.md) (IPC, `data-onclick`)

This flow was R+'s original **magic moment** (decision log 2026-06-08: *"Paste the lab, print the note — before the next patient calls."*). The North Star has since widened to the shared shift board ([01](./01-the-big-picture.md)), but this pipeline is still the heart of the resident's desk, tracked as **TTD (time-to-document)**.

---

## The pipeline at a glance

```
 SOME text in #lab-input
        │  «Procesar»  (procesarReporte)
        ▼
 ┌─ SPLIT ─────────────────────────────┐   lab-bulk-paste.mjs
 │ by "--- PACIENTE ---"  → blocks      │
 │ by "Expediente:"        → reports     │
 └──────────────────────────────────────┘
        ▼
 ┌─ PARSE each report ─────────────────┐   labs-procesar.mjs / labs-extract.mjs
 │ header (Nombre, Expediente, fecha…) │
 │ cut out GASES/EGO/fluids first       │
 │ run section parsers BH→QS→…→cultivo  │
 │ mark out-of-range values with *      │
 └──────────────────────────────────────┘
        ▼
 ┌─ SAFETY + PREVIEW ──────────────────┐   status: ok / no-patient /
 │ match census patient by expediente   │           mixed-expediente / parse-errors
 └──────────────────────────────────────┘
        ▼  «Agregar al censo»
 ┌─ STORE ─────────────────────────────┐   lab-panel-workbench-store.mjs
 │ merge reports ≤ 2 h apart → lab set  │
 │ upsert into labHistory[patientId]    │
 │ rebuild note.estudios from history   │
 │ persist (400 ms debounce) + Nube     │
 └──────────────────────────────────────┘
        ▼  «Generar Nota» → Word
 ┌─ DOCX ──────────────────────────────┐   lib/doc-generators/*  (main process)
 │ unzip template.docx (JSZip)          │
 │ find sample text, replace with data  │
 │ re-zip → buffer → save to disk       │
 └──────────────────────────────────────┘
```

All paths below are under `packages/core/` (`public/js/…` = renderer, `lib/…` = Node).

---

## Step 1 — Splitting the paste

Entry: the **Procesar** button (`public/partials/chrome/overlays.html`, `data-onclick="procesarReporte"`) → `procesarReporte()` in `public/js/features/lab-panel-parse.mjs`. (There's also a global ⌘K / paste-anywhere path, `procesarSomeFromClipboard` in `features/paste-smart.mjs`.)

`public/js/lab-bulk-paste.mjs` does the cutting:

| Function | Splits on | Result |
|---|---|---|
| `splitBulkLabTextByPatient` | `--- PACIENTE ---` (`LAB_BULK_PATIENT_SEPARATOR`, case/space-insensitive) | one block per patient |
| `splitSomeReportsInBlock` | each `Expediente:` header | one chunk per SOME report |
| `parseReportChunk` | — | rejects non-SOME text, finds the census patient, calls the parser with that patient's previous reference ranges |

### 🛡️ The patient-safety rule
If one block contains **two different expediente "bases"** (the part before the `-`; `8100023-2` and `8100023-5` are the same base), that's a **mix** and the whole block is refused — the toast says *«…2 expedientes distintos… No se guardó nada»*. Exception: if exactly one of them is a census patient, that one is kept and the others are shown as conflicts — **never silently dropped**. This is the "human-in-the-loop over velocity" principle from the decision log.

---

## Step 2 — Parsing one report

`procesarLabs` is assembled in `public/js/labs.js` from `createProcesarLabs` in `public/js/labs-procesar.mjs`.

1. **Header** — Nombre, Expediente, Sexo, Edad, fecha/hora, Ubicación.
2. **Pre-cut the "foreign" panels** — GASOMETRÍA, EGO (urine), stool and CITOQUÍMICO blocks are carved out *first*, so the BH (blood count) and QS (chemistry) parsers can't accidentally read, say, a urine glucose as serum glucose.
3. **Section parsers in a fixed clinical order** — BH, coag, QS, ESC, PFH, lipase, gases, LCR, fluids, EGO, cultures, serology, troponin, …
4. **Output** — `{ patient, resLabs: string[] (one formatted line per section), bhExtras, refsBySection }`.

### Where the `*` comes from
`public/js/labs-extract.mjs`:

```js
export function marcarSegunRango(valorStr, min, max) {
  if (valorStr === '---' || valorStr == null) return valorStr;
  var v = labValueNumber_(valorStr);
  if (v == null || min == null || max == null) return valorStr;
  return (v < min || v > max) ? valorStr + '*' : valorStr;
}
```

The min/max come **from the SOME report itself**; if a report omits a range, the patient's earlier ranges fill the gap (`mergeRefsBySection_`). So `Hb 11.4*` means "below the range the lab printed".

> 🔁 **Vitals follow the same idea** (commit `7d44e43`, *Mark only out-of-range vitals*): fixed ranges in `features/estado-actual-ranges.mjs` (TAS 90–140, FC 60–100, Sat ≥ 94, glucose 70–180…) and `isVitalKeyAltered`. Before that fix, *any* timed reading showed as altered in the chart, census and Inicio de turno.

### Cultures (cultivos)
`public/js/labs-cultivo.mjs` (`parseCultivo_`) produces lines like `sitio fecha: germen · Preliminar · <resistance>` plus a compact antibiogram. They're excluded from trend charts (`tend-core.mjs`) and get their own *Cultivos* sub-heading in the note.

---

## Step 3 — Storing lab sets

`finalizeBulkLabPaste` → `storeBulkLabBlocks` (`features/lab-panel-workbench-store.mjs`):

- **Lab set** = one stored group of results for a date/time: `{ id, fecha, hora, resLabs, bhExtras, parsed, refsBySection, sourceText, updatedAt }` (`buildLabHistorySet`).
- **Consolidation:** reports of the same day and type within **2 hours** (`LAB_CONSOLIDATION_WINDOW_MS` in `lab-consolidation-cluster.mjs`) merge into one set. Duplicates are skipped.
- Sets live in `labHistory[patientId]`.
- `finalizeLabHistoryImport` then:
  1. auto-consolidates,
  2. **rebuilds the note's `estudios` text** from lab history (`rebuildEstudiosFromLabHistory` → `buildEstudiosCopyLinesFromLabSets` in `lab-history-format.mjs`). *Sala* mode includes the full history; *Interconsulta* mode only the latest lab day.
  3. queues the new sets for Nube (see [10](./10-nube-sync.md)).
- `persistClinicalState` (`clinical-repo-persist.mjs`) saves with a 400 ms debounce → IPC → the local DB (see [09](./09-storage-and-security.md)).

---

## Step 4 — Filling the Word template (the clever-but-fragile part)

The IPC path is in [02 § 6](./02-how-the-app-is-built.md#6-worked-example-generar-nota--a-docx-on-disk). Here's what happens inside `generate-document` in the main process.

A `.docx` is just a **zip of XML files**. R+ uses only **JSZip** — no templating library:

1. Unzip `template.docx`.
2. Read `word/document.xml` as a string.
3. **Find the sample patient's text and replace it.** The templates contain a fake patient; the code searches for exact text runs:

   ```js
   // lib/doc-generators/shared.js
   function replaceT(xml, oldVal, newVal) {
     const eOld = esc(oldVal), eNew = esc(newVal);
     let out = xml.split(`<w:t>${eOld}</w:t>`).join(`<w:t>${eNew}</w:t>`);
     …
   }
   ```

   | Anchor text in `template.docx` | Replaced with |
   |---|---|
   | `SINTETICO DE PRUEBA UNO` | patient name (both header copies) |
   | `8100023-2` | registro (expediente) |
   | `CIRUGÍA AB` / `MEDICINA INTERNA` | área / servicio |
   | `08/04/2026`, `09:00` | fecha, hora |
   | 5 evolución slots / 8 estudios slots | note lines |
   | `130/70`, `19`, … | vitals |
   | `DRA. MÓNICA SANCHEZ` | profesor |

   Lines that don't fit get joined with ` | ` into the last slot (`fitSlots`). Everything is uppercased. `esc()` escapes `& < >` and `$`.
4. Re-zip (DEFLATE) → buffer → back to the renderer → saved as `Nota_Evolucion_<nombre>_<fecha>.docx`.

The other templates work the same way: `template_indicaciones.docx` fills the first table's cells (`indicaciones-table-fill.js`); `template_listado.docx` builds table rows (`listado-table-body.js`).

> ⚠️ **Why "fragile":** if anyone opens `template.docx` in Word and retypes the sample name, Word may split `SINTETICO DE PRUEBA UNO` across several `<w:t>` runs (e.g. because of spell-check or formatting marks) and the replacement **silently stops matching**. If you ever edit a template, re-run `npm run e2e -- labs-to-docx` — it checks the name, room, date and XML escaping land in the output.

### The census is a PDF, not Word
`buildCensusPayload` (`public/js/censo-build.mjs`) → `exportCensoPdf` → `renderCensusPdf` in `generate-censo.js`, which draws a landscape page with **pdf-lib** (sections: Diagnósticos, Antibióticos, Medicamentos, Signos/I-O, Laboratorios, Accesos, Cultivos, Pendientes).

---

## Related features you'll meet in the same code

| Feature | One-liner | Where |
|---|---|---|
| **Nota de evolución** | Daily note form: interrogatorio, evolución (N/V/HD/HI/NM), estudios, diagnósticos, tratamiento, vitals | `features/notes-indicaciones.mjs` (`renderNoteForm`) |
| **Estado actual (EA)** | Structured daily monitoring (vitals, glucose, I/O, meds by system). «Traer de Estado actual» copies it into the note | `features/estado-actual-*.mjs`, `note-from-estado-actual.mjs` |
| **Indicaciones** | Medical orders sheet → `template_indicaciones.docx` | same file as the note |
| **Listado de problemas** | Active / inactive problem list → `template_listado.docx` | `listado-problemas-core.mjs` |
| **Pendientes** | To-dos with priority + reminder; census shows up to 3 | `features/todos-mutations.mjs` |
| **Agenda** | Weekly procedure calendar 06:00–22:00 | `features/agenda.mjs` |
| **Tendencias** | Lab trend charts (excludes cultures) | `tend-core.mjs`, `features/tendencias.mjs` |
| **Salas** | Ward list incl. UCI / PostQx / Subespecialidad (service «Rotación») | `lib/clinical-salas.mjs` |

---

## Try it yourself

1. Run `npm run e2e -- labs-to-docx` and read `scripts/e2e/labs-to-docx.e2e.mjs` side by side — it *is* this page as executable steps.
2. Read the header comment of `scripts/e2e/lab-paste-rules.e2e.mjs` — it lists every lab-paste rule in plain Spanish.
3. Unzip a generated note (`unzip -p Nota_*.docx word/document.xml | head -c 3000`) and find your patient's name inside `<w:t>` tags.

## Check yourself

1. A resident pastes two reports for `8100023-2` and `8100023-7` without a separator. Saved or refused?
2. Why are GASES and EGO cut out before the BH/QS parsers run?
3. Two BH reports at 08:00 and 09:30 the same day — how many lab sets?
4. You changed the sample name in `template.docx`. What breaks and what catches it?

<details><summary>Answers</summary>

1. Not refused as a mix — same base (`8100023`). (It still needs a census match, or it shows as `no-patient` in the preview.)
2. So analytes with the same name in those panels (glucose, proteins…) aren't misread as blood values.
3. One — within the 2-hour consolidation window.
4. The name replacement no longer matches, so notes keep the fake name; the `labs-to-docx` e2e scenario catches it.
</details>

**Next:** [09 · Storage & security →](./09-storage-and-security.md)

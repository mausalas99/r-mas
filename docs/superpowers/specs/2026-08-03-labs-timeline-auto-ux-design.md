# Labs timeline auto UX · color soften — Design

> **Status:** Approved 2026-08-03 (Labs approach 1 + colors A).  
> **Related:** TTD/Eventualidades Labs (`2026-08-03-ttd-retyping-tooltime-design.md`) — this doc **supersedes** the “manual Labs drawer / focus `#eventualidades-labs`” metaphor for interpretation UX.

**Date:** 2026-08-03  
**Release target:** patch on 7.9.x

---

## Decisions

1. **Labs interpretation destination** — still `patient.eventualidades.labsText` + **Labs timeline** (not clinical `entries[]`).
2. **Primary UX** — Labs mode is a **read timeline** filled by autosend (Procesar / Actualizar / cola). **No** “Interpretación de laboratorios” textarea dock.
3. **Mode switch** — Eventualidad | Labs remains a **view** switcher (header or slim chrome). Note compose footer only in Eventualidad mode.
4. **Card actions** — Labs cards support **Eliminar** (and edit if cheap); empty state points to lab ingest, not “escribe abajo”.
5. **Colors** — Soften **local** chrome on Guardia metrics, Conexión, bulk bar, pendientes composer, Eventualidades/Labs (light + dark). No global `tokens.css` retune unless a shared var is clearly wrong.

---

## Product metaphor

| Flow | Metaphor |
|------|----------|
| Labs interpretation | **Auto log** — labs land on the Labs timeline like a receipt, not a second notepad. |
| Clinical notes | Unchanged Eventualidad compose + bitácora. |

---

## Data / writers

Unchanged helpers: `mergeEventualidadesLabsText` / `setEventualidadesLabsText` / `savePatientEventualidadesLabs`.

**Restore** thin autosend (`lab-eventualidad-autosend.mjs`):

- After bulk/Procesar store → `autosendLabsEventualidadForStored`
- Doc-queue labs path → `autosendLabsToEventualidad`
- On success: select Labs mode + refresh panel (no textarea focus)

**Remove / demote:** `fillEventualidadesLabsInput` as primary; `queueEventualidadesPrefill` → merge+save+Labs mode (or delete if unused).

---

## UI

| Mode | Timeline | Footer |
|------|----------|--------|
| note | Clinical days | Eventualidad compose (+ switcher) |
| labs | Labs days from `labsText` | Switcher only (or switcher in panel head); **no** labs textarea |

Empty Labs: “Aún no hay interpretación — llega al procesar labs / Actualizar / cola.”

---

## Color soften (local)

| Surface | Direction |
|---------|-----------|
| `.ev-compose__card`, day pills, labs cards | Less accent border wash; quieter muted text |
| Guardia metrics panel / stats | Softer panel bg; less harsh contrast |
| Conexión status sheet | Quieter badge/sheet borders |
| `.patient-bulk-bar` | Less accent tint; calm dock |
| Pendientes composer | Softer top strip / inputs |

Both `html` and `html.dark`.

---

## Non-goals

- Putting labs on the clinical bitácora
- Global token palette overhaul
- Reverting strip-auto-labs one-shot history (already ran)

---

## Acceptance

- [ ] Procesar/repo/cola merges interpret prose into `labsText` and Labs timeline updates without a manual box
- [ ] Labs mode has no `#eventualidades-labs` textarea
- [ ] Clinical Eventualidad compose unchanged
- [ ] Softened CSS on listed surfaces in light + dark
- [ ] Targeted tests for autosend + panel HTML / timeline empty copy

# Magia IC + Guardia UX (Nube) — Design Spec

**Date:** 2026-08-07  
**Status:** Approved for implementation  
**Demos:** `docs/demos/ux-p0-p2-guardia-preview.html`, `docs/demos/ux-guardia-board-entrega-preview.html`  
**Related:** Modo Entrega pendientes (`2026-06-02-modo-entrega-pendientes-design.md`), leave-team resolve (8.0.2)

---

## North star

Lower TTD for Interconsulta: **Labs + Estado actual + datos del paciente → Nota → Word**, without retyping.  
Guardia board stays a **census/handoff** surface in the Nube era — not a second documentation product.

---

## Hard boundaries

| System | Owns | Must not |
|--------|------|----------|
| Magia IC (nota/indicas) | note fields, Word export, EA→nota bridge, predeterminados UI | Block leave/inherit; rewrite `active_guardias` |
| Modo Entrega / pendientes | `active_guardias`, covering, `source_team_id`, estudios v2 | Gate heredar or leave team |
| Heredar / traer | Census `patient_team_assignment` only | Touch `pendientes_json` / covering |
| Salir de equipo | Membership delete + resolve coverings by `covering_user_id` | Refuse leave because of Active pendientes |

---

## Slice A — Magia IC (documentation)

### A1 — Diagnósticos censo → nota / Word (shipped)

- Preload if note empty; **Desde censo** replace; `generateWord` fills empty dx from patient.

### A2 — Predeterminados Indicaciones (shipped)

- **Predeterminados…** on Indicaciones bar → existing format editor.

### A3 — Estado actual → Nota IC (this slice)

**Goal:** One action on Nota: pull compiled EA text into Evolución and SV fields into Signos vitales.

**Behavior:**

1. Button on Evolución card: **Desde Estado actual**.
2. Build text via existing `getEstadoActualTextForPatient` / `buildEstadoActualText` pipeline (requires `patient.monitoreo`).
3. Map latest vitals from monitoreo snapshot → `note.ta`, `note.fr`, `note.fc`, `note.temp`, `note.peso` when empty (or confirm replace if evolucion already has content).
4. Does **not** auto-run on every note open (avoid stomping clinician edits). Explicit CTA only.
5. Spanish UI: neutral (no voseo). Copy: «Desde Estado actual».

**Module:** `public/js/features/note-from-estado-actual.mjs` (pure apply helpers + tests).

### A4 — Lexicon (follow-up, copy-only)

First-line R1 copy: **Nube** (retire LiveSync / ⇄ / LAN from tours and empty states). Not required for A3.

---

## Slice B — Guardia board (Nube)

### B1 — Scope toggle rename

- Labels: **Censo: todos** / **Censo: solo entregados** (not «Alcance completo» / «Solo mis entregas» as mode language).
- Title/hint clarify: filter of the grid, independent of Entrega phase button.

### B2 — Empty census state

When grid has 0 patients: message + next action («Censo: todos» if filter on; else hint Nube / equipo).

### B3 — Trust strip (read-only)

Optional thin strip: Nube status · sala · equipo. No daily «Cambiar equipo». Change membership only via Mi rotación.

### B4 — Document without losing board

Chip action sheet keeps **← Censo guardia** when opening expediente (density return). Can land after B1–B2.

### B5 — Fin de guardia → pendientes por equipo origen

On **Finalizar turno**: always end local clock (`guardia.turnoActive`); if the user has Active coverings with incomplete estudios, open sheet grouped by `source_team_id`.  
**Enviar N** resolves those coverings (`dbGuardiaResolve`) — returns night covering to day-team handoff origin. Does **not** delete `pendientes_json` items.  
**Cerrar sin enviar** leaves coverings Active. Must not block leave/inherit.

---

## Out of scope

- Paste-anywhere chrome (Lab already has paste cue).
- Daily «Cambiar equipo» on trust strip.
- Merging heredar into entrega pendientes.
- Forcing one-click Word without filling note fields.

---

## Success checks

1. IC: EA → Evolución/SV in one confirm; dx from censo still in Word.  
2. Leave team with Active coverings always succeeds; coverings Resolved.  
3. Inherit/assign census succeeds with Active entrega on patient.  
4. Guardia empty grid never blank; scope labels do not say «modo».  
5. Colocated tests green via `npm run test:one`.  
6. Finalizar turno opens fin-de-guardia sheet when open estudios exist; Enviar resolves coverings by `source_team_id` without deleting pendientes items.

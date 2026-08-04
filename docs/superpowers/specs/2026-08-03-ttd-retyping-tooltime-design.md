# TTD spine · EA tab order · Tool-time Conexión — Design

> **For implementation:** Plan ready — [`../plans/2026-08-03-ttd-retyping-tooltime.md`](../plans/2026-08-03-ttd-retyping-tooltime.md). Use **superpowers:subagent-driven-development** or **executing-plans**.

**Date:** 2026-08-03  
**Status:** Implemented.  
**Release target:** patch on **7.9.x** (post 7.9.3).  
**Related:** North Star (`docs/core/01-vision-north-star.md`), Eventualidades Labs (`eventualidades-labs-ui.mjs`, `lab-eventualidad-interpret.mjs`), EA registro (`estado-actual-panel-registro*.mjs`, `estado-actual-panel-glu*.mjs`, `estado-actual-panel-vitals.mjs`), Nube Conexión (`public/js/features/cloud-sync/panel-conexion*.mjs`, `panel-session-gate.mjs`, `lan-override.mjs`).  
**Plan:** [`../plans/2026-08-03-ttd-retyping-tooltime.md`](../plans/2026-08-03-ttd-retyping-tooltime.md)

**PO decisions (2026-08-03):**

1. **Labs interpretation destination** — Any lab interpretation prose (generated or pasted into the Labs flow) **lands in Eventualidades → pestaña Labs** (`labsText` + Labs timeline). It must **not** create entries on the main Eventualidades (nota) timeline.
2. **EA registro Tab order** — Tab advances through **value fields** of signos vitales and glucometrías (next reading). Controls that are secondary (+1 / + Extra, checkbox **Alterada**) are **skipped by Tab** but remain **clickable / mouse / space-activatable**.
3. **Tool-management time** — One sync mode per sala; Conexión chrome only when needed; cutover/identity not re-asked when known; recovery code shown once then buried.

---

## Problem statement

Three frictions still steal minutes from the R1/R2 on guardia:

| Area | Pain |
|------|------|
| **TTD** | Lab interpretation can still feel like “another eventualidad” if it lands on the clinical timeline or if the UI opens the wrong pane. |
| **Retyping / capture speed** | Native Tab order hits +1 and **Alterada** between glu/vital values, breaking keyboard capture of a full round of readings. |
| **Tool time** | ⇄ / cutover / dual LAN+Nube surfaces force residents to manage infrastructure mid-turn. |

North Star metric: lower **Time-to-Document**, raise **transcription accuracy** (fewer hand retypes), and cut **tool-management time** (anti-goal: tool time over patient time).

---

## Goals (success criteria)

### A — TTD / Eventualidades Labs

- [ ] Lab interpretation prose is stored only in `patient.eventualidades.labsText` (merge/set helpers) — never as a clinical eventualidad in `entries[]`.
- [ ] Opening Eventualidades for labs work (doc-queue, paste-smart → Labs, or explicit Labs switcher) uses **mode `labs`**, focuses `#eventualidades-labs`, and shows the Labs timeline — not the nota compose timeline.
- [ ] Manual “Eventualidad” notes still use the main timeline / compose; Labs pane stays a separate switcher.
- [ ] If a future path auto-fills interpretation text, it must obey the same sink (Labs only). No regression to timeline entries.

### B — Estado Actual registro keyboard

- [ ] From a vital value input, **Tab** moves to the **next vital value** in form order (`tas → tad → fc → fr → temp → sat`, then first glu value). Does **not** land on `+1` or altered-time chrome.
- [ ] From a glucometría value input, **Tab** moves to the **next glu value** (standard times in order, then extras if present), then I/O. Does **not** land on `#ea-add-glu`, `data-ea-glu-altered`, remove (×), or bomba switch.
- [ ] **+1** (vital stacks), **+ Extra** / **+ Agregar**, and **Alterada** remain visible and fully actionable via pointer (and checkbox via Space when focused intentionally — e.g. Shift+Tab from a rescue field if we ever focus them, or click).
- [ ] **Enter** on glu values keeps today’s behavior (advance / add extra on last extra row); Tab does not invent new Enter semantics.
- [ ] Registro still opens **clean** (no stale vital/IO prefill) — already shipping direction; this spec does not reopen that decision.

### C — Tool-management / Conexión

- [ ] **Sala / Torre HU** with Nube connected: no host/PIN/“sé el anfitrión” LAN primary chrome; LAN diagnostics only under collapsed Opciones if needed.
- [ ] **LAN-only salas** (Interconsultas, UX, Eme, Área A): no Nube signup/login as primary path.
- [ ] Logged out on Nube sala: panel shows **only Connect** (no Sala/Equipo/Más stack).
- [ ] Connected: one-line status (room label) + collapsed Opciones; stepped wizard only for incomplete setup.
- [ ] If `@usuario` + team membership already known post-cutover: skip identity/team steps on later launches.
- [ ] Recovery code: shown **once** at register (or regenerate), require explicit “lo guardé”, then not a standing surface.

---

## Non-goals

- Changing LWW / Nube transport, Free-tier quotas, or expanding the Nube sala allowlist.
- Replacing `.docx` export pipeline or moving note generation into the Worker.
- Auto-checking **Alterada** from range logic on Tab (altered remains explicit human action).
- Making rescue fields (unidades / DXT post-rescate) part of the default Tab spine — they stay behind **Alterada** (visible when checked); Tab from value skips them unless the user clicked into that row’s rescue box.
- Full a11y audit of every control in EA (only Tab spine for value capture).
- Rewriting cutover wipe / migration 7.9 mechanics — only skip/auto-advance when identity is already settled.

---

## Product metaphor

| Flow | Metaphor |
|------|----------|
| Labs interpretation | **Auto log** — prose lands on the Labs timeline (`labsText`); no Interpretación dock. See `2026-08-03-labs-timeline-auto-ux-design.md`. |
| EA Tab | **Numeric keypad round** — Tab = next reading; flags and “add another” are mouse tools, not part of the round. |
| Conexión | **Light switch** — on/off + room name. Wiring stays in the basement (Opciones). |

---

## Design detail

### 1. TTD — Labs pane is the only autosend sink

**Data model (unchanged shape):**

```js
patient.eventualidades = {
  entries: [],           // clinical eventualidades (nota timeline)
  labsText: '',          // interpretación (Labs pane + Labs timeline)
  // deletedIds, updatedAt, …
}
```

**Invariant:** lab interpretation writers call `mergeEventualidadesLabsText` / `setEventualidadesLabsText` (or equivalent). They must **not** call `appendEventualidad` / entry creators for interpretation batches.

**UI invariant:** when navigating to Eventualidades for labs (doc-queue, paste-smart → Labs, or helpers that prefer Labs), set mode to `'labs'` and show the Labs timeline. Autosend merges into `labsText` — no `#eventualidades-labs` compose dock (see `2026-08-03-labs-timeline-auto-ux-design.md`).

**Sources that must obey:**

| Source | Expected sink |
|--------|----------------|
| Manual write / paste in Labs box | `labsText` + Labs mode |
| `lab-eventualidad-interpret` output if applied | `labsText` only (never `entries[]`) |
| Doc-queue / paste-smart open Eventualidades for labs | Labs mode + focus `#eventualidades-labs` |
| Manual note in Eventualidad pane | `entries[]` only |

**Labs timeline:** prose segments derived from `labsText` (by day) stay under the Labs pane — not mixed into the clinical timeline list.

**Acceptance:** tests that merge/set labs helpers never append `entries`; navigate-to-labs asserts mode `labs`; no path that builds interpret prose writes a clinical eventualidad.

---

### 2. EA registro — Tab spine for values

**Current state:**

- Glu rows: **Enter** on value already advances via `focusNextGluValueOrIo` (`estado-actual-panel-glu.mjs`); native **Tab** still follows DOM order (Alterada checkbox, rescue inputs when visible, + Extra, etc.).
- Vital stacks: `+1` buttons (`data-ea-vital-add`) sit in the stack DOM and receive Tab.

**Decision:** define an explicit **Tab focus sequence** for `#ea-form` in registro modal:

1. `#ea-recorded-at` (optional — keep in sequence)
2. Visible vital value inputs in `VITAL_KEYS` order, **active layer only** (hidden layers `display:none` / not focusable)
3. Glu value inputs in list order (standard times then extras); for extras, time field may precede value (existing Enter: time → value)
4. I/O fields: `#ea-io-ing` → `#ea-io-evac` → `#ea-io-egr` (balance is not an input)
5. Footer actions (Cancelar / Registrar) — or stop at last I/O; either is fine if consistent

**Removed from Tab sequence (remain actionable):**

| Control | Selector / id | Still works via |
|---------|---------------|-----------------|
| Vital +1 | `button[data-ea-vital-add]` | click |
| Vital altered time | `input[data-ea-altered]` | click / when slot shown after out-of-range (pointer) |
| Glu Alterada | `input[data-ea-glu-altered]` | click / Space if focused by other means |
| Glu rescue units / post | `data-ea-glu-rescue-units`, `data-ea-glu-post-rescue-value` | click into rescue box after Alterada |
| + Extra / + Agregar | `#ea-add-glu`, `#ea-add-bomba` | click |
| Glu remove × | `[data-ea-glu-remove]` | click |
| Bomba switch | `#ea-bomba-enabled` | click |
| Pegar monitoreo / NC | existing buttons | click |

**Implementation approach (preferred, simplest):**

1. Set `tabindex="-1"` on skipped controls when wiring the registro form (and when dynamically adding glu rows / expanding vital layers).
2. On **Tab** / **Shift+Tab** from value inputs, `preventDefault` and move focus along the spine (reuse `focusNextGluValueOrIo` / add `focusNextVitalValue` sibling). Prefer one small helper module (e.g. `estado-actual-panel-registro-tab.mjs`) over growing `wire.mjs`.

Do **not** rely only on CSS `display` tricks. Do **not** remove the controls from the DOM.

**Shift+Tab:** reverse of the same spine.

**Bomba mode:** when bomba pane is active, Tab spine uses bomba value fields instead of normal glu list; + Agregar stays `tabindex="-1"`.

---

### 3. Tool-management — Conexión as light switch

**Mode authority (already decided in 7.9):**

- Cloud salas (**Sala**, **Torre HU**): Nube overrides LAN when room connected.
- Other salas: LAN only.

**UI rules:**

| State | Panel shows |
|-------|-------------|
| Nube sala, logged out | Connect only (`connectStepHtml`) |
| Nube sala, logged in, no room | Minimal next step → join/create room |
| Nube sala, room connected | Status sheet: room label (Sala 1/2/E…) + sync health; Opciones collapsed |
| LAN sala | Existing LAN join/status; no Nube auth chrome |

**Identity:**

- After cutover complete + local profile present: cold start goes to workbench, not cutover wizard.
- Recovery: one-time code UX at register/regenerate; acknowledge gate; admin reset remains for lockout.

**No dual chrome:** when `isCloudSyncActive()` for a cloud sala, hide primary LAN host election / PIN hero. Advanced LAN diagnosis may remain under Opciones labeled as non-Nube.

---

## Code map (touch targets)

| Concern | Primary paths |
|---------|----------------|
| Labs sink + mode | `lab-eventualidad-interpret.mjs`, eventualidades autosend callers, `eventualidades-render.mjs`, `eventualidades-store.mjs`, `eventualidades-labs-ui.mjs`, `eventualidades-labs-timeline.mjs` |
| EA Tab | `estado-actual-panel-vitals.mjs`, `estado-actual-panel-glu.mjs`, `estado-actual-panel-glu-row.mjs`, `estado-actual-panel-registro-wire.mjs`, new `estado-actual-panel-registro-tab.mjs` (if extracted) |
| Conexión | `panel-conexion-views.mjs`, `panel-conexion-handlers.mjs`, `panel-session-gate.mjs`, `panel-steps-html.mjs`, `lan-override.mjs`, cutover skip in `panel-cutover*.mjs` |

---

## Testing

| Area | Tests |
|------|--------|
| Labs sink | Extend `eventualidades-panel.test.mjs` / interpret tests: labs merge does not append `entries`; navigate prefer Labs mode |
| EA Tab | Unit tests on focus helper: given mock DOM order with +1 and Alterada between values, Tab sequence visits only value inputs; assert skipped nodes have `tabindex="-1"` and click handlers still fire |
| Conexión | Existing `panel-session-gate.test.mjs`, `lan-override.test.mjs`, `panel-steps-html.test.mjs` — add cases for “connected status only” and “logged-out Connect only”; cutover skip when flag done + profile present |

Debt: keep new helpers ≤ Tier-1 budgets (complexity ≤ 15, function ≤ 80, file ≤ 600). Prefer extract over growing `estado-actual-panel-registro.mjs` / `panel-conexion-views.mjs`.

---

## Rollout

1. Land Labs sink + navigate-to-Labs hardening + tests (close any call site that still opens nota pane for lab work).
2. Land EA Tab spine (highest daily keyboard payoff).
3. Land Conexión chrome reductions + cutover skip (trust / tool-time).

Spanish UI copy unchanged unless a new recovery acknowledge string is required (e.g. “Ya guardé mi código”).

---

## Open questions

None blocking. Optional polish (out of V1 of this spec): after checking **Alterada**, focus rescue units once — still not on the default Tab spine from the value field.

---

## Relationships

- Vision: [01-vision-north-star.md](../../core/01-vision-north-star.md)
- EA base design: [2026-05-26-estado-actual-monitoreo-design.md](./2026-05-26-estado-actual-monitoreo-design.md)
- Nube pilot: [2026-08-02-cloud-sync-free-pilot-design.md](./2026-08-02-cloud-sync-free-pilot-design.md)
- Features index: [features-index.md](../../features/features-index.md)

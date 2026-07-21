# Lab panel teach overlay — design

**Date:** 2026-07-21  
**Status:** approved for planning  
**Related code:** `public/js/labs-panel-defs.mjs`, `labs-panel-parse.mjs`, `labs-procesar.mjs`, `labs-extract.mjs` (`extraerConRangoPanel`), tendencias/section headers for `LAB_EXTENDED_SECTION_KEYS`

## Problem

R+ already ships a scaffold registry of hospital panels (`PanelDef`: gates + numeric/qual fields → `parsePanelDef_` / `parseExtendedLabPanels_`). Real SOME reports still leave **unrecognized or partially mapped** studies. Residents need a way to teach a reading once, see the final line preview, apply it to the current paste, and have peers on the LAN turn benefit **without** opening a configuration UI.

## Goals

- When a paste is empty of useful lab sections **or** has residual SOME studies not covered by the effective registry, open a teach wizard.
- Wizard is **two pages**: (1) visual SOME selection, (2) editable analyte rows + live preview.
- Everything proposed is editable; user can include non-auto-detected studies.
- On confirm: apply result like other labs + persist overlay + sync to room in background.
- Peers receive overlay silently; they never see the wizard unless their own paste triggers it.
- Reuse `PanelDef` / `parsePanelDef_` — do not invent a parallel parser engine.
- UI follows Hallmark / `design.md` + `public/tokens.css` (existing modal patterns).

## Non-goals

- Shared “team parser admin” UI or directory of overlays.
- Cloud / non-LAN distribution of overlays.
- Replacing core parsers (BH, QS, GASES, EGO, cultivos, etc.).
- Perfect auto-detection of every SOME layout (heuristics + human correction).

## Architecture

```
Built-in LAB_EXTENDED_PANEL_DEFS  (immutable at runtime)
            ⊕
Overlay store (patches + user panels)
            ↓
Effective registry → parseExtendedLabPanels_ / parsePanelDef_
            ↓
procesarLabs → resLabs (historial / tendencias)
```

### Overlay record

```ts
{
  panelId: string;           // "builtin:TIR" | "user:<uuid>"
  baseSectionKey?: string;   // set when patching a scaffold
  sectionKey: string;        // output header (TIR, CUSTOM…)
  mode: "num" | "qual";
  gates: string[];           // compiled to RegExp on load
  fields: Array<
    | { key: string; labels: string[] }
    | { key: string; patterns: string[] }  // qual; compile to RegExp
  >;
  updatedAt: number;
  updatedBy: string;         // LAN clientId
}
```

### Merge rules

- Start from a deep copy of built-in defs keyed by `sectionKey` (+ mode when GI num/qual split).
- Apply overlay entries:
  - `panelId` starting with `builtin:` → patch matching scaffold (replace gates/fields/mode/sectionKey as provided).
  - `user:` → append as new panel def.
- Effective list is what `parseExtendedLabPanels_` iterates (inject via deps or registry getter — avoid mutating the exported const array in place).
- LAN merge: LWW per `panelId` using `updatedAt` (tie-break `updatedBy`). No conflict dialog.

### Persistence / LAN

- Store overlay array on the room snapshot (preferred: dedicated `labPanelOverlay` key inside clinical-ops / room bundle already synced with `putRoomClinicalOps`).
- Confirm path: write local cache → apply lab lines to patient → enqueue host put (non-blocking).
- Offline / no host: keep local; flush when LAN reconnects.
- Peers: on ops pull/merge, refresh effective registry; next `procesarLabs` uses it. No toast required on receive.

## Teach wizard UX

### Triggers (post-`procesarLabs`)

| Case | Condition |
| --- | --- |
| A | No useful lab section lines produced |
| B | Residual detector finds ≥1 SOME study not covered by core parsers **or** effective extended registry |

Optional later: manual “Configurar lectura…” — **out of v1** unless cheap to add beside the auto path.

### Page 1 — SOME paste visual

- Show the pasted report in a readable SOME-like view (mono / existing lab chrome).
- Auto-check candidate residual studies (name, value, ref when parsed).
- Studies already consumed by core/extended parsers: dimmed or filterable; not selected by default.
- User toggles selection; can select non-proposed lines (click / mark).
- **Continuar →** only selected items feed page 2.

### Page 2 — Configure reading

- One **row per selected analyte**: include checkbox, SOME label, short `key`, value, range (or qual + S/CO), source (auto|manual).
- All cells editable; group `sectionKey` + `mode` editable (existing scaffold or new group).
- **+ Añadir fila** and return-to-page-1 to mark more text.
- **Live preview**: re-run `parsePanelDef_` (and show merge with already-recognized sections from this paste).
- **Confirmar lectura**: commit lines to current lab result + save overlay + background sync.
- **Descartar**: close without persist/sync.
- **← Volver**: back to page 1; preserve row edits where labels still match.

Visual language: existing R+ modal (scrim, `--color-surface`, `--font-ui` / `--font-mono` for values), not a separate design system.

## Residual detector (v1 heuristic)

1. Split / scan SOME blocks with Estudio / Resultado / Unidades / Valor de referencia patterns (reuse helpers from `labs-some-table-*` where possible).
2. Build set of labels already claimed by this paste’s successful parses (section field keys → labels from defs) plus hardcore section ownership.
3. Emit residual candidates `{ label, value, min, max, qual?, sco? }` for page 1.
4. False positives/negatives acceptable — wizard is the correction loop.

## Error handling

- Invalid preview (no included rows / empty section body): disable Confirm or show inline warning.
- Sync failure: discreet toast; local result and overlay cache already applied.
- LWW lose on peer: silent; next paste uses winner.

## Module sketch (implementation hint)

| Module | Role |
| --- | --- |
| `labs-panel-overlay-store.mjs` | load/save/merge overlay, effective registry |
| `labs-panel-residual.mjs` | residual detector |
| `features/lab-panel-teach-*.mjs` | wizard pages, wire into lab panel paste path |
| LAN: extend room clinical ops payload | `labPanelOverlay` |

Keep files ≤600 lines / complexity budgets (Tier 1). Lazy-load teach UI (no new eager boot import).

## Testing

- Unit: overlay merge (patch + user panel), LWW, residual on synthetic SOME, `procesarLabs` with overlay applied.
- Extend `labs-panel-extended.test.mjs` patterns; add focused teach/merge tests.
- Do not run full `npm test` in normal agent loops — `npm run test:one` on new suites.

## Rollout

1. Effective registry + overlay store (local) + wire into `parseExtendedLabPanels_`.
2. Residual detector + wizard UI (two pages) + confirm applies current paste.
3. LAN sync field + peer merge.
4. Polish: tendencias labels for brand-new `sectionKey`s (fallback display name = key until mapped).

## Open decisions (resolved)

| Topic | Decision |
| --- | --- |
| Correct scaffolds vs new panels | Both |
| Sync | Room overlay, background; no shared admin UI |
| Ship sync in v1 | Yes (local-first if offline) |
| Trigger | A + B |
| Mapping UX | Hybrid auto + mark in text, via two-page wizard |
| Architecture | Overlay on built-in PanelDefs |

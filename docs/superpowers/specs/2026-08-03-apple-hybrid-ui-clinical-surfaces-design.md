# Spec C — Clinical Work Surfaces

> **Program:** [`2026-08-03-apple-hybrid-ui-overhaul-program.md`](2026-08-03-apple-hybrid-ui-overhaul-program.md)  
> **Depends on:** Spec A + Spec B  
> **Next:** Spec D (Rest of app)

**Date:** 2026-08-03  
**Status:** Draft for review  

---

## Problem

Labs, Eventualidades, Pase, and Conexión are where Hybrid H either proves “3am readable” or fails. Token/chrome changes alone leave dense clinical surfaces looking half-migrated (old indigo chips, heavy cards, inconsistent sheets).

## Goals

- [ ] Labs workbench + result tables: solid elevated, mono values, danger alterados (theme-aware).
- [ ] Eventualidades: strip + compose/detail as **sheet** (glass) over solid list; drag dismiss.
- [ ] Pase board: solid density; section headers calm; no glass on board cells.
- [ ] Conexión (Nube) panel: stepped UI on Hybrid H materials; status chips solid; destructive actions clear.
- [ ] Light + dark first-class on all four surfaces.

## Non-goals

- Changing lab parse/consolidation logic, autosend rules, or LWW merge.
- Redesigning Expediente / Manejo / EA charts (Spec D).
- New clinical features.

---

## Surfaces

### 1. Laboratorio

**Keep:** workbench flow (pegar → procesar → historial), panel headers identity colors if they encode panel type.

**Change:**

| Element | Treatment |
| --- | --- |
| Table container | Solid elevated + hairline |
| Analyte rows | Dense; hover `--state-hover-bg` |
| Alterados | `--color-danger` + weight 650; arrows ↑↓ |
| Primary CTA Procesar | Ink fill, radius 8, press scale |
| Toolbar chips | Solid subtle; not indigo soft wash |
| Empty / skeleton | Inherit Spec A skeletons if present |

Files (indicative): `public/styles/lab.css`, lab panel feature modules — **CSS + class hooks only** unless markup blocks materials.

### 2. Eventualidades

**Keep:** data model, labsText autosend behavior, strip auto-labs.

**Change:**

| Element | Treatment |
| --- | --- |
| List / strip | Solid |
| Compose / detail / confirm send | Sheet via `ui-overlay` sheet |
| Labs preview block | Solid inset inside sheet (no nested glass) |
| Delete / destructive | base-ui-like confirm; hold-to-delete optional later (not required V1 of C) |

Align with recent modules: `eventualidades-panel*.mjs`, `eventualidades-labs-*.mjs`, styles in `eventualidades.css`.

### 3. Pase board

**Keep:** round navigation J/K, section structure, density mode.

**Change:**

| Element | Treatment |
| --- | --- |
| Board background | Paper/content solid |
| Section cards | Hairline, no lift shadow theater |
| Patient banner | Solid; system type |
| Active affordances | Ink underline / bar |

Files: `pase-board.css`, `features/pase-board.mjs`.

### 4. Conexión (cloud-sync panel)

**Keep:** stepped Connect → Sala → Equipo → Más; recovery codes; session gate.

**Change:**

| Element | Treatment |
| --- | --- |
| Panel chrome | **Solid body** (Conexión is a work panel, not a toast). If shown as a floating overlay shell, only the outer frame may use glass; inner steps stay solid elevated |
| Stepper | Ink current step; muted others |
| Primary / danger buttons | Hybrid H pressables |
| Status / Opciones | Solid chips; LiveSync colors |

If Conexión is a full-screen overlay today, migrate dismiss/focus through Spec B kit.

Files: `public/js/features/cloud-sync/*`, `public/styles/cloud-sync.css`.

---

## Contrast checklist (3am)

- [ ] Alterados vs row background ≥ clear distinction in light and dark.
- [ ] Nube/LiveSync status not relying on glass vibrancy alone.
- [ ] Sheet scrim dark enough in light mode (≥ ~38% ink) and not milky in dark.
- [ ] Reduced transparency: all four surfaces remain usable.

---

## Testing

- Targeted tests for any HTML helpers changed (e.g. eventualidades panel HTML tests, lab snapshot tests if class names asserted).
- Manual guardia script: process labs → send eventualidad sheet → swipe dismiss → Pase glance → open Conexión; repeat in `html.dark`.

## Success criteria

- [ ] Four surfaces feel like one product language.
- [ ] No clinical behavior regressions in tests touching these UIs.
- [ ] Sheets for Eventualidades use Spec B primitives (no one-off animation).

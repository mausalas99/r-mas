---
type: "core"
name: "Design System"
status: "stable"
description: "Pointer to Teal workbench UI tokens and conventions for R+."
---

# Design System

**Source of truth:** [`design.md`](../../design.md) and [`public/tokens.css`](../../public/tokens.css).  
**Program:** Teal workbench (2026-08-17) — phase 1 (tokens + pilot screen) in progress. See `docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md`. Supersedes the Hybrid H / Warm instrument program below, now historical.

## Principles (summary)

- High information density; borders and type over color.
- Teal accent (`--color-accent` = `oklch(0.52 0.09 195)` light / `oklch(0.62 0.09 195)` dark); red/amber/green reserved for clinical values and status only.
- Solid workbench + glass floating layers only (never glass-on-glass).
- System UI for chrome; IBM Plex Mono for labs/values.
- Dark is first-class; honor reduced motion/transparency.

## Key tokens

| Token | Role |
|-------|------|
| `--color-paper` / `--color-surface` / `--color-content` / `--color-elevated` | Surfaces |
| `--color-ink` / `--color-accent` | Text + actions |
| `--material-glass-*` | Floating overlays |
| `--color-livesync-*` | LiveSync Wi‑Fi header states (solid chips) |

## Layout modes

- **Normal:** sidebar + main tabs (Laboratorio, Paciente, …)
- **Pase:** `appcontent-pase` round board
- **Guardia:** compact metrics + phase bar (`guardia-board.mjs`)

## Related

- Styles: `public/styles/`
- Motion façade: `public/js/ui-motion.mjs`
- Shell: `public/js/app-shell.mjs`


## Historial

- **Hybrid H:** Spec D complete (2026-08-03), full desktop adoption. Superseded by Warm instrument (2026-08-13), then by Teal workbench (2026-08-17). See `design.md` "Historial".

---
type: "core"
name: "Design System"
status: "stable"
description: "Pointer to Hybrid H UI tokens and conventions for R+."
---

# Design System

**Source of truth:** [`design.md`](../../design.md) and [`public/tokens.css`](../../public/tokens.css).  
**Program:** Apple Hybrid UI overhaul — Spec A foundation landed; Spec B+ for chrome/overlays/clinical surfaces.

## Principles (summary)

- High information density; borders and type over color.
- Ink accent (`--color-accent` = `--color-ink`); semantic danger/success only.
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

- **Normal:** sidebar + main tabs (Laboratorio, Expediente, …)
- **Pase:** `appcontent-pase` round board
- **Guardia:** compact metrics + phase bar (`guardia-board.mjs`)

## Related

- Styles: `public/styles/`
- Motion façade: `public/js/ui-motion.mjs`
- Shell: `public/js/app-shell.mjs`

# R+ v8.0 — Scoped Design (Performance + Time-Aware Pendientes)

**Date:** 2026-06-11  
**Target Release:** v8.0  
**Status:** Approved scope  

## Overview

v8.0 ships two tracks only:

1. **Performance** — measurable UI responsiveness (profile-first LAN fixes, extend lazy loading, virtual scroll on heavy lists, dev perf markers).
2. **Time-aware pendientes** — optional due date/time, reminders, overdue sorting; LAN-synced; backward compatible.

**Deferred (not v8.0):** auto-detection/event triggers, team handoff filter, WebRTC/P2P mesh, medication taper automation, culture follow-up automation.

## Success criteria

### Performance
- App startup → first paint baseline captured; target improvement via lazy chunks (no hard % without measurement).
- Tab/feature first open: skeleton + dynamic import; cached second open &lt; 300ms.
- LAN reconcile: no main-thread long tasks ≥ 50ms on profiled journey **or** documented scoped-repaint fix applied.
- Censo + lab history: stable scroll on 100+ rows (virtual scroll).

### Time-aware pendientes
- Create pendiente with optional due/reminder in &lt; 5 seconds.
- Desktop + in-app notification at reminder time.
- Overdue items sort to top; existing pendientes unchanged.
- New fields sync via existing LAN todo upsert/LWW (`updatedAt`).

## Child specs

| Spec | Track |
|------|-------|
| [`2026-06-11-v8-time-aware-pendientes.md`](2026-06-11-v8-time-aware-pendientes.md) | Pendientes |
| [`2026-06-11-v8-lan-sync-workers.md`](2026-06-11-v8-lan-sync-workers.md) | Performance (profiling gate + optional workers) |
| [`2026-06-11-v8-module-lazy-loading.md`](2026-06-11-v8-module-lazy-loading.md) | Performance |
| [`2026-06-11-v8-virtualized-lists.md`](2026-06-11-v8-virtualized-lists.md) | Performance |

## Implementation plan

[`../plans/2026-06-11-v8-performance-overhaul.md`](../plans/2026-06-11-v8-performance-overhaul.md)

## Prerequisites

- `npm run build:ui` after renderer changes.
- Targeted tests: `node --test path/to/*.test.mjs` (not full `npm test` during dev).
- `npm run metrics:check` when touching `public/js/**/*.mjs` (Tier 1 debt ratchet).
- Read `.cursor/rules/project-context.mdc` for entry points.

## Architecture notes

- **Pendientes:** extend `storage.js` normalization + `features/todos.mjs`; priority stays `alta` | `media` | `baja`.
- **LAN:** `mergeTodoListsById` in `livesync-patient-ids.mjs` already LWW on `updatedAt` — new fields pass through on whole-row merge.
- **Lazy load:** extend `lazy-feature-routes.mjs` pattern (cold-start BN-10); do not add new boot static imports.
- **Virtual scroll:** vanilla DOM (`document.createElement`), not JSX; start with censo list.
- **Workers:** only after Phase 0 profiling in LAN spec; prefer scoped UI refresh first.

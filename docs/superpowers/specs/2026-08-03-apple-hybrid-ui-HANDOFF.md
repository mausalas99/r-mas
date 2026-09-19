# HANDOFF — Apple Hybrid UI Overhaul

**Date:** 2026-08-03  
**From:** brainstorm session (direction + specs approved)  
**To:** next agent (plan → implement Spec A first)  
**Status:** Specs approved by user. **No implementation yet. No plan written yet.**

---

## Paste this to the next agent

```
Pick up Apple Hybrid UI overhaul.

1. Read docs/superpowers/specs/2026-08-03-apple-hybrid-ui-HANDOFF.md (this file).
2. Read program + Spec A (links below). Skim B–D only for boundaries.
3. git add -f the five 2026-08-03-apple-hybrid-ui-*.md specs if untracked
   (docs/superpowers/ is gitignored; tracked specs use force-add).
4. Use writing-plans skill → write plan for Spec A Foundation ONLY:
   docs/superpowers/plans/2026-08-03-apple-hybrid-ui-foundation.md
5. Do NOT implement until user approves that plan.
6. Do NOT start Spec B/C/D plans until A is shipped (or user parallelizes).
```

---

## What was decided (locked)

| Topic | Decision |
| --- | --- |
| Direction | **Hybrid H** — solid workbench + glass **only** on floating layers |
| Rejected | Full Liquid Glass (A), Dense Instrument-only (C) |
| Dark | **First-class** — design light + dark together |
| Scope | Full app, **4 specs** A→B→C→D |
| Stack | Electron ESM **vanilla** — **no React** |
| New dep | **`motion`** only (motion.dev vanilla API) |
| Ports | Sonner→`ui-toast.mjs`; cmdk→`command-palette.mjs`; base-ui→`ui-overlay.mjs` + `modal-dismiss.mjs` |
| Accent | Ink `#1c1c1e` / dark `#f5f5f7` — **retire indigo brand accent** |
| Type | System UI for chrome; keep mono for labs/values |
| ⌘K | **Zero** open/close animation |
| Nested overlays | Never glass-on-glass; inner = solid elevated |

Visual companion session (optional mockups):  
`.superpowers/brainstorm/63823-1785792177/` (gitignored).

---

## Spec files (source of truth)

| Doc | Path |
| --- | --- |
| Program index | [`2026-08-03-apple-hybrid-ui-overhaul-program.md`](2026-08-03-apple-hybrid-ui-overhaul-program.md) |
| **A Foundation** | [`2026-08-03-apple-hybrid-ui-foundation-design.md`](2026-08-03-apple-hybrid-ui-foundation-design.md) |
| B Chrome + overlays | [`2026-08-03-apple-hybrid-ui-chrome-overlays-design.md`](2026-08-03-apple-hybrid-ui-chrome-overlays-design.md) |
| C Clinical surfaces | [`2026-08-03-apple-hybrid-ui-clinical-surfaces-design.md`](2026-08-03-apple-hybrid-ui-clinical-surfaces-design.md) |
| D Rest of app | [`2026-08-03-apple-hybrid-ui-rest-of-app-design.md`](2026-08-03-apple-hybrid-ui-rest-of-app-design.md) |

**Phase order:** A → B → C → D (hard dependency on tokens/overlays).

---

## Next work (exact)

1. **Commit specs** (if not already):  
   `git add -f docs/superpowers/specs/2026-08-03-apple-hybrid-ui-*.md`  
   then commit (user must ask / approve commit message).
2. **writing-plans** for Spec A only → `docs/superpowers/plans/2026-08-03-apple-hybrid-ui-foundation.md`  
   (same force-add rule if plans dir ignored).
3. User reviews plan → implement A: `tokens.css`, `design.md`, `06-design-system.md`, `motion` dep, `ui-motion.mjs` façade + tests.
4. Then new plan for B, etc.

---

## Key code touchpoints (for Spec A)

| Path | Role |
| --- | --- |
| `public/tokens.css` | Hybrid H light/dark/HC + materials + easings |
| `design.md` | Replace Hallmark chrome rules |
| `docs/core/06-design-system.md` | Pointer update |
| `package.json` | Add `motion` |
| `public/js/ui-motion.mjs` (+ `.test.mjs`) | Spring façade; keep shake/reduced-motion |
| Existing | `ui-toast.mjs`, `modal-dismiss.mjs`, `features/command-palette.mjs` — **B**, not A |

Keep legacy CSS var aliases (`--action`, `--surface`, `--text`, …) pointing at new tokens in A.

---

## Hard constraints (do not violate)

- AGENTS.md: no compat layers for obsolete UI paths long-term; Spec A may alias tokens one phase.
- Debt ratchet: Tier 1 on touched files; `npm run metrics:check`; never edit `baseline.json` unless user asks.
- Tests: `npm run test:one -- path` only — never full `npm test` in agent loop.
- No hand-edit of `app.bundle.mjs` / chunks — `npm run build:ui` after renderer CSS/JS.
- Product north star: lower TTD, LiveSync trust; no glass theater on lab tables.
- pick-ui-library: do **not** install Sonner/cmdk/base-ui React packages.

---

## Skills to load

- `writing-plans` (immediate next)
- `apple-design`, `emil-design-eng` (reference while planning A/B)
- `rplus-renderer-build` when implementing
- `verification-before-completion` before claiming A done

---

## Out of scope for next agent session

- Implementing B/C/D
- Redesigning parsers / LAN / Nube protocol
- React migration
- Committing unrelated dirty worktree files (there is other WIP in the repo — leave it alone)

---

## User intent (quote-level)

- UI overhaul using Apple + Emil skills; visual first → specs.
- Chose Hybrid H, dark first-class, library mapping approved, full app as multi-spec.
- Specs reviewed: “Si esta bien”.
- Asked for **handoff** to clear context (this doc).

---

## Checklist for receiving agent

- [ ] Read program + Spec A
- [ ] Force-add + ensure specs are committed (ask user if needed)
- [ ] Write Spec A implementation plan only
- [ ] Stop and wait for user plan approval before coding

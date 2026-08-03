# Apple Hybrid UI — Spec D Rest of App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Finish Hybrid H across remaining desktop domains; migrate leftover high-traffic overlays to Spec B kit; retire Hallmark indigo brand accent from intentional chrome; mark design system complete.

**Architecture:** Domain-by-domain CSS token remaps + pressable/overlay hooks. No new materials. Optional appendix for `cloud/equipos-pages` / `interno` contrast-only. Maintain overlay inventory checklist in this plan and tick as migrated.

**Tech Stack:** Existing CSS domains + `ui-overlay.mjs` / `.ui-pressable` / Hybrid H tokens.

**Depends on:** Spec A + B + C.  
**Spec:** [`../specs/2026-08-03-apple-hybrid-ui-rest-of-app-design.md`](../specs/2026-08-03-apple-hybrid-ui-rest-of-app-design.md)

**Out of scope:** New features; full interno redesign; chart library swap; reopening accent debates.

---

## Overlay inventory (migrate when touching)

| Call site / pattern | Action in Spec D |
| --- | --- |
| Settings / help / learn-hub modals | Prefer `openDialog` or `material-glass` + `modal-dismiss` |
| Profile / patient / agenda modals | Material classes + pressables; full `openDialog` if low risk |
| Tendencias / EA chart modals | Solid chrome; no enter anim on keyboard-heavy; glass outer OK |
| SOAP / entrega / equipos QR | Token remap; nested solid |
| Obscure one-offs | Token inheritance only; file as backlog comment in PR if skipped |

---

## File map (indicative)

| Domain | CSS / JS |
| --- | --- |
| Expediente | `expediente.css`, note/HC feature modules (buttons) |
| Manejo | `med-*.css`, pharm calendar tokens already in `tokens.css` |
| Agenda | agenda CSS; `--color-agenda-block-*` already ink-soft after A — verify category colors |
| Estado Actual | `estado-actual.css`; chart chrome; keep series hues |
| Guardia | `pase-board.css` / guardia sections |
| Settings/help | `settings.css`, onboarding shells |
| Equipos desktop | `equipos` styles under `public/` |
| Interno | `public/interno/interno.css` — contrast fixes only |
| Docs | `design.md` complete stamp; program checklist; `project-context.mdc` |

---

### Task 1: Expediente + Manejo

- [x] **Step 1:** Expediente cards/editors solid elevated; export/generate buttons `ui-pressable` + ink/success tokens
- [x] **Step 2:** Plantillas / related modals → glass outer or `openDialog` if straightforward
- [x] **Step 3:** Med pharm “indicated” → `--color-accent-soft` (ink), not indigo wash; today/warn use warn/danger tokens
- [x] **Step 4:** Targeted tests if class assertions break
- [x] **Step 5: Commit** `style(expediente-manejo): Hybrid H solid editors + med calendar`

---

### Task 2: Agenda + Estado Actual + Guardia

- [x] **Step 1:** Agenda blocks — distinct category colors OK; no indigo brand wash on default blocks
- [x] **Step 2:** EA chrome solid; tabs underline/segment (no glass tabs); clipboard actions pressable; charts keep Tufte + multi-hue series; axis from tokens
- [x] **Step 3:** Guardia metrics strip solid; phase bar high contrast; no glass on metrics
- [x] **Step 4: Commit** `style(agenda-ea-guardia): Hybrid H chrome parity`

---

### Task 3: Settings / help / onboarding + remaining modals

- [x] **Step 1:** Settings forms solid; strip purple/indigo gradients if any remain
- [x] **Step 2:** Tour/release notes motion ≤300ms; rare delight OK
- [x] **Step 3:** Migrate highest-traffic remaining modals from inventory (at least settings dropdown + one clinical modal)
- [x] **Step 4: Commit** `style(settings): Hybrid H forms + overlay migration batch`

---

### Task 4: Equipos desktop + interno touch-ups

- [x] **Step 1:** Desktop equipos embeds inherit tokens; QR panel pressables
- [x] **Step 2:** `public/interno/interno.css` — only if contrast broken under new tokens
- [x] **Step 3:** `cloud/equipos-pages` — **optional appendix**; skip unless quick token sync; note in commit message if deferred
- [x] **Step 4: Commit** `style(equipos-interno): Hybrid H token touch-ups`

---

### Task 5: Indigo purge audit + docs complete

- [x] **Step 1: Search** desktop CSS/JS for brand indigo leftovers:

```bash
rg -n '#4a52e8|#3b42c9|7b82f5|5b4dc0|4a52e8' public/styles public/js --glob '!*.test.*' || true
rg -n 'var\(--accent,\s*#' public/styles || true
```

Fix intentional brand uses; keep lab panel **header identity** colors (slate/green/indigo-as-panel-type) if they encode panel type — document exception in `design.md`.

- [x] **Step 2: Update `design.md`** — mark Hybrid H **complete**; Hallmark stamp historical only

- [x] **Step 3: Program doc** — check success criteria boxes in `2026-08-03-apple-hybrid-ui-overhaul-program.md` (force-add if needed)

- [x] **Step 4:** `docs/core/06-design-system.md` — note Spec D complete

- [x] **Step 5:** `project-context.mdc` changelog `hybrid-h-complete`

- [x] **Step 6:** `npm run build:ui` && `npm run metrics:check`

- [x] **Step 7: Commit** `docs(design): Hybrid H overhaul complete (Spec D)`

---

### Task 6: Final smoke

- [x] Light + dark: Expediente, Manejo, Agenda, EA, Guardia, Settings, leftover modal
- [x] Confirm no intentional indigo accent on primary chrome
- [x] Overlay kit default for any new UI touched in this branch

---

## Self-review

| Spec D goal | Task |
| --- | --- |
| Domain adoption | 1–4 |
| Overlay migration | 3 + inventory |
| Indigo brand retired | 5 |
| design.md complete | 5 |
| Interno minimal | 4 |
| Program checklist | 5 |

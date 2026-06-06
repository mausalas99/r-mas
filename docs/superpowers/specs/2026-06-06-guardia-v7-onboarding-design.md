# Guardia V7 Onboarding + Learn Hub — Design Spec

**Date:** 2026-06-06  
**Status:** Approved (brainstorming)  
**Component:** Post-registration education (guardia-v7 track), Learn Hub sheet, header Aprender entry  
**Application:** R+ — Electron renderer, `settings-help` / tour engine  
**Builds on:** [2026-06-02-clinical-onboarding-main-collapsible-filters-design.md](./2026-06-02-clinical-onboarding-main-collapsible-filters-design.md), [2026-06-01-sala-guardia-v3-design.md](./2026-06-01-sala-guardia-v3-design.md), `design.md` (Quiet workbench)

## Summary

Complement the onboarding experience for **upgraders** (6.6.x → 7.0.x) with a modular **Guardia y novedades 7.x** tutorial track, elevated **Aprender R+** discoverability (header button + Learn Hub sheet), and a **hybrid** upgrade entry (Novedades modal CTA + dismissible main-area card). Improve the existing onboarding **shell** (tokens, hub layout, copy) per ui-ux-pro-max / Hallmark — without changing **clinical registration** or blocking app entry before profile setup completes.

## Product decisions (locked)

| Topic | Decision |
|--------|----------|
| Primary audience | Upgraders who already used R+ and updated to 7.x |
| Entry timing | **After** clinical registration completes (`needsClinicalOnboarding()` false) — same gate as guided tour intro today |
| Registration | **Do not overwrite** usuario LAN, nombre en guardia, rango, sala, or team steps; guardia-v7 is education only |
| App entry | **No new blocking gate** before registro; upgrade card / Novedades CTA never preempt clinical onboarding |
| Discoverability | Header **Aprender** (icon) + Learn Hub sheet; Ajustes primary CTA becomes «Aprender R+» |
| Upgrade flow | **Hybrid:** Novedades modal secondary CTA + dismissible card in `#main-area` (non-blocking) |
| Content | Five modules (Modo Guardia, Entrega, LAN/equipos, móvil, censo/alcance) |
| Fundamentals track | Existing Sala / Interconsulta curriculum unchanged, collapsed under hub |
| New users | Clinical onboarding → optional Fundamentos tour intro (unchanged order); no guardia-v7 auto-push unless upgraded from &lt;7.0 |
| Upgraders | Suppress Sala/IC intro on semver bump if `GUIDED_TOUR_LS_KEY` already set; offer guardia-v7 instead |
| Saturation | One permanent header control; no progress badge in header; no contextual mini-tours in v1 |

## Problem

1. **Tutorials are hard to find** — buried under Ajustes → secondary button and bottom of Centro de ayuda.
2. **Wrong tour on upgrade** — `shouldShowGuidedTourIntro` re-shows the 15 min Sala/IC demo tour after every version bump.
3. **Guardia / entrega / LAN 7.x undocumented in tours** — help articles lack Modo Guardia, Entrega, PIN del turno.
4. **Hub UX weak** — module buttons as flex-wrap chips; small targets; no per-module progress.
5. **Token drift** — tour intro modal uses hardcoded `#0f766e` and raw `rgba` blues outside `public/tokens.css`.

## Boot sequence (registration first)

**Invariant:** Clinical identity onboarding keeps priority. Guardia-v7 education is **post-registration**, identical in spirit to today's `tryShowGuidedTourIntroIfNeeded()` hook from `hideMainClinicalOnboarding()`.

```
DB unlock
  → needsClinicalSyncModeChoice? → sync mode panel (blocking in #main-area)
  → needsClinicalOnboarding()?   → perfil + equipo (blocking in #main-area, unchanged)
  → hideMainClinicalOnboarding()
       → if upgrade 6.x→7.x && guardia-v7 incomplete:
            → maybeShowReleaseNotesFor (existing)
            → maybeShowGuardiaV7UpgradeCard (new, non-blocking)
       → else if new user && shouldShowGuidedTourIntro:
            → showTourIntroModal (Fundamentos Sala/IC only)
       → header Aprender enabled whenever !needsClinicalOnboarding()
```

**Must not:**

- Insert guardia-v7 modal/card before `clinicalRegistered` and team requirements are satisfied.
- Re-open or pre-fill registration fields for upgraders.
- Replace Paso 1 / Paso 2 clinical wizard content.
- Add `pointer-events: none` on sidebar/tabs for guardia-v7 card (card is informational only).

**May:**

- Show Novedades + upgrade card in the same session immediately after clinical onboarding dismisses, if user just upgraded.
- Show Novedades on next launch after upgrade if user completed registration in a prior session but has not seen notes for 7.x.

## Architecture — curriculum v8

New track in `public/js/onboarding-curriculum.mjs`:

```
SALA_CHAPTERS          (existing — Fundamentos)
IC_CHAPTERS            (existing)
GUARDIA_V7_CHAPTERS    (new)
```

| Module | Chapter ID | Step IDs (prefix `gv7_`) |
|--------|------------|--------------------------|
| A Modo Guardia | `ch-guardia-modo` | `gv7_guardia_chip`, `gv7_guardia_tab`, `gv7_guardia_scope`, `gv7_guardia_toggle`, `gv7_guardia_exit` |
| B Modo Entrega | `ch-guardia-entrega` | `gv7_entrega_phase`, `gv7_entrega_patient`, `gv7_entrega_roster`, `gv7_entrega_pendientes` |
| C LAN y equipos | `ch-guardia-lan` | `gv7_lan_wifi`, `gv7_lan_pin`, `gv7_lan_directorio`, `gv7_lan_rotacion` |
| D iPad y móvil | `ch-guardia-movil` | `gv7_mobile_link`, `gv7_mobile_scope`, `gv7_mobile_vs_sala` |
| E Censo y alcance | `ch-guardia-censo` | `gv7_censo_r1`, `gv7_censo_r4`, `gv7_censo_sync` |

- `CURRICULUM_VERSION` → **8**
- New targets in `public/js/tour-targets.mjs` (real UI spotlights)
- Progress field: `track: 'guardia-v7' | 'sala' | 'interconsulta'` in `rpc-guided-tour-progress`
- Module completion: separate key `rpc-guardia-v7-progress` with `{ completedChapters[], dismissedCard, updatedAt }`
- Guardia-v7 steps are **narrative** (Siguiente without mandatory user action) — no DEMO PÉREZ requirement

### Step content (summary)

**A — Modo Guardia:** header chip → Guardia tab → scope by rank → «Solo mis entregas» toggle → exit to Normal.

**B — Modo Entrega:** phase bar (~16:00) → per-patient handoff → entrega roster → pendientes v2 modal.

**C — LAN:** Wi‑Fi/LiveSync status → PIN del turno → directorio LAN → Mi rotación.

**D — Móvil:** permanent `/mobile/?token=…` link → reduced PWA scope → mobile vs sala invite split.

**E — Censo:** R1 team-scoped sidebar → R4 collapsible filters → quieter LAN sync.

## UI components

### Header — `btn-open-learn`

- Position: between Mi rotación and Ajustes; class `btn-header-icon`
- Icon: open-book SVG, 18×18, stroke 2px (Lucide-style, consistent with header set)
- `aria-label="Aprender R+"`, `title` for tooltip
- Min hit area 40×40px
- `:focus-visible` ring via `var(--color-focus-ring)` — no animated ring
- **Hidden** when `needsClinicalOnboarding()` or on `/mobile/` web client
- Opens Learn Hub sheet (not full help center)

### Learn Hub sheet

- Pattern: right sheet ~360px, backdrop scrim `rgba(15,23,42,0.55)` (matches release notes)
- `role="dialog"`, `aria-modal="true"`, focus trap, Esc + click-outside close
- Enter: 200ms `transform` slide; `prefers-reduced-motion`: 120ms opacity only

**Structure:**

1. **Continuar** (if any track in progress)
2. **Guardia y novedades 7.x** (expanded by default for upgraders)
   - Module rows: min-height 44px, title + «N pasos · ~N min» + status text
   - Status: «Completado» + checkmark SVG | «En curso · paso X de Y» | «Pendiente»
   - Active row: `background: var(--color-accent-soft)`
3. **Fundamentos** (`<details>` collapsed): Sala / IC module rows + restart buttons
4. Footer link: «Buscar en centro de ayuda…» → `openQuickHelp()`

Replace flex-wrap chip buttons in help modal with this sheet as primary surface when opened from header.

### Upgrade card (`#guardia-v7-upgrade-card`)

- Host: prepend to `#main-area` (reuse `.clinical-onboarding-card` styles)
- **Does not** add `clinical-onboarding-active` or disable sidebar/tabs
- Content: title «Novedades de guardia en R+ 7», 3 bullets, CTA «Empezar guía de guardia», secondary «Ver después»
- Dismiss persists `dismissedCard: true` in `rpc-guardia-v7-progress`
- Shown only when: `prevVersion < 7.0.0`, `curVersion >= 7.0.0`, `!needsClinicalOnboarding()`, track incomplete, not dismissed
- Delay 2s after Novedades modal if both fire same session

### Novedades modal

- Add secondary button «Abrir guía de guardia» in `.release-notes-actions`
- Visible when upgrade cross 7.0 and guardia-v7 incomplete
- Primary «Entendido» unchanged
- Action: close notes → open Learn Hub focused on guardia-v7

### Ajustes CTA reorder

- Primary: «Aprender R+ · guías y tutoriales» → `openLearnHub()`
- Secondary: «Centro de ayuda · atajos» → `openQuickHelp()`
- «Tutorial completo · Sala o Interconsulta» moves under Fundamentos inside hub

### Tour dock (incremental)

- Badge for guardia-v7: «Guardia 7.x · Módulo N/5»
- Per-step link «Más en ayuda» → help article id
- «Salir del módulo» ends current chapter without clearing other track progress

### Token fixes (same PR)

```css
/* Replace hardcoded intro tour colors */
.btn-intro-pick-secondary {
  background: var(--color-surface);
  border: 1px solid var(--action);
  color: var(--action);
}
.intro-option-card-accent {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent-soft);
}
```

## Gating logic

```javascript
function shouldOfferGuardiaV7Education(prevVer, curVer, settings) {
  if (needsClinicalOnboarding()) return false;
  if (!semverLt(prevVer, '7.0.0') || !semverGte(curVer, '7.0.0')) return false;
  if (isGuardiaV7TrackComplete()) return false;
  return true;
}

function shouldShowFundamentosTourIntro(curVer, storedDoneVer) {
  if (needsClinicalOnboarding()) return false;
  // Upgrader: already completed any fundamentals tour — skip on bump
  if (storedDoneVer && semverLt(storedDoneVer, '7.0.0')) return false;
  return shouldShowGuidedTourIntro(curVer, storedDoneVer);
}
```

| Event | Condition |
|-------|-----------|
| Clinical onboarding | `needsClinicalOnboarding()` — unchanged, blocking |
| Novedades 7.x | After registration; upgrade cross 7.0 |
| Upgrade card | After registration; upgrade cross 7.0; not dismissed |
| Fundamentos intro | After registration; new user OR no prior `GUIDED_TOUR_LS_KEY` |
| Header Aprender | `!needsClinicalOnboarding()`; desktop only |

## Help articles (new)

Add to `public/js/features/settings-help/help-content.mjs`:

1. `modo-guardia` — chip, tab, scope by rank, Normal vs Guardia
2. `modo-entrega` — handoff, roster, pendientes v2
3. `lan-pin-turno` — PIN, directorio, Mi rotación, LiveSync 7.x

Tour steps link «Más en ayuda» to these ids.

## Clinical onboarding shell improvements (v1, non-breaking)

- **Stepper:** wire `.clinical-onboarding-progress` for Modo → Perfil → Equipo (visual only; logic unchanged)
- **Do not** remove blocking for clinical wizard itself — only guardia-v7 surfaces are non-blocking
- **Intro modal copy:** shorten lead to ≤2 sentences for Fundamentos; remove «Aprender en centro de ayuda» (header replaces it)

## Out of scope (v1.1)

- Global progress map in hub («Guardia 2/5 · Fundamentos 0/6»)
- Contextual mini-tours on first Guardia tab visit
- Reordering clinical registration steps
- Mobile web Aprender button

## Files (implementation touch map)

| Area | Primary paths |
|------|----------------|
| Curriculum + hub data | `onboarding-curriculum.mjs`, `onboarding-progress.mjs` |
| Tour steps + targets | `tour-targets.mjs`, `tour-flow.mjs`, `tour-engine.mjs`, `tour-mini.mjs` |
| Gating + upgrade card | `tour-engine.mjs`, new `guardia-v7-onboarding.mjs` (or `settings-help/learn-hub.mjs`) |
| Header + sheet markup | `public/partials/chrome/header.html`, `modals.css` or `pase-board.css` |
| Release notes CTA | `release-notes.mjs`, `header.html` |
| Help articles | `help-content.mjs` |
| Lazy routes | `lazy-feature-routes.mjs` |
| Tests | `tour-intro.test.mjs`, new `guardia-v7-onboarding.test.mjs`, `onboarding-curriculum` step validation |

**Boot graph:** dynamic `import()` for learn-hub module from header handler; no new static imports in `app.js` / `app-shell.mjs`.

## Testing

| Case | Expected |
|------|----------|
| Fresh install, no profile | Clinical onboarding only; no guardia card; no Aprender button |
| Profile complete, new on 7.0 | Fundamentos intro optional; guardia-v7 not forced |
| Upgrade 6.7→7.0, profile complete | Novedades + card; no Fundamentos intro if `GUIDED_TOUR_LS_KEY` set |
| Upgrade card dismiss | Card hidden; reopen from header Aprender |
| Module A complete | Hub shows 1/5; resume continues at module B |
| `/mobile/` | No header Aprender |
| Dark + HC themes | Sheet, card, module rows meet contrast |
| `npm test` | Gating unit tests; curriculum step ids valid for track |

## UX checklist (ui-ux-pro-max / Hallmark)

- [ ] Icon-only header control has `aria-label` + `title`
- [ ] Module rows ≥44px height; focus order header → sheet → rows
- [ ] Progress not color-only (text + icon)
- [ ] One primary CTA per surface (card, Novedades, module start)
- [ ] All new colors via `var(--…)` from `tokens.css`
- [ ] No gradients on education surfaces
- [ ] `prefers-reduced-motion` on sheet and card entrance
- [ ] Esc closes sheet and Novedades; tour dock unchanged
- [ ] Registration fields never overwritten by education flow

## Changelog reference

When implemented, update `project-context.mdc` changelog:

`guardia-v7-onboarding`: post-registration Learn Hub + guardia track; header Aprender; upgrade card; curriculum v8.

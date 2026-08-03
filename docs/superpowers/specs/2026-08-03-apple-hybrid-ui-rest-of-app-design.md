# Spec D — Rest of App

> **Program:** [`2026-08-03-apple-hybrid-ui-overhaul-program.md`](2026-08-03-apple-hybrid-ui-overhaul-program.md)  
> **Depends on:** Spec A + B + C  
> **For implementation:** Split into sub-PRs by domain if the plan is large; still one design authority.

**Date:** 2026-08-03  
**Status:** Draft for review  

---

## Problem

After A–C, remaining domains still carry Hallmark indigo washes, mixed radii, and ad-hoc modals. Spec D finishes the visual language without inventing new materials or overlay systems.

## Goals

- [ ] Expediente, Manejo (meds), Agenda, Estado Actual, Guardia board, Settings/help adopt Hybrid H.
- [ ] Remaining modals/popovers use Spec B overlay kit (or thin wrappers).
- [ ] Equipos / interno mobile **touch-ups** only where shared tokens apply (no separate design system).
- [ ] Light + dark parity on primary desktop surfaces.
- [ ] `design.md` marked Hybrid H complete; Hallmark stamp retired or historical.

## Non-goals

- New features, tour content rewrites, or rebranding marketing sites.
- Full `public/interno/` mobile redesign (token inheritance only unless contrast breaks).
- Chart library replacement — keep Tufte EA/Tendencias rules; only axis/label colors from tokens.
- Re-opening accent debates (ink stays).

---

## Domain checklist

### Expediente (nota / HC)

- Solid editors and cards; mono where registro-like.
- Export / generate buttons → pressable ink/success emphasis tokens.
- Modals (plantillas, etc.) → overlay kit.

### Manejo / medicamentos

- Receta / perfil / pharm calendar: solid cells; today/warn tokens remapped to Hybrid H warn/danger.
- Avoid indigo “indicated” washes — use ink soft fill.

### Agenda

- Block colors from accent-soft → ink-soft or semantic category colors (keep distinct categories; don’t force everything ink).

### Estado Actual

- Charts: keep data-ink principles; series colors may stay multi-hue for discrimination.
- Chrome around charts: solid; tab pills → Hybrid H underline or solid segment control (no glass tabs).
- Clipboard / indicaciones actions: pressables.

### Guardia board

- Compact metrics: solid; phase bar high contrast.
- Do not glass the metrics strip.

### Settings / help / onboarding

- Forms solid; marketing/onboarding shells may keep larger radius but **no** purple gradients.
- Release notes / tour: restrained motion (rare → delight OK, still ≤300ms UI).

### Equipos / QR / cloud equipos pages

- Desktop embeds: inherit tokens.
- `cloud/equipos-pages`: optional follow-up; not blocking Spec D desktop close-out — note as **optional appendix** if out of Electron shell.

### Interno mobile

- Prefer CSS variable inheritance from shared tokens if served from same pipeline; else minimal contrast fixes only.

---

## Overlay migration completion

| Pattern | Action |
| --- | --- |
| Still on legacy backdrop markup | Migrate when file is touched; track list in implementation plan |
| Nested modal | Inner solid elevated |
| Popover from control | Origin-aware glass |
| Keyboard-heavy inspectors | No enter animation |

Maintain a short inventory in the Spec D plan (not here) of remaining overlay call sites.

---

## Testing

- Smoke per domain in light/dark.
- Existing colocated tests: update class/string assertions if any.
- metrics:check on all touched files.
- No full `npm test` in agent loop — CI gate only.

## Success criteria

- [ ] No intentional indigo brand accent left in desktop chrome/clinical surfaces.
- [ ] Overlay kit is the default for new UI; legacy ≤ small backlog filed.
- [ ] Program success criteria (program doc) checked off.
- [ ] Knowledge/docs: `design.md`, `06-design-system.md`, features-index note if needed, project-context changelog.

## Exit

Hybrid H is **done** when Spec D ships and the program checklist is green. Further polish is normal bugs/PRs, not a new overhaul program.

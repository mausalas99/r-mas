# Premium UI — Mobile + Interno Rollout Implementation Plan

**Goal:** Apply Workbench Refinado tokens to `rpc-mobile-web` (iPad PWA / LAN) and `public/interno/` without forking the design system.

**Spec:** `docs/superpowers/specs/2026-06-10-premium-ui-audit-remediation-design.md` (Phase 3).

**Prerequisites:** Phase 1 tokens + Phase 2 navigation + desktop surface rollout.

---

### Task 1: Mobile web surfaces

- [x] Grouped expediente row on mobile at all widths; tap-to-expand.
- [x] Touch targets ≥44px; `mobile-surfaces.css` overlay.
- [x] Commit `feat(ui): mobile web premium surfaces and touch grouped row`

### Task 2: Interno surfaces

- [x] `tokens.css` + `overlays.css` on interno; premium `interno.css` pass.
- [x] Commit `feat(ui): interno premium surfaces with shared design tokens`

### Task 3: Verification

- [x] `npm test` (1509 pass)
- [ ] iPad LAN smoke per merge
- [x] Changelog

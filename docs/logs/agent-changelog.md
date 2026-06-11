# Agent Changelog

Chronological record of documentation and integration work. Format per `documentation-architecture-assessment` skill.

## Summary

| Date | Task | Key paths | Outcome |
|------|------|-----------|---------|
| 2026-06-11 | Premium UI desktop surface rollout (T1–T7) | `workbench-surfaces.css`, `expediente.css`, `lab.css`, `pase-board.css`, `overlays.css`, `settings.css`, `modals.css` | Workbench Refinado: expediente/lab/sidebar/pase/guardia/manejo/agenda overlays; glass parity on settings dropdown, tour dock, learn hub. CSS-only. 1509 tests pass. |

| 2026-06-11 | Premium UI Phase 2 — navigation rework | `expediente-group-row*.mjs`, `header-context.mjs`, `command-palette*.mjs`, `fuzzy-match.mjs`, `group-row.css`, `cmdk.css`, `chrome.mjs`, `profile.mjs`, `layout.css` | Grouped expediente pill row (≥1100px) + narrow fallback; context header; segmented mode selector; ⌘K fuzzy palette; header search icon-only (magnifying glass); granular tab path removed. 1509 tests pass. |

| 2026-06-10 | Phase 1 design system foundation | `public/tokens.css`, `public/styles/base.css`, `public/styles/overlays.css`, `public/js/motion-mode.mjs` | Design system foundation complete — elevation tokens, type scale, motion presets (sobrio/mixto/expresivo), glass overlays, core chrome CSS tokenization |
| 2026-06-10 | Release 7.3.1 prepare | `medications.mjs`, `med-receta-core.mjs`, `med-pharm-profile-panel.mjs`, `docs/RELEASE_NOTES_7.3.1.txt` | Manejo modal SOME, AAS SOAP, borrar perfil, EA dieta; bump 7.3.1 |
| 2026-06-10 | Release 7.3.0 prepare | `med-pharm-view-window.mjs`, `teams-roster-lan.mjs`, `lab-panel.mjs`, `docs/RELEASE_NOTES_7.3.0.txt` | Perfil cross-mes, directorio LAN v17, lab historial, censo PDF; bump pendiente usuario |
| 2026-06-10 | Perfil histórico ventana dinámica | `med-pharm-view-window.mjs`, `med-pharm-profile-panel.mjs`, `pase-board.mjs` | Cross-mes grilla + FAB Copiar context-aware; spec/plan 2026-06-10 |
| 2026-06-10 | Release 7.2.9 prepare | `med-receta-core.mjs`, `medications.mjs`, `estado-actual-*`, `docs/RELEASE_NOTES_7.2.9.txt` | Manejo parser dietas/P2, propuesta dieta EA, bump + commit |
| 2026-06-08 | Docs hub + North Star integration | `docs/core/`, `.cursor/rules/` | Agent-first documentation library wired to Cursor rules |

---

## [2026-06-08] - Documentation hub & North Star integration

**Agent:** Cursor (Composer)

**Files Modified:**
- `docs/core/00-system-index.md` through `18-knowledge-capture.md` (new hub)
- `docs/features/features-index.md`, `docs/logic/logic-index.md`, `docs/database/database-index.md`
- `docs/logs/agent-changelog.md`
- `docs/README.md`
- `docs/vision-north-star.md` (redirect stub)
- `.cursor/rules/product-north-star.mdc`, `.cursor/rules/documentation-sync.mdc`
- `.cursor/rules/project-context.mdc`

**Database Changes:** None

**Summary:** Bootstrapped vibe-app-wiki documentation architecture: master hub at `docs/core/00-system-index.md`, canonical North Star at `docs/core/01-vision-north-star.md`, category indices linking to existing `docs/superpowers/` specs, and always-on Cursor rules so agents check product trade-offs before feature work and sync indices on architectural changes.

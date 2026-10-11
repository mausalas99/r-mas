# HF + Neumo design handoff (stopped 2026-10-07)

Goal: make R+ HF (packages/hf, own local git, gitignored in R+) look like the new core design by copying core INTO HF. Never edit packages/core. Nothing committed or pushed this session. HF HEAD is still 44a9009.

Done (uncommitted in packages/hf):
- All 25 drifted HF style files: 11 vendored (manifest + .gitignore + `git rm --cached`), 14 = core file + appended "HF-only rules" block. 2 bare `#fff` changed to `var(--color-on-accent)`.
- Patient card K1: `public/js/features/patients-card-html.mjs` = core + HF "Alta" chip + Nuevas/En seguimiento label exports. Handlers now take `(id, ev)` like core: patients.mjs (togglePatientPinned/Archived, dischargePatient), patients-select.mjs (deletePatient). patients-list.mjs drag filter skips `.patient-card-open`.
- Vendored from core: public/js/patient-sidebar-card.mjs, public/js/features/patient-dashboard/interconsult-catalog.mjs.
- public/styles/teal-workbench.test.mjs: deleted 3 tests that asserted the old non-pill look.
- Memory: Apple Intelligence exception (HF iOS lab-photo OCR only) saved.

Half-finished (agents stopped mid-edit, state unknown, review diff first):
- public/js/features/patient-dashboard/dashboard-html.mjs (Resumen A1 port).
- public/js/features/lab-panel.mjs (labs bar port). public/partials/layout/app-body.html not started.

Gates: build:ui was exit 0 before the two agents ran. Full npm test then: 2699 pass / 18 fail. 3 fixed (teal-workbench). 15 left are Resumen tests: patient-dashboard-css.test.mjs + dashboard html tests; they assert the old HF Resumen and need updating with the A1 port.

Next step: finish dashboard-html + lab-panel + app-body ports, fix the 15 tests, build:ui, npm test 0 fail, eslint touched files, live check with scripts/verify/session-2026-10-07/hf-live.mjs (Consulta IC needs Consulta Externa mode), commit in packages/hf, add a row to docs/core/20-claude-code-handoff.md.

Open owner picks: port core v25 (interconsult 'Under') and v27 (cloud_outbox) migrations to HF? Confirm Neumo Pleural "¿Cardiaco?" badge ordering rule (agent-made).

# LAN Teams Decoupled — Manual QA Checklist

**Spec:** [2026-06-01-lan-teams-decoupled-design.md](../specs/2026-06-01-lan-teams-decoupled-design.md)

- [ ] R4 **without** “Privilegios de administración”: Mi rotación shows **Todas las salas** browse
- [ ] No **Guardia hoy** checkbox on joined team cards
- [ ] R1 in Sala 1 can open/write chart for patient on another team’s letter in same sala
- [ ] R1 cannot open patient in Sala 2
- [ ] R2 sees patient after Entrega handoff from another sala
- [ ] R4 sidebar shows all patients; census filters (Sala / Equipo) work
- [ ] LAN hub **Censo global** shows team + patient counts per sala (not “en guardia” only)
- [ ] **Ver censo en lista de pacientes** applies global sala filter
- [ ] Entrega still creates handoff; recipient opens chart
- [ ] `npm test` passes (includes `lib/db/clinical-privileges.test.mjs`, `public/js/clinico-access.test.mjs`, `public/js/features/patients-clinical-filter.test.mjs`)

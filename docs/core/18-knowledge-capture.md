---
type: "core"
name: "Knowledge Capture"
status: "stable"
description: "Decision log for product and architectural choices."
---

# Knowledge Capture & Decision Log

Records key decisions so agents and humans stay aligned with [01-vision-north-star.md](./01-vision-north-star.md).

## Decision Log

| Date | Theme | Decision / Suggestion | Impact |
| :--- | :--- | :--- | :--- |
| 2026-08-14 | Architecture & Patterns | **Agent graph memory:** cheap cached extraction vs expensive subgraph reasoning. Schema-first prompt caching, Batch API for historical backfills, validate-before-write, temporal edges. Not a product feature; never ingest PHI. | `scripts/graph-memory/`, `docs/core/19-agent-graph-memory.md` |
| 2026-08-14 | Architecture | **clinicalOps LWW is union-on-join**, not whole-doc replace: a join/profile push must not drop `patient_team_assignment` the sender has not pulled yet. Worker Paid 30s CPU for sala snapshot. | `cloud/sync-worker/src/clinical-ops-lww.js`, `wrangler.toml` |
| 2026-08-14 | Security | **Nube V1 crypto is accepted:** D1 holds plaintext JSON; passwords PBKDF2-SHA-256 50k. Not E2EE. Do not treat envelope-DEK / client-encrypt as current work. | `docs/core/15-security.md` |
| 2026-08-13 | UX | Cold boot selects a census patient immediately after local hydrate (last selected → fijado → primero visible). Do not wait for clinical-access / Nube boot steps. | `app.js`, `patients-default-id.mjs` |
| 2026-08-13 | UX | Pendiente reminder toasts for deleted charts are stale — prune orphan `rpc-todos` keys on boot/pull and never fire reminders for missing patients. Click the toast to dismiss this session. | `patient-delete-local.mjs`, `todos-reminder-scheduler.mjs` |
| 2026-08-13 | UX | Paciente Resumen Medicamentos pills, hide-sidebar hover, ⌘1/⌘E/⌘T, one-click hide-sidebar, census Filtros. | **Shipped.** Do not reopen. |
| 2026-08-13 | UX | Onboarding / Learn Hub teach **structure + alta + incompletos** first (not lab-first). Tendencias live under Laboratorio. | `onboarding-curriculum.mjs` v17, `learn-hub.mjs` |
| 2026-08-13 | Architecture | **Nube login session-first:** persist token and paint Conexión as soon as the API returns; recovery-code modal and profile/sala run after and must not block or undo the session. | `panel-conexion-handlers.mjs` `enterCloudSession` |
| 2026-08-13 | Business Logic | SOAP destination picker follows EA zones (N → V → HD → HI → NM). Paracetamol/metamizol = analgesia/antipiréticos; buprenorfina = analgesia only. SOME catalog expands EA dest, **not** Manejo filters. | `med-receta-soap.mjs`, `med-receta-soap-some-map.mjs`, `estado-actual-med-ui.mjs` |
| 2026-08-13 | Business Logic | Potassium replacement may be mixed (KCl + KPO4 in the same bag). | `potassium-repos-detect.mjs` |
| 2026-08-13 | UX | Update checks are silent except from Ajustes: boot / Actualizar labs / patient change, 30 min throttle, no “ya actualizado” toast. | `features/platform/updater/silent-check.mjs` |
| 2026-08-05 | Architecture | **Nube room code = calendar month** (`YYYY-MM` CDMX), not daily turn. Sticky roomId always re-`ensure-turn`s to current month. | `cloud/sync-worker/src/turn-key.js`, `autostart.mjs` |
| 2026-08-02 | Architecture | **7.9 Nube Free pilot:** cloud room authority for **all clinical wards** (Drive-style HTTP push/pull; no host Mac). **LAN sync retiring.** | `cloud/sync-worker` + `public/js/features/cloud-sync/` |
| 2026-08-02 | Product | **Allowlist:** Nube = Sala 1/2/E, Torre HU, Interconsultas, UX, Eme, Área A/Pensionistas. Offline = local SQLCipher only; **labs uncapped**. | Hard gate in Worker + ⇄ panel |
| 2026-08-02 | Security | ~~Pilot PHI at rest = AES-GCM with Worker secret~~ **Superseded 2026-08-14** — V1 plaintext D1 is accepted | See 2026-08-14 Security row |
| 2026-08-02 | Product Strategy | Soften “no cloud PHI” anti-goal → no unmanaged EMR SaaS; **opt-in Free rooms allowed** (do not claim encrypted-at-rest) | Update `01-vision-north-star.md` trade-offs |
| 2026-06-08 | Product Strategy | North Star: *"Paste the lab, print the note—before the next patient calls."* Primary metric: TTD. Ideal user: R1/R2 on 24h guardia. | All feature proposals must shorten TTD or improve sync trust |
| 2026-06-08 | Product Strategy | Magic moment = SOME paste → structured data → `.docx` note (not LAN board alone) | Prioritize lab parser + doc export pipeline over peripheral UI |
| 2026-06-08 | Architecture | ~~Local-first / LAN only; cloud PHI is anti-goal~~ **Superseded 2026-08-02** by Nube Free pilot | See rows above |
| 2026-06-08 | Clinical Safety | Manejo automático retired (v7.1.2); human-in-the-loop over velocity | No autonomous treatment suggestions |
| 2026-06-08 | Documentation | Adopt vibe-app-wiki docs hub at `docs/core/00-system-index.md` | Agents read vision + project-context before exploring code |
| 2026-06-08 | Trade-offs | Fluidity > stability theater; sync reliability > departmental breadth | Reject features that add resident tool-management time |

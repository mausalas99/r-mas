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
| 2026-08-05 | Architecture | **Nube room code = calendar month** (`YYYY-MM` CDMX), not daily turn. Sticky roomId always re-`ensure-turn`s to current month. | `cloud/sync-worker/src/turn-key.js`, `autostart.mjs` |
| 2026-08-02 | Architecture | **7.9 Nube Free pilot:** for **Sala + Torre HU**, cloud room **overrides LAN** (Drive-style HTTP push/pull; no host Mac). | `cloud/sync-worker` + `public/js/features/cloud-sync/` |
| 2026-08-02 | Product | **Allowlist:** Nube = Sala + Torre HU only. **LAN-only for now:** Interconsultas, UX, Eme, Área A/Pensionistas. Offline stays; **labs uncapped**. | Hard gate in Worker + ⇄ panel |
| 2026-08-02 | Security | Pilot PHI at rest = AES-GCM with Worker secret; passwords = PBKDF2-SHA-256; not E2EE in V1 | Document in north star; Paid/envelope DEKs later |
| 2026-08-02 | Product Strategy | Soften “no cloud PHI” anti-goal → no unmanaged EMR SaaS; encrypted Free pilot allowed for opted-in rooms | Update `01-vision-north-star.md` trade-offs |
| 2026-06-08 | Product Strategy | North Star: *"Paste the lab, print the note—before the next patient calls."* Primary metric: TTD. Ideal user: R1/R2 on 24h guardia. | All feature proposals must shorten TTD or improve sync trust |
| 2026-06-08 | Product Strategy | Magic moment = SOME paste → structured data → `.docx` note (not LAN board alone) | Prioritize lab parser + doc export pipeline over peripheral UI |
| 2026-06-08 | Architecture | ~~Local-first / LAN only; cloud PHI is anti-goal~~ **Superseded 2026-08-02** by Nube Free pilot | See rows above |
| 2026-06-08 | Clinical Safety | Manejo automático retired (v7.1.2); human-in-the-loop over velocity | No autonomous treatment suggestions |
| 2026-06-08 | Documentation | Adopt vibe-app-wiki docs hub at `docs/core/00-system-index.md` | Agents read vision + project-context before exploring code |
| 2026-06-08 | Trade-offs | Fluidity > stability theater; sync reliability > departmental breadth | Reject features that add resident tool-management time |

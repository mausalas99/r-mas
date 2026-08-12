---
type: "core"
name: "Logic Index"
status: "stable"
description: "Parsers, sync engines, and algorithm modules."
---

# Logic Index

| Module | Path | Input → output |
|--------|------|----------------|
| Lab panel overlay | `labs-panel-overlay*.mjs`, room `labPanelOverlay` | Effective PanelDef registry + LAN LWW (wizard removed) |
| SOME lab parser | `public/js/labs.js`, `labs-*.mjs` (AG/AGc/UAG; QS lípidos; GS; paneles scaffold `labs-panel-defs.mjs`/`labs-panel-parse.mjs`: TIR/ENDO/CARD/FE/…) | Raw SOME text → structured lab lines |
| Lab historial | `lab-history-auto-store-core.mjs` | Parsed labs → per-patient history |
| BH trends | `public/js/tend-core.mjs`, `labs-bh-trend-parse.mjs` | History → chart series |
| Cultivos | `public/js/labs-cultivo.mjs` | SOME micro sections → isolate rows |
| Doc generators | `lib/doc-generators/note.js`, etc. | Form state → `.docx` bytes |
| Perfil farmacoterapéutico ventana | `public/js/med-pharm-view-window.mjs` | Perfil mensual + `fimiFecha` → columnas visibles cross-mes |
| Clinical safety | `lib/clinical-safety-rules/evaluate.mjs` | Calc input → pass / block |
| Clinical data reckoning (P1–P4) | `lib/clinical-repo/` + `lib/clinical-scope/` + `ci:forbid-lan` | commands/outbox + unified pure scope/evaluate — [program](../superpowers/specs/2026-08-11-clinical-data-reckoning-program.md) · [P4](../superpowers/specs/2026-08-11-p4-unified-clinical-access-design.md) |
| Drive import | `lib/drive-import/*.mjs` | Google Doc → HC/eventualidades patch |
| Clinical data reckoning (planned) | `lib/clinical-repo/` (P1), `lib/clinical-scope/` (P4) | Command → SQLCipher → sync projector; unified scope domain — [program](../superpowers/specs/2026-08-11-clinical-data-reckoning-program.md) |

**Hub:** [docs/core/08-core-architecture.md](../core/08-core-architecture.md)

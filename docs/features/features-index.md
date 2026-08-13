---
type: "core"
name: "Features Index"
status: "stable"
description: "Map of user-facing feature domains to source paths."
---

# Features Index

When adding a feature, create `feat-<name>.md` here and link from this table.

| Feature | Code path | Doc / spec |
|---------|-----------|------------|
| Laboratorio / SOME | `public/js/labs*.mjs`, `lab-panel.mjs` | Magic moment pipeline |
| Lab panel overlay | `labs-panel-overlay*.mjs`, `labs-panel-overlay-sync.mjs` | PanelDef overlay en censo Nube (sin wizard) |
| Lab repo / Actualizar labs | `lib/lab-repo/`, `lab-repo-import.mjs`, `lab-repo-batch-import.mjs` | Unificado: paciente activo → fechas; sin paciente → mi equipo. [scraper](../superpowers/specs/2026-06-27-lab-repo-scraper-design.md) |
| Labs externos (manual) | `labs-manual-catalog.mjs`, `labs-manual-synthesize.mjs`, `features/lab-manual-entry.mjs` | [spec](../superpowers/specs/2026-07-31-labs-externos-manual-entry-design.md) — tipo + celdas → historial `origin: 'externo'` |
| Paste-anywhere / Procesar SOME | `public/js/features/paste-smart.mjs`, `paste-smart-model.mjs` | Global paste or ⌘K → match census → confirm once → Labs |
| Cola documentación (mi equipo) | `public/js/features/doc-queue-panel.mjs`, `doc-queue-model.mjs`, `lab-eventualidad-interpret.mjs`, `lab-eventualidad-autosend.mjs`, `eventualidades-labs-timeline.mjs` | Interpretación → `labsText` + timeline Labs (auto); [spec](../superpowers/specs/2026-08-03-labs-timeline-auto-ux-design.md) |
| ⌘K palette (acciones) | `public/js/command-palette-model.mjs`, `features/command-palette.mjs` | Jumps + shift actions (Procesar SOME, labs batch, doc queue, EA, export, pase) |
| Preparar entrega (checklist) | `lib/entrega/entrega-prep-checklist.mjs`, `public/js/features/entrega-prep-panel.mjs` | Mi equipo: EA hoy / pendientes vencidos / cultivos sin seguimiento → 1 clic |
| Cola cultivos (mi equipo) | `public/js/features/cultivo-queue-panel.mjs`, `cultivo-queue-model.mjs` | ATB pendiente / sin nota → Cultivos |
| EA → clipboard indicaciones | `public/js/features/ea-indicaciones-clipboard.mjs` | Copiar meds confirmados + bomba a portapapeles |
| Tendencias | `public/js/features/tendencias.mjs` | Δ/anomaly strip + detail compare |
| Patient dashboard | `public/js/features/patient-dashboard/` | Paciente → Resumen glance home; SOAP meds as N/HD/HI list; [spec](../superpowers/specs/2026-08-13-patient-dashboard-home-design.md); mock `docs/mocks/patient-dashboard-nav.html` |
| Expediente / tabs | `public/js/expediente-tabs.mjs` | |
| Estado actual | `public/js/features/estado-actual-*.mjs` | [spec](../superpowers/specs/2026-05-26-estado-actual-monitoreo-design.md); Tab spine (skip +1/Alterada): [2026-08-03](../superpowers/specs/2026-08-03-ttd-retyping-tooltime-design.md) |
| VPO | `public/js/features/vpo.mjs`, `vpo-*.mjs` | [spec](../superpowers/specs/2026-05-29-vpo-design.md) |
| Medicamentos / receta | `public/js/med-receta-core.mjs`, `med-receta-soap*.mjs`, `med-receta-iv-oral*.mjs`, `potassium-repos-*.mjs` | SOAP dest from SOME catalog (EA, not Manejo filters); IV→VO oral packs; mixed KCl+KPO4 repos |
| Document export | `lib/doc-generators/`, `document-export-client.mjs` | [spec](../superpowers/specs/2026-05-30-native-document-generation-design.md) |
| Cloud sync (Nube) | `public/js/features/cloud-sync/` (`panel-conexion`, `autostart`, `mutate-bridge`, `room-sync-ws`), `cloud/sync-worker/` (`RoomSyncHub` DO) | [spec](../superpowers/specs/2026-08-02-cloud-sync-free-pilot-design.md); **realtime DO+WS:** [2026-08-07](../superpowers/specs/2026-08-07-cloud-sync-realtime-do-design.md); mobile: [2026-08-05](../superpowers/specs/2026-08-05-cloud-mobile-ipad-design.md) |
| Borrado pacientes (bulk) | `patient-delete-batch.mjs`, `patients-bulk-select.mjs` | Multi-select en sidebar; tombstone + purge host/Nube para que no regresen |
| Guardia board | `public/js/features/guardia-board.mjs`, `guardia-phase-bar.mjs`, `guardia-census-empty.mjs`, `guardia-fin-turno-*.mjs` | [spec](../superpowers/specs/2026-06-05-guardia-panel-overhaul-design.md); Nube UX + fin de guardia: [2026-08-07](../superpowers/specs/2026-08-07-magia-ic-guardia-nube-ux-design.md) |
| Magia IC (nota ← EA/censo) | `note-from-estado-actual.mjs`, `patient-diagnosticos.mjs`, `notes-indicaciones.mjs` | [spec](../superpowers/specs/2026-08-07-magia-ic-guardia-nube-ux-design.md) |
| Modo entrega | `lib/entrega/`, `clinical-entrega.mjs` | |
| Clinical teams | `public/js/features/clinical-teams/` | |
| Onboarding / Learn Hub | `onboarding-curriculum.mjs`, `clinical-onboarding*.mjs`, `learn-hub.mjs` | Curriculum v17: structure + alta + incompletos first; Labs under Laboratorio |
| Interno MIP (Nube) | `panel-interno-qr.mjs`, `interno-access-sync.mjs`, `cloud/sync-worker/src/interno/` | [feat-interno-mip-nube.md](./feat-interno-mip-nube.md); QR ⇄ → `/interno/{sala}` |
| Cloud mobile (iPad / R+ Móvil Nube) | `cloud/sync-pages/`, `public/js/features/cloud-mobile/`, `cloud/sync-worker/` ASSETS | [spec](../superpowers/specs/2026-08-05-cloud-mobile-ipad-design.md) |
| Equipos (Lumify/EKG/US) | `lib/equipos/`, `public/equipos/`, `cloud/equipos-worker/`, `equipos-cloud-config.mjs` | [spec](../superpowers/specs/2026-06-23-equipos-tracking-design.md); cloud deploy: `cloud/equipos-worker/README.md` |
| Settings / tours | `public/js/features/settings-help/` | |
| Platform / backup | `public/js/features/platform/` | Silent updater: `updater/silent-check.mjs` (Actualizar labs + cambio de paciente, throttle 30 min) |

**Hub:** [docs/core/00-system-index.md](../core/00-system-index.md)

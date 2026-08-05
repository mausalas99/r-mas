---
type: "core"
name: "Vision & North Star"
status: "stable"
dependencies: []
description: "Strategic vision, North Star metric, trade-offs, anti-goals, and development horizons for R+."
---

# 🌟 Vision & North Star: R+

## 🔭 The Vision
**R+** is a local-first clinical workstation for hospital guardia and sala—**Laboratoriazo + documentación clínica**. It is designed to shrink the gap between raw clinical inputs (SOME labs, vitals, handoff context) and compliant, ready-to-print documentation. R+ acts as a **cognitive extension** for the resident on a high-intensity shift: it absorbs tedious extraction and formatting so the clinician can stay with the patient and the team.

## 🚩 The North Star Goal
**"Paste the lab, print the note—before the next patient calls."**

Every feature exists to shorten **Time-to-Document (TTD)** from acquired data to a compliant evolution note or order set. The goal is to make R+ the indispensable **documentation and extraction layer** for the **R1/R2 resident on a 24-hour guardia**—with the team censo shared via **Nube** sync across all clinical wards, and still fully usable **offline** (local SQLCipher only; no LAN fallback).

---

## ⚠️ The Problem & The Alternative
Residents on high-intensity guardia (urgencias + sala, multiple handoffs) face significant friction. Their primary alternative is **Word templates + EMR fragments + manual SOME copy-paste**, which fails because:

1. **Documentation latency:** Labs arrive as disorganized SOME text; formatting trends, cultivos, and SOAP blocks steals minutes per patient when the shift is already cognitively overloaded.
2. **Transcription and version chaos:** Vitals and lab values are copied by hand; several residents touch the same patient without a shared, trustworthy view of the turn—silent overwrites and stale census erode team trust.

## 🛡️ The Solution & Magic Moment
R+ provides a **single desktop workbench**—labs, expediente, notes, orders, guardia board—synchronized across the turn via **Nube** (Cloudflare) room sync for **all clinical wards** so the room stays shared without a host Mac. **LAN LiveSync** is being retired.

- **✨ The Magic Moment:** The user pastes a disorganized SOME report and, in one flow, sees **structured clinical data**, **trends**, and a **formatted `.docx` evolution note** ready to print—without rebuilding Word templates or retyping values.
- **Laboratoriazo + expediente:** SOME parsing, historial, tendencias, cultivos, and Estado actual directly attack documentation latency and copy-paste error.
- **Team sync (⇄):** **Nube** Drive-style push/pull to a Cloudflare room (username/password, opt-in from ⇄) keeps the censo updated for the team without a host Mac. **LAN sync is being retired.** Offline local SQLCipher cache + outbox remain first-class.

**Code paths (magic moment pipeline):** `public/js/labs*.mjs` → `public/js/features/tendencias.mjs` → `lib/doc-generators/note.js` via `lib/doc-export-http.js` / `document-export-client.mjs`.  
**Cloud sync (7.9):** `cloud/sync-worker` + `public/js/features/cloud-sync/`.

---

## ⚖️ Core Product Principles (Decision Framework)
When faced with competing priorities or feature requests, the team should use these guiding trade-offs to make decisions:

1. **Workflow fluidity** *even over* **feature stability theater** — the tool should disappear into guardia; friction in the UI is a defect.
2. **Nube room authority for all clinical wards** *even over* **LAN host Mac** — cloud replaces LAN for **Sala 1/2/E, Torre HU, Interconsultas, UX, Eme, and Área A/Pensionistas**; **LAN sync is being retired**; **offline** stays first-class.
3. **Clinical safety (human-in-the-loop)** *even over* **shipping velocity** — no black-box treatment or diagnostic suggestions; explicit confirmation before high-risk actions.
4. **Turn-wide sync reliability** *even over* **breadth for other departments** — sync trust beats expanding scope beyond the current guardia/sala mission.
5. **Adjunct clarity** *even over* **EMR feature parity** — R+ complements the institutional record; it does not compete to become it.

## 🚫 Out of Bounds (Anti-Goals)
To maintain focus, we explicitly say **NO** to:

- **Unmanaged public EMR SaaS:** R+ is not a hospital system of record in the vendor cloud; the **7.9 Nube pilot** may store **encrypted-at-rest turn data** on Cloudflare Free for opted-in rooms only—not a general-purpose cloud expediente product.
- **EMR replacement:** R+ is not the system of record; formal boundary with the hospital EMR stays explicit.
- **Autonomous clinical decisions:** No opaque diagnostic or treatment engines; Manejo automático-style suggestions remain retired.
- **Forced cloud:** Nube is **opt-in**; offline device unlock (local SQLCipher only) must keep working without an account.
- **Tool time over patient time:** If a feature makes residents manage R+ instead of patients, it violates the North Star.

---

## 🛠️ The Toolkit (Tech Stack)
- **Frontend:** Electron 41 renderer (ES modules, esbuild chunks); clinical UI in `public/js/features/`; design tokens in `public/tokens.css` (IBM Plex, quiet workbench).
- **Backend/Infrastructure:** Embedded Express 5 + WebSocket/SSE LAN server (`server.js`, `lan-squad/`) on port **3738**; mDNS/UDP discovery; mobile clients at `/mobile/` and `/interno/`; **Nube pilot** on Cloudflare Workers + D1 (`cloud/sync-worker`, HTTP push/pull). Equipos queue remains a separate Worker (`cloud/equipos-worker`).
- **Core Engine:** SOME lab parsers and trend engine; native `.docx` generation (`lib/doc-generators/`); SQLCipher clinical store (`lib/db/`, Argon2) as local/offline cache; LAN host-store + cloud room LWW.

---

## 🗺️ Development Horizons
To guide the Product Owner's backlog, our roadmap is bucketed into three horizons:

- **📍 NOW (Current Focus):** **7.9 Nube Free** — **all clinical wards** (Sala 1/2/E, Torre HU, Interconsultas, UX, Eme, Área A/Pensionistas) sync on Cloudflare; Nube is room authority and **LAN sync is being retired**; offline + uncapped labs; Free-tier HTTP sync (no WebSockets yet).
- **🚀 NEXT (Growth):** **Paid/realtime upgrade path** — Durable Object WebSockets, envelope DEKs, stronger tenancy; continue workbench maturity (entrega, teams, onboarding).
- **🔭 LATER (Visionary):** **Institutional readiness** — RBAC, formal adjunct-vs-EMR boundary, hospital IT/legal evaluation (not claimed by software alone).

---

## 📈 Success Metrics
R+ is succeeding when we see an increase in:

- **Primary:** **Lower Time-to-Document (TTD)** — median time from lab acquisition (paste/import) to compliant, ready-to-print evolution note or order set.
- **Secondary:** **LiveSync trust factor** — turn census fully consistent across stations without manual refresh, conflict storms, or silent overwrites.
- **Secondary:** **Transcription accuracy** — fewer manual copy-paste errors for vitals and lab values (measured via audit/safety events and user-reported near-misses).

---

## Relationships
- **Product context & personas:** [02-product-context.md](./02-product-context.md)
- **User happy path:** [03-user-journey.md](./03-user-journey.md)
- **Code map:** [04-directory-structure.md](./04-directory-structure.md)
- **Architecture:** [08-core-architecture.md](./08-core-architecture.md)
- **Agent code map (fast):** `.cursor/rules/project-context.mdc`

> [!IMPORTANT]
> This document is a living artifact. If a proposed feature or architectural change does not actively serve the North Star or violates our Core Principles, it does not belong in R+.

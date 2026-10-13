---
type: "core"
name: "Vision & North Star"
status: "stable"
dependencies: []
description: "Strategic vision, North Star metric, trade-offs, anti-goals, and development horizons for R+."
---

# 🌟 Vision & North Star: R+

## 🔭 The Vision
**R+** is the **resident's desk and the team's shared board** for the hospital guardia and sala. It works on two layers:

1. **The resident's desk (one place per patient):** labs arrive on their own from the lab portal (or by paste), next to trends, cultivos, Estado actual (vitals, glucometrías, balance, medications), pendientes and agenda. Documents (evolution note, indicaciones, censo) are *outputs* of that desk, not its purpose.
2. **The team's shared board (one truth per shift):** every resident, iPad and interno phone in the room sees the same patients, the same state and the same pendientes, live via **Nube**, and still fully usable **offline** (local SQLCipher only). The shift changes hands without losing anything.

## 🚩 The North Star Goal
**"Everyone on the shift knows how every patient is—and nothing gets lost at handoff."**

Every feature exists to make the current state of any patient **complete, current and shared** without anyone retyping it: data flows in by itself (labs, cultivos, medications), the team sees it live, and the handoff carries every open pendiente across the turn. Target user: the **R1/R2 resident on a 24-hour guardia** and the team they share the room with.

---

## ⚠️ The Problem & The Alternative
Residents on high-intensity guardia (urgencias + sala, multiple handoffs) face significant friction. Their primary alternative is **paper/Word censo + EMR fragments + messages between residents + manual lab copy-paste**, which fails because:

1. **Scattered patient state:** labs live in the portal, vitals on paper, meds in the EMR, pendientes in chat. Building "how is this patient" steals minutes per patient on an overloaded shift.
2. **Lost handoffs and version chaos:** several residents touch the same patient without a shared, trustworthy view of the turn—pendientes fall through at entrega, stale census and silent overwrites erode team trust.
3. **Transcription error:** values copied by hand between systems introduce mistakes.

## 🛡️ The Solution & Magic Moment
R+ provides a **single desktop workbench** (with iPad and interno-phone companions)—patient desk, census, guardia board, handoff—synchronized across the turn via **Nube** (Cloudflare) room sync for **all clinical wards**. **LAN LiveSync is retired** (8.0.5).

- **✨ The Magic Moment:** a resident opens any patient on any device and sees today's labs already there, the trend, the current state and the open pendientes—exactly what the previous shift left—without asking anyone or retyping anything.
- **Resident's desk:** Actualizar labs (portal) + lab paste parsing, historial, tendencias, cultivos, Estado actual, pendientes, agenda, VPO, interconsultas; `.docx` notes, indicaciones and censo as outputs.
- **Shared board:** Nube room sync (opt-in, client E2EE for clinical content), Modo Guardia, entrega/pase, Internos by encrypted room QR, live updates across windows. Offline local SQLCipher cache + outbox remain first-class.

**Code paths:** labs `public/js/labs*.mjs` + `public/js/features/lab-*` → `tendencias*`; patient state `public/js/features/estado-*`, `todos*`, `agenda*`; shift `guardia*`, `clinical-entrega*`; outputs `lib/doc-generators/`.
**Cloud sync:** `cloud/sync-worker` + `public/js/features/cloud-sync/`.

---

## ⚖️ Core Product Principles (Decision Framework)
When faced with competing priorities or feature requests, the team should use these guiding trade-offs to make decisions:

1. **Workflow fluidity** *even over* **feature stability theater** — the tool should disappear into guardia; friction in the UI is a defect.
2. **Nube room authority for all clinical wards** *even over* **legacy LAN host Mac** — cloud is the turn authority for **Sala 1/2/E, Torre, Interconsultas, UX, Eme, and Área A/Pensionistas**; **LAN sync is retired**; **offline** stays first-class.
3. **Clinical safety (human-in-the-loop)** *even over* **shipping velocity** — no black-box treatment or diagnostic suggestions; explicit confirmation before high-risk actions.
4. **Turn-wide sync reliability** *even over* **breadth for other departments** — sync trust beats expanding scope beyond the current guardia/sala mission.
5. **Adjunct clarity** *even over* **EMR feature parity** — R+ complements the institutional record; it does not compete to become it.

## 🚫 Out of Bounds (Anti-Goals)
To maintain focus, we explicitly say **NO** to:

- **Unmanaged public EMR SaaS:** R+ is not a hospital system of record in the vendor cloud; the **Nube Free pilot** stores **opt-in turn rooms** on Cloudflare. HTTPS in transit; clinical *content* fields (notes/labs/indicaciones/monitoreo/clinicalOps) are client E2EE, live since 2026-08-31 (8.2.8) — opaque to Cloudflare. Registro and diagnoses are E2EE since 8.4.0; remaining identity fields (name/bed/service) are still plaintext in D1 — see [15-security.md](./15-security.md). Not a general-purpose cloud expediente product.
- **EMR replacement:** R+ is not the system of record; formal boundary with the hospital EMR stays explicit.
- **Autonomous clinical decisions:** No opaque diagnostic or treatment engines; Manejo automático-style suggestions remain retired.
- **Clinical interpretation:** R+ calculates from lab values (eTFG, corrected calcium, BUN/Cr, corrected reticulocytes) and flags values outside the lab's reference range. It emits no interpretations, diagnoses, or treatment suggestions—in the app or in its marketing.
- **Forced cloud:** Nube is **opt-in**; offline local use (local DB, no key — see `15-security.md`) must keep working without an account.
- **Tool time over patient time:** If a feature makes residents manage R+ instead of patients, it violates the North Star.

---

## 🛠️ The Toolkit (Tech Stack)
- **Frontend:** Electron 41 renderer (ES modules, esbuild chunks); clinical UI in `public/js/features/`; design tokens in `public/tokens.css` (IBM Plex, quiet workbench).
- **Backend/Infrastructure:** **Nube** on Cloudflare Workers (paid) + D1 (`cloud/sync-worker`); mobile at `/mobile/` (R+ Móvil) and `/interno/` (MIP Nube). Equipos queue: separate Worker (`cloud/equipos-worker`).
- **Core Engine:** SOME lab parsers and trend engine; native `.docx` generation (`lib/doc-generators/`); SQLCipher clinical store (`lib/db/`, Argon2) as local/offline cache; cloud room LWW.

---

## 🗺️ Development Horizons
To guide the Product Owner's backlog, our roadmap is bucketed into three horizons:

- **📍 NOW (Current Focus):** **Nube estable** — all clinical wards sync on Cloudflare; LAN LiveSync retired; Interno MIP + Equipos + R+ Móvil on Nube; offline + uncapped labs.
- **🚀 NEXT (Growth):** Deploy client E2EE (envelope DEKs) so Cloudflare cannot read clinical content; use paid Workers for Durable Object realtime; stronger tenancy; workbench maturity.
- **🔭 LATER (Visionary):** **Institutional readiness** — RBAC, formal adjunct-vs-EMR boundary, hospital IT/legal evaluation (not claimed by software alone).

---

## 📈 Success Metrics
R+ is succeeding when we see an increase in:

- **Primary:** **Handoff completeness** — share of open pendientes and patient states that survive a turn change without being re-asked or re-typed (target: nothing lost at entrega).
- **Secondary:** **Hands-free data** — share of lab values and cultivos that arrive in R+ by portal update instead of manual typing.
- **Secondary:** **Sync trust factor** — turn census fully consistent across stations and devices without manual refresh, conflict storms, or silent overwrites.
- **Secondary:** **Time-to-Document (TTD)** — median time from lab arrival to a ready-to-print note or order set (an output of the desk, still tracked).

---

## Relationships
- **Product context & personas:** [02-product-context.md](./02-product-context.md)
- **User happy path:** [03-user-journey.md](./03-user-journey.md)
- **Code map:** [04-directory-structure.md](./04-directory-structure.md)
- **Architecture:** [08-core-architecture.md](./08-core-architecture.md)

> [!IMPORTANT]
> This document is a living artifact. If a proposed feature or architectural change does not actively serve the North Star or violates our Core Principles, it does not belong in R+.

---
type: "core"
name: "Vision & North Star"
status: "stable"
dependencies: []
description: "Strategic vision, North Star metric, trade-offs, anti-goals, and development horizons for R+."
---

# 🌟 Vision & North Star: R+ HF

> Rewritten 2026-08-26 from the Dr. Dani (HF unit lead) requirements meeting. R+ HF is not a port of R+'s "paste labs → docx" mission — it is a different product for a different job. See meeting notes: heart-failure registry Excel columns, hospitalización/consulta formats.

## 🔭 The Vision
**R+ HF** is a local-first clinical workstation for the heart-failure unit's daily rounds and outpatient follow-up. It replaces free-text Word notes with **forced, structured, numeric data entry**, so the same entry drives three things at once: a glanceable round dashboard, a printable note, and a row in the unit's research registry. R+ HF acts as the unit's **data discipline layer**: it makes structured entry the path of least resistance, so the registry that feeds Dr. Dani's research fills itself as a side effect of normal charting.

## 🚩 The North Star Goal
**"One structured entry — the round dashboard, the note, and the registry row, all correct, none retyped."**

Every feature exists to raise the fraction of chart entries that are structured (numbers, scores, dropdowns) instead of free text, and to get that structured data into the unit's registry with zero manual re-transcription. The goal is to make R+ HF the daily tool for the **resident on HF rotation**, at the bedside during rounds and in outpatient consulta — with strict, rotation-scoped access, and still fully usable **offline** (local SQLCipher only).

---

## ⚠️ The Problem & The Alternative
The HF unit runs ~50 patients/day across hospitalización and consulta. Their alternative today is a **hand-built Word template + a shared master Excel registry**, which fails because:

1. **Free text kills the registry.** The Word template has the right sections (fenotipo, congestión, diuréticos, VExUS, plan) but residents fill them with prose instead of numbers ("se identifica...", "se determina llevar a..."). Dr. Dani cannot read it at the bedside, and the pasantes who transcribe it into the master Excel cannot reliably parse it either — so the registry that should power publications stays incomplete.
2. **No glance view.** During rounds, nobody can see "days since decongestion started, cumulative furosemide, current diuretic response" without reading a full Word note top to bottom. Nobody reads it.
3. **Consulta pendientes get lost.** Whether a patient already had an iron panel, thyroid panel, or genetic/amyloid workup lives buried in a past note, not surfaced as an open item — so it gets missed or re-ordered.
4. **Manual transcription into the master Excel** is slow, error-prone, and depends entirely on unpaid pasante goodwill — this is the single biggest blocker to Dr. Dani's research output.

## 🛡️ The Solution & Magic Moment
R+ HF provides a **single desktop workbench** with two modes — **Hospitalización** (acute, glance-first) and **Consulta** (ambulatory checklist) — sharing one patient record, synchronized across the rotation via **Nube** (Cloudflare) room sync, rotation-scoped access, and still fully usable **offline** (local SQLCipher only).

- **✨ The Magic Moment:** The resident fills a handful of structured fields (numbers, dropdowns, scores) once. That single entry immediately becomes (a) an updated round dashboard, (b) a printable evolution note / nota de devolución, and (c) a new row in the exportable research registry — with no separate transcription step and no free-text interpretation required.
- **Hospitalización dashboard:** decongestion start date and days elapsed, cumulative diuresis, cumulative/current furosemide dose, congestion score, VExUS, POCUS values, active meds ("4 fantásticos" + diuréticos) — all visible at a glance before walking into the room.
- **Consulta checklist:** fenotipo, FEVI (basal/seguimiento) + fecha de eco, etiología, decompensation/diuretic-increase in last 6 months, and open pendientes (perfil de hierro, panel tiroideo, panel genético/amiloide) surfaced as unchecked items, not buried prose.
- **Registry export:** structured fields map directly onto the unit's existing master-Excel columns (readmisión 0–30/30–60/60–90/>90d + causa, muerte + causa + timing, NT-proBNP serial values, TA basal/final, FEVI basal/seguimiento) — export goes to a scoped sub-sheet the pasantes then fold into the master registry, so Dr. Dani never has to grant direct access to the master DB.
- **Labs stay automated:** SOME lab parsing/trends/cultivos carry over unchanged from R+ — they were never the pain point here, free-text notes were.

**Code paths (magic moment pipeline):** structured entry forms in `public/js/features/` → `lib/doc-generators/note.js` (note/nota de devolución) and a new registry-row export path → `lib/doc-export-http.js` / `document-export-client.mjs`.
**Cloud sync:** `cloud/sync-worker` + `public/js/features/cloud-sync/`, gated to rotation-active users only.

---

## ⚖️ Core Product Principles (Decision Framework)
When faced with competing priorities or feature requests, the team should use these guiding trade-offs to make decisions:

1. **Structured over free text** *even over* **flexibility of expression** — every field that can be a number, score, or dropdown must be; free text is the failure mode this product exists to remove.
2. **One entry, three outputs** *even over* **separate charting and registry workflows** — dashboard, note, and registry row must come from the same structured entry; a second manual transcription step is a defect.
3. **Rotation-scoped access** *even over* **broad team visibility** — only residents currently active on the HF rotation see the unit's patients; access is granted and revoked with the monthly rotation change, and registry data is never dumped to a party outside the unit without Dr. Dani's say.
4. **Clinical safety (human-in-the-loop)** *even over* **shipping velocity** — no black-box treatment or diagnostic suggestions; explicit confirmation before high-risk actions.
5. **Adjunct clarity** *even over* **EMR feature parity** — R+ HF complements the institutional record; it does not compete to become it.

## 🚫 Out of Bounds (Anti-Goals)
To maintain focus, we explicitly say **NO** to:

- **Free-text-first design:** if a field can be captured as a number/score/dropdown, it does not get a text box by default.
- **Unmanaged public EMR SaaS:** R+ HF is not a hospital system of record in the vendor cloud; the **Nube Free pilot** stores **opt-in rotation rooms** on Cloudflare. **Target:** client encrypt → opaque D1 → client decrypt. **Today:** HTTPS in transit, **plaintext JSON in D1**, not E2EE — see [15-security.md](./15-security.md).
- **EMR replacement:** R+ HF is not the system of record; formal boundary with the hospital EMR stays explicit.
- **Autonomous clinical decisions:** No opaque diagnostic or treatment engines.
- **Forced cloud:** Nube is **opt-in**; offline device unlock (local SQLCipher only) must keep working without an account.
- **Direct access to the master registry:** R+ HF exports to a scoped sub-sheet; it does not hand app users write access to Dr. Dani's master research database.
- **Tool time over patient time:** If a feature makes residents manage R+ HF instead of patients, it violates the North Star.

---

## 🛠️ The Toolkit (Tech Stack)
- **Frontend:** Electron 41 renderer (ES modules, esbuild chunks); clinical UI in `public/js/features/`; design tokens in `public/tokens.css` (IBM Plex, quiet workbench).
- **Backend/Infrastructure:** **Nube** on Cloudflare Workers + D1 (`cloud/sync-worker`, HTTP push/pull); mobile at `/mobile/` (R+ Móvil) and `/interno/` (MIP Nube). Dev-only ward server `server.js` on **:3738** (`R_PLUS_DEV_WARD_SERVER=1`). Equipos queue: separate Worker (`cloud/equipos-worker`).
- **Core Engine:** SOME lab parsers and trend engine; native `.docx` generation (`lib/doc-generators/`); SQLCipher clinical store (`lib/db/`, Argon2) as local/offline cache; cloud room LWW.

---

## 🗺️ Development Horizons
To guide the Product Owner's backlog, our roadmap is bucketed into three horizons:

- **📍 NOW (Current Focus):** Structured **Hospitalización mode** — decongestion dashboard (start date/days, diuresis, furosemide cumulative dose, congestion score, VExUS, POCUS, meds) and its note/nota de devolución export; get the Word-note pain point solved first.
- **🚀 NEXT (Growth):** Structured **Consulta mode** (fenotipo, FEVI, etiología, decompensation history, pendientes checklist) + **registry export** matching the unit's master-Excel columns (readmisión by window + causa, muerte + causa + timing, NT-proBNP series, TA, FEVI basal/seguimiento); rotation-scoped access/revocation.
- **🔭 LATER (Visionary):** OCR/photo capture for paper labs brought by consulta patients (accuracy must be verified before trusting it over manual entry); direct Google Sheets push to the unit's registry; institutional readiness (RBAC, formal adjunct-vs-EMR boundary).

---

## 📈 Success Metrics
R+ HF is succeeding when we see an increase in:

- **Primary:** **Structured-field fill rate** — fraction of chart entries captured as numbers/scores/dropdowns instead of free text, per patient per day.
- **Primary:** **Registry completeness with zero manual transcription** — fraction of the unit's master-Excel columns that arrive pre-filled from R+ HF export, with no pasante retyping.
- **Secondary:** **Round dashboard adoption** — resident reports checking the dashboard instead of reading the prior Word note before entering the room.
- **Secondary:** **Consulta pendientes caught** — fraction of open workups (hierro, tiroideo, genético) surfaced by the checklist before they are missed a second time.

---

## Relationships
- **Product context & personas:** [02-product-context.md](./02-product-context.md)
- **User happy path:** [03-user-journey.md](./03-user-journey.md)
- **Code map:** [04-directory-structure.md](./04-directory-structure.md)
- **Architecture:** [08-core-architecture.md](./08-core-architecture.md)

> [!IMPORTANT]
> This document is a living artifact. If a proposed feature or architectural change does not actively serve the North Star or violates our Core Principles, it does not belong in R+.

# Clinical Calculator Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden manejo calculators and K⁺ dilution logic per `docs/superpowers/specs/2026-05-30-clinical-calculator-safety-design.md`.

**Architecture:** Thin `clinical-safety.mjs`; calculators validate → compute → clamp; electrolyte uses `planStandardKClBags` with hybrid single/multi SOME orders.

**Tech Stack:** Node ESM `--test`, esbuild bundle.

---

### Task 1: clinical-safety module — **DONE**

- [x] `public/js/clinical-safety.mjs` + `clinical-safety.test.mjs`
- [x] Added to `package.json` test script

### Task 2: manejo-calculators — **DONE**

- [x] IDSA vanco caps (3000 load / 2250 maint)
- [x] Bicarb deficit without `/8.5`; ampoules separate
- [x] Other drug ceilings + `null` on bad input

### Task 3: electrolyte-manejo — **DONE**

- [x] `planStandardKClBags` in `buildKHypoOrders`
- [x] `ClinicalSafetyError` catch → alerts, empty orders

### Task 4: Verify — **DONE**

- [x] `node --test` on safety + manejo + electrolyte tests (34 pass)
- [x] `node scripts/bundle-renderer.mjs`

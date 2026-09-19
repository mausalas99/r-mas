# Clinical Calculator & Electrolyte Safety — Design

**Date:** 2026-05-30  
**Status:** Approved (brainstorming)  
**Goal:** Harden pharmacological and electrolyte math to prevent lethal dosing errors. **No UI or export schema changes** — internal algorithms and copy text values only.

**Principles:** Defensive programming, explicit clinical constants, **low CCN** (small pure functions, flat control flow, no nested policy branches).

---

## Scope

| In scope | Out of scope |
|----------|----------------|
| `public/js/manejo-calculators.mjs` | UI (`manejo-proto-detail.mjs`, CSS) |
| `public/js/electrolyte-manejo.mjs` | Protocol catalog indication strings (e.g. `/8.5` in titles) |
| New `public/js/clinical-safety.mjs` + tests | Full `clinical-engine` extraction |
| Rebuild `app.bundle.mjs` if repo convention requires | Authentication, DB, LAN security |

---

## Architecture (low CCN)

Single thin module; calculators stay dumb orchestrators.

```
clinical-safety.mjs
  ClinicalSafetyError
  requirePositiveFinite(n) → number | null
  clamp(n, min, max)
  planStandardKClBags(totalMeq, maxConcMeqPerL) → { bags[] } | throw
  named constants (VANCO_*, MEQ_PER_AMPOULE_*, drug ceilings)

manejo-calculators.mjs     → validate → compute → clamp → copyLine
electrolyte-manejo.mjs     → planStandardKClBags in buildKHypoOrders only
```

**CCN rules for implementation:**

- One responsibility per function (validate, plan bags, build one order).
- Early return on invalid input; no `Number()` on raw strings inside calculators.
- Bag planner: one `while (remaining > 0)` loop, one helper `maxMeqForVolume(vol, maxConc)` — no nested severity switches in planner.
- `buildKHypoOrders`: `bags.length === 1 ? singleOrder() : multiOrders()` — two branches max at call site.

---

## Failure contract (option C)

| Situation | Behavior |
|-----------|----------|
| Calculator: missing/empty/non-finite/≤0 input | Return **`null`** |
| Electrolyte: missing peso for Na deficit row | Existing row + **`alerts`** (no throw) |
| Electrolyte: cannot plan K⁺ bags at safe concentration | **`ClinicalSafetyError`**; `evaluateElectrolyteManejo` catches → K row alert, `someOrders: []` |
| UI | Unchanged (`run()` already handles `null` / catch) |

---

## Vancomycin (IDSA-aligned)

| ID | Dose | Per-dose absolute cap |
|----|------|------------------------|
| `vanco-load` | `round(weightKg × mgPerKg)` | **3000 mg** |
| `vanco-maint` | same | **2250 mg** per dose *(assumes **q12h** → 4500 mg/day empiric ceiling)* |

- Validate `weightKg`, `mgPerKg`: `Number.isFinite` and `> 0`.
- If capped, append to `copyLine`: ` (tope N mg)` — same field, no new UI.
- **Tests:** 160 kg × 25 load → 3000; 80 kg × 25 → 2000; invalid peso → `null`.

*Follow-up (not blocking):* document q8h maint cap (1500 mg/dose) if HU protocol differs.

---

## Bicarbonate — `calcBicHuBalanceada`

**A. Extracellular deficit (no `/8.5`):**

```text
meqDeficit = (24 − bicPx) × weightKg × 0.3
```

- If `meqDeficit ≤ 0` (bicPx ≥ 24): return **`null`**.
- `meqTotal = round(meqDeficit)` (e.g. 70 kg, bic 10 → **294** mEq, not ~35).

**B. Ampoule conversion (separate step):**

```text
MEQ_PER_AMPOULE_8_4_PCT = 50   // 50 mL amp ≈ 50 mEq; named constant
ampoules8_4Pct = ceil(meqDeficit / 50)
```

**Return:** `{ meqTotal, ampoules8_4Pct, thirds, copyLine }` — `thirds` split `meqTotal` in three phases (bolo / 4h / 24h); `copyLine` pattern unchanged, numbers updated.

---

## Potassium dilution — hybrid D

Replace `standardBagVolumeMl` with **`planStandardKClBags(totalMeq, maxConcMeqPerL)`**:

- Standard volumes: `[100, 250, 500, 1000]` mL.
- Per bag: `maxMeq = maxConcMeqPerL × volMl / 1000`.
- Greedy: place remainder in smallest bag that fits at safe conc; else add **1000 mL** bag at `maxMeq` until remainder = 0.
- If iteration exceeds safe bound (e.g. 20 bags) or remainder stuck → **`ClinicalSafetyError`**.

**`buildKHypoOrders`:**

| Bags | Output |
|------|--------|
| 1 | One `someOrder` (current shape) |
| >1 | One `someOrder` per bag; same medication; `doseValue` = mEq in that bag; dilution states vol + conc ≤ limit |

Infusion rate per bag: `round((mEqPerHr × bag.meq / totalMeq) × bag.volMl)`.

**Tests:**

- Peripheral 30 mEq → 1 order, conc ≤ 40 mEq/L.
- Peripheral 80 mEq → 2 orders, 40 mEq in 1000 mL each (not 80/1000).
- CVC 40 mEq / 1000 mL → allowed (≤ 80 mEq/L).

---

## Other calculator ceilings

All use `requirePositiveFinite` then `clamp`:

| Function | Ceiling |
|----------|---------|
| `calcLevetiracetamLoad` | 4500 mg |
| `calcInsulinUnitsPerHour` | 50 U/h |
| `calcSedationMgPerHour` (propofol) | `mgPerHourMax ≤ 4 × weightKg` |
| `calcHypertonicVolume` (weight rule) | 500 mL |
| `calcAlbuminParacentesis` | 200 g |

---

## Files & tests

| File | Action |
|------|--------|
| `public/js/clinical-safety.mjs` | **Create** |
| `public/js/clinical-safety.test.mjs` | **Create** (planner edge cases, clamp, validate) |
| `public/js/manejo-calculators.mjs` | Refactor |
| `public/js/manejo-calculators.test.mjs` | Update expectations (vanco cap, bicarb 294, invalid → null) |
| `public/js/electrolyte-manejo.mjs` | `buildKHypoOrders` + catch in `evaluateElectrolyteManejo` |
| `public/js/electrolyte-manejo.test.mjs` | Multi-bag peripheral case |

Run: `npm test` on the above paths.

---

## Success criteria

- [ ] Invalid inputs never produce numeric doses (calculators return `null`).
- [ ] Vanco load ≤ 3000 mg; maint dose ≤ 2250 mg (q12h assumption).
- [ ] Bicarb `meqTotal = round((24−bicPx)×weightKg×0.3)`; ampoules computed separately.
- [ ] Peripheral K⁺ dilution never implies > 40 mEq/L; multi-bag only when required.
- [ ] New code paths stay low CCN (review: no function > ~10 cyclomatic complexity).

---

## Implementation note

After spec approval: invoke **writing-plans** skill for a task-by-task plan (TDD steps, no UI edits).

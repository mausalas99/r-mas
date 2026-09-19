# Static Clinical History — Implementation Plan

**Goal:** Versioned *Historia Clínica de Ingreso* with predicate safety, section-level conflict merge, audit trail, and discharge archive.

**Spec:** `docs/superpowers/specs/2026-05-30-static-clinical-history-design.md`

---

### Task 1: Rule Engine and JSON Schema Core

- [x] `lib/clinical-safety-rules/catalog.json` — 20 PDF scenarios
- [x] `lib/clinical-safety-rules/evaluate.mjs` — normalize, clauses, predicates
- [x] `lib/clinical-safety-rules/evaluate.test.mjs` — 5+ unit tests
- [x] `package.json` test script entries

### Task 2: Server Pipeline

- [x] `lan-squad/entity-keys.js` — `historiaClinicaEntityKey`
- [x] `lan-squad/host-store.js` — get/set/archive
- [x] `lan-squad/historia-clinica-validate.js` + routes in `host-router.js`
- [x] `lib/historia-clinica/storage.js` — archive I/O
- [x] Archive on patient `archived: true` via host-router

### Task 3: Audit

- [x] `versioned-mutation.mjs` — `attachHistoriaClinicaAudit`
- [x] `host-router.js` — `await store.putHistoriaClinicaQueued(...)`; `appendAudit` runs inside `writeQueue.enqueue` with `deferPersist` mutation, then `commitCacheNow()` (single disk commit)

### Task 4: Frontend

- [x] `historia-clinica-panel.mjs`
- [x] `clinical-history-safety.mjs`
- [x] `expediente-tabs.mjs` + `app-body.html` segment
- [x] `lan-sync.mjs` — `lanPushHistoriaClinica`

### Task 5: Verification

- [ ] `npm test`
- [ ] `npm run bundle:renderer`

### Task 6: Python cleanup

- [ ] Confirm legacy generators removed (pre-deleted in branch)

---
name: R+ Code Optimization & Battery Efficiency
description: Modular refactor of 3507-line SPA with performance optimizations for battery efficiency and code quality
type: design
---

# R+ Code Optimization & Battery Efficiency Design

## Overview

R+ is a 3507-line monolithic SPA (public/index.html) with embedded lab parsing, chart rendering, and form logic. This design refactors it into modular, performant components while maintaining feature parity and improving battery efficiency.

**Goals:**
1. Reduce battery consumption through performance optimization (target: 20-30% improvement)
2. Improve code quality by breaking monolith into focused modules
3. Create maintainable foundation for future features

**Scope:** Modular refactor + quick-win optimizations (caching, debouncing, lazy-loading, request batching)

---

## Architecture

### Current State
- Single 3507-line HTML file with embedded `<script>` tag
- 162 DOM queries scattered throughout
- 10 `setTimeout` calls (potential battery drain from polling/delays)
- 3 `addEventListener` calls (minimal event handling)
- 36 data access patterns (localStorage, fetch, XMLHttpRequest)
- 2 Chart.js instances (lab trends sparklines + detail charts)

### Target State
Four focused modules extracted from index.html:

```
public/
├── index.html (core UI shell, ~800 lines)
├── js/
│   ├── labs.js (lab parsing & data extraction)
│   ├── charts.js (Chart.js rendering & lifecycle)
│   ├── ui.js (form interactions, tab switching, DOM updates)
│   └── storage.js (localStorage persistence, data access)
└── vendor/
    └── chart.umd.min.js (already present)
```

### Module Responsibilities

**labs.js** — Lab data parsing and extraction
- `extraer()`, `extraerConRango()`, `parseBH_()`, `parseQS_()`, `parseESC_()`, `parsePFH_()`, `parseGaso_()`, `parsePIE_()`, `parsearLCR()`, `parseEGO_()`, `parseCuantOrina_()`, `parseCultivo_()`, `procesarLabs()`
- Exports: `{ procesarLabs, extraer, parseXXX }`
- No DOM dependencies; pure data transformation

**charts.js** — Chart.js rendering and lifecycle
- `renderTendencias()`, `openTendDetail()`, `closeTendDetail()`, chart instance management
- Exports: `{ renderTendencias, openTendDetail, closeTendDetail, destroyCharts }`
- Lazy-loads Chart.js only when Tendencias tab is active
- Destroys chart instances when switching tabs (memory cleanup)

**ui.js** — Form interactions, tab switching, DOM updates
- `switchTab()`, `switchInnerTab()`, `addPatient()`, `deletePatient()`, `updateVitals()`, form validation
- Exports: `{ switchTab, switchInnerTab, addPatient, deletePatient, updateVitals }`
- Caches DOM element references to avoid repeated queries
- Debounces form input handlers

**storage.js** — Data persistence and access
- `getPatients()`, `savePatient()`, `deletePatient()`, `pushLabHistory()`, `getLabHistory()`
- Exports: `{ getPatients, savePatient, deletePatient, pushLabHistory, getLabHistory }`
- Wraps localStorage with consistent interface
- Batches writes to reduce I/O

**index.html** — Core UI shell
- Remains the entry point; loads modules via `<script>` tags
- Contains all HTML structure and CSS
- Minimal inline JavaScript (initialization only)
- Reduced from 3507 to ~800 lines

---

## Performance Optimizations

### 1. DOM Query Caching
**Problem:** 162 `querySelector` calls throughout the code; repeated queries for the same elements.
**Solution:** Cache frequently accessed elements at module load time.
```javascript
// ui.js
const DOM = {
  patientList: document.querySelector('.patient-list'),
  mainContent: document.querySelector('main'),
  tabContent: document.querySelectorAll('.tab-content'),
  // ... etc
};
```
**Impact:** Eliminates redundant DOM traversals; ~5-10% battery savings.

### 2. Event Listener Debouncing
**Problem:** 10 `setTimeout` calls; potential for rapid re-renders or polling.
**Solution:** Debounce form input, search, and scroll handlers.
```javascript
// ui.js
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const handleFormInput = debounce((e) => {
  updatePatientField(e.target.name, e.target.value);
}, 300);
```
**Impact:** Reduces unnecessary re-renders; ~3-5% battery savings.

### 3. Lazy-Load Chart.js
**Problem:** Chart.js loaded and initialized even if Tendencias tab never opened.
**Solution:** Load Chart.js only when Tendencias tab becomes active; destroy on tab switch.
```javascript
// charts.js
let chartInstance = null;

export function renderTendencias(labData) {
  if (!window.Chart) {
    // Load Chart.js dynamically
    const script = document.createElement('script');
    script.src = 'vendor/chart.umd.min.js';
    script.onload = () => initCharts(labData);
    document.head.appendChild(script);
  } else {
    initCharts(labData);
  }
}

export function destroyCharts() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}
```
**Impact:** Reduces initial memory footprint; ~5-8% battery savings on startup.

### 4. Request Batching
**Problem:** Multiple `/generate` and `/generate-indicaciones` calls may fire in sequence.
**Solution:** Batch requests and deduplicate within a time window.
```javascript
// storage.js
let pendingRequests = [];
let batchTimeout;

export function batchFetch(endpoint, data) {
  pendingRequests.push({ endpoint, data });
  clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    const batch = pendingRequests.splice(0);
    Promise.all(batch.map(r => fetch(r.endpoint, { body: JSON.stringify(r.data) })));
  }, 100);
}
```
**Impact:** Reduces subprocess overhead; ~3-5% battery savings during bulk operations.

### 5. Lab Parsing Memoization
**Problem:** `procesarLabs()` re-parses the same lab text on every render.
**Solution:** Cache parsed results; invalidate only on text change.
```javascript
// labs.js
const parseCache = new Map();

export function procesarLabs(textoBruto) {
  const hash = hashString(textoBruto);
  if (parseCache.has(hash)) return parseCache.get(hash);
  
  const result = { /* parsing logic */ };
  parseCache.set(hash, result);
  return result;
}
```
**Impact:** Eliminates redundant parsing; ~5-10% battery savings during tab switching.

---

## Code Quality Improvements

### 1. Separation of Concerns
- Lab parsing isolated from UI rendering
- Chart lifecycle decoupled from form logic
- Storage abstracted from business logic
- Each module has a single responsibility

### 2. Testability
- Pure functions in `labs.js` can be unit-tested without DOM
- `charts.js` can be tested with mock Chart.js
- `ui.js` can be tested with DOM mocking
- `storage.js` can be tested with mock localStorage

### 3. Maintainability
- Clear module boundaries make it easy to locate and fix bugs
- Reduced cognitive load per file (800 lines vs 3507)
- Easier to onboard new developers

### 4. Reusability
- `labs.js` can be used in other contexts (CLI, API, etc.)
- `storage.js` can be swapped for IndexedDB or server-side storage
- `charts.js` can be replaced with alternative charting library

---

## Implementation Strategy

### Phase 1: Extract Modules (No Behavior Change)
1. Create `js/labs.js` with all parsing functions
2. Create `js/storage.js` with localStorage wrappers
3. Create `js/charts.js` with Chart.js rendering
4. Create `js/ui.js` with DOM interaction logic
5. Update `index.html` to load modules via `<script>` tags
6. Verify all features work identically

### Phase 2: Apply Performance Optimizations
1. Implement DOM query caching in `ui.js`
2. Add debouncing to form input handlers
3. Implement lazy-loading for Chart.js
4. Add request batching to `storage.js`
5. Implement parse caching in `labs.js`

### Phase 3: Testing & Validation
1. Manual testing of all features (patient CRUD, lab parsing, chart rendering, document generation)
2. Profiling with Electron DevTools to measure battery impact
3. Performance benchmarks (startup time, tab switching, chart rendering)

### Phase 4: Cleanup & Documentation
1. Remove dead code from `index.html`
2. Add JSDoc comments to module exports
3. Update README with module architecture
4. Commit with clear message

---

## Success Criteria

- **Battery efficiency:** 20-30% reduction in power consumption (measured via Electron DevTools)
- **Feature parity:** All existing features work identically
- **Code quality:** No duplication, clear module boundaries, testable functions
- **Performance:** Startup time ≤ 2s, tab switching ≤ 500ms, chart rendering ≤ 1s
- **Maintainability:** New developer can understand module purpose in < 5 minutes

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing features during refactor | Comprehensive manual testing after each phase; git commits after each module extraction |
| Module interdependencies creating tight coupling | Clear interface definitions; avoid circular imports |
| Performance regressions from module overhead | Profile before/after; optimize hot paths if needed |
| Increased bundle size from module boilerplate | Minify and bundle modules; measure final size |

---

## Timeline

- Phase 1 (Extract): 1-2 sessions
- Phase 2 (Optimize): 1-2 sessions
- Phase 3 (Test): 0.5-1 session
- Phase 4 (Cleanup): 0.5 session

**Total: 3-5 sessions**

---

## Notes

- All modules use ES6 syntax (already supported by Electron)
- No external dependencies beyond Chart.js (already vendored)
- Backward compatibility maintained; no API changes
- Can be done incrementally; each phase is independently valuable

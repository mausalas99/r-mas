# Lab trends performance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce general UI lag for long lab histories (20+ sets/patient) via parse cache, trend render windows (5 spark / 12 catalog / full on demand), incremental Tendencias renders, and debounced refresh — without losing full history in detail modals.

**Architecture:** New `lab-history-cache.mjs` holds revision counters, render windows, and a per-series index built in one pass. `lab-history-set.mjs` gains fingerprint skip + `readOnly` parse to avoid `saveState` on read paths. `tendencias.mjs` consumes windows/index and supports incremental DOM updates when structure is unchanged. Mutations call `bumpLabHistoryRevision`.

**Tech Stack:** Vanilla ES modules, Node test runner (`node --test`), Chart.js (existing), `deferred-work.mjs`, `tend-core.mjs`.

**Spec:** `docs/superpowers/specs/2026-05-26-lab-trends-perf-design.md`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `public/js/lab-history-cache.mjs` | Create | Revision, windows, series index, cached parse wrapper |
| `public/js/lab-history-cache.test.mjs` | Create | Unit tests |
| `public/js/lab-history-set.mjs` | Modify | Fingerprint skip, `readOnly`, export bump hook |
| `public/js/lab-history-set.test.mjs` | Modify | Tests for fingerprint / readOnly |
| `public/js/features/tendencias.mjs` | Modify | Windows, index, incremental render, detail downsample |
| `public/js/features/expediente.mjs` | Modify | Debounced `refreshTendenciasOrCultivosPanel` |
| `public/js/features/lab-panel.mjs` | Modify | `bumpLabHistoryRevision` on push/delete/reprocess |
| `public/js/lan-patient-merge.mjs` | Modify | Bump after labHistory merge |
| `public/js/app-runtimes.mjs` | Modify | Wire `ensureParsedLabHistoryCached` |
| `public/js/tend-group-modal.mjs` | Modify | Confirm full history on open (no grid preload change) |
| `package.json` | Modify | Register `lab-history-cache.test.mjs` |

---

### Task 1: Cache module — constants, revision, render windows

**Files:**
- Create: `public/js/lab-history-cache.mjs`
- Create: `public/js/lab-history-cache.test.mjs`
- Modify: `package.json` (append test file to `test` script)

- [ ] **Step 1: Write failing tests**

Create `public/js/lab-history-cache.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TREND_SPARK_WINDOW,
  TREND_CATALOG_WINDOW,
  bumpLabHistoryRevision,
  getLabHistoryRevision,
  getTrendRenderWindow,
  resetLabHistoryCacheForTests,
} from './lab-history-cache.mjs';

test('constants match spec', () => {
  assert.equal(TREND_SPARK_WINDOW, 5);
  assert.equal(TREND_CATALOG_WINDOW, 12);
});

test('getTrendRenderWindow full returns all', () => {
  var hist = [{ id: '1' }, { id: '2' }, { id: '3' }];
  assert.deepEqual(getTrendRenderWindow(hist, 'full'), hist);
});

test('getTrendRenderWindow spark returns last 5', () => {
  var hist = Array.from({ length: 8 }, (_, i) => ({ id: String(i) }));
  var win = getTrendRenderWindow(hist, 'spark');
  assert.equal(win.length, 5);
  assert.equal(win[0].id, '3');
  assert.equal(win[4].id, '7');
});

test('getTrendRenderWindow catalog returns last 12 or shorter', () => {
  var short = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(getTrendRenderWindow(short, 'catalog'), short);
  var long = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
  assert.equal(getTrendRenderWindow(long, 'catalog').length, 12);
});

test('bumpLabHistoryRevision is monotonic per patient', () => {
  resetLabHistoryCacheForTests();
  assert.equal(getLabHistoryRevision('p1'), 0);
  bumpLabHistoryRevision('p1');
  assert.equal(getLabHistoryRevision('p1'), 1);
  bumpLabHistoryRevision('p1');
  assert.equal(getLabHistoryRevision('p1'), 2);
  assert.equal(getLabHistoryRevision('p2'), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/lab-history-cache.test.mjs`  
Expected: FAIL — cannot find module `./lab-history-cache.mjs`

- [ ] **Step 3: Implement minimal module**

Create `public/js/lab-history-cache.mjs`:

```javascript
export const TREND_SPARK_WINDOW = 5;
export const TREND_CATALOG_WINDOW = 12;
export const TREND_DETAIL_DOWNSAMPLE = 100;
export const TREND_REFRESH_DEBOUNCE_MS = 80;

/** @type {Record<string, number>} */
var _revisionByPatient = Object.create(null);

export function resetLabHistoryCacheForTests() {
  _revisionByPatient = Object.create(null);
}

export function bumpLabHistoryRevision(patientId) {
  if (patientId == null || patientId === '') return;
  var k = String(patientId);
  _revisionByPatient[k] = (_revisionByPatient[k] || 0) + 1;
}

export function getLabHistoryRevision(patientId) {
  if (patientId == null || patientId === '') return 0;
  return _revisionByPatient[String(patientId)] || 0;
}

/**
 * @param {unknown[] | null | undefined} historyAsc
 * @param {'spark'|'catalog'|'full'} mode
 */
export function getTrendRenderWindow(historyAsc, mode) {
  var hist = historyAsc || [];
  if (mode === 'full') return hist.slice();
  var n = mode === 'spark' ? TREND_SPARK_WINDOW : TREND_CATALOG_WINDOW;
  if (hist.length <= n) return hist.slice();
  return hist.slice(-n);
}
```

Add to `package.json` `test` script (after `lab-history-set.test.mjs`):

```
public/js/lab-history-cache.test.mjs
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test public/js/lab-history-cache.test.mjs`  
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add public/js/lab-history-cache.mjs public/js/lab-history-cache.test.mjs package.json
git commit -m "feat: add lab history cache revision and trend render windows"
```

---

### Task 2: Series index builder

**Files:**
- Modify: `public/js/lab-history-cache.mjs`
- Modify: `public/js/lab-history-cache.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `lab-history-cache.test.mjs`:

```javascript
import {
  buildTrendSeriesIndex,
  trendCatalogSeriesKey,
} from './lab-history-cache.mjs';
import { dedupeTrendSetsForSeries, getSetTrendValueForSeries } from './tend-core.mjs';

function mockSet(fecha, hora, sectionKey, fieldKey, val) {
  return {
    fecha,
    hora,
    parsedBySection: { [sectionKey]: { [fieldKey]: String(val) } },
  };
}

test('buildTrendSeriesIndex latest from full history', () => {
  resetLabHistoryCacheForTests();
  var fullDesc = [
    mockSet('20/05/2026', '08:00', 'BH', 'Hb', 10),
    mockSet('21/05/2026', '08:00', 'BH', 'Hb', 11),
    mockSet('22/05/2026', '08:00', 'BH', 'Hb', 12),
  ];
  var fullAsc = fullDesc.slice().reverse();
  var catalogAsc = fullAsc.slice(-2);
  var specs = [{ sectionKey: 'BH', fieldKey: 'Hb' }];
  var idx = buildTrendSeriesIndex({
    catalogSpecs: specs,
    historyFullDesc: fullDesc,
    windowHistoryAsc: catalogAsc,
    tendRefForSeries: function () { return null; },
  });
  var key = trendCatalogSeriesKey('BH', 'Hb');
  assert.ok(idx[key]);
  assert.equal(idx[key].latest, 10);
  assert.equal(idx[key].setsDesc.length, 2);
  assert.equal(idx[key].setsDescFull.length, 3);
});

test('trendCatalogSeriesKey format', () => {
  assert.equal(trendCatalogSeriesKey('BH', 'Hb'), 'BH|Hb');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/lab-history-cache.test.mjs`  
Expected: FAIL — `buildTrendSeriesIndex` not exported

- [ ] **Step 3: Implement index**

Add to `lab-history-cache.mjs`:

```javascript
import {
  dedupeTrendSetsForSeries,
  getSetTrendValueForSeries,
} from './tend-core.mjs';

export function trendCatalogSeriesKey(sectionKey, fieldKey) {
  return String(sectionKey) + '|' + String(fieldKey);
}

/**
 * @param {{
 *   catalogSpecs: Array<{ sectionKey: string, fieldKey: string }>,
 *   historyFullDesc: unknown[],
 *   windowHistoryAsc: unknown[],
 *   tendRefForSeries: (history: unknown[], sk: string, fk: string, preferSet: unknown) => [number, number] | null,
 * }} opts
 */
export function buildTrendSeriesIndex(opts) {
  var catalogSpecs = opts.catalogSpecs || [];
  var historyFullDesc = opts.historyFullDesc || [];
  var windowHistoryAsc = opts.windowHistoryAsc || [];
  var tendRefForSeries = opts.tendRefForSeries;
  var windowDesc = windowHistoryAsc.slice().reverse();
  var out = Object.create(null);

  for (var i = 0; i < catalogSpecs.length; i += 1) {
    var spec = catalogSpecs[i];
    var sk = spec.sectionKey;
    var fk = spec.fieldKey;
    var key = trendCatalogSeriesKey(sk, fk);
    var rawFull = historyFullDesc.filter(function (s) {
      return getSetTrendValueForSeries(s, sk, fk) != null;
    });
    var setsDescFull = dedupeTrendSetsForSeries(rawFull, sk, fk);
    var rawWindow = windowDesc.filter(function (s) {
      return getSetTrendValueForSeries(s, sk, fk) != null;
    });
    var setsDesc = dedupeTrendSetsForSeries(rawWindow, sk, fk);
    var latestSet = setsDescFull.length ? setsDescFull[0] : null;
    var latest = latestSet ? getSetTrendValueForSeries(latestSet, sk, fk) : null;
    var ref = tendRefForSeries(historyFullDesc, sk, fk, latestSet);
    var isAbnormal =
      ref && latest != null && (latest < ref[0] || latest > ref[1]);
    out[key] = {
      setsDesc: setsDesc,
      setsDescFull: setsDescFull,
      latest: latest,
      ref: ref,
      isAbnormal: !!isAbnormal,
    };
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test public/js/lab-history-cache.test.mjs`  
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add public/js/lab-history-cache.mjs public/js/lab-history-cache.test.mjs
git commit -m "feat: build trend series index in single pass"
```

---

### Task 3: Parse fingerprint + readOnly in lab-history-set

**Files:**
- Modify: `public/js/lab-history-set.mjs`
- Modify: `public/js/lab-history-set.test.mjs`

- [ ] **Step 1: Write failing test**

Append to `public/js/lab-history-set.test.mjs`:

```javascript
import { bumpLabHistoryRevision, getLabHistoryRevision, resetLabHistoryCacheForTests } from './lab-history-cache.mjs';

test('ensureParsedLabHistory readOnly skips saveState when unchanged', async () => {
  resetLabHistoryCacheForTests();
  // Use existing PATIENT_ID fixture from file; after first parse, second readOnly call must not increment save counter.
  // Implement by stubbing saveState in test harness OR asserting set._parseFingerprint is set.
  const history = ensureParsedLabHistory(PATIENT_ID, { readOnly: true });
  assert.ok(history.length >= 1);
  assert.ok(history[0]._parseFingerprint);
  const fp = history[0]._parseFingerprint;
  const again = ensureParsedLabHistory(PATIENT_ID, { readOnly: true });
  assert.equal(again[0]._parseFingerprint, fp);
});
```

Adapt `PATIENT_ID` to match existing test fixture in that file.

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test public/js/lab-history-set.test.mjs`  
Expected: FAIL — no `_parseFingerprint` or unknown `readOnly` option

- [ ] **Step 3: Implement fingerprint + readOnly**

At top of `lab-history-set.mjs` add:

```javascript
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';

export { bumpLabHistoryRevision };

function labSetParseFingerprint(set) {
  if (!set) return '';
  var parts = [];
  if (set.resLabs && set.resLabs.length) {
    parts.push('r:' + set.resLabs.join('\n'));
  }
  if (set.sourceText) parts.push('s:' + String(set.sourceText));
  if (set.bhExtras) {
    try { parts.push('b:' + JSON.stringify(set.bhExtras)); } catch (_e) {}
  }
  return parts.join('|');
}
```

In `ensureParsedLabHistory`, after `var history = normalizeLabHistoryPatientSets(raw);`:

```javascript
  var readOnly = !!(options && options.readOnly);
```

Inside the `history.forEach` loop, before heavy parse block:

```javascript
    var fp = labSetParseFingerprint(set);
    var hasParsed =
      set.parsedBySection &&
      Object.keys(set.parsedBySection).length &&
      set._parseFingerprint === fp;
    if (hasParsed) {
      return;
    }
```

After successful parse of `parsedBySection`, set:

```javascript
        set._parseFingerprint = fp;
```

Replace final block:

```javascript
  if (changed) saveState();
```

with:

```javascript
  if (changed && !readOnly) saveState();
  else if (changed && readOnly) {
    // normalization deferred until explicit save path
  }
```

- [ ] **Step 4: Run tests**

Run: `node --test public/js/lab-history-set.test.mjs public/js/lab-history-cache.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/lab-history-set.mjs public/js/lab-history-set.test.mjs
git commit -m "perf: skip lab set re-parse when fingerprint unchanged"
```

---

### Task 4: Cached parse wrapper + mutation bumps

**Files:**
- Modify: `public/js/lab-history-cache.mjs`
- Modify: `public/js/features/lab-panel.mjs`
- Modify: `public/js/lab-history-set.mjs`
- Modify: `public/js/lan-patient-merge.mjs`

- [ ] **Step 1: Add ensureParsedLabHistoryCached**

In `lab-history-cache.mjs`:

```javascript
import { ensureParsedLabHistory } from './lab-history-set.mjs';

export function ensureParsedLabHistoryCached(patientId, options) {
  if (!patientId) return [];
  var opts = options && typeof options === 'object' ? { ...options } : {};
  if (opts.readOnly == null) opts.readOnly = true;
  return ensureParsedLabHistory(patientId, opts);
}
```

- [ ] **Step 2: Bump revision on lab mutations**

In `lab-panel.mjs` import:

```javascript
import { bumpLabHistoryRevision } from '../lab-history-cache.mjs';
```

Call `bumpLabHistoryRevision(patientId)` at end of:
- `pushLabHistory` (after push)
- `deleteLabHistorySet` (after mutate)
- `reprocessLabHistorySet` (after successful reprocess)
- bulk delete helpers that mutate `labHistory[pid]`

In `lab-history-set.mjs` `runLabHistoryPostSaveMaintenance`, when `changed === true` after reprocess loop, for each pid in `report.patientsReprocessed`:

```javascript
    bumpLabHistoryRevision(pid);
```

In `lan-patient-merge.mjs`, after `labHistory: mergeLabHistorySets(...)` in merged entry:

```javascript
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';
// inside mergePatientEntry when lab history array changes:
bumpLabHistoryRevision(mergedPatient.id);
```

- [ ] **Step 3: Manual smoke**

Run: `npm test` (full suite)  
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add public/js/lab-history-cache.mjs public/js/features/lab-panel.mjs public/js/lab-history-set.mjs public/js/lan-patient-merge.mjs
git commit -m "perf: cached parse wrapper and revision bumps on lab mutations"
```

---

### Task 5: Wire runtime + debounced tendencias refresh

**Files:**
- Modify: `public/js/app-runtimes.mjs`
- Modify: `public/js/features/expediente.mjs`

- [ ] **Step 1: Runtime uses cached parse**

In `app-runtimes.mjs`:

```javascript
import { ensureParsedLabHistoryCached } from './lab-history-cache.mjs';
```

For runtimes that currently pass `ensureParsedLabHistory`, add parallel export or replace hot-path usages:

```javascript
ensureParsedLabHistory: ensureParsedLabHistory, // keep for writes
ensureParsedLabHistoryCached: ensureParsedLabHistoryCached,
```

Update tendencias runtime object in same file to prefer `ensureParsedLabHistoryCached` for read paths (tendencias.mjs rt default).

- [ ] **Step 2: Debounce refreshTendenciasOrCultivosPanel**

In `expediente.mjs`:

```javascript
import { TREND_REFRESH_DEBOUNCE_MS } from '../lab-history-cache.mjs';

var _tendRefreshTimer = null;

function refreshTendenciasOrCultivosPanel() {
  if (rt.getActiveAppTab() !== 'nota') return;
  if (_tendRefreshTimer) clearTimeout(_tendRefreshTimer);
  _tendRefreshTimer = setTimeout(function () {
    _tendRefreshTimer = null;
    if (rt.getActiveInner() === 'tend') rt.renderTendencias();
    else if (rt.getActiveInner() === 'cult') renderCultivosTable();
  }, TREND_REFRESH_DEBOUNCE_MS);
}
```

- [ ] **Step 3: Run tests**

Run: `npm test`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add public/js/app-runtimes.mjs public/js/features/expediente.mjs
git commit -m "perf: expose cached lab parse and debounce tendencias refresh"
```

---

### Task 6: Tendencias — windows, index, spark limit 5

**Files:**
- Modify: `public/js/features/tendencias.mjs`

- [ ] **Step 1: Import cache helpers**

```javascript
import {
  getTrendRenderWindow,
  buildTrendSeriesIndex,
  trendCatalogSeriesKey,
  getLabHistoryRevision,
  TREND_DETAIL_DOWNSAMPLE,
} from '../lab-history-cache.mjs';
```

Replace local `tendCatalogSeriesKey` usages with import (remove duplicate function if identical).

- [ ] **Step 2: Use cached parse in renderTendenciasBody**

Change:

```javascript
var history = sortLabHistoryChronological(rt.ensureParsedLabHistory(aid()));
```

to:

```javascript
var historyDesc = sortLabHistoryChronological(
  rt.ensureParsedLabHistoryCached ? rt.ensureParsedLabHistoryCached(aid()) : rt.ensureParsedLabHistory(aid())
);
var historyAsc = historyDesc.slice().reverse();
var catalogAsc = getTrendRenderWindow(historyAsc, 'catalog');
```

- [ ] **Step 3: Replace filter loops with index**

After `mergedCatalog = buildMergedTrendSeriesCatalog(historyDesc)`:

```javascript
var seriesIndex = buildTrendSeriesIndex({
  catalogSpecs: mergedCatalog,
  historyFullDesc: historyDesc,
  windowHistoryAsc: catalogAsc,
  tendRefForSeries: tendRefForSeries,
});
```

Replace series availability loop:

```javascript
for (var ci = 0; ci < mergedCatalog.length; ci++) {
  var sp = mergedCatalog[ci];
  var sk = sp.sectionKey;
  var fk = sp.fieldKey;
  if (tendSeriesIsUserHidden(sk, fk)) continue;
  var idx = seriesIndex[trendCatalogSeriesKey(sk, fk)];
  if (!idx || idx.setsDesc.length < 2) continue;
  seriesAvail.push(sp);
}
```

For abnormal filter use `idx.isAbnormal` instead of `tendSeriesLatestAbnormal(historyDesc, ...)`.

- [ ] **Step 4: Card values from full history, sparks from window**

In card build loop, replace `setsDesc`/`latest`/`ref`/`isAb` with:

```javascript
var idx = seriesIndex[trendCatalogSeriesKey(sectionKey, fk)];
var setsDesc = idx.setsDescFull;
var latestSet = setsDesc.length ? setsDesc[0] : null;
var latest = idx.latest;
var ref = idx.ref;
var isAb = idx.isAbnormal;
```

Spark jobs: use `idx.setsDesc` (catalog window) sliced to spark window:

```javascript
var sparkSetsDesc = idx.setsDesc.slice(0, TREND_SPARK_WINDOW);
var setsAsc2 = toTrendAscendingSets(sparkSetsDesc);
```

Remove `TREND_SPARK_MAX_POINTS = 48` and `downsampleTrendChartSeries` for sparks (keep function for detail modal).

- [ ] **Step 5: openTendDetail uses full history + downsample at 100**

In `openTendDetail`:

```javascript
var history = sortLabHistoryChronological(rt.ensureParsedLabHistoryCached(aid()));
// ... build setsAsc from full dedupe ...
var sampled = setsAsc.length > TREND_DETAIL_DOWNSAMPLE
  ? downsampleTrendChartSeries(labels, values)
  : { labels: labels, values: values };
// use sampled.labels / sampled.values in Chart
```

Update `downsampleTrendChartSeries` to accept optional max param defaulting to `TREND_DETAIL_DOWNSAMPLE` for detail; sparks no longer call it.

- [ ] **Step 6: Run tests**

Run: `npm test`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add public/js/features/tendencias.mjs
git commit -m "perf: tendencias catalog window, series index, 5-point sparks"
```

---

### Task 7: Incremental tendencias render

**Files:**
- Modify: `public/js/features/tendencias.mjs`

- [ ] **Step 1: Add render state**

Near top of `tendencias.mjs`:

```javascript
var _tendRenderState = { key: null, seriesKeys: [] };

function buildTendRenderKey(patientId, revision, prefsHash, sectionsExpanded) {
  return [patientId, revision, prefsHash, sectionsExpanded].join('::');
}

function tendPrefsHash() {
  return String(tendAbnormalOnlyRead()) + '|' + String(tendHiddenSeriesRead().join(','));
}

function tendExpandedSectionsKey() {
  return TEND_SECTION_ORDER.filter(function (sk) {
    return tendSectionIsExpanded(sk);
  }).join(',');
}
```

- [ ] **Step 2: Implement patchTendCardsFromIndex**

```javascript
function patchTendCardsFromIndex(seriesIndex, seriesAvail) {
  var patched = 0;
  for (var i = 0; i < seriesAvail.length; i += 1) {
    var sp = seriesAvail[i];
    var key = trendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
    var idx = seriesIndex[key];
    if (!idx) continue;
    var card = document.querySelector('.tend-card[data-series-key="' + key.replace(/"/g, '\\"') + '"]');
    if (!card) return false;
    var valEl = card.querySelector('.tend-param-value');
    if (valEl) {
      valEl.textContent = idx.latest != null ? String(idx.latest) : '—';
      valEl.classList.toggle('tend-abnormal', !!idx.isAbnormal);
    }
    patched += 1;
  }
  return patched > 0;
}

function updateSparkChartsFromJobs(sparkJobs, chartAnim) {
  for (var i = 0; i < sparkJobs.length; i += 1) {
    var job = sparkJobs[i];
    var ck = trendSparkChartKey(job.sk2, job.fk2);
    var chart = sparkCharts[ck];
    if (chart) {
      chart.data.labels = job.labels2;
      chart.data.datasets[0].data = job.values2;
      chart.update(chartAnim === false ? 'none' : undefined);
    } else {
      mountOneTrendSparkChart(job, null, chartAnim);
    }
  }
}
```

- [ ] **Step 3: Branch in renderTendenciasBody**

Before `container.innerHTML = htmlParts.join('')`:

```javascript
  var renderKey = buildTendRenderKey(
    aid(),
    getLabHistoryRevision(aid()),
    tendPrefsHash(),
    tendExpandedSectionsKey()
  );
  var nextSeriesKeys = seriesAvail.map(function (sp) {
    return trendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
  });
  var canPatch =
    _tendRenderState.key === renderKey &&
    _tendRenderState.seriesKeys.length === nextSeriesKeys.length &&
    _tendRenderState.seriesKeys.every(function (k, i) { return k === nextSeriesKeys[i]; }) &&
    container.querySelector('.tend-grid');

  if (canPatch) {
    if (!patchTendCardsFromIndex(seriesIndex, seriesAvail)) {
      canPatch = false;
    }
  }

  if (canPatch) {
    // rebuild sparkJobs only, update charts
    // ... same sparkJobs loop as today ...
    updateSparkChartsFromJobs(sparkJobs, chartAnim);
    syncTendHiddenModalIfOpen();
    return;
  }

  _tendRenderState.key = renderKey;
  _tendRenderState.seriesKeys = nextSeriesKeys;
```

Reset `_tendRenderState.key = null` when `!aid()` or patient changes (in `renderTendenciasBody` early exit).

- [ ] **Step 4: Run tests + manual check**

Run: `npm test`  
Manual: open Tendencias, add lab set — cards update without full flash.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/tendencias.mjs
git commit -m "perf: incremental tendencias card and spark updates"
```

---

### Task 8: Verification

**Files:** none (manual)

- [ ] **Step 1: Full test suite**

Run: `npm test`  
Expected: all tests PASS

- [ ] **Step 2: Manual acceptance (patient with 20+ sets)**

1. Open Tendencias tab — should feel snappier than before.
2. Card headline value = latest lab from full history.
3. Spark shows ≤5 recent points.
4. Click card → detail chart shows full history (downsample only if >100 points).
5. Paste new lab — UI responsive (<300ms perceived on dev machine).
6. Switch patient and back — data correct.

- [ ] **Step 3: Commit any test fixes**

If fixes needed, commit separately.

---

## Spec coverage checklist

| Spec section | Task |
|--------------|------|
| Constants 5/12/100/80ms | Task 1 |
| Revision bump | Tasks 1, 4 |
| getTrendRenderWindow | Task 1 |
| buildTrendSeriesIndex | Task 2 |
| Parse fingerprint + readOnly | Task 3 |
| ensureParsedLabHistoryCached | Task 4 |
| lab-panel / LAN bumps | Task 4 |
| Runtime wire | Task 5 |
| Debounce refresh | Task 5 |
| Tendencias windows + index | Task 6 |
| Spark 5, card latest full | Task 6 |
| Detail full + downsample 100 | Task 6 |
| Incremental render | Task 7 |
| Manual acceptance | Task 8 |
| tend-group-modal lazy full | Covered by existing open path using full history in group modal deps — verify in Task 8 step 2 optional open group chart |

## Risks during implementation

- **Circular import:** `lab-history-cache` imports `lab-history-set` only in `ensureParsedLabHistoryCached`; `lab-history-set` imports `bumpLabHistoryRevision` from cache — keep cached wrapper in cache module, not reverse.
- **Duplicate `tendCatalogSeriesKey`:** remove local copy in `tendencias.mjs` when importing from cache.
- **Incremental patch DOM selector:** use `CSS.escape` if available for series keys with special chars.

# Modularization via Metrics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a metrics pipeline (ESLint, jscpd, dependency-cruiser, debt score) with CI gates, then burn down god-files under ratchet rules without increasing bundle boot cost or total debt score.

**Architecture:** Phase 1 adds `scripts/metrics/*` orchestrators and committed `baseline.json`. Phase 2 enforces domain import boundaries. Phase 3+ splits god-files via `*-core.mjs` extracts with behavior-preserving tests; lazy `import()` only after boundaries exist. Debt policy lives in `.cursor/rules/technical-debt-accounting.mdc`.

**Tech Stack:** Node 20+, ESLint 9 flat config, `eslint-plugin-sonarjs`, `jscpd`, `dependency-cruiser`, existing `esbuild` metafile (`public/js/app.bundle.meta.json`), `node --test`.

**Spec:** [`2026-06-02-modularization-metrics-design.md`](../specs/2026-06-02-modularization-metrics-design.md)

**Suggested branch:** `chore/modularization-metrics` (worktree recommended).

**Prior art:** [`2026-05-19-modular-app-refactor.md`](2026-05-19-modular-app-refactor.md) completed feature extraction; this plan adds **measurement + gates** so further splits do not repeat the perf regression.

---

## File map (Phase 1 — locked)

| File | Responsibility |
|------|----------------|
| `eslint.config.js` | Tier 1 complexity/length rules for `.mjs`/`.js` |
| `.dependency-cruiser.cjs` | Domain boundaries + boot-hub rules |
| `scripts/metrics/constants.mjs` | Budgets, weights (mirror debt rule) |
| `scripts/metrics/boot-graph.mjs` | Parse static imports from boot hubs → hash |
| `scripts/metrics/score.mjs` | Aggregate `totalScore` from tool outputs |
| `scripts/metrics/changed-files.mjs` | `git diff` → Tier 1 file list |
| `scripts/metrics/run.mjs` | Run tools, write `report.json` |
| `scripts/metrics/check.mjs` | Compare report vs baseline + changed files |
| `scripts/metrics/*.test.mjs` | Unit tests for score + boot-graph |
| `scripts/metrics/baseline.json` | Committed snapshot (populated Task 7) |
| `scripts/metrics/report.json` | Generated (gitignored) |
| `package.json` | `metrics`, `metrics:check`, `metrics:baseline` scripts + devDeps |

**Do not edit:** `public/js/app.bundle.mjs` (regenerate via `npm run build:ui`).

---

## Phase 1: Metrics pipeline

### Task 1: Dev dependencies and npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add devDependencies**

```json
"devDependencies": {
  "@eslint/js": "^9.39.1",
  "dependency-cruiser": "^16.10.4",
  "eslint": "^9.39.1",
  "eslint-plugin-sonarjs": "^3.0.5",
  "globals": "^16.2.0",
  "jscpd": "^4.0.5"
}
```

(Merge with existing `devDependencies`; keep current versions for esbuild/electron.)

- [ ] **Step 2: Add scripts**

```json
"metrics": "node scripts/metrics/run.mjs",
"metrics:check": "node scripts/metrics/check.mjs",
"metrics:baseline": "node scripts/metrics/run.mjs --write-baseline"
```

- [ ] **Step 3: Install**

Run: `npm install`

Expected: lockfile updated, binaries in `node_modules/.bin`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(metrics): add eslint, jscpd, dependency-cruiser devDeps"
```

---

### Task 2: ESLint flat config (Tier 1 budgets)

**Files:**
- Create: `eslint.config.js`

- [ ] **Step 1: Create config**

```javascript
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';

const tier1 = {
  files: ['public/js/**/*.mjs', 'public/js/**/*.js', 'lib/**/*.mjs', 'lib/**/*.js', 'lan-squad/**/*.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: { ...globals.browser, ...globals.node },
  },
  plugins: { sonarjs },
  rules: {
    ...js.configs.recommended.rules,
    'complexity': ['error', { max: 15 }],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    'sonarjs/cognitive-complexity': ['error', 20],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};

/** Boot hubs: complexity still measured; file-length enforced in score.mjs */
const bootHubs = {
  files: ['public/js/app.js', 'public/js/app-runtimes.mjs', 'public/js/app-shell.mjs'],
  rules: {
    'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
  },
};

export default [js.configs.recommended, tier1, bootHubs];
```

- [ ] **Step 2: Smoke ESLint (expect many errors on legacy — OK for now)**

Run: `npx eslint public/js/features/chrome.mjs`

Expected: PASS or only warn-level on a small file.

Run: `npx eslint public/js/features/lan-sync.mjs`

Expected: FAIL with complexity/max-lines (confirms rules fire).

- [ ] **Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "chore(metrics): eslint flat config with Tier 1 complexity budgets"
```

---

### Task 3: Boot graph parser + tests

**Files:**
- Create: `scripts/metrics/constants.mjs`
- Create: `scripts/metrics/boot-graph.mjs`
- Create: `scripts/metrics/boot-graph.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// scripts/metrics/boot-graph.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectBootStaticImports, hashBootGraph } from './boot-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('collectBootStaticImports finds app.js feature imports', () => {
  const imports = collectBootStaticImports(ROOT);
  assert.ok(imports.some((i) => i.from.includes('features/patients')));
  assert.ok(!imports.some((i) => i.isDynamic));
});

test('hashBootGraph is stable for same import set', () => {
  const a = collectBootStaticImports(ROOT);
  assert.equal(hashBootGraph(a), hashBootGraph(a));
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test scripts/metrics/boot-graph.test.mjs`

- [ ] **Step 3: Implement boot-graph.mjs**

```javascript
// scripts/metrics/constants.mjs
export const BOOT_HUBS = [
  'public/js/app.js',
  'public/js/app-runtimes.mjs',
  'public/js/app-shell.mjs',
];
export const BOOT_GRAPH_DEBT_PER_IMPORT = 25;
export const MAX_FILE_LINES = 600;

// scripts/metrics/boot-graph.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BOOT_HUBS } from './constants.mjs';

const STATIC_RE = /import\s+(?![.(])[\s\S]*?from\s+['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export function collectBootStaticImports(root) {
  const out = [];
  for (const rel of BOOT_HUBS) {
    const abs = path.join(root, rel);
    const src = fs.readFileSync(abs, 'utf8');
    let m;
    while ((m = STATIC_RE.exec(src))) {
      out.push({ hub: rel, from: m[1], isDynamic: false });
    }
    while ((m = DYNAMIC_RE.exec(src))) {
      out.push({ hub: rel, from: m[1], isDynamic: true });
    }
  }
  return out.sort((a, b) => a.hub.localeCompare(b.hub) || a.from.localeCompare(b.from));
}

export function hashBootGraph(imports) {
  const staticOnly = imports.filter((i) => !i.isDynamic).map((i) => `${i.hub}:${i.from}`);
  return crypto.createHash('sha256').update(staticOnly.join('\n')).digest('hex').slice(0, 16);
}

export function bootGraphDebtDelta(currentImports, baselineImports) {
  const key = (i) => `${i.hub}:${i.from}`;
  const base = new Set(baselineImports.filter((i) => !i.isDynamic).map(key));
  const cur = currentImports.filter((i) => !i.isDynamic);
  let added = 0;
  for (const i of cur) {
    if (!base.has(key(i))) added += 1;
  }
  return added * BOOT_GRAPH_DEBT_PER_IMPORT;
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add scripts/metrics/constants.mjs scripts/metrics/boot-graph.mjs scripts/metrics/boot-graph.test.mjs
git commit -m "chore(metrics): boot graph static import parser"
```

---

### Task 4: Debt score aggregator + tests

**Files:**
- Create: `scripts/metrics/score.mjs`
- Create: `scripts/metrics/score.test.mjs`

- [ ] **Step 1: Write failing tests**

```javascript
// scripts/metrics/score.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotalScore, fileLineOverageDebt } from './score.mjs';

test('fileLineOverageDebt charges over 600 lines', () => {
  assert.equal(fileLineOverageDebt(650), 2 * Math.ceil(50 / 10));
});

test('computeTotalScore sums components', () => {
  const total = computeTotalScore({
    complexityOverage: 10,
    lengthOverage: 4,
    duplicationDebt: 3,
    importSmellDebt: 0,
    bootGraphDebt: 25,
  });
  assert.equal(total, 42);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --test scripts/metrics/score.test.mjs`

- [ ] **Step 3: Implement score.mjs**

```javascript
import fs from 'node:fs';
import { MAX_FILE_LINES } from './constants.mjs';

export function fileLineOverageDebt(lineCount) {
  if (lineCount <= MAX_FILE_LINES) return 0;
  return 2 * Math.ceil((lineCount - MAX_FILE_LINES) / 10);
}

export function duplicationDebtFromJscpd(statistics) {
  const tokens = statistics?.total?.tokens || 0;
  return Math.ceil(tokens / 50);
}

export function computeTotalScore(parts) {
  return (
    (parts.complexityOverage || 0) +
    (parts.lengthOverage || 0) +
    (parts.duplicationDebt || 0) +
    (parts.importSmellDebt || 0) +
    (parts.bootGraphDebt || 0)
  );
}

/** ESLint JSON: count complexity and max-lines violations as debt */
export function eslintDebtFromResults(results) {
  let complexityOverage = 0;
  let lengthOverage = 0;
  for (const file of results) {
    const lines = fs.existsSync(file.filePath)
      ? fs.readFileSync(file.filePath, 'utf8').split('\n').length
      : 0;
    lengthOverage += fileLineOverageDebt(lines);
    for (const msg of file.messages) {
      if (msg.ruleId === 'complexity') complexityOverage += 10;
      if (msg.ruleId === 'max-lines-per-function') lengthOverage += 2 * Math.ceil((msg.message.match(/\d+/)?.[0] || 80) / 10);
    }
  }
  return { complexityOverage, lengthOverage };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add scripts/metrics/score.mjs scripts/metrics/score.test.mjs
git commit -m "chore(metrics): debt score aggregation helpers"
```

---

### Task 5: changed-files helper

**Files:**
- Create: `scripts/metrics/changed-files.mjs`
- Create: `scripts/metrics/changed-files.test.mjs`

- [ ] **Step 1: Test with mocked git output (or skip if no git in sandbox — use fixture)**

```javascript
// scripts/metrics/changed-files.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTier1Paths } from './changed-files.mjs';

test('filterTier1Paths keeps public/js and lib', () => {
  const paths = ['public/js/features/foo.mjs', 'README.md', 'lib/db/schema.mjs'];
  const out = filterTier1Paths(paths);
  assert.deepEqual(out.sort(), ['lib/db/schema.mjs', 'public/js/features/foo.mjs'].sort());
});
```

- [ ] **Step 2: Implement**

```javascript
// scripts/metrics/changed-files.mjs
import { execSync } from 'node:child_process';

const TIER1_RE = /^(public\/js\/|lib\/|lan-squad\/)/;

export function filterTier1Paths(paths) {
  return paths.filter((p) => TIER1_RE.test(p.replace(/\\/g, '/')));
}

export function gitChangedFiles(baseRef = 'HEAD') {
  try {
    const out = execSync(`git diff --name-only ${baseRef}`, { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function gitChangedFilesAgainst(base = 'main') {
  try {
    const out = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return gitChangedFiles('HEAD');
  }
}
```

- [ ] **Step 3: Run test — PASS**

- [ ] **Step 4: Commit**

---

### Task 6: `run.mjs` orchestrator

**Files:**
- Create: `scripts/metrics/run.mjs`
- Create: `scripts/metrics/run.test.mjs`

- [ ] **Step 1: Implement run.mjs** (calls eslint JSON, jscpd, dependency-cruiser, boot-graph, writes report)

```javascript
#!/usr/bin/env node
// scripts/metrics/run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { collectBootStaticImports, hashBootGraph, bootGraphDebtDelta } from './boot-graph.mjs';
import {
  computeTotalScore,
  eslintDebtFromResults,
  duplicationDebtFromJscpd,
} from './score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPORT = path.join(ROOT, 'scripts/metrics/report.json');
const BASELINE = path.join(ROOT, 'scripts/metrics/baseline.json');
const writeBaseline = process.argv.includes('--write-baseline');

function runEslintJson() {
  const cmd =
    'npx eslint public/js lib lan-squad --format json --max-warnings 99999 2>/dev/null || true';
  const raw = execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function runJscpdJson() {
  const outDir = path.join(ROOT, 'scripts/metrics/.jscpd-tmp');
  fs.mkdirSync(outDir, { recursive: true });
  execSync(
    'npx jscpd public/js lib --min-lines 8 --min-tokens 60 --reporters json --output ' +
      outDir,
    { cwd: ROOT, stdio: 'pipe' }
  );
  const reportPath = path.join(outDir, 'jscpd-report.json');
  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
}

function runDependencyCruiser() {
  try {
    execSync('npx depcruise public/js lib lan-squad --config .dependency-cruiser.cjs -T json -o scripts/metrics/.depcruise.json', {
      cwd: ROOT,
      stdio: 'pipe',
    });
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/metrics/.depcruise.json'), 'utf8'));
    const errors = (raw.summary?.error || 0) + (raw.summary?.warn || 0);
    return errors * 50;
  } catch {
    return 0;
  }
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return null;
  return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
}

function main() {
  const eslintResults = runEslintJson();
  const eslintDebt = eslintDebtFromResults(eslintResults);
  const jscpd = runJscpdJson();
  const duplicationDebt = duplicationDebtFromJscpd(jscpd);
  const importSmellDebt = runDependencyCruiser();
  const bootImports = collectBootStaticImports(ROOT);
  const bootGraphHash = hashBootGraph(bootImports);
  const baseline = loadBaseline();
  const bootGraphDebt = baseline?.bootGraph?.imports
    ? bootGraphDebtDelta(bootImports, baseline.bootGraph.imports)
    : 0;

  const parts = {
    ...eslintDebt,
    duplicationDebt,
    importSmellDebt,
    bootGraphDebt,
  };
  const totalScore = computeTotalScore(parts);

  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalScore,
    parts,
    bootGraph: { hash: bootGraphHash, imports: bootImports },
    eslint: { errorCount: eslintResults.reduce((n, f) => n + f.errorCount, 0) },
    jscpd: { duplicatedTokens: jscpd.statistics?.total?.tokens || 0 },
  };

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log('wrote', REPORT, 'totalScore=', totalScore);

  if (writeBaseline) {
    const next = {
      version: 1,
      updatedAt: report.generatedAt,
      totalScore,
      bootGraph: report.bootGraph,
      byFile: {},
      changelog: [
        ...(baseline?.changelog || []),
        { date: report.generatedAt.slice(0, 10), note: `Baseline refresh totalScore=${totalScore}` },
      ],
    };
    fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
    console.log('wrote', BASELINE);
  }
}

main();
```

- [ ] **Step 2: Add `.gitignore` entries**

```
scripts/metrics/.jscpd-tmp/
scripts/metrics/.depcruise.json
```

- [ ] **Step 3: Run metrics (may take ~1–2 min)**

Run: `npm run metrics`

Expected: `scripts/metrics/report.json` with numeric `totalScore`.

- [ ] **Step 4: Commit run.mjs + gitignore**

---

### Task 7: dependency-cruiser config (minimal v1)

**Files:**
- Create: `.dependency-cruiser.cjs`

- [ ] **Step 1: Create rules** (no cycles; boot hubs must not import feature internals deeply — start warn-only)

```javascript
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'settings-not-to-patients',
      severity: 'error',
      comment: 'settings domain must not import patients list',
      from: { path: '^public/js/features/settings-help' },
      to: { path: '^public/js/features/patients' },
    },
    {
      name: 'labs-not-to-lan-sync',
      severity: 'error',
      from: { path: '^public/js/features/(lab-|tendencias)' },
      to: { path: '^public/js/features/lan-sync' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
  },
};
```

- [ ] **Step 2: Run depcruise**

Run: `npx depcruise public/js --config .dependency-cruiser.cjs`

Fix any **accidental** false positives by narrowing `from`/`to` paths; document intentional exceptions in spec appendix if needed.

- [ ] **Step 3: Commit**

---

### Task 8: `check.mjs` + wire prebuild

**Files:**
- Create: `scripts/metrics/check.mjs`
- Create: `scripts/metrics/check.test.mjs`
- Modify: `package.json` (`prebuild:mac` append `&& npm run metrics:check` only after Task 9 baseline exists)

- [ ] **Step 1: Implement check.mjs**

```javascript
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { filterTier1Paths, gitChangedFilesAgainst } from './changed-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPORT = path.join(ROOT, 'scripts/metrics/report.json');
const BASELINE = path.join(ROOT, 'scripts/metrics/baseline.json');

execSync('node scripts/metrics/run.mjs', { cwd: ROOT, stdio: 'inherit' });

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

let failed = false;
if (report.totalScore > baseline.totalScore + 1) {
  console.error(
    `DEBT REGRESSION: report ${report.totalScore} > baseline ${baseline.totalScore}`
  );
  failed = true;
}

const changed = filterTier1Paths(gitChangedFilesAgainst('main'));
if (changed.length) {
  const eslintOut = execSync(
    `npx eslint ${changed.join(' ')} --max-warnings 0`,
    { cwd: ROOT, encoding: 'utf8' }
  );
  console.log(eslintOut);
} else {
  console.log('metrics:check — no Tier 1 changed files, skipping ratchet eslint');
}

if (failed) process.exit(1);
console.log('metrics:check OK');
```

- [ ] **Step 2: Test check logic with fixture baseline/report in `check.test.mjs`**

- [ ] **Step 3: First baseline refresh**

Run: `npm run metrics:baseline`

Commit updated `scripts/metrics/baseline.json` with real `totalScore` and `bootGraph`.

```bash
git add scripts/metrics/baseline.json scripts/metrics/check.mjs scripts/metrics/check.test.mjs .dependency-cruiser.cjs
git commit -m "chore(metrics): baseline snapshot and metrics:check gate"
```

- [ ] **Step 4: Add metrics tests to npm test** (optional slice)

Append to `package.json` test script: `scripts/metrics/boot-graph.test.mjs scripts/metrics/score.test.mjs scripts/metrics/changed-files.test.mjs scripts/metrics/check.test.mjs`

- [ ] **Step 5: Update `project-context.mdc` changelog**

```markdown
- **2026-06-02** `metrics`: debt score pipeline, eslint/jscpd/depcruise; `scripts/metrics/`, `.cursor/rules/technical-debt-accounting.mdc`.
```

---

## Phase 2: God-file burn-down — `lan-sync` (part 1)

**Goal:** Extract conflict-resolution UI/logic without new boot imports. Target: reduce `lan-sync.mjs` by ≥25%, `metrics:check` green.

### Task 9: `lan-sync/conflicts-core.mjs` (pure logic)

**Files:**
- Create: `public/js/features/lan-sync/conflicts-core.mjs`
- Create: `public/js/features/lan-sync/conflicts-core.test.mjs`
- Modify: `public/js/features/lan-sync.mjs` (import core, delete duplicated helpers)

- [ ] **Step 1: Identify clone** — run `npx jscpd public/js/features/lan-sync.mjs --min-lines 8` and pick top duplicated block related to conflict labels / merge decisions.

- [ ] **Step 2: Write failing tests** for extracted pure functions, e.g. `formatConflictSummary(entry)`, `pickDefaultMergeSide(local, remote)`.

- [ ] **Step 3: Extract to `conflicts-core.mjs`** — no `window`, no `document`, no `fetch`.

- [ ] **Step 4: Replace inline code in `lan-sync.mjs`** with imports from `./lan-sync/conflicts-core.mjs`.

- [ ] **Step 5: Run tests**

Run: `node --test public/js/features/lan-sync/conflicts-core.test.mjs public/js/features/lan-sync-clinical-ops.test.mjs`

Run: `npm run metrics:check`

Expected: PASS; `totalScore` ≤ baseline.

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(lan): extract conflict helpers to lan-sync/conflicts-core"
```

---

### Task 10: `lan-sync/connection-ui.mjs` (DOM wiring)

**Files:**
- Create: `public/js/features/lan-sync/connection-ui.mjs`
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Move connection dropdown open/close/wire handlers** (~200–400 lines) into `connection-ui.mjs` exporting `wireLanConnectionUi(deps)`.

- [ ] **Step 2: `lan-sync.mjs` re-exports** `registerLanRuntime` / `windowHandlers` only — no new exports to `app-runtimes`.

- [ ] **Step 3: Smoke manual** — LAN connect dropdown, join link, guardia hub visible.

- [ ] **Step 4: `npm test` + `npm run metrics:check`**

- [ ] **Step 5: Commit**

---

### Task 11: Document lazy boundary (no code until part 2)

**Files:**
- Modify: `docs/superpowers/specs/2026-06-02-modularization-metrics-design.md` (append note: HC LAN sync stays dynamic)

- [ ] **Step 1:** Confirm `historia-clinica-lan-sync` remains `import()` from `lan-sync.mjs` — do not add static import in boot hubs.

---

## Phase 3: `settings-help` split (outline)

Execute as **separate PR series** after Phase 2; same ratchet rules.

| Task | Extract | Target file |
|------|---------|-------------|
| 12 | Guided tour steps | `settings-help/tour.mjs` |
| 13 | Release notes modal | `settings-help/release-notes.mjs` |
| 14 | Help / quick help | `settings-help/quick-help.mjs` |
| 15 | Thin shell | `settings-help.mjs` ≤ 600 lines, re-export `windowHandlers` |

Each task: tests for pure formatters; `metrics:check`; no new `app-runtimes` imports.

---

## Phase 4: Lazy-load pilot (entrega modal)

### Task 16: Dynamic import entrega modal

**Files:**
- Modify: `public/js/features/clinical-entrega.mjs`
- Modify: `public/js/app-shell.mjs` (if static import exists — replace with dynamic)

- [ ] **Step 1: Find static import chain** to `entrega-modal-ui.mjs` from boot hubs.

- [ ] **Step 2: Replace with cached dynamic import**

```javascript
let _entregaModalUi;
function loadEntregaModalUi() {
  if (!_entregaModalUi) {
    _entregaModalUi = import('./entrega-modal-ui.mjs');
  }
  return _entregaModalUi;
}
```

- [ ] **Step 3: Compare esbuild metafile output size** — `npm run build:ui` then compare `public/js/app.bundle.meta.json` inputs count for entrega path.

- [ ] **Step 4: `metrics:check`** — boot graph hash may change; if score improves or neutral, refresh baseline only if user approves.

- [ ] **Step 5: Manual smoke** — open Modo entrega modal, complete pendiente.

---

## Verification matrix

| Command | When |
|---------|------|
| `npm run metrics` | Local diagnostics |
| `npm run metrics:check` | Every PR touching Tier 1 |
| `npm test` | Every task |
| `npm run build:ui:check` | Before release |
| Manual: patient switch + LAN connect | After lan-sync tasks |

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| ESLint complexity | 2, 6, 8 |
| jscpd duplication debt | 6 |
| dependency-cruiser domains | 7, 10+ |
| Debt score + baseline | 4, 6, 8 |
| Boot graph hash | 3, 6, 8 |
| Ratchet on changed files | 5, 8 |
| God-file lan-sync order | 9–11 |
| settings-help order | 12–15 |
| Lazy entrega | 16 |
| Perf: no boot regression | 8, 9–11, 16 |
| CI prebuild | 8 (after baseline) |

**Deferred (spec “future”):** Electron-less `registerAllFeatureRuntimes` timer; esbuild `splitting: true` until lazy pilots prove stable.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-06-02-modularization-metrics.md`.

**Two execution options:**

1. **Subagent-driven (recommended)** — one fresh subagent per task, review between tasks, fast iteration.

2. **Inline execution** — run tasks in this session with checkpoints after Phase 1 and after each lan-sync task.

Which approach do you want?

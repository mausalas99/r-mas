#!/usr/bin/env node
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
import { measureTrackedSize } from './tracked-size.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const REPORT = path.join(ROOT, 'scripts/metrics/report.json');
const BASELINE = path.join(ROOT, 'scripts/metrics/baseline.json');
const writeBaseline = process.argv.includes('--write-baseline');

function runEslintJson() {
  try {
    const raw = execSync(
      'npx eslint public/js lib --format json --max-warnings 99999',
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
    return JSON.parse(raw);
  } catch (err) {
    const stdout = err.stdout?.toString?.() || '';
    if (stdout.trim().startsWith('[')) {
      try {
        return JSON.parse(stdout);
      } catch {
        return [];
      }
    }
    return [];
  }
}

function runJscpdJson() {
  const outDir = path.join(ROOT, 'scripts/metrics/.jscpd-tmp');
  fs.mkdirSync(outDir, { recursive: true });
  try {
    execSync(
      [
        'npx jscpd public/js lib',
        '--min-lines 8',
        '--min-tokens 60',
        '--reporters json',
        `--output ${outDir}`,
        '--ignore',
        '**/public/js/chunks/**,**/public/js/app.bundle.*',
      ].join(' '),
      { cwd: ROOT, stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch {
    // jscpd exits non-zero when clones found
  }
  const reportPath = path.join(outDir, 'jscpd-report.json');
  if (!fs.existsSync(reportPath)) {
    return { statistics: { total: { tokens: 0 } } };
  }
  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return null;
  return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
}

function main() {
  const eslintResults = runEslintJson();
  const eslintDebt = eslintDebtFromResults(eslintResults);
  const jscpd = runJscpdJson();
  // duplicationDebtFromJscpd was fixed 2026-09-21 (it read the wrong jscpd
  // field and always scored 0 — see MISTAKES.md). Folded into the gate the
  // same day, after the owner's real cross-file cleanup pass
  // (#shrink-core-dedupe): 92 genuine prod<->prod clusters found via Jev, 1
  // fixed and tested, owner+Jev call was to gate at that reduced number
  // rather than chase the rest (same-file + test<->test duplication
  // dominate the remaining score and are out of this ratchet's scope).
  const duplicationDebt = duplicationDebtFromJscpd(jscpd.statistics);
  const bootImports = collectBootStaticImports(ROOT);
  const bootGraphHash = hashBootGraph(bootImports);
  const baseline = loadBaseline();
  const bootGraphDebt = baseline?.bootGraph?.imports
    ? bootGraphDebtDelta(bootImports, baseline.bootGraph.imports)
    : 0;

  const parts = {
    ...eslintDebt,
    bootGraphDebt,
    duplicationDebt,
  };
  const totalScore = computeTotalScore(parts);
  const size = measureTrackedSize(ROOT);

  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalScore,
    trackedLoc: size.trackedLoc,
    moduleCount: size.moduleCount,
    // Reported only. check.mjs never compares it, so documentation growth is
    // visible without being able to turn CI red on a required handoff entry.
    docs: { loc: size.docsLoc, fileCount: size.docsFileCount },
    parts,
    // Gated via parts.duplicationDebt above; kept here too for the raw jscpd numbers.
    duplication: {
      clones: jscpd.statistics?.total?.clones || 0,
      duplicatedLines: jscpd.statistics?.total?.duplicatedLines || 0,
      duplicatedTokens: jscpd.statistics?.total?.duplicatedTokens || 0,
      debtIfGated: duplicationDebt,
    },
    bootGraph: { hash: bootGraphHash, imports: bootImports },
    eslint: { errorCount: eslintResults.reduce((n, f) => n + (f.errorCount || 0), 0) },
    jscpd: { duplicatedTokens: jscpd.statistics?.total?.duplicatedTokens || 0 },
  };

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log('wrote', REPORT, 'totalScore=', totalScore);
  console.log(`docs (not gated): ${size.docsLoc} lines in ${size.docsFileCount} files`);

  if (writeBaseline) {
    const next = {
      version: 1,
      updatedAt: report.generatedAt,
      totalScore,
      // Rounded up: baseline.json is itself a tracked file, so writing this
      // number into it shifts the file's own line count by a few lines —
      // an exact measurement here would fail the very check() run right after.
      trackedLoc:
        baseline?.trackedLoc != null && baseline.trackedLoc >= size.trackedLoc
          ? baseline.trackedLoc
          : Math.ceil(size.trackedLoc / 100) * 100 + 100,
      moduleCount: size.moduleCount,
      bootGraphHash: bootGraphHash,
      bootGraph: report.bootGraph,
      byFile: {},
      changelog: [
        ...(baseline?.changelog || []).slice(-19),
        { date: report.generatedAt.slice(0, 10), note: `Baseline refresh totalScore=${totalScore}` },
      ],
    };
    fs.writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
    console.log('wrote', BASELINE);
  }
}

main();

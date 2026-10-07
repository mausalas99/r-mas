#!/usr/bin/env node
/**
 * Lists the files a companion app (packages/hf, packages/neumo) keeps as its
 * OWN copy of a core file -- same path as core, not in its
 * vendor-core-manifest.json, content different -- with the number of core
 * commits that touched each one since --since. Vendored files always match
 * core; own copies are where core fixes silently go missing (2026-10-07: HF
 * and Neumo had none of the 8.4.2-8.4.9 Nube sync fixes).
 *
 *   node scripts/core-drift-report.mjs packages/neumo [--since 2026-09-19] [--fail]
 *
 * --fail exits 1 when any own copy has a core commit it may lack.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(new URL('.', import.meta.url).pathname, '../../..');
const CORE = path.join(REPO, 'packages/core');
const SCAN = ['lib', 'public/js', 'public/styles', 'cloud', 'main.js', 'preload.js'];
const SKIP = /node_modules|\/dist\/|\/chunks\/|\.map$|\.bundle\.|sync-pages\/public/;

export function ownDivergedFiles(pkgDir) {
  const manifest = new Set(JSON.parse(fs.readFileSync(path.join(pkgDir, 'scripts/vendor-core-manifest.json'), 'utf8')));
  const out = [];
  const visit = (rel) => {
    const abs = path.join(pkgDir, rel);
    if (SKIP.test(rel) || !fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const name of fs.readdirSync(abs)) visit(path.join(rel, name));
      return;
    }
    const core = path.join(CORE, rel);
    if (manifest.has(rel) || !fs.existsSync(core)) return;
    if (!fs.readFileSync(abs).equals(fs.readFileSync(core))) out.push(rel);
  };
  for (const rel of SCAN) visit(rel);
  return out.sort();
}

function coreCommitsSince(rel, since) {
  const log = execFileSync('git', ['log', `--since=${since}`, '--format=%h %s', '--', `packages/core/${rel}`], {
    cwd: REPO,
    encoding: 'utf8',
  });
  return log.split('\n').filter(Boolean);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const pkgDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? '');
  const sinceAt = args.indexOf('--since');
  const since = sinceAt >= 0 ? args[sinceAt + 1] : '2026-09-19';
  if (!fs.existsSync(path.join(pkgDir, 'scripts/vendor-core-manifest.json'))) {
    console.error('Uso: node scripts/core-drift-report.mjs packages/<app> [--since AAAA-MM-DD] [--fail]');
    process.exit(2);
  }
  const rows = ownDivergedFiles(pkgDir)
    .map((rel) => ({ rel, commits: coreCommitsSince(rel, since) }))
    .filter((r) => r.commits.length)
    .sort((a, b) => b.commits.length - a.commits.length);
  for (const { rel, commits } of rows) {
    console.log(`${String(commits.length).padStart(3)}  ${rel}`);
    for (const c of commits.slice(0, 3)) console.log(`       ${c}`);
  }
  console.log(`\n${rows.length} copia(s) propia(s) con cambios de core desde ${since}.`);
  if (args.includes('--fail') && rows.length) process.exit(1);
}

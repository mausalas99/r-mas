#!/usr/bin/env node
/**
 * CI gate: rules that are written twice (renderer vs lib/db vs the Nube Worker) must agree.
 *
 * Each pair below is a hand-kept copy. When one side changes and the other doesn't, the app
 * and the Worker (or the UI and the DB) quietly disagree — e.g. the Worker's monitoreo merge
 * knowing only 12 of the client's 17 med fields. Constants are read as text, so no module is
 * loaded (renderer files expect a browser).
 *
 * KNOWN_DRIFT lists differences that exist today and are tracked as open questions
 * (docs/wiki/13-open-questions-and-doc-drift.md). New drift fails; fixed drift that is still
 * listed also fails, so the list only shrinks.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @type {Record<string, { onlyLeft?: string[], onlyRight?: string[], note: string }>} */
export const KNOWN_DRIFT = {
  'monitoreo MED_FIELD_KEYS': {
    onlyLeft: ['vasop', 'anticoagulacion', 'antiarritmicos', 'estatinas', 'nm'],
    note: 'Worker merge lacks 5 med fields — open question A11',
  },
};

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(CORE, rel), 'utf8');
}

/** @param {string} src */
export function stripComments(src) {
  return String(src || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

/**
 * Text from the first `open` after `start` to its matching `close`.
 * @param {string} src @param {number} start @param {string} open @param {string} close
 */
function balanced(src, start, open, close) {
  const i = src.indexOf(open, start);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === open) depth += 1;
    else if (src[j] === close) {
      depth -= 1;
      if (depth === 0) return src.slice(i, j + 1);
    }
  }
  return null;
}

/** @param {string} src @param {string} name */
export function stringArray(src, name) {
  const body = stripComments(src);
  const at = body.search(new RegExp(`\\b${name}\\s*=`));
  if (at < 0) throw new Error(`${name} not found`);
  const arr = balanced(body, at, '[', ']');
  if (!arr) throw new Error(`${name}: no array literal`);
  return [...arr.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** @param {string} src @param {string} name */
export function objectValues(src, name) {
  const body = stripComments(src);
  const at = body.search(new RegExp(`\\b${name}\\s*=`));
  if (at < 0) throw new Error(`${name} not found`);
  const obj = balanced(body, at, '{', '}');
  if (!obj) throw new Error(`${name}: no object literal`);
  return [...obj.matchAll(/:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** @param {string} src @returns {Map<string, string>} exported function name → normalized body */
export function exportedFunctions(src) {
  const body = stripComments(src);
  const out = new Map();
  for (const m of body.matchAll(/export\s+function\s+(\w+)\s*\(/g)) {
    const fn = balanced(body, m.index, '{', '}');
    if (fn) out.set(m[1], fn.replace(/\s+/g, ' ').trim());
  }
  return out;
}

/**
 * @param {string} label @param {string[]} left @param {string[]} right
 * @returns {string[]} problems
 */
export function compareSets(label, left, right) {
  const L = new Set(left);
  const R = new Set(right);
  const onlyLeft = [...L].filter((x) => !R.has(x)).sort();
  const onlyRight = [...R].filter((x) => !L.has(x)).sort();
  const known = KNOWN_DRIFT[label] || {};
  const expL = [...(known.onlyLeft || [])].sort();
  const expR = [...(known.onlyRight || [])].sort();
  const problems = [];
  const newL = onlyLeft.filter((x) => !expL.includes(x));
  const newR = onlyRight.filter((x) => !expR.includes(x));
  if (newL.length) problems.push(`${label}: only on the left: ${newL.join(', ')}`);
  if (newR.length) problems.push(`${label}: only on the right: ${newR.join(', ')}`);
  const fixedL = expL.filter((x) => !onlyLeft.includes(x));
  const fixedR = expR.filter((x) => !onlyRight.includes(x));
  if (fixedL.length || fixedR.length) {
    problems.push(`${label}: KNOWN_DRIFT lists ${[...fixedL, ...fixedR].join(', ')} but it no longer drifts — remove it from scripts/ci/mirror-drift.mjs`);
  }
  return problems;
}

/** @returns {{ name: string, left: string, right: string, problems: string[] }[]} */
export function runChecks() {
  const results = [];
  const check = (name, left, right, fn) => {
    let problems;
    try {
      problems = fn();
    } catch (err) {
      problems = [`${name}: could not read (${err.message}) — did a constant move or get renamed?`];
    }
    results.push({ name, left, right, problems });
  };

  check('sala allowlist (app vs Worker)',
    'public/js/features/cloud-sync/sala-allowlist.mjs', 'cloud/sync-worker/src/sala-allowlist.js',
    () => compareSets('sala allowlist (app vs Worker)',
      stringArray(read('public/js/features/cloud-sync/sala-allowlist.mjs'), 'CLOUD_SALAS'),
      stringArray(read('cloud/sync-worker/src/sala-allowlist.js'), 'CLOUD_SALAS')));

  check('Nube salas are clinical salas',
    'cloud/sync-worker/src/sala-allowlist.js', 'lib/clinical-salas.mjs',
    () => {
      const known = new Set(stringArray(read('lib/clinical-salas.mjs'), 'CLINICAL_SALA_VALUES'));
      const missing = stringArray(read('cloud/sync-worker/src/sala-allowlist.js'), 'CLOUD_SALAS').filter((s) => !known.has(s));
      return missing.length ? [`Nube allows salas that lib/clinical-salas.mjs (and the DB CHECK) does not: ${missing.join(', ')}`] : [];
    });

  check('monitoreo MED_FIELD_KEYS',
    'public/js/features/estado-actual-data-constants.mjs', 'cloud/sync-worker/src/monitoreo-lww.js',
    () => compareSets('monitoreo MED_FIELD_KEYS',
      stringArray(read('public/js/features/estado-actual-data-constants.mjs'), 'MED_FIELD_KEYS'),
      stringArray(read('cloud/sync-worker/src/monitoreo-lww.js'), 'MED_FIELD_KEYS')));

  for (const name of ['EC_SCALAR_KEYS', 'DIET_KEYS']) {
    check(`monitoreo ${name}`,
      'public/js/features/estado-actual-data-merge.mjs', 'cloud/sync-worker/src/monitoreo-lww.js',
      () => compareSets(`monitoreo ${name}`,
        stringArray(read('public/js/features/estado-actual-data-merge.mjs'), name),
        stringArray(read('cloud/sync-worker/src/monitoreo-lww.js'), name)));
  }

  check('clinical blob keys (renderer vs DB)',
    'public/js/db-storage-bridge.mjs', 'lib/db/clinical-blob-keys.mjs',
    () => compareSets('clinical blob keys (renderer vs DB)',
      objectValues(read('public/js/db-storage-bridge.mjs'), 'APP_FIELD_TO_BLOB'),
      objectValues(read('lib/db/clinical-blob-keys.mjs'), 'LS_KEY_TO_BLOB')));

  check('username rules (renderer copy)',
    'lib/db/clinical-username.mjs', 'public/js/clinical-username.mjs',
    () => {
      const a = stripComments(read('lib/db/clinical-username.mjs')).replace(/\s+/g, ' ').trim();
      const b = stripComments(read('public/js/clinical-username.mjs')).replace(/\s+/g, ' ').trim();
      return a === b ? [] : ['the two files differ (comments ignored) — apply the same change to both'];
    });

  check('privilege rules (renderer mirror)',
    'lib/db/clinical-privileges.mjs', 'public/js/clinical-privileges.mjs',
    () => {
      const a = exportedFunctions(read('lib/db/clinical-privileges.mjs'));
      const b = exportedFunctions(read('public/js/clinical-privileges.mjs'));
      const shared = [...a.keys()].filter((k) => b.has(k));
      if (!shared.length) return ['no shared exported functions found — has the mirror been renamed?'];
      return shared.filter((k) => a.get(k) !== b.get(k)).map((k) => `${k}() differs between the two files`);
    });

  return results;
}

function main() {
  const results = runChecks();
  let failed = 0;
  for (const r of results) {
    if (!r.problems.length) {
      console.log(`ok   ${r.name}`);
      continue;
    }
    failed += 1;
    console.error(`FAIL ${r.name}\n     ${r.left}\n  vs ${r.right}`);
    for (const p of r.problems) console.error(`     - ${p}`);
  }
  const known = Object.entries(KNOWN_DRIFT);
  if (known.length) {
    console.log(`\nKnown drift still open (${known.length}):`);
    for (const [k, v] of known) console.log(`  - ${k}: ${v.note}`);
  }
  if (failed) {
    console.error(`\nmirror-drift: ${failed} check(s) failed. These files are hand-kept copies; change both sides together.`);
    process.exit(1);
  }
  console.log(`\nmirror-drift: ${results.length} checks passed.`);
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) main();

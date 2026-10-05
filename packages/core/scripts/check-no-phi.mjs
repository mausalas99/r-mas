#!/usr/bin/env node
/**
 * Pre-commit guard: refuse a commit whose ADDED lines carry hospital
 * identifiers or likely real patient data. Only staged, added lines are read,
 * so removing old mentions always passes. Text files only (git prints no
 * lines for binary files such as .docx).
 *
 * Hospital terms come from the 2026-09-26 r-mas repo scrub: UANL, Hospital
 * Universitario, the hospital street address, «receta HU», and a bare «HU».
 * «Torre HU» stays allowed: it is a ward name in the data rules.
 *
 * A synthetic fixture line that must match can carry the marker
 * `phi-scan: synthetic` on the same line. The .docx templates' golden text
 * (scripts/golden/corpus/docs) is exempt from the hospital rules only: it is
 * the hospital's own format. Patient-data rules still apply there.
 * Mac parity fixtures (mac/Tests/RPlusCoreTests/Fixtures/) are synthetic and exempt from all rules.
 *
 * Usage: node scripts/check-no-phi.mjs            (reads the staged diff)
 *        node scripts/check-no-phi.mjs --diff F   (reads a diff file, for tests)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';

const RULES = [
  ['hospital: UANL', /\bUANL\b/i],
  ['hospital: Hospital Universitario', /hospital\s*universitario/i],
  ['hospital: street address', /gonzalitos|mitras\s+centro/i],
  ['hospital: receta HU', /\breceta\s+(m[eé]dica\s+)?HU\b/i],
  ['hospital: bare HU', /(?<!Torre\s)\bHU\b/],
  ['PHI: NHC number', /\bNHC[:\s]*\d/i],
  ['PHI: expediente number', /\bexpediente\s*(no\.?|n[uú]mero|#)?[:\s]*\d/i],
  ['PHI: birth date', /\bfecha de nacimiento[:\s]*\d/i],
  ['PHI: CURP', /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d\b/],
];
const SELF = /scripts\/check-no-phi(\.test)?\.mjs$/; // these two list the terms on purpose
// Text of the .docx templates (golden output): they carry the hospital's own
// letterhead on purpose, since notes and indicaciones use the hospital's format.
const TEMPLATE_TEXT = /scripts\/golden\/corpus\/docs\/[^/]+\.golden\.txt$/;
// Mac (Swift) parity fixtures: made by Node from synthetic data. They carry the template
// letterhead and fake expediente numbers on purpose, and Swift must match them byte for byte.
const MAC_FIXTURES = /^mac\/Tests\/RPlusCoreTests\/Fixtures\//;
const ALLOW = 'phi-scan: synthetic';

/** @param {string} diff unified diff with -U0 @returns {string[]} */
export function findHits(diff) {
  const hits = [];
  let file = '';
  let line = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw.slice(4).replace(/^b\//, '');
      continue;
    }
    const hunk = /^@@ -\S+ \+(\d+)/.exec(raw);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (!raw.startsWith('+')) continue;
    const text = raw.slice(1);
    if (!SELF.test(file) && !MAC_FIXTURES.test(file) && !text.includes(ALLOW)) {
      const templateText = TEMPLATE_TEXT.test(file);
      for (const [label, re] of RULES) {
        if (templateText && label.startsWith('hospital:')) continue;
        if (re.test(text)) hits.push(`${file}:${line}  ${label}  «${text.trim().slice(0, 100)}»`);
      }
    }
    line += 1;
  }
  return hits;
}

function main() {
  const i = process.argv.indexOf('--diff');
  const diff =
    i > 0
      ? fs.readFileSync(process.argv[i + 1], 'utf8')
      : execFileSync('git', ['diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR'], {
          encoding: 'utf8',
          maxBuffer: 256 * 1024 * 1024,
        });
  const hits = findHits(diff);
  if (!hits.length) return;
  console.error('check-no-phi: this commit adds hospital or patient data:');
  for (const h of hits) console.error('  ' + h);
  console.error(`Remove it, or mark a synthetic fixture line with «${ALLOW}».`);
  process.exit(1);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname)) main();

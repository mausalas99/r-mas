#!/usr/bin/env node
// Spacing ratchet: stops hardcoded padding/margin px values from growing.
//
// Scope: this does NOT convert existing hardcoded padding/margin values to
// tokens (that needs a visual-diff harness first, out of scope for now).
// It only counts them and fails the build if the count goes UP, so new CSS
// is forced to use spacing tokens from public/tokens.css instead of adding
// more hardcoded px values.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STYLES_DIR = path.join(__dirname, '..', 'public', 'styles');

// Baseline measured on 2026-08-22, after the border-radius token swap pass
// (that pass did not touch padding/margin, so this number matches pre-swap).
// Raised to 1537 for 8.2.2: interconsulta team board's compact toolbar/chip
// (.ic-board-bucket .patient-card-toolbar/.patient-toolbar-chip, pase-board.css)
// needs 1-2px spacing tighter than any existing rem-scale token covers — no
// spacing token exists in tokens.css to express this yet.
const BASELINE = 1537;

const SPACING_DECL_RE = /\b(padding|margin)(-top|-right|-bottom|-left)?\s*:\s*[^;]*?\d+px[^;]*;/g;

function countHardcodedSpacing(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.css') && f !== 'app.bundle.css');

  let total = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const matches = content.match(SPACING_DECL_RE);
    if (matches) total += matches.length;
  }
  return total;
}

const count = countHardcodedSpacing(STYLES_DIR);

if (count > BASELINE) {
  console.error(
    `spacing ratchet: FAIL — hardcoded padding/margin px count is ${count}, ` +
      `baseline is ${BASELINE}. spacing debt grew, use existing spacing tokens for new CSS.`
  );
  process.exit(1);
}

console.log(
  `spacing ratchet: OK — hardcoded padding/margin px count is ${count} (baseline ${BASELINE}).`
);
process.exit(0);

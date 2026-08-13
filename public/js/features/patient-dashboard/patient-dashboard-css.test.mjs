import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function readDashboardCss() {
  return readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../../styles/patient-dashboard.css'),
    'utf8'
  );
}

test('EA KPIs are a 2x2 grid, not 3+1', () => {
  const css = readDashboardCss();
  assert.match(css, /\.ea-kpis\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/s);
  assert.equal(/grid-template-columns:\s*1fr\s+1fr\s+1fr/.test(css) && css.includes('.ea-kpis'), false);
});

test('wide lab draws take a full row', () => {
  const css = readDashboardCss();
  assert.match(css, /\.draw\.is-wide\s*\{[^}]*(?:flex:\s*1\s+1\s+100%|flex-basis:\s*100%)/s);
});
test('rest bento cards are flex columns without .clickable', () => {
  const css = readDashboardCss();
  assert.match(
    css,
    /\.bento\.rest\s*>\s*\.card\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column/s
  );
});

test('clickable cards, draws, links, and buttons have focus-visible rings', () => {
  const css = readDashboardCss();
  assert.match(css, /\.card\.clickable:focus-visible/);
  assert.match(css, /\.draw:focus-visible/);
  assert.match(css, /\.link:focus-visible/);
  assert.match(css, /\.btn-sec:focus-visible/);
  assert.match(css, /outline:\s*2px\s+solid\s+var\(--color-focus-ring\)/);
  assert.match(css, /outline-offset:\s*2px/);
});

test('dark mode IC chips invert lightness', () => {
  const css = readDashboardCss();
  assert.match(css, /html\.dark\s+\.patient-dash\s+\.svc\s*\{[^}]*oklch\(\s*0\.3/s);
  assert.match(css, /html\.dark\s+\.patient-dash\s+\.svc\s*\{[^}]*oklch\(\s*0\.8/s);
});

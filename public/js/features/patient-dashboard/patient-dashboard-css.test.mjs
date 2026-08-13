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
    /\.bento\.rest\s*>\s*\.card[^}]*display:\s*flex;[^}]*flex-direction:\s*column/s
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

test('IC catalog is a compact overlay, not a full-height pane', () => {
  const css = readDashboardCss();
  assert.match(css, /#patient-ic-scrim\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /#patient-ic-panel\.patient-dash-ic-modal\s*\{[^}]*width:\s*min\(420px/s);
  assert.match(css, /#patient-ic-panel\.patient-dash(?:-ic-modal)?\s*,?[^}]*height:\s*auto/s);
  assert.equal(/#patient-ic-panel[^}]*height:\s*100%/.test(css), false);
});

function readLabInnerCss() {
  return readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../../styles/lab-inner.css'),
    'utf8'
  );
}

test('SOAP meds are a left-aligned zoned list, not centered pills', () => {
  const css = readDashboardCss();
  assert.match(css, /\.soap-pack\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.soap-pack \.med\s*\{[^}]*justify-content:\s*space-between/s);
  assert.equal(/border-radius:\s*999px/.test(css) && css.includes('.soap-pack .med'), false);
  assert.equal(/\.ea-cat\s*\{[^}]*border-left/s.test(css), false);
});

test('dashboard cards have no box outline', () => {
  const css = readDashboardCss();
  assert.match(css, /\.patient-dash \.card[^}]*border:\s*0/s);
  assert.equal(/\.labs-card\s*\{[^}]*border-top:\s*3px/s.test(css), false);
  assert.equal(/\.bento\.rest\s*>\s*\.card[^}]*border-top:\s*3px/s.test(css), false);
  assert.equal(/--spine-h/.test(css), false);
});

test('lab paste disclosure is a solid rail, not a dashed or native marker line', () => {
  const css = readLabInnerCss();
  assert.match(css, /\.lab-paste-details\s*\{[^}]*border-top:\s*1px\s+solid/s);
  assert.equal(/lab-paste-details[^}]*dashed/.test(css), false);
  assert.match(css, /summary::-webkit-details-marker/);
});

test('lab inner nav uses the same pill chrome as Paciente Resumen | Clínico | Salida', () => {
  const css = readLabInnerCss();
  assert.match(css, /\.lab-active-shell\s*\{[^}]*border-radius:\s*var\(--radius-lg\)/s);
  assert.match(css, /\.lab-inner-nav\.inner-tab-bar\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.lab-inner-nav \.inner-tab\s*\{[^}]*border-radius:\s*var\(--radius-pill\)/s);
  assert.match(css, /\.lab-inner-nav \.inner-tab\.active[^{]*\{[^}]*background:\s*color-mix\(in oklab,\s*var\(--action\) 14%/s);
  assert.equal(/border-bottom-color:\s*var\(--color-accent\)/.test(css), false);
});

test('dash-name stays compact, not a display heading', () => {
  const css = readDashboardCss();
  assert.match(css, /\.dash-name\s*\{[^}]*font:\s*600\s+0\.86em/s);
  assert.equal(/\.dash-name\s*\{[^}]*1\.32em/s.test(css), false);
});

test('medicamentos band fills leftover height; list does not scroll or shrink type', () => {
  const css = readDashboardCss();
  assert.match(css, /\.bento\.meds-band\s*\{[^}]*flex:\s*1\s+1\s+0/s);
  assert.match(css, /\.bento\.meds-band\s*\{[^}]*container-type:\s*size/s);
  assert.match(css, /\.bento\.meds-band \.soap-pack\s*\{[^}]*flex:\s*1/s);
  assert.equal(/\.bento\.meds-band \.soap-pack\s*\{[^}]*font-size:\s*22px/s.test(css), false);
  assert.match(css, /\.bento\.meds-band \.soap-pack\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.bento\.meds-band \.soap-pack section\s*\{[^}]*flex:\s*1/s);
  assert.match(css, /\.bento\.meds-band \.card-b\s*\{[^}]*overflow:\s*hidden/s);
  assert.equal(/\.bento\.meds-band \.card-b\s*\{[^}]*overflow-y:\s*auto/s.test(css), false);
  assert.match(css, /:has\(\.bento\.meds-band\) \.bento\.rest\s*\{[^}]*max-height:\s*36cqh/s);
});

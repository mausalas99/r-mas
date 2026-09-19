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

test('vitals and labs share one row and do not clip', () => {
  const css = readDashboardCss();
  assert.match(css, /\.bento\.vitals-labs\s*\{[^}]*min-height:\s*min-content/s);
  assert.match(css, /\.bento\.vitals-labs \.vitals-card[\s\S]*?overflow:\s*visible/s);
  assert.match(css, /\.bento\.vitals-labs \.labs-card[\s\S]*?overflow:\s*visible/s);
  assert.match(css, /\.vitals\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit/s);
  assert.match(css, /\.vitals\s*\{[^}]*grid-auto-rows:\s*minmax\(\s*min-content/s);
  assert.match(css, /\.labs-card \.card-b\s*\{[^}]*overflow:\s*visible/s);
  assert.equal(/grid-column:\s*1\s*\/\s*-1/.test(css), false);
  assert.match(css, /\.vital\s*\{[^}]*min-width:\s*min-content/s);
});

test('fuera-de-rango draws sit in a horizontal row, not stacked', () => {
  const css = readDashboardCss();
  assert.match(css, /\.day-draws\s*\{[^}]*flex-direction:\s*row/s);
  assert.match(css, /\.day-draws\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.draw-head\s*\{[^}]*background:\s*var\(--color-danger-tint-strong\)/s);
  assert.match(css, /\.draw-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit/s);
  assert.match(css, /\.draw-cell\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.draw\.is-wide\s*\{[^}]*(?:flex:\s*1\s+1\s+100%|flex-basis:\s*100%|width:\s*100%)/s);
});

test('labs en-rango summary uses the dense metadata type token', () => {
  const css = readDashboardCss();
  assert.match(css, /\.labs-en-rango\s*\{[^}]*font:\s*var\(--type-wb-metadata\)/s);
});

test('section headers and row metadata use the dense workbench type scale', () => {
  const css = readDashboardCss();
  assert.match(css, /\.patient-dash \.card-h\s*\{[^}]*font:\s*var\(--type-wb-section-label\)/s);
  assert.match(css, /\.patient-dash \.card-h-meta\s*\{[^}]*font:\s*var\(--type-wb-metadata\)/s);
  assert.match(css, /\.patient-dash \.rows time\s*\{[^}]*font:\s*var\(--type-wb-mono\)/s);
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

test('dashboard secondary buttons use --radius-control, not pill', () => {
  const css = readDashboardCss();
  assert.match(css, /\.patient-dash \.btn-sec\s*\{[^}]*border-radius:\s*var\(--radius-control\)/s);
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

test('lab inner nav uses the same pill chrome as Paciente Resumen | Clínico | Salida', () => {
  const css = readLabInnerCss();
  assert.match(css, /\.lab-active-shell\s*\{[^}]*border-radius:\s*var\(--radius-lg\)/s);
  assert.match(css, /\.lab-inner-nav\.inner-tab-bar\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.lab-inner-nav \.inner-tab\s*\{[^}]*border-radius:\s*var\(--radius-pill\)/s);
  assert.match(css, /\.lab-inner-nav \.inner-tab\.active[^{]*\{[^}]*background:\s*color-mix\(in oklab,\s*var\(--action\) 14%/s);
  assert.equal(/border-bottom-color:\s*var\(--color-accent\)/.test(css), false);
});

test('lab workbench inset matches Paciente glance, not a nested 24px well', () => {
  const css = readLabInnerCss();
  assert.match(css, /\.lab-inner-nav\.inner-tab-bar\s*\{[^}]*padding:[^}]*16px/s);
  assert.match(css, /\.lab-active-shell\s*>\s*\.main-work-scroll\s*\{[^}]*padding:\s*calc\(12px/s);
  assert.match(css, /\.lab-inner-panel\s*\{[^}]*padding:\s*calc\(12px/s);
  assert.match(
    css,
    /#appcontent-lab \.lab-active-shell \.card\s*>\s*\.card-header\s*\{[^}]*padding-left:\s*calc\(12px/s
  );
  assert.equal(/\.lab-inner-panel\s*\{[^}]*padding:\s*calc\(24px/s.test(css), false);
});

test('dash-name stays compact, not a display heading', () => {
  const css = readDashboardCss();
  assert.match(css, /\.dash-name\s*\{[^}]*font:\s*600\s+0\.86em/s);
  assert.equal(/\.dash-name\s*\{[^}]*1\.32em/s.test(css), false);
});

test('dashboard chips use accent-soft tokens', () => {
  const css = readDashboardCss();
  assert.match(
    css,
    /\.patient-dash \.chip\s*\{[^}]*background:\s*var\(--color-accent-soft\)/s
  );
  assert.match(
    css,
    /\.patient-dash \.chip\s*\{[^}]*color:\s*var\(--color-accent-soft-text\)/s
  );
  assert.match(
    css,
    /html\.dark \.patient-dash \.chip\s*\{[^}]*background:\s*var\(--color-accent-soft\)/s
  );
  assert.match(
    css,
    /html\.dark \.patient-dash \.chip\s*\{[^}]*color:\s*var\(--color-accent-soft-text\)/s
  );
});

test('medicamentos sizes to the list; no inner scrollbar', () => {
  const css = readDashboardCss();
  assert.match(css, /\.bento\.meds-band\s*\{[^}]*flex:\s*0\s+0\s+auto/s);
  assert.match(css, /\.bento\.meds-band\s*\{[^}]*min-height:\s*min-content/s);
  assert.match(css, /\.bento\.meds-band \.card-b\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /\.bento\.meds-band \.soap-pack\s*\{[^}]*overflow:\s*visible/s);
  assert.equal(/\.bento\.meds-band \.soap-pack\s*\{[^}]*overflow-y:\s*auto/s.test(css), false);
  assert.equal(/\.bento\.meds-band \.card-b\s*\{[^}]*overflow-y:\s*auto/s.test(css), false);
  assert.equal(/mask-image/.test(css), false);
  assert.equal(/\.bento\.meds-band \.soap-pack\s*\{[^}]*font-size:\s*22px/s.test(css), false);
});

test('eventualidades and pendientes stay two columns and do not shrink', () => {
  const css = readDashboardCss();
  assert.match(css, /\.bento\.rest\s*\{[^}]*flex:\s*0\s+0\s+auto/s);
  assert.match(css, /\.bento\.rest\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/s);
  assert.match(css, /\.bento\.rest\s*>\s*\.card[^}]*min-height:\s*min-content/s);
  assert.equal(/repeat\(\s*3/.test(css), false);
});

test('SOAP zone headings use a hue token per letter', () => {
  const css = readDashboardCss();
  assert.match(css, /\[data-soap="N"\]\s*\{[^}]*--soap-h:\s*300/s);
  assert.match(css, /\[data-soap="V"\]\s*\{[^}]*--soap-h:\s*210/s);
  assert.match(css, /\[data-soap="HD"\]\s*\{[^}]*--soap-h:\s*18/s);
  assert.match(css, /\[data-soap="HI"\]\s*\{[^}]*--soap-h:\s*85/s);
  assert.match(css, /\[data-soap="NM"\]\s*\{[^}]*--soap-h:\s*160/s);
  assert.match(css, /\.soap-pack \.z\[data-soap\][^}]*oklch\([^)]*var\(--soap-h/s);
});

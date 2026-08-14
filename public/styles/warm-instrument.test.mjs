import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('accent-soft chips are elevated in light and clinical blue in dark, not ochre', () => {
  const css = read('public/tokens.css');
  assert.match(css, /:root\s*\{[^}]*--color-accent-soft:\s*color-mix\(in oklab,\s*var\(--color-ink\) 8%,\s*var\(--color-elevated\)/s);
  assert.match(css, /html\.dark\s*\{[^}]*--color-accent-soft:\s*color-mix\(in oklab,\s*var\(--color-accent\) 18%/s);
  assert.match(css, /--color-accent-soft-text:\s*var\(--color-ink\)/);
  assert.equal(/:root\s*\{[^}]*--color-accent-soft:[^;]*--color-warm/s.test(css), false);
  assert.equal(/html\.dark\s*\{[^}]*--color-accent-soft:[^;]*--color-warm/s.test(css), false);
  assert.equal(/html\.dark\s*\{[^}]*--shell-gap:[^;]*#3d2430/s.test(css), false);
  assert.equal(/--sidebar-rail-color:[^;]*#5c4a52/.test(css), false);
  assert.equal(/--sidebar-rail-color:[^;]*#6b4456/.test(css), false);
});

test('scrim dims with black, not light ink, and stays below half opacity', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--color-scrim:\s*oklch\(\s*0\s+0\s+0\s*\)/);
  assert.match(css, /--scrim-bg:\s*color-mix\(in oklab,\s*var\(--color-scrim\)\s*32%/);
  assert.match(css, /html\.dark\s*\{[^}]*--scrim-bg:\s*color-mix\(in oklab,\s*var\(--color-scrim\)\s*42%/s);
  assert.equal(/html\.dark\s*\{[^}]*--scrim-bg:[^;]*--color-ink/s.test(css), false);
});

test('vital wells are ink-neutral, not warm chip fill', () => {
  const lab = read('public/styles/lab.css');
  const ea = read('public/styles/estado-actual.css');
  assert.match(lab, /\.vital-label\s*\{[^}]*background:\s*color-mix\(in oklab,\s*var\(--color-ink\)/s);
  assert.equal(/\.vital-label\s*\{[^}]*--lab-chip-bg/s.test(lab), false);
  assert.equal(/\.vital-label\s*\{[^}]*--color-accent-soft/s.test(lab), false);
  assert.match(ea, /\.ea-vital-input:focus::placeholder/);
  assert.equal(/\.ea-vital-input:focus\s*\{[^}]*box-shadow:\s*inset/s.test(ea), false);
  assert.equal(/\.ea-vital-input:focus\s*\{[^}]*--color-accent/s.test(ea), false);
  assert.equal(/\.ea-vital-input:focus\s*\{[^}]*--lab-chip-bg/s.test(ea), false);
});

test('guided-empty primary has no indigo glow', () => {
  const css = read('public/styles/layout.css');
  assert.equal(/rgba\(\s*79\s*,\s*86\s*,\s*255/.test(css), false);
});

test('action buttons use --radius-control, not pill', () => {
  const lab = read('public/styles/lab.css');
  const layout = read('public/styles/layout.css');
  const dash = read('public/styles/patient-dashboard.css');
  assert.match(lab, /\.btn-generate\s*\{[^}]*border-radius:\s*var\(--radius-control\)/s);
  assert.match(lab, /\.btn-med-secondary\s*\{[^}]*border-radius:\s*var\(--radius-control\)/s);
  assert.match(layout, /\.guided-empty-actions button\s*\{[^}]*border-radius:\s*var\(--radius-control\)/s);
  assert.match(dash, /\.patient-dash \.btn-sec\s*\{[^}]*border-radius:\s*var\(--radius-control\)/s);
});

test('press feedback covers chips and remaining actions, not global button:active', () => {
  const css = read('public/styles/components.css');
  const lab = read('public/styles/lab.css');
  assert.match(css, /\.patient-dash \.chip:active/);
  assert.match(css, /\.btn-sec:active:not\(:disabled\)/);
  assert.match(css, /\.todo-add-btn:active:not\(:disabled\)/);
  assert.match(css, /scale\(var\(--press-scale\)\)/);
  assert.match(css, /var\(--dur-press\)/);
  assert.equal(/(?:^|,\s*)button:active/.test(css), false);
  assert.equal(/\.todo-add-btn:active\s*\{[^}]*scale\(0\.96\)/.test(lab), false);
});

test('census card press scale is mouse-only so iPad taps still fire click', () => {
  const css = read('public/styles/components.css');
  const media = css.indexOf('@media (hover: hover) and (pointer: fine)');
  assert.ok(media >= 0, 'press-scale for census cards must be hover/fine only');
  const hoverBlock = css.slice(media, media + 900);
  assert.match(hoverBlock, /\.patient-card:active/);
  assert.match(hoverBlock, /transform:\s*scale/);
  const unguarded = css
    .slice(0, media)
    .concat(css.slice(media + 900));
  assert.equal(
    /\.patient-card:active[^{]*\{[^}]*transform:\s*scale/.test(unguarded),
    false
  );
});

test('media priority chips keep a yellow dot on ink-neutral chrome', () => {
  const css = read('public/styles/motion.css');
  assert.match(css, /\.todo-prio-chip\.prio-media \.todo-prio-dot\s*\{\s*background:\s*var\(--todo-prio-media\)/);
  const chip = css.match(/\.todo-prio-chip\.prio-media\s*\{[^}]+\}/);
  assert.ok(chip);
  assert.match(chip[0], /var\(--color-ink\)/);
  assert.equal(chip[0].includes('--todo-prio-media'), false);
});

test('app-tab icons share a 14px flex box so Laboratorio sits on the Paciente baseline', () => {
  const css = read('public/styles/layout.css');
  assert.match(css, /\.app-tab svg\s*\{[^}]*display:\s*block/s);
  assert.match(css, /\.app-tab svg\s*\{[^}]*width:\s*14px/s);
  assert.match(css, /\.app-tab svg\s*\{[^}]*height:\s*14px/s);
});

test('app-body has Importar SOME and no +1 día control', () => {
  const html = read('public/partials/layout/app-body.html');
  assert.match(html, /id="med-import-open-btn"/);
  assert.equal(html.includes('id="med-dia-btn"'), false);
  assert.equal(html.includes('med-active-btn-group'), false);
  assert.equal(html.includes('+1 día'), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('accent is teal, the only non-clinical brand color', () => {
  const css = read('public/tokens.css');
  assert.match(css, /:root\s*\{[^}]*--color-accent:\s*oklch\(0\.52 0\.09 195\)/s);
  assert.match(css, /html\.dark\s*\{[^}]*--color-accent:\s*oklch\(0\.62 0\.09 195\)/s);
  assert.equal(/:root\s*\{[^}]*--color-accent:\s*var\(--color-ink\)/s.test(css), false);
});

test('accent-soft chips carry the teal accent, not ochre or plain ink', () => {
  const css = read('public/tokens.css');
  assert.match(css, /:root\s*\{[^}]*--color-accent-soft:\s*color-mix\(in oklab,\s*var\(--color-accent\) 12%,\s*var\(--color-elevated\)/s);
  assert.match(css, /html\.dark\s*\{[^}]*--color-accent-soft:\s*color-mix\(in oklab,\s*var\(--color-accent\) 18%/s);
  assert.match(css, /--color-accent-soft-text:\s*var\(--color-accent\)/);
  assert.equal(/:root\s*\{[^}]*--color-accent-soft:[^;]*--color-warm/s.test(css), false);
  assert.equal(/html\.dark\s*\{[^}]*--color-accent-soft:[^;]*--color-warm/s.test(css), false);
  assert.equal(/html\.dark\s*\{[^}]*--shell-gap:[^;]*#3d2430/s.test(css), false);
  assert.equal(/--sidebar-rail-color:[^;]*#5c4a52/.test(css), false);
  assert.equal(/--sidebar-rail-color:[^;]*#6b4456/.test(css), false);
});

test('scrim dims with black, not light ink, and stays at spec 42% (rgba(28,28,30,.42))', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--color-scrim:\s*oklch\(\s*0\s+0\s+0\s*\)/);
  assert.match(css, /--scrim-bg:\s*color-mix\(in oklab,\s*var\(--color-scrim\)\s*42%/);
  assert.match(css, /html\.dark\s*\{[^}]*--scrim-bg:\s*color-mix\(in oklab,\s*var\(--color-scrim\)\s*42%/s);
  assert.equal(/html\.dark\s*\{[^}]*--scrim-bg:[^;]*--color-ink/s.test(css), false);
});

test('Phase 0: chip radius is a true 999px pill, badges and row buttons get their own tokens', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--radius-chip:\s*999px/);
  assert.match(css, /--radius-badge:\s*6px/);
  assert.match(css, /--radius-row-btn:\s*7px/);
  const dash = read('public/styles/patient-dashboard.css');
  assert.match(dash, /\.patient-dash \.chip\s*\{[^}]*border-radius:\s*var\(--radius-chip\)/s);
  assert.match(dash, /\.patient-dash \.svc\s*\{[^}]*border-radius:\s*var\(--radius-badge\)/s);
  assert.match(dash, /\.patient-dash \.svc-add\s*\{[^}]*border-radius:\s*var\(--radius-badge\)/s);
  const settings = read('public/styles/settings.css');
  assert.match(settings, /\.btn-settings-row\s*\{[^}]*border-radius:\s*var\(--radius-row-btn\)/s);
});

test('Phase 0: panel-header and table-head are their own tokens, not overloaded --color-content', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--color-panel-header:\s*rgb\(242,\s*240,\s*236\)/);
  assert.match(css, /--color-table-head:\s*rgb\(249,\s*248,\s*245\)/);
  assert.match(css, /html\.dark\s*\{[^}]*--color-panel-header:/s);
  assert.match(css, /html\.dark\s*\{[^}]*--color-table-head:/s);
});

test('Phase 0: hairline and border retuned to spec ranges', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--divider:\s*color-mix\(in oklab,\s*var\(--color-ink\)\s*6%/);
  assert.match(css, /--border:\s*color-mix\(in oklab,\s*var\(--color-ink\)\s*11%/);
});

test('Phase 0: window/modal/counter-alert shadow tokens exist', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--shadow-window:\s*0 18px 48px rgba\(28,\s*28,\s*30,\s*0\.16\)/);
  assert.match(css, /--shadow-modal:\s*0 24px 64px rgba\(28,\s*28,\s*30,\s*0\.28\)/);
  assert.match(css, /--shadow-counter-alert:\s*inset 0 -2px 0 var\(--color-danger\)/);
});

test('Phase 0: dense workbench data type scale is defined', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--type-wb-section-label:\s*700 11px\/1/);
  assert.match(css, /--type-wb-counter-label:\s*700 10px\/1/);
  assert.match(css, /--type-wb-column-head:\s*700 9\.5px\/1/);
  assert.match(css, /--type-wb-counter-figure:\s*600 13px\/1\.2/);
  assert.match(css, /--type-wb-patient-name:\s*600 12\.5px\/1\.35/);
  assert.match(css, /--type-wb-row:\s*500 12px\/1\.35/);
  assert.match(css, /--type-wb-mono:\s*500 11\.5px\/1\.3 var\(--font-mono\)/);
  assert.match(css, /--type-wb-status-label:\s*600 10\.5px\/1 var\(--font-mono\)/);
  assert.match(css, /--type-wb-button:\s*600 11\.5px\/1/);
  assert.match(css, /--type-wb-metadata:\s*500 11\.5px\/1/);
});

test('Phase 0: om-rise is a true self-contained enter/hold/exit cycle, distinct from toast-in', () => {
  const css = read('public/styles/motion.css');
  assert.match(css, /@keyframes om-rise\s*\{/);
  const kf = css.match(/@keyframes om-rise\s*\{[\s\S]*?\n\}/);
  assert.ok(kf);
  assert.match(kf[0], /0%\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(10px\)/s);
  assert.match(kf[0], /86%/);
  assert.match(kf[0], /100%\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /\.om-rise\s*\{[^}]*animation:\s*om-rise 4\.2s/s);
  // still distinct from the pre-existing (wrong-direction) toast-in
  assert.match(css, /@keyframes toast-in\s*\{/);
});

test('Phase 0: skeleton shimmer retimed to ~1.1s', () => {
  const css = read('public/styles/skeleton.css');
  assert.match(css, /animation:\s*skel-shimmer 1\.1s linear infinite/);
  assert.equal(/animation:\s*skel-shimmer 1\.4s/.test(css), false);
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

test('lab-output-box row grid label column grows for long headers (UROCULTIVO does not overflow into the value column)', () => {
  // grid-template-columns fija a 64px hacía que encabezados sin tab más largos que
  // "BH"/"Cuenta:" (p. ej. "UROCULTIVO") desbordaran la columna y se pegaran
  // visualmente al resto de la línea, aunque el HTML sí trajera el espacio.
  const lab = read('public/styles/lab.css');
  assert.match(
    lab,
    /#lab-output-box \.out-line,\s*\n#lab-output-box \.out-indent\s*\{[^}]*grid-template-columns:\s*minmax\(64px,\s*max-content\)\s*1fr/s
  );
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('accent is teal, the only non-clinical brand color', () => {
  const css = read('public/tokens.css');
  // WU4 darkened/lightened the L channel only (4.5:1 for --lab-chip-txt);
  // hue 195 and chroma 0.09 must stay put in both themes.
  assert.match(css, /:root\s*\{[^}]*--color-accent:\s*oklch\(0\.51 0\.09 195\)/s);
  assert.match(css, /html\.dark\s*\{[^}]*--color-accent:\s*oklch\(0\.75 0\.09 195\)/s);
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

// WU2 — every color role that CSS in the app actually references must be
// declared somewhere (tokens.css, or the same file for a page-local role),
// so no var(--x) silently drops its whole declaration at computed-value time.
function declaredCustomProps(css) {
  const names = new Set();
  for (const m of css.matchAll(/(^|[\s{;])(--[a-zA-Z0-9-]+)\s*:/g)) names.add(m[2]);
  return names;
}

function undeclaredVarRefs(css, declared) {
  const missing = new Set();
  for (const m of css.matchAll(/var\((--[a-zA-Z0-9-]+)\)/g)) {
    if (!declared.has(m[1])) missing.add(m[1]);
  }
  return [...missing];
}

test('--accent resolves to the teal brand color (equipos.css and vpo.css consume it)', () => {
  const css = read('public/tokens.css');
  assert.match(css, /:root\s*\{[^}]*--accent:\s*var\(--color-accent\)/s);
  assert.match(css, /html\.dark\s*\{[^}]*--accent:\s*var\(--color-accent\)/s);
});

test('ui-patterns.css names no undefined color role (--color-inset/--color-field/--color-hover/--surface-muted are gone)', () => {
  const tokens = read('public/tokens.css');
  const uiPatterns = read('public/styles/ui-patterns.css');
  const declared = new Set([...declaredCustomProps(tokens), ...declaredCustomProps(uiPatterns)]);
  assert.deepEqual(undeclaredVarRefs(uiPatterns, declared), []);
  for (const dead of ['--color-inset', '--color-field', '--color-hover', '--surface-muted']) {
    assert.equal(uiPatterns.includes(dead), false, `${dead} should no longer appear in ui-patterns.css`);
  }
});

test('nota-evolucion.css defines every --ne-zone-* role it uses (light and dark)', () => {
  const tokens = read('public/tokens.css');
  const notaEvo = read('public/styles/nota-evolucion.css');
  const declared = new Set([...declaredCustomProps(tokens), ...declaredCustomProps(notaEvo)]);
  assert.deepEqual(undeclaredVarRefs(notaEvo, declared), []);
  for (const zone of ['n', 'v', 'hd', 'hi', 'nm']) {
    assert.match(notaEvo, new RegExp(`:root\\s*\\{[^}]*--ne-zone-${zone}:\\s*oklch`, 's'));
    assert.match(notaEvo, new RegExp(`html\\.dark\\s*\\{[^}]*--ne-zone-${zone}-dark:\\s*oklch`, 's'));
  }
});

// WU3 — the focus ring must clear WCAG 3:1 non-text contrast, and no rule
// sets outline: none without a paired :focus-visible replacement.
function relLuma([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [rl, gl, bl] = [r, g, b].map(lin);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function contrastRatio(rgbA, rgbB) {
  const lumA = relLuma(rgbA);
  const lumB = relLuma(rgbB);
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}
function hexToRgb(h) {
  const n = h.replace('#', '');
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
// oklch(L C H) -> sRGB [0,255], via the standard OKLab matrices (CSS Color 4).
function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const gam = (c) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  return lin.map((c) => Math.round(gam(c) * 255));
}
// color-mix(in oklab, C pct%, transparent) then composited (alpha blend) over bg.
function compositeOverBg(rgb, pct, bgRgb) {
  return rgb.map((c, i) => Math.round((c * pct + bgRgb[i] * (100 - pct)) / 100));
}

test('--color-focus-ring opacity clears 3:1 against --color-elevated/--color-surface/--color-paper, in both themes', () => {
  const css = read('public/tokens.css');
  const lightPctMatch = css.match(/:root\s*\{[^}]*--color-focus-ring:\s*color-mix\(in oklab,\s*var\(--color-accent\)\s*(\d+)%/s);
  const darkPctMatch = css.match(/html\.dark\s*\{[^}]*--color-focus-ring:\s*color-mix\(in oklab,\s*var\(--color-accent\)\s*(\d+)%/s);
  assert.ok(lightPctMatch, 'light --color-focus-ring not found');
  assert.ok(darkPctMatch, 'dark --color-focus-ring not found');
  const lightPct = Number(lightPctMatch[1]);
  const darkPct = Number(darkPctMatch[1]);
  assert.ok(lightPct > 26, `light focus-ring opacity ${lightPct}% must be raised above the old 26%`);
  assert.ok(darkPct > 22, `dark focus-ring opacity ${darkPct}% must be raised above the old 22%`);

  // Read --color-accent's own oklch(L C H) rather than hardcoding it, so this
  // stays correct across future retunes (e.g. WU4's lightness nudges).
  const lightAccentMatch = css.match(/:root\s*\{[^}]*--color-accent:\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/s);
  const darkAccentMatch = css.match(/html\.dark\s*\{[^}]*--color-accent:\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/s);
  assert.ok(lightAccentMatch && darkAccentMatch, '--color-accent oklch() not found');
  const lightAccent = oklchToRgb(...lightAccentMatch.slice(1, 4).map(Number));
  const darkAccent = oklchToRgb(...darkAccentMatch.slice(1, 4).map(Number));
  const lightBgs = ['#ffffff', '#f8f7f4', '#eceae6']; // elevated, surface, paper
  const darkBgs = ['#262b36', '#1f232d', '#12141a'];
  for (const bg of lightBgs) {
    const ratio = contrastRatio(compositeOverBg(lightAccent, lightPct, hexToRgb(bg)), hexToRgb(bg));
    assert.ok(ratio >= 3, `light focus ring at ${lightPct}% only reaches ${ratio.toFixed(2)}:1 on ${bg}`);
  }
  for (const bg of darkBgs) {
    const ratio = contrastRatio(compositeOverBg(darkAccent, darkPct, hexToRgb(bg)), hexToRgb(bg));
    assert.ok(ratio >= 3, `dark focus ring at ${darkPct}% only reaches ${ratio.toFixed(2)}:1 on ${bg}`);
  }
});

test('cmdk.css has no outline: none without a paired :focus-visible rule providing a real outline', () => {
  const css = read('public/styles/cmdk.css');
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*outline:\s*none[^{}]*)\}/g)) {
    const selector = m[1].trim();
    // either the rule itself is scoped to :focus-visible (and must set a
    // real outline, not none), or an adjacent :focus-visible rule restores one.
    const idx = m.index;
    const after = css.slice(idx, idx + 400);
    const hasFollowupFocusVisible = /:focus-visible\s*\{[^}]*outline:\s*(?!none)/s.test(after);
    assert.ok(
      hasFollowupFocusVisible,
      `rule "${selector}" sets outline: none with no nearby :focus-visible rule providing a real outline`
    );
  }
});

test('estado-actual.css vital-input and disclosure focus styles differ from their rest/none state', () => {
  const css = read('public/styles/estado-actual.css');
  assert.equal(/\.ea-estado-clinico > summary:focus-visible\s*\{[^}]*outline:\s*none/s.test(css), false);
  assert.match(css, /\.ea-estado-clinico > summary:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--action\)/s);
  for (const selector of [
    /\.ea-vital-input:focus\s*\{([^}]*)\}/,
    /\.ea-registro-modal \.ea-vital-value-wrap \.ea-vital-input:focus\s*\{([^}]*)\}/,
  ]) {
    const m = css.match(selector);
    assert.ok(m, `${selector} not found`);
    assert.doesNotMatch(m[1], /outline:\s*none/);
    assert.match(m[1], /outline:\s*2px solid var\(--action\)/);
  }
});

test('vpo.css scale-chip focus outline is fully opaque (70% alone failed 3:1 once --accent resolved)', () => {
  const css = read('public/styles/vpo.css');
  assert.match(css, /\.vpo-chip input:focus-visible \+ span\s*\{[^}]*outline:\s*2px solid var\(--accent\);/s);
  assert.equal(/\.vpo-chip input:focus-visible \+ span\s*\{[^}]*color-mix/s.test(css), false);
});

// WU4 — darken the faintest text/label colors (lightness only, hue held) so
// their real-world pairings clear 4.5:1. --color-paper is untouched.
test('--color-ink-tertiary is darkened (light) / lightened (dark) and stays lighter/fainter than --color-ink-muted', () => {
  const css = read('public/tokens.css');
  const lightMatch = css.match(/:root\s*\{[^}]*--color-ink-tertiary:\s*(#[0-9a-fA-F]{6})/s);
  const darkMatch = css.match(/html\.dark\s*\{[^}]*--color-ink-tertiary:\s*(#[0-9a-fA-F]{6})/s);
  assert.ok(lightMatch && darkMatch);
  assert.notEqual(lightMatch[1].toLowerCase(), '#98989d');
  assert.notEqual(darkMatch[1].toLowerCase(), '#6b7385');
  // --color-ink-tertiary's two real consumers (workbench-kit.css on
  // --color-surface, patient-dashboard.css on --color-elevated) must clear 4.5:1.
  assert.ok(contrastRatio(hexToRgb(lightMatch[1]), hexToRgb('#f8f7f4')) >= 4.5, 'light ink-tertiary must clear 4.5:1 on --color-surface');
  assert.ok(contrastRatio(hexToRgb(lightMatch[1]), hexToRgb('#ffffff')) >= 4.5, 'light ink-tertiary must clear 4.5:1 on --color-elevated');
  assert.ok(contrastRatio(hexToRgb(darkMatch[1]), hexToRgb('#1f232d')) >= 4.5, 'dark ink-tertiary must clear 4.5:1 on --color-surface');
  assert.ok(contrastRatio(hexToRgb(darkMatch[1]), hexToRgb('#262b36')) >= 4.5, 'dark ink-tertiary must clear 4.5:1 on --color-elevated');
  // stays a fainter tier than --color-ink-muted, not darker/more prominent than it.
  const mutedLight = css.match(/:root\s*\{[^}]*--color-ink-muted:\s*(#[0-9a-fA-F]{6})/s)[1];
  const mutedDark = css.match(/html\.dark\s*\{[^}]*--color-ink-muted:\s*(#[0-9a-fA-F]{6})/s)[1];
  assert.ok(relLuma(hexToRgb(lightMatch[1])) > relLuma(hexToRgb(mutedLight)), 'light ink-tertiary should stay lighter (fainter) than ink-muted');
  assert.ok(relLuma(hexToRgb(darkMatch[1])) < relLuma(hexToRgb(mutedDark)), 'dark ink-tertiary should stay darker (fainter against a dark bg) than ink-muted');
});

test('--todo-prio-alta (light) clears 4.5:1 as the .todo-prio-chip.prio-alta label (82% mixed onto --color-ink over 14% mixed onto --color-surface)', () => {
  const css = read('public/tokens.css');
  const m = css.match(/:root\s*\{[^}]*--todo-prio-alta:\s*(#[0-9a-fA-F]{6})/s);
  assert.ok(m);
  assert.notEqual(m[1].toLowerCase(), '#cf6060', '--todo-prio-alta must be darkened from the old 4.09:1 value');
  const alta = hexToRgb(m[1]);
  const ink = hexToRgb('#1a1a1c');
  const surface = hexToRgb('#f8f7f4');
  const mix = (fg, bg, pct) => fg.map((c, i) => Math.round((c * pct + bg[i] * (100 - pct)) / 100));
  const textColor = mix(alta, ink, 82);
  const bgColor = mix(alta, surface, 14);
  assert.ok(contrastRatio(textColor, bgColor) >= 4.5, `.todo-prio-chip.prio-alta label only reaches ${contrastRatio(textColor, bgColor).toFixed(2)}:1`);
});

test('--lab-chip-txt (= --color-accent-soft-text = --color-accent) clears 4.5:1 on --lab-chip-bg, in both themes', () => {
  const css = read('public/tokens.css');
  const lightAccentMatch = css.match(/:root\s*\{[^}]*--color-accent:\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/s);
  const darkAccentMatch = css.match(/html\.dark\s*\{[^}]*--color-accent:\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/s);
  const lightAccent = oklchToRgb(...lightAccentMatch.slice(1, 4).map(Number));
  const darkAccent = oklchToRgb(...darkAccentMatch.slice(1, 4).map(Number));
  const mix = (fg, bg, pct) => fg.map((c, i) => Math.round((c * pct + bg[i] * (100 - pct)) / 100));
  // light --lab-chip-bg = --color-accent-soft = color-mix(accent 12%, --color-elevated) — opaque, exact.
  const lightChipBg = mix(lightAccent, hexToRgb('#ffffff'), 12);
  assert.ok(contrastRatio(lightAccent, lightChipBg) >= 4.5, `light --lab-chip-txt only reaches ${contrastRatio(lightAccent, lightChipBg).toFixed(2)}:1 on its chip background`);
  // dark --lab-chip-bg mixes toward transparent (18%), so it composites over
  // whatever sits behind it — check every plausible dark card/panel ancestor.
  for (const ancestor of ['#262b36', '#1f232d', '#181b23']) {
    const darkChipBg = mix(darkAccent, hexToRgb(ancestor), 18);
    const ratio = contrastRatio(darkAccent, darkChipBg);
    assert.ok(ratio >= 4.5, `dark --lab-chip-txt only reaches ${ratio.toFixed(2)}:1 on --lab-chip-bg over ${ancestor}`);
  }
});

test('WU11: no source stylesheet declares a font-size below the 10px dense floor', () => {
  // The design system deliberately ships type tokens down to 9.5px
  // (--type-wb-column-head, tokens.css:246-261) but those are only ever
  // consumed via the `font:` shorthand, never written as a literal
  // `font-size:` in a stylesheet — so scanning for the literal property
  // does not false-positive on the intentional dense-scale tokens.
  // Known pre-existing sub-10px site outside WU11's audit-verified 16 spots
  // (interface-fix-plan-DETAIL.md). Left alone deliberately: WU11 scope is
  // exactly those 16 sites; this one needs its own audited fix.
  const knownExceptions = new Set(['public/interno/interno.css: font-size: 0.6rem']);
  const dirs = ['public/styles', 'public/interno'];
  const offenders = [];
  const sizeRe = /font-size:\s*calc\(\s*([\d.]+)px[^)]*\)|font-size:\s*([\d.]+)px|font-size:\s*([\d.]+)rem/g;
  for (const dir of dirs) {
    for (const name of readdirSync(join(root, dir))) {
      if (!name.endsWith('.css') || name === 'app.bundle.css') continue;
      const css = read(join(dir, name));
      for (const m of css.matchAll(sizeRe)) {
        const px = m[1] !== undefined ? Number(m[1]) : m[2] !== undefined ? Number(m[2]) : Number(m[3]) * 16;
        const site = `${dir}/${name}: ${m[0].trim()}`;
        if (px < 10 && !knownExceptions.has(site)) offenders.push(site);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

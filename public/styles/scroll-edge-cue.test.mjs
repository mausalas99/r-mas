import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// Every overflow-x: auto|scroll scroller must either carry a nearby edge-cue
// rule (a ::after with a linear-gradient fade) or a "No edge cue" comment
// justifying why it genuinely never overflows sideways in practice.
function assertEveryScrollerHasCueOrException(css, filename) {
  const sites = [...css.matchAll(/overflow-x:\s*(?:auto|scroll)\s*;/g)];
  assert.ok(sites.length > 0, `${filename}: expected at least one overflow-x scroller`);
  for (const site of sites) {
    const idx = site.index;
    const before = css.slice(Math.max(0, idx - 400), idx);
    if (/No edge cue/i.test(before)) continue; // documented, justified exception
    const closeIdx = css.indexOf('}', idx);
    const after = css.slice(closeIdx, closeIdx + 700);
    const hasCue = /::after[\s\S]*?linear-gradient/.test(after);
    assert.ok(
      hasCue,
      `${filename}: overflow-x scroller near offset ${idx} has no ::after edge-cue rule and no "No edge cue" exception comment`
    );
  }
  return sites.length;
}

test('group-row.css: #exp-group-row scrollers (desktop + mobile-web) fade at the right edge', () => {
  const css = read('public/styles/group-row.css');
  const count = assertEveryScrollerHasCueOrException(css, 'group-row.css');
  assert.equal(count, 2);
  // Both fade to --surface, matching .exp-expediente-nav's background.
  assert.equal((css.match(/linear-gradient\(to left, var\(--surface\), transparent\)/g) || []).length, 2);
});

test('lab.css: every horizontal scroller has a cue, except the documented flex-wrap grid', () => {
  const css = read('public/styles/lab.css');
  const count = assertEveryScrollerHasCueOrException(css, 'lab.css');
  assert.equal(count, 4);
  // Pre-existing reference pattern (.inner-tab-bar) is untouched and still works.
  assert.match(css, /\.inner-tab-bar::after\s*\{[^}]*linear-gradient\(to left, var\(--surface\), transparent\)/s);
  // #lab-diagrams-body is the documented exception: its child is flex-wrap,
  // so it reflows instead of overflowing sideways.
  assert.match(css, /No edge cue[\s\S]{0,200}overflow-x:\s*auto;\s*overflow-y:\s*hidden;/);
  // Both .lab-some-table-wrap variants (block table wraps) became flex
  // containers so the sticky fade pseudo can sit beside the table.
  assert.match(css, /\.lab-some-tables--modal \.lab-some-table-wrap \{[^}]*display:\s*flex;/s);
  assert.match(css, /\.lab-some-tables--modal \.lab-some-table-wrap::after\s*\{[^}]*linear-gradient\(to left, var\(--color-elevated\), transparent\)/s);
  assert.match(css, /(?<!--modal )\.lab-some-table-wrap \{[^}]*display:\s*flex;/s);
});

test('cloud-sync.css: admin tabs, table wrap, and equipos-bulk toolbar all fade', () => {
  const css = read('public/styles/cloud-sync.css');
  const count = assertEveryScrollerHasCueOrException(css, 'cloud-sync.css');
  assert.equal(count, 3);
  assert.match(css, /\.cloud-sync-admin-tabs\.cloud-sync-tabs::after\s*\{[^}]*linear-gradient\(to left, var\(--color-elevated\), transparent\)/s);
  assert.match(css, /\.cloud-sync-admin-table-wrap \{[^}]*display:\s*flex;/s);
  assert.match(css, /\.cloud-sync-admin-table-wrap::after\s*\{[^}]*linear-gradient\(to left, var\(--surface\), transparent\)/s);
  // The toolbar is already sticky-top + a color-mix background; the fade
  // must match that exact background, not plain --surface, or it seams.
  assert.match(
    css,
    /\.cloud-sync-admin-equipos-bulk::after\s*\{[^}]*linear-gradient\(to left, color-mix\(in oklab, var\(--surface, #1a1f26\) 92%, transparent\), transparent\)/s
  );
});

test('settings.css: mobile settings-nav fades only inside its own media query', () => {
  const css = read('public/styles/settings.css');
  const count = assertEveryScrollerHasCueOrException(css, 'settings.css');
  assert.equal(count, 1);
  assert.match(
    css,
    /\.settings-nav::after\s*\{[^}]*linear-gradient\(to left, color-mix\(in oklab, var\(--surface\) 94%, var\(--bg\)\), transparent\)/s
  );
});

test('mobile.css: cultivos-table-wrap becomes flex so its fade sits beside the table', () => {
  const css = read('public/styles/mobile.css');
  const count = assertEveryScrollerHasCueOrException(css, 'mobile.css');
  assert.equal(count, 1);
  assert.match(css, /\.cultivos-table-wrap\s*\{[^}]*display:\s*flex;/s);
  assert.match(css, /\.cultivos-table-wrap::after\s*\{[^}]*linear-gradient\(to left, var\(--surface\), transparent\)/s);
});

test('expediente.css: exp-segment-bar and manejo-subtabs fade to the panel background', () => {
  const css = read('public/styles/expediente.css');
  const count = assertEveryScrollerHasCueOrException(css, 'expediente.css');
  assert.equal(count, 1);
  // Both hosts (.expediente-panes-host, #med-work-area) sit on var(--bg).
  assert.match(
    css,
    /\.exp-segment-bar::after,\s*\.manejo-subtabs::after\s*\{[^}]*linear-gradient\(to left, var\(--bg\), transparent\)/s
  );
});

test('pase-board.css: only the vfeed-strip scroller (line ~2743) got an edge cue', () => {
  const css = read('public/styles/pase-board.css');
  const count = assertEveryScrollerHasCueOrException(css, 'pase-board.css');
  assert.equal(count, 1);
  // Fades to .guardia-vitals-feed's own background, not plain --surface.
  assert.match(
    css,
    /\.vfeed-strip::after\s*\{[^}]*linear-gradient\(to left, color-mix\(in oklab, var\(--color-success-emphasis\) 5%, var\(--surface\)\), transparent\)/s
  );
});

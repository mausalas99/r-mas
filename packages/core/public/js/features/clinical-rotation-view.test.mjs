import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { IncomingStrip } from './clinical-rotation-view.jsx';
  export const strip = (chips) => renderToString(<IncomingStrip chips={chips} />);`);

// Markup renderIncomingStrip wrote before the port, captured on the same chips as below.
const OLD = createRequire(import.meta.url)('./clinical-rotation-view-old-html.json');

// `locked` comes in already decided (the .mjs applies the date rule), so no dates are read here.
const chips = [
  { id: 'p1', effectiveAt: '2026-11-05T12:00:00Z', bed: '4-1', dx: 'Sin dx', locked: true },
  { id: 'p<2>', effectiveAt: '', bed: '—', dx: 'Neumonía <grave> & "x"', locked: false },
  { id: "p'3", effectiveAt: '2026-10-01T00:00:00Z', bed: "O'B", dx: 'IRA', locked: false },
];

test('incoming strip equals the old HTML (one chip, three, unlocked only)', () => {
  sameHtml(view.strip(chips.slice(0, 1)), OLD.one, 'one');
  sameHtml(view.strip(chips), OLD.three, 'three');
  sameHtml(view.strip(chips.slice(1)), OLD.unlockedOnly, 'unlockedOnly');
});

test('only locked chips say so in the label; the count follows the rows', () => {
  const html = view.strip(chips);
  assert.equal((html.match(/bloqueado hasta vigencia/g) || []).length, 1);
  assert.match(html, /guardia-incoming-count">3</);
});

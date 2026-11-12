import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';
import { buildDiagramCards } from './diagrams-render.mjs';

const view = await loadJsx(import.meta.url, `import { DiagramCard } from './diagrams-view.jsx';
  export const card = (c) => renderToString(<DiagramCard card={c} />);`);

// Markup the createElement + innerHTML code in diagrams-render.mjs made, from the same synthetic cards.
const OLD = createRequire(import.meta.url)('./diagrams-view-old-html.json');
const LABS = [
  'BH: Hb 9.1* Hto 28 Leu 12.4* Neu 80 Plt 150',
  'TP: TP 14 INR 1.2 TTP 30',
  'QS: Na 138 K 4.1 Cl 101 Gluc 110* Urea 40 Cr 1.1 BUN 18',
  'PFH: AST 60* ALT 55* FA 90 BT 1.1 BD 0.3 BI 0.8 Alb 3.2 DHL 200',
  'GASO: pH 7.30* pCO2 30 pO2 80 HCO3 15* EB -9 Lac 3.1*',
];

// The old string is parsed by the browser: `<line/>` and `<line></line>` are one element, and attribute gaps vanish.
const asParsed = (s) => s.replace(/<(\w+)([^<>]*?)\s*\/>/g, '<$1$2></$1>').replace(/ {2,}/g, ' ');

test('every diagram card equals the old DOM', () => {
  const cards = buildDiagramCards(LABS).filter((c) => c.svg);
  assert.ok(cards.length >= 2);
  assert.equal(cards.length, OLD.length);
  cards.forEach((c, i) => sameHtml(view.card(c), asParsed(OLD[i]), c.title));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { HintBubble, HintsChoice } from './feature-hints-view.jsx';
  export const bubble = (hint, i) => {
    const step = hint.steps[i];
    return renderToString(<HintBubble badge={hint.kind === 'guia' ? 'Guía' : 'Nuevo'} n={i + 1} total={hint.steps.length}
      text={step.text} last={i === hint.steps.length - 1} action={step.action} />);
  };
  export const choice = (step) => renderToString(<HintsChoice step={step} />);`);

// Exact markup the old innerHTML strings in feature-hints.mjs made (synthetic hints).
const OLD = JSON.parse(fs.readFileSync(new URL('./feature-hints-view.old.json', import.meta.url), 'utf8'));

// '>' is left unescaped by Preact; HTML parses both the same.
const norm = (s) => s.replace(/&gt;/g, '>');

for (const [name, hint] of Object.entries(OLD.hints)) {
  hint.steps.forEach((_, i) => {
    test(`bubble ${name} step ${i + 1} equals the old string`, () => {
      assert.equal(norm(view.bubble(hint, i)), norm(OLD.bubbles[name][i]));
    });
  });
}
test('step 2 of a hint with an action has no Siguiente button', () => {
  assert.ok(!view.bubble(OLD.hints.guia, 1).includes('fh-next'));
});
test('choice dialog step 1 equals the old string', () => assert.equal(view.choice(1), OLD.choice[1]));
test('choice dialog step 2 equals the old string', () => assert.equal(view.choice(2), OLD.choice[2]));

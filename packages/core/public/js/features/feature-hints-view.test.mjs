import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { HintBubble, HintsChoice } from './feature-hints-view.jsx';
  export const bubble = (hint, i) => {
    const step = hint.steps[i];
    return renderToString(<HintBubble badge={hint.kind === 'guia' ? 'Guía' : 'Nuevo'} n={i + 1} total={hint.steps.length}
      text={step.text} last={i === hint.steps.length - 1} action={step.action} />);
  };
  export const choice = (step) => renderToString(<HintsChoice step={step} />);`);

const nuevo = { kind: 'nuevo', steps: [{ text: 'Primer paso' }, { text: 'Segundo paso' }] };
const guia = { kind: 'guia', steps: [{ text: 'Abre el menú', action: true }, { text: 'Elige una opción' }] };

test('a middle step shows the Siguiente button', () => {
  const html = view.bubble(nuevo, 0);
  assert.ok(html.includes('Primer paso'));
  assert.ok(html.includes('fh-next'));
  assert.ok(html.includes('Siguiente'));
});

test('the last step shows Entendido instead of Siguiente', () => {
  const html = view.bubble(nuevo, 1);
  assert.ok(html.includes('Segundo paso'));
  assert.ok(html.includes('Entendido'));
  assert.ok(!html.includes('Siguiente'));
});

test('a guia hint uses the Guía badge', () => {
  assert.ok(view.bubble(guia, 0).includes('Guía'));
});

test('a step with an action has no Siguiente button', () => {
  assert.ok(!view.bubble(guia, 0).includes('fh-next'));
});

test('choice dialog step 1 offers to turn hints on or off', () => {
  const html = view.choice(1);
  assert.ok(html.includes('Nuevo: pistas en pantalla'));
  assert.match(html, /data-fh-choice="off"/);
  assert.match(html, /data-fh-choice="on"/);
});

test('choice dialog step 2 says where to turn hints back on', () => {
  const html = view.choice(2);
  assert.ok(html.includes('Pistas desactivadas'));
  assert.ok(html.includes('Ajustes → Apariencia → Pistas en pantalla'));
  assert.match(html, /data-fh-choice="where"/);
});

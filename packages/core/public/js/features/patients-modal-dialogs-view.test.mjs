import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { DuplicateWarning, ExpedienteAdvice } from './patients-modal-dialogs-view.jsx';
  const noop = () => {};
  export const dup = (existing, fecha) => renderToString(<DuplicateWarning existing={existing} fecha={fecha} onCancel={noop} onConfirm={noop} />);
  export const advice = (a) => renderToString(<ExpedienteAdvice advice={a} onCancel={noop} onConfirm={noop} />);`);

const text = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const full = { nombre: 'PACIENTE DEMO UNO', cuarto: '432', cama: '3', registro: 'R-100' };
const bare = { nombre: 'MARIA SIN DATOS' };

test('duplicate warning shows the existing patient with room, bed and registro', () => {
  const t = text(view.dup(full, '2026-10-01'));
  assert.ok(t.includes('Paciente similar encontrado'));
  assert.ok(t.includes('PACIENTE DEMO UNO'));
  assert.ok(t.includes('Cto. 432 Cama 3'));
  assert.ok(t.includes('Registro: R-100'));
  assert.ok(t.includes('Ingreso: 2026-10-01'));
});

test('duplicate warning without fecha or registro leaves those lines out', () => {
  const t = text(view.dup(bare, ''));
  assert.ok(t.includes('MARIA SIN DATOS'));
  assert.ok(t.includes('Cto. — Cama —'));
  assert.ok(!t.includes('Registro:'));
  assert.ok(!t.includes('Ingreso:'));
});

test('duplicate warning has cancel and confirm buttons', () => {
  const html = view.dup(full, '');
  assert.match(html, /id="dup-confirm-cancel-btn"/);
  assert.match(html, /id="dup-confirm-btn"/);
});

test('expediente advice shows the title, body and both labels from props', () => {
  const html = view.advice({ title: 'Titulo <b>', body: 'Cuerpo & más', cancelLabel: 'No', confirmLabel: 'Sí' });
  assert.ok(text(html).includes('Cuerpo & más'));
  assert.ok(text(html).includes('Titulo'));
  assert.match(html, /id="exp-advice-cancel"/);
  assert.match(html, /id="exp-advice-confirm"/);
});

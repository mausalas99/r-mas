import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { IcBar, BoardFrame, Archived } from './interconsulta-mode-chrome-view.jsx';
  export const bar = () => renderToString(<IcBar />);
  export const frame = (p) => renderToString(<BoardFrame {...p} />);
  export const arch = (patients, collapsed) => renderToString(<Archived patients={patients} collapsed={collapsed} canDelete={(p) => p.id !== 'a2'} />);`);

// Visible text only: drop tags, decode the entities the views escape.
const text = (h) => h.replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

const opts = [{ id: 'ic-a', label: 'Interconsultas A' }, { id: 'ic-b', label: 'B <x> & "y"' }];
const arch = [
  { id: 'a1', nombre: 'ANA <ARCH> & "X"', cuarto: '4', cama: '1' },
  { id: 'a2', nombre: '', cuarto: '', cama: '' },
  { id: 'a3', nombre: "O'BRIEN", cuarto: '9', cama: '' },
];
const pills = [['Promedio 7 días', '40 min'], ['VPO', '20 min'], ['IC', '1 h 0 min']];

test('top bar renders', () => {
  assert.ok(view.bar().length > 0);
});

test('stats pills show each label and value', () => {
  const t = text(view.frame({ mode: 'asignar', options: [], teamId: '', count: 0, pills, guardiaName: '' }));
  for (const [label, value] of pills) {
    assert.ok(t.includes(label), label);
    assert.ok(t.includes(value), value);
  }
});

test('frame lists every team option and escapes labels', () => {
  const html = view.frame({ mode: 'equipo', options: opts, teamId: 'ic-b', count: 3, pills: [], guardiaName: 'Interconsultas A' });
  const t = text(html);
  assert.ok(t.includes('Interconsultas A'));
  assert.ok(t.includes('B <x> & "y"'));
  assert.doesNotMatch(html, /<x>/);
});

test('frame always mounts the board and archived sections', () => {
  const html = view.frame({ mode: 'asignar', options: [], teamId: '', count: 0, pills: [], guardiaName: '' });
  assert.ok(html.includes('id="ic-team-board-mount"'));
  assert.ok(html.includes('id="ic-archived-mount"'));
});

test('Archivados lists each archived patient, escaped', () => {
  const t = text(view.arch(arch, false)).toLowerCase();
  assert.ok(t.includes('ana <arch> & "x"'));
  assert.ok(t.includes("o'brien"));
});

test('Archivados with no patients shows nothing to list', () => {
  assert.doesNotMatch(view.arch([], false), /data-ic-arch-del=/);
});

test('delete button only for patients the rule allows', () => {
  const html = view.arch(arch, false);
  assert.ok(html.includes('data-ic-arch-del="a1"'));
  assert.ok(!html.includes('data-ic-arch-del="a2"'));
});

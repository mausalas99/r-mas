import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from '../preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { InheritStepDots, StepDestino, StepOrigen, StepPacientes, StepConfirm } from './teams-roster-inherit-patients-view.jsx';
  export const dots = (step) => renderToString(<InheritStepDots step={step} />);
  export const destino = (p) => renderToString(<StepDestino {...p} />);
  export const origen = (p) => renderToString(<StepOrigen {...p} />);
  export const pacientes = (p) => renderToString(<StepPacientes {...p} />);
  export const confirm = (p) => renderToString(<StepConfirm {...p} />);`);

// Visible text only: drop tags, decode the entities the view escapes.
const text = (h) => h.replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

const nm = 'EQUIPO <A> & "B"';
const src = [
  { teamId: 't1', name: 'Medicina <1>', sala: 'Sala 3', cycle: 'A', patientCount: 4, preferred: true },
  { teamId: 't2', name: "O'Brien & Co", sala: '', cycle: '', patientCount: 0 },
  { teamId: 't3', name: 'Plain', sala: 'Sala 2', cycle: 'C', patientCount: 1 },
];
const pts = [
  { id: 'p1', nombre: 'PACIENTE DEMO UNO', registro: 'R-100' },
  { id: 'p2', nombre: 'MARIA <X> & "Y"', registro: '' },
  { id: 'p3', nombre: '', registro: "R-'3" },
];

test('step dots change with the step', () => {
  assert.notEqual(view.dots(0), view.dots(1));
  assert.notEqual(view.dots(1), view.dots(2));
});

test('destino shows the target team, sala and cycle', () => {
  const t = text(view.destino({ targetName: nm, sala: 'Sala 3', cycle: 'B' }));
  assert.ok(t.includes(nm), t);
  assert.ok(t.includes('Sala 3'), t);
});

test('destino with only a name still shows the name', () => {
  assert.ok(text(view.destino({ targetName: 'Equipo C' })).includes('Equipo C'));
});

test('origen lists every source team and checks only the selected one', () => {
  const html = view.origen({ targetName: nm, sources: src, unassignedCount: 2, selectedSourceId: 't1' });
  const t = text(html);
  for (const s of src) assert.ok(t.includes(s.name), s.name);
  assert.match(html, /data-inherit-source="t1"[^>]*checked/);
  assert.doesNotMatch(html, /data-inherit-source="t2"[^>]*checked/);
});

test('origen with no sources does not throw', () => {
  assert.equal(typeof view.origen({ targetName: 'X', sources: [], unassignedCount: 0, selectedSourceId: '' }), 'string');
});

test('pacientes lists one row per patient and wires select-all and the unassigned toggle', () => {
  const html = view.pacientes({ targetName: nm, patients: pts, unassignedCount: 2, sourceName: 'Medicina' });
  assert.equal((html.match(/data-inherit-patient="/g) || []).length, 3);
  assert.match(html, /data-inherit-select="all"/);
  assert.match(html, /data-inherit-include-unassigned/);
  assert.match(html, /data-inherit-count aria-live="polite"/);
});

test('pacientes escapes patient names', () => {
  const html = view.pacientes({ targetName: nm, patients: pts, unassignedCount: 0, sourceName: 'Medicina' });
  assert.doesNotMatch(html, /<X>/);
  assert.ok(text(html).includes('MARIA <X> & "Y"'));
});

test('pacientes with no patients shows no rows', () => {
  const html = view.pacientes({ targetName: nm, patients: [], includeUnassigned: false, unassignedCount: 0, sourceName: 'Medicina' });
  assert.equal((html.match(/data-inherit-patient="/g) || []).length, 0);
});

test('confirm names the target and the source team', () => {
  const t = text(view.confirm({ targetName: nm, sourceName: 'Medicina <1>', selectedCount: 3 }));
  assert.ok(t.includes(nm), t);
  assert.ok(t.includes('Medicina <1>'), t);
});

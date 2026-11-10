import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from '../preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { InheritStepDots, StepDestino, StepOrigen, StepPacientes, StepConfirm } from './teams-roster-inherit-patients-view.jsx';
  export const dots = (step) => renderToString(<InheritStepDots step={step} />);
  export const destino = (p) => renderToString(<StepDestino {...p} />);
  export const origen = (p) => renderToString(<StepOrigen {...p} />);
  export const pacientes = (p) => renderToString(<StepPacientes {...p} />);
  export const confirm = (p) => renderToString(<StepConfirm {...p} />);`);

// Exact markup the string builders (buildInheritStep*Html) made before the port, captured on the fixtures below.
const OLD = JSON.parse(fs.readFileSync(new URL('./teams-roster-inherit-patients-old-html.json', import.meta.url), 'utf8'));

// Preact SSR writes `>` unescaped in text, empty attrs without `=""` and `/>` without a space; HTML parses all the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/ ([a-z-]+)=""/g, ' $1').replace(/ \/>/g, '/>');
const same = (name, html) => {
  const a = norm(html), b = norm(OLD[name]);
  if (a !== b) { let i = 0; while (a[i] === b[i]) i++; assert.fail(name + ' differs at ' + i + '\nnew: ...' + a.slice(Math.max(0, i - 60), i + 120) + '\nold: ...' + b.slice(Math.max(0, i - 60), i + 120)); }
};

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

test('step dots equal the old HTML', () => {
  for (let i = 0; i < 4; i++) same('dots:' + i, view.dots(i));
});

test('destino equals the old HTML', () => {
  same('destino:full', view.destino({ targetName: nm, sala: 'Sala 3', cycle: 'B' }));
  same('destino:sala', view.destino({ targetName: 'Equipo C', sala: 'Sala 3' }));
  same('destino:cycle', view.destino({ targetName: 'Equipo C', cycle: 'A' }));
  same('destino:bare', view.destino({ targetName: '' }));
});

test('origen equals the old HTML', () => {
  for (const sel of ['t1', 't2', '', 'zz']) same('origen:sel:' + sel, view.origen({ targetName: nm, sources: src, unassignedCount: 2, selectedSourceId: sel }));
  same('origen:empty', view.origen({ targetName: 'X', sources: [], unassignedCount: 0, selectedSourceId: '' }));
  same('origen:undef', view.origen({ targetName: 'X', unassignedCount: undefined }));
});

test('pacientes equals the old HTML', () => {
  const cases = {
    list: { patients: pts, includeUnassigned: false, unassignedCount: 0, sourceName: 'Medicina' },
    toggleOff: { patients: pts, includeUnassigned: false, unassignedCount: 3, sourceName: 'Medicina <1>' },
    toggleOn: { patients: pts, includeUnassigned: true, unassignedCount: 1, sourceName: 'Medicina' },
    toggleNoSource: { patients: pts, includeUnassigned: true, unassignedCount: 2, sourceName: '' },
    none: { patients: [], includeUnassigned: false, unassignedCount: 0, sourceName: 'Medicina' },
    undef: { unassignedCount: 0 },
  };
  for (const [k, v] of Object.entries(cases)) same('pacientes:' + k, view.pacientes({ targetName: nm, ...v }));
});

test('confirm equals the old HTML', () => {
  for (const n of [0, 1, 3, undefined]) for (const s of ['Medicina <1>', '']) same('confirm:' + n + ':' + s, view.confirm({ targetName: nm, sourceName: s, selectedCount: n }));
});

test('hooks the modal events rely on, and escaping', () => {
  const html = norm(view.pacientes({ targetName: nm, patients: pts, unassignedCount: 2, sourceName: 'Medicina' }));
  assert.equal((html.match(/data-inherit-patient="/g) || []).length, 3);
  assert.match(html, /data-inherit-select="all"/);
  assert.match(html, /data-inherit-include-unassigned/);
  assert.match(html, /data-inherit-count aria-live="polite"/);
  assert.doesNotMatch(html, /<X>/);
  assert.match(norm(view.origen({ targetName: 'X', sources: src, selectedSourceId: 't1' })), /name="inherit-source" data-inherit-source="t1" checked/);
});

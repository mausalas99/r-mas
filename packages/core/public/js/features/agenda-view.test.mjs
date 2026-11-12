import test from 'node:test';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.document ??= { addEventListener() {}, documentElement: { classList: { toggle() {}, add() {}, remove() {} } }, querySelector: () => null, querySelectorAll: () => [], readyState: 'complete', getElementById: () => null };

const { storage } = await import('../storage.js');
const { collectAgendaClipsByDay, buildAgendaBoardModel } = await import('./agenda-panel-render.mjs');
const { weekBoundsFromMonday } = await import('../procedure-agenda-week.mjs');
const view = await loadJsx(import.meta.url, `import { AgendaBoard } from './agenda-view.jsx';
  export const board = (model) => renderToString(<AgendaBoard model={model} onEdit={() => {}} />);`);

// Markup of the createElement code in agenda-panel-render.mjs / agenda.mjs before the port, same inputs.
const OLD = createRequire(import.meta.url)('./agenda-view-old-html.json');

const monday = new Date(2026, 10, 9);
const now = new Date(2026, 10, 11, 10, 0); // Wednesday: head shows "hoy" there
const at = (d, h, mi = 0) => new Date(2026, 10, d, h, mi).toISOString();
const pmap = { p1: 'DEMO PÉREZ', p2: 'DEMO <GARCÍA> & "Co"' };
const BUSY = [
  { id: 'e1', patientId: 'p1', start: at(10, 9), procedure: 'Biopsia <hepática>', location: 'Quirófano 2', materialApproved: true, anesthesiaScheduled: true },
  { id: 'e2', patientId: 'p2', start: at(10, 10, 30), procedure: 'Paracentesis & más', location: '', materialApproved: true, anesthesiaScheduled: false },
  { id: 'e3', patientId: 'p1', start: at(10, 11), procedure: 'Endoscopia', location: 'Sala 3', materialApproved: false, anesthesiaScheduled: true },
  { id: 'e4', patientId: 'zzz', start: at(13, 21), procedure: 'Tardía', location: 'UCI', materialApproved: true, anesthesiaScheduled: true },
  { id: 'e5', patientId: 'p1', start: at(11, 7), procedure: '', location: 'Sala 1', materialApproved: true, anesthesiaScheduled: true },
];

function board(events) {
  storage.getScheduledProcedures = () => events;
  const clips = collectAgendaClipsByDay(monday, weekBoundsFromMonday(monday), pmap);
  return view.board(buildAgendaBoardModel(monday, clips, 50, now));
}

test('busy week equals the old DOM (lanes, flags, escaped text, today tag, unknown patient)', () => {
  sameHtml(board(BUSY), OLD.busy, 'busy');
});

test('empty week equals the old DOM, with the "Semana libre" note', () => {
  sameHtml(board([]), OLD.empty, 'empty');
});

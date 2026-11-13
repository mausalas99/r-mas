process.env.TZ = 'UTC'; // the request times are local; the fixture was captured in UTC
import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
// Preact writes void tags as <br/>; HTML parses both the same.
const same = (got, old, name) => sameHtml(got.replace(/ ?\/>/g, '>'), old, name);
import OLD from './panel-admin-solicitudes-view.old.json' with { type: 'json' };

// Synthetic inputs (no real people) for panel-admin-solicitudes-view.test.mjs.
const PENDING = [
  { id: 'q1', username: 'ana', displayName: 'Ana <Prueba>', requestedSala: 'Sala 2', createdAt: '2026-11-10T15:30:00Z' },
  { id: 'q"2', username: 'beto', displayName: '', requestedSala: 'Área A/Pensionistas', createdAt: '2026-11-11T09:05:00Z' },
  { id: 'q3', username: 'cy&d', requestedSala: 'Otra', createdAt: '2026-11-09T22:00:00Z' },
];
const RESOLVED = [
  { id: 'q4', username: 'dani', displayName: 'Dani', requestedSala: 'UCI', status: 'approved', assignedSala: 'Sala 1', createdAt: '2026-11-08T10:00:00Z' },
  { id: 'q5', username: 'eli', displayName: 'Eli', requestedSala: 'Eme', status: 'rejected', createdAt: '2026-11-07T10:00:00Z' },
  { id: 'q6', username: 'fer', displayName: 'Fer', requestedSala: 'UX', status: 'approved', createdAt: '2026-11-06T10:00:00Z' },
];
const ERROR_MESSAGE = 'Sin <conexión> & "red"';

const view = await loadJsx(import.meta.url, `import { SolicitudesList, solicitudesModel } from './panel-admin-solicitudes-view.jsx';
  import { AdminHint } from './panel-admin-view.jsx';
  export const list = (rows, pending) => renderToString(<SolicitudesList model={solicitudesModel(rows, pending)} />);
  export const hint = (text) => renderToString(<AdminHint text={text} />);`);

test('pending list equals the old builder', () => {
  same(view.list(PENDING, true), OLD.pending, 'pending');
  same(view.list([], true), OLD.empty_pending, 'empty pending');
});

test('resolved list equals the old builder', () => {
  same(view.list(RESOLVED, false), OLD.resolved, 'resolved');
  same(view.list([], false), OLD.empty_resolved, 'empty resolved');
});

test('load error hint equals the old markup', () => {
  same(view.hint(ERROR_MESSAGE), OLD.error, 'error');
});

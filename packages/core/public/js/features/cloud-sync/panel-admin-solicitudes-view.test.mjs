process.env.TZ = 'UTC'; // the request times are local; the fixture was captured in UTC
import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
// Preact writes void tags as <br/>; HTML parses both the same.
const same = (got, old, name) => sameHtml(got.replace(/ ?\/>/g, '>'), old, name);
import * as S from './panel-admin-solicitudes-scenarios.mjs';
import OLD from './panel-admin-solicitudes-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { SolicitudesList, solicitudesModel } from './panel-admin-solicitudes-view.jsx';
  import { AdminHint } from './panel-admin-view.jsx';
  export const list = (rows, pending) => renderToString(<SolicitudesList model={solicitudesModel(rows, pending)} />);
  export const hint = (text) => renderToString(<AdminHint text={text} />);`);

test('pending list equals the old builder', () => {
  same(view.list(S.PENDING, true), OLD.pending, 'pending');
  same(view.list([], true), OLD.empty_pending, 'empty pending');
});

test('resolved list equals the old builder', () => {
  same(view.list(S.RESOLVED, false), OLD.resolved, 'resolved');
  same(view.list([], false), OLD.empty_resolved, 'empty resolved');
});

test('load error hint equals the old markup', () => {
  same(view.hint(S.ERROR_MESSAGE), OLD.error, 'error');
});

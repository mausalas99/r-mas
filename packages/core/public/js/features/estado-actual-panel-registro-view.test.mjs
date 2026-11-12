import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { normHtml } from './preact-html-compare.mjs';
import { IO_EXTRA_SOURCE_KINDS, IO_TURNO_EVENT_KINDS } from './estado-actual-io.mjs';

// Markup the string builders in estado-actual-panel-registro.mjs wrote before the port (row bodies and the
// hemodialysis lead), captured on synthetic inputs.
const OLD = createRequire(import.meta.url)('./estado-actual-panel-registro-view-old-html.json');

const view = await loadJsx(import.meta.url, `import { IoExtraRowBody, IoEventRowBody, RegistroLead } from './estado-actual-panel-registro-view.jsx';
  export const extra = (options) => renderToString(<IoExtraRowBody options={options} />);
  export const event = (kinds, turnos) => renderToString(<IoEventRowBody kinds={kinds} turnos={turnos} />);
  export const lead = (id) => renderToString(<RegistroLead reminderId={id} />);`);

// Serialization only: Preact closes void tags with "/>" (HTML does not need it).
const same = (a, b, name) => {
  const n = (s) => normHtml(s).replace(/ ?\/>/g, '>');
  assert.equal(n(a), n(b), name);
};

// Option lists exactly as estado-actual-panel-registro.mjs derives them.
const label = (l) => (l ? l.charAt(0) + l.slice(1).toLowerCase() : '');
const extraOptions = IO_EXTRA_SOURCE_KINDS.map((k) => ({ value: k.kind, label: label(k.label) }))
  .concat([{ value: '__custom__', label: '+ Otra…' }]);
const eventKinds = IO_TURNO_EVENT_KINDS.map((k) => ({ value: k.kind, label: k.short }));

test('extra source row body matches the old string', () => {
  same(view.extra(extraOptions), OLD.extra.base, 'extra');
});

test('event row body matches the old string', () => {
  same(view.event(eventKinds, ['t1', 't2', 't3']), OLD.event.base, 'event');
});

test('hemodialysis lead matches the old string and old none-case was empty', () => {
  same(view.lead('todo-7'), OLD.lead.open, 'lead');
  assert.equal(OLD.lead.none, '');
  assert.equal(OLD.lead.noTodo, '');
});

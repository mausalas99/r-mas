import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { IcPicker, ServicePicker } from './ic-modal-view.jsx';
  import { INTERCONSULT_SERVICES, REQUESTING_SERVICE_IDS, hueForService, hueForRequestingService, serviceById } from './interconsult-catalog.mjs';
  const LABELS = { med: 'Médicas', qx: 'Quirúrgicas', sop: 'Soporte' };
  export const ic = (ids) => renderToString(<IcPicker groups={['med', 'qx', 'sop'].map((cat) => ({ label: LABELS[cat],
    services: INTERCONSULT_SERVICES.filter((s) => s.cat === cat).map((s) => ({ id: s.id, name: s.name, hue: hueForService(s), on: ids.includes(s.id) })) }))} />);
  export const svc = (name) => renderToString(<ServicePicker services={REQUESTING_SERVICE_IDS.map(serviceById).map((s) =>
    ({ id: s.id, name: s.name, hue: hueForRequestingService(s), on: s.name === name }))} />);`);

// Markup renderIcPickerHtml / renderServicePickerHtml wrote before the port.
const OLD = createRequire(import.meta.url)('./ic-modal-view-old-html.json');

test('interconsultantes picker equals the old HTML', () => {
  sameHtml(view.ic([]), OLD.ic.none, 'none');
  sameHtml(view.ic([OLD.ids[0], OLD.ids.at(-1)]), OLD.ic.some, 'some');
  assert.equal((view.ic([OLD.ids[3]]).match(/is-on/g) || []).length, 1);
});

test('requesting-service picker equals the old HTML', () => {
  sameHtml(view.svc(''), OLD.svc.none, 'none');
  sameHtml(view.svc('Traumatología'), OLD.svc.one, 'one');
  sameHtml(view.svc('Nada'), OLD.svc.unknown, 'unknown');
});

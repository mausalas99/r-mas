import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { VITAL_KEYS, VITAL_LABELS, VITAL_UNITS } from './estado-actual-panel-constants.mjs';
import { MAX_VITAL_LAYERS_IN_FORM, MAX_VITAL_READINGS_PER_DAY } from './estado-actual-vital-series.mjs';

// Output of the old string builder (buildRegistroFormMarkup) captured before the port, clock frozen.
const { default: OLD } = await import('./estado-actual-panel-registro-form-view-old-html.json', { with: { type: 'json' } });

// Same markup, other spelling: Preact prints empty-valued attributes as `name=""`, quotes the JSON in
// single-quoted attributes, and writes void elements with `/>`.
const same = (s) =>
  s
    .replace(/='([^']*)'/g, '="$1"')
    .replace(/&quot;/g, '"')
    .replace(/ ([a-z][a-z-]*)=""/g, ' $1')
    .replace(/\s?\/>/g, '>')
    .replace(/ value(?=[ >])/g, ' value=""');

const kinds = (list) => list.map((k) => ({ value: k.kind, label: k.label.charAt(0) + k.label.slice(1).toLowerCase() }));

test('registro form equals the old builder', async () => {
  const io = await import('./estado-actual-io.mjs');
  const v = await loadJsx(import.meta.url, `import { RegistroForm } from './estado-actual-panel-registro-form-view.jsx';
    export const html = (p) => renderToString(<RegistroForm {...p} />);`);
  const html = v.html({
    recordedAt: OLD.recordedAt,
    ioExtraKinds: kinds(io.IO_EXTRA_SOURCE_KINDS),
    ioEventKinds: kinds(io.IO_TURNO_EVENT_KINDS),
    vitals: VITAL_KEYS.map((k) => ({ key: k, label: VITAL_LABELS[k] || k, unit: VITAL_UNITS[k] || '' })),
    maxLayers: MAX_VITAL_LAYERS_IN_FORM,
    maxReadings: MAX_VITAL_READINGS_PER_DAY,
  });
  assert.equal(same(html), same(OLD.form));
});

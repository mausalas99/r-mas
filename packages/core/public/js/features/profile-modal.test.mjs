import test from 'node:test';
import assert from 'node:assert/strict';
import { doctorOptionList } from './profile-modal.mjs';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const people = [{ name: 'Dr. Ana', rank: 'R4' }];

test('nothing saved: pick starts empty, not on a team member', () => {
  assert.deepEqual(doctorOptionList(people, '')[0], { value: '', label: 'Elige tu nombre' });
});

test('no team and nothing saved: says so', () => {
  assert.deepEqual(doctorOptionList([], '')[0], { value: '', label: 'Sin equipo en Nube' });
});

test('saved name stays selectable, no empty option', () => {
  const list = doctorOptionList(people, 'Dra. Vieja');
  assert.deepEqual(list[0], { value: 'Dra. Vieja', label: 'Dra. Vieja' });
  assert.ok(!list.some((o) => o.value === ''));
});

const view = await loadJsx(import.meta.url, `import { DoctorOptions } from './profile-modal-view.jsx';
  export const html = (options) => renderToString(<DoctorOptions options={options} />);`);

// Markup doctorOptionsHtml (string builder) made before the port, same synthetic inputs.
test('doctor options equal the old option markup', () => {
  sameHtml(view.html(doctorOptionList(people, '')),
    '<option value="">Elige tu nombre</option><option value="Dr. Ana">Dr. Ana · R4</option><option value="__otro__">Otro…</option>', 'empty');
  sameHtml(view.html(doctorOptionList([], '')),
    '<option value="">Sin equipo en Nube</option><option value="__otro__">Otro…</option>', 'no team');
  sameHtml(view.html(doctorOptionList(people, 'Dra. "Vieja" <R2>')),
    '<option value="Dra. &quot;Vieja&quot; &lt;R2&gt;">Dra. &quot;Vieja&quot; &lt;R2></option><option value="Dr. Ana">Dr. Ana · R4</option><option value="__otro__">Otro…</option>', 'escaped');
});

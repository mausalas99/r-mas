process.env.TZ = 'UTC'; // the consult times are local HH:MM
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { consultBandModel } from './patient-dashboard/consult-band.mjs';
import { BAND_CASES, ASSIGN_OPTIONS } from './interconsulta-consult-band-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { ConsultBand, BackToBoardButton, AssignMenuItems } from './interconsulta-mode-chrome-view.jsx';
  export const band = (model) => renderToString(<ConsultBand model={model} />);
  export const back = () => renderToString(<BackToBoardButton />);
  export const assign = (options) => renderToString(<AssignMenuItems options={options} />);`);

// Exact markup the old string builders made (renderConsultBandHtml, the back button literal and the assign menu innerHTML, from the old code).
const { default: OLD } = await import('./interconsulta-consult-band-view.old.json', { with: { type: 'json' } });

// Preact writes bare data-* flags as =""; escapes > in text; and quotes as &quot; in both.
const norm = (s) => s.replace(/ ?\/>/g, '>').replace(/&#39;/g, "'").replace(/&gt;/g, '>').replace(/ ([a-z-]+)=""/g, ' $1');

for (const [name, c] of Object.entries(BAND_CASES)) {
  test(`Consult band HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.band(consultBandModel(c.info, c.ctx))), norm(OLD.band[name]));
  });
}
test('Back to board button HTML equals the old markup', () => {
  assert.equal(norm(view.back()), norm(OLD.back));
});
test('Assign menu items HTML equals the old builder', () => {
  assert.equal(norm(view.assign(ASSIGN_OPTIONS)), norm(OLD.assign));
});
